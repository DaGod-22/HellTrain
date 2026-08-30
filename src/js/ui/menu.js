// ============================================================
// HELL TRAIN — ALL MENU PAGES (v1.4)
// Every page shares one language (ui/kit.js): same top bar with
// back + title + purse, same item cards, same list behaviour
// (mouse wheel + arrow keys + scrollbar), same snappy animations.
// Text says what things DO, not how great they are.
// ============================================================
import { CFG } from '../core/config.js';
import { TAU, fmtNum, fmtTime } from '../core/utils.js';
import { REALMS, ACHIEVEMENTS, WEEKLY_CHALLENGES, ARMOURS, RELICS, findRealm, DIFFICULTIES } from '../data/realms.js';
import { ENDINGS, REALM_RELICS } from '../data/endings.js';
import { TRAIN_SKINS, CHAR_SKINS } from '../data/skins.js';
import { WEAPONS } from '../data/weapons.js';
import { TRAIN_CARRIAGE_MODULES } from '../data/carriages.js';
import { familyName, masteryLabel, nextMilestone } from '../data/mastery.js';
import { SEASON_TIERS, tierForRank, monthKey, monthLabel, AVATARS, FRAMES } from '../data/season.js';
import { drawAvatar, drawFrame } from './kit.js';

// v1.8 metallic terminal backdrop — charcoal smoke + crimson wash (menu pages)
function steelBackdrop(ctx, t, embers = []) {
  const g = ctx.createLinearGradient(0, 0, 0, KH);
  g.addColorStop(0, '#100f14');
  g.addColorStop(0.5, '#1a1720');
  g.addColorStop(1, '#231f28');
  ctx.fillStyle = g; ctx.fillRect(0, 0, KW, KH);
  for (let i = 0; i < 3; i++) {
    const y0 = 90 + i * 150;
    ctx.beginPath(); ctx.moveTo(-10, y0);
    for (let x = -10; x <= KW + 10; x += 16) ctx.lineTo(x, y0 + Math.sin(x * 0.03 + t * (0.14 + i * 0.05) + i * 2) * 9);
    ctx.lineTo(KW + 10, y0 + 60);
    ctx.fillStyle = 'rgba(120,110,140,0.04)';
    ctx.fill();
  }
  for (const e of embers) {
    ctx.fillStyle = `rgba(255,${50 + Math.floor(e.s * 40)},44,${(0.1 + e.s * 0.22).toFixed(2)})`;
    ctx.fillRect(e.x | 0, ((e.y - t * (10 + e.s * 14)) % KH + KH) % KH | 0, e.w || 1, e.w || 1);
  }
}
import { saveSave, spendCoins } from '../core/save.js';
import { AUTH } from '../systems/auth.js';
import { SOUNDS } from '../core/sound.js';
import {
  KW, KH, K, tile, label, outlineText, glyph, roundPath, inRect,
  topBar, itemCard, drawTabs, button, List, drawToast, sectionLabel,
  steelPlate, steelButton, rivet,
} from './kit.js';

// ---- shared molten backdrop (the game's face, kept calm so cards read) ----
function lavaBackground(ctx, t, embers) {
  const g = ctx.createLinearGradient(0, 0, 0, KH);
  g.addColorStop(0, '#8a2414');
  g.addColorStop(0.35, '#b03a18');
  g.addColorStop(0.75, '#d4581c');
  g.addColorStop(1, '#e87222');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, KW, KH);
  for (const e of embers) {
    e.y -= (10 + e.s * 14) / 60;
    if (e.y < -4) { e.y = KH + 4; e.x = Math.random() * KW; }
    ctx.fillStyle = `rgba(255,150,50,${(0.16 + e.s * 0.22).toFixed(2)})`;
    ctx.fillRect(e.x | 0, e.y | 0, 1, e.s > 1 ? 2 : 1);
  }
  const tg = ctx.createLinearGradient(0, 0, 0, 120);
  tg.addColorStop(0, 'rgba(24,6,14,0.55)');
  tg.addColorStop(1, 'rgba(24,6,14,0)');
  ctx.fillStyle = tg;
  ctx.fillRect(0, 0, KW, 120);
  const bg = ctx.createLinearGradient(0, KH - 90, 0, KH);
  bg.addColorStop(0, 'rgba(24,6,14,0)');
  bg.addColorStop(1, 'rgba(24,6,14,0.5)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, KH - 90, KW, 90);
}

// ---- page base: mouse + wheel + page-open animation + toasts ----
class Page {
  constructor(engine) {
    this.engine = engine;
    this.t = 0; this.pageT = 0;
    this.toast = null;
    this.embers = [];
    for (let i = 0; i < 26; i++) this.embers.push({ x: Math.random() * KW, y: Math.random() * KH, s: 0.3 + Math.random() * 0.8 });
    this._mouse = { x: KW / 2, y: KH / 2, down: false, justDown: false };
    this._press = null;
    const c = engine.canvas;
    c.addEventListener('mousemove', (e) => {
      const r = c.getBoundingClientRect();
      this._mouse.x = (e.clientX - r.left) / r.width * KW;
      this._mouse.y = (e.clientY - r.top) / r.height * KH;
    });
    c.addEventListener('mousedown', (e) => { if (e.button === 0) { this._mouse.down = true; this._mouse.justDown = true; } });
    c.addEventListener('mouseup', (e) => { if (e.button === 0) this._mouse.down = false; });
    c.addEventListener('wheel', (e) => { e.preventDefault(); this._mouse.wheel = (this._mouse.wheel || 0) + e.deltaY; }, { passive: false });
  }
  enter(p) {
    this.save = p.save || this.engine.save;
    this.engine.setResolution?.(KW, KH);
    this.t = 0; this.pageT = 0; this.toast = null;
    this._grace = 0.15;               // swallow the click that opened this page
    this._mouse.wheel = 0;
  }
  exit() { saveSave(this.save); this.engine.resetResolution?.(); }
  hit(r) { return inRect(this._mouse, r); }
  say(msg, color = K.GOLD) { this.toast = { msg, color, t: 1.8 }; }
  // returns true while clicks should be ignored (page just opened)
  grace(dt) { this._grace = Math.max(0, (this._grace || 0) - dt); return this._grace > 0; }
  base(dt) {
    this.t += dt; this.pageT += dt;
    if (this.toast) { this.toast.t -= dt; if (this.toast.t <= 0) this.toast = null; }
    const back = this.engine.input?.wasPressed?.('Escape');
    if (back) { this._goBack(); return null; }
    return this._mouse;
  }
  _goBack() { this.engine.setScene('menu', { save: this.save }); }
  feedList(list, mouse) {
    if (mouse?.wheel) { list.wheelDelta(mouse.wheel); mouse.wheel = 0; }
    const inp = this.engine.input;
    let act = -1;
    if (inp?.wasPressed?.('ArrowDown')) act = list.scrollByKey(1);
    if (inp?.wasPressed?.('ArrowUp')) act = list.scrollByKey(-1);
    if (inp?.wasPressed?.('PageDown')) { list.scrollByKey(4); act = list.keyIndex; }
    if (inp?.wasPressed?.('PageUp')) { list.scrollByKey(-4); act = list.keyIndex; }
    list.updateScroll(0);
    return act;
  }
}

// helper: which realm must fall to unlock a relic
function relicSource(relicId) {
  for (const r of REALMS) if (REALM_RELICS[r.id] === relicId) return r;
  return null;
}

// ====================================================================
// HOME — is registered in home.js. This is the "MORE" hub page.
// ====================================================================
export class MenuScene extends Page {
  enter(p) { super.enter(p); this.list = new List({ rowH: 44, top: 66 }); this._rows(); }
  _rows() {
    const s = this.save;
    const unlocked = s.unlockedRealms || ['purgatory'];
    const done = (s.achievements || []).length;
    const relics = (s.relics || []).length;
    const user = AUTH.getCurrentUser();
    const canClaimDaily = !user || (Date.now() - (user.lastDaily || 0) > 24 * 60 * 60 * 1000 - 1000);
    this.rows = [
      { icon: 'map', color: '#8ef0ff', name: 'World Map', desc: 'Pick a sector and a difficulty', scene: 'worldMap', right: `${unlocked.length}/${REALMS.length}` },
      { icon: 'calendar', color: '#4ec53c', name: 'Daily Run', desc: 'One shared map for everyone today', scene: 'dailyRun', right: 'PLAY' },
      { icon: 'crown', color: '#c07aff', name: 'Weekly Trial', desc: 'A rotating hardened challenge', scene: 'weeklyChallenge' },
      { icon: 'gift', color: '#ffc63c', name: 'Daily Rewards', desc: 'Claim a streak bonus every day', scene: 'daily', right: canClaimDaily ? 'READY' : 'CLAIMED', owned: canClaimDaily },
      { icon: 'relic', color: '#ffe066', name: 'Relics', desc: 'Equip one relic for every run', scene: 'relics', right: relics ? `${relics} OWNED` : 'NONE YET' },
      { icon: 'trophy', color: '#ffd24a', name: 'Achievements', desc: 'Career milestones', scene: 'achievements', right: `${done}/${ACHIEVEMENTS.length}` },
      { icon: 'train', color: '#8ef0ff', name: 'Train Base', desc: 'Carriage loadout, skins, records', scene: 'trainBase' },
      { icon: 'star', color: '#ffd24a', name: 'Leaderboards', desc: 'Global boards + season rewards', scene: 'leaderboards' },
      { icon: 'book', color: '#cfd4e0', name: 'Identity', desc: 'Avatars and season frames', scene: 'identity' },
      { icon: 'book', color: '#9aa0b4', name: 'Profile', desc: 'Account and lifetime stats', scene: 'profile' },
      { icon: 'cog', color: '#9aa0b4', name: 'Settings', desc: 'Sound and screen effects', scene: 'settings' },
    ];
    this.list.max = this.rows.length;
  }
  update(dt) {
    const m = super.base(dt);
    if (!m) return;
    this._rows();
    const act = this.feedList(this.list, m);
    // hover
    this.list.hoverIndex = -1;
    for (const [a, b] of [this.list.visibleRange()]) {
      for (let i = a; i <= b; i++) if (this.hit(this.list.rowRect(i))) this.list.hoverIndex = i;
    }
    if (this.list.keyIndex >= 0 && act === -1) act = this.list.keyIndex;
    const go = (i) => {
      const row = this.rows[i];
      if (row?.scene) { try { SOUNDS.pickup(); } catch {} this.engine.setScene(row.scene, { save: this.save }); }
    };
    if (!this.grace(dt)) {
      if (m.justDown) {
        for (let i = 0; i < this.rows.length; i++) if (this.hit(this.list.rowRect(i))) { go(i); m.justDown = false; break; }
      }
      if (this.engine.input?.wasPressed?.('Enter') && act >= 0) go(act);
    }
    if (!m.down) this._press = null;
    m.justDown = false;
  }
  render(ctx) {
    lavaBackground(ctx, this.t, this.embers);
    topBar(ctx, { title: 'MORE', save: this.save, hover: null });
    const [a, b] = this.list.visibleRange();
    for (let i = a; i <= b; i++) {
      const r = this.rows[i];
      itemCard(ctx, {
        ...this.list.rowRect(i), icon: r.icon, iconColor: r.color, name: r.name, desc: r.desc,
        right: r.right, owned: r.owned, hover: this.list.hoverIndex === i, selected: this.list.keyIndex === i,
        appear: this.list.appearOf(i, this.pageT),
      });
    }
    this.list.drawScrollbar(ctx);
    label(ctx, 'Everything on the train lives on this page.', KW / 2, KH - 10, K.SUB, 6);
    drawToast(ctx, this.toast);
  }
}

// ====================================================================
// WORLD MAP — sectors with honest unlock hints
// ====================================================================
export class WorldMapScene extends Page {
  enter(p) {
    super.enter(p);
    const unlocked = this.save.unlockedRealms || ['purgatory'];
    const cur = unlocked[unlocked.length - 1];
    this.diffTab = Math.max(0, DIFFICULTIES.findIndex(d => d.id === (this.engine._difficulty || 'normal')));
    this.list = new List({ rowH: 48, top: 100 });
    this.list.max = REALMS.length;
    const li = REALMS.findIndex(r => r.id === (this.save.lastRealm || cur));
    this.list.keyIndex = li >= 0 ? li : 0;
    this._syncScroll();
  }
  _syncScroll() {
    const ki = this.list.keyIndex;
    if (ki >= 0) {
      const y = ki * (this.list.rowH + this.list.gap);
      if (y < this.list.scroll) this.list.scroll = y;
      if (y + this.list.rowH > this.list.scroll + this.list.viewH) this.list.scroll = y + this.list.rowH - this.list.viewH;
      this.list.scroll = Math.max(0, Math.min(this.list.maxScroll, this.list.scroll));
    }
  }
  update(dt) {
    const m = super.base(dt);
    if (!m) return;
    // difficulty tabs
    if (this.engine.input?.wasPressed?.('ArrowLeft')) { this.diffTab = (this.diffTab + DIFFICULTIES.length - 1) % DIFFICULTIES.length; this.engine._difficulty = DIFFICULTIES[this.diffTab].id; }
    if (this.engine.input?.wasPressed?.('ArrowRight')) { this.diffTab = (this.diffTab + 1) % DIFFICULTIES.length; this.engine._difficulty = DIFFICULTIES[this.diffTab].id; }
    const act = this.feedList(this.list, m);
    this.list.hoverIndex = -1;
    const [a, b] = this.list.visibleRange();
    for (let i = a; i <= b; i++) if (this.hit(this.list.rowRect(i))) this.list.hoverIndex = i;
    const start = (i) => {
      const realm = REALMS[i];
      const unlocked = (this.save.unlockedRealms || ['purgatory']).includes(realm.id);
      if (!unlocked) { this.say('LOCKED — ' + this._hint(i), K.BAD); return; }
      this.save.lastRealm = realm.id;
      saveSave(this.save);
      try { SOUNDS.depart?.(); } catch {}
      this.engine.setScene('gameplay', {
        save: this.save, realmId: realm.id, stage: 1,
        difficulty: DIFFICULTIES[this.diffTab].id,
      });
    };
    if (!this.grace(dt)) {
      if (m.justDown) {
        const tabY = 40;
        if (m.y >= tabY && m.y <= tabY + 24) {
          for (let i = 0; i < DIFFICULTIES.length; i++) {
            const w = Math.floor((KW - 16 - 3 * 2) / 4);
            const x = 8 + (i % 4) * (w + 2), y = tabY + (i >= 4 ? 26 : 0);
            if (m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + 24) {
              this.diffTab = i; this.engine._difficulty = DIFFICULTIES[i].id;
              m.justDown = false; return;
            }
          }
        }
        for (let i = a; i <= b; i++) if (this.hit(this.list.rowRect(i))) { start(i); m.justDown = false; break; }
      }
      if (this.engine.input?.wasPressed?.('Enter')) {
        start(act >= 0 ? act : Math.max(0, this.list.keyIndex));
      }
    }
    if (!m.down) this._press = null;
    m.justDown = false;
  }
  _hint(i) {
    if (i === 0) return 'ALREADY OPEN';
    return 'DEFEAT ' + REALMS[i - 1].boss.name.toUpperCase();
  }
  render(ctx) {
    lavaBackground(ctx, this.t, this.embers);
    topBar(ctx, { title: 'WORLD MAP', save: this.save, hover: null });
    // difficulty tabs (2 rows of 4)
    const w = Math.floor((KW - 16 - 3 * 2) / 4);
    DIFFICULTIES.forEach((d, i) => {
      const x = 8 + (i % 4) * (w + 2), y = 40 + (i >= 4 ? 26 : 0);
      const active = i === this.diffTab;
      tile(ctx, x, y, w, 24, 8, {
        fill: active ? K.PANEL_ACT : '#241a2e', fillLo: K.PANEL_LO,
        ring: active ? K.GOLD : null, ringW: 2, lift: active ? 3 : 1,
      });
      label(ctx, d.name.toUpperCase(), x + w / 2, y + 16, active ? K.GOLD : K.SUB, w > 60 ? 7 : 6);
    });
    const unlocked = this.save.unlockedRealms || ['purgatory'];
    const diff = DIFFICULTIES[this.diffTab];
    label(ctx, `foes x${diff.enemyHp} health · x${diff.enemyDmg} damage · x${diff.lootMult} coins`, KW / 2, 80, K.SUB, 6);
    if (diff.rule && diff.rule.id !== 'none') {
      label(ctx, `RULE — ${diff.rule.name}: ${diff.rule.desc}`, KW / 2, 91, K.GOLD, 6);
    } else {
      label(ctx, 'RULE — none. the honest line.', KW / 2, 91, K.DIM, 6);
    }
    const [a, b] = this.list.visibleRange();
    for (let i = a; i <= b; i++) {
      const realm = REALMS[i];
      const isOpen = unlocked.includes(realm.id);
      const cores = this.save.bossCores?.[realm.boss.id] || 0;
      itemCard(ctx, {
        ...this.list.rowRect(i), h: 48,
        icon: 'map', iconColor: realm.accent, accent: realm.accent,
        name: `${i + 1}. ${realm.name}`,
        desc: isOpen ? realm.desc : this._hint(i),
        right: isOpen ? (cores ? `CLEARED x${cores}` : 'READY') : 'LOCKED',
        owned: isOpen, locked: !isOpen,
        hover: this.list.hoverIndex === i, selected: this.list.keyIndex === i,
        appear: this.list.appearOf(i, this.pageT),
      });
    }
    this.list.drawScrollbar(ctx);
    drawToast(ctx, this.toast);
  }
}

// ====================================================================
// ARSENAL — every weapon, its mastery track and its evolutions
// ====================================================================
export class ArsenalScene extends Page {
  enter(p) {
    super.enter(p);
    this.list = new List({ rowH: 48, top: 64, bottom: KH - 118 });
    this.list.max = WEAPONS.length;
    this.sel = 0;
  }
  _famKills(fam) { return this.save.familyKills?.[fam] || 0; }
  update(dt) {
    const m = super.base(dt);
    if (!m) return;
    const act = this.feedList(this.list, m);
    this.list.hoverIndex = -1;
    const [a, b] = this.list.visibleRange();
    for (let i = a; i <= b; i++) if (this.hit(this.list.rowRect(i))) { this.list.hoverIndex = i; this.sel = i; }
    if (act >= 0) this.sel = act;
    if (!m.down) this._press = null;
    m.justDown = false;
  }
  render(ctx) {
    lavaBackground(ctx, this.t, this.embers);
    topBar(ctx, { title: 'ARSENAL', save: this.save, hover: null });
    label(ctx, 'Carry up to 4 weapons per run. Mastery grows as you defeat foes.', KW / 2, 56, K.SUB, 6);
    const [a, b] = this.list.visibleRange();
    for (let i = a; i <= b; i++) {
      const w = WEAPONS[i];
      const kills = this._famKills(w.family);
      itemCard(ctx, {
        ...this.list.rowRect(i), h: 48,
        icon: w.icon || 'star', iconColor: w.color, accent: w.color,
        name: w.name, tag: familyName(w.family).toUpperCase(),
        desc: `DMG ${Math.round(w.dmg)} · every ${(w.cd || 1).toFixed(2)}s · ${w.desc}`,
        right: (() => { const cur = nextMilestone(kills) ? nextMilestone(kills).level - 1 : 5; return cur > 0 ? 'M' + cur : 'NEW'; })(),
        rightColor: K.BLUE,
        hover: this.list.hoverIndex === i, selected: this.list.keyIndex === i || this.sel === i,
        appear: this.list.appearOf(i, this.pageT),
      });
    }
    this.list.drawScrollbar(ctx);
    // detail panel: mastery + evolutions
    const sel = WEAPONS[this.sel];
    if (sel) {
      const y = KH - 112;
      tile(ctx, 8, y, KW - 16, 100, 10, { fill: '#20182c', fillLo: '#140e1e', outline: sel.color, ring: sel.color, ringW: 1, lift: 3 });
      label(ctx, sel.name.toUpperCase(), 16, y + 16, sel.color, 9, 'left');
      const kills = this._famKills(sel.family);
      label(ctx, masteryLabel(kills), KW - 16, y + 16, K.BLUE, 7, 'right');
      const nm = nextMilestone(kills);
      if (nm) {
        // mastery progress bar
        const bx = 16, by = y + 24, bw = KW - 32;
        ctx.fillStyle = '#00000088'; ctx.fillRect(bx - 1, by - 1, bw + 2, 7);
        ctx.fillStyle = '#241a2e'; ctx.fillRect(bx, by, bw, 5);
        ctx.fillStyle = K.BLUE; ctx.fillRect(bx, by, Math.round(bw * Math.min(1, nm.have / nm.need)), 5);
        label(ctx, `NEXT: MASTERY ${'12345'[nm.level - 1]} at ${nm.need} defeats — +${Math.round([4, 8, 12, 17, 22][nm.level - 1] * 100)}% ${familyName(sel.family)} damage`, bx, by + 16, K.SUB, 6, 'left');
      } else {
        label(ctx, 'MASTERY COMPLETE — full bonus earned', 16, y + 40, K.OK, 6, 'left');
      }
      const evos = (sel.evolutions || []).map(e => e.name);
      label(ctx, evos.length ? `LEVEL-5 EVOLUTION${evos.length > 1 ? 'S' : ''}: ${evos.join(' or ')}` : 'No evolution — pure and simple.', 16, y + 58, K.SUB, 6, 'left');
      label(ctx, 'Mastery bonuses carry into the evolved form.', 16, y + 72, K.DIM, 6, 'left');
    }
    drawToast(ctx, this.toast);
  }
}

// ====================================================================
// ARMOURY — armour sets + conductor skins (buy & equip)
// ====================================================================
export class ArmouryScene extends Page {
  enter(p) {
    super.enter(p);
    if (!this.save.activeArmour) this.save.activeArmour = (this.save.armour || ['guardian'])[0];
    this.list = new List({ rowH: 44, top: 64, bottom: KH - 160 });
    this.list.max = ARMOURS.length + CHAR_SKINS.length;
  }
  _armourOwned(a) { return (this.save.armour || []).includes(a.id); }
  _skinOwned(sk) { return (this.save.ownedCharSkins || []).includes(sk.id) || sk.cost === 0; }
  update(dt) {
    const m = super.base(dt);
    if (!m) return;
    const act = this.feedList(this.list, m);
    this.list.hoverIndex = -1;
    const [a, b] = this.list.visibleRange();
    for (let i = a; i <= b; i++) if (this.hit(this.list.rowRect(i))) this.list.hoverIndex = i;
    const use = (i) => {
      if (i < ARMOURS.length) {
        const a = ARMOURS[i];
        if (!this._armourOwned(a)) return this.say('LOCKED SET', K.BAD);
        this.save.activeArmour = a.id; saveSave(this.save);
        this.say('WEARING ' + a.name.toUpperCase(), K.OK);
      } else {
        const sk = CHAR_SKINS[i - ARMOURS.length];
        if (this._skinOwned(sk)) {
          this.save.charSkin = sk.id; saveSave(this.save);
          this.say('WEARING ' + sk.name.toUpperCase(), K.OK);
        } else {
          if (!spendCoins(this.save, sk.cost)) return this.say('NOT ENOUGH COINS', K.BAD);
          this.save.ownedCharSkins = [...(this.save.ownedCharSkins || []), sk.id];
          this.save.charSkin = sk.id; saveSave(this.save);
          try { SOUNDS.chest(); } catch {}
          this.say(sk.name.toUpperCase() + ' UNLOCKED', K.GOLD);
        }
      }
    };
    if (!this.grace(dt)) {
      if (m.justDown) for (let i = a; i <= b; i++) if (this.hit(this.list.rowRect(i))) { use(i); m.justDown = false; break; }
      if (this.engine.input?.wasPressed?.('Enter') && act >= 0) use(act);
    }
    if (!m.down) this._press = null;
    m.justDown = false;
  }
  render(ctx) {
    lavaBackground(ctx, this.t, this.embers);
    topBar(ctx, { title: 'ARMOURY', save: this.save, hover: null });
    sectionLabel(ctx, 'ARMOUR — WORN ON EVERY RUN', 56);
    const [a, b] = this.list.visibleRange();
    for (let i = a; i <= b; i++) {
      const r = this.list.rowRect(i);
      if (i < ARMOURS.length) {
        const ar = ARMOURS[i];
        itemCard(ctx, {
          ...r, icon: 'shield', iconColor: '#8ef0ff',
          name: ar.name, desc: ar.desc,
          equipped: this.save.activeArmour === ar.id, owned: this._armourOwned(ar), locked: !this._armourOwned(ar),
          hover: this.list.hoverIndex === i, selected: this.list.keyIndex === i,
          appear: this.list.appearOf(i, this.pageT),
        });
      } else {
        const sk = CHAR_SKINS[i - ARMOURS.length];
        itemCard(ctx, {
          ...r, icon: 'ghost', iconColor: '#ffb4e4',
          name: sk.name, desc: sk.desc,
          equipped: this.save.charSkin === sk.id,
          owned: this._skinOwned(sk), cost: this._skinOwned(sk) ? undefined : sk.cost,
          costOk: (this.save.coins || 0) >= (sk.cost || 0),
          hover: this.list.hoverIndex === i, selected: this.list.keyIndex === i,
          appear: this.list.appearOf(i, this.pageT),
        });
      }
    }
    this.list.drawScrollbar(ctx);
    sectionLabel(ctx, 'CONDUCTOR OUTFITS', KH - 148);
    label(ctx, 'Tap an outfit to buy or wear it. Armour changes your stats each run.', 10, KH - 130, K.DIM, 6, 'left');
    drawToast(ctx, this.toast);
  }
}

// ====================================================================
// RELICS — one relic travels with every run
// ====================================================================
export class RelicsScene extends Page {
  enter(p) { super.enter(p); this.list = new List({ rowH: 46, top: 66 }); this.list.max = RELICS.length; }
  update(dt) {
    const m = super.base(dt);
    if (!m) return;
    const act = this.feedList(this.list, m);
    this.list.hoverIndex = -1;
    const [a, b] = this.list.visibleRange();
    for (let i = a; i <= b; i++) if (this.hit(this.list.rowRect(i))) this.list.hoverIndex = i;
    const toggle = (i) => {
      const r = RELICS[i];
      if (!(this.save.relics || []).includes(r.id)) {
        const src = relicSource(r.id);
        return this.say('LOCKED — ' + (src ? 'DEFEAT ' + src.name.toUpperCase() : 'CLEAR REALMS'), K.BAD);
      }
      this.save.activeRelic = this.save.activeRelic === r.id ? null : r.id;
      saveSave(this.save);
      this.say(this.save.activeRelic ? r.name.toUpperCase() + ' EQUIPPED' : 'RELIC UNEQUIPPED', K.GOLD);
    };
    if (!this.grace(dt)) {
      if (m.justDown) for (let i = a; i <= b; i++) if (this.hit(this.list.rowRect(i))) { toggle(i); m.justDown = false; break; }
      if (this.engine.input?.wasPressed?.('Enter') && act >= 0) toggle(act);
    }
    if (!m.down) this._press = null;
    m.justDown = false;
  }
  render(ctx) {
    lavaBackground(ctx, this.t, this.embers);
    topBar(ctx, { title: 'RELICS', save: this.save, hover: null });
    const act = RELICS.find(r => r.id === this.save.activeRelic);
    label(ctx, act ? 'TRAVELLING WITH YOU: ' + act.name.toUpperCase() : 'NO RELIC EQUIPPED — tap an owned relic to equip it', KW / 2, 58, act ? K.GOLD : K.DIM, 6);
    const [a, b] = this.list.visibleRange();
    for (let i = a; i <= b; i++) {
      const r = RELICS[i];
      const owned = (this.save.relics || []).includes(r.id);
      const src = relicSource(r.id);
      itemCard(ctx, {
        ...this.list.rowRect(i), h: 46,
        icon: 'relic', iconColor: '#ffe066',
        name: r.name, desc: r.desc,
        equipped: this.save.activeRelic === r.id,
        owned, locked: !owned,
        right: owned ? undefined : 'LOCKED',
        hover: this.list.hoverIndex === i, selected: this.list.keyIndex === i,
        appear: this.list.appearOf(i, this.pageT),
      });
    }
    this.list.drawScrollbar(ctx);
    drawToast(ctx, this.toast);
  }
}

// ====================================================================
// TRAIN BASE — stats / skins / carriage loadout
// ====================================================================
export class TrainBaseScene extends Page {
  enter(p) {
    super.enter(p);
    this.tab = 0;
    this.list = new List({ rowH: 46, top: 66 });
  }
  _rows() {
    if (this.tab === 1) return TRAIN_SKINS;
    if (this.tab === 2) return TRAIN_CARRIAGE_MODULES;
    return [];
  }
  update(dt) {
    const m = super.base(dt);
    if (!m) return;
    const tabs = ['RECORD', 'ENGINES', 'CARRIAGES'];
    for (let i = 0; i < 3; i++) {
      const r = { x: 8 + i * 86, y: 38, w: 80, h: 24 };
      if (this.hit(r) && !this.grace(0)) { this.tab = i; this.list.keyIndex = 0; this.list.scroll = 0; m.justDown = false; }
    }
    if (this.engine.input?.wasPressed?.('Tab')) { this.tab = (this.tab + 1) % 3; this.list.keyIndex = 0; }
    this.list.max = this._rows().length;
    const act = this.feedList(this.list, m);
    this.list.hoverIndex = -1;
    if (this.tab > 0) {
      const [a, b] = this.list.visibleRange();
      for (let i = a; i <= b; i++) if (this.hit(this.list.rowRect(i))) this.list.hoverIndex = i;
      const use = (i) => {
        if (this.tab === 1) {
          const sk = TRAIN_SKINS[i];
          const owned = (this.save.ownedTrainSkins || []).includes(sk.id) || sk.cost === 0;
          if (owned) {
            this.save.trainSkin = sk.id; saveSave(this.save);
            this.say(sk.name.toUpperCase() + ' ROLLING', K.OK);
          } else if (spendCoins(this.save, sk.cost)) {
            this.save.ownedTrainSkins = [...(this.save.ownedTrainSkins || []), sk.id];
            this.save.trainSkin = sk.id; saveSave(this.save);
            try { SOUNDS.chest(); } catch {}
            this.say(sk.name.toUpperCase() + ' UNLOCKED', K.GOLD);
          } else this.say('NOT ENOUGH COINS', K.BAD);
        } else {
          const load = this.save.trainCarriages || (this.save.trainCarriages = []);
          const mod = TRAIN_CARRIAGE_MODULES[i];
          const at = load.indexOf(mod.id);
          if (at >= 0) { if (load.length > 1) load.splice(at, 1); }
          else { load.push(mod.id); if (load.length > 2) load.shift(); }
          saveSave(this.save);
        }
      };
      if (!this.grace(dt)) {
        if (m.justDown) for (let i = a; i <= b; i++) if (this.hit(this.list.rowRect(i))) { use(i); m.justDown = false; break; }
        if (this.engine.input?.wasPressed?.('Enter') && act >= 0) use(act);
      }
    }
    if (!m.down) this._press = null;
    m.justDown = false;
  }
  render(ctx) {
    lavaBackground(ctx, this.t, this.embers);
    topBar(ctx, { title: 'TRAIN BASE', save: this.save, hover: null });
    const tabs = ['RECORD', 'ENGINES', 'CARRIAGES'];
    tabs.forEach((lb, i) => {
      const r = { x: 8 + i * 86, y: 38, w: 80, h: 24 };
      const active = this.tab === i;
      tile(ctx, r.x, r.y, r.w, r.h, 8, {
        fill: active ? K.PANEL_ACT : '#241a2e', fillLo: K.PANEL_LO,
        ring: active ? K.GOLD : null, ringW: 2, lift: active ? 3 : 1,
      });
      label(ctx, lb, r.x + r.w / 2, r.y + 16, active ? K.GOLD : K.SUB, 7);
    });
    if (this.tab === 0) {
      const s = this.save.stats || {};
      const rows = [
        ['ENGINE', (this.save.trainSkin === 'iron_horse' ? 'Iron Horse' : (TRAIN_SKINS.find(t => t.id === this.save.trainSkin)?.name || 'Iron Horse'))],
        ['SECTORS CLEARED', String(Object.values(this.save.bossCores || {}).reduce((a, b) => a + b, 0))],
        ['LONGEST RUN', fmtTime(s.longestRun || 0)],
        ['TOTAL DEFEATS', fmtNum(s.totalKills || 0)],
        ['RUNS', String(s.totalRuns || 0)],
        ['BEST COMBO', 'x' + (s.bestCombo || 0)],
        ['COINS EARNED', fmtNum(s.totalCoins || 0)],
      ];
      rows.forEach(([k2, v], i) => {
        const y = 70 + i * 40;
        const appear = Math.max(0, Math.min(1, (this.pageT - i * 0.05) * 3.4));
        if (appear <= 0) return;
        ctx.globalAlpha = appear;
        tile(ctx, 8, y, KW - 16, 34, 9, { fill: K.PANEL, fillLo: K.PANEL_LO, outline: K.INK, lift: 2 });
        label(ctx, k2, 16, y + 15, K.DIM, 6, 'left');
        label(ctx, v, 16, y + 27, K.TXT, 8, 'left');
        ctx.globalAlpha = 1;
      });
      label(ctx, 'Carriages are set on the CARRIAGES tab — they shape every run.', KW / 2, KH - 12, K.DIM, 6);
    } else if (this.tab === 1) {
      const [a, b] = this.list.visibleRange();
      for (let i = a; i <= b; i++) {
        const sk = TRAIN_SKINS[i];
        const owned = (this.save.ownedTrainSkins || []).includes(sk.id) || sk.cost === 0;
        itemCard(ctx, {
          ...this.list.rowRect(i), icon: 'train', iconColor: '#8ef0ff',
          name: sk.name, desc: sk.desc || 'A engine for the long haul.',
          equipped: this.save.trainSkin === sk.id, owned,
          cost: owned ? undefined : sk.cost, costOk: (this.save.coins || 0) >= (sk.cost || 0),
          hover: this.list.hoverIndex === i, selected: this.list.keyIndex === i,
          appear: this.list.appearOf(i, this.pageT),
        });
      }
      this.list.drawScrollbar(ctx);
      label(ctx, 'Tap to buy or switch the engine. Look changes, stats stay fair.', KW / 2, KH - 12, K.DIM, 6);
    } else {
      const load = this.save.trainCarriages || [];
      label(ctx, `PICK 2 — NOW: ${load.length ? load.map(id => (TRAIN_CARRIAGE_MODULES.find(x => x.id === id)?.name || id)).join(' + ') : 'NONE'}`, KW / 2, 58, load.length ? K.GOLD : K.BAD, 7);
      const [a, b] = this.list.visibleRange();
      for (let i = a; i <= b; i++) {
        const mod = TRAIN_CARRIAGE_MODULES[i];
        itemCard(ctx, {
          ...this.list.rowRect(i), icon: mod.icon || 'gear', iconColor: load.includes(mod.id) ? K.OK : '#ffb4e4',
          name: mod.name, desc: mod.desc,
          equipped: load.includes(mod.id), right: load.includes(mod.id) ? 'SLOT ' + (load.indexOf(mod.id) + 1) : 'TAP TO ADD',
          hover: this.list.hoverIndex === i, selected: this.list.keyIndex === i,
          appear: this.list.appearOf(i, this.pageT),
        });
      }
      this.list.drawScrollbar(ctx);
    }
    drawToast(ctx, this.toast);
  }
}

// ====================================================================
// DAILY REWARDS — streak calendar + chests with printed contents
// ====================================================================
const CHEST_CONTENTS = {
  common: '100 COINS',
  rare: '300 COINS + 5 SHARDS',
  epic: '800 COINS + 20 SHARDS',
};
export class DailyRewardsScene extends Page {
  enter(p) { super.enter(p); this.error = ''; }
  update(dt) {
    const m = super.base(dt);
    if (!m) return;
    if (!this.grace(dt) && m.justDown) {
      if (this.hit({ x: KW / 2 - 70, y: 306, w: 140, h: 30 })) {
        const res = AUTH.claimDaily();
        if (res.ok) {
          this.save.dailyStreak = res.streak || ((this.save.dailyStreak || 0) + 1);
          this.save.coins = (this.save.coins || 0) + res.reward.coins;
          this.save.shards = (this.save.shards || 0) + res.reward.gems;
          if (res.reward.chest) {
            this.save.chests = this.save.chests || { common: 0, rare: 0, epic: 0 };
            this.save.chests.rare = (this.save.chests.rare || 0) + 1;
          }
          saveSave(this.save);
          try { SOUNDS.chest(); } catch {}
          this.say('CLAIMED — COME BACK TOMORROW', K.OK);
        } else this.say((res.error || 'ALREADY CLAIMED').toUpperCase(), K.BAD);
        m.justDown = false;
      }
      const types = ['common', 'rare', 'epic'];
      types.forEach((tp, i) => {
        const x = 8 + i * 86;
        if (this.hit({ x, y: 372, w: 80, h: 64 })) { this._open(tp); m.justDown = false; }
      });
    }
    if (!m.down) this._press = null;
    m.justDown = false;
  }
  _open(type) {
    const chests = this.save.chests || (this.save.chests = { common: 0, rare: 0, epic: 0 });
    if ((chests[type] || 0) <= 0) return this.say('NO ' + type.toUpperCase() + ' CHEST — EARN THEM FROM ELITES', K.BAD);
    chests[type]--;
    const rewards = { common: { coins: 100, shards: 0 }, rare: { coins: 300, shards: 5 }, epic: { coins: 800, shards: 20 } };
    const rw = rewards[type];
    this.save.coins += rw.coins; this.save.shards += rw.shards;
    saveSave(this.save);
    try { SOUNDS.chest(); } catch {}
    this.say('+' + rw.coins + ' COINS' + (rw.shards ? ' +' + rw.shards + ' SHARDS' : ''), K.OK);
  }
  render(ctx) {
    lavaBackground(ctx, this.t, this.embers);
    topBar(ctx, { title: 'DAILY REWARDS', save: this.save, hover: null });
    const user = AUTH.getCurrentUser();
    const streak = user?.streak || this.save.dailyStreak || 0;
    tile(ctx, 8, 38, KW - 16, 26, 9, { fill: '#20182c', fillLo: '#140e1e', outline: K.INK, ring: K.GOLD, ringW: 1, lift: 2 });
    label(ctx, 'STREAK: ' + streak + ' DAY' + (streak === 1 ? '' : 'S'), 16, 55, K.GOLD, 8, 'left');
    label(ctx, 'Day 7 pays a bonus chest', KW - 16, 55, K.SUB, 6, 'right');
    // 7-day calendar — every reward printed up front
    for (let i = 0; i < 7; i++) {
      const x = 8 + i * 36, y = 74, w = 32, h = 56;
      const isToday = i === (streak % 7);
      const claimed = i < (streak % 7);
      tile(ctx, x, y, w, h, 8, {
        fill: claimed ? '#20352a' : isToday ? '#3a2a5a' : K.PANEL, fillLo: K.PANEL_LO,
        outline: claimed ? K.GREEN_D : isToday ? K.GOLD : K.INK, ring: isToday ? K.GOLD : null, ringW: 2, lift: 2,
      });
      label(ctx, 'DAY ' + (i + 1), x + w / 2, y + 11, K.GOLD, 5);
      glyph(ctx, i === 6 ? 'chest' : 'coin', x + 8, y + 16, 16, claimed ? '#4a5a4a' : K.GOLD);
      const amt = 100 + i * 25;
      label(ctx, i === 6 ? amt + '+CHEST' : String(amt), x + w / 2, y + 44, claimed ? '#4a5a4a' : K.TXT, 5);
      if (claimed) label(ctx, 'DONE', x + w / 2, y + 52, K.OK, 5);
    }
    // claim
    const canClaim = !user || (Date.now() - (user.lastDaily || 0) > 24 * 60 * 60 * 1000 - 1000);
    const cb = { x: KW / 2 - 70, y: 306, w: 140, h: 30 };
    const hovC = this.hit(cb);
    button(ctx, cb, canClaim ? 'CLAIM TODAY' : 'CLAIMED — TOMORROW', {
      color: canClaim ? K.GOLD : '#4a3a52', hover: hovC, disabled: !canClaim, size: 9,
    });
    // chests — fixed contents on every card
    const chests = this.save.chests || { common: 0, rare: 0, epic: 0 };
    const info = [
      { id: 'common', name: 'IRON CHEST', color: '#9aa0b4' },
      { id: 'rare', name: 'SOUL CHEST', color: '#5a8aff' },
      { id: 'epic', name: 'KING CHEST', color: '#ff5a3a' },
    ];
    info.forEach((ch, i) => {
      const x = 8 + i * 86, y = 372, w = 80, h = 64;
      const hov = this.hit({ x, y, w, h });
      tile(ctx, x, y, w, h, 10, {
        fill: hov ? '#3a2a5a' : K.PANEL, fillLo: K.PANEL_LO, outline: K.INK,
        ring: hov ? ch.color : null, ringW: 2, lift: hov ? 4 : 2,
      });
      glyph(ctx, 'chest', x + w / 2 - 14, y + 6, 28, ch.color);
      label(ctx, 'x' + (chests[ch.id] || 0), x + w - 10, y + 16, K.TXT, 9, 'right');
      label(ctx, ch.name, x + w / 2, y + 44, ch.color, 6);
      label(ctx, CHEST_CONTENTS[ch.id], x + w / 2, y + 56, K.SUB, 5);
    });
    label(ctx, 'Chests come from elite foes and boss fights. What you see is what you get.', KW / 2, KH - 10, K.DIM, 5);
    drawToast(ctx, this.toast);
  }
}

// ====================================================================
// ACHIEVEMENTS
// ====================================================================
export class AchievementsScene extends Page {
  enter(p) { super.enter(p); this.list = new List({ rowH: 44, top: 64 }); this.list.max = ACHIEVEMENTS.length; }
  update(dt) {
    const m = super.base(dt);
    if (!m) return;
    this.feedList(this.list, m);
    this.list.hoverIndex = -1;
    const [a, b] = this.list.visibleRange();
    for (let i = a; i <= b; i++) if (this.hit(this.list.rowRect(i))) this.list.hoverIndex = i;
    if (!m.down) this._press = null;
    m.justDown = false;
  }
  render(ctx) {
    lavaBackground(ctx, this.t, this.embers);
    topBar(ctx, { title: 'ACHIEVEMENTS', save: this.save, hover: null });
    const done = (this.save.achievements || []).length;
    label(ctx, done + ' of ' + ACHIEVEMENTS.length + ' earned', KW / 2, 56, K.SUB, 7);
    const [a, b] = this.list.visibleRange();
    for (let i = a; i <= b; i++) {
      const ach = ACHIEVEMENTS[i];
      const got = (this.save.achievements || []).includes(ach.id);
      itemCard(ctx, {
        ...this.list.rowRect(i), icon: got ? 'trophy' : 'lock', iconColor: got ? K.GOLD : K.FAINT,
        name: ach.name, desc: ach.desc,
        right: got ? 'PAID ' + (ach.reward || 0) + '\u25c6' : 'PAYS ' + (ach.reward || 0) + '\u25c6',
        rightColor: got ? K.GOLD : '#8ef0ff',
        owned: got, locked: !got,
        hover: this.list.hoverIndex === i, selected: this.list.keyIndex === i,
        appear: this.list.appearOf(i, this.pageT),
      });
    }
    this.list.drawScrollbar(ctx);
    drawToast(ctx, this.toast);
  }
}

// ====================================================================
// LEADERBOARD
// ====================================================================
export class LeaderboardScene extends Page {
  enter(p) {
    super.enter(p);
    this.realmIdx = Math.max(0, REALMS.findIndex(r => r.id === (this.save.lastRealm || 'purgatory')));
    this.diffIdx = Math.max(0, DIFFICULTIES.findIndex(d => d.id === (this.engine._difficulty || 'normal')));
    this.period = monthKey();
    this.rows = [];
    this.boardState = 'loading';
    this.seasonOpen = false;
    this.seasonRows = [];
    this.list = new List({ rowH: 26, top: 196, bottom: KH - 46 });
    this.list.max = 100;
    this._fetch();
    this._fetchSeason();
  }
  get _boardKey() { return [REALMS[this.realmIdx].id, DIFFICULTIES[this.diffIdx].id, this.period].join('|'); }
  _fetch() {
    this.boardState = 'loading'; this.rows = [];
    const sb = this.engine.supabase;
    if (!sb?.isAvailable?.()) { this.boardState = 'offline'; return; }
    sb.topBoard(REALMS[this.realmIdx].id, DIFFICULTIES[this.diffIdx].id, this.period, 100)
      .then((rows) => { this.rows = rows || []; this.boardState = 'ready'; })
      .catch(() => { this.boardState = 'offline'; });
  }
  _fetchSeason() {
    const sb = this.engine.supabase;
    if (!sb?.isAvailable?.()) return;
    sb.topMonthly(monthKey(), 3).then((r) => { this.seasonRows = r || []; }).catch(() => {});
  }
  _cycleRealm(d) {
    this.realmIdx = (this.realmIdx + d + REALMS.length) % REALMS.length;
    this._fetch();
  }
  _setDiff(i) { this.diffIdx = i; this._fetch(); }
  update(dt) {
    const m = super.base(dt);
    if (!m) return;
    this.feedList(this.list, m);
    if (!this.grace(dt) && m.justDown) {
      // difficulty pills (2 rows of 3)
      const dw = Math.floor((KW - 16 - 2 * 3) / 3);
      for (let i = 0; i < DIFFICULTIES.length; i++) {
        const x = 8 + (i % 3) * (dw + 3), y = 62 + Math.floor(i / 3) * 22;
        if (this.hit({ x, y, w: dw, h: 18 })) { this._setDiff(i); m.justDown = false; return; }
      }
      // realm arrows
      if (this.hit({ x: 8, y: 110, w: 26, h: 20 })) { this._cycleRealm(-1); m.justDown = false; return; }
      if (this.hit({ x: KW - 34, y: 110, w: 26, h: 20 })) { this._cycleRealm(1); m.justDown = false; return; }
      // season toggle
      if (this.hit({ x: 8, y: 138, w: KW - 16, h: 20 })) { this.seasonOpen = !this.seasonOpen; m.justDown = false; return; }
      // hall-of-fame tap re-fetches nothing; keep
    }
    if (!m.down) this._press = null;
    m.justDown = false;
  }
  render(ctx) {
    lavaBackground(ctx, this.t, this.embers);
    topBar(ctx, { title: 'LEADERBOARDS', save: this.save, hover: null });
    const diff = DIFFICULTIES[this.diffIdx];
    // ---- local strip ----
    const locals = (this.save.localScores || []).slice(0, 3);
    label(ctx, 'THIS DEVICE', 10, 54, K.DIM, 6, 'left');
    locals.forEach((r, i) => {
      const x = 96 + i * 58;
      label(ctx, fmtNum(r.score || 0), x, 54, K.GOLD, 6, 'left');
      label(ctx, (r.realm || '').slice(0, 6).toUpperCase() + ' ST' + r.stage, x, 61, K.DIM, 5, 'left');
    });
    // ---- difficulty pills ----
    const dw = Math.floor((KW - 16 - 2 * 3) / 3);
    DIFFICULTIES.forEach((d, i) => {
      const x = 8 + (i % 3) * (dw + 3), y = 62 + Math.floor(i / 3) * 22;
      const active = i === this.diffIdx;
      tile(ctx, x, y, dw, 18, 6, { fill: active ? K.PANEL_ACT : '#241a2e', fillLo: K.PANEL_LO, ring: active ? K.GOLD : null, ringW: active ? 2 : 0, lift: active ? 2 : 0 });
      label(ctx, d.name.toUpperCase(), x + dw / 2, y + 12, active ? K.GOLD : K.SUB, 6);
    });
    // ---- realm selector ----
    tile(ctx, 8, 110, KW - 16, 20, 6, { fill: '#241a2e', fillLo: K.PANEL_LO, outline: K.INK });
    label(ctx, '<', 21, 124, K.SUB, 8);
    label(ctx, '>', KW - 21, 124, K.SUB, 8);
    label(ctx, REALMS[this.realmIdx].name.toUpperCase(), KW / 2, 124, REALMS[this.realmIdx].accent, 7);
    label(ctx, 'GLOBAL · ' + monthLabel(this.period) + ' · resets monthly', KW / 2, 138 + 0, K.SUB, 6);
    // ---- season strip ----
    const seasonY = 148;
    tile(ctx, 8, seasonY, KW - 16, 20, 6, { fill: '#241a2e', fillLo: K.PANEL_LO, outline: K.INK, ring: this.seasonOpen ? K.GOLD : null, ringW: this.seasonOpen ? 1 : 0 });
    label(ctx, this.seasonOpen ? 'SEASON REWARDS ▲' : 'SEASON REWARDS ▼ — exact payouts, top 50 paid', KW / 2, seasonY + 13, K.GOLD, 6);
    if (this.seasonOpen) {
      const sy = seasonY + 24;
      tile(ctx, 8, sy, KW - 16, 104, 8, { fill: '#1c1428', fillLo: '#120c1c', outline: K.GOLD, ringW: 1 });
      SEASON_TIERS.forEach((t, i) => {
        const y = sy + 12 + i * 13;
        const range = i === 0 ? '#1' : i <= 2 ? '#' + (SEASON_TIERS[i - 1].max + 1) + '-' + t.max : (SEASON_TIERS[i - 1].max + 1) + '-' + t.max;
        label(ctx, range, 16, y, K.SUB, 6, 'left');
        label(ctx, t.name, 44, y, t.max <= 3 ? K.GOLD : t.max <= 10 ? '#8ef0ff' : '#c07aff', 6, 'left');
        label(ctx, t.avatar ? 'avatar' + (t.frame ? '+frame' : '') + ' · ' : '', 150, y, K.TXT, 5, 'left');
        label(ctx, t.shards + '◆ ' + t.coins + '©', KW - 16, y, '#ffe878', 6, 'right');
      });
      if (this.seasonRows.length) {
        label(ctx, 'LAST MONTH\'S PODIUM: ' + this.seasonRows.map((r, i) => '#' + (i + 1) + ' ' + String(r.name).slice(0, 8)).join('  '), KW / 2, sy + 96, K.DIM, 5);
      }
      this.list = this.list || new List({ rowH: 26, top: 296, bottom: KH - 46 });
      this.list.top = 296;
    } else {
      this.list && (this.list.top = 196);
    }
    // ---- board ----
    sectionLabel(ctx, REALMS[this.realmIdx].name.toUpperCase() + ' · ' + diff.name.toUpperCase(), this.list.top - 14);
    const [a, b] = this.list.visibleRange();
    if (this.boardState === 'loading') label(ctx, 'Reaching the network…', KW / 2, this.list.top + 30, K.DIM, 7);
    else if (this.boardState === 'offline') label(ctx, 'OFFLINE — the global board needs the network. Local runs still record.', KW / 2, this.list.top + 30, K.DIM, 6);
    else if (!this.rows.length) label(ctx, 'No conductors here yet this month. Be the first.', KW / 2, this.list.top + 30, K.DIM, 6);
    for (let i = a; i <= Math.min(b, this.rows.length - 1); i++) {
      const r = this.rows[i];
      const rr = this.list.rowRect(i);
      const mine = r.player_id === this.save.playerId;
      const medal = i === 0 ? '#ffd24a' : i === 1 ? '#d8dce8' : i === 2 ? '#ff9033' : K.SUB;
      itemCard(ctx, {
        ...rr, h: 24, icon: mine ? 'star' : 'ghost', iconColor: medal,
        name: (i + 1) + '. ' + String(r.name || 'CONDUCTOR').slice(0, 18),
        desc: 'ST' + (r.stage || 1) + ' · ' + (r.kills || 0) + ' KOs',
        right: fmtNum(r.score || 0), rightColor: mine ? K.GOLD : K.TXT,
        selected: mine, appear: 1,
      });
    }
    this.list.drawScrollbar(ctx);
    // my standing on this board
    const myRank = (this.save.myBoards || {})[this._boardKey];
    if (myRank) label(ctx, 'YOU: #' + (myRank > 100 ? '100+' : myRank) + ' on this board', KW / 2, KH - 24, K.GOLD, 7);
    drawToast(ctx, this.toast);
  }
}

export class DailyRunScene extends Page {
  enter(p) {
    super.enter(p);
    const d = new Date();
    const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    this.seed = seed;
    this.realm = REALMS[seed % REALMS.length];
    this.played = (this.save.dailyRuns || []).includes(String(seed));
    this.best = (this.save.dailyBest || {})[String(seed)] || 0;
  }
  update(dt) {
    const m = super.base(dt);
    if (!m) return;
    const b = { x: KW / 2 - 80, y: 210, w: 160, h: 34 };
    const hov = this.hit(b);
    if (!this.grace(dt) && m.justDown && this.hit(b)) {
      this.save.dailyRuns = [...(this.save.dailyRuns || []), String(this.seed)];
      this.engine.setScene('gameplay', { save: this.save, realmId: this.realm.id, stage: 1, dailySeed: this.seed, difficulty: 'normal' });
      m.justDown = false;
    }
    if (!m.down) this._press = null;
    m.justDown = false;
    this._hov = hov;
  }
  render(ctx) {
    lavaBackground(ctx, this.t, this.embers);
    topBar(ctx, { title: 'DAILY RUN', save: this.save, hover: null });
    tile(ctx, 8, 60, KW - 16, 120, 12, { fill: '#20182c', fillLo: '#140e1e', outline: K.INK, ring: this.realm.accent, ringW: 2, lift: 3 });
    label(ctx, 'TODAY\'S SECTOR', KW / 2, 80, K.SUB, 7);
    outlineText(ctx, this.realm.name.toUpperCase(), KW / 2, 104, '#ffffff', '#40140a', 14);
    label(ctx, this.realm.desc.slice(0, 52), KW / 2, 122, K.SUB, 6);
    label(ctx, 'Boss: ' + this.realm.boss.name + ' · same map for every conductor', KW / 2, 140, K.DIM, 6);
    label(ctx, 'SEED ' + this.seed, KW / 2, 160, K.BLUE, 7);
    const b = { x: KW / 2 - 80, y: 210, w: 160, h: 34 };
    button(ctx, b, this.played ? 'RUN IT AGAIN' : 'DEPART', { color: K.RED, hover: this._hov, size: 10, sub: 'Sector 1 · Normal difficulty' });
    label(ctx, `Fresh sector every midnight · today's best: ${fmtNum(this.best || 0)}`, KW / 2, 270, K.DIM, 6);
    drawToast(ctx, this.toast);
  }
}

// ====================================================================
// WEEKLY TRIAL
// ====================================================================
export class WeeklyChallengeScene extends Page {
  enter(p) {
    super.enter(p);
    const d = new Date();
    const wk = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86400000) / 7);
    this.wk = wk;
    this.challenge = WEEKLY_CHALLENGES[wk % WEEKLY_CHALLENGES.length];
    this.best = (this.save.weeklyBest || {})[wk] || 0;
  }
  update(dt) {
    const m = super.base(dt);
    if (!m) return;
    const b = { x: KW / 2 - 80, y: 200, w: 160, h: 34 };
    this._hov = this.hit(b);
    if (!this.grace(dt) && m.justDown && this.hit(b)) {
      this.engine.setScene('gameplay', { save: this.save, realmId: 'purgatory', stage: 1, weeklyChallenge: this.challenge.id, difficulty: 'hard' });
      m.justDown = false;
    }
    if (!m.down) this._press = null;
    m.justDown = false;
  }
  render(ctx) {
    lavaBackground(ctx, this.t, this.embers);
    topBar(ctx, { title: 'WEEKLY TRIAL', save: this.save, hover: null });
    tile(ctx, 8, 60, KW - 16, 110, 12, { fill: '#241a2e', fillLo: '#140e1e', outline: K.INK, ring: '#c07aff', ringW: 2, lift: 3 });
    label(ctx, 'THIS WEEK\'S RULE', KW / 2, 80, K.SUB, 7);
    outlineText(ctx, this.challenge.name.toUpperCase(), KW / 2, 104, '#e0c8ff', '#2a0a3a', 13);
    label(ctx, this.challenge.desc, KW / 2, 124, K.SUB, 7);
    label(ctx, `Hard difficulty · Purgatory · your best this week: ${fmtNum(this.best || 0)}`, KW / 2, 146, K.DIM, 6);
    const b = { x: KW / 2 - 80, y: 200, w: 160, h: 34 };
    button(ctx, b, 'TAKE THE TRIAL', { color: '#6a3aff', hover: this._hov, size: 10, sub: 'Hard · rewards boss cores + shards' });
    label(ctx, 'One new rule every week. Plan the build around it.', KW / 2, 260, K.DIM, 6);
    drawToast(ctx, this.toast);
  }
}

// ====================================================================
// SETTINGS — every toggle says what it does
// ====================================================================
const SETTING_DEFS = [
  { k: 'sound', label: 'SOUND', desc: 'All effects and music' },
  { k: 'damageNumbers', label: 'DAMAGE NUMBERS', desc: 'Show damage dealt to foes' },
  { k: 'shake', label: 'SCREEN SHAKE', desc: 'Camera kick on big hits' },
  { k: 'bloom', label: 'BLOOM', desc: 'Glow around lights and fire' },
  { k: 'lighting', label: 'LIGHTING', desc: 'Dynamic light and shadow' },
  { k: 'scanlines', label: 'SCANLINES', desc: 'Retro screen lines' },
];
export class SettingsScene extends Page {
  enter(p) { super.enter(p); this.from = p.from; this.ctx2 = p.ctx; }
  _goBack() {
    if (this.from === 'pause') this.engine.setScene('pause', { save: this.save, ctx: this.ctx2 });
    else this.engine.setScene('menu', { save: this.save });
  }
  update(dt) {
    const m = super.base(dt);
    if (!m) return;
    SETTING_DEFS.forEach((def, i) => {
      const r = { x: 8, y: 62 + i * 40, w: KW - 16, h: 34 };
      if (!this.grace(dt) && m.justDown && this.hit(r)) {
        this.save.settings[def.k] = this.save.settings[def.k] ? 0 : 1;
        if (def.k === 'sound') SOUNDS.enabled = !!this.save.settings[def.k];
        saveSave(this.save);
        try { SOUNDS.pickup(); } catch {}
        m.justDown = false;
      }
    });
    if (!m.down) this._press = null;
    m.justDown = false;
  }
  render(ctx) {
    lavaBackground(ctx, this.t, this.embers);
    topBar(ctx, { title: 'SETTINGS', save: this.save, hover: null });
    SETTING_DEFS.forEach((def, i) => {
      const y = 62 + i * 40;
      const v = !!this.save.settings[def.k];
      const hov = this.hit({ x: 8, y, w: KW - 16, h: 34 });
      const appear = Math.max(0, Math.min(1, (this.pageT - 0.05 - i * 0.04) * 3.4));
      if (appear <= 0) return;
      ctx.globalAlpha = appear;
      tile(ctx, 8, y, KW - 16, 34, 9, {
        fill: hov ? '#342840' : K.PANEL, fillLo: K.PANEL_LO, outline: K.INK,
        ring: v ? K.OK : null, ringW: 1, lift: hov ? 3 : 2,
      });
      label(ctx, def.label, 18, y + 15, K.TXT, 8, 'left');
      label(ctx, def.desc, 18, y + 27, K.DIM, 6, 'left');
      // toggle
      const tx = KW - 66;
      tile(ctx, tx, y + 8, 48, 18, 9, { fill: v ? '#20402a' : '#241a2e', fillLo: K.PANEL_LO, outline: v ? K.OK : K.INK, lift: 1 });
      tile(ctx, v ? tx + 26 : tx + 4, y + 10, 18, 14, 6, { fill: v ? K.OK : '#5a4a66', fillLo: v ? K.GREEN_D : '#3a2e44', lift: 1 });
      label(ctx, v ? 'ON' : 'OFF', v ? tx + 12 : tx + 35, y + 20, v ? K.OK : K.DIM, 6);
      ctx.globalAlpha = 1;
    });
    label(ctx, 'Changes save instantly.', KW / 2, KH - 12, K.DIM, 6);
    drawToast(ctx, this.toast);
  }
}

// ====================================================================
// RUN SUMMARY — results + per-weapon damage breakdown
// ====================================================================
export class RunSummaryScene extends Page {
  enter(p) { super.enter(p); this.params = p; this.anim = 0; this.post = null; }
  _postRect() { return { x: 12, y: 402, w: KW - 24, h: 28 }; }
  _postLabel() {
    const st = this.post?.state || 'idle';
    if (st === 'posting') return 'POSTING…';
    if (st === 'done') return this.post.rank ? ('POSTED — RANK #' + this.post.rank + ' THIS MONTH') : 'POSTED — TOP 100+ THIS MONTH';
    if (st === 'kept') return 'YOUR BEST STANDS — RANK #' + (this.post.rank || '?') + ' THIS MONTH';
    if (st === 'error') return 'COULD NOT POST — TAP TO RETRY';
    const u = AUTH.getCurrentUser();
    return 'POST SCORE TO THE GLOBAL BOARD' + (u ? '  ·  as ' + String(u.username).slice(0, 12).toUpperCase() : '');
  }
  _doPost() {
    const p = this.params || {};
    if (this.post && ['posting', 'done', 'kept'].includes(this.post.state)) return;
    const u = AUTH.getCurrentUser();
    if (!u) { this.say('SIGN IN AT THE PROFILE DESK TO POST', K.BAD); return; }
    this.post = { state: 'posting' };
    const sb = this.engine.supabase;
    const entry = {
      playerId: this.save.playerId, name: u.username || 'CONDUCTOR',
      score: p.score || 0, stage: p.stage || 1, kills: p.runStats?.kills || 0,
      realm: p.realmId || 'purgatory', difficulty: p.difficulty || 'normal',
    };
    const finish = (res) => {
      if (!res?.ok) { this.post = { state: 'error', reason: res?.reason || 'offline' }; return; }
      const key = [entry.realm, entry.difficulty, monthKey()].join('|');
      // rank = where my score sits on this month's board
      sb.topBoard(entry.realm, entry.difficulty).then((rows) => {
        const rank = rows.length ? rows.findIndex(r => r.player_id === this.save.playerId) + 1 : null;
        this.save.myBoards = this.save.myBoards || {};
        this.save.myBoards[key] = rank || 999;
        saveSave(this.save);
        this.post = { state: res.kept ? 'kept' : 'done', rank: rank || null };
      }).catch(() => { this.post = { state: 'done', rank: null }; });
    };
    if (!sb?.isAvailable?.()) { this.post = { state: 'error', reason: 'offline' }; return; }
    sb.submitRun(entry).then(finish).catch((e) => { this.post = { state: 'error', reason: e?.message }; });
  }
  _buttons() {
    const y = KH - 44, w = 76, gap = 8;
    const total = 3 * w + 2 * gap;
    const x0 = (KW - total) / 2;
    return [
      { label: 'RETRY', x: x0, y, w, h: 32, act: 'retry', color: '#ff8a30' },
      { label: 'FORGE', x: x0 + w + gap, y, w, h: 32, act: 'shop', color: '#ffe066' },
      { label: 'HOME', x: x0 + 2 * (w + gap), y, w, h: 32, act: 'menu', color: '#985ce0' },
    ];
  }
  update(dt) {
    const m = super.base(dt);
    if (!m) return;
    this.anim = Math.min(1, this.anim + dt * 1.6);
    if (!this.grace(dt) && m.justDown) {
      const p = this.params || {};
      if (this.hit(this._postRect())) { this._doPost(); m.justDown = false; return; }
      for (const b of this._buttons()) {
        if (this.hit(b)) {
          if (b.act === 'retry') this.engine.setScene('gameplay', { save: this.save, realmId: p.realmId || this.save.lastRealm || 'purgatory', stage: p.stage || 1, difficulty: p.difficulty || this.engine._difficulty || 'normal' });
          else if (b.act === 'shop') this.engine.setScene('shop', { save: this.save, from: 'menu' });
          else this.engine.setScene('menu', { save: this.save });
          m.justDown = false;
          return;
        }
      }
    }
    if (!m.down) this._press = null;
    m.justDown = false;
  }
  render(ctx) {
    lavaBackground(ctx, this.t, this.embers);
    const p = this.params || {};
    const rs = p.runStats || {};
    const k = this.anim || 0;
    tile(ctx, 8, 40, KW - 16, 46, 12, { fill: '#20182c', fillLo: '#140e1e', outline: K.INK, ring: p.victory ? K.GOLD : K.RED, ringW: 2, lift: 4 });
    outlineText(ctx, p.victory ? 'SECTOR CLEARED' : 'THE RUN ENDED', KW / 2, 64, p.victory ? '#ffe066' : '#ff7a6a', p.victory ? '#5a1a08' : '#3a0508', 15);
    label(ctx, findRealm(p.realmId).name.toUpperCase() + ' · SECTOR ' + (p.stage || 1) + ' · ' + fmtTime(p.time || 0), KW / 2, 77, K.SUB, 7);
    const stats = [
      ['DEFEATS', fmtNum(rs.kills || 0), '#ff8a30'],
      ['LEVEL', String(p.level || 1), '#8ef0ff'],
      ['COINS EARNED', fmtNum(p.coins || 0), '#ffe878'],
      ['BEST COMBO', 'x' + (rs.bestCombo || 0), '#c07aff'],
      ['DAMAGE DEALT', fmtNum(Math.round(rs.damageDealt || 0)), '#ff4d6a'],
      ['DAMAGE TAKEN', fmtNum(Math.round(rs.damageTaken || 0)), '#9aa0b4'],
    ];
    const cols = 3, tw = 80, th = 36, gap = 6, x0 = (KW - (cols * tw + (cols - 1) * gap)) / 2;
    for (let i = 0; i < stats.length; i++) {
      const c = i % cols, r2 = Math.floor(i / cols);
      const x = x0 + c * (tw + gap), y = 96 + r2 * (th + gap);
      const kk = Math.max(0, Math.min(1, k * 3 - i * 0.22));
      if (kk <= 0) continue;
      ctx.globalAlpha = kk;
      tile(ctx, x, y, tw, th, 8, { fill: 'rgba(10,8,18,0.92)', fillLo: 'rgba(6,4,12,0.95)', outline: stats[i][2], ring: stats[i][2], ringW: 1, lift: 2 });
      label(ctx, stats[i][0], x + tw / 2, y + 12, K.DIM, 5);
      label(ctx, stats[i][1], x + tw / 2, y + 27, stats[i][2], 9);
      ctx.globalAlpha = 1;
    }
    // ---- damage by weapon — the build, in numbers ----
    const dmg = p.dmgByWeapon || {};
    const entries = Object.entries(dmg).sort((a, b) => b[1] - a[1]);
    const other = p.dmgOther || 0;
    if (other > 0) entries.push(['Other sources', other]);
    const by = 178;
    if (entries.length) {
      sectionLabel(ctx, 'DAMAGE BY WEAPON', by);
      const total = entries.reduce((a, e) => a + e[1], 0) || 1;
      entries.slice(0, 6).forEach(([name, v], i) => {
        const y = by + 12 + i * 20;
        const kk = Math.max(0, Math.min(1, k * 2.4 - 0.4 - i * 0.12));
        if (kk <= 0) return;
        ctx.globalAlpha = kk;
        const wid = WEAPONS.find(w2 => w2.id === name);
        const wname = wid ? wid.name : name;
        const pct = v / total;
        const barW = KW - 130;
        label(ctx, fit(name, 17), 12, y + 9, K.SUB, 6, 'left');
        ctx.fillStyle = '#00000088'; ctx.fillRect(112, y, barW + 2, 9);
        ctx.fillStyle = wid?.color || '#8a7a96';
        ctx.fillRect(113, y + 1, Math.max(2, barW * pct * kk), 7);
        label(ctx, Math.round(pct * 100) + '%', KW - 14, y + 9, K.TXT, 7, 'right');
        ctx.globalAlpha = 1;
      });
      label(ctx, 'Heavier bars = your build is doing the work.', KW / 2, by + 12 + Math.min(6, entries.length) * 20 + 4, K.DIM, 5);
    }
    // ending / death story beat
    if (p.ending) {
      const e = p.ending;
      const y = 300;
      tile(ctx, 20, y, KW - 40, 96, 10, { fill: '#241a08', fillLo: '#140e06', outline: K.GOLD, ring: K.GOLD, ringW: 2, lift: 3 });
      outlineText(ctx, 'ENDING REACHED', KW / 2, y + 16, K.GOLD, '#3a2a08', 9);
      outlineText(ctx, e.title, KW / 2, y + 34, '#ffe066', '#3a2a08', 12);
      label(ctx, e.text.slice(0, 52), KW / 2, y + 52, '#d8c8a0', 5);
      label(ctx, e.text.slice(52, 104), KW / 2, y + 62, '#d8c8a0', 5);
      label(ctx, 'Endings ' + (this.save.endings || []).length + '/' + ENDINGS.length + ' · Relics ' + (this.save.relics || []).length + '/' + RELICS.length, KW / 2, y + 80, K.SUB, 6);
    } else if (!p.victory && p.cause) {
      tile(ctx, 20, 322, KW - 40, 24, 8, { fill: '#241014', fillLo: '#140808', outline: K.RED, ring: K.RED, ringW: 1, lift: 2 });
      label(ctx, 'DEFEATED BY: ' + String(p.cause).toUpperCase(), KW / 2, 338, '#ff7a6a', 7);
    }
    label(ctx, 'PURSE  ' + fmtNum(this.save.coins || 0) + ' COINS · ' + fmtNum(this.save.shards || 0) + ' SHARDS', KW / 2, 366, K.GOLD, 8);
    // ---- opt-in global post — nothing leaves without your say-so ----
    {
      const r = this._postRect();
      const st = this.post?.state || 'idle';
      const col = st === 'done' || st === 'kept' ? K.OK : st === 'error' ? K.BAD : K.GOLD;
      tile(ctx, r.x, r.y, r.w, r.h, 8, { fill: 'rgba(10,8,18,0.92)', fillLo: 'rgba(6,4,12,0.95)', outline: col, ring: col, ringW: 1, lift: 2 });
      label(ctx, 'SCORE ' + fmtNum(this.params?.score || 0) + ' · ' + (this.params?.realmId || 'purgatory').toUpperCase() + ' / ' + (this.params?.difficulty || 'normal').toUpperCase(), r.x + 10, r.y + 11, K.SUB, 6, 'left');
      label(ctx, 'posting is your choice — nothing is sent automatically', r.x + 10, r.y + 21, K.DIM, 5, 'left');
      label(ctx, this._postLabel(), r.x + r.w - 10, r.y + 17, col, 7, 'right');
    }
    for (const b of this._buttons()) {
      const hov = this.hit(b);
      button(ctx, b, b.label, { color: b.color, hover: hov, size: 8 });
    }
    drawToast(ctx, this.toast);
  }
}

function fit(s, n) {
  s = String(s);
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// ====================================================================
// PAUSE
// ====================================================================
export class PauseScene extends Page {
  enter(p) { super.enter(p); this.ctx2 = p.ctx; this.tab = 0; this.post = null; }
  _gp() { return this.ctx2?.gameplay; }
  _goBack() { if (this.ctx2?.gameplay) this.engine.resumeScene(this.ctx2.gameplay); else this.engine.setScene('menu', { save: this.save }); }
  _postLabel() {
    const st = this.post?.state;
    if (st === 'posting') return 'POSTING\u2026';
    if (st === 'done') return this.post.rank ? ('POSTED \u2014 RANK #' + this.post.rank) : 'POSTED TO THE BOARD';
    if (st === 'kept') return 'ON THE BOARD \u2014 RANK #' + (this.post.rank || '?');
    if (st === 'error') return 'COULD NOT POST \u2014 TAP TO RETRY';
    return 'SAVE SCORE TO LEADERBOARD';
  }
  _buttons() {
    const w = 172, x = KW / 2 - w / 2;
    if (this.tab === 1 || this.tab === 2) return [{ label: 'BACK TO PAUSE', y: 300, x, w, h: 30, act: 'resume', color: K.PLASMA }];
    return [
      { label: 'RESUME THE RUN', y: 178, act: 'resume', color: K.GREEN },
      { label: 'YOUR BUILD', y: 212, act: 'build', color: K.LAV },
      { label: 'RUN SCORE', y: 246, act: 'score', color: K.CYAN },
      { label: 'SETTINGS', y: 280, act: 'settings', color: K.PLASMA },
      { label: this._postLabel(), y: 314, act: 'post', color: (this.post?.state === 'done' || this.post?.state === 'kept') ? K.GREEN : K.GOLD },
      { label: 'END RUN \u2014 SAVE & EXIT', y: 348, act: 'exit', color: K.RED },
    ];
  }
  _buildLines() {
    const g = this._gp();
    if (!g?.player) return [];
    const lines = [];
    for (const w of g.player.weapons) {
      const st = g.player.weaponStates[w.id] || { level: 1 };
      lines.push({ l: `${w.name.toUpperCase()} \u2014 L${st.level}${w.evolved ? ' \u2605EVOLVED' : ''}`, c: w.color });
    }
    const owned = Object.entries(g.owned || {});
    if (owned.length) lines.push({ l: '\u2014 ASCENSION CARDS \u2014', c: K.DIM });
    for (const [id, lvl] of owned.slice(0, 10)) {
      lines.push({ l: `${id.replace(/_/g, ' ').toUpperCase()} ${lvl > 1 ? 'x' + lvl : ''}`, c: K.SUB });
    }
    lines.push({ l: `REROLLS ${g.rerolls ?? 0} \u00b7 BANISHES ${g.banishes ?? 0} \u00b7 KILLS ${g.runStats?.kills ?? 0}`, c: K.GOLD });
    return lines;
  }
  _scoreLines() {
    const g = this._gp();
    if (!g) return [];
    const p = g.player;
    return [
      ['SCORE', fmtNum(Math.round(p?.score || 0))],
      ['KILLS', fmtNum(g.runStats?.kills || 0)],
      ['SECTOR', g.stage + ' \u2014 ' + (g.theme?.name || '').toUpperCase()],
      ['TIME', fmtTime(g.runTime || 0)],
      ['LEVEL', String(p?.level || 1)],
      ['BEST COMBO', 'x' + (g.runStats?.bestCombo || 0)],
      ['SHARDS THIS RUN', String(g.gameStats?.shards || 0)],
      ['COINS THIS RUN', fmtNum(g.runStats?.coins || 0)],
    ];
  }
  _doPost() {
    if (this.post && ['posting', 'done', 'kept'].includes(this.post.state)) return;
    const u = AUTH.getCurrentUser();
    if (!u) { this.say('SIGN IN AT THE PROFILE DESK TO POST', K.BAD); return; }
    const g = this._gp();
    if (!g) return;
    const sb = this.engine.supabase;
    if (!sb?.isAvailable?.()) { this.post = { state: 'error' }; this.say('THE GLOBAL BOARD NEEDS THE NETWORK', K.BAD); return; }
    this.post = { state: 'posting' };
    const entry = {
      playerId: this.save.playerId, name: u.username || 'CONDUCTOR',
      score: Math.round(g.player?.score || 0), stage: g.stage,
      kills: g.runStats?.kills || 0, realm: g.realmId,
      difficulty: g.difficulty?.id || 'normal',
    };
    sb.submitRun(entry).then(() => sb.topBoard(entry.realm, entry.difficulty)).then((rows) => {
      const rank = rows && rows.length ? rows.findIndex(r => r.player_id === this.save.playerId) + 1 : null;
      const key = [entry.realm, entry.difficulty, monthKey()].join('|');
      this.save.myBoards = this.save.myBoards || {};
      this.save.myBoards[key] = rank || 999;
      saveSave(this.save);
      this.post = { state: 'done', rank: rank || null };
    }).catch(() => { this.post = { state: 'error' }; });
  }
  _endRun() {
    const g = this._gp();
    if (g && !g._ended) g._endRun(false, { cause: 'CALLED IT A DAY AT THE PAUSE SIGNAL' });
    else this.engine.setScene('runSummary', { save: this.save, victory: false, cause: 'RUN ENDED' });
  }
  update(dt) {
    const m = super.base(dt);
    if (!m) return;
    if (!this.grace(dt) && m.justDown) {
      for (const b of this._buttons()) {
        if (this.hit(b)) {
          if (b.act === 'resume') { this.tab = 0; this.engine.resumeScene(this.ctx2.gameplay); }
          else if (b.act === 'build') { this.tab = 1; m.justDown = false; return; }
          else if (b.act === 'score') { this.tab = 2; m.justDown = false; return; }
          else if (b.act === 'settings') this.engine.setScene('settings', { save: this.save, from: 'pause', ctx: this.ctx2 });
          else if (b.act === 'post') this._doPost();
          else if (b.act === 'exit') this._endRun();
          m.justDown = false;
          return;
        }
      }
    }
    if (!m.down) this._press = null;
    m.justDown = false;
  }
  render(ctx) {
    steelBackdrop(ctx, this.t, this.embers);
    steelPlate(ctx, KW / 2 - 98, 36, 196, 414, { r: 12 });
    label(ctx, 'SIGNAL PAUSED', KW / 2, 62, '#ffece6', 12);
    label(ctx, "the void waits \u00b7 the schedule doesn't", KW / 2, 80, K.DIM, 6);
    if (this.tab === 1) {
      label(ctx, 'YOUR BUILD', KW / 2, 106, K.LAV, 9);
      const lines = this._buildLines();
      if (!lines.length) label(ctx, 'No build yet \u2014 go make one.', KW / 2, 150, K.DIM, 7);
      lines.slice(0, 13).forEach((ln, i) => {
        label(ctx, ln.l, KW / 2, 126 + i * 13, ln.c, 6);
      });
    } else if (this.tab === 2) {
      label(ctx, 'RUN SCORE', KW / 2, 106, K.CYAN, 9);
      this._scoreLines().forEach(([k2, v], i) => {
        const y = 130 + i * 19;
        label(ctx, k2, 22, y, K.DIM, 6, 'left');
        label(ctx, v, KW - 22, y, i === 0 ? K.CYAN : K.TXT, i === 0 ? 9 : 7, 'right');
      });
      label(ctx, 'posting is always your choice \u2014 never automatic', KW / 2, 292, K.DIM, 5);
    }
    for (const b of this._buttons()) {
      if (this.tab !== 0 && b.act === 'resume' && b.y === 178) continue;
      const hov = this.hit(b);
      button(ctx, b, b.label, { color: b.color, hover: hov, size: 7 });
    }
    drawToast(ctx, this.toast);
  }
}

export class ProfileScene extends Page {
  enter(p) {
    super.enter(p);
    this.mode = 'main';
    this.username = ''; this.password = ''; this.error = ''; this.success = '';
    this.focus = 'username';
    this.tab = 0;
    this._setupKeys();
  }
  _setupKeys() {
    if (this._keyHandler) window.removeEventListener('keydown', this._keyHandler);
    this._keyHandler = (e) => {
      if (this.engine.current !== this) return;
      if (this.mode === 'main') return;
      if (e.key === 'Backspace') {
        if (this.focus === 'username') this.username = this.username.slice(0, -1);
        else this.password = this.password.slice(0, -1);
      } else if (e.key === 'Enter') {
        this._submit();
      } else if (e.key.length === 1 && /[a-zA-Z0-9_]/.test(e.key)) {
        if (this.focus === 'username' && this.username.length < 16) this.username += e.key;
        else if (this.focus === 'password' && this.password.length < 16) this.password += e.key;
      }
    };
    window.addEventListener('keydown', this._keyHandler);
  }
  exit() { super.exit(); if (this._keyHandler) window.removeEventListener('keydown', this._keyHandler); }
  _submit() {
    if (this.mode === 'login') {
      const res = AUTH.login(this.username, this.password);
      if (res.ok) { this.success = 'Welcome back, ' + res.user.username; this.error = ''; this.mode = 'main'; try { SOUNDS.levelup(); } catch {} }
      else this.error = res.error;
    } else if (this.mode === 'register') {
      const res = AUTH.register(this.username, this.password);
      if (res.ok) { this.success = 'Account created — welcome, ' + res.user.username; this.error = ''; this.mode = 'main'; try { SOUNDS.levelup(); } catch {} }
      else this.error = res.error;
    } else if (this.mode === 'guestUpgrade') {
      const res = AUTH.upgradeGuest(this.username, this.password);
      if (res.ok) { this.success = 'Upgraded to ' + res.user.username; this.error = ''; this.mode = 'main'; }
      else this.error = res.error;
    }
  }
  update(dt) {
    const m = super.base(dt);
    if (!m) return;
    if (!this.grace(dt) && m.justDown) {
      const cur = AUTH.getCurrentUser();
      const tabs = ['ACCOUNT', 'RECORD', 'IDENTITY'];
      for (let i = 0; i < 3; i++) { const r = { x: 8 + i * 127, y: 40, w: 127, h: 24 }; if (this.hit(r)) { this.tab = i; m.justDown = false; return; } }
      if (this.tab === 0) {
        if (this.mode === 'main') {
          const rows = [];
          if (!cur || cur.guest) rows.push({ y: 130, act: 'login', label: 'SIGN IN' });
          if (!cur) rows.push({ y: 168, act: 'register', label: 'CREATE ACCOUNT' });
          rows.push({ y: cur && !cur.guest ? 130 : 206, act: 'guest', label: cur ? 'NEW GUEST PROFILE' : 'PLAY AS GUEST' });
          for (const r of rows) {
            if (this.hit({ x: 8, y: r.y, w: KW - 16, h: 30 })) {
              if (r.act === 'guest') { const res = AUTH.guestLogin(); this.save = this.engine.save; this.success = 'Guest profile: ' + res.user.username; this.error = ''; try { SOUNDS.pickup(); } catch {} }
              else { this.mode = r.act; this.username = ''; this.password = ''; this.error = ''; }
              m.justDown = false; return;
            }
          }
          if (cur) {
            const ly = (cur && !cur.guest ? 168 : 244);
            if (this.hit({ x: 8, y: ly, w: KW - 16, h: 30 })) { AUTH.logout(); this.success = 'Signed out'; this.error = ''; m.justDown = false; return; }
            if (cur.guest && this.hit({ x: 8, y: ly + 38, w: KW - 16, h: 30 })) { this.mode = 'guestUpgrade'; this.username = ''; this.password = ''; m.justDown = false; return; }
          }
        } else if (this.tab === 2) {
          // IDENTITY — owned avatars + season frames, tap to wear
          const ownedA = this.save.ownedAvatars || ['conductor'];
          const idsA = Object.keys(AVATARS);
          idsA.forEach((id, i) => {
            const x = 8 + i * 64;
            if ((this.save.ownedAvatars || []).includes(id) && this.hit({ x, y: 118, w: 60, h: 60 })) {
              this.save.avatar = id; saveSave(this.save); try { SOUNDS.pickup(); } catch {} m.justDown = false; return;
            }
          });
          const idsF = ['none', ...Object.keys(FRAMES)];
          idsF.forEach((id, i) => {
            const x = 8 + i * 96;
            const owned = id === 'none' || (this.save.ownedFrames || []).includes(id);
            if (owned && this.hit({ x, y: 238, w: 92, h: 34 })) {
              this.save.frame = id === 'none' ? null : id; saveSave(this.save); try { SOUNDS.pickup(); } catch {} m.justDown = false; return;
            }
          });
        } else {
          if (this.hit({ x: 8, y: 74, w: KW - 16, h: 32 })) this.focus = 'username';
          if (this.hit({ x: 8, y: 114, w: KW - 16, h: 32 })) this.focus = 'password';
          if (this.hit({ x: 8, y: 156, w: 122, h: 30 })) this._submit();
          if (this.hit({ x: 140, y: 156, w: 122, h: 30 })) { this.mode = 'main'; this.error = ''; }
          m.justDown = false; return;
        }
      }
    }
    if (!m.down) this._press = null;
    m.justDown = false;
  }
  render(ctx) {
    lavaBackground(ctx, this.t, this.embers);
    topBar(ctx, { title: 'PROFILE', save: this.save, hover: null });
    const cur = AUTH.getCurrentUser();
    const tabs = ['ACCOUNT', 'RECORD', 'IDENTITY'];
    tabs.forEach((lb, i) => {
      const r = { x: 8 + i * 127, y: 40, w: 127, h: 24 };
      const active = this.tab === i;
      tile(ctx, r.x, r.y, r.w, r.h, 8, { fill: active ? K.PANEL_ACT : '#241a2e', fillLo: K.PANEL_LO, outline: K.INK, ring: active ? K.GOLD : null, ringW: 2, lift: active ? 3 : 1 });
      label(ctx, lb, r.x + r.w / 2, r.y + 16, active ? K.GOLD : K.SUB, 7);
    });
    if (this.tab === 2) {
      // IDENTITY — preview + owned lockers. Everything shown is owned; nothing for sale here.
      const ownedA = this.save.ownedAvatars || ['conductor'];
      const curA = AVATARS[this.save.avatar] ? this.save.avatar : 'conductor';
      tile(ctx, 8, 72, KW - 16, 40, 8, { fill: '#1c1428', fillLo: '#120c1c', outline: K.INK, lift: 2 });
      drawFrame(ctx, KW / 2, 92, 17, this.save.frame || null);
      drawAvatar(ctx, KW / 2, 92, 13, curA);
      label(ctx, AVATARS[curA].name.toUpperCase(), 70, 86, K.GOLD, 7, 'left');
      label(ctx, AVATARS[curA].desc.slice(0, 40), 70, 98, K.DIM, 5, 'left');
      label(ctx, 'AVATARS — TAP TO WEAR (' + ownedA.length + '/' + Object.keys(AVATARS).length + ')', 10, 128, K.SUB, 6, 'left');
      Object.keys(AVATARS).forEach((id, i) => {
        const x = 8 + i * 64, y = 134;
        const owned = ownedA.includes(id);
        tile(ctx, x, y, 60, 60, 8, { fill: owned ? K.PANEL : '#181220', fillLo: K.PANEL_LO, outline: K.INK, ring: this.save.avatar === id ? K.GOLD : null, ringW: this.save.avatar === id ? 2 : 0, lift: owned ? 2 : 0 });
        ctx.globalAlpha = owned ? 1 : 0.25;
        drawAvatar(ctx, x + 30, y + 24, 12, id);
        ctx.globalAlpha = 1;
        label(ctx, owned ? '' : 'LOCKED', x + 30, y + 50, K.DIM, 5);
      });
      label(ctx, 'SEASON FRAMES — WON, NEVER SOLD', 10, 212, K.SUB, 6, 'left');
      const idsF = ['none', ...Object.keys(FRAMES)];
      idsF.forEach((id, i) => {
        const x = 8 + i * 96, y = 220;
        const owned = id === 'none' || (this.save.ownedFrames || []).includes(id);
        const active = id === 'none' ? !this.save.frame : this.save.frame === id;
        tile(ctx, x, y, 92, 34, 8, { fill: owned ? K.PANEL : '#181220', fillLo: K.PANEL_LO, outline: K.INK, ring: active ? K.GOLD : null, ringW: active ? 2 : 0, lift: owned ? 2 : 0 });
        ctx.globalAlpha = owned ? 1 : 0.25;
        if (id === 'none') label(ctx, 'NO FRAME', x + 46, y + 20, K.SUB, 6);
        else { drawFrame(ctx, x + 18, y + 17, 12, id); label(ctx, FRAMES[id].name.split(' ')[0].toUpperCase(), x + 56, y + 20, K.SUB, 5); }
        ctx.globalAlpha = 1;
        if (!owned) label(ctx, 'TOP ' + (id === 'fra_aurum' ? '1' : id === 'fra_argent' ? '2' : '3') + ' ONLY', x + 46, y + 30, K.DIM, 4);
      });
      label(ctx, 'Finish a season high enough and the look is yours forever.', KW / 2, 272, K.DIM, 5);
    } else if (this.tab === 1) {
      const s = this.save.stats || {};
      const rows = [
        ['RUNS', String(s.totalRuns || 0)],
        ['DEFEATS', fmtNum(s.totalKills || 0)],
        ['LONGEST RUN', fmtTime(s.longestRun || 0)],
        ['BEST SCORE', fmtNum(s.bestScore || 0)],
        ['BEST COMBO', 'x' + (s.bestCombo || 0)],
        ['BOSS CORES', String(Object.keys(this.save.bossCores || {}).length) + '/' + REALMS.length],
        ['RELICS', (this.save.relics || []).length + '/' + RELICS.length],
        ['ENDINGS', (this.save.endings || []).length + '/' + ENDINGS.length],
      ];
      rows.forEach(([k2, v], i) => {
        const y = 76 + i * 40;
        const appear = Math.max(0, Math.min(1, (this.pageT - 0.05 - i * 0.04) * 3.4));
        if (appear <= 0) return;
        ctx.globalAlpha = appear;
        tile(ctx, 8, y, KW - 16, 34, 9, { fill: K.PANEL, fillLo: K.PANEL_LO, outline: K.INK, lift: 2 });
        label(ctx, k2, 16, y + 15, K.DIM, 6, 'left');
        label(ctx, v, 16, y + 27, K.TXT, 8, 'left');
        ctx.globalAlpha = 1;
      });
    } else if (this.mode !== 'main') {
      outlineText(ctx, this.mode === 'login' ? 'SIGN IN' : this.mode === 'register' ? 'CREATE ACCOUNT' : 'SAVE YOUR GUEST', KW / 2, 84, '#ffffff', '#5a1a08', 11);
      const uf = this.focus === 'username';
      tile(ctx, 8, 96, KW - 16, 32, 8, { fill: uf ? '#3a2a5a' : K.PANEL, fillLo: K.PANEL_LO, outline: uf ? K.GOLD : K.INK, lift: 2 });
      label(ctx, 'NAME: ' + this.username + (uf ? '_' : ''), 16, 116, K.TXT, 8, 'left');
      const pf = this.focus === 'password';
      tile(ctx, 8, 136, KW - 16, 32, 8, { fill: pf ? '#3a2a5a' : K.PANEL, fillLo: K.PANEL_LO, outline: pf ? K.BLUE : K.INK, lift: 2 });
      label(ctx, 'PASS: ' + '*'.repeat(this.password.length) + (pf ? '_' : ''), 16, 156, K.TXT, 8, 'left');
      label(ctx, '3–16 characters · letters, numbers, _', 16, 180, K.DIM, 6, 'left');
      button(ctx, { x: 8, y: 192, w: 122, h: 30 }, this.mode === 'login' ? 'SIGN IN' : 'CREATE', { color: K.GREEN, size: 8 });
      button(ctx, { x: 140, y: 192, w: 122, h: 30 }, 'CANCEL', { color: '#4a3a52', size: 8 });
      if (this.error) label(ctx, this.error, KW / 2, 240, K.BAD, 7);
      if (this.success) label(ctx, this.success, KW / 2, 240, K.OK, 7);
      label(ctx, 'No email needed — the account lives on this device.', KW / 2, KH - 12, K.DIM, 6);
    } else {
      tile(ctx, 8, 70, KW - 16, 52, 10, { fill: '#20182c', fillLo: '#140e1e', outline: K.INK, ring: cur ? (cur.guest ? '#9aa0b4' : K.GOLD) : '#3a2a4a', ringW: 2, lift: 3 });
      if (cur) {
        label(ctx, cur.username.toUpperCase(), 16, 88, K.TXT, 9, 'left');
        label(ctx, (cur.title || 'Conductor') + ' · LEVEL ' + (cur.level || 1) + (cur.guest ? ' · GUEST' : ' · SAVED'), 16, 102, cur.guest ? '#9aa0b4' : K.BLUE, 6, 'left');
        label(ctx, 'Runs ' + (this.save.stats?.totalRuns || 0) + ' · Coins ' + fmtNum(this.save.coins || 0), 16, 114, K.DIM, 6, 'left');
      } else {
        label(ctx, 'NO PROFILE ON THIS DEVICE', 16, 90, K.BAD, 8, 'left');
        label(ctx, 'Create one, or hop aboard as a guest.', 16, 106, K.SUB, 6, 'left');
      }
      const rows = [];
      if (!cur || cur.guest) rows.push({ y: 132, label: 'SIGN IN', color: K.BLUE, sub: 'Existing account' });
      if (!cur) rows.push({ y: 170, label: 'CREATE ACCOUNT', color: K.GREEN, sub: 'Name + password, no email' });
      rows.push({ y: cur ? (cur.guest ? 208 : 132) : 208, label: cur ? 'NEW GUEST PROFILE' : 'PLAY AS GUEST', color: '#9aa0b4', sub: 'Instant, upgrade any time' });
      if (cur) rows.push({ y: cur.guest ? 246 : 170, label: 'SIGN OUT', color: K.RED, sub: 'Switch profile' });
      if (cur?.guest) rows.push({ y: 284, label: 'SAVE GUEST AS ACCOUNT', color: K.GREEN, sub: 'Keep progress, add a password' });
      rows.forEach((r, i) => {
        const hov = this.hit({ x: 8, y: r.y, w: KW - 16, h: 30 });
        const appear = Math.max(0, Math.min(1, (this.pageT - 0.1 - i * 0.05) * 3.4));
        if (appear <= 0) return;
        ctx.globalAlpha = appear;
        tile(ctx, 8, r.y, KW - 16, 30, 8, { fill: hov ? '#3a2a5a' : K.PANEL, fillLo: K.PANEL_LO, outline: K.INK, ring: r.color, ringW: hov ? 2 : 1, lift: hov ? 3 : 2 });
        label(ctx, r.label, 18, r.y + 13, r.color, 8, 'left');
        label(ctx, r.sub, 18, r.y + 24, K.DIM, 6, 'left');
        ctx.globalAlpha = 1;
      });
      if (this.success) label(ctx, this.success, KW / 2, KH - 26, K.OK, 7);
      if (this.error) label(ctx, this.error, KW / 2, KH - 26, K.BAD, 7);
    }
    drawToast(ctx, this.toast);
  }
}

// ====================================================================
// IDENTITY — avatars + season frames (won, never sold)
// ====================================================================
export class IdentityScene extends Page {
  enter(p) { super.enter(p); this.msg = 'Everything here is earned. Seasons pay looks, not luck.'; }
  _wear(id, kind) {
    const s = this.save;
    if (kind === 'a') {
      if (!(s.ownedAvatars || []).includes(id)) return this.say('FINISH A SEASON HIGH ENOUGH TO EARN THIS', K.BAD);
      s.avatar = id;
    } else {
      if (id !== 'none' && !(s.ownedFrames || []).includes(id)) return this.say('TOP 3 OF A SEASON ONLY — NO SHORTCUTS', K.BAD);
      s.frame = id === 'none' ? null : id;
    }
    saveSave(s);
    try { SOUNDS.pickup(); } catch {}
    this.msg = kind === 'a' ? ('WEARING ' + String(AVATARS[id].name).toUpperCase()) : (id === 'none' ? 'FRAME REMOVED' : 'WEARING ' + String(FRAMES[id].name).toUpperCase());
  }
  update(dt) {
    const m = super.base(dt);
    if (!m) return;
    if (!this.grace(dt) && m.justDown) {
      Object.keys(AVATARS).forEach((id, i) => { if (this.hit({ x: 8 + i * 64, y: 128, w: 60, h: 60 })) { this._wear(id, 'a'); m.justDown = false; } });
      ['none', ...Object.keys(FRAMES)].forEach((id, i) => { if (this.hit({ x: 8 + i * 96, y: 252, w: 92, h: 34 })) { this._wear(id, 'f'); m.justDown = false; } });
    }
    if (!m.down) this._press = null;
    m.justDown = false;
  }
  render(ctx) {
    lavaBackground(ctx, this.t, this.embers);
    topBar(ctx, { title: 'IDENTITY', save: this.save, hover: null });
    const s = this.save;
    const curA = AVATARS[s.avatar] ? s.avatar : 'conductor';
    // preview
    tile(ctx, 8, 44, KW - 16, 72, 10, { fill: '#1c1428', fillLo: '#120c1c', outline: K.GOLD, ringW: 1, lift: 2 });
    drawFrame(ctx, KW / 2, 80, 26, s.frame || null);
    drawAvatar(ctx, KW / 2, 80, 20, curA);
    label(ctx, AVATARS[curA].name.toUpperCase(), 96, 66, K.GOLD, 8, 'left');
    label(ctx, AVATARS[curA].desc.slice(0, 44), 96, 78, K.DIM, 5, 'left');
    label(ctx, s.frame ? 'FRAME: ' + FRAMES[s.frame].name.toUpperCase() : 'NO FRAME', 96, 90, K.SUB, 6, 'left');
    // avatars
    label(ctx, 'AVATARS — TAP TO WEAR · ' + (s.ownedAvatars || ['conductor']).length + '/' + Object.keys(AVATARS).length + ' OWNED', 10, 126, K.SUB, 6, 'left');
    Object.keys(AVATARS).forEach((id, i) => {
      const x = 8 + i * 64, y = 132;
      const owned = (s.ownedAvatars || []).includes(id);
      const active = s.avatar === id;
      tile(ctx, x, y, 60, 60, 8, { fill: owned ? K.PANEL : '#181220', fillLo: K.PANEL_LO, outline: K.INK, ring: active ? K.GOLD : null, ringW: active ? 2 : 0, lift: owned ? 2 : 0 });
      ctx.globalAlpha = owned ? 1 : 0.22;
      drawAvatar(ctx, x + 30, y + 26, 13, id);
      ctx.globalAlpha = 1;
      label(ctx, owned ? (active ? 'WORN' : '') : 'EARN IT', x + 30, y + 52, active ? K.GOLD : K.DIM, 5);
    });
    // frames
    label(ctx, 'SEASON FRAMES — TOP 3 OF A MONTH, FOREVER', 10, 210, K.SUB, 6, 'left');
    ['none', ...Object.keys(FRAMES)].forEach((id, i) => {
      const x = 8 + i * 96, y = 218;
      const owned = id === 'none' || (s.ownedFrames || []).includes(id);
      const active = id === 'none' ? !s.frame : s.frame === id;
      tile(ctx, x, y, 92, 34, 8, { fill: owned ? K.PANEL : '#181220', fillLo: K.PANEL_LO, outline: K.INK, ring: active ? K.GOLD : null, ringW: active ? 2 : 0, lift: owned ? 2 : 0 });
      ctx.globalAlpha = owned ? 1 : 0.22;
      if (id === 'none') label(ctx, 'NO FRAME', x + 46, y + 20, K.SUB, 6);
      else { drawFrame(ctx, x + 18, y + 17, 12, id); label(ctx, FRAMES[id].name.split(' ')[0].toUpperCase(), x + 58, y + 20, K.SUB, 5); }
      ctx.globalAlpha = 1;
      if (!owned) label(ctx, id === 'fra_aurum' ? '#1 ONLY' : id === 'fra_argent' ? '#2 ONLY' : '#3 ONLY', x + 46, y + 30, K.DIM, 4);
    });
    label(ctx, this.msg, KW / 2, 272, K.SUB, 6);
    label(ctx, 'Season rewards are exact and printed in advance — the board decides, not chance.', KW / 2, 284, K.DIM, 5);
    drawToast(ctx, this.toast);
  }
}

// ====================================================================
// TUTORIAL — every mechanic, taught once, skipped anytime
// ====================================================================
const TUTORIAL_STEPS = [
  {
    t: 'WELCOME ABOARD', icon: 'train', col: '#ff3b46',
    b: 'This is the HELL TRAIN line. You are the Conductor. The sectors are overrun, and the only way out is THROUGH. 6 quick pages and you will know everything.',
    tip: 'tap NEXT to continue \u00b7 SKIP anytime',
  },
  {
    t: 'MOVING & FIGHTING', icon: 'target', col: '#28f0e0',
    b: 'MOVE with WASD / arrows, or drag anywhere on touch. Your weapons FIRE AUTOMATICALLY at the nearest horror. Your only job is positioning \u2014 never stop moving.',
    tip: 'damage numbers burst off every hit',
  },
  {
    t: 'XP & ASCENSION', icon: 'star', col: '#f2c14e',
    b: 'Slain horrors drop glowing XP gems. Collect them to LEVEL UP. Each level opens ASCENSION: pick one of three upgrade cards. Exact effects are printed on every card \u2014 no guessing, no rolls.',
    tip: 'press 1 / 2 / 3 or tap a card',
  },
  {
    t: 'WEAPONS & EVOLUTION', icon: 'blade', col: '#c07aff',
    b: 'You carry several weapons at once. Level a weapon to 5 and it EVOLVES into its final form. REROLL (R) swaps the offered cards; BANISH (B) removes one for the whole run.',
    tip: 'your build lives in the pause signal',
  },
  {
    t: 'THE TRAIN', icon: 'train', col: '#8ef0ff',
    b: 'The armored train rides beside you. Kill CLOSE to it and the FURNACE heats twice as fast. At full furnace, press E for a burst that scorches everything near the rails. The train falls \u2192 you are alone.',
    tip: 'the train is a teammate, not scenery',
  },
  {
    t: 'THE ULTIMATE', icon: 'bolt', col: '#28f0e0',
    b: 'The train charges energy over time. When the Q \u2014 ULTIMATE READY lamp blinks, press Q (or tap the fire ring) to unleash the train\'s ultimate. It never fires itself \u2014 that moment is YOURS.',
    tip: 'a run can turn on one well-timed Q',
  },
  {
    t: 'SHARDS \u2014 HARD CURRENCY', icon: 'shard', col: '#8ef0ff',
    b: 'ELITES drop exactly +12\u25c6, CHESTS +8\u25c6, LIEUTENANTS +40\u25c6, BOSSES +60\u25c6 \u2014 always printed, always exact. Shards you grab in a run are BANKED at the end. Shards buy permanent upgrades at the FORGE.',
    tip: 'achievements pay shard bounties too',
  },
  {
    t: 'COINS \u2014 SOFT CURRENCY', icon: 'coin', col: '#f2c14e',
    b: 'Coins rain from every kill and daily goal. Coins buy consumables and rank-ups in the SHOP. Daily goals pay 60+ coins per streak day \u2014 clear BOTH goals for a bonus of +2\u25c6.',
    tip: 'streaks raise the payout, cap 180',
  },
  {
    t: 'SECTORS & BOSSES', icon: 'map', col: '#4d7dff',
    b: 'Each run crosses sectors. Every 2 minutes the sector ends and you pick a ROUTE CARD. Sector bosses guard the deep line. The FIRST 3 SECTORS are a learning phase \u2014 new dangers arrive one at a time.',
    tip: 'sector 4+ is the full nightmare',
  },
  {
    t: 'THE LEADERBOARDS', icon: 'trophy', col: '#f2c14e',
    b: 'Scores NEVER post automatically. At run end you choose: POST or keep it local. Signed-in conductors compete on GLOBAL boards per sector and difficulty. Each MONTH the top 50 earn avatars, frames and currency \u2014 printed in advance.',
    tip: 'one entry per board \u2014 your best stands',
  },
  {
    t: 'FULL AHEAD', icon: 'fire', col: '#ff3b46',
    b: 'That is everything. Pull the throttle on the depot platform to start. The first three sectors go easy on you \u2014 after that, the line belongs to the horrors. Good hunting, Conductor.',
    tip: 're-read this anytime: MENU \u2192 HOW TO PLAY',
  },
];

export class TutorialScene extends Page {
  enter(p) { super.enter(p); this.step = 0; this.save = p.save || this.engine.save; }
  _finish() {
    this.save.tutorialDone = true;
    saveSave(this.save);
    try { SOUNDS.levelup(); } catch {}
    this.engine.setScene('menu', { save: this.save });
  }
  _next() {
    this.step += 1;
    if (this.step >= TUTORIAL_STEPS.length) this._finish();
    else try { SOUNDS.pickup(); } catch {}
  }
  _nextRect() { return { x: KW / 2 - 60, y: 356, w: 120, h: 34 }; }
  _skipRect() { return { x: KW - 70, y: 10, w: 60, h: 22 }; }
  _dotRect(i) { return { x: Math.round(KW / 2 - TUTORIAL_STEPS.length * 7 + i * 14), y: 402, w: 12, h: 10 }; }
  update(dt) {
    const m = super.base(dt);
    if (!m) return;
    if (m.justDown && !this.grace(dt)) {
      if (this.hit(this._skipRect())) return this._finish();
      if (this.hit(this._nextRect())) return this._next();
      for (let i = 0; i < TUTORIAL_STEPS.length; i++) if (this.hit(this._dotRect(i))) { this.step = i; m.justDown = false; return; }
      if (!this.hit(PANEL_RECT)) this._next();
    }
    if (this.input?.wasPressed?.('Enter') || this.input?.wasPressed?.('Space')) this._next();
    if (this.input?.wasPressed?.('Escape')) this._finish();
    if (!m.down) this._press = null;
    m.justDown = false;
  }
  render(ctx) {
    steelBackdrop(ctx, this.t, this.embers);
    const st = TUTORIAL_STEPS[this.step];
    steelPlate(ctx, PANEL_RECT.x, PANEL_RECT.y, PANEL_RECT.w, PANEL_RECT.h, { r: 12 });
    label(ctx, 'CONDUCTOR\'S HANDBOOK', PANEL_RECT.x + 14, PANEL_RECT.y + 20, K.DIM, 6, 'left');
    label(ctx, 'PAGE ' + (this.step + 1) + '/' + TUTORIAL_STEPS.length, PANEL_RECT.x + PANEL_RECT.w - 14, PANEL_RECT.y + 20, K.DIM, 6, 'right');
    glyph(ctx, st.icon, KW / 2 - 15, 112, 30, st.col);
    label(ctx, st.t, KW / 2, 176, st.col, 11);
    // body text — wrapped, big, backed
    ctx.font = 'bold ' + Math.round(7 * 1.4) + 'px monospace';
    const words = st.b.split(/\s+/);
    const lines = [];
    let cur = '';
    for (const wd of words) {
      const test = cur ? cur + ' ' + wd : wd;
      if (ctx.measureText(test).width <= PANEL_RECT.w - 36 || !cur) cur = test;
      else { lines.push(cur); cur = wd; }
    }
    if (cur) lines.push(cur);
    lines.slice(0, 8).forEach((ln, i) => label(ctx, ln, KW / 2, 204 + i * 15, '#efeaf4', 7));
    label(ctx, st.tip, KW / 2, 336, K.CYAN, 6);
    // NEXT switch
    const nr = this._nextRect();
    steelButton(ctx, nr.x, nr.y, nr.w, nr.h, { tone: 2 });
    label(ctx, this.step === TUTORIAL_STEPS.length - 1 ? 'TAKE THE THROTTLE' : 'NEXT', nr.x + nr.w / 2, nr.y + 22, '#ffece6', 8);
    // progress dots
    for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
      const r = this._dotRect(i);
      ctx.beginPath(); ctx.arc(r.x + 5, r.y + 5, i === this.step ? 4 : 2.2, 0, TAU);
      ctx.fillStyle = i === this.step ? K.CRIM : '#4a4450';
      if (i < this.step) ctx.fillStyle = '#3ee08a';
      ctx.fill();
    }
    const sr = this._skipRect();
    steelButton(ctx, sr.x, sr.y, sr.w, sr.h, { tone: 0, r: 5 });
    label(ctx, 'SKIP \u00bb', sr.x + sr.w / 2, sr.y + 15, K.DIM, 6);
    drawToast(ctx, this.toast);
  }
}

const PANEL_RECT = { x: 22, y: 84, w: 226, h: 340 };
