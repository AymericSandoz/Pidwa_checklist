import { signal, computed } from '@preact/signals';
import { dataUrl } from './data';
import type { Packs } from './types';

// Offline packs (sounds, satellite map, Sound ID model, extra photos, track photos), downloaded into Cache Storage.
// Module-level so a download keeps going while the user moves between screens.

export interface PackState { total: number; cached: number; bytes: number; busy: boolean; error?: string }

export const PACK_LABEL: Record<string, string> = { sounds: 'Bird sounds (xeno-canto)', sat: 'Reserve map (satellite, Sentinel-2)', birdnet: 'Sound ID model (BirdNET)', photos: 'More photos per species (iNaturalist), for the quiz', signs: 'Track and dung photos (iNaturalist)' };
export const PACK_SHORT: Record<string, string> = { sounds: 'bird sounds', sat: 'map', birdnet: 'Sound ID', photos: 'quiz photos', signs: 'track photos' };
// smallest and most used first, the 60 MB model last
const ORDER = ['sat', 'sounds', 'signs', 'photos', 'birdnet'];
const cacheName = (p: string) => 'pack-' + p;

export const packs = signal<Packs | null>(null);
export const packState = signal<Record<string, PackState>>({});
export const packsError = signal('');
/** Download every pack by itself when the phone is on Wi-Fi. On by default. */
export const autoPacks = signal(read('autoPacks') !== 'off');
const aborts: Record<string, AbortController> = {};
let runningAll = false;

function read(k: string) { try { return localStorage.getItem(k); } catch { return null; } }
export function setAutoPacks(on: boolean) {
  autoPacks.value = on;
  try { localStorage.setItem('autoPacks', on ? 'on' : 'off'); } catch {}
  if (on) maybeAuto();
}

const isComplete = (s?: PackState) => !!s && s.total > 0 && s.cached >= s.total;
/** Packs not fully on the phone, and how much is left to fetch. */
export const missing = computed(() => {
  const st = packState.value;
  const keys = Object.keys(st).filter((k) => !isComplete(st[k]));
  const left = keys.reduce((a, k) => a + st[k].bytes * (1 - st[k].cached / Math.max(1, st[k].total)), 0);
  const total = Object.values(st).reduce((a, s) => a + s.bytes, 0);
  return { keys, left, total, busy: keys.some((k) => st[k].busy), failed: keys.some((k) => !!st[k].error) };
});

const patch = (k: string, p: Partial<PackState>) => { packState.value = { ...packState.value, [k]: { ...packState.value[k], ...p } }; };

export async function refreshPacks() {
  const p = packs.value; if (!p) return;
  const next: Record<string, PackState> = {};
  for (const [k, v] of Object.entries(p)) {
    let cached = 0;
    try { cached = (await (await caches.open(cacheName(k))).keys()).length; } catch {}
    const prev = packState.value[k];
    next[k] = { total: v.files.length, cached: Math.min(cached, v.files.length), bytes: v.bytes, busy: prev?.busy || false, error: prev?.error };
  }
  packState.value = next;
}

export async function loadPacks() {
  if (packs.value) return refreshPacks();
  try {
    const p: Packs = await (await fetch(dataUrl('packs.json'))).json();
    packs.value = Object.fromEntries(Object.keys(p).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)).map((k) => [k, p[k]]));
    await refreshPacks();
  } catch { packsError.value = 'packs.json not found'; }
}

export async function downloadPack(k: string) {
  const p = packs.value; if (!p || packState.value[k]?.busy) return;
  const cache = await caches.open(cacheName(k));
  const ctrl = new AbortController(); aborts[k] = ctrl;
  patch(k, { busy: true, error: undefined });
  const todo: string[] = [];
  for (const f of p[k].files) { const u = location.origin + dataUrl(f.path); if (!(await cache.match(u))) todo.push(u); }
  let done = p[k].files.length - todo.length;
  patch(k, { cached: done });
  let i = 0, failed = 0;
  const worker = async () => {
    while (i < todo.length && !ctrl.signal.aborted) {
      const u = todo[i++];
      try {
        const r = await fetch(u, { signal: ctrl.signal, cache: 'no-store' });
        if (r.ok) { await cache.put(u, r); done++; } else failed++;
      } catch { if (ctrl.signal.aborted) return; failed++; }
      if (done % 20 === 0) patch(k, { cached: done });
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  patch(k, { cached: done, busy: false, error: failed ? `${failed} file(s) failed, run again to complete` : undefined });
}

/** Fetch every missing pack, one after the other. */
export async function downloadAll() {
  if (runningAll) return;
  runningAll = true;
  try {
    for (const k of missing.value.keys) {
      if (!navigator.onLine) break;
      await downloadPack(k);
      if (aborts[k]?.signal.aborted) break; // the user pressed stop: don't start the next one
    }
  } finally { runningAll = false; }
}

export function stopPack(k: string) { aborts[k]?.abort(); }
export function stopAll() { for (const k of Object.keys(packState.value)) if (packState.value[k].busy) stopPack(k); }

export async function removePack(k: string) {
  await caches.delete(cacheName(k));
  await refreshPacks();
}

/** Wi-Fi or cable, and the user hasn't asked Android to save data. Unknown connection (iPhone, desktop): no. */
function unmetered() {
  const c = (navigator as any).connection;
  if (!c || c.saveData) return false;
  return c.type === 'wifi' || c.type === 'ethernet';
}
function maybeAuto() {
  if (autoPacks.value && navigator.onLine && unmetered() && missing.value.keys.length) downloadAll();
}

/** Called once at startup: read the packs state, then start downloading if on Wi-Fi. */
export async function initPacks() {
  await loadPacks();
  maybeAuto();
  addEventListener('online', maybeAuto);
  (navigator as any).connection?.addEventListener?.('change', maybeAuto);
}
