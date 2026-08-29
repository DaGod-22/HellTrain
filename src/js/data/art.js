// ============================================================
// HELL TRAIN — THE ART FORGE
// Bakes every animated sprite in the game at runtime from
// procedural pixel-art rigs (see core/pixel.js).
//
// Everything here is real pixel art: consistent light direction,
// 5-tone material ramps, rim light, colour-bled outlines,
// squash & stretch, sub-pixel-free integer animation.
// ============================================================
import { Pix, mat, ramp, makeCanvas, whiteSilhouette, hueShift, shadowSprite, mixc, rgb2hex, hex2rgb, shade } from '../core/pixel.js';
import { findCharSkin, findTrainSkin, CHAR_SKINS, TRAIN_SKINS } from './skins.js';

const TAU = Math.PI * 2;
const sin = Math.sin, cos = Math.cos;

// ------------------------------------------------------------------
// Shared material factory
// ------------------------------------------------------------------
function M(base, opts) { return mat(base, opts); }

function charMats(skin) {
  const p = skin.pal;
  return {
    coat: M(p.coat, { rim: p.glow }),
    coatDark: M(p.coatDark, { rim: p.accent }),
    cloth: M(p.cloth, { rim: p.accent }),
    trim: M(p.trim, { kind: 'metal', spec: 1, rim: '#ffffff' }),
    metal: M(p.metal, { kind: 'metal', spec: 1, rim: '#ffffff' }),
    skin: M(p.skin, { rim: p.glow }),
    glow: M(p.glow, { kind: 'glow' }),
    accent: M(p.accent, { rim: p.glow }),
    boot: M(shadeHex(p.coatDark, -0.25), { rim: p.accent }),
  };
}
function shadeHex(c, a) { return rgb2hex(shade(c, a)); }

// ==================================================================
// THE CONDUCTOR — character rig
// ==================================================================
// Canvas 24x28, feet on y=25, centre x=12.
const CW = 24, CH = 28;

function drawCharDown(g, m, s, pose) {
  const { step = 0, bob = 0, lean = 0, atk = 0, cape = 0, squash = 1 } = pose;
  const b = Math.round(bob);
  const legL = Math.round(sin(step * TAU) * 2);
  const legR = Math.round(sin(step * TAU + Math.PI) * 2);
  const armL = Math.round(sin(step * TAU + Math.PI) * 2);
  const armR = Math.round(sin(step * TAU) * 2);
  const cx = 12 + Math.round(lean);

  // ---- coat tail / cape behind ----
  const capeSway = Math.round(sin(cape * TAU) * 1.4);
  if (s.cape === 'tattered') {
    for (let i = 0; i < 5; i++) {
      const xx = cx - 5 + i * 2.5;
      const h = 4 + ((i * 7) % 3) + Math.round(sin(cape * TAU + i) * 1.2);
      g.rect(xx | 0, 17 + b, 2, h, m.coatDark);
    }
  } else {
    g.poly([[cx - 6 + capeSway, 12 + b], [cx + 6 + capeSway, 12 + b],
      [cx + 7 + capeSway, 22 + b], [cx - 7 + capeSway, 22 + b]], m.coatDark);
  }

  // ---- legs ----
  g.limb(cx - 3, 16 + b, cx - 3, 21 + b + legL, 1.7, m.cloth);
  g.limb(cx + 3, 16 + b, cx + 3, 21 + b + legR, 1.7, m.cloth);
  g.rect(cx - 5, 22 + b + legL, 4, 3, m.boot);
  g.rect(cx + 2, 22 + b + legR, 4, 3, m.boot);

  // ---- coat body ----
  g.poly([[cx - 4, 10 + b], [cx + 4, 10 + b], [cx + 5, 18 + b], [cx - 5, 18 + b]], m.coat);
  g.ell(cx, 12 + b, 4.8, 3.2, m.coat);
  // lapels (darker V) + button row
  g.poly([[cx - 4, 10 + b], [cx, 15 + b], [cx + 4, 10 + b]], m.coatDark);
  g.px(cx, 13 + b, m.trim); g.px(cx, 15 + b, m.trim);
  // belt
  g.rect(cx - 5, 16 + b, 10, 1, m.metal);
  g.px(cx, 16 + b, m.trim);

  // ---- arms ----
  const ax = atk > 0 ? 3 : 0;
  g.limb(cx - 4, 11 + b, cx - 6, 15 + b + armL, 1.5, m.coat);
  g.limb(cx + 4, 11 + b, cx + 6 + ax, 15 + b + armR - Math.round(atk * 4), 1.5, m.coat);
  g.ell(cx - 6, 16 + b + armL, 1.4, 1.4, m.skin);
  g.ell(cx + 6 + ax, 16 + b + armR - Math.round(atk * 4), 1.4, 1.4, m.skin);

  // ---- scarf ----
  g.rect(cx - 4, 10 + b, 8, 2, m.accent);
  g.rect(cx + 3 + capeSway, 10 + b, 2, 4 + Math.round(sin(cape * TAU) * 2), m.accent);

  // ---- head ----
  g.ell(cx, 6 + b, 3.8, 4.2, m.skin);
  // hat
  drawHat(g, m, s, cx, b, 'down');
  // face: shaded eye band with two glowing eyes
  g.rect(cx - 3, 7 + b, 7, 2, M('#160c22', { kind: 'flat' }));
  g.rect(cx - 3, 8 + b, 2, 1, M(s.pal.glow, { kind: 'flat' }));
  g.rect(cx + 2, 8 + b, 2, 1, M(s.pal.glow, { kind: 'flat' }));
  g.rect(cx - 2, 10 + b, 4, 1, m.skin);   // chin catch-light
  if (s.aura === 'void' || s.aura === 'apocalypse') { g.px(cx - 2, 6 + b, m.glow); g.px(cx + 2, 6 + b, m.glow); }
}

function drawCharUp(g, m, s, pose) {
  const { step = 0, bob = 0, lean = 0, cape = 0, atk = 0 } = pose;
  const b = Math.round(bob);
  const legL = Math.round(sin(step * TAU) * 2);
  const legR = Math.round(sin(step * TAU + Math.PI) * 2);
  const cx = 12 + Math.round(lean);
  const capeSway = Math.round(sin(cape * TAU) * 1.4);

  g.limb(cx - 3, 16 + b, cx - 3, 21 + b + legL, 1.7, m.cloth);
  g.limb(cx + 3, 16 + b, cx + 3, 21 + b + legR, 1.7, m.cloth);
  g.rect(cx - 5, 22 + b + legL, 4, 3, m.boot);
  g.rect(cx + 2, 22 + b + legR, 4, 3, m.boot);

  // coat back (one panel, centre seam + small emblem)
  g.poly([[cx - 4, 10 + b], [cx + 4, 10 + b], [cx + 5 + capeSway, 19 + b], [cx - 5 + capeSway, 19 + b]], m.coat);
  g.ell(cx, 12 + b, 4.8, 3.2, m.coat);
  g.line(cx, 11 + b, cx, 18 + b, m.coatDark);
  g.rect(cx - 5, 16 + b, 10, 1, m.metal);
  drawEmblem(g, m, s, cx - 1, 12 + b);

  // arms
  g.limb(cx - 4, 11 + b, cx - 6, 16 + b - Math.round(atk * 3), 1.5, m.coat);
  g.limb(cx + 4, 11 + b, cx + 6, 16 + b - Math.round(atk * 3), 1.5, m.coat);

  // scarf tails flowing up-behind
  g.rect(cx - 4, 10 + b, 8, 2, m.accent);
  g.rect(cx - 5 + capeSway, 7 + b, 2, 3, m.accent);
  g.rect(cx + 3 - capeSway, 7 + b, 2, 3, m.accent);

  // head (back)
  g.ell(cx, 6 + b, 4, 4.2, m.skin);
  g.ell(cx, 5 + b, 4, 3.2, m.coatDark); // hair/back of head
  drawHat(g, m, s, cx, b, 'up');
}

function drawCharSide(g, m, s, pose) {
  const { step = 0, bob = 0, lean = 0, atk = 0, cape = 0 } = pose;
  const b = Math.round(bob);
  const stride = sin(step * TAU);
  const cx = 12 + Math.round(lean);
  const capeSway = Math.round(sin(cape * TAU) * 1.6);

  // rear coat tail
  if (s.cape === 'tattered') {
    for (let i = 0; i < 4; i++) {
      g.rect(cx - 8 - capeSway + i, 15 + b + i, 2, 5 - i * 0.4, m.coatDark);
    }
  } else {
    g.poly([[cx - 4, 11 + b], [cx - 4, 21 + b], [cx - 9 - capeSway, 20 + b], [cx - 7 - capeSway, 11 + b]], m.coatDark);
  }

  // back leg
  g.limb(cx - 1, 16 + b, cx - 2 - Math.round(stride * 3), 21 + b, 1.7, m.cloth);
  g.rect(cx - 4 - Math.round(stride * 3), 22 + b, 5, 3, m.boot);
  // front leg
  g.limb(cx + 1, 16 + b, cx + 2 + Math.round(stride * 3), 21 + b, 1.8, m.cloth);
  g.rect(cx + Math.round(stride * 3), 22 + b, 5, 3, m.boot);

  // torso (profile)
  g.poly([[cx - 4, 10 + b], [cx + 4, 10 + b], [cx + 4, 18 + b], [cx - 4, 18 + b]], m.coat);
  g.ell(cx, 12 + b, 4.2, 3.2, m.coat);
  g.rect(cx - 4, 16 + b, 9, 1, m.metal);
  g.line(cx + 3, 11 + b, cx + 3, 15 + b, m.trim);

  // arm
  const ex = atk > 0 ? Math.round(4 * atk) : 0;
  g.limb(cx + 2, 12 + b, cx + 4 + ex + Math.round(stride * 2), 15 + b - Math.round(atk * 3), 1.7, m.coat);
  g.ell(cx + 5 + ex + Math.round(stride * 2), 16 + b - Math.round(atk * 3), 1.5, 1.5, m.skin);

  // scarf
  g.rect(cx - 3, 10 + b, 7, 2, m.accent);
  g.rect(cx - 6 - capeSway, 10 + b, 4, 2, m.accent);

  // head profile
  g.ell(cx + 1, 6 + b, 3.8, 4.1, m.skin);
  drawHat(g, m, s, cx + 1, b, 'side');
  g.rect(cx + 2, 8 + b, 3, 1, M('#160c22', { kind: 'flat' }));
  g.rect(cx + 3, 8 + b, 2, 1, m.glow);
}

function drawHat(g, m, s, cx, b, dir) {
  const kind = s.hat || 'cap';
  if (kind === 'cap') {
    g.rect(cx - 4, 2 + b, 8, 4, m.coatDark);
    g.ell(cx, 3 + b, 4, 2.4, m.coatDark);
    g.rect(cx - 5, 5 + b, 10, 2, m.coat);
    if (dir !== 'up') g.rect(cx - 1, 3 + b, 2, 2, m.trim);
  } else if (kind === 'top') {
    g.rect(cx - 3, -1 + b, 6, 7, m.coatDark);
    g.rect(cx - 6, 5 + b, 12, 2, m.coat);
    g.rect(cx - 3, 3 + b, 6, 1, m.trim);
  } else if (kind === 'hood') {
    g.ell(cx, 5 + b, 5.6, 5.4, m.coatDark);
    g.ell(cx, 7 + b, 3.4, 3.2, m.coat);
    if (dir !== 'up') { g.rect(cx - 3, 6 + b, 6, 3, M('#0a0410', { kind: 'flat' })); }
    g.rect(cx - 5, 9 + b, 10, 2, m.coatDark);
  } else if (kind === 'horns') {
    g.rect(cx - 4, 2 + b, 8, 4, m.metal);
    g.line(cx - 4, 2 + b, cx - 7, -2 + b, m.trim, 1.6);
    g.line(cx + 4, 2 + b, cx + 7, -2 + b, m.trim, 1.6);
    g.rect(cx - 5, 5 + b, 10, 2, m.metal);
  } else if (kind === 'visor') {
    g.rect(cx - 4, 2 + b, 8, 4, m.coatDark);
    g.rect(cx - 5, 5 + b, 10, 2, m.glow);
  } else if (kind === 'mitre') {
    g.poly([[cx, -3 + b], [cx + 4, 5 + b], [cx - 4, 5 + b]], m.coat);
    g.rect(cx - 4, 5 + b, 8, 2, m.trim);
  } else if (kind === 'crown') {
    g.rect(cx - 4, 2 + b, 8, 3, m.metal);
    for (let i = -1; i <= 1; i++) g.rect(cx + i * 3 - 1, -1 + b, 2, 3, m.trim);
    g.rect(cx - 5, 5 + b, 10, 2, m.metal);
  }
}

function drawEmblem(g, m, s, x, y) {
  const e = s.emblem;
  if (e === 'lamp') { g.rect(x, y, 2, 3, m.trim); g.px(x, y + 1, m.glow); }
  else if (e === 'ember') { g.px(x + 1, y, m.glow); g.px(x, y + 1, m.glow); g.px(x + 2, y + 1, m.glow); }
  else if (e === 'crystal') { g.poly([[x + 1, y - 1], [x + 3, y + 1], [x + 1, y + 3], [x - 1, y + 1]], m.glow); }
  else if (e === 'rift') { g.line(x + 1, y - 1, x + 1, y + 3, m.glow); g.px(x, y + 1, m.glow); g.px(x + 2, y + 1, m.glow); }
  else if (e === 'coin') { g.ell(x + 1, y + 1, 1.8, 1.8, m.trim); }
  else if (e === 'circuit') { g.line(x - 1, y + 1, x + 3, y + 1, m.glow); g.px(x + 1, y - 1, m.glow); g.px(x + 1, y + 3, m.glow); }
  else if (e === 'skull') { g.ell(x + 1, y + 1, 1.8, 1.8, m.trim); g.px(x, y + 1, m.coatDark); g.px(x + 2, y + 1, m.coatDark); }
  else if (e === 'omega') { g.ring(x + 1, y + 1, 1.8, 1, m.glow); g.px(x, y + 3, m.glow); g.px(x + 2, y + 3, m.glow); }
}

function charFrame(skin, dir, pose) {
  const g = new Pix(CW, CH);
  const m = charMats(skin);
  if (dir === 'down') drawCharDown(g, m, skin, pose);
  else if (dir === 'up') drawCharUp(g, m, skin, pose);
  else drawCharSide(g, m, skin, pose);
  return g.toCanvas({ lx: -0.55, ly: -0.83, rim: 1 });
}

const _charCache = {};
export function buildCharSet(skinId) {
  if (_charCache[skinId]) return _charCache[skinId];
  const skin = findCharSkin(skinId);
  const set = {};
  for (const dir of ['down', 'up', 'side']) {
    const idle = [], run = [], attack = [], dash = [], hurt = [], death = [];
    for (let i = 0; i < 6; i++) {
      const t = i / 6;
      idle.push(charFrame(skin, dir, { step: 0, bob: sin(t * TAU) > 0.5 ? -1 : 0, cape: t }));
    }
    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      run.push(charFrame(skin, dir, { step: t, bob: Math.abs(sin(t * TAU * 2)) > 0.5 ? -1 : 0, cape: t, lean: dir === 'side' ? 1 : 0 }));
    }
    for (let i = 0; i < 4; i++) {
      const t = i / 3;
      const a = t < 0.5 ? t * 2 : (1 - t) * 2;
      attack.push(charFrame(skin, dir, { step: 0, bob: 0, atk: a, cape: t * 0.5, lean: dir === 'side' ? Math.round(a * 2) : 0 }));
    }
    for (let i = 0; i < 4; i++) {
      const t = i / 4;
      dash.push(charFrame(skin, dir, { step: 0.25, bob: -1, cape: 0.25 + t * 0.5, lean: dir === 'side' ? 2 : 0 }));
    }
    for (let i = 0; i < 2; i++) hurt.push(charFrame(skin, dir, { step: 0, bob: 1, lean: -1, cape: i * 0.5 }));
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      death.push(charFrame(skin, dir, { step: 0, bob: Math.round(t * 4), lean: Math.round(t * 3), cape: t }));
    }
    set[dir] = { idle, run, attack, dash, hurt, death };
  }
  set.skin = skin;
  set.portrait = charFrame(skin, 'down', { step: 0, bob: 0, cape: 0.2 });
  _charCache[skinId] = set;
  return set;
}

// ==================================================================
// THE TRAIN — engine + carriage rig (side view, animated)
// ==================================================================
const TW = 76, TH = 44;

function trainMats(skin) {
  const p = skin.pal;
  return {
    body: M(p.body, { rim: p.glow }),
    dark: M(p.bodyDark, { rim: p.glow }),
    trim: M(p.trim, { kind: 'metal', spec: 1, rim: '#ffffff' }),
    metal: M(p.metal, { kind: 'metal', spec: 1, rim: '#ffffff' }),
    glow: M(p.glow, { kind: 'glow' }),
    glass: M(p.glass, { rim: '#ffffff' }),
    wheel: M(p.wheel, { kind: 'metal', spec: 1 }),
  };
}

function trainEngineFrame(skin, phase, opts = {}) {
  const g = new Pix(TW, TH);
  const m = trainMats(skin);
  const dmg = opts.damage || 0;
  const base = 34;              // rail line
  const bob = sin(phase * TAU * 2) > 0 ? 0 : 1;

  // --- chassis ---
  g.rect(6, base - 6 + bob, 64, 6, m.dark);
  // --- boiler ---
  g.rect(10, base - 18 + bob, 44, 12, m.body);
  g.ell(54, base - 12 + bob, 6, 6, m.body);      // boiler front dome
  g.rect(8, base - 20 + bob, 6, 14, m.dark);     // rear step
  // boiler bands
  for (let i = 0; i < 4; i++) g.rect(14 + i * 10, base - 18 + bob, 1, 12, m.trim);
  // --- cab ---
  g.rect(12, base - 30 + bob, 20, 13, m.body);
  g.rect(11, base - 32 + bob, 22, 3, m.dark);    // cab roof
  g.rect(15, base - 28 + bob, 6, 6, m.glass);    // window
  g.rect(23, base - 28 + bob, 6, 6, m.glass);
  // --- chimney ---
  g.rect(48, base - 30 + bob, 7, 12, m.dark);
  g.rect(46, base - 32 + bob, 11, 3, m.metal);
  g.rect(48, base - 29 + bob, 7, 2, m.glow);
  // --- headlamp ---
  g.ell(60, base - 16 + bob, 3.4, 3.4, m.metal);
  g.ell(60, base - 16 + bob, 2, 2, m.glow);
  // --- cow catcher ---
  g.poly([[58, base - 6 + bob], [70, base + 1 + bob], [58, base + 1 + bob]], m.metal);
  for (let i = 0; i < 4; i++) g.line(60 + i * 2, base - 4 + bob, 60 + i * 2, base + 1 + bob, m.dark);
  // --- furnace glow ---
  const fl = 0.6 + 0.4 * sin(phase * TAU * 3);
  g.rect(33, base - 14 + bob, 6, 7, m.dark);
  g.rect(34, base - 13 + bob + (fl > 0.8 ? -1 : 0), 4, 5, m.glow);

  // --- wheels + rods ---
  const wheels = [[18, 4.6], [30, 5.6], [44, 5.6], [56, 4.2]];
  for (const [wx, wr] of wheels) {
    g.ell(wx, base + bob, wr, wr, m.wheel);
    g.ell(wx, base + bob, wr - 2, wr - 2, m.dark);
    g.ell(wx, base + bob, 1.4, 1.4, m.metal);
    // spokes rotate
    for (let s = 0; s < 4; s++) {
      const a = phase * TAU + s * (TAU / 4);
      g.line(wx, base + bob, wx + cos(a) * (wr - 1), base + bob + sin(a) * (wr - 1), m.metal);
    }
  }
  // connecting rod
  const ra = phase * TAU;
  const ry = sin(ra) * 3.2;
  g.line(30 + cos(ra) * 3, base + bob + ry, 56 + cos(ra) * 3, base + bob + ry, m.trim, 1.6);
  g.line(18, base + bob + ry * 0.6, 30 + cos(ra) * 3, base + bob + ry, m.trim);

  // --- damage state ---
  if (dmg > 0.5) {
    g.rect(20, base - 26 + bob, 3, 3, m.dark);
    g.rect(38, base - 16 + bob, 4, 2, m.dark);
  }
  if (dmg > 0.8) { g.rect(28, base - 20 + bob, 5, 3, m.dark); g.rect(15, base - 12 + bob, 3, 4, m.dark); }

  return g.toCanvas({ lx: -0.4, ly: -0.9 });
}

function trainCarFrame(skin, phase, kind = 'cargo') {
  const g = new Pix(60, 40);
  const m = trainMats(skin);
  const base = 30;
  const bob = sin(phase * TAU * 2) > 0 ? 0 : 1;
  g.rect(4, base - 6 + bob, 52, 6, m.dark);
  if (kind === 'cargo') {
    g.rect(6, base - 22 + bob, 48, 16, m.body);
    g.rect(5, base - 24 + bob, 50, 3, m.dark);
    for (let i = 0; i < 5; i++) g.rect(10 + i * 9, base - 22 + bob, 1, 16, m.trim);
    g.rect(22, base - 17 + bob, 14, 9, m.dark);
    g.rect(24, base - 15 + bob, 10, 5, m.body);
    g.rect(26, base - 13 + bob, 6, 1, m.glow);
  } else if (kind === 'gun') {
    g.rect(6, base - 18 + bob, 48, 12, m.body);
    g.rect(5, base - 20 + bob, 50, 3, m.dark);
    // turret
    g.ell(30, base - 22 + bob, 8, 6, m.metal);
    g.rect(30, base - 24 + bob, 20, 3, m.metal);
    g.rect(48, base - 25 + bob, 4, 5, m.trim);
  }
  const wheels = [[14, 4.4], [26, 4.4], [40, 4.4], [50, 4.4]];
  for (const [wx, wr] of wheels) {
    g.ell(wx, base + bob, wr, wr, m.wheel);
    g.ell(wx, base + bob, wr - 2, wr - 2, m.dark);
    for (let s = 0; s < 4; s++) {
      const a = phase * TAU + s * (TAU / 4);
      g.line(wx, base + bob, wx + cos(a) * (wr - 1), base + bob + sin(a) * (wr - 1), m.metal);
    }
  }
  return g.toCanvas({ lx: -0.4, ly: -0.9 });
}

const _trainCache = {};
export function buildTrainSet(skinId) {
  if (_trainCache[skinId]) return _trainCache[skinId];
  const skin = findTrainSkin(skinId);
  const engine = [], engineHurt = [], cargo = [], gun = [];
  for (let i = 0; i < 8; i++) {
    const ph = i / 8;
    engine.push(trainEngineFrame(skin, ph));
    engineHurt.push(trainEngineFrame(skin, ph, { damage: 0.9 }));
    cargo.push(trainCarFrame(skin, ph, 'cargo'));
    gun.push(trainCarFrame(skin, ph, 'gun'));
  }
  const set = { engine, engineHurt, cargo, gun, skin, portrait: engine[0] };
  _trainCache[skinId] = set;
  return set;
}

// ==================================================================
// ENEMIES — parametric creature rigs
// ==================================================================
function creatureMats(pal) {
  return {
    body: M(pal.body, { rim: pal.rim || pal.glow }),
    dark: M(pal.dark, { rim: pal.glow }),
    glow: M(pal.glow, { kind: 'glow' }),
    bone: M(pal.bone || '#d8d4c0', { rim: '#ffffff' }),
    metal: M(pal.metal || '#8a8aa0', { kind: 'metal', spec: 1 }),
  };
}

const ENEMY_RIGS = {
  ghost: { w: 20, h: 22, pal: { body: '#6a7ab0', dark: '#2c3560', glow: '#a8d4f4' },
    draw: (g, m, t) => {
      const bob = Math.round(sin(t * TAU) * 1.6);
      g.ell(10, 9 + bob, 6, 6.4, m.body);          // hooded head
      g.ell(10, 7 + bob, 5, 4.2, m.dark);
      g.poly([[4, 10 + bob], [16, 10 + bob], [17, 18 + bob], [3, 18 + bob]], m.body);
      // tattered lower wisps
      for (let i = 0; i < 5; i++) {
        const h = 2 + ((i * 5 + Math.round(t * 4)) % 4);
        g.rect(3 + i * 3, 17 + bob, 2, h, m.dark);
      }
      g.px(8, 9 + bob, m.glow); g.px(12, 9 + bob, m.glow);
      g.px(8, 10 + bob, m.glow); g.px(12, 10 + bob, m.glow);
    } },
  wraith: { w: 20, h: 24, pal: { body: '#584a8a', dark: '#241a48', glow: '#c07aff' },
    draw: (g, m, t) => {
      const bob = Math.round(sin(t * TAU) * 2);
      g.poly([[10, 2 + bob], [16, 10 + bob], [14, 20 + bob], [6, 20 + bob], [4, 10 + bob]], m.body);
      g.ell(10, 7 + bob, 4.4, 4.6, m.dark);
      g.px(8, 7 + bob, m.glow); g.px(12, 7 + bob, m.glow);
      // clawed arms
      const sw = sin(t * TAU + 1) * 2;
      g.limb(4, 11 + bob, 1, 15 + bob + sw, 1.3, m.body);
      g.limb(16, 11 + bob, 19, 15 + bob - sw, 1.3, m.body);
      for (let i = 0; i < 4; i++) g.rect(4 + i * 3, 19 + bob, 2, 2 + ((i + (t * 6 | 0)) % 3), m.dark);
    } },
  crawler: { w: 20, h: 18, pal: { body: '#7a4030', dark: '#341a12', glow: '#ff7a33' },
    draw: (g, m, t) => {
      const step = sin(t * TAU);
      // legs first (behind body)
      for (let i = 0; i < 3; i++) {
        const ph = Math.round(sin(t * TAU + i * 1.6) * 2);
        g.line(6, 10, 1, 6 + i * 3 + ph, m.dark, 1);
        g.line(14, 10, 19, 6 + i * 3 - ph, m.dark, 1);
      }
      g.ell(10, 11, 6.4, 4.4, m.body);        // carapace
      g.ell(10, 9, 4.6, 3, m.dark);           // shell plate
      g.ell(10, 7, 3, 2.4, m.body);           // head
      g.px(8, 7, m.glow); g.px(12, 7, m.glow);
      g.line(8, 5, 6, 3 + (step > 0 ? 0 : 1), m.dark);
      g.line(12, 5, 14, 3 + (step > 0 ? 1 : 0), m.dark);
    } },
  hound: { w: 24, h: 18, pal: { body: '#2c2438', dark: '#120e1c', glow: '#ff3a2a' },
    draw: (g, m, t) => {
      const step = sin(t * TAU) * 2;
      g.ell(12, 9, 7, 4.4, m.body);              // body
      g.ell(19, 7, 4, 3.4, m.body);              // head
      g.poly([[21, 4], [23, 7], [19, 7]], m.dark); // ear
      g.limb(7, 11, 5 - step, 15, 1.4, m.dark);
      g.limb(11, 11, 10 + step, 15, 1.4, m.dark);
      g.limb(15, 11, 14 - step, 15, 1.4, m.dark);
      g.limb(18, 11, 19 + step, 15, 1.4, m.dark);
      g.line(5, 8, 1, 5 + step, m.dark, 1.4);    // tail
      g.px(20, 7, m.glow); g.px(22, 7, m.glow);
    } },
  brute: { w: 28, h: 28, pal: { body: '#6a3020', dark: '#2a0e08', glow: '#ff6a2a', metal: '#8a5a4a' },
    draw: (g, m, t) => {
      const bob = Math.round(sin(t * TAU) * 1.4);
      const sw = sin(t * TAU) * 2;
      g.limb(10, 20 + bob, 9, 26, 2.4, m.dark);
      g.limb(18, 20 + bob, 19, 26, 2.4, m.dark);
      g.ell(14, 15 + bob, 8, 6.5, m.body);           // torso
      g.ell(14, 9 + bob, 4.6, 4.4, m.body);          // head
      g.limb(6, 12 + bob, 3, 19 + bob + sw, 2.4, m.body);
      g.limb(22, 12 + bob, 25, 19 + bob - sw, 2.4, m.body);
      g.ell(3, 20 + bob + sw, 2.6, 2.6, m.dark);
      g.ell(25, 20 + bob - sw, 2.6, 2.6, m.dark);
      // molten cracks
      g.line(11, 13 + bob, 14, 17 + bob, m.glow);
      g.line(17, 12 + bob, 15, 16 + bob, m.glow);
      g.px(12, 9 + bob, m.glow); g.px(16, 9 + bob, m.glow);
    } },
  knight: { w: 22, h: 26, pal: { body: '#4a4a60', dark: '#1e1e2c', glow: '#7ec8ff', metal: '#9c9cb8' },
    draw: (g, m, t) => {
      const bob = Math.round(sin(t * TAU) * 1);
      g.limb(8, 18 + bob, 8, 24, 2, m.dark);
      g.limb(14, 18 + bob, 14, 24, 2, m.dark);
      g.rect(6, 9 + bob, 10, 10, m.metal);              // cuirass
      g.ell(11, 8 + bob, 4.2, 4, m.metal);              // helm
      g.rect(7, 8 + bob, 8, 2, M('#0a0410', { kind: 'flat' })); // visor slit
      g.px(9, 8 + bob, m.glow); g.px(13, 8 + bob, m.glow);
      g.rect(1, 10 + bob, 5, 11, m.body);               // shield
      g.rect(2, 11 + bob, 3, 9, m.dark);
      g.rect(3, 13 + bob, 1, 5, m.glow);
      g.rect(9, 3 + bob, 4, 2, m.glow);                 // helm plume
      g.limb(16, 11 + bob, 19, 17 + bob, 1.8, m.metal); // weapon arm
      g.line(19, 17 + bob, 21, 6 + bob, m.metal, 1.4);  // spear
    } },
  caster: { w: 22, h: 26, pal: { body: '#3a2a58', dark: '#1a1030', glow: '#c07aff' },
    draw: (g, m, t) => {
      const bob = Math.round(sin(t * TAU) * 1.4);
      g.poly([[11, 6 + bob], [17, 22], [5, 22]], m.body);      // robe
      g.ell(11, 7 + bob, 4.4, 4.4, m.dark);                    // hood
      g.px(9, 8 + bob, m.glow); g.px(13, 8 + bob, m.glow);
      g.limb(15, 11 + bob, 18, 15 + bob, 1.4, m.body);
      g.line(18, 4, 18, 20, m.dark, 1.4);                      // staff
      const p = 2.2 + sin(t * TAU) * 0.8;
      g.ell(18, 3, p, p, m.glow);
      for (let i = 0; i < 3; i++) g.rect(5 + i * 4, 21, 3, 2, m.dark);
    } },
  summoner: { w: 26, h: 30, pal: { body: '#2a3a58', dark: '#101828', glow: '#8ef0ff' },
    draw: (g, m, t) => {
      const bob = Math.round(sin(t * TAU) * 1.6);
      g.poly([[13, 6 + bob], [21, 26], [5, 26]], m.body);
      g.ell(13, 7 + bob, 5, 5, m.dark);
      g.px(10, 8 + bob, m.glow); g.px(16, 8 + bob, m.glow);
      g.rect(8, 14 + bob, 10, 1, m.glow);
      // orbiting skulls
      for (let i = 0; i < 3; i++) {
        const a = t * TAU + i * (TAU / 3);
        g.ell(13 + cos(a) * 10, 12 + sin(a) * 5 + bob, 2, 1.8, m.glow);
      }
      for (let i = 0; i < 4; i++) g.rect(5 + i * 4, 25, 3, 3, m.dark);
    } },
  flyer: { w: 24, h: 18, pal: { body: '#4a3358', dark: '#1a1028', glow: '#ff6ad0' },
    draw: (g, m, t) => {
      const flap = Math.round(sin(t * TAU) * 4);
      // membranes
      g.poly([[10, 9], [2, 4 - flap], [0, 9 - flap], [4, 12]], m.dark);
      g.poly([[14, 9], [22, 4 + flap], [24, 9 + flap], [20, 12]], m.dark);
      g.poly([[10, 9], [3, 6 - flap], [5, 11]], m.body);
      g.poly([[14, 9], [21, 6 + flap], [19, 11]], m.body);
      // body
      g.ell(12, 9, 3.6, 4, m.body);
      g.ell(12, 6, 2.6, 2.4, m.body);
      g.poly([[10, 4], [11, 7], [9, 7]], m.dark);  // ears
      g.poly([[14, 4], [15, 7], [13, 7]], m.dark);
      g.px(11, 6, m.glow); g.px(13, 6, m.glow);
      g.px(11, 12, m.glow); g.px(13, 12, m.glow);
    } },
  blob: { w: 22, h: 18, pal: { body: '#3a7a4a', dark: '#16341e', glow: '#98e066' },
    draw: (g, m, t) => {
      const sq = 1 + sin(t * TAU) * 0.18;
      g.ell(11, 12, 8 * sq, 6 / sq, m.body);
      g.ell(11, 10, 5 * sq, 3.4 / sq, m.glow);
      g.px(8, 11, m.dark); g.px(14, 11, m.dark);
      // drips
      for (let i = 0; i < 3; i++) if ((i + (t * 4 | 0)) % 3 === 0) g.rect(6 + i * 5, 16, 2, 2, m.body);
    } },
  egg: { w: 20, h: 18, pal: { body: '#5a4a30', dark: '#241c10', glow: '#ffb040' },
    draw: (g, m, t) => {
      const r = 6 + sin(t * TAU) * 0.6;
      g.ell(10, 11, r, r * 0.9, m.body);
      g.line(6, 9, 14, 12, m.dark);
      g.line(8, 14, 13, 8, m.dark);
      if (sin(t * TAU) > 0.4) { g.px(9, 10, m.glow); g.px(12, 11, m.glow); }
    } },
};

// realm palette re-tints
const REALM_HUE = { infernal: -25, frozen: 165, forest: 95, desert: 40, void: 265, forgotten: 285, purgatory: 215, terminus: 320, phantom: 275 };

function bakeCreature(rig, frames = 6) {
  const out = [];
  for (let i = 0; i < frames; i++) {
    const g = new Pix(rig.w, rig.h);
    const m = creatureMats(rig.pal);
    rig.draw(g, m, i / frames);
    out.push(g.toCanvas({ lx: -0.55, ly: -0.8 }));
  }
  return out;
}

// ==================================================================
// BOSSES — big parametric rigs
// ==================================================================
const BOSS_RIGS = {
  bossConductor: { w: 44, h: 48, pal: { body: '#3a2f57', dark: '#1a1030', glow: '#ffd05a', metal: '#9c9cb8' },
    draw: (g, m, t) => {
      const bob = Math.round(sin(t * TAU) * 2);
      // long coat
      g.poly([[22, 12 + bob], [34, 20 + bob], [36, 44], [8, 44], [10, 20 + bob]], m.body);
      g.ell(22, 14 + bob, 11, 6, m.body);
      // head + tall cap
      g.ell(22, 8 + bob, 6, 6, m.dark);
      g.rect(15, 0 + bob, 14, 6, m.dark);
      g.rect(13, 5 + bob, 18, 2, m.metal);
      g.px(19, 9 + bob, m.glow); g.px(25, 9 + bob, m.glow);
      g.rect(18, 9 + bob, 2, 2, m.glow); g.rect(24, 9 + bob, 2, 2, m.glow);
      // arms + lantern
      const sw = sin(t * TAU) * 2;
      g.limb(11, 18 + bob, 5, 28 + sw, 2.4, m.body);
      g.limb(33, 18 + bob, 39, 28 - sw, 2.4, m.body);
      g.ell(39, 31 - sw, 3.4, 4, m.metal);
      g.ell(39, 31 - sw, 2, 2.4, m.glow);
      g.line(22, 16 + bob, 22, 40, m.metal);
      for (let i = 0; i < 3; i++) g.ell(22, 22 + i * 7, 2, 2, m.glow);
    } },
  bossAshen: { w: 52, h: 52, pal: { body: '#5c2418', dark: '#200a06', glow: '#ff6a2a', metal: '#8a5a4a' },
    draw: (g, m, t) => {
      const bob = Math.round(sin(t * TAU) * 2);
      g.limb(18, 36, 16, 50, 4.4, m.dark);
      g.limb(34, 36, 36, 50, 4.4, m.dark);
      g.ell(26, 28 + bob, 15, 11, m.body);
      g.ell(26, 14 + bob, 8, 7, m.body);
      const sw = sin(t * TAU) * 3;
      g.limb(11, 22 + bob, 4, 36 + sw, 4, m.body);
      g.limb(41, 22 + bob, 48, 36 - sw, 4, m.body);
      g.ell(4, 38 + sw, 4.6, 4.6, m.dark);
      g.ell(48, 38 - sw, 4.6, 4.6, m.dark);
      // molten cracks
      for (let i = 0; i < 6; i++) {
        const a = t * 2 + i;
        g.line(20 + i * 2, 22 + bob, 24 + sin(a) * 3, 34 + bob, m.glow);
      }
      g.rect(21, 13 + bob, 3, 3, m.glow); g.rect(28, 13 + bob, 3, 3, m.glow);
      // horns
      g.line(19, 9 + bob, 14, 2 + bob, m.dark, 2);
      g.line(33, 9 + bob, 38, 2 + bob, m.dark, 2);
    } },
  bossBell: { w: 46, h: 50, pal: { body: '#7a5c18', dark: '#3a2a08', glow: '#ffe878', metal: '#e8c848' },
    draw: (g, m, t) => {
      const sw = sin(t * TAU) * 3;
      // giant bell body (domed top, flared skirt)
      g.ell(23 + sw * 0.3, 16, 11, 11, m.metal);
      g.poly([[12 + sw * 0.3, 16], [34 + sw * 0.3, 16], [38, 33], [8, 33]], m.metal);
      g.ell(23 + sw * 0.3, 33, 15, 4, m.metal);
      g.ell(23 + sw * 0.3, 34, 12, 2.6, m.dark);
      g.rect(9, 30, 28, 2, m.body);
      g.ell(23 + sw, 40, 3.4, 3.4, m.dark);  // clapper
      g.line(23, 34, 23 + sw, 40, m.dark);
      // face on bell
      g.rect(17, 22, 4, 4, m.glow); g.rect(25, 22, 4, 4, m.glow);
      g.rect(19, 29, 8, 2, m.dark);
      // crown/hook
      g.ring(23, 5, 3.4, 1.6, m.trim || m.metal);
      // floating hands
      g.ell(4, 22 + sw, 3.4, 3.4, m.body);
      g.ell(42, 22 - sw, 3.4, 3.4, m.body);
    } },
  bossRoot: { w: 52, h: 50, pal: { body: '#3a5a24', dark: '#152410', glow: '#c0ff90' },
    draw: (g, m, t) => {
      const sw = sin(t * TAU) * 2;
      g.ell(26, 30, 15, 13, m.body);            // trunk mass
      g.ell(26, 18, 9, 8, m.body);
      for (let i = 0; i < 6; i++) {              // roots
        const a = Math.PI + (i / 5) * Math.PI;
        g.limb(26 + cos(a) * 12, 38, 26 + cos(a) * 24, 48 + sin(i + t * 4) * 2, 2.4, m.dark);
      }
      for (let i = 0; i < 4; i++) {              // branches
        const a = -0.4 - i * 0.5;
        g.limb(26, 16, 26 + cos(a) * (16 - i * 2) * (i % 2 ? 1 : -1), 6 + sw, 2, m.dark);
      }
      g.rect(20, 16, 4, 4, m.glow); g.rect(29, 16, 4, 4, m.glow);
      g.rect(22, 24, 9, 3, m.dark);
      for (let i = 0; i < 5; i++) g.px(18 + i * 4, 27 + (i % 2), m.glow);
    } },
  bossFrost: { w: 50, h: 52, pal: { body: '#2b4a70', dark: '#0e1a30', glow: '#8ef0ff', metal: '#a8d4f4' },
    draw: (g, m, t) => {
      const bob = Math.round(sin(t * TAU) * 2);
      g.poly([[25, 14 + bob], [38, 26 + bob], [40, 48], [10, 48], [12, 26 + bob]], m.body);
      g.ell(25, 12 + bob, 7, 7, m.metal);
      // ice crown
      for (let i = -2; i <= 2; i++) g.poly([[25 + i * 4, 6 + bob], [27 + i * 4, 12 + bob], [23 + i * 4, 12 + bob]], m.glow);
      g.px(22, 12 + bob, m.glow); g.px(28, 12 + bob, m.glow);
      const sw = sin(t * TAU) * 3;
      g.limb(12, 24 + bob, 4, 34 + sw, 3, m.body);
      g.limb(38, 24 + bob, 46, 34 - sw, 3, m.body);
      // frozen sceptre
      g.line(46, 34 - sw, 46, 14 - sw, m.metal, 1.6);
      g.ell(46, 12 - sw, 3.2, 3.6, m.glow);
      for (let i = 0; i < 4; i++) g.line(16 + i * 6, 30 + bob, 18 + i * 6, 44, m.metal);
    } },
  bossSand: { w: 56, h: 52, pal: { body: '#9c8442', dark: '#3a2f14', glow: '#f0e0a0', metal: '#dcc87c' },
    draw: (g, m, t) => {
      const bob = Math.round(sin(t * TAU) * 2);
      g.ell(28, 32, 18, 14, m.body);
      g.ell(28, 16 + bob, 10, 9, m.body);
      // headdress
      g.poly([[18, 14 + bob], [38, 14 + bob], [42, 26 + bob], [14, 26 + bob]], m.metal);
      g.rect(22, 16 + bob, 4, 3, m.glow); g.rect(31, 16 + bob, 4, 3, m.glow);
      const sw = sin(t * TAU) * 3;
      g.limb(11, 28, 3, 40 + sw, 3.4, m.body);
      g.limb(45, 28, 53, 40 - sw, 3.4, m.body);
      // sand streams
      for (let i = 0; i < 8; i++) g.px(10 + i * 5, 44 + ((i + (t * 5 | 0)) % 4), m.metal);
      g.rect(24, 30, 9, 2, m.dark);
    } },
  bossNull: { w: 52, h: 52, pal: { body: '#2a1240', dark: '#0e0418', glow: '#c07aff', metal: '#7a44c0' },
    draw: (g, m, t) => {
      // a rotating void polyhedron with eyes
      const r = 16 + sin(t * TAU) * 1.5;
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = t * TAU * 0.4 + i * (TAU / 6);
        pts.push([26 + cos(a) * r, 26 + sin(a) * r * 0.86]);
      }
      g.poly(pts, m.body);
      for (let i = 0; i < 6; i++) g.line(26, 26, pts[i][0], pts[i][1], m.dark);
      g.ell(26, 26, 7, 7, m.dark);
      g.ell(26, 26, 4 + sin(t * TAU * 2) * 1, 4, m.glow);
      for (let i = 0; i < 3; i++) {
        const a = -t * TAU + i * (TAU / 3);
        g.ell(26 + cos(a) * 21, 26 + sin(a) * 18, 2.4, 2.4, m.glow);
      }
    } },
  bossTrain: { w: 76, h: 48, pal: { body: '#3a0d18', dark: '#170408', glow: '#ff3a2a', metal: '#c8c0d8' },
    draw: (g, m, t) => {
      const bob = sin(t * TAU * 2) > 0 ? 0 : 1;
      g.rect(6, 26 + bob, 64, 10, m.dark);
      g.rect(10, 14 + bob, 48, 14, m.body);
      g.rect(12, 4 + bob, 22, 12, m.body);
      g.rect(52, 4 + bob, 10, 14, m.dark);
      g.rect(52, 4 + bob, 10, 3, m.metal);
      // demonic face grill
      g.rect(58, 18 + bob, 12, 12, m.metal);
      for (let i = 0; i < 5; i++) g.line(60 + i * 2, 18 + bob, 60 + i * 2, 30 + bob, m.dark);
      g.rect(60, 20 + bob, 3, 3, m.glow); g.rect(66, 20 + bob, 3, 3, m.glow);
      for (let i = 0; i < 4; i++) {
        const wx = 16 + i * 14;
        g.ell(wx, 36 + bob, 6, 6, m.metal);
        for (let s = 0; s < 4; s++) {
          const a = t * TAU + s * (TAU / 4);
          g.line(wx, 36 + bob, wx + cos(a) * 5, 36 + bob + sin(a) * 5, m.dark);
        }
      }
      g.rect(20, 8 + bob, 6, 5, m.glow);
      g.rect(28, 8 + bob, 6, 5, m.glow);
    } },
};

// ==================================================================
// PROJECTILES / PICKUPS / FX SPRITES
// ==================================================================
function orbFrames(colA, colB, n = 6, size = 9, style = 'orb') {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const g = new Pix(size, size);
    const core = M(colB, { kind: 'glow' });
    const shell = M(colA, { rim: colB });
    const c = (size - 1) / 2;
    if (style === 'orb') {
      g.ell(c, c, size / 2 - 0.5 + sin(t * TAU) * 0.4, size / 2 - 0.5, shell);
      g.ell(c, c, size / 4, size / 4, core);
      for (let k = 0; k < 3; k++) {
        const a = t * TAU + k * (TAU / 3);
        g.px(c + cos(a) * (size / 2 - 0.5), c + sin(a) * (size / 2 - 0.5), core);
      }
    } else if (style === 'bolt') {
      g.poly([[c, 0], [size - 1, c], [c, size - 1], [0, c]], shell);
      g.line(c, 1, c, size - 2, core);
    } else if (style === 'shard') {
      g.poly([[c, 0], [size - 1, c + 1], [c, size - 1], [0, c - 1]], shell);
      g.px(c, c, core);
    } else if (style === 'saw') {
      g.ell(c, c, size / 2 - 1, size / 2 - 1, shell);
      for (let k = 0; k < 6; k++) {
        const a = t * TAU + k * (TAU / 6);
        g.px(c + cos(a) * (size / 2 - 0.4), c + sin(a) * (size / 2 - 0.4), core);
      }
      g.ell(c, c, 1.2, 1.2, core);
    } else if (style === 'missile') {
      g.rect(1, c - 1, size - 3, 3, shell);
      g.poly([[size - 3, c - 2], [size - 1, c], [size - 3, c + 2]], core);
      g.px(1, c + (i % 2 ? -1 : 1), core);
    }
    out.push(g.toCanvas({ lx: -0.5, ly: -0.6 }));
  }
  return out;
}

function coinFrames() {
  const out = [];
  const gold = M('#e8c848', { kind: 'metal', spec: 1, rim: '#fff0a0' });
  const edge = M('#a07c24', { kind: 'metal' });
  for (let i = 0; i < 8; i++) {
    const t = i / 8;
    const wq = Math.abs(cos(t * TAU));
    const g = new Pix(10, 10);
    const rx = Math.max(0.9, 4 * wq);
    g.ell(5, 5, rx, 4, gold);
    if (rx > 2.2) { g.ell(5, 5, rx - 1.4, 2.6, edge); g.px(5, 4, gold); g.px(5, 6, gold); }
    out.push(g.toCanvas({ lx: -0.5, ly: -0.8 }));
  }
  return out;
}
function gemFrames(col, glowc) {
  const out = [];
  const body = M(col, { rim: glowc });
  const core = M(glowc, { kind: 'glow' });
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    const g = new Pix(9, 10);
    const s = 1 + sin(t * TAU) * 0.12;
    g.poly([[4.5, 0], [8, 4 * s], [4.5, 9], [1, 4 * s]], body);
    g.px(4, 4, core); g.px(4, 3, core);
    out.push(g.toCanvas({ lx: -0.6, ly: -0.7 }));
  }
  return out;
}
function heartFrames() {
  const out = [];
  const body = M('#d6311a', { rim: '#ff9033' });
  const hi = M('#ff9a8a', { kind: 'glow' });
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    const s = 1 + sin(t * TAU) * 0.14;
    const g = new Pix(11, 10);
    g.ell(3.5, 3.5 * s + 1, 2.6, 2.4 * s, body);
    g.ell(7.5, 3.5 * s + 1, 2.6, 2.4 * s, body);
    g.poly([[1, 4 * s + 1], [10, 4 * s + 1], [5.5, 9]], body);
    g.px(3, 3, hi);
    out.push(g.toCanvas({ lx: -0.6, ly: -0.8 }));
  }
  return out;
}
function chestFrames() {
  const out = [];
  const wood = M('#7a5224', { rim: '#e0b460' });
  const gold = M('#e8c848', { kind: 'metal', spec: 1 });
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    const g = new Pix(16, 14);
    g.rect(2, 6, 12, 7, wood);
    g.ell(8, 6, 6, 3.4, wood);
    g.rect(2, 8, 12, 1, gold);
    g.rect(7, 7, 2, 4, gold);
    if (sin(t * TAU) > 0.3) g.px(8, 4, M('#ffe878', { kind: 'glow' }));
    out.push(g.toCanvas({ lx: -0.6, ly: -0.8 }));
  }
  return out;
}

// Explosion / impact / muzzle sheets (radial, additive-friendly)
function explosionFrames(colors, size = 40, n = 9) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const c = makeCanvas(size, size);
    const ctx = c.getContext('2d');
    const cx = size / 2, cy = size / 2;
    const r = (0.25 + t * 0.75) * (size / 2);
    const alpha = 1 - t * t;
    // pixel-quantised rings
    for (let ring = 0; ring < colors.length; ring++) {
      const rr = Math.max(0, r - ring * (size * 0.09));
      if (rr <= 0) continue;
      ctx.fillStyle = colors[ring];
      ctx.globalAlpha = alpha * (1 - ring * 0.18);
      for (let a = 0; a < 64; a++) {
        const ang = (a / 64) * TAU;
        const jitter = ((a * 7 + i * 13) % 5) * 0.5 - 1;
        const px = Math.round(cx + cos(ang) * (rr + jitter));
        const py = Math.round(cy + sin(ang) * (rr + jitter));
        ctx.fillRect(px - 1, py - 1, 2, 2);
      }
      if (ring === colors.length - 1 && t < 0.55) {
        ctx.beginPath(); ctx.arc(cx, cy, rr * 0.55, 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    out.push(c);
  }
  return out;
}

function slashFrames(col, n = 5, size = 34) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const c = makeCanvas(size, size);
    const ctx = c.getContext('2d');
    ctx.globalAlpha = 1 - t * 0.85;
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1, 4 - t * 3);
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 3 - t * 2, -0.9 + t * 0.4, 0.9 + t * 0.4);
    ctx.stroke();
    ctx.globalAlpha = 1;
    out.push(c);
  }
  return out;
}

// ==================================================================
// REGISTRY
// ==================================================================
export function buildArt() {
  const S = {};
  S.anim = {};

  // --- enemies ---
  for (const [key, rig] of Object.entries(ENEMY_RIGS)) {
    const frames = bakeCreature(rig, 6);
    S.anim[key] = frames;
    S[key] = frames[0];
    for (const [realm, hue] of Object.entries(REALM_HUE)) {
      S.anim[key + '_' + realm] = frames.map(f => hueShift(f, hue));
      S[key + '_' + realm] = S.anim[key + '_' + realm][0];
    }
  }
  // aliases used by enemy data
  const alias = {
    houndShadow: 'hound', brute_ash: 'brute', caster_fire: 'caster',
    knight_void: 'knight', wraith: 'wraith',
  };
  for (const [a, base] of Object.entries(alias)) {
    if (!S.anim[a]) { S.anim[a] = S.anim[base]; S[a] = S[base]; }
    for (const realm of Object.keys(REALM_HUE)) {
      S.anim[a + '_' + realm] = S.anim[base + '_' + realm];
      S[a + '_' + realm] = S[base + '_' + realm];
    }
  }

  // --- bosses ---
  for (const [key, rig] of Object.entries(BOSS_RIGS)) {
    const frames = bakeCreature(rig, 8);
    S.anim[key] = frames;
    S[key] = frames[0];
  }
  S.anim.bossPhantom = S.anim.bossConductor.map(f => hueShift(f, 90));
  S.bossPhantom = S.anim.bossPhantom[0];

  // --- projectiles ---
  const projSets = {
    orbFire: ['#ff5a33', '#ffe066', 'orb', 9],
    orbIce: ['#5788c4', '#d4ecff', 'shard', 9],
    orbVoid: ['#7a44c0', '#dcb4ff', 'orb', 10],
    orbShadow: ['#3a3550', '#9c8ab8', 'orb', 8],
    orbLight: ['#e8c848', '#fff0a0', 'bolt', 9],
    orbPlasma: ['#2ff0ff', '#e8ffff', 'orb', 9],
    orbToxic: ['#5a9c33', '#c0ff90', 'orb', 9],
    orbBlood: ['#a01f12', '#ff6a5a', 'orb', 8],
    sawBlade: ['#9c9cb8', '#ffffff', 'saw', 13],
    missile: ['#8a8aa0', '#ff9033', 'missile', 12],
    bomb: ['#2c2c38', '#ff5a33', 'orb', 11],
    railSlug: ['#c0c0d8', '#8ef0ff', 'bolt', 11],
  };
  for (const [k, [a, b, style, size]] of Object.entries(projSets)) {
    S.anim[k] = orbFrames(a, b, 6, size, style);
    S[k] = S.anim[k][0];
  }

  // --- pickups ---
  S.anim.coin = coinFrames();
  S.coin = S.anim.coin[0];
  S.anim.xp = gemFrames('#2b6ad0', '#8ef0ff');
  S.xp = S.anim.xp[0];
  S.anim.xpBig = gemFrames('#7a44c0', '#dcb4ff');
  S.xpBig = S.anim.xpBig[0];
  S.anim.shard = gemFrames('#a07c24', '#ffe878');
  S.shard = S.anim.shard[0];
  S.anim.heart = heartFrames();
  S.heart = S.anim.heart[0];
  S.anim.chest = chestFrames();
  S.chest = S.anim.chest[0];
  S.anim.magnet = gemFrames('#b03484', '#f080cc');
  S.magnet = S.anim.magnet[0];

  // --- fx sheets ---
  S.fx = {
    explFire: explosionFrames(['#ffffff', '#ffe066', '#ff9033', '#ff4d26', '#6b1510'], 44),
    explIce: explosionFrames(['#ffffff', '#d4ecff', '#7ab0e0', '#3d6698'], 40),
    explVoid: explosionFrames(['#ffffff', '#dcb4ff', '#985ce0', '#341858'], 44),
    explHoly: explosionFrames(['#ffffff', '#fff0a0', '#ffe066', '#c8a030'], 40),
    explToxic: explosionFrames(['#ffffff', '#c0ff90', '#5a9c33', '#1f3a14'], 40),
    impact: explosionFrames(['#ffffff', '#ffd0a0'], 20, 6),
    slash: slashFrames('#ffffff'),
    slashFire: slashFrames('#ff9033'),
  };
  S.shadow = shadowSprite(18, 8);
  S.shadowBig = shadowSprite(34, 14);
  S.shadowHuge = shadowSprite(52, 20);

  // --- character & train default sets ---
  S.getCharSet = buildCharSet;
  S.getTrainSet = buildTrainSet;

  // back-compat flat keys
  const c = buildCharSet('conductor');
  S.playerDown = c.down.idle[0];
  S.playerUp = c.up.idle[0];
  S.playerSide = c.side.idle[0];
  S.playerDownWalk = c.down.run[2];
  S.playerUpWalk = c.up.run[2];
  S.playerAttack = c.down.attack[1];
  S.playerArmour = c.down.idle[0];
  const tr = buildTrainSet('iron_horse');
  S.trainEngine = tr.engine[0];
  S.trainCar = tr.cargo[0];

  // white-hit silhouette cache
  const hitCache = new Map();
  S.hitFlash = (canvas, tint = '#ffffff') => {
    if (!canvas) return null;
    let byTint = hitCache.get(canvas);
    if (!byTint) { byTint = {}; hitCache.set(canvas, byTint); }
    if (!byTint[tint]) byTint[tint] = whiteSilhouette(canvas, tint, 0.92);
    return byTint[tint];
  };
  return S;
}
