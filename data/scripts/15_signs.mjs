// Step 15: field photos of tracks and dung from iNaturalist, for the mammal "Tracks and signs" section and the spoor quiz.
// iNat tags these with the annotation "Evidence of Presence" (term 22): Track = 26, Scat = 25. The tag is on the
// observation, not on the photo, and the first photo is often the animal itself or a print of something else, so the
// photos are hand-picked in two passes:
//   node 15_signs.mjs --candidates   up to 24 candidate photos per species and kind, small, with numbered contact sheets:
//                                    data/raw/signs_cand/<id>-<kind>.jpg + data/raw/signs_cand/candidates.json
//   node 15_signs.mjs --build        downloads the picks listed in data/raw/signs_picks.json { [id]: { track: [n], scat: [n] } }
//                                    (n = the number on the contact sheet) to data/out/signs/<id>-<kind>-<photo>.webp and
//                                    rewrites data/out/signs/index.json. Species without picks keep their current photos.
// Options: --only=<id>, --force (redo candidates already fetched).

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { readSpeciesList, sleep, fetchJson, fetchBuffer, readJson, writeJson, RAW_DIR, OUT_DIR, DATA_DIR } from './lib.mjs';

const UA = 'PidwaChecklist/0.1 (personal offline field app)';
const API = 'https://api.inaturalist.org/v1';
const PLACE_ZA = 6986;
const LICENSES = 'cc0,cc-by,cc-by-nc,cc-by-sa,cc-by-nc-sa';
const KINDS = { track: 26, scat: 25 };
const NCAND = 24;        // candidate photos per species and kind
const PER_OBS = 3;       // at most this many photos of one observation
const TILE = 220, COLS = 6;
const MAX = 640;
const CAND_DIR = path.join(RAW_DIR, 'signs_cand');
const CAND_JSON = path.join(CAND_DIR, 'candidates.json');
const PICKS = path.join(RAW_DIR, 'signs_picks.json');
const OUT = path.join(OUT_DIR, 'signs');
const INDEX = path.join(OUT, 'index.json');
const H = { headers: { 'User-Agent': UA } };
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
const FORCE = process.argv.includes('--force');

const LICENSE_OK = new Set(LICENSES.split(','));
const cleanAuthor = (a) => (a || '').replace(/^\(c\)\s*/i, '').replace(/,\s*some rights reserved.*$/i, '').replace(/^no rights reserved$/i, 'no rights reserved');

// the mammals that have a tracks entry
const TRACKS = JSON.parse(fs.readFileSync(path.join(DATA_DIR, '..', 'app', 'src', 'learn', 'tracks.data.json'), 'utf8'));
const LIST = new Map(readSpeciesList().map((s) => [s.id, s]));
const MAIN = readJson(path.join(RAW_DIR, 'images_inat.json'), {});
const ids = TRACKS.map((t) => t.id).filter((id) => LIST.has(id) && (!ONLY || id === ONLY));

async function taxonOf(sci) {
  if (MAIN[sci]?.taxonId) return MAIN[sci].taxonId;
  const j = await fetchJson(`${API}/taxa?q=${encodeURIComponent(sci)}&per_page=5`, H);
  await sleep(1100);
  return (j.results || []).find((t) => t.name.toLowerCase() === sci.toLowerCase())?.id || null;
}
async function observations(taxonId, value, extra) {
  const q = `taxon_id=${taxonId}&term_id=22&term_value_id=${value}&photo_license=${LICENSES}&photos=true&per_page=50&order_by=votes&order=desc${extra}`;
  const j = await fetchJson(`${API}/observations?${q}`, H);
  await sleep(1100); // iNat asks for <= 1 req/s on average
  return j.results || [];
}

/** Numbered contact sheet of the candidate thumbnails. */
async function sheet(files, dest) {
  const rows = Math.ceil(files.length / COLS);
  const tiles = await Promise.all(files.map(async (f, i) => {
    const img = await sharp(f).rotate().resize(TILE, TILE, { fit: 'contain', background: '#222' }).toBuffer();
    const label = Buffer.from(`<svg width="${TILE}" height="${TILE}"><rect x="0" y="0" width="44" height="30" fill="#000" opacity=".75"/><text x="22" y="22" font-size="20" font-family="Arial" font-weight="bold" fill="#ff0" text-anchor="middle">${i + 1}</text></svg>`);
    return { input: await sharp(img).composite([{ input: label }]).toBuffer(), left: (i % COLS) * (TILE + 4), top: Math.floor(i / COLS) * (TILE + 4) };
  }));
  await sharp({ create: { width: COLS * (TILE + 4), height: rows * (TILE + 4), channels: 3, background: '#fff' } }).composite(tiles).jpeg({ quality: 78 }).toFile(dest);
}

async function candidates() {
  fs.mkdirSync(CAND_DIR, { recursive: true });
  const all = readJson(CAND_JSON, {});
  let k = 0;
  for (const id of ids) {
    k++;
    const s = LIST.get(id);
    if (all[id] && !FORCE && !ONLY) { continue; }
    const taxonId = await taxonOf(s.scientific);
    if (!taxonId) { console.log(`${k}. ${id}: no taxon`); continue; }
    all[id] = {};
    for (const [kind, value] of Object.entries(KINDS)) {
      // research grade from South Africa first (same soils as Pidwa), then research grade anywhere, then unconfirmed
      const seen = new Set(), cand = [];
      for (const extra of [`&quality_grade=research&place_id=${PLACE_ZA}`, '&quality_grade=research', '&quality_grade=needs_id']) {
        if (cand.length >= NCAND) break;
        for (const o of await observations(taxonId, value, extra)) {
          if (seen.has(o.id)) continue;
          seen.add(o.id);
          for (const p of (o.photos || []).filter((p) => LICENSE_OK.has(p.license_code) && p.url).slice(0, PER_OBS)) {
            if (cand.length >= NCAND) break;
            cand.push({ n: cand.length + 1, photo: p.id, obs: o.id, url: p.url.replace(/\/square\./, '/medium.'), author: cleanAuthor(p.attribution), license: p.license_code.toUpperCase(), grade: o.quality_grade, za: o.place_ids?.includes(PLACE_ZA) || false });
          }
        }
      }
      const dir = path.join(CAND_DIR, id, kind);
      fs.mkdirSync(dir, { recursive: true });
      const files = (await Promise.all(cand.map(async (c) => {
        const f = path.join(dir, `${c.n}.jpg`);
        try { if (!fs.existsSync(f)) fs.writeFileSync(f, await fetchBuffer(c.url.replace('/medium.', '/small.'), H)); return f; } catch (e) { console.log(`   !! ${c.photo}: ${e.message}`); return null; }
      })));
      const ok = cand.filter((_, i) => files[i]);
      ok.forEach((c, i) => { if (c.n !== i + 1) { fs.renameSync(path.join(dir, `${c.n}.jpg`), path.join(dir, `${i + 1}.jpg`)); c.n = i + 1; } });
      all[id][kind] = ok;
      if (ok.length) await sheet(ok.map((c) => path.join(dir, `${c.n}.jpg`)), path.join(CAND_DIR, `${id}-${kind}.jpg`));
    }
    console.log(`${k}. ${id}: ${all[id].track.length} track, ${all[id].scat.length} scat candidates`);
    writeJson(CAND_JSON, all);
  }
  writeJson(CAND_JSON, all);
}

async function build() {
  const all = readJson(CAND_JSON, {});
  const picks = readJson(PICKS, {});
  const index = readJson(INDEX, {});
  fs.mkdirSync(OUT, { recursive: true });
  let files = 0, bytes = 0;
  for (const [id, byKind] of Object.entries(picks)) {
    if (ONLY && id !== ONLY) continue;
    const rows = [];
    for (const kind of ['track', 'scat']) {
      for (const n of byKind[kind] || []) {
        const c = all[id]?.[kind]?.find((x) => x.n === n);
        if (!c) { console.log(`   !! ${id} ${kind} #${n}: no such candidate`); continue; }
        const name = `${id}-${kind}-${c.photo}.webp`;
        try {
          const buf = await fetchBuffer(c.url, H);
          const { width, height, size } = await sharp(buf).rotate().resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true }).webp({ quality: 74 }).toFile(path.join(OUT, name));
          rows.push({ file: `signs/${name}`, kind, w: width, h: height, author: c.author, license: c.license, source: `https://www.inaturalist.org/observations/${c.obs}` });
          files++; bytes += size;
        } catch (e) { console.log(`   !! ${id} ${c.photo}: ${e.message}`); }
      }
    }
    // drop this species' old files that are no longer picked
    const keep = new Set(rows.map((r) => r.file.slice(6)));
    for (const f of fs.readdirSync(OUT)) if (f.startsWith(id + '-') && f.endsWith('.webp') && !keep.has(f)) fs.unlinkSync(path.join(OUT, f));
    index[id] = rows;
    console.log(`${id}: ${rows.filter((r) => r.kind === 'track').length} track, ${rows.filter((r) => r.kind === 'scat').length} scat`);
  }
  writeJson(INDEX, index);
  console.log(`\n${files} photos, ${(bytes / 1e6).toFixed(1)} MB; ${Object.keys(index).length} species in index.json`);
}

if (process.argv.includes('--candidates')) await candidates();
else if (process.argv.includes('--build')) await build();
else console.log('usage: node 15_signs.mjs --candidates | --build [--only=<id>] [--force]');
