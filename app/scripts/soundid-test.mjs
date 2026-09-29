// Sound ID end-to-end test: Chrome plays a WAV file as the microphone, the app listens and lists what it hears.
// Usage: node scripts/soundid-test.mjs <mic.wav> [baseUrl] [seconds] [--gpu]
//   --gpu  use the real graphics card (headed window) instead of the software renderer, to measure real speed
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const gpu = process.argv.includes('--gpu');
const wav = path.resolve(args[0]);
const base = args[1] || 'http://localhost:5180/Pidwa_checklist/';
const seconds = Number(args[2] || 45);
fs.mkdirSync('scripts/shots', { recursive: true });

const browser = await chromium.launch({
  channel: 'chrome', headless: !gpu,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`, '--autoplay-policy=no-user-gesture-required',
    ...(gpu ? [] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])],
});
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, permissions: ['microphone', 'geolocation'], geolocation: { latitude: -24.12, longitude: 30.66 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log(`[console.${m.type()}]`, m.text().slice(0, 300)); });

const t0 = Date.now();
await page.goto(base + '#/listen', { waitUntil: 'load' });
await page.waitForFunction(() => window.__soundid && ['ready', 'error'].includes(window.__soundid.status.value), null, { timeout: 240000 });
const st = await page.evaluate(() => ({ status: window.__soundid.status.value, classes: window.__soundid.classes().length, geo: !!window.__soundid.geo() }));
console.log('model', st, 'after', ((Date.now() - t0) / 1000).toFixed(1), 's');
if (st.status !== 'ready') { console.log(await page.textContent('.lstatus')); await page.screenshot({ path: 'scripts/shots/soundid-error.png' }); await browser.close(); process.exit(1); }
await page.screenshot({ path: 'scripts/shots/soundid-ready.png' });

await page.click('.mic');
for (let s = 0; s < seconds; s += 5) {
  await page.waitForTimeout(5000);
  const d = await page.evaluate(() => ({ st: window.__soundid.status.value, ms: window.__soundid.lastMs.value, dets: window.__soundid.detections.value.filter((d) => d.shown).map((d) => `${d.en} ${Math.round(d.best * 100)}% x${d.count}${d.pidwaId ? '' : ' [off-list]'}`) }));
  console.log(`t=${s + 5}s`, d.st, d.ms + 'ms', '|', d.dets.join(' ; '));
  if (s === 15) await page.screenshot({ path: 'scripts/shots/soundid-listening.png' });
}
await page.screenshot({ path: 'scripts/shots/soundid-end.png' });

// log every detection through the form, then read the journal back
const n = await page.$$eval('.det', (r) => r.length);
for (let i = 0; i < n; i++) {
  await (await page.$$('.det .add'))[i].click();
  await page.waitForSelector('.modal');
  const head = (await page.$eval('.modal .field', (e) => e.textContent)).replace(/\s+/g, ' ').trim();
  const note = await page.$eval('.modal textarea', (e) => e.value);
  if (i === 0) await page.screenshot({ path: 'scripts/shots/soundid-form.png' });
  console.log('form:', head, '| note:', note);
  await page.click('.modal .actions .btn:not(.secondary):not(.danger)');
  await page.waitForSelector('.modal', { state: 'detached' });
}
await page.screenshot({ path: 'scripts/shots/soundid-logged.png' });
await page.evaluate(() => window.__soundid.stop());
await page.goto(base + '#/obs', { waitUntil: 'load' });
await page.waitForTimeout(1000);
console.log('journal:', (await page.$$eval('.obs', (r) => r.map((e) => e.querySelector('.name').textContent.replace(/\s+/g, ' ').trim() + ' / ' + (e.querySelector('.note')?.textContent || '')))).join(' || '));
await page.screenshot({ path: 'scripts/shots/soundid-journal.png' });
await page.goto(base + '#/stats', { waitUntil: 'load' });
await page.waitForTimeout(800);
await page.screenshot({ path: 'scripts/shots/soundid-stats.png', fullPage: true });
await browser.close();
