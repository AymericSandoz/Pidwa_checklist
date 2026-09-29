// Step 4: join the bird species with AVONET (Tobias et al. 2022, CC BY 4.0).
// Match by scientific name against the three taxonomies (BirdLife, eBird, BirdTree), with a manual synonym table.
// Output: data/raw/avonet.json { [scientific]: { matched: 'BirdLife'|'eBird'|'BirdTree', name, family, order, mass, beakCulmen, beakNares, beakWidth, beakDepth, tarsus, wing, tail, hwi, habitat, habitatDensity, migration, trophicLevel, trophicNiche, lifestyle } }

import path from 'node:path';
import * as fs from 'node:fs';
import * as XLSX from 'xlsx';
XLSX.set_fs(fs);
import { readSpeciesList, readJson, writeJson, RAW_DIR } from './lib.mjs';

const wb = XLSX.readFile(path.join(RAW_DIR, 'AVONET.xlsx'));
const sheets = [
  ['BirdLife', 'AVONET1_BirdLife', 'Species1', 'Family1', 'Order1'],
  ['eBird', 'AVONET2_eBird', 'Species2', 'Family2', 'Order2'],
  ['BirdTree', 'AVONET3_BirdTree', 'Species3', 'Family3', 'Order3'],
];
const tables = sheets.map(([tag, sheet, sp, fam, ord]) => {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet]);
  const idx = new Map(rows.map((r) => [String(r[sp]).trim().toLowerCase(), r]));
  return { tag, sp, fam, ord, idx };
});

// Names in our list that AVONET (2022 taxonomies) knows under another name.
const SYNONYMS = {
  'Upupa africana': ['Upupa epops'],
  'Centropus burchellii': ['Centropus superciliosus'],
  'Turdus litsitsirupa': ['Psophocichla litsitsirupa'],
  'Lophoceros nasutus': ['Tockus nasutus'],
  'Campocolinus coqui': ['Peliperdix coqui', 'Francolinus coqui'],
  'Ortygornis sephaena': ['Dendroperdix sephaena', 'Francolinus sephaena'],
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
  'Zapornia flavirostra': ['Amaurornis flavirostra', 'Zapornia flavirostris'],
  'Lissotis melanogaster': ['Eupodotis melanogaster'],
  'Turdoides jardineii': ['Turdoides jardineii'],
  'Melaniparus niger': ['Parus niger'],
  'Pycnonotus tricolor': ['Pycnonotus barbatus'],
  'Ptilopsis granti': ['Ptilopsis leucotis'],
  'Cinnyris afer': ['Cinnyris afer'],
  'Chalcomitra senegalensis': ['Chalcomitra senegalensis'],
  'Spilopelia senegalensis': ['Streptopelia senegalensis'],
  'Pternistis natalensis': ['Francolinus natalensis'],
  'Pternistis swainsonii': ['Francolinus swainsonii'],
  'Microcarbo africanus': ['Phalacrocorax africanus'],
  'Tachymarptis melba': ['Apus melba'],
  'Clanga pomarina': ['Aquila pomarina'],
  'Cuculus gularis': ['Cuculus gularis'],
  'Crithagra mozambica': ['Serinus mozambicus'],
  'Chlorocichla flaviventris': ['Chlorocichla flaviventris'],
  'Emberiza tahapisi': ['Fringillaria tahapisi'],
  'Hedydipna collaris': ['Anthreptes collaris'],
  'Terathopius ecaudatus': ['Terathopius ecaudatus'],
};

function lookup(name) {
  const cands = [name, ...(SYNONYMS[name] || [])];
  for (const c of cands) {
    for (const t of tables) {
      const r = t.idx.get(c.toLowerCase());
      if (r) return { t, r, usedName: c };
    }
  }
  return null;
}

const num = (v) => (v === undefined || v === null || v === '' || v === 'NA' ? null : Number(v));
const species = readSpeciesList().filter((s) => s.group === 'bird');
const out = {};
const missing = [];
for (const s of species) {
  const hit = lookup(s.scientific);
  if (!hit) { missing.push(s.scientific); continue; }
  const { t, r, usedName } = hit;
  out[s.scientific] = {
    matched: t.tag,
    name: usedName,
    family: r[t.fam],
    order: r[t.ord],
    mass: num(r['Mass']),
    beakCulmen: num(r['Beak.Length_Culmen']),
    beakNares: num(r['Beak.Length_Nares']),
    beakWidth: num(r['Beak.Width']),
    beakDepth: num(r['Beak.Depth']),
    tarsus: num(r['Tarsus.Length']),
    wing: num(r['Wing.Length']),
    tail: num(r['Tail.Length']),
    hwi: num(r['Hand-Wing.Index']),
    habitat: r['Habitat'] || null,
    habitatDensity: num(r['Habitat.Density']),
    migration: num(r['Migration']),
    trophicLevel: r['Trophic.Level'] || null,
    trophicNiche: r['Trophic.Niche'] || null,
    lifestyle: r['Primary.Lifestyle'] || null,
  };
}
writeJson(path.join(RAW_DIR, 'avonet.json'), out);
console.log(`AVONET: ${Object.keys(out).length}/${species.length} birds matched`);
const by = {};
for (const v of Object.values(out)) by[v.matched] = (by[v.matched] || 0) + 1;
console.log('by taxonomy:', JSON.stringify(by));
console.log(`missing: ${missing.length}`, missing.join(', '));
