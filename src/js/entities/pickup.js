// ============================================================
// HELL TRAIN — Pickups: XP, coins, hearts, shards, chests, magnets
// ============================================================
import { uid, dist, rand } from '../core/utils.js';

const CONF = {
  xp:     { sprite: 'xp',     color: '#8ef0ff', score: 1 },
  xpBig:  { sprite: 'xpBig',  color: '#dcb4ff', score: 4 },
  coin:   { sprite: 'coin',   color: '#ffe878', score: 2 },
  shard:  { sprite: 'shard',  color: '#ffc040', score: 25 },
  heart:  { sprite: 'heart',  color: '#ff5a5a', score: 5 },
  chest:  { sprite: 'chest',  color: '#ffe066', score: 50 },
  magnet: { sprite: 'magnet', color: '#f080cc', score: 5 },
};

export class Pickup {
  constructor(type, x, y, amount = 1) {
    this.type = type; this.x = x; this.y = y; this.amount = amount;
    this.vx = rand(-45, 45); this.vy = rand(-120, -55);
    this.z = 0; this.vz = rand(30, 70);
    this.t = 0; this.alive = true; this.magnetized = false;
    this.frame = Math.floor(Math.random() * 6);
    this._id = uid();
    this.conf = CONF[type] || CONF.xp;
  }
  color() { return this.conf.color; }
  spriteKey() { return this.conf.sprite; }

  update(dt, ctx) {
    if (!this.alive) return;
    this.t += dt;
    this.frame += dt * 10;
    const p = ctx.player;
    const d = dist(this.x, this.y, p.x, p.y);

    if (!this.magnetized) {
      // little hop + settle
      this.vy += 320 * dt;
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.vx *= Math.pow(0.9, dt * 60);
      if (this.t > 0.35) { this.vy *= Math.pow(0.75, dt * 60); }
      if (ctx.world.isSolidWorld(this.x, this.y)) { this.x -= this.vx * dt; this.y -= this.vy * dt; this.vx *= -0.4; this.vy *= -0.4; }
      const range = p.pickupRange * (ctx.magnetAll ? 12 : 1);
      if (d < range) this.magnetized = true;
    } else {
      const dx = p.x - this.x, dy = p.y - this.y;
      const dd = Math.hypot(dx, dy) + 0.01;
      const speed = 120 + (1 - Math.min(1, dd / 120)) * 420;
      this.x += (dx / dd) * speed * dt;
      this.y += (dy / dd) * speed * dt;
      if (this.type === 'coin' && Math.random() < 0.25) ctx.fx.trailPuff(this.x, this.y, '#ffe878', 1.2);
    }

    if (d < p.radius + 7) {
      this.onPickup(ctx);
      this.alive = false;
    }
    if (this.t > 45) this.alive = false;
  }

  onPickup(ctx) {
    const p = ctx.player;
    const c = this.conf;
    ctx.fx.sparkle(this.x, this.y, c.color);
    switch (this.type) {
      case 'xp': case 'xpBig':
        p.gainXp(this.amount); p.score += c.score; break;
      case 'coin': {
        const n = Math.max(1, Math.round(this.amount * (p.coinMult || 1)));
        ctx.addRunCoins(n);
        p.score += c.score;
        if (n >= 5) ctx.fx.damageText(this.x, this.y - 8, '+' + n, '#ffe878', { size: 7, life: 0.6 });
        break;
      }
      case 'shard':
        ctx.gameStats.shards += this.amount; p.score += c.score; break;
      case 'heart':
        p.heal(this.amount);
        ctx.fx.damageText(this.x, this.y - 8, '+' + Math.round(this.amount), '#7eff9e', { size: 7 });
        p.score += c.score; break;
      case 'magnet':
        ctx.magnetPulse(); p.score += c.score; break;
      case 'chest':
        ctx.openChest(this); p.score += c.score; break;
    }
  }
}
