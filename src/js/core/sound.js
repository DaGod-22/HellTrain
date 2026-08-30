// ============================================================
// HELL TRAIN — AAA SOUND SYSTEM
// Procedural WebAudio synth for SFX + ambient
// ============================================================
export class SoundSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.master = 0.6;
    this.sfxVol = 0.8;
    this.musicVol = 0.4;
    this._init();
  }
  _init() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    } catch {}
  }
  _ensure() {
    if (!this.ctx) this._init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  playTone(freq, dur, type='sine', vol=0.3, slide=0) {
    if (!this.enabled || !this.ctx) return;
    this._ensure();
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.linearRampToValueAtTime(freq*slide, t+dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol*this.master*this.sfxVol, t+0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t+dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t+dur+0.05);
  }
  playNoise(dur, vol=0.2, filterFreq=1000) {
    if (!this.enabled || !this.ctx) return;
    this._ensure();
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i=0;i<bufferSize;i++) data[i] = (Math.random()*2-1)*0.5;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type='lowpass'; filter.frequency.value=filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol*this.master*this.sfxVol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t+dur);
    src.connect(filter); filter.connect(g); g.connect(this.ctx.destination);
    src.start(t);
  }
  // SFX presets
  hit(dmg=10, crit=false) {
    this.playTone(crit? 800:400, crit?0.25:0.12, crit?'square':'sine', crit?0.35:0.18, crit?0.5:1.2);
    if (crit) setTimeout(()=>this.playTone(1200,0.15,'sawtooth',0.2,0.6), 40);
  }
  shoot(kind='fire') {
    const map = {
      fire: [600,0.12,'square'], ice:[900,0.1,'sine'], lightning:[1200,0.08,'sawtooth'], orbital:[300,0.2,'triangle'],
      void:[220,0.22,'sine'], toxic:[340,0.16,'triangle'], spirit:[760,0.14,'sine'], explosive:[150,0.18,'square'],
      mirror:[1000,0.1,'triangle'], tech:[440,0.14,'sawtooth'], plasma:[820,0.09,'square'], physical:[180,0.12,'square'],
    };
    const [f,d,ty] = map[kind]||[500,0.1,'sine'];
    this.playTone(f,d,ty,0.15,1.5);
    if (kind==='void') setTimeout(()=>this.playTone(110,0.2,'sine',0.1,0.6),50);
    if (kind==='spirit') setTimeout(()=>this.playTone(1140,0.12,'sine',0.08,1.4),70);
  }
  pickup() { this.playTone(600,0.2,'sine',0.25,2); setTimeout(()=>this.playTone(900,0.2,'sine',0.2,1.5),80); }
  levelup() {
    this.playTone(400,0.3,'sine',0.3,2);
    setTimeout(()=>this.playTone(600,0.3,'sine',0.3,2),100);
    setTimeout(()=>this.playTone(900,0.5,'sine',0.35,1.5),200);
  }
  explosion(size=1) {
    this.playNoise(0.3*size, 0.25*size, 800);
    this.playTone(120,0.4*size,'sawtooth',0.4*size,0.3);
  }
  dash() { this.playTone(200,0.2,'sawtooth',0.2,3); }
  chest() {
    this.playTone(500,0.2,'triangle',0.3,1.5);
    setTimeout(()=>this.playTone(700,0.3,'triangle',0.3,1.8),120);
    setTimeout(()=>this.playTone(1000,0.4,'sine',0.35,1.2),250);
  }
  boss() {
    this.playTone(80,1.2,'sawtooth',0.5,0.5);
    this.playTone(120,0.8,'square',0.3,0.7);
  }
  death() {
    this.playTone(400,0.6,'sawtooth',0.35,0.3);
    setTimeout(()=>this.playNoise(0.5,0.2,400),100);
  }
  // Music drone
  playAmbient(realm='purgatory') {
    if (!this.ctx || !this.enabled) return;
    // simple ambient pad could be added
  }
}
export const SOUNDS = new SoundSystem();
