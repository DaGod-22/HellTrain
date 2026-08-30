// ============================================================
// HELL TRAIN — COIN SHOP (v1.4, shared UI kit)
// Ranked permanent upgrades for coins. Every rank lists its price
// and exactly what it gives — ranks unlock in order.
// ============================================================
import { fmtNum } from '../core/utils.js';
import { COIN_SHOP } from '../data/progression.js';
import { saveSave, spendCoins } from '../core/save.js';
import { SOUNDS } from '../core/sound.js';
import {
  KW, KH, K, tile, label, glyph, topBar, itemCard, drawTabs, List, drawToast,
} from './kit.js';

const CAT_META = {
  maxHP: { label: 'Vitality', icon: 'heart', color: '#4ec53c' },
  attackDamage: { label: 'Power', icon: 'fire', color: '#ff8a30' },
  attackSpeed: { label: 'Haste', icon: 'bolt', color: '#ffe066' },
  critChance: { label: 'Precision', icon: 'target', color: '#ff4d6a' },
  dodge: { label: 'Evasion', icon: 'ghost', color: '#c07aff' },
  cooldownReduction: { label: 'Focus', icon: 'clock', color: '#8ef0ff' },
  hp: { label: 'Frame', icon: 'train', color: '#8ef0ff' },
  damage: { label: 'Cannons', icon: 'gun', color: '#ff8a30' },
  fireRate: { label: 'Rapid Load', icon: 'charge', color: '#ffe066' },
  armour: { label: 'Plating', icon: 'shield', color: '#9aa0b4' },
};

export class CoinShopScene {
  constructor(engine) {
    this.engine = engine; this.t = 0; this.pageT = 0; this.tab = 0; this.toast = null;
    this.embers = [];
    for (let i = 0; i < 24; i++) this.embers.push({ x: Math.random() * KW, y: Math.random() * KH, s: 0.4 + Math.random() });
    this._mouse = { x: KW / 2, y: KH / 2, down: false, justDown: false };
    const c = engine.canvas;
    c.addEventListener('mousemove', (e) => { const r = c.getBoundingClientRect(); this._mouse.x = (e.clientX - r.left) / r.width * KW; this._mouse.y = (e.clientY - r.top) / r.height * KH; });
    c.addEventListener('mousedown', (e) => { if (e.button === 0) { this._mouse.down = true; this._mouse.justDown = true; } });
    c.addEventListener('mouseup', (e) => { if (e.button === 0) this._mouse.down = false; });
    c.addEventListener('wheel', (e) => { e.preventDefault(); this._mouse.wheel = (this._mouse.wheel || 0) + e.deltaY; }, { passive: false });
    this.list = new List({ rowH: 48, top: 92, bottom: KH - 40 });
  }
  enter(p) {
    this.save = p.save || this.engine.save;
    this.from = p.from || 'menu';
    this.engine.setResolution?.(KW, KH);
    this.t = 0; this.pageT = 0; this.toast = null;
    this.list.keyIndex = 0; this.list.scroll = 0;
    this._grace = 0.15;
    this._mouse.wheel = 0;
  }
  exit() { saveSave(this.save); this.engine.resetResolution?.(); }
  hit(r) { const m = this._mouse; return m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h; }
  say(msg, color = K.GOLD) { this.toast = { msg, color, t: 1.8 }; }

  // One row per upgrade category: current rank -> next rank (price shown).
  items() {
    const out = [];
    const group = this.tab === 0 ? COIN_SHOP.CHARACTER : COIN_SHOP.TRAIN;
    const owned = this.save.coinShopUpgrades || {};
    for (const [cat, ranks] of Object.entries(group)) {
      const lvl = owned[cat] || 0;
      const next = ranks.find((r) => r.level === lvl + 1) || null;
      out.push({ cat, ranks, lvl, next, meta: CAT_META[cat] || { label: cat, icon: 'gear', color: '#ffb4e4' } });
    }
    return out;
  }
  _buy(it) {
    if (!it) return;
    if (!it.next) return this.say('FULLY RANKED', K.GOLD);
    if (this.save.coinShopUpgrades?.[it.cat] !== it.lvl) return this.say('BUY THE PREVIOUS RANK FIRST', K.BAD);
    if (!spendCoins(this.save, it.next.cost)) return this.say('NOT ENOUGH COINS', K.BAD);
    this.save.coinShopUpgrades = this.save.coinShopUpgrades || {};
    this.save.coinShopUpgrades[it.cat] = it.next.level;
    saveSave(this.save);
    try { SOUNDS.levelup(); } catch {}
    this.say(it.next.label.toUpperCase() + ' — RANK ' + it.next.level, K.OK);
  }
  update(dt) {
    this.t += dt; this.pageT += dt;
    if (this.toast) { this.toast.t -= dt; if (this.toast.t <= 0) this.toast = null; }
    this._grace = Math.max(0, (this._grace || 0) - dt);
    const inp = this.engine.input;
    if (inp?.wasPressed?.('Escape')) { saveSave(this.save); this.engine.setScene(this.from, { save: this.save }); return; }
    if (inp?.wasPressed?.('ArrowLeft')) { this.tab = (this.tab + 1) % 2; this.list.keyIndex = 0; this.list.scroll = 0; }
    if (inp?.wasPressed?.('ArrowRight')) { this.tab = (this.tab + 1) % 2; this.list.keyIndex = 0; this.list.scroll = 0; }
    this.list.max = this.items().length;
    let act = -1;
    if (inp?.wasPressed?.('ArrowDown')) act = this.list.scrollByKey(1);
    if (inp?.wasPressed?.('ArrowUp')) act = this.list.scrollByKey(-1);
    if (this._mouse.wheel) { this.list.wheelDelta(this._mouse.wheel); this._mouse.wheel = 0; }
    this.list.updateScroll(dt);
    this.list.hoverIndex = -1;
    const items = this.items();
    const [a, b] = this.list.visibleRange();
    for (let i = a; i <= b; i++) if (this.hit(this.list.rowRect(i))) this.list.hoverIndex = i;
    if (!this._grace) {
      if (this._mouse.justDown) {
        for (let i = 0; i < 2; i++) { const r = { x: 8 + i * 127, y: 50, w: 127, h: 24 }; if (this.hit(r)) { this.tab = i; this.list.keyIndex = 0; this.list.scroll = 0; this._mouse.justDown = false; return; } }
        for (let i = a; i <= b; i++) if (this.hit(this.list.rowRect(i))) { this._buy(items[i]); this._mouse.justDown = false; return; }
      }
      if (inp?.wasPressed?.('Enter') && (act >= 0 ? act : this.list.keyIndex) >= 0) this._buy(items[act >= 0 ? act : this.list.keyIndex]);
    }
    this._mouse.justDown = false;
  }
  render(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, KH);
    g.addColorStop(0, '#1c1430'); g.addColorStop(0.55, '#241a3a'); g.addColorStop(1, '#2c2044');
    ctx.fillStyle = g; ctx.fillRect(0, 0, KW, KH);
    for (const e of this.embers) {
      e.y -= (8 + e.s * 10) / 60;
      if (e.y < -4) { e.y = KH + 4; e.x = Math.random() * KW; }
      ctx.fillStyle = `rgba(192,122,255,${(0.10 + e.s * 0.14).toFixed(2)})`;
      ctx.fillRect(e.x | 0, e.y | 0, 1, 1);
    }
    topBar(ctx, { title: 'THE COIN WORKS', save: this.save, hover: null });
    label(ctx, 'COINS only — permanent rank upgrades. Shards shop at the Forge.', KW / 2, 40, K.SUB, 6);
    drawTabs(ctx, [{ id: 0, label: 'CONDUCTOR' }, { id: 1, label: 'TRAIN' }], this.tab, 50);
    const items = this.items();
    const [a, b] = this.list.visibleRange();
    for (let i = a; i <= b; i++) {
      const it = items[i];
      const r = this.list.rowRect(i);
      const appear = Math.max(0, Math.min(1, (this.pageT - 0.05 - i * 0.045) * 3.4));
      const maxed = !it.next;
      itemCard(ctx, {
        ...r, icon: it.meta.icon, iconColor: it.meta.color,
        name: it.meta.label,
        desc: maxed
          ? 'Full rank — ' + it.ranks[it.ranks.length - 1].desc
          : `Rank ${it.lvl}/5 · next: ${it.next.desc}`,
        right: maxed ? 'MAX RANK' : undefined,
        cost: maxed ? undefined : it.next.cost,
        costOk: !maxed && (this.save.coins || 0) >= it.next.cost,
        hover: this.list.hoverIndex === i, selected: this.list.keyIndex === i, appear,
      });
      // rank pips
      for (let pi = 0; pi < 5; pi++) {
        ctx.fillStyle = pi < it.lvl ? it.meta.color : '#3a2e44';
        ctx.fillRect(r.x + 46 + pi * 7, r.y + 38, 5, 3);
      }
    }
    this.list.drawScrollbar(ctx);
    drawToast(ctx, this.toast);
  }
}
