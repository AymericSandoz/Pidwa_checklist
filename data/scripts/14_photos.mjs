// Step 14: extra photos per species from iNaturalist observations, for the quiz and the species-page gallery.
// Research-grade observations with a Creative Commons photo, preferably taken in South Africa (so the animals look like
// the Pidwa ones: same subspecies, same season, same light), one photo per observer, most-faved first. When South Africa
// does not give enough, the rest of the world fills up.
// Output: data/out/photos/<id>-<n>.webp (500 px, light) and data/raw/photos_inat.json { [scientific]: [ {file, width, height, author, license, licenseUrl, page, obs} ] }

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { readSpeciesList, sleep, fetchJson, fetchBuffer, readJson, writeJson, RAW_DIR, OUT_DIR } from './lib.mjs';

const UA = 'PidwaChecklist/0.1 (personal offline field app)';
const API = 'https://api.inaturalist.org/v1';
const PLACE_ZA = 6986; // iNaturalist place id of South Africa
const N = 5;           // photos per species
const MAX = 640;       // px, longest side (iNat 'medium' is 500 px: that is what we get, and what a phone screen needs)
const LICENSES = 'cc0,cc-by,cc-by-nc,cc-by-sa,cc-by-nc-sa';
const OUT = path.join(OUT_DIR, 'photos');
const META_OUT = path.join(RAW_DIR, 'photos_inat.json');
const FORCE = process.argv.includes('--force');
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
fs.mkdirSync(OUT, { recursive: true });

const LICENSE_URL = { 'cc0': 'https://creativecommons.org/publicdomain/zero/1.0/', 'cc-by': 'https://creativecommons.org/licenses/by/4.0/', 'cc-by-nc': 'https://creativecommons.org/licenses/by-nc/4.0/', 'cc-by-sa': 'https://creativecommons.org/licenses/by-sa/4.0/', 'cc-by-nc-sa': 'https://creativecommons.org/licenses/by-nc-sa/4.0/' };
const meta = FORCE ? {} : readJson(META_OUT, {});
const MAIN = readJson(path.join(RAW_DIR, 'images_inat.json'), {}); // the species photo already shipped: gives the taxon id, and its photo is skipped here
const AV = readJson(path.join(RAW_DIR, 'avonet.json'), {});
const WD = readJson(path.join(RAW_DIR, 'wikidata.json'), {});
const H = { headers: { 'User-Agent': UA } };

async function findTaxon(names) {
  for (const n of names) {
    const j = await fetchJson(`${API}/taxa?q=${encodeURIComponent(n)}&rank=species&per_page=5`, H);
    const hit = (j.results || []).find((t) => t.name.toLowerCase() === n.toLowerCase()) || (j.results || []).find((t) => t.rank === 'species');
    await sleep(1100);
    if (hit) return hit.id;
  }
  return null;
}
async function observations(taxonId, place) {
  const q = `taxon_id=${taxonId}${place ? `&place_id=${place}` : ''}&quality_grade=research&photo_license=${LICENSES}&per_page=30&order_by=votes&order=desc`;
  const j = await fetchJson(`${API}/observations?${q}`, H);
  await sleep(1100); // iNat asks for <= 1 req/s on average
  return j.results || [];
}
const cleanAuthor = (a) => (a || '').replace(/^\(c\)\s*/i, '').replace(/,\s*some rights reserved.*$/i, '').replace(/^no rights reserved$/i, 'no rights reserved');

const species = readSpeciesList().filter((s) => !ONLY || s.id === ONLY);
// --fill: also redo the species that got fewer than N photos (downloads time out on a slow network)
const FILL = process.argv.includes('--fill');
const todo = species.filter((s) => FORCE || ONLY || !meta[s.scientific] || (FILL && meta[s.scientific].length < N));
console.log(`${todo.length}/${species.length} species to look up`);
let k = 0, totalBytes = 0;
for (const s of todo) {
  k++;
  try {
    const main = MAIN[s.scientific];
    const mainPhotoId = main ? Number((main.page || '').split('/').pop()) : null;
    let taxonId = main?.taxonId;
    if (!taxonId) taxonId = await findTaxon([...new Set([s.scientific, AV[s.scientific]?.name, WD[s.scientific]?.taxonName, s.paper_scientific].filter(Boolean))]);
    if (!taxonId) { console.log(`${k}. ${s.scientific}: no taxon`); meta[s.scientific] = []; continue; }
    // pick: one photo per observer, licensed, not the main photo; South Africa first, then anywhere
    const picked = [];
    const users = new Set();
    const consider = (obs, where) => {
      for (const o of obs) {
        if (picked.length >= N) return;
        if (users.has(o.user?.login)) continue;
        const p = (o.photos || []).find((x) => x.license_code && LICENSE_URL[x.license_code] && x.id !== mainPhotoId && x.url);
        if (!p) continue;
        users.add(o.user?.login);
        picked.push({ photo: p, obs: o.id, where });
      }
    };
    consider(await observations(taxonId, PLACE_ZA), 'ZA');
    if (picked.length < N) consider(await observations(taxonId, null), 'world');
    // remove files of a previous run for this species
    for (const f of fs.readdirSync(OUT)) if (f.startsWith(s.id + '-')) fs.unlinkSync(path.join(OUT, f));
    // the photo CDN is not rate limited like the API, but this network is slow: fetch the photos of a species together.
    // "medium" is 500 px: what a phone screen needs, and five times lighter than "large".
    const rows = (await Promise.all(picked.map(async ({ photo, obs, where }, i) => {
      const url = photo.url.replace(/\/square\./, '/medium.');
      const dest = path.join(OUT, `${s.id}-${i + 1}.webp`);
      try {
        const buf = await fetchBuffer(url, H);
        const { width, height, size } = await sharp(buf).rotate().resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true }).webp({ quality: 74 }).toFile(dest);
        totalBytes += size;
        return { file: path.basename(dest), width, height, author: cleanAuthor(photo.attribution), license: photo.license_code.toUpperCase(), licenseUrl: LICENSE_URL[photo.license_code], page: `https://www.inaturalist.org/photos/${photo.id}`, obs: `https://www.inaturalist.org/observations/${obs}`, where };
      } catch (e) { console.log(`   !! photo ${photo.id}: ${e.message}`); return null; }
    }))).filter(Boolean);
    // keep the numbering dense (a failed download leaves no hole in the names)
    rows.forEach((r, i) => { const want = `${s.id}-${i + 1}.webp`; if (r.file !== want) { fs.renameSync(path.join(OUT, r.file), path.join(OUT, want)); r.file = want; } });
    meta[s.scientific] = rows;
    console.log(`${k}. ${s.scientific}: ${rows.length} photos (${rows.filter((r) => r.where === 'ZA').length} from South Africa)`);
    if (k % 10 === 0) writeJson(META_OUT, meta);
  } catch (e) {
    console.log(`${k}. !! ${s.scientific}: ${e.message}`);
  }
}
writeJson(META_OUT, meta);
const all = Object.values(meta);
const onDisk = fs.readdirSync(OUT).filter((f) => f.endsWith('.webp'));
const bytes = onDisk.reduce((a, f) => a + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`\n${all.filter((r) => r.length).length}/${all.length} species with extra photos, ${onDisk.length} files, ${(bytes / 1e6).toFixed(1)} MB`);
const hist = {}; for (const r of all) hist[r.length] = (hist[r.length] || 0) + 1;
console.log('photos per species:', JSON.stringify(hist));
