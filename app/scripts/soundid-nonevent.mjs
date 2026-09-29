// Experiment: do BirdNET's own "Noise" / "Environmental" / "Engine" classes light up in rain?
// Usage: node scripts/soundid-nonevent.mjs [baseUrl]
import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://localhost:5180/Pidwa_checklist/';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.goto(base + '#/listen', { waitUntil: 'load' });
await page.waitForFunction(() => window.__soundid && ['ready', 'error'].includes(window.__soundid.status.value), null, { timeout: 240000 });
const out = await page.evaluate(async (base) => {
  const RATE = 48000, W = 144000;
  const sid = window.__soundid, classes = sid.classes();
  let seed = 777; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  const rain = (n, drops) => { const x = new Float32Array(n); let lp = 0; for (let i = 0; i < n; i++) { const w = rnd(); lp += 0.06 * (w - lp); x[i] = (w - lp) * 0.2; } for (let d = 0; d < (n / RATE) * drops; d++) { const p = Math.floor(((rnd() + 1) / 2) * (n - 400)), len = 60 + Math.floor(((rnd() + 1) / 2) * 300); for (let k = 0; k < len; k++) x[p + k] += 0.3 * rnd() * Math.exp(-k / (len / 4)); } return x; };
  const clip = (await new OfflineAudioContext(1, 1, RATE).decodeAudioData(await (await fetch(`${base}data/sounds/streptopelia-capicola-1.mp3`)).arrayBuffer())).getChannelData(0);
  const scen = { 'rain (hiss + drops)': rain(W * 3, 400), 'hiss only': rain(W * 3, 0), 'white noise': Float32Array.from({ length: W * 3 }, () => rnd() * 0.2), 'near silence': Float32Array.from({ length: W * 3 }, () => rnd() * 0.002), 'dove, clean': clip.slice(0, W * 3) };
  const res = {};
  for (const [name, pcm] of Object.entries(scen)) {
    res[name] = [];
    for (let s = 0; s + W <= pcm.length; s += W) {
      const top = await sid.analyse(pcm.slice(s, s + W));
      res[name].push(top.slice(0, 5).map(([i, c]) => `${classes[i][1]} ${Math.round(c * 100)}%`).join(', '));
    }
  }
  return res;
}, base);
for (const [k, v] of Object.entries(out)) { console.log('\n' + k); v.forEach((l) => console.log('   ' + l)); }
await browser.close();
