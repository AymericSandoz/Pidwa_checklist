// Offline test of sound ID against `vite preview` (service worker active):
// download the Sound ID pack from Settings, cut the network, then listen with a fake microphone.
// Usage: node scripts/offline-soundid.mjs <mic.wav> [baseUrl]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const wav = path.resolve(process.argv[2]);
const base = process.argv[3] || 'http://localhost:5181/Pidwa_checklist/';
fs.mkdirSync('scripts/shots', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, permissions: ['microphone'] });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

await page.goto(base + '#/list', { waitUntil: 'networkidle' });
console.log('service worker:', await page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state));
await page.waitForFunction(async () => { for (const n of await caches.keys()) if (n.includes('precache') && (await (await caches.open(n)).keys()).length > 250) return true; return false; }, null, { timeout: 180000 });

await page.goto(base + '#/settings', { waitUntil: 'networkidle' });
await page.waitForSelector('.pack');
for (const p of await page.$$('.pack')) {
  const label = await p.$eval('b', (b) => b.textContent);
  if (/sound id/i.test(label)) {
    console.log('pack:', (await p.textContent()).replace(/\s+/g, ' ').trim());
    await (await p.$('button')).click();
    await page.waitForFunction((el) => /✓/.test(el.textContent), p, { timeout: 300000 });
    console.log('pack after download:', (await p.textContent()).replace(/\s+/g, ' ').trim());
  }
}
console.log('caches:', JSON.stringify(await page.evaluate(async () => { const o = {}; for (const n of await caches.keys()) o[n] = (await (await caches.open(n)).keys()).length; return o; })));

await ctx.setOffline(true);
console.log('--- network cut ---');
await page.goto(base + '#/listen', { waitUntil: 'load' });
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => window.__soundid && ['ready', 'error'].includes(window.__soundid.status.value), null, { timeout: 240000 });
console.log('OFFLINE model status:', await page.evaluate(() => window.__soundid.status.value), '|', (await page.textContent('.lstatus')).replace(/\s+/g, ' ').trim());
if (await page.evaluate(() => window.__soundid.status.value) === 'ready') {
  await page.click('.mic');
  await page.waitForTimeout(25000);
  console.log('OFFLINE detections:', (await page.evaluate(() => window.__soundid.detections.value.filter((d) => d.shown).map((d) => `${d.en} ${Math.round(d.best * 100)}% x${d.count}`))).join(' ; '));
}
await page.screenshot({ path: 'scripts/shots/soundid-offline.png' });
await browser.close();
