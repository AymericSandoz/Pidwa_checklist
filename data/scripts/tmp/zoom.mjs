// Zoomed tiles of manual regions (upright-1400 coords) from the originals, to check the hand-placed boxes.
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
const [,, origDir, cropsJson, out, ...regs] = process.argv;
const det = JSON.parse(fs.readFileSync(cropsJson, 'utf8'));
const T = 460, COLS = 4, ROWS = 2;
const tiles = [];
for (const r of regs) {
  const [page, x, y, w, h] = r.split(',').map(Number);
  const d = det[page]; const k = 3060 / 1400;
  const img = sharp(path.join(origDir, d.file)).rotate(90);
  const left = Math.max(0, Math.round(x * k)), top = Math.max(0, Math.round(y * k));
  const buf = await img.extract({ left, top, width: Math.min(3060 - left, Math.round(w * k)), height: Math.min(4080 - top, Math.round(h * k)) })
    .resize(T - 6, T - 26, { fit: 'inside' }).toBuffer();
  tiles.push({ id: r, buf });
}
const comps = [];
tiles.forEach((t, i) => {
  comps.push({ input: t.buf, left: (i % COLS) * T + 3, top: Math.floor(i / COLS) * T + 3 });
  comps.push({ input: Buffer.from(`<svg width="${T}" height="22"><text x="4" y="16" font-size="15" font-family="sans-serif" fill="#c00">${t.id}</text></svg>`), left: (i % COLS) * T, top: Math.floor(i / COLS) * T + T - 22 });
});
await sharp({ create: { width: COLS * T, height: ROWS * T, channels: 3, background: '#fff' } }).composite(comps).jpeg({ quality: 85 }).toFile(path.join(out, 'zoom.jpg'));
console.log('ok');
