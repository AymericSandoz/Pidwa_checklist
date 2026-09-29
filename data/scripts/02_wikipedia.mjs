// Step 2: fetch Wikipedia page summaries (FR + EN) for each species.
// Output: data/raw/wikipedia.json { [scientific]: { fr: {title, extract, image, url}, en: {...} } }

import path from 'node:path';
import { readSpeciesList, sleep, fetchJson, readJson, writeJson, RAW_DIR } from './lib.mjs';

const UA = 'PidwaChecklist/0.1 (personal offline field app)';
const WD = readJson(path.join(RAW_DIR, 'wikidata.json'), {});
const OUT = path.join(RAW_DIR, 'wikipedia.json');
const FORCE = process.argv.includes('--force');
const out = FORCE ? {} : readJson(OUT, {});

async function summary(lang, title) {
  if (!title) return null;
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  try {
    const j = await fetchJson(url, { headers: { 'User-Agent': UA } });
    const img = j.originalimage?.source || null;
    // derive the Commons file name from the upload URL, if it is a Commons file
    let file = null;
    if (img && /upload\.wikimedia\.org\/wikipedia\/commons\//.test(img)) {
      file = decodeURIComponent(img.split('/').pop());
    }
    return { title: j.title, extract: j.extract, image: file, url: j.content_urls?.desktop?.page || null };
  } catch (e) {
    console.log(`  !! ${lang}:${title}: ${e.message}`);
    return null;
  }
}

const species = readSpeciesList();
let done = 0;
for (const s of species) {
  if (out[s.scientific] && out[s.scientific].fr && out[s.scientific].en) { done++; continue; }
  const wd = WD[s.scientific] || {};
  const fr = await summary('fr', wd.frwiki);
  const en = await summary('en', wd.enwiki);
  out[s.scientific] = { fr, en };
  done++;
  if (done % 25 === 0) { console.log(`${done}/${species.length}`); writeJson(OUT, out); }
  await sleep(350);
}
writeJson(OUT, out);
const noFr = species.filter((s) => !out[s.scientific]?.fr?.extract).map((s) => s.scientific);
const noEn = species.filter((s) => !out[s.scientific]?.en?.extract).map((s) => s.scientific);
console.log(`wrote ${OUT}`);
console.log(`no FR extract: ${noFr.length}`, noFr.join(', '));
console.log(`no EN extract: ${noEn.length}`, noEn.join(', '));
