// Find the grey silhouette drawings on photographed book pages; write det.json (1400px coords) and verification sheets.
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { paper } from './bg.mjs';
const [,, src, out, only] = process.argv;
const files = fs.readdirSync(src).filter(f => /\.jpg$/i.test(f)).sort();
const sel = only ? only.split(',').map(Number) : null;
const det = {};
const D = 4;
for (let idx = 0; idx < files.length; idx++) {
  if (sel && !sel.includes(idx)) continue;
  const f = files[idx];
  const img = sharp(path.join(src, f));
  const { width: W, height: H } = await img.metadata();
  const { data } = await img.clone().raw().toBuffer({ resolveWithObject: true });
  const bg = await paper(data, W, H);
  const w = Math.floor(W / D), h = Math.floor(H / D);
  const acc = new Float32Array(w * h);
  for (let y = 0; y < h * D; y++) for (let x = 0; x < w * D; x++) {
    const i = (y * W + x) * 3;
    const rr = data[i] / Math.max(bg[i], 1), rg = data[i + 1] / Math.max(bg[i + 1], 1), rb = data[i + 2] / Math.max(bg[i + 2], 1);
    const rt = (rr + rg + rb) / 3;
    if (rt < 0.62 && rt > 0.1 && Math.abs(rr - rb) < 0.14 && Math.abs(rg - rb) < 0.14) acc[((y / D) | 0) * w + ((x / D) | 0)] += 1;
  }
  const m = new Uint8Array(w * h);
  for (let i = 0; i < m.length; i++) m[i] = acc[i] / (D * D) > 0.75 ? 1 : 0;
  const er = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    let ok = 1; for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1; dx++) if (!m[(y + dy) * w + x + dx]) { ok = 0; break; }
    er[y * w + x] = ok;
  }
  let cur = er;
  for (let k = 0; k < 5; k++) {
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
  // solid, not huge, compact; drop boxes touching the image border (fabric)
  if (process.env.DBG) console.log(" comps", comps.filter(c=>c.fill>20).map(c=>`${(c.x1-c.x0+1)*D}x${(c.y1-c.y0+1)*D}@${c.x0*D},${c.y0*D} f${c.fill} r${(c.fill/((c.x1-c.x0+1)*(c.y1-c.y0+1))).toFixed(2)}`).join(" "));
  let keep = comps.filter(c => c.fill > 40 && (c.x1 - c.x0) < w * 0.4 && (c.y1 - c.y0) < h * 0.4 && c.fill / ((c.x1 - c.x0 + 1) * (c.y1 - c.y0 + 1)) > 0.1 && c.x0 > 1 && c.y0 > 1 && c.x1 < w - 2 && c.y1 < h - 2)
    .map(c => ({ x: c.x0 * D, y: c.y0 * D, w: (c.x1 - c.x0 + 1) * D, h: (c.y1 - c.y0 + 1) * D }));
  // merge boxes closer than 50px (toes + pad, both feet of one drawing)
  let merged = true;
  while (merged) { merged = false;
    outer: for (let a = 0; a < keep.length; a++) for (let b = a + 1; b < keep.length; b++) {
      const A = keep[a], B = keep[b];
      if (A.x < B.x + B.w + 50 && B.x < A.x + A.w + 50 && A.y < B.y + B.h + 50 && B.y < A.y + A.h + 50) {
        const x = Math.min(A.x, B.x), y = Math.min(A.y, B.y);
        keep[a] = { x, y, w: Math.max(A.x + A.w, B.x + B.w) - x, h: Math.max(A.y + A.h, B.y + B.h) - y }; keep.splice(b, 1); merged = true; break outer;
      }
    }
  }
  keep = keep.filter(k => k.w > 40 && k.h > 40);
  det[idx] = keep;
  console.log(idx, f, keep.length, keep.map(k => `${k.w}x${k.h}@${k.x},${k.y}`).join(' '));
}
fs.writeFileSync(path.join(out, 'det.json'), JSON.stringify(det, null, 1));
