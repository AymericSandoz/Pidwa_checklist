import { useEffect, useRef, useState } from 'preact/hooks';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { observations, byId, name, dataUrl } from '../data';
import { href } from '../router';
import { fmtDate, fmtTime } from '../util';

function absolutize(style: any) {
  const root = location.origin + dataUrl('map/');
  const fix = (u: string) => (u.startsWith('map/') ? root + u.slice(4) : u);
  for (const src of Object.values<any>(style.sources || {})) if (Array.isArray(src.tiles)) src.tiles = src.tiles.map(fix);
  if (style.glyphs) style.glyphs = fix(style.glyphs);
  if (style.sprite) style.sprite = fix(style.sprite);
  return style;
}

// In satellite mode only these OpenStreetMap layers stay on top of the imagery (tracks, rivers, water, names).
const OVERLAY = /^(waterway_river|waterway_other|water|park_outline|road_|bridge_|tunnel_(?!.*rail)|waterway_line_label|water_name_|highway-name-|label_)/;
const NOT_OVERLAY = /rail|one_way|shield|road_area_pattern/;
const isOverlay = (id: string) => OVERLAY.test(id) && !NOT_OVERLAY.test(id);

function toGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: observations.value
      .filter((o) => o.lat != null && o.lon != null)
      .map((o) => {
        const s = byId.value.get(o.speciesId);
        return { type: 'Feature', geometry: { type: 'Point', coordinates: [o.lon, o.lat] }, properties: { id: o.id, name: s ? name(s) : o.speciesId, group: s?.group || 'bird', when: `${fmtDate(o.ts)} ${fmtTime(o.ts)}`, sp: o.speciesId } };
      }),
  } as any;
}

export function MapView() {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [state, setState] = useState<'loading' | 'nopack' | 'ok' | 'error'>('loading');
  const [err, setErr] = useState('');
  const [sat, setSat] = useState(localStorage.getItem('mapSat') !== '0');
  const [hasSat, setHasSat] = useState(false);
  const [outside, setOutside] = useState(false);
  const bbox = useRef<{ west: number; south: number; east: number; north: number } | null>(null);

  function applyMode(m: maplibregl.Map, satOn: boolean) {
    if (!m.getLayer('sat')) return;
    m.setLayoutProperty('sat', 'visibility', satOn ? 'visible' : 'none');
    for (const l of m.getStyle().layers || []) {
      const src = (l as any).source;
      if (src === 'openmaptiles' || src === 'ne2_shaded') m.setLayoutProperty(l.id, 'visibility', satOn && !isOverlay(l.id) ? 'none' : 'visible');
    }
  }

  useEffect(() => {
    let map: maplibregl.Map | null = null;
    (async () => {
      let style: any;
      try {
        const r = await fetch(dataUrl('map/style.json'));
        if (!r.ok) throw new Error('style ' + r.status);
        style = absolutize(await r.json());
        fetch(dataUrl('map/bbox.json')).then((b) => b.json()).then((b) => (bbox.current = b)).catch(() => {});
      } catch { setState('nopack'); return; }
      try {
        map = new maplibregl.Map({
          container: el.current!, style, center: style.center || [30.66, -24.12], zoom: style.zoom || 11, maxZoom: 18,
          attributionControl: { compact: true }, fadeDuration: 0, pitchWithRotate: false, dragRotate: false, touchPitch: false, maxPitch: 0,
          canvasContextAttributes: { preserveDrawingBuffer: location.search.includes('debug') },
        });
        mapRef.current = map;
        (window as any).__map = map; // handy for debugging from the console / smoke test
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        const geo = new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true, timeout: 45000, maximumAge: 0 }, trackUserLocation: true, showAccuracyCircle: true, fitBoundsOptions: { maxZoom: 15 } });
        map.addControl(geo, 'top-right');
        geo.on('geolocate', (e: any) => {
          const b = bbox.current; const c = e?.coords;
          if (b && c) setOutside(c.longitude < b.west || c.longitude > b.east || c.latitude < b.south || c.latitude > b.north);
        });
        geo.on('error', () => setOutside(false));
        map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
        map.on('error', (e) => { if (import.meta.env.DEV) console.debug(e.error?.message); });
        map.on('load', async () => {
          setHasSat(!!map!.getLayer('sat'));
          applyMode(map!, sat);
          try {
            const r = await fetch(dataUrl('map/makalali.geojson'));
            if (r.ok) {
              map!.addSource('reserve', { type: 'geojson', data: await r.json() });
              map!.addLayer({ id: 'reserve-line', type: 'line', source: 'reserve', paint: { 'line-color': '#ffd54f', 'line-width': 2, 'line-dasharray': [3, 2] } });
            }
          } catch {}
          map!.addSource('obs', { type: 'geojson', data: toGeoJSON() });
          map!.addLayer({ id: 'obs-halo', type: 'circle', source: 'obs', paint: { 'circle-radius': 10, 'circle-color': '#fff', 'circle-opacity': 0.8 } });
          map!.addLayer({ id: 'obs-pt', type: 'circle', source: 'obs', paint: { 'circle-radius': 7, 'circle-color': ['match', ['get', 'group'], 'mammal', '#8d5a2b', '#d98e2b'], 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 } });
          map!.addLayer({ id: 'obs-label', type: 'symbol', source: 'obs', minzoom: 13, layout: { 'text-field': ['get', 'name'], 'text-size': 11, 'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-font': ['Noto Sans Regular'] }, paint: { 'text-color': '#fff', 'text-halo-color': '#000', 'text-halo-width': 1.2 } });
          map!.on('click', 'obs-pt', (e) => {
            const f = e.features?.[0]; if (!f) return;
            const p = f.properties as any;
            new maplibregl.Popup({ offset: 12 }).setLngLat((f.geometry as any).coordinates).setHTML(`<b>${p.name}</b><br>${p.when}<br><a href="${href('species/' + p.sp)}">species page ›</a>`).addTo(map!);
          });
          map!.on('mouseenter', 'obs-pt', () => (map!.getCanvas().style.cursor = 'pointer'));
          setState('ok');
        });
      } catch (e: any) { setErr(e.message || String(e)); setState('error'); }
    })();
    return () => { map?.remove(); mapRef.current = null; };
  }, []);

  // keep markers in sync with the observations signal
  useEffect(() => {
    const m = mapRef.current; if (!m || state !== 'ok') return;
    (m.getSource('obs') as maplibregl.GeoJSONSource | undefined)?.setData(toGeoJSON());
  }, [observations.value, state]);

  function toggleSat() {
    const m = mapRef.current; if (!m) return;
    const on = !sat; setSat(on);
    localStorage.setItem('mapSat', on ? '1' : '0');
    applyMode(m, on);
  }

  return (
    <div class="mapwrap">
      <div class="map" ref={el} />
      {state === 'ok' && hasSat && <div class="mapbtns"><button class={sat ? 'on' : ''} onClick={toggleSat}>{sat ? '🛰 satellite' : '🗺 map'}</button></div>}
      {state === 'ok' && outside && <div class="mapnote">You are outside the mapped area (Makalali / Pidwa). Tiles exist only for the reserve.</div>}
      {state === 'nopack' && <div class="mapmsg"><div><p>The map pack is not downloaded (or no network).</p><a class="btn" href={href('settings')}>Go to settings</a></div></div>}
      {state === 'error' && <div class="mapmsg"><div><p>Map error</p><pre>{err}</pre></div></div>}
    </div>
  );
}
