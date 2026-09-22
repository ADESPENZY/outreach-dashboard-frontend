// AudioWorklet: captured tab audio → linear16 PCM for the live copilot.
//
// Runs on the audio thread (loaded with audioWorklet.addModule; it is served as
// a plain file via `?url`, so it must stay self-contained — no imports).
//
// In:  128-sample Float32 render quanta at the AudioContext's rate, 1+ channels.
// Out: port.postMessage(ArrayBuffer) — 80 ms of 16 kHz mono signed 16-bit
//      little-endian PCM (1280 samples = 2560 bytes), exactly what the sidecar
//      forwards to Deepgram.
//
// The page asks for a 16 kHz AudioContext, so normally this is a straight
// Float32→Int16 conversion. If the browser gives us another rate anyway, each
// output sample is the average of the input samples it covers (a box filter:
// crude, but enough anti-aliasing for speech recognition).

const TARGET_RATE = 16000;
const FRAME_SAMPLES = 1280;   // 80 ms at 16 kHz → 2560 bytes

class Pcm16Encoder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.step = sampleRate / TARGET_RATE;   // input samples per output sample (1 at 16 kHz)
    this.frame = new Int16Array(FRAME_SAMPLES);
    this.filled = 0;
    this.acc = 0;        // running sum for the current output sample
    this.accCount = 0;
    this.pos = 0;        // fractional progress through the current output sample
  }

  push(value) {
    const s = Math.max(-1, Math.min(1, value));
    this.frame[this.filled++] = s < 0 ? s * 0x8000 : s * 0x7fff;
    if (this.filled === FRAME_SAMPLES) {
      const out = this.frame.buffer;
      this.port.postMessage(out, [out]);          // transfer, no copy
      this.frame = new Int16Array(FRAME_SAMPLES);
      this.filled = 0;
    }
  }

  process(inputs) {
    const channels = inputs[0];
    if (!channels || channels.length === 0) return true;   // no audio this quantum
    const n = channels[0].length;
    for (let i = 0; i < n; i++) {
      let mono = 0;
      for (let c = 0; c < channels.length; c++) mono += channels[c][i];
      mono /= channels.length;

      if (this.step === 1) {
        this.push(mono);
        continue;
      }
      this.acc += mono;
      this.accCount += 1;
      this.pos += 1;
      if (this.pos >= this.step) {
        this.push(this.acc / this.accCount);
        this.acc = 0;
        this.accCount = 0;
        this.pos -= this.step;
      }
    }
    return true;   // keep processing for as long as the node is connected
  }
}

registerProcessor('pcm16-encoder', Pcm16Encoder);
