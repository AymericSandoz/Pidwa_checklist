// Step 18: how often each snake and tree has been recorded around Pidwa on iNaturalist (research-grade observations).
// A rough measure of how common it is here, with its biases: big, striking or easy-to-photograph species are over-recorded
// (python, puff adder, baobab), secretive ones under-recorded (burrowing snakes). The levels of snakes.data.json and
// trees.data.json start from these counts and are then adjusted by hand.
// Output: data/raw/inat_counts.json { radiusKm, at, counts: { [scientific]: n } }

import path from 'node:path';
import { readSpeciesList, sleep, fetchJson, writeJson, RAW_DIR } from './lib.mjs';

const UA = 'PidwaChecklist/0.1 (personal offline field app)';
const API = 'https://api.inaturalist.org/v1';
const AT = { lat: -24.06, lng: 30.56 }; // Askari Camp
// snakes are scarce and the lowveld around is the same habitat: a wider circle; for trees a smaller one keeps the
// escarpment forests to the west out
const RADIUS = { snake: 60, tree: 25 };
const TAXON = { snake: 85553, tree: 47126 }; // Serpentes, Plantae

const species = readSpeciesList().filter((s) => RADIUS[s.group]);
const counts = {};
for (const group of Object.keys(RADIUS)) {
  const seen = new Map();
  for (let page = 1; page <= 10; page++) {
    const j = await fetchJson(`${API}/observations/species_counts?taxon_id=${TAXON[group]}&lat=${AT.lat}&lng=${AT.lng}&radius=${RADIUS[group]}&quality_grade=research&per_page=500&page=${page}`, { headers: { 'User-Agent': UA } });
    for (const r of j.results) seen.set(r.taxon.name.toLowerCase(), r.count);
    if (j.results.length < 500) break;
    await sleep(1000);
  }
  for (const s of species.filter((x) => x.group === group)) counts[s.scientific] = seen.get(s.scientific.toLowerCase()) ?? 0;
  console.log(`${group}: ${seen.size} taxa within ${RADIUS[group]} km, ${species.filter((x) => x.group === group && !counts[x.scientific]).length} of ours with no record`);
}
writeJson(path.join(RAW_DIR, 'inat_counts.json'), { radiusKm: RADIUS, at: AT, counts });
console.log(Object.entries(counts).map(([k, v]) => `${v}\t${k}`).join('\n'));
