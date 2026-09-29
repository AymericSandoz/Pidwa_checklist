// Step 10: app icons -> app/public/icons
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { DATA_DIR } from './lib.mjs';

const dir = path.join(DATA_DIR, '..', 'app', 'public', 'icons');
fs.mkdirSync(dir, { recursive: true });

// simple mark: dark green tile, a bird silhouette drawn with a few curves, and a check mark
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${pad ? 0 : 96}" fill="#2f4f2f"/>
  <g transform="translate(${pad ? 64 : 32} ${pad ? 64 : 32}) scale(${pad ? 0.75 : 0.875})">
    <path d="M96 300 C 150 200, 260 190, 330 230 C 360 200, 400 200, 430 215 L 400 235 C 420 300, 360 380, 260 380 C 190 380, 130 350, 96 300 Z" fill="#f5f4ef"/>
    <circle cx="352" cy="240" r="9" fill="#2f4f2f"/>
    <path d="M400 235 L 470 245 L 402 262 Z" fill="#d98e2b"/>
    <path d="M150 430 l 40 40 l 90 -95" fill="none" stroke="#d98e2b" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
fs.writeFileSync(path.join(dir, 'icon.svg'), svg(false));
await sharp(Buffer.from(svg(false))).resize(192, 192).png().toFile(path.join(dir, 'icon-192.png'));
await sharp(Buffer.from(svg(false))).resize(512, 512).png().toFile(path.join(dir, 'icon-512.png'));
await sharp(Buffer.from(svg(true))).resize(512, 512).png().toFile(path.join(dir, 'icon-512-maskable.png'));
console.log('icons written to', dir);
