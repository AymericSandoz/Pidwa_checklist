// Test helper: builds a 48 kHz mono 16-bit WAV from xeno-canto originals, to feed Chrome's fake microphone.
// Usage: node data/scripts/make_test_wav.mjs <out.wav> <species-id | file.mp3> [...]   (12 s per species)
import fs from 'node:fs';
import path from 'node:path';
import { MPEGDecoder } from 'mpg123-decoder';
import { RAW_DIR, OUT_DIR } from './lib.mjs';

const [out, ...ids] = process.argv.slice(2);
const RATE = 48000, SECONDS = 12;
const decoder = new MPEGDecoder();
await decoder.ready;
const parts = [];
for (const id of ids) {
  const f = [id, path.join(RAW_DIR, 'xc_orig', `${id}-1.mp3`), path.join(OUT_DIR, 'sounds', `${id}-1.mp3`)].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
  if (!f) { console.log('no clip for', id); continue; }
  const { channelData, sampleRate } = decoder.decode(new Uint8Array(fs.readFileSync(f)));
  await decoder.reset();
  const src = channelData[0];
  const n = Math.min(Math.floor((src.length * RATE) / sampleRate), RATE * SECONDS);
  const pcm = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i * sampleRate) / RATE; const a = Math.floor(x), b = Math.min(src.length - 1, a + 1); pcm[i] = src[a] + (src[b] - src[a]) * (x - a); } // linear resampling
  parts.push(pcm, new Float32Array(RATE)); // 1 s of silence between species
  console.log(id, path.basename(f), sampleRate, 'Hz ->', (n / RATE).toFixed(1), 's');
}
decoder.free();
const total = parts.reduce((a, p) => a + p.length, 0);
const buf = Buffer.alloc(44 + total * 2);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + total * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(total * 2, 40);
let o = 44;
for (const p of parts) for (let i = 0; i < p.length; i++) { buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(p[i] * 32767))), o); o += 2; }
fs.writeFileSync(out, buf);
console.log('wrote', out, (buf.length / 1e6).toFixed(1), 'MB,', (total / RATE).toFixed(1), 's');
