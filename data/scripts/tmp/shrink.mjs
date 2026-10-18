import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
const [,, src, out, sheets] = process.argv;
const files = fs.readdirSync(src).filter(f => /\.jpe?g$/i.test(f)).sort();
const metas = [];
for (const f of files) {
  const o = path.join(out, f.replace(/\.jpe?g$/i, '.jpg'));
  if (!fs.existsSync(o)) await sharp(path.join(src, f)).rotate().resize({ width: 1400, withoutEnlargement: true }).jpeg({ quality: 82 }).toFile(o);
  const m = await sharp(o).metadata(); metas.push({ f, w: m.width, h: m.height });
}
// contact sheets: 4x3 tiles of 300x400
const TW = 300, TH = 400, COLS = 4, ROWS = 3, PER = COLS * ROWS;
for (let s = 0; s * PER < files.length; s++) {
  const comps = [];
  for (let i = 0; i < PER && s * PER + i < files.length; i++) {
    const f = files[s * PER + i];
    const buf = await sharp(path.join(out, f)).resize(TW - 8, TH - 28, { fit: 'inside' }).toBuffer();
    const m = await sharp(buf).metadata();
    const x = (i % COLS) * TW + 4, y = Math.floor(i / COLS) * TH + 4;
    comps.push({ input: buf, left: x, top: y });
    const label = Buffer.from(`<svg width="${TW}" height="24"><text x="4" y="17" font-size="14" font-family="sans-serif" fill="#000">${s * PER + i} ${f.slice(9, 15)}</text></svg>`);
    comps.push({ input: label, left: (i % COLS) * TW, top: y + (TH - 28) - 0 });
  }
  await sharp({ create: { width: COLS * TW, height: ROWS * TH, channels: 3, background: '#fff' } }).composite(comps).jpeg({ quality: 80 }).toFile(path.join(sheets, `sheet-${String(s).padStart(2, '0')}.jpg`));
}
console.log(files.length, 'files;', Math.ceil(files.length / PER), 'sheets');
