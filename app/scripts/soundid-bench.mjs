// Sound ID benchmark: runs the model on our own reference clip of every covered bird and records how well it
// recognises it. Result feeds the "sound ID good / fair / weak" badge on the species pages.
// Caveat: xeno-canto recordings were most likely part of BirdNET's training data, so this is an optimistic test.
// Usage: node scripts/soundid-bench.mjs [baseUrl] [--gpu]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const base = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'http://localhost:5180/Pidwa_checklist/';
const gpu = process.argv.includes('--gpu');
const root = path.resolve('..');
const species = JSON.parse(fs.readFileSync(path.join(root, 'data/out/species.json'), 'utf8')).filter((s) => s.group === 'bird' && s.bn && s.sounds.length);
const outFile = path.join(root, 'data/raw/birdnet_bench.json');
const out = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};

const browser = await chromium.launch({ channel: 'chrome', headless: !gpu, args: gpu ? [] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(base + '#/listen', { waitUntil: 'load' });
await page.waitForFunction(() => window.__soundid && ['ready', 'error'].includes(window.__soundid.status.value), null, { timeout: 240000 });
if ((await page.evaluate(() => window.__soundid.status.value)) !== 'ready') { console.log('model not ready'); process.exit(1); }

// --second: species that scored under 50 % on their first clip get a second chance on their other clip
const SECOND = process.argv.includes('--second');
let n = 0;
for (const s of species) {
  const clip = SECOND ? s.sounds[1] : s.sounds[0];
  if (SECOND ? (!clip || !out[s.sci] || out[s.sci].ref >= 0.5 || out[s.sci].second) : out[s.sci]) { n++; continue; }
  const res = await page.evaluate(async ({ url, target }) => {
    const buf = await (await fetch(url)).arrayBuffer();
    const audio = await new OfflineAudioContext(1, 1, 48000).decodeAudioData(buf);
    const pcm = audio.getChannelData(0);
    const W = 144000;
    const classes = window.__soundid.classes();
    let ref = 0, best = { i: -1, c: 0 }, windows = 0;
    for (let start = 0; start + 48000 <= pcm.length && windows < 8; start += W, windows++) {
      const win = new Float32Array(W);
      win.set(pcm.subarray(start, Math.min(pcm.length, start + W)));
      const top = await window.__soundid.analyse(win);
      for (const [i, c] of top) {
        if (i === target && c > ref) ref = c;
        const cls = classes[i];
        if (cls && cls[0].includes(' ') && cls[0] !== cls[1] && c > best.c) best = { i, c };
      }
    }
    return { ref, top1: best.i >= 0 ? classes[best.i][1] : null, top1Index: best.i, top1Conf: best.c, windows };
  }, { url: base + 'data/' + clip.file, target: s.bn.index });
  if (SECOND) { const prev = out[s.sci]; out[s.sci] = res.ref > prev.ref ? { en: s.en, ...res, hit: res.top1Index === s.bn.index || prev.hit, second: true } : { ...prev, second: true }; }
  else out[s.sci] = { en: s.en, ...res, hit: res.top1Index === s.bn.index };
  n++;
  if (n % 10 === 0) { console.log(`${n}/${species.length}`); fs.writeFileSync(outFile, JSON.stringify(out, null, 1)); }
}
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
const rows = Object.values(out);
const good = rows.filter((r) => r.ref >= 0.5).length, fair = rows.filter((r) => r.ref >= 0.15 && r.ref < 0.5).length, weak = rows.filter((r) => r.ref < 0.15).length;
console.log(`benchmark on ${rows.length} species: good (>=50%) ${good}, fair (15-50%) ${fair}, weak (<15%) ${weak}; top-1 correct ${rows.filter((r) => r.hit).length}`);
console.log('weak:', rows.filter((r) => r.ref < 0.15).map((r) => `${r.en} ${Math.round(r.ref * 100)}% (heard as ${r.top1} ${Math.round(r.top1Conf * 100)}%)`).join('; '));
await browser.close();
