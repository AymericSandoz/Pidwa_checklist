// Sound ID engine (main thread): microphone capture, 3 s sliding window, worker round-trips, detection list.
// One singleton for the whole app, so listening carries on while the user opens a species page.
import { signal } from '@preact/signals';
import { BASE, dataUrl, byId } from '../data';
import { slug } from '../util';

export const SAMPLE_RATE = 48000;          // what the model expects
const WINDOW = SAMPLE_RATE * 3;
const MIN_GAP_MS = 500;         // pause between two analyses, as in BirdNET Live: the phone sets the real pace
const RUMBLE_HZ = 200;           // high-pass before the model: wind, handling and rain thumps sit below this
const GEO_MIN = 0.03;            // a species is "plausible here" when the BirdNET range model gives it at least this
const OFFLIST_PENALTY = 0.15;    // species outside the checklist need a higher confidence
const OFFLIST_NO_RANGE = 0.8;    // without the range model nothing filters foreign species: only near-certain ones pass
const VOTE_WINDOW_MS = 12000;    // two moderate hits must fall within this time to confirm a species
const VOTE_GAP_MS = 1400;        // and be this far apart: windows analysed closer than that share most of their sound
const JUNK_MIN = 0.2;            // an impossible species above this means the model is guessing on that window
// centre of the Greater Makalali / Pidwa area, used until a GPS position is known
const HOME = { lat: -24.12, lon: 30.66 };

// Decision rule, chosen from experiments with rain noise (scripts/soundid-noise.mjs):
//  - one window at or above `high` confirms a checklist species at once;
//  - between `mid` and `high` it is only a vote, and it takes two votes within 12 s;
//  - a vote is ignored when an impossible species scores higher on the same window (the model is guessing).
// Rain, wind or silence make the model emit scattered 20-40 % scores: they rarely repeat on the same species.
export type Sensitivity = 'low' | 'normal' | 'high';
export const LEVELS: Record<Sensitivity, { high: number; mid: number }> = {
  low: { high: 0.75, mid: 0.45 },
  normal: { high: 0.6, mid: 0.3 },
  high: { high: 0.45, mid: 0.2 },
};

/** [scientific, english, french, pidwaId | null] per BirdNET class */
type ClassRow = [string, string, string | null, string | null];

export interface Detection {
  key: string;             // species id, or "x:<slug>" for a species that is not on the Pidwa checklist
  index: number;
  sci: string; en: string; fr: string | null;
  pidwaId: string | null;
  best: number;            // best confidence so far
  count: number;           // number of windows that voted for it
  votes: number[];         // times of the recent votes
  shown: boolean;          // confirmed: displayed in the list
  first: number; last: number;
  logged: boolean;
}

export interface MicInfo { contextRate: number; contextState: string; trackRate: number | null; echoCancellation: boolean | null; noiseSuppression: boolean | null; autoGainControl: boolean | null; label: string }

export const status = signal<'idle' | 'loading' | 'ready' | 'listening' | 'error'>('idle');
export const progress = signal<{ stage: string; pct: number }>({ stage: '', pct: 0 });
export const errorMsg = signal('');
export const detections = signal<Detection[]>([]);
export const sensitivity = signal<Sensitivity>((localStorage.getItem('sidSens') as Sensitivity) || 'normal');
export const lastMs = signal(0);         // duration of the last inference
export const level = signal(0);          // microphone level 0..1
export const startedAt = signal(0);
export const windows = signal(0);        // number of windows analysed since start
export const noise = signal<'ok' | 'noisy' | 'quiet'>('ok');
export const paused = signal(false);     // the app went to the background: Android stops the microphone
export const mic = signal<MicInfo | null>(null);
/** what the model said about the last window, before any rule: for the diagnostics panel */
export const lastTop = signal<{ name: string; conf: number; kind: 'list' | 'region' | 'impossible' | 'other' }[]>([]);

let worker: Worker | null = null;
let classes: ClassRow[] = [];
let geo: Float32Array | null = null;
let ctx: AudioContext | null = null;
let stream: MediaStream | null = null;
let node: AudioWorkletNode | null = null;
let analyser: AnalyserNode | null = null;
let inRate = SAMPLE_RATE;        // real sample rate of the audio context
let ringSize = WINDOW;
let ring = new Float32Array(WINDOW);
let written = 0;                 // total samples received since start
let busy = false;
let running = false;
let seq = 0;
let wake: any = null;
let recent: { confused: boolean; quiet: boolean }[] = [];
const pending = new Map<number, (top: [number, number][]) => void>();
const isSpecies = (c: ClassRow) => c[0].includes(' ') && c[0] !== c[1]; // BirdNET also has classes like "Engine", "Dog", "Human vocal"
const pidwaOf = (c: ClassRow) => (c[3] && byId.value.has(c[3]) ? c[3] : null);

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

/** Turn the raw class scores of one window into votes and confirmed detections. */
export function interpret(top: [number, number][], now = Date.now(), quiet = false) {
  const lv = LEVELS[sensitivity.value];
  const sp = top.filter(([i]) => classes[i] && isSpecies(classes[i]));
  const plausible = (i: number) => !!pidwaOf(classes[i]) || (geo ? geo[i] >= GEO_MIN : false);
  // best score of a species that cannot be here: when it beats a candidate, the model is guessing
  let junk = 0;
  if (geo) for (const [i, c] of sp) if (!plausible(i) && c > junk) junk = c;
  let bestPlausible = 0;

  const list = detections.value.slice();
  let changed = false;
  for (const [index, conf] of sp) {
    const c = classes[index];
    const pidwaId = pidwaOf(c);
    const ok = pidwaId ? true : geo ? geo[index] >= GEO_MIN : conf >= OFFLIST_NO_RANGE;
    if (!ok) continue;
    if (conf > bestPlausible) bestPlausible = conf;
    const high = pidwaId ? lv.high : Math.min(0.95, lv.high + OFFLIST_PENALTY);
    const mid = pidwaId ? lv.mid : Math.min(0.9, lv.mid + OFFLIST_PENALTY);
    if (conf < mid) continue;
    if (conf < high && conf < junk) continue;

    const key = pidwaId || 'x:' + slug(c[0]);
    let i = list.findIndex((d) => d.key === key);
    if (i < 0) {
      const s = pidwaId ? byId.value.get(pidwaId)! : null;
      list.push({ key, index, sci: s ? s.sci : c[0], en: s ? s.en : c[1], fr: s ? s.fr : c[2], pidwaId, best: 0, count: 0, votes: [], shown: false, first: now, last: now, logged: false });
      i = list.length - 1;
    }
    const d = list[i];
    const kept = d.votes.filter((t) => now - t <= VOTE_WINDOW_MS);
    // windows analysed in quick succession overlap: they count as one vote
    const fresh = !kept.length || now - kept[kept.length - 1] >= VOTE_GAP_MS;
    const votes = fresh ? [...kept, now] : kept;
    // a checklist species is confirmed by one strong window; anything else needs two votes close in time
    const confirmed = d.shown || (!!pidwaId && conf >= high) || votes.length >= 2;
    list[i] = { ...d, best: Math.max(d.best, conf), count: d.count + (fresh ? 1 : 0), votes, shown: confirmed, first: d.shown || !confirmed ? d.first : now, last: now };
    changed = true;
  }
  if (changed) detections.value = list;

  // diagnostics: the five best raw scores of this window
  lastTop.value = sp.slice(0, 5).map(([i, c]) => ({ name: classes[i][1], conf: c, kind: pidwaOf(classes[i]) ? 'list' : !geo ? 'other' : geo[i] >= GEO_MIN ? 'region' : 'impossible' }));
  // noise indicator over the last six windows
  const confused = junk >= JUNK_MIN && junk > bestPlausible;
  recent = [...recent.slice(-5), { confused, quiet }];
  const nq = recent.filter((r) => r.quiet).length, nc = recent.filter((r) => r.confused).length;
  noise.value = recent.length >= 4 && nq >= 4 ? 'quiet' : recent.length >= 4 && nc >= 4 ? 'noisy' : 'ok';
  windows.value++;
}

export function markLogged(key: string) { detections.value = detections.value.map((d) => (d.key === key ? { ...d, logged: true } : d)); }
export function clearDetections() { detections.value = []; recent = []; noise.value = 'ok'; }
export function setSensitivity(s: Sensitivity) { sensitivity.value = s; localStorage.setItem('sidSens', s); }

/** Last 3 s of sound, in chronological order, at 48 kHz whatever the rate of the audio context. */
function lastWindow(): Float32Array {
  const raw = new Float32Array(ringSize);
  const pos = written % ringSize;
  if (written < ringSize) raw.set(ring.subarray(0, pos), ringSize - pos);   // right-aligned, leading silence
  else { raw.set(ring.subarray(pos), 0); raw.set(ring.subarray(0, pos), ringSize - pos); }
  if (inRate === SAMPLE_RATE) return raw;
  const out = new Float32Array(WINDOW);
  const step = inRate / SAMPLE_RATE;
  for (let i = 0; i < WINDOW; i++) { const x = i * step, a = Math.floor(x), b = Math.min(ringSize - 1, a + 1); out[i] = raw[a] + (raw[b] - raw[a]) * (x - a); }
  return out;
}

async function tick() {
  if (busy || paused.value || status.value !== 'listening' || written < inRate) return; // wait for at least 1 s of sound
  busy = true;
  try {
    const win = lastWindow();
    let sum = 0;
    for (let i = 0; i < win.length; i++) { const v = win[i]; if (v > 1) win[i] = 1; else if (v < -1) win[i] = -1; if ((i & 7) === 0) sum += v * v; }
    const rms = Math.sqrt(sum / (win.length / 8));
    interpret(await analyse(win), Date.now(), rms < 0.0006);
  } finally { busy = false; }
}

/** Analyse, wait a little, analyse again: as fast as the phone allows, like BirdNET Live. */
async function loop() {
  while (running) {
    const t0 = performance.now();
    try { await tick(); } catch (e) { console.warn('sound id tick', e); }
    await new Promise((r) => setTimeout(r, Math.max(MIN_GAP_MS - (performance.now() - t0), 100)));
  }
}

function onVisibility() {
  if (status.value !== 'listening') return;
  if (document.hidden) { paused.value = true; }
  else {
    // back in front: the microphone stream was probably frozen meanwhile, start from a clean buffer
    paused.value = false; written = 0; ring.fill(0); recent = [];
    ctx?.resume().catch(() => {});
  }
  if (mic.value && ctx) mic.value = { ...mic.value, contextState: ctx.state };
}

export async function start() {
  await load();
  if (status.value === 'listening') return;
  try {
    // same request as BirdNET Live: raw microphone, no voice processing
    stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: SAMPLE_RATE, echoCancellation: false, noiseSuppression: false, autoGainControl: false } as any });
  } catch (e: any) {
    errorMsg.value = e?.name === 'NotAllowedError' ? 'Microphone permission was refused. Allow it for this site in the browser settings.' : 'No microphone available: ' + (e?.message || e);
    throw e;
  }
  try { ctx = new AudioContext({ sampleRate: SAMPLE_RATE }); } catch { ctx = new AudioContext(); } // some devices refuse a forced rate
  // created after several awaits, the context can start suspended on a phone: nothing would reach the model
  if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
  inRate = ctx.sampleRate;
  ringSize = Math.round(inRate * 3);
  await ctx.audioWorklet.addModule(BASE + 'worklets/audio-processor.js');
  const src = ctx.createMediaStreamSource(stream);
  const rumble = ctx.createBiquadFilter();
  rumble.type = 'highpass'; rumble.frequency.value = RUMBLE_HZ; rumble.Q.value = 0.707;
  analyser = ctx.createAnalyser();
  analyser.fftSize = 1024; analyser.smoothingTimeConstant = 0;
  node = new AudioWorkletNode(ctx, 'audio-processor');
  ring = new Float32Array(ringSize); written = 0; recent = []; windows.value = 0; noise.value = 'ok'; paused.value = false;
  node.port.onmessage = (e: MessageEvent<Float32Array>) => {
    const b = e.data; let peak = 0;
    for (let i = 0; i < b.length; i++) { ring[(written + i) % ringSize] = b[i]; const a = Math.abs(b[i]); if (a > peak) peak = a; }
    written += b.length;
    level.value = peak;
  };
  src.connect(rumble); rumble.connect(analyser); rumble.connect(node);
  // The worklet writes nothing to its output, so this plays silence; it keeps the graph running on every browser.
  node.connect(ctx.destination);
  const track = stream.getAudioTracks()[0];
  const st: any = track?.getSettings?.() || {};
  mic.value = { contextRate: inRate, contextState: ctx.state, trackRate: st.sampleRate ?? null, echoCancellation: st.echoCancellation ?? null, noiseSuppression: st.noiseSuppression ?? null, autoGainControl: st.autoGainControl ?? null, label: track?.label || '' };
  errorMsg.value = '';
  status.value = 'listening'; startedAt.value = Date.now();
  running = true; loop();
  document.addEventListener('visibilitychange', onVisibility);
  try { wake = await (navigator as any).wakeLock?.request('screen'); } catch { /* not critical */ }
  navigator.geolocation?.getCurrentPosition((p) => setPlace(p.coords.latitude, p.coords.longitude), () => {}, { maximumAge: 600000, timeout: 20000 });
}

export function stop() {
  running = false;
  document.removeEventListener('visibilitychange', onVisibility);
  node?.port && (node.port.onmessage = null);
  node?.disconnect(); node = null; analyser = null;
  stream?.getTracks().forEach((t) => t.stop()); stream = null;
  ctx?.close(); ctx = null;
  try { wake?.release(); } catch { /* ignore */ } wake = null;
  level.value = 0; paused.value = false;
  if (status.value === 'listening') status.value = 'ready';
}

// for the headless tests and for debugging from the console
(window as any).__soundid = { load, start, stop, analyse, interpret, clearDetections, setSensitivity, detections, status, lastMs, noise, mic, lastTop, windows, classes: () => classes, geo: () => geo };
