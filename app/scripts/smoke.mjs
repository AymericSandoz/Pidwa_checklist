// Headless smoke test with the locally installed Chrome: opens each view, collects console errors, takes screenshots.
// Usage: node scripts/smoke.mjs [baseUrl]   (default http://localhost:5180/Pidwa_checklist/)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const base = process.argv[2] || 'http://localhost:5180/Pidwa_checklist/';
const outDir = path.resolve('scripts', 'shots');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-GB', geolocation: { latitude: -24.12, longitude: 30.66 }, permissions: ['geolocation'] });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[console.${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 400) logs.push(`[http ${r.status()}] ${r.url()}`); });

async function shot(hash, name, wait = 1500) {
  await page.goto(base + '#/' + hash, { waitUntil: 'networkidle' }).catch((e) => logs.push('[goto] ' + e.message));
  await page.waitForTimeout(wait);
  await page.screenshot({ path: path.join(outDir, name + '.png') });
  console.log('shot', name);
}
await shot('list', '1-list');
await shot('id', '2-guide');
await shot('map', '3-map', 9000);
await shot('settings', '4-settings');
await shot('obs', '5-journal');
// open the first species from the list
await page.goto(base + '#/list', { waitUntil: 'networkidle' });
const firstLink = await page.$('.sp-row a');
if (firstLink) { await firstLink.click(); await page.waitForTimeout(1500); await page.screenshot({ path: path.join(outDir, '6-species.png') }); console.log('shot 6-species'); }

console.log('\n--- console / network problems (' + logs.length + ') ---');
for (const l of [...new Set(logs)].slice(0, 60)) console.log(l);
await browser.close();
