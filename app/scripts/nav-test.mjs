// Regression test for the blank screen when coming back to a lazily loaded view (Map, Listen).
// Visits every view twice through the bottom navigation and fails if a view renders nothing or throws.
// Usage: node scripts/nav-test.mjs [baseUrl]
import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://localhost:5180/Pidwa_checklist/';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 412, height: 915 }, permissions: ['microphone', 'geolocation'], geolocation: { latitude: -24.12, longitude: 30.66 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });

await page.goto(base + '#/list', { waitUntil: 'load' });
await page.waitForSelector('.sp-row');
const order = ['map', 'list', 'listen', 'map', 'id', 'listen', 'stats', 'map', 'obs', 'listen', 'list'];
let failed = 0;
for (const view of order) {
  await page.click(`nav.bottom a[href="#/${view}"]`);
  await page.waitForTimeout(view === 'map' || view === 'listen' ? 2500 : 700);
  const state = await page.evaluate(() => {
    const main = document.querySelector('main.main');
    return { nav: !!document.querySelector('nav.bottom'), children: main ? main.children.length : -1, text: main ? main.innerText.trim().length : -1, canvas: !!document.querySelector('main canvas') };
  });
  const ok = state.nav && state.children > 0 && (state.text > 0 || state.canvas);
  if (!ok) failed++;
  console.log((ok ? 'ok  ' : 'FAIL') + ' ' + view.padEnd(7), JSON.stringify(state));
}
console.log(errors.length ? 'errors:\n  ' + [...new Set(errors)].join('\n  ') : 'no page errors');
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
