// Audio worklet: buffers microphone frames and hands them to the main thread in blocks of 2048 samples.
// Same approach as BirdNET Live (https://github.com/birdnet-team/real-time-pwa, MIT).
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.size = 2048;
    this.buf = new Float32Array(this.size);
    this.n = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        this.buf[this.n++] = ch[i];
        if (this.n >= this.size) { this.port.postMessage(this.buf.slice(0)); this.n = 0; }
      }
    }
    return true;
  }
}
registerProcessor('audio-processor', AudioProcessor);
