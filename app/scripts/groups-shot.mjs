// Screenshots of the snake and plant pages and of the list tabs (dev server on port 5180).
// usage: node scripts/groups-shot.mjs <outDir> <ids> [light,dark]
import { chromium } from 'playwright-core';
const out = process.argv[2];
const base = 'http://localhost:5180/Pidwa_checklist/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const scheme of (process.argv[4] || 'light').split(',')) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true, colorScheme: scheme });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  for (const id of process.argv[3].split(',')) {
    await page.goto(base + '#/species/' + id, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/${id}-${scheme}.png`, fullPage: true });
    console.log('shot', id, scheme);
  }
  for (const g of ['snake', 'plant']) {
    await page.goto(base + '#/list', { waitUntil: 'networkidle' });
    await page.evaluate((g) => localStorage.setItem('tab', g), g);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/list-${g}-${scheme}.png` });
  }
  if (errs.length) console.log('errors:', errs);
  await ctx.close();
}
await browser.close();
