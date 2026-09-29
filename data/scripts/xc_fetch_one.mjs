// Test helper: download one short good-quality MP3 of a species from xeno-canto.
// Usage: node data/scripts/xc_fetch_one.mjs "Genus species" out.mp3
import fs from 'node:fs';
import path from 'node:path';
import { fetchJson, fetchBuffer, DATA_DIR } from './lib.mjs';
const [name, out] = process.argv.slice(2);
const KEY = fs.readFileSync(path.join(DATA_DIR, 'xc_key.txt'), 'utf8').trim();
const [gen, sp] = name.split(' ');
const j = await fetchJson(`https://xeno-canto.org/api/3/recordings?query=${encodeURIComponent(`gen:${gen} sp:${sp} len:8-30 q:A`)}&key=${KEY}&per_page=50`);
const r = (j.recordings || []).find((x) => /\.mp3$/i.test(x['file-name'] || '') && /song|call/i.test(x.type));
if (!r) { console.log('no recording for', name); process.exit(1); }
fs.writeFileSync(out, await fetchBuffer(r.file));
console.log(name, '-> XC' + r.id, r.type, r.length, r.cnt, fs.statSync(out).size, 'bytes');
