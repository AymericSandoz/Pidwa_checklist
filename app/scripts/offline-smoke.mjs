// Production/offline smoke test against `vite preview` (service worker active):
//  1. load the app online, wait for the service worker, download the map pack from Settings
//  2. switch the browser to offline, reload, check the list and the map still work
// Usage: node scripts/offline-smoke.mjs [baseUrl]   (default http://localhost:5181/Pidwa_checklist/)
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const base = process.argv[2] || 'http://localhost:5181/Pidwa_checklist/';
fs.mkdirSync('scripts/shots', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const problems = [];
page.on('pageerror', (e) => problems.push('[pageerror] ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') problems.push('[console.error] ' + m.text().slice(0, 200)); });

await page.goto(base + '?debug#/list', { waitUntil: 'networkidle' });
const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return r.active?.state; });
console.log('service worker:', sw);
// wait until the precache has finished (species.json + images): poll the cache storage
await page.waitForFunction(async () => { const names = await caches.keys(); for (const n of names) { if (n.includes('precache')) { const c = await caches.open(n); if ((await c.keys()).length > 250) return true; } } return false; }, null, { timeout: 120000 }).catch(() => console.log('precache not complete after 120 s'));
const precache = await page.evaluate(async () => { const out = {}; for (const n of await caches.keys()) out[n] = (await (await caches.open(n)).keys()).length; return out; });
console.log('caches after load:', JSON.stringify(precache));

// download the map pack from settings
await page.goto(base + '?debug#/settings', { waitUntil: 'networkidle' });
await page.waitForSelector('.pack');
const packs = await page.$$('.pack');
for (const p of packs) {
  const label = await p.$eval('b', (b) => b.textContent);
  if (/map/i.test(label) && !/satellite/i.test(label)) {
    const btn = await p.$('button');
    console.log('map pack button:', await btn.textContent());
    await btn.click();
    await page.waitForFunction((el) => /✓/.test(el.textContent), p, { timeout: 180000 }).catch(() => console.log('map pack download did not complete in 3 min'));
    console.log('map pack now:', (await p.textContent()).replace(/\s+/g, ' ').trim());
  }
}
const caches2 = await page.evaluate(async () => { const out = {}; for (const n of await caches.keys()) out[n] = (await (await caches.open(n)).keys()).length; return out; });
console.log('caches after pack download:', JSON.stringify(caches2));

// go offline and reload
await ctx.setOffline(true);
await page.goto(base + '?debug#/list', { waitUntil: 'load' }).catch((e) => problems.push('[offline goto] ' + e.message));
await page.waitForTimeout(2000);
const rows = await page.$$eval('.sp-row', (r) => r.length);
const imgOk = await page.$eval('.sp-row img', (i) => i.complete && i.naturalWidth > 0).catch(() => false);
console.log('OFFLINE list rows:', rows, '| first thumbnail loaded:', imgOk);
await page.screenshot({ path: 'scripts/shots/offline-list.png' });
await page.goto(base + '?debug#/map', { waitUntil: 'load' }).catch((e) => problems.push('[offline map goto] ' + e.message));
await page.waitForTimeout(8000);
const mapInfo = await page.evaluate(() => { const m = window.__map; return m ? { loaded: m.loaded(), tiles: m.areTilesLoaded(), features: m.queryRenderedFeatures().length } : { msg: document.querySelector('.mapmsg')?.textContent }; });
console.log('OFFLINE map:', JSON.stringify(mapInfo));
await page.screenshot({ path: 'scripts/shots/offline-map.png' });
await page.goto(base + '?debug#/species/dicrurus-adsimilis', { waitUntil: 'load' }).catch(() => {});
await page.waitForTimeout(1500);
await page.screenshot({ path: 'scripts/shots/offline-species.png' });
console.log('problems:', problems.length ? problems.slice(0, 15) : 'none');
await browser.close();
