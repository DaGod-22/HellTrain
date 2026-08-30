// ============================================================
// HELL TRAIN — PIXEL FORGE
// A tiny procedural pixel-art rasterizer used to bake
// AAA-grade animated sprite frames at boot.
//
// Workflow:
//   1. Draw shapes into a *material mask* (each pixel stores a material id)
//   2. Run the shader pass: distance-to-edge + light direction picks a
//      tone from that material's colour ramp (form shadow / core shadow /
//      highlight / rim light)
//   3. Run the outline pass (dark, colour-bled outline)
//   4. Emit a canvas
//
// The result is consistent, volumetric, hand-painted-looking pixel art
// that we can generate hundreds of animation frames of.
// ============================================================

export function hex2rgb(h) {
  if (Array.isArray(h)) return h;
  h = h.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export function rgb2hex(c) {
  return '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
export function mixc(a, b, t) {
  const A = hex2rgb(a), B = hex2rgb(b);
  return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
}
export function shade(c, amt) {
  // amt < 0 darken, > 0 lighten (perceptual-ish, keeps saturation)
  const C = hex2rgb(c);
  if (amt >= 0) return [C[0] + (255 - C[0]) * amt, C[1] + (255 - C[1]) * amt, C[2] + (255 - C[2]) * amt];
  return [C[0] * (1 + amt), C[1] * (1 + amt), C[2] * (1 + amt)];
}

// Build a 5-stop ramp from a base colour: [core shadow, shadow, base, light, highlight]
export function ramp(base, opts = {}) {
  const sat = opts.sat ?? 0.12;      // hue push into shadow
  const cool = opts.cool ?? '#241040'; // shadow bias colour
  const warm = opts.warm ?? '#fff0c0'; // light bias colour
  const b = hex2rgb(base);
  return [
    rgb2hex(mixc(shade(b, -0.58), cool, 0.34 + sat)),
    rgb2hex(mixc(shade(b, -0.30), cool, 0.16)),
    rgb2hex(b),
    rgb2hex(mixc(shade(b, 0.16), warm, 0.10)),
    rgb2hex(mixc(shade(b, 0.36), warm, 0.20)),
  ];
}

let MAT_SEQ = 1;
export class Material {
  // kind: 'shaded' | 'flat' | 'glow' | 'metal'
  constructor(base, opts = {}) {
    this.id = MAT_SEQ++;
    this.base = base;
    this.kind = opts.kind || 'shaded';
    this.ramp = opts.ramp || ramp(base, opts);
    this.outline = opts.outline ?? null;   // null => auto (darkened base)
    this.rim = opts.rim ?? null;           // rim light colour
    this.emissive = opts.emissive ?? (this.kind === 'glow');
    this.spec = opts.spec ?? (this.kind === 'metal' ? 1 : 0); // sharp highlight
    this.noOutline = opts.noOutline ?? false;
    this.alpha = opts.alpha ?? 255;
    this.dither = opts.dither ?? 0;        // 0..1 dither between tones
  }
}
export const mat = (base, opts) => new Material(base, opts);

export class Pix {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.mask = new Int16Array(w * h);       // material id per px (0 = empty)
    this.override = new Array(w * h).fill(null); // explicit colour override
    this.mats = {};
  }
  _reg(m) { if (m && !this.mats[m.id]) this.mats[m.id] = m; return m; }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  px(x, y, m) {
    x |= 0; y |= 0;
    if (!this.inb(x, y)) return;
    if (typeof m === 'string') { this.override[y * this.w + x] = m; this.mask[y * this.w + x] = -1; return; }
    this._reg(m);
    this.mask[y * this.w + x] = m.id;
    this.override[y * this.w + x] = null;
  }
  clearPx(x, y) { if (this.inb(x, y)) { this.mask[y * this.w + x] = 0; this.override[y * this.w + x] = null; } }
  at(x, y) { return this.inb(x, y) ? this.mask[y * this.w + x] : 0; }

  rect(x, y, w, h, m) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, m);
    return this;
  }
  clearRect(x, y, w, h) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.clearPx(x + i, y + j);
    return this;
  }
  // Filled ellipse centred at cx,cy
  ell(cx, cy, rx, ry, m) {
    if (rx <= 0 || ry <= 0) return this;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / (rx + 0.001), dy = (y + 0.5 - cy) / (ry + 0.001);
        if (dx * dx + dy * dy <= 1.0) this.px(x, y, m);
      }
    }
    return this;
  }
  ring(cx, cy, r, thick, m) {
    for (let y = Math.floor(cy - r - thick); y <= Math.ceil(cy + r + thick); y++) {
      for (let x = Math.floor(cx - r - thick); x <= Math.ceil(cx + r + thick); x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d <= r + thick / 2 && d >= r - thick / 2) this.px(x, y, m);
      }
    }
    return this;
  }
  line(x0, y0, x1, y1, m, thick = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let guard = 0; guard < 4096; guard++) {
      if (thick <= 1) this.px(x0, y0, m);
      else this.ell(x0, y0, thick / 2, thick / 2, m);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }
  poly(pts, m) {
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= y + 0.5 && b[1] > y + 0.5) || (b[1] <= y + 0.5 && a[1] > y + 0.5)) {
          xs.push(a[0] + ((y + 0.5 - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
        }
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        for (let x = Math.floor(xs[i]); x <= Math.ceil(xs[i + 1]); x++) {
          if (x + 0.5 >= xs[i] && x + 0.5 <= xs[i + 1]) this.px(x, y, m);
        }
      }
    }
    return this;
  }
  // Rounded capsule between two points (great for limbs)
  limb(x0, y0, x1, y1, r, m) {
    const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.ell(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r, m);
    }
    return this;
  }
  // Copy another Pix at an offset (used for composing parts / mirroring)
  blit(other, ox, oy, flip = false) {
    for (let y = 0; y < other.h; y++) {
      for (let x = 0; x < other.w; x++) {
        const id = other.mask[y * other.w + x];
        if (!id) continue;
        const sx = flip ? (other.w - 1 - x) : x;
        const ov = other.override[y * other.w + x];
        if (ov) this.px(ox + sx, oy + y, ov);
        else { const m = other.mats[id]; if (m) this.px(ox + sx, oy + y, m); }
      }
    }
    return this;
  }
  mirrorX(centre) {
    const cx = centre ?? this.w / 2;
    const snap = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const id = this.mask[y * this.w + x];
      if (id) snap.push([x, y, id, this.override[y * this.w + x]]);
    }
    for (const [x, y, id, ov] of snap) {
      const nx = Math.round(cx * 2 - 1 - x);
      if (ov) this.px(nx, y, ov);
      else { const m = this.mats[id]; if (m) this.px(nx, y, m); }
    }
    return this;
  }

  // ---- shading pass ----
  // light: {x,y,z} direction the light comes FROM (screen space, y down)
  render(opts = {}) {
    const { w, h } = this;
    const lx = opts.lx ?? -0.6, ly = opts.ly ?? -0.8;
    const ambient = opts.ambient ?? 0;
    const rimStrength = opts.rim ?? 1;
    const outlineAlpha = opts.outlineAlpha ?? 255;
    const out = new Uint8ClampedArray(w * h * 4);

    // distance-to-edge (chebyshev-ish BFS) per solid pixel
    const dist = new Int16Array(w * h).fill(-1);
    const q = [];
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && this.mask[y * w + x] !== 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!solid(x, y)) continue;
      let edge = false;
      for (let d = 0; d < 4 && !edge; d++) {
        const nx = x + [1, -1, 0, 0][d], ny = y + [0, 0, 1, -1][d];
        if (!solid(nx, ny)) edge = true;
      }
      if (edge) { dist[y * w + x] = 0; q.push(y * w + x); }
    }
    for (let qi = 0; qi < q.length; qi++) {
      const i = q[qi], x = i % w, y = (i / w) | 0;
      for (let d = 0; d < 4; d++) {
        const nx = x + [1, -1, 0, 0][d], ny = y + [0, 0, 1, -1][d];
        if (!solid(nx, ny)) continue;
        const ni = ny * w + nx;
        if (dist[ni] !== -1) continue;
        dist[ni] = dist[i] + 1;
        q.push(ni);
      }
    }

    // per-material max depth for normalised shading
    const maxDepth = {};
    for (let i = 0; i < w * h; i++) {
      const id = this.mask[i];
      if (id > 0) maxDepth[id] = Math.max(maxDepth[id] || 0, dist[i]);
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const id = this.mask[i];
        const o = i * 4;
        if (id === 0) continue;
        if (id === -1) {
          const c = hex2rgb(this.override[i]);
          out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
          continue;
        }
        const m = this.mats[id];
        if (!m) continue;
        if (m.kind === 'flat' || m.kind === 'glow') {
          const c = hex2rgb(m.base);
          out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = m.alpha;
          continue;
        }
        // Which side of the local form are we on?
        const d = dist[i];
        const md = Math.max(1, maxDepth[id]);
        const depth = Math.min(1, d / Math.min(md, 4.2));   // 0 at silhouette, 1 deep inside
        // surface normal approximation: gradient of the distance field
        const gx = (this._distAt(dist, x + 1, y) - this._distAt(dist, x - 1, y));
        const gy = (this._distAt(dist, x, y + 1) - this._distAt(dist, x, y - 1));
        const gl = Math.hypot(gx, gy) || 1;
        const nxn = -gx / gl, nyn = -gy / gl;   // points outward
        let lambert = (nxn * lx + nyn * ly);     // 1 = facing the light
        // Blend: rim of the form catches light, deep interior is mid tone
        let v = 0.46 + lambert * (1 - depth) * 0.80 + (depth * 0.16) + ambient;
        // material tweaks
        if (m.spec) v += lambert > 0.72 && d <= 1 ? 0.45 : 0;
        // ordered dither between adjacent tones for gradients
        if (m.dither) v += ((x + y) % 2 ? 1 : -1) * 0.06 * m.dither;
        let idx = Math.round(v * 4);
        idx = Math.max(0, Math.min(4, idx));
        // rim light on the shadow side edge
        let col = m.ramp[idx];
        if (m.rim && rimStrength && d === 0 && lambert < -0.25) {
          col = rgb2hex(mixc(col, m.rim, 0.55 * rimStrength));
        }
        const c = hex2rgb(col);
        out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = m.alpha;
      }
    }

    // outline pass — colour-bled dark outline hugging the silhouette
    if (outlineAlpha > 0) {
      const add = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (this.mask[y * w + x] !== 0) continue;
        let src = 0, sm = null;
        for (let d = 0; d < 4; d++) {
          const nx = x + [1, -1, 0, 0][d], ny = y + [0, 0, 1, -1][d];
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const nid = this.mask[ny * w + nx];
          if (nid > 0) {
            const m = this.mats[nid];
            if (m && !m.noOutline) { src = nid; sm = m; break; }
          }
        }
        if (!sm) continue;
        const oc = sm.outline || rgb2hex(mixc(shade(sm.base, -0.80), '#0a0512', 0.72));
        add.push([x, y, hex2rgb(oc)]);
      }
      for (const [x, y, c] of add) {
        const o = (y * w + x) * 4;
        out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = outlineAlpha;
      }
    }
    return out;
  }
  _distAt(dist, x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return -1;
    const v = dist[y * this.w + x];
    return v === -1 ? -1 : v;
  }

  toCanvas(opts = {}) {
    const data = this.render(opts);
    const c = makeCanvas(this.w, this.h);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(this.w, this.h);
    img.data.set(data);
    ctx.putImageData(img, 0, 0);
    return c;
  }
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext('2d');
  if (ctx) ctx.imageSmoothingEnabled = false;
  return c;
}

// ---------- canvas post-ops used for variants ----------
export function canvasOp(src, fn) {
  const c = makeCanvas(src.width, src.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const r = fn(d[i], d[i + 1], d[i + 2], d[i + 3], (i / 4) % c.width, ((i / 4) / c.width) | 0);
    if (r) { d[i] = r[0]; d[i + 1] = r[1]; d[i + 2] = r[2]; if (r[3] !== undefined) d[i + 3] = r[3]; }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// Pure-white hit silhouette (with a hint of the original for readability)
export function whiteSilhouette(src, tint = '#ffffff', amount = 1) {
  const t = hex2rgb(tint);
  return canvasOp(src, (r, g, b) => [
    r + (t[0] - r) * amount, g + (t[1] - g) * amount, b + (t[2] - b) * amount,
  ]);
}

export function hueShift(src, deg) {
  const rad = deg * Math.PI / 180, cs = Math.cos(rad), sn = Math.sin(rad);
  const m = [
    0.213 + cs * 0.787 - sn * 0.213, 0.715 - cs * 0.715 - sn * 0.715, 0.072 - cs * 0.072 + sn * 0.928,
    0.213 - cs * 0.213 + sn * 0.143, 0.715 + cs * 0.285 + sn * 0.140, 0.072 - cs * 0.072 - sn * 0.283,
    0.213 - cs * 0.213 - sn * 0.787, 0.715 - cs * 0.715 + sn * 0.715, 0.072 + cs * 0.928 + sn * 0.072,
  ];
  return canvasOp(src, (r, g, b) => [
    r * m[0] + g * m[1] + b * m[2], r * m[3] + g * m[4] + b * m[5], r * m[6] + g * m[7] + b * m[8],
  ]);
}

export function tintMul(src, hexc, amount = 0.5) {
  const t = hex2rgb(hexc);
  return canvasOp(src, (r, g, b) => [
    r * (1 - amount) + (r * t[0] / 255) * amount,
    g * (1 - amount) + (g * t[1] / 255) * amount,
    b * (1 - amount) + (b * t[2] / 255) * amount,
  ]);
}

export function scaleCanvas(src, n) {
  const c = makeCanvas(src.width * n, src.height * n);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

// Cheap dropshadow-ish ground blob used under entities
export function shadowSprite(w, h) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (x + 0.5 - w / 2) / (w / 2), dy = (y + 0.5 - h / 2) / (h / 2);
    const d = dx * dx + dy * dy;
    if (d > 1) continue;
    const a = Math.round(110 * (1 - d) * (1 - d));
    const i = (y * w + x) * 4;
    img.data[i] = 5; img.data[i + 1] = 2; img.data[i + 2] = 12; img.data[i + 3] = a;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
