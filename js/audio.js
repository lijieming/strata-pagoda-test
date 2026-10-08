/* ============================================================
   audio.js — tiny WebAudio bell & bamboo clack (no assets)
   ============================================================ */
"use strict";

const Audio = {
  ctx: null,
  ready() {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      this.ctx = new AC();
      return true;
    } catch (e) { return false; }
  },
  resume() {
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  },
  tone(freq, dur, gain, type, delay, detune) {
    const c = this.ctx;
    if (!c) return;
    const t0 = c.currentTime + (delay || 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (detune) osc.detune.setValueAtTime(detune, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  },
  bell() {
    if (!Flags.sound || !this.ready()) return;
    this.resume();
    // bronze bell: inharmonic partials, long decay
    const parts = [[196, 3.2, 0.16], [262, 2.6, 0.11], [393, 1.9, 0.075],
                   [523, 1.3, 0.05], [698, 0.9, 0.03], [1046, 0.6, 0.018]];
    for (const [f, d, g] of parts) this.tone(f, d, g, "sine", 0, (Math.random() - 0.5) * 8);
    this.tone(98, 2.4, 0.09, "triangle", 0, 0);
  },
  clack() {
    if (!Flags.sound || !this.ready()) return;
    this.resume();
    const c = this.ctx;
    const t0 = c.currentTime;
    // short filtered noise burst = bamboo on stone
    const len = Math.floor(c.sampleRate * 0.09);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const env = Math.pow(1 - i / len, 3);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = 1750; bp.Q.value = 2.2;
    const g = c.createGain();
    g.gain.value = 0.22;
    src.connect(bp).connect(g).connect(c.destination);
    src.start(t0);
    this.tone(1180, 0.16, 0.05, "triangle", 0, 0);
  },
  plop() {
    if (!Flags.sound || !this.ready()) return;
    this.resume();
    const c = this.ctx;
    const t0 = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(620, t0);
    osc.frequency.exponentialRampToValueAtTime(180, t0 + 0.16);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.13, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
    osc.connect(g).connect(c.destination);
    osc.start(t0); osc.stop(t0 + 0.3);
  },
};
