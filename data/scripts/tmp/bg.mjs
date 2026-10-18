import sharp from 'sharp';
/** Paper-white estimate: per 32px block the 85th percentile per channel, then a 5x5-block max (so a 150px silhouette never counts as paper), smooth, upscale. */
export async function paper(data, W, H, B = 32, R = 2) {
  const gw = Math.ceil(W / B), gh = Math.ceil(H / B), g = new Uint8Array(gw * gh * 3), g2 = Buffer.alloc(gw * gh * 3);
  const tmp = [[], [], []];
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    tmp[0].length = tmp[1].length = tmp[2].length = 0;
    for (let y = gy * B; y < Math.min(H, gy * B + B); y += 2) for (let x = gx * B; x < Math.min(W, gx * B + B); x += 2) { const i = (y * W + x) * 3; tmp[0].push(data[i]); tmp[1].push(data[i + 1]); tmp[2].push(data[i + 2]); }
    for (let c = 0; c < 3; c++) { tmp[c].sort((a, b) => a - b); g[(gy * gw + gx) * 3 + c] = tmp[c][Math.floor(tmp[c].length * 0.85)]; }
  }
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) for (let c = 0; c < 3; c++) {
    let mx = 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const yy = gy + dy, xx = gx + dx; if (yy < 0 || xx < 0 || yy >= gh || xx >= gw) continue; const v = g[(yy * gw + xx) * 3 + c]; if (v > mx) mx = v; }
    g2[(gy * gw + gx) * 3 + c] = mx;
  }
  return sharp(g2, { raw: { width: gw, height: gh, channels: 3 } }).blur(1.2).resize({ width: W, height: H, fit: 'fill' }).raw().toBuffer();
}
