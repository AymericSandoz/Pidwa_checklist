// Sound ID experiment: how does the model behave in rain, and with a recording played through a phone speaker?
// Mixes synthetic rain noise with our reference clips at several signal-to-noise ratios and prints, for every
// scenario, what the model reports per 3 s window. Used to choose thresholds from evidence.
// Usage: node scripts/soundid-noise.mjs [baseUrl]
import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://localhost:5180/Pidwa_checklist/';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(base + '#/listen', { waitUntil: 'load' });
await page.waitForFunction(() => window.__soundid && ['ready', 'error'].includes(window.__soundid.status.value), null, { timeout: 240000 });

const result = await page.evaluate(async (base) => {
  const RATE = 48000, W = 144000, HOP = 72000;
  const sid = window.__soundid, classes = sid.classes();
  const species = await (await fetch(base + 'data/species.json')).json();
  const byId = Object.fromEntries(species.map((s) => [s.id, s]));
  const load = async (id, n = 1) => (await new OfflineAudioContext(1, 1, RATE).decodeAudioData(await (await fetch(`${base}data/sounds/${id}-${n}.mp3`)).arrayBuffer())).getChannelData(0).slice(0, RATE * 18);
  const rms = (x) => Math.sqrt(x.reduce((a, v) => a + v * v, 0) / x.length);
  // deterministic pseudo random numbers, so runs are comparable
  let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  // rain: broadband hiss (white noise, high-passed around 500 Hz) plus thousands of short drop impulses
  const rain = (n) => {
    const x = new Float32Array(n); let lp = 0;
    for (let i = 0; i < n; i++) { const w = rnd(); lp += 0.06 * (w - lp); x[i] = w - lp; }
    for (let d = 0; d < (n / RATE) * 400; d++) { const p = Math.floor(((rnd() + 1) / 2) * (n - 400)), a = 0.5 + rnd() * 0.5, len = 60 + Math.floor(((rnd() + 1) / 2) * 300); for (let k = 0; k < len; k++) x[p + k] += a * rnd() * Math.exp(-k / (len / 4)); }
    return x;
  };
  // small phone loudspeaker: almost nothing below ~900 Hz (two cascaded one-pole high-pass filters)
  const phoneSpeaker = (x, fc = 900) => {
    const y = new Float32Array(x.length); const a = 1 / (1 + (2 * Math.PI * fc) / RATE);
    let src = x;
    for (let pass = 0; pass < 2; pass++) { let py = 0, px = 0; const out = new Float32Array(x.length); for (let i = 0; i < x.length; i++) { out[i] = a * (py + src[i] - px); py = out[i]; px = src[i]; } src = out; }
    y.set(src); return y;
  };
  const mix = (sig, noise, snrDb) => { const g = rms(sig) / (rms(noise) * 10 ** (snrDb / 20)); const y = new Float32Array(sig.length); for (let i = 0; i < sig.length; i++) y[i] = sig[i] + g * noise[i]; const peak = y.reduce((m, v) => Math.max(m, Math.abs(v)), 0); if (peak > 1) for (let i = 0; i < y.length; i++) y[i] /= peak; return y; };

  const run = async (pcm, targetIndex) => {
    const wins = []; const others = new Map();
    for (let s = 0; s + RATE <= pcm.length; s += HOP) {
      const w = new Float32Array(W); w.set(pcm.subarray(s, Math.min(pcm.length, s + W)));
      const top = await sid.analyse(w);
      let t = 0;
      for (const [i, c] of top) {
        const cls = classes[i]; if (!cls || !cls[0].includes(' ') || cls[0] === cls[1]) continue;
        if (i === targetIndex) { t = c; continue; }
        if (c >= 0.15) { const o = others.get(i) || { name: cls[1], onList: !!cls[3], max: 0, n: 0 }; o.max = Math.max(o.max, c); o.n++; others.set(i, o); }
      }
      wins.push(Math.round(t * 100));
    }
    return { target: wins, others: [...others.values()].sort((a, b) => b.max - a.max).slice(0, 8).map((o) => `${o.name}${o.onList ? '' : '*'} ${Math.round(o.max * 100)}% x${o.n}`) };
  };

  const out = [];
  const noise = rain(RATE * 18);
  out.push(['RAIN ONLY (18 s)', await run(noise.map((v) => v * 0.2), -1)]);
  const quiet = new Float32Array(RATE * 18); for (let i = 0; i < quiet.length; i++) quiet[i] = rnd() * 0.002;
  out.push(['NEAR SILENCE', await run(quiet, -1)]);
  for (const id of ['oriolus-larvatus', 'streptopelia-capicola', 'oriolus-oriolus', 'turtur-chalcospilos']) {
    const sp = byId[id]; const idx = sp.bn ? sp.bn.index : -1;
    const clip = await load(id);
    const n = noise.subarray(0, clip.length);
    out.push([`${sp.en}: clean recording`, await run(clip, idx)]);
    out.push([`${sp.en}: through a phone speaker`, await run(phoneSpeaker(clip), idx)]);
    for (const snr of [10, 3, 0, -5]) out.push([`${sp.en}: rain, SNR ${snr} dB`, await run(mix(clip, n, snr), idx)]);
    out.push([`${sp.en}: phone speaker + rain, SNR 0 dB`, await run(mix(phoneSpeaker(clip), n, 0), idx)]);
  }
  return out;
}, base);

for (const [name, r] of result) {
  console.log('\n' + name);
  if (r.target.some((v) => v > 0) || !/RAIN ONLY|SILENCE/.test(name)) console.log('   target per window (%):', r.target.join(' '));
  console.log('   other species >= 15 % (* = not on checklist):', r.others.length ? r.others.join(' ; ') : 'none');
}
await browser.close();
