// High-res tiles of selected detected boxes (with margin so the mm label and caption are included), from the ORIGINAL photos.
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
const [,, origDir, cropsJson, out, idsArg, flippedArg] = process.argv;
const det = JSON.parse(fs.readFileSync(cropsJson, 'utf8'));
const ids = idsArg.split(',').map((s) => s.trim());
const flipped = new Set((flippedArg || '').split(',').filter(Boolean).map(Number));
const T = 460, COLS = 4, ROWS = 3, PER = COLS * ROWS;
const tiles = [];
for (const id of ids) {
  const [pi, bi] = id.split('-').map(Number);
  const d = det[pi]; if (!d) { console.log('no page', pi); continue; }
  const b = d.boxes[bi]; if (!b) { console.log('no box', id); continue; }
  const src = path.join(origDir, d.file);
  const meta = await sharp(src).metadata();
  const exifRot = true;
  const ow = exifRot ? meta.height : meta.width, oh = exifRot ? meta.width : meta.height;
  const landscape = ow > oh;
  const k = (landscape ? oh : ow) / d.W;               // upright width in original px / 1400
  const img = sharp(src).rotate(90);
  const mx = Math.round((b.w * 0.25 + 70) * k), my = Math.round((b.h * 0.25 + 70) * k);
  const UW = Math.min(meta.width, meta.height), UH = Math.max(meta.width, meta.height);
  const left = Math.max(0, Math.round(b.x * k) - mx), top = Math.max(0, Math.round(b.y * k) - my);
  const width = Math.min(UW - left, Math.round(b.w * k) + 2 * mx), height = Math.min(UH - top, Math.round(b.h * k) + 2 * my);
  let buf; try { buf = await img.extract({ left, top, width, height }).toBuffer(); } catch (e) { console.log("bad", id, left, top, width, height, UW, UH); continue; }
  if (flipped.has(pi)) buf = await sharp(buf).rotate(180).toBuffer();
  buf = await sharp(buf).resize(T - 6, T - 26, { fit: 'inside' }).toBuffer();
  tiles.push({ id, buf });
}
for (let s = 0; s * PER < tiles.length; s++) {
  const comps = [];
  for (let i = 0; i < PER && s * PER + i < tiles.length; i++) {
    const t = tiles[s * PER + i];
    comps.push({ input: t.buf, left: (i % COLS) * T + 3, top: Math.floor(i / COLS) * T + 3 });
    comps.push({ input: Buffer.from(`<svg width="${T}" height="22"><text x="4" y="16" font-size="16" font-family="sans-serif" fill="#c00">${t.id}</text></svg>`), left: (i % COLS) * T, top: Math.floor(i / COLS) * T + T - 22 });
  }
  await sharp({ create: { width: COLS * T, height: ROWS * T, channels: 3, background: '#fff' } }).composite(comps).jpeg({ quality: 85 }).toFile(path.join(out, `t-${String(s).padStart(2, '0')}.jpg`));
}
console.log(tiles.length, 'tiles', Math.ceil(tiles.length / PER), 'sheets');
