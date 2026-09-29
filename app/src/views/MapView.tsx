import { useEffect, useRef, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { observations, obsInfo, dataUrl, byId } from '../data';
import { href } from '../router';
import { fmtDate, fmtTime } from '../util';
import { BIRD_GROUPS, MAMMAL_GROUPS, BIG5_IDS, groupOf, familyEn } from '../taxa';
import type { Observation } from '../types';

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

// ---- filters (module-level: kept when leaving and coming back to the map) ----
type Kind = 'big5' | 'mammal' | 'bird' | 'off';
const KIND_COLOUR: Record<Kind, string> = { big5: '#ff3b30', mammal: '#ff9f1c', bird: '#4fc3f7', off: '#b0b0b0' };
const PERIODS: [string, string][] = [['all', 'All'], ['today', 'Today'], ['7d', '7 days'], ['30d', '30 days']];
const TYPES: [string, string][] = [['all', 'All'], ['bird', 'Birds'], ['mammal', 'Mammals'], ['big5', 'Big Five']];
const period = signal('all');
const type = signal('all');
const grp = signal('');
const fam = signal('');
const sp = signal('');
const panelOpen = signal(false);
const GROUP_LABEL = new Map([...BIRD_GROUPS, ...MAMMAL_GROUPS]);

interface Row { o: Observation; name: string; group: string; family: string; kind: Kind; onList: boolean }
function rows(): Row[] {
  return observations.value
    .filter((o) => o.lat != null && o.lon != null)
    .map((o) => {
      const i = obsInfo(o);
      const s = byId.value.get(o.speciesId);
      const kind: Kind = !i.onList ? 'off' : BIG5_IDS.has(o.speciesId) ? 'big5' : i.group;
      return { o, name: i.en, group: (s && groupOf(s)) || '', family: s?.family || '', kind, onList: i.onList };
    });
}
function since(p: string) {
  if (p === 'today') { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
  if (p === '7d') return Date.now() - 7 * 864e5;
  if (p === '30d') return Date.now() - 30 * 864e5;
  return 0;
}
// Filters cascade group > family > species. `upTo` stops before that level, so each dropdown
// counts its options under the filters above it only (picking a group resets family and species).
function pass(r: Row, upTo?: 'grp' | 'fam' | 'sp') {
  if (r.o.ts < since(period.value)) return false;
  const t = type.value, g = r.kind === 'off' ? 'bird' : r.kind === 'big5' ? 'mammal' : r.kind;
  if (t === 'big5' ? r.kind !== 'big5' : t !== 'all' && g !== t) return false;
  if (upTo === 'grp') return true;
  if (grp.value && r.group !== grp.value) return false;
  if (upTo === 'fam') return true;
  if (fam.value && r.family !== fam.value) return false;
  if (upTo === 'sp') return true;
  return !sp.value || r.o.speciesId === sp.value;
}
/** option value -> [label, observation count], sorted by label */
function options(list: Row[], key: (r: Row) => string, label: (v: string, r: Row) => string) {
  const m = new Map<string, [string, number]>();
  for (const r of list) { const v = key(r); if (!v) continue; const e = m.get(v); if (e) e[1]++; else m.set(v, [label(v, r), 1]); }
  return [...m.entries()].sort((a, b) => a[1][0].localeCompare(b[1][0]));
}

function toGeoJSON(list: Row[]) {
  const rank: Record<Kind, number> = { off: 0, bird: 1, mammal: 2, big5: 3 };
  return {
    type: 'FeatureCollection',
    features: list.map(({ o, name, kind, onList }) => ({
      type: 'Feature', geometry: { type: 'Point', coordinates: [o.lon, o.lat] },
      properties: { id: o.id, name, kind, rank: rank[kind], when: `${fmtDate(o.ts)} ${fmtTime(o.ts)}`, sp: o.speciesId, onList },
    })),
  } as any;
}

export function MapView() {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [state, setState] = useState<'loading' | 'nopack' | 'ok' | 'error'>('loading');
  const [err, setErr] = useState('');
  const [outside, setOutside] = useState(false);

  const all = rows();
  const shown = all.filter((r) => pass(r));
  const nSpecies = new Set(shown.map((r) => r.o.speciesId)).size;
  const filtered = period.value !== 'all' || type.value !== 'all' || !!grp.value || !!fam.value || !!sp.value;
  const grpOpts = options(all.filter((r) => pass(r, 'grp')), (r) => r.group, (v) => GROUP_LABEL.get(v) || v);
  const famOpts = options(all.filter((r) => pass(r, 'fam')), (r) => r.family, (v) => `${familyEn({ family: v } as any)} (${v})`);
  const spOpts = options(all.filter((r) => pass(r, 'sp')), (r) => r.o.speciesId, (_, r) => r.name);

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
          map!.addSource('obs', { type: 'geojson', data: toGeoJSON(rows().filter((r) => pass(r))) });
          map!.addLayer({
            id: 'obs-pt', type: 'circle', source: 'obs', layout: { 'circle-sort-key': ['get', 'rank'] },
            paint: {
              'circle-radius': ['match', ['get', 'kind'], 'big5', 9, 7],
              'circle-color': ['match', ['get', 'kind'], 'big5', KIND_COLOUR.big5, 'mammal', KIND_COLOUR.mammal, 'off', KIND_COLOUR.off, KIND_COLOUR.bird],
              'circle-stroke-color': '#fff', 'circle-stroke-width': 2,
            },
          });
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

  // keep markers in sync with the observations and the filters
  const key = shown.map((r) => r.o.id).join(',');
  useEffect(() => {
    const m = mapRef.current; if (!m || state !== 'ok') return;
    (m.getSource('obs') as maplibregl.GeoJSONSource | undefined)?.setData(toGeoJSON(shown));
  }, [key, state]);

  // narrowing to a group / family / species zooms onto its observations
  useEffect(() => {
    const m = mapRef.current; if (!m || state !== 'ok' || !shown.length || !(grp.value || fam.value || sp.value)) return;
    const b = new maplibregl.LngLatBounds();
    for (const r of shown) b.extend([r.o.lon!, r.o.lat!]);
    m.fitBounds(b, { padding: { top: 90, bottom: 60, left: 40, right: 60 }, maxZoom: 14, duration: 500 });
  }, [grp.value, fam.value, sp.value, state]);

  const clear = () => { period.value = 'all'; type.value = 'all'; grp.value = ''; fam.value = ''; sp.value = ''; };
  const seg = (opts: [string, string][], s: typeof period, reset = false) => (
    <div class="seg">{opts.map(([v, l]) => <button class={s.value === v ? 'on' : ''} onClick={() => { s.value = v; if (reset) { grp.value = ''; fam.value = ''; sp.value = ''; } }}>{l}</button>)}</div>
  );
  const select = (s: typeof grp, first: string, opts: [string, [string, number]][], onPick?: () => void) => (
    <select value={s.value} onChange={(e) => { s.value = (e.target as HTMLSelectElement).value; onPick?.(); }}>
      <option value="">{first}</option>
      {opts.map(([v, [l, n]]) => <option value={v}>{l} ({n})</option>)}
      {s.value && !opts.some(([v]) => v === s.value) && <option value={s.value}>{s.value} (0)</option>}
    </select>
  );

  return (
    <div class="mapwrap">
      <div class="map" ref={el} />
      {state === 'ok' && (
        <div class="mapfilter">
          <div class="mf-bar">
            <button class={'mf-toggle' + (filtered ? ' on' : '')} onClick={() => (panelOpen.value = !panelOpen.value)}>
              {panelOpen.value ? '▴' : '▾'} Filter
            </button>
            <span class="mf-count">{shown.length} obs · {nSpecies} species</span>
            {filtered && <button class="mf-clear" onClick={clear} aria-label="clear filters">✕</button>}
          </div>
          {panelOpen.value && (
            <div class="mf-panel">
              {seg(PERIODS, period)}
              {seg(TYPES, type, true)}
              {select(grp, 'any group', grpOpts, () => { fam.value = ''; sp.value = ''; })}
              {select(fam, 'any family', famOpts, () => { sp.value = ''; })}
              {select(sp, 'any species', spOpts, () => (panelOpen.value = false))}
            </div>
          )}
        </div>
      )}
      {state === 'ok' && (
        <div class="maplegend">
          <span><i style={{ background: KIND_COLOUR.bird }} />birds</span>
          <span><i style={{ background: KIND_COLOUR.mammal }} />mammals</span>
          <span><i style={{ background: KIND_COLOUR.big5 }} />Big Five</span>
        </div>
      )}
      {state === 'ok' && outside && <div class="mapnote">You are outside the mapped area (Makalali / Pidwa).</div>}
      {state === 'nopack' && <div class="mapmsg"><div><p>The map pack is not downloaded (or no network).</p><a class="btn" href={href('settings')}>Go to settings</a></div></div>}
      {state === 'error' && <div class="mapmsg"><div><p>Map error</p><pre>{err}</pre></div></div>}
    </div>
  );
}
