// Step 12: reference sound for the sound ID self-check.
// Three seconds of our Ring-necked Dove recording, 48 kHz mono 16 bit, shipped with the app (288 kB).
// At start-up the model must recognise it; if it does not, the phone's graphics chip computes wrongly
// and the app switches to the WebAssembly engine.
// Output: app/public/soundid/reference.pcm and reference.json
import fs from 'node:fs';
import path from 'node:path';
import { MPEGDecoder } from 'mpg123-decoder';
import { readJson, RAW_DIR, OUT_DIR, DATA_DIR } from './lib.mjs';

const ID = 'streptopelia-capicola', SCI = 'Streptopelia capicola', RATE = 48000, N = RATE * 3;
const meta = (readJson(path.join(RAW_DIR, 'sounds.json'), {})[SCI] || [])[0];
const bn = readJson(path.join(RAW_DIR, 'birdnet_map.json'), {})[SCI];
if (!meta || !bn) throw new Error('missing sound or BirdNET class for ' + SCI);
const src = [path.join(RAW_DIR, 'xc_orig', meta.file), path.join(OUT_DIR, 'sounds', meta.file)].find((p) => fs.existsSync(p));
const decoder = new MPEGDecoder(); await decoder.ready;
const { channelData, sampleRate } = decoder.decode(new Uint8Array(fs.readFileSync(src)));
decoder.free();
const x = channelData[0];
const pcm = new Int16Array(N);
let peak = 0;
const f32 = new Float32Array(N);
for (let i = 0; i < N; i++) { const p = (i * sampleRate) / RATE, a = Math.floor(p), b = Math.min(x.length - 1, a + 1); f32[i] = (x[a] || 0) + ((x[b] || 0) - (x[a] || 0)) * (p - a); peak = Math.max(peak, Math.abs(f32[i])); }
for (let i = 0; i < N; i++) pcm[i] = Math.round((f32[i] / (peak || 1)) * 0.9 * 32767);
const dir = path.join(DATA_DIR, '..', 'app', 'public', 'soundid');
fs.writeFileSync(path.join(dir, 'reference.pcm'), Buffer.from(pcm.buffer));
fs.writeFileSync(path.join(dir, 'reference.json'), JSON.stringify({ species: 'Ring-necked Dove', scientific: SCI, classIndex: bn.index, sampleRate: RATE, samples: N, format: 'int16le', recordist: meta.recordist, license: meta.license, source: meta.url, minScore: 0.5 }, null, 1));
console.log('reference written:', src, '->', N, 'samples; class', bn.index, bn.label, '| recordist', meta.recordist, meta.license);
