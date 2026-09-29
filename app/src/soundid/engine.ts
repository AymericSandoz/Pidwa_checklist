// Sound ID engine (main thread): microphone capture, 3 s sliding window, worker round-trips, detection list.
// One singleton for the whole app, so listening carries on while the user opens a species page.
import { signal } from '@preact/signals';
import { BASE, dataUrl, byId } from '../data';
import { slug } from '../util';

export const SAMPLE_RATE = 48000;
const WINDOW = SAMPLE_RATE * 3;
const HOP_MS = 1500;
const GEO_MIN = 0.03;            // off-list species must be plausible here according to the BirdNET range model
const OFFLIST_PENALTY = 0.15;    // and need a higher confidence than checklist species
const OFFLIST_NO_RANGE = 0.8;    // without the range model nothing filters foreign species: only near-certain ones pass
// centre of the Greater Makalali / Pidwa area, used until a GPS position is known
const HOME = { lat: -24.12, lon: 30.66 };

export type Sensitivity = 'low' | 'normal' | 'high';
export const THRESHOLD: Record<Sensitivity, number> = { low: 0.5, normal: 0.3, high: 0.15 };

/** [scientific, english, french, pidwaId | null] per BirdNET class */
type ClassRow = [string, string, string | null, string | null];

export interface Detection {
  key: string;             // species id, or "x:<slug>" for a species that is not on the Pidwa checklist
  index: number;
  sci: string; en: string; fr: string | null;
  pidwaId: string | null;
  best: number;            // best confidence so far
  count: number;           // number of windows in which it was heard
  first: number; last: number;
  logged: boolean;
}

export const status = signal<'idle' | 'loading' | 'ready' | 'listening' | 'error'>('idle');
export const progress = signal<{ stage: string; pct: number }>({ stage: '', pct: 0 });
export const errorMsg = signal('');
export const detections = signal<Detection[]>([]);
export const sensitivity = signal<Sensitivity>((localStorage.getItem('sidSens') as Sensitivity) || 'normal');
export const lastMs = signal(0);         // duration of the last inference
export const level = signal(0);          // microphone level 0..1
export const startedAt = signal(0);

let worker: Worker | null = null;
let classes: ClassRow[] = [];
let geo: Float32Array | null = null;
let ctx: AudioContext | null = null;
let stream: MediaStream | null = null;
let node: AudioWorkletNode | null = null;
let analyser: AnalyserNode | null = null;
let ring = new Float32Array(WINDOW);
let written = 0;                 // total samples received since start
let busy = false;
let timer: number | null = null;
let seq = 0;
let wake: any = null;
const pending = new Map<number, (top: [number, number][]) => void>();
const isSpecies = (c: ClassRow) => c[0].includes(' ') && c[0] !== c[1]; // BirdNET also has classes like "Engine", "Dog", "Human vocal"

export const getAnalyser = () => analyser;
export const hasRangeModel = () => !!geo;
/** Number of model files already stored on the phone (the Sound ID pack has 18). */
export async function packFiles(): Promise<number> {
  try { return (await (await caches.open('pack-birdnet')).keys()).length; } catch { return 0; }
}
export const classCount = () => classes.length;

/** Load the model (once). Resolves when the worker is ready. */
export function load(): Promise<void> {
  if (status.value === 'ready' || status.value === 'listening') return Promise.resolve();
  if (status.value === 'loading') return new Promise((res, rej) => { const stop = status.subscribe((s) => { if (s === 'ready') { stop(); res(); } else if (s === 'error') { stop(); rej(new Error(errorMsg.value)); } }); });
  status.value = 'loading'; errorMsg.value = ''; progress.value = { stage: 'classes', pct: 1 };
  return new Promise<void>(async (resolve, reject) => {
    const fail = (m: string) => { errorMsg.value = m; status.value = 'error'; worker?.terminate(); worker = null; reject(new Error(m)); };
    try {
      const r = await fetch(dataUrl('birdnet/classes.json'));
      if (!r.ok) throw new Error('classes ' + r.status);
      classes = await r.json();
    } catch {
      return fail('The Sound ID pack is not on this phone. Download it in Settings while you have network.');
    }
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onerror = (e) => fail(e.message || 'worker failed to start');
    worker.onmessage = (e: MessageEvent) => {
      const d = e.data;
      if (d.type === 'progress') progress.value = { stage: d.stage, pct: d.pct };
      else if (d.type === 'ready') { geo = d.geo || null; status.value = 'ready'; progress.value = { stage: 'ready', pct: 100 }; resolve(); }
      else if (d.type === 'geo') geo = d.geo;
      else if (d.type === 'result') { lastMs.value = d.ms; pending.get(d.id)?.(d.top); pending.delete(d.id); }
      else if (d.type === 'error') {
        if (d.id != null && pending.has(d.id)) { pending.get(d.id)!([]); pending.delete(d.id); console.warn('sound id:', d.message); }
        else fail(/fetch|load|404|network/i.test(d.message) ? 'The Sound ID pack is not on this phone. Download it in Settings while you have network.' : d.message);
      }
    };
    worker.postMessage({ type: 'init', base: location.origin + BASE + 'data/birdnet/', ...HOME });
  });
}

/** Tell the range model where we are (optional, improves the off-list filter). */
export function setPlace(lat: number, lon: number) { worker?.postMessage({ type: 'area', lat, lon }); }

/** Score one 3 s window of 48 kHz mono audio. */
export function analyse(pcm: Float32Array): Promise<[number, number][]> {
  return new Promise((res) => { const id = ++seq; pending.set(id, res); worker!.postMessage({ type: 'predict', id, pcm }, [pcm.buffer]); });
}

/** Turn raw class scores into detections according to the current sensitivity. */
export function interpret(top: [number, number][], now = Date.now()) {
  const thr = THRESHOLD[sensitivity.value];
  const list = detections.value.slice();
  let changed = false;
  for (const [index, conf] of top) {
    const c = classes[index];
    if (!c || !isSpecies(c)) continue;
    const pidwaId = c[3] && byId.value.has(c[3]) ? c[3] : null;
    if (pidwaId) { if (conf < thr) continue; }
    else {
      if (geo && geo[index] < GEO_MIN) continue;          // not known from this region: almost certainly a false alarm
      if (conf < (geo ? Math.min(0.9, thr + OFFLIST_PENALTY) : OFFLIST_NO_RANGE)) continue;
    }
    const key = pidwaId || 'x:' + slug(c[0]);
    const i = list.findIndex((d) => d.key === key);
    if (i >= 0) list[i] = { ...list[i], best: Math.max(list[i].best, conf), count: list[i].count + 1, last: now };
    else { const sp = pidwaId ? byId.value.get(pidwaId)! : null; list.push({ key, index, sci: sp ? sp.sci : c[0], en: sp ? sp.en : c[1], fr: sp ? sp.fr : c[2], pidwaId, best: conf, count: 1, first: now, last: now, logged: false }); }
    changed = true;
  }
  if (changed) detections.value = list;
}

export function markLogged(key: string) { detections.value = detections.value.map((d) => (d.key === key ? { ...d, logged: true } : d)); }
export function clearDetections() { detections.value = []; }
export function setSensitivity(s: Sensitivity) { sensitivity.value = s; localStorage.setItem('sidSens', s); }

function lastWindow(): Float32Array {
  // copy the ring buffer in chronological order
  const out = new Float32Array(WINDOW);
  const pos = written % WINDOW;
  if (written < WINDOW) out.set(ring.subarray(0, pos), WINDOW - pos);   // right-aligned, leading silence
  else { out.set(ring.subarray(pos), 0); out.set(ring.subarray(0, pos), WINDOW - pos); }
  return out;
}

async function tick() {
  if (busy || status.value !== 'listening' || written < SAMPLE_RATE) return; // wait for at least 1 s of sound
  busy = true;
  try { interpret(await analyse(lastWindow())); } finally { busy = false; }
}

export async function start() {
  await load();
  if (status.value === 'listening') return;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false } as any });
  } catch (e: any) {
    errorMsg.value = e?.name === 'NotAllowedError' ? 'Microphone permission was refused. Allow it for this site in the browser settings.' : 'No microphone available: ' + (e?.message || e);
    throw e;
  }
  ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
  await ctx.audioWorklet.addModule(BASE + 'worklets/audio-processor.js');
  const src = ctx.createMediaStreamSource(stream);
  analyser = ctx.createAnalyser();
  analyser.fftSize = 1024; analyser.smoothingTimeConstant = 0;
  node = new AudioWorkletNode(ctx, 'audio-processor');
  ring = new Float32Array(WINDOW); written = 0;
  node.port.onmessage = (e: MessageEvent<Float32Array>) => {
    const b = e.data; let peak = 0;
    for (let i = 0; i < b.length; i++) { ring[(written + i) % WINDOW] = b[i]; const a = Math.abs(b[i]); if (a > peak) peak = a; }
    written += b.length;
    level.value = peak;
  };
  src.connect(analyser); src.connect(node);
  errorMsg.value = '';
  status.value = 'listening'; startedAt.value = Date.now();
  timer = window.setInterval(tick, HOP_MS);
  try { wake = await (navigator as any).wakeLock?.request('screen'); } catch { /* not critical */ }
  navigator.geolocation?.getCurrentPosition((p) => setPlace(p.coords.latitude, p.coords.longitude), () => {}, { maximumAge: 600000, timeout: 20000 });
}

export function stop() {
  if (timer != null) { clearInterval(timer); timer = null; }
  node?.port && (node.port.onmessage = null);
  node?.disconnect(); node = null; analyser = null;
  stream?.getTracks().forEach((t) => t.stop()); stream = null;
  ctx?.close(); ctx = null;
  try { wake?.release(); } catch { /* ignore */ } wake = null;
  level.value = 0;
  if (status.value === 'listening') status.value = 'ready';
}

// for the headless tests and for debugging from the console
(window as any).__soundid = { load, start, stop, analyse, interpret, detections, status, lastMs, classes: () => classes, geo: () => geo };
