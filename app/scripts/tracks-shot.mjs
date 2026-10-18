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
  for (const id of (process.argv[3] || 'giraffa-giraffa,crocuta-crocuta').split(',')) {
    await page.goto(base + '#/species/' + id, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const sec = await page.$('.spoorcard');
    if (!sec) { console.log('no section for', id); continue; }
    await sec.scrollIntoViewIfNeeded();
    // clip from the section heading down to the credit line
    const top = await page.evaluate(() => { const h = [...document.querySelectorAll('.sec')].find((x) => x.textContent.includes('Tracks')); return h.getBoundingClientRect().top + window.scrollY - 6; });
    const bottom = await page.evaluate(() => { const c = [...document.querySelectorAll('.credit')].find((x) => x.textContent.includes('Gutteridge')); return (c ? c.getBoundingClientRect().bottom + window.scrollY : 0) + 10; });
    await page.screenshot({ path: `${out}/${id}-${scheme}.png`, fullPage: true, clip: { x: 0, y: top, width: 412, height: Math.min(bottom - top, 2400) } });
    console.log('shot', id, scheme, Math.round(bottom - top));
  }
  if (errs.length) console.log('errors:', errs);
  await ctx.close();
}
await browser.close();
