// ============================================================
// HELL TRAIN — HOME
// A portrait, mobile-game front end: chunky outlined tiles, an
// isometric stage diorama, one big Start button and a raised
// Battle tab. Drawn straight to the output canvas — no scanlines,
// no bloom, no aberration. Menus are clean; only the run is dirty.
// ============================================================
import { CFG } from '../core/config.js';
import { TAU, fmtTime, fmtNum } from '../core/utils.js';
import { REALMS } from '../data/realms.js';
import { saveSave } from '../core/save.js';
import { AUTH } from '../systems/auth.js';
import { ICONS } from '../data/icons.js';

// Portrait phone canvas (9:16). Restored to CFG.VIEW_W/H on exit.
const W = 270, H = 480;

const ENERGY_COST = 5;
const ENERGY_MAX = 30;
const ENERGY_REGEN_SECONDS = 20;

// ---- palette lifted from the reference look ----
const INK = '#241318';          // universal dark outline
const PANEL = '#2b2230';        // panel body
const PANEL_HI = '#3d3242';
const GOLD = '#ffc63c';
const GOLD_D = '#c07a12';
const RED = '#e8352a';
const RED_D = '#9c1208';
const GREEN = '#4ec53c';
const GREEN_D = '#2a7a20';

// Hand-picked diorama palettes — deriving these from realm.accent alone made
// every island grey. Each realm gets a readable, saturated little world.
const DIORAMA = {
  purgatory: { a: '#7d8a6b', b: '#6b7a5b', side: '#4a4a3e', leaf: '#5f8f4a', bld: '#8e8ea6' },
  infernal:  { a: '#9a5236', b: '#84422a', side: '#4a2416', leaf: '#8a6a2a', bld: '#a8705a' },
  forgotten: { a: '#8286a0', b: '#70748e', side: '#3e4054', leaf: '#4a7a6a', bld: '#9aa0be' },
  forest:    { a: '#5fa84c', b: '#4e9040', side: '#2c4a24', leaf: '#3f8a34', bld: '#7a8e6a' },
  frozen:    { a: '#d6e9f6', b: '#bcd6ea', side: '#5e7e9c', leaf: '#6fa8b8', bld: '#a8c2da' },
  desert:    { a: '#dcb474', b: '#c69c5c', side: '#7a5a2e', leaf: '#8aa84a', bld: '#c8a878' },
  void:      { a: '#7a56ac', b: '#664496', side: '#33205a', leaf: '#a06ad0', bld: '#8e74c4' },
  terminus:  { a: '#b8a878', b: '#a09062', side: '#5a4e30', leaf: '#8a9a5a', bld: '#c8b884' },
};
const dio = (id) => DIORAMA[id] || DIORAMA.purgatory;

// Bottom rail — the five places you go most.
const TABS = [
  { id: 'train', label: 'Train', icon: 'train', scene: 'trainBase' },
  { id: 'arsenal', label: 'Arsenal', icon: 'arsenal', scene: 'arsenal' },
  { id: 'battle', label: 'Battle', icon: 'battle', scene: null },
  { id: 'forge', label: 'Forge', icon: 'forge', scene: 'shop' },
  { id: 'coins', label: 'Shop', icon: 'coinshop', scene: 'coinShop' },
];

// Everything the old fourteen-button wall used to hold, as icons.
// Left column = things that reward you, right column = places and options.
const RAIL_L = [
  { key: 'trophy', icon: 'trophy', scene: 'achievements', tip: 'Awards', badge: 1 },
  { key: 'gift', icon: 'gift', scene: 'weeklyChallenge', tip: 'Weekly' },
  { key: 'daily', icon: 'daily', scene: 'dailyRun', tip: 'Daily', badge: 1 },
  { key: 'board', icon: 'leaderboard', scene: 'leaderboards', tip: 'Ranks' },
];
const RAIL_R = [
  { key: 'map', icon: 'worldmap', scene: 'worldMap', tip: 'Map' },
  { key: 'armoury', icon: 'armoury', scene: 'armoury', tip: 'Armour' },
  { key: 'relics', icon: 'relics', scene: 'relics', tip: 'Relics' },
  { key: 'settings', icon: 'settings', scene: 'settings', tip: 'Options' },
];

export class HomeScene {
  constructor(engine) {
    this.engine = engine;
    this.input = engine.input;
    this.t = 0;
    this.tab = 2;
    this.realmIndex = 0;
    this.toast = null;
    this.hover = null;
    this._press = null;
    this.embers = [];
    for (let i = 0; i < 40; i++) {
      this.embers.push({
        x: Math.random() * W, y: Math.random() * H,
        s: 0.35 + Math.random() * 0.9, w: Math.random() < 0.3 ? 2 : 1,
        drift: Math.random() * TAU,
      });
    }
  }

  // ------------------------------------------------------------
  enter(params = {}) {
    this.save = params.save || this.engine.save;
    this.art = this.engine.sprites;
    // Optional-call: if an older engine.js is somehow cached, the portrait
    // layout degrades instead of taking the whole boot down with it.
    this.engine.setResolution?.(W, H);
    this.t = 0;
    this.tab = 2;
    this.toast = null;
    this._regenEnergy();
    const unlocked = this.save.unlockedRealms || ['purgatory'];
    const last = this.save.lastRealm || unlocked[unlocked.length - 1];
    const i = REALMS.findIndex(r => r.id === last);
    this.realmIndex = i >= 0 ? i : 0;
  }
  exit() {
    saveSave(this.save);
    this.engine.resetResolution?.();
  }

  _regenEnergy() {
    const s = this.save;
    if (s.energy === undefined) { s.energy = ENERGY_MAX; s.energyAt = Date.now(); }
    const now = Date.now();
    const gained = Math.floor(Math.max(0, (now - (s.energyAt || now)) / 1000) / ENERGY_REGEN_SECONDS);
    if (gained > 0 && s.energy < ENERGY_MAX) { s.energy = Math.min(ENERGY_MAX, s.energy + gained); s.energyAt = now; }
    else if (s.energy >= ENERGY_MAX) s.energyAt = now;
  }

  get realm() { return REALMS[this.realmIndex] || REALMS[0]; }
  get realmUnlocked() { return (this.save.unlockedRealms || ['purgatory']).includes(this.realm.id); }

  // ------------------------------------------------------------
  // LAYOUT — single source of truth for hit tests and drawing
  // ------------------------------------------------------------
  layout() {
    const cardW = 186, cardH = 172;
    const cardX = Math.round((W - cardW) / 2), cardY = 128;
    const navY = H - 44;
    const L = {
      profile: { x: 3, y: 6, w: 78, h: 22 },
      energy: { x: 83, y: 6, w: 48, h: 22 },
      coins: { x: 133, y: 6, w: 48, h: 22 },
      shards: { x: 183, y: 6, w: 48, h: 22 },
      profileBtn: { x: 233, y: 6, w: 34, h: 22 },
      card: { x: cardX, y: cardY, w: cardW, h: cardH },
      prev: { x: cardX + 2, y: cardY + cardH / 2 - 16, w: 20, h: 32 },
      next: { x: cardX + cardW - 22, y: cardY + cardH / 2 - 16, w: 20, h: 32 },
      quick: { x: Math.round(W / 2 - 74), y: 312, w: 34, h: 34 },
      slot: { x: Math.round(W / 2 - 20), y: 308, w: 40, h: 40 },
      bag: { x: Math.round(W / 2 + 40), y: 312, w: 34, h: 34 },
      start: { x: Math.round(W / 2 - 88), y: 358, w: 176, h: 52 },
      tabs: TABS.map((t, i) => {
        const tw = W / TABS.length;
        const centre = i === 2;
        return {
          ...t, i,
          x: Math.round(i * tw), w: Math.round(tw),
          y: centre ? navY - 16 : navY,
          h: centre ? 60 : 44,
          centre,
        };
      }),
    };
    // side rails, laid out from a single step so they always line up
    RAIL_L.forEach((b, i) => { L[b.key] = { x: 5, y: 38 + i * 44, w: 32, h: 32 }; });
    RAIL_R.forEach((b, i) => { L[b.key] = { x: W - 37, y: 38 + i * 44, w: 32, h: 32 }; });
    return L;
  }

  // ------------------------------------------------------------
  update(dt) {
    this.t += dt;
    const inp = this.input;
    const L = this.layout();
    const m = inp.mouse;
    if (this.toast) { this.toast.t -= dt; if (this.toast.t <= 0) this.toast = null; }
    if ((this.t | 0) % 5 === 0) this._regenEnergy();

    const hit = (r) => r && m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h;
    this.hover = null;
    for (const [name, r] of Object.entries(L)) {
      if (name === 'tabs') continue;
      if (hit(r)) this.hover = name;
    }
    for (const tb of L.tabs) if (hit(tb)) this.hover = 'tab' + tb.i;

    if (inp.wasPressed('ArrowLeft') || inp.wasPressed('KeyA')) this._cycleRealm(-1);
    if (inp.wasPressed('ArrowRight') || inp.wasPressed('KeyD')) this._cycleRealm(1);
    if (inp.wasPressed('Enter') || inp.wasPressed('Space')) this._start();

    if (m.justDown) {
      this._press = this.hover;
      if (hit(L.prev)) this._cycleRealm(-1);
      else if (hit(L.next)) this._cycleRealm(1);
      else if (hit(L.start) || hit(L.card)) this._start();
      else if (hit(L.quick)) this._start(true);
      else if (hit(L.bag) || hit(L.slot)) this.engine.setScene('arsenal', { save: this.save });
      else if (hit(L.coins) || hit(L.shards)) this.engine.setScene('shop', { save: this.save });
      else if (hit(L.energy)) this._say('+1 ENERGY / ' + ENERGY_REGEN_SECONDS + 's', '#8ef07a');
      else if (hit(L.profile) || hit(L.profileBtn)) this.engine.setScene('profile', { save: this.save });
      else if (this._railHit(L, hit)) { /* handled */ }
      else {
        for (const tb of L.tabs) {
          if (!hit(tb)) continue;
          this.tab = tb.i;
          if (tb.scene) this.engine.setScene(tb.scene, { save: this.save, from: 'menu' });
          else this._start();
          break;
        }
      }
    }
    if (!m.down) this._press = null;
    inp.endFrame();
  }

  _railHit(L, hit) {
    for (const b of [...RAIL_L, ...RAIL_R]) {
      if (!hit(L[b.key])) continue;
      this.engine.setScene(b.scene, { save: this.save, from: 'menu' });
      return true;
    }
    return false;
  }

  _cycleRealm(d) { this.realmIndex = (this.realmIndex + d + REALMS.length) % REALMS.length; }
  _say(msg, color = GOLD) { this.toast = { msg, color, t: 2 }; }

  _start(quick = false) {
    if (quick) {
      const un = this.save.unlockedRealms || ['purgatory'];
      const i = REALMS.findIndex(r => r.id === un[un.length - 1]);
      if (i >= 0) this.realmIndex = i;
    }
    if (!this.realmUnlocked) return this._say('CLEAR THE PREVIOUS REALM', '#ff7a6a');
    this._regenEnergy();
    if ((this.save.energy || 0) < ENERGY_COST) return this._say('NOT ENOUGH ENERGY', '#ff7a6a');
    this.save.energy -= ENERGY_COST;
    this.save.lastRealm = this.realm.id;
    saveSave(this.save);
    this.engine.setScene('gameplay', {
      save: this.save, realmId: this.realm.id, stage: 1,
      difficulty: this.engine._difficulty || 'normal',
    });
  }

  // ============================================================
  // RENDER
  // ============================================================
  render(ctx) {
    ctx.imageSmoothingEnabled = false;
    const L = this.layout();
    this._lavaBackground(ctx);
    this._topBar(ctx, L);
    this._sideRails(ctx, L);
    this._stage(ctx, L);
    this._slot(ctx, L);
    this._startButton(ctx, L);
    this._navBar(ctx, L);
    // build stamp — makes a stale cached build obvious at a glance
    ctx.globalAlpha = 0.5;
    label(ctx, 'v' + CFG.VERSION + '  ' + (CFG.BUILD || ''), W / 2, H - 50, '#ffe6c8', 6);
    ctx.globalAlpha = 1;
    if (this.toast) {
      ctx.globalAlpha = Math.min(1, this.toast.t * 2);
      tile(ctx, W / 2 - 92, 356, 184, 16, 6, { fill: 'rgba(20,10,14,0.9)', outline: this.toast.color, lift: 0 });
      label(ctx, this.toast.msg, W / 2, 367, this.toast.color, 8);
      ctx.globalAlpha = 1;
    }
  }

  // ---- molten background ----
  _lavaBackground(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#c9341c');
    g.addColorStop(0.28, '#e8511c');
    g.addColorStop(0.58, '#f4761d');
    g.addColorStop(0.85, '#ff9c28');
    g.addColorStop(1, '#ffc24a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // slow molten currents
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const y0 = 60 + i * 68;
      const amp = 10 + i * 2;
      const ph = this.t * (0.18 + i * 0.04) + i;
      ctx.beginPath();
      ctx.moveTo(-10, y0);
      for (let x = -10; x <= W + 10; x += 12) {
        ctx.lineTo(x, y0 + Math.sin(x * 0.032 + ph) * amp);
      }
      ctx.lineTo(W + 10, y0 + 26);
      for (let x = W + 10; x >= -10; x -= 12) {
        ctx.lineTo(x, y0 + 26 + Math.sin(x * 0.028 + ph * 1.2) * amp);
      }
      ctx.closePath();
      ctx.fillStyle = i % 2 ? 'rgba(255,196,74,0.16)' : 'rgba(176,38,14,0.20)';
      ctx.fill();
    }
    ctx.restore();

    // bright pools of molten rock
    for (let i = 0; i < 4; i++) {
      const cx = W * (0.15 + 0.24 * i) + Math.sin(this.t * 0.35 + i * 2) * 12;
      const cy = 150 + i * 90;
      const rg = ctx.createRadialGradient(cx, cy, 2, cx, cy, 74);
      rg.addColorStop(0, 'rgba(255,232,150,0.30)');
      rg.addColorStop(1, 'rgba(255,140,40,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(cx - 76, cy - 76, 152, 152);
    }

    // dark cooled crust blobs
    ctx.fillStyle = 'rgba(120,26,10,0.30)';
    for (let i = 0; i < 7; i++) {
      const bx = ((i * 97) % (W - 30)) + 12;
      const by = 70 + ((i * 143) % (H - 160));
      const bw = 16 + (i % 3) * 10;
      blob(ctx, bx, by + Math.sin(this.t * 0.5 + i) * 2, bw, 8 + (i % 2) * 4);
    }

    for (const e of this.embers) {
      e.y -= (9 + e.s * 20) / 60;
      e.x += Math.sin(this.t * 0.9 + e.drift) * 0.2;
      if (e.y < -3) { e.y = H + 3; e.x = Math.random() * W; }
      ctx.fillStyle = `rgba(255,${190 + Math.floor(e.s * 60)},110,${(0.25 + e.s * 0.5).toFixed(2)})`;
      ctx.fillRect(e.x | 0, e.y | 0, e.w, e.w);
    }

    // top scrim so the HUD always reads over the lava
    const tg = ctx.createLinearGradient(0, 0, 0, 40);
    tg.addColorStop(0, 'rgba(60,10,10,0.45)');
    tg.addColorStop(1, 'rgba(60,10,10,0)');
    ctx.fillStyle = tg;
    ctx.fillRect(0, 0, W, 40);
  }

  // ---- top bar: profile + resource chips — AAA GOD LEVEL ----
  _topBar(ctx, L) {
    const s = this.save;
    const p = L.profile;
    const authUser = AUTH.getCurrentUser();
    const isGuest = authUser?.guest;
    const username = authUser?.username || String(s.playerId || 'GUEST').slice(0,10);
    const pulse = 0.5+0.5*Math.sin(this.t*3);

    // profile tile with glow
    const hovProfile = this.hover === 'profile' || this.hover === 'profileBtn';
    if (hovProfile) {
      ctx.fillStyle = `rgba(255,198,60,${0.15+0.1*pulse})`;
      ctx.beginPath(); ctx.arc(p.x+ p.w/2, p.y+11, 28, 0, TAU); ctx.fill();
    }
    tile(ctx, p.x, p.y, p.w, p.h, 11, { fill: hovProfile? '#3a2a5a' : PANEL, fill2: '#1d1622', outline: INK, ring: hovProfile? GOLD : null, ringW:2, lift: hovProfile?4:2 });

    // avatar disc with AAA rim
    ctx.save();
    ctx.beginPath(); ctx.arc(p.x + 11, p.y + 11, 10, 0, TAU);
    ctx.fillStyle = isGuest ? '#6a6a7a' : '#f0b040';
    ctx.fill();
    ctx.strokeStyle = hovProfile? GOLD : INK; ctx.lineWidth = hovProfile? 3:2; ctx.stroke();
    ctx.clip();
    try {
      const portrait = this.art.getCharSet(s.charSkin || 'conductor').portrait;
      ctx.drawImage(portrait, p.x + 11 - 12, p.y + 11 - 11, 24, 24);
    } catch {
      // fallback letter
      label(ctx, username[0].toUpperCase(), p.x+11, p.y+15, '#ffffff', 12);
    }
    ctx.restore();

    // username
    label(ctx, username.toUpperCase().slice(0,10), p.x + 22, p.y + 10, '#ffffff', 6, 'left');
    label(ctx, (authUser?.title || 'CONDUCTOR') + (isGuest?' (GUEST)':''), p.x + 22, p.y + 18, isGuest?'#9aa0b4':'#ffe066', 5, 'left');

    // level chip with AAA shine
    const lvl = authUser?.level || Math.max(1, Math.floor((s.stats?.totalRuns || 0) / 3) + 1);
    tile(ctx, p.x + 4, p.y + p.h - 7, 18, 12, 5, { fill: '#4a3a2a', fill2: '#2a1a0a', outline: INK, ring: GOLD, ringW:1, lift: 1 });
    label(ctx, String(lvl), p.x + 13, p.y + p.h + 3, GOLD, 9);

    this._chip(ctx, L.energy, 'energy', (s.energy ?? ENERGY_MAX) + '/' + ENERGY_MAX, '#6ef04a');
    this._chip(ctx, L.coins, 'coin', fmtNum(s.coins || 0), GOLD);
    this._chip(ctx, L.shards, 'shard', fmtNum(s.shards || 0), '#4ae0d0');

    // profile button top right — AAA GOD LEVEL
    const pb = L.profileBtn;
    const hovBtn = this.hover === 'profileBtn';
    if (hovBtn) {
      ctx.fillStyle = `rgba(142,240,255,${0.18+0.12*pulse})`;
      ctx.beginPath(); ctx.arc(pb.x+pb.w/2, pb.y+pb.h/2, 20, 0, TAU); ctx.fill();
    }
    tile(ctx, pb.x, pb.y, pb.w, pb.h, 9, { fill: hovBtn? '#2a3a4a' : '#1d1622', fill2: '#0e0a14', outline: INK, ring: hovBtn? '#8ef0ff' : '#3a2a4a', ringW: hovBtn?2:1, lift: hovBtn?4:2 });
    glyph(ctx, isGuest? 'ghost' : 'trophy', pb.x+6, pb.y+1, 20, hovBtn? '#8ef0ff' : '#c8b8c0', this.t);
    // small dot if guest needs upgrade
    if (isGuest) {
      ctx.fillStyle='#ff4d4a'; ctx.beginPath(); ctx.arc(pb.x+pb.w-2, pb.y+2, 4, 0, TAU); ctx.fill();
      ctx.strokeStyle=INK; ctx.lineWidth=1; ctx.stroke();
    }
  }

  _chip(ctx, r, kind, value, color) {
    tile(ctx, r.x, r.y, r.w, r.h, 11, { fill: PANEL, fill2: '#1d1622', outline: INK, lift: 2 });
    label(ctx, value, r.x + 15, r.y + 15, '#ffffff', value.length > 4 ? 6 : value.length > 3 ? 7 : 8, 'left');
    // icon overhangs the left edge, like the reference
    icon(ctx, kind, r.x - 3, r.y + 1, 19, color, this.t);
    // green plus button on the right edge
    const px = r.x + r.w - 9;
    tile(ctx, px - 7, r.y + 3, 15, 15, 5, { fill: GREEN, fill2: GREEN_D, outline: INK, lift: 1 });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px - 4, r.y + 9, 9, 3);
    ctx.fillRect(px - 1, r.y + 6, 3, 9);
  }

  // ---- floating side rails ----
  _sideRails(ctx, L) {
    for (const b of [...RAIL_L, ...RAIL_R]) this._railBtn(ctx, L[b.key], b);
  }
  _railBtn(ctx, r, b) {
    const down = this._press === b.key;
    const y = r.y + (down ? 2 : 0);
    const hov = this.hover === b.key;
    const pulse = 0.5+0.5*Math.sin(this.t*3 + r.x*0.05);
    if(hov){
      ctx.fillStyle=`rgba(255,214,160,${0.15+0.1*pulse})`;
      ctx.beginPath(); ctx.arc(r.x+r.w/2, y+r.h/2, 22, 0, TAU); ctx.fill();
    }
    tile(ctx, r.x, y, r.w, r.h, 10, {
      fill: hov ? '#4a3a52' : PANEL, fill2: '#1d1622',
      outline: INK, ring: hov? '#ffd6a0' : null, ringW:2, lift: down ? 1 : hov?4:3,
    });
    // icon with slight bob when hovered
    const bob = hov ? Math.sin(this.t*6)*1 : 0;
    glyph(ctx, b.icon, r.x + 3, y + 1 + bob, 26, hov? '#ffe066' : '#ffd6a0', this.t);
    label(ctx, b.tip, r.x + r.w / 2, y + r.h + 9, hov?'#ffe066':'#ffe4bc', hov?7:6);
    if (b.badge) {
      ctx.beginPath(); ctx.arc(r.x + r.w - 1, y + 1, 7, 0, TAU);
      ctx.fillStyle = '#e0202a'; ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth=1; ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.x + r.w - 1, y + 1, 7, 0, TAU); ctx.stroke();
      label(ctx, String(b.badge), r.x + r.w - 1, y + 5, '#ffffff', 8);
    }
  }

  // ---- title + isometric stage card ----
  _stage(ctx, L) {
    const realm = this.realm;
    const c = L.card;

    // Realm names vary a lot in length ("The Infernal Fields"), so the title
    // shrinks to fit the gap between the two side rails instead of colliding.
    const title = (this.realmIndex + 1) + '. ' + realm.name;
    let size = 19;
    while (size > 10) {
      ctx.font = 'bold ' + size + 'px monospace';
      if (ctx.measureText(title).width <= 176) break;
      size -= 1;
    }
    outline(ctx, title, W / 2, 106, '#ffffff', '#8a1c0c', size);
    outline(ctx, 'Longest Survived: ' + fmtTime(this.save.stats?.longestRun || 0),
      W / 2, 122, '#ffe9c0', '#7a2408', 9);

    tile(ctx, c.x, c.y, c.w, c.h, 12, { fill: '#20182c', fill2: '#140e1e', outline: INK, lift: 4 });
    // little pointer tab under the card
    ctx.beginPath();
    ctx.moveTo(W / 2 - 9, c.y + c.h - 2);
    ctx.lineTo(W / 2 + 9, c.y + c.h - 2);
    ctx.lineTo(W / 2, c.y + c.h + 8);
    ctx.closePath();
    ctx.fillStyle = '#20182c'; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();

    ctx.save();
    clipRound(ctx, c.x + 2, c.y + 2, c.w - 4, c.h - 4, 10);
    this._diorama(ctx, c, realm);
    ctx.restore();

    if (!this.realmUnlocked) {
      ctx.save();
      clipRound(ctx, c.x + 2, c.y + 2, c.w - 4, c.h - 4, 10);
      ctx.fillStyle = 'rgba(10,6,14,0.7)';
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.restore();
      icon(ctx, 'lock', W / 2 - 16, c.y + c.h / 2 - 24, 32, GOLD, this.t);   // always vector
      outline(ctx, 'LOCKED', W / 2, c.y + c.h / 2 + 22, '#ffffff', '#5a1a08', 13);
    }

    this._chevron(ctx, L.prev, -1);
    this._chevron(ctx, L.next, 1);
  }

  _chevron(ctx, r, dir) {
    tile(ctx, r.x, r.y, r.w, r.h, 8, { fill: 'rgba(20,12,18,0.7)', outline: 'rgba(255,220,160,0.55)', lift: 0 });
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
    // sky behind the island
    const sg = ctx.createLinearGradient(0, c.y, 0, c.y + c.h);
    sg.addColorStop(0, realm.sky);
    sg.addColorStop(1, shade(realm.accent, -0.25));
    ctx.fillStyle = sg;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    for (let i = 0; i < 18; i++) {
      const x = c.x + ((i * 61) % (c.w - 6)) + 3;
      const y = c.y + ((i * 37) % 40) + 4;
      ctx.fillStyle = `rgba(255,255,255,${(0.12 + 0.22 * Math.abs(Math.sin(t + i))).toFixed(2)})`;
      ctx.fillRect(x, y, 1, 1);
    }

    // ---- isometric grid ----
    const N = 8, TW = 22, TH = 11;
    const ox = c.x + c.w / 2;
    const oy = c.y + 66 + Math.sin(t * 0.8) * 1.5;     // gentle float
    const P = (tx, ty) => [ox + (tx - ty) * TW / 2, oy + (tx + ty) * TH / 2];
    const inside = (tx, ty) => tx >= 0 && ty >= 0 && tx < N && ty < N;

    // island underside (extruded rock)
    const depth = 16;
    const [lx, ly] = P(0, N), [rx, ry] = P(N, 0);
    const ty0 = P(0, 0)[1], by0 = P(N, N)[1];
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(ox, by0);
    ctx.lineTo(rx, ry);
    ctx.lineTo(rx, ry + depth);
    ctx.lineTo(ox, by0 + depth + 6);
    ctx.lineTo(lx, ly + depth);
    ctx.closePath();
    ctx.fillStyle = D.side;
    ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();

    // top faces
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
        ctx.moveTo(x, y);
        ctx.lineTo(x + TW / 2, y + TH / 2);
        ctx.lineTo(x, y + TH);
        ctx.lineTo(x - TW / 2, y + TH / 2);
        ctx.closePath();
        ctx.fillStyle = col;
        ctx.fill();
      }
    }
    // road markings
    for (let tx = 0; tx < N; tx++) {
      if (tx % 2) continue;
      const [x, y] = P(tx + 0.5, 4.5);
      ctx.fillStyle = 'rgba(255,225,120,0.85)';
      ctx.beginPath();
      ctx.moveTo(x, y - 2); ctx.lineTo(x + 5, y + 0.5);
      ctx.lineTo(x, y + 3); ctx.lineTo(x - 5, y + 0.5);
      ctx.closePath(); ctx.fill();
    }
    // island rim highlight
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(ox, ty0);
    ctx.lineTo(rx, ry);
    ctx.strokeStyle = 'rgba(255,255,255,0.20)';
    ctx.lineWidth = 2; ctx.stroke();

    // ---- props, painted back-to-front so overlaps are correct ----
    const props = [
      { tx: 0.7, ty: 0.7, kind: 'tower', h: 34, w: 26 },
      { tx: 2.6, ty: 0.5, kind: 'tower', h: 46, w: 22 },
      { tx: 5.4, ty: 0.7, kind: 'tower', h: 28, w: 24 },
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

    // the train, running the road
    try {
      const set = this.art.getTrainSet(this.save.trainSkin || 'iron_horse');
      const f = Math.floor(t * 9) % set.engine.length;
      const span = ((t * 0.55) % 1.6) - 0.3;          // in tile units along the road
      const [rxp, ryp] = P(span * N, 4.5);
      const eng = set.engine[f];
      const ew = Math.round(eng.width / 2), eh = Math.round(eng.height / 2);
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(rxp, ryp + 3, ew * 0.45, 4, 0, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.drawImage(eng, Math.round(rxp - ew / 2), Math.round(ryp - eh + 4), ew, eh);
    } catch {}

    // the player, waiting on the path
    try {
      const cs = this.art.getCharSet(this.save.charSkin || 'conductor');
      const idle = cs.down.idle;
      const fr = idle[Math.floor(t * 6) % idle.length];
      const [px, py] = P(3.5, 2.2);
      ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(px, py + 4, 8, 3, 0, 0, TAU); ctx.fill(); ctx.restore();
      ctx.drawImage(fr, Math.round(px - fr.width / 2), Math.round(py - fr.height + 6));
    } catch {}

    // a local hostile shambling about
    try {
      const frames = this.art.anim['ghost_' + realm.id] || this.art.anim.ghost;
      if (frames) {
        const fr = frames[Math.floor(t * 7) % frames.length];
        const [ex, ey] = P(5.2, 5.4 + Math.sin(t * 0.7) * 0.5);
        ctx.drawImage(fr, Math.round(ex - fr.width / 2), Math.round(ey - fr.height + 6));
      }
    } catch {}

    // sparkle, like the reference
    const sp = (Math.sin(t * 2.4) + 1) / 2;
    star(ctx, c.x + 34, c.y + 52, 4 + sp * 3, `rgba(255,230,120,${(0.5 + sp * 0.5).toFixed(2)})`);
  }

  _isoTower(ctx, x, y, w, h, D, t) {
    const body = D.bld;
    isoBox(ctx, x, y, w, h, shade(body, 0.35), body, shade(body, -0.25));
    // windows on the two visible faces
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
    isoBox(ctx, x, y, 30, 22, '#e8e4dc', '#cfc8bd', '#a89f94');
    // striped awning
    const ay = y - 22 + 12;
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? '#e8362a' : '#fbf3e6';
      ctx.fillRect(Math.round(x - 15 + i * 5), Math.round(ay + i * 0.6), 5, 6);
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(x - 15), Math.round(ay), 30, 7);
    ctx.fillStyle = '#4a4652';
    ctx.fillRect(Math.round(x - 4), Math.round(y - 9), 8, 9);
    // sign
    ctx.fillStyle = (Math.sin(t * 3) > 0) ? '#ffd84a' : '#ffb020';
    ctx.fillRect(Math.round(x + 8), Math.round(y - 24), 4, 4);
  }

  _isoTree(ctx, x, y, D, t) {
    const sway = Math.sin(t * 1.4 + x) * 1.2;
    ctx.fillStyle = '#6a4020';
    ctx.fillRect(Math.round(x - 2), Math.round(y - 14), 4, 14);
    ctx.strokeStyle = INK; ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(x - 2) + 0.5, Math.round(y - 14) + 0.5, 4, 14);
    const leaf = D.leaf;
    for (const [dx, dy, r] of [[0, -26, 10], [-6, -19, 7], [7, -19, 7]]) {
      ctx.beginPath();
      ctx.arc(x + dx + sway * (dy < -22 ? 1 : 0.5), y + dy, r, 0, TAU);
      ctx.fillStyle = leaf; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x - 3 + sway, y - 29, 4, 0, TAU);
    ctx.fillStyle = shade(leaf, 0.35); ctx.fill();
  }

  _isoRock(ctx, x, y, D) {
    ctx.beginPath();
    ctx.moveTo(x - 8, y); ctx.lineTo(x - 4, y - 8); ctx.lineTo(x + 3, y - 9);
    ctx.lineTo(x + 8, y - 1); ctx.lineTo(x + 2, y + 3);
    ctx.closePath();
    ctx.fillStyle = shade(D.side, 0.30); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
  }

  // ---- the row under the card: quick play, chest, bag ---- polished
  _slot(ctx, L) {
    const pulse = 0.5 + 0.5*Math.sin(this.t*3);
    // quick
    const q = L.quick, down = this._press === 'quick';
    const qHover = this.hover === 'quick';
    if(qHover){
      ctx.fillStyle=`rgba(110,240,74,${0.18+0.12*pulse})`;
      ctx.beginPath(); ctx.arc(q.x+q.w/2, q.y+q.h/2, 22+4*pulse, 0, TAU); ctx.fill();
    }
    tile(ctx, q.x, q.y + (down ? 2 : 0), q.w, q.h, 10, {
      fill: qHover ? '#3f6a34' : '#2e4a26', fill2: '#1a2c16',
      outline: INK, ring: qHover ? '#6ef04a' : null, ringW: 2, lift: down ? 1 : 4,
    });
    glyph(ctx, 'quickplay', q.x + 4, q.y + 2 + (down ? 2 : 0), 26, '#8ef07a', this.t);
    label(ctx, 'Quick', q.x + q.w / 2, q.y + q.h + 10, qHover ? '#eaffd0' : '#cdf0b8', 6);
    if(qHover){
      tile(ctx, q.x-2, q.y+q.h+18, q.w+4, 8, 4, {fill:'#1a2c16', outline:INK, lift:0});
      label(ctx, '1-TAP RUN', q.x+q.w/2, q.y+q.h+23, '#8ef07a', 5);
    }

    // chest — centre, biggest, with glow
    const r = L.slot;
    const rHover = this.hover === 'slot';
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.15*pulse;
    ctx.fillStyle = GOLD;
    ctx.beginPath(); ctx.arc(r.x+r.w/2, r.y+r.h/2, 28+6*pulse, 0, TAU); ctx.fill();
    ctx.restore();
    tile(ctx, r.x, r.y, r.w, r.h, 11, { fill: rHover? '#3a2a5a' : PANEL, fill2: '#181222', outline: INK, ring: GOLD, ringW: rHover?3:2, lift: rHover?5:4 });
    // inner shine
    ctx.save();
    clipRound(ctx, r.x+2, r.y+2, r.w-4, r.h-4, 9);
    ctx.globalAlpha=0.18; ctx.fillStyle='#ffffff'; ctx.fillRect(r.x, r.y+2, r.w, r.h*0.32);
    ctx.restore();
    glyph(ctx, 'chest', r.x + 4, r.y + 3, 32, GOLD, this.t);
    // badge
    ctx.beginPath(); ctx.arc(r.x + r.w - 1, r.y + 1, 8, 0, TAU);
    ctx.fillStyle = '#e0202a'; ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.x + r.w - 1, r.y + 1, 8, 0, TAU); ctx.stroke();
    label(ctx, '1', r.x + r.w - 1, r.y + 5, '#ffffff', 9);
    label(ctx, 'Co. Chest', r.x + r.w / 2, r.y + r.h + 10, rHover?'#ffe066':'#ffe9c0', 7);
    if(rHover){
      label(ctx, 'FREE LOOT!', r.x+r.w/2, r.y-6, '#ffe066', 6);
    }

    // bag
    const b = L.bag, bd = this._press === 'bag';
    const bHover = this.hover === 'bag';
    if(bHover){
      ctx.fillStyle=`rgba(255,154,74,${0.18+0.12*pulse})`;
      ctx.beginPath(); ctx.arc(b.x+b.w/2, b.y+b.h/2, 20+4*pulse, 0, TAU); ctx.fill();
    }
    tile(ctx, b.x, b.y + (bd ? 2 : 0), b.w, b.h, 10, {
      fill: bHover ? '#5a3a2a' : PANEL, fill2: '#1d1622',
      outline: INK, ring: bHover? '#ff9a4a' : null, ringW:2, lift: bd ? 1 : 4,
    });
    glyph(ctx, 'bag', b.x + 4, b.y + 2 + (bd ? 2 : 0), 26, '#ff9a4a', this.t);
    label(ctx, 'My Bag', b.x + b.w / 2, b.y + b.h + 10, bHover?'#ffd0a0':'#ffe4bc', 6);
  }

  // ---- the big Start button ----
  _startButton(ctx, L) {
    const b = L.start;
    const enough = (this.save.energy || 0) >= ENERGY_COST && this.realmUnlocked;
    const down = this._press === 'start';
    const y = b.y + (down ? 3 : 0);

    tile(ctx, b.x, y, b.w, b.h, 14, {
      fill: enough ? '#ff5a3a' : '#8a7070',
      fill2: enough ? RED_D : '#4a3838',
      outline: INK, ring: enough ? GOLD : '#7a6a58', ringW: 3,
      lift: down ? 2 : 6,
    });
    if (enough && this.hover === 'start') {
      ctx.globalAlpha = 0.14 + 0.08 * Math.sin(this.t * 8);
      roundPath(ctx, b.x + 3, y + 3, b.w - 6, b.h - 6, 11);
      ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.globalAlpha = 1;
    }
    outline(ctx, 'Start', W / 2, y + 26, '#ffffff', RED_D, 22);
    icon(ctx, 'energy', W / 2 - 20, y + 30, 15, enough ? '#ffe066' : '#c0b0a0', this.t);
    outline(ctx, 'x ' + ENERGY_COST, W / 2 + 8, y + 42, '#ffe9a0', RED_D, 12);
  }

  // ---- bottom nav ----
  _navBar(ctx, L) {
    const navY = H - 44;
    ctx.fillStyle = '#1b1420';
    ctx.fillRect(0, navY, W, 44);
    ctx.fillStyle = INK;
    ctx.fillRect(0, navY, W, 2);

    for (const tb of L.tabs) {
      const active = tb.i === this.tab;
      if (tb.centre) {
        const bw = 58, bx = Math.round(tb.x + tb.w / 2 - bw / 2), by = navY - 16;
        tile(ctx, bx, by, bw, 46, 13, { fill: '#ffd24a', fill2: '#ef8a12', outline: INK, ring: '#fff0b0', ringW: 2, lift: 4 });
        glyph(ctx, 'battle', bx + bw / 2 - 17, by + 2, 34, '#ffffff', this.t);
        outline(ctx, tb.label, bx + bw / 2, by + 41, '#ffffff', '#8a3a08', 12);
      } else {
        const bw = 40, bx = Math.round(tb.x + tb.w / 2 - bw / 2), by = navY + 3;
        tile(ctx, bx, by, bw, 25, 9, {
          fill: active ? '#4a3a52' : '#2b2230', fill2: active ? '#2e2436' : '#1d1622',
          outline: INK, lift: 2,
        });
        glyph(ctx, tb.icon, bx + bw / 2 - 11, by + 2, 22, active ? GOLD : '#c8b8c0', this.t, active ? 1 : 0.82);
        label(ctx, tb.label, bx + bw / 2, by + 37, active ? GOLD : '#e0d0c8', 7);
      }
    }
  }
}

// ============================================================
// CHUNKY UI PRIMITIVES
// Everything shares one look: 2px near-black outline, rounded
// corners, a vertical gradient body, a soft top highlight and a
// solid "lift" slab underneath so tiles read as physical objects.
// ============================================================
function roundPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
function clipRound(ctx, x, y, w, h, r) { roundPath(ctx, x, y, w, h, r); ctx.clip(); }

function tile(ctx, x, y, w, h, r, o = {}) {
  const lift = o.lift ?? 3;
  if (lift > 0) {
    roundPath(ctx, x, y + lift, w, h, r);
    ctx.fillStyle = o.shadow || 'rgba(20,8,10,0.55)';
    ctx.fill();
  }
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, o.fill || PANEL);
  g.addColorStop(1, o.fill2 || o.fill || PANEL);
  roundPath(ctx, x, y, w, h, r);
  ctx.fillStyle = g;
  ctx.fill();
  if (o.ring) {
    ctx.strokeStyle = o.ring; ctx.lineWidth = o.ringW || 2; ctx.stroke();
  }
  roundPath(ctx, x, y, w, h, r);
  ctx.strokeStyle = o.outline || INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  // top gloss
  ctx.save();
  clipRound(ctx, x, y, w, h, r);
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y + 2, w, Math.max(2, h * 0.26));
  ctx.restore();
  ctx.lineWidth = 1;
}

function label(ctx, str, x, y, color, size, align = 'center') {
  ctx.font = 'bold ' + size + 'px monospace';
  ctx.textAlign = align;
  ctx.fillStyle = 'rgba(20,8,12,0.75)';
  ctx.fillText(str, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.textAlign = 'left';
}

function outline(ctx, str, cx, y, color, ink, size) {
  ctx.font = 'bold ' + size + 'px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = ink;
  const k = size > 15 ? 2 : 1;
  for (let dx = -k; dx <= k; dx++) {
    for (let dy = -k; dy <= k; dy++) {
      if (dx || dy) ctx.fillText(str, cx + dx, y + dy);
    }
  }
  ctx.fillText(str, cx, y + k + 1);
  ctx.fillStyle = color;
  ctx.fillText(str, cx, y);
  ctx.textAlign = 'left';
}

function blob(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.ellipse(x, y, w, h, 0, 0, TAU);
  ctx.fill();
}

function star(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU - Math.PI / 2;
    const rr = i % 2 ? r * 0.34 : r;
    const fn = i ? 'lineTo' : 'moveTo';
    ctx[fn](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

// An isometric box standing on the tile whose top vertex is (x, y).
function isoBox(ctx, x, y, w, h, top, left, right) {
  const hw = w / 2, hh = w / 4;
  const ty = y - h;                       // y of the top face's centre
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  // left face
  ctx.beginPath();
  ctx.moveTo(x - hw, ty); ctx.lineTo(x, ty + hh);
  ctx.lineTo(x, y + hh); ctx.lineTo(x - hw, y);
  ctx.closePath();
  ctx.fillStyle = left; ctx.fill(); ctx.stroke();
  // right face
  ctx.beginPath();
  ctx.moveTo(x + hw, ty); ctx.lineTo(x, ty + hh);
  ctx.lineTo(x, y + hh); ctx.lineTo(x + hw, y);
  ctx.closePath();
  ctx.fillStyle = right; ctx.fill(); ctx.stroke();
  // top face
  ctx.beginPath();
  ctx.moveTo(x, ty - hh); ctx.lineTo(x + hw, ty);
  ctx.lineTo(x, ty + hh); ctx.lineTo(x - hw, ty);
  ctx.closePath();
  ctx.fillStyle = top; ctx.fill(); ctx.stroke();
  ctx.lineWidth = 1;
}

// Lighten (k > 0) or darken (k < 0) a hex colour.
function shade(hex, k) {
  const h = String(hex).replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(ch => ch + ch).join('') : h, 16) || 0;
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const m = (v) => k >= 0
    ? Math.round(v + (255 - v) * k)
    : Math.round(v * (1 + k));
  r = m(r); g = m(g); b = m(b);
  return `rgb(${r},${g},${b})`;
}

// Prefer the baked icon plate; fall back to the vector glyph below so the UI
// still reads perfectly if assets/icons/ is missing.
const FALLBACK = {
  battle: 'star', train: 'chest', arsenal: 'gun', forge: 'anvil', coinshop: 'coinbag',
  trophy: 'chest', gift: 'gift', daily: 'calendar', leaderboard: 'chest',
  worldmap: 'calendar', armoury: 'shield', relics: 'relic', settings: 'cog',
  bag: 'bag', quickplay: 'energy', chest: 'chest',
};
function glyph(ctx, name, x, y, s, color, t = 0, alpha = 1) {
  const im = ICONS[name];
  if (im) {
    if (alpha !== 1) { ctx.save(); ctx.globalAlpha = alpha; }
    ctx.drawImage(im, Math.round(x), Math.round(y), s, s);
    if (alpha !== 1) ctx.restore();
    return;
  }
  icon(ctx, FALLBACK[name] || name, x, y, s, color, t);
}

// Chunky cartoon glyphs, authored on a 16x16 grid then scaled.
function icon(ctx, kind, x, y, s, color, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 16, s / 16);
  ctx.lineJoin = 'round';
  const R = (a, b, c, d, col) => { ctx.fillStyle = col || color; ctx.fillRect(a, b, c, d); };
  const ink = () => { ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke(); };
  ctx.fillStyle = color;
  switch (kind) {
    case 'energy':
      ctx.beginPath();
      ctx.moveTo(10, 1); ctx.lineTo(3, 9.5); ctx.lineTo(7, 9.5); ctx.lineTo(6, 15);
      ctx.lineTo(13, 6.5); ctx.lineTo(8.5, 6.5);
      ctx.closePath(); ctx.fill(); ink();
      break;
    case 'coin':
      ctx.beginPath(); ctx.arc(8, 8, 7, 0, TAU); ctx.fill(); ink();
      ctx.beginPath(); ctx.arc(8, 8, 4.4, 0, TAU);
      ctx.fillStyle = shade(String(color), -0.35); ctx.fill();
      R(7, 4.5, 2, 7, '#fff6c0'); R(5.5, 6.5, 5, 1.6, '#fff6c0');
      break;
    case 'shard':
      ctx.beginPath();
      ctx.moveTo(8, 1); ctx.lineTo(14, 7); ctx.lineTo(8, 15); ctx.lineTo(2, 7);
      ctx.closePath(); ctx.fill(); ink();
      ctx.beginPath(); ctx.moveTo(8, 2.5); ctx.lineTo(12, 7); ctx.lineTo(8, 7);
      ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill();
      break;
    case 'list':
      R(2, 2, 12, 12); ink();
      ctx.fillStyle = INK;
      for (let i = 0; i < 3; i++) { R(4, 4.5 + i * 3.4, 2, 2, INK); R(7.5, 5 + i * 3.4, 5, 1.4, INK); }
      break;
    case 'gift':
      R(2, 6, 12, 8); ink();
      R(6.5, 2, 3, 12, '#ffe066');
      R(2, 6, 12, 2.4, '#ffe066');
      ctx.beginPath(); ctx.arc(5.5, 4, 2.4, 0, TAU); ctx.arc(10.5, 4, 2.4, 0, TAU);
      ctx.fillStyle = '#ffe066'; ctx.fill(); ink();
      break;
    case 'bag':
      ctx.beginPath();
      roundPath(ctx, 2.5, 5, 11, 9, 3); ctx.fill(); ink();
      ctx.beginPath(); ctx.arc(8, 5.5, 3.4, Math.PI, 0);
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
      R(5, 8.5, 6, 3.5, '#3a2a30');
      break;
    case 'calendar':
      roundPath(ctx, 2, 3.5, 12, 10.5, 2); ctx.fill(); ink();
      R(3, 6.5, 10, 6.5, '#2a2030');
      R(4, 1.5, 2, 3); R(10, 1.5, 2, 3);
      R(4.5, 8, 2, 2, color); R(8, 8, 2, 2, color); R(4.5, 11, 2, 2, color);
      break;
    case 'cog':
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + t * 0.5;
        R(8 + Math.cos(a) * 6 - 1.6, 8 + Math.sin(a) * 6 - 1.6, 3.2, 3.2);
      }
      ctx.beginPath(); ctx.arc(8, 8, 5, 0, TAU); ctx.fill(); ink();
      ctx.beginPath(); ctx.arc(8, 8, 2.2, 0, TAU); ctx.fillStyle = INK; ctx.fill();
      break;
    case 'chest':
      roundPath(ctx, 2, 6, 12, 8, 1.5); ctx.fill(); ink();
      ctx.beginPath(); ctx.arc(8, 6.5, 6, Math.PI, 0); ctx.fill(); ink();
      R(2, 8.5, 12, 1.6, INK); R(6.8, 7.5, 2.4, 4, INK);
      R(7.2, 8.4, 1.6, 2, '#fff0a0');
      break;
    case 'gun':
      roundPath(ctx, 1.5, 6, 11, 4, 1); ctx.fill(); ink();
      roundPath(ctx, 3.5, 9.5, 3.5, 4.5, 1); ctx.fill(); ink();
      R(11.5, 4.5, 3, 2.5); ink();
      break;
    case 'anvil':
      ctx.beginPath();
      ctx.moveTo(2, 5); ctx.lineTo(14, 5); ctx.lineTo(12, 9); ctx.lineTo(10, 9);
      ctx.lineTo(10, 11); ctx.lineTo(12.5, 14); ctx.lineTo(3.5, 14);
      ctx.lineTo(6, 11); ctx.lineTo(6, 9); ctx.lineTo(3.5, 9);
      ctx.closePath(); ctx.fill(); ink();
      break;
    case 'coinbag':
      ctx.beginPath(); ctx.arc(8, 10, 5.8, 0, TAU); ctx.fill(); ink();
      R(5.5, 2, 5, 3); ink();
      ctx.fillStyle = INK;
      ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillText('$', 8, 12.5); ctx.textAlign = 'left';
      break;
    case 'star':
      star(ctx, 8, 8, 7.5, color);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU - Math.PI / 2;
        const rr = i % 2 ? 7.5 * 0.34 : 7.5;
        const fn = i ? 'lineTo' : 'moveTo';
        ctx[fn](8 + Math.cos(a) * rr, 8 + Math.sin(a) * rr);
      }
      ctx.closePath(); ink();
      break;
    case 'shield':
      ctx.beginPath();
      ctx.moveTo(8, 1.5); ctx.lineTo(14, 4); ctx.lineTo(14, 8.5);
      ctx.quadraticCurveTo(14, 13, 8, 15); ctx.quadraticCurveTo(2, 13, 2, 8.5);
      ctx.lineTo(2, 4); ctx.closePath();
      ctx.fill(); ink();
      R(7.2, 5, 1.6, 6, INK); R(5, 7.2, 6, 1.6, INK);
      break;
    case 'relic':
      ctx.beginPath(); ctx.arc(8, 2.5, 1.4, 0, TAU); ctx.fill();
      R(7.4, 3.5, 1.2, 2.5);
      ctx.beginPath();
      ctx.moveTo(8, 5.5); ctx.lineTo(12.5, 9); ctx.lineTo(8, 14.5); ctx.lineTo(3.5, 9);
      ctx.closePath(); ctx.fill(); ink();
      ctx.beginPath();
      ctx.moveTo(8, 7.5); ctx.lineTo(10.5, 9.4); ctx.lineTo(8, 12.2); ctx.lineTo(5.5, 9.4);
      ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
      break;
    case 'lock':
      roundPath(ctx, 3, 7, 10, 8, 2); ctx.fill(); ink();
      ctx.beginPath(); ctx.arc(8, 7, 3.4, Math.PI, 0);
      ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.stroke();
      R(7, 9.5, 2, 3.5, INK);
      break;
    default:
      ctx.beginPath(); ctx.arc(8, 8, 5, 0, TAU); ctx.fill(); ink();
  }
  ctx.restore();
}
