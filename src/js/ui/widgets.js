// ============================================================
// HELL TRAIN — UI WIDGETS
// Shared pixel-UI toolkit: text, panels, bars, icons, cards.
// ============================================================
import { TAU } from '../core/utils.js';

export const FONT_FAMILY = 'monospace';

export function text(ctx, str, x, y, color = '#ffffff', size = 8, bold = false, shadow = true) {
  ctx.font = (bold ? 'bold ' : '') + size + 'px ' + FONT_FAMILY;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  if (shadow) { ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillText(str, x + 1, y + 1); }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

export function textC(ctx, str, cx, y, color = '#ffffff', size = 8, bold = false, shadow = true) {
  ctx.font = (bold ? 'bold ' : '') + size + 'px ' + FONT_FAMILY;
  ctx.textAlign = 'center';
  if (shadow) { ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillText(str, cx + 1, y + 1); }
  ctx.fillStyle = color;
  ctx.fillText(str, cx, y);
  ctx.textAlign = 'left';
}

export function textR(ctx, str, x, y, color = '#ffffff', size = 8, bold = false) {
  ctx.font = (bold ? 'bold ' : '') + size + 'px ' + FONT_FAMILY;
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillText(str, x + 1, y + 1);
  ctx.fillStyle = color; ctx.fillText(str, x, y);
  ctx.textAlign = 'left';
}

// Word-wrap into an array of lines that fit `w` pixels.
export function wrap(ctx, str, w, size = 6) {
  ctx.font = size + 'px ' + FONT_FAMILY;
  const words = String(str).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? cur + ' ' + word : word;
    if (ctx.measureText(test).width > w && cur) { lines.push(cur); cur = word; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

// A beveled dark panel with a coloured frame.
export function drawPanel(ctx, x, y, w, h, color = '#5a5a78', fill = 'rgba(10,8,18,0.92)') {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fillRect(x + 1, y + 1, w - 2, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x + 1, y + h - 2, w - 2, 1);
  // corner studs
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 2, 2); ctx.fillRect(x + w - 2, y, 2, 2);
  ctx.fillRect(x, y + h - 2, 2, 2); ctx.fillRect(x + w - 2, y + h - 2, 2, 2);
}

export function drawBar(ctx, x, y, w, h, pct, color = '#74c04a', bg = '#12121c', glossy = true) {
  pct = Math.max(0, Math.min(1, pct || 0));
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.round(w * pct), h);
  if (glossy && h > 2) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x, y, Math.round(w * pct), 1);
  }
}

// ------------------------------------------------------------
// Vector-ish pixel icons drawn directly (no atlas needed).
// ------------------------------------------------------------
export function drawIcon(ctx, kind, x, y, s = 16, color = '#ffffff') {
  ctx.save();
  ctx.translate(x, y);
  const u = s / 16;
  ctx.scale(u, u);
  // plate
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, 16, 16);
  ctx.strokeStyle = color; ctx.globalAlpha = 0.65;
  ctx.strokeRect(0.5, 0.5, 15, 15);
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  const R = (a, b, c, d) => ctx.fillRect(a, b, c, d);
  switch (kind) {
    case 'sword': R(7, 2, 2, 9); R(5, 10, 6, 2); R(7, 12, 2, 2); break;
    case 'axe': R(4, 3, 6, 4); R(9, 3, 3, 6); R(6, 7, 2, 7); break;
    case 'fire': R(7, 3, 2, 3); R(6, 5, 4, 4); R(5, 8, 6, 4); R(6, 12, 4, 1); break;
    case 'ice': R(7, 2, 2, 12); R(2, 7, 12, 2); R(4, 4, 2, 2); R(10, 10, 2, 2); R(10, 4, 2, 2); R(4, 10, 2, 2); break;
    case 'bolt': R(9, 2, 3, 5); R(6, 6, 4, 3); R(4, 8, 3, 6); R(7, 8, 3, 2); break;
    case 'heart': R(3, 4, 4, 3); R(9, 4, 4, 3); R(3, 6, 10, 3); R(5, 9, 6, 2); R(7, 11, 2, 2); break;
    case 'shield': R(3, 3, 10, 5); R(4, 8, 8, 3); R(6, 11, 4, 2); break;
    case 'boot': R(4, 3, 4, 7); R(4, 10, 8, 3); break;
    case 'coin': ctx.beginPath(); ctx.arc(8, 8, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; R(7, 5, 2, 6); break;
    case 'gem': R(5, 3, 6, 2); R(3, 5, 10, 3); R(5, 8, 6, 3); R(7, 11, 2, 2); break;
    case 'skull': R(4, 3, 8, 6); R(5, 9, 6, 2); R(6, 11, 4, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; R(5, 5, 2, 2); R(9, 5, 2, 2); break;
    case 'target': ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(8, 8, 5, 0, TAU); ctx.stroke(); R(7, 7, 2, 2); break;
    case 'clock': ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(8, 8, 5.5, 0, TAU); ctx.stroke(); R(7.5, 4, 1, 5); R(8, 8, 4, 1); break;
    case 'bomb': ctx.beginPath(); ctx.arc(8, 10, 5, 0, TAU); ctx.fill(); R(9, 2, 2, 4); break;
    case 'ghost': R(4, 3, 8, 8); R(4, 11, 2, 2); R(8, 11, 2, 2); R(12, 11, 0, 0);
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; R(6, 6, 2, 2); R(9, 6, 2, 2); break;
    case 'blood': R(7, 2, 2, 4); R(5, 6, 6, 5); R(6, 11, 4, 2); break;
    case 'sun': ctx.beginPath(); ctx.arc(8, 8, 4, 0, TAU); ctx.fill();
      R(7, 1, 2, 3); R(7, 12, 2, 3); R(1, 7, 3, 2); R(12, 7, 3, 2); break;
    case 'moon': ctx.beginPath(); ctx.arc(8, 8, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.beginPath(); ctx.arc(11, 6, 5.5, 0, TAU); ctx.fill(); break;
    case 'wing': R(2, 6, 5, 2); R(4, 4, 4, 2); R(9, 6, 5, 2); R(8, 4, 4, 2); R(7, 8, 2, 5); break;
    case 'twin': R(4, 3, 3, 10); R(9, 3, 3, 10); break;
    case 'fan': R(7, 8, 2, 5); R(3, 4, 2, 5); R(11, 4, 2, 5); break;
    case 'arrow': R(7, 2, 2, 9); R(5, 4, 2, 2); R(9, 4, 2, 2); R(6, 11, 4, 2); break;
    case 'fist': R(4, 5, 8, 6); R(3, 7, 2, 3); R(11, 6, 2, 3); break;
    case 'spike': R(7, 2, 2, 12); R(3, 6, 2, 8); R(11, 6, 2, 8); break;
    case 'cross': R(6, 2, 4, 12); R(2, 6, 12, 4); break;
    case 'candle': R(7, 2, 2, 3); R(5, 6, 6, 8); break;
    case 'train': R(2, 6, 12, 5); R(4, 3, 5, 3); R(3, 11, 3, 3); R(9, 11, 3, 3); break;
    case 'gear': ctx.beginPath(); ctx.arc(8, 8, 5, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.beginPath(); ctx.arc(8, 8, 2, 0, TAU); ctx.fill(); break;
    case 'dash': R(2, 5, 7, 2); R(4, 9, 7, 2); R(10, 3, 4, 2); R(11, 11, 3, 2); break;
    case 'apocalypse':
      R(7, 1, 2, 14); R(1, 7, 14, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(8, 8, 3, 0, TAU); ctx.fill(); break;
    default: ctx.beginPath(); ctx.arc(8, 8, 4, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ------------------------------------------------------------
// The upgrade card.
// ------------------------------------------------------------
export function drawCard(ctx, o) {
  const { x, y, w, h, title, desc, color = '#ffffff', icon = 'gem',
    selected = false, index = 0, alpha = 1, level = '', target = null,
    tagline = '', evolved = false, rarity = 'common' } = o;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (selected) {
    ctx.translate(0, -3);
    ctx.shadowColor = color; ctx.shadowBlur = 12;
  }
  // body
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, 'rgba(24,18,38,0.98)');
  grad.addColorStop(1, 'rgba(8,6,16,0.98)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.shadowBlur = 0;
  // rarity glow header
  const hg = ctx.createLinearGradient(x, y, x + w, y);
  hg.addColorStop(0, hexA(color, 0.15));
  hg.addColorStop(0.5, hexA(color, 0.55));
  hg.addColorStop(1, hexA(color, 0.15));
  ctx.fillStyle = hg;
  ctx.fillRect(x, y, w, 3);
  ctx.fillRect(x, y + h - 3, w, 3);
  // border
  ctx.strokeStyle = selected ? '#ffffff' : color;
  ctx.lineWidth = selected ? 2 : 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.lineWidth = 1;

  // icon
  const ix = x + w / 2 - 11;
  drawIcon(ctx, icon, ix, y + 10, 22, color);
  if (evolved) {
    ctx.fillStyle = '#ffe066';
    ctx.fillRect(ix - 3, y + 8, 2, 2); ctx.fillRect(ix + 23, y + 8, 2, 2);
  }

  // title
  const ty = y + 44;
  textC(ctx, String(title).toUpperCase(), x + w / 2, ty, color, w > 160 ? 11 : 8, true);
  if (level) textC(ctx, level, x + w / 2, ty + 9, '#ffffff', 7, true);

  // target tag
  if (target) {
    ctx.fillStyle = hexA('#8ef0ff', 0.2);
    ctx.fillRect(x + w / 2 - 18, y + h - 42, 36, 8);
    textC(ctx, target, x + w / 2, y + h - 36, '#8ef0ff', 6, true);
  }

  // description
  const lines = wrap(ctx, desc, w - 12, 6);
  let ly = ty + (level ? 20 : 14);
  ctx.textAlign = 'center';
  for (const ln of lines.slice(0, 6)) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillText(ln, x + w / 2 + 1, ly + 1);
    ctx.fillStyle = '#cfd4e0'; ctx.fillText(ln, x + w / 2, ly);
    ly += 8;
  }
  ctx.textAlign = 'left';
  if (tagline) {
    ctx.globalAlpha = alpha * 0.8;
    textC(ctx, '"' + tagline + '"', x + w / 2, y + h - 8, hexA(color, 0.9), 6, false);
    ctx.globalAlpha = alpha;
  }
  // hotkey
  if (index) {
    ctx.fillStyle = color;
    ctx.fillRect(x + 2, y + 2, 9, 9);
    ctx.fillStyle = '#0a0a12';
    ctx.font = 'bold 7px ' + FONT_FAMILY;
    ctx.fillText(String(index), x + 4, y + 9);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

export function hexA(hex, a) {
  const h = (hex || '#ffffff').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// A simple hover/click button used across menus.
export function hitRect(mx, my, x, y, w, h) {
  return mx >= x && mx <= x + w && my >= y && my <= y + h;
}
