// Cut each foot drawing out of the book photos, split it into a dark layer and a light layer, vectorise both with potrace,
// and write a paths JSON plus preview sheets. Usage: node vec.mjs origDir cropsJson outJson previewDir [ids]
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import potrace from 'potrace';
import { paper } from './bg.mjs';
import { SPOOR_SRC } from './spoor-config.mjs';
const [,, origDir, cropsJson, outJson, prevDir, only] = process.argv;
const det = JSON.parse(fs.readFileSync(cropsJson, 'utf8'));
const trace = (png, opt) => new Promise((res, rej) => potrace.trace(png, opt, (e, svg) => (e ? rej(e) : res(svg))));
const pathsOf = (svg) => [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(' ');
const roundInt = (d) => d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(+n)));

/** Detected boxes are in the coordinates of the upright preview (1400 or 1050 px wide); hand-placed ones are 1400-wide. */
function resolveBox(b) {
  if (typeof b === 'string') { const [p, i] = b.split('-').map(Number); return { page: p, ...det[p].boxes[i], K: 3060 / det[p].W }; }
  return { ...b, K: 3060 / 1400 };
}
function erodeDilate(m, w, h, r, dilate) {
  const o = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = dilate ? 0 : 1;
    outer: for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const yy = y + dy, xx = x + dx; const p = yy < 0 || xx < 0 || yy >= h || xx >= w ? 0 : m[yy * w + xx];
      if (dilate && p) { v = 1; break outer; }
      if (!dilate && !p) { v = 0; break outer; }
    }
    o[y * w + x] = v;
  }
  return o;
}
const open = (m, w, h, r) => erodeDilate(erodeDilate(m, w, h, r, false), w, h, r, true);
function components(m, w, h) {
  const lab = new Int32Array(w * h).fill(-1); const cs = [];
  for (let i = 0; i < w * h; i++) {
    if (!m[i] || lab[i] >= 0) continue;
    const id = cs.length, st = [i]; lab[i] = id; let n = 0, x0 = w, x1 = 0, y0 = h, y1 = 0;
    while (st.length) {
      const p = st.pop(); n++; const px = p % w, py = (p / w) | 0;
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      for (const q of [p - 1, p + 1, p - w, p + w]) if (q >= 0 && q < w * h && m[q] && lab[q] < 0 && Math.abs((q % w) - px) <= 1) { lab[q] = id; st.push(q); }
    }
    cs.push({ id, n, x0, x1, y0, y1 });
  }
  return { lab, cs };
}
/** Where to cut a box that holds two feet: midway between the biggest ink mass and the nearest other big mass that lies
    clear of it along the axis (sibling hoof halves and neighbouring toes sit much closer than the two feet). */
function splitAt(m, w, h, axis) {
  const { cs } = components(m, w, h);
  if (cs.length < 2) return null;
  const A = cs.reduce((a, c) => (c.n > a.n ? c : a));
  const lo = (c) => (axis === 'x' ? c.x0 : c.y0), hi = (c) => (axis === 'x' ? c.x1 : c.y1);
  // the widest gap between the big pieces, walking along the axis
  const big = cs.filter((c) => c.n >= A.n * 0.3).sort((a, b) => lo(a) - lo(b));
  let end = hi(big[0]), best = 0, at = null;
  for (let i = 1; i < big.length; i++) {
    const g = lo(big[i]) - end;
    if (g > best) { best = g; at = (end + lo(big[i])) / 2; }
    end = Math.max(end, hi(big[i]));
  }
  return best > 2 ? at : null;
}
const gap = (a, b) => Math.max(0, Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1), Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1));

async function footFrom(spec, light) {
  const b = resolveBox(spec.box); const d = det[b.page]; const K = b.K;
  const mx = Math.round(b.w * 0.08 * K) + 10, my = Math.round(b.h * 0.08 * K) + 10;
  const left = Math.max(0, Math.round(b.x * K) - mx), top = Math.max(0, Math.round(b.y * K) - my);
  const width = Math.min(3060 - left, Math.round(b.w * K) + 2 * mx), height = Math.min(4080 - top, Math.round(b.h * K) + 2 * my);
  let img = sharp(path.join(origDir, d.file)).rotate(90).extract({ left, top, width, height });
  const scale = Math.min(1, 480 / height);
  if (scale < 1) img = img.resize({ height: Math.round(height * scale) });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const bg = await paper(data, w, h, 24, 3);
  const dark = new Uint8Array(w * h), lite = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const j = i * 3, rr = data[j] / Math.max(bg[j], 1), rg = data[j + 1] / Math.max(bg[j + 1], 1), rb = data[j + 2] / Math.max(bg[j + 2], 1);
    const rt = (rr + rg + rb) / 3, grey = Math.abs(rr - rb) < 0.16 && Math.abs(rg - rb) < 0.16;
    if (grey && rt < (spec.darkMax ?? 0.72)) dark[i] = 1; else if (grey && rt < (spec.lightMax ?? 0.88)) lite[i] = 1;
  }
  const dk = open(dark, w, h, spec.openR ?? 2);   // a smaller radius keeps thin outlines (impala, drawn as a rim)
  // keep only the part asked for when the box holds both feet
  if (spec.part) {
    const axis = spec.part === 'left' || spec.part === 'right' ? 'x' : 'y';
    const s = splitAt(dk, w, h, axis);
    if (s != null) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = axis === 'x' ? x : y, keep = spec.part === 'left' || spec.part === 'top' ? c < s : c > s;
      if (!keep) { dk[y * w + x] = 0; lite[y * w + x] = 0; }
    }
  }
  // drop specks, anything touching the crop border (neighbouring text, dimension lines), and anything not chained by
  // proximity to the big pieces of the drawing (stray letters)
  const { lab, cs } = components(dk, w, h);
  const bad = new Set(cs.filter((c) => c.n < 25 || c.x0 <= 1 || c.y0 <= 1 || c.x1 >= w - 2 || c.y1 >= h - 2).map((c) => c.id));
  const alive = cs.filter((c) => !bad.has(c.id));
  let Ln = 1;
  if (alive.length) {
    const L = alive.reduce((a, c) => (c.n > a.n ? c : a)); const Lh = L.y1 - L.y0 + 1; Ln = L.n;
    for (const c of alive) if (c.n < L.n * 0.0025) bad.add(c.id);
    // big pieces (pad, hoof halves) anchor the drawing; medium pieces (toes) chain to them; tiny pieces (claw marks)
    // only survive right next to a medium or big piece, which leaves stray letters out
    const kept = new Set(alive.filter((c) => !bad.has(c.id) && c.n >= L.n * 0.15).map((c) => c.id));
    const tiny = (c) => c.n < L.n * 0.015;
    let grew = true;
    while (grew) {
      grew = false;
      for (const c of alive) {
        if (kept.has(c.id) || bad.has(c.id) || tiny(c)) continue;
        for (const k of alive) if (kept.has(k.id) && gap(c, k) <= Lh * 0.3) { kept.add(c.id); grew = true; break; }
      }
    }
    for (const c of alive) if (tiny(c)) for (const k of alive) if (kept.has(k.id) && !tiny(k) && gap(c, k) <= Lh * 0.1) { kept.add(c.id); break; }
    for (const c of alive) if (!kept.has(c.id)) bad.add(c.id);
  }
  for (let i = 0; i < w * h; i++) if (lab[i] >= 0 && bad.has(lab[i])) dk[i] = 0;
  // the ink box of the dark layer; the light layer only counts inside it (plus a margin: the hippo's pad lies below its toes)
  const dc = cs.filter((c) => !bad.has(c.id));
  let X0 = w, X1 = 0, Y0 = h, Y1 = 0;
  for (const c of dc) { if (c.x0 < X0) X0 = c.x0; if (c.x1 > X1) X1 = c.x1; if (c.y0 < Y0) Y0 = c.y0; if (c.y1 > Y1) Y1 = c.y1; }
  let lt = null;
  if (light && dc.length) {
    lt = erodeDilate(erodeDilate(open(lite, w, h, 4), w, h, 3, true), w, h, 3, false);   // open, then close: solid light pads
    const halo = erodeDilate(dk, w, h, 4, true);
    // light parts sit under or between the dark ones, never beside the drawing (that is where the dimension labels are)
    // (the extra room of lightPad is downwards only: a hippo's pad lies under its toes; above, only a small margin)
    const pad = spec.lightPad ?? 0.12, px = Math.round((X1 - X0) * 0.02 + 2), py = Math.round((Y1 - Y0) * pad + 4), pyUp = Math.round((Y1 - Y0) * 0.12 + 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (halo[i] || x < X0 - px || x > X1 + px || y < Y0 - pyUp || y > Y1 + py) lt[i] = 0; }
    const lc = components(lt, w, h);
    // too small, too hollow, or line-like (a dimension line) → out
    const lbad = new Set(lc.cs.filter((c) => { const bw = c.x1 - c.x0 + 1, bh = c.y1 - c.y0 + 1; return c.n < Math.max(60, Ln * 0.015) || c.n / (bw * bh) < 0.3 || Math.max(bw, bh) > 4 * Math.min(bw, bh); }).map((c) => c.id));
    for (let i = 0; i < w * h; i++) if (lc.lab[i] >= 0 && lbad.has(lc.lab[i])) lt[i] = 0;
  }
  // elephant and rhino soles: the drawing is a solid sole with lighter cracks; fill the holes and keep them as a light layer
  let holes = false;
  if (spec.holes) {
    const inv = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) inv[i] = dk[i] ? 0 : 1;
    const { lab: il, cs: ic } = components(inv, w, h);
    const outside = new Set(ic.filter((c) => c.x0 <= 0 || c.y0 <= 0 || c.x1 >= w - 1 || c.y1 >= h - 1).map((c) => c.id));
    lt = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) if (il[i] >= 0 && !outside.has(il[i])) { dk[i] = 1; lt[i] = 1; }
    holes = true;
  }
  if (process.env.DBG) {
    const px = Buffer.alloc(w * h * 3);
    for (let i = 0; i < w * h; i++) { const v = dk[i] ? 0 : lt && lt[i] ? 150 : 255; px[i * 3] = v; px[i * 3 + 1] = v; px[i * 3 + 2] = dk[i] ? 0 : lt && lt[i] ? 255 : 255; }
    await sharp(px, { raw: { width: w, height: h, channels: 3 } }).png().toFile(path.join(prevDir, `mask-${spec.id}-${spec.foot}.png`));
  }
  const toPng = (m) => { const px = Buffer.alloc(w * h); for (let i = 0; i < w * h; i++) px[i] = m[i] ? 0 : 255; return sharp(px, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer(); };
  const opt = { threshold: 128, turdSize: 6, optTolerance: 0.6, alphaMax: 1, blackOnWhite: true };
  const dPath = roundInt(pathsOf(await trace(await toPng(dk), opt)));
  const lPath = lt && lt.some((v) => v) ? roundInt(pathsOf(await trace(await toPng(lt), opt))) : '';
  let x0 = w, x1 = 0, y0 = h, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (dk[y * w + x] || (lt && lt[y * w + x])) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const out = { d: dPath, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, mm: spec.mm };
  if (!dPath) throw new Error('empty dark layer');
  if (lPath) out.l = lPath;
  if (holes) out.k = 'holes';
  if (spec.mirror) out.mirror = true;
  return out;
}

const result = fs.existsSync(outJson) ? JSON.parse(fs.readFileSync(outJson, 'utf8')) : {};
const sel = only ? new Set(only.split(',')) : null;
for (const sp of SPOOR_SRC) {
  if (sel && !sel.has(sp.id)) continue;
  const e = {};
  for (const foot of ['front', 'hind']) if (sp[foot]) { try { e[foot] = await footFrom({ ...sp[foot], id: sp.id, foot, lightPad: sp[foot].lightPad ?? sp.lightPad, lightMax: sp.lightMax, darkMax: sp.darkMax, holes: sp.holes, openR: sp.openR }, sp.light === true); } catch (err) { console.log('FAIL', sp.id, foot, err.message); } }
  result[sp.id] = e;
  process.stdout.write(sp.id + ' ');
}
fs.writeFileSync(outJson, JSON.stringify(result));
console.log('\nwrote', outJson, Math.round(fs.statSync(outJson).size / 1024), 'KB');

// preview: each species, front + hind at one scale, with a 10 cm bar
const tiles = [];
for (const id of Object.keys(result)) {
  const e = result[id]; const feet = ['front', 'hind'].filter((f) => e[f]);
  if (!feet.length) continue;
  const maxCm = Math.max(...feet.map((f) => e[f].mm / 10));
  const S = Math.min(10, 150 / maxCm);
  let x = 10; const parts = [];
  for (const f of feet) {
    const p = e[f]; const s = (p.mm / 10) * S / p.h; const wpx = p.w * s;
    parts.push(`<g transform="translate(${x + (p.mirror ? wpx : 0)} 20) scale(${p.mirror ? -s : s} ${s}) translate(${-p.x} ${-p.y})"><path d="${p.d}" fill="#3a3a3a" fill-rule="evenodd"/>${p.l ? `<path d="${p.l}" fill="#3a3a3a" opacity="0.35" fill-rule="evenodd"/>` : ''}</g>`);
    parts.push(`<text x="${x + wpx / 2}" y="${20 + (p.mm / 10) * S + 14}" font-size="11" text-anchor="middle" font-family="sans-serif">${f} ${p.mm}</text>`);
    x += wpx + 24;
  }
  const W = Math.max(200, Math.ceil(x)), H = 20 + maxCm * S + 40;
  const bar = 10 * S;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#fff"/>${parts.join('')}<line x1="8" x2="${8 + bar}" y1="${H - 8}" y2="${H - 8}" stroke="#000"/><text x="${8 + bar + 4}" y="${H - 5}" font-size="9" font-family="sans-serif">10 cm</text><text x="4" y="12" font-size="11" font-family="sans-serif" fill="#c00">${id}</text></svg>`;
  tiles.push(await sharp(Buffer.from(svg)).resize(300, 230, { fit: 'inside', background: '#fff' }).png().toBuffer());
}
const T = 300, TH = 230, COLS = 6, ROWS = 3, PER = COLS * ROWS;
fs.mkdirSync(prevDir, { recursive: true });
for (let s = 0; s * PER < tiles.length; s++) {
  const comps = [];
  for (let i = 0; i < PER && s * PER + i < tiles.length; i++) {
    const m = await sharp(tiles[s * PER + i]).metadata();
    comps.push({ input: tiles[s * PER + i], left: (i % COLS) * T + Math.floor((T - m.width) / 2), top: Math.floor(i / COLS) * TH + 2 });
  }
  await sharp({ create: { width: COLS * T, height: ROWS * TH, channels: 3, background: '#e8e8e8' } }).composite(comps).jpeg({ quality: 88 }).toFile(path.join(prevDir, `vec-${String(s).padStart(2, '0')}.jpg`));
}
console.log('previews', Math.ceil(tiles.length / PER));
