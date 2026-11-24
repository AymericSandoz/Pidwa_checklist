/* Is the app itself saved on the phone, so that it opens without network?
 * The service worker keeps the app (~10 MB) in its precache; without an active one, Chrome shows "You are offline".
 * Its install is all-or-nothing: one failed file, or too little space for Chrome, and nothing is kept. Shown in Settings,
 * and as a banner while there is network, so that it is seen before going into the field. */
import { signal } from '@preact/signals';

export type OfflineState = {
  /** 'ready' | 'installing' | 'failed' | 'none' | 'unsupported' */
  state: string;
  controlled: boolean;
  files: number;
  usage: number | null;
  quota: number | null;
  error: string | null;
};
export const offlineApp = signal<OfflineState>({ state: 'none', controlled: false, files: 0, usage: null, quota: null, error: null });

let reg: ServiceWorkerRegistration | undefined;
let failed: string | null = null;

/** Follow a worker being installed: 'redundant' without becoming active means the install failed. */
function watch(w: ServiceWorker | null) {
  if (!w) return;
  w.addEventListener('statechange', () => {
    if (w.state === 'redundant' && reg?.active !== w) failed = 'Chrome could not save the app on this phone (a file failed, or not enough space).';
    if (w.state === 'activated') failed = null;
    checkOffline();
  });
}

export function onRegistered(r: ServiceWorkerRegistration | undefined) {
  reg = r;
  if (!r) return checkOffline();
  watch(r.installing);
  r.addEventListener('updatefound', () => { watch(r.installing); checkOffline(); });
  checkOffline();
}
export function onRegisterError(e: any) {
  failed = 'Service worker refused: ' + (e?.message || e);
  checkOffline();
}

export async function checkOffline() {
  if (!('serviceWorker' in navigator)) { offlineApp.value = { ...offlineApp.value, state: 'unsupported' }; return; }
  reg ||= await navigator.serviceWorker.getRegistration();
  let files = 0;
  try { for (const n of await caches.keys()) if (n.includes('precache')) files += (await (await caches.open(n)).keys()).length; } catch {}
  let usage: number | null = null, quota: number | null = null;
  try { const e = await navigator.storage.estimate(); usage = e.usage ?? null; quota = e.quota ?? null; } catch {}
  const controlled = !!navigator.serviceWorker.controller;
  const state = reg?.active && files > 0 ? 'ready' : reg?.installing || reg?.waiting ? 'installing' : reg || failed ? 'failed' : 'none';
  const error = failed || (state === 'failed' ? 'The app is registered but not saved (its install did not finish).' : null);
  offlineApp.value = { state, controlled, files, usage, quota, error };
}

// the page is opened before the service worker takes it: once it does, refresh the state
navigator.serviceWorker?.addEventListener('controllerchange', () => checkOffline());
