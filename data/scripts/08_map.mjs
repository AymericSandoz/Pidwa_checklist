// Step 8: offline map pack for the Greater Makalali / Pidwa area.
//  - vector tiles (OpenMapTiles schema) from OpenFreeMap, z0..MAXZ, only inside the bbox -> data/out/map/tiles/{z}/{x}/{y}.pbf
//  - fonts + sprites from OpenFreeMap -> data/out/map/fonts, data/out/map/sprites
//  - the "liberty" style rewritten to local URLs -> data/out/map/style.json
//  - optional satellite (Sentinel-2 cloudless 2020 by EOX, CC BY-NC-SA 4.0) z8..SATZ -> data/out/map/sat/{z}/{x}/{y}.jpg
// Usage: node 08_map.mjs [--sat] [--force]

import fs from 'node:fs';
import path from 'node:path';
import { sleep, fetchJson, fetchBuffer, writeJson, OUT_DIR, RAW_DIR } from './lib.mjs';

const BBOX = { west: 30.40, south: -24.35, east: 30.90, north: -23.90 }; // Greater Makalali NR + Pidwa + Gravelotte, with margin
const MAXZ = 14;   // OpenFreeMap planet tiles stop at 14; MapLibre overzooms to 18+
const SATZ = 14;
const INNER = { west: 30.50, south: -24.25, east: 30.82, north: -23.98 }; // Greater Makalali + Pidwa proper: one more satellite zoom level here
const INNER_SATZ = 15;
const S2_YEAR = 2023;
const MAP_DIR = path.join(OUT_DIR, 'map');
const UA = 'PidwaChecklist/0.1 (personal offline field app)';
const SAT = process.argv.includes('--sat');
const FORCE = process.argv.includes('--force');

const d2r = (d) => (d * Math.PI) / 180;
function tileX(lon, z) { return Math.floor(((lon + 180) / 360) * 2 ** z); }
function tileY(lat, z) { return Math.floor(((1 - Math.log(Math.tan(d2r(lat)) + 1 / Math.cos(d2r(lat))) / Math.PI) / 2) * 2 ** z); }
function tilesInBbox(z, box = BBOX) {
  const x0 = tileX(box.west, z), x1 = tileX(box.east, z);
  const y0 = tileY(box.north, z), y1 = tileY(box.south, z);
  const out = [];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push([z, x, y]);
  return out;
}

async function download(url, dest, { optional = false } = {}) {
  if (!FORCE && fs.existsSync(dest)) return 'cached';
  try {
    const buf = await fetchBuffer(url, { headers: { 'User-Agent': UA } });
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    return buf.length;
  } catch (e) {
    if (optional && /HTTP 404/.test(e.message)) { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, Buffer.alloc(0)); return 'empty'; }
    throw e;
  }
}

// ---- 1. style + tilejson ------------------------------------------------------
const style = await fetchJson('https://tiles.openfreemap.org/styles/liberty', { headers: { 'User-Agent': UA } });
const tilejson = await fetchJson(style.sources.openmaptiles.url, { headers: { 'User-Agent': UA } });
const tileTpl = tilejson.tiles[0];
console.log('vector tiles template:', tileTpl, 'maxzoom', tilejson.maxzoom);

// ---- 2. vector tiles ----------------------------------------------------------
let total = 0, n = 0, bytes = 0;
const all = [];
for (let z = 0; z <= MAXZ; z++) all.push(...tilesInBbox(z));
console.log(`vector: ${all.length} tiles z0..${MAXZ}`);
for (const [z, x, y] of all) {
  const url = tileTpl.replace('{z}', z).replace('{x}', x).replace('{y}', y);
  const r = await download(url, path.join(MAP_DIR, 'tiles', String(z), String(x), `${y}.pbf`), { optional: true });
  if (typeof r === 'number') { bytes += r; n++; }
  total++;
  if (total % 100 === 0) console.log(`  ${total}/${all.length} (${(bytes / 1e6).toFixed(1)} MB new)`);
  if (typeof r === 'number') await sleep(60);
}
console.log(`vector done: ${n} downloaded, ${(bytes / 1e6).toFixed(1)} MB`);

// ---- 3. low-zoom shaded relief raster (only a handful of tiles) --------------
const neTpl = style.sources.ne2_shaded.tiles[0];
for (let z = 0; z <= 6; z++) for (const [, x, y] of tilesInBbox(z)) {
  await download(neTpl.replace('{z}', z).replace('{x}', x).replace('{y}', y), path.join(MAP_DIR, 'ne2', String(z), String(x), `${y}.png`), { optional: true });
}

// ---- 4. fonts + sprites -------------------------------------------------------
const fonts = new Set();
for (const l of style.layers) for (const f of l.layout?.['text-font'] || []) fonts.add(f);
const ranges = ['0-255', '256-511', '512-767', '768-1023', '8192-8447']; // Latin, Latin ext., IPA, Greek, general punctuation
for (const f of fonts) for (const r of ranges) {
  const url = style.glyphs.replace('{fontstack}', encodeURIComponent(f)).replace('{range}', r);
  await download(url, path.join(MAP_DIR, 'fonts', f, `${r}.pbf`), { optional: true });
}
for (const suffix of ['.json', '.png', '@2x.json', '@2x.png']) {
  await download(style.sprite + suffix, path.join(MAP_DIR, 'sprites', 'ofm' + suffix));
}
console.log('fonts + sprites done');

// ---- 5. local style ------------------------------------------------------------
const local = JSON.parse(JSON.stringify(style));
local.sources.openmaptiles = { type: 'vector', tiles: ['map/tiles/{z}/{x}/{y}.pbf'], minzoom: 0, maxzoom: MAXZ, bounds: [BBOX.west, BBOX.south, BBOX.east, BBOX.north], attribution: '© OpenMapTiles © OpenStreetMap contributors · OpenFreeMap' };
local.sources.ne2_shaded = { ...style.sources.ne2_shaded, tiles: ['map/ne2/{z}/{x}/{y}.png'] };
local.glyphs = 'map/fonts/{fontstack}/{range}.pbf';
local.sprite = 'map/sprites/ofm';
if (SAT) {
  local.sources.sat = { type: 'raster', tiles: ['map/sat/{z}/{x}/{y}.jpg'], tileSize: 256, minzoom: 8, maxzoom: INNER_SATZ, bounds: [BBOX.west, BBOX.south, BBOX.east, BBOX.north], attribution: `Sentinel-2 cloudless ${S2_YEAR} by EOX (CC BY-NC-SA 4.0)` };
  // insert satellite layer right after the background, hidden by default (the app toggles it)
  const i = local.layers.findIndex((l) => l.type !== 'background');
  local.layers.splice(i, 0, { id: 'sat', type: 'raster', source: 'sat', layout: { visibility: 'visible' }, paint: { 'raster-opacity': 1 } });
}
local.center = [(BBOX.west + BBOX.east) / 2, (BBOX.south + BBOX.north) / 2];
local.zoom = 11;
writeJson(path.join(MAP_DIR, 'style.json'), local);
writeJson(path.join(MAP_DIR, 'bbox.json'), BBOX);
if (fs.existsSync(path.join(RAW_DIR, 'makalali.geojson'))) fs.copyFileSync(path.join(RAW_DIR, 'makalali.geojson'), path.join(MAP_DIR, 'makalali.geojson'));
console.log('style.json written');

// ---- 6. satellite -------------------------------------------------------------
if (SAT) {
  const satAll = [];
  for (let z = 8; z <= SATZ; z++) satAll.push(...tilesInBbox(z));
  for (let z = SATZ + 1; z <= INNER_SATZ; z++) satAll.push(...tilesInBbox(z, INNER));
  console.log(`satellite: ${satAll.length} tiles z8..${SATZ} (+ z${INNER_SATZ} on the reserve)`);
  let sn = 0, sb = 0;
  for (const [z, x, y] of satAll) {
    const url = `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-${S2_YEAR}_3857/default/g/${z}/${y}/${x}.jpg`;
    try {
      const r = await download(url, path.join(MAP_DIR, 'sat', String(z), String(x), `${y}.jpg`));
      if (typeof r === 'number') { sb += r; sn++; await sleep(80); }
    } catch (e) {
      console.log(`  !! sat ${z}/${x}/${y}: ${e.message} (re-run to complete)`);
      await sleep(3000);
    }
    if ((sn + 1) % 100 === 0) console.log(`  sat ${sn} (${(sb / 1e6).toFixed(1)} MB)`);
  }
  console.log(`satellite done: ${sn} downloaded, ${(sb / 1e6).toFixed(1)} MB`);
}

const size = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).reduce((a, e) => a + (e.isDirectory() ? size(path.join(dir, e.name)) : fs.statSync(path.join(dir, e.name)).size), 0) : 0;
console.log(`map pack total: ${(size(MAP_DIR) / 1e6).toFixed(1)} MB`);
