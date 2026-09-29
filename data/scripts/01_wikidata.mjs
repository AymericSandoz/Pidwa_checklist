// Step 1: resolve every species of species_list.csv against Wikidata.
// Output: data/raw/wikidata.json  { [scientific]: { qid, taxonName, label_en, label_fr, image, family, family_fr, order, order_fr, frwiki, enwiki, iucn } }
// Re-runnable: already-resolved species are kept unless --force is passed.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSpeciesList, sleep, fetchJson } from './lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'raw', 'wikidata.json');
const FORCE = process.argv.includes('--force');

const SPARQL = 'https://query.wikidata.org/sparql';
const UA = 'PidwaChecklist/0.1 (personal offline field app; contact via github)';

const species = readSpeciesList();
const existing = fs.existsSync(OUT) && !FORCE ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};

const todo = species.filter((s) => !existing[s.scientific]);
console.log(`${species.length} species, ${todo.length} to resolve`);

// --- pass 1: exact taxon name (P225) match, batched -------------------------
async function sparql(query) {
  const url = SPARQL + '?format=json&query=' + encodeURIComponent(query);
  return fetchJson(url, { headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' } });
}

function buildQuery(names) {
  const values = names.map((n) => `"${n.replace(/"/g, '\\"')}"`).join(' ');
  return `
SELECT ?name ?item ?taxonName ?label_en ?label_fr ?image ?family ?family_fr ?order ?order_fr ?frwiki ?enwiki ?iucnLabel WHERE {
  VALUES ?name { ${values} }
  ?item wdt:P225 ?name ; wdt:P31 wd:Q16521 .
  ?item wdt:P225 ?taxonName .
  OPTIONAL { ?item rdfs:label ?label_en FILTER(LANG(?label_en) = "en") }
  OPTIONAL { ?item rdfs:label ?label_fr FILTER(LANG(?label_fr) = "fr") }
  OPTIONAL { ?item wdt:P18 ?image }
  OPTIONAL { ?item wdt:P141 ?iucn . ?iucn rdfs:label ?iucnLabel FILTER(LANG(?iucnLabel) = "en") }
  OPTIONAL { ?item wdt:P171+ ?fam . ?fam wdt:P105 wd:Q35409 ; wdt:P225 ?family .
             OPTIONAL { ?fam rdfs:label ?family_fr FILTER(LANG(?family_fr) = "fr") } }
  OPTIONAL { ?item wdt:P171+ ?ord . ?ord wdt:P105 wd:Q36602 ; wdt:P225 ?order .
             OPTIONAL { ?ord rdfs:label ?order_fr FILTER(LANG(?order_fr) = "fr") } }
  OPTIONAL { ?frwiki schema:about ?item ; schema:isPartOf <https://fr.wikipedia.org/> }
  OPTIONAL { ?enwiki schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }
}`;
}

function rowToRecord(b) {
  const v = (k) => (b[k] ? b[k].value : null);
  const title = (url) => (url ? decodeURIComponent(url.split('/wiki/')[1]).replace(/_/g, ' ') : null);
  return {
    qid: v('item').split('/').pop(),
    taxonName: v('taxonName'),
    label_en: v('label_en'),
    label_fr: v('label_fr'),
    image: v('image') ? decodeURIComponent(v('image').split('/Special:FilePath/')[1]) : null,
    family: v('family'),
    family_fr: v('family_fr'),
    order: v('order'),
    order_fr: v('order_fr'),
    frwiki: title(v('frwiki')),
    enwiki: title(v('enwiki')),
    iucn: v('iucnLabel'),
  };
}

const results = { ...existing };
const CHUNK = 40;
for (let i = 0; i < todo.length; i += CHUNK) {
  const chunk = todo.slice(i, i + CHUNK);
  const names = chunk.map((s) => s.scientific);
  process.stdout.write(`SPARQL batch ${i / CHUNK + 1}/${Math.ceil(todo.length / CHUNK)} ... `);
  const json = await sparql(buildQuery(names));
  const byName = {};
  for (const b of json.results.bindings) {
    const rec = rowToRecord(b);
    const name = b.name.value;
    // a species can yield several rows (several images / multiple family paths); merge, first non-null wins
    byName[name] = byName[name] || {};
    for (const [k, val] of Object.entries(rec)) if (byName[name][k] == null && val != null) byName[name][k] = val;
  }
  let found = 0;
  for (const n of names) if (byName[n]) { results[n] = { ...byName[n], matchedBy: 'P225' }; found++; }
  console.log(`${found}/${names.length} matched`);
  await sleep(500);
}

// --- pass 2: fallback via search API (catches synonyms / paper spellings) ----
const missing = species.filter((s) => !results[s.scientific]);
console.log(`\n${missing.length} species not matched by exact taxon name; trying search (synonyms / aliases)`);
for (const s of missing) {
  const candidates = [s.scientific, s.paper_scientific].filter(Boolean);
  let hit = null;
  for (const term of candidates) {
    const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(term)}&language=en&type=item&limit=5&format=json`;
    const r = await fetchJson(url, { headers: { 'User-Agent': UA } });
    const cand = (r.search || []).find((x) => /taxon|species/i.test(x.description || ''));
    if (cand) { hit = cand; break; }
    await sleep(200);
  }
  if (!hit) { console.log(`  !! ${s.scientific}: no Wikidata match`); continue; }
  // fetch full record for that QID with the same SPARQL shape
  const q = buildQuery([]).replace(/VALUES \?name \{\s*\}\s*\?item wdt:P225 \?name ; wdt:P31 wd:Q16521 \./, `BIND(wd:${hit.id} AS ?item) BIND("${s.scientific}" AS ?name)`);
  const json = await sparql(q);
  if (!json.results.bindings.length) { console.log(`  !! ${s.scientific}: ${hit.id} found by search but no taxon data`); continue; }
  const merged = {};
  for (const b of json.results.bindings) {
    const rec = rowToRecord(b);
    for (const [k, val] of Object.entries(rec)) if (merged[k] == null && val != null) merged[k] = val;
  }
  results[s.scientific] = { ...merged, matchedBy: 'search:' + hit.label };
  console.log(`  ok ${s.scientific} -> ${hit.id} (${hit.label}) taxon=${merged.taxonName}`);
  await sleep(300);
}

fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
const n = species.filter((s) => results[s.scientific]).length;
console.log(`\nwrote ${OUT}: ${n}/${species.length} resolved`);
const noImg = species.filter((s) => results[s.scientific] && !results[s.scientific].image).map((s) => s.scientific);
const noFr = species.filter((s) => results[s.scientific] && !results[s.scientific].label_fr).map((s) => s.scientific);
const noFam = species.filter((s) => results[s.scientific] && !results[s.scientific].family).map((s) => s.scientific);
console.log(`no image: ${noImg.length}`, noImg.join(', '));
console.log(`no French label: ${noFr.length}`, noFr.join(', '));
console.log(`no family: ${noFam.length}`, noFam.join(', '));
