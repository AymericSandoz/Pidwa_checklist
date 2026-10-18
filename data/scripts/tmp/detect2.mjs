// Upright every page (landscape photos were taken with the page turned 90° CW), find grey silhouette blobs,
// write crops.json (boxes in upright 1400px coords) and verification sheets of the crops.
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { paper } from './bg.mjs';
const [,, src, upDir, out] = process.argv;
const files = fs.readdirSync(src).filter(f => /\.jpg$/i.test(f)).sort();
const D = 4, det = {};
const crops = [];
for (let idx = 0; idx < files.length; idx++) {
  const f = files[idx];
  let img = sharp(path.join(src, f));
  let { width: W, height: H } = await img.metadata();
  const landscape = W > H;
  const upPath = path.join(upDir, f);
  if (!fs.existsSync(upPath)) await img.rotate(landscape ? 90 : 0).toFile(upPath);
  img = sharp(upPath); ({ width: W, height: H } = await img.metadata());
  const { data } = await img.clone().raw().toBuffer({ resolveWithObject: true });
  const bg = await paper(data, W, H);
  const w = Math.floor(W / D), h = Math.floor(H / D);
  const acc = new Float32Array(w * h);
  for (let y = 0; y < h * D; y++) for (let x = 0; x < w * D; x++) {
    const i = (y * W + x) * 3;
    const rr = data[i] / Math.max(bg[i], 1), rg = data[i + 1] / Math.max(bg[i + 1], 1), rb = data[i + 2] / Math.max(bg[i + 2], 1);
    const rt = (rr + rg + rb) / 3;
    if (rt < 0.7 && rt > 0.08 && Math.abs(rr - rb) < 0.14 && Math.abs(rg - rb) < 0.14) acc[((y / D) | 0) * w + ((x / D) | 0)] += 1;
  }
  const m = new Uint8Array(w * h);
  for (let i = 0; i < m.length; i++) m[i] = acc[i] / (D * D) > 0.7 ? 1 : 0;
  const er = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    let ok = 1; for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1; dx++) if (!m[(y + dy) * w + x + dx]) { ok = 0; break; }
    er[y * w + x] = ok;
  }
  let cur = er;
  for (let k = 0; k < 4; k++) {
    const di = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      let any = 0; for (let dy = -1; dy <= 1 && !any; dy++) for (let dx = -1; dx <= 1; dx++) if (cur[(y + dy) * w + x + dx]) { any = 1; break; }
      di[y * w + x] = any;
    }
    cur = di;
  }
  const lab = new Int32Array(w * h).fill(-1); const comps = [];
  for (let i = 0; i < w * h; i++) {
    if (!cur[i] || lab[i] >= 0) continue;
    const id = comps.length; const st = [i]; lab[i] = id; let x0 = w, x1 = 0, y0 = h, y1 = 0, fill = 0;
    while (st.length) {
      const p = st.pop(); const px = p % w, py = (p / w) | 0; fill += er[p];
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      for (const q of [p - 1, p + 1, p - w, p + w]) if (q >= 0 && q < w * h && cur[q] && lab[q] < 0) { lab[q] = id; st.push(q); }
    }
    comps.push({ fill, x0, y0, x1, y1 });
  }
  let keep = comps.filter(c => c.fill > 25 && (c.x1 - c.x0) < w * 0.45 && (c.y1 - c.y0) < h * 0.45 && c.fill / ((c.x1 - c.x0 + 1) * (c.y1 - c.y0 + 1)) > 0.12 && c.x0 > 1 && c.y0 > 1 && c.x1 < w - 2 && c.y1 < h - 2)
    .map(c => ({ x: c.x0 * D, y: c.y0 * D, w: (c.x1 - c.x0 + 1) * D, h: (c.y1 - c.y0 + 1) * D }));
  // merge boxes with a gap under 28px (toes to pad), keep front and hind feet apart
  let merged = true;
  while (merged) { merged = false;
    outer: for (let a = 0; a < keep.length; a++) for (let b = a + 1; b < keep.length; b++) {
      const A = keep[a], B = keep[b], G = 28;
      if (A.x < B.x + B.w + G && B.x < A.x + A.w + G && A.y < B.y + B.h + G && B.y < A.y + A.h + G) {
        const x = Math.min(A.x, B.x), y = Math.min(A.y, B.y);
        keep[a] = { x, y, w: Math.max(A.x + A.w, B.x + B.w) - x, h: Math.max(A.y + A.h, B.y + B.h) - y }; keep.splice(b, 1); merged = true; break outer;
      }
    }
  }
  keep = keep.filter(k => k.w > 36 && k.h > 36).sort((a, b) => a.y - b.y || a.x - b.x);
  det[idx] = { file: f, W, H, boxes: keep };
  keep.forEach((k, j) => crops.push({ idx, j, ...k }));
  process.stdout.write(`${idx}:${keep.length} `);
}
fs.writeFileSync(path.join(out, 'crops.json'), JSON.stringify(det));
// verification sheets: 6 x 4 tiles of 230px
const T = 230, COLS = 6, ROWS = 4, PER = COLS * ROWS;
for (let s = 0; s * PER < crops.length; s++) {
  const comps = [];
  for (let i = 0; i < PER && s * PER + i < crops.length; i++) {
    const c = crops[s * PER + i]; const d = det[c.idx];
    const mx = Math.round(c.w * 0.12) + 8, my = Math.round(c.h * 0.12) + 8;
    const left = Math.max(0, c.x - mx), top = Math.max(0, c.y - my);
    const width = Math.min(d.W - left, c.w + 2 * mx), height = Math.min(d.H - top, c.h + 2 * my);
    const buf = await sharp(path.join(upDir, d.file)).extract({ left, top, width, height }).resize(T - 6, T - 26, { fit: 'inside' }).toBuffer();
    comps.push({ input: buf, left: (i % COLS) * T + 3, top: Math.floor(i / COLS) * T + 3 });
    comps.push({ input: Buffer.from(`<svg width="${T}" height="22"><text x="4" y="16" font-size="14" font-family="sans-serif" fill="#000">${c.idx}-${c.j} ${c.w}x${c.h}</text></svg>`), left: (i % COLS) * T, top: Math.floor(i / COLS) * T + T - 22 });
  }
  await sharp({ create: { width: COLS * T, height: ROWS * T, channels: 3, background: '#fff' } }).composite(comps).jpeg({ quality: 82 }).toFile(path.join(out, `crops-${String(s).padStart(2, '0')}.jpg`));
}
console.log('\n', crops.length, 'crops');
