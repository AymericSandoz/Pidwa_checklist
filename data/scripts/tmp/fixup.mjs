// All raw photos are 4080x3060; the page is upright after a plain 90° CW rotation (ignore EXIF). Rebuild `up` for the
// EXIF-3 pages (15..29) and flip their boxes by 180° in crops.json.
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
const [,, origDir, upDir, cropsJson] = process.argv;
const det = JSON.parse(fs.readFileSync(cropsJson, 'utf8'));
for (let i = 15; i <= 29; i++) {
  const d = det[i];
  await sharp(path.join(origDir, d.file)).rotate(90).resize({ width: 1400 }).jpeg({ quality: 82 }).toFile(path.join(upDir, d.file));
  d.boxes = d.boxes.map((b) => ({ x: d.W - b.x - b.w, y: d.H - b.y - b.h, w: b.w, h: b.h }));
  d.flipped = true;
}
fs.writeFileSync(cropsJson, JSON.stringify(det));
console.log('ok');
