// ============================================================
// HELL TRAIN — projectiles, bombs, pools, singularities, meteors
// ============================================================
import { uid, TAU, dist, rand } from '../core/utils.js';

export class Projectile {
  constructor(o) {
    Object.assign(this, o);
    this.alive = true;
    this.t = 0;
    this.size = o.size || 4;
    this.pierceLeft = o.pierce || 0;
    this.bouncesLeft = o.bounces || 0;
    this.hitIds = new Set();
    this.spin = o.spin || 0;
    this.rot = 0;
    this.vy0 = this.vy;
    this._id = uid();
  }
  update(dt, ctx) {
    if (!this.alive) return;
    this.t += dt;
    const life = this.life || 1.6;
    if (this.t > life) { this._expire(ctx); return; }
    this.rot += this.spin * dt;

    // --- steering ---
    if (this.homing) {
      const target = ctx.findNearestEnemy(this.x, this.y, 220);
      if (target) {
        const want = Math.atan2(target.y - this.y, target.x - this.x);
        const cur = Math.atan2(this.vy, this.vx);
        let d = ((want - cur + Math.PI * 3) % TAU) - Math.PI;
        const na = cur + Math.max(-this.homing * dt, Math.min(this.homing * dt, d));
        const sp = Math.hypot(this.vx, this.vy);
        this.vx = Math.cos(na) * sp; this.vy = Math.sin(na) * sp;
        this.angle = na;
      }
    }
    if (this.boomerang) {
      const k = this.t / life;
      if (k > 0.45) {
        const owner = ctx.player;
        const a = Math.atan2(owner.y - this.y, owner.x - this.x);
        const sp = Math.hypot(this.vx, this.vy) || 200;
        this.vx += Math.cos(a) * sp * dt * 4;
        this.vy += Math.sin(a) * sp * dt * 4;
        const s2 = Math.hypot(this.vx, this.vy);
        if (s2 > sp * 1.4) { this.vx *= sp * 1.4 / s2; this.vy *= sp * 1.4 / s2; }
        if (dist(this.x, this.y, owner.x, owner.y) < 12 && k > 0.6) { this.alive = false; return; }
        this.hitIds.clear();
      }
    }
    if (this.behavior === 'lob') this.vy += 90 * dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // --- trail ---
    if (Math.random() < 0.75) {
      ctx.fx.spawn({
        x: this.x + rand(-1, 1), y: this.y + rand(-1, 1),
        vx: -this.vx * 0.08, vy: -this.vy * 0.08,
        color: this.color, life: this.omega ? 0.45 : 0.22, size: this.omega ? 3 : 1.6,
        endSize: 0.3, drag: 0.85, light: this.omega ? 0.5 : 0.12,
      });
    }

    // --- collisions ---
    if (this.owner === 'enemy') {
      const p = ctx.player;
      if (p.alive && dist(this.x, this.y, p.x, p.y) < this.size + p.radius) {
        const dealt = p.takeDamage(this.dmg, ctx, null);
        if (dealt > 0) ctx.onPlayerHit(dealt, this.color);
        this.alive = false;
        ctx.fx.burst(this.x, this.y, this.color, 6, { spd: 70, life: 0.25 });
      }
      if (ctx.train && dist(this.x, this.y, ctx.train.x, ctx.train.y) < this.size + ctx.train.radius) {
        ctx.train.takeDamage(this.dmg, ctx);
        this.alive = false;
      }
    } else {
      for (const e of ctx.enemies) {
        if (!e.alive || this.hitIds.has(e._id)) continue;
        if (dist(this.x, this.y, e.x, e.y) > this.size + e.radius) continue;
        this.hitIds.add(e._id);
        ctx.dealDamage(e, this.dmg, {
          family: this.family, x: this.x, y: this.y, knockback: this.knockback,
          slow: this.slow, slowDur: this.slowDur, burn: this.burn,
          angle: Math.atan2(this.vy, this.vx), lifesteal: this.lifesteal,
        });
        if (this.explode) {
          ctx.spawnExplosion(this.x, this.y, this.explodeRadius, this.dmg * 0.7, this.family);
          this.alive = false; return;
        }
        if (ctx.player.hellsplit && !this.isSplit) this._split(ctx);
        if (this.pierceLeft <= 0) { this.alive = false; return; }
        this.pierceLeft -= 1;
      }
      if (ctx.boss && ctx.boss.alive && !this.hitIds.has('boss') &&
          dist(this.x, this.y, ctx.boss.x, ctx.boss.y) < this.size + ctx.boss.radius) {
        this.hitIds.add('boss');
        ctx.dealDamage(ctx.boss, this.dmg, { family: this.family, x: this.x, y: this.y, boss: true });
        if (this.explode) { ctx.spawnExplosion(this.x, this.y, this.explodeRadius, this.dmg * 0.7, this.family); this.alive = false; return; }
        if (this.pierceLeft <= 0) { this.alive = false; return; }
        this.pierceLeft -= 1;
      }
    }

    // --- walls ---
    if (ctx.world.isSolidWorld(this.x, this.y)) {
      if (this.bouncesLeft > 0) {
        this.bouncesLeft -= 1;
        // reflect on whichever axis is blocked
        if (ctx.world.isSolidWorld(this.x + Math.sign(this.vx) * 4, this.y)) this.vx *= -1;
        else this.vy *= -1;
        this.hitIds.clear();
        ctx.fx.sparks(this.x, this.y, this.color, 4, Math.atan2(this.vy, this.vx));
      } else {
        this._expire(ctx);
      }
    }
  }
  _split(ctx) {
    const n = ctx.player.hellsplit;
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      ctx.spawnProjectile({
        x: this.x, y: this.y, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190,
        life: 0.7, dmg: this.dmg * 0.5, pierce: 0, color: this.color, sprite: this.sprite,
        owner: 'player', size: Math.max(2, this.size * 0.6), family: this.family, isSplit: true,
      });
    }
  }
  _expire(ctx) {
    this.alive = false;
    if (this.explode) ctx.spawnExplosion(this.x, this.y, this.explodeRadius, this.dmg * 0.7, this.family);
  }
}

export class Bomb {
  constructor(x, y, o) {
    this.x = x; this.y = y; Object.assign(this, o);
    this.t = 0; this.alive = true; this._id = uid();
    this.fuse = o.fuse || 1.0;
    this.vy = -60; this.vx = rand(-20, 20);
  }
  update(dt, ctx) {
    this.t += dt;
    this.vy += 260 * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.y > this._ground || this.t > 0.35) { this.vy *= this.vy > 0 ? -0.25 : 1; this._ground = this.y; }
    if (Math.random() < 0.3) ctx.fx.spawn({ x: this.x, y: this.y - 3, vx: 0, vy: -18, color: '#ffb040', life: 0.3, size: 1.4, light: 0.2 });
    if (this.t >= this.fuse) {
      this.alive = false;
      ctx.spawnExplosion(this.x, this.y, this.radius, this.dmg, this.family || 'explosive');
      for (let i = 0; i < (this.cluster || 0); i++) {
        const a = (i / this.cluster) * TAU;
        ctx.spawnBomb(this.x + Math.cos(a) * 22, this.y + Math.sin(a) * 22, {
          dmg: this.dmg * 0.45, radius: this.radius * 0.6, fuse: 0.45, cluster: 0,
          color: this.color, family: this.family,
        });
      }
    }
  }
}

export class Pool {
  constructor(x, y, o) {
    this.x = x; this.y = y; Object.assign(this, o);
    this.t = 0; this.alive = true; this.tick = 0; this._id = uid();
  }
  update(dt, ctx) {
    this.t += dt;
    if (this.t > this.life) { this.alive = false; return; }
    this.tick -= dt;
    if (this.tick <= 0) {
      this.tick = 0.4;
      for (const e of ctx.enemiesInRange(this.x, this.y, this.radius)) {
        ctx.dealDamage(e, this.dmg, { family: this.family, small: true });
      }
    }
    if (Math.random() < 0.5) {
      const a = rand(0, TAU), r = Math.random() * this.radius;
      ctx.fx.spawn({ x: this.x + Math.cos(a) * r, y: this.y + Math.sin(a) * r, vx: 0, vy: -12,
        color: this.color, life: 0.6, size: 1.6, light: 0.1 });
    }
  }
}

export class BlackHole {
  constructor(x, y, o) {
    this.x = x; this.y = y; Object.assign(this, o);
    this.t = 0; this.alive = true; this.tick = 0; this._id = uid();
  }
  update(dt, ctx) {
    this.t += dt;
    if (this.t > this.life) {
      this.alive = false;
      ctx.spawnExplosion(this.x, this.y, this.radius * 0.8, this.dmg * 4, 'void');
      return;
    }
    for (const e of ctx.enemiesInRange(this.x, this.y, this.radius)) {
      const a = Math.atan2(this.y - e.y, this.x - e.x);
      const d = dist(this.x, this.y, e.x, e.y);
      const pull = (1 - d / this.radius) * 160;
      e.x += Math.cos(a) * pull * dt; e.y += Math.sin(a) * pull * dt;
    }
    this.tick -= dt;
    if (this.tick <= 0) {
      this.tick = 0.25;
      for (const e of ctx.enemiesInRange(this.x, this.y, this.radius * 0.55)) {
        ctx.dealDamage(e, this.dmg, { family: 'void', small: true });
      }
    }
    for (let i = 0; i < 2; i++) {
      const a = rand(0, TAU), r = this.radius * rand(0.5, 1);
      ctx.fx.spawn({ x: this.x + Math.cos(a) * r, y: this.y + Math.sin(a) * r,
        vx: -Math.cos(a) * 90, vy: -Math.sin(a) * 90, color: this.color, life: 0.5, size: 1.6, light: 0.2 });
    }
  }
}

export class Meteor {
  constructor(x, y, target, dmg, radius) {
    this.tx = target.x; this.ty = target.y;
    this.startX = this.tx - 40; this.startY = this.ty - 260;
    this.x = this.startX; this.y = this.startY;
    this.dmg = dmg; this.radius = radius;
    this.t = 0; this.dur = 0.55; this.alive = true; this.landed = false;
    this._id = uid();
  }
  update(dt, ctx) {
    this.t += dt;
    const k = Math.min(1, this.t / this.dur);
    this.x = this.startX + (this.tx - this.startX) * k;
    this.y = this.startY + (this.ty - this.startY) * k;
    ctx.fx.fire(this.x, this.y + 4, '#ff7a33');
    ctx.fx.embers(this.x + rand(-3, 3), this.y + 4, '#ffd260', 1);
    if (k >= 1 && !this.landed) {
      this.landed = true; this.alive = false;
      ctx.spawnExplosion(this.tx, this.ty, this.radius, this.dmg, 'fire');
      ctx.fx.shakeScreen(9, 0.35);
      ctx.camera?.punch(0.05);
      ctx.fx.decal(this.tx, this.ty, this.radius * 0.5, '#1a0d08', 14);
    }
  }
}

export class Flame {
  constructor(x, y, ang, range, dmg) {
    this.x = x; this.y = y; this.ang = ang; this.range = range; this.dmg = dmg;
    this.t = 0; this.dur = 0.22; this.alive = true; this._id = uid();
  }
  update(dt, ctx) {
    this.t += dt;
    if (this.t >= this.dur) { this.alive = false; return; }
    for (let i = 0; i < 5; i++) {
      const r = Math.random() * this.range;
      const spread = (r / this.range) * 0.5;
      const a = this.ang + rand(-spread, spread);
      ctx.fx.spawn({
        x: this.x + Math.cos(a) * r, y: this.y + Math.sin(a) * r,
        vx: Math.cos(a) * 60, vy: Math.sin(a) * 60 - 10,
        color: r / this.range > 0.6 ? '#ff5a33' : '#ffe066', life: 0.3, size: 2 + r / 16,
        endSize: 0.5, light: 0.25,
      });
    }
  }
}
