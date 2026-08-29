// ============================================================
// HELL TRAIN — THE HELL FORGE (v1.4, shared UI kit)
// Permanent progression bought with coins: conductor tracks,
// train tracks, and skins. Fixed prices, shown before you buy.
// ============================================================
import { TAU, fmtNum } from '../core/utils.js';
import { PLAYER_TRACKS, TRAIN_TRACKS, trackCost, totalSpent } from '../data/shop.js';
import { CHAR_SKINS, TRAIN_SKINS } from '../data/skins.js';
import { spendShards, saveSave } from '../core/save.js';

// BOONS — one-time permanent perks, priced in shards, zero mystery
export const FORGE_BOONS = [
  { id: 'starterKit', name: "Conductor's Kit", cost: 120, icon: 'gift',
    desc: 'Every run starts with +1 reroll and +1 banish.' },
  { id: 'furnaceStart', name: 'Banked Coals', cost: 100, icon: 'fire',
    desc: 'Every run starts with the furnace half stoked.' },
  { id: 'extraBanish', name: 'Blacklist Ritual', cost: 150, icon: 'cross',
    desc: 'One extra banish on every run, forever.' },
];
import { SOUNDS } from '../core/sound.js';
import {
  KW, KH, K, tile, label, glyph, topBar, itemCard, drawTabs, List, drawToast,
} from './kit.js';

export class ShopScene {
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
    this.list = new List({ rowH: 48, top: 92, bottom: KH - 96 });
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
  items() {
    if (this.tab === 0) return PLAYER_TRACKS.map((t) => ({ kind: 'track', track: t }));
    if (this.tab === 1) return TRAIN_TRACKS.map((t) => ({ kind: 'track', track: t }));
    if (this.tab === 3) return FORGE_BOONS.map((b) => ({ kind: 'boon', boon: b }));
    return [...CHAR_SKINS.map((s) => ({ kind: 'charSkin', skin: s })), ...TRAIN_SKINS.map((s) => ({ kind: 'trainSkin', skin: s }))];
  }
  _levelOf(track) { return this.save.permaLevels?.[track.id] || 0; }
  _owned(item) {
    if (item.kind === 'charSkin') return (this.save.ownedCharSkins || []).includes(item.skin.id) || item.skin.cost === 0;
    if (item.kind === 'trainSkin') return (this.save.ownedTrainSkins || []).includes(item.skin.id) || item.skin.cost === 0;
    return false;
  }
  _equipped(item) {
    if (item.kind === 'charSkin') return this.save.charSkin === item.skin.id;
    if (item.kind === 'trainSkin') return this.save.trainSkin === item.skin.id;
    return false;
  }
  _price(item) {
    if (item.kind === 'track') { const l = this._levelOf(item.track); return l >= (item.track.max || 10) ? null : trackCost(item.track, l); }
    if (item.kind === 'boon') return (this.save.permaBoons || {})[item.boon.id] ? null : item.boon.cost;
    return this._owned(item) ? null : item.skin.cost;
  }
  _buy(item) {
    if (!item) return;
    const save = this.save;
    if (item.kind === 'boon') {
      const b = item.boon;
      save.permaBoons = save.permaBoons || {};
      if (save.permaBoons[b.id]) return this.say('ALREADY YOURS', K.GOLD);
      if (!spendShards(save, b.cost)) return this.say('NOT ENOUGH SHARDS', K.BAD);
      save.permaBoons[b.id] = true; saveSave(save);
      try { SOUNDS.levelup(); } catch {}
      return this.say(b.name.toUpperCase() + ' — YOURS FOREVER', K.GOLD);
    }
    if (item.kind === 'track') {
      const t = item.track; const l = this._levelOf(t);
      if (l >= (t.max || 10)) return this.say('ALREADY AT FULL RANK', K.GOLD);
      const cost = trackCost(t, l);
      if (!spendShards(save, cost)) return this.say('NOT ENOUGH SHARDS — ELITES AND CHESTS PAY SHARDS', K.BAD);
      save.permaLevels = save.permaLevels || {}; save.permaLevels[t.id] = l + 1;
      saveSave(save);
      try { SOUNDS.levelup(); } catch {}
      this.say(t.name.toUpperCase() + ' — RANK ' + (l + 1), K.OK);
    } else {
      const s = item.skin;
      const listKey = item.kind === 'charSkin' ? 'ownedCharSkins' : 'ownedTrainSkins';
      const eqKey = item.kind === 'charSkin' ? 'charSkin' : 'trainSkin';
      save[listKey] = save[listKey] || [];
      if (this._owned(item)) {
        if (save[eqKey] === s.id) return this.say('ALREADY EQUIPPED', '#9aa0b4');
        save[eqKey] = s.id; saveSave(save);
        this.say('EQUIPPED ' + s.name.toUpperCase(), K.OK);
      } else {
        if (!spendShards(save, s.cost)) return this.say('NOT ENOUGH SHARDS — ELITES AND CHESTS PAY SHARDS', K.BAD);
        save[listKey].push(s.id); save[eqKey] = s.id; saveSave(save);
        try { SOUNDS.chest(); } catch {}
        this.say('UNLOCKED ' + s.name.toUpperCase(), K.GOLD);
      }
    }
  }
  _say(msg, color) { this.say(msg, color); }
  say(msg, color = K.GOLD) { this.toast = { msg, color, t: 1.8 }; }
  hit(r) { const m = this._mouse; return m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h; }
  update(dt) {
    this.t += dt; this.pageT += dt;
    if (this.toast) { this.toast.t -= dt; if (this.toast.t <= 0) this.toast = null; }
    this._grace = Math.max(0, (this._grace || 0) - dt);
    const inp = this.engine.input;
    const items = this.items();
    this.list.max = items.length;
    if (inp?.wasPressed?.('Escape')) { saveSave(this.save); this.engine.setScene(this.from, { save: this.save }); return; }
    if (inp?.wasPressed?.('ArrowLeft')) { this.tab = (this.tab + 3) % 4; this.list.keyIndex = 0; this.list.scroll = 0; }
    if (inp?.wasPressed?.('ArrowRight')) { this.tab = (this.tab + 1) % 4; this.list.keyIndex = 0; this.list.scroll = 0; }
    let act = -1;
    if (inp?.wasPressed?.('ArrowDown')) act = this.list.scrollByKey(1);
    if (inp?.wasPressed?.('ArrowUp')) act = this.list.scrollByKey(-1);
    if (this._mouse.wheel) { this.list.wheelDelta(this._mouse.wheel); this._mouse.wheel = 0; }
    this.list.updateScroll(dt);
    this.list.hoverIndex = -1;
    const [a, b] = this.list.visibleRange();
    for (let i = a; i <= b; i++) if (this.hit(this.list.rowRect(i))) this.list.hoverIndex = i;
    if (!this._grace) {
      if (this._mouse.justDown) {
        for (let i = 0; i < 3; i++) { const r = { x: 8 + i * 86, y: 40, w: 80, h: 24 }; if (this.hit(r)) { this.tab = i; this.list.keyIndex = 0; this.list.scroll = 0; this._mouse.justDown = false; return; } }
        for (let i = a; i <= b; i++) if (this.hit(this.list.rowRect(i))) { this._buy(items[i]); this._mouse.justDown = false; return; }
      }
      if (inp?.wasPressed?.('Enter') && (act >= 0 ? act : this.list.keyIndex) >= 0) this._buy(items[act >= 0 ? act : this.list.keyIndex]);
    }
    this._mouse.justDown = false;
  }
  render(ctx) {
    // calm forge backdrop
    const g = ctx.createLinearGradient(0, 0, 0, KH);
    g.addColorStop(0, '#5a2410'); g.addColorStop(0.5, '#7a3214'); g.addColorStop(1, '#9a4618');
    ctx.fillStyle = g; ctx.fillRect(0, 0, KW, KH);
    for (const e of this.embers) {
      e.y -= (10 + e.s * 14) / 60;
      if (e.y < -4) { e.y = KH + 4; e.x = Math.random() * KW; }
      ctx.fillStyle = `rgba(255,150,50,${(0.14 + e.s * 0.2).toFixed(2)})`;
      ctx.fillRect(e.x | 0, e.y | 0, 1, e.s > 1 ? 2 : 1);
    }
    topBar(ctx, { title: 'THE FORGE', save: this.save, hover: null });
    label(ctx, 'The shard forge — ranks, skins and boons. Fixed prices, kept forever.', KW / 2, 40, K.SUB, 6);
    const tabs = ['CONDUCTOR', 'TRAIN', 'SKINS', 'BOONS'];
    const rects = drawTabs(ctx, tabs.map((t, i) => ({ id: i, label: t })), this.tab, 50);
    const items = this.items();
    const [a, b] = this.list.visibleRange();
    for (let i = a; i <= b; i++) {
      const item = items[i];
      const r = this.list.rowRect(i);
      const appear = Math.max(0, Math.min(1, (this.pageT - 0.05 - i * 0.04) * 3.4));
      if (item.kind === 'track') {
        const lvl = this._levelOf(item.track);
        const max = item.track.max || 10;
        const price = this._price(item);
        const isTrain = this.tab === 1;
        const color = isTrain ? '#8ef0ff' : '#ff8a30';
        itemCard(ctx, {
          ...r, icon: isTrain ? 'train' : 'heart', iconColor: color,
          name: item.track.name, desc: item.track.desc,
          right: price === null ? 'MAX RANK' : undefined,
          cost: price === null ? undefined : price,
          costOk: price !== null && (this.save.shards || 0) >= price,
          hover: this.list.hoverIndex === i, selected: this.list.keyIndex === i, appear,
        });
        // rank pips under the name
        for (let pi = 0; pi < max; pi++) {
          ctx.fillStyle = pi < lvl ? color : '#3a2e44';
          ctx.fillRect(r.x + 46 + pi * 7, r.y + 38, 5, 3);
        }
      } else if (item.kind === 'boon') {
        const owned = !!((this.save.permaBoons || {})[item.boon.id]);
        itemCard(ctx, {
          ...r, icon: item.boon.icon, iconColor: '#c07aff',
          name: item.boon.name, desc: item.boon.desc,
          owned,
          cost: owned ? undefined : item.boon.cost,
          costOk: (this.save.shards || 0) >= item.boon.cost,
          hover: this.list.hoverIndex === i, selected: this.list.keyIndex === i, appear,
        });
      } else {
        const owned = this._owned(item);
        itemCard(ctx, {
          ...r, icon: item.kind === 'charSkin' ? 'ghost' : 'train',
          iconColor: item.skin.pal?.glow || K.GOLD,
          name: item.skin.name, desc: item.skin.desc,
          equipped: this._equipped(item), owned,
          cost: owned ? undefined : item.skin.cost,
          costOk: (this.save.shards || 0) >= (item.skin.cost || 0),
          hover: this.list.hoverIndex === i, selected: this.list.keyIndex === i, appear,
        });
      }
    }
    this.list.drawScrollbar(ctx);
    label(ctx, 'Shards come from elites and chests. Every price here is shards.', KW / 2, KH - 12, K.DIM, 6);
    drawToast(ctx, this.toast);
  }
}
