// Headless walk through the quiz: hub card, quiz home, a round with a typed answer, the "I knew it" button,
// the round summary, and the photo gallery on a species page. Screenshots in scripts/shots/quiz-*.png.
// Usage: node scripts/quiz-test.mjs [baseUrl]   (default http://localhost:5180/Pidwa_checklist/)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const base = process.argv[2] || 'http://localhost:5180/Pidwa_checklist/';
const outDir = path.resolve('scripts', 'shots');
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-GB' });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[console.${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('response', (r) => { if (r.status() >= 400) logs.push(`[http ${r.status()}] ${r.url()}`); });
const shot = async (name, wait = 800) => { await page.waitForTimeout(wait); await page.screenshot({ path: path.join(outDir, 'quiz-' + name + '.png') }); console.log('shot', name); };

await page.goto(base + '#/learn', { waitUntil: 'networkidle' });
await shot('1-hub');
await page.click('a.chap.quiz');
await shot('2-home');
// nothing seen yet: the whole checklist, mammals only
await page.click('text=Whole checklist');
await page.click('.seg >> text=Mammals');
await shot('3-home-all');
await page.click('button:has-text("Start")');
await shot('4-card', 1200);
// read the answer from the page state: the species id is not shown, so type a wrong word first
await page.fill('.qask input', 'girafe');
await page.click('.qask button');
await shot('5-answer');
const names = await page.$$eval('.qres .who', (els) => els.map((e) => e.textContent));
console.log('revealed:', names);
await page.click('.qres button.btn:not(.secondary)');
// second card: the shortcut button
await page.click('button:has-text("I knew it")');
await shot('6-knew');
await page.click('.qres button.btn:not(.secondary)');
// third card: a hint, then the right answer typed with a typo
await page.click('button:has-text("Hint")');
await page.click('button:has-text("Hint")');
await shot('7-hints');
await page.click('button:has-text("I didn\'t")');
await page.click('.qres button.btn:not(.secondary)');
// stop the round
await page.click('.qtop .bk');
await shot('8-home-after');
// species page with extra photos
await page.goto(base + '#/species/orycteropus-afer', { waitUntil: 'networkidle' });
await shot('9-species', 1500);
const gal = await page.$$eval('.gallery img', (els) => els.map((e) => [e.getAttribute('src'), e.naturalWidth]));
console.log('gallery:', gal);
if (gal.length) { await page.click('.gallery button'); await shot('10-lightbox'); }

console.log('\n--- problems (' + logs.length + ') ---');
for (const l of [...new Set(logs)].slice(0, 40)) console.log(l);
await browser.close();
