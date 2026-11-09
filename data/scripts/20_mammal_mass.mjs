// Step 20: adult body mass of the mammals, from PanTHERIA (Jones et al. 2009, Ecology 90:2648, taxonomy of MSW3 2005):
// https://esapubs.org/archive/ecol/E090/184/ , file PanTHERIA_1-0_WR05_Aug2008.txt saved in data/raw/pantheria/.
// One mean adult mass per species, sexes together: a bull elephant weighs about twice a cow.
// Output: data/raw/mammal_mass.json { [scientific]: grams }, read by 06_build.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { readSpeciesList, writeJson, RAW_DIR } from './lib.mjs';

// our names -> MSW3 names, where the taxonomy has moved since 2005
const SYN = {
  'Lupulella mesomelas': 'Canis mesomelas', 'Lupulella adusta': 'Canis adustus', 'Giraffa giraffa': 'Giraffa camelopardalis',
  'Smutsia temminckii': 'Manis temminckii', 'Felis lybica': 'Felis silvestris', 'Parahyaena brunnea': 'Hyaena brunnea',
  'Proteles cristatus': 'Proteles cristata', 'Tragelaphus sylvaticus': 'Tragelaphus scriptus', 'Herpestes sanguineus': 'Galerella sanguinea',
  // no mass for C. pygerythrus: the one of C. aethiops, of which it was a subspecies
  'Chlorocebus pygerythrus': 'Chlorocebus aethiops',
};
const rows = fs.readFileSync(path.join(RAW_DIR, 'pantheria', 'PanTHERIA_1-0_WR05_Aug2008.txt'), 'utf8').trim().split(/\r?\n/).map((l) => l.split('\t'));
const [head, ...data] = rows;
const iName = head.indexOf('MSW05_Binomial'), iMass = head.indexOf('5-1_AdultBodyMass_g');
const mass = new Map(data.map((r) => [r[iName], +r[iMass]]).filter(([, m]) => m > 0));
const out = {}, miss = [];
for (const s of readSpeciesList().filter((s) => s.group === 'mammal')) {
  const m = mass.get(SYN[s.scientific] || s.scientific);
  if (m) out[s.scientific] = Math.round(m * 10) / 10; else miss.push(s.scientific);
}
writeJson(path.join(RAW_DIR, 'mammal_mass.json'), out);
console.log(`${Object.keys(out).length} mammals with a mass; missing: ${miss.join(', ') || 'none'}`);
