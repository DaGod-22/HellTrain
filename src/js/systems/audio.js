// ============================================================
// HELL TRAIN — audio architecture
// Procedurally-generated music & SFX using WebAudio. The synth
// architecture is small but expressive enough to deliver the
// requested per-realm ambience without shipping audio assets.
// ============================================================

class SimpleReverb {
  constructor(ctx, seconds = 1.5, decay = 2) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    const len = Math.floor(ctx.sampleRate * seconds);
    this.buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = this.buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    this.convolver = ctx.createConvolver();
    this.convolver.buffer = this.buf;
    this.input.connect(this.convolver);
    this.convolver.connect(this.output);
    this.output.gain.value = 0.4;
  }
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.music = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.enabled = true;
  }
  ensure() {
    if (this.ctx) return;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    this.ctx = new C();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.4;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.6;
    this.sfxGain.connect(this.master);
    this.reverb = new SimpleReverb(this.ctx);
  }
  resume() { this.ensure(); if (this.ctx?.state === 'suspended') this.ctx.resume(); }
  setMusicVolume(v) { this.ensure(); this.musicGain.gain.value = v; }
  setSfxVolume(v) { this.ensure(); this.sfxGain.gain.value = v; }

  // ====== Generic tone ======
  tone(freq, dur, type = 'square', gain = 0.2, attack = 0.005, release = 0.1, slideTo = null) {
    this.ensure(); if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + dur);
    const g = this.ctx.createGain();
    g.gain.value = 0; g.gain.linearRampToValueAtTime(gain, this.ctx.currentTime + attack);
    g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + dur - release);
    o.connect(g); g.connect(this.sfxGain);
    o.start(); o.stop(this.ctx.currentTime + dur);
  }
  noise(dur, gain = 0.1, filterFreq = 1000, attack = 0.005) {
    this.ensure(); if (!this.ctx) return;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const filt = this.ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = filterFreq;
    const g = this.ctx.createGain(); g.gain.value = 0;
    g.gain.linearRampToValueAtTime(gain, this.ctx.currentTime + attack);
    g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + dur);
    src.connect(filt); filt.connect(g); g.connect(this.sfxGain);
    src.start();
  }

  // ====== SFX presets ======
  hit() { this.tone(220, 0.06, 'square', 0.18); this.noise(0.06, 0.12, 1500); }
  crit() { this.tone(440, 0.1, 'sawtooth', 0.2); this.tone(660, 0.1, 'square', 0.18); }
  shoot() { this.tone(880, 0.05, 'square', 0.15); }
  fireball() { this.tone(200, 0.18, 'sawtooth', 0.18, 0.005, 0.05); this.tone(120, 0.2, 'square', 0.15); }
  lightning() { this.tone(1800, 0.08, 'sawtooth', 0.22); this.tone(2400, 0.06, 'square', 0.2); this.noise(0.08, 0.15, 3000); }
  explosion() { this.tone(80, 0.3, 'square', 0.3); this.noise(0.4, 0.3, 800); }
  pickup() { this.tone(660, 0.05, 'square', 0.18); setTimeout(() => this.tone(990, 0.06, 'square', 0.16), 30); }
  levelup() { this.tone(440, 0.08); this.tone(660, 0.08); this.tone(880, 0.12); }
  rarePickup() { this.tone(880, 0.1); this.tone(1100, 0.1); this.tone(1320, 0.16); }
  bossIntro() { this.tone(110, 0.5, 'sawtooth', 0.3); this.tone(82, 0.6, 'square', 0.3); this.noise(0.4, 0.2, 400); }
  death() { this.tone(220, 0.5, 'sawtooth', 0.25); this.tone(110, 0.8, 'square', 0.25); }
  victory() { this.tone(660, 0.1); this.tone(880, 0.1); this.tone(1100, 0.2); }
  dodge() { this.tone(660, 0.04, 'square', 0.15); this.tone(1200, 0.05, 'square', 0.12); }
  trainWhistle() { this.tone(440, 0.4, 'sawtooth', 0.22); this.tone(660, 0.4, 'sine', 0.2); }

  // ====== Music loop (simple, no assets) ======
  startMusic(track) {
    this.ensure(); if (!this.ctx) return;
    if (this.music) { try { this.music.stop(); } catch {} }
    this.music = { stop: () => {} };
    this._musicTrack = track;
    this._musicT = 0;
    this._musicStep = 0;
    this._musicNodes = [];
    this._scheduleMusic();
  }
  _scheduleMusic() {
    if (!this.ctx) return;
    const t = this._musicTrack;
    const bpm = t === 'boss' ? 110 : t === 'terminus' ? 90 : 80;
    const beat = 60 / bpm;
    // Sequence notes (pentatonic, mood varies per track)
    const seqs = {
      purgatory: [220, 247, 277, 330, 294, 277, 247, 220],
      infernal:  [110, 110, 147, 110, 165, 110, 196, 110],
      forgotten: [220, 277, 220, 330, 220, 277, 247, 196],
      forest:    [247, 294, 330, 370, 330, 294, 247, 220],
      frozen:    [330, 370, 440, 370, 330, 277, 247, 220],
      desert:    [147, 175, 196, 220, 196, 175, 147, 110],
      void:      [110, 138, 110, 165, 110, 196, 110, 220],
      terminus:  [82, 110, 82, 147, 82, 165, 82, 196],
      boss:      [110, 110, 165, 110, 220, 110, 247, 110],
      menu:      [220, 247, 277, 330, 277, 247, 220, 196],
    };
    const seq = seqs[t] || seqs.purgatory;
    const step = beat / 2;
    const startT = this.ctx.currentTime + 0.05;
    for (let i = 0; i < 16; i++) {
      const note = seq[i % seq.length] * (i % 2 === 0 ? 1 : 0.5);
      const when = startT + i * step;
      const o = this.ctx.createOscillator();
      o.type = t === 'void' ? 'sawtooth' : t === 'infernal' ? 'square' : 'triangle';
      o.frequency.value = note;
      const g = this.ctx.createGain();
      g.gain.value = 0;
      g.gain.linearRampToValueAtTime(0.12, when + 0.01);
      g.gain.linearRampToValueAtTime(0, when + step * 0.9);
      o.connect(g); g.connect(this.musicGain);
      o.start(when); o.stop(when + step);
      this._musicNodes.push(o);
    }
    // Drums: noise on every other beat
    for (let i = 0; i < 8; i++) {
      const when = startT + i * beat;
      const src = this.ctx.createBufferSource();
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.06, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * (1 - j / d.length);
      src.buffer = buf;
      const filt = this.ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 220;
      const g = this.ctx.createGain(); g.gain.value = 0.18;
      src.connect(filt); filt.connect(g); g.connect(this.musicGain);
      src.start(when);
    }
    // Schedule the next loop
    setTimeout(() => {
      if (this._musicTrack === t) this._scheduleMusic();
    }, beat * 16 * 1000 - 200);
  }
  stopMusic() { this._musicTrack = null; if (this.music) { try { this.music.stop(); } catch {} } }
}
