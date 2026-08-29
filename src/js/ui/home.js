// ============================================================
// HELL TRAIN — HOME (v1.7 depot platform)
// Dark industrial redesign: smoky charcoal air, crimson glow,
// riveted steel plates, a throttle lever that STARTS THE RUN,
// a five-tab steel dock (TRAIN / ARSENAL / BATTLE / FORGE /
// SHOP) and every other station tucked into a collapsible
// grid menu in the top-right corner.
// Portrait 270x480, drawn straight to the canvas.
// ============================================================
import { CFG } from '../core/config.js';
import { TAU, fmtNum, fmtTime } from '../core/utils.js';
import { REALMS } from '../data/realms.js';
import { TRAIN_CARRIAGE_MODULES } from '../data/carriages.js';
import { RELICS } from '../data/realms.js';
import { todayGoals, goalReward, goalProgressLabel } from '../data/goals.js';
import { saveSave } from '../core/save.js';
import { AUTH } from '../systems/auth.js';
import { ICONS } from '../data/icons.js';
import { SOUNDS } from '../core/sound.js';
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
    this._gridOpen = false;
    this._gridHover = -1;
    this._thr = { v: 0, pulling: false };   // throttle lever 0..1
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
    this._gridOpen = false;
    this._thr = { v: 0, pulling: false };
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
    const L = {
      profile: { x: 4, y: 4, w: 96, h: 28 },
      coins: { x: 104, y: 5, w: 50, h: 26 },
      shards: { x: 158, y: 5, w: 50, h: 26 },
      gridBtn: { x: 224, y: 5, w: 42, h: 26 },
      card: { x: 18, y: 80, w: 234, h: 118 },
      prev: { x: 2, y: 125, w: 22, h: 28 },
      next: { x: 246, y: 125, w: 22, h: 28 },
      throttle: { x: 10, y: 208, w: 250, h: 64 },
      goals: [
        { key: 'g0', x: 8, y: 284, w: 254, h: 30 },
        { key: 'g1', x: 8, y: 318, w: 254, h: 30 },
      ],
      dock: { x: 0, y: 352, w: KW, h: KH - 352 },
      tabs: [
        { key: 'train', act: 'trainBase', icon: 'train', label: 'TRAIN' },
        { key: 'arsenal', act: 'arsenal', icon: 'blade', label: 'ARSENAL' },
        { key: 'battle', act: 'battle', icon: 'wheel', label: 'BATTLE' },
        { key: 'forge', act: 'shop', icon: 'anvil', label: 'FORGE' },
        { key: 'shopTab', act: 'coinShop', icon: 'coinbag', label: 'SHOP' },
      ],
    };
    L.tabRects = L.tabs.map((t, i) => ({ x: i * 54, y: 364, w: 54, h: 74 }));
    return L;
  }

  // the collapsible station grid — every side icon lives here now
  _gridCells() {
    const s = this.save;
    const chests = s.chests || { common: 0, rare: 0, epic: 0 };
    const count = (chests.common || 0) + (chests.rare || 0) + (chests.epic || 0);
    const defs = [
      { icon: 'relic', label: 'RELICS', act: 'relics' },
      { icon: 'train', label: 'TRAIN BASE', act: 'trainBase' },
      { icon: 'calendar', label: 'DAILY RUN', act: 'dailyRun' },
      { icon: 'map', label: 'WORLD MAP', act: 'worldMap' },
      { icon: 'star', label: 'BOARDS', act: 'leaderboards' },
      { icon: 'ghost', label: 'IDENTITY', act: 'identity' },
      { icon: 'trophy', label: 'AWARDS', act: 'achievements' },
      { icon: 'gift', label: 'REWARDS', act: 'daily' },
      { icon: 'chest', label: 'CHESTS', badge: count, fn: () => this._openChest() },
      { icon: 'cog', label: 'SETTINGS', act: 'settings' },
      { icon: 'book', label: 'ALL LINES', act: 'hub' },
      { icon: 'coinbag', label: 'COIN SHOP', act: 'coinShop' },
    ];
    defs.forEach((d, i) => { d.r = { x: 12 + (i % 4) * 62, y: 70 + Math.floor(i / 4) * 61, w: 59, h: 56 }; });
    return defs;
  }

  update(dt) {
    this.t += dt; this.pageT += dt;
    const inp = this.input;
    const L = this.layout();
    const m = this._mouse;
    if (this.toast) { this.toast.t -= dt; if (this.toast.t <= 0) this.toast = null; }
    this._grace = Math.max(0, (this._grace || 0) - dt);
    if ((this.t | 0) % 5 === 0) { this._regenEnergy(); this._ensureGoals(); }

    // throttle lever pull — swings open, then the run begins
    if (this._thr.pulling) {
      this._thr.v = Math.min(1, this._thr.v + dt / 0.38);
      if (this._thr.v >= 1) { this._thr.pulling = false; this._start(); return; }
    }

    const cells = this._gridCells();
    this._gridHover = -1;
    this.hover = null;
    if (this._gridOpen) {
      cells.forEach((c, i) => { if (inRect(m, c.r)) this._gridHover = i; });
      if (inp?.wasPressed?.('Escape')) this._gridOpen = false;
    } else {
      for (const name of ['profile', 'coins', 'shards', 'gridBtn', 'prev', 'next', 'throttle']) {
        if (inRect(m, L[name])) this.hover = name;
      }
      L.tabRects.forEach((r, i) => { if (inRect(m, r)) this.hover = 'tab:' + L.tabs[i].key; });
      L.goals.forEach((g) => { if (inRect(m, g)) this.hover = g.key; });
    }

    if (inp?.wasPressed?.('ArrowLeft') || inp?.wasPressed?.('KeyA')) this._cycleRealm(-1);
    if (inp?.wasPressed?.('ArrowRight') || inp?.wasPressed?.('KeyD')) this._cycleRealm(1);
    if ((inp?.wasPressed?.('Enter') || inp?.wasPressed?.('Space')) && !this._gridOpen && !this._thr.pulling) this._pullThrottle();

    const go = (scene) => { try { this.engine.audio?.resume?.(); } catch {} this.engine.setScene(scene, { save: this.save }); };
    if (!this._grace && m.justDown) {
      if (this._gridOpen) {
        if (this._gridHover >= 0) {
          const c = cells[this._gridHover];
          this._gridOpen = false;
          if (c.fn) c.fn(); else go(c.act);
        } else if (inRect(m, GRID_CLOSE)) this._gridOpen = false;
        else if (!inRect(m, GRID_PANEL)) this._gridOpen = false;
      } else if (inRect(m, L.gridBtn)) {
        this._gridOpen = true; this._gridHover = -1;
        try { SOUNDS.pickup(); } catch {}
      } else if (inRect(m, L.prev)) this._cycleRealm(-1);
      else if (inRect(m, L.next)) this._cycleRealm(1);
      else if (inRect(m, L.throttle)) this._pullThrottle();
      else if (this.save._seasonNotice && m.y >= 36 && m.y < 56) { this.save._seasonNotice = null; saveSave(this.save); }
      else if (inRect(m, L.coins) || inRect(m, L.shards)) go('coinShop');
      else if (inRect(m, L.profile)) go('profile');
      else {
        const tabHit = L.tabRects.findIndex((r) => inRect(m, r));
        if (tabHit >= 0) {
          const act = L.tabs[tabHit].act;
          if (act === 'battle') this._pullThrottle();
          else go(act);
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

  _pullThrottle() {
    if (this._thr.pulling) return;
    if (!this.realmUnlocked) return this._say('LOCKED — CLEAR THE REALM BEFORE IT', K.BAD);
    this._thr.pulling = true;
    try { SOUNDS.pickup(); } catch {}
  }

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
    const pay = goalReward(s);
    this.save.coins = (this.save.coins || 0) + pay;
    let msg = '+' + pay + ' COINS';
    // finish BOTH goals on one day: a fixed +2 shard bonus, printed up top
    if (s.dailyGoals.claimed.length >= 2) {
      this.save.shards = (this.save.shards || 0) + 2;
      msg += ' +2 SHARDS — FULL SWEEP';
    }
    saveSave(this.save);
    this._say(msg + ' — SEE YOU TOMORROW', K.OK);
  }

  // ============================================================
  // RENDER
  // ============================================================
  render(ctx) {
    ctx.imageSmoothingEnabled = false;
    const L = this.layout();
    this._background(ctx);
    this._topBar(ctx, L);
    this._notice(ctx);
    this._nameplate(ctx);
    this._stage(ctx, L);
    this._throttle(ctx, L);
    this._goals(ctx, L);
    this._dock(ctx, L);
    if (this._gridOpen) this._gridPanel(ctx);
    label(ctx, 'v' + CFG.VERSION, KW / 2, 468, 'rgba(190,180,200,0.45)', 5);
    if (this.toast) {
      const a = Math.min(1, this.toast.t * 2.5) * easeOut(this.pageT * 4);
      ctx.globalAlpha = a;
      tile(ctx, KW / 2 - 110, 244, 220, 18, 7, { fill: 'rgba(16,10,14,0.94)', fillLo: 'rgba(10,6,10,0.96)', outline: this.toast.color, ring: this.toast.color, ringW: 1, lift: 0 });
      label(ctx, this.toast.msg, KW / 2, 256, this.toast.color, 7);
      ctx.globalAlpha = 1;
    }
  }

  // ---- smoky charcoal + crimson embers ----
  _background(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, KH);
    g.addColorStop(0, '#131217');
    g.addColorStop(0.45, '#1b1920');
    g.addColorStop(1, '#241f26');
    ctx.fillStyle = g; ctx.fillRect(0, 0, KW, KH);
    // slow smoke banks
    for (let i = 0; i < 4; i++) {
      const y0 = 60 + i * 100;
      const amp = 10 + i * 3;
      const ph = this.t * (0.10 + i * 0.03) + i * 2;
      ctx.beginPath(); ctx.moveTo(-10, y0);
      for (let x = -10; x <= KW + 10; x += 14) ctx.lineTo(x, y0 + Math.sin(x * 0.026 + ph) * amp);
      ctx.lineTo(KW + 10, y0 + 46);
      for (let x = KW + 10; x >= -10; x -= 14) ctx.lineTo(x, y0 + 46 + Math.sin(x * 0.022 + ph * 1.3) * amp);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? 'rgba(165,160,190,0.045)' : 'rgba(90,80,110,0.06)';
      ctx.fill();
    }
    // crimson furnace glow behind the throttle
    const glow = ctx.createRadialGradient(KW / 2, 238, 10, KW / 2, 238, 150);
    const pulse = 0.10 + 0.04 * Math.sin(this.t * 2.1);
    glow.addColorStop(0, `rgba(255,46,46,${pulse.toFixed(3)})`);
    glow.addColorStop(1, 'rgba(255,46,46,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 90, KW, 300);
    // embers
    for (const e of this.embers) {
      e.y -= (7 + e.s * 16) / 60;
      e.x += Math.sin(this.t * 0.9 + e.drift) * 0.22;
      if (e.y < -3) { e.y = KH + 3; e.x = Math.random() * KW; }
      ctx.fillStyle = `rgba(255,${60 + Math.floor(e.s * 50)},${40 + Math.floor(e.s * 30)},${(0.18 + e.s * 0.4).toFixed(2)})`;
      ctx.fillRect(e.x | 0, e.y | 0, e.w, e.w);
    }
    // side vignette
    const vg = ctx.createLinearGradient(0, 0, KW, 0);
    vg.addColorStop(0, 'rgba(0,0,0,0.5)'); vg.addColorStop(0.08, 'rgba(0,0,0,0)');
    vg.addColorStop(0.92, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, KW, KH);
  }

  // ---- season notice (crimson ink) ----
  _notice(ctx) {
    const sn = this.save._seasonNotice;
    if (!sn) return;
    const parts = ['LAST SEASON: RANK #' + sn.rank + ' — +' + (sn.reward?.shards || 0) + '\u25c6 +' + (sn.reward?.coins || 0) + '\u00a9'];
    if (sn.reward?.avatar) parts.push('AVATAR EARNED');
    if (sn.reward?.frame) parts.push('FRAME EARNED');
    label(ctx, parts.join(' \u00b7 '), KW / 2, 43, '#ff7a6a', 6);
    label(ctx, 'tap to dismiss \u00b7 see IDENTITY for your new look', KW / 2, 52, '#8a8494', 5);
  }

  // ---- riveted nameplate for the chosen sector ----
  _nameplate(ctx) {
    const realm = this.realm;
    const title = 'SECTOR ' + realm.idx + ' \u00b7 ' + realm.name.toUpperCase();
    ctx.font = 'bold 12px monospace';
    const tw = ctx.measureText(title).width;
    const pw = Math.min(254, Math.max(140, Math.round(tw) + 30));
    const px = Math.round((KW - pw) / 2);
    steelPlate(ctx, px, 56, pw, 20, { r: 6, tone: 1 });
    const col = this.realmUnlocked ? '#ffe8e2' : '#b8aeb8';
    outlineText(ctx, title, KW / 2, 70, col, '#2a0c10', 11);
  }

  // ---- top steel strip: profile, purse, grid-menu button ----
  _topBar(ctx, L) {
    steelPlate(ctx, 0, 0, KW, 36, { r: 0 });
    ctx.fillStyle = 'rgba(255,59,70,0.38)'; ctx.fillRect(0, 35, KW, 1);
    const s = this.save;
    const p = L.profile;
    const authUser = AUTH.getCurrentUser();
    const isGuest = authUser?.guest;
    const username = authUser?.username || String(s.playerId || 'GUEST').slice(0, 10);
    const hov = this.hover === 'profile';
    steelButton(ctx, p.x, p.y, p.w, p.h, { tone: hov ? 2 : 1 });
    ctx.save();
    ctx.beginPath(); ctx.arc(p.x + 14, p.y + 14, 10, 0, TAU);
    ctx.fillStyle = isGuest ? '#5a5560' : '#c8a04a'; ctx.fill();
    ctx.strokeStyle = '#0c0a0e'; ctx.lineWidth = 2; ctx.stroke(); ctx.clip();
    try {
      const portrait = this.art.getCharSet(s.charSkin || 'conductor').portrait;
      ctx.drawImage(portrait, p.x + 2, p.y + 3, 24, 22);
    } catch { label(ctx, (username[0] || '?').toUpperCase(), p.x + 14, p.y + 18, '#ffffff', 10); }
    ctx.restore();
    label(ctx, username.toUpperCase().slice(0, 8), p.x + 28, p.y + 12, K.TXT, 7, 'left');
    const lvl = authUser?.level || Math.max(1, Math.floor((s.stats?.totalRuns || 0) / 3) + 1);
    label(ctx, 'LVL ' + lvl + (isGuest ? ' \u00b7 GUEST' : ''), p.x + 28, p.y + 22, isGuest ? '#8a8494' : '#e8b054', 6, 'left');

    this._chip(ctx, L.coins, 'coin', fmtNum(s.coins || 0), '#ffd24a', this.hover === 'coins');
    this._chip(ctx, L.shards, 'shard', fmtNum(s.shards || 0), '#8ef0ff', this.hover === 'shards');

    // the collapsible grid-menu button (top right)
    const gb = L.gridBtn;
    const gh = this.hover === 'gridBtn' || this._gridOpen;
    steelButton(ctx, gb.x, gb.y, gb.w, gb.h, { tone: gh ? 2 : 1 });
    ctx.fillStyle = gh ? '#ffd7d0' : '#b8b2c2';
    for (const [dx, dy] of [[-6, -5], [0, -5], [-6, 1], [0, 1]]) ctx.fillRect(gb.x + 9 + dx + 2, gb.y + 13 + dy, 3.5, 3.5);
    label(ctx, 'MENU', gb.x + 20, gb.y + 17, gh ? '#ffece6' : '#9a92a0', 6, 'left');
  }

  _chip(ctx, r, kind, value, color, hov) {
    ctx.save();
    roundPath(ctx, r.x, r.y, r.w, r.h, 7);
    ctx.fillStyle = '#141118'; ctx.fill();
    ctx.strokeStyle = hov ? color : '#0c0a0e'; ctx.lineWidth = hov ? 1.5 : 1; ctx.stroke();
    ctx.restore();
    glyph(ctx, kind, r.x + 4, r.y + 5, 16, color);
    label(ctx, value, r.x + 22, r.y + 17, '#f0eae2', 9, 'left');
  }

  // ---- realm window framed in steel ----
  _stage(ctx, L) {
    const realm = this.realm;
    const c = L.card;
    steelPlate(ctx, c.x - 5, c.y - 5, c.w + 10, c.h + 10, { tone: 1 });
    tile(ctx, c.x, c.y, c.w, c.h, 8, { fill: '#20182c', fillLo: '#140e1e', outline: INK, lift: 3 });
    ctx.save();
    clipRound(ctx, c.x + 2, c.y + 2, c.w - 4, c.h - 4, 7);
    this._diorama(ctx, c, realm);
    ctx.restore();
    if (!this.realmUnlocked) {
      ctx.save();
      clipRound(ctx, c.x + 2, c.y + 2, c.w - 4, c.h - 4, 7);
      ctx.fillStyle = 'rgba(8,6,10,0.74)';
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.restore();
      glyph(ctx, 'lock', KW / 2 - 14, c.y + c.h / 2 - 26, 28, K.GOLD);
      outlineText(ctx, 'LOCKED', KW / 2, c.y + c.h / 2 + 18, '#ffffff', '#5a1a08', 12);
      label(ctx, 'Clear ' + (REALMS[this.realmIndex - 1]?.name || 'the previous sector'), KW / 2, c.y + c.h / 2 + 34, '#e8d0d0', 6);
    } else {
      ctx.fillStyle = 'rgba(10,6,14,0.62)';
      ctx.fillRect(c.x + 2, c.y + c.h - 22, c.w - 4, 20);
      label(ctx, 'Boss: ' + realm.boss.name, KW / 2, c.y + c.h - 12, '#f0e0d0', 6);
      label(ctx, 'Longest survived: ' + fmtTime(this.save.stats?.longestRun || 0), KW / 2, c.y + c.h - 4, '#c8b0b0', 5);
    }
    this._chevron(ctx, L.prev, -1, this.hover === 'prev');
    this._chevron(ctx, L.next, 1, this.hover === 'next');
  }

  _chevron(ctx, r, dir, hov) {
    steelButton(ctx, r.x, r.y, r.w, r.h, { tone: hov ? 2 : 0, r: 6 });
    ctx.fillStyle = hov ? '#ffd7d0' : '#d8a8a0';
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

  // ---- THE THROTTLE — the start button, rebuilt as iron ----
  _throttle(ctx, L) {
    const b = L.throttle;
    const ready = this.realmUnlocked;
    const hov = this.hover === 'throttle';
    const t = this.t;
    steelPlate(ctx, b.x, b.y, b.w, b.h, { tone: 1 });
    if (ready) {
      ctx.globalAlpha = 0.45 + 0.25 * Math.sin(t * 3.2);
      roundPath(ctx, b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3, 8);
      ctx.strokeStyle = '#ff3b46'; ctx.lineWidth = 2; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // signal lamp
    const lampX = b.x + 24, lampY = b.y + b.h / 2;
    ctx.beginPath(); ctx.arc(lampX, lampY, 11, 0, TAU);
    ctx.fillStyle = '#191519'; ctx.fill();
    ctx.strokeStyle = '#0c0a0e'; ctx.lineWidth = 2; ctx.stroke();
    if (ready) {
      const lg = ctx.createRadialGradient(lampX, lampY, 1, lampX, lampY, 9);
      lg.addColorStop(0, '#ff8d7e'); lg.addColorStop(1, '#d5202e');
      ctx.beginPath(); ctx.arc(lampX, lampY, 7.5, 0, TAU); ctx.fillStyle = lg; ctx.fill();
      ctx.globalAlpha = 0.22 + 0.1 * Math.sin(t * 4);
      ctx.beginPath(); ctx.arc(lampX, lampY, 14, 0, TAU); ctx.fillStyle = 'rgba(255,60,50,0.5)'; ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      ctx.beginPath(); ctx.arc(lampX, lampY, 7.5, 0, TAU); ctx.fillStyle = '#3c3742'; ctx.fill();
    }
    outlineText(ctx, ready ? 'FULL AHEAD' : 'LOCKED', lampX + 20, b.y + 26, ready ? '#ffece6' : '#9a92a0', '#2a0c10', 15);
    label(ctx, (this.engine._difficulty || 'normal').toUpperCase() + ' \u00b7 no energy, ever', lampX + 20, b.y + 40, '#d8a8a0', 6, 'left');
    label(ctx, ready
      ? (this._thr.pulling ? 'LEVER OPEN — GO GO GO' : hov ? 'PULL THE LEVER' : 'TAP TO PULL THE LEVER')
      : 'CLEAR ' + (REALMS[this.realmIndex - 1]?.name || 'THE FIRST SECTOR') + ' FIRST', lampX + 20, b.y + 53, ready ? '#ff8d7e' : '#8a8494', 6, 'left');
    // lever quadrant
    const qx = b.x + b.w - 52, qy = b.y + 8, qw = 40, qh = b.h - 16;
    roundPath(ctx, qx, qy, qw, qh, 6);
    ctx.fillStyle = '#15121a'; ctx.fill();
    ctx.strokeStyle = '#0c0a0e'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#5a5464'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const ny = qy + qh - 6 - (qh - 12) * (i / 4);
      ctx.beginPath(); ctx.moveTo(qx + 4, ny); ctx.lineTo(qx + 10, ny); ctx.stroke();
    }
    ctx.fillStyle = '#8a8494'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'left';
    ctx.fillText('FULL', qx + 13, qy + 9);
    ctx.fillText('STOP', qx + 13, qy + qh - 4);
    const v = this._thr.v;
    const ky = qy + qh - 6 - (qh - 12) * v;
    const kx = qx + qw / 2 - 2 + v * 8;
    ctx.strokeStyle = '#77707e'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(qx + qw / 2 - 2, qy + qh - 6); ctx.lineTo(kx, ky); ctx.stroke();
    ctx.beginPath(); ctx.arc(kx, ky, 7, 0, TAU);
    const kg = ctx.createLinearGradient(kx - 7, ky - 7, kx + 7, ky + 7);
    kg.addColorStop(0, '#c8c2d0'); kg.addColorStop(1, '#5e5868');
    ctx.fillStyle = kg; ctx.fill();
    ctx.strokeStyle = '#14121a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(kx, ky, 2.6, 0, TAU); ctx.fillStyle = ready ? '#ff3b46' : '#4a4450'; ctx.fill();
  }

  // ---- daily goals (fixed, exact, claimable) ----
  _goals(ctx, L) {
    const s = this.save;
    label(ctx, 'GOAL STREAK ' + (s.dailyStreak || 0) + ' \u00b7 TODAY\u2019S PAYOUT ' + goalReward(s) + ' COINS \u00b7 BOTH = +2\u25c6', 10, 278, '#8a8494', 6, 'left');
    const goals = s.dailyGoals?.goals || [];
    goals.slice(0, 2).forEach((g, i) => {
      const r = L.goals[i];
      const have = s.dailyGoals?.p?.[g.key] || 0;
      const done = have >= g.n;
      const claimed = this._goalClaimed(i);
      const hov = this.hover === r.key;
      steelButton(ctx, r.x, r.y, r.w, r.h, { tone: claimed ? 0 : hov ? 2 : 1 });
      glyph(ctx, g.icon, r.x + 8, r.y + 7, 16, claimed ? '#6a6a74' : done ? '#ff8d7e' : '#ffd24a');
      label(ctx, g.label.replace('{n}', g.n), r.x + 30, r.y + 13, K.TXT, 7, 'left');
      label(ctx, claimed ? 'CLAIMED' : '+' + goalReward(this.save) + ' COINS', r.x + r.w - 10, r.y + 13, claimed ? '#6a6a74' : done ? '#ff8d7e' : '#e8b054', 7, 'right');
      const bx = r.x + 30, by = r.y + 19, bw = r.w - 78;
      ctx.fillStyle = '#00000088'; ctx.fillRect(bx - 1, by - 1, bw + 2, 7);
      ctx.fillStyle = '#26222c'; ctx.fillRect(bx, by, bw, 5);
      ctx.fillStyle = done ? '#ff5a4a' : '#e8b054';
      ctx.fillRect(bx, by, Math.round(bw * Math.min(1, have / g.n)), 5);
      label(ctx, Math.min(have, g.n) + '/' + g.n, r.x + r.w - 10, by + 6, '#9a92a0', 6, 'right');
    });
  }

  // ---- the steel dock: TRAIN / ARSENAL / BATTLE / FORGE / SHOP ----
  _dock(ctx, L) {
    const t = this.t;
    steelPlate(ctx, L.dock.x, L.dock.y, L.dock.w, L.dock.h, { r: 0 });
    const sig = 0.5 + 0.5 * Math.sin(t * 2.4);
    ctx.fillStyle = `rgba(255,59,70,${(0.3 + 0.35 * sig).toFixed(2)})`;
    ctx.fillRect(6, L.dock.y + 2.5, KW - 12, 1.5);
    L.tabs.forEach((tab, i) => {
      const r = L.tabRects[i];
      const hov = this.hover === 'tab:' + tab.key;
      if (tab.key === 'battle') return this._battleTab(ctx, r, hov);
      steelButton(ctx, r.x + 4, r.y + 4, r.w - 8, r.h - 4, { tone: hov ? 2 : 1 });
      glyph(ctx, tab.icon, r.x + r.w / 2 - 10, r.y + 16, 20, hov ? '#ffd7d0' : '#b0aaba');
      label(ctx, tab.label, r.x + r.w / 2, r.y + 56, hov ? '#ffece6' : '#8a8494', 7);
    });
  }

  // BATTLE: raised medallion with a glowing, turning locomotive wheel
  _battleTab(ctx, r, hov) {
    const t = this.t;
    const cx = r.x + r.w / 2, cy = r.y + 26;
    const g = ctx.createRadialGradient(cx, cy, 6, cx, cy, 42);
    g.addColorStop(0, 'rgba(255,70,50,0.42)'); g.addColorStop(1, 'rgba(255,70,50,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 42, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 27, 0, TAU); ctx.fillStyle = '#2e2a34'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = hov ? '#8a8090' : '#4a444e'; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 22, 0, TAU); ctx.fillStyle = '#17141c'; ctx.fill();
    ctx.strokeStyle = '#0c0a0e'; ctx.lineWidth = 2; ctx.stroke();
    const rot = t * 0.9;
    ctx.save(); ctx.translate(cx, cy);
    ctx.strokeStyle = '#ff5a4a'; ctx.lineWidth = 2.4;
    for (let i = 0; i < 3; i++) {
      const a = rot + (i * Math.PI) / 3;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * -13, Math.sin(a) * -13); ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.strokeStyle = '#ff7a60'; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, TAU); ctx.fillStyle = '#ffd2b0'; ctx.fill();
    ctx.restore();
    // fire licks over the wheel
    for (let i = -1; i <= 1; i++) {
      const fx = cx + i * 9, fh = 5 + 3 * Math.sin(t * 7 + i * 2);
      ctx.beginPath();
      ctx.moveTo(fx - 3, cy - 16);
      ctx.quadraticCurveTo(fx, cy - 16 - fh * 2, fx + 3, cy - 16);
      ctx.closePath();
      ctx.fillStyle = i === 0 ? 'rgba(255,190,90,0.85)' : 'rgba(255,110,60,0.65)';
      ctx.fill();
    }
    label(ctx, 'BATTLE', cx, r.y + 60, hov ? '#ffece6' : '#ff8d7e', 8);
  }

  // ---- collapsible grid menu: every station, one tap away ----
  _gridPanel(ctx) {
    const cells = this._gridCells();
    ctx.fillStyle = 'rgba(6,4,10,0.62)'; ctx.fillRect(0, 0, KW, KH);
    steelPlate(ctx, GRID_PANEL.x, GRID_PANEL.y, GRID_PANEL.w, GRID_PANEL.h, { r: 10 });
    label(ctx, 'ALL STATIONS', 22, 60, '#e8e2ec', 8, 'left');
    label(ctx, 'TAP OUTSIDE TO CLOSE', 206, 60, '#6a6474', 5, 'right');
    // X
    ctx.strokeStyle = '#b8b2c2'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(GRID_CLOSE.x + 5, GRID_CLOSE.y + 4); ctx.lineTo(GRID_CLOSE.x + GRID_CLOSE.w - 5, GRID_CLOSE.y + GRID_CLOSE.h - 4);
    ctx.moveTo(GRID_CLOSE.x + GRID_CLOSE.w - 5, GRID_CLOSE.y + 4); ctx.lineTo(GRID_CLOSE.x + 5, GRID_CLOSE.y + GRID_CLOSE.h - 4);
    ctx.stroke();
    cells.forEach((c, i) => {
      const hov = this._gridHover === i;
      steelButton(ctx, c.r.x, c.r.y, c.r.w, c.r.h, { tone: hov ? 2 : 1, r: 7 });
      glyph(ctx, c.icon, c.r.x + c.r.w / 2 - 9, c.r.y + 7, 18, hov ? '#ffd7d0' : '#c8b8a8');
      label(ctx, c.label, c.r.x + c.r.w / 2, c.r.y + 42, hov ? '#ffece6' : '#9a92a0', 5);
      if (c.badge) {
        const bx = c.r.x + c.r.w - 12, by = c.r.y + 10;
        ctx.beginPath(); ctx.arc(bx, by, 7, 0, TAU); ctx.fillStyle = '#d5202e'; ctx.fill();
        ctx.strokeStyle = '#0c0a0e'; ctx.lineWidth = 1.5; ctx.stroke();
        label(ctx, String(c.badge), bx, by + 2.5, '#ffffff', 7);
      }
    });
  }
}

// ============================================================
// RIVETED STEEL PRIMITIVES
// ============================================================
function rivet(ctx, x, y, r = 1.7) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = '#1a171d'; ctx.fill();
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.55, 0, TAU); ctx.fillStyle = '#8b8592'; ctx.fill();
}
function steelPlate(ctx, x, y, w, h, opts = {}) {
  const tone = opts.tone || 0;
  const top = tone === 2 ? '#4a4550' : tone === 1 ? '#3a3640' : '#332f3a';
  const mid = tone === 2 ? '#37333e' : tone === 1 ? '#2b2832' : '#26222c';
  const bot = tone === 2 ? '#211e28' : tone === 1 ? '#1b1820' : '#171419';
  const rad = opts.r ?? 8;
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top); g.addColorStop(0.5, mid); g.addColorStop(1, bot);
  roundPath(ctx, x, y, w, h, rad);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(210,200,220,0.16)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x + 4, y + 0.5); ctx.lineTo(x + w - 4, y + 0.5); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath(); ctx.moveTo(x + 4, y + h - 0.5); ctx.lineTo(x + w - 4, y + h - 0.5); ctx.stroke();
  ctx.strokeStyle = '#0c0a0e'; ctx.lineWidth = 1.5;
  roundPath(ctx, x, y, w, h, rad); ctx.stroke();
  // rust mottling — deterministic, no flicker
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
function steelButton(ctx, x, y, w, h, opts = {}) {
  steelPlate(ctx, x, y, w, h, { tone: opts.tone ?? 1, r: opts.r ?? 7 });
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x + 3, y + 2, Math.max(0, w - 6), 1.5);
}

const GRID_PANEL = { x: 8, y: 44, w: 254, h: 224 };
const GRID_CLOSE = { x: 234, y: 50, w: 22, h: 18 };

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
