// ============================================================
// HELL TRAIN — SHARED UI KIT (v1.4)
// One visual language for every menu page:
//   · same top bar (back / title / purse)
//   · same item card (icon · name · one-liner · status)
//   · same list behaviour (wheel, arrows, scrollbar)
//   · same tabs, buttons, toasts and page-open animation
// Drawn straight to the 270x480 portrait canvas.
// ============================================================
import { TAU, fmtNum } from '../core/utils.js';

export const KW = 270, KH = 480;

// ---- one palette for every page ----
export const K = {
  // HARMONIZED MASTER PALETTE — matte obsidian, iron charcoal,
  // volcanic crimson, plasma blue, high-visibility cyan for vital data.
  INK: '#0b0a0e',
  PANEL: '#232028', PANEL_HI: '#332f3a', PANEL_LO: '#16141a', PANEL_ACT: '#3a2a34',
  GOLD: '#f2c14e', GOLD_D: '#a06a14',
  RED: '#ff3b46', RED_D: '#7a0f18',
  CRIM: '#ff3b46', CRIM_D: '#d5202e',
  PLASMA: '#4d7dff', PLASMA_D: '#22409c',
  CYAN: '#28f0e0', CYAN_D: '#0f7a72',
  GREEN: '#3ee08a', GREEN_D: '#177a48',
  BLUE: '#8ef0ff', LAV: '#c07aff', ORANGE: '#ff5a3c',
  TXT: '#ffffff', SUB: '#d8d4e0', DIM: '#9a94a6', FAINT: '#655e70',
  OK: '#3ee08a', BAD: '#ff5a64',
};
// v1.8 TYPOGRAPHY ARCHITECTURE — every string in the game rides this
// scale. 1.4x baseline: readable from across the room, no exceptions.
export const TEXT_SCALE = 1.4;
const _BACK = 'rgba(6,5,10,0.5)';

export function roundPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
export function clipRound(ctx, x, y, w, h, r) { roundPath(ctx, x, y, w, h, r); ctx.clip(); }

// A physical-feeling rounded tile: gradient body, ink outline, lift slab.
export function tile(ctx, x, y, w, h, r, o = {}) {
  const lift = o.lift ?? 2;
  if (lift > 0) {
    roundPath(ctx, x, y + lift, w, h, r);
    ctx.fillStyle = o.shadow || 'rgba(20,8,10,0.55)';
    ctx.fill();
  }
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, o.fill || K.PANEL);
  g.addColorStop(1, o.fill2 || o.fillLo || K.PANEL_LO);
  roundPath(ctx, x, y, w, h, r);
  ctx.fillStyle = g;
  ctx.fill();
  if (o.ring) { ctx.strokeStyle = o.ring; ctx.lineWidth = o.ringW || 2; ctx.stroke(); }
  roundPath(ctx, x, y, w, h, r);
  ctx.strokeStyle = o.outline || K.INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  clipRound(ctx, x, y, w, h, r);
  ctx.globalAlpha *= 0.14;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y + 2, w, Math.max(2, h * 0.24));
  ctx.restore();
  ctx.lineWidth = 1;
}

export function label(ctx, str, x, y, color, size, align = 'center', opts = {}) {
  size = size * TEXT_SCALE;
  str = String(str);
  ctx.font = 'bold ' + size + 'px monospace';
  ctx.textAlign = align;
  // TEXT-LAYER ISOLATION: every string sits on its own dark backing card
  if (opts.backing !== false) {
    const w = ctx.measureText(str).width + 4;
    const bx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    roundPath(ctx, bx - 2, y - size + 2, w + 4, size + 5, 3);
    ctx.fillStyle = _BACK; ctx.fill();
  }
  // crisp 2px solid black outer outline
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.strokeText(str, x, y);
  ctx.lineWidth = 1;
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.textAlign = 'left';
}

export function outlineText(ctx, str, cx, y, color, ink, size) {
  size = size * TEXT_SCALE;
  str = String(str);
  ctx.font = 'bold ' + size + 'px monospace';
  ctx.textAlign = 'center';
  // backing card
  const w = ctx.measureText(str).width + 6;
  roundPath(ctx, cx - w / 2 - 2, y - size + 2, w + 4, size + 6, 4);
  ctx.fillStyle = _BACK; ctx.fill();
  // crisp 2px black outer outline (stroke pass) + ink rim
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(3, size * 0.22);
  ctx.strokeText(str, cx, y);
  ctx.lineWidth = 1;
  ctx.fillStyle = ink;
  const k = size > 21 ? 2 : 1;
  for (let dx = -k; dx <= k; dx++) for (let dy = -k; dy <= k; dy++) if (dx || dy) ctx.fillText(str, cx + dx, y + dy);
  ctx.fillText(str, cx, y + k + 1);
  ctx.fillStyle = color;
  ctx.fillText(str, cx, y);
  ctx.textAlign = 'left';
}

// Truncate with an ellipsis so long names never overflow their card.
export function fitText(ctx, str, w, size, bold = true) {
  size = size * TEXT_SCALE;
  ctx.font = (bold ? 'bold ' : '') + size + 'px monospace';
  let s = String(str);
  if (ctx.measureText(s).width <= w) return s;
  while (s.length > 1 && ctx.measureText(s + '…').width > w) s = s.slice(0, -1);
  return s + '…';
}

export function easeOut(t) { t = Math.max(0, Math.min(1, t)); return 1 - Math.pow(1 - t, 3); }

// Page-open fade+rise. `pageT` is seconds since the page opened.
export function pageAlpha(pageT) { return easeOut(pageT * 3.2); }

export function inRect(m, r) { return r && m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h; }

// ============================================================
// TOP BAR — the same furniture on every page:
// [◀ BACK]  .... TITLE ....  [coins] [shards]
// Returns the rects so the scene can route clicks.
// ============================================================
export function topBar(ctx, o) {
  const { title, save, hover } = o;
  const back = { x: 6, y: 7, w: 52, h: 24 };
  const coins = { x: KW - 116, y: 7, w: 52, h: 24 };
  const shards = { x: KW - 60, y: 7, w: 54, h: 24 };

  const hov = hover === 'back';
  tile(ctx, back.x, back.y, back.w, back.h, 8, {
    fill: hov ? K.PANEL_ACT : K.PANEL, fillLo: K.PANEL_LO,
    ring: hov ? K.BLUE : null, ringW: 2, lift: hov ? 3 : 2,
  });
  label(ctx, '◀ BACK', back.x + back.w / 2, back.y + 16, hov ? K.BLUE : K.TXT, 8);

  // title — shrink to fit the middle span
  const midW = (coins.x - 10) - (back.x + back.w + 10);
  let size = 13;
  ctx.font = 'bold ' + size + 'px monospace';
  while (size > 8 && ctx.measureText(title).width > midW) { size -= 1; ctx.font = 'bold ' + size + 'px monospace'; }
  label(ctx, title, KW / 2, back.y + 17, K.GOLD, size);

  purseChip(ctx, coins, 'coin', fmtNum(save?.coins || 0), K.GOLD, hover === 'coins');
  purseChip(ctx, shards, 'shard', fmtNum(save?.shards || 0), K.BLUE, hover === 'shards');
  return { back, coins, shards };
}

function purseChip(ctx, r, kind, value, color, hov) {
  tile(ctx, r.x, r.y, r.w, r.h, 8, {
    fill: hov ? '#3a2c4a' : '#241a2e', fillLo: '#150f1c',
    ring: hov ? color : null, ringW: 1, lift: 2,
  });
  glyph(ctx, kind, r.x + 4, r.y + 5, 14, color);
  label(ctx, value, r.x + 21, r.y + 16, K.TXT, value.length > 5 ? 7 : 8, 'left');
}

// ============================================================
// ITEM CARD — the one list-row style used everywhere:
// (icon) Name..............  [STATUS / cost]
//        one short line
// ============================================================
export function itemCard(ctx, o) {
  const {
    x, y, w, h = 44, icon: ic, iconColor = K.GOLD, name, desc = '',
    right, rightColor = K.DIM, owned, equipped, locked, cost,
    selected, pressed, hover, appear = 1, index = 0, accent, tag,
  } = o;
  const a = Math.max(0, Math.min(1, appear));
  if (a <= 0.01) return;
  const slide = (1 - easeOut(a)) * 26;
  const lift = pressed ? 1 : hover || selected ? 3 : 2;
  const yy = y + (pressed ? 2 : 0);
  ctx.save();
  ctx.globalAlpha = a;

  const ac = accent || iconColor || K.GOLD;
  tile(ctx, x + slide, yy, w, h, 10, {
    fill: selected ? K.PANEL_ACT : hover ? '#342840' : K.PANEL,
    fillLo: selected ? '#2b1e38' : K.PANEL_LO,
    outline: K.INK,
    ring: selected ? '#ffffff' : equipped ? K.GOLD : hover ? ac : null,
    ringW: selected ? 2 : 1,
    lift,
  });
  // accent spine + keyboard marker
  ctx.fillStyle = locked ? '#3a3040' : ac;
  ctx.globalAlpha = a * (locked ? 0.5 : 0.85);
  ctx.fillRect(x + slide + 2, yy + 5, 3, h - 10);
  ctx.globalAlpha = a;
  if (selected) label(ctx, '▶', x + slide - 1, yy + h / 2 + 3, '#ffffff', 7);

  // icon plate
  tile(ctx, x + slide + 8, yy + (h - 30) / 2, 30, 30, 8, {
    fill: 'rgba(0,0,0,0.35)', fillLo: 'rgba(0,0,0,0.5)',
    outline: locked ? '#3a3040' : ac, lift: 0,
  });
  glyph(ctx, ic, x + slide + 12, yy + (h - 30) / 2 + 4, 22, locked ? K.FAINT : iconColor);

  // name + one-liner
  const nx = x + slide + 46;
  const nw = w - 46 - (rightW(o) + 12);
  label(ctx, fitText(ctx, name, nw, 8), nx, yy + 17, locked ? K.FAINT : (hover || selected) ? '#ffffff' : K.TXT, 8, 'left');
  if (desc) label(ctx, fitText(ctx, desc, nw, 6), nx, yy + 30, locked ? '#54485e' : K.DIM, 6, 'left');
  if (tag) {
    ctx.fillStyle = 'rgba(142,240,255,0.14)';
    const tw = ctx.measureText(tag).width + 8;
    ctx.font = 'bold 5px monospace';
    ctx.fillRect(nx + Math.min(nw, ctx.measureText(fitText(ctx, name, nw, 8)).width) + 4, yy + 10, tw, 8);
    label(ctx, tag, nx + Math.min(nw, 90) + 8, yy + 16, K.BLUE, 5);
  }

  // right status pill
  drawRight(ctx, o, x + slide + w, yy);
  ctx.restore();
}

function rightW(o) {
  if (o.cost !== undefined && !o.owned) return 46;
  if (o.right) return Math.min(72, o.right.length * 5 + 14);
  return 40;
}
function drawRight(ctx, o, rx, y) {
  const { owned, equipped, locked, cost, right, rightColor } = o;
  const h = 18;
  const cy = y + 13;
  let txt, col, fill, line;
  if (equipped) { txt = 'EQUIPPED'; col = K.GOLD; fill = 'rgba(255,198,60,0.12)'; line = K.GOLD_D; }
  else if (owned) { txt = 'OWNED'; col = K.OK; fill = 'rgba(78,197,60,0.10)'; line = K.GREEN_D; }
  else if (locked) { txt = 'LOCKED'; col = K.BAD; fill = 'rgba(232,53,42,0.10)'; line = '#5a1a16'; }
  else if (cost !== undefined) { txt = null; col = K.GOLD; fill = 'rgba(255,198,60,0.08)'; line = K.GOLD_D; }
  else { txt = right || ''; col = rightColor || K.DIM; fill = 'rgba(0,0,0,0.3)'; line = '#3a2e44'; }

  const w = txt === null ? 46 : Math.max(30, (txt.length * 4.6) + 12);
  const x = rx - w - 8;
  roundPath(ctx, x, cy, w, h, 7);
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.stroke();
  if (txt === null) {
    glyph(ctx, 'coin', x + 4, cy + 3, 12, K.GOLD);
    label(ctx, String(cost), x + 18, cy + 13, (o.costOk === false) ? K.BAD : K.GOLD, 8, 'left');
  } else {
    label(ctx, txt, x + w / 2, cy + 13, col, 7);
  }
}

// ============================================================
// TABS
// ============================================================
export function drawTabs(ctx, tabs, activeIdx, y = 40, hoverIdx = -1) {
  const n = tabs.length;
  const gap = 4;
  const w = Math.floor((KW - 16 - gap * (n - 1)) / n);
  const rects = [];
  tabs.forEach((t, i) => {
    const x = 8 + i * (w + gap);
    rects.push({ x, y, w, h: 24, id: t.id ?? i });
    const active = i === activeIdx;
    const hov = i === hoverIdx;
    tile(ctx, x, y, w, 24, 8, {
      fill: active ? K.PANEL_ACT : hov ? '#342840' : K.PANEL,
      fillLo: K.PANEL_LO,
      ring: active ? K.GOLD : null, ringW: 2, lift: active ? 3 : 1,
    });
    label(ctx, t.label, x + w / 2, y + 16, active ? K.GOLD : hov ? '#ffffff' : K.SUB, active ? 8 : 7);
  });
  return rects;
}

// ============================================================
// BUTTON — tall, chunky, obvious
// ============================================================
export function button(ctx, r, txt, o = {}) {
  const { color = K.GOLD, hover, pressed, disabled, size = 9, sub } = o;
  const y = r.y + (pressed ? 2 : 0);
  const fill = disabled ? '#3a303e' : hover ? shade(color, 0.18) : color;
  tile(ctx, r.x, y, r.w, r.h, Math.min(12, r.h / 2), {
    fill, fillLo: disabled ? '#241c26' : shade(color, -0.55),
    outline: K.INK, ring: hover && !disabled ? '#ffffff' : null, ringW: 2,
    lift: disabled ? 1 : pressed ? 1 : 4,
  });
  const ty = y + (sub ? r.h / 2 + 1 : r.h / 2 + 3);
  label(ctx, txt, r.x + r.w / 2, ty, disabled ? K.FAINT : '#ffffff', size);
  if (sub) label(ctx, sub, r.x + r.w / 2, y + r.h / 2 + 13, disabled ? K.FAINT : 'rgba(255,255,255,0.75)', 6);
  return { x: r.x, y, w: r.w, h: r.h };
}

function shade(hex, k) {
  const h = String(hex).replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16) || 0;
  const m = (v) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k));
  return `rgb(${m((n >> 16) & 255)},${m((n >> 8) & 255)},${m(n & 255)})`;
}

// ============================================================
// LIST — scrolling + keyboard + scrollbar, shared by every page
// ============================================================
export class List {
  constructor(o = {}) {
    this.top = o.top ?? 66;
    this.bottom = o.bottom ?? KH - 14;
    this.rowH = o.rowH ?? 44;
    this.gap = o.gap ?? 6;
    this.max = 0;
    this.scroll = 0;
    this.keyIndex = -1;
    this.hoverIndex = -1;
    this._wheel = 0;
  }
  get viewH() { return this.bottom - this.top; }
  get contentH() { return this.max * (this.rowH + this.gap); }
  get maxScroll() { return Math.max(0, this.contentH - this.viewH); }
  rowRect(i) {
    return { x: 8, y: this.top + i * (this.rowH + this.gap) - this.scroll, w: KW - 16, h: this.rowH, i };
  }
  visibleRange() {
    const a = Math.max(0, Math.floor((this.scroll - this.gap) / (this.rowH + this.gap)));
    const b = Math.min(this.max - 1, Math.ceil((this.scroll + this.viewH) / (this.rowH + this.gap)));
    return [a, b];
  }
  appearOf(i, pageT) { return Math.max(0, Math.min(1, (pageT - 0.05 - i * 0.045) * 3.4)); }
  // wheel + arrow-key scrolling; returns 'up'/'down' when the key selection moves
  wheelDelta(dy) { this._wheel += dy; }
  updateScroll(dt) {
    this.scroll += this._wheel * 0.9;
    this._wheel = 0;
    this.scroll = Math.max(0, Math.min(this.maxScroll, this.scroll + 0)); // clamp
    if (this.keyIndex >= 0) {
      const r = this.rowRect(this.keyIndex);
      if (r.y < this.top) this.scroll = this.keyIndex * (this.rowH + this.gap);
      if (r.y + r.h > this.bottom) this.scroll = Math.min(this.maxScroll, (this.keyIndex + 1) * (this.rowH + this.gap) - this.viewH);
    }
  }
  scrollByKey(dir) {
    if (!this.max) return -1;
    this.keyIndex = Math.max(0, Math.min(this.max - 1, (this.keyIndex < 0 ? 0 : this.keyIndex) + dir));
    return this.keyIndex;
  }
  drawScrollbar(ctx) {
    if (this.maxScroll <= 1) return;
    const x = KW - 5, y = this.top + 2, h = this.viewH - 4;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x, y, 3, h);
    const kh = Math.max(18, h * (this.viewH / this.contentH));
    const ky = y + (h - kh) * (this.scroll / this.maxScroll);
    ctx.fillStyle = K.GOLD;
    roundPath(ctx, x, ky, 3, kh, 1.5); ctx.fill();
  }
}

// ============================================================
// TOAST — a short confirming message at the bottom of a page
// ============================================================
export function drawToast(ctx, toast) {
  if (!toast) return;
  const a = Math.min(1, toast.t * 3);
  ctx.globalAlpha = a;
  const w = Math.max(120, ctx.measureText(toast.msg).width + 30);
  tile(ctx, KW / 2 - w / 2, KH - 44, w, 24, 9, {
    fill: '#1a1220', fillLo: '#100a16', outline: toast.color || K.GOLD, ring: toast.color || K.GOLD, ringW: 1, lift: 2,
  });
  label(ctx, toast.msg, KW / 2, KH - 28, toast.color || K.GOLD, 8);
  ctx.globalAlpha = 1;
}

// ============================================================
// GLYPHS — the shared little vector icon set (16x16 grid)
// ============================================================
const GLYPH_FALLBACK = 'dot';
export function glyph(ctx, kind, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 16, s / 16);
  ctx.lineJoin = 'round';
  const R = (a, b, c, d, col) => { ctx.fillStyle = col || color; ctx.fillRect(a, b, c, d); };
  const ink = () => { ctx.strokeStyle = K.INK; ctx.lineWidth = 1.5; ctx.stroke(); };
  ctx.fillStyle = color;
  switch (kind) {
    case 'coin':
      ctx.beginPath(); ctx.arc(8, 8, 7, 0, TAU); ctx.fill(); ink();
      ctx.beginPath(); ctx.arc(8, 8, 4.4, 0, TAU); ctx.fillStyle = shade(color, -0.35); ctx.fill();
      R(7, 4.5, 2, 7, '#fff6c0'); R(5.5, 6.5, 5, 1.6, '#fff6c0');
      break;
    case 'shard':
      ctx.beginPath(); ctx.moveTo(8, 1); ctx.lineTo(14, 7); ctx.lineTo(8, 15); ctx.lineTo(2, 7);
      ctx.closePath(); ctx.fill(); ink();
      ctx.beginPath(); ctx.moveTo(8, 2.5); ctx.lineTo(12, 7); ctx.lineTo(8, 7);
      ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill();
      break;
    case 'heart':
      ctx.beginPath(); ctx.moveTo(8, 13.5);
      ctx.bezierCurveTo(1.5, 9, 2, 4, 5.2, 4); ctx.bezierCurveTo(7, 4, 8, 5.6, 8, 6.4);
      ctx.bezierCurveTo(8, 5.6, 9, 4, 10.8, 4); ctx.bezierCurveTo(14, 4, 14.5, 9, 8, 13.5);
      ctx.closePath(); ctx.fill(); ink();
      break;
    case 'fire':
      ctx.beginPath(); ctx.moveTo(8, 1);
      ctx.bezierCurveTo(12, 5, 13.5, 8, 13, 10.5); ctx.bezierCurveTo(12.5, 13.5, 10, 15, 8, 15);
      ctx.bezierCurveTo(6, 15, 3.5, 13.5, 3, 10.5); ctx.bezierCurveTo(2.6, 8, 4.5, 6, 6, 4.5);
      ctx.bezierCurveTo(6, 6.5, 6.8, 7.5, 8, 8); ctx.bezierCurveTo(8.5, 6, 8.5, 3.5, 8, 1);
      ctx.closePath(); ctx.fill(); ink();
      break;
    case 'ice':
      R(7, 2, 2, 12); R(2, 7, 12, 2);
      R(4, 4, 2, 2); R(10, 10, 2, 2); R(10, 4, 2, 2); R(4, 10, 2, 2);
      ink();
      break;
    case 'bolt':
      ctx.beginPath(); ctx.moveTo(10, 1); ctx.lineTo(3, 9.5); ctx.lineTo(7, 9.5); ctx.lineTo(6, 15);
      ctx.lineTo(13, 6.5); ctx.lineTo(8.5, 6.5); ctx.closePath(); ctx.fill(); ink();
      break;
    case 'void':
      ctx.beginPath(); ctx.arc(8, 8, 6.5, 0, TAU); ctx.fill(); ink();
      ctx.beginPath(); ctx.arc(8, 8, 2.6, 0, TAU); ctx.fillStyle = K.INK; ctx.fill();
      R(11.5, 2.5, 1.6, 1.6); R(2.8, 11.5, 1.6, 1.6);
      break;
    case 'blade':
      ctx.beginPath(); ctx.arc(8, 8, 6.5, 0.4, 2.4); ctx.lineTo(8, 8); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(8, 8, 6.5, 0.4 + Math.PI, 2.4 + Math.PI); ctx.lineTo(8, 8); ctx.closePath(); ctx.fill(); ink();
      ctx.beginPath(); ctx.arc(8, 8, 1.8, 0, TAU); ctx.fillStyle = K.INK; ctx.fill();
      break;
    case 'bomb':
      ctx.beginPath(); ctx.arc(8, 10, 5.5, 0, TAU); ctx.fill(); ink();
      R(9, 2, 2, 4); R(11, 1, 2, 2, '#ffe066');
      break;
    case 'missile':
      ctx.beginPath(); ctx.moveTo(8, 1); ctx.lineTo(11, 6); ctx.lineTo(11, 12); ctx.lineTo(5, 12); ctx.lineTo(5, 6);
      ctx.closePath(); ctx.fill(); ink();
      ctx.beginPath(); ctx.moveTo(5, 12); ctx.lineTo(3, 15); ctx.lineTo(8, 13); ctx.lineTo(13, 15); ctx.lineTo(11, 12);
      ctx.closePath(); ctx.fill(); ink();
      break;
    case 'gun':
      roundPath(ctx, 1.5, 6, 11, 4, 1); ctx.fill(); ink();
      roundPath(ctx, 3.5, 9.5, 3.5, 4.5, 1); ctx.fill(); ink();
      R(11.5, 4.5, 3, 2.5); ink();
      break;
    case 'rail':
      R(2, 6, 12, 2); R(6, 4, 4, 6); R(7, 10, 2, 4); ink();
      break;
    case 'flame':
      ctx.beginPath(); ctx.moveTo(4, 14); ctx.lineTo(4, 8); ctx.lineTo(8, 2); ctx.lineTo(12, 8); ctx.lineTo(12, 14);
      ctx.closePath(); ctx.fill(); ink();
      break;
    case 'toxic':
      ctx.beginPath(); ctx.arc(8, 9, 6, 0, TAU); ctx.fill(); ink();
      ctx.beginPath(); ctx.arc(6, 8, 1.6, 0, TAU); ctx.arc(10.4, 10, 1.2, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill();
      break;
    case 'blood':
      ctx.beginPath(); ctx.moveTo(8, 2); ctx.bezierCurveTo(12, 7, 13, 9.5, 13, 11); ctx.arc(8, 11, 5, 0, Math.PI);
      ctx.bezierCurveTo(3, 9.5, 4, 7, 8, 2); ctx.closePath(); ctx.fill(); ink();
      break;
    case 'shadow':
      ctx.beginPath(); ctx.arc(8, 8, 6.5, Math.PI * 0.85, Math.PI * 2.15); ctx.fill(); ink();
      ctx.beginPath(); ctx.arc(8, 10, 4, 0, Math.PI); ctx.fill();
      break;
    case 'star':
      star(ctx, 8, 8, 7.5, color); break;
    case 'trophy':
      R(4, 2, 8, 7); R(2, 3, 2, 4); R(12, 3, 2, 4); R(7, 9, 2, 3); R(5, 12, 6, 2); ink();
      break;
    case 'gift':
      R(2, 6, 12, 8); ink(); R(6.5, 2, 3, 12, '#ffe066'); R(2, 6, 12, 2.4, '#ffe066');
      ctx.beginPath(); ctx.arc(5.5, 4, 2.4, 0, TAU); ctx.arc(10.5, 4, 2.4, 0, TAU);
      ctx.fillStyle = '#ffe066'; ctx.fill(); ink();
      break;
    case 'calendar':
      roundPath(ctx, 2, 3.5, 12, 10.5, 2); ctx.fill(); ink();
      R(3, 6.5, 10, 6.5, '#2a2030'); R(4, 1.5, 2, 3); R(10, 1.5, 2, 3);
      R(4.5, 8, 2, 2, color); R(8, 8, 2, 2, color); R(4.5, 11, 2, 2, color);
      break;
    case 'cog':
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        R(8 + Math.cos(a) * 6 - 1.6, 8 + Math.sin(a) * 6 - 1.6, 3.2, 3.2);
      }
      ctx.beginPath(); ctx.arc(8, 8, 5, 0, TAU); ctx.fill(); ink();
      ctx.beginPath(); ctx.arc(8, 8, 2.2, 0, TAU); ctx.fillStyle = K.INK; ctx.fill();
      break;
    case 'chest':
      roundPath(ctx, 2, 6, 12, 8, 1.5); ctx.fill(); ink();
      ctx.beginPath(); ctx.arc(8, 6.5, 6, Math.PI, 0); ctx.fill(); ink();
      R(2, 8.5, 12, 1.6, K.INK); R(6.8, 7.5, 2.4, 4, K.INK); R(7.2, 8.4, 1.6, 2, '#fff0a0');
      break;
    case 'train':
      R(2, 6, 12, 6); R(4, 2, 6, 4); R(3, 12, 3, 2.4); R(10, 12, 3, 2.4); R(6, 7.5, 4, 2, '#fff6c0'); ink();
      break;
    case 'anvil':
      ctx.beginPath();
      ctx.moveTo(2, 5); ctx.lineTo(14, 5); ctx.lineTo(12, 9); ctx.lineTo(10, 9); ctx.lineTo(10, 11);
      ctx.lineTo(12.5, 14); ctx.lineTo(3.5, 14); ctx.lineTo(6, 11); ctx.lineTo(6, 9); ctx.lineTo(3.5, 9);
      ctx.closePath(); ctx.fill(); ink();
      break;
    case 'coinbag':
      ctx.beginPath(); ctx.arc(8, 10, 5.8, 0, TAU); ctx.fill(); ink();
      R(5.5, 2, 5, 3); ink();
      ctx.fillStyle = K.INK; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillText('$', 8, 12.5); ctx.textAlign = 'left';
      break;
    case 'shield':
      ctx.beginPath();
      ctx.moveTo(8, 1.5); ctx.lineTo(14, 4); ctx.lineTo(14, 8.5);
      ctx.quadraticCurveTo(14, 13, 8, 15); ctx.quadraticCurveTo(2, 13, 2, 8.5);
      ctx.lineTo(2, 4); ctx.closePath(); ctx.fill(); ink();
      R(7.2, 5, 1.6, 6, K.INK); R(5, 7.2, 6, 1.6, K.INK);
      break;
    case 'relic':
      ctx.beginPath(); ctx.arc(8, 2.5, 1.4, 0, TAU); ctx.fill();
      R(7.4, 3.5, 1.2, 2.5);
      ctx.beginPath(); ctx.moveTo(8, 5.5); ctx.lineTo(12.5, 9); ctx.lineTo(8, 14.5); ctx.lineTo(3.5, 9);
      ctx.closePath(); ctx.fill(); ink();
      ctx.beginPath(); ctx.moveTo(8, 7.5); ctx.lineTo(10.5, 9.4); ctx.lineTo(8, 12.2); ctx.lineTo(5.5, 9.4);
      ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
      break;
    case 'lock':
      roundPath(ctx, 3, 7, 10, 8, 2); ctx.fill(); ink();
      ctx.beginPath(); ctx.arc(8, 7, 3.4, Math.PI, 0);
      ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.stroke();
      R(7, 9.5, 2, 3.5, K.INK);
      break;
    case 'map':
      roundPath(ctx, 2, 3, 12, 10, 2); ctx.fill(); ink();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.moveTo(4, 11); ctx.lineTo(7, 6); ctx.lineTo(10, 9); ctx.lineTo(12, 5);
      ctx.lineTo(12, 11.5); ctx.lineTo(4, 11.5); ctx.closePath(); ctx.fill();
      break;
    case 'battle':
      ctx.beginPath(); ctx.moveTo(8, 1); ctx.lineTo(14, 13); ctx.lineTo(8, 10); ctx.lineTo(2, 13);
      ctx.closePath(); ctx.fill(); ink();
      break;
    case 'ghost':
      R(4, 3, 8, 8); R(4, 11, 2, 2); R(8, 11, 2, 2); R(12, 11, 1, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; R(6, 6, 2, 2); R(9, 6, 2, 2);
      ink();
      break;
    case 'skull':
      R(4, 3, 8, 6); R(5, 9, 6, 2); R(6, 11, 4, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; R(5, 5, 2, 2); R(9, 5, 2, 2);
      ink();
      break;
    case 'book':
      roundPath(ctx, 3, 2, 10, 12, 2); ctx.fill(); ink();
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(8, 2, 1.4, 12);
      R(5, 5, 5, 1.2, 'rgba(255,255,255,0.5)'); R(5, 8, 5, 1.2, 'rgba(255,255,255,0.5)');
      break;
    case 'crown':
      ctx.beginPath(); ctx.moveTo(2, 12); ctx.lineTo(2, 5); ctx.lineTo(5.5, 8.5); ctx.lineTo(8, 3);
      ctx.lineTo(10.5, 8.5); ctx.lineTo(14, 5); ctx.lineTo(14, 12); ctx.closePath(); ctx.fill(); ink();
      break;
    case 'energy':
      ctx.beginPath(); ctx.moveTo(10, 1); ctx.lineTo(3, 9.5); ctx.lineTo(7, 9.5); ctx.lineTo(6, 15);
      ctx.lineTo(13, 6.5); ctx.lineTo(8.5, 6.5); ctx.closePath(); ctx.fill(); ink();
      break;
    case 'check':
      ctx.beginPath(); ctx.moveTo(3, 9); ctx.lineTo(7, 13); ctx.lineTo(13, 4);
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke(); ink();
      break;
    case 'cross':
      R(6.5, 2, 3, 12); R(2, 6.5, 12, 3); ink();
      break;
    case 'turret':
      R(4, 4, 8, 5); R(12, 5, 3, 2); R(6, 9, 4, 3); R(4, 12, 8, 2); ink();
      break;
    case 'echo':
      ctx.strokeStyle = color; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(8, 8, 3, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(8, 8, 6, 0, TAU); ctx.stroke();
      break;
    case 'charge':
      ctx.beginPath(); ctx.moveTo(2, 13); ctx.lineTo(8, 3); ctx.lineTo(8, 8); ctx.lineTo(14, 8);
      ctx.lineTo(8, 13.5); ctx.closePath(); ctx.fill(); ink();
      break;
    case 'drone':
      ctx.beginPath(); ctx.arc(8, 8, 4, 0, TAU); ctx.fill(); ink();
      R(0, 2, 4, 2); R(12, 2, 4, 2); R(0, 12, 4, 2); R(12, 12, 4, 2);
      break;
    case 'bell':
      ctx.beginPath(); ctx.moveTo(4, 11); ctx.quadraticCurveTo(5, 3, 8, 3); ctx.quadraticCurveTo(11, 3, 12, 11);
      ctx.closePath(); ctx.fill(); ink();
      R(2.5, 11, 11, 2); ctx.beginPath(); ctx.arc(8, 14, 1.6, 0, TAU); ctx.fill();
      break;
    case 'target':
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(8, 8, 5.5, 0, TAU); ctx.stroke();
      R(7, 7, 2, 2);
      break;
    case 'dot':
    default:
      ctx.beginPath(); ctx.arc(8, 8, 5, 0, TAU); ctx.fill(); ink();
  }
  ctx.restore();
}

function star(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU - Math.PI / 2;
    const rr = i % 2 ? r * 0.42 : r;
    const fn = i ? 'lineTo' : 'moveTo';
    ctx[fn](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}

// A dashed separator with a small caption — used to break page sections.
export function sectionLabel(ctx, txt, y) {
  label(ctx, txt, 10, y, K.DIM, 7, 'left');
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath(); ctx.moveTo(10, y + 5); ctx.lineTo(KW - 10, y + 5); ctx.stroke();
}

// ============================================================
// SEASON AVATARS + FRAMES — profile pictures earned by ranking
// at the end of a monthly season. Drawn, not rolled.
// ============================================================
export function drawAvatar(ctx, cx, cy, r, avatarId) {
  // conductor bust: cap + face + shoulders, tinted per avatar
  const tint = { ava_aurum: '#ffd24a', ava_argent: '#d8dce8', ava_ember: '#ff9033',
    ava_top5: '#8ef0ff', ava_top10: '#c07aff' }[avatarId] || '#cfd4e0';
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
  ctx.fillStyle = '#1a1226';
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // shoulders
  ctx.fillStyle = tint;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(cx - r, cy + r * 0.45, r * 2, r);
  ctx.globalAlpha = 1;
  // head
  ctx.fillStyle = '#e8c8a8';
  ctx.beginPath(); ctx.arc(cx, cy - r * 0.05, r * 0.52, 0, TAU); ctx.fill();
  // cap with brim
  ctx.fillStyle = tint;
  ctx.beginPath(); ctx.arc(cx, cy - r * 0.28, r * 0.54, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.fillRect(cx - r * 0.62, cy - r * 0.3, r * 1.24, r * 0.14);
  // calm eyes
  ctx.fillStyle = '#1a1026';
  ctx.fillRect(cx - r * 0.26, cy - r * 0.02, r * 0.14, r * 0.14);
  ctx.fillRect(cx + r * 0.12, cy - r * 0.02, r * 0.14, r * 0.14);
  ctx.restore();
  // rim
  ctx.strokeStyle = tint;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
}

export function drawFrame(ctx, cx, cy, r, frameId) {
  if (!frameId) return;
  const spec = {
    fra_aurum:  { c: '#ffd24a', corners: 'star' },
    fra_argent: { c: '#d8dce8', corners: 'diamond' },
    fra_ember:  { c: '#ff9033', corners: 'flame' },
  }[frameId];
  if (!spec) return;
  ctx.strokeStyle = spec.c;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, TAU); ctx.stroke();
  // corner marks at the four diagonals
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2;
    const px = cx + Math.cos(a) * (r + 3), py = cy + Math.sin(a) * (r + 3);
    ctx.fillStyle = spec.c;
    if (spec.corners === 'star') {
      ctx.beginPath();
      for (let j = 0; j < 10; j++) {
        const aa = j / 10 * TAU - Math.PI / 2;
        const rr = j % 2 ? 1.6 : 3.6;
        const fx = px + Math.cos(aa) * rr, fy = py + Math.sin(aa) * rr;
        j ? ctx.lineTo(fx, fy) : ctx.moveTo(fx, fy);
      }
      ctx.closePath(); ctx.fill();
    } else if (spec.corners === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(px, py - 3.6); ctx.lineTo(px + 3.6, py); ctx.lineTo(px, py + 3.6); ctx.lineTo(px - 3.6, py);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(px, py - 3.4); ctx.quadraticCurveTo(px + 3.4, py, px, py + 3.4);
      ctx.quadraticCurveTo(px - 3.4, py, px, py - 3.4);
      ctx.fill();
    }
  }
}

// v1.8: wrap a description and AUTO-SIZE it so the block fills the given
// area edge to edge — never clipped, never shrunk into unreadability.
export function fitTextBlock(ctx, str, maxW, maxH, baseSize, minSize = 5) {
  str = String(str);
  const wrap = (size) => {
    ctx.font = 'bold ' + size + 'px monospace';
    const words = str.split(/\s+/);
    const lines = [];
    let cur = '';
    for (const wd of words) {
      const test = cur ? cur + ' ' + wd : wd;
      if (ctx.measureText(test).width <= maxW || !cur) cur = test;
      else { lines.push(cur); cur = wd; }
    }
    if (cur) lines.push(cur);
    return lines;
  };
  let size = Math.round(baseSize * TEXT_SCALE);
  const floor = Math.round(minSize * TEXT_SCALE);
  let lines = wrap(size);
  while (size > floor && lines.length * (size * 1.18) > maxH) {
    size -= 1;
    lines = wrap(size);
  }
  return { size, lines, lineH: Math.ceil(size * 1.18) };
}

// ============================================================
// RIVETED STEEL SYSTEM (v1.8 metallic terminal)
// ============================================================
export function rivet(ctx, x, y, r = 1.7) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = '#1a171d'; ctx.fill();
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.55, 0, TAU); ctx.fillStyle = '#8b8592'; ctx.fill();
}
export function steelPlate(ctx, x, y, w, h, opts = {}) {
  const tone = opts.tone || 0;
  const top = tone === 2 ? '#4a4550' : tone === 1 ? '#3a3640' : '#332f3a';
  const mid = tone === 2 ? '#37333e' : tone === 1 ? '#2b2832' : '#26222c';
  const bot = tone === 2 ? '#211e28' : tone === 1 ? '#1b1820' : '#171419';
  const rad = opts.r ?? 8;
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top); g.addColorStop(0.5, mid); g.addColorStop(1, bot);
  roundPath(ctx, x, y, w, h, rad);
  ctx.fillStyle = g; ctx.fill();
  // brushed obsidian streaking
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 1;
  const stripes = Math.max(2, Math.floor(h / 9));
  for (let i = 1; i < stripes; i++) {
    const sy = y + (h * i) / stripes;
    ctx.beginPath(); ctx.moveTo(x + 3, sy); ctx.lineTo(x + w - 3, sy); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(210,200,220,0.16)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x + 4, y + 0.5); ctx.lineTo(x + w - 4, y + 0.5); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath(); ctx.moveTo(x + 4, y + h - 0.5); ctx.lineTo(x + w - 4, y + h - 0.5); ctx.stroke();
  ctx.strokeStyle = '#0c0a0e'; ctx.lineWidth = 1.5;
  roundPath(ctx, x, y, w, h, rad); ctx.stroke();
  const n = Math.max(2, Math.floor((w * h) / 2600));
  for (let i = 0; i < n; i++) {
    const rx = x + 6 + ((i * 53) % Math.max(1, w - 12));
    const ry = y + 6 + ((i * 97 + 31) % Math.max(1, h - 12));
    ctx.fillStyle = `rgba(150,68,26,${(0.05 + ((i * 7) % 5) * 0.012).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(rx, ry, 2 + (i % 3), 0, TAU); ctx.fill();
  }
  rivet(ctx, x + 5, y + 5); rivet(ctx, x + w - 5, y + 5);
  rivet(ctx, x + 5, y + h - 5); rivet(ctx, x + w - 5, y + h - 5);
  if (w > 100) { rivet(ctx, x + w / 2, y + 5); rivet(ctx, x + w / 2, y + h - 5); }
  if (w > 200) {
    rivet(ctx, x + w * 0.25, y + 5); rivet(ctx, x + w * 0.75, y + 5);
    rivet(ctx, x + w * 0.25, y + h - 5); rivet(ctx, x + w * 0.75, y + h - 5);
  }
}
export function steelButton(ctx, x, y, w, h, opts = {}) {
  steelPlate(ctx, x, y, w, h, { tone: opts.tone ?? 1, r: opts.r ?? 7 });
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x + 3, y + 2, Math.max(0, w - 6), 1.5);
}
