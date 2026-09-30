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
const VOTE_WINDOW_MS = 20000;    // two faint hits must fall within this time to confirm a species
const VOTE_GAP_MS = 1400;        // and be this far apart: windows analysed closer than that share most of their sound
const JUNK_MIN = 0.2;            // an impossible species above this means the model is guessing on that window
const SURE = 0.5;                // from this score a hit is taken at face value, whatever else the window contains
export const POSSIBLE_TTL_MS = 120000; // an unconfirmed guess leaves the screen after two minutes without a new hit
// centre of the Greater Makalali / Pidwa area, used until a GPS position is known
const HOME = { lat: -24.12, lon: 30.66 };

// Decision rule, chosen by measurement (scripts/soundid-faint.mjs records the model on 41 species mixed with
// ambient noise at several levels, scripts/soundid-rules.mjs replays decision rules on those scores):
//  - the model is close to all-or-nothing: on a faint bird it either answers above 30 % or sees nothing at all,
//    and with a correct engine pure noise never produced a checklist species, even at 8 %;
//  - so one window at or above `show` displays a checklist species at once (this does not depend on how fast
//    the phone analyses), and the rule that needed two hits was costing 12 to 18 points of detection for nothing;
//  - between `possible` and `show` the species is listed apart as a possible one, only when it is the best guess
//    of its window and no impossible species beats it; two such hits within 20 s promote it;
//  - species outside the checklist need 15 points more and always two hits.
export type Sensitivity = 'low' | 'normal' | 'high';
export const LEVELS: Record<Sensitivity, { show: number; possible: number }> = {
  low: { show: 0.5, possible: 0.3 },
  normal: { show: 0.3, possible: 0.12 },
  high: { show: 0.15, possible: 0.07 },
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
  shown: boolean;          // confirmed: displayed in the main list; otherwise it is only a possible species
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
/** level of the last analysed window: loudness, peak and share of clipped samples */
export const lastStats = signal<{ rmsDb: number; peak: number; clipped: number } | null>(null);
export interface EngineInfo {
  tf: string;
  engine: 'webgl' | 'wasm';            // graphics chip, or processor (WebAssembly)
  verified: boolean;                   // the reference recording is recognised at start-up
  checks: { webgl?: number; wasm?: number; webglError?: string };
  webgl: number | string; float32: boolean | string; float32Enabled: boolean | string;
  stft: 'cpu' | 'gpu'; shaderOk: boolean; shaderError: number | null; simd: boolean | string | null;
}
export const engineInfo = signal<EngineInfo | null>(null);
/** user choice kept on the phone: 'auto' picks the graphics chip when it passes the start-up check */
export const enginePref = signal<'auto' | 'wasm'>((localStorage.getItem('sidEngine') as 'auto' | 'wasm') || 'auto');
interface TestRow { target: number; top: string; topConf: number }
/** `windows`: spectrogram computed on the processor (what the app uses); `shader`: same recording through the WebGL shader */
export interface SelfTest { state: 'running' | 'done' | 'failed'; ok: boolean; message: string; windows: TestRow[]; shader: TestRow[] }
export const selfTest = signal<SelfTest | null>(null);

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
let lastWin: Float32Array | null = null;   // copy of the last analysed window, for playback
const pending = new Map<number, (top: [number, number][]) => void>();
const stftWaiters: (() => void)[] = [];
/** Choose where the spectrogram is computed: 'cpu' is exact on every device, 'gpu' is BirdNET Live's shader. */
function setStft(mode: 'cpu' | 'gpu'): Promise<void> {
  return new Promise((res) => { stftWaiters.push(res); worker!.postMessage({ type: 'stft', mode }); });
}
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
    // classic worker with the prebuilt TensorFlow.js, exactly as BirdNET Live: see public/soundid/worker.js
    worker = new Worker(BASE + 'soundid/worker.js');
    worker.onerror = (e) => fail(e.message || 'worker failed to start');
    worker.onmessage = (e: MessageEvent) => {
      const d = e.data;
      if (d.type === 'progress') progress.value = { stage: d.stage, pct: d.pct };
      else if (d.type === 'ready') { geo = d.geo || null; engineInfo.value = d.info || null; status.value = 'ready'; progress.value = { stage: 'ready', pct: 100 }; resolve(); }
      else if (d.type === 'geo') geo = d.geo;
      else if (d.type === 'stft') { if (engineInfo.value) engineInfo.value = { ...engineInfo.value, stft: d.mode }; stftWaiters.splice(0).forEach((f) => f()); }
      else if (d.type === 'result') { lastMs.value = d.ms; pending.get(d.id)?.(d.top); pending.delete(d.id); }
      else if (d.type === 'error') {
        if (d.id != null && pending.has(d.id)) { pending.get(d.id)!([]); pending.delete(d.id); console.warn('sound id:', d.message); }
        else fail(/fetch|load|404|network/i.test(d.message) ? 'The Sound ID pack is not on this phone. Download it in Settings while you have network.' : d.message);
      }
    };
    worker.postMessage({ type: 'init', base: location.origin + BASE + 'data/birdnet/', ...HOME, force: enginePref.value === 'wasm' ? 'wasm' : undefined });
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
  let bestPlausible = 0, bestIndex = -1;
  for (const [i, c] of sp) if ((pidwaOf(classes[i]) || (geo && geo[i] >= GEO_MIN)) && c > bestPlausible) { bestPlausible = c; bestIndex = i; }

  const list = detections.value.slice();
  let changed = false;
  for (const [index, conf] of sp) {
    const c = classes[index];
    const pidwaId = pidwaOf(c);
    const ok = pidwaId ? true : geo ? geo[index] >= GEO_MIN : conf >= OFFLIST_NO_RANGE;
    if (!ok) continue;
    const show = pidwaId ? lv.show : Math.min(0.95, lv.show + OFFLIST_PENALTY);
    const possible = pidwaId ? lv.possible : show;   // no "possible" tier outside the checklist
    if (conf < possible) continue;
    if (conf < SURE && conf < junk) continue;                 // an impossible species scores higher: the model is guessing
    if (conf < show && index !== bestIndex) continue;        // a faint hit only counts when it is the best guess of its window

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
    // a checklist species is shown by one window at `show`; anything else needs two hits close in time
    const confirmed = d.shown || (!!pidwaId && conf >= show) || votes.length >= 2;
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

/** Switch engine and reload the model. */
export async function setEngine(pref: 'auto' | 'wasm') {
  enginePref.value = pref; localStorage.setItem('sidEngine', pref);
  stop();
  worker?.terminate(); worker = null; geo = null; engineInfo.value = null; selfTest.value = null;
  status.value = 'idle';
  await load().catch(() => {});
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
    let sum = 0, peak = 0, clipped = 0;
    for (let i = 0; i < win.length; i++) { const v = win[i], a = Math.abs(v); if (a >= 0.999) clipped++; if (a > peak) peak = a; if (v > 1) win[i] = 1; else if (v < -1) win[i] = -1; sum += v * v; }
    const rms = Math.sqrt(sum / win.length);
    lastStats.value = { rmsDb: Math.round(20 * Math.log10(Math.max(rms, 1e-7))), peak: Math.min(1, peak), clipped: clipped / win.length };
    lastWin = win.slice(0);
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

/** Play back the last 3 s that were sent to the model, to hear what the microphone really captured. */
export async function replayLast(): Promise<boolean> {
  if (!lastWin) return false;
  const pc = new AudioContext();
  const buf = pc.createBuffer(1, lastWin.length, SAMPLE_RATE);
  buf.copyToChannel(lastWin as Float32Array<ArrayBuffer>, 0);
  const src = pc.createBufferSource(); src.buffer = buf; src.connect(pc.destination);
  src.onended = () => pc.close();
  src.start();
  return true;
}

/**
 * Run the model on a clean reference recording, without the microphone.
 * Good scores here and bad ones when listening point at the microphone; bad scores here point at the phone's graphics engine.
 */
export async function runSelfTest(id = 'streptopelia-capicola') {
  const sp = byId.value.get(id);
  if (!sp || !sp.bn || !sp.sounds.length) { selfTest.value = { state: 'failed', ok: false, message: 'no reference recording for the test', windows: [], shader: [] }; return; }
  selfTest.value = { state: 'running', ok: false, message: 'loading the model and the reference recording…', windows: [], shader: [] };
  try {
    await load();
    const r = await fetch(dataUrl(sp.sounds[0].file));
    if (!r.ok) throw new Error('reference recording not available: connect to the network or download the sounds pack');
    const audio = await new OfflineAudioContext(1, 1, SAMPLE_RATE).decodeAudioData(await r.arrayBuffer());
    const pcm = audio.getChannelData(0);
    const wasRunning = running; running = false;      // keep the live loop out of the way
    while (busy) await new Promise((res) => setTimeout(res, 50));
    busy = true;
    const rows: TestRow[] = [], shader: TestRow[] = [];
    const pass = async (into: TestRow[]) => {
      for (let w = 0; w < 3 && (w + 1) * WINDOW <= pcm.length; w++) {
        const top = await analyse(pcm.slice(w * WINDOW, (w + 1) * WINDOW));
        const t = top.find(([i]) => i === sp.bn!.index);
        const best = top.find(([i]) => classes[i] && isSpecies(classes[i]));
        into.push({ target: t ? t[1] : 0, top: best ? classes[best[0]][1] : 'nothing', topConf: best ? best[1] : 0 });
        selfTest.value = { state: 'running', ok: false, message: `analysing ${sp.en}…`, windows: rows.slice(), shader: shader.slice() };
      }
    };
    try {
      await setStft('cpu'); await pass(rows);
      await setStft('gpu'); await pass(shader);   // for comparison only
    } finally { await setStft('cpu'); busy = false; if (wasRunning && status.value === 'listening') { running = true; loop(); } }
    const good = (r: TestRow[]) => r.length > 0 && r.filter((x) => x.target >= 0.5).length >= Math.ceil(r.length / 2);
    const ok = good(rows);
    selfTest.value = { state: 'done', ok, message: ok ? `Model OK on this phone: it recognises the reference ${sp.en}.` : `Model FAILS on this phone: it does not recognise a clean ${sp.en} recording.`, windows: rows, shader };
  } catch (e: any) {
    selfTest.value = { state: 'failed', ok: false, message: e?.message || String(e), windows: [], shader: [] };
  }
}

// for the headless tests and for debugging from the console
(window as any).__soundid = { load, start, stop, setEngine, enginePref, analyse, interpret, clearDetections, setSensitivity, runSelfTest, selfTest, replayLast, engineInfo, lastStats, detections, status, lastMs, noise, mic, lastTop, windows, classes: () => classes, geo: () => geo };
