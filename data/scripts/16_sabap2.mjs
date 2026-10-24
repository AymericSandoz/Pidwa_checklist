// Step 16: when each bird is around Pidwa, from the SABAP2 bird atlas (https://sabap2.birdmap.africa, Fitzpatrick Institute,
// University of Cape Town). For every checklist bird we download its atlas cards in Limpopo, keep the lowveld pentads
// around Pidwa (BOX) and compute the monthly reporting rate: share of the full-protocol cards of that month that list it.
// The denominator (all cards in the box, per month) comes from one download with inclnull=1.
// Output: data/out/sabap2_months.json { [id]: { spp, name, rate: [12], cards: [12] } }; raw CSVs cached in data/raw/sabap2/.
// Options: --only=<id>, --migrants (skip the birds marked resident in birds.data.json: their months stay "all year").

import fs from 'node:fs';
import path from 'node:path';
import { readSpeciesList, fetchJson, fetchBuffer, readJson, writeJson, parseCsv, RAW_DIR, OUT_DIR } from './lib.mjs';

const API = 'https://api.birdmap.africa/sabap2/v2';
const KEY = '85ee37929696cba93e1cdda4dbb3f93a'; // public key used by the ABAP R package
const DIR = path.join(RAW_DIR, 'sabap2');
const CODES = path.join(DIR, 'codes.json');
const OUT = path.join(OUT_DIR, 'sabap2_months.json');
// Greater Kruger lowveld around Pidwa (-24.06, 30.56), Limpopo side: degrees south / east
const BOX = { latMin: 23.5, latMax: 24.6, lonMin: 30.25, lonMax: 32 };
const CONC = 2; // the atlas server slows right down (minutes per common species) when pushed harder

const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
fs.mkdirSync(DIR, { recursive: true });

/** Pentad "2400_3030" -> its north-west corner, in degrees south / east. */
function pentadLatLon(p) {
  const [a, b] = p.split('_');
  return { lat: +a.slice(0, 2) + +a.slice(2) / 60, lon: +b.slice(0, 2) + +b.slice(2) / 60 };
}
const inBox = (p) => { const { lat, lon } = pentadLatLon(p); return lat >= BOX.latMin && lat < BOX.latMax && lon >= BOX.lonMin && lon < BOX.lonMax; };

async function cards(spp, nulls) {
  const f = path.join(DIR, (nulls ? '_all-' : '') + spp + '.csv');
  if (!fs.existsSync(f)) {
    const url = `${API}/cards/species/${KEY}/${spp}/province/limpopo?format=csv${nulls ? '&inclnull=1' : ''}`;
    // big responses sometimes break off mid-body, which fetchBuffer does not retry
    for (let t = 1; ; t++) {
      try { fs.writeFileSync(f, await fetchBuffer(url, { timeoutMs: 900000 })); break; }
      catch (e) { if (t >= 4) throw e; }
    }
  }
  return parseCsv(fs.readFileSync(f, 'utf8'));
}

/** SABAP2 species code: exact genus + epithet, else the same epithet with a matching English name (genus changes). */
async function findCode(s) {
  const [genus, epithet] = s.scientific.split(' ');
  const hits = (await fetchJson(`${API}/search/species/${encodeURIComponent(epithet)}`)).data || [];
  const norm = (x) => x.toLowerCase().replace(/[^a-z]/g, '');
  let h = hits.find((x) => x.Genus.trim() === genus && x.Species.trim() === epithet);
  const en = norm(s.common_en);
  h ||= hits.find((x) => x.Species.trim() === epithet && (norm(x.Common_species + x.Common_group) === en || en.endsWith(norm(x.Common_group))));
  if (!h) {
    // last resort: search by the last word of the English name and match the full English name
    const word = s.common_en.split(/[\s-]/).pop();
    const more = (await fetchJson(`${API}/search/species/${encodeURIComponent(word)}`)).data || [];
    h = more.find((x) => norm(x.Common_species + x.Common_group) === en || norm(x.old_name || '') === en);
  }
  return h ? { spp: h.Spp, name: `${h.Common_species} ${h.Common_group}`.trim(), sci: `${h.Genus} ${h.Species.trim()}` } : null;
}

const birds = readSpeciesList().filter((s) => s.group === 'bird' && (!only || s.id === only));
const codes = readJson(CODES, {});
for (const s of birds) {
  if (codes[s.id]) continue;
  codes[s.id] = await findCode(s);
  if (!codes[s.id]) console.log('no SABAP2 code for', s.id, s.common_en);
  writeJson(CODES, codes);
}

// denominator: every full-protocol card in the box, per month (one species with inclnull=1 lists every card)
const all = await cards('399', true);
const cardMonth = new Map();
for (const c of all) if (inBox(c.Pentad)) cardMonth.set(c.CardNo, new Date(c.StartDate).getMonth());
const perMonth = Array(12).fill(0);
for (const m of cardMonth.values()) perMonth[m]++;
console.log('cards in the box per month:', perMonth.join(' '));

const out = readJson(OUT, {});
// migrants first: for residents the atlas only double-checks the status
const status = new Map((readJson(path.join(OUT_DIR, '..', '..', 'app', 'src', 'learn', 'birds.data.json'), [])).map((b) => [b.id, b.status]));
const migrantsOnly = process.argv.includes('--migrants');
const todo = birds.filter((s) => codes[s.id] && !(migrantsOnly && status.get(s.id) === 'resident'))
  .sort((a, b) => (status.get(a.id) === 'resident') - (status.get(b.id) === 'resident'));
let i = 0;
async function worker() {
  while (i < todo.length) {
    const s = todo[i++];
    const c = codes[s.id];
    try {
      const hits = Array(12).fill(0);
      const seen = new Set();
      for (const r of await cards(c.spp, false)) {
        if (!cardMonth.has(r.CardNo) || seen.has(r.CardNo)) continue;
        seen.add(r.CardNo);
        hits[cardMonth.get(r.CardNo)]++;
      }
      out[s.id] = { spp: c.spp, name: c.name, rate: hits.map((h, m) => +(h / perMonth[m]).toFixed(3)), cards: perMonth };
      writeJson(OUT, out);
      console.log(s.id.padEnd(32), out[s.id].rate.map((r) => String(Math.round(r * 100)).padStart(3)).join(''));
    } catch (e) {
      console.log('failed', s.id, e.message);
    }
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
writeJson(OUT, out);
console.log('done', Object.keys(out).length, 'species');
