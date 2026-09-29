// Field-like test: Chrome plays a rain + birds recording as the microphone; prints, every 5 s, what the app
// shows and what the model said on the last window. Usage: node scripts/soundid-field.mjs <mic.wav> [baseUrl] [seconds] [sensitivity]
import { chromium } from 'playwright-core';
import path from 'node:path';
const wav = path.resolve(process.argv[2]);
const base = process.argv[3] || 'http://localhost:5180/Pidwa_checklist/';
const seconds = Number(process.argv[4] || 70);
const sens = process.argv[5] || 'normal';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}%noloop`, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, permissions: ['microphone', 'geolocation'], geolocation: { latitude: -24.12, longitude: 30.66 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(base + '#/listen', { waitUntil: 'load' });
await page.waitForFunction(() => window.__soundid && ['ready', 'error'].includes(window.__soundid.status.value), null, { timeout: 240000 });
await page.evaluate((s) => window.__soundid.setSensitivity(s), sens);
await page.click('.mic');
for (let s = 5; s <= seconds; s += 5) {
  await page.waitForTimeout(5000);
  const d = await page.evaluate(() => { const x = window.__soundid; return { n: x.windows.value, ms: x.lastMs.value, noise: x.noise.value, shown: x.detections.value.filter((d) => d.shown).map((d) => `${d.en} ${Math.round(d.best * 100)}% x${d.count}${d.pidwaId ? '' : ' [off-list]'}`), pending: x.detections.value.filter((d) => !d.shown).map((d) => `${d.en} ${Math.round(d.best * 100)}%`), raw: x.lastTop.value.slice(0, 3).map((t) => `${t.name} ${Math.round(t.conf * 100)}%${t.kind === 'impossible' ? '!' : ''}`) }; });
  console.log(`t=${String(s).padStart(2)}s n=${d.n} ${d.ms}ms noise=${d.noise.padEnd(5)} SHOWN: ${d.shown.join(' ; ') || '-'}  | waiting: ${d.pending.join(' ; ') || '-'}  | raw: ${d.raw.join(', ')}`);
}
console.log('mic:', JSON.stringify(await page.evaluate(() => window.__soundid.mic.value)));
await page.screenshot({ path: 'scripts/shots/soundid-field.png', fullPage: true });
await browser.close();
