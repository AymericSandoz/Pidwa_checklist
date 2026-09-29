// Step 6: merge everything into data/out/species.json (what the app ships) and a data/out/preview.html to eyeball it.

import fs from 'node:fs';
import path from 'node:path';
import { readSpeciesList, readJson, writeJson, RAW_DIR, OUT_DIR } from './lib.mjs';

const WD = readJson(path.join(RAW_DIR, 'wikidata.json'), {});
const WP = readJson(path.join(RAW_DIR, 'wikipedia.json'), {});
const IM_COMMONS = readJson(path.join(RAW_DIR, 'images.json'), {});
const IM_INAT = readJson(path.join(RAW_DIR, 'images_inat.json'), {});
// photo preference: iNaturalist (field photo, CC) over Commons (Wikidata P18, sometimes a drawing); the webp must exist
const IM = {};
for (const sci of new Set([...Object.keys(IM_COMMONS), ...Object.keys(IM_INAT)])) {
  const m = IM_INAT[sci] ? { ...IM_INAT[sci], source: 'iNaturalist' } : { ...IM_COMMONS[sci], source: 'Wikimedia Commons' };
  IM[sci] = m;
}
const AV = readJson(path.join(RAW_DIR, 'avonet.json'), {});
const SN = readJson(path.join(RAW_DIR, 'sounds.json'), {});
const CUR = readJson(path.join(RAW_DIR, '..', 'curated.json'), {}); // hand-written overrides / extra traits, optional
const IOC = readJson(path.join(RAW_DIR, 'ioc_fr.json'), {});
const isSci = (t) => !t || /^[A-Z][a-z]+ [a-z-]+$/.test(t.trim());
const vern = (t) => (isSci(t) ? null : t);

// ---- derived, field-friendly categories from AVONET numbers ----------------
// Size class by body mass (g). Reference birds: sparrow ~25 g, thrush ~70 g, dove ~150 g, guineafowl ~1.3 kg.
function sizeClass(mass) {
  if (mass == null) return null;
  if (mass < 15) return 'tiny';        // < moineau (sunbirds, waxbills, cisticolas)
  if (mass < 40) return 'sparrow';     // moineau
  if (mass < 120) return 'thrush';     // merle / grive
  if (mass < 400) return 'dove';       // pigeon / tourterelle
  if (mass < 1500) return 'chicken';   // poule / pintade
  if (mass < 5000) return 'goose';     // oie / grand rapace
  return 'huge';                       // marabout, autruche, outarde
}
// Bill shape: family first (hooked raptors/owls/parrots, wide-gape aerial insectivores), then AVONET ratios.
// Thresholds were tuned by eye on the 228 Pidwa birds (herons/storks/hornbills/kingfishers -> long/very-long,
// finches/weavers -> stout, warblers/lapwings -> fine).
const HOOKED = new Set(['Accipitridae', 'Falconidae', 'Strigidae', 'Tytonidae', 'Psittacidae', 'Sagittariidae']);
const GAPE = new Set(['Apodidae', 'Caprimulgidae', 'Hirundinidae']);
function billShape(a, family) {
  if (family && HOOKED.has(family)) return 'hooked';
  if (family && GAPE.has(family)) return 'gape';
  if (!a || a.beakCulmen == null) return null;
  const bodyLen = Math.cbrt(a.mass || 50) * 10; // crude body-scale proxy (mm)
  const rel = a.beakCulmen / bodyLen;            // relative bill length
  const stout = a.beakDepth != null && a.beakWidth != null ? (a.beakDepth + a.beakWidth) / 2 / a.beakCulmen : null;
  if (rel >= 1.3) return 'very-long';  // cigognes, calaos, martins-pêcheurs, huppe
  if (rel >= 0.85) return 'long';      // hérons, guêpiers, souimangas
  if (stout != null && stout >= 0.45) return 'stout'; // conique, épais (granivores)
  if (stout != null && stout < 0.3) return 'fine';    // fin (insectivores, vanneaux)
  return 'medium';
}
function legLength(a) {
  if (!a || a.tarsus == null) return null;
  const bodyLen = Math.cbrt(a.mass || 50) * 10;
  const rel = a.tarsus / bodyLen;
  if (rel >= 1.2) return 'very-long'; // échassiers, vanneaux, oedicnèmes
  if (rel >= 0.85) return 'long';
  if (rel < 0.5) return 'short';      // martinets, martins-pêcheurs, guêpiers, rapaces
  return 'medium';
}

const species = readSpeciesList();
const out = [];
const warnings = [];
for (const s of species) {
  const wd = WD[s.scientific] || {};
  const wp = WP[s.scientific] || {};
  const im = IM[s.scientific] || null;
  const av = AV[s.scientific] || null;
  const cur = CUR[s.scientific] || {};
  const rec = {
    id: s.id,
    group: s.group,
    sci: s.scientific,
    en: s.common_en,
    fr: cur.fr || IOC[s.scientific]?.fr || vern(wp.fr?.title) || vern(wd.label_fr) || null,
    fr_source: cur.fr ? 'curated' : IOC[s.scientific]?.fr ? 'IOC' : vern(wp.fr?.title) ? 'frwiki' : vern(wd.label_fr) ? 'wikidata' : null,
    family: wd.family || av?.family || null,
    family_fr: wd.family_fr || null,
    order: wd.order || av?.order || null,
    order_fr: wd.order_fr || null,
    iucn: wd.iucn || null,
    qid: wd.qid || null,
    wiki: { fr: wp.fr?.url || null, en: wp.en?.url || null },
    summary: { fr: wp.fr?.extract || null, en: wp.en?.extract || null },
    image: im && fs.existsSync(path.join(OUT_DIR, 'images', `${s.id}.webp`)) ? { file: `images/${s.id}.webp`, w: im.width, h: im.height, author: im.author, license: im.license, licenseUrl: im.licenseUrl, source: im.page, from: im.source } : null,
    sounds: (SN[s.scientific] || []).map((x) => ({ file: `sounds/${x.file}`, type: x.type, q: x.quality, len: x.length, by: x.recordist, license: x.license, url: x.url })),
    traits: cur.traits || null,
    notes: s.notes || null,
  };
  if (s.group === 'bird') {
    rec.avonet = av ? { mass: av.mass, beak: av.beakCulmen, tarsus: av.tarsus, wing: av.wing, tail: av.tail, habitat: av.habitat, lifestyle: av.lifestyle, niche: av.trophicNiche, migration: av.migration, src: av.matched } : null;
    rec.idk = av ? { size: sizeClass(av.mass), bill: billShape(av, wd.family), legs: legLength(av), habitat: av.habitat, lifestyle: av.lifestyle, niche: av.trophicNiche } : null;
  }
  if (!rec.fr) warnings.push(`${s.scientific}: no French name`);
  if (!rec.image) warnings.push(`${s.scientific}: no image`);
  if (s.group === 'bird' && !av) warnings.push(`${s.scientific}: no AVONET`);
  out.push(rec);
}
writeJson(path.join(OUT_DIR, 'species.json'), out);
console.log(`species.json: ${out.length} species (${out.filter((x) => x.group === 'bird').length} birds, ${out.filter((x) => x.group === 'mammal').length} mammals)`);
console.log(`with image: ${out.filter((x) => x.image).length}, with FR summary: ${out.filter((x) => x.summary.fr).length}, with sounds: ${out.filter((x) => x.sounds.length).length}, birds with AVONET: ${out.filter((x) => x.avonet).length}`);
if (warnings.length) console.log('warnings:\n  ' + warnings.join('\n  '));

// ---- distribution of derived classes, to sanity check the thresholds --------
const dist = (key) => { const d = {}; for (const x of out) if (x.idk) d[x.idk[key]] = (d[x.idk[key]] || 0) + 1; return d; };
console.log('size:', JSON.stringify(dist('size')), '\nbill:', JSON.stringify(dist('bill')), '\nlegs:', JSON.stringify(dist('legs')), '\nhabitat:', JSON.stringify(dist('habitat')), '\nlifestyle:', JSON.stringify(dist('lifestyle')));

// ---- preview page ------------------------------------------------------------
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const card = (x) => `
<article class="card">
  ${x.image ? `<img src="${x.image.file}" loading="lazy" alt="">` : '<div class="noimg">pas de photo</div>'}
  <div class="body">
    <h3>${esc(x.fr || '?')} <small>${esc(x.en)}</small></h3>
    <p class="sci"><i>${esc(x.sci)}</i> · ${esc(x.family_fr || x.family || '')} ${x.iucn ? `· <span class="iucn">${esc(x.iucn)}</span>` : ''}</p>
    ${x.idk ? `<p class="idk">taille: <b>${x.idk.size}</b> · bec: <b>${x.idk.bill}</b> · pattes: <b>${x.idk.legs}</b> · ${esc(x.idk.habitat)} · ${esc(x.idk.lifestyle)} · ${esc(x.idk.niche)}${x.avonet?.mass ? ` · ${x.avonet.mass} g` : ''}</p>` : ''}
    ${x.summary.fr ? `<p class="sum">${esc(x.summary.fr).slice(0, 380)}${x.summary.fr.length > 380 ? '…' : ''}</p>` : '<p class="sum missing">pas de résumé FR</p>'}
    ${x.sounds.length ? `<p class="snd">${x.sounds.map((sn) => `<audio controls preload="none" src="${sn.file}"></audio> <small>${esc(sn.type)} ${sn.q} ${sn.len}</small>`).join(' ')}</p>` : ''}
    ${x.image ? `<p class="credit">photo: ${esc(x.image.author || '?')} · ${esc(x.image.license || '?')}</p>` : ''}
    ${x.notes ? `<p class="note">note: ${esc(x.notes)}</p>` : ''}
  </div>
</article>`;
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Pidwa – aperçu des fiches</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font-family:system-ui,sans-serif;margin:0;background:#f4f4f0;color:#222}
header{padding:12px 16px;background:#2f4f2f;color:#fff;position:sticky;top:0;z-index:1}
header input{font-size:16px;padding:6px 10px;border-radius:6px;border:0;width:min(400px,80vw)}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px;padding:12px}
.card{background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px #0002;display:flex;flex-direction:column}
.card img{width:100%;aspect-ratio:4/3;object-fit:cover;background:#ddd}
.noimg{aspect-ratio:4/3;display:grid;place-items:center;background:#e9e9e2;color:#888}
.body{padding:10px 12px}
h3{margin:0 0 4px;font-size:17px} h3 small{font-weight:400;color:#555;font-size:13px;margin-left:6px}
.sci{margin:0 0 6px;color:#444;font-size:13px} .iucn{background:#eee;padding:1px 6px;border-radius:4px}
.idk{font-size:12px;color:#355;background:#eef5f1;padding:6px 8px;border-radius:6px;margin:6px 0}
.sum{font-size:13px;line-height:1.4;margin:6px 0} .missing{color:#b33}
.credit,.note{font-size:11px;color:#777;margin:4px 0} .note{color:#a60}
.snd audio{height:28px;width:150px;vertical-align:middle}
h2{grid-column:1/-1;margin:16px 0 0;color:#2f4f2f}
</style></head><body>
<header><b>Pidwa</b> · ${out.length} espèces · <input id="q" placeholder="filtrer (nom fr/en/sci, famille)"></header>
<main>
<h2>Mammifères (${out.filter((x) => x.group === 'mammal').length})</h2>
${out.filter((x) => x.group === 'mammal').map(card).join('')}
<h2>Oiseaux (${out.filter((x) => x.group === 'bird').length})</h2>
${out.filter((x) => x.group === 'bird').map(card).join('')}
</main>
<script>
const q=document.getElementById('q');q.addEventListener('input',()=>{const v=q.value.toLowerCase();for(const c of document.querySelectorAll('.card'))c.style.display=c.textContent.toLowerCase().includes(v)?'':'none'});
</script></body></html>`;
fs.writeFileSync(path.join(OUT_DIR, 'preview.html'), html);
console.log(`preview: ${path.join(OUT_DIR, 'preview.html')}`);
