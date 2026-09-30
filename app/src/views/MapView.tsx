import { useEffect, useRef, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { observations, obsInfo, dataUrl, byId, imgUrl, thumbUrl } from '../data';
import { href } from '../router';
import { fmtDate, fmtTime, norm } from '../util';
import { BIG5_IDS, familyEn } from '../taxa';
import { Icon, iconHtml } from '../components/Icon';
import type { Observation } from '../types';

// Satellite-only map (Sentinel-2 cloudless, EOX). Tiles: z8–14 over the whole area, z15 over the reserve itself.
const BBOX = { west: 30.4, south: -24.35, east: 30.9, north: -23.9 };
const INNER = { west: 30.5, south: -24.25, east: 30.82, north: -23.98 };
// fixed places shown on the map: [label, lon, lat]
const PLACES: [string, number, number][] = [['Askari Camp', 30.55897, -24.0648]];
const bounds = (b: typeof BBOX) => [b.west, b.south, b.east, b.north] as [number, number, number, number];
// Zoomed out, observations are small dots; from this zoom on they become round photos (grouped when they overlap).
const PHOTO_ZOOM = 12.5;

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
      { id: 'bg', type: 'background', paint: { 'background-color': '#11150f' } },
      { id: 'sat', type: 'raster', source: 'sat' },
      { id: 'sat15', type: 'raster', source: 'sat15', minzoom: 15 },
    ],
  };
}

// ---- filters (module-level: kept when leaving and coming back to the map) ----
type Kind = 'big5' | 'mammal' | 'bird' | 'off';
const KIND_COLOUR: Record<Kind, string> = { big5: '#ff3b30', mammal: '#ff9f1c', bird: '#c77dff', off: '#b0b0b0' };
const PERIODS: [string, string][] = [['all', 'All'], ['today', 'Today'], ['7d', '7 d'], ['30d', '30 d']];
// the three chips on the map are both the legend of the marker colours and a one-tap filter
const TYPES: [Kind, string][] = [['bird', 'Birds'], ['mammal', 'Mammals'], ['big5', 'Big Five']];
const period = signal('all');
const type = signal('all');
const fam = signal('');
const sp = signal('');
const stripOpen = signal(true);

const kindOf = (speciesId: string): Kind => { const s = byId.value.get(speciesId); return !s ? 'off' : BIG5_IDS.has(speciesId) ? 'big5' : s.group; };

interface Row { o: Observation; name: string; fr: string; sci: string; family: string; kind: Kind; onList: boolean }
function rows(): Row[] {
  return observations.value
    .filter((o) => o.lat != null && o.lon != null)
    .map((o) => {
      const i = obsInfo(o);
      return { o, name: i.en, fr: i.fr, sci: i.sci, family: byId.value.get(o.speciesId)?.family || '', kind: kindOf(o.speciesId), onList: i.onList };
    });
}
function since(p: string) {
  if (p === 'today') { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
  if (p === '7d') return Date.now() - 7 * 864e5;
  if (p === '30d') return Date.now() - 30 * 864e5;
  return 0;
}
// Filters apply in this order: period, kind (the chips), family, species. `upTo` stops after that level:
// the search looks through everything of the period, the strip shows every species of the kind and family.
function pass(r: Row, upTo?: 'period' | 'fam') {
  if (r.o.ts < since(period.value)) return false;
  if (upTo === 'period') return true;
  const t = type.value, g = r.kind === 'off' ? 'bird' : r.kind === 'big5' ? 'mammal' : r.kind;
  if (t === 'big5' ? r.kind !== 'big5' : t !== 'all' && g !== t) return false;
  if (fam.value && r.family !== fam.value) return false;
  if (upTo === 'fam') return true;
  return !sp.value || r.o.speciesId === sp.value;
}
/** One entry per species, most recently seen first. */
function bySpecies(list: Row[]) {
  const m = new Map<string, { id: string; row: Row; n: number; last: number }>();
  for (const r of list) {
    const e = m.get(r.o.speciesId);
    if (e) { e.n++; if (r.o.ts > e.last) e.last = r.o.ts; } else m.set(r.o.speciesId, { id: r.o.speciesId, row: r, n: 1, last: r.o.ts });
  }
  return [...m.values()].sort((a, b) => b.last - a.last);
}

function toGeoJSON(list: Row[]) {
  const rank: Record<Kind, number> = { off: 0, bird: 1, mammal: 2, big5: 3 };
  return {
    type: 'FeatureCollection',
    features: list.map(({ o, name, kind, onList }) => {
      const s = byId.value.get(o.speciesId);
      return {
        type: 'Feature', geometry: { type: 'Point', coordinates: [o.lon, o.lat] },
        properties: { id: o.id, name, kind, rank: rank[kind], when: `${fmtDate(o.ts)} · ${fmtTime(o.ts)}`, sp: o.speciesId, onList, img: (s && imgUrl(s)) || '', count: o.count, icon: 'sp:' + (s ? o.speciesId : 'off') },
      };
    }),
  } as any;
}
const esc = (v: string) => v.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]!));
/** Card shown when a marker is tapped: photo, name, date, link to the species page. */
function popupHtml(p: any) {
  return `<div class="pop">${p.img ? `<img src="${esc(p.img)}" alt="">` : ''}<div><b>${esc(p.name)}${p.count > 1 ? ' ×' + p.count : ''}</b><span>${esc(p.when)}</span>`
    + (p.onList ? `<a href="${href('species/' + p.sp)}">Species page ›</a>` : '<span>not on the Pidwa checklist</span>') + '</div></div>';
}

// ---- photo markers: images drawn here and handed to the map, at twice their size on screen ----
/** Round marker: white edge, ring in the colour of the kind, then the photo; or a plain disc carrying a number (group of markers). */
function markerImage(ring: string, photo?: CanvasImageSource, label?: string): ImageData {
  const S = 112, c = S / 2;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d')!;
  g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 9; g.shadowOffsetY = 2;
  g.fillStyle = '#fff'; g.beginPath(); g.arc(c, c, 46, 0, 7); g.fill();
  g.shadowColor = 'transparent';
  g.fillStyle = ring; g.beginPath(); g.arc(c, c, 42, 0, 7); g.fill();
  if (label) {
    g.fillStyle = '#fff'; g.font = '800 38px Urbanist, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(label, c, c + 3);
  } else {
    g.save(); g.beginPath(); g.arc(c, c, 36, 0, 7); g.clip();
    if (photo) g.drawImage(photo, c - 36, c - 36, 72, 72); else { g.fillStyle = '#e1dfd9'; g.fillRect(0, 0, S, S); }
    g.restore();
  }
  return g.getImageData(0, 0, S, S);
}
/** Makes sure the map knows the image "sp:<species id>" (photo marker) or "n:<count>" (group). */
function ensureIcon(map: maplibregl.Map, id: string) {
  try {
    if (map.hasImage(id)) return;
    if (id.startsWith('n:')) { map.addImage(id, markerImage('#1d231c', undefined, id.slice(2)), { pixelRatio: 2 }); return; }
    const speciesId = id.slice(3);
    const s = byId.value.get(speciesId);
    const ring = KIND_COLOUR[kindOf(speciesId)];
    map.addImage(id, markerImage(ring), { pixelRatio: 2 }); // plain disc at once; the photo replaces it as soon as it is loaded
    const url = s && thumbUrl(s);
    if (!url) return;
    const im = new Image();
    im.onload = () => { try { if (map.hasImage(id)) map.updateImage(id, markerImage(ring, im)); } catch { /* map closed meanwhile */ } };
    im.src = url;
  } catch { /* map closed meanwhile */ }
}

export function MapView() {
  const el = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popup = useRef<maplibregl.Popup | null>(null);
  const [state, setState] = useState<'loading' | 'nopack' | 'ok' | 'error'>('loading');
  const [err, setErr] = useState('');
  const [outside, setOutside] = useState(false);
  const [q, setQ] = useState('');

  const all = rows();
  const shown = all.filter((r) => pass(r));
  const species = bySpecies(all.filter((r) => pass(r, 'fam'))); // the strip: not narrowed by the species picked in it
  const nSpecies = new Set(shown.map((r) => r.o.speciesId)).size;
  const picked = sp.value ? all.find((r) => r.o.speciesId === sp.value)?.name || sp.value : fam.value ? familyEn({ family: fam.value } as any) : '';
  // the strip slides down to its handle; one line stays in sight while one of its filters is on, so that it is not forgotten
  const stripH = stripOpen.value ? 166 : picked || period.value !== 'all' ? 64 : 30;
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const swipeStart = (e: TouchEvent) => { swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const swipeEnd = (e: TouchEvent) => {
    const from = swipe.current; swipe.current = null;
    if (!from) return;
    const dx = e.changedTouches[0].clientX - from.x, dy = e.changedTouches[0].clientY - from.y;
    if (Math.abs(dy) > 28 && Math.abs(dy) > Math.abs(dx) * 1.5) stripOpen.value = dy < 0; // down hides, up shows; sideways scrolls the photos
  };

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
          container: el.current!, style: makeStyle(), center: [30.6, -24.08], zoom: 11, // opens around Askari Camp
          minZoom: 9, maxZoom: 15, // beyond z15 Sentinel-2 (10 m/pixel) is just blur
          maxBounds: [[BBOX.west - 0.05, BBOX.south - 0.05], [BBOX.east + 0.05, BBOX.north + 0.05]],
          attributionControl: { compact: true }, fadeDuration: 0, pitchWithRotate: false, dragRotate: false, touchPitch: false, maxPitch: 0,
          canvasContextAttributes: { preserveDrawingBuffer: location.search.includes('debug') },
        });
        mapRef.current = map;
        (window as any).__map = map; // handy for debugging from the console / smoke test
        map.touchZoomRotate.disableRotation();
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        const geo = new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true, timeout: 45000, maximumAge: 0 }, trackUserLocation: true, showAccuracyCircle: true, fitBoundsOptions: { maxZoom: 14 } });
        map.addControl(geo, 'top-right');
        // show where you are straight away, but only if location was already allowed (no permission prompt on opening the map)
        map.once('load', () => navigator.permissions?.query({ name: 'geolocation' }).then((p) => { if (p.state === 'granted') geo.trigger(); }).catch(() => {}));
        geo.on('geolocate', (e: any) => {
          const c = e?.coords;
          if (c) setOutside(c.longitude < BBOX.west || c.longitude > BBOX.east || c.latitude < BBOX.south || c.latitude > BBOX.north);
        });
        geo.on('error', () => setOutside(false));
        map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
        map.on('error', (e) => { if (import.meta.env.DEV) console.debug(e.error?.message); });
        map.on('styleimagemissing', (e) => ensureIcon(map!, e.id));
        for (const [label, lon, lat] of PLACES) {
          const pin = document.createElement('div');
          pin.className = 'place';
          pin.innerHTML = iconHtml('tent', 15, 2.2);
          pin.title = label;
          new maplibregl.Marker({ element: pin, anchor: 'bottom' }).setLngLat([lon, lat]).addTo(map);
        }
        map.on('load', () => {
          map!.addSource('reserve', { type: 'geojson', data: reserve });
          map!.addLayer({ id: 'reserve-line', type: 'line', source: 'reserve', paint: { 'line-color': '#ffd54f', 'line-width': 2, 'line-dasharray': [3, 2] } });
          const data = toGeoJSON(rows().filter((r) => pass(r)));
          // same observations twice: as they are for the dots, grouped when close together for the photos
          map!.addSource('obs', { type: 'geojson', data });
          map!.addSource('obs-c', { type: 'geojson', data, cluster: true, clusterRadius: 34, clusterMaxZoom: 14 });
          // zoomed out: dots, with a soft shadow so that they stand out on the satellite image
          map!.addLayer({
            id: 'obs-shadow', type: 'circle', source: 'obs', maxzoom: PHOTO_ZOOM,
            paint: { 'circle-radius': ['match', ['get', 'kind'], 'big5', 11, 9], 'circle-color': '#000', 'circle-opacity': 0.45, 'circle-blur': 0.7, 'circle-translate': [0, 1.5] },
          });
          map!.addLayer({
            id: 'obs-pt', type: 'circle', source: 'obs', maxzoom: PHOTO_ZOOM, layout: { 'circle-sort-key': ['get', 'rank'] },
            paint: {
              'circle-radius': ['match', ['get', 'kind'], 'big5', 6.5, 5],
              'circle-color': ['match', ['get', 'kind'], 'big5', KIND_COLOUR.big5, 'mammal', KIND_COLOUR.mammal, 'off', KIND_COLOUR.off, KIND_COLOUR.bird],
              'circle-stroke-color': '#fff', 'circle-stroke-width': 2,
            },
          });
          // zoomed in: the photo of the species, or a number where several markers would cover each other
          map!.addLayer({
            id: 'obs-photo', type: 'symbol', source: 'obs-c', minzoom: PHOTO_ZOOM, filter: ['!', ['has', 'point_count']],
            layout: { 'icon-image': ['get', 'icon'], 'icon-size': ['match', ['get', 'kind'], 'big5', 1.12, 1], 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'symbol-sort-key': ['get', 'rank'] },
          });
          map!.addLayer({
            id: 'obs-group', type: 'symbol', source: 'obs-c', minzoom: PHOTO_ZOOM, filter: ['has', 'point_count'],
            layout: { 'icon-image': ['concat', 'n:', ['to-string', ['get', 'point_count']]], 'icon-size': 0.9, 'icon-allow-overlap': true, 'icon-ignore-placement': true },
          });
          for (const [layer, offset] of [['obs-pt', 12], ['obs-photo', 26]] as [string, number][]) {
            map!.on('click', layer, (e) => {
              const f = e.features?.[0]; if (!f) return;
              popup.current?.remove();
              popup.current = new maplibregl.Popup({ offset, closeButton: false, maxWidth: '264px' }).setLngLat((f.geometry as any).coordinates).setHTML(popupHtml(f.properties)).addTo(map!);
            });
          }
          // a group opens by zooming onto it
          map!.on('click', 'obs-group', async (e) => {
            const f = e.features?.[0]; if (!f) return;
            const z = await (map!.getSource('obs-c') as maplibregl.GeoJSONSource).getClusterExpansionZoom(f.properties!.cluster_id);
            map!.easeTo({ center: (f.geometry as any).coordinates, zoom: Math.min(15, z + 0.2) });
          });
          // the credit line stays one tap away behind its "i" button instead of covering the bottom of the map
          const credit = el.current?.querySelector('.maplibregl-ctrl-attrib');
          credit?.classList.remove('maplibregl-compact-show'); credit?.removeAttribute('open');
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
    const data = toGeoJSON(shown);
    popup.current?.remove(); // its marker may just have been filtered out
    for (const f of data.features) ensureIcon(m, f.properties.icon);
    (m.getSource('obs') as maplibregl.GeoJSONSource | undefined)?.setData(data);
    (m.getSource('obs-c') as maplibregl.GeoJSONSource | undefined)?.setData(data);
  }, [key, state]);

  // picking a species or a family zooms onto its observations, and brings its photo into view in the strip
  useEffect(() => {
    const m = mapRef.current; if (!m || state !== 'ok' || !shown.length || !(fam.value || sp.value)) return;
    const b = new maplibregl.LngLatBounds();
    for (const r of shown) b.extend([r.o.lon!, r.o.lat!]);
    m.fitBounds(b, { padding: { top: 130, bottom: stripH + 40, left: 50, right: 70 }, maxZoom: 14, duration: 500 });
    strip.current?.querySelector('.on')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [fam.value, sp.value, state]);

  // a chip shows only its kind; tapping it again shows everything
  const pickType = (k: Kind) => { type.value = type.value === k ? 'all' : k; fam.value = ''; sp.value = ''; };

  // ---- search among what has been seen: species and families, with their photo ----
  const nq = norm(q.trim());
  const searching = nq.length >= 2;
  const inPeriod = searching ? all.filter((r) => pass(r, 'period')) : [];
  const spHits = bySpecies(inPeriod.filter((r) => norm(r.name).includes(nq) || norm(r.fr).includes(nq) || norm(r.sci).includes(nq))).slice(0, 5);
  const famHits = [...new Set(inPeriod.map((r) => r.family).filter(Boolean))]
    .map((f) => ({ f, label: familyEn({ family: f } as any), n: inPeriod.filter((r) => r.family === f).length }))
    .filter((x) => norm(x.label).includes(nq) || norm(x.f).includes(nq)).slice(0, 2);
  const pick = (species: string, family: string) => { type.value = 'all'; sp.value = species; fam.value = family; setQ(''); (document.activeElement as HTMLElement | null)?.blur(); };

  const obsN = `${shown.length} obs`;

  return (
    <div class="mapwrap" style={`--strip-h:${stripH}px`}>
      <div class="map" ref={el} />
      {state === 'ok' && (
        <div class="mapbar">
          <label class={'mfind' + (searching ? ' open' : '')}>
            <Icon name="search" size={18} />
            <input type="search" placeholder="Species or family seen…" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
            {q && <button onClick={(e) => { e.preventDefault(); setQ(''); }} aria-label="Clear the search"><Icon name="x" size={13} stroke={2.8} /></button>}
          </label>
          {searching ? (
            <div class="msug">
              {spHits.map(({ id, row, n }) => {
                const s = byId.value.get(id); const u = s && thumbUrl(s);
                return (
                  <button onClick={() => pick(id, '')}>
                    {u ? <img src={u} alt="" /> : <span class="ph0"><Icon name="bird" size={18} /></span>}
                    <span><b>{row.name}</b><small>{n} observation{n === 1 ? '' : 's'}{row.fr ? ' · ' + row.fr : ''}</small></span>
                  </button>
                );
              })}
              {famHits.map(({ f, label, n }) => (
                <button onClick={() => pick('', f)}>
                  <span class="ph0 fam"><Icon name="binoculars" size={18} /></span>
                  <span><b>All {label.toLowerCase()}</b><small>family · {n} observation{n === 1 ? '' : 's'}</small></span>
                </button>
              ))}
              {spHits.length + famHits.length === 0 && <p>Nothing seen matches “{q.trim()}”{period.value !== 'all' ? ' in this period' : ''}.</p>}
            </div>
          ) : (
            <div class="mrow">
              {TYPES.map(([k, label]) => (
                <button class={'mchip' + (type.value === k ? ' on' : '')} onClick={() => pickType(k)}><i style={{ background: KIND_COLOUR[k] }} />{label}</button>
              ))}
            </div>
          )}
        </div>
      )}
      {state === 'ok' && (
        <div class={'mstrip' + (stripOpen.value ? '' : stripH > 30 ? ' min' : ' min gone')} onTouchStart={swipeStart} onTouchEnd={swipeEnd}>
          <button class="grab" onClick={() => (stripOpen.value = !stripOpen.value)} aria-label={stripOpen.value ? 'Hide the species' : 'Show the species'} />
          <div class="sh">
            <div class="seg">{PERIODS.map(([v, l]) => <button class={period.value === v ? 'on' : ''} onClick={() => (period.value = v)}>{l}</button>)}</div>
            {picked
              ? <span class="st"><b>{picked}</b><span>· {obsN}</span><button onClick={() => { sp.value = ''; fam.value = ''; }} aria-label="Show everything again"><Icon name="x" size={12} stroke={3} /></button></span>
              : <span class="st"><span>{all.length ? `${obsN} · ${nSpecies} species` : ''}</span></span>}
          </div>
          <div class="sc" ref={strip}>
            {species.map(({ id, row, n }) => {
              const s = byId.value.get(id); const u = s && thumbUrl(s);
              return (
                <button class={'it' + (sp.value === id ? ' on' : sp.value ? ' off' : '')} key={id} onClick={() => (sp.value = sp.value === id ? '' : id)}>
                  <span class="p">{u ? <img src={u} loading="lazy" alt="" /> : <Icon name="bird" size={22} />}{n > 1 && <em>{n}</em>}</span>
                  <span class="n">{row.name}</span>
                </button>
              );
            })}
            {species.length === 0 && <p>{all.length ? 'Nothing seen with these filters.' : 'Observations logged with a position appear here, and on the map.'}</p>}
          </div>
        </div>
      )}
      {state === 'ok' && outside && <div class="mapnote">You are outside the mapped area (Makalali / Pidwa).</div>}
      {state === 'nopack' && <div class="mapmsg"><div><p>The map pack is not downloaded (or no network).</p><a class="btn" href={href('settings')}>Go to settings</a></div></div>}
      {state === 'error' && <div class="mapmsg"><div><p>Map error</p><pre>{err}</pre></div></div>}
    </div>
  );
}
