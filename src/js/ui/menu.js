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
import { saveSave, spendCoins } from '../core/save.js';
import { AUTH } from '../systems/auth.js';
import { SOUNDS } from '../core/sound.js';
import {
  KW, KH, K, tile, label, outlineText, glyph, roundPath, inRect,
  topBar, itemCard, drawTabs, button, List, drawToast, sectionLabel,
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
      { icon: 'star', color: '#c07aff', name: 'Leaderboard', desc: 'Best runs on this station', scene: 'leaderboards' },
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
    label(ctx, `${diff.name.toUpperCase()} — foes x${diff.enemyHp} health, x${diff.enemyDmg} damage, x${diff.lootMult} coins`, KW / 2, 84, K.SUB, 6);
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
        right: `M${'12345'[Math.max(0, (nextMilestone(kills)?.level || 6) - 2)]}` ,
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
        right: got ? 'DONE' : 'LOCKED', owned: got, locked: !got,
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
    this.scores = []; this.loading = true;
    this.engine.supabase?.topScores?.(10).then((s) => { this.scores = s || []; this.loading = false; }).catch(() => { this.loading = false; });
  }
  update(dt) {
    const m = super.base(dt);
    if (!m) return;
    if (!m.down) this._press = null;
    m.justDown = false;
  }
  render(ctx) {
    lavaBackground(ctx, this.t, this.embers);
    topBar(ctx, { title: 'LEADERBOARD', save: this.save, hover: null });
    const board = AUTH.getLeaderboard();
    sectionLabel(ctx, 'THIS STATION', 56);
    board.slice(0, 8).forEach((u, i) => {
      const y = 66 + i * 26;
      tile(ctx, 8, y, KW - 16, 22, 7, { fill: i === 0 ? '#3a2a1a' : K.PANEL, fillLo: K.PANEL_LO, outline: i === 0 ? K.GOLD : K.INK, lift: 1 });
      label(ctx, (i + 1) + '. ' + (u.username || 'CONDUCTOR').toUpperCase().slice(0, 16), 14, y + 15, i === 0 ? K.GOLD : K.TXT, 7, 'left');
      label(ctx, 'LVL ' + (u.level || 1), KW - 14, y + 15, K.BLUE, 6, 'right');
    });
    if (!board.length) label(ctx, 'No local runs yet — take the train out.', KW / 2, 90, K.DIM, 6);
    sectionLabel(ctx, 'THE WIDER LINE — ONLINE', 288);
    if (this.loading) label(ctx, 'Reaching the network…', KW / 2, 310, K.DIM, 7);
    else if (!this.scores.length) label(ctx, 'Offline — showing local runs only.', KW / 2, 310, K.DIM, 6);
    (this.scores || []).slice(0, 6).forEach((s, i) => {
      const y = 300 + i * 26;
      tile(ctx, 8, y, KW - 16, 22, 7, { fill: K.PANEL, fillLo: K.PANEL_LO, outline: K.INK, lift: 1 });
      label(ctx, (i + 1) + '. ' + String(s.player_id || 'ANON').slice(0, 12), 14, y + 15, K.TXT, 7, 'left');
      label(ctx, fmtNum(s.score || 0), KW - 14, y + 15, K.GOLD, 7, 'right');
    });
    drawToast(ctx, this.toast);
  }
}

// ====================================================================
// DAILY RUN
// ====================================================================
export class DailyRunScene extends Page {
  enter(p) {
    super.enter(p);
    const d = new Date();
    const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    this.seed = seed;
    this.realm = REALMS[seed % REALMS.length];
    this.played = (this.save.dailyRuns || []).includes(String(seed));
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
    label(ctx, 'A fresh sector every midnight. Score is compared on the leaderboard.', KW / 2, 270, K.DIM, 6);
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
    this.challenge = WEEKLY_CHALLENGES[wk % WEEKLY_CHALLENGES.length];
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
    label(ctx, 'Hard difficulty · Purgatory', KW / 2, 146, K.DIM, 6);
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
  enter(p) { super.enter(p); this.params = p; this.anim = 0; }
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
  enter(p) { super.enter(p); this.ctx2 = p.ctx; }
  _goBack() { if (this.ctx2?.gameplay) this.engine.resumeScene(this.ctx2.gameplay); else this.engine.setScene('menu', { save: this.save }); }
  _buttons() {
    const w = 150, x = KW / 2 - w / 2;
    return [
      { label: 'RESUME', y: 150, x, w, h: 34, act: 'resume', color: K.GREEN },
      { label: 'SETTINGS', y: 192, x, w, h: 34, act: 'settings', color: K.BLUE },
      { label: 'END RUN', y: 234, x, w, h: 34, act: 'quit', color: K.RED },
    ];
  }
  update(dt) {
    const m = super.base(dt);
    if (!m) return;
    if (!this.grace(dt) && m.justDown) {
      for (const b of this._buttons()) {
        if (this.hit(b)) {
          if (b.act === 'resume') this.engine.resumeScene(this.ctx2.gameplay);
          else if (b.act === 'settings') this.engine.setScene('settings', { save: this.save, from: 'pause', ctx: this.ctx2 });
          else this.engine.setScene('runSummary', {
            save: this.save, realmId: this.ctx2?.gameplay?.realmId, stage: this.ctx2?.gameplay?.stage,
            runStats: this.ctx2?.gameplay?.runStats, time: this.ctx2?.gameplay?.runTime,
            sectorDuration: this.ctx2?.gameplay?.sectorDuration, victory: false,
            coins: 0, level: this.ctx2?.gameplay?.player?.level, owned: this.ctx2?.gameplay?.owned,
            dmgByWeapon: this.ctx2?.gameplay?.runStats?.dmgByWeapon, dmgOther: this.ctx2?.gameplay?.runStats?.dmgOther,
            cause: 'RUN ENDED AT THE PAUSE SIGNAL',
          });
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
    tile(ctx, KW / 2 - 90, 100, 180, 200, 14, { fill: '#20182c', fillLo: '#140e1e', outline: K.INK, ring: K.GOLD, ringW: 2, lift: 5 });
    outlineText(ctx, 'PAUSED', KW / 2, 130, '#ffffff', '#5a1a08', 16);
    label(ctx, 'The void waits. The schedule doesn\'t.', KW / 2, 148, K.SUB, 6);
    for (const b of this._buttons()) {
      const hov = this.hit(b);
      button(ctx, b, b.label, { color: b.color, hover: hov, size: 9 });
    }
    drawToast(ctx, this.toast);
  }
}

// ====================================================================
// PROFILE — account + lifetime record
// ====================================================================
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
      const tabs = ['ACCOUNT', 'RECORD'];
      for (let i = 0; i < 2; i++) { const r = { x: 8 + i * 127, y: 40, w: 127, h: 24 }; if (this.hit(r)) { this.tab = i; m.justDown = false; return; } }
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
    const tabs = ['ACCOUNT', 'RECORD'];
    tabs.forEach((lb, i) => {
      const r = { x: 8 + i * 127, y: 40, w: 127, h: 24 };
      const active = this.tab === i;
      tile(ctx, r.x, r.y, r.w, r.h, 8, { fill: active ? K.PANEL_ACT : '#241a2e', fillLo: K.PANEL_LO, outline: K.INK, ring: active ? K.GOLD : null, ringW: 2, lift: active ? 3 : 1 });
      label(ctx, lb, r.x + r.w / 2, r.y + 16, active ? K.GOLD : K.SUB, 7);
    });
    if (this.tab === 1) {
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
