import { useEffect, useRef, useState } from 'preact/hooks';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { observations, obsInfo, dataUrl } from '../data';
import { href } from '../router';
import { fmtDate, fmtTime } from '../util';

// Satellite-only map (Sentinel-2 cloudless, EOX). Tiles: z8–14 over the whole area, z15 over the reserve itself.
const BBOX = { west: 30.4, south: -24.35, east: 30.9, north: -23.9 };
const INNER = { west: 30.5, south: -24.25, east: 30.82, north: -23.98 };
const bounds = (b: typeof BBOX) => [b.west, b.south, b.east, b.north] as [number, number, number, number];

function makeStyle(): maplibregl.StyleSpecification {
  const tiles = [location.origin + dataUrl('map/sat/{z}/{x}/{y}.jpg')];
  return {
    version: 8,
    sources: {
      sat: { type: 'raster', tiles, tileSize: 256, minzoom: 8, maxzoom: 14, bounds: bounds(BBOX), attribution: 'Sentinel-2 cloudless 2023 by EOX (CC BY-NC-SA 4.0)' },
      // sharper level, reserve only; elsewhere the layer below is simply overzoomed
      sat15: { type: 'raster', tiles, tileSize: 256, minzoom: 15, maxzoom: 15, bounds: bounds(INNER) },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#1d2b1f' } },
      { id: 'sat', type: 'raster', source: 'sat' },
      { id: 'sat15', type: 'raster', source: 'sat15', minzoom: 15 },
    ],
  };
}

function toGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: observations.value
      .filter((o) => o.lat != null && o.lon != null)
      .map((o) => {
        const s = obsInfo(o);
        return { type: 'Feature', geometry: { type: 'Point', coordinates: [o.lon, o.lat] }, properties: { id: o.id, name: s.en, group: s.group, when: `${fmtDate(o.ts)} ${fmtTime(o.ts)}`, sp: o.speciesId, onList: s.onList } };
      }),
  } as any;
}

export function MapView() {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [state, setState] = useState<'loading' | 'nopack' | 'ok' | 'error'>('loading');
  const [err, setErr] = useState('');
  const [outside, setOutside] = useState(false);

  useEffect(() => {
    let map: maplibregl.Map | null = null;
    (async () => {
      // the reserve outline ships with the satellite pack: if it can't be fetched, the pack is missing and we're offline
      let reserve: any;
      try {
        const r = await fetch(dataUrl('map/makalali.geojson'));
        if (!r.ok) throw new Error();
        reserve = await r.json();
      } catch { setState('nopack'); return; }
      caches.delete('pack-map').catch(() => {}); // old OpenStreetMap pack, no longer used
      try {
        map = new maplibregl.Map({
          container: el.current!, style: makeStyle(), center: [30.65, -24.125], zoom: 11, minZoom: 9, maxZoom: 15, // beyond z15 Sentinel-2 (10 m/pixel) is just blur
          maxBounds: [[BBOX.west - 0.05, BBOX.south - 0.05], [BBOX.east + 0.05, BBOX.north + 0.05]],
          attributionControl: { compact: true }, fadeDuration: 0, pitchWithRotate: false, dragRotate: false, touchPitch: false, maxPitch: 0,
          canvasContextAttributes: { preserveDrawingBuffer: location.search.includes('debug') },
        });
        mapRef.current = map;
        (window as any).__map = map; // handy for debugging from the console / smoke test
        map.touchZoomRotate.disableRotation();
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        const geo = new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true, timeout: 45000, maximumAge: 0 }, trackUserLocation: true, showAccuracyCircle: true, fitBoundsOptions: { maxZoom: 15 } });
        map.addControl(geo, 'top-right');
        geo.on('geolocate', (e: any) => {
          const c = e?.coords;
          if (c) setOutside(c.longitude < BBOX.west || c.longitude > BBOX.east || c.latitude < BBOX.south || c.latitude > BBOX.north);
        });
        geo.on('error', () => setOutside(false));
        map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
        map.on('error', (e) => { if (import.meta.env.DEV) console.debug(e.error?.message); });
        map.on('load', () => {
          map!.addSource('reserve', { type: 'geojson', data: reserve });
          map!.addLayer({ id: 'reserve-line', type: 'line', source: 'reserve', paint: { 'line-color': '#ffd54f', 'line-width': 2, 'line-dasharray': [3, 2] } });
          map!.addSource('obs', { type: 'geojson', data: toGeoJSON() });
          map!.addLayer({ id: 'obs-pt', type: 'circle', source: 'obs', paint: { 'circle-radius': 7, 'circle-color': ['match', ['get', 'group'], 'mammal', '#8d5a2b', '#d98e2b'], 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
          map!.on('click', 'obs-pt', (e) => {
            const f = e.features?.[0]; if (!f) return;
            const p = f.properties as any;
            new maplibregl.Popup({ offset: 12 }).setLngLat((f.geometry as any).coordinates).setHTML(`<b>${p.name}</b><br>${p.when}<br>` + (p.onList ? `<a href="${href('species/' + p.sp)}">species page ›</a>` : 'not on the Pidwa checklist')).addTo(map!);
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

  return (
    <div class="mapwrap">
      <div class="map" ref={el} />
      {state === 'ok' && outside && <div class="mapnote">You are outside the mapped area (Makalali / Pidwa).</div>}
      {state === 'nopack' && <div class="mapmsg"><div><p>The map pack is not downloaded (or no network).</p><a class="btn" href={href('settings')}>Go to settings</a></div></div>}
      {state === 'error' && <div class="mapmsg"><div><p>Map error</p><pre>{err}</pre></div></div>}
    </div>
  );
}
