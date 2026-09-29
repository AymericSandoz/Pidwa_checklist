// Step 7: official French bird names from the IOC World Bird List multilingual file (CINFO names).
// Output: data/raw/ioc_fr.json { [scientific]: { fr, en_ioc, matchedName } }

import * as fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { readSpeciesList, readJson, writeJson, RAW_DIR } from './lib.mjs';
XLSX.set_fs(fs);

const wb = XLSX.readFile(path.join(RAW_DIR, 'IOC_multiling_10.2.xlsx'));
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
const header0 = rows[0], header1 = rows[1];
const colSci = header0.findIndex((h) => /Scientific Name/i.test(String(h)));
const colFr = header0.findIndex((h) => String(h) === 'French');
const colEn = header1.findIndex((h) => String(h) === 'English');
if (colSci < 0 || colFr < 0 || colEn < 0) throw new Error(`columns not found: sci=${colSci} fr=${colFr} en=${colEn}`);

const idx = new Map();
for (const r of rows.slice(4)) {
  const sci = r[colSci];
  if (typeof sci === 'string' && /^[A-Z][a-z]+ [a-z-]+$/.test(sci.trim())) {
    idx.set(sci.trim().toLowerCase(), { fr: r[colFr] ? String(r[colFr]).trim() : null, en_ioc: r[colEn] ? String(r[colEn]).trim() : null, name: sci.trim() });
  }
}
console.log(`IOC 10.2: ${idx.size} species with names`);

// our list uses a few names newer than IOC 10.2 (2020)
const SYN = {
  'Lophoceros nasutus': ['Tockus nasutus'],
  'Campocolinus coqui': ['Peliperdix coqui'],
  'Ortygornis sephaena': ['Dendroperdix sephaena'],
  'Telophorus viridis': ['Chlorophoneus viridis', 'Telophorus quadricolor'],
  'Crinifer concolor': ['Corythaixoides concolor'],
  'Fraseria plumbea': ['Myioparus plumbeus'],
  'Fraseria caerulescens': ['Muscicapa caerulescens'],
  'Lanius melanoleucus': ['Urolestes melanoleucus', 'Corvinella melanoleuca'],
  'Agricola pallidus': ['Melaenornis pallidus', 'Bradornis pallidus'],
  'Gallirex porphyreolophus': ['Tauraco porphyreolophus'],
  'Ketupa lactea': ['Bubo lacteus'],
  'Ceblepyris pectoralis': ['Coracina pectoralis'],
  'Dessonornis humeralis': ['Cossypha humeralis'],
  'Ciconia microscelis': ['Ciconia episcopus'],
  'Buphagus erythrorynchus': ['Buphagus erythrorhynchus'],
  'Chloropicus namaquus': ['Dendropicos namaquus'],
  'Zapornia flavirostra': ['Amaurornis flavirostra'],
  'Pycnonotus tricolor': ['Pycnonotus barbatus'],
  'Upupa africana': ['Upupa epops'],
  'Centropus burchellii': ['Centropus superciliosus'],
  'Turdus litsitsirupa': ['Psophocichla litsitsirupa'],
  'Crex egregia': ['Crecopsis egregia'],
  'Melaniparus niger': ['Parus niger'],
  'Tachymarptis melba': ['Apus melba'],
  'Spilopelia senegalensis': ['Streptopelia senegalensis'],
  'Microcarbo africanus': ['Phalacrocorax africanus'],
};

const species = readSpeciesList().filter((s) => s.group === 'bird');
const out = {};
const missing = [];
for (const s of species) {
  const cands = [s.scientific, ...(SYN[s.scientific] || []), s.paper_scientific];
  let hit = null;
  for (const c of cands) { hit = c && idx.get(c.toLowerCase()); if (hit) break; }
  if (!hit || !hit.fr) { missing.push(s.scientific); continue; }
  out[s.scientific] = { fr: hit.fr, en_ioc: hit.en_ioc, matchedName: hit.name };
}
writeJson(path.join(RAW_DIR, 'ioc_fr.json'), out);
console.log(`French names: ${Object.keys(out).length}/${species.length}`);
console.log(`missing: ${missing.length}`, missing.join(', '));
for (const s of species.filter((_, i) => i % 30 === 0)) console.log('  ', s.common_en, '->', out[s.scientific]?.fr);
