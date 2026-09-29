// Step 11: sound identification model.
// Source: the BirdNET team's own browser app, https://github.com/birdnet-team/real-time-pwa (code MIT,
// models Creative Commons, see its README). It ships BirdNET V2.4 already converted to TensorFlow.js.
//  - data/out/birdnet/model.json + shards          the classifier (6,522 classes, ~51 MB)
//  - data/out/birdnet/area-model/...               species range model (lat, lon, week) -> occurrence score, ~7 MB
//  - data/out/birdnet/classes.json                 one row per class: [scientific, english, french, pidwaId | null]
//  - data/raw/birdnet_map.json                     Pidwa scientific name -> { index, label, lumped }, read by 06_build
// Re-runnable: files already on disk are skipped.

import fs from 'node:fs';
import path from 'node:path';
import { readSpeciesList, fetchBuffer, readJson, writeJson, sleep, RAW_DIR, OUT_DIR } from './lib.mjs';

const RAW = 'https://raw.githubusercontent.com/birdnet-team/real-time-pwa/main/public/models/birdnet/';
const DIR = path.join(OUT_DIR, 'birdnet');
const UA = 'PidwaChecklist/0.1 (personal offline field app)';
const FORCE = process.argv.includes('--force');

async function get(rel, optional = false) {
  const dest = path.join(DIR, rel);
  if (!FORCE && fs.existsSync(dest) && fs.statSync(dest).size > 0) return fs.readFileSync(dest);
  try {
    const buf = await fetchBuffer(RAW + rel, { headers: { 'User-Agent': UA }, timeoutMs: 300000 });
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    console.log(`  ${rel} ${(buf.length / 1e6).toFixed(2)} MB`);
    await sleep(150);
    return buf;
  } catch (e) {
    if (optional) { console.log(`  !! ${rel}: ${e.message}`); return null; }
    throw e;
  }
}

// ---- 1. model files ------------------------------------------------------------
for (const base of ['', 'area-model/']) {
  const model = JSON.parse((await get(base + 'model.json')).toString('utf8'));
  for (const group of model.weightsManifest) for (const p of group.paths) await get(base + p);
}
// labels are kept in raw/ (the app reads classes.json instead)
const labelsDir = path.join(RAW_DIR, 'birdnet_labels');
fs.mkdirSync(labelsDir, { recursive: true });
const labels = {};
for (const lang of ['en_uk', 'fr']) {
  const f = path.join(labelsDir, lang + '.txt');
  if (FORCE || !fs.existsSync(f)) fs.writeFileSync(f, await fetchBuffer(RAW + 'labels/' + lang + '.txt', { headers: { 'User-Agent': UA } }));
  labels[lang] = fs.readFileSync(f, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
}
if (labels.en_uk.length !== labels.fr.length) throw new Error('label files differ in length');
console.log(`labels: ${labels.en_uk.length} classes`);

// ---- 2. map the Pidwa list onto the classes --------------------------------------
// BirdNET follows the eBird/Clements taxonomy of 2021; our list is closer to IOC 2024.
const SYN = {
  'Spilopelia senegalensis': ['Streptopelia senegalensis'], 'Lanius melanoleucus': ['Urolestes melanoleucus', 'Corvinella melanoleuca'], 'Gallirex porphyreolophus': ['Tauraco porphyreolophus'],
  'Dessonornis humeralis': ['Cossypha humeralis'], 'Agricola pallidus': ['Melaenornis pallidus', 'Bradornis pallidus'], 'Chlorophoneus sulfureopectus': ['Telophorus sulfureopectus'],
  'Ceblepyris pectoralis': ['Coracina pectoralis'], 'Ciconia microscelis': ['Ciconia episcopus'], 'Campocolinus coqui': ['Peliperdix coqui', 'Francolinus coqui'], 'Lophotis ruficrista': ['Eupodotis ruficrista'],
  'Lissotis melanogaster': ['Eupodotis melanogaster'], 'Dendropicos fuscescens': ['Chloropicus fuscescens'], 'Tachymarptis melba': ['Apus melba'], 'Crex egregia': ['Crecopsis egregia'],
  'Fraseria caerulescens': ['Muscicapa caerulescens'], 'Fraseria plumbea': ['Myioparus plumbeus'], 'Lophoceros nasutus': ['Tockus nasutus'], 'Telophorus viridis': ['Chlorophoneus viridis', 'Telophorus quadricolor'],
  'Crinifer concolor': ['Corythaixoides concolor'], 'Ketupa lactea': ['Bubo lacteus'], 'Ortygornis sephaena': ['Dendroperdix sephaena', 'Francolinus sephaena'], 'Chloropicus namaquus': ['Dendropicos namaquus'],
  'Zapornia flavirostra': ['Amaurornis flavirostra', 'Zapornia flavirostris'], 'Buphagus erythrorynchus': ['Buphagus erythrorhynchus'], 'Melaniparus niger': ['Parus niger'], 'Microcarbo africanus': ['Phalacrocorax africanus'],
  'Aquila spilogaster': ['Hieraaetus spilogaster'], 'Clanga pomarina': ['Aquila pomarina'], 'Ixobrychus sturmii': ['Botaurus sturmii'], 'Ispidina picta': ['Ceyx pictus'], 'Emberiza tahapisi': ['Fringillaria tahapisi'],
};
// Species that BirdNET lumps with a sister species: the class is the closest available, flagged in the app.
const LUMPED = { 'Pycnonotus tricolor': 'Pycnonotus barbatus', 'Upupa africana': 'Upupa epops', 'Centropus burchellii': 'Centropus superciliosus' };

const sciIdx = new Map(labels.en_uk.map((l, i) => [l.split('_')[0].toLowerCase(), i]));
const norm = (s) => s.toLowerCase().replace(/grey/g, 'gray').replace(/[^a-z]/g, '');
const engIdx = new Map(labels.en_uk.map((l, i) => [norm(l.split('_')[1] || ''), i]));
const AV = readJson(path.join(RAW_DIR, 'avonet.json'), {});
const birds = readSpeciesList().filter((s) => s.group === 'bird');
const map = {};
const pidwaOf = new Array(labels.en_uk.length).fill(null);
const missing = [];
for (const b of birds) {
  let idx = null, lumped = false;
  for (const n of [b.scientific, ...(SYN[b.scientific] || []), b.paper_scientific]) if (n && sciIdx.has(n.toLowerCase())) { idx = sciIdx.get(n.toLowerCase()); break; }
  if (idx == null && engIdx.has(norm(b.common_en))) idx = engIdx.get(norm(b.common_en));
  if (idx == null && LUMPED[b.scientific] && sciIdx.has(LUMPED[b.scientific].toLowerCase())) { idx = sciIdx.get(LUMPED[b.scientific].toLowerCase()); lumped = true; }
  if (idx == null) { const n = AV[b.scientific]?.name; if (n && sciIdx.has(n.toLowerCase()) && !Object.values(LUMPED).includes(n)) idx = sciIdx.get(n.toLowerCase()); }
  if (idx == null) { missing.push(b.common_en); continue; }
  map[b.scientific] = { index: idx, label: labels.en_uk[idx], lumped };
  pidwaOf[idx] = b.id;
}
writeJson(path.join(RAW_DIR, 'birdnet_map.json'), map);
const classes = labels.en_uk.map((l, i) => { const [sci, en] = l.split('_'); const fr = (labels.fr[i] || '').split('_')[1] || null; return [sci, en || sci, fr, pidwaOf[i]]; });
fs.writeFileSync(path.join(DIR, 'classes.json'), JSON.stringify(classes));
console.log(`Pidwa birds covered by BirdNET: ${Object.keys(map).length}/${birds.length} (${Object.values(map).filter((m) => m.lumped).length} lumped with a sister species)`);
console.log(`not covered (${missing.length}): ${missing.join(', ')}`);
const size = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((a, e) => a + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
console.log(`birdnet pack: ${(size(DIR) / 1e6).toFixed(1)} MB`);
