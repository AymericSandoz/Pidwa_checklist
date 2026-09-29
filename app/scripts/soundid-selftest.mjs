// Runs the in-app model self-test (reference recording, no microphone) and prints its result.
// Usage: node scripts/soundid-selftest.mjs [baseUrl]
import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://localhost:5180/Pidwa_checklist/';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 200)); });
await page.goto(base + '#/listen', { waitUntil: 'load' });
await page.waitForFunction(() => window.__soundid && ['ready', 'error'].includes(window.__soundid.status.value), null, { timeout: 600000 });
console.log('status', await page.evaluate(() => window.__soundid.status.value), '| engine', JSON.stringify(await page.evaluate(() => window.__soundid.engineInfo.value)));
await page.evaluate(() => window.__soundid.runSelfTest());
console.log(JSON.stringify(await page.evaluate(() => window.__soundid.selfTest.value)));
await browser.close();
