// ============================================================
// HELL TRAIN — RENDER PIPELINE
// Deferred-ish 2D lighting + bloom + colour grading + CRT juice,
// all at the native low internal resolution so every effect
// stays perfectly pixel-locked.
//
//   scene  -> light buffer (multiply) -> bloom (screen)
//          -> grade -> vignette -> aberration -> scanlines -> flash
// ============================================================
import { makeCanvas } from './pixel.js';

const TAU = Math.PI * 2;

export class Renderer {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.scene = makeCanvas(w, h);
    this.sctx = this.scene.getContext('2d');
    this.light = makeCanvas(w, h);
    this.lctx = this.light.getContext('2d');
    this.bloomA = makeCanvas(Math.ceil(w / 2), Math.ceil(h / 2));
    this.bactx = this.bloomA.getContext('2d');
    this.bloomB = makeCanvas(Math.ceil(w / 2), Math.ceil(h / 2));
    this.bbctx = this.bloomB.getContext('2d');
    this.tmp = makeCanvas(w, h);
    this.tctx = this.tmp.getContext('2d');
    for (const c of [this.sctx, this.lctx, this.bactx, this.bbctx, this.tctx]) c.imageSmoothingEnabled = false;
    this.lights = [];
    this.quality = 'high';       // high | medium | low
    this.settings = {
      bloom: 0.55, lighting: 1, grade: 1, vignette: 0.5, scanlines: 0, aberration: 0.5, grain: 0,
    };
    this._gradCache = new Map();
  }

  resize(w, h) {
    if (this.w === w && this.h === h) return;
    this.w = w; this.h = h;
    this.scene = makeCanvas(w, h); this.sctx = this.scene.getContext('2d');
    this.light = makeCanvas(w, h); this.lctx = this.light.getContext('2d');
    this.bloomA = makeCanvas(Math.ceil(w / 2), Math.ceil(h / 2)); this.bactx = this.bloomA.getContext('2d');
    this.bloomB = makeCanvas(Math.ceil(w / 2), Math.ceil(h / 2)); this.bbctx = this.bloomB.getContext('2d');
    this.tmp = makeCanvas(w, h); this.tctx = this.tmp.getContext('2d');
  }

  // ---- frame lifecycle ----
  begin() {
    this.lights.length = 0;
    this.sctx.setTransform(1, 0, 0, 1, 0, 0);
    this.sctx.clearRect(0, 0, this.w, this.h);
    return this.sctx;
  }

  // Screen-space light. r in screen px.
  addLight(x, y, r, color = '#ffffff', intensity = 1, flicker = 0) {
    this.lights.push({ x, y, r, color, intensity, flicker });
  }

  _radial(ctx, x, y, r, color, intensity) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, r));
    g.addColorStop(0, color);
    g.addColorStop(0.45, hexA(color, 0.55 * intensity));
    g.addColorStop(1, hexA(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }

  // ---- composite everything onto the visible context ----
  composite(out, opts = {}) {
    const { w, h } = this;
    const S = this.settings;
    const ambient = opts.ambient || '#ffffff';
    const gradeCol = opts.grade || null;
    const gradeAmt = (opts.gradeAmount ?? 0.18) * S.grade;
    const flash = opts.flash || null;
    const time = opts.time || 0;
    const aberration = (opts.aberration || 0) * S.aberration;

    // 1) lighting pass -------------------------------------------------
    if (S.lighting && ambient !== '#ffffff' && this.lights.length >= 0) {
      const l = this.lctx;
      l.globalCompositeOperation = 'source-over';
      l.fillStyle = ambient;
      l.fillRect(0, 0, w, h);
      l.globalCompositeOperation = 'lighter';
      for (const li of this.lights) {
        let inten = li.intensity;
        if (li.flicker) inten *= 1 - li.flicker * 0.5 * (0.5 + 0.5 * Math.sin(time * 37 + li.x));
        this._radial(l, li.x, li.y, li.r, li.color, inten);
      }
      l.globalCompositeOperation = 'source-over';
      this.sctx.globalCompositeOperation = 'multiply';
      this.sctx.drawImage(this.light, 0, 0);
      this.sctx.globalCompositeOperation = 'source-over';
    }

    // 2) AAA bloom — multi-pass, brighter, more glow ---------------------------------
    if (S.bloom > 0 && this.quality !== 'low') {
      const bw = this.bloomA.width, bh = this.bloomA.height;
      const a = this.bactx, b = this.bbctx;
      a.setTransform(1, 0, 0, 1, 0, 0);
      a.globalCompositeOperation = 'source-over';
      a.clearRect(0, 0, bw, bh);
      // bright-pass: scene * scene * scene for stronger bloom
      a.drawImage(this.scene, 0, 0, bw, bh);
      a.globalCompositeOperation = 'multiply';
      a.drawImage(this.bloomA, 0, 0);
      a.drawImage(this.bloomA, 0, 0);
      a.drawImage(this.bloomA, 0, 0);
      a.globalCompositeOperation = 'source-over';
      // blur — 2 iterations box blur for AAA soft glow
      b.clearRect(0, 0, bw, bh);
      b.globalAlpha = 0.28;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) b.drawImage(this.bloomA, dx, dy);
      b.globalAlpha = 0.24;
      for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2], [-2,0],[2,0],[0,-2],[0,2]]) b.drawImage(this.bloomA, dx, dy);
      // second blur pass for extra softness
      a.clearRect(0,0,bw,bh);
      a.globalAlpha=0.5; a.drawImage(this.bloomB,0,0);
      a.globalAlpha=0.25;
      for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) a.drawImage(this.bloomB,dx,dy);
      a.globalAlpha=1;
      // composite with additive + screen for AAA look
      this.sctx.globalCompositeOperation = 'lighter';
      this.sctx.globalAlpha = 0.55 * S.bloom * (opts.bloomBoost || 1);
      this.sctx.drawImage(this.bloomA, 0, 0, w, h);
      this.sctx.globalAlpha = 0.35 * S.bloom * (opts.bloomBoost || 1);
      this.sctx.drawImage(this.bloomB, 0, 0, w, h);
      this.sctx.globalAlpha = 1;
      this.sctx.globalCompositeOperation = 'source-over';
    }

    // 3) blit to output with optional chromatic aberration ---------------
    out.setTransform(1, 0, 0, 1, 0, 0);
    out.imageSmoothingEnabled = false;
    out.clearRect(0, 0, w, h);
    if (aberration > 0.05) {
      out.globalCompositeOperation = 'source-over';
      out.drawImage(this.scene, 0, 0);
      out.globalCompositeOperation = 'lighter';
      out.globalAlpha = 0.35 * Math.min(1, aberration);
      out.drawImage(this.scene, -Math.round(aberration), 0);
      out.drawImage(this.scene, Math.round(aberration), 0);
      out.globalAlpha = 1;
      out.globalCompositeOperation = 'source-over';
    } else {
      out.drawImage(this.scene, 0, 0);
    }

    // 4) colour grade ----------------------------------------------------
    if (gradeCol && gradeAmt > 0.01) {
      out.globalCompositeOperation = 'soft-light';
      out.globalAlpha = Math.min(1, gradeAmt * 3);
      out.fillStyle = gradeCol;
      out.fillRect(0, 0, w, h);
      out.globalAlpha = 1;
      out.globalCompositeOperation = 'source-over';
    }

    // 5) AAA vignette + subtle film grain ----------------------------------------
    if (S.vignette > 0) {
      const key = 'vig' + w + 'x' + h;
      let g = this._gradCache.get(key);
      if (!g) {
        g = out.createRadialGradient(w / 2, h / 2, h * 0.22, w / 2, h / 2, h * 0.88);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.6, 'rgba(0,0,0,0.15)');
        g.addColorStop(1, 'rgba(0,0,0,0.55)');
        this._gradCache.set(key, g);
      }
      out.globalAlpha = S.vignette;
      out.fillStyle = g;
      out.fillRect(0, 0, w, h);
      out.globalAlpha = 1;
      // film grain
      if (S.grain !== 0 || true) {
        out.globalAlpha = 0.04;
        for (let i=0;i<120;i++) {
          const gx = (Math.random()*w)|0, gy=(Math.random()*h)|0;
          out.fillStyle = Math.random()>0.5 ? '#ffffff' : '#000000';
          out.fillRect(gx,gy,1,1);
        }
        out.globalAlpha = 1;
      }
    }

    // 6) scanlines + grain -------------------------------------------------
    if (S.scanlines > 0 && this.quality === 'high') {
      out.globalAlpha = 0.09 * S.scanlines;
      out.fillStyle = '#000000';
      for (let y = 0; y < h; y += 2) out.fillRect(0, y, w, 1);
      out.globalAlpha = 1;
    }

    // 7) full-screen flash --------------------------------------------------
    if (flash && flash.a > 0.01) {
      out.globalCompositeOperation = flash.additive === false ? 'source-over' : 'lighter';
      out.globalAlpha = Math.min(1, flash.a);
      out.fillStyle = flash.color || '#ffffff';
      out.fillRect(0, 0, w, h);
      out.globalAlpha = 1;
      out.globalCompositeOperation = 'source-over';
    }
  }
}

export function hexA(hex, a) {
  if (hex.startsWith('rgba')) return hex;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ============================================================
// CAMERA — trauma shake, zoom punch, velocity lookahead
// ============================================================
export class GameCamera {
  // NOTE: zoom is deliberately kept to whole numbers. A fractional zoom
  // (the old 1.55) resamples every sprite onto a non-integer grid, so one
  // source pixel becomes 1 screen pixel here and 2 there — that uneven
  // sampling is exactly what reads as "blurry" in pixel art.
  constructor(w, h, zoom = 2) {
    this.w = w; this.h = h;
    this.x = 0; this.y = 0;
    this.zoom = Math.max(1, Math.round(zoom)); this.baseZoom = this.zoom; this.zoomPunch = 0;
    this.trauma = 0; this.traumaDecay = 1.6;
    this.rot = 0;
    this.t = 0;
    this.offX = 0; this.offY = 0;
    this.lookX = 0; this.lookY = 0;
  }
  shake(amount) { this.trauma = Math.min(1, this.trauma + amount); }
  punch(amount) { this.zoomPunch = Math.min(0.35, this.zoomPunch + amount); }
  follow(x, y, dt, vx = 0, vy = 0) {
    this.lookX += ((vx * 0.12) - this.lookX) * Math.min(1, dt * 3);
    this.lookY += ((vy * 0.12) - this.lookY) * Math.min(1, dt * 3);
    const tx = x + this.lookX, ty = y + this.lookY;
    const k = Math.min(1, dt * 7.5);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;
  }
  update(dt) {
    this.t += dt;
    this.trauma = Math.max(0, this.trauma - this.traumaDecay * dt);
    this.zoomPunch *= Math.pow(0.0025, dt);
    const s = this.trauma * this.trauma;
    const n = (a, b) => Math.sin(this.t * a) * Math.sin(this.t * b);
    // shake offsets are snapped to whole screen pixels too
    this.offX = Math.round(s * 7 * n(51.3, 13.7));
    this.offY = Math.round(s * 7 * n(43.1, 17.3));
    this.rot = s * 0.02 * n(31.7, 11.3);
    // punch stays on the integer grid: it steps 2x -> 3x, never 2.14x
    this.zoom = this.baseZoom + (this.zoomPunch > 0.16 ? 1 : 0);
  }
  apply(ctx) {
    // Snap the camera to whole world pixels before scaling, so sprite edges
    // always land exactly on the pixel grid.
    const cx = Math.round(this.x), cy = Math.round(this.y);
    ctx.translate(Math.round(this.w / 2), Math.round(this.h / 2));
    if (this.rot) ctx.rotate(this.rot);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-cx + Math.round(this.offX / this.zoom), -cy + Math.round(this.offY / this.zoom));
  }
  worldToScreen(x, y) {
    const cx = Math.round(this.x), cy = Math.round(this.y);
    return {
      x: (x - cx) * this.zoom + Math.round(this.w / 2) + this.offX,
      y: (y - cy) * this.zoom + Math.round(this.h / 2) + this.offY,
    };
  }
  screenToWorld(x, y) {
    return {
      x: (x - this.w / 2 - this.offX) / this.zoom + this.x,
      y: (y - this.h / 2 - this.offY) / this.zoom + this.y,
    };
  }
  get shakeAmount() { return this.trauma; }
}

// ============================================================
// HITSTOP — global time dilation on impact (the single biggest
// "AAA feel" upgrade a 2D action game can get)
// ============================================================
export class TimeFlow {
  constructor() { this.stop = 0; this.slow = 0; this.slowFactor = 0.35; }
  hit(amount = 0.045) { this.stop = Math.max(this.stop, amount); }
  slowmo(dur, factor = 0.35) { this.slow = Math.max(this.slow, dur); this.slowFactor = factor; }
  scale(dt) {
    if (this.stop > 0) { this.stop -= dt; return 0; }
    if (this.slow > 0) { this.slow -= dt; return dt * this.slowFactor; }
    return dt;
  }
}
