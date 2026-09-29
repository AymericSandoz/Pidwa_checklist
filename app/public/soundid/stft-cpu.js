// Spectrogram kernel computed on the processor instead of the graphics chip.
//
// BirdNET Live computes the short-time Fourier transform of the sound in a hand-written WebGL shader
// (birdnet-kernel.js). On some phones that shader returns wrong numbers: the rest of the model then sees
// a meaningless picture and answers with random species. One fragile spot is its window function,
// cos(2*pi*q/N) with q up to a million, which graphics chips may evaluate with very low precision.
// This file computes exactly the same quantity in plain JavaScript, identical on every device:
//   for each frame b and bin i in 0..N/2:  Re( FFT_N( x[b*step + n] * hann(n) ) )[i]
// Cost: about 4 million butterflies for the two spectrograms of one 3 s window, a few tens of milliseconds.

(function () {
  const plans = new Map();

  function plan(N) {
    let p = plans.get(N);
    if (p) return p;
    const M = N / 2, bits = Math.log2(M);
    const hann = new Float64Array(N);
    for (let n = 0; n < N; n++) hann[n] = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / N);
    const rev = new Uint32Array(M);
    for (let k = 0; k < M; k++) { let r = 0; for (let b = 0; b < bits; b++) if (k & (1 << b)) r |= 1 << (bits - 1 - b); rev[k] = r; }
    // twiddles for the complex FFT of size M: exp(-2*pi*i*j/M)
    const twRe = new Float64Array(M / 2), twIm = new Float64Array(M / 2);
    for (let j = 0; j < M / 2; j++) { twRe[j] = Math.cos((2 * Math.PI * j) / M); twIm[j] = -Math.sin((2 * Math.PI * j) / M); }
    // rotation used to rebuild the real transform of size N from the complex one of size M
    const rotC = new Float64Array(M + 1), rotS = new Float64Array(M + 1);
    for (let i = 0; i <= M; i++) { const t = (-Math.PI * i) / M; rotC[i] = Math.cos(t); rotS[i] = Math.sin(t); }
    p = { M, hann, rev, twRe, twIm, rotC, rotS, re: new Float64Array(M), im: new Float64Array(M) };
    plans.set(N, p);
    return p;
  }

  /** x: Float32Array signal; returns Float32Array [batch * (N/2 + 1)], same layout as the WebGL kernel. */
  function stftReal(x, N, step) {
    const { M, hann, rev, twRe, twIm, rotC, rotS, re, im } = plan(N);
    const batch = ((x.length - N + step) / step) | 0;
    const out = new Float32Array(batch * (M + 1));
    for (let b = 0; b < batch; b++) {
      const off = b * step;
      // pack even samples as real parts and odd samples as imaginary parts, in bit-reversed order
      for (let k = 0; k < M; k++) {
        const r = rev[k];
        re[r] = x[off + 2 * k] * hann[2 * k];
        im[r] = x[off + 2 * k + 1] * hann[2 * k + 1];
      }
      for (let len = 1; len < M; len <<= 1) {
        const stride = M / (2 * len);
        for (let start = 0; start < M; start += 2 * len) {
          for (let j = 0; j < len; j++) {
            const wr = twRe[j * stride], wi = twIm[j * stride];
            const a = start + j, c = a + len;
            const tr = re[c] * wr - im[c] * wi, ti = re[c] * wi + im[c] * wr;
            re[c] = re[a] - tr; im[c] = im[a] - ti;
            re[a] += tr; im[a] += ti;
          }
        }
      }
      const row = b * (M + 1);
      for (let i = 0; i <= M; i++) {
        const zi = i % M, ci = (M - i) % M;
        const zr = re[zi], zim = im[zi], cr = re[ci], cim = -im[ci];
        out[row + i] = 0.5 * (zr + cr + rotC[i] * (zim - cim) + rotS[i] * (zr - cr));
      }
    }
    return { out, batch, bins: M + 1 };
  }

  const gpuKernel = tf.getKernel('STFT', 'webgl'); // the shader version registered by birdnet-kernel.js
  const cpuKernel = {
    kernelName: 'STFT',
    backendName: 'webgl',
    kernelFunc: ({ backend, inputs: { signal, frameLength, frameStep } }) => {
      const x = backend.readSync(signal.dataId);
      const { out, batch, bins } = stftReal(x, frameLength, frameStep);
      return backend.makeTensorInfo([batch, bins], 'float32', out);
    },
  };

  // The other engines have no shader at all: they always use the processor version.
  for (const name of ['wasm', 'cpu']) {
    tf.registerKernel({
      kernelName: 'STFT',
      backendName: name,
      kernelFunc: ({ backend, inputs: { signal, frameLength, frameStep } }) => {
        const x = backend.readSync(signal.dataId);
        const { out, batch, bins } = stftReal(x, frameLength, frameStep);
        if (name === 'wasm') { const t = backend.makeOutput([batch, bins], 'float32'); backend.typedArrayFromHeap(t).set(out); return t; }
        return backend.makeTensorInfo([batch, bins], 'float32', out);
      },
    });
  }

  self.stft = {
    stftReal,
    mode: 'gpu',
    use(mode) {
      try { tf.unregisterKernel('STFT', 'webgl'); } catch (e) { /* not registered */ }
      tf.registerKernel(mode === 'cpu' ? cpuKernel : gpuKernel);
      self.stft.mode = mode;
    },
    /** Largest difference between the shader and the processor on a test signal, relative to the largest value. */
    async compare() {
      let seed = 99;
      const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
      const n = 144000, x = new Float32Array(n);
      for (let i = 0; i < n; i++) x[i] = 0.4 * Math.sin((2 * Math.PI * (800 + (2200 * i) / n) * i) / 48000) + 0.3 * Math.sin((2 * Math.PI * 5200 * i) / 48000) + 0.1 * rnd();
      const res = [];
      for (const [N, step] of [[2048, 278], [1024, 280]]) {
        const ref = stftReal(x, N, step);
        const t = tf.tensor1d(x);
        const info = gpuKernel.kernelFunc({ backend: tf.backend(), inputs: { signal: t, frameLength: N, frameStep: step }, attrs: {} });
        const gpu = await tf.backend().read(info.dataId);
        tf.backend().disposeIntermediateTensorInfo(info); t.dispose();
        let maxRef = 0, maxDiff = 0, sumDiff = 0;
        for (let i = 0; i < ref.out.length; i++) { const d = Math.abs(ref.out[i] - gpu[i]); if (d > maxDiff) maxDiff = d; sumDiff += d; const a = Math.abs(ref.out[i]); if (a > maxRef) maxRef = a; }
        res.push({ N, maxRel: maxDiff / maxRef, meanRel: sumDiff / ref.out.length / maxRef });
      }
      return res;
    },
  };
})();
