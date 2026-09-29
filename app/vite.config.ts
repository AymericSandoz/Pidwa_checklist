import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';

// Base path: GitHub Pages serves the app under /<repo>/ ; override with VITE_BASE=/ for local preview.
const base = process.env.VITE_BASE ?? '/Pidwa_checklist/';
// GPS, camera and the service worker need a secure context: `npm run dev:https` when testing on the phone over Wi-Fi.
const https = process.env.VITE_HTTPS === '1';

export default defineConfig({
  base,
  plugins: [
    preact(),
    ...(https ? [basicSsl()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Pidwa Checklist',
        short_name: 'Pidwa',
        description: 'Offline checklist of the birds and mammals of Pidwa / Greater Makalali',
        lang: 'en',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1d2b1f',
        theme_color: '#2f4f2f',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell + species data + photos are precached at install (~20 MB).
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,json,woff2,wasm,pcm}'], // wasm + pcm: sound ID engine and its reference sound
        globIgnores: ['**/data/sounds/**', '**/data/map/**', '**/data/birdnet/**'],
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
        navigateFallback: base + 'index.html',
        // Sounds and map are "packs" downloaded on demand from the settings screen into these caches.
        runtimeCaching: [
          { urlPattern: ({ url }) => url.pathname.includes('/data/sounds/'), handler: 'CacheFirst', options: { cacheName: 'pack-sounds', rangeRequests: true } },
          { urlPattern: ({ url }) => url.pathname.includes('/data/birdnet/'), handler: 'CacheFirst', options: { cacheName: 'pack-birdnet' } },
          { urlPattern: ({ url }) => url.pathname.includes('/data/map/'), handler: 'CacheFirst', options: { cacheName: 'pack-sat' } },
        ],
      },
    }),
  ],
  worker: { format: 'es' },
  build: { target: 'es2020', sourcemap: false },
});
