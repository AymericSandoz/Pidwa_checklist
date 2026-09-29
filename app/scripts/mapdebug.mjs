// Opens the map view headless, optionally jumps to a place, and reports what MapLibre actually did.
// Usage: node scripts/mapdebug.mjs [baseUrl] [lon lat zoom] [shotName]
import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://localhost:5180/Pidwa_checklist/?debug';
const lon = Number(process.argv[3]), lat = Number(process.argv[4]), zoom = Number(process.argv[5]);
const shot = process.argv[6] || 'map-debug';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
const reqs = [];
page.on('request', (r) => { if (r.url().includes('/data/map/')) reqs.push(r.url().replace(/^.*\/data\/map\//, '')); });
page.on('console', (m) => { if (m.type() === 'error') console.log(`[console.${m.type()}]`, m.text().slice(0, 300)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(base + '#/map', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__map && window.__map.loaded(), null, { timeout: 30000 }).catch(() => console.log('map did not load in 30 s'));
if (!Number.isNaN(lon) && !Number.isNaN(lat)) {
  await page.evaluate(([lon, lat, zoom]) => window.__map.jumpTo({ center: [lon, lat], zoom }), [lon, lat, zoom || 14]);
  await page.waitForTimeout(6000);
  // draw a crosshair at the requested point so the alignment can be judged on the screenshot
  await page.evaluate(([lon, lat]) => { const p = window.__map.project([lon, lat]); const d = document.createElement('div'); d.style.cssText = `position:absolute;left:${p.x - 12}px;top:${p.y - 12}px;width:24px;height:24px;border:3px solid red;border-radius:50%;z-index:9;pointer-events:none`; document.querySelector('.mapwrap').appendChild(d); }, [lon, lat]);
} else {
  await page.waitForTimeout(6000);
}
const info = await page.evaluate(() => {
  const m = window.__map;
  const canvas = document.querySelector('canvas.maplibregl-canvas');
  return { loaded: m?.loaded?.(), tilesLoaded: m?.areTilesLoaded?.(), zoom: m?.getZoom?.(), center: m?.getCenter?.(), canvas: canvas ? { w: canvas.width, h: canvas.height } : null, ctrls: document.querySelectorAll('.maplibregl-ctrl').length, features: m ? m.queryRenderedFeatures().length : null, satVisible: m?.getLayer?.('sat') ? m.getLayoutProperty('sat', 'visibility') : 'no sat layer' };
});
console.log(JSON.stringify(info));
console.log('map requests:', reqs.length, reqs.filter((r) => r.includes('tiles/') || r.includes('sat/')).slice(0, 6));
await page.screenshot({ path: `scripts/shots/${shot}.png` });
await browser.close();
