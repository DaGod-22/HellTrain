// ============================================================
// HELL TRAIN — pixel-art sprite engine
// Sprites are defined as string grids; '.' = transparent,
// chars map to palette colours. Rendered to offscreen canvases
// and blitted with imageSmoothing off for crisp pixels.
// ============================================================
import { PAL } from './config.js';

export function spriteCanvas(grid, map) {
  const h = grid.length;
  const w = grid[0].length;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const data = img.data;
  for (let y = 0; y < h; y++) {
    const row = grid[y];
    for (let x = 0; x < w; x++) {
      const ch = row[x] || '.';
      let col = null;
      if (ch !== '.') col = map[ch] || PAL[ch] || null;
      const idx = (y * w + x) * 4;
      if (col) {
        data[idx] = parseInt(col.slice(1, 3), 16);
        data[idx + 1] = parseInt(col.slice(3, 5), 16);
        data[idx + 2] = parseInt(col.slice(5, 7), 16);
        data[idx + 3] = 255;
      } else {
        data[idx + 3] = 0;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// Horizontal flip of a grid
export function flipGrid(grid) {
  return grid.map(row => row.split('').reverse().join(''));
}

// Rotate grid 90° clockwise
export function rotGrid(grid) {
  const h = grid.length, w = grid[0].length;
  const out = [];
  for (let x = 0; x < w; x++) {
    let row = '';
    for (let y = h - 1; y >= 0; y--) row += grid[y][x] || '.';
    out.push(row);
  }
  return out;
}

// Expand a sprite Nx (nearest neighbour, for detail work at larger sizes)
export function scaleGrid(grid, n) {
  const out = [];
  for (const row of grid) {
    const big = row.split('').map(ch => ch.repeat(n)).join('');
    for (let i = 0; i < n; i++) out.push(big);
  }
  return out;
}

// Hue-shift a sprite canvas by converting to HSL and rotating hue.
export function tintCanvas(canvas, hueShiftDeg) {
  const c = document.createElement('canvas');
  c.width = canvas.width; c.height = canvas.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(canvas, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    if (d[i + 3] === 0) continue;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) continue; // greyscale unchanged
    let h = 0, s = 0;
    const dlt = max - min;
    s = l > 0.5 ? dlt / (2 - max - min) : dlt / (max + min);
    if (max === r) h = ((g - b) / dlt) % 6;
    else if (max === g) h = (b - r) / dlt + 2;
    else h = (r - g) / dlt + 4;
    h = (h * 60 + hueShiftDeg + 360) % 360;
    // back to rgb
    const c2 = (1 - Math.abs(2 * l - 1)) * s;
    const x = c2 * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c2 / 2;
    let r2, g2, b2;
    if (h < 60) [r2, g2, b2] = [c2, x, 0];
    else if (h < 120) [r2, g2, b2] = [x, c2, 0];
    else if (h < 180) [r2, g2, b2] = [0, c2, x];
    else if (h < 240) [r2, g2, b2] = [0, x, c2];
    else if (h < 300) [r2, g2, b2] = [x, 0, c2];
    else [r2, g2, b2] = [c2, 0, x];
    d[i] = Math.round((r2 + m) * 255);
    d[i + 1] = Math.round((g2 + m) * 255);
    d[i + 2] = Math.round((b2 + m) * 255);
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// Render one sprite sheet from an atlas of frames with metadata
export class SpriteSheet {
  constructor() {
    this.frames = {};   // name -> canvas
    this.meta = {};     // name -> {w,h,ox,oy}
  }
  add(name, grid, map, ox = 0, oy = 0) {
    this.frames[name] = spriteCanvas(grid, map);
    this.meta[name] = { w: grid[0].length, h: grid.length, ox, oy };
    return this;
  }
  addFlipped(name, grid, map, ox = 0, oy = 0) {
    return this.add(name, flipGrid(grid), map, ox, oy);
  }
  get(name) { return this.frames[name]; }
}

// Draw helper with pixel-perfect scaling (world->view)
export function drawSprite(ctx, canvas, x, y, scale = 1, flip = false, rot = 0, alpha = 1) {
  if (alpha <= 0 || !canvas) return;
  if (alpha < 1) { ctx.globalAlpha = alpha; }
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (rot) ctx.rotate(rot);
  if (flip) ctx.scale(-1, 1);
  const w = canvas.width, h = canvas.height;
  ctx.drawImage(canvas, Math.round(-w / 2 * scale), Math.round(-h / 2 * scale), w * scale, h * scale);
  ctx.restore();
  if (alpha < 1) ctx.globalAlpha = 1;
}
