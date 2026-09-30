// Sound ID benchmark for faint birds: records what the model says, window by window, for reference recordings
// mixed with ambient noise at several signal-to-noise ratios, and for noise alone.
// The raw scores are saved so that decision rules can be compared offline (scripts/soundid-rules.mjs)
// without running the model again.
// Usage: node scripts/soundid-faint.mjs [baseUrl] [every=4] [--denoise]
// Output: data/raw/soundid_faint.json, or soundid_faint_dn.json with --denoise (noise reduction before the model)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
// --denoise or --denoise=percentile,over,floor  (noise reduction settings to try)
const dnArg = process.argv.find((a) => a.startsWith('--denoise'));
const DENOISE = !!dnArg;
const dnOpts = dnArg && dnArg.includes('=') ? (([percentile, over, floor]) => ({ percentile, over, floor }))(dnArg.split('=')[1].split(',').map(Number)) : null;
const dnTag = dnOpts ? '_' + [dnOpts.percentile, dnOpts.over, dnOpts.floor].join('-') : '';
const base = args[0] || 'http://localhost:5180/Pidwa_checklist/';
const every = Number(args[1] || 4);
const outFile = path.resolve('..', 'data', 'raw', DENOISE ? `soundid_faint_dn${dnTag}.json` : 'soundid_faint.json');
const SNRS = ['clean', 3, -3, -9];

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(base + '#/listen', { waitUntil: 'load' });
const ready = () => page.waitForFunction(() => window.__soundid && ['ready', 'error'].includes(window.__soundid.status.value), null, { timeout: 600000 });
await ready();
await page.evaluate(() => window.__soundid.setEngine('wasm')); // exact on every machine, and the fastest here
await ready();
console.log('engine', JSON.stringify(await page.evaluate(() => ({ e: window.__soundid.engineInfo.value?.engine, v: window.__soundid.engineInfo.value?.verified }))));

// helpers living in the page
if (DENOISE) await page.addScriptTag({ path: 'scripts/denoise-experiment.js' }); // tried and rejected: it lowers detection, see the file header
await page.evaluate(([base, DENOISE, dnOpts]) => {
  const RATE = 48000, W = 144000, HOP = 48000;
  const sid = window.__soundid;
  const rms = (x) => { let s = 0; for (let i = 0; i < x.length; i++) s += x[i] * x[i]; return Math.sqrt(s / x.length); };
  const lcg = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  // Butterworth high-pass 200 Hz, as the app applies before the model
  const highpass = (x, fc = 200) => { const w = (2 * Math.PI * fc) / RATE, cs = Math.cos(w), al = Math.sin(w) / (2 * 0.7071); const b0 = (1 + cs) / 2, b1 = -(1 + cs), b2 = (1 + cs) / 2, a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al; const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; };
  // ambient noise of three kinds
  const noise = (kind, n, seed) => {
    const r = lcg(seed), x = new Float32Array(n);
    let b0 = 0, b1 = 0, b2 = 0, lp = 0, slow = 0, bp1 = 0, bp2 = 0;
    for (let i = 0; i < n; i++) {
      const w = r();
      // pink noise (Paul Kellet's economy filter): quiet bush, microphone hiss, distant broadband sound
      b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913;
      const pink = (b0 + b1 + b2 + w * 0.1848) * 0.2;
      if (kind === 'ambient') x[i] = pink;
      else if (kind === 'wind') { lp += 0.01 * (w - lp); slow += 0.00002 * (r() - slow); x[i] = pink * 0.5 + lp * 6 * (1 + 40 * Math.abs(slow)); } // gusty low rumble over hiss
      else { bp1 += 0.55 * (w - bp1); bp2 += 0.35 * (bp1 - bp2); x[i] = pink * 0.4 + (bp1 - bp2) * 0.8 * (0.6 + 0.4 * Math.sin((2 * Math.PI * 23 * i) / RATE)); } // insects: pulsed band around 4-7 kHz
    }
    return x;
  };
  const windows = async (pcm, target) => {
    const rows = [];
    for (let s = 0; s + RATE <= pcm.length; s += HOP) {
      let w = new Float32Array(W); w.set(pcm.subarray(s, Math.min(pcm.length, s + W)));
      for (let i = 0; i < w.length; i++) { if (w[i] > 1) w[i] = 1; else if (w[i] < -1) w[i] = -1; }
      if (DENOISE) w = window.denoise(w, dnOpts || undefined);
      const top = await sid.analyse(w);
      rows.push(top.filter(([i, c]) => c >= 0.05 || i === target).slice(0, 25).map(([i, c]) => [i, Math.round(c * 1000) / 1000]));
    }
    return rows;
  };
  window.__bench = {
    async species(every) { const sp = await (await fetch(base + 'data/species.json')).json(); return sp.filter((s) => s.group === 'bird' && s.bn && s.bn.ref >= 0.5 && s.sounds.length).filter((_, i) => i % every === 0).map((s) => ({ id: s.id, en: s.en, index: s.bn.index, file: s.sounds[0].file })); },
    async clip(s, snrs, seed) {
      const audio = await new OfflineAudioContext(1, 1, RATE).decodeAudioData(await (await fetch(base + 'data/' + s.file)).arrayBuffer());
      const clip = audio.getChannelData(0).slice(0, RATE * 15);
      const amb = noise('ambient', clip.length, seed);
      const res = {};
      for (const snr of snrs) {
        let mixed = clip;
        if (snr !== 'clean') {
          // the noise keeps a fixed level, the bird is made fainter: what happens when it sings further away
          const g = (rms(amb) * 10 ** (snr / 20)) / rms(clip);
          mixed = new Float32Array(clip.length);
          for (let i = 0; i < clip.length; i++) mixed[i] = clip[i] * g + amb[i];
        }
        res[snr] = await windows(highpass(mixed), s.index);
      }
      return res;
    },
    async noiseOnly(kind, seconds, seed) { return windows(highpass(noise(kind, RATE * seconds, seed)), -1); },
    geo() { const g = sid.geo(); return g ? Array.from(g, (v) => Math.round(v * 1000) / 1000) : null; },
  };
}, [base, DENOISE, dnOpts]);

const species = await page.evaluate((e) => window.__bench.species(e), every);
console.log(species.length, 'species,', SNRS.length, 'conditions each');
const out = { snrs: SNRS, hopSec: 1, species: [], noise: {}, geo: await page.evaluate(() => window.__bench.geo()) };
for (const kind of ['ambient', 'wind', 'insects']) {
  out.noise[kind] = await page.evaluate(([k]) => window.__bench.noiseOnly(k, 100, 4242), [kind]);
  console.log('noise', kind, out.noise[kind].length, 'windows');
}
fs.writeFileSync(outFile, JSON.stringify(out));
let n = 0;
for (const s of species) {
  const res = await page.evaluate(([sp, snrs, seed]) => window.__bench.clip(sp, snrs, seed), [s, SNRS, 1000 + n]);
  out.species.push({ ...s, res });
  n++;
  if (n % 5 === 0) { console.log(`${n}/${species.length}`); fs.writeFileSync(outFile, JSON.stringify(out)); }
}
fs.writeFileSync(outFile, JSON.stringify(out));
console.log('wrote', outFile);
await page.evaluate(() => window.__soundid.setEngine('auto'));
await browser.close();
