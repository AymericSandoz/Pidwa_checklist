import { chromium } from 'playwright-core';
// Screenshots of the sound quiz and the "Most heard" sort; checks the default sort and that a recording plays.
// Usage: node scripts/soundquiz-shot.mjs <outdir>
const out = process.argv[2];
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
const base = 'http://localhost:5180/Pidwa_checklist/#/';
await page.goto(base + 'list', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const names = () => page.$$eval('.sp-row .fr', (e) => e.slice(0, 4).map((x) => x.textContent));
const label = () => page.textContent('.sortbtn');
console.log('default:', await label(), await names());
await page.screenshot({ path: `${out}/s-list-rare.png` });
await page.click('.sortbtn');
console.log('then:', await label(), await names(), await page.$$eval('.sp-row .en', (e) => e.slice(0, 2).map((x) => x.textContent)));
await page.screenshot({ path: `${out}/s-list-hear.png` });
await page.goto(base + 'learn/soundquiz', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/s-home.png`, fullPage: true });
console.log('levels:', await page.$$eval('.slevel .lhead', (e) => e.map((x) => x.textContent)));
await page.click('.slevel');
await page.waitForTimeout(2000);
console.log('audio:', await page.$eval('audio', (a) => ({ src: a.src.split('/').pop(), paused: a.paused, t: a.currentTime, err: a.error?.code })));
await page.screenshot({ path: `${out}/s-q.png`, fullPage: true });
for (let k = 0; k < 3; k++) { await page.click('.qbtns .btn:not([disabled])'); await page.waitForTimeout(100); }
await page.screenshot({ path: `${out}/s-hints.png`, fullPage: true });
await (await page.$$('.qopt:not([disabled])'))[0].click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/s-a.png`, fullPage: true });
console.log('errors:', errs);
await browser.close();
