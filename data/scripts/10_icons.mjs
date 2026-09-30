// Step 10: app icons -> app/public/icons, and the in-app brand marks -> app/src/assets
// Source artwork: the Askari Wilderness Conservation Programme logo (data/brand, used with the programme's agreement).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { DATA_DIR } from './lib.mjs';

const brand = path.join(DATA_DIR, 'brand');
const icons = path.join(DATA_DIR, '..', 'app', 'public', 'icons');
const assets = path.join(DATA_DIR, '..', 'app', 'src', 'assets');
fs.mkdirSync(icons, { recursive: true });
fs.mkdirSync(assets, { recursive: true });

const GREEN = '#209D50';

/**
 * Black artwork on white or on transparent -> trimmed white PNG whose alpha channel is the ink.
 * `grow` thickens the lines (in source pixels) so that they survive small sizes.
 */
async function inkMask(file, grow = 0) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let ink = Buffer.alloc(width * height);
  for (let i = 0; i < width * height; i++) {
    const lum = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;
    ink[i] = Math.round((data[i * 4 + 3] / 255) * (255 - lum));
  }
  if (grow) ink = await sharp(ink, { raw: { width, height, channels: 1 } }).blur(grow).linear(3.2, 0).toColourspace('b-w').raw().toBuffer();
  let x0 = width, x1 = -1, y0 = height, y1 = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (ink[y * width + x] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const alpha = await sharp(ink, { raw: { width, height, channels: 1 } }).extract({ left: x0, top: y0, width: w, height: h }).toColourspace('b-w').raw().toBuffer();
  return sharp({ create: { width: w, height: h, channels: 3, background: '#ffffff' } }).joinChannel(alpha, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer();
}

const elephant = path.join(brand, 'askari-elephant.webp');
const logo = path.join(brand, 'askari-logo.webp');

// ---- launcher icons: white elephant on the Askari green ----
const forIcon = await inkMask(elephant, 1.3);
async function tile(size, artWidth, rounded) {
  const art = await sharp(forIcon).resize({ width: Math.round(size * artWidth) }).toBuffer();
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${rounded ? size * 0.22 : 0}" fill="${GREEN}"/></svg>`);
  return sharp(bg).composite([{ input: art, gravity: 'centre' }]).png();
}
await (await tile(192, 0.76, true)).toFile(path.join(icons, 'icon-192.png'));
await (await tile(512, 0.76, true)).toFile(path.join(icons, 'icon-512.png'));
// maskable: full-bleed tile, artwork inside the central safe zone
await (await tile(512, 0.58, false)).toFile(path.join(icons, 'icon-512-maskable.png'));

// ---- in-app marks, used as CSS masks so that they take the colour of the theme ----
// header: small, so the lines are thickened
await sharp(await inkMask(elephant, 3.2)).resize({ height: 112 }).png().toFile(path.join(assets, 'askari-mark.png'));
// loading screen and "about": the full logo with its lettering
await sharp(await inkMask(logo, 0.8)).resize({ width: 640 }).png().toFile(path.join(assets, 'askari-logo.png'));

console.log('icons written to', icons, 'and marks to', assets);

// ---- giraffe-patch texture (as on the Askari site): a seamless tile cut from a periodic Voronoi diagram ----
function giraffeTile(T, n, gap, seed = 7) {
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const pts = [];
  const c = T / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) pts.push([(x + 0.18 + rnd() * 0.64) * c, (y + 0.18 + rnd() * 0.64) * c]);
  const all = [];
  for (const [px, py] of pts) for (const dx of [-T, 0, T]) for (const dy of [-T, 0, T]) all.push([px + dx, py + dy]);
  const r = 7; // corner rounding, obtained with a round stroke of the same colour
  let d = '';
  for (const p of pts) {
    let poly = [[-T, -T], [2 * T, -T], [2 * T, 2 * T], [-T, 2 * T]];
    for (const q of all) {
      if (q[0] === p[0] && q[1] === p[1]) continue;
      const nx = q[0] - p[0], ny = q[1] - p[1], len = Math.hypot(nx, ny);
      if (len > T) continue;
      const ux = nx / len, uy = ny / len, k = len / 2 - gap / 2 - r; // keep the points with (v - p) . u <= k
      const side = (v) => (v[0] - p[0]) * ux + (v[1] - p[1]) * uy - k;
      const next = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length], sa = side(a), sb = side(b);
        if (sa <= 0) next.push(a);
        if ((sa < 0 && sb > 0) || (sa > 0 && sb < 0)) { const t = sa / (sa - sb); next.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
      }
      poly = next;
      if (poly.length < 3) break;
    }
    if (poly.length < 3) continue;
    for (const dx of [-T, 0, T]) for (const dy of [-T, 0, T]) {
      const xs = poly.map((v) => v[0] + dx), ys = poly.map((v) => v[1] + dy);
      if (Math.max(...xs) < -r || Math.min(...xs) > T + r || Math.max(...ys) < -r || Math.min(...ys) > T + r) continue;
      d += 'M' + poly.map((v) => `${(v[0] + dx).toFixed(1)} ${(v[1] + dy).toFixed(1)}`).join('L') + 'Z';
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}" viewBox="0 0 ${T} ${T}"><path d="${d}" stroke="#000" stroke-width="${r * 2}" stroke-linejoin="round"/></svg>\n`;
}
fs.writeFileSync(path.join(assets, 'giraffe.svg'), giraffeTile(240, 5, 8));
console.log('giraffe pattern written');
