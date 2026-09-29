// Step 3b: species photos from iNaturalist (community-chosen default photo, Creative Commons only).
// Used as the primary photo source because Wikimedia throttles this network, and because iNat default photos
// are field photographs (Wikidata P18 is sometimes a drawing or a museum specimen).
// Output: data/out/images/<id>.webp (only where no file exists yet, unless --force)
//         data/raw/images_inat.json { [scientific]: { file, width, height, author, license, licenseUrl, page, source: 'iNaturalist' } }

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { readSpeciesList, sleep, fetchJson, fetchBuffer, readJson, writeJson, RAW_DIR, OUT_DIR } from './lib.mjs';

const UA = 'PidwaChecklist/0.1 (personal offline field app)';
const API = 'https://api.inaturalist.org/v1';
const IMG_DIR = path.join(OUT_DIR, 'images');
const META_OUT = path.join(RAW_DIR, 'images_inat.json');
const MAX = 900;
const FORCE = process.argv.includes('--force');
fs.mkdirSync(IMG_DIR, { recursive: true });
const meta = FORCE ? {} : readJson(META_OUT, {});
const AV = readJson(path.join(RAW_DIR, 'avonet.json'), {});
const WD = readJson(path.join(RAW_DIR, 'wikidata.json'), {});

const LICENSE_URL = { 'cc0': 'https://creativecommons.org/publicdomain/zero/1.0/', 'cc-by': 'https://creativecommons.org/licenses/by/4.0/', 'cc-by-nc': 'https://creativecommons.org/licenses/by-nc/4.0/', 'cc-by-sa': 'https://creativecommons.org/licenses/by-sa/4.0/', 'cc-by-nc-sa': 'https://creativecommons.org/licenses/by-nc-sa/4.0/', 'cc-by-nd': 'https://creativecommons.org/licenses/by-nd/4.0/', 'cc-by-nc-nd': 'https://creativecommons.org/licenses/by-nc-nd/4.0/' };

async function findTaxon(names) {
  for (const n of names) {
    const j = await fetchJson(`${API}/taxa?q=${encodeURIComponent(n)}&rank=species&per_page=5`, { headers: { 'User-Agent': UA } });
    const exact = (j.results || []).find((t) => t.name.toLowerCase() === n.toLowerCase()) || (j.results || []).find((t) => t.rank === 'species');
    if (exact) return exact;
    await sleep(400);
  }
  return null;
}
async function ccPhoto(taxon) {
  const ok = (p) => p && p.license_code && p.medium_url;
  if (ok(taxon.default_photo)) return taxon.default_photo;
  const j = await fetchJson(`${API}/taxa/${taxon.id}`, { headers: { 'User-Agent': UA } });
  const tp = j.results?.[0]?.taxon_photos || [];
  const hit = tp.map((x) => x.photo).find(ok);
  return hit || null;
}

const species = readSpeciesList();
const todo = species.filter((s) => FORCE || !meta[s.scientific]);
console.log(`${todo.length}/${species.length} species to look up on iNaturalist`);
let n = 0;
const none = [];
for (const s of todo) {
  const names = [...new Set([s.scientific, AV[s.scientific]?.name, WD[s.scientific]?.taxonName, s.paper_scientific].filter(Boolean))];
  try {
    const taxon = await findTaxon(names);
    if (!taxon) { none.push(s.scientific + ' (no taxon)'); continue; }
    const photo = await ccPhoto(taxon);
    if (!photo) { none.push(s.scientific + ' (no CC photo)'); continue; }
    const url = photo.medium_url.replace('/medium.', '/large.'); // ~1024 px
    const dest = path.join(IMG_DIR, `${s.id}.webp`);
    const buf = await fetchBuffer(url, { headers: { 'User-Agent': UA } });
    const { width, height } = await sharp(buf).rotate().resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toFile(dest);
    meta[s.scientific] = { file: path.basename(dest), width, height, author: (photo.attribution || '').replace(/^\(c\)\s*/i, '').replace(/,\s*some rights reserved.*$/i, ''), license: photo.license_code.toUpperCase(), licenseUrl: LICENSE_URL[photo.license_code] || null, page: `https://www.inaturalist.org/photos/${photo.id}`, taxonId: taxon.id, source: 'iNaturalist' };
    n++;
    if (n % 10 === 0) { console.log(`${n}/${todo.length}`); writeJson(META_OUT, meta); }
    await sleep(1100); // iNat asks for <= 1 req/s on average
  } catch (e) {
    console.log(`  !! ${s.scientific}: ${e.message}`);
    none.push(s.scientific);
  }
}
writeJson(META_OUT, meta);
const have = species.filter((s) => fs.existsSync(path.join(IMG_DIR, `${s.id}.webp`))).length;
console.log(`\niNaturalist photos: ${Object.keys(meta).length}; images on disk: ${have}/${species.length}`);
console.log(`not found: ${none.length}`, none.join(', '));
const lic = {};
for (const m of Object.values(meta)) lic[m.license] = (lic[m.license] || 0) + 1;
console.log('licenses:', JSON.stringify(lic));
