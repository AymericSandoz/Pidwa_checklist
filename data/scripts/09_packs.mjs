// Step 9: list the on-demand packs (sounds, map, satellite) with file sizes -> data/out/packs.json
import fs from 'node:fs';
import path from 'node:path';
import { OUT_DIR, writeJson } from './lib.mjs';

function walk(dir, rel = '') {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name), r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) out.push(...walk(p, r));
    else out.push({ path: r, bytes: fs.statSync(p).size });
  }
  return out;
}
const sounds = walk(path.join(OUT_DIR, 'sounds'), 'sounds');
const mapAll = walk(path.join(OUT_DIR, 'map'), 'map');
// the map is satellite-only: tiles + reserve outline (the OpenStreetMap vector tiles are no longer used)
const sat = mapAll.filter((f) => f.path.startsWith('map/sat/') || f.path === 'map/makalali.geojson');
const pack = (files) => ({ files: files.map((f) => ({ path: f.path.replace(/\\/g, '/'), bytes: f.bytes })), bytes: files.reduce((a, f) => a + f.bytes, 0) });
const birdnet = walk(path.join(OUT_DIR, 'birdnet'), 'birdnet');
const photos = walk(path.join(OUT_DIR, 'photos'), 'photos'); // extra species photos for the quiz and the galleries (14_photos.mjs)
const signs = walk(path.join(OUT_DIR, 'signs'), 'signs').filter((f) => f.path.endsWith('.webp')); // field photos of tracks and dung (15_signs.mjs); index.json stays in the app
// the main photo of every species: a pack and not in the service worker's install, which is all-or-nothing and timed out on a phone over mobile data
const images = walk(path.join(OUT_DIR, 'images'), 'images');
const packs = { images: pack(images), sounds: pack(sounds), sat: pack(sat), birdnet: pack(birdnet), photos: pack(photos), signs: pack(signs) };
writeJson(path.join(OUT_DIR, 'packs.json'), packs);
for (const [k, v] of Object.entries(packs)) console.log(k.padEnd(8), v.files.length, 'files', (v.bytes / 1e6).toFixed(1), 'MB');
