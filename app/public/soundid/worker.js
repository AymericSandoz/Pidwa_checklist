// Sound ID worker: loads BirdNET V2.4 with TensorFlow.js and scores 3-second audio windows.
//
// Set-up borrowed from BirdNET Live: a classic worker, the prebuilt tf.min.js loaded with importScripts,
// and its custom spectrogram layer. Two additions, after a phone returned meaningless scores:
//   - the spectrogram transform is computed on the processor (stft-cpu.js), identical on every device;
//   - at start-up the model must recognise a reference recording shipped with the app. If the graphics
//     chip fails that check, the model is reloaded on the WebAssembly engine, slower but exact.
//
// Protocol
//   main -> worker  { type: 'init', base, lat, lon, force? }    load the models; force: 'webgl' | 'wasm'
//                   { type: 'area', lat, lon }                  recompute the area scores for another place
//                   { type: 'predict', id, pcm: Float32Array }  one window of 144,000 samples at 48 kHz
//                   { type: 'stft', mode: 'cpu' | 'gpu' }       where the spectrogram is computed (webgl engine only)
//   worker -> main  { type: 'progress', stage, pct }
//                   { type: 'ready', backend, classes, info, geo: Float32Array | null }
//                   { type: 'geo', geo: Float32Array }
//                   { type: 'stft', mode }
//                   { type: 'result', id, ms, top: [classIndex, confidence][] }
//                   { type: 'error', message }
importScripts('tf.min.js', 'tf-backend-wasm.min.js', 'birdnet-kernel.js', 'stft-cpu.js');

const HERE = self.location.href.replace(/[^/]*$/, '');
const WINDOW_SAMPLES = 144000; // 3 s at 48 kHz
const MIN_CONF = 0.03;         // below this nothing is reported to the main thread
const MAX_TOP = 60;

let birdModel = null;
let areaModel = null;
let reference = null;          // { pcm: Float32Array, classIndex, minScore }

function weekOfYear() {
  const start = new Date(new Date().getFullYear(), 0, 1);
  start.setDate(start.getDate() + (1 - (start.getDay() % 7)));
  return Math.round((Date.now() - start.getTime()) / 604800000) + 1;
}

async function areaScores(lat, lon) {
  if (!areaModel) return null;
  tf.engine().startScope();
  try {
    const input = tf.tensor([[lat, lon, weekOfYear()]]);
    return new Float32Array(await areaModel.predict(input).data());
  } finally {
    tf.engine().endScope();
  }
}

async function scores(win) {
  const input = tf.tensor2d(win, [1, WINDOW_SAMPLES]);
  const out = birdModel.predict(input);
  const data = await out.data();
  input.dispose(); out.dispose();
  return data;
}

async function loadReference() {
  if (reference) return reference;
  const meta = await (await fetch(HERE + 'reference.json')).json();
  const raw = new Int16Array(await (await fetch(HERE + 'reference.pcm')).arrayBuffer());
  const pcm = new Float32Array(WINDOW_SAMPLES);
  for (let i = 0; i < Math.min(raw.length, WINDOW_SAMPLES); i++) pcm[i] = raw[i] / 32768;
  reference = { pcm, classIndex: meta.classIndex, minScore: meta.minScore, species: meta.species };
  return reference;
}

/** Score of the reference recording on the engine currently loaded: about 0.99 when the computation is right. */
async function check() {
  const ref = await loadReference();
  const s = await scores(ref.pcm.slice(0));
  return s[ref.classIndex];
}

async function loadEngine(name, base, from, to) {
  if (name === 'wasm') tf.wasm.setWasmPaths(HERE);
  const ok = await tf.setBackend(name);
  await tf.ready();
  if (!ok || tf.getBackend() !== name) throw new Error(name + ' engine is not available on this device');
  if (name === 'webgl') self.stft.use('cpu');
  if (birdModel) { birdModel.dispose(); birdModel = null; }
  if (areaModel) { areaModel.dispose(); areaModel = null; }
  birdModel = await tf.loadLayersModel(base + 'model.json', { onProgress: (p) => postMessage({ type: 'progress', stage: 'model', pct: from + Math.round(p * (to - from)) }) });
  postMessage({ type: 'progress', stage: 'warmup', pct: to });
  tf.tidy(() => { birdModel.predict(tf.zeros([1, WINDOW_SAMPLES])).dataSync(); });
}

async function init(base, lat, lon, force) {
  postMessage({ type: 'progress', stage: 'backend', pct: 2 });
  tf.serialization.registerClass(MelSpecLayerSimple);
  const checks = {};
  let shaderError = null, engine = null;

  if (force !== 'wasm') {
    try {
      await loadEngine('webgl', base, 5, 70);
      try { shaderError = Math.max.apply(null, (await self.stft.compare()).map((r) => r.maxRel)); } catch (e) { shaderError = 1; }
      postMessage({ type: 'progress', stage: 'check', pct: 74 });
      checks.webgl = await check();
      if (checks.webgl >= reference.minScore || force === 'webgl') engine = 'webgl';
    } catch (e) {
      checks.webglError = (e && e.message) || String(e);
    }
  }
  if (!engine) {
    postMessage({ type: 'progress', stage: 'fallback', pct: 76 });
    await loadEngine('wasm', base, 76, 88);
    postMessage({ type: 'progress', stage: 'check', pct: 89 });
    try { checks.wasm = await check(); } catch (e) { checks.wasmError = (e && e.message) || String(e); }
    engine = 'wasm';
  }

  postMessage({ type: 'progress', stage: 'area', pct: 92 });
  let geo = null;
  // the range model is small but its download can fail on a poor connection: try three times
  for (let attempt = 1; attempt <= 3 && !geo; attempt++) {
    try {
      areaModel = await tf.loadGraphModel(base + 'area-model/model.json');
      geo = await areaScores(lat, lon);
    } catch (e) {
      console.warn('range model attempt ' + attempt + ' failed', e && e.message);
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  const env = tf.env();
  const flag = (k) => { try { return env.get(k); } catch (e) { return '?'; } };
  const score = checks[engine];
  const info = {
    tf: tf.version.tfjs,
    engine,                                   // 'webgl' (graphics chip) or 'wasm' (processor)
    verified: score != null && reference != null && score >= reference.minScore, // the reference recording is recognised on this engine
    checks,                                   // score of the reference recording per engine tried
    webgl: flag('WEBGL_VERSION'),
    float32: flag('WEBGL_RENDER_FLOAT32_CAPABLE'),
    float32Enabled: flag('WEBGL_RENDER_FLOAT32_ENABLED'),
    stft: engine === 'webgl' ? self.stft.mode : 'cpu',
    shaderOk: shaderError != null && shaderError < 0.01,
    shaderError,
    simd: engine === 'wasm' ? flag('WASM_HAS_SIMD_SUPPORT') : null,
  };
  postMessage({ type: 'ready', backend: tf.getBackend(), classes: birdModel.outputs[0].shape[1] || 0, info, geo }, geo ? [geo.buffer] : []);
}

async function predict(id, pcm) {
  if (!birdModel) return;
  const t0 = performance.now();
  const win = new Float32Array(WINDOW_SAMPLES);
  win.set(pcm.subarray(0, Math.min(pcm.length, WINDOW_SAMPLES)));
  const s = await scores(win);
  const top = [];
  for (let i = 0; i < s.length; i++) if (s[i] >= MIN_CONF) top.push([i, s[i]]);
  top.sort((a, b) => b[1] - a[1]);
  postMessage({ type: 'result', id, ms: Math.round(performance.now() - t0), top: top.slice(0, MAX_TOP) });
}

onmessage = async (e) => {
  const d = e.data;
  try {
    if (d.type === 'init') await init(d.base, d.lat, d.lon, d.force);
    else if (d.type === 'predict') await predict(d.id, d.pcm);
    else if (d.type === 'stft') { if (tf.getBackend() === 'webgl') self.stft.use(d.mode); postMessage({ type: 'stft', mode: tf.getBackend() === 'webgl' ? self.stft.mode : 'cpu' }); }
    else if (d.type === 'area') { const geo = await areaScores(d.lat, d.lon); if (geo) postMessage({ type: 'geo', geo }, [geo.buffer]); }
  } catch (err) {
    postMessage({ type: 'error', message: (err && err.message) || String(err), id: d && d.id });
  }
};
