// ============================================================
// HELL TRAIN — Enemy entities
// ============================================================
import { uid, rand, randInt, clamp, dist, TAU } from '../core/utils.js';
import { findEnemy } from '../data/enemies.js';

export class Enemy {
  constructor(def, x, y, realmId, difficulty) {
    Object.assign(this, JSON.parse(JSON.stringify(def)));
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.maxHp = this.hp * (difficulty.enemyHp || 1);
    this.hp = this.maxHp;
    this.dmg = this.dmg * (difficulty.enemyDmg || 1);
    this.radius = this.radius || 7;
    this.alive = true;
    this.realmId = realmId;
    this.colorMod = 0;
    this.scale = 1;
    this.giant = false;
    this.regen = 0;
    this.animT = Math.random() * 3; this.frame = 0;
    this.kbx = 0; this.kby = 0;
    this.freezeT = 0; this.chill = 0; this.chillT = 0;
    this.touchCd = 0; this.spawnT = 0.25;
    this.attackCd = 0;
    this.summonCd = this.summon?.cd || 0;
    this.summonedCount = 0;
    this.teleportCd = 0;
    this.aiT = Math.random() * 2;
    this.burnDmg = 0; this.burnT = 0; this.slow = 0; this.slowT = 0;
    this.shield = 0;
    this.voidTouched = false;
    this.flashT = 0;
    this.deathT = 0;
    // Realm tint of sprite
    this.tint = realmId;
  }

  applyMod(mod) {
    mod.apply(this);
  }

  update(dt, ctx) {
    if (!this.alive) {
      this.deathT -= dt;
      return;
    }
    this.animT += dt * (6 + this.spd * 0.04);
    this.frame = Math.floor(this.animT) % 6;
    if (this.flashT > 0) this.flashT -= dt;
    if (this.spawnT > 0) this.spawnT -= dt;
    if (this.touchCd > 0) this.touchCd -= dt;
    if (this.chillT > 0) { this.chillT -= dt; if (this.chillT <= 0) this.chill = 0; }
    // knockback impulse
    if (this.kbx || this.kby) {
      this.x += this.kbx * dt; this.y += this.kby * dt;
      const damp = Math.pow(0.0009, dt);
      this.kbx *= damp; this.kby *= damp;
      if (Math.abs(this.kbx) < 2) this.kbx = 0;
      if (Math.abs(this.kby) < 2) this.kby = 0;
    }
    // frozen solid: no acting at all
    if (this.freezeT > 0) {
      this.freezeT -= dt;
      this.vx = 0; this.vy = 0;
      if (Math.random() < 0.15) ctx.fx.spawn({ x: this.x + (Math.random() - 0.5) * 10, y: this.y - 6,
        vx: 0, vy: 12, color: '#a8d4f4', life: 0.4, size: 1.2 });
      return;
    }
    if (this.burnT > 0) {
      this.burnT -= dt;
      this.hp -= this.burnDmg * dt;
      if (Math.random() < 0.22) ctx.fx.fire(this.x + (Math.random() - 0.5) * 6, this.y - 4, '#ff7a33');
      if (this.hp <= 0) {
        this.hp = 0; this.alive = false; this.deathT = 0.55;
        ctx.onEnemyDeath?.(this);
      }
    }
    if (this.slowT > 0) this.slowT -= dt;
    if (this.regen) this.hp = Math.min(this.maxHp, this.hp + this.regen * dt);
    if (this.teleportCd !== undefined) {
      this.teleportCd -= dt;
      if (this.teleportCd <= 0) {
        this.teleportCd = 4 + Math.random() * 2;
        const ang = Math.random() * TAU;
        const r = 30 + Math.random() * 50;
        this.x += Math.cos(ang) * r;
        this.y += Math.sin(ang) * r;
        ctx.fx.flash(this.x, this.y, '#985ce0', 0.15);
      }
    }

    const player = ctx.player;
    const px = player.x, py = player.y;
    const d = dist(this.x, this.y, px, py);
    const spdMul = (this.slowT > 0 ? (1 - this.slow) : 1) * (1 - (this.chill || 0));
    const speed = this.spd * spdMul;

    // AI behaviors
    if (this.ai === 'chase' || this.ai === 'tank' || this.ai === 'swarm' || this.ai === 'split') {
      if (d > 1) {
        const ang = Math.atan2(py - this.y, px - this.x);
        this.vx = Math.cos(ang) * speed;
        this.vy = Math.sin(ang) * speed;
      } else {
        this.vx = 0; this.vy = 0;
      }
    } else if (this.ai === 'ranged') {
      if (d > 130) {
        const ang = Math.atan2(py - this.y, px - this.x);
        this.vx = Math.cos(ang) * speed;
        this.vy = Math.sin(ang) * speed;
      } else if (d < 70) {
        const ang = Math.atan2(py - this.y, px - this.x);
        this.vx = -Math.cos(ang) * speed * 0.5;
        this.vy = -Math.sin(ang) * speed * 0.5;
      } else { this.vx = 0; this.vy = 0; }
      // attack
      this.attackCd -= dt;
      if (this.attackCd <= 0 && d < 220) {
        // clarity governor: under heavy crowds, ranged enemies fire a touch slower
        this.attackCd = (this.proj?.cd || 1.5) * (ctx.enemyFireMult || 1);
        const ang = Math.atan2(py - this.y, px - this.x);
        ctx.spawnProjectile({
          x: this.x, y: this.y, vx: Math.cos(ang) * (this.proj?.spd || 160),
          vy: Math.sin(ang) * (this.proj?.spd || 160), life: 1.6, dmg: this.proj?.dmg || 8,
          color: this.proj?.id === 'fire_bolt' ? '#ff5a33' : '#9b6dff', owner: 'enemy',
          size: 4, family: this.proj?.id === 'fire_bolt' ? 'fire' : 'void',
        });
      }
    } else if (this.ai === 'summoner') {
      if (d > 160) {
        const ang = Math.atan2(py - this.y, px - this.x);
        this.vx = Math.cos(ang) * speed;
        this.vy = Math.sin(ang) * speed;
      } else { this.vx = 0; this.vy = 0; }
      this.summonCd -= dt;
      if (this.summonCd <= 0 && this.summonedCount < (this.summon?.max || 4)) {
        this.summonCd = this.summon?.cd || 4;
        this.summonedCount += this.summon?.count || 2;
        for (let i = 0; i < (this.summon?.count || 2); i++) {
          const ang = Math.random() * TAU;
          ctx.spawnEnemy(this.summon.id, this.x + Math.cos(ang) * 18, this.y + Math.sin(ang) * 18);
        }
      }
    } else if (this.ai === 'burrower') {
      // stand still and emerge for a while, then burrow
      if (this.aiT > 0) { this.aiT -= dt; if (this.aiT <= 0) this.aiT = -3 - Math.random() * 2; }
      else { this.aiT += dt; if (this.aiT >= 0) this.aiT = 3 + Math.random() * 2; }
      if (this.aiT > 0) {
        if (d > 1) {
          const ang = Math.atan2(py - this.y, px - this.x);
          this.vx = Math.cos(ang) * speed;
          this.vy = Math.sin(ang) * speed;
        } else { this.vx = 0; this.vy = 0; }
      } else {
        this.vx = 0; this.vy = 0;
      }
    } else if (this.ai === 'shield') {
      // Move and block projectiles
      if (d > 1) {
        const ang = Math.atan2(py - this.y, px - this.x);
        this.vx = Math.cos(ang) * speed * 0.5;
        this.vy = Math.sin(ang) * speed * 0.5;
      } else { this.vx = 0; this.vy = 0; }
    } else if (this.ai === 'fly') {
      // tries to fly above obstacles; ignore walls slightly
      if (d > 1) {
        const ang = Math.atan2(py - this.y, px - this.x);
        this.vx = Math.cos(ang) * speed;
        this.vy = Math.sin(ang) * speed;
      } else { this.vx = 0; this.vy = 0; }
    } else { // fallback
      if (d > 1) {
        const ang = Math.atan2(py - this.y, px - this.x);
        this.vx = Math.cos(ang) * speed;
        this.vy = Math.sin(ang) * speed;
      }
    }

    // Move with collision (skip walls if flying)
    if (this.ai !== 'fly') {
      const ax = this.x + this.vx * dt;
      const ay = this.y + this.vy * dt;
      if (!ctx.world.isSolidWorld(ax + Math.sign(this.vx) * this.radius, this.y)) this.x = ax;
      if (!ctx.world.isSolidWorld(this.x, ay + Math.sign(this.vy) * this.radius)) this.y = ay;
    } else {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }

    // Contact damage (burst on touch, then a short cooldown — much better feel
    // than continuous chip damage)
    if (d < this.radius + player.radius && this.touchCd <= 0) {
      this.touchCd = 0.6;
      const t = player.takeDamage(this.dmg, ctx, this);
      if (t > 0) ctx.onPlayerHit(t, '#ff3a3a', this.name || this.id);
      const a = Math.atan2(player.y - this.y, player.x - this.x);
      this.kbx = -Math.cos(a) * 90; this.kby = -Math.sin(a) * 90;
    }
  }

  takeDamage(amount, opts = {}) {
    if (!this.alive) return 0;
    let dmg = amount;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, dmg);
      this.shield -= absorbed; dmg -= absorbed;
    }
    if (opts.burn && !this.voidTouched) {
      this.burnDmg = Math.max(this.burnDmg || 0, opts.burn);
      this.burnT = Math.max(this.burnT || 0, opts.burnDur || 3);
    }
    if (opts.slow) {
      this.slow = Math.max(this.slow || 0, opts.slow);
      this.slowT = Math.max(this.slowT || 0, opts.slowDur || 2);
    }
    if (opts.chill) { this.chill = Math.max(this.chill, opts.chill); this.chillT = 2.5; }
    if (opts.freeze) this.freezeT = Math.max(this.freezeT, opts.freeze);
    if (opts.knockback) {
      const a = opts.angle ?? Math.atan2(this.y - (opts.y ?? this.y), this.x - (opts.x ?? this.x));
      const scale = this.giant ? 0.35 : 1;
      this.kbx += Math.cos(a) * opts.knockback * scale;
      this.kby += Math.sin(a) * opts.knockback * scale;
    }
    this.hp -= dmg;
    this.flashT = 0.1;
    this.hitScale = 1;
    if (this.hp <= 0) { this.alive = false; this.deathT = 0.55; }
    return dmg;
  }

  spriteName(sprites) {
    const base = this.sprite || 'ghost';
    // Realm tint
    const tintMap = {
      infernal: 'infernal', frozen: 'ice', forest: 'forest',
      desert: 'ash', void: 'void', forgotten: 'purple',
      purgatory: 'blue', terminus: 'pink', phantom: 'void',
    };
    const realm = tintMap[this.realmId] || 'blue';
    let name = base + '_' + realm;
    if (!sprites[name]) name = base;
    if (this.giant) {
      const gname = base + 'Giant';
      if (sprites[gname]) name = gname;
    }
    return name;
  }
}

// Factory
export function makeEnemy(id, x, y, realmId, difficulty) {
  const def = findEnemy(id);
  if (!def) return null;
  return new Enemy(def, x, y, realmId, difficulty);
}
