// Step 5: fetch up to two short MP3 recordings per bird from xeno-canto (API v3, needs a key).
// Key: set XC_KEY env var, or put it in data/xc_key.txt (git-ignored).
// Preference: quality A > B, 3-30 s, southern Africa first, one "song" and one "call" when available.
// Only .mp3 uploads are taken (xeno-canto also serves WAV/FLAC originals of several MB).
// Output: data/out/sounds/<id>-<n>.mp3 and data/raw/sounds.json { [scientific]: [{ xcId, type, quality, length, recordist, license, country, url, file, bytes }] }
// Step 5b then shrinks the clips (mono 48 kbps, 25 s).

import fs from 'node:fs';
import path from 'node:path';
import { readSpeciesList, sleep, fetchJson, fetchBuffer, readJson, writeJson, RAW_DIR, OUT_DIR, DATA_DIR } from './lib.mjs';

const keyFile = path.join(DATA_DIR, 'xc_key.txt');
const KEY = process.env.XC_KEY || (fs.existsSync(keyFile) ? fs.readFileSync(keyFile, 'utf8').trim() : '');
if (!KEY) {
  console.error('No xeno-canto API key. Set XC_KEY or create data/xc_key.txt (get the key on your xeno-canto account page).');
  process.exit(1);
}
const UA = 'PidwaChecklist/0.1 (personal offline field app)';
const SND_DIR = path.join(OUT_DIR, 'sounds');
const META_OUT = path.join(RAW_DIR, 'sounds.json');
const FORCE = process.argv.includes('--force');
const PER_SPECIES = 2;
const WORKERS = 3;
fs.mkdirSync(SND_DIR, { recursive: true });
const meta = FORCE ? {} : readJson(META_OUT, {});

const SOUTHERN = new Set(['South Africa', 'Botswana', 'Zimbabwe', 'Mozambique', 'Namibia', 'Eswatini', 'Swaziland', 'Zambia', 'Malawi', 'Lesotho']);
const lenSec = (s) => { const [m, sec] = String(s).split(':').map(Number); return (m || 0) * 60 + (sec || 0); };

function score(r) {
  let sc = 0;
  sc += { A: 40, B: 25, C: 5 }[r.q] || 0;
  if (SOUTHERN.has(r.cnt)) sc += 20;
  const L = lenSec(r.length);
  if (L >= 5 && L <= 25) sc += 15; else if (L <= 30) sc += 8;
  if (/song/i.test(r.type)) sc += 5;
  return sc;
}

// --relaxed: second pass for species that got nothing: longer recordings and WAV uploads allowed (05b decodes WAV too)
const RELAXED = process.argv.includes('--relaxed');
async function search(gen, sp) {
  const q = RELAXED ? `gen:${gen} sp:${sp} len:3-120` : `gen:${gen} sp:${sp} len:3-30 q:">C"`;
  const url = `https://xeno-canto.org/api/3/recordings?query=${encodeURIComponent(q)}&key=${KEY}&per_page=100`;
  const j = await fetchJson(url, { headers: { 'User-Agent': UA } });
  const ext = RELAXED ? /\.(mp3|wav)$/i : /\.mp3$/i;
  return (j.recordings || []).filter((r) => r.grp === 'birds' && r.status === 'identified' && ext.test(r['file-name'] || ''));
}

// xeno-canto follows IOC; a few of our names are newer or differ
const SYN = {
  'Fraseria caerulescens': ['Muscicapa caerulescens'], 'Fraseria plumbea': ['Myioparus plumbeus'], 'Lanius melanoleucus': ['Urolestes melanoleucus', 'Corvinella melanoleuca'],
  'Agricola pallidus': ['Melaenornis pallidus', 'Bradornis pallidus'], 'Dessonornis humeralis': ['Cossypha humeralis'], 'Ciconia microscelis': ['Ciconia episcopus'],
  'Crex egregia': ['Crecopsis egregia'], 'Lophoceros nasutus': ['Tockus nasutus'], 'Telophorus viridis': ['Chlorophoneus viridis'], 'Crinifer concolor': ['Corythaixoides concolor'],
  'Gallirex porphyreolophus': ['Tauraco porphyreolophus'], 'Ketupa lactea': ['Bubo lacteus'], 'Ceblepyris pectoralis': ['Coracina pectoralis'], 'Campocolinus coqui': ['Peliperdix coqui'],
  'Ortygornis sephaena': ['Dendroperdix sephaena'], 'Chloropicus namaquus': ['Dendropicos namaquus'], 'Zapornia flavirostra': ['Amaurornis flavirostra'], 'Pycnonotus tricolor': ['Pycnonotus barbatus'],
  'Upupa africana': ['Upupa epops'], 'Centropus burchellii': ['Centropus superciliosus'], 'Turdus litsitsirupa': ['Psophocichla litsitsirupa'], 'Buphagus erythrorynchus': ['Buphagus erythrorhynchus'],
};

const species = readSpeciesList().filter((s) => s.group === 'bird');
const WD = readJson(path.join(RAW_DIR, 'wikidata.json'), {});
const AV = readJson(path.join(RAW_DIR, 'avonet.json'), {});
const queue = species.filter((s) => FORCE || !meta[s.scientific] || (RELAXED ? meta[s.scientific].length === 0 : meta[s.scientific].length < PER_SPECIES && !meta[s.scientific].retried));
console.log(`${queue.length}/${species.length} birds to fetch, ${WORKERS} parallel downloads`);
let done = 0, idx = 0;
const none = [];

async function handle(s) {
  const prev = meta[s.scientific] || [];
  const names = [...new Set([s.scientific, ...(SYN[s.scientific] || []), AV[s.scientific]?.name, s.paper_scientific, WD[s.scientific]?.taxonName].filter(Boolean))];
  let recs = [];
  for (const n of names) {
    const [gen, sp] = n.split(' ');
    try { recs = await search(gen, sp); } catch (e) { console.log(`  !! search ${n}: ${e.message}`); }
    if (recs.length) break;
    await sleep(300);
  }
  if (!recs.length) { none.push(s.scientific); const arr = prev.length ? prev : []; arr.retried = true; meta[s.scientific] = arr; return; }
  recs.sort((a, b) => score(b) - score(a));
  const have = new Set(prev.map((e) => e.xcId));
  const picks = [];
  const song = recs.find((r) => /song/i.test(r.type) && !have.has(r.id));
  const call = recs.find((r) => /call/i.test(r.type) && r !== song && !have.has(r.id));
  for (const r of [song, call, ...recs]) if (r && !have.has(r.id) && !picks.includes(r) && picks.length + prev.length < PER_SPECIES) picks.push(r);
  const entries = [...prev];
  for (const r of picks) {
    const i = entries.length + 1;
    const dest = path.join(SND_DIR, `${s.id}-${i}.mp3`);
    try {
      const buf = await fetchBuffer(r.file, { headers: { 'User-Agent': UA } });
      fs.writeFileSync(dest, buf);
      entries.push({ xcId: r.id, type: r.type, quality: r.q, length: r.length, recordist: r.rec, license: r.lic, country: r.cnt, url: r.url, file: path.basename(dest), bytes: buf.length });
    } catch (e) {
      console.log(`  !! ${s.scientific} XC${r.id}: ${e.message}`);
    }
  }
  entries.retried = true;
  meta[s.scientific] = entries;
}

async function worker() {
  while (idx < queue.length) {
    const s = queue[idx++];
    await handle(s);
    done++;
    if (done % 10 === 0) { console.log(`${done}/${queue.length}`); writeJson(META_OUT, meta); }
    await sleep(300);
  }
}
await Promise.all(Array.from({ length: WORKERS }, worker));
// "retried" is a property on the array, JSON.stringify drops it; persist it as a flag entry-less map instead
for (const k of Object.keys(meta)) if (meta[k].retried) Object.defineProperty(meta[k], 'retried', { enumerable: false });
writeJson(META_OUT, meta);
const total = fs.readdirSync(SND_DIR).reduce((a, f) => a + fs.statSync(path.join(SND_DIR, f)).size, 0);
console.log(`\nsounds for ${Object.values(meta).filter((v) => v.length).length}/${species.length} species, ${(total / 1e6).toFixed(1)} MB raw`);
console.log(`no recording: ${none.length}`, none.join(', '));
