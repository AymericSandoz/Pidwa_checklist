// Test helper: a field-like recording for Chrome's fake microphone.
// Timeline: 20 s of rain alone, then each given species for 15 s under the same rain, then 10 s of rain.
// Usage: node data/scripts/make_noise_wav.mjs <out.wav> <snr dB> <species-id> [<species-id> ...]
import fs from 'node:fs';
import path from 'node:path';
import { MPEGDecoder } from 'mpg123-decoder';
import { RAW_DIR, OUT_DIR } from './lib.mjs';

const [out, snrArg, ...ids] = process.argv.slice(2);
const SNR = Number(snrArg), RATE = 48000;
let seed = 2024; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const rms = (x) => Math.sqrt(x.reduce((a, v) => a + v * v, 0) / x.length);
function rain(n) {
  const x = new Float32Array(n); let lp = 0, rumble = 0;
  for (let i = 0; i < n; i++) { const w = rnd(); lp += 0.06 * (w - lp); rumble += 0.004 * (rnd() - rumble); x[i] = (w - lp) * 0.12 + rumble * 1.5; } // hiss + low thumps
  for (let d = 0; d < (n / RATE) * 400; d++) { const p = Math.floor(((rnd() + 1) / 2) * (n - 400)), len = 60 + Math.floor(((rnd() + 1) / 2) * 300), a = 0.2 + 0.2 * rnd(); for (let k = 0; k < len; k++) x[p + k] += a * rnd() * Math.exp(-k / (len / 4)); }
  return x;
}
const decoder = new MPEGDecoder(); await decoder.ready;
const parts = [rain(RATE * 20)];
for (const id of ids) {
  const f = [path.join(RAW_DIR, 'xc_orig', `${id}-1.mp3`), path.join(OUT_DIR, 'sounds', `${id}-1.mp3`)].find((p) => fs.existsSync(p));
  const { channelData, sampleRate } = decoder.decode(new Uint8Array(fs.readFileSync(f))); await decoder.reset();
  const src = channelData[0], n = Math.min(Math.floor((src.length * RATE) / sampleRate), RATE * 15);
  const clip = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i * sampleRate) / RATE, a = Math.floor(x), b = Math.min(src.length - 1, a + 1); clip[i] = src[a] + (src[b] - src[a]) * (x - a); }
  const noise = rain(n), g = (rms(noise) * 10 ** (SNR / 20)) / rms(clip); // rain keeps its level, the bird is scaled to the wanted SNR
  const mix = new Float32Array(n); for (let i = 0; i < n; i++) mix[i] = clip[i] * g + noise[i];
  parts.push(mix);
  console.log(id, `bird gain ${g.toFixed(2)} for SNR ${SNR} dB`);
}
parts.push(rain(RATE * 10));
decoder.free();
const total = parts.reduce((a, p) => a + p.length, 0);
let peak = 0; for (const p of parts) for (const v of p) peak = Math.max(peak, Math.abs(v));
const k = peak > 0.98 ? 0.98 / peak : 1;
const buf = Buffer.alloc(44 + total * 2);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + total * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(total * 2, 40);
let o = 44; for (const p of parts) for (let i = 0; i < p.length; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, p[i] * k)) * 32767), o); o += 2; }
fs.writeFileSync(out, buf);
console.log('wrote', out, (total / RATE).toFixed(0), 's');
