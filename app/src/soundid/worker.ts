/// <reference lib="webworker" />
// Sound ID worker: loads BirdNET V2.4 (TensorFlow.js, WebGL backend) and scores 3-second audio windows.
// Protocol
//   main -> worker  { type: 'init', base, lat, lon }            load the models, compute the area scores
//                   { type: 'area', lat, lon }                  recompute the area scores for another place
//                   { type: 'predict', id, pcm: Float32Array }  one window of 144,000 samples at 48 kHz
//   worker -> main  { type: 'progress', stage, pct }
//                   { type: 'ready', backend, classes, geo: Float32Array | null }
//                   { type: 'geo', geo: Float32Array }
//                   { type: 'result', id, ms, top: [classIndex, confidence][] }
//                   { type: 'error', message }
import * as tf from '@tensorflow/tfjs';
import { registerBirdnet } from './birdnet-kernel.js';

const WINDOW_SAMPLES = 144000; // 3 s at 48 kHz
const MIN_CONF = 0.03;         // below this nothing is reported to the main thread
const MAX_TOP = 60;

let birdModel: tf.LayersModel | null = null;
let areaModel: tf.GraphModel | null = null;
const post = (m: any, transfer: Transferable[] = []) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(m, transfer);

function weekOfYear() {
  const start = new Date(new Date().getFullYear(), 0, 1);
  start.setDate(start.getDate() + (1 - (start.getDay() % 7)));
  return Math.round((Date.now() - start.getTime()) / 604800000) + 1;
}

async function areaScores(lat: number, lon: number): Promise<Float32Array | null> {
  if (!areaModel) return null;
  tf.engine().startScope();
  try {
    const input = tf.tensor([[lat, lon, weekOfYear()]]);
    const out = areaModel.predict(input) as tf.Tensor;
    return new Float32Array(await out.data());
  } finally {
    tf.engine().endScope();
  }
}

async function init(base: string, lat: number, lon: number) {
  post({ type: 'progress', stage: 'backend', pct: 2 });
  registerBirdnet(tf);
  await tf.setBackend('webgl');
  await tf.ready();
  if (tf.getBackend() !== 'webgl') throw new Error('WebGL is not available on this device (backend: ' + tf.getBackend() + ')');

  birdModel = await tf.loadLayersModel(base + 'model.json', { onProgress: (p) => post({ type: 'progress', stage: 'model', pct: 5 + Math.round(p * 75) }) });
  post({ type: 'progress', stage: 'warmup', pct: 82 });
  tf.tidy(() => { (birdModel!.predict(tf.zeros([1, WINDOW_SAMPLES])) as tf.Tensor).dataSync(); });

  post({ type: 'progress', stage: 'area', pct: 92 });
  let geo: Float32Array | null = null;
  try {
    areaModel = await tf.loadGraphModel(base + 'area-model/model.json');
    geo = await areaScores(lat, lon);
  } catch (e: any) {
    console.warn('area model unavailable', e?.message);
  }
  const classes = (birdModel.outputs[0].shape[1] as number) || 0;
  post({ type: 'ready', backend: tf.getBackend(), classes, geo }, geo ? [geo.buffer] : []);
}

async function predict(id: number, pcm: Float32Array) {
  if (!birdModel) return;
  const t0 = performance.now();
  const win = new Float32Array(WINDOW_SAMPLES);
  win.set(pcm.subarray(0, Math.min(pcm.length, WINDOW_SAMPLES)));
  const input = tf.tensor2d(win, [1, WINDOW_SAMPLES]);
  const out = birdModel.predict(input) as tf.Tensor;
  const scores = (await out.data()) as Float32Array;
  input.dispose(); out.dispose();
  const top: [number, number][] = [];
  for (let i = 0; i < scores.length; i++) if (scores[i] >= MIN_CONF) top.push([i, scores[i]]);
  top.sort((a, b) => b[1] - a[1]);
  post({ type: 'result', id, ms: Math.round(performance.now() - t0), top: top.slice(0, MAX_TOP) });
}

self.onmessage = async (e: MessageEvent) => {
  const d = e.data;
  try {
    if (d.type === 'init') await init(d.base, d.lat, d.lon);
    else if (d.type === 'predict') await predict(d.id, d.pcm);
    else if (d.type === 'area') { const geo = await areaScores(d.lat, d.lon); if (geo) post({ type: 'geo', geo }, [geo.buffer]); }
  } catch (err: any) {
    post({ type: 'error', message: err?.message || String(err), id: d?.id });
  }
};
