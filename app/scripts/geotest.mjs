// Feeds the browser a known position and checks where the app puts it: map geolocate control + observation form.
import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://localhost:5180/Pidwa_checklist/?debug';
const POS = { latitude: -24.1236, longitude: 30.6575, accuracy: 8 }; // centre of Greater Makalali (Nominatim)
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, geolocation: POS, permissions: ['geolocation'] });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

// 1. map: click the geolocate control, read where the map centres
await page.goto(base + '#/map', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__map && window.__map.loaded(), null, { timeout: 30000 });
await page.click('.maplibregl-ctrl-geolocate');
await page.waitForTimeout(4000);
const c = await page.evaluate(() => { const m = window.__map; const c = m.getCenter(); const dot = document.querySelector('.maplibregl-user-location-dot'); return { center: [c.lng, c.lat], zoom: m.getZoom(), dot: !!dot, outsideBanner: !!document.querySelector('.mapnote') }; });
const dKm = Math.hypot((c.center[0] - POS.longitude) * 111 * Math.cos((POS.latitude * Math.PI) / 180), (c.center[1] - POS.latitude) * 111);
console.log('MAP geolocate -> center', c.center.map((v) => v.toFixed(5)), 'zoom', c.zoom.toFixed(1), 'dot', c.dot, 'outside banner', c.outsideBanner, '| distance from injected position:', dKm.toFixed(3), 'km');
await page.screenshot({ path: 'scripts/shots/geo-map.png' });

// 2. observation form: open a species, press Observe, read the GPS line
await page.goto(base + '#/species/dicrurus-adsimilis', { waitUntil: 'networkidle' });
await page.click('.fab');
await page.waitForTimeout(3000);
const gps = await page.$eval('.gps', (el) => el.textContent.replace(/\s+/g, ' ').trim());
console.log('FORM gps line:', gps);
await page.screenshot({ path: 'scripts/shots/geo-form.png' });
await browser.close();
