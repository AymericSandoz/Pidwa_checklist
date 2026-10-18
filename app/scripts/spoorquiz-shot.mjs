import { chromium } from 'playwright-core';
// Screenshots of the spoor quiz: a question, all the hints, then the answer card after a wrong pick.
// Usage: node scripts/spoorquiz-shot.mjs <outdir> [track|scat]
const out = process.argv[2], kind = process.argv[3] || 'track';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto('http://localhost:5180/Pidwa_checklist/#/learn/spoorquiz', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.click(`.seg button:has-text("${kind === 'track' ? 'Tracks' : 'Dung'}")`);
await page.screenshot({ path: `${out}/sq-home.png` });
await page.click('button:has-text("Start")');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/sq-${kind}-q.png`, fullPage: true });
for (let k = 0; k < 4; k++) { const b = await page.$('.qbtns .btn:not([disabled])'); if (b) await b.click(); await page.waitForTimeout(150); }
await page.screenshot({ path: `${out}/sq-${kind}-hints.png`, fullPage: true });
// pick a wrong name that is still clickable
const answer = await page.evaluate(() => document.querySelector('.qres') ? null : 1);
const opts = await page.$$('.qopt:not([disabled])');
for (const o of opts) { await o.click(); break; }
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/sq-${kind}-a.png`, fullPage: true });
if (errs.length) console.log('errors:', errs);
await browser.close();
