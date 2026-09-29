// Step 3: download one photo per species from Wikimedia Commons, resize to WebP, keep attribution.
// Image choice: Wikidata P18, else EN Wikipedia lead image, else FR Wikipedia lead image.
// Requests are kept to a minimum because Wikimedia rate-limits this network hard:
//   - attribution metadata: Commons API, 50 files per request
//   - the picture itself: Special:FilePath redirect to a standard 800 px thumbnail on the CDN (1 request per image)
// Output: data/out/images/<id>.webp  and data/raw/images.json { [scientific]: { file, width, height, author, license, licenseUrl, credit, page } }

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { readSpeciesList, sleep, fetchJson, fetchBuffer, readJson, writeJson, RAW_DIR, OUT_DIR } from './lib.mjs';

const UA = 'PidwaChecklist/0.1 (personal offline field app for one reserve; ~300 files total)';
const WD = readJson(path.join(RAW_DIR, 'wikidata.json'), {});
const WP = readJson(path.join(RAW_DIR, 'wikipedia.json'), {});
const META_OUT = path.join(RAW_DIR, 'images.json');
const IMG_DIR = path.join(OUT_DIR, 'images');
const THUMB_W = 800; // a standard Commons thumbnail bucket: usually already rendered and cached on the CDN
const MAX = 900;
const FORCE = process.argv.includes('--force');
fs.mkdirSync(IMG_DIR, { recursive: true });
const meta = FORCE ? {} : readJson(META_OUT, {});

const pickFile = (s) => WD[s.scientific]?.image || WP[s.scientific]?.en?.image || WP[s.scientific]?.fr?.image || null;
const species = readSpeciesList();
const todo = species.filter((s) => FORCE || !(meta[s.scientific] && fs.existsSync(path.join(IMG_DIR, `${s.id}.webp`))));
console.log(`${todo.length}/${species.length} images to fetch`);

// ---- 1. attribution metadata, batched --------------------------------------------
const strip = (h) => (h ? h.replace(/<[^>]+>/g, '').trim() : null);
const info = {};
const files = [...new Set(todo.map(pickFile).filter(Boolean))];
for (let i = 0; i < files.length; i += 50) {
  const chunk = files.slice(i, i + 50);
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata|url&titles=${encodeURIComponent(chunk.map((f) => 'File:' + f).join('|'))}`;
  const j = await fetchJson(url, { headers: { 'User-Agent': UA } });
  const norm = {};
  for (const n of j.query?.normalized || []) norm[n.to] = n.from;
  for (const p of Object.values(j.query?.pages || {})) {
    const ii = p.imageinfo?.[0];
    if (!ii) continue;
    const em = ii.extmetadata || {};
    const title = (norm[p.title] || p.title).replace(/^File:/, '');
    info[title] = { author: strip(em.Artist?.value), license: em.LicenseShortName?.value || null, licenseUrl: em.LicenseUrl?.value || null, credit: strip(em.Credit?.value), page: ii.descriptionurl, original: ii.url };
  }
  console.log(`metadata ${Math.min(i + 50, files.length)}/${files.length}`);
  await sleep(1500);
}
// file names come back normalized (underscores -> spaces, first letter upper-cased); match loosely
const findInfo = (file) => info[file] || info[file.replace(/_/g, ' ')] || info[file.charAt(0).toUpperCase() + file.slice(1)] || null;

// ---- 2. pictures ---------------------------------------------------------------------
let n = 0;
const missing = [];
for (const s of todo) {
  const file = pickFile(s);
  if (!file) { missing.push(s.scientific + ' (no file)'); continue; }
  const dest = path.join(IMG_DIR, `${s.id}.webp`);
  try {
    const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${THUMB_W}`;
    const buf = await fetchBuffer(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    const img = sharp(buf).rotate().resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true });
    const { width, height } = await img.webp({ quality: 78 }).toFile(dest);
    const fi = findInfo(file) || {};
    meta[s.scientific] = { file, width, height, author: fi.author ?? null, license: fi.license ?? null, licenseUrl: fi.licenseUrl ?? null, credit: fi.credit ?? null, page: fi.page ?? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}` };
    n++;
    if (n % 10 === 0) { console.log(`${n}/${todo.length}`); writeJson(META_OUT, meta); }
    await sleep(700);
  } catch (e) {
    console.log(`  !! ${s.scientific} (${file}): ${e.message}`);
    missing.push(s.scientific);
  }
}
writeJson(META_OUT, meta);
const have = species.filter((s) => fs.existsSync(path.join(IMG_DIR, `${s.id}.webp`))).length;
const total = fs.readdirSync(IMG_DIR).reduce((a, f) => a + fs.statSync(path.join(IMG_DIR, f)).size, 0);
console.log(`\n${have}/${species.length} images on disk, ${(total / 1e6).toFixed(1)} MB in ${IMG_DIR}`);
console.log(`missing this run: ${missing.length}`, missing.join(', '));
const lic = {};
for (const m of Object.values(meta)) lic[m.license] = (lic[m.license] || 0) + 1;
console.log('licenses:', JSON.stringify(lic));
