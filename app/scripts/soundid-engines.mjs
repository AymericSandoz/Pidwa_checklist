// Runs the model self-test on both engines (graphics chip, then processor/WebAssembly) and prints speed and scores.
// Usage: node scripts/soundid-engines.mjs [baseUrl]
import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://localhost:5180/Pidwa_checklist/';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log(`[console.${m.type()}]`, m.text().slice(0, 240)); });
await page.goto(base + '#/listen', { waitUntil: 'load' });
const ready = () => page.waitForFunction(() => window.__soundid && ['ready', 'error'].includes(window.__soundid.status.value), null, { timeout: 600000 });
await ready();
for (const pref of ['auto', 'wasm']) {
  await page.evaluate((p) => window.__soundid.setEngine(p), pref);
  await ready();
  const t0 = Date.now();
  await page.evaluate(() => window.__soundid.runSelfTest());
  const r = await page.evaluate(() => ({ status: window.__soundid.status.value, info: window.__soundid.engineInfo.value, test: window.__soundid.selfTest.value, ms: window.__soundid.lastMs.value }));
  console.log(`\n[${pref}] status ${r.status} | engine ${r.info?.engine} verified ${r.info?.verified} checks ${JSON.stringify(r.info?.checks)} shaderError ${r.info?.shaderError} simd ${r.info?.simd}`);
  console.log(`   self-test: ${r.test?.message} | scores ${r.test?.windows.map((w) => Math.round(w.target * 100)).join(', ')} | shader ${r.test?.shader.map((w) => Math.round(w.target * 100)).join(', ')} | last inference ${r.ms} ms | test took ${Date.now() - t0} ms`);
}
await page.evaluate(() => window.__soundid.setEngine('auto'));
await browser.close();
