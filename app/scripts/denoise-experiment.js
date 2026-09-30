// EXPERIMENT, NOT USED BY THE APP. Noise reduction applied to each 3 s window before the model (spectral gating).
// Measured with scripts/soundid-faint.mjs --denoise=0.5,3,0.1 on 41 species: detection went DOWN
// (clean 88 -> 83 %, -3 dB 71 -> 66 %, -9 dB 56 -> 41 %). BirdNET was trained on raw noisy recordings and the
// artefacts of the filter hurt more than the quieter background helps. Kept only so the test can be repeated.
//
// BirdNET scales every window to its loudest sample. When a faint bird sits in steady background noise
// (wind in the leaves, insects, microphone hiss), most of that scale is spent on the noise. This filter
// measures the steady part of the sound in each frequency band and turns it down, so the bird stands out.
//   - short-time Fourier transform, 1024-sample frames, 75 % overlap, square-root Hann window
//   - noise level per frequency band = a low percentile of that band's magnitude over the window
//     (a bird call is short-lived in its band, steady noise is there all the time)
//   - Wiener-style gain with a floor, smoothed over neighbouring frames and bands, then resynthesis
// Works on plain Float32Array, in the page or in a worker. Exposed as self.denoise(pcm, options).

(function (root) {
  const N = 1024, HOP = 256, BINS = N / 2 + 1;
  const win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = Math.sqrt(0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  const rev = new Uint32Array(N), bits = Math.log2(N);
  for (let k = 0; k < N; k++) { let r = 0; for (let b = 0; b < bits; b++) if (k & (1 << b)) r |= 1 << (bits - 1 - b); rev[k] = r; }
  const cosT = new Float32Array(N / 2), sinT = new Float32Array(N / 2);
  for (let j = 0; j < N / 2; j++) { cosT[j] = Math.cos((2 * Math.PI * j) / N); sinT[j] = Math.sin((2 * Math.PI * j) / N); }

  // in-place complex FFT; inverse when `inv` is true (unscaled)
  function fft(re, im, inv) {
    for (let i = 0; i < N; i++) { const j = rev[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let len = 1; len < N; len <<= 1) {
      const stride = N / (2 * len);
      for (let s = 0; s < N; s += 2 * len) {
        for (let j = 0; j < len; j++) {
          const wr = cosT[j * stride], wi = inv ? sinT[j * stride] : -sinT[j * stride];
          const a = s + j, b = a + len;
          const tr = re[b] * wr - im[b] * wi, ti = re[b] * wi + im[b] * wr;
          re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        }
      }
    }
  }

  /**
   * @param {Float32Array} x        one window of sound
   * @param {object} [o]
   * @param {number} [o.percentile] 0..1, which magnitude counts as "the noise" in a band (default 0.25)
   * @param {number} [o.over]       how much more than the measured noise is removed (default 2.5)
   * @param {number} [o.floor]      smallest gain, keeps a little of everything to avoid artefacts (default 0.12)
   */
  function denoise(x, o) {
    const percentile = (o && o.percentile) || 0.25, over = (o && o.over) || 2.5, floor = (o && o.floor) || 0.12;
    const frames = Math.max(1, Math.floor((x.length - N) / HOP) + 1);
    const re = new Float32Array(frames * N), im = new Float32Array(frames * N), mag = new Float32Array(frames * BINS);
    const fr = new Float32Array(N), fi = new Float32Array(N);
    for (let t = 0; t < frames; t++) {
      const off = t * HOP;
      for (let i = 0; i < N; i++) { fr[i] = x[off + i] * win[i]; fi[i] = 0; }
      fft(fr, fi, false);
      re.set(fr, t * N); im.set(fi, t * N);
      for (let f = 0; f < BINS; f++) mag[t * BINS + f] = Math.hypot(fr[f], fi[f]);
    }
    // noise level per band: low percentile over time
    const noise = new Float32Array(BINS), col = new Float32Array(frames), k = Math.min(frames - 1, Math.floor(percentile * frames));
    for (let f = 0; f < BINS; f++) { for (let t = 0; t < frames; t++) col[t] = mag[t * BINS + f]; const s = Array.prototype.slice.call(col).sort((a, b) => a - b); noise[f] = s[k]; }
    // gain per time-frequency cell
    const gain = new Float32Array(frames * BINS);
    for (let t = 0; t < frames; t++) for (let f = 0; f < BINS; f++) {
      const m = mag[t * BINS + f], n2 = over * noise[f] * noise[f];
      const g = m > 0 ? (m * m - n2) / (m * m) : 0;
      gain[t * BINS + f] = g > floor * floor ? Math.sqrt(g) : floor;
    }
    // smooth the gain over 3 frames x 3 bands, so isolated cells do not ring
    const sm = new Float32Array(frames * BINS);
    for (let t = 0; t < frames; t++) for (let f = 0; f < BINS; f++) {
      let s = 0, c = 0;
      for (let dt = -1; dt <= 1; dt++) for (let df = -1; df <= 1; df++) { const tt = t + dt, ff = f + df; if (tt >= 0 && tt < frames && ff >= 0 && ff < BINS) { s += gain[tt * BINS + ff]; c++; } }
      sm[t * BINS + f] = s / c;
    }
    // resynthesis by overlap-add
    const out = new Float32Array(x.length), norm = new Float32Array(x.length);
    for (let t = 0; t < frames; t++) {
      for (let f = 0; f < BINS; f++) {
        const g = sm[t * BINS + f];
        fr[f] = re[t * N + f] * g; fi[f] = im[t * N + f] * g;
        if (f > 0 && f < N / 2) { fr[N - f] = fr[f]; fi[N - f] = -fi[f]; }
      }
      fft(fr, fi, true);
      const off = t * HOP;
      for (let i = 0; i < N; i++) { out[off + i] += (fr[i] / N) * win[i]; norm[off + i] += win[i] * win[i]; }
    }
    for (let i = 0; i < out.length; i++) out[i] = norm[i] > 1e-3 ? out[i] / norm[i] : x[i];
    return out;
  }

  root.denoise = denoise;
})(typeof self !== 'undefined' ? self : globalThis);
