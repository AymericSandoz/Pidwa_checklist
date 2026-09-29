// Experiment: does low-frequency energy (wind, handling, rain thumps, DC offset) blind the model,
// and does a 200 Hz high-pass filter (as in BirdNET Live) restore it?
// Usage: node scripts/soundid-rumble.mjs [baseUrl]
import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://localhost:5180/Pidwa_checklist/';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.goto(base + '#/listen', { waitUntil: 'load' });
await page.waitForFunction(() => window.__soundid && ['ready', 'error'].includes(window.__soundid.status.value), null, { timeout: 240000 });
const out = await page.evaluate(async (base) => {
  const RATE = 48000, W = 144000, HOP = 72000;
  const sid = window.__soundid;
  const species = await (await fetch(base + 'data/species.json')).json();
  const byId = Object.fromEntries(species.map((s) => [s.id, s]));
  let seed = 4242; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  const load = async (id) => (await new OfflineAudioContext(1, 1, RATE).decodeAudioData(await (await fetch(`${base}data/sounds/${id}-1.mp3`)).arrayBuffer())).getChannelData(0).slice(0, RATE * 12);
  const peak = (x) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  // rumble: noise low-passed twice around 60 Hz, scaled to `ratio` times the peak of the recording
  const rumble = (n) => { const x = new Float32Array(n); let a = 0, b = 0; for (let i = 0; i < n; i++) { a += 0.008 * (rnd() - a); b += 0.008 * (a - b); x[i] = b; } const p = peak(x); for (let i = 0; i < n; i++) x[i] /= p; return x; };
  const add = (sig, other, ratio) => { const p = peak(sig); const y = new Float32Array(sig.length); for (let i = 0; i < sig.length; i++) y[i] = sig[i] + other[i] * p * ratio; return y; };
  // Butterworth high-pass, 2nd order, same as a BiquadFilterNode with Q = 0.707
  const highpass = (x, fc) => { const w = (2 * Math.PI * fc) / RATE, cs = Math.cos(w), al = Math.sin(w) / (2 * 0.7071); const b0 = (1 + cs) / 2, b1 = -(1 + cs), b2 = (1 + cs) / 2, a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al; const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; };
  const run = async (pcm, idx) => { const r = []; for (let s = 0; s + RATE <= pcm.length; s += HOP) { const w = new Float32Array(W); w.set(pcm.subarray(s, Math.min(pcm.length, s + W))); const top = await sid.analyse(w); const t = top.find(([i]) => i === idx); r.push(Math.round((t ? t[1] : 0) * 100)); } return r.join(' '); };
  const res = [];
  for (const id of ['oriolus-larvatus', 'oriolus-oriolus', 'streptopelia-capicola']) {
    const sp = byId[id], idx = sp.bn.index, clip = await load(id), rb = rumble(clip.length);
    const dc = new Float32Array(clip.length).fill(1);
    res.push([sp.en, [
      ['clean', await run(clip, idx)],
      ['clean + high-pass 200 Hz', await run(highpass(clip, 200), idx)],
      ['rumble x3', await run(add(clip, rb, 3), idx)],
      ['rumble x3 + high-pass', await run(highpass(add(clip, rb, 3), 200), idx)],
      ['rumble x10', await run(add(clip, rb, 10), idx)],
      ['rumble x10 + high-pass', await run(highpass(add(clip, rb, 10), 200), idx)],
      ['rumble x30', await run(add(clip, rb, 30), idx)],
      ['rumble x30 + high-pass', await run(highpass(add(clip, rb, 30), 200), idx)],
      ['DC offset x2', await run(add(clip, dc, 2), idx)],
      ['DC offset x2 + high-pass', await run(highpass(add(clip, dc, 2), 200), idx)],
    ]]);
  }
  return res;
}, base);
for (const [name, rows] of out) { console.log('\n' + name + '  (target score per window, %)'); for (const [k, v] of rows) console.log('   ' + k.padEnd(28) + v); }
await browser.close();
