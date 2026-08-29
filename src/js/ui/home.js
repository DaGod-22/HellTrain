// ============================================================
// HELL TRAIN — HOME (v1.4 dashboard)
// One glance answers everything: your purse, your relic, your
// train crew, today's run state, the next world, two daily goals.
// The big PLAY button leads; everything else waits behind MORE.
// Portrait 270x480, drawn straight to the canvas.
// ============================================================
import { CFG } from '../core/config.js';
import { TAU, fmtNum, fmtTime } from '../core/utils.js';
import { REALMS } from '../data/realms.js';
import { TRAIN_CARRIAGE_MODULES } from '../data/carriages.js';
import { RELICS } from '../data/realms.js';
import { todayGoals, GOAL_REWARD, goalProgressLabel } from '../data/goals.js';
import { saveSave } from '../core/save.js';
import { AUTH } from '../systems/auth.js';
import { ICONS } from '../data/icons.js';
import { KW, KH, K, tile, label, outlineText, glyph, roundPath, clipRound, inRect, easeOut } from './kit.js';

const INK = K.INK;
const ENERGY_COST = 5;
const ENERGY_MAX = 30;
const ENERGY_REGEN_SECONDS = 20;

// Hand-picked diorama palettes per realm — saturated little worlds.
const DIORAMA = {
  purgatory: { a: '#7d8a6b', b: '#6b7a5b', side: '#4a4a3e', leaf: '#5f8f4a', bld: '#8e8ea6' },
  infernal:  { a: '#9a5236', b: '#84422a', side: '#4a2416', leaf: '#8a6a2a', bld: '#a8705a' },
  forgotten: { a: '#8286a0', b: '#70748e', side: '#3e4054', leaf: '#4a7a6a', bld: '#9aa0be' },
  forest:    { a: '#5fa84c', b: '#4e9040', side: '#2c4a24', leaf: '#3f8a34', bld: '#7a8e6a' },
  frozen:    { a: '#d6e9f6', b: '#bcd6ea', side: '#5e7e9c', leaf: '#6fa8b8', bld: '#a8c2da' },
  desert:    { a: '#dcb474', b: '#c69c5c', side: '#7a5a2e', leaf: '#8aa84a', bld: '#c8a878' },
  void:      { a: '#7a56ac', b: '#664496', side: '#33205a', leaf: '#a06ad0', bld: '#8e74c4' },
  terminus:  { a: '#b8a878', b: '#a09062', side: '#5a4e30', leaf: '#8a9a5a', bld: '#c8b884' },
  dreadmarsh: { a: '#4a7a52', b: '#3c6844', side: '#1e3a24', leaf: '#5a9c5a', bld: '#6a8a72' },
  foundry:   { a: '#7a4632', b: '#683a28', side: '#3a1c12', leaf: '#8a5a2a', bld: '#8a5a48' },
  starlight: { a: '#4a5a9a', b: '#3c4c88', side: '#202a52', leaf: '#6a7ac0', bld: '#7a8ac0' },
};
const dio = (id) => DIORAMA[id] || DIORAMA.purgatory;

export class HomeScene {
  constructor(engine) {
    this.engine = engine;
    this.input = engine.input;
    this.t = 0;
    this.pageT = 0;
    this.realmIndex = 0;
    this.toast = null;
    this.hover = null;
    this._press = null;
    this._mouse = { x: KW / 2, y: KH / 2, down: false, justDown: false };
    const c = engine.canvas;
    this._c = c;
    c.addEventListener('mousemove', (e) => { const r = c.getBoundingClientRect(); this._mouse.x = (e.clientX - r.left) / r.width * KW; this._mouse.y = (e.clientY - r.top) / r.height * KH; });
    c.addEventListener('mousedown', (e) => { if (e.button === 0) { this._mouse.down = true; this._mouse.justDown = true; } });
    c.addEventListener('mouseup', (e) => { if (e.button === 0) this._mouse.down = false; });
    this.embers = [];
    for (let i = 0; i < 34; i++) {
      this.embers.push({ x: Math.random() * KW, y: Math.random() * KH, s: 0.35 + Math.random() * 0.9, w: Math.random() < 0.3 ? 2 : 1, drift: Math.random() * TAU });
    }
  }

  enter(params = {}) {
    this.save = params.save || this.engine.save;
    this.art = this.engine.sprites;
    this.engine.setResolution?.(KW, KH);
    this.t = 0; this.pageT = 0;
    this.toast = null;
    this._grace = 0.15;
    this._regenEnergy();
    this._ensureGoals();
    const unlocked = this.save.unlockedRealms || ['purgatory'];
    const last = this.save.lastRealm || unlocked[unlocked.length - 1];
    const i = REALMS.findIndex((r) => r.id === last);
    this.realmIndex = i >= 0 ? i : 0;
  }
  exit() { saveSave(this.save); this.engine.resetResolution?.(); }

  _regenEnergy() {
    // obsolete since v1.6 — kept so old saves still load cleanly
    const s = this.save;
    if (s.energy === undefined) { s.energy = ENERGY_MAX; s.energyAt = Date.now(); }
    const now = Date.now();
    const gained = Math.floor(Math.max(0, (now - (s.energyAt || now)) / 1000) / ENERGY_REGEN_SECONDS);
    if (gained > 0 && s.energy < ENERGY_MAX) { s.energy = Math.min(ENERGY_MAX, s.energy + gained); s.energyAt = now; }
    else if (s.energy >= ENERGY_MAX) s.energyAt = now;
  }

  get realm() { return REALMS[this.realmIndex] || REALMS[0]; }
  get realmUnlocked() { return (this.save.unlockedRealms || ['purgatory']).includes(this.realm.id); }

  // ---------- daily goals (fixed, visible, claimable) ----------
  _ensureGoals() {
    const s = this.save;
    const today = new Date();
    const key = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    if (!s.dailyGoals || s.dailyGoals.date !== key) {
      s.dailyGoals = { date: key, goals: todayGoals(key), p: { kills: 0, coins: 0, elites: 0, boss: 0 }, claimed: [] };
    }
    if (!s.dailyRuns) s.dailyRuns = [];
  }
  _goalDone(g) { return (this.save.dailyGoals?.p?.[g.key] || 0) >= g.n; }
  _goalClaimed(i) { return (this.save.dailyGoals?.claimed || []).includes(i); }

  // ------------------------------------------------------------
  // LAYOUT — single source of truth for hit tests and drawing
  // ------------------------------------------------------------
  layout() {
    const cardW = 186, cardH = 132;
    const cardX = Math.round((KW - cardW) / 2), cardY = 52;
    const L = {
      profile: { x: 6, y: 6, w: 104, h: 26 },
      coins: { x: 150, y: 6, w: 54, h: 26 },
      shards: { x: 210, y: 6, w: 54, h: 26 },
      card: { x: cardX, y: cardY, w: cardW, h: cardH },
      prev: { x: 8, y: cardY + cardH / 2 - 16, w: 22, h: 32 },
      next: { x: KW - 30, y: cardY + cardH / 2 - 16, w: 22, h: 32 },
      start: { x: 42, y: 196, w: 186, h: 50 },
      tiles: [
        { key: 'relic', x: 6, y: 256, w: 126, h: 38 },
        { key: 'crew', x: 138, y: 256, w: 126, h: 38 },
        { key: 'daily', x: 6, y: 300, w: 126, h: 38 },
        { key: 'next', x: 138, y: 300, w: 126, h: 38 },
      ],
      goals: [
        { key: 'g0', x: 6, y: 346, w: 258, h: 32 },
        { key: 'g1', x: 6, y: 382, w: 258, h: 32 },
      ],
      more: { x: 6, y: 424, w: 158, h: 44 },
      chest: { x: 172, y: 424, w: 92, h: 44 },
    };
    return L;
  }

  update(dt) {
    this.t += dt; this.pageT += dt;
    const inp = this.input;
    const L = this.layout();
    const m = this._mouse;
    if (this.toast) { this.toast.t -= dt; if (this.toast.t <= 0) this.toast = null; }
    this._grace = Math.max(0, (this._grace || 0) - dt);
    if ((this.t | 0) % 5 === 0) { this._regenEnergy(); this._ensureGoals(); }

    this.hover = null;
    for (const [name, r] of Object.entries(L)) {
      if (name === 'tiles' || name === 'goals') continue;
      if (inRect(m, r)) this.hover = name;
    }
    L.tiles.forEach((t) => { if (inRect(m, t)) this.hover = t.key; });
    L.goals.forEach((g) => { if (inRect(m, g)) this.hover = g.key; });

    if (inp?.wasPressed?.('ArrowLeft') || inp?.wasPressed?.('KeyA')) this._cycleRealm(-1);
    if (inp?.wasPressed?.('ArrowRight') || inp?.wasPressed?.('KeyD')) this._cycleRealm(1);
    if (inp?.wasPressed?.('Enter') || inp?.wasPressed?.('Space')) this._start();

    const go = (scene) => { try { this.engine.audio?.resume?.(); } catch {} this.engine.setScene(scene, { save: this.save }); };
    if (!this._grace && m.justDown) {
      if (inRect(m, L.prev)) this._cycleRealm(-1);
      else if (inRect(m, L.next)) this._cycleRealm(1);
      else if (inRect(m, L.start)) this._start();
      else if (inRect(m, L.more)) go('hub');
      else if (inRect(m, L.chest)) this._openChest();
      else if (inRect(m, L.coins) || inRect(m, L.shards)) go('shop');
      else if (inRect(m, L.profile)) go('profile');
      else {
        const tileHit = L.tiles.find((t) => inRect(m, t));
        if (tileHit) {
          if (tileHit.key === 'relic') go('relics');
          if (tileHit.key === 'crew') go('trainBase');
          if (tileHit.key === 'daily') go('dailyRun');
          if (tileHit.key === 'next') go('worldMap');
        } else {
          const goalHit = L.goals.find((g) => inRect(m, g));
          if (goalHit) this._claimGoal(Number(goalHit.key[1]));
        }
      }
      m.justDown = false;
    }
    inp?.endFrame?.();
  }

  _cycleRealm(d) { this.realmIndex = (this.realmIndex + d + REALMS.length) % REALMS.length; }
  _say(msg, color = K.GOLD) { this.toast = { msg, color, t: 2.2 }; }

  _start(quick = false) {
    if (quick) {
      const un = this.save.unlockedRealms || ['purgatory'];
      const i = REALMS.findIndex((r) => r.id === un[un.length - 1]);
      if (i >= 0) this.realmIndex = i;
    }
    if (!this.realmUnlocked) return this._say('LOCKED — CLEAR THE REALM BEFORE IT', K.BAD);
    // v1.6: energy is GONE — the schedule never runs out. Play all you like.
    this.save.lastRealm = this.realm.id;
    saveSave(this.save);
    this.engine.setScene('gameplay', {
      save: this.save, realmId: this.realm.id, stage: 1,
      difficulty: this.engine._difficulty || 'normal',
    });
  }

  _openChest() {
    const chests = this.save.chests || (this.save.chests = { common: 0, rare: 0, epic: 0 });
    const order = [['epic', 800, 20], ['rare', 300, 5], ['common', 100, 0]];
    const hitTier = order.find(([tp]) => (chests[tp] || 0) > 0);
    if (!hitTier) return this._say('NO CHESTS — ELITE FOES DROP THEM', '#9aa0b4');
    const [tp, coins, shards] = hitTier;
    chests[tp]--;
    this.save.coins = (this.save.coins || 0) + coins;
    this.save.shards = (this.save.shards || 0) + shards;
    saveSave(this.save);
    this._say('+' + coins + ' COINS' + (shards ? ' +' + shards + ' SHARDS' : ''), K.OK);
  }

  _claimGoal(i) {
    const s = this.save;
    const g = s.dailyGoals.goals[i];
    if (!g) return;
    if (this._goalClaimed(i)) return this._say('ALREADY CLAIMED TODAY', '#9aa0b4');
    if (!this._goalDone(g)) return this._say(goalProgressLabel(s.dailyGoals.p[g.key] || 0, g), '#9aa0b4');
    s.dailyGoals.claimed = [...(s.dailyGoals.claimed || []), i];
    this.save.coins = (this.save.coins || 0) + GOAL_REWARD;
    saveSave(this.save);
    this._say('+' + GOAL_REWARD + ' COINS — SEE YOU TOMORROW', K.OK);
  }

  // ============================================================
  // RENDER
  // ============================================================
  render(ctx) {
    ctx.imageSmoothingEnabled = false;
    const L = this.layout();
    this._lavaBackground(ctx);
    this._topBar(ctx, L);
    this._stage(ctx, L);
    this._startButton(ctx, L);
    this._dashboard(ctx, L);
    this._bottomBar(ctx, L);
    label(ctx, 'v' + CFG.VERSION, KW / 2, KH - 2, 'rgba(255,230,200,0.55)', 5);
    if (this.toast) {
      const a = Math.min(1, this.toast.t * 2.5) * easeOut(this.pageT * 4);
      ctx.globalAlpha = a;
      tile(ctx, KW / 2 - 96, 246, 192, 18, 7, { fill: 'rgba(20,10,14,0.92)', fillLo: 'rgba(12,6,10,0.95)', outline: this.toast.color, ring: this.toast.color, ringW: 1, lift: 0 });
      label(ctx, this.toast.msg, KW / 2, 258, this.toast.color, 7);
      ctx.globalAlpha = 1;
    }
  }

  // ---- molten background ----
  _lavaBackground(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, KH);
    g.addColorStop(0, '#a52a14');
    g.addColorStop(0.3, '#c84818');
    g.addColorStop(0.7, '#e4681e');
    g.addColorStop(1, '#f28a26');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, KW, KH);
    for (let i = 0; i < 5; i++) {
      const y0 = 80 + i * 84;
      const amp = 9 + i * 2;
      const ph = this.t * (0.18 + i * 0.04) + i;
      ctx.beginPath();
      ctx.moveTo(-10, y0);
      for (let x = -10; x <= KW + 10; x += 12) ctx.lineTo(x, y0 + Math.sin(x * 0.032 + ph) * amp);
      ctx.lineTo(KW + 10, y0 + 24);
      for (let x = KW + 10; x >= -10; x -= 12) ctx.lineTo(x, y0 + 24 + Math.sin(x * 0.028 + ph * 1.2) * amp);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? 'rgba(255,196,74,0.13)' : 'rgba(146,30,10,0.16)';
      ctx.fill();
    }
    for (const e of this.embers) {
      e.y -= (9 + e.s * 20) / 60;
      e.x += Math.sin(this.t * 0.9 + e.drift) * 0.2;
      if (e.y < -3) { e.y = KH + 3; e.x = Math.random() * KW; }
      ctx.fillStyle = `rgba(255,${190 + Math.floor(e.s * 60)},110,${(0.22 + e.s * 0.45).toFixed(2)})`;
      ctx.fillRect(e.x | 0, e.y | 0, e.w, e.w);
    }
    const tg = ctx.createLinearGradient(0, 0, 0, 46);
    tg.addColorStop(0, 'rgba(50,8,8,0.5)');
    tg.addColorStop(1, 'rgba(50,8,8,0)');
    ctx.fillStyle = tg;
    ctx.fillRect(0, 0, KW, 46);
    const bg = ctx.createLinearGradient(0, 240, 0, KH);
    bg.addColorStop(0, 'rgba(30,8,10,0)');
    bg.addColorStop(0.35, 'rgba(30,8,10,0.45)');
    bg.addColorStop(1, 'rgba(30,8,10,0.6)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 240, KW, KH - 240);
  }

  // ---- top bar: profile + purse ----
  _topBar(ctx, L) {
    const s = this.save;
    const p = L.profile;
    const authUser = AUTH.getCurrentUser();
    const isGuest = authUser?.guest;
    const username = authUser?.username || String(s.playerId || 'GUEST').slice(0, 10);
    const hov = this.hover === 'profile';

    tile(ctx, p.x, p.y, p.w, p.h, 10, {
      fill: hov ? '#3a2a5a' : '#2b1c30', fillLo: '#191020',
      outline: INK, ring: hov ? K.GOLD : null, ringW: 2, lift: hov ? 3 : 2,
    });
    ctx.save();
    ctx.beginPath(); ctx.arc(p.x + 13, p.y + 13, 10, 0, TAU);
    ctx.fillStyle = isGuest ? '#6a6a7a' : '#f0b040';
    ctx.fill();
    ctx.strokeStyle = hov ? K.GOLD : INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.clip();
    try {
      const portrait = this.art.getCharSet(s.charSkin || 'conductor').portrait;
      ctx.drawImage(portrait, p.x + 1, p.y + 2, 24, 22);
    } catch {
      label(ctx, (username[0] || '?').toUpperCase(), p.x + 13, p.y + 17, '#ffffff', 10);
    }
    ctx.restore();
    label(ctx, username.toUpperCase().slice(0, 9), p.x + 27, p.y + 12, K.TXT, 7, 'left');
    const lvl = authUser?.level || Math.max(1, Math.floor((s.stats?.totalRuns || 0) / 3) + 1);
    label(ctx, 'LVL ' + lvl + (isGuest ? ' · GUEST' : ''), p.x + 27, p.y + 21, isGuest ? '#9aa0b4' : '#ffe066', 6, 'left');

    this._chip(ctx, L.coins, 'coin', fmtNum(s.coins || 0), K.GOLD, this.hover === 'coins');
    this._chip(ctx, L.shards, 'shard', fmtNum(s.shards || 0), K.BLUE, this.hover === 'shards');
  }

  _chip(ctx, r, kind, value, color, hov) {
    tile(ctx, r.x, r.y, r.w, r.h, 10, {
      fill: hov ? '#3a2c4a' : '#2b1c30', fillLo: '#191020',
      outline: INK, ring: hov ? color : null, ringW: 1, lift: 2,
    });
    glyph(ctx, kind, r.x + 5, r.y + 5, 16, color);
    label(ctx, value, r.x + 24, r.y + 17, K.TXT, 9, 'left');
  }

  // ---- realm stage card + chooser ----
  _stage(ctx, L) {
    const realm = this.realm;
    const c = L.card;
    const title = 'SECTOR ' + realm.idx + ' — ' + realm.name.toUpperCase();
    let size = 17;
    ctx.font = 'bold ' + size + 'px monospace';
    while (size > 9 && ctx.measureText(title).width > 240) { size -= 1; ctx.font = 'bold ' + size + 'px monospace'; }
    outlineText(ctx, title, KW / 2, 42, '#ffffff', '#701c0a', size);

    tile(ctx, c.x, c.y, c.w, c.h, 12, { fill: '#20182c', fillLo: '#140e1e', outline: INK, lift: 4 });
    ctx.save();
    clipRound(ctx, c.x + 2, c.y + 2, c.w - 4, c.h - 4, 10);
    this._diorama(ctx, c, realm);
    ctx.restore();
    if (!this.realmUnlocked) {
      ctx.save();
      clipRound(ctx, c.x + 2, c.y + 2, c.w - 4, c.h - 4, 10);
      ctx.fillStyle = 'rgba(10,6,14,0.72)';
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.restore();
      glyph(ctx, 'lock', KW / 2 - 14, c.y + c.h / 2 - 26, 28, K.GOLD);
      outlineText(ctx, 'LOCKED', KW / 2, c.y + c.h / 2 + 18, '#ffffff', '#5a1a08', 12);
      label(ctx, 'Clear ' + (REALMS[this.realmIndex - 1]?.name || 'the previous sector'), KW / 2, c.y + c.h / 2 + 34, '#ffd9b0', 6);
    } else {
      // stage caption inside the card bottom
      ctx.fillStyle = 'rgba(10,6,14,0.62)';
      ctx.fillRect(c.x + 2, c.y + c.h - 22, c.w - 4, 20);
      label(ctx, 'Boss: ' + realm.boss.name, KW / 2, c.y + c.h - 12, '#ffe9c0', 6);
      label(ctx, 'Longest survived: ' + fmtTime(this.save.stats?.longestRun || 0), KW / 2, c.y + c.h - 4, '#e8c8a8', 5);
    }
    this._chevron(ctx, L.prev, -1, this.hover === 'prev');
    this._chevron(ctx, L.next, 1, this.hover === 'next');
  }

  _chevron(ctx, r, dir, hov) {
    tile(ctx, r.x, r.y, r.w, r.h, 8, {
      fill: hov ? '#4a3252' : 'rgba(20,12,18,0.7)', fillLo: 'rgba(12,6,12,0.8)',
      outline: 'rgba(255,220,160,0.55)', ring: hov ? K.GOLD : null, ringW: 2, lift: hov ? 3 : 0,
    });
    ctx.fillStyle = '#ffe0a0';
    const cx = r.x + r.w / 2 + dir, cy = r.y + r.h / 2;
    ctx.beginPath();
    ctx.moveTo(cx + dir * 4, cy);
    ctx.lineTo(cx - dir * 3, cy - 6);
    ctx.lineTo(cx - dir * 3, cy + 6);
    ctx.closePath(); ctx.fill();
  }

  // ============================================================
  // THE DIORAMA — a little isometric island for the chosen realm
  // ============================================================
  _diorama(ctx, c, realm) {
    const t = this.t;
    const D = dio(realm.id);
    const sg = ctx.createLinearGradient(0, c.y, 0, c.y + c.h);
    sg.addColorStop(0, realm.sky);
    sg.addColorStop(1, shade(realm.accent, -0.25));
    ctx.fillStyle = sg;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    for (let i = 0; i < 14; i++) {
      const x = c.x + ((i * 61) % (c.w - 6)) + 3;
      const y = c.y + ((i * 37) % 36) + 4;
      ctx.fillStyle = `rgba(255,255,255,${(0.12 + 0.22 * Math.abs(Math.sin(t + i))).toFixed(2)})`;
      ctx.fillRect(x, y, 1, 1);
    }
    const N = 8, TW = 22, TH = 11;
    const ox = c.x + c.w / 2;
    const oy = c.y + 56 + Math.sin(t * 0.8) * 1.5;
    const P = (tx, ty) => [ox + (tx - ty) * TW / 2, oy + (tx + ty) * TH / 2];

    const depth = 14;
    const [lx, ly] = P(0, N), [rx, ry] = P(N, 0);
    const ty0 = P(0, 0)[1], by0 = P(N, N)[1];
    ctx.beginPath();
    ctx.moveTo(lx, ly); ctx.lineTo(ox, by0); ctx.lineTo(rx, ry);
    ctx.lineTo(rx, ry + depth); ctx.lineTo(ox, by0 + depth + 5); ctx.lineTo(lx, ly + depth);
    ctx.closePath();
    ctx.fillStyle = D.side; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();

    const road = (tx, ty) => ty === 4;
    const path = (tx, ty) => tx === 3 && ty < 4;
    for (let ty = 0; ty < N; ty++) {
      for (let tx = 0; tx < N; tx++) {
        const [x, y] = P(tx, ty);
        let col;
        if (road(tx, ty)) col = ((tx + ty) & 1) ? '#5a5666' : '#4e4a5a';
        else if (path(tx, ty)) col = ((tx + ty) & 1) ? '#c4bec8' : '#b2acb8';
        else col = ((tx + ty) & 1) ? D.a : D.b;
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x + TW / 2, y + TH / 2); ctx.lineTo(x, y + TH); ctx.lineTo(x - TW / 2, y + TH / 2);
        ctx.closePath();
        ctx.fillStyle = col; ctx.fill();
      }
    }
    for (let tx = 0; tx < N; tx++) {
      if (tx % 2) continue;
      const [x, y] = P(tx + 0.5, 4.5);
      ctx.fillStyle = 'rgba(255,225,120,0.85)';
      ctx.beginPath();
      ctx.moveTo(x, y - 2); ctx.lineTo(x + 5, y + 0.5); ctx.lineTo(x, y + 3); ctx.lineTo(x - 5, y + 0.5);
      ctx.closePath(); ctx.fill();
    }

    const props = [
      { tx: 0.7, ty: 0.7, kind: 'tower', h: 30, w: 24 },
      { tx: 2.6, ty: 0.5, kind: 'tower', h: 40, w: 20 },
      { tx: 5.4, ty: 0.7, kind: 'tower', h: 25, w: 22 },
      { tx: 7.0, ty: 1.8, kind: 'tree' },
      { tx: 0.9, ty: 2.6, kind: 'shop' },
      { tx: 6.6, ty: 3.3, kind: 'tree' },
      { tx: 0.5, ty: 5.8, kind: 'rock' },
      { tx: 6.2, ty: 6.2, kind: 'tree' },
      { tx: 2.4, ty: 6.6, kind: 'rock' },
    ];
    props.sort((a, b) => (a.tx + a.ty) - (b.tx + b.ty));
    for (const pr of props) {
      const [x, y] = P(pr.tx, pr.ty);
      if (pr.kind === 'tower') this._isoTower(ctx, x, y, pr.w, pr.h, D, t);
      else if (pr.kind === 'tree') this._isoTree(ctx, x, y, D, t);
      else if (pr.kind === 'shop') this._isoShop(ctx, x, y, t);
      else this._isoRock(ctx, x, y, D);
    }
    try {
      const set = this.art.getTrainSet(this.save.trainSkin || 'iron_horse');
      const f = Math.floor(t * 9) % set.engine.length;
      const span = ((t * 0.55) % 1.6) - 0.3;
      const [rxp, ryp] = P(span * N, 4.5);
      const eng = set.engine[f];
      const ew = Math.round(eng.width / 2), eh = Math.round(eng.height / 2);
      ctx.save();
      ctx.globalAlpha = 0.35; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(rxp, ryp + 3, ew * 0.45, 4, 0, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.drawImage(eng, Math.round(rxp - ew / 2), Math.round(ryp - eh + 4), ew, eh);
    } catch {}
    try {
      const cs = this.art.getCharSet(this.save.charSkin || 'conductor');
      const idle = cs.down.idle;
      const fr = idle[Math.floor(t * 6) % idle.length];
      const [px, py] = P(3.5, 2.2);
      ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(px, py + 4, 8, 3, 0, 0, TAU); ctx.fill(); ctx.restore();
      ctx.drawImage(fr, Math.round(px - fr.width / 2), Math.round(py - fr.height + 6));
    } catch {}
    try {
      const frames = this.art.anim['ghost_' + realm.id] || this.art.anim.ghost;
      if (frames) {
        const fr = frames[Math.floor(t * 7) % frames.length];
        const [ex, ey] = P(5.2, 5.4 + Math.sin(t * 0.7) * 0.5);
        ctx.drawImage(fr, Math.round(ex - fr.width / 2), Math.round(ey - fr.height + 6));
      }
    } catch {}
  }

  _isoTower(ctx, x, y, w, h, D, t) {
    const body = D.bld;
    isoBox(ctx, x, y, w, h, shade(body, 0.35), body, shade(body, -0.25));
    for (let r = 0; r < Math.floor((h - 10) / 9); r++) {
      for (let cIdx = 0; cIdx < 2; cIdx++) {
        const lit = ((r * 7 + cIdx * 13 + Math.floor(x)) % 5) < 2 && Math.sin(t * 2 + r + cIdx) > -0.9;
        const col = lit ? 'rgba(255,220,130,0.9)' : 'rgba(20,16,30,0.6)';
        const wy = y - h + 12 + r * 9;
        ctx.fillStyle = col;
        ctx.fillRect(Math.round(x - w / 2 + 4 + cIdx * 6), Math.round(wy + (cIdx * 3)), 4, 5);
        ctx.fillRect(Math.round(x + 2 + cIdx * 6), Math.round(wy + 6 - cIdx * 3), 4, 5);
      }
    }
  }

  _isoShop(ctx, x, y, t) {
    isoBox(ctx, x, y, 28, 20, '#e8e4dc', '#cfc8bd', '#a89f94');
    const ay = y - 20 + 11;
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? '#e8362a' : '#fbf3e6';
      ctx.fillRect(Math.round(x - 14 + i * 4.6), Math.round(ay + i * 0.6), 4.6, 6);
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(x - 14), Math.round(ay), 28, 7);
    ctx.fillStyle = '#4a4652';
    ctx.fillRect(Math.round(x - 4), Math.round(y - 8), 8, 8);
    ctx.fillStyle = (Math.sin(t * 3) > 0) ? '#ffd84a' : '#ffb020';
    ctx.fillRect(Math.round(x + 8), Math.round(y - 22), 4, 4);
  }

  _isoTree(ctx, x, y, D, t) {
    const sway = Math.sin(t * 1.4 + x) * 1.2;
    ctx.fillStyle = '#6a4020';
    ctx.fillRect(Math.round(x - 2), Math.round(y - 13), 4, 13);
    ctx.strokeStyle = INK; ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(x - 2) + 0.5, Math.round(y - 13) + 0.5, 4, 13);
    const leaf = D.leaf;
    for (const [dx, dy, r] of [[0, -24, 9], [-6, -18, 6], [7, -18, 6]]) {
      ctx.beginPath();
      ctx.arc(x + dx + sway * (dy < -20 ? 1 : 0.5), y + dy, r, 0, TAU);
      ctx.fillStyle = leaf; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    }
  }

  _isoRock(ctx, x, y, D) {
    ctx.beginPath();
    ctx.moveTo(x - 8, y); ctx.lineTo(x - 4, y - 8); ctx.lineTo(x + 3, y - 9);
    ctx.lineTo(x + 8, y - 1); ctx.lineTo(x + 2, y + 3);
    ctx.closePath();
    ctx.fillStyle = shade(D.side, 0.30); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
  }

  // ---- the big PLAY button ----
  _startButton(ctx, L) {
    const b = L.start;
    const enough = this.realmUnlocked;
    const hov = this.hover === 'start';
    const y = b.y + (hov ? 0 : 0);
    tile(ctx, b.x, y, b.w, b.h, 14, {
      fill: enough ? (hov ? '#ff6a44' : '#f25234') : '#8a7070',
      fillLo: enough ? '#8a1608' : '#4a3838',
      outline: INK, ring: enough ? K.GOLD : '#7a6a58', ringW: 3,
      lift: hov ? 5 : 6,
    });
    if (enough && hov) {
      ctx.globalAlpha = 0.12 + 0.06 * Math.sin(this.t * 8);
      roundPath(ctx, b.x + 3, y + 3, b.w - 6, b.h - 6, 11);
      ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.globalAlpha = 1;
    }
    outlineText(ctx, 'PLAY', KW / 2, y + 24, '#ffffff', '#7a1608', 20);
    label(ctx, this.realm.name.toUpperCase() + ' · ' + (this.engine._difficulty || 'normal').toUpperCase() + ' · no energy, ever', KW / 2, y + 40, '#ffe9a0', 6);
  }

  // ---- dashboard tiles ----
  _dashboard(ctx, L) {
    const s = this.save;
    const relic = RELICS.find((r) => r.id === s.activeRelic);
    const crew = (s.trainCarriages || []).map((id) => TRAIN_CARRIAGE_MODULES.find((m) => m.id === id)?.name || id);
    const user = AUTH.getCurrentUser();
    const canClaimDaily = !user || (Date.now() - (user.lastDaily || 0) > 24 * 60 * 60 * 1000 - 1000);
    const unlocked = s.unlockedRealms || ['purgatory'];
    const nextIdx = REALMS.findIndex((r) => !unlocked.includes(r.id));
    const dailyPlayed = (s.dailyRuns || []).includes(String(new Date().getFullYear() * 10000 + (new Date().getMonth() + 1) * 100 + new Date().getDate()));

    const defs = [
      { r: L.tiles[0], icon: 'relic', color: '#ffe066', name: 'RELIC', value: relic ? relic.name : 'None equipped', sub: relic ? 'Riding with you' : 'Tap to choose one' },
      { r: L.tiles[1], icon: 'train', color: '#8ef0ff', name: 'TRAIN CREW', value: crew.length ? crew.join(' + ') : 'Empty slots', sub: 'Two carriage perks' },
      { r: L.tiles[2], icon: 'calendar', color: dailyPlayed ? '#6a5a72' : K.OK, name: 'DAILY RUN', value: dailyPlayed ? 'Played today' : 'Ready', sub: 'Shared map, fresh at midnight' },
      {
        r: L.tiles[3], icon: 'map', color: '#c07aff', name: 'NEXT WORLD',
        value: nextIdx >= 0 ? REALMS[nextIdx].name : 'All worlds open',
        sub: nextIdx >= 0 ? 'Beat ' + REALMS[nextIdx - 1]?.boss.name : 'The line is yours',
      },
    ];
    for (const d of defs) this._tile(ctx, d.r, d, this.hover === d.r.key);
    // goals
    const goals = s.dailyGoals?.goals || [];
    goals.slice(0, 2).forEach((g, i) => {
      const r = L.goals[i];
      const have = s.dailyGoals?.p?.[g.key] || 0;
      const done = have >= g.n;
      const claimed = this._goalClaimed(i);
      const hov = this.hover === r.key;
      tile(ctx, r.x, r.y, r.w, r.h, 9, {
        fill: claimed ? '#20352a' : done ? '#2a3a2e' : K.PANEL, fillLo: '#160f1c',
        outline: INK, ring: done && !claimed ? K.OK : hov ? K.GOLD : null, ringW: done && !claimed ? 2 : 1, lift: hov ? 3 : 2,
      });
      glyph(ctx, g.icon, r.x + 8, r.y + 8, 16, claimed ? '#4a6a52' : done ? K.OK : '#ffd24a');
      label(ctx, g.label.replace('{n}', g.n), r.x + 30, r.y + 14, K.TXT, 7, 'left');
      label(ctx, claimed ? 'CLAIMED' : '+' + GOAL_REWARD + ' COINS', r.x + r.w - 10, r.y + 14, claimed ? '#4a6a52' : done ? K.OK : K.GOLD, 7, 'right');
      // progress bar
      const bx = r.x + 30, by = r.y + 20, bw = r.w - 78;
      ctx.fillStyle = '#00000077'; ctx.fillRect(bx - 1, by - 1, bw + 2, 7);
      ctx.fillStyle = '#241a2e'; ctx.fillRect(bx, by, bw, 5);
      ctx.fillStyle = done ? K.OK : '#ffd24a';
      ctx.fillRect(bx, by, Math.round(bw * Math.min(1, have / g.n)), 5);
      label(ctx, Math.min(have, g.n) + '/' + g.n, r.x + r.w - 10, by + 6, K.SUB, 6, 'right');
    });
  }

  _tile(ctx, r, d, hov) {
    tile(ctx, r.x, r.y, r.w, r.h, 10, {
      fill: hov ? '#3a2a5a' : '#2b1c30', fillLo: '#191020',
      outline: INK, ring: hov ? K.GOLD : null, ringW: 2, lift: hov ? 3 : 2,
    });
    glyph(ctx, d.icon, r.x + 8, r.y + 11, 16, d.color);
    label(ctx, d.name, r.x + 30, r.y + 13, K.DIM, 6, 'left');
    label(ctx, fitC(ctx, d.value, r.w - 40, 7), r.x + 30, r.y + 24, K.TXT, 7, 'left');
    label(ctx, fitC(ctx, d.sub, r.w - 40, 6), r.x + 30, r.y + 33, '#a892b8', 6, 'left');
  }

  // ---- bottom bar: MORE + CHEST ----
  _bottomBar(ctx, L) {
    const hovM = this.hover === 'more';
    tile(ctx, L.more.x, L.more.y, L.more.w, L.more.h, 12, {
      fill: hovM ? '#3a2a5a' : '#2b1c30', fillLo: '#191020',
      outline: INK, ring: hovM ? K.GOLD : null, ringW: 2, lift: hovM ? 4 : 3,
    });
    glyph(ctx, 'book', L.more.x + 16, L.more.y + 12, 22, '#ffd24a');
    label(ctx, 'MORE', L.more.x + 40, L.more.y + 20, K.TXT, 11, 'left');
    label(ctx, 'Map, arsenal, relics, options…', L.more.x + 40, L.more.y + 33, '#c8a8b8', 6, 'left');

    const chests = this.save.chests || { common: 0, rare: 0, epic: 0 };
    const count = (chests.common || 0) + (chests.rare || 0) + (chests.epic || 0);
    const hovC = this.hover === 'chest';
    tile(ctx, L.chest.x, L.chest.y, L.chest.w, L.chest.h, 12, {
      fill: hovC ? '#4a3a1a' : '#2b2218', fillLo: '#1a140c',
      outline: INK, ring: count ? K.GOLD : null, ringW: 2, lift: hovC ? 4 : 3,
    });
    glyph(ctx, 'chest', L.chest.x + 10, L.chest.y + 11, 22, K.GOLD);
    label(ctx, 'x' + count, L.chest.x + 40, L.chest.y + 20, K.TXT, 10, 'left');
    label(ctx, count ? 'OPEN' : 'EMPTY', L.chest.x + 40, L.chest.y + 33, count ? K.OK : '#8a7a88', 7, 'left');
  }
}

function fitC(ctx, s, w, size) {
  ctx.font = 'bold ' + size + 'px monospace';
  let out = String(s);
  if (ctx.measureText(out).width <= w) return out;
  while (out.length > 1 && ctx.measureText(out + '…').width > w) out = out.slice(0, -1);
  return out + '…';
}

// ============================================================
// CHUNKY UI PRIMITIVES (diorama helpers)
// ============================================================
function star(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU - Math.PI / 2;
    const rr = i % 2 ? r * 0.34 : r;
    const fn = i ? 'lineTo' : 'moveTo';
    ctx[fn](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}

function isoBox(ctx, x, y, w, h, top, left, right) {
  const hw = w / 2, hh = w / 4;
  const ty = y - h;
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(x - hw, ty); ctx.lineTo(x, ty + hh); ctx.lineTo(x, y + hh); ctx.lineTo(x - hw, y);
  ctx.closePath(); ctx.fillStyle = left; ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + hw, ty); ctx.lineTo(x, ty + hh); ctx.lineTo(x, y + hh); ctx.lineTo(x + hw, y);
  ctx.closePath(); ctx.fillStyle = right; ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, ty - hh); ctx.lineTo(x + hw, ty); ctx.lineTo(x, ty + hh); ctx.lineTo(x - hw, ty);
  ctx.closePath(); ctx.fillStyle = top; ctx.fill(); ctx.stroke();
  ctx.lineWidth = 1;
}

function shade(hex, k) {
  const h = String(hex).replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((ch) => ch + ch).join('') : h, 16) || 0;
  const m = (v) => (k >= 0 ? Math.round(v + (255 - v) * k) : Math.round(v * (1 + k)));
  return `rgb(${m((n >> 16) & 255)},${m((n >> 8) & 255)},${m(n & 255)})`;
}
