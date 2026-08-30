// ============================================================
// HELL TRAIN — FX SYSTEM
// Particles, sprite explosions, shockwaves, decals, afterimages,
// arcs, floating combat text. Every emitter can push a dynamic
// light into the renderer for that expensive-looking glow.
// ============================================================
import { rand, randInt, TAU } from '../core/utils.js';
import { hexA } from '../core/render.js';
export { GameCamera as Camera } from '../core/render.js';

const P_SPARK = 0, P_SMOKE = 1, P_EMBER = 2, P_SHARD = 3, P_BLOOD = 4, P_GLOW = 5, P_DUSTLINE = 6;
// screen-space wind — sweeps disintegration debris across the battlefield
const WIND = () => Math.sin(Date.now() / 1700) * 34 + 14;

export class FXSystem {
  constructor(max = 3000, sprites = null) {
    this.max = max;
    this.list = [];
    this.decals = [];
    this.anims = [];      // sprite-sheet effects
    this.rings = [];      // shockwaves
    this.arcs = [];       // lightning
    this.texts = [];
    this.afterimages = [];
    this.beams = [];
    this.sprites = sprites;
    this.shake = 0; this.shakeT = 0;
    this.flashes = [];
    this.screenFlash = { a: 0, color: '#ffffff' };
    this.lights = [];     // per-frame collected lights (world space)
    this.aberration = 0;
    this.damageNumbers = true; // gated by save.settings.damageNumbers
    this._bannerCount = 0;
  }
  setSprites(s) { this.sprites = s; }

  // ---------- emitters ----------
  spawn(o) {
    if (this.list.length >= this.max) this.list.shift();
    this.list.push({
      x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0,
      life: o.life || 0.5, t: o.life || 0.5,
      color: o.color || '#ffffff', color2: o.color2 || null,
      size: o.size || 1.5, endSize: o.endSize ?? null,
      gravity: o.gravity || 0, drag: o.drag ?? 0.94,
      kind: o.kind ?? P_SPARK, additive: o.additive ?? true,
      light: o.light || 0, spin: o.spin || 0, ang: o.ang || 0,
      alpha: 1, fade: o.fade ?? true, trail: o.trail || 0,
    });
  }

  burst(x, y, color, n = 12, opts = {}) {
    const spd = opts.spd || 120;
    for (let i = 0; i < n; i++) {
      const a = opts.ang !== undefined ? opts.ang + rand(-0.5, 0.5) * (opts.cone || TAU) : rand(0, TAU);
      const s = spd * rand(0.35, 1);
      this.spawn({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        color, color2: opts.color2, life: (opts.life || 0.5) * rand(0.7, 1.3),
        size: opts.size || rand(1, 2.4), endSize: 0.5, gravity: opts.gravity || 0,
        drag: opts.drag ?? 0.9, kind: P_SPARK, light: opts.light || 0,
      });
    }
  }
  sparks(x, y, color, n, ang, cone = 0.6, spd = 180) {
    for (let i = 0; i < n; i++) {
      const a = ang + rand(-cone, cone);
      const s = spd * rand(0.4, 1.2);
      this.spawn({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, life: rand(0.2, 0.45),
        size: rand(1, 2), endSize: 0.4, drag: 0.86, gravity: 120 });
    }
  }
  fire(x, y, color = '#ff7a33') {
    for (let i = 0; i < 3; i++) {
      this.spawn({ x: x + rand(-3, 3), y, vx: rand(-14, 14), vy: rand(-60, -20), color,
        color2: '#ffe066', life: rand(0.4, 0.8), size: rand(1.5, 3), endSize: 0.4,
        gravity: -30, kind: P_EMBER, light: 0.35 });
    }
  }
  smoke(x, y, color = '#8a8aa0', n = 4) {
    for (let i = 0; i < n; i++) {
      this.spawn({ x: x + rand(-3, 3), y: y + rand(-2, 2), vx: rand(-12, 12), vy: rand(-30, -10),
        color, life: rand(0.8, 1.6), size: rand(2, 4), endSize: 6, drag: 0.95,
        kind: P_SMOKE, additive: false });
    }
  }
  embers(x, y, color = '#ffb040', n = 3) {
    for (let i = 0; i < n; i++) {
      this.spawn({ x: x + rand(-5, 5), y, vx: rand(-10, 10), vy: rand(-32, -8), color,
        life: rand(0.9, 1.8), size: rand(0.8, 1.6), kind: P_EMBER, light: 0.2, gravity: -8 });
    }
  }
  dust(x, y, color = '#cfd4e0', n = 3) {
    for (let i = 0; i < n; i++) {
      this.spawn({ x: x + rand(-6, 6), y: y + rand(-2, 2), vx: rand(-25, 25), vy: rand(-18, -4),
        color, life: rand(0.3, 0.6), size: rand(1, 2), endSize: 2.5, drag: 0.88,
        additive: false, kind: P_SMOKE });
    }
  }
  // v1.8 DISINTEGRATION: the defeated fragment into burning neon embers
  // and charcoal dust lines that the screen-space wind carries away.
  disintegrate(x, y, color = '#ff7a55', r = 8) {
    const embers = Math.min(26, 8 + Math.round(r * 0.9));
    for (let i = 0; i < embers; i++) {
      const a = rand(0, TAU), sp = rand(26, 130) * (0.7 + r / 18);
      this.spawn({
        x: x + rand(-r * 0.5, r * 0.5), y: y + rand(-r * 0.5, r * 0.5),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(10, 46),
        color: i % 4 === 0 ? '#ffffff' : i % 2 ? color : '#ff3b46',
        color2: '#28f0e0',
        life: rand(0.5, 1.25), size: rand(1.2, 2.6), endSize: 0.4,
        gravity: -46, drag: 0.955, kind: P_EMBER, light: 0.3, spin: 0,
      });
    }
    for (let i = 0; i < Math.min(14, 5 + Math.round(r * 0.5)); i++) {
      const a = rand(0, TAU), sp = rand(18, 90);
      this.spawn({
        x: x + rand(-r * 0.4, r * 0.4), y: y + rand(-r * 0.4, r * 0.4),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        color: '#15121a', life: rand(0.4, 0.9), size: rand(2.4, 4.4), endSize: 0.8,
        drag: 0.9, kind: P_DUSTLINE, additive: false,
        ang: a, spin: 0,
      });
    }
  }

  blood(x, y, color = '#a01f12', n = 8) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(30, 150);
      this.spawn({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, life: rand(0.3, 0.7),
        size: rand(1, 2.2), gravity: 220, drag: 0.92, additive: false, kind: P_BLOOD });
    }
  }
  sparkle(x, y, color = '#a8d4f4') {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + rand(0, 1);
      this.spawn({ x, y, vx: Math.cos(a) * 34, vy: Math.sin(a) * 34 - 12, color,
        life: 0.35, size: 1.6, endSize: 0.2, drag: 0.88, light: 0.15 });
    }
  }
  shard(x, y, color, n = 6) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(40, 160);
      this.spawn({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, life: rand(0.3, 0.8),
        size: rand(1.4, 2.6), endSize: 0.2, drag: 0.9, kind: P_SHARD, spin: rand(-8, 8) });
    }
  }
  trailPuff(x, y, color, size = 2) {
    this.spawn({ x, y, vx: rand(-8, 8), vy: rand(-8, 8), color, life: 0.28, size,
      endSize: 0.2, drag: 0.85, light: 0.1 });
  }

  // ---------- big effects ----------
  explosion(x, y, kind = 'explFire', scale = 1, opts = {}) {
    this.anims.push({ x, y, kind, t: 0, speed: opts.speed || 22, scale, rot: opts.rot || 0,
      light: opts.light ?? 1, lightColor: opts.lightColor || '#ffb060' });
    this.ring(x, y, opts.ringR || 34 * scale, opts.ringColor || '#ffffff', opts.ringLife || 0.32);
    this.burst(x, y, opts.sparkColor || '#ffe066', Math.round(14 * scale), { spd: 160 * scale, life: 0.5, light: 0.2 });
    this.smoke(x, y, '#3a3040', Math.round(4 * scale));
  }
  ring(x, y, r, color = '#ffffff', life = 0.3, width = 2) {
    this.rings.push({ x, y, r0: r * 0.15, r, color, life, t: life, width });
  }
  shockwave(x, y, r, color = '#ffffff') {
    this.ring(x, y, r, color, 0.45, 3);
    this.ring(x, y, r * 0.7, color, 0.3, 2);
  }
  lightning(x1, y1, x2, y2, color = '#fff066', segs = 7, life = 0.16) {
    const pts = [[x1, y1]];
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      pts.push([x1 + (x2 - x1) * t + rand(-9, 9), y1 + (y2 - y1) * t + rand(-9, 9)]);
    }
    pts.push([x2, y2]);
    const branches = [];
    for (let i = 2; i < pts.length - 1; i++) {
      if (Math.random() < 0.4) {
        const a = rand(0, TAU), l = rand(6, 18);
        branches.push([pts[i], [pts[i][0] + Math.cos(a) * l, pts[i][1] + Math.sin(a) * l]]);
      }
    }
    this.arcs.push({ pts, branches, color, life, t: life });
    this.burst(x2, y2, color, 6, { spd: 90, life: 0.25, light: 0.3 });
  }
  beam(x1, y1, x2, y2, color, width = 6, life = 0.25) {
    this.beams.push({ x1, y1, x2, y2, color, width, life, t: life });
  }
  afterimage(sprite, x, y, scale = 1, flip = false, color = '#ffffff', life = 0.3) {
    if (!sprite) return;
    this.afterimages.push({ sprite, x, y, scale, flip, color, life, t: life });
  }
  decal(x, y, r, color = '#180a10', life = 12) {
    if (this.decals.length > 220) this.decals.shift();
    this.decals.push({ x, y, r, color, life, t: life, seed: Math.random() * 1000 });
  }
  flash(x, y, color = '#ffffff', life = 0.1, r = 14) {
    this.flashes.push({ x, y, color, life, t: life, r });
  }
  screenTint(color, a) { this.screenFlash = { color, a: Math.max(this.screenFlash.a, a) }; }
  shakeScreen(amount = 6, time = 0.25) { this.shake = Math.max(this.shake, amount); this.shakeT = Math.max(this.shakeT, time); }

  damageText(x, y, text, color = '#ffffff', opts = {}) {
    if (!this.damageNumbers) return;
    // CLAIRITY: clump tiny numbers into one chunky number so the screen
    // never turns into a wall of 8px text.
    const bx = Math.round(x / 9) * 9, by = Math.round(y / 9) * 9;
    const numeric = /^[0-9]+$/.test(String(text));
    if (numeric && !opts.crit) {
      for (const t of this.texts) {
        if (t._bk === bx + ':' + by && t.t > 0.4 && !t.crit && t.size < 11) {
          const sum = (parseInt(t.text, 10) || 0) + (parseInt(text, 10) || 0);
          t.text = String(sum);
          t.t = Math.min(t.life, t.t + 0.18); t.life = t.t;
          t.pop = 1; t.color = sum > 60 ? '#ffe066' : color;
          return;
        }
      }
    }
    if (this.texts.length > 60) this.texts.shift();
    // impact vector: bursts outward with a directional arc (crit = harder)
    const str = opts.crit ? 1.7 : 1;
    this.texts.push({
      x: x + rand(-3, 3), y, vy: opts.vy ?? rand(-74, -52) * str, vx: opts.vx ?? rand(-34, 34) * str,
      t: opts.life || 0.85, life: opts.life || 0.85, text, color,
      size: opts.size || 8, crit: opts.crit || false, pop: 1, outline: opts.outline ?? true,
      _bk: bx + ':' + by,
    });
  }
  banner(x, y, text, color = '#ffe066') {
    // banner queue: never more than 2 big banners at once, drop the oldest
    if (this._bannerCount >= 2) {
      for (let i = 0; i < this.texts.length; i++) {
        if (this.texts[i].size >= 11) { this.texts.splice(i, 1); break; }
      }
    } else {
      this._bannerCount += 1;
    }
    this.texts.push({ x, y, vy: -8, vx: 0, t: 1.6, life: 1.6, text, color, size: 12, crit: true, pop: 1, outline: true });
  }

  // ---------- sim ----------
  update(dt) {
    const list = this.list;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.t -= dt;
      if (p.t <= 0) { list.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      if (p.kind === P_EMBER || p.kind === P_DUSTLINE) p.vx += WIND() * dt * 2.4;
      const dr = Math.pow(p.drag, dt * 60);
      p.vx *= dr; p.vy *= dr;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.ang += p.spin * dt;
      const k = p.t / p.life;
      p.alpha = p.fade ? Math.min(1, k * 1.6) : 1;
      if (p.endSize !== null) p.curSize = p.size + (p.endSize - p.size) * (1 - k);
      else p.curSize = p.size;
    }
    for (let i = this.anims.length - 1; i >= 0; i--) {
      const a = this.anims[i];
      a.t += dt * a.speed;
      const frames = this.sprites?.fx?.[a.kind];
      if (!frames || a.t >= frames.length) this.anims.splice(i, 1);
    }
    for (const arr of [this.rings, this.arcs, this.texts, this.afterimages, this.flashes, this.beams]) {
      for (let i = arr.length - 1; i >= 0; i--) {
        arr[i].t -= dt;
        if (arr[i].t <= 0) arr.splice(i, 1);
      }
    }
    for (const t of this.texts) {
      t.x += t.vx * dt; t.y += t.vy * dt;
      t.vy += 90 * dt; t.vx *= Math.pow(0.9, dt * 60);
      t.pop = Math.max(0, t.pop - dt * 5);
    }
    for (let i = this.decals.length - 1; i >= 0; i--) {
      this.decals[i].t -= dt;
      if (this.decals[i].t <= 0) this.decals.splice(i, 1);
    }
    // re-count active banners so the queue stays honest
    this._bannerCount = 0;
    for (const t of this.texts) if (t.size >= 11) this._bannerCount++;
    if (this.shakeT > 0) { this.shakeT -= dt; if (this.shakeT <= 0) this.shake = 0; }
    this.screenFlash.a = Math.max(0, this.screenFlash.a - dt * 3.2);
    this.aberration = Math.max(0, this.aberration - dt * 6);
  }

  // ---------- draw (world space; camera already applied) ----------
  drawDecals(ctx) {
    for (const d of this.decals) {
      const a = Math.min(1, d.t / Math.min(2, d.life)) * 0.55;
      ctx.globalAlpha = a;
      ctx.fillStyle = d.color;
      const r = d.r;
      for (let i = 0; i < 7; i++) {
        const ang = (i / 7) * TAU + d.seed;
        const rr = r * (0.45 + ((i * 37 + d.seed | 0) % 10) / 18);
        ctx.beginPath();
        ctx.arc(d.x + Math.cos(ang) * r * 0.35, d.y + Math.sin(ang) * r * 0.28, rr, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  draw(ctx, renderer = null, camera = null) {
    // afterimages (under everything living)
    for (const a of this.afterimages) {
      const k = a.t / a.life;
      ctx.globalAlpha = k * 0.5;
      ctx.save();
      ctx.translate(Math.round(a.x), Math.round(a.y));
      if (a.flip) ctx.scale(-1, 1);
      ctx.drawImage(a.sprite, -a.sprite.width / 2 * a.scale, -a.sprite.height / 2 * a.scale,
        a.sprite.width * a.scale, a.sprite.height * a.scale);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // beams
    for (const b of this.beams) {
      const k = b.t / b.life;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = b.color;
      ctx.globalAlpha = k;
      ctx.lineWidth = b.width * k;
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, b.width * k * 0.35);
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // particles
    ctx.globalCompositeOperation = 'lighter';
    let additive = true;
    for (const p of this.list) {
      if (p.alpha <= 0) continue;
      if (p.additive !== additive) {
        ctx.globalCompositeOperation = p.additive ? 'lighter' : 'source-over';
        additive = p.additive;
      }
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color2 && p.t / p.life < 0.5 ? p.color2 : p.color;
      const s = Math.max(1, Math.round(p.curSize ?? p.size));
      const px = Math.round(p.x), py = Math.round(p.y);
      if (s <= 2) {
        ctx.fillRect(px - (s >> 1), py - (s >> 1), s, s);
      } else if (s <= 4) {
        // chunky pixel diamond
        ctx.fillRect(px - 1, py - (s >> 1), 2, s);
        ctx.fillRect(px - (s >> 1), py - 1, s, 2);
      } else {
        // soft round blob, still pixel-snapped
        const h = s >> 1;
        ctx.beginPath(); ctx.arc(px, py, h, 0, TAU); ctx.fill();
        ctx.globalAlpha = p.alpha * 0.5;
        ctx.beginPath(); ctx.arc(px, py, h * 0.55, 0, TAU); ctx.fill();
        ctx.globalAlpha = p.alpha;
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // sprite explosions
    const fx = this.sprites?.fx;
    if (fx) {
      ctx.globalCompositeOperation = 'lighter';
      for (const a of this.anims) {
        const frames = fx[a.kind];
        if (!frames) continue;
        const f = frames[Math.min(frames.length - 1, Math.floor(a.t))];
        if (!f) continue;
        const w = f.width * a.scale, h = f.height * a.scale;
        ctx.drawImage(f, Math.round(a.x - w / 2), Math.round(a.y - h / 2), w, h);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // rings
    ctx.globalCompositeOperation = 'lighter';
    for (const r of this.rings) {
      const k = 1 - r.t / r.life;
      const rr = r.r0 + (r.r - r.r0) * k;
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = Math.max(1, r.width * (1 - k));
      ctx.beginPath(); ctx.arc(r.x, r.y, rr, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // arcs
    for (const a of this.arcs) {
      const k = a.t / a.life;
      ctx.globalAlpha = k;
      ctx.strokeStyle = a.color; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(a.pts[0][0], a.pts[0][1]);
      for (const p of a.pts) ctx.lineTo(p[0], p[1]);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a.pts[0][0], a.pts[0][1]);
      for (const p of a.pts) ctx.lineTo(p[0], p[1]);
      ctx.stroke();
      ctx.strokeStyle = a.color;
      for (const [p0, p1] of a.branches) {
        ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // flashes
    for (const f of this.flashes) {
      const k = f.t / f.life;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * (1 + (1 - k)));
      g.addColorStop(0, hexA(f.color, k));
      g.addColorStop(1, hexA(f.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 + (1 - k)), 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // push dynamic lights
    if (renderer && camera) {
      for (const p of this.list) {
        if (!p.light) continue;
        const s = camera.worldToScreen(p.x, p.y);
        renderer.addLight(s.x, s.y, (p.curSize ?? p.size) * 6 * camera.zoom, p.color, p.light * p.alpha);
      }
      for (const a of this.anims) {
        if (!a.light) continue;
        const frames = this.sprites?.fx?.[a.kind];
        const k = frames ? 1 - a.t / frames.length : 0;
        const s = camera.worldToScreen(a.x, a.y);
        renderer.addLight(s.x, s.y, 46 * a.scale * camera.zoom * (0.6 + k), a.lightColor, a.light * (1 - k * 0.7));
      }
      for (const f of this.flashes) {
        const s = camera.worldToScreen(f.x, f.y);
        renderer.addLight(s.x, s.y, f.r * 2.4 * camera.zoom, f.color, f.t / f.life);
      }
      for (const a of this.arcs) {
        const s = camera.worldToScreen(a.pts[a.pts.length - 1][0], a.pts[a.pts.length - 1][1]);
        renderer.addLight(s.x, s.y, 40 * camera.zoom, a.color, a.t / a.life);
      }
    }
  }

  // combat text is drawn in screen space for crisp text
  drawTexts(ctx, camera) {
    // TEXT-LAYER ISOLATION: combat text renders LAST, on its own plane,
    // each number on a dark backing card with a crisp 2px black outline.
    for (const t of this.texts) {
      const k = t.t / t.life;
      const p = camera ? camera.worldToScreen(t.x, t.y) : { x: t.x, y: t.y };
      const pop = 1 + t.pop * 0.6;
      const size = Math.round(t.size * 1.4 * pop);
      if (size < 5) continue;
      ctx.font = `bold ${size}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.min(1, k * 2.2);
      if (t.outline) {
        const w = ctx.measureText(t.text).width;
        ctx.fillStyle = 'rgba(6,5,10,0.55)';
        ctx.fillRect(Math.round(p.x) - w / 2 - 2, Math.round(p.y) - size + 2, w + 4, size + 4);
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(2.5, size * 0.24);
        ctx.strokeText(t.text, Math.round(p.x), Math.round(p.y));
        ctx.lineWidth = 1;
      }
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, Math.round(p.x), Math.round(p.y));
      if (t.crit) {
        ctx.globalAlpha = Math.min(1, k * 2.2) * 0.5;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(t.text, Math.round(p.x), Math.round(p.y) - 1);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }
  }
}
