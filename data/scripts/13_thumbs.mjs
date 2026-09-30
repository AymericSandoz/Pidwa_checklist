// Step 13: small square thumbnails of the species photos -> data/out/thumbs/<id>.webp
// Used where many photos are on screen at once and tiny (map markers, species strip): the full photos
// would each be decoded at 900 px for a 40 px circle.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { OUT_DIR } from './lib.mjs';

const SIZE = 176; // px: sharp enough for a 66 px tile on a dense phone screen
const src = path.join(OUT_DIR, 'images');
const dst = path.join(OUT_DIR, 'thumbs');
fs.mkdirSync(dst, { recursive: true });

const files = fs.readdirSync(src).filter((f) => f.endsWith('.webp'));
let bytes = 0;
for (const f of files) {
  // "attention" keeps the most detailed part of the picture, which is the animal rather than the sky
  await sharp(path.join(src, f)).resize(SIZE, SIZE, { fit: 'cover', position: sharp.strategy.attention }).webp({ quality: 72 }).toFile(path.join(dst, f));
  bytes += fs.statSync(path.join(dst, f)).size;
}
// thumbnails of photos that no longer exist
for (const f of fs.readdirSync(dst)) if (!files.includes(f)) fs.unlinkSync(path.join(dst, f));
console.log(files.length, 'thumbnails,', (bytes / 1e6).toFixed(2), 'MB ->', dst);
