// Debug helper: opens the Listen screen on a given site with a fake microphone and reports every error.
// Usage: node scripts/soundid-live-debug.mjs <mic.wav> <baseUrl>
import { chromium } from 'playwright-core';
import path from 'node:path';
const wav = path.resolve(process.argv[2]);
const base = process.argv[3];
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, permissions: ['microphone', 'geolocation'], geolocation: { latitude: -24.12, longitude: 30.66 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log(`[console.${m.type()}]`, m.text().slice(0, 300)); });
page.on('requestfailed', (r) => console.log('[requestfailed]', r.url().replace(base, ''), r.failure()?.errorText));
page.on('response', (r) => { if (r.status() >= 400) console.log('[http ' + r.status() + ']', r.url().replace(base, '')); });
const t0 = Date.now();
await page.goto(base + '#/listen', { waitUntil: 'load' });
await page.waitForFunction(() => window.__soundid && ['ready', 'error'].includes(window.__soundid.status.value), null, { timeout: 600000 });
console.log('status', await page.evaluate(() => ({ s: window.__soundid.status.value, geo: !!window.__soundid.geo() })), 'after', ((Date.now() - t0) / 1000).toFixed(0), 's');
const r = await page.evaluate(async () => { try { await window.__soundid.start(); return 'started'; } catch (e) { return 'start failed: ' + (e && (e.name + ' ' + e.message)); } });
console.log(r, '| status', await page.evaluate(() => window.__soundid.status.value), '| panel:', (await page.textContent('.lstatus')).replace(/\s+/g, ' ').trim());
await page.waitForTimeout(20000);
console.log('detections:', (await page.evaluate(() => window.__soundid.detections.value.map((d) => `${d.en} ${Math.round(d.best * 100)}%`))).join(' ; '));
await browser.close();
