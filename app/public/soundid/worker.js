// Sound ID worker: loads BirdNET V2.4 (TensorFlow.js, WebGL backend) and scores 3-second audio windows.
//
// Deliberately the same set-up as BirdNET Live, which is known to work on phones: a classic worker,
// the prebuilt tf.min.js loaded with importScripts, and its layer and kernel code unchanged.
// (A first version bundled TensorFlow.js through the app's build tool: it worked on a computer and
// produced meaningless scores on an Android phone.)
//
// Protocol
//   main -> worker  { type: 'init', base, lat, lon }            load the models, compute the area scores
//                   { type: 'area', lat, lon }                  recompute the area scores for another place
//                   { type: 'predict', id, pcm: Float32Array }  one window of 144,000 samples at 48 kHz
//   worker -> main  { type: 'progress', stage, pct }
//                   { type: 'ready', backend, classes, info, geo: Float32Array | null }
//                   { type: 'geo', geo: Float32Array }
//                   { type: 'result', id, ms, top: [classIndex, confidence][] }
//                   { type: 'error', message }
importScripts('tf.min.js', 'birdnet-kernel.js');

const WINDOW_SAMPLES = 144000; // 3 s at 48 kHz
const MIN_CONF = 0.03;         // below this nothing is reported to the main thread
const MAX_TOP = 60;

let birdModel = null;
let areaModel = null;

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

async function init(base, lat, lon) {
  postMessage({ type: 'progress', stage: 'backend', pct: 2 });
  await tf.setBackend('webgl');
  await tf.ready();
  if (tf.getBackend() !== 'webgl') throw new Error('WebGL is not available on this device (backend: ' + tf.getBackend() + ')');
  tf.serialization.registerClass(MelSpecLayerSimple);

  birdModel = await tf.loadLayersModel(base + 'model.json', { onProgress: (p) => postMessage({ type: 'progress', stage: 'model', pct: 5 + Math.round(p * 75) }) });
  postMessage({ type: 'progress', stage: 'warmup', pct: 82 });
  tf.tidy(() => { birdModel.predict(tf.zeros([1, WINDOW_SAMPLES])).dataSync(); });

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
  // facts about the graphics engine, shown in the diagnostics panel
  const env = tf.env();
  const flag = (k) => { try { return env.get(k); } catch (e) { return '?'; } };
  const info = {
    tf: tf.version.tfjs,
    webgl: flag('WEBGL_VERSION'),
    float32: flag('WEBGL_RENDER_FLOAT32_CAPABLE'),
    float32Enabled: flag('WEBGL_RENDER_FLOAT32_ENABLED'),
    mobile: flag('IS_MOBILE') === true || (typeof navigator !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent)),
  };
  postMessage({ type: 'ready', backend: tf.getBackend(), classes: birdModel.outputs[0].shape[1] || 0, info, geo }, geo ? [geo.buffer] : []);
}

async function predict(id, pcm) {
  if (!birdModel) return;
  const t0 = performance.now();
  const win = new Float32Array(WINDOW_SAMPLES);
  win.set(pcm.subarray(0, Math.min(pcm.length, WINDOW_SAMPLES)));
  const input = tf.tensor2d(win, [1, WINDOW_SAMPLES]);
  const out = birdModel.predict(input);
  const scores = await out.data();
  input.dispose(); out.dispose();
  const top = [];
  for (let i = 0; i < scores.length; i++) if (scores[i] >= MIN_CONF) top.push([i, scores[i]]);
  top.sort((a, b) => b[1] - a[1]);
  postMessage({ type: 'result', id, ms: Math.round(performance.now() - t0), top: top.slice(0, MAX_TOP) });
}

onmessage = async (e) => {
  const d = e.data;
  try {
    if (d.type === 'init') await init(d.base, d.lat, d.lon);
    else if (d.type === 'predict') await predict(d.id, d.pcm);
    else if (d.type === 'area') { const geo = await areaScores(d.lat, d.lon); if (geo) postMessage({ type: 'geo', geo }, [geo.buffer]); }
  } catch (err) {
    postMessage({ type: 'error', message: (err && err.message) || String(err), id: d && d.id });
  }
};
