// ============================================================
// HELL TRAIN — The Conductor (player entity)
// Animation state machine + the whole weapon dispatch.
// ============================================================
import { WEAPONS, ABILITIES, findWeapon } from '../data/weapons.js';
import { findEvolution } from '../data/evolutions.js';
import { rand, clamp, dist, TAU } from '../core/utils.js';
import { SOUNDS } from '../core/sound.js';

const DIRS = ['down', 'up', 'side'];

export class Player {
  constructor(x, y, art, save) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.radius = 7;
    this.facing = 'down'; this.flip = false;
    this.art = art;
    this.skinId = save?.charSkin || 'conductor';
    this.set = art.getCharSet(this.skinId);
    this.state = 'idle'; this.animT = 0; this.frame = 0;
    this.alive = true; this.invuln = 0; this.hitT = 0; this.deathT = 0;

    // --- base stats ---
    this.maxHp = 120; this.hp = 120;
    this.armour = 0;
    this.atkDmg = 1; this.atkSpd = 1; this.moveSpd = 1;
    this.crit = 0.06; this.critDmg = 1.6;
    this.cdr = 1;
    this.pickupRange = 68;
    this.regen = 0; this.dodge = 0; this.lifesteal = 0;
    this.burnDmg = 0; this.burnDur = 0;
    this.chill = 0; this.chain = 0;
    this.pierceBonus = 0; this.extraProjectiles = 0;
    this.projSpeedMult = 1;
    this.shield = 0; this.shieldAmount = 0; this.shieldTimer = undefined;
    this.knockback = 0; this.thorns = 0;
    this.coinMult = 1; this._xpGain = 1;
    this.execute = false; this.executeMult = 1;
    this.eclipse = false; this.eclipseMax = 0;
    this.momentum = 0; this.momentumStacks = 0;
    this.frenzy = 0; this.frenzyStacks = 0; this.frenzyT = 0;
    this.revive = 0; this.luck = 0;
    this.doubleCast = 0; this.corpseBoom = 0;
    this.killHeal = 0; this.killTrainEnergy = 0;
    this.apocalypse = false; this.apocalypseBurn = 0;
    this.omegaRound = 0; this._shotCount = 0;
    this.hellsplit = 0; this.extinction = 0; this._extinctionT = 20;
    this.freeRerolls = 0; this.startLevelBonus = 0;
    this.aoeMult = 1; this.autoInvuln = null; this.autoDodge = null; this.screenWipe = 0;
    this.rootT = 0; this.orbitBarrage = false; this.orbitBarrageDmg = 0; this._orbitBarrageT = 0;

    // --- progression ---
    this.xp = 0; this.level = 1; this.score = 0; this.kills = 0;
    this.combo = 0; this.comboT = 0; this.bestCombo = 0;

    // --- loadout ---
    this.weapons = []; this.weaponStates = {};
    this.orbitals = []; this.drones = []; this.turrets = [];
    this.lastShot = null;           // ECHO SHARD: snapshot of the previous shot
    this.abilities = []; this.abilityStates = {};
    this.addAbility('dodge');
    this.t = 0;
    this._tempest = 0;
  }

  setSkin(id) {
    this.skinId = id;
    this.set = this.art.getCharSet(id);
  }

  // ---------- loadout ----------
  hasWeapon(id) { return this.weapons.some(w => w.id === id); }
  addWeapon(id) {
    if (this.hasWeapon(id)) { this.upgradeWeapon(id); return; }
    const base = findWeapon(id);
    if (!base) return;
    const w = { ...base };
    this.weapons.push(w);
    this.weaponStates[id] = { cd: 0, level: 1, burst: 0, burstT: 0 };
    if (w.behavior === 'orbital') this._syncOrbitals(w);
    if (w.behavior === 'drones') this._syncDrones(w);
  }
  upgradeWeapon(id) {
    const w = this.weapons.find(x => x.id === id);
    if (!w) return;
    const s = this.weaponStates[id];
    s.level += 1;
    if (w.curve) Object.assign(w, w.curve(s.level));
    if (w.behavior === 'orbital') this._syncOrbitals(w);
    if (w.behavior === 'drones') this._syncDrones(w);
    if (!w.evolved && s.level >= 5) this.evolveWeapon(id);
  }
  // Weapon mastery 5 -> named EVOLUTION (build-defining moment)
  evolveWeapon(id) {
    const w = this.weapons.find(x => x.id === id);
    if (!w || w.evolved) return false;
    const evo = findEvolution(id);
    if (!evo) return false;
    evo.apply(w, this);
    w.evolved = true; w.evolution = evo.id;
    if (w.behavior === 'orbital') this._syncOrbitals(w);
    if (w.behavior === 'drones') this._syncDrones(w);
    return true;
  }
  weaponLevel(id) { return this.weaponStates[id]?.level || 0; }
  addAbility(id) {
    if (this.abilities.some(a => a.id === id)) return;
    const a = ABILITIES.find(x => x.id === id);
    if (!a) return;
    this.abilities.push({ ...a });
    this.abilityStates[id] = { cd: 0 };
  }
  modMult(key, mult) {
    if (key === 'atkDmg') this.atkDmg = Math.min(5, this.atkDmg * mult);
    else if (key === 'atkSpd') this.atkSpd = Math.min(3, this.atkSpd * mult);
    else if (key === 'moveSpd') this.moveSpd = Math.min(2.5, this.moveSpd * mult);
    else if (key === 'critDmg') this.critDmg = Math.min(4, this.critDmg * mult);
    else if (key === 'cdr') this.cdr = Math.min(2.2, this.cdr * mult);
    else if (key === 'pickupRange') this.pickupRange = Math.min(180, this.pickupRange * mult);
    else if (key === 'xpGain') this._xpGain = Math.min(3, this._xpGain * mult);
  }
  clampChaos(){
    this.extraProjectiles = Math.min(2, this.extraProjectiles||0);
    this.chain = Math.min(3, this.chain||0);
    this.pierceBonus = Math.min(3, this.pierceBonus||0);
    this.doubleCast = Math.min(0.25, this.doubleCast||0);
  }

  _syncOrbitals(w) {
    const want = Math.min(4, (w.baseCount || 2) + (this.apocalypse ? 1 : 0));
    this.orbitals = [];
    for (let i = 0; i < want; i++) {
      this.orbitals.push({ ang: (i / want) * TAU, r: w.baseRadius, spd: w.baseSpeed,
        dmg: w.dmg, size: w.baseSize || 7, weapon: w.id, color: w.color, hitCd: {} });
    }
  }
  _syncDrones(w) {
    const want = Math.min(3, w.droneCount || 2);
    while (this.drones.length < want) {
      this.drones.push({ ang: Math.random() * TAU, r: 26 + Math.random() * 10, cd: 0,
        x: this.x, y: this.y, weapon: w.id });
    }
    this.drones.length = want;
  }

  // ---------- progression ----------
  xpNeeded() { return Math.floor(9 + this.level * 5 + Math.pow(this.level, 1.42)); }
  gainXp(amount) {
    this.xp += amount * this._xpGain;
    let levels = 0;
    while (this.xp >= this.xpNeeded() && levels < 40) {
      this.xp -= this.xpNeeded();
      this.level += 1; levels++;
      this.onLevelUp?.();
    }
  }
  addCombo() {
    this.combo += 1; this.comboT = 3.0;
    if (this.combo > this.bestCombo) this.bestCombo = this.combo;
  }
  get comboMult() { return 1 + Math.min(0.5, this.combo * 0.01); }

  // ---------- damage ----------
  takeDamage(dmg, ctx, src) {
    if (this.invuln > 0 || !this.alive) return 0;
    if (this.dodge > 0 && Math.random() < this.dodge) {
      ctx?.fx.damageText(this.x, this.y - 16, 'DODGE', '#8ef0ff', { size: 7 });
      return 0;
    }
    let dealt = Math.max(1, dmg - this.armour);
    if (this.shield > 0) {
      const abs = Math.min(this.shield, dealt);
      this.shield -= abs; dealt -= abs;
      ctx?.fx.ring(this.x, this.y, 18, '#ffe066', 0.2);
    }
    this.hp -= dealt;
    this.hitT = 0.16;
    this.combo = 0;
    if (this.thorns && src && src.takeDamage) src.takeDamage(this.thorns, { family: 'physical' });
    if (this.hp <= 0) {
      if (this.revive > 0) {
        this.revive -= 1; this.hp = this.maxHp * 0.6; this.invuln = 2.2;
        ctx?.onRevive?.(this);
        return dealt;
      }
      if (this.undying && !this.undyingActive) {
        this.undyingActive = true; this.undyingT = 4; this.hp = 1; this.invuln = 0.6;
        ctx?.fx.banner(this.x, this.y - 30, 'UNDYING', '#ff4d6a');
        return dealt;
      }
      this.alive = false; this.deathT = 1.4;
    } else {
      this.invuln = 0.45;
    }
    return dealt;
  }
  heal(amount) {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    const over = amount - (this.hp - before);
    if (over > 0 && this.overheal) this.shield = Math.min(this.maxHp, this.shield + over * this.overheal);
  }

  // ---------- update ----------
  update(dt, ctx) {
    this.t += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.hitT > 0) this.hitT -= dt;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    if (this.regen) this.heal(this.regen * dt);
    if (this.apocalypseBurn) {
      this.hp -= this.maxHp * this.apocalypseBurn * dt;
      if (this.hp <= 1) this.hp = 1;
    }
    // periodic invulnerability window (tiered card: 'Temporal Bulwark')
    if (this.autoInvuln) {
      this.autoInvuln.t -= dt;
      if (this.autoInvuln.t <= 0) {
        this.autoInvuln.t = this.autoInvuln.cd;
        this.invuln = Math.max(this.invuln, this.autoInvuln.dur);
        ctx?.fx?.ring(this.x, this.y, 22, '#8ef0ff', 0.4, 3);
        ctx?.fx?.banner?.(this.x, this.y - 26, 'PHASED', '#8ef0ff');
      }
    }
    // automatic dodge pulse (tiered card)
    if (this.autoDodge) {
      this.autoDodge.t -= dt;
      if (this.autoDodge.t <= 0) {
        this.autoDodge.t = this.autoDodge.every;
        this.invuln = Math.max(this.invuln, 0.5);
        ctx?.fx?.afterimage?.(this.currentFrame(), this.x, this.y, 1, this.flip, '#8ef0ff', 0.3);
      }
    }
    if (this.undyingActive) {
      this.undyingT -= dt;
      if (this.undyingT <= 0) { this.alive = false; this.deathT = 1.4; }
    }
    if (this.shieldAmount > 0) {
      this.shieldTimer = (this.shieldTimer ?? 8) - dt;
      if (this.shieldTimer <= 0) {
        this.shieldTimer = 8;
        this.shield = Math.min(this.maxHp, this.shield + this.shieldAmount);
        ctx.fx.ring(this.x, this.y, 22, '#ffe066', 0.35);
      }
    }
    if (this.frenzyT > 0) { this.frenzyT -= dt; if (this.frenzyT <= 0) this.frenzyStacks = 0; }
    // momentum
    const speed = Math.hypot(this.vx, this.vy);
    if (this.momentum) {
      if (speed > 20) this.momentumStacks = Math.min(1, this.momentumStacks + dt * 0.6);
      else this.momentumStacks = Math.max(0, this.momentumStacks - dt * 1.6);
    }
    // tempest crown
    if (this.tempest) {
      this._tempest -= dt;
      if (this._tempest <= 0) {
        this._tempest = 0.6;
        const e = ctx.findNearestEnemy(this.x, this.y, 180);
        if (e) {
          ctx.fx.lightning(this.x, this.y - 40, e.x, e.y, '#fff066');
          ctx.dealDamage(e, 30 * this.atkDmg, { family: 'lightning' });
        }
      }
    }
    // extinction event
    if (this.extinction) {
      this._extinctionT -= dt;
      if (this._extinctionT <= 0) {
        this._extinctionT = 20;
        ctx.extinctionEvent(this.extinction);
      }
    }

    // --- animation state ---
    let st = 'idle';
    if (!this.alive) st = 'death';
    else if (this.dashT > 0) st = 'dash';
    else if (this.hitT > 0) st = 'hurt';
    else if (this.atkT > 0) st = 'attack';
    else if (speed > 12) st = 'run';
    if (st !== this.state) { this.state = st; this.animT = 0; this.frame = 0; }
    if (this.atkT > 0) this.atkT -= dt;
    if (this.dashT > 0) this.dashT -= dt;
    const fps = st === 'run' ? 14 : st === 'attack' ? 16 : st === 'death' ? 7 : 6;
    this.animT += dt * fps;
    const frames = this.set[this.dirKey()][st] || this.set[this.dirKey()].idle;
    if (st === 'death') this.frame = Math.min(frames.length - 1, Math.floor(this.animT));
    else this.frame = Math.floor(this.animT) % frames.length;
    if (!this.alive) this.deathT -= dt;

    // root trap (boss Vine/root attacks pin you in place)
    if (this.rootT > 0) this.rootT -= dt;

    // orbitals
    for (const o of this.orbitals) {
      o.ang += o.spd * dt * (this.apocalypse ? 1.6 : 1);
      o.x = this.x + Math.cos(o.ang) * o.r;
      o.y = this.y + Math.sin(o.ang) * o.r;
      for (const e of ctx.enemiesInRange(o.x, o.y, o.size + 6)) {
        const key = e._id;
        if ((o.hitCd[key] || 0) > this.t) continue;
        o.hitCd[key] = this.t + 0.32;
        ctx.dealDamage(e, o.dmg * this.atkDmg, { family: 'orbital', x: o.x, y: o.y, small: true });
        ctx.fx.sparks(o.x, o.y, o.color, 3, o.ang + Math.PI / 2);
      }
    }
    // ECLIPSE RING evolution: blades barrage outward every 4s
    if (this.orbitBarrage && this.orbitals.length) {
      this._orbitBarrageT -= dt;
      if (this._orbitBarrageT <= 0) {
        this._orbitBarrageT = 4;
        for (const o of this.orbitals) {
          const a = o.ang;
          ctx.spawnProjectile({
            x: o.x, y: o.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300,
            life: 0.6, dmg: (this.orbitBarrageDmg || 24) * this.atkDmg, pierce: 3,
            color: '#c07aff', sprite: 'sawBlade', owner: 'player', size: 5,
            family: 'orbital', angle: a, spin: 18,
          });
        }
        ctx.fx.ring(this.x, this.y, 60, '#c07aff', 0.3, 2);
      }
    }
    // drones
    const droneW = this.weapons.find(w => w.behavior === 'drones');
    if (droneW) {
      for (let i = 0; i < this.drones.length; i++) {
        const d = this.drones[i];
        d.ang += dt * 1.4;
        const tx = this.x + Math.cos(d.ang + i) * (30 + i * 5);
        const ty = this.y + Math.sin(d.ang + i) * (22 + i * 4) - 14;
        d.x += (tx - d.x) * Math.min(1, dt * 6);
        d.y += (ty - d.y) * Math.min(1, dt * 6);
        d.cd -= dt * this.cdr;
        if (d.cd <= 0) {
          const e = ctx.findNearestEnemy(d.x, d.y, droneW.droneRange || 130);
          if (e) {
            d.cd = droneW.droneCd;
            const a = Math.atan2(e.y - d.y, e.x - d.x);
            ctx.spawnProjectile({
              x: d.x, y: d.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260,
              life: 1.0, dmg: droneW.dmg * this.atkDmg, pierce: 1, color: droneW.color,
              sprite: 'orbPlasma', owner: 'player', size: 3, family: 'plasma',
            });
            ctx.fx.sparks(d.x, d.y, droneW.color, 2, a);
          }
        }
      }
    }
    // sentry turrets (Sentry Kit): stationary, timed, autonomous
    for (let i = this.turrets.length - 1; i >= 0; i--) {
      const t = this.turrets[i];
      t.life -= dt; t.t += dt; t.cd -= dt;
      if (t.life <= 0) {
        ctx.fx.burst(t.x, t.y, '#ff9a4a', 8, { spd: 70, life: 0.35 });
        this.turrets.splice(i, 1);
        continue;
      }
      if (t.cd <= 0) {
        const e = ctx.findNearestEnemy(t.x, t.y, 160);
        if (e) {
          t.cd = t.w.turretCd || 0.55;
          const a = Math.atan2(e.y - t.y, e.x - t.x);
          t.ang = a;
          const rock = !!t.w.evolved;
          ctx.spawnProjectile({
            x: t.x, y: t.y - 6,
            vx: Math.cos(a) * (rock ? 170 : 260), vy: Math.sin(a) * (rock ? 170 : 260),
            life: rock ? 1.6 : 1.0, dmg: t.w.dmg * (rock ? 2.2 : 1), pierce: 0,
            color: '#ff9a4a', sprite: rock ? 'missile' : 'orbLight',
            owner: 'player', size: rock ? 5 : 3, family: 'turret',
            homing: rock ? 4 : 0, explode: rock, explodeRadius: rock ? 22 : 0,
            weaponId: t.w.id, angle: a,
          });
          ctx.fx.sparks(t.x, t.y - 6, '#ff9a4a', 2, a);
        }
      }
    }
  }

  dirKey() { return this.facing === 'left' || this.facing === 'right' ? 'side' : this.facing; }
  currentFrame() {
    const dir = this.dirKey();
    const frames = this.set[dir][this.state] || this.set[dir].idle;
    return frames[Math.min(this.frame, frames.length - 1)];
  }

  // ---------- damage helpers ----------
  rollDamage(base, target) {
    let dmg = base * this.atkDmg * this.comboMult;
    if (this.momentum) dmg *= 1 + this.momentum * this.momentumStacks;
    if (this.eclipse) dmg *= 1 + this.eclipseMax * (1 - this.hp / this.maxHp);
    if (this.execute && target && target.hp < target.maxHp * 0.3) dmg *= this.executeMult;
    const crit = Math.random() < this.crit;
    if (crit) dmg *= this.critDmg;
    return { dmg, crit };
  }
  get fireRateMult() {
    let m = this.atkSpd * this.cdr;
    if (this.frenzy) m *= 1 + this.frenzy * this.frenzyStacks;
    return m;
  }
  onKill(ctx, enemy) {
    this.kills += 1;
    this.addCombo();
    if (this.frenzy) { this.frenzyStacks = Math.min(40, this.frenzyStacks + 1); this.frenzyT = 4; }
    if (this.killHeal) this.heal(this.killHeal);
    if (this.killTrainEnergy && ctx.train) ctx.train.energy = Math.min(ctx.train.maxEnergy, ctx.train.energy + this.killTrainEnergy);
    if (this.invulnOnKill) this.invuln = Math.max(this.invuln, this.invulnOnKill);
  }

  // ==================================================================
  // AUTO ATTACK — one dispatch per weapon behaviour
  // ==================================================================
  autoAttack(dt, ctx) {
    if (!this.alive) return;
    const enemy = ctx.findNearestEnemy(this.x, this.y, 260);
    for (const w of this.weapons) {
      const s = this.weaponStates[w.id];
      if (w.behavior === 'orbital' || w.behavior === 'drones') continue;
      // CHARGE shot: wind up, then release one heavy hit
      if (w.behavior === 'charge') {
        s.chargeT = (s.chargeT || 0) + dt * this.fireRateMult;
        if (s.chargeT >= (w.chargeTime || 1.7)) {
          if (enemy) { s.chargeT = 0; this._cast(ctx, w, s, enemy); }
          else s.chargeT = Math.min(s.chargeT, w.chargeTime || 1.7);
        }
        continue;
      }
      // burst continuation
      if (s.burst > 0) {
        s.burstT -= dt;
        if (s.burstT <= 0) {
          s.burst -= 1; s.burstT = w.burstDelay || 0.07;
          this._fireProjectiles(ctx, w, enemy, 1);
        }
        continue;
      }
      s.cd -= dt * this.fireRateMult;
      if (s.cd > 0) continue;
      if (!enemy && !['nova', 'aura', 'pool', 'bomber'].includes(w.behavior)) continue;
      s.cd = w.cd;
      const casts = 1 + (Math.random() < this.doubleCast ? 1 : 0);
      for (let c = 0; c < casts; c++) this._cast(ctx, w, s, enemy);
    }
  }

  _cast(ctx, w, s, enemy) {
    const B = w.behavior;
    this.atkT = 0.18;
    if (enemy) {
      const ang = Math.atan2(enemy.y - this.y, enemy.x - this.x);
      if (Math.abs(Math.cos(ang)) > 0.55) { this.facing = Math.cos(ang) < 0 ? 'left' : 'right'; this.flip = Math.cos(ang) < 0; }
    }
    switch (B) {
      case 'fireball': case 'projectile': case 'shotgun': case 'lob':
        this._fireProjectiles(ctx, w, enemy, w.projCount || 1); break;
      case 'burst':
        s.burst = (w.burstCount || 3) - 1; s.burstT = w.burstDelay || 0.07;
        this._fireProjectiles(ctx, w, enemy, 1); break;
      case 'frost':
        this._fireProjectiles(ctx, w, enemy, w.projCount || 1, { slow: w.slow, slowDur: w.slowDur }); break;
      case 'homing':
        this._fireProjectiles(ctx, w, enemy, w.projCount || 1, { homing: w.turnRate || 5, sprite: 'missile' }); break;
      case 'bounce':
        this._fireProjectiles(ctx, w, enemy, w.projCount || 1, { bounces: w.bounces || 4, spin: 12 }); break;
      case 'boomerang':
        this._fireProjectiles(ctx, w, enemy, w.projCount || 1, { boomerang: true }); break;
      case 'rail': this._rail(ctx, w, enemy); break;
      case 'bomber': this._bomber(ctx, w); break;
      case 'lightning': this._chain(ctx, w, enemy); break;
      case 'cone': this._cone(ctx, w, enemy); break;
      case 'aura': this._aura(ctx, w); break;
      case 'nova': this._nova(ctx, w); break;
      case 'pool': this._pool(ctx, w, enemy); break;
      case 'blackhole': this._blackhole(ctx, w, enemy); break;
      case 'meteor': {
        const t = enemy || ctx.findNearestEnemy(this.x, this.y, 420);
        if (t) ctx.spawnMeteor(t.x, t.y, w.dmg * this.atkDmg, w.explodeRadius);
        break;
      }
      case 'teleport': this._blink(ctx, w); break;
      case 'charge': {
        // the big release: one fast, heavy, piercing bolt
        const ang2 = enemy ? Math.atan2(enemy.y - this.y, enemy.x - this.x) : rand(0, TAU);
        const speed = (w.speed || 460) * this.projSpeedMult;
        ctx.spawnProjectile({
          x: this.x, y: this.y - 4,
          vx: Math.cos(ang2) * speed, vy: Math.sin(ang2) * speed,
          life: w.projLife || 1.3, dmg: w.dmg, pierce: w.pierce || 3,
          color: w.color, sprite: w.sprite, behavior: 'projectile',
          owner: 'player', size: w.projSize || 7, family: w.family,
          knockback: 160, weaponId: w.id, angle: ang2, spin: 6,
        });
        ctx.fx.ring(this.x, this.y - 4, 22, w.color, 0.3, 2);
        ctx.fx.flash(this.x + Math.cos(ang2) * 12, this.y - 4 + Math.sin(ang2) * 12, w.color, 0.12, 14);
        try { SOUNDS.shoot('lightning'); } catch {}
        try { ctx.camera.shake(0.12); } catch {}
        break;
      }
      case 'turret': {
        // deployable sentry: holds the ground while you keep moving
        const maxT = w.evolved ? 2 : 1;
        while (this.turrets.length >= maxT) {
          const old = this.turrets.shift();
          try { ctx.fx.burst(old.x, old.y, '#ff9a4a', 6, { spd: 60, life: 0.3 }); } catch {}
        }
        const tx = this.x + rand(-12, 12), ty = this.y + rand(-8, 8);
        this.turrets.push({ x: tx, y: ty, life: w.turretLife || 12, cd: 0.4, w, t: 0, ang: 0 });
        ctx.fx.ring(tx, ty, 18, '#ff9a4a', 0.45, 2);
        try { SOUNDS.explosion(0.5); } catch {}
        break;
      }
      case 'echo': {
        // repeats your last real shot, a beat later, slightly weaker
        const ls = this.lastShot;
        if (!ls) { s.cd = 0.25; break; }
        const n = w.evolved ? 2 : 1;
        const mult = w.evolved ? 1 : (w.echoMult || 0.6);
        for (let k = 0; k < n; k++) {
          ctx.spawnProjectile({
            x: this.x, y: this.y - 4,
            vx: Math.cos(ls.ang) * ls.speed * (1 + k * 0.08),
            vy: Math.sin(ls.ang) * ls.speed * (1 + k * 0.08),
            life: ls.life, dmg: ls.dmg * mult, pierce: ls.pierce,
            color: '#a8d4f4', sprite: ls.sprite, behavior: 'projectile',
            owner: 'player', size: ls.size, family: 'spirit',
            knockback: 0, weaponId: 'echo_shard', angle: ls.ang,
            explode: ls.explode, explodeRadius: ls.explodeRadius,
            homing: ls.homing || 0, slow: ls.slow, slowDur: ls.slowDur,
            omega: false, reflected: false,
          });
        }
        ctx.fx.sparks(this.x, this.y - 4, '#a8d4f4', 3, ls.ang, 0.4, 100);
        try { SOUNDS.shoot('ice'); } catch {}
        s.cd = w.echoDelay || 0.7;
        break;
      }
      default: this._fireProjectiles(ctx, w, enemy, w.projCount || 1);
    }
  }

  _fireProjectiles(ctx, w, enemy, count, extra = {}) {
    count = (count || 1) + (this.extraProjectiles || 0);
    const spread = w.spread ?? 0.14;
    const baseAng = enemy ? Math.atan2(enemy.y - this.y, enemy.x - this.x) : rand(0, TAU);
    const speed = (w.speed || 220) * this.projSpeedMult;
    for (let i = 0; i < count; i++) {
      const ang = baseAng + (i - (count - 1) / 2) * spread + (w.behavior === 'shotgun' ? rand(-0.06, 0.06) : 0);
      this._shotCount++;
      const omega = this.omegaRound && this._shotCount % this.omegaRound === 0;
      const dmg = w.dmg * (omega ? 5 : 1);
      ctx.spawnProjectile({
        x: this.x, y: this.y - 4,
        vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
        life: w.projLife || 1.6, dmg, pierce: (w.pierce || 0) + this.pierceBonus,
        explode: w.explode || omega, explodeRadius: (w.explodeRadius || 26) * (omega ? 2.4 : 1) * (this.aoeMult || 1),
        color: omega ? '#ff2a2a' : w.color, sprite: extra.sprite || w.sprite,
        behavior: w.behavior === 'lob' ? 'lob' : 'projectile',
        owner: 'player', size: (w.projSize || 5) * (omega ? 2 : 1), family: w.family,
        knockback: w.knockback || this.knockback, weaponId: w.id, omega,
        lifesteal: w.lifesteal || 0, angle: ang, ...extra,
      });
      // ECHO SHARD: remember the middle shot of the volley to repeat later
      if (i === Math.floor((count - 1) / 2)) {
        this.lastShot = {
          ang, speed, dmg, pierce: (w.pierce || 0) + this.pierceBonus,
          sprite: extra.sprite || w.sprite, life: w.projLife || 1.6,
          size: (w.projSize || 5), explode: w.explode || false,
          explodeRadius: (w.explodeRadius || 26) * (this.aoeMult || 1),
          homing: extra.homing || 0, slow: extra.slow, slowDur: extra.slowDur,
        };
      }
    }
    ctx.fx.sparks(this.x + Math.cos(baseAng) * 8, this.y - 4 + Math.sin(baseAng) * 8, w.color || '#ffb040', 4, baseAng, 0.4, 120);
    ctx.fx.flash(this.x + Math.cos(baseAng) * 10, this.y - 4 + Math.sin(baseAng) * 10, w.color || '#ffb040', 0.07, 10);
    // one voice per family on the big shots (rapid weapons stay quiet)
    try { if ((w.cd || 1) >= 0.5) SOUNDS.shoot(w.family === 'ice' ? 'ice' : w.family === 'lightning' ? 'lightning' : w.family === 'orbital' ? 'orbital' : w.family === 'void' ? 'void' : 'fire'); } catch {}
  }

  _rail(ctx, w, enemy) {
    const ang = enemy ? Math.atan2(enemy.y - this.y, enemy.x - this.x) : rand(0, TAU);
    const len = 420;
    const ex = this.x + Math.cos(ang) * len, ey = this.y + Math.sin(ang) * len;
    ctx.fx.beam(this.x, this.y - 4, ex, ey, w.color, 7, 0.28);
    ctx.fx.shakeScreen(4, 0.15);
    ctx.camera?.punch(0.03);
    const hits = [];
    for (const e of ctx.enemies) {
      if (!e.alive) continue;
      const t = ((e.x - this.x) * Math.cos(ang) + (e.y - this.y) * Math.sin(ang));
      if (t < 0 || t > len) continue;
      const px = this.x + Math.cos(ang) * t, py = this.y + Math.sin(ang) * t;
      if (dist(px, py, e.x, e.y) < e.radius + 8) hits.push(e);
    }
    for (const e of hits) ctx.dealDamage(e, w.dmg * this.atkDmg, { family: 'tech' });
    ctx.fx.burst(this.x, this.y - 4, '#ffffff', 10, { spd: 90, life: 0.25, ang, cone: 0.4 });
  }

  _bomber(ctx, w) {
    const n = w.projCount || 2;
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), r = rand(20, 70);
      ctx.spawnBomb(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r, {
        dmg: w.dmg * this.atkDmg, radius: w.explodeRadius, fuse: 0.8 + Math.random() * 0.4,
        cluster: w.cluster || 0, color: w.color, family: 'explosive',
      });
    }
  }

  _chain(ctx, w, enemy) {
    const start = enemy || ctx.findNearestEnemy(this.x, this.y, 320);
    if (!start) return;
    let jumps = (w.jumps || 3) + (this.chainMaster ? 2 : 0);
    const range = this.chainMaster ? 260 : 150;
    let last = { x: this.x, y: this.y - 6 };
    const hit = new Set();
    for (let j = 0; j < jumps; j++) {
      const targets = ctx.enemiesInRange(last.x, last.y, range).filter(e => !hit.has(e._id));
      if (!targets.length) break;
      targets.sort((a, b) => dist(last.x, last.y, a.x, a.y) - dist(last.x, last.y, b.x, b.y));
      const t = targets[0];
      hit.add(t._id);
      ctx.fx.lightning(last.x, last.y, t.x, t.y, w.color);
      ctx.dealDamage(t, w.dmg * this.atkDmg * (1 - j * 0.05), { family: 'lightning' });
      last = { x: t.x, y: t.y };
    }
  }

  _cone(ctx, w, enemy) {
    const ang = enemy ? Math.atan2(enemy.y - this.y, enemy.x - this.x) : rand(0, TAU);
    const arc = w.arc || 0.7, range = w.range || 80;
    ctx.spawnFlame(this.x, this.y - 4, ang, range, w.dmg * this.atkDmg);
    for (const e of ctx.enemiesInRange(this.x, this.y, range)) {
      const a = Math.atan2(e.y - this.y, e.x - this.x);
      let d = Math.abs(((a - ang + Math.PI * 3) % TAU) - Math.PI);
      if (d < arc) ctx.dealDamage(e, w.dmg * this.atkDmg, { family: 'fire', small: true, burn: w.burn });
    }
  }

  _aura(ctx, w) {
    const r = w.radius || 60;
    ctx.fx.ring(this.x, this.y, r, w.color, 0.25, 2);
    for (const e of ctx.enemiesInRange(this.x, this.y, r)) {
      ctx.dealDamage(e, w.dmg * this.atkDmg, { family: 'lightning', small: true });
      if (Math.random() < 0.4) ctx.fx.lightning(this.x, this.y, e.x, e.y, w.color, 4, 0.1);
    }
  }

  _nova(ctx, w) {
    const r = w.radius || 80;
    ctx.fx.shockwave(this.x, this.y, r, w.color);
    ctx.fx.explosion(this.x, this.y, 'explHoly', r / 34, { light: 1, lightColor: w.color });
    ctx.camera?.punch(0.02);
    for (const e of ctx.enemiesInRange(this.x, this.y, r)) {
      ctx.dealDamage(e, w.dmg * this.atkDmg, { family: 'holy' });
    }
    if (w.heal) this.heal(w.heal);
  }

  _pool(ctx, w, enemy) {
    const tx = enemy ? enemy.x : this.x, ty = enemy ? enemy.y : this.y;
    ctx.spawnPool(tx, ty, {
      radius: w.poolRadius || 26, dmg: w.dmg * this.atkDmg, life: w.projLife || 4,
      color: w.color, family: 'toxic',
    });
  }

  _blackhole(ctx, w, enemy) {
    const tx = enemy ? enemy.x : this.x + rand(-40, 40);
    const ty = enemy ? enemy.y : this.y + rand(-40, 40);
    ctx.spawnBlackhole(tx, ty, { radius: w.radius, dmg: w.dmg * this.atkDmg, life: w.projLife || 3, color: w.color });
  }

  _blink(ctx, w) {
    const ang = rand(0, TAU), d = rand(80, 150);
    const nx = this.x + Math.cos(ang) * d, ny = this.y + Math.sin(ang) * d;
    ctx.fx.afterimage(this.currentFrame(), this.x, this.y, 1, this.flip, w.color, 0.4);
    ctx.fx.explosion(this.x, this.y, 'explVoid', 0.7, { lightColor: w.color });
    for (const e of ctx.enemiesInRange(this.x, this.y, w.explodeRadius)) ctx.dealDamage(e, w.dmg * this.atkDmg, { family: 'void' });
    if (!ctx.world.isSolidWorld(nx, ny)) { this.x = nx; this.y = ny; }
    ctx.fx.explosion(this.x, this.y, 'explVoid', 0.7, { lightColor: w.color });
    for (const e of ctx.enemiesInRange(this.x, this.y, w.explodeRadius)) ctx.dealDamage(e, w.dmg * this.atkDmg, { family: 'void' });
  }
}
