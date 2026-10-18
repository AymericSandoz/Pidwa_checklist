import sharp from 'sharp';
const [,, file, ...boxes] = process.argv;
const img = sharp(file); const meta = await img.metadata(); console.log(meta.width, meta.height);
for (const b of boxes) { const [x, y, w, h] = b.split(',').map(Number);
  const buf = await img.clone().extract({ left: x, top: y, width: w, height: h }).png().toBuffer();
  const st = await sharp(buf).stats();
  console.log(b, st.channels.map(c => Math.round(c.mean)).join(','), 'min', st.channels.map(c => c.min).join(','), 'max', st.channels.map(c => c.max).join(','));
}
