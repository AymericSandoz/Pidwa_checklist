// Screenshots of the bird "How to recognise it" / "Through the year" sections and of the bird list with migration badges.
// usage: node scripts/birds-shot.mjs <outDir> <ids> [light,dark]   (dev server on port 5180)
import { chromium } from 'playwright-core';
const out = process.argv[2];
const base = 'http://localhost:5180/Pidwa_checklist/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const scheme of (process.argv[4] || 'light,dark').split(',')) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: scheme });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  for (const id of process.argv[3].split(',')) {
    await page.goto(base + '#/species/' + id, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.evaluate(() => document.querySelectorAll('img[loading=lazy]').forEach((i) => (i.loading = 'eager')));
    await page.waitForTimeout(600);
    const top = await page.evaluate(() => { const h = [...document.querySelectorAll('.sec')].find((x) => x.textContent.includes('recognise')); return h ? h.getBoundingClientRect().top + window.scrollY - 6 : -1; });
    if (top < 0) { console.log('no section for', id); continue; }
    const bottom = await page.evaluate(() => { const c = [...document.querySelectorAll('.credit')].find((x) => x.textContent.includes('Sources:')); return c.getBoundingClientRect().bottom + window.scrollY + 10; });
    await page.screenshot({ path: `${out}/${id}-${scheme}.png`, fullPage: true, clip: { x: 0, y: top, width: 412, height: Math.min(bottom - top, 2600) } });
    console.log('shot', id, scheme, Math.round(bottom - top));
  }
  // the bird list, scrolled to show some badges
  await page.goto(base + '#/list', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('tab', 'bird'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.fill('.searchbox input', process.argv[5] || 'er');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/list-${scheme}.png` });
  if (errs.length) console.log('errors:', errs);
  await ctx.close();
}
await browser.close();
