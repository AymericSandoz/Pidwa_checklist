import { chromium } from 'playwright-core';
// Screenshots of the footprint key: start screen, a filtered search, and a duel. Usage: node scripts/guide-shot.mjs <outdir> [light,dark]
const out = process.argv[2];
const base = 'http://localhost:5180/Pidwa_checklist/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const scheme of (process.argv[3] || 'light').split(',')) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: scheme });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(base + '#/id/tracks', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/tg-start-${scheme}.png`, fullPage: true });
  // a civet-sized print with claws: cat-like or dog-like paw, 4 toes, about 5.5 cm
  await page.click('.gtile:has-text("Cat-like")');
  await page.click('.gtile:has-text("Dog-like")');
  await page.click('.chip:has-text("Claw marks")');
  await page.$eval('.tlen input', (el) => { el.value = String(100 * Math.log(5.5 / 1.5) / Math.log(50 / 1.5)); el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/tg-filter-${scheme}.png`, fullPage: true });
  await page.click('.ttile:has-text("civet") .pr');
  await page.click('.ttile:has-text("jackal") .pr');
  await page.waitForTimeout(300);
  const top = await page.evaluate(() => document.querySelector('.idbar').getBoundingClientRect().top + window.scrollY);
  await page.screenshot({ path: `${out}/tg-duel-${scheme}.png`, fullPage: true, clip: { x: 0, y: top, width: 412, height: 1100 } });
  if (errs.length) console.log('errors:', errs);
  await ctx.close();
}
await browser.close();
