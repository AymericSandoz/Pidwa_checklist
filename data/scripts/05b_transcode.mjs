// Step 5b: shrink the xeno-canto clips for the offline pack: keep the first ~25 s after leading silence,
// re-encode mono 48 kbps MP3 (pure JS: mpg123-decoder + LAME via wasm-media-encoders, no ffmpeg needed).
// Each clip is converted in a child process with a timeout, so a corrupt file cannot take the whole run down.
// In place: data/out/sounds/<file>.mp3 is replaced, data/raw/sounds.json gets bytes/clipSeconds updated.
// Original downloads are kept in data/raw/xc_orig/ so this step can be re-run with other settings.
// Usage: node 05b_transcode.mjs [--force]      (internal: node 05b_transcode.mjs --one <in> <out>)

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readJson, writeJson, RAW_DIR, OUT_DIR } from './lib.mjs';

const MAX_SEC = 25;
const LEAD_SKIP_MAX = 6;   // skip at most this many seconds of leading silence
const SILENCE_DB = -40;
const BITRATE = 48;

// ---------------------------------------------------------------- child: one file
if (process.argv[2] === '--one') {
  const [, , , inFile, outFile] = process.argv;
  const { MPEGDecoder } = await import('mpg123-decoder');
  const { createMp3Encoder } = await import('wasm-media-encoders');
  const buf = fs.readFileSync(inFile);
  let channelData, sampleRate;
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF') {
    ({ channelData, sampleRate } = decodeWav(buf));
  } else {
    const decoder = new MPEGDecoder();
    await decoder.ready;
    const r = decoder.decode(new Uint8Array(buf));
    decoder.free();
    channelData = r.channelData; sampleRate = r.sampleRate;
    if (!channelData?.length || !channelData[0].length) throw new Error('mp3 decode produced no audio');
  }
  const ch = channelData.length, n = channelData[0].length;
  const mono = new Float32Array(n);
  for (let i = 0; i < n; i++) { let v = 0; for (let c = 0; c < ch; c++) v += channelData[c][i]; mono[i] = v / ch; }
  const win = Math.round(sampleRate * 0.05), thr = 10 ** (SILENCE_DB / 20);
  let start = 0;
  for (let i = 0; i + win <= Math.min(n, sampleRate * LEAD_SKIP_MAX); i += win) {
    let s = 0; for (let j = i; j < i + win; j++) s += mono[j] * mono[j];
    if (Math.sqrt(s / win) > thr) { start = Math.max(0, i - win); break; }
  }
  const end = Math.min(n, start + sampleRate * MAX_SEC);
  const slice = mono.slice(start, end);
  const f = Math.round(sampleRate * 0.02);
  for (let i = 0; i < f && i < slice.length; i++) { slice[i] *= i / f; slice[slice.length - 1 - i] *= i / f; }
  const encoder = await createMp3Encoder();
  encoder.configure({ sampleRate, channels: 1, bitrate: BITRATE });
  const a = Buffer.from(encoder.encode([slice]));   // views into WASM memory: copy immediately
  const b = Buffer.from(encoder.finalize());
  const out = Buffer.concat([a, b]);
  fs.writeFileSync(outFile, out);
  process.stdout.write(JSON.stringify({ bytes: out.length, seconds: slice.length / sampleRate, sampleRate }));
  process.exit(0);
}

function decodeWav(buf) {
  if (buf.subarray(8, 12).toString('latin1') !== 'WAVE') throw new Error('not a WAVE file');
  let p = 12, fmt = null, data = null;
  while (p + 8 <= buf.length) {
    const id = buf.subarray(p, p + 4).toString('latin1'), size = buf.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { format: buf.readUInt16LE(p + 8), channels: buf.readUInt16LE(p + 10), sampleRate: buf.readUInt32LE(p + 12), bits: buf.readUInt16LE(p + 22) };
    if (id === 'data') { data = buf.subarray(p + 8, p + 8 + size); break; }
    p += 8 + size + (size & 1);
  }
  if (!fmt || !data) throw new Error('wav: missing fmt/data chunk');
  const { channels, sampleRate, bits, format } = fmt;
  const bytes = bits / 8, frames = Math.floor(data.length / (bytes * channels));
  const channelData = Array.from({ length: channels }, () => new Float32Array(frames));
  for (let i = 0; i < frames; i++) for (let c = 0; c < channels; c++) {
    const o = (i * channels + c) * bytes;
    let v;
    if (format === 3 && bits === 32) v = data.readFloatLE(o);
    else if (bits === 16) v = data.readInt16LE(o) / 32768;
    else if (bits === 24) v = ((data[o] | (data[o + 1] << 8) | (data[o + 2] << 16)) << 8 >> 8) / 8388608;
    else if (bits === 32) v = data.readInt32LE(o) / 2147483648;
    else if (bits === 8) v = (data[o] - 128) / 128;
    else throw new Error('wav: unsupported bit depth ' + bits);
    channelData[c][i] = v;
  }
  return { channelData, sampleRate };
}

// ---------------------------------------------------------------- parent: all clips
const SND_DIR = path.join(OUT_DIR, 'sounds');
const ORIG_DIR = path.join(RAW_DIR, 'xc_orig');
const META = path.join(RAW_DIR, 'sounds.json');
const FORCE = process.argv.includes('--force');
const self = fileURLToPath(import.meta.url);
fs.mkdirSync(ORIG_DIR, { recursive: true });
const meta = readJson(META, {});
let n = 0, failed = 0, before = 0, after = 0;
for (const [sci, entries] of Object.entries(meta)) {
  for (const e of entries) {
    if (!e.file) continue;
    const src = path.join(SND_DIR, e.file);
    const orig = path.join(ORIG_DIR, e.file);
    if (!fs.existsSync(src) && !fs.existsSync(orig)) continue;
    if (e.transcoded && !FORCE) continue;
    if (!fs.existsSync(orig)) fs.copyFileSync(src, orig);
    const tmp = src + '.tmp';
    const r = spawnSync(process.execPath, [self, '--one', orig, tmp], { encoding: 'utf8', timeout: 90000, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 20 });
    if (r.status === 0 && fs.existsSync(tmp)) {
      const info = JSON.parse(r.stdout);
      fs.renameSync(tmp, src);
      before += fs.statSync(orig).size; after += info.bytes; n++;
      e.transcoded = true; e.bytes = info.bytes; e.clipSeconds = Math.round(info.seconds);
    } else {
      failed++;
      console.log(`  !! ${sci} ${e.file}: ${r.error ? r.error.message : 'exit ' + r.status}${r.signal ? ' ' + r.signal : ''}`);
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      e.transcodeFailed = true;
    }
    if ((n + failed) % 25 === 0) { console.log(`${n + failed} done`); writeJson(META, meta); }
  }
}
writeJson(META, meta);
console.log(`transcoded ${n} clips (${failed} failed): ${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(1)} MB`);
