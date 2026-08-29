// ============================================================
// HELL TRAIN — The Train: a second, fully upgradable combat system
// Animated engine + carriages, mounted weapons, ultimates,
// overdrive mode and permanent shop progression.
// ============================================================
import { rand, TAU, dist } from '../core/utils.js';
import { TRAIN_ULTIMATES } from '../data/realms.js';
import { applyTrainCarriages } from '../data/carriages.js';

export const TRAIN_GUNS = [
  { id: 'fire_cannon', name: 'Hellfire Cannon', dmg: 20, cd: 1.5, range: 240, color: '#ff5a33',
    kind: 'shot', sprite: 'orbFire', family: 'fire' },
  { id: 'gatling', name: 'Soul Gatling', dmg: 7, cd: 0.16, range: 190, color: '#ffe066',
    kind: 'shot', sprite: 'orbLight', family: 'plasma', spread: 0.22 },
  { id: 'tesla_mast', name: 'Tesla Mast', dmg: 26, cd: 1.1, range: 200, color: '#8ef0ff',
    kind: 'zap', family: 'lightning' },
  { id: 'mortar', name: 'Carriage Mortar', dmg: 46, cd: 2.6, range: 280, color: '#ff9033',
    kind: 'mortar', family: 'explosive', radius: 44 },
  { id: 'flame_jet', name: 'Furnace Jets', dmg: 8, cd: 0.22, range: 96, color: '#ff7a1a',
    kind: 'flame', family: 'fire' },
  { id: 'void_lens', name: 'Void Lens', dmg: 16, cd: 1.8, range: 210, color: '#bc84f4',
    kind: 'beam', family: 'void' },
  { id: 'frost_battery', name: 'Frost Battery', dmg: 14, cd: 1.2, range: 200, color: '#8ef0ff',
    kind: 'shot', sprite: 'orbIce', family: 'ice', slow: 0.4 },
  { id: 'satellites', name: 'Phantom Satellites', dmg: 11, cd: 0.5, range: 74, color: '#9c8ab8',
    kind: 'orbit', family: 'shadow' },
  { id: 'railgun', name: 'Terminus Railgun', dmg: 90, cd: 3.4, range: 420, color: '#c0c0d8',
    kind: 'rail', family: 'tech' },
  { id: 'siege_ram', name: 'Siege Ram', dmg: 40, cd: 0.5, range: 30, color: '#e8c848',
    kind: 'ram', family: 'physical' },
];
export const findGun = (id) => TRAIN_GUNS.find(g => g.id === id);

export class Train {
  constructor(x, y, art, difficulty, save) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.radius = 30;
    this.art = art;
    this.skinId = save?.trainSkin || 'iron_horse';
    this.set = art.getTrainSet(this.skinId);
    this.wheelPhase = 0;

    this.maxHp = 900 * (difficulty?.trainHp || 1);
    this.hp = this.maxHp;
    this.armour = 6;
    this.energy = 0; this.maxEnergy = 100;
    this.dmgMul = 1; this.fireRate = 1; this.energyRate = 1;
    this.repairRate = 0; this.ramDamage = 0; this.auraDamage = 0;
    this.lootBonus = 0; this.extraSlots = 0;
    this.overdrive = false; this.warMachine = false; this.finalStop = false;
    this.guardian = false; this.guardianCd = 0;
    this.invuln = 0; this.hitT = 0;
    this.t = 0;

    this.guns = ['fire_cannon', 'tesla_mast', 'satellites'];
    this.gunCd = {};
    this.orbiters = [];
    this.ultimateId = 'hellfire_express';
    this.ultimateCd = 0; this.ultimateT = 0;
    this.dead = false;
    this.carriages = ['cargo', 'gun'];
    // permanent carriage loadout (built on the train base between runs)
    applyTrainCarriages(this, save);
  }

  setSkin(id) { this.skinId = id; this.set = this.art.getTrainSet(id); }

  mountRandomWeapon() {
    const pool = TRAIN_GUNS.filter(g => !this.guns.includes(g.id));
    if (!pool.length) {
      // upgrade an existing one instead
      const g = findGun(this.guns[Math.floor(Math.random() * this.guns.length)]);
      if (g) this.dmgMul *= 1.1;
      return null;
    }
    const g = pool[Math.floor(Math.random() * pool.length)];
    this.guns.push(g.id);
    if (this.carriages.length < 5) this.carriages.push(Math.random() < 0.5 ? 'gun' : 'cargo');
    return g;
  }

  takeDamage(dmg, ctx) {
    if (this.invuln > 0) return 0;
    const dealt = Math.max(1, dmg - this.armour);
    this.hp -= dealt;
    this.hitT = 0.12;
    ctx?.fx.sparks(this.x + rand(-20, 20), this.y + rand(-10, 6), '#ffb040', 4, rand(0, TAU));
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
    return dealt;
  }
  repair(n) { this.hp = Math.min(this.maxHp, this.hp + n); }

  update(dt, ctx) {
    this.t += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.hitT > 0) this.hitT -= dt;
    if (this.guardianCd > 0) this.guardianCd -= dt;
    if (this.repairRate) this.repair(this.repairRate * dt);

    // --- movement: rolls along behind the player ---
    const p = ctx.player;
    const d = dist(this.x, this.y, p.x, p.y);
    const want = 96;
    if (d > want) {
      const a = Math.atan2(p.y - this.y, p.x - this.x);
      const spd = Math.min(190, 40 + (d - want) * 1.8);
      this.vx += (Math.cos(a) * spd - this.vx) * Math.min(1, dt * 3);
      this.vy += (Math.sin(a) * spd - this.vy) * Math.min(1, dt * 3);
    } else {
      this.vx *= Math.pow(0.15, dt); this.vy *= Math.pow(0.15, dt);
    }
    this.x += this.vx * dt; this.y += this.vy * dt;
    const speed = Math.hypot(this.vx, this.vy);
    this.wheelPhase = (this.wheelPhase + dt * (0.4 + speed * 0.02)) % 1;
    this.facing = this.vx < -6 ? -1 : this.vx > 6 ? 1 : (this.facing || 1);

    // --- smoke plume ---
    if (Math.random() < 0.5) {
      const sk = this.set.skin;
      ctx.fx.spawn({ x: this.x + 12 * (this.facing || 1), y: this.y - 26, vx: rand(-8, 8) - this.vx * 0.2,
        vy: rand(-26, -12), color: sk.pal.smoke, life: rand(0.7, 1.4), size: rand(2, 3.6),
        endSize: 6, additive: false, drag: 0.96, light: this.overdrive ? 0.3 : 0 });
    }
    if (this.overdrive && Math.random() < 0.7) {
      ctx.fx.embers(this.x + rand(-26, 26), this.y + rand(-8, 8), '#ff5a33', 2);
    }

    // --- energy ---
    this.energy = Math.min(this.maxEnergy, this.energy + 7 * this.energyRate * dt * (this.overdrive ? 2 : 1));
    if (this.ultimateCd > 0) this.ultimateCd -= dt;
    if (this.ultimateT > 0) {
      this.ultimateT -= dt;
      this._ultimateTick(dt, ctx);
    }
    if (this.finalStop && this.ultimateCd <= 0) this.activateUltimate(ctx, true);
    else if (this.energy >= this.maxEnergy && this.ultimateCd <= 0) this.activateUltimate(ctx, true);

    // --- aura ---
    if (this.auraDamage) {
      this._auraT = (this._auraT || 0) - dt;
      if (this._auraT <= 0) {
        this._auraT = 0.5;
        for (const e of ctx.enemiesInRange(this.x, this.y, 72)) {
          ctx.dealDamage(e, this.auraDamage * 0.5 * this.dmgMul, { family: 'fire', small: true, byTrain: true });
        }
        ctx.fx.ring(this.x, this.y, 72, '#ff7a33', 0.3, 1);
      }
    }
    // --- ram ---
    if (this.ramDamage && speed > 30) {
      for (const e of ctx.enemiesInRange(this.x, this.y, this.radius + 6)) {
        if ((e._ramCd || 0) > this.t) continue;
        e._ramCd = this.t + 0.4;
        ctx.dealDamage(e, this.ramDamage * this.dmgMul, { family: 'physical', knockback: 160, byTrain: true });
        ctx.fx.sparks(e.x, e.y, '#ffe066', 6, Math.atan2(e.y - this.y, e.x - this.x));
      }
    }

    // --- guns ---
    const rate = this.fireRate * (this.overdrive ? 1.8 : 1);
    for (const id of this.guns) {
      const g = findGun(id);
      if (!g) continue;
      this.gunCd[id] = (this.gunCd[id] || 0) - dt * rate;
      if (this.gunCd[id] > 0) continue;
      const range = this.warMachine ? g.range * 2.2 : g.range;
      const shots = this.warMachine ? 2 : 1;
      let fired = false;
      for (let i = 0; i < shots; i++) fired = this._fireGun(g, range, ctx) || fired;
      if (fired) this.gunCd[id] = g.cd;
      else this.gunCd[id] = 0.15;
    }

    // --- orbiting satellites ---
    if (this.guns.includes('satellites')) {
      if (this.orbiters.length < 3) this.orbiters.push({ ang: this.orbiters.length * 2.1 });
      for (const o of this.orbiters) {
        o.ang += dt * 2.4;
        o.x = this.x + Math.cos(o.ang) * 46;
        o.y = this.y + Math.sin(o.ang) * 30;
        for (const e of ctx.enemiesInRange(o.x, o.y, 10)) {
          if ((e._satCd || 0) > this.t) continue;
          e._satCd = this.t + 0.4;
          ctx.dealDamage(e, 11 * this.dmgMul, { family: 'shadow', small: true, byTrain: true });
        }
      }
    }
  }

  _fireGun(g, range, ctx) {
    const targets = ctx.enemiesInRange(this.x, this.y, range);
    if (ctx.boss?.alive && dist(this.x, this.y, ctx.boss.x, ctx.boss.y) < range) targets.push(ctx.boss);
    if (!targets.length && g.kind !== 'ram') return false;
    targets.sort((a, b) => dist(this.x, this.y, a.x, a.y) - dist(this.x, this.y, b.x, b.y));
    const t = targets[0];
    const dmg = g.dmg * this.dmgMul;
    const a = t ? Math.atan2(t.y - this.y, t.x - this.x) : 0;
    switch (g.kind) {
      case 'shot':
        ctx.spawnProjectile({
          x: this.x + Math.cos(a) * 18, y: this.y - 10 + Math.sin(a) * 8,
          vx: Math.cos(a + rand(-(g.spread || 0), g.spread || 0)) * 260,
          vy: Math.sin(a + rand(-(g.spread || 0), g.spread || 0)) * 260,
          life: 1.4, dmg, pierce: 1, color: g.color, sprite: g.sprite, owner: 'train',
          size: 4, family: g.family, slow: g.slow, slowDur: g.slow ? 1.4 : 0,
        });
        ctx.fx.sparks(this.x + Math.cos(a) * 20, this.y - 10, g.color, 4, a);
        break;
      case 'zap':
        ctx.fx.lightning(this.x, this.y - 20, t.x, t.y, g.color);
        ctx.dealDamage(t, dmg, { family: g.family, byTrain: true });
        break;
      case 'mortar':
        ctx.spawnMeteor(t.x, t.y, dmg, g.radius);
        break;
      case 'flame':
        ctx.spawnFlame(this.x, this.y - 8, a, g.range, dmg);
        for (const e of ctx.enemiesInRange(this.x, this.y, g.range)) {
          const ea = Math.atan2(e.y - this.y, e.x - this.x);
          if (Math.abs(((ea - a + Math.PI * 3) % TAU) - Math.PI) < 0.6) {
            ctx.dealDamage(e, dmg, { family: 'fire', small: true, byTrain: true });
          }
        }
        break;
      case 'beam':
        ctx.fx.beam(this.x, this.y - 14, t.x, t.y, g.color, 5, 0.22);
        for (const e of ctx.enemiesInRange(t.x, t.y, 34)) ctx.dealDamage(e, dmg, { family: 'void', byTrain: true });
        break;
      case 'rail': {
        const ex = this.x + Math.cos(a) * g.range, ey = this.y + Math.sin(a) * g.range;
        ctx.fx.beam(this.x, this.y - 16, ex, ey, g.color, 9, 0.35);
        ctx.fx.shakeScreen(6, 0.25);
        for (const e of ctx.enemies) {
          if (!e.alive) continue;
          const proj = (e.x - this.x) * Math.cos(a) + (e.y - this.y) * Math.sin(a);
          if (proj < 0 || proj > g.range) continue;
          const px = this.x + Math.cos(a) * proj, py = this.y + Math.sin(a) * proj;
          if (dist(px, py, e.x, e.y) < e.radius + 10) ctx.dealDamage(e, dmg, { family: 'tech', byTrain: true });
        }
        break;
      }
      case 'orbit': return true;
      case 'ram': return false;
    }
    return true;
  }

  activateUltimate(ctx, auto = false) {
    if (this.ultimateCd > 0) return false;
    if (!this.finalStop && this.energy < this.maxEnergy * 0.5) return false;
    this.energy = 0;
    this.ultimateCd = this.finalStop ? 5 : (this.overdrive ? 14 : 24);
    this.ultimateT = 3.5;
    const def = TRAIN_ULTIMATES.find(u => u.id === this.ultimateId) || TRAIN_ULTIMATES[0];
    this.ultDef = def;
    ctx.fx.banner(this.x, this.y - 48, def.name.toUpperCase(), def.color);
    ctx.fx.shakeScreen(10, 0.5);
    ctx.camera?.punch(0.06);
    ctx.fx.explosion(this.x, this.y, 'explFire', 2.2, { lightColor: def.color });
    return true;
  }

  _ultimateTick(dt, ctx) {
    const def = this.ultDef || TRAIN_ULTIMATES[0];
    this._ultAcc = (this._ultAcc || 0) + dt;
    if (this._ultAcc < 0.12) return;
    this._ultAcc = 0;
    const dmg = (def.dmg || 8) * this.dmgMul * 2;
    if (def.beam) {
      const a = Math.atan2(ctx.player.y - this.y, ctx.player.x - this.x);
      const ex = this.x + Math.cos(a) * 480, ey = this.y + Math.sin(a) * 480;
      ctx.fx.beam(this.x, this.y - 16, ex, ey, def.color, 12, 0.2);
      for (const e of ctx.enemies) {
        if (!e.alive) continue;
        const proj = (e.x - this.x) * Math.cos(a) + (e.y - this.y) * Math.sin(a);
        if (proj < 0 || proj > 480) continue;
        const px = this.x + Math.cos(a) * proj, py = this.y + Math.sin(a) * proj;
        if (dist(px, py, e.x, e.y) < e.radius + 18) ctx.dealDamage(e, dmg, { family: 'tech', byTrain: true });
      }
    } else if (def.pull) {
      for (const e of ctx.enemiesInRange(this.x, this.y, 260)) {
        const a = Math.atan2(this.y - e.y, this.x - e.x);
        e.x += Math.cos(a) * 130 * 0.12; e.y += Math.sin(a) * 130 * 0.12;
        ctx.dealDamage(e, dmg * 0.4, { family: 'void', small: true, byTrain: true });
      }
    } else if (def.lightning) {
      const list = ctx.enemiesInRange(this.x, this.y, 260);
      for (let i = 0; i < Math.min(4, list.length); i++) {
        const e = list[Math.floor(Math.random() * list.length)];
        ctx.fx.lightning(this.x, this.y - 30, e.x, e.y, def.color);
        ctx.dealDamage(e, dmg, { family: 'lightning', byTrain: true });
      }
    } else {
      // hellfire express: burning wake
      for (const e of ctx.enemiesInRange(this.x, this.y, 130)) {
        ctx.dealDamage(e, dmg * 0.6, { family: 'fire', small: true, byTrain: true });
      }
      ctx.fx.ring(this.x, this.y, 130, def.color, 0.3, 2);
      ctx.fx.embers(this.x + rand(-40, 40), this.y + rand(-16, 16), def.color, 3);
    }
  }
}
