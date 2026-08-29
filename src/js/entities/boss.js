// ============================================================
// HELL TRAIN — Boss entities with phase logic
// Every boss has its OWN signature attacks with readable
// telegraphs, so fights feel like fights, not bigger enemies.
// ============================================================
import { uid, rand, randInt, clamp, dist, TAU, easeOutCubic } from '../core/utils.js';
import { BOSS_DEFS, findRealm } from '../data/realms.js';

// ------------------------------------------------------------------
// TELEGRAPH-AWARE ATTACK HELPERS
// ------------------------------------------------------------------
function volley(ctx, x, y, ang0, count, spread, spd, dmg, color, family, opts = {}) {
  for (let i = 0; i < count; i++) {
    const ang = ang0 + (i - count / 2) * spread + (opts.jitter ? rand(-opts.jitter, opts.jitter) : 0);
    ctx.spawnProjectile({
      x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
      life: 2.4, dmg, color, owner: 'enemy', size: 5, family,
      slow: opts.slow, slowDur: opts.slowDur,
    });
  }
}
function rootPatch(ctx, x, y, r, dur) {
  ctx.telegraphs.push({ x, y, r, dur, t: dur, color: '#7ae06a', type: 'root' });
}
function burstPatch(ctx, x, y, r, dur, color) {
  ctx.telegraphs.push({ x, y, r, dur, t: dur, color, type: 'circle' });
}

const MOVES = {
  // ---------------- THE CONDUCTOR ----------------
  fan: (b, ctx) => {
    const p = ctx.player;
    const a = Math.atan2(p.y - b.y, p.x - b.x);
    volley(ctx, b.x, b.y, a, 10 + b.phase * 2, 0.16, 130, 9 * b.phase, '#c8a8d0', 'void');
    ctx.delay(0.5, () => volley(ctx, b.x, b.y, a + 0.35, 8 + b.phase, 0.14, 150, 10 * b.phase, '#c8a8d0', 'void'));
  },
  lane: (b, ctx) => {
    const p = ctx.player;
    const a = Math.atan2(p.y - b.y, p.x - b.x);
    const len = 320;
    const ex = b.x + Math.cos(a) * len, ey = b.y + Math.sin(a) * len;
    ctx.telegraphs.push({ x: b.x, y: b.y, x2: ex, y2: ey, dur: 0.75, t: 0.75, color: '#ffd05a', type: 'line', w: 26 });
    ctx.delay(0.75, () => {
      ctx.fx.lightning(b.x, b.y - 10, ex, ey, '#fff066', 14, 0.3);
      ctx.fx.shakeScreen(5, 0.25);
      const dmg = 16 + b.phase * 4;
      const p2 = ctx.player;
      const t = (p2.x - b.x) * Math.cos(a) + (p2.y - b.y) * Math.sin(a);
      if (t > 0 && t < len) {
        const px = b.x + Math.cos(a) * t, py = b.y + Math.sin(a) * t;
        if (dist(px, py, p2.x, p2.y) < 18) { const d = p2.takeDamage(dmg, ctx, b); if (d > 0) ctx.onPlayerHit(d, '#fff066', b.name); }
      }
    });
  },
  // ---------------- ASHEN GIANT ----------------
  pillars: (b, ctx) => {
    const p = ctx.player;
    for (let i = 0; i < 4 + b.phase; i++) {
      const a = Math.random() * TAU;
      const r = 40 + Math.random() * 90;
      const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
      burstPatch(ctx, x, y, 30, 0.8, '#ff7a33');
      ctx.delay(0.8 + i * 0.08, () => {
        ctx.spawnMeteor(x, y, 13 * b.phase, 42);
        ctx.fx.shakeScreen(4, 0.2);
      });
    }
  },
  charge: (b, ctx) => {
    const p = ctx.player;
    const a = Math.atan2(p.y - b.y, p.x - b.x);
    const len = 260;
    const ex = b.x + Math.cos(a) * len, ey = b.y + Math.sin(a) * len;
    ctx.telegraphs.push({ x: b.x, y: b.y, x2: ex, y2: ey, dur: 0.7, t: 0.7, color: '#ff4a18', type: 'line', w: 34 });
    ctx.delay(0.7, () => {
      b.vx = Math.cos(a) * 430; b.vy = Math.sin(a) * 430;
      ctx.fx.shakeScreen(7, 0.3);
    });
  },
  // ---------------- BELLMASTER ----------------
  rings: (b, ctx) => {
    const p = ctx.player;
    ctx.fx.ring(b.x, b.y, 130, '#ffd05a', 0.6, 3);
    ctx.fx.ring(b.x, b.y, 90, '#fff0a0', 0.5, 2);
    ctx.fx.shakeScreen(6, 0.4);
    const d = dist(b.x, b.y, p.x, p.y);
    if (d < 130) {
      const a = Math.atan2(p.y - b.y, p.x - b.x);
      p.kbx = (p.kbx || 0) + Math.cos(a) * 340;
      p.kby = (p.kby || 0) + Math.sin(a) * 340;
      const dd = p.takeDamage(12 * b.phase, ctx, b);
      if (dd > 0) ctx.onPlayerHit(dd, '#ffd05a', b.name);
    }
    // the bell swallows enemy shots
    for (const pr of ctx.projectiles) {
      if (pr.owner === 'enemy' && dist(b.x, b.y, pr.x, pr.y) < 140) pr.alive = false;
    }
  },
  stun: (b, ctx) => {
    const p = ctx.player;
    burstPatch(ctx, p.x, p.y, 34, 0.7, '#ffe066');
    ctx.delay(0.7, () => {
      const p2 = ctx.player;
      if (dist(b.x, b.y, p2.x, p2.y) < 160 && Math.random() < 0.85) {
        p2.rootT = Math.max(p2.rootT || 0, 0.9);
        ctx.fx.ring(p2.x, p2.y, 26, '#ffe066', 0.4, 2);
        const d = p2.takeDamage(10 * b.phase, ctx, b);
        if (d > 0) ctx.onPlayerHit(d, '#ffe066', b.name);
      }
    });
  },
  // ---------------- ANCIENT ROOT ----------------
  vines: (b, ctx) => {
    const p = ctx.player;
    rootPatch(ctx, p.x, p.y, 30, 0.8);
    const a = Math.random() * TAU;
    rootPatch(ctx, p.x + Math.cos(a) * 60, p.y + Math.sin(a) * 60, 24, 1.0);
    ctx.delay(0.8, () => {
      const p2 = ctx.player;
      for (const t of ctx.telegraphs) {
        if (t.type !== 'root' || t._done) continue;
        t._done = true;
        if (dist(t.x, t.y, p2.x, p2.y) < t.r + p2.radius) {
          p2.rootT = Math.max(p2.rootT || 0, 1.1);
          const d = p2.takeDamage(9 * b.phase, ctx, b);
          if (d > 0) ctx.onPlayerHit(d, '#7ae06a', b.name);
          ctx.fx.ring(p2.x, p2.y, 24, '#7ae06a', 0.5, 2);
        }
      }
    });
  },
  spores: (b, ctx) => {
    const p = ctx.player;
    const a = Math.atan2(p.y - b.y, p.x - b.x);
    volley(ctx, b.x, b.y, a, 12 + b.phase * 2, TAU / (12 + b.phase * 2), 120, 8 * b.phase, '#74c04a', 'toxic', { slow: 0.35, slowDur: 1.6 });
    rootPatch(ctx, p.x, p.y, 26, 0.9);
  },
  // ---------------- FROST KING ----------------
  spikes: (b, ctx) => {
    const p = ctx.player;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + b.t % 1;
      burstPatch(ctx, p.x + Math.cos(a) * 70, p.y + Math.sin(a) * 70, 22, 0.75, '#9cd8ff');
    }
    ctx.delay(0.75, () => {
      const p2 = ctx.player;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + b.t % 1;
        const x = p2.x + Math.cos(a) * 70, y = p2.y + Math.sin(a) * 70;
        ctx.fx.burst(x, y, '#9cd8ff', 6, { life: 0.4, spd: 120 });
        if (dist(x, y, p2.x, p2.y) < 26) {
          const d = p2.takeDamage(11 * b.phase, ctx, b);
          if (d > 0) ctx.onPlayerHit(d, '#9cd8ff', b.name);
        }
      }
    });
  },
  blizzard: (b, ctx) => {
    const p = ctx.player;
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * TAU;
      const x = p.x + Math.cos(a) * rand(30, 120), y = p.y + Math.sin(a) * rand(30, 120);
      burstPatch(ctx, x, y, 36, 0.9, '#7ec8ff');
      ctx.delay(0.9, () => {
        volley(ctx, x, y, Math.random() * TAU, 6, 0.5, 90, 6 * b.phase, '#7ec8ff', 'ice', { slow: 0.5, slowDur: 1.2 });
      });
    }
  },
  // ---------------- SAND TITAN ----------------
  rifts: (b, ctx) => {
    const p = ctx.player;
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * TAU;
      const x = p.x + Math.cos(a) * 80, y = p.y + Math.sin(a) * 80;
      const ex = x + Math.cos(a) * 90, ey = y + Math.sin(a) * 90;
      ctx.telegraphs.push({ x, y, x2: ex, y2: ey, dur: 0.7, t: 0.7, color: '#d4a04a', type: 'line', w: 20 });
      ctx.delay(0.7, () => {
        const a2 = Math.atan2(y - p.y, x - p.x);
        p.x += Math.cos(a2) * 26; p.y += Math.sin(a2) * 26;
        const d = p.takeDamage(10 * b.phase, ctx, b);
        if (d > 0) ctx.onPlayerHit(d, '#d4a04a', b.name);
        ctx.fx.dust(x, y, '#d4a04a', 8);
      });
    }
  },
  tornado: (b, ctx) => {
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * TAU;
      ctx.spawnProjectile({
        x: b.x, y: b.y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90,
        life: 3.2, dmg: 8 * b.phase, color: '#d4a04a', owner: 'enemy', size: 9,
        family: 'earth', homing: 2.2, slow: 0.4, slowDur: 1.4,
      });
    }
  },
  // ---------------- THE NULL ----------------
  shards: (b, ctx) => {
    const p = ctx.player;
    const a = Math.atan2(p.y - b.y, p.x - b.x);
    volley(ctx, b.x, b.y, a, 14, 0.22, 150, 10 * b.phase, '#985ce0', 'void');
    ctx.delay(0.45, () => {
      const p2 = ctx.player;
      const a2 = Math.atan2(p2.y - b.y, p2.x - b.x);
      volley(ctx, b.x, b.y, a2, 10, 0.2, 170, 11 * b.phase, '#bc84f4', 'void');
    });
  },
  swap: (b, ctx) => {
    const p = ctx.player;
    const a = Math.atan2(p.y - b.y, p.x - b.x);
    b.x = p.x - Math.cos(a) * 60; b.y = p.y - Math.sin(a) * 60;
    ctx.fx.flash(b.x, b.y, '#985ce0', 0.4);
    ctx.fx.burst(b.x, b.y, '#985ce0', 26, { life: 0.6, spd: 180 });
    const d = p.takeDamage(13 * b.phase, ctx, b);
    if (d > 0) ctx.onPlayerHit(d, '#985ce0', b.name);
  },
  // ---------------- THE TRAIN (terminus) ----------------
  beam: (b, ctx) => {
    const p = ctx.player;
    const a = Math.atan2(p.y - b.y, p.x - b.x);
    const len = 380;
    const ex = b.x + Math.cos(a) * len, ey = b.y + Math.sin(a) * len;
    ctx.telegraphs.push({ x: b.x, y: b.y, x2: ex, y2: ey, dur: 0.9, t: 0.9, color: '#ffe066', type: 'line', w: 30 });
    ctx.delay(0.9, () => {
      ctx.fx.beam(b.x, b.y - 12, ex, ey, '#ffe066', 14, 0.35);
      ctx.fx.shakeScreen(8, 0.4);
      const p2 = ctx.player;
      const t = (p2.x - b.x) * Math.cos(a) + (p2.y - b.y) * Math.sin(a);
      if (t > 0 && t < len) {
        const px = b.x + Math.cos(a) * t, py = b.y + Math.sin(a) * t;
        if (dist(px, py, p2.x, p2.y) < 20) { const d = p2.takeDamage(20 * b.phase, ctx, b); if (d > 0) ctx.onPlayerHit(d, '#ffe066', b.name); }
      }
    });
  },
  ram: (b, ctx) => {
    const p = ctx.player;
    const a = Math.atan2(p.y - b.y, p.x - b.x);
    const len = 240;
    const ex = b.x + Math.cos(a) * len, ey = b.y + Math.sin(a) * len;
    ctx.telegraphs.push({ x: b.x, y: b.y, x2: ex, y2: ey, dur: 0.7, t: 0.7, color: '#ff4d6a', type: 'line', w: 40 });
    ctx.delay(0.7, () => {
      b.vx = Math.cos(a) * 480; b.vy = Math.sin(a) * 480;
      ctx.fx.shakeScreen(9, 0.35);
    });
  },
  // ---------------- REALM BOSSES (new sectors) ----------------
  geysers: (b, ctx) => {
    const p = ctx.player;
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * TAU;
      const x = p.x + Math.cos(a) * rand(30, 110), y = p.y + Math.sin(a) * rand(30, 110);
      burstPatch(ctx, x, y, 26, 0.85, '#3a8a4a');
      ctx.delay(0.85 + i * 0.05, () => {
        ctx.fx.burst(x, y, '#74c04a', 10, { life: 0.5, spd: 140 });
        const p2 = ctx.player;
        if (dist(x, y, p2.x, p2.y) < 30) {
          const d = p2.takeDamage(12 * b.phase, ctx, b);
          if (d > 0) ctx.onPlayerHit(d, '#74c04a', b.name);
          p2.rootT = Math.max(p2.rootT || 0, 0.5);
        }
      });
    }
  },
  piston: (b, ctx) => {
    const p = ctx.player;
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * TAU;
      const x = p.x + Math.cos(a) * 70, y = p.y + Math.sin(a) * 70;
      burstPatch(ctx, x, y, 28, 0.6, '#ff4a18');
      ctx.delay(0.6, () => { ctx.spawnMeteor(x, y, 16 * b.phase, 44); ctx.fx.shakeScreen(5, 0.25); });
    }
  },
  stars: (b, ctx) => {
    const p = ctx.player;
    burstPatch(ctx, p.x, p.y, 90, 1.0, '#5a8aff');
    ctx.delay(1.0, () => {
      volley(ctx, p.x, p.y, 0, 16, TAU / 16, 130, 12 * b.phase, '#5a8aff', 'void');
      ctx.fx.flash(p.x, p.y, '#5a8aff', 0.5);
    });
  },
  echo: (b, ctx) => {
    const p = ctx.player;
    const a = Math.atan2(p.y - b.y, p.x - b.x);
    volley(ctx, b.x, b.y, a + 0.9, 8, 0.12, 170, 10 * b.phase, '#c07aff', 'void');
    ctx.delay(0.3, () => {
      volley(ctx, b.x, b.y, a - 0.9, 8, 0.12, 170, 10 * b.phase, '#c07aff', 'void');
      ctx.delay(0.3, () => volley(ctx, b.x, b.y, a, 10, 0.15, 190, 11 * b.phase, '#985ce0', 'void'));
    });
  },
};

// Which moves each boss cycles through.
const BOSS_CYCLE = {
  boss_conductor: ['fan', 'lane'],
  boss_ashen: ['pillars', 'charge'],
  boss_bell: ['rings', 'stun'],
  boss_root: ['vines', 'spores'],
  boss_frost: ['spikes', 'blizzard'],
  boss_sand: ['rifts', 'tornado'],
  boss_null: ['shards', 'swap'],
  boss_train: ['beam', 'ram'],
  boss_marsh: ['geysers', 'vines'],
  boss_foundry: ['piston', 'pillars'],
  boss_starlight: ['stars', 'shards'],
  boss_phantom: ['echo', 'swap'],
};

export class Boss {
  constructor(id, x, y, realmId, difficulty, sprites) {
    const def = BOSS_DEFS[id];
    this.id = id;
    this.name = def.name;
    this.realmId = realmId;
    this.difficulty = difficulty;
    this.sprites = sprites;
    this.spriteName = def.sprite;
    this.radius = def.radius;
    this.color = def.color;
    this.maxHp = def.hp * (difficulty.enemyHp || 1);
    this.hp = this.maxHp;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.alive = true;
    this.t = 0;
    this.phase = 1;
    this.phases = def.phases;
    this.flashT = 0;
    this.attackCd = 1.6;
    this.specialCd = 4;
    this.moveDir = 0;
    this.aiT = 0;
    this.deathT = 0;
    this.scale = 1;
    this.xpReward = 200;
    this.drops = [];
    this._introT = 1.4;
    this._id = uid();
    this.spawnAddsAt = { 0.6: false, 0.3: false };
    this.moves = BOSS_CYCLE[id] || ['shards'];
    this.moveIndex = 0;
  }

  update(dt, ctx) {
    this.t += dt;
    if (this._introT > 0) {
      this._introT -= dt;
      ctx.fx.flash(this.x, this.y, '#ffffff', 0.1);
      return;
    }
    if (!this.alive) {
      this.deathT -= dt;
      return;
    }
    if (this.flashT > 0) this.flashT -= dt;
    // Phase transitions
    const hpPct = this.hp / this.maxHp;
    const target = Math.min(this.phases, Math.floor((1 - hpPct) * this.phases) + 1);
    if (target > this.phase) {
      this.phase = target;
      ctx.fx.shakeScreen(8, 0.5);
      ctx.fx.flash(this.x, this.y, '#fff0a0', 0.4);
      ctx.fx.burst(this.x, this.y, this.color, 40, { life: 0.7, spd: 200 });
      ctx.gameStats.phaseChanges = (ctx.gameStats.phaseChanges || 0) + 1;
      // LEARNABLE PUNISH WINDOW: right after a phase change the boss
      // is exposed for 3 seconds — 1.5x damage, ring + label shown.
      this.vulnT = 3.0;
      this.vx = 0; this.vy = 0;
    }
    // Attack cycle: common beat -> signature beat -> common beat -> signature beat
    this.attackCd -= dt;
    if (this.attackCd <= 0) {
      const sig = this.moveIndex % 2 === 1;
      const att = sig ? this.moves[Math.floor(this.moveIndex / 2) % this.moves.length] : 'slam';
      this.moveIndex += 1;
      this.attackCd = sig ? (4.4 - this.phase * 0.25) : (3.4 - this.phase * 0.2);
      this._performAttack(att, ctx);
    }
    this._moveAI(dt, ctx);

    const p = ctx.player;
    if (dist(this.x, this.y, p.x, p.y) < this.radius + p.radius) {
      const dealt = p.takeDamage((this.dmg || 20) * dt * 2.2, ctx, this);
      if (dealt > 0) ctx.onPlayerHit(dealt, this.color, this.name);
    }

    if (this.id === 'boss_summoner' || this.id === 'boss_null' || this.id === 'boss_phantom') {
      if (!this.spawnAddsAt[0.6] && hpPct < 0.6) {
        this.spawnAddsAt[0.6] = true;
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * TAU;
          ctx.spawnEnemy('wraithling', this.x + Math.cos(ang) * 60, this.y + Math.sin(ang) * 60);
        }
      }
      if (!this.spawnAddsAt[0.3] && hpPct < 0.3) {
        this.spawnAddsAt[0.3] = true;
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * TAU;
          ctx.spawnEnemy('void_sentinel', this.x + Math.cos(ang) * 60, this.y + Math.sin(ang) * 60);
        }
      }
    }
  }

  _moveAI(dt, ctx) {
    const p = ctx.player;
    const d = dist(this.x, this.y, p.x, p.y);
    const ang = Math.atan2(p.y - this.y, p.x - this.x);
    let spd = 50 + this.phase * 12;
    if (d < 90) spd *= 0.3;
    this.vx = Math.cos(ang) * spd;
    this.vy = Math.sin(ang) * spd;
    if (this.id === 'boss_bell') { this.vx *= 0.4; this.vy *= 0.4; }
    if (this.id === 'boss_root') { this.vx *= 0.2; this.vy *= 0.2; }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  _performAttack(id, ctx) {
    const p = ctx.player;
    if (id === 'slam') {
      const R = 84;
      burstPatch(ctx, this.x, this.y, R, 0.75, this.color);
      ctx.delay(0.75, () => {
        ctx.fx.shakeScreen(6, 0.25);
        ctx.fx.burst(this.x, this.y, this.color, 26, { life: 0.5, spd: 150, size: 2 });
        ctx.fx.ring(this.x, this.y, R, this.color, 0.4, 3);
        const p2 = ctx.player;
        if (dist(this.x, this.y, p2.x, p2.y) < R) {
          const d = p2.takeDamage(15 * this.phase, ctx, this);
          if (d > 0) ctx.onPlayerHit(d, this.color, this.name);
        }
        this.vx *= 0.2; this.vy *= 0.2;
      });
      return;
    }
    if (id === 'projectiles') {
      const count = 6 + this.phase * 2;
      const ang0 = Math.atan2(p.y - this.y, p.x - this.x);
      volley(ctx, this.x, this.y, ang0, count, 0.15, 110, 12 * this.phase, this.color,
        this.realmId === 'void' ? 'void' : this.realmId === 'frozen' ? 'ice' : 'fire');
      return;
    }
    if (id === 'dash') {
      const ang = Math.atan2(p.y - this.y, p.x - this.x);
      this.vx = Math.cos(ang) * 360;
      this.vy = Math.sin(ang) * 360;
      ctx.fx.shakeScreen(4, 0.2);
      return;
    }
    const fn = MOVES[id];
    if (fn) { fn(this, ctx); return; }
    this._genericSpecial(ctx);
  }

  _genericSpecial(ctx) {
    const p = ctx.player;
    if (this.realmId === 'frozen') {
      ctx.fx.burst(this.x, this.y, '#a8d4f4', 32, { life: 0.6, spd: 200 });
      const d = p.takeDamage(10 * this.phase, ctx, this);
      if (d > 0) ctx.onPlayerHit(d, '#a8d4f4', this.name);
    } else if (this.realmId === 'infernal') {
      for (let i = 0; i < 5; i++) {
        const tx = p.x + (Math.random() - 0.5) * 100;
        const ty = p.y + (Math.random() - 0.5) * 100;
        ctx.spawnMeteor(tx, ty, 14 * this.phase, 40);
      }
    } else if (this.realmId === 'desert') {
      for (let i = 0; i < 60; i++) {
        const a = Math.random() * TAU;
        ctx.fx.dust(this.x + Math.cos(a) * 100, this.y + Math.sin(a) * 100, '#d4a04a');
      }
      for (const e of ctx.enemiesInRange(this.x, this.y, 220)) {
        const a = Math.atan2(this.y - e.y, this.x - e.x);
        e.x += Math.cos(a) * 30; e.y += Math.sin(a) * 30;
      }
    } else if (this.realmId === 'void') {
      ctx.fx.flash(p.x, p.y, '#985ce0', 0.6);
      ctx.fx.burst(this.x, this.y, '#985ce0', 40, { life: 1.0, spd: 250 });
      const d = p.takeDamage(8 * this.phase, ctx, this);
      if (d > 0) ctx.onPlayerHit(d, this.color, this.name);
    } else if (this.realmId === 'terminus') {
      ctx.fx.shakeScreen(6, 0.4);
      volley(ctx, this.x, this.y, 0, 6, TAU / 6, 140, 10 * this.phase, '#9a8aa0', 'train');
    } else {
      ctx.fx.burst(this.x, this.y, this.color, 16, { life: 0.5, spd: 160 });
    }
  }

  takeDamage(amount, opts = {}) {
    if (!this.alive) return 0;
    const dealt = Math.min(this.hp, amount);
    this.hp -= amount;
    this.flashT = 0.1;
    if (opts.burn) { this.burnT = opts.burnDur || 3; this.burnDps = Math.max(this.burnDps || 0, opts.burn); }
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.deathT = 1.2;
    }
    return dealt;
  }
}
