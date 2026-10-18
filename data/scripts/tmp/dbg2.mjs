import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { paper } from './bg.mjs';
const [,, origDir, cropsJson, out, id] = process.argv;
const det = JSON.parse(fs.readFileSync(cropsJson, 'utf8'));
const K = 3060 / 1400;
const [p, i] = id.split('-').map(Number); const b = det[p].boxes[i]; const d = det[p];
const mx = Math.round(b.w * 0.08 * K) + 10, my = Math.round(b.h * 0.08 * K) + 10;
const left = Math.max(0, Math.round(b.x * K) - mx), top = Math.max(0, Math.round(b.y * K) - my);
const width = Math.min(3060 - left, Math.round(b.w * K) + 2 * mx), height = Math.min(4080 - top, Math.round(b.h * K) + 2 * my);
console.log('box', b, 'crop', left, top, width, height);
const cropBuf = await sharp(path.join(origDir, d.file)).rotate(90).extract({ left, top, width, height }).toBuffer();
const scale = Math.min(1, 700 / height);
const { data, info } = await sharp(cropBuf).resize({ height: Math.round(height * scale) }).raw().toBuffer({ resolveWithObject: true });
const w = info.width, h = info.height;
await sharp(data, { raw: { width: w, height: h, channels: 3 } }).jpeg().toFile(path.join(out, `dbg-${id}-crop.jpg`));
const bg = await paper(data, w, h, 24, 3);
const m = Buffer.alloc(w * h * 3);
let cnt = [0, 0, 0];
for (let k = 0; k < w * h; k++) {
  const j = k * 3, rr = data[j] / Math.max(bg[j], 1), rg = data[j + 1] / Math.max(bg[j + 1], 1), rb = data[j + 2] / Math.max(bg[j + 2], 1);
  const rt = (rr + rg + rb) / 3, grey = Math.abs(rr - rb) < 0.16 && Math.abs(rg - rb) < 0.16;
  if (grey && rt < 0.72) { m[j] = 0; m[j + 1] = 0; m[j + 2] = 0; cnt[0]++; }
  else if (grey && rt < 0.88) { m[j] = 120; m[j + 1] = 120; m[j + 2] = 255; cnt[1]++; }
  else if (rt < 0.72) { m[j] = 255; m[j + 1] = 0; m[j + 2] = 0; cnt[2]++; }
  else { m[j] = 255; m[j + 1] = 255; m[j + 2] = 255; }
}
console.log('dark', cnt[0], 'light', cnt[1], 'dark-but-not-grey', cnt[2], 'of', w * h);
await sharp(m, { raw: { width: w, height: h, channels: 3 } }).jpeg().toFile(path.join(out, `dbg-${id}-mask.jpg`));
// sample the centre pixel ratios
const cx = Math.round(w / 2), cy = Math.round(h / 2); const j = (cy * w + cx) * 3;
console.log('centre px', data[j], data[j + 1], data[j + 2], 'bg', bg[j], bg[j + 1], bg[j + 2]);
