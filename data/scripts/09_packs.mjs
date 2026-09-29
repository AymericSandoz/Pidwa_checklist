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
const sat = mapAll.filter((f) => f.path.startsWith('map/sat/'));
const map = mapAll.filter((f) => !f.path.startsWith('map/sat/'));
const pack = (files) => ({ files: files.map((f) => ({ path: f.path.replace(/\\/g, '/'), bytes: f.bytes })), bytes: files.reduce((a, f) => a + f.bytes, 0) });
const packs = { sounds: pack(sounds), map: pack(map), sat: pack(sat) };
writeJson(path.join(OUT_DIR, 'packs.json'), packs);
for (const [k, v] of Object.entries(packs)) console.log(k.padEnd(8), v.files.length, 'files', (v.bytes / 1e6).toFixed(1), 'MB');
