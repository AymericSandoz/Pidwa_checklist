// Merge the three sources of the mammal "Tracks and signs" data into app/src/learn/tracks.data.json:
//   - spoor-config.mjs: which book drawing is which foot, and the printed lengths (mm)
//   - data/out/spoor/paths.json: the traced drawings (gives the width from the proportions)
//   - scratchpad/text/*.json: the sheet texts transcribed by the reading agents (track, trail, dung, signs, confuse, facts)
// Usage: node build-tracks.mjs <textDir> <pathsJson> <outJson>
import fs from 'fs';
import path from 'path';
import { SPOOR_SRC } from './spoor-config.mjs';
const [,, textDir, pathsJson, outJson] = process.argv;
const paths = JSON.parse(fs.readFileSync(pathsJson, 'utf8'));
// several agents may have seen the same sheet across a range boundary: keep the complete one, else the fullest
const text = {};
const score = (v) => (v.partial ? 0 : 1000) + (v.track?.length || 0) + (v.dung?.length || 0) + 50 * (v.confuse?.length || 0);
if (fs.existsSync(textDir)) for (const f of fs.readdirSync(textDir).filter((f) => f.endsWith('.json'))) {
  let j; try { j = JSON.parse(fs.readFileSync(path.join(textDir, f), 'utf8')); } catch (e) { console.log('bad json', f, e.message); continue; }
  for (const [id, v] of Object.entries(j)) {
    if (!text[id]) { text[id] = { ...v, _from: f }; continue; }
    // field by field: the better entry wins, but an empty field is filled from the other (two partial halves of one sheet)
    const [hi, lo] = score(v) > score(text[id]) ? [v, text[id]] : [text[id], v];
    const empty = (x) => x == null || x === '' || (Array.isArray(x) && !x.length);
    const m = { ...lo, ...Object.fromEntries(Object.entries(hi).filter(([, x]) => !empty(x))) };
    m.partial = !!(hi.partial && lo.partial);
    m.pages = [...new Set([...(lo.pages || []), ...(hi.pages || [])])];
    m._from = (text[id]._from || '') + '+' + f;
    text[id] = m;
  }
}

// print family, for the "Print" line and the drawing template when the book has none
const SHAPE = {
  cat: ['panthera-leo', 'panthera-pardus', 'acinonyx-jubatus', 'leptailurus-serval', 'caracal-caracal', 'felis-lybica'],
  dog: ['lycaon-pictus', 'lupulella-mesomelas', 'lupulella-adusta', 'proteles-cristatus'],
  hyena: ['crocuta-crocuta', 'parahyaena-brunnea'],
  cloven: ['syncerus-caffer', 'giraffa-giraffa', 'taurotragus-oryx', 'potamochoerus-larvatus', 'phacochoerus-africanus', 'connochaetes-taurinus', 'kobus-ellipsiprymnus', 'tragelaphus-strepsiceros', 'tragelaphus-angasii', 'tragelaphus-sylvaticus', 'sylvicapra-grimmia', 'raphicerus-sharpei', 'raphicerus-campestris', 'aepyceros-melampus', 'oreotragus-oreotragus', 'hippotragus-niger', 'damaliscus-lunatus', 'redunca-arundinum'],
  hoof: ['equus-quagga'],
  round: ['loxodonta-africana', 'diceros-bicornis', 'ceratotherium-simum', 'hippopotamus-amphibius'],
  hand: ['papio-ursinus', 'chlorocebus-pygerythrus', 'galago-moholi', 'otolemur-crassicaudatus'],
  digger: ['orycteropus-afer', 'smutsia-temminckii', 'mellivora-capensis', 'hystrix-africaeaustralis'],
  small: ['civettictis-civetta', 'genetta-tigrina', 'genetta-genetta', 'mungos-mungo', 'helogale-parvula', 'herpestes-sanguineus', 'atilax-paludinosus', 'ichneumia-albicauda', 'aonyx-capensis', 'procavia-capensis', 'lepus-saxatilis', 'thryonomys-swinderianus', 'paraxerus-cepapi'],
};
const shapeOf = (id) => Object.entries(SHAPE).find(([, ids]) => ids.includes(id))?.[0] || 'small';
const CLAWS = { show: true, sometimes: true, 'usually hidden': false, 'never show': false, 'n/a': false };

const out = [];
for (const sp of SPOOR_SRC) {
  const p = paths[sp.id] || {}, t = text[sp.id] || {};
  const dims = (foot, mm) => { const b = p[foot]; const l = (b?.mm ?? mm) / 10; return { l: +l.toFixed(1), w: +(b ? l * (b.w / b.h) : l * 0.8).toFixed(1) }; };
  const shape = shapeOf(sp.id);
  const e = {
    id: sp.id, shape,
    front: dims('front', sp.front?.mm ?? sp.hind?.mm), hind: dims('hind', sp.hind?.mm ?? sp.front?.mm),
    toes: t.toes ?? (shape === 'cloven' ? 2 : 4),
    claws: typeof t.claws === 'string' ? (CLAWS[t.claws] ?? false) : shape === 'dog' || shape === 'hyena' || shape === 'digger',
    clawsNote: typeof t.claws === 'string' && t.claws !== 'n/a' ? t.claws : undefined,
    dew: !!t.dew,
  };
  if (t.track) Object.assign(e, { track: t.track, trail: t.trail || undefined, dung: t.dung || undefined, signs: t.signs?.length ? t.signs : undefined, facts: t.facts?.length ? t.facts : undefined });
  if (t.confuse?.length) {
    e.confuse = t.confuse.map((c) => c.id);
    e.why = Object.fromEntries(t.confuse.map((c) => [c.id, c.why]));
  }
  if (t.width_mm?.front || t.width_mm?.hind) e.widthMm = t.width_mm;
  out.push(e);
}
fs.writeFileSync(outJson, JSON.stringify(out, null, 1));
const full = out.filter((e) => e.track).length;
console.log(out.length, 'species,', full, 'with text, missing text:', out.filter((e) => !e.track).map((e) => e.id).join(' ') || 'none');
const partial = out.filter((e) => text[e.id]?.partial).map((e) => e.id);
if (partial.length) console.log('partial:', partial.join(' '));
const unread = out.filter((e) => text[e.id]?.unreadable).map((e) => e.id + ': ' + text[e.id].unreadable);
if (unread.length) console.log('unreadable:\n  ' + unread.join('\n  '));
const extra = Object.keys(text).filter((id) => !SPOOR_SRC.some((s) => s.id === id));
if (extra.length) console.log('text for species without a drawing:', extra.join(' '));
