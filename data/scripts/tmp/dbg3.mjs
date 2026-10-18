// Side-by-side: crop | dark mask | light mask for one foot of one species, after the vec.mjs pipeline (duplicated minimal).
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { paper } from './bg.mjs';
import { SPOOR_SRC } from './spoor-config.mjs';
const [,, origDir, cropsJson, out, ...which] = process.argv;
const det = JSON.parse(fs.readFileSync(cropsJson, 'utf8'));
const tiles = [];
for (const wq of which) {
  const [id, foot] = wq.split(':'); const sp = SPOOR_SRC.find((s) => s.id === id); const spec = sp[foot];
  let b = spec.box; let K;
  if (typeof b === 'string') { const [p, i] = b.split('-').map(Number); b = { page: p, ...det[p].boxes[i] }; K = 3060 / det[p].W; } else K = 3060 / 1400;
  const d = det[b.page];
  const mx = Math.round(b.w * 0.08 * K) + 10, my = Math.round(b.h * 0.08 * K) + 10;
  const left = Math.max(0, Math.round(b.x * K) - mx), top = Math.max(0, Math.round(b.y * K) - my);
  const width = Math.min(3060 - left, Math.round(b.w * K) + 2 * mx), height = Math.min(4080 - top, Math.round(b.h * K) + 2 * my);
  let img = sharp(path.join(origDir, d.file)).rotate(90).extract({ left, top, width, height });
  const scale = Math.min(1, 480 / height); if (scale < 1) img = img.resize({ height: Math.round(height * scale) });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true }); const w = info.width, h = info.height;
  const bg = await paper(data, w, h, 24, 3);
  const m = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) { const j = i * 3, rr = data[j] / Math.max(bg[j], 1), rg = data[j + 1] / Math.max(bg[j + 1], 1), rb = data[j + 2] / Math.max(bg[j + 2], 1); const rt = (rr + rg + rb) / 3, grey = Math.abs(rr - rb) < 0.16 && Math.abs(rg - rb) < 0.16;
    let c = [255, 255, 255]; if (grey && rt < 0.72) c = [0, 0, 0]; else if (grey && rt < 0.88) c = [90, 90, 255]; else if (grey && rt < 0.95) c = [200, 200, 255]; else if (rt < 0.8) c = [255, 120, 120];
    m[j] = c[0]; m[j + 1] = c[1]; m[j + 2] = c[2]; }
  const a = await sharp(data, { raw: { width: w, height: h, channels: 3 } }).resize({ height: 300 }).png().toBuffer();
  const bb = await sharp(m, { raw: { width: w, height: h, channels: 3 } }).resize({ height: 300 }).png().toBuffer();
  const am = await sharp(a).metadata();
  const pair = await sharp({ create: { width: am.width * 2 + 6, height: 300, channels: 3, background: '#fff' } }).composite([{ input: a, left: 0, top: 0 }, { input: bb, left: am.width + 6, top: 0 }]).png().toBuffer();
  tiles.push({ id: wq, buf: pair, w: am.width * 2 + 6 });
  console.log(wq, 'crop', w, h, 'K', K.toFixed(2));
}
let x = 0; const comps = [];
for (const t of tiles) { comps.push({ input: t.buf, left: x, top: 0 }); comps.push({ input: Buffer.from(`<svg width="${t.w}" height="20"><text x="2" y="15" font-size="13" font-family="sans-serif" fill="#c00">${t.id}</text></svg>`), left: x, top: 302 }); x += t.w + 12; }
await sharp({ create: { width: x, height: 324, channels: 3, background: '#ddd' } }).composite(comps).jpeg({ quality: 85 }).toFile(path.join(out, 'dbg3.jpg'));
