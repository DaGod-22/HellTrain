// ============================================================
// HELL TRAIN — GAMEPLAY
// The run itself: director-driven waves, the Conductor, the Train,
// bosses, loot, the Ascension Grid and the Apocalypse Protocol.
// ============================================================
import { CFG } from '../core/config.js';
import { rand, randInt, clamp, dist, TAU, fmtNum, fmtTime } from '../core/utils.js';
import { World, T } from '../core/world.js';
import { FXSystem } from './fx.js';
import { Renderer, GameCamera, TimeFlow } from '../core/render.js';
import { Player } from '../entities/player.js';
import { makeEnemy } from '../entities/enemy.js';
import { Projectile, Meteor, Flame, Bomb, Pool, BlackHole } from '../entities/projectile.js';
import { Pickup } from '../entities/pickup.js';
import { Boss } from '../entities/boss.js';
import { Train } from '../entities/train.js';
import { REALMS, ACHIEVEMENTS, findRealm, findDifficulty, RELICS, LORE, hasDifficultyRule } from '../data/realms.js';
import { ENDINGS, REALM_RELICS, findEnding } from '../data/endings.js';
import { ASCENSIONS, APOCALYPSE_PROTOCOL, APOCALYPSE_CARDS, RARITY_COLORS, ROMAN,
  rollCards, apocalypseReady, findAscension, offerPool } from '../data/upgrades.js';
import { applyPermaToPlayer, applyPermaToTrain } from '../data/shop.js';
import { checkSynergies } from '../data/upgrades_bridge.js';
import { WEAPONS, findWeapon } from '../data/weapons.js';
import { addCoins, saveSave, recordLocalScore } from '../core/save.js';
import { SOUNDS } from '../core/sound.js';
import { masteryMult } from '../data/mastery.js';
import { bumpGoal } from '../data/goals.js';
import { drawCard, drawPanel, drawBar, drawIcon, text, textC } from '../ui/widgets.js';

const AMBIENT = {
  purgatory: '#8e8ebc', infernal: '#b06a52', forgotten: '#7e7ea4', forest: '#6a9070',
  frozen: '#90b0dc', desert: '#c8ac82', void: '#7a64a8', terminus: '#a89684', phantom: '#7a64a8',
};

// Lit floor colours — brighter than the raw realm colour so the world
// still reads once the lighting multiply pass lands on it.
const FLOOR = {
  purgatory: ['#332748', '#2a1f3c', '#241a33'],
  infernal:  ['#4a2016', '#3a1710', '#2e110c'],
  forgotten: ['#2a2a40', '#222234', '#1b1b2a'],
  forest:    ['#1e3822', '#182e1c', '#132516'],
  frozen:    ['#26405e', '#1e3450', '#182a42'],
  desert:    ['#5c4526', '#4c391f', '#3e2e19'],
  void:      ['#1a1038', '#140c2c', '#0e0822'],
  terminus:  ['#2a2a2e', '#222226', '#1a1a1e'],
  phantom:   ['#241440', '#1c1034', '#150c28'],
};

const floorOf = (id, n) => (FLOOR[id] || FLOOR.purgatory)[n % 3];
function isOffensiveAsc(asc){
  if(!asc) return false;
  if(asc.target === 'train') return false;
  const passiveFamilies = new Set(['defence','utility','mobility','train']);
  return !passiveFamilies.has(asc.family);
}
function countCaps(owned){
  let total=0, off=0, pas=0;
  for(const id in owned){
    const asc = ASCENSIONS.find(a=>a.id===id);
    if(!asc) continue;
    if(asc.req) continue; // evolved/final excluded
    if(asc.rarity === 'apocalypse') continue;
    total++;
    if(isOffensiveAsc(asc)) off++; else pas++;
  }
  return {total, off, pas};
}

const GRADE = {
  purgatory: '#6a5ce0', infernal: '#ff5a20', forgotten: '#8a9ad0', forest: '#4ad06a',
  frozen: '#7ac0ff', desert: '#ffc060', void: '#a05cff', terminus: '#ffd060', phantom: '#c07aff',
};

// ================================================================
// SECTOR THEMES — every sector of a run announces itself in the
// first seconds: palette shift, drifting ambience, and a themed
// enemy mix. Cycles by stage: 1 EMBERFALL, 2 FROSTLINE, 3 ECLIPSE...
// ================================================================
const SECTOR_THEMES = [
  { id: 'emberfall', name: 'EMBERFALL', color: '#ff7a33', tint: '#ff5a2040', ambient: 'ember', ambientN: 90,
    desc: 'Embers ride the wind and fire-things stalk the line.',
    roster: ['fire_caster', 'molten_slinger', 'firefly_swarm', 'ash_brute', 'ember_herald'] },
  { id: 'frostline', name: 'FROSTLINE', color: '#7ec8ff', tint: '#7ec8ff33', ambient: 'snow', ambientN: 90,
    desc: 'A killing cold. Ice-things chill you to the bone.',
    roster: ['void_sentinel', 'shadow_bat', 'station_caster', 'crawler', 'comet_crawler'] },
  { id: 'eclipse', name: 'ECLIPSE', color: '#c07aff', tint: '#7a3aff44', ambient: 'spark', ambientN: 80,
    desc: 'The sun blinks out. Pale wisps drink the dark.',
    roster: ['star_wisp', 'void_reaver', 'wraith_summoner', 'mirror_wisp', 'void_sentinel'] },
  { id: 'overgrowth', name: 'OVERGROWTH', color: '#98e066', tint: '#4ad06a33', ambient: 'leaf', ambientN: 70,
    desc: 'Blooms strangle the rails. Spore-things bloom too.',
    roster: ['slime', 'marsh_lurker', 'vine_tangler', 'slag_gobbler', 'firefly_swarm'] },
];
const themeOf = (stage) => SECTOR_THEMES[(stage - 1) % SECTOR_THEMES.length];

// ================================================================
// ROUTE CARDS — shown after each sector. Every effect is written
// out with exact numbers BEFORE you choose. No hidden rolls.
// ================================================================
const ROUTE_POOL = [
  { id: 'gold_rush', name: 'GOLD RUSH', color: '#ffe066', icon: 'coinbag',
    desc: ['+80% coins from kills', 'enemies 15% faster'],
    mods: { coinMul: 1.8, spdMul: 1.15 } },
  { id: 'blood_moon', name: 'BLOOD MOON', color: '#ff5a5a', icon: 'skull',
    desc: ['elites arrive 35% faster', '+50% XP from all kills'],
    mods: { eliteMul: 0.65, xpMul: 1.5 } },
  { id: 'safe_line', name: 'SAFE LINE', color: '#7ae06a', icon: 'heart',
    desc: ['heal 60% of max HP now', 'coins from kills −25%'],
    mods: { heal: 0.6, coinMul: 0.75 } },
  { id: 'overcharge', name: 'OVERCHARGE', color: '#ff9033', icon: 'bolt',
    desc: ['+25% damage dealt', 'enemies +15% HP'],
    mods: { dmgMul: 1.25, hpMul: 1.15 } },
  { id: 'ghost_march', name: 'GHOST MARCH', color: '#c07aff', icon: 'ghost',
    desc: ['enemies 20% slower', 'XP from kills −20%'],
    mods: { spdMul: 0.8, xpMul: 0.8 } },
  { id: 'scavenger', name: 'SCAVENGER LINE', color: '#8ef0ff', icon: 'gift',
    desc: ['a chest drops every 35s', 'coins from kills −10%'],
    mods: { chestFast: true, coinMul: 0.9 } },
];
// deterministic pick of 3 distinct routes per sector
function routeOptions(stage, seed) {
  let s = (seed ^ (stage * 0x9E3779B1)) >>> 0;
  const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pool = ROUTE_POOL.slice();
  const out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}

// CHALLENGE DOORS — optional, exact reward printed on the door itself
const CHALLENGE_TYPES = [
  { id: 'survive', name: 'THE LONG MINUTE', icon: 'shield', reward: 350,
    goal: 'SURVIVE 30 SECONDS', rewardText: '350 COINS' },
  { id: 'elites', name: 'HEAD HUNT', icon: 'crown', reward: 500,
    goal: 'SLAY 3 ELITES', rewardText: '500 COINS' },
  { id: 'core', name: 'SHIELD CORE', icon: 'target', reward: 400,
    goal: 'BREAK THE SHIELD CORE', rewardText: '400 COINS' },
];
// SECTOR MUSIC — each theme hums its own four-note loop; bosses double
// the tempo. Pure synthesis, volume tied to the sound setting.
const THEME_MUSIC = {
  emberfall: { notes: [110, 131, 98, 110], step: 0.42, type: 'sawtooth', vol: 0.045 },
  frostline: { notes: [392, 523, 440, 349], step: 0.55, type: 'sine', vol: 0.05 },
  eclipse:   { notes: [147, 156, 110, 123], step: 0.5, type: 'triangle', vol: 0.05 },
  overgrowth:{ notes: [196, 220, 262, 196], step: 0.46, type: 'triangle', vol: 0.045 },
};

// elite modifier -> the one-line hint shown when it spawns
const ELITE_HINTS = {
  armoured: 'ARMORED ELITE — shatter its shell first!',
  fast: 'SWIFT ELITE — it will close the gap fast!',
  giant: 'COLOSSAL ELITE — slow, but hits like a train!',
  regenerating: 'REGENERATING ELITE — burst it down or lose it!',
  teleporting: 'PHASING ELITE — it blinks across the field!',
  summoner: 'HIVE ELITE — it keeps calling reinforcements!',
  enraged: 'ENRAGED ELITE — furious and twice as mean!',
  void_touched: 'VOID ELITE — fire will not burn it!',
};
// short tags for packs and spawn markers
const ELITE_SHORT = {
  armoured: 'ARMORED',
  fast: 'SWIFT',
  giant: 'COLOSSAL',
  regenerating: 'REGEN',
  teleporting: 'PHASING',
  summoner: 'HIVE',
  enraged: 'ENRAGED',
  void_touched: 'VOID',
};

export class GameplayScene {
  constructor(engine) {
    this.engine = engine;
    this.canvas = engine.canvas;
    this.art = engine.sprites;
    this.renderer = new Renderer(CFG.VIEW_W, CFG.VIEW_H);
    this.camera = new GameCamera(CFG.VIEW_W, CFG.VIEW_H, 2);
    this.time = new TimeFlow();
    this.fx = new FXSystem(3000, this.art);
    this.input = engine.input;
  }

  // ================================================================
  // RUN SETUP
  // ================================================================
  enter(params = {}) {
    const engine = this.engine;
    this.save = params.save || engine.save;
    this.realmId = params.realmId || 'purgatory';
    this.stage = params.stage || 1;
    this.difficulty = findDifficulty(params.difficulty || engine._difficulty || 'normal');
    this.runSeed = params.runSeed || ((Math.random() * 4294967295) >>> 0);
    this.weeklyChallenge = params.weeklyChallenge || null;
    this.dailySeed = params.dailySeed || null;

    this.fx = new FXSystem(3000, this.art);
    this.camera = new GameCamera(CFG.VIEW_W, CFG.VIEW_H, 2);
    this.time = new TimeFlow();
    this.renderer.settings.bloom = this.save.settings?.bloom ?? 1;
    this.renderer.settings.lighting = this.save.settings?.lighting ?? 1;
    this.renderer.settings.scanlines = this.save.settings?.scanlines ?? 0;

    this.world = new World(this.runSeed ^ hashStr(this.realmId + this.stage), this.realmId, this.difficulty);
    this.player = new Player(this.world.playerSpawn.x, this.world.playerSpawn.y, this.art, this.save);
    applyPermaToPlayer(this.player, this.save);
    // PERMANENT RELIC LOADOUT — carried into every run (meta progression)
    const relicDef = RELICS.find(r => r.id === (this.save.activeRelic || null));
    if (relicDef && (this.save.relics || []).includes(relicDef.id)) {
      try { relicDef.apply(this.player); this.relicActive = relicDef; } catch {}
    }
    this.player.addWeapon('fireball');
    this.player.onLevelUp = () => this._queueLevelUp();
    this.fx.damageNumbers = (this.save.settings?.damageNumbers ?? 1) !== 0;

    this.train = new Train(this.player.x - 90, this.player.y + 26, this.art, this.difficulty, this.save);
    applyPermaToTrain(this.train, this.save);
    for (let i = 0; i < (this.train.extraSlots || 0); i++) this.train.mountRandomWeapon();

    this.enemies = []; this.projectiles = []; this.pickups = [];
    this.meteors = []; this.flames = []; this.bombs = []; this.pools = []; this.holes = [];
    this.boss = null; this.bossSpawned = false; this.bossDefeated = false;

    this.owned = {};                 // ascension id -> level
    this.pendingLevelUps = 0;
    this.cards = null;
    // v1.8 CAMERA DIRECTOR + HIT-STOP MATRIX
    this.hitStop = 0;      // world freezes exactly this long on big hits
    this.radialT = 0;      // radial-blur decay timer
    this.glitchT = 0;      // extra chromatic-aberration decay timer
    this.cardIndex = 0;
    this.rerolls = (this.player.freeRerolls || 0);
    this.banishes = 1;
    this.paused = false;
    this.runTime = 0;
    this.sectorDuration = 120 + (this.stage - 1) * 60; // 2min base +1min per sector
    this.sectorTimeLeft = this.sectorDuration;
    this._sectorWarned30 = false;
    this._sectorWarned10 = false;
    this.runCoins = 0;
    this._enemyCap = 70;
    this._projCap = 80;
    this._enemyProjCap = 34;
    this._orbitalCap = 4;
    this._droneCap = 3;
    this.telegraphs = [];       // boss danger markers
    this.delayed = [];          // boss scheduled attacks
    this.waypoint = null;       // mid-sector opportunity event
    this.waypointT = 17;
    this.buffs = { dmgT: 0, dmgMult: 1, xpT: 0, xpMult: 1 };
    this.pity = { bad: 0, newfam: 0, focus: 0 };
    this.lastHitBy = null;
    this.deathSeq = 0;
    this.stopCard = 2.6;
    this.relicActive = null;
    this.gameStats = { shards: 0, kills: 0, elites: 0, bosses: 0 };
    this.runStats = { kills: 0, damageDealt: 0, damageTaken: 0, level: 1, coins: 0, bestCombo: 0 };
    this.magnetAll = false;
    this._magnetT = 0;
    this.director = { t: 0, wave: 0, nextWave: 3, budget: 0, eliteT: 45, chestT: 38 };
    this._ended = false;
    this._flash = { a: 0, color: '#ffffff' };
    this.apocalypseActive = false;
    this._synergiesFired = {};

    // ---- v1.4: multi-sector runs ----
    this.maxSectors = 3;
    this.theme = themeOf(this.stage);
    this.routeMods = null;          // chosen route modifiers for this sector
    this.routeName = null;
    this.routeCards = null;         // overlay: pick next sector's route
    this.transition = 0;            // sector-clear cinematic timer
    this.dmgByWeapon = {};          // weaponId -> damage dealt (run summary)
    this.door = null;               // optional challenge door in the field
    this.doorT = 24;
    this.challenge = null;          // active challenge state
    this.challengesWon = 0;
    this.themeT = 6;                // how long the theme banner stays up
    this.hazards = [];              // VOLATILE ASH burning ground
    this._secondWindUsed = false;   // SECOND WIND rule, once per sector
    this._furnaceHintDone = false;
    this.pillars = [];              // boss-arena cover, themed per sector
    this.surgeT = 26;               // ESCALATION: ring-surge timer (stage 2+)
    this.lieutenant = null;         // THE GAUNTLET: named mini-boss (stage 3)
    this.lieutenantT = 20;
    this._musicT = 0; this._musicStep = 0;
    // FORGE BOONS — bought with shards, honest and permanent
    const boons = this.save.permaBoons || {};
    if (boons.starterKit) { this.rerolls += 1; this.banishes += 1; }
    if (boons.extraBanish) this.banishes += 1;
    if (boons.furnaceStart) this.train.furnace = Math.round(this.train.furnaceMax * 0.5);

    // veteran perma: start with extra levels
    for (let i = 0; i < (this.player.startLevelBonus || 0); i++) {
      this.player.level += 1; this.pendingLevelUps += 1;
    }

    this.camera.x = this.player.x; this.camera.y = this.player.y;
    this._spawnAmbient();
    if (this.pendingLevelUps > 0) this._openCards();
    this.fx.banner(this.player.x, this.player.y - 40, findRealm(this.realmId).name.toUpperCase() + ' — ' + this.theme.name, this.theme.color);
  }
  exit() {}

  _spawnAmbient() {
    this.ambientBits = [];
    const kinds = { frozen: 'snow', infernal: 'ember', desert: 'sand', forest: 'leaf',
      void: 'spark', phantom: 'spark', terminus: 'spark' };
    const kind = kinds[this.realmId] || 'fog';
    for (let i = 0; i < 70; i++) {
      this.ambientBits.push({ kind, x: rand(-300, 300), y: rand(-200, 200), s: rand(0.4, 1.4) });
    }
  }

  // ================================================================
  // CONTEXT API used by entities
  // ================================================================
  spawnProjectile(o) {
    if (o.owner === 'enemy') {
      const enemyCount = this.projectiles.filter(p => p.owner === 'enemy').length;
      if (enemyCount >= this._enemyProjCap) return; // bullet-hell governor: keep the screen readable
    }
    if(this.projectiles.length >= this._projCap){
      // cull oldest ENEMY shot first so our own shots never get eaten
      const idx = this.projectiles.findIndex(p => p.owner === 'enemy');
      if (idx >= 0) this.projectiles.splice(idx, 1);
      else this.projectiles.shift();
    }
    // cap orbitals/drones via player
    if(o.omega){
      const orbitals = this.projectiles.filter(p=>p.omega).length;
      if(orbitals >= this._orbitalCap) return;
    }
    if(o.drone){
      const drones = this.projectiles.filter(p=>p.drone).length;
      if(drones >= this._droneCap) return;
    }
    this.projectiles.push(new Projectile(o));
  }
  spawnBomb(x, y, o) { this.bombs.push(new Bomb(x, y, o)); }
  spawnPool(x, y, o) { this.pools.push(new Pool(x, y, o)); }
  spawnBlackhole(x, y, o) { this.holes.push(new BlackHole(x, y, o)); }
  spawnMeteor(x, y, dmg, radius) { this.meteors.push(new Meteor(x, y, { x, y }, dmg, radius)); }
  spawnFlame(x, y, ang, range, dmg) { this.flames.push(new Flame(x, y, ang, range, dmg)); }
  spawnEnemy(id, x, y) {
    const e = makeEnemy(id, x, y, this.realmId, this.difficulty);
    if (!e) return null;
    e._id = ++ID; this.enemies.push(e);
    return e;
  }
  enemiesInRange(x, y, r) {
    const out = []; const r2 = r * r;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - x, dy = e.y - y;
      if (dx * dx + dy * dy <= r2) out.push(e);
    }
    return out;
  }
  findNearestEnemy(x, y, maxR) {
    let best = null, bd = maxR * maxR;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - x, dy = e.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= bd) { best = e; bd = d2; }
    }
    if (this.boss?.alive && !best) {
      if (dist(x, y, this.boss.x, this.boss.y) < maxR) return this.boss;
    }
    return best;
  }
  addRunCoins(n) { this.runCoins += n; this.runStats.coins += n; }
  magnetPulse() {
    this.magnetAll = true; this._magnetT = 1.2;
    this.fx.ring(this.player.x, this.player.y, 200, '#f080cc', 0.5, 3);
  }
  onPlayerHit(dealt, color, byName) {
    if (byName) this.lastHitBy = byName;
    try{ SOUNDS.hit(dealt, dealt>20); }catch{}
    this.fx.damageText(this.player.x, this.player.y - 20, '-' + Math.round(dealt), '#ff5a5a', { size: 8 });
    this.fx.screenTint('#ff2020', 0.22);
    this.fx.shakeScreen(5, 0.2);
    this.camera.shake(0.35);
    this.time.hit(0.05);
    this.runStats.damageTaken += dealt;
    this.fx.blood(this.player.x, this.player.y, '#a01f12', 6);
  }
  onRevive(p) {
    this.fx.explosion(p.x, p.y, 'explHoly', 3, { lightColor: '#ffe066' });
    this.fx.banner(p.x, p.y - 40, 'PHOENIX CLAUSE', '#ffb020');
    for (const e of this.enemiesInRange(p.x, p.y, 140)) this.dealDamage(e, 200, { family: 'holy' });
    this.camera.shake(0.8);
  }
  onApocalypse() {
    this.apocalypseActive = true;
    this.fx.banner(this.player.x, this.player.y - 44, 'APOCALYPSE PROTOCOL', '#ff2a2a');
    this.fx.screenTint('#ff2020', 0.85);
    this.camera.shake(1);
    this.time.slowmo(1.2, 0.25);
    this.save.stats.apocalypses = (this.save.stats.apocalypses || 0) + 1;
  }
  extinctionEvent(dmg) {
    this.fx.screenTint('#ffffff', 0.7);
    this.camera.shake(1);
    this.time.slowmo(0.5, 0.3);
    for (const e of this.enemies) {
      if (!e.alive) continue;
      this.fx.explosion(e.x, e.y, 'explVoid', 1, { lightColor: '#ff2a2a' });
      this.dealDamage(e, dmg, { family: 'apocalypse' });
    }
    if (this.boss?.alive) this.dealDamage(this.boss, dmg, { family: 'apocalypse', boss: true });
  }
  openChest() {
    // a free upgrade card + a printed +8 shard bounty
    this.pendingLevelUps += 1;
    this.gameStats.shards += 8;
    this.fx.banner(this.player.x, this.player.y - 30, 'RELIC CHEST — +8 SHARDS', '#ffe066');
    this._openCards();
  }
  spawnExplosion(x, y, radius, dmg, family) {
    radius *= (this.player?.aoeMult || 1);
    const kind = family === 'ice' ? 'explIce' : family === 'void' ? 'explVoid' :
      family === 'holy' ? 'explHoly' : family === 'toxic' ? 'explToxic' : 'explFire';
    this.fx.explosion(x, y, kind, Math.max(0.5, radius / 26), {
      lightColor: family === 'ice' ? '#a8d4f4' : family === 'void' ? '#c07aff' : '#ffb060',
    });
    this.fx.shakeScreen(3, 0.12);
    this.camera.shake(0.18);
    this.fx.decal(x, y, radius * 0.35, '#150a12', 8);
    for (const e of this.enemiesInRange(x, y, radius)) {
      this.dealDamage(e, dmg, { family, x, y, knockback: 60 });
    }
    if (this.boss?.alive && dist(x, y, this.boss.x, this.boss.y) < radius + this.boss.radius) {
      this.dealDamage(this.boss, dmg, { family, boss: true });
    }
  }

  // ---------------- the one true damage function ----------------
  dealDamage(target, amount, opts = {}) {
    if (!target || !target.alive) return 0;
    const p = this.player;
    const { dmg, crit } = p.rollDamage(amount, target);
    target._lastCrit = !!crit;
    let final = dmg;
    // WEAPON MASTERY — the more kills a weapon family lands, the harder it hits
    if (opts.family) {
      const mm = masteryMult(this.save?.familyKills?.[opts.family] || 0);
      if (mm > 1) final *= mm;
    }
    // BOSS PHASE-CHANGE VULNERABILITY — the promised punish window
    const vulnerable = target.vulnT > 0;
    if (vulnerable) final *= 1.5;
    // mid-sector beacon buff (from waypoint events)
    if (this.buffs.dmgT > 0) final *= this.buffs.dmgMult;
    // status riders from the build
    const rider = {
      family: opts.family, x: opts.x ?? p.x, y: opts.y ?? p.y,
      knockback: opts.knockback ?? (p.knockback || 0), angle: opts.angle,
      burn: (opts.burn || 0) + (p.burnDmg || 0), burnDur: p.burnDur || 3,
      chill: p.chill || 0, slow: opts.slow, slowDur: opts.slowDur,
    };
    if (p.absoluteZero && (rider.chill > 0 || opts.family === 'ice') && Math.random() < 0.25) rider.freeze = 1.4;
    if (target.freezeT > 0 && p.absoluteZero) final *= 3;
    if (p.headsman && !opts.boss && target.maxHp && target.hp / target.maxHp < p.headsman) {
      final = target.hp + 1;
      this.fx.damageText(target.x, target.y - 16, 'EXECUTE', '#ff4d6a', { size: 8, crit: true });
    }
    const dealt = target.takeDamage(final, rider) ?? final;
    this.runStats.damageDealt += dealt;
    // per-weapon damage bookkeeping (run summary breakdown)
    {
      const key = opts.weaponId || opts.family || 'other';
      this.dmgByWeapon[key] = (this.dmgByWeapon[key] || 0) + dealt;
    }

    // feedback
    const big = final > p.maxHp * 0.4 || crit || vulnerable;
    if (!opts.small || crit) {
      this.fx.damageText(target.x + rand(-4, 4), target.y - (target.radius || 8) - 4,
        Math.round(final) + (crit ? '!' : ''), vulnerable && !crit ? '#8ef0ff' : crit ? '#ffe066' : '#ffffff',
        { size: crit ? 10 : 8, crit });
    }
    this.fx.sparks(target.x, target.y, crit ? '#ffe066' : '#ffd0a0', crit ? 6 : 3,
      opts.angle ?? rand(0, TAU), 0.8, crit ? 160 : 90);
    if (big) { this.time.hit(crit ? 0.05 : 0.03); this.camera.shake(crit ? 0.2 : 0.1); }
    // per-family impact feel: each element lands differently
    switch (opts.family) {
      case 'fire': this.fx.fire(target.x, target.y, '#ff7a33'); break;
      case 'ice': this.fx.shard(target.x, target.y, '#a8d4f4', 5); break;
      case 'void': this.fx.ring(target.x, target.y, 12, '#c07aff', 0.25, 2); break;
      case 'lightning': this.fx.sparks(target.x, target.y, '#fff066', 4, rand(0, TAU), 0.5, 200); break;
      case 'saw': case 'orbital': this.fx.sparks(target.x, target.y, '#d0d4e8', 4, (opts.angle ?? 0) + Math.PI * 0.75, 0.5, 140); break;
      case 'plasma': this.fx.flash(target.x, target.y, '#2ff0ff', 0.06, 8); break;
      default: break;
    }
    try {
      if (big && this.runTime - (this._lastHitSfx || -1) > 0.09) {
        this._lastHitSfx = this.runTime;
        const sfxMap = { fire: 'fire', ice: 'ice', lightning: 'lightning', void: 'void', plasma: 'ice', orbital: 'orbital', saw: 'orbital', explosive: 'fire', tech: 'lightning' };
        SOUNDS.shoot(sfxMap[opts.family] || 'fire');
      }
    } catch {}
    if (p.lifesteal > 0 && !opts.byTrain) p.heal(dealt * p.lifesteal);
    if (opts.lifesteal) p.heal(dealt * opts.lifesteal);

    // chains
    if (p.chain > 0 && !opts.isChain && Math.random() < 0.5) {
      const near = this.enemiesInRange(target.x, target.y, p.chainMaster ? 180 : 90)
        .filter(e => e !== target).slice(0, p.chain);
      for (const e of near) {
        this.fx.lightning(target.x, target.y, e.x, e.y, '#8ef0ff', 4, 0.12);
        this.dealDamage(e, amount * 0.4, { family: 'lightning', isChain: true, small: true });
      }
    }

    if (!target.alive) this._onKill(target, opts);
    return dealt;
  }

  onEnemyDeath(e) { this._onKill(e); }

  _onKill(e, opts = {}) {
    const p = this.player;
    if (e === this.boss) { this._onBossKilled(e); return; }
    p.onKill(this, e);
    this.gameStats.kills++; this.runStats.kills++;
    this.runStats.bestCombo = Math.max(this.runStats.bestCombo, p.combo);

    // WEAPON MASTERY + DAILY GOALS — every kill feeds the long game
    try {
      this.save.familyKills = this.save.familyKills || {};
      const fam = opts.family || (opts.weaponId ? findWeapon(opts.weaponId)?.family : null);
      if (fam) this.save.familyKills[fam] = (this.save.familyKills[fam] || 0) + 1;
      bumpGoal(this.save, 'kills', 1);
      if (e.eliteMod) { bumpGoal(this.save, 'elites', 1); if (this.challenge?.type === 'elites') this._challengeEliteKill(); }
      if (e === this.lieutenant) {
        this.lieutenant = null;
        this.gameStats.shards += 40;
        this._impact(0.7, { hitStop: 0.05, tint: '#ffe066' });
        try { this.fx.disintegrate(e.x, e.y, '#ffe066', 16); } catch {}
        this.fx.banner(this.player.x, this.player.y - 50, 'LIEUTENANT DOWN — +40 SHARDS', '#ffe066');
        this.director.eliteT = Math.max(this.director.eliteT, 20);
      }
    } catch {}

    // THE FURNACE: kills stoke the train. Fight BESIDE the iron horse and
    // it heats twice as fast — positioning is the decision.
    try {
      if (!this.train.dead) {
        const near = dist(this.player.x, this.player.y, this.train.x, this.train.y) < 130;
        this.train.furnace = Math.min(this.train.furnaceMax,
          this.train.furnace + (opts.byTrain ? 5 : near ? 4 : 2));
      }
    } catch {}

    // VOLATILE ASH rule: the slain burst into burning ground
    if (hasDifficultyRule(this.difficulty, 'volatile_ash') && Math.random() < 0.25 && (e.radius || 7) < 12) {
      this.hazards.push({ x: e.x, y: e.y, r: 13 + (e.radius || 6), life: 2.6, tick: 0 });
      this.fx.spawn({ x: e.x, y: e.y, vx: 0, vy: -20, color: '#ff7a33', life: 0.5, size: 3, endSize: 0.5 });
    }

    // visuals — v1.8: fragment into neon embers + charcoal dust on the wind
    this.fx.explosion(e.x, e.y, 'impact', (e.radius || 7) / 9, { light: 0.6, speed: 26 });
    this.fx.blood(e.x, e.y, '#7a1010', e.giant ? 10 : 4);
    try { this.fx.disintegrate(e.x, e.y, e.color || '#ff7a55', e.radius || 7); } catch {}
    if (e._lastCrit) this._impact(0.22);
    this.fx.decal(e.x, e.y, (e.radius || 7) * 0.8, '#2a0808', 10);
    this.fx.shard(e.x, e.y, '#ffd0a0', 4);

    // loot (route card coins modifier applies here)
    const routeCoin = this.routeMods?.coinMul ?? 1;
    const eliteMul = e.eliteMod ? 4 : 1;
    const coinBase = Math.max(1, Math.round((e.xp || 4) * 0.12 * eliteMul * routeCoin * (1 + (this.train.lootBonus || 0)) * (this.player.coinMult || 1)));
    const coinDrops = Math.min(4, 1 + Math.floor(coinBase / 6));
    for (let i = 0; i < coinDrops; i++) {
      this.pickups.push(new Pickup('coin', e.x + rand(-5, 5), e.y + rand(-5, 5), Math.ceil(coinBase / coinDrops)));
    }
    const xpType = e.eliteMod || e.giant ? 'xpBig' : 'xp';
    this.pickups.push(new Pickup(xpType, e.x, e.y, Math.round((e.xp || 4) * (this.routeMods?.xpMul ?? 1) * (this.difficulty.xpMult || 1))));
    if (e.eliteMod) {
      this.gameStats.elites++;
      this._impact(0.45, { hitStop: 0.04 });
      try { this.fx.disintegrate(e.x, e.y, '#8ef0ff', 12); } catch {}
      for (let i = 0; i < 3; i++) this.pickups.push(new Pickup('shard', e.x + rand(-6, 6), e.y + rand(-6, 6), 4)); // 3 x 4 = exactly 12
      this.fx.banner(e.x, e.y - 26, 'ELITE — +12 SHARDS', '#8ef0ff');
      if (Math.random() < 0.7) this.pickups.push(new Pickup('heart', e.x, e.y, 30));
      if (Math.random() < 0.35) this.pickups.push(new Pickup('chest', e.x, e.y, 1));
    } else {
      if (Math.random() < 0.035) this.pickups.push(new Pickup('heart', e.x, e.y, 18));
      if (Math.random() < 0.02) this.pickups.push(new Pickup('magnet', e.x, e.y, 1));
    }

    // on-kill build effects
    if (p.corpseBoom) {
      this.spawnExplosion(e.x, e.y, p.novaEngine ? 70 : 42, p.corpseBoom, 'explosive');
    }
    if (p.solarCore && (e.burnT > 0)) {
      this.spawnExplosion(e.x, e.y, 56, p.burnDmg * 4, 'fire');
    }
    if (e.splitInto) {
      for (let i = 0; i < (e.splits || 2); i++) {
        const a = rand(0, TAU);
        this.spawnEnemy(e.splitInto, e.x + Math.cos(a) * 12, e.y + Math.sin(a) * 12);
      }
    }
  }

  _onBossKilled(b) {
    if (this.bossDefeated) return;
    this.bossDefeated = true;
    this._bossGate = false;
    this.gameStats.bosses++;
    try { bumpGoal(this.save, 'boss', 1); } catch {}
    this.gameStats.shards += 60;
    this.time.slowmo(1.6, 0.25);
    this.camera.shake(1);
    try { this.fx.banner(this.player.x, this.player.y - 60, 'BOSS DOWN — +60 SHARDS', '#ffe066'); } catch {}
    this._impact(1.0, { hitStop: 0.05, tint: '#ff3b46' });
    try { this.fx.disintegrate(b.x, b.y, b.color || '#ff5a4a', 26); } catch {}
    this.fx.explosion(b.x, b.y, 'explFire', 4, { lightColor: '#ffe066' });
    this.fx.banner(b.x, b.y - 40, b.name + ' DESTROYED', '#ffe066');
    for (let i = 0; i < 24; i++) this.pickups.push(new Pickup('coin', b.x + rand(-30, 30), b.y + rand(-30, 30), 10));
    for (let i = 0; i < 16; i++) this.pickups.push(new Pickup('xpBig', b.x + rand(-30, 30), b.y + rand(-30, 30), 14));
    for (let i = 0; i < 3; i++) this.pickups.push(new Pickup('heart', b.x + rand(-16, 16), b.y + rand(-16, 16), 45));
    this.pickups.push(new Pickup('chest', b.x, b.y, 1));
    this.save.bossCores = this.save.bossCores || {};
    this.save.bossCores[b.id] = (this.save.bossCores[b.id] || 0) + 1;
    const idx = REALMS.findIndex(r => r.id === this.realmId);
    if (idx >= 0 && idx < REALMS.length - 1) {
      const next = REALMS[idx + 1].id;
      this.save.unlockedRealms = Array.from(new Set([...(this.save.unlockedRealms || ['purgatory']), next]));
    }
    // ---- PERMANENT RELIC: first clear of a realm grants its relic ----
    const relicId = REALM_RELICS[this.realmId];
    if (relicId) {
      this.save.relics = Array.from(new Set([...(this.save.relics || []), relicId]));
      const rd = RELICS.find(r => r.id === relicId);
      if (rd) this.fx.banner(this.player.x, this.player.y - 64, 'RELIC UNLOCKED: ' + rd.name.toUpperCase(), '#ffe066');
    }
    // ---- ENDING: the story beat for this realm ----
    const ending = findEnding(this.realmId);
    if (ending) {
      this.save.endings = Array.from(new Set([...(this.save.endings || []), ending.id]));
      this._ending = ending;
      this.time.slowmo(1.6, 0.8);
      this.fx.banner(this.player.x, this.player.y - 80, 'ENDING: ' + ending.title, '#ffd700');
    }
  }

  // ================================================================
  // LEVEL-UP CARDS
  // ================================================================
  _queueLevelUp() {
    this.pendingLevelUps += 1;
    // 'Annihilation' tiered card: every level-up wipes the screen
    if (this.player.screenWipe > 0) {
      this.extinctionEvent(180 * this.player.screenWipe);
      this.fx.banner(this.player.x, this.player.y - 52, 'ANNIHILATION', '#ff2a2a');
    }
    this.fx.banner(this.player.x, this.player.y - 34, 'LEVEL ' + this.player.level, '#8ef0ff');
    this.fx.ring(this.player.x, this.player.y, 40, '#8ef0ff', 0.5, 3);
    if (!this.cards) { this._impact(0.5, { hitStop: 0.05, tint: '#28f0e0' }); this._openCards(); }
  }
  _openCards() {
    if (this.pendingLevelUps <= 0) return;
    const p = this.player;
    if (apocalypseReady(this.owned, p.level)) {
      this.cards = [{ card: APOCALYPSE_PROTOCOL, nextLevel: 1 }];
      this.cardIndex = 0;
      this.cardT = 0;
      return;
    }
    // Enforce 10 total cap (5 offensive / 5 passive), excluding evolved/final
    const caps = countCaps(this.owned);
    if(caps.total >= 10){
      // Only allow evolved/final or apocalypse beyond cap
      const pool = offerPool(this.owned, p, this);
      const filtered = pool.filter(c=> c.req || c.rarity==='apocalypse' || c.rarity==='mythic' || c.rarity==='legendary');
      if(filtered.length){
        // use rollCards but it will include filtered
        let n = 3;
        if ((p.luck || 0) > 0.15) n = 4;
        this.cards = rollCards(this.owned, p, this, n).filter(o=> o.card.req || o.card.rarity==='apocalypse');
        if(this.cards.length){ this.cardIndex=0; this.cardT=0; return; }
      }
      this.pendingLevelUps--;
      this._grantRandomWeapon();
      return;
    }
    let n = 3;
    if ((p.luck || 0) > 0.15) n = 4;
    let rolled = rollCards(this.owned, p, this, n*2); // roll extra then filter by caps
    // filter by offensive/passive caps
    rolled = rolled.filter(o=>{
      const asc=o.card;
      if(asc.req) return true; // evolved excluded from cap
      if(asc.rarity==='apocalypse') return true;
      if(isOffensiveAsc(asc) && caps.off >= 5) return false;
      if(!isOffensiveAsc(asc) && caps.pas >= 5) return false;
      return true;
    });
    this.cards = rolled.slice(0,n);
    if (!this.cards.length) {
      this.pendingLevelUps--;
      this._grantRandomWeapon();
      return;
    }
    // ---- PITY SYSTEM: bad luck never bricks a run ----
    const pool = offerPool(this.owned, p, this);
    const has = (o) => o && (o.rarity === 'rare' || o.rarity === 'epic' ||
      o.rarity === 'legendary' || o.rarity === 'mythic' || o.rarity === 'apocalypse');
    // 1) two weak rolls in a row => guarantee a rare+ card
    if (!this.cards.some(o => has(o.card))) this.pity.bad++; else this.pity.bad = 0;
    if (this.pity.bad >= 2) {
      const good = pool.filter(o => has(o.card) && !this.cards.some(c => c.card.id === o.card.id));
      if (good.length) {
        this.cards[this.cards.length - 1] = good[randInt(0, good.length - 1)];
        this.pity.bad = 0;
      }
    }
    // 2) new-family pity: if you own < 3 families, make sure a fresh path shows up
    const families = new Set();
    for (const [id, lvl] of Object.entries(this.owned)) {
      const a = findAscension(id);
      if (a && lvl > 0) families.add(a.family);
    }
    if (families.size < 3) {
      const fresh = pool.filter(o => !families.has(o.card.family) && !this.cards.some(c => c.card.id === o.card.id));
      if (fresh.length) this.pity.newfam++; else this.pity.newfam = 0;
      if (this.pity.newfam >= 2) {
        this.cards[0] = fresh[randInt(0, fresh.length - 1)];
        this.pity.newfam = 0;
      }
    }
    // 3) focus pity: if builds exist but no focus card shows for a while, force one
    const hasFocus = this.cards.some(o => o.card.id.startsWith('focus_'));
    if (!hasFocus) this.pity.focus++; else this.pity.focus = 0;
    if (this.pity.focus >= 2 && p.weapons.length) {
      const focusCards = pool.filter(o => {
        if (!o.card.id.startsWith('focus_')) return false;
        const wid = o.card.weapon || o.card.id.slice(6);
        return p.weapons.some(w => w.id === wid) && !this.cards.some(c => c.card.id === o.card.id);
      });
      if (focusCards.length) {
        this.cards[0] = focusCards[randInt(0, focusCards.length - 1)];
        this.pity.focus = 0;
      }
    }
    this.cardIndex = 0;
    this.cardT = 0;
  }
  _grantRandomWeapon() {
    // v1.6: no more lottery — you SEE three named weapons and pick one
    const p = this.player;
    const pool = WEAPONS.filter(w => !p.hasWeapon(w.id) && !w.req);
    if (pool.length && p.weapons.length < 4) {
      const opts = [];
      const bag = pool.slice();
      while (opts.length < Math.min(3, pool.length) && bag.length) {
        opts.push(bag.splice(randInt(0, bag.length - 1), 1)[0]);
      }
      this.wPick = { opts, t: 0, idx: -1 };
      try { SOUNDS.chest(); } catch {}
    } else {
      p.heal(p.maxHp * 0.25);
      this.fx.banner(p.x, p.y - 30, 'ARSENAL FULL — HEALED 25%', '#7ae06a');
    }
  }
  _wpickGeometry() {
    const n = this.wPick.opts.length;
    const w = 118, h = 128, gap = 10;
    const total = n * w + (n - 1) * gap;
    const x0 = (CFG.VIEW_W - total) / 2;
    const y = 92;
    return this.wPick.opts.map((_, i) => ({ x: x0 + i * (w + gap), y, w, h }));
  }
  _updateWPick() {
    const input = this.input;
    const mx = input.mouse.x, my = input.mouse.y;
    const geo = this._wpickGeometry();
    this.wPick.idx = -1;
    for (let i = 0; i < geo.length; i++) {
      const g = geo[i];
      if (mx >= g.x && mx <= g.x + g.w && my >= g.y && my <= g.y + g.h) this.wPick.idx = i;
    }
    for (let i = 0; i < geo.length; i++) {
      if (input.wasPressed('Digit' + (i + 1)) || input.wasPressed('Numpad' + (i + 1))) { this._pickWeapon(i); return; }
    }
    if (input.wasPressed('ArrowRight')) this.wPick.idx = Math.min(geo.length - 1, (this.wPick.idx < 0 ? 0 : this.wPick.idx + 1));
    if (input.wasPressed('ArrowLeft')) this.wPick.idx = Math.max(0, (this.wPick.idx < 0 ? geo.length - 1 : this.wPick.idx - 1));
    if ((input.wasPressed('Enter') || input.wasPressed('Space')) && this.wPick.idx >= 0) { this._pickWeapon(this.wPick.idx); return; }
    if (input.mouse.justDown && this.wPick.idx >= 0) this._pickWeapon(this.wPick.idx);
  }
  _pickWeapon(i) {
    const w = this.wPick.opts[i];
    if (!w) return;
    this.wPick = null;
    this.player.addWeapon(w.id);
    this.fx.banner(this.player.x, this.player.y - 30, 'NEW WEAPON: ' + w.name.toUpperCase(), w.color);
    try { SOUNDS.levelup(); } catch {}
  }
  _pickCard(i) {
    const pick = this.cards?.[i];
    if (!pick) return;
    const c = pick.card;
    // Enforce caps again at pick time
    const caps = countCaps(this.owned);
    if(!c.req && c.rarity!=='apocalypse'){
      if(isOffensiveAsc(c) && caps.off >=5){
        this.fx.banner(this.player.x, this.player.y - 30, 'OFFENSIVE CAP REACHED (5)', '#ff7a6a');
        this.cards=null; this.pendingLevelUps-=1;
        if(this.pendingLevelUps>0) this._openCards();
        return;
      }
      if(!isOffensiveAsc(c) && caps.pas >=5){
        this.fx.banner(this.player.x, this.player.y - 30, 'PASSIVE CAP REACHED (5)', '#8ef0ff');
        this.cards=null; this.pendingLevelUps-=1;
        if(this.pendingLevelUps>0) this._openCards();
        return;
      }
      if(caps.total >=10){
        this.fx.banner(this.player.x, this.player.y - 30, 'UPGRADE LIMIT 10 REACHED', '#ff7a6a');
        this.cards=null; this.pendingLevelUps-=1;
        if(this.pendingLevelUps>0) this._openCards();
        return;
      }
    }
    const lvl = (this.owned[c.id] || 0) + 1;
    this.owned[c.id] = lvl;
    c.apply(this.player, lvl, this);
    // Clamp chaos-inducing stats
    if(this.player.extraProjectiles) this.player.extraProjectiles = Math.min(2, this.player.extraProjectiles);
    if(this.player.doubleCast) this.player.doubleCast = Math.min(0.25, this.player.doubleCast);
    if(this.player.weapons){
      // also clamp per-weapon projectile bonuses if stored
      for(const w of this.player.weapons){
        if(w.extra) w.extra = Math.min(2, w.extra);
      }
    }
    this.fx.banner(this.player.x, this.player.y - 30, c.name.toUpperCase() + ' ' + (c.max > 1 ? ROMAN[lvl] : ''),
      RARITY_COLORS[c.rarity] || '#ffffff');
    // WEAPON EVOLUTION — the big moment
    if (c.id.startsWith('focus_')) {
      const wid = c.id.slice(6);
      const w = this.player.weapons.find(x => x.id === wid);
      if (w?.evolved) {
        this.time.slowmo(0.5, 0.6);
        this.fx.shakeScreen(6, 0.4);
        this.fx.explosion(this.player.x, this.player.y, 'explHoly', 3, { lightColor: w.color });
        this.fx.banner(this.player.x, this.player.y - 52, w.name.toUpperCase() + ' EVOLVED!', w.color);
        try { SOUNDS.levelup(); } catch {}
      }
    }
    try{ SOUNDS.levelup(); }catch{}
    this.fx.explosion(this.player.x, this.player.y, 'explHoly', 1.4, { lightColor: RARITY_COLORS[c.rarity] });
    this._synergiesFired = this._synergiesFired || {};
    checkSynergies(this.owned, this.player, this, this._synergiesFired);
    this.cards = null;
    this.pendingLevelUps -= 1;
    if (this.player.level % 4 === 0 && this.player.weapons.length < 4) this._grantRandomWeapon();
    if (this.pendingLevelUps > 0) this._openCards();
  }
  _reroll() {
    if (this.rerolls <= 0 || !this.cards) return;
    if (this.cards[0]?.card?.rarity === 'apocalypse') return;
    this.rerolls--;
    this.cards = rollCards(this.owned, this.player, this, this.cards.length);
  }
  _banish() {
    if (this.banishes <= 0 || !this.cards) return;
    const c = this.cards[this.cardIndex];
    if (!c || c.card.rarity === 'apocalypse') return;
    this.banishes--;
    this.owned[c.card.id] = c.card.max || 5;   // pretend maxed => never offered again
    this.cards = rollCards(this.owned, this.player, this, this.cards.length);
    delete this.owned[c.card.id];
  }

  // ================================================================
  // ROUTE CARDS — the fork between sectors. Exact effects, no rolls.
  // ================================================================
  _openRouteCards() {
    this._ended = false;             // sector done, run continues
    // nothing is left behind: every loose pickup is banked right now
    for (const u of this.pickups) {
      if (!u.alive) continue;
      if (u.type === 'coin') this.addRunCoins(u.amount || 1);
      else if (u.type === 'xp' || u.type === 'xpBig') { try { this.player.gainXp(u.amount || 1); } catch {} }
      else if (u.type === 'heart') { try { this.player.heal(u.amount || 10); } catch {} }
      else if (u.type === 'chest') this.pendingLevelUps += 1;
    }
    this.pickups.length = 0;
    this.routeCards = { opts: routeOptions(this.stage + 1, this.runSeed), t: 0, idx: -1 };
    this._impact(0.6, { tint: '#4d7dff' });
    this.time.slowmo(1.2, 0.4);
    try { SOUNDS.chest(); } catch {}
  }
  _routeGeometry() {
    const n = this.routeCards.opts.length;
    const w = 118, h = 128, gap = 10;
    const total = n * w + (n - 1) * gap;
    const x0 = (CFG.VIEW_W - total) / 2;
    const y = 92;
    return this.routeCards.opts.map((_, i) => ({ x: x0 + i * (w + gap), y, w, h }));
  }
  _updateRouteCards() {
    const input = this.input;
    const mx = input.mouse.x, my = input.mouse.y;
    const geo = this._routeGeometry();
    this.routeCards.idx = -1;
    for (let i = 0; i < geo.length; i++) {
      const g = geo[i];
      if (mx >= g.x && mx <= g.x + g.w && my >= g.y && my <= g.y + g.h) this.routeCards.idx = i;
    }
    for (let i = 0; i < geo.length; i++) {
      if (input.wasPressed('Digit' + (i + 1)) || input.wasPressed('Numpad' + (i + 1))) { this._pickRoute(i); return; }
    }
    if (input.wasPressed('ArrowRight')) this.routeCards.idx = Math.min(geo.length - 1, (this.routeCards.idx < 0 ? 0 : this.routeCards.idx + 1));
    if (input.wasPressed('ArrowLeft')) this.routeCards.idx = Math.max(0, (this.routeCards.idx < 0 ? geo.length - 1 : this.routeCards.idx - 1));
    if (input.wasPressed('Enter') || input.wasPressed('Space')) {
      if (this.routeCards.idx >= 0) { this._pickRoute(this.routeCards.idx); return; }
    }
    if (input.mouse.justDown && this.routeCards.idx >= 0) this._pickRoute(this.routeCards.idx);
  }
  _pickRoute(i) {
    const pick = this.routeCards.opts[i];
    if (!pick) return;
    this.routeCards = null;
    this.routeMods = pick.mods;
    this.routeName = pick.name;
    this.transition = 2.0;
    // the fork pays in tools too: every sector clear earns +1 reroll, +1 banish
    this.rerolls += 1; this.banishes += 1;
    this.fx.banner(this.player.x, this.player.y - 56, 'SECTOR ' + this.stage + ' CLEARED — +1 REROLL +1 BANISH', '#ffe066');
    this.fx.explosion(this.player.x, this.player.y, 'explHoly', 2, { lightColor: pick.color });
    try { SOUNDS.levelup(); } catch {}
  }
  _nextSector() {
    // apply the chosen route
    const m = this.routeMods || {};
    if (m.heal) this.player.heal(this.player.maxHp * m.heal);
    if (m.dmgMul) this.player.atkDmg *= m.dmgMul;
    this.stage += 1;
    this.gameStats.sectors = this.stage;
    // wipe the field
    for (const e of this.enemies) { if (e.alive) { e.alive = false; e.deathT = 0; } }
    this.enemies.length = 0;
    this.projectiles.length = 0;
    this.pickups.length = 0;
    this.telegraphs.length = 0;
    this.delayed.length = 0;
    this.holes.length = 0; this.meteors.length = 0; this.flames.length = 0;
    this.bombs.length = 0; this.pools.length = 0;
    // fresh ground for the new sector
    this.world = new World(this.runSeed ^ hashStr(this.realmId + this.stage), this.realmId, this.difficulty);
    const sp = this.world.playerSpawn;
    this.player.x = sp.x; this.player.y = sp.y;
    this.train.x = sp.x - 90; this.train.y = sp.y + 26;
    this.camera.x = sp.x; this.camera.y = sp.y;
    // sector clock + director
    this.runTime = 0;
    this.sectorDuration = 120 + (this.stage - 1) * 60;
    this.sectorTimeLeft = this.sectorDuration;
    this._sectorWarned30 = false; this._sectorWarned10 = false;
    this.director = { t: 0, wave: 0, nextWave: 3, budget: 0, eliteT: 45 * (m.eliteMul || 1), chestT: m.chestFast ? 35 : 38 };
    this.boss = null; this.bossSpawned = false; this.bossDefeated = false;
    this.pillars.length = 0;
    this.surgeT = 26; this.lieutenant = null; this.lieutenantT = 20;
    this._bossGate = false;
    this.stopCard = 1.4;
    // new theme
    this.theme = themeOf(this.stage);
    this.themeT = 6;
    this._spawnAmbient();
    this.door = null; this.doorT = 24; this.challenge = null;
    this.hazards.length = 0;
    this._secondWindUsed = false;
    this.fx.flash(this.player.x, this.player.y, '#ffffff', 0.3);
    this.fx.banner(this.player.x, this.player.y - 40, this.theme.name, this.theme.color);
    this.fx.screenTint(this.theme.color, 0.35);
    this.camera.shake(0.4);
  }

  // ================================================================
  // CHALLENGE DOORS — optional, exact reward printed before entering
  // ================================================================
  _updateDoor(dt) {
    if (this.challenge) { this._updateChallenge(dt); return; }
    if (this.door) {
      const d = this.door;
      d.t += dt;
      // entered?
      if (dist(this.player.x, this.player.y, d.x, d.y) < 14) this._startChallenge(d);
      return;
    }
    this.doorT -= dt;
    if (this.doorT <= 0 && this.director.t > 8 && !this.boss) {
      let px = 0, py = 0, ok = false;
      for (let tries = 0; tries < 6 && !ok; tries++) {
        const a = rand(0, TAU);
        px = this.player.x + Math.cos(a) * 110;
        py = this.player.y + Math.sin(a) * 110;
        ok = !this.world.isSolidWorld(px, py);
      }
      if (!ok) { this.doorT = 4; return; }
      // pick the door type deterministically from the run seed
      let s = (this.runSeed ^ (this.stage * 0x85EB)) >>> 0;
      s = (s ^ (s << 13)) >>> 0; s = (s ^ (s >>> 17)) >>> 0; s = (s ^ (s << 5)) >>> 0;
      const type = CHALLENGE_TYPES[s % CHALLENGE_TYPES.length];
      this.door = { x: px, y: py, type, t: 0 };
      this.fx.ring(px, py, 40, '#ffe066', 0.6, 3);
      this.fx.banner(this.player.x, this.player.y - 50, 'A CHALLENGE DOOR OPENED', '#ffe066');
    }
  }
  _startChallenge(d) {
    const type = d.type;
    this.challenge = { type: type.id, t: 30, need: 3, done: 0, reward: type.reward, name: type.name };
    if (type.id === 'core') {
      const e = this.spawnEnemy('void_sentinel', d.x + 20, d.y + 10);
      if (e) {
        this._applyEliteMod(e, 'armoured');
        e.hp *= 2.2; e.maxHp = e.hp;
        e.challengeCore = true;
        this.challenge.core = e;
      }
    }
    this.door = null;
    this.fx.flash(this.player.x, this.player.y, '#ffe066', 0.25);
    this.fx.banner(this.player.x, this.player.y - 52, type.name.toUpperCase() + ': ' + type.goal, '#ffe066');
    try { SOUNDS.boss(); } catch {}
  }
  // ================================================================
  // THE FURNACE — the train as a decision, not furniture.
  // Kills stoke it (fast beside the train); when full, press E near
  // the engine for a carriage-shaped broadside + overdrive.
  // ================================================================
  _updateFurnace() {
    const t = this.train;
    if (t.dead || t.furnace < t.furnaceMax || t.overdrive) return;
    if (dist(this.player.x, this.player.y, t.x, t.y) < 90 && this.input.wasPressed('KeyE')) {
      this._furnaceBurst();
    }
  }
  _furnaceBurst() {
    const t = this.train;
    const loadout = t.carriageLoadout || [];
    t.furnace = 0;
    t.overdrive = true;
    t.overdriveT = loadout.includes('ammo') ? 9 : 6;
    // broadside: a screaming fan of shells across the line
    const dir = t.facing || 1;
    const n = 6 + (loadout.includes('gunsmith') ? 3 : 0);
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 26;
      this.spawnMeteor(t.x + dir * (46 + (i % 2) * 16) + rand(-6, 6), t.y + off, 30 * t.dmgMul, 34);
    }
    if (loadout.includes('medical')) this.player.heal(this.player.maxHp * 0.25);
    if (loadout.includes('engine')) t.energy = t.maxEnergy;   // ultimate ready NOW
    if (loadout.includes('loot')) {
      for (let i = 0; i < 8; i++) this.pickups.push(new Pickup('coin', t.x + rand(-24, 24), t.y + rand(-16, 16), 8));
    }
    if (loadout.includes('plating')) t.invuln = 3;
    this.fx.explosion(t.x, t.y, 'explFire', 3, { lightColor: '#ff7a33' });
    this.fx.ring(t.x, t.y, 90, '#ff9033', 0.6, 3);
    this.fx.screenTint(t.set.skin.pal.glow || '#ff5a20', 0.3);
    this.fx.banner(t.x, t.y - 46, 'FURNACE BURST! +1 REROLL', '#ff7a33');
    this.rerolls += 1;
    this.camera.shake(0.8);
    try { SOUNDS.explosion(1.2); } catch {}
  }
  _updateHazards(dt) {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const hz = this.hazards[i];
      hz.life -= dt;
      hz.tick -= dt;
      if (hz.life <= 0) { this.hazards.splice(i, 1); continue; }
      if (Math.random() < 0.25) this.fx.fire(hz.x + rand(-hz.r, hz.r) * 0.7, hz.y + rand(-hz.r, hz.r) * 0.5, '#ff7a33');
      const p = this.player;
      if (hz.tick <= 0 && p.alive && dist(p.x, p.y, hz.x, hz.y) < hz.r + p.radius * 0.5) {
        hz.tick = 0.5;
        const dealt = p.takeDamage(4, this, 'VOLATILE ASH');
        if (dealt > 0) this.onPlayerHit(dealt, '#ff7a33', 'VOLATILE ASH');
      }
    }
  }
  _updateBossRule() {
    // IRON SKY rule: below 30% HP the boss enrages — but its punish
    // windows double in length. Risk and reward, clearly labelled.
    const b = this.boss;
    if (!b || !b.alive || b._enraged) return;
    if (hasDifficultyRule(this.difficulty, 'boss_enrage') && b.hp / b.maxHp < 0.3) {
      b._enraged = true;
      this.fx.banner(this.player.x, this.player.y - 56, 'IRON SKY — THE BOSS IS ENRAGED', '#ff4d6a');
      this.fx.banner(this.player.x, this.player.y - 44, 'ITS WEAK WINDOWS NOW LAST TWICE AS LONG', '#8ef0ff');
      this.fx.screenTint('#ff2020', 0.4);
      this.camera.shake(0.7);
      try { SOUNDS.boss(); } catch {}
    }
  }
  // SECTOR MUSIC — four-note loop per theme; bosses drive it harder
  _updateMusic(dt) {
    if (this.save.settings?.sound === 0) return;
    const m = THEME_MUSIC[this.theme?.id];
    if (!m) return;
    const bossRush = !!this.boss?.alive;
    this._musicT += dt;
    const step = m.step * (bossRush ? 0.72 : 1);
    if (this._musicT >= step) {
      this._musicT = 0;
      const f = m.notes[this._musicStep % m.notes.length];
      this._musicStep++;
      try {
        SOUNDS.playTone(f, bossRush ? 0.22 : 0.34, m.type, bossRush ? m.vol * 1.4 : m.vol, 1);
        if (bossRush) SOUNDS.playTone(f * 2, 0.1, 'sine', m.vol * 0.5, 1);
      } catch {}
    }
  }

  // TOUCH CONTROLS — pause pill, dash ring, furnace ring (touch only)
  _updateTouchButtons() {
    const input = this.input;
    if (!input.touchSeen || this.cards || this.routeCards || this.wPick) return;
    const H = CFG.VIEW_H, W = CFG.VIEW_W;
    const dash = { x: W - 34, y: H - 40, r: 20 };
    const fire = { x: W - 78, y: H - 34, r: 15 };
    const pause = { x: 16, y: 24, r: 12 };
    const tapped = input.mouse.justDown;
    const inR = (b, x, y) => (x - b.x) ** 2 + (y - b.y) ** 2 <= b.r * b.r;
    // pause pill (mouse users get it too — discoverable, top-left)
    if (tapped && inR(pause, input.mouse.x, input.mouse.y)) {
      input.endFrame();
      this.engine.setScene('pause', { from: 'gameplay', ctx: this });
      return;
    }
    if (input.joy) return; // the steering thumb doesn't press buttons
    if (tapped && inR(dash, input.mouse.x, input.mouse.y)) {
      const ab = this.player.abilities[0];
      if (ab) this._useAbility(ab);
      input.mouse.justDown = false;
      return;
    }
    if (tapped && inR(fire, input.mouse.x, input.mouse.y)) {
      if (!this.train.dead && this.train.energy >= this.train.maxEnergy) this.train.activateUltimate(this, false);
      else if (this.train.furnace >= this.train.furnaceMax &&
          dist(this.player.x, this.player.y, this.train.x, this.train.y) < 90) {
        this._furnaceBurst();
      }
      input.mouse.justDown = false;
    }
  }

  // SECOND WIND rule (Easy): the first killing blow each sector is survived
  secondWind() {
    if (!hasDifficultyRule(this.difficulty, 'second_wind') || this._secondWindUsed) return false;
    this._secondWindUsed = true;
    const p = this.player;
    p.hp = p.maxHp * 0.35;
    p.invuln = 2.0;
    this.fx.banner(p.x, p.y - 40, 'SECOND WIND!', '#7ae06a');
    this.fx.explosion(p.x, p.y, 'explHoly', 2, { lightColor: '#7ae06a' });
    this.fx.screenTint('#7ae06a', 0.3);
    try { SOUNDS.levelup(); } catch {}
    return true;
  }

  _updateChallenge(dt) {
    const c = this.challenge;
    if (c.type === 'survive') {
      c.t -= dt;
      if (c.t <= 0) this._completeChallenge();
    } else if (c.type === 'elites') {
      // counted in _onKill via _challengeEliteKill
    } else if (c.type === 'core') {
      if (!c.core || !c.core.alive) this._completeChallenge();
    }
  }
  _challengeEliteKill() {
    const c = this.challenge;
    if (!c || c.type !== 'elites') return;
    c.done++;
    if (c.done >= c.need) this._completeChallenge();
    else this.fx.banner(this.player.x, this.player.y - 48, 'ELITE DOWN ' + c.done + '/' + c.need, '#ffb020');
  }
  _completeChallenge() {
    const c = this.challenge;
    this.challenge = null;
    this.challengesWon++;
    this.addRunCoins(c.reward);
    this.rerolls += 1; this.banishes += 1;
    this.fx.banner(this.player.x, this.player.y - 56, 'CHALLENGE COMPLETE — +' + c.reward + ' COINS, +1 REROLL, +1 BANISH', '#ffe066');
    this.fx.explosion(this.player.x, this.player.y, 'explHoly', 2, { lightColor: '#ffe066' });
    try { SOUNDS.chest(); } catch {}
  }


  // ================================================================
  // DIRECTOR — continuous escalating waves
  // ================================================================
  // v1.8 CAMERA DIRECTOR — one knob for shake + aberration + radial smear
  _impact(strength = 0.5, opts = {}) {
    const f = this.fx;
    f.shakeScreen(4 + strength * 10, 0.22 + strength * 0.18);
    f.aberration = Math.max(f.aberration, 0.8 + strength * 2.2);
    this.glitchT = Math.max(this.glitchT, 0.18 + strength * 0.22);
    this.radialT = Math.max(this.radialT, 0.16 + strength * 0.3);
    if (opts.hitStop) this.hitStop = Math.max(this.hitStop, opts.hitStop);
    if (opts.tint) f.screenTint(opts.tint, 0.14 + strength * 0.1);
  }

  // v1.8 LEARNING PHASE — the first three sectors teach the game one
  // idea at a time; everything is on the table from sector 4 onward.
  _learn() {
    const st = this.stage;
    if (st >= 4) return null;
    if (st === 1) return {
      rosterMax: 2, themed: false, countMul: 0.55, capMul: 0.6, hpMul: 0.75,
      elites: false, surges: false, lieutenant: false, bossHp: 0.6,
      label: 'SECTOR 1 \u00b7 BASICS \u2014 MOVE, AUTO-FIRE, GRAB XP',
    };
    if (st === 2) return {
      rosterMax: 3, themed: true, countMul: 0.75, capMul: 0.8, hpMul: 0.9,
      elites: 'lite', surges: false, lieutenant: false, bossHp: 0.85,
      label: 'SECTOR 2 \u00b7 NEW: ELITE PACKS, CHESTS, KEEP THE TRAIN ALIVE',
    };
    return {
      rosterMax: 4, themed: true, countMul: 0.9, capMul: 0.9, hpMul: 1,
      elites: true, surges: false, lieutenant: true, bossHp: 1,
      label: 'SECTOR 3 \u00b7 NEW: THE GAUNTLET \u2014 A LIEUTENANT HUNTS YOU',
    };
  }

  _director(dt) {
    const d = this.director;
    d.t += dt;
    const lrn = this._learn();
    const stageMul = (1 + (this.stage - 1) * 0.35) * (lrn ? lrn.countMul : 1);
    const timeMul = 1 + d.t / 55;
    // readability governor: hard ceiling keeps the screen readable at the hardest point
    const cap = Math.min(this._enemyCap, Math.min(44, Math.round(26 * stageMul * timeMul * 0.6 * (lrn ? lrn.capMul : 1))));
    let alive = 0;
    for (const e of this.enemies) if (e.alive) alive++;

    d.nextWave -= dt;
    if (d.nextWave <= 0 && alive < cap) {
      d.wave++;
      d.nextWave = Math.max(0.7, 2.2 - d.t / 90);
      let roster = this.world.pickEnemyRoster(this.stage);
      if (lrn) roster = roster.slice(0, lrn.rosterMax);
      const themed = (lrn && !lrn.themed) ? [] : this.theme.roster;
      const count = Math.min(cap - alive, Math.round(rand(4, 7) * stageMul * Math.min(3.4, timeMul)));
      for (let i = 0; i < count; i++) {
        const a = rand(0, TAU);
        const r = rand(140, 185);
        const x = this.player.x + Math.cos(a) * r;
        const y = this.player.y + Math.sin(a) * r;
        // sector identity: about a third of every wave wears the sector theme
        const id = (i % 3 === 0 && themed.length) ? themed[randInt(0, themed.length - 1)] : roster[randInt(0, roster.length - 1)];
        const e = this.spawnEnemy(id, x, y);
        if (e) {
          // past sector 1 we stop inflating HP into a sponge and start
          // pushing speed and pattern pressure instead
          const hpScale = Math.min(2.4, 1 + d.t / 130 + (this.stage - 1) * 0.3) * (lrn ? lrn.hpMul : 1);
          e.maxHp *= hpScale * (this.routeMods?.hpMul ?? 1); e.hp = e.maxHp;
          e.dmg *= 1 + d.t / 260;
          e.spd *= Math.min(1.45, 1 + (this.stage - 1) * 0.1) * (this.routeMods?.spdMul ?? 1);
          e.xp = Math.round((e.xp || 4) * (1 + d.t / 300));
          this.fx.spawn({ x, y, vx: 0, vy: 0, color: '#985ce0', life: 0.3, size: 4, endSize: 0 });
        }
      }
    }
    // elite pack (pressure rises with sector)
    d.eliteT -= dt;
    const eliteOk = !lrn || lrn.elites === true || (lrn.elites === 'lite' && d.t > 30);
    if (d.eliteT <= 0) {
      d.eliteT = Math.max(18, (44 - d.t / 16) * (lrn && lrn.elites === 'lite' ? 2 : 1));
      if (eliteOk) this._spawnElite();
    }
    // treasure
    d.chestT -= dt;
    if (d.chestT <= 0) {
      d.chestT = this.routeMods?.chestFast ? 35 : 55;
      const a = rand(0, TAU);
      this.pickups.push(new Pickup('chest', this.player.x + Math.cos(a) * 130, this.player.y + Math.sin(a) * 130, 1));
      this.fx.banner(this.player.x, this.player.y - 44, 'A CHEST APPEARED', '#ffe066');
    try{ SOUNDS.chest(); }catch{}
    }
    // boss timer
    if (!this.bossSpawned && (d.t > this.sectorDuration*0.7 || d.t > 90 + this.stage*10)) this._spawnBoss();

    // ---- ESCALATION (stage 2+): CLOSING RING surges ----
    if (this.stage >= 4 && !lrn && !this.bossSpawned) {
      this.surgeT -= dt;
      if (this.surgeT <= 0) {
        this.surgeT = 26;
        this._spawnSurge();
      }
    }
    // ---- THE GAUNTLET (stage 3): a named lieutenant with a health bar ----
    if (this.stage >= 3 && (!lrn || lrn.lieutenant) && !this.lieutenant && !this.bossSpawned && d.t > this.lieutenantT) {
      this._spawnLieutenant();
    }
  }

  _spawnElite() {
    const roster = this.world.pickEnemyRoster(this.stage);
    const themed = this.theme.roster;
    const mods = ['armoured', 'fast', 'giant', 'regenerating', 'teleporting', 'summoner', 'enraged', 'void_touched'];
    let n = 1 + Math.floor(this.director.t / 120);
    if (hasDifficultyRule(this.difficulty, 'twin_elites')) n = Math.max(2, n);
    const packMods = [];
    for (let k = 0; k < n; k++) {
      const a = rand(0, TAU);
      // elites also wear the sector theme half the time
      const pool = (k % 2 === 0 && themed.length) ? themed : roster;
      const e = this.spawnEnemy(pool[randInt(0, pool.length - 1)],
        this.player.x + Math.cos(a) * 155, this.player.y + Math.sin(a) * 155);
      if (!e) continue;
      const mod = mods[randInt(0, mods.length - 1)];
      packMods.push(mod);
      this._applyEliteMod(e, mod);
      e.maxHp = e.hp;
      e.spd *= Math.min(1.45, 1 + (this.stage - 1) * 0.1) * (this.routeMods?.spdMul ?? 1);
      this.fx.ring(e.x, e.y, 30, '#ffb020', 0.6, 2);
      // a warning tag right where it spawns — no surprises
      this.fx.damageText(e.x, e.y - (e.radius || 7) - 16, ELITE_SHORT[mod] || 'ELITE', '#ffb020', { size: 6 });
    }
    // EVERY threat named: singles get the full hint, packs list them all
    if (packMods.length === 1) {
      this.fx.banner(this.player.x, this.player.y - 46, ELITE_HINTS[packMods[0]] || 'ELITE INCOMING', '#ff8a30');
    } else if (packMods.length > 1) {
      this.fx.banner(this.player.x, this.player.y - 46,
        'ELITE PACK! ' + packMods.map(m => ELITE_SHORT[m] || 'ELITE').join(' + '), '#ff8a30');
    }
  }
  _spawnSurge() {
    // a ring closes in — telegraphed, loud, dodgeable
    const x = this.player.x, y = this.player.y;
    this.telegraphs.push({ type: 'circle', x, y, r: 130, t: 1.3, dur: 1.3, color: '#ff5a33' });
    this.fx.banner(this.player.x, this.player.y - 50, 'SURGE — THE RING CLOSES!', '#ff5a33');
    this.delay(1.3, () => {
      const themed = this.theme.roster;
      const roster = this.world.pickEnemyRoster(this.stage);
      const pool = themed.length ? themed : roster;
      const n = 6 + this.stage;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        const e = this.spawnEnemy(pool[randInt(0, pool.length - 1)],
          this.player.x + Math.cos(a) * 140, this.player.y + Math.sin(a) * 110);
        if (e) { e.maxHp *= 0.8; e.hp = e.maxHp; }
      }
      this.fx.ring(this.player.x, this.player.y, 140, '#ff5a33', 0.5, 3);
      try { SOUNDS.boss(); } catch {}
    });
  }
  _spawnLieutenant() {
    const themed = this.theme.roster;
    const roster = this.world.pickEnemyRoster(this.stage);
    const pool = themed.length ? themed : roster;
    const a = rand(0, TAU);
    const e = this.spawnEnemy(pool[randInt(0, pool.length - 1)],
      this.player.x + Math.cos(a) * 160, this.player.y + Math.sin(a) * 140);
    if (!e) { this.lieutenantT = 6; return; }
    this._applyEliteMod(e, 'giant');
    e.hp = e.maxHp = e.maxHp * 5;
    e.name = 'THE LIEUTENANT';
    e.xp = (e.xp || 20) * 3;
    this.lieutenant = e;
    this.fx.banner(this.player.x, this.player.y - 50, 'THE LIEUTENANT HAS ARRIVED', '#ff4d6a');
    try { SOUNDS.boss(); } catch {}
    this.delay(0.6, () => {
      const drop = this.lieutenant;
      if (!drop) return;
      this.pickups.push(new Pickup('chest', drop.x, drop.y, 1));
      for (let i = 0; i < 3; i++) this.pickups.push(new Pickup('heart', drop.x + rand(-10, 10), drop.y + rand(-8, 8), 40));
    });
  }
  _applyEliteMod(e, mod) {
    const map = {
      armoured: () => { e.hp *= 2.4; e.radius += 1; },
      fast: () => { e.spd *= 1.7; e.dmg *= 0.9; },
      giant: () => { e.hp *= 5; e.spd *= 0.85; e.radius *= 1.7; e.scale = 2; e.dmg *= 1.6; e.giant = true; },
      regenerating: () => { e.regen = Math.max(3, e.hp * 0.03); e.hp *= 1.5; },
      teleporting: () => { e.teleportCd = 4; e.hp *= 1.5; },
      summoner: () => { e.ai = 'summoner'; e.summon = { id: 'firefly_swarm', cd: 3.2, count: 3, max: 8 }; e.hp *= 1.8; },
      enraged: () => { e.dmg *= 1.8; e.spd *= 1.2; e.hp *= 1.6; },
      void_touched: () => { e.voidTouched = true; e.hp *= 2; e.dmg *= 1.3; },
    };
    map[mod]?.();
    e.eliteMod = mod;
    e.hp *= Math.min(1.6, 1 + (this.stage - 1) * 0.3);
    e.maxHp = e.hp;
    e.xp = (e.xp || 4) * 6;
  }

  _spawnBoss() {
    const def = findRealm(this.realmId).boss;
    if (!def) return;
    this.bossSpawned = true;
    // ARENA IDENTITY: four themed cover pillars rise around the field —
    // they block ENEMY fire only, so smart positioning beats kiting
    const pal = { emberfall: '#ff7a33', frostline: '#7ec8ff', eclipse: '#c07aff', overgrowth: '#98e066' };
    const pc = pal[this.theme?.id] || '#c0c0d8';
    const cx = this.player.x, cy = this.player.y;
    for (let i = 0; i < 4; i++) {
      const a = i * (TAU / 4) + TAU / 8;
      this.pillars.push({ x: cx + Math.cos(a) * 115, y: cy + Math.sin(a) * 95, r: 11, color: pc, t: 0 });
    }
    this.fx.banner(this.player.x, this.player.y - 60, 'COVER RISES — USE THE PILLARS', pc);
    const a = rand(0, TAU);
    const b = new Boss(def.id, this.player.x + Math.cos(a) * 150, this.player.y + Math.sin(a) * 150,
      this.realmId, this.difficulty, this.art);
    b._id = 'boss';
    const lrnB = this._learn();
    if (lrnB && lrnB.bossHp < 1) { b.maxHp = Math.max(40, Math.round(b.maxHp * lrnB.bossHp)); b.hp = b.maxHp; }
    this.boss = b;
    this.fx.banner(this.player.x, this.player.y - 50, def.name.toUpperCase(), '#ff4d6a');
    this.fx.screenTint('#ff3020', 0.5);
    this.camera.shake(0.9);
    this.time.slowmo(1.0, 0.35);
  }

  // ================================================================
  // UPDATE
  // ================================================================
  update(rawDt) {
    const input = this.input;
    if (input.wasPressed('Escape')) { input.endFrame(); this.engine.setScene('pause', { from: 'gameplay', ctx: this }); return; }

    // --- card overlay owns the frame ---
    if (this.cards) {
      this.cardT = (this.cardT || 0) + rawDt;
      this._updateCards();
      this.fx.update(rawDt * 0.25);
      input.endFrame();
      return;
    }

    // HIT-STOP MATRIX: high-impact moments freeze the world for a beat —
    // only the fx afterglow keeps breathing at 12% speed.
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - rawDt);
      this.fx.update(rawDt * 0.12);
      this.camera.update?.(rawDt);
      input.endFrame();
      return;
    }

    const dt = this.time.scale(Math.min(rawDt, 0.05));
    this.runTime += rawDt;
    // INFINITE: keep world loaded around player and train
    if(this.world.ensureAround){
      this.world.ensureAround(this.player.x, this.player.y, 4);
      this.world.ensureAround(this.train.x, this.train.y, 3);
    }
    // ---- sector timer ----
    this.sectorTimeLeft = Math.max(0, this.sectorDuration - this.runTime);
    if(!this._sectorWarned30 && this.sectorTimeLeft <= 30 && this.sectorTimeLeft > 10){
      this._sectorWarned30 = true;
      this.fx.banner(this.player.x, this.player.y - 60, 'SECTOR ENDING IN ' + Math.ceil(this.sectorTimeLeft) + 's', '#ff7a6a');
    }
    if(!this._sectorWarned10 && this.sectorTimeLeft <= 10 && this.sectorTimeLeft > 0){
      this._sectorWarned10 = true;
      this.fx.banner(this.player.x, this.player.y - 60, 'FINAL STAND — ' + Math.ceil(this.sectorTimeLeft) + 's', '#ff2a2a');
      this.fx.screenTint('#ff3020', 0.25);
    }
    if(this.sectorTimeLeft <= 0 && !this._ended && !this.routeCards && this.transition <= 0){
      // If boss alive, must defeat boss, else move on
      if(this.boss?.alive){
        if (!this._bossGate) {
          this._bossGate = true;
          this.fx.banner(this.player.x, this.player.y - 60, 'DEFEAT THE BOSS TO ESCAPE', '#ff4d6a');
        }
        // keep timer at 0, don't end until boss dead
      } else if (!this.bossDefeated) {
        // boss never arrived — treat as a clear anyway
        this._openRouteCards();
      } else if (this.stage >= this.maxSectors) {
        this._endRun(true);
        return;
      } else {
        this._openRouteCards();
      }
    }

    // ---- NEW WEAPON overlay owns the frame (three named choices) ----
    if (this.wPick) {
      this.wPick.t += rawDt;
      this._updateWPick();
      this.fx.update(rawDt * 0.25);
      input.endFrame();
      return;
    }

    // ---- ROUTE CARD overlay owns the frame (exact rewards, your pick) ----
    if (this.routeCards) {
      this.routeCards.t += rawDt;
      this._updateRouteCards();
      this.fx.update(rawDt * 0.25);
      input.endFrame();
      return;
    }

    // ---- SECTOR TRANSITION cinematic, then next sector ----
    if (this.transition > 0) {
      this.transition -= rawDt;
      this.fx.update(rawDt * 0.5);
      this._updateTelegraphs(rawDt);
      this._updateDelayed(rawDt);
      if (this.transition <= 0) this._nextSector();
      input.endFrame();
      return;
    }

    // ---- DEATH SEQUENCE: the end is a moment, not a screen swap ----
    if (this.deathSeq > 0) {
      this.deathSeq -= rawDt;
      this.stopCard = 0;
      this.fx.update(rawDt * 0.6);
      this._updateTelegraphs(rawDt);
      this._updateDelayed(rawDt);
      if (this.deathSeq <= 0) { this._endRun(false, { cause: this.lastHitBy || 'UNKNOWN' }); input.endFrame(); return; }
      input.endFrame();
      return;
    }

    // ---- bookkeeping: timers that keep running during play ----
    if (this.stopCard > 0) this.stopCard -= rawDt;
    if (this.buffs.dmgT > 0) this.buffs.dmgT -= dt;
    if (this.buffs.xpT > 0) this.buffs.xpT -= dt;
    if (this.themeT > 0) this.themeT -= rawDt;
    if (this.boss?.alive && this.boss.vulnT > 0) this.boss.vulnT -= dt;
    this._updateTelegraphs(rawDt);
    this._updateDelayed(rawDt);
    this._updateWaypoint(rawDt);
    this._updateDoor(dt);
    this._updateFurnace();
    this._updateHazards(dt);
    this._updateBossRule();
    this._updateMusic(rawDt);
    this._updateTouchButtons();
    if (this.train.hp / this.train.maxHp < 0.25) this._trainHurt = true;
    // ULTIMATE AGENCY: [Q] fires the train's ultimate when charged
    if (this.input.wasPressed('KeyQ') && !this.train.dead && this.train.energy >= this.train.maxEnergy
        && !this.train.overdrive) {
      this.train.activateUltimate(this, false);
      this._impact(0.9, { hitStop: 0.05, tint: '#28f0e0' });
    }
    // MEDICAL CAR: the medical car pulses a slow heal when you stay close
    if ((this.train.carriageLoadout || []).includes('medical') && !this.train.dead) {
      if (dist(this.player.x, this.player.y, this.train.x, this.train.y) < 70) {
        this.player.heal(2.4 * dt);
        if (Math.random() < 0.06) this.fx.spawn({ x: this.player.x + rand(-6, 6), y: this.player.y - 8,
          vx: 0, vy: -18, color: '#7ae06a', life: 0.5, size: 1.6, endSize: 0.3 });
      }
    }
    // clarity governor: more enemies => ranged ones fire a little slower
    const aliveNow = this.enemies.reduce((n, e) => n + (e.alive ? 1 : 0), 0);
    this.enemyFireMult = aliveNow > 42 ? 1 + (aliveNow - 42) * 0.012 : 1;

    if (!this.player.alive && this.player.deathT <= 0) {
      // trigger the drama sequence instead of instantly ending
      this.deathSeq = 2.6;
      this.lastHitBy = this.lastHitBy || 'THE VOID';
      this.time.slowmo(0.35, 2.5);
      this.fx.screenTint('#5a0000', 0.55);
      this.camera.shake(1.2);
      return;
    }

    // ---- input / movement ----
    const p = this.player;
    if (p.alive) {
      const a = input.axis();
      const len = Math.hypot(a.x, a.y) || 1;
      const nx = a.x / (len > 1 ? len : 1), ny = a.y / (len > 1 ? len : 1);
      const rooted = p.rootT > 0;
      const speed = rooted ? 0 : 118 * p.moveSpd * (p.dashT > 0 ? 3.2 : 1);
      p.vx = nx * speed; p.vy = ny * speed;
      if (Math.abs(nx) > Math.abs(ny)) { if (nx) { p.facing = nx < 0 ? 'left' : 'right'; p.flip = nx < 0; } }
      else if (ny) p.facing = ny < 0 ? 'up' : 'down';
      const r = p.radius;
      const tx = p.x + p.vx * dt, ty = p.y + p.vy * dt;
      if (!this.world.isSolidWorld(tx + Math.sign(p.vx) * r, p.y)) p.x = tx;
      if (!this.world.isSolidWorld(p.x, ty + Math.sign(p.vy) * r)) p.y = ty;
      if (p.dashT > 0 && p.dashTrail) {
        for (const e of this.enemiesInRange(p.x, p.y, 20)) this.dealDamage(e, 18 * p.atkDmg, { family: 'fire', small: true });
        this.fx.fire(p.x, p.y, '#ff7a33');
      }
      if (p.dashT > 0 && Math.random() < 0.8) this.fx.afterimage(p.currentFrame(), p.x, p.y, 1, p.flip, '#7ec8ff', 0.25);

      // abilities
      for (const ab of p.abilities) {
        const st = p.abilityStates[ab.id];
        st.cd = Math.max(0, st.cd - dt * p.cdr);
        if (st.cd <= 0 && (input.wasPressed('Space') || input.wasPressed('ShiftLeft'))) {
          st.cd = ab.cd;
          this._useAbility(ab);
          break;
        }
      }
      p.autoAttack(dt, this);
    }
    p.update(dt, this);

    // ---- world sim ----
    this.train.update(dt, this);
    if (this.train.dead && !this._trainDeadNotified) {
      this._trainDeadNotified = true;
      this.fx.banner(this.train.x, this.train.y - 40, 'THE TRAIN HAS FALLEN', '#ff4d6a');
      this.fx.explosion(this.train.x, this.train.y, 'explFire', 4, {});
    }
    for (const e of this.enemies) e.update(dt, this);
    for (const arr of [this.projectiles, this.meteors, this.flames, this.bombs, this.pools, this.holes, this.pickups]) {
      for (const o of arr) o.update(dt, this);
    }
    if (this.boss) {
      this.boss.update(dt, this);
      if (!this.boss.alive) {
        if (!this.bossDefeated) this._onBossKilled(this.boss);
        if (this.boss.deathT <= 0) this.boss = null;
      }
    }
    this._director(dt);

    // cleanup
    this.enemies = this.enemies.filter(e => e.alive || e.deathT > 0);
    this.projectiles = this.projectiles.filter(o => o.alive);
    this.meteors = this.meteors.filter(o => o.alive);
    this.flames = this.flames.filter(o => o.alive);
    this.bombs = this.bombs.filter(o => o.alive);
    this.pools = this.pools.filter(o => o.alive);
    this.holes = this.holes.filter(o => o.alive);
    this.pickups = this.pickups.filter(o => o.alive);
    if (this.enemies.length > 320) this.enemies.splice(0, this.enemies.length - 320);

    if (this._magnetT > 0) { this._magnetT -= dt; if (this._magnetT <= 0) this.magnetAll = false; }

    // ---- camera & fx ----
    this.glitchT = Math.max(0, this.glitchT - dt);
    this.radialT = Math.max(0, this.radialT - dt);
    this.fx.update(dt);
    this.camera.follow(p.x, p.y, rawDt, p.vx, p.vy);
    this.camera.update(rawDt);
    this._updateAmbient(dt);

    input.endFrame();
  }

  // ================================================================
  // WAYPOINTS — mid-sector objectives so downtime is a decision
  // ================================================================
  delay(t, fn) { this.delayed.push({ t, fn }); }

  _updateDelayed(dt) {
    for (let i = this.delayed.length - 1; i >= 0; i--) {
      const d = this.delayed[i];
      d.t -= dt;
      if (d.t <= 0) { this.delayed.splice(i, 1); try { d.fn(); } catch {} }
    }
  }

  _updateTelegraphs(dt) {
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const t = this.telegraphs[i];
      t.t -= dt;
      if (t.t <= 0) this.telegraphs.splice(i, 1);
    }
  }

  _updateWaypoint(dt) {
    // spawn a rotating objective every ~22s
    if (!this.waypoint) {
      this.waypointT -= dt;
      if (this.waypointT <= 0) this._spawnWaypoint();
    }
    const w = this.waypoint;
    if (!w) return;
    w.life -= dt;
    w.value = 0.5 + 0.5 * Math.max(0, w.life / w.lifeMax);   // fades to half
    if (w.life <= 0) { this.waypoint = null; this.waypointT = 16; return; }
    if (dist(this.player.x, this.player.y, w.x, w.y) < 24) this._collectWaypoint();
  }

  _spawnWaypoint() {
    const kinds = ['beacon', 'cache', 'passenger', 'purge', 'sigil'];
    const kind = kinds[randInt(0, kinds.length - 1)];
    const a = rand(0, TAU);
    const r = rand(150, 230);
    const x = this.player.x + Math.cos(a) * r;
    const y = this.player.y + Math.sin(a) * r;
    if (this.world.isSolidWorld(x, y)) { this.waypointT = 6; return; }
    const meta = {
      beacon: { color: '#2ff0ff', label: 'SURGE BEACON' },
      cache: { color: '#ffe066', label: 'SUPPLY CACHE' },
      passenger: { color: '#c07aff', label: 'LOST PASSENGER' },
      purge: { color: '#8ef07a', label: 'GRAVE TIDE' },
      sigil: { color: '#ffb040', label: 'RELIC SIGIL' },
    }[kind];
    this.waypoint = { kind, x, y, life: 26, lifeMax: 26, color: meta.color, label: meta.label, t: 0, value: 1 };
    // CONTESTED GROUND: wardens circle the prize and its value fades —
    // dash in now at full value, or clear the wardens first. Your call.
    const themed = this.theme.roster;
    const roster = this.world.pickEnemyRoster(this.stage);
    const pool = themed.length ? themed : roster;
    for (let i = 0; i < 3 + Math.min(2, this.stage - 1); i++) {
      const a = (i / 4) * TAU + rand(0, 1);
      const g = this.spawnEnemy(pool[randInt(0, pool.length - 1)], x + Math.cos(a) * 34, y + Math.sin(a) * 30);
      if (g) { g.warden = true; g.xp = Math.round((g.xp || 4) * 1.5); }
    }
    this.fx.banner(this.player.x, this.player.y - 56, meta.label.toUpperCase() + ' — CONTESTED', meta.color);
    this.fx.ring(x, y, 44, meta.color, 0.6, 2);
  }

  _collectWaypoint() {
    const w = this.waypoint;
    const p = this.player;
    const tx = w.x, ty = w.y;
    const v = w.value ?? 1;      // contested value: 1.0 fresh -> 0.5 stale
    const pct = Math.round(v * 100);
    this.waypoint = null;
    this.waypointT = 20;
    this.fx.explosion(tx, ty, 'explHoly', 2, { lightColor: w.color });
    this.fx.ring(tx, ty, 70, w.color, 0.6, 3);
    try { SOUNDS.chest(); } catch {}
    switch (w.kind) {
      case 'beacon': {
        const dur = Math.round(30 * v);
        this.buffs.dmgT = dur; this.buffs.dmgMult = 1.08;
        this.fx.banner(p.x, p.y - 40, '+8% DAMAGE ' + dur + 's (' + pct + '% VALUE)', '#2ff0ff');
        break;
      }
      case 'cache': {
        for (let i = 0; i < 3; i++) this.pickups.push(new Pickup('chest', tx + rand(-14, 14), ty + rand(-10, 10), 1));
        const coins = Math.max(5, Math.round(10 * v));
        for (let i = 0; i < coins; i++) this.pickups.push(new Pickup('coin', tx + rand(-20, 20), ty + rand(-14, 14), 6));
        this.fx.banner(p.x, p.y - 40, 'SUPPLIES SECURED (' + pct + '% VALUE)', '#ffe066');
        break;
      }
      case 'passenger': {
        const lore = LORE[this.gameStats.kills % LORE.length];
        this.save.discovered = Array.from(new Set([...(this.save.discovered || []), lore.id]));
        const dur = Math.round(45 * v);
        this.buffs.xpT = dur; this.buffs.xpMult = (this.buffs.xpMult || 1) * 1.08;
        this.fx.banner(p.x, p.y - 40, 'PASSENGER SAVED +' + Math.round(8 * v) + '% XP ' + dur + 's', '#c07aff');
        this.fx.damageText(p.x, p.y - 58, '"' + lore.name.toUpperCase() + '"', '#dcb4ff', { size: 7 });
        break;
      }
      case 'purge':
        for (const pr of this.projectiles) if (pr.owner === 'enemy') pr.alive = false;
        this.train.energy = Math.min(this.train.maxEnergy, this.train.energy + 20 * v);
        for (const e of this.enemiesInRange(tx, ty, 150)) {
          this.dealDamage(e, 30 * v * p.atkDmg, { family: 'holy', small: true });
        }
        this.fx.banner(p.x, p.y - 40, 'ENEMY FIRE PURGED (' + pct + '% POWER)', '#8ef07a');
        break;
      case 'sigil':
        p.heal(p.maxHp * 0.18 * v);
        this.pickups.push(new Pickup('chest', tx, ty, 1));
        this.fx.banner(p.x, p.y - 40, 'SIGIL RESTORES ' + Math.round(18 * v) + '% HP', '#ffb040');
        break;
    }
  }

  _useAbility(ab) {
    const p = this.player;
    if (ab.id === 'dodge') {
      const a = this.input.axis();
      const ang = (a.x || a.y) ? Math.atan2(a.y, a.x) :
        (p.facing === 'left' ? Math.PI : p.facing === 'up' ? -Math.PI / 2 : p.facing === 'down' ? Math.PI / 2 : 0);
      p.invuln = Math.max(p.invuln, ab.dur + 0.1);
      p.dashT = ab.dur;
      const nx = p.x + Math.cos(ang) * ab.dist, ny = p.y + Math.sin(ang) * ab.dist;
      if (!this.world.isSolidWorld(nx, ny)) { p.x = nx; p.y = ny; }
      this.fx.burst(p.x, p.y, '#7ec8ff', 14, { spd: 150, life: 0.35, light: 0.2 });
      this.camera.punch(0.02);
    } else if (ab.id === 'blast') {
      this.fx.shockwave(p.x, p.y, ab.radius, '#ff7a33');
      this.fx.explosion(p.x, p.y, 'explFire', 2.4, {});
      this.camera.shake(0.5); this.camera.punch(0.04);
      for (const e of this.enemiesInRange(p.x, p.y, ab.radius)) {
        this.dealDamage(e, ab.dmg * p.atkDmg, { family: 'fire', knockback: 220, x: p.x, y: p.y });
      }
    } else if (ab.id === 'magnet') {
      this.magnetPulse(); this._magnetT = ab.dur;
    } else if (ab.id === 'overclock') {
      p.frenzyStacks = 40; p.frenzyT = ab.dur; p.frenzy = Math.max(p.frenzy, 0.05);
      this.fx.banner(p.x, p.y - 30, 'OVERCLOCK', '#2ff0ff');
    } else if (ab.id === 'bulwark') {
      p.shield += p.maxHp * 0.4;
      this.fx.ring(p.x, p.y, 26, '#ffe066', 0.4, 3);
    }
  }

  _updateAmbient(dt) {
    const p = this.player;
    for (const a of this.ambientBits) {
      switch (a.kind) {
        case 'snow': a.y += 22 * dt * a.s; a.x += 9 * dt; break;
        case 'ember': a.y -= 26 * dt * a.s; a.x += 7 * dt; break;
        case 'sand': a.x -= 60 * dt * a.s; break;
        case 'leaf': a.x += 12 * dt; a.y += 16 * dt * a.s; break;
        case 'spark': a.y -= 8 * dt; a.x += Math.sin(this.runTime + a.s * 8) * 8 * dt; break;
        default: a.x += 6 * dt;
      }
      if (a.x > p.x + 200) a.x = p.x - 200;
      if (a.x < p.x - 200) a.x = p.x + 200;
      if (a.y > p.y + 160) a.y = p.y - 160;
      if (a.y < p.y - 160) a.y = p.y + 160;
    }
  }

  _updateCards() {
    const input = this.input;
    const n = this.cards.length;
    const mx = input.mouse.x, my = input.mouse.y;
    const geo = this._cardGeometry();
    this.cardIndex = -1;
    this._cardLean = this._cardLean || [];
    for (let i = 0; i < n; i++) {
      const g = geo[i];
      if (mx >= g.x && mx <= g.x + g.w && my >= g.y && my <= g.y + g.h) this.cardIndex = i;
    }
    // v1.8 3D-TILT PARITY: each card eases its lean toward the cursor
    for (let i = 0; i < n; i++) {
      const g = geo[i];
      const target = this.cardIndex === i ? Math.max(-1, Math.min(1, ((mx - (g.x + g.w / 2)) / (g.w / 2)) * 1.15)) : 0;
      this._cardLean[i] = (this._cardLean[i] || 0) + (target - (this._cardLean[i] || 0)) * 0.22;
    }
    for (let i = 0; i < n; i++) {
      if (input.wasPressed('Digit' + (i + 1)) || input.wasPressed('Numpad' + (i + 1))) { this._pickCard(i); return; }
    }
    if (input.mouse.justDown && this.cardIndex >= 0) { this._pickCard(this.cardIndex); return; }
    if (input.wasPressed('KeyR')) this._reroll();
    if (input.wasPressed('KeyB')) this._banish();
    // reroll / banish buttons
    if (input.mouse.justDown) {
      const by = CFG.VIEW_H - 26;
      if (my >= by && my <= by + 16) {
        if (mx > CFG.VIEW_W / 2 - 90 && mx < CFG.VIEW_W / 2 - 10) this._reroll();
        if (mx > CFG.VIEW_W / 2 + 10 && mx < CFG.VIEW_W / 2 + 90) this._banish();
      }
    }
  }
  _cardGeometry() {
    const n = this.cards.length;
    const single = n === 1;
    const w = single ? 220 : Math.min(120, Math.floor((CFG.VIEW_W - 40) / n) - 8);
    const h = single ? 120 : 132;
    const gap = 8;
    const total = n * w + (n - 1) * gap;
    const x0 = (CFG.VIEW_W - total) / 2;
    const y = (CFG.VIEW_H - h) / 2 + 6;
    return this.cards.map((_, i) => ({ x: x0 + i * (w + gap), y, w, h }));
  }

  _endRun(victory, extra = {}) {
    if (this._ended) return;
    this._ended = true;
    const p = this.player;
    addCoins(this.save, this.runCoins);
    // v1.7: shards collected in the run are banked too (they used to evaporate)
    this.save.shards = (this.save.shards || 0) + (this.gameStats.shards || 0);
    this.save.stats.totalKills = (this.save.stats.totalKills || 0) + this.runStats.kills;
    this.save.stats.totalRuns = (this.save.stats.totalRuns || 0) + 1;
    this.save.stats.bestScore = Math.max(this.save.stats.bestScore || 0, p.score);
    this.save.stats.longestRun = Math.max(this.save.stats.longestRun || 0, this.runTime);
    this.save.stats.highestStage = Math.max(this.save.stats.highestStage || 0, this.stage);
    this.save.stats.bestCombo = Math.max(this.save.stats.bestCombo || 0, this.runStats.bestCombo);
    // OFFLINE-FIRST RECORDS: this device remembers your best runs, weeks, days
    try {
      recordLocalScore(this.save, {
        score: p.score || 0, time: Math.round(this.runTime), stage: this.stage,
        realm: this.realmId, kills: this.runStats.kills, at: Date.now(),
      });
      if (this.weeklyChallenge) {
        const wk = Math.floor((Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()) / 86400000) / 7);
        this.save.weeklyBest = this.save.weeklyBest || {};
        this.save.weeklyBest[wk] = Math.max(this.save.weeklyBest[wk] || 0, p.score || 0);
      }
      if (this.dailySeed) {
        this.save.dailyBest = this.save.dailyBest || {};
        this.save.dailyBest[String(this.dailySeed)] = Math.max(this.save.dailyBest[String(this.dailySeed)] || 0, p.score || 0);
      }
    } catch {}
    saveSave(this.save);
    // v1.7: scores are NEVER posted automatically — the summary offers
    // an opt-in button. Nothing leaves this device without a choice.
    this.engine.setScene('runSummary', {
      realmId: this.realmId, stage: this.stage, save: this.save, runStats: this.runStats,
      time: this.runTime, sectorDuration: this.sectorDuration, victory, coins: this.runCoins, level: p.level,
      owned: this.owned, apocalypse: this.apocalypseActive,
      dmgByWeapon: this.dmgByWeapon, challengesWon: this.challengesWon, maxSectors: this.maxSectors,
      ending: victory ? (this._ending || findEnding(this.realmId)) : null,
      cause: victory ? null : (extra.cause || this.lastHitBy || 'THE VOID'),
      relic: this.relicActive?.name || null,
      score: Math.round(p.score || 0), difficulty: this.difficulty.id,
      trainHurt: !!this._trainHurt, damageTaken: this.runStats.damageTaken,
    });
    this._grantAchievements(victory);
  }
  // v1.7: ACHIEVEMENTS — checked at run end, each pays a fixed shard bounty
  _grantAchievements(victory) {
    const got = this.save.achievements = this.save.achievements || [];
    const paid = this.save.claimedAchievements = this.save.claimedAchievements || [];
    const achDef = (id) => ACHIEVEMENTS.find(a => a.id === id);
    const grant = (id) => {
      if (got.includes(id)) return;
      got.push(id);
      try { SOUNDS.chest(); } catch {}
      const def = achDef(id);
      const bounty = def && def.reward ? def.reward : 0;
      if (bounty > 0) {
        this.save.shards = (this.save.shards || 0) + bounty;
        if (!paid.includes(id)) paid.push(id);
        this.bannerQueue = this.bannerQueue || [];
        this.bannerQueue.push('ACHIEVEMENT — ' + String(def.name).toUpperCase() + ' · +' + bounty + ' SHARDS');
      }
    };
    const kills = this.runStats.kills;
    grant('first_departure');
    if (this.bossDefeated) grant(this.realmId + '_clear');
    if (this.realmId === 'terminus') grant('terminus');
    if (kills >= 1000) grant('unstoppable');
    if (this._trainHurt && this.player.alive) grant('train_defender');
    if ((this.runStats.damageTaken || 0) === 0 && kills >= 10) grant('perfect_run');
  }

  _buildParams() {
    return { save: this.save, realmId: this.realmId, stage: this.stage,
      difficulty: this.difficulty.id, runSeed: (Math.random() * 4294967295) >>> 0 };
  }

  // ================================================================
  // RENDER
  // ================================================================
  render(out) {
    const A = this.art;
    const ctx = this.renderer.begin();
    const cam = this.camera;
    const realm = findRealm(this.realmId);

    ctx.fillStyle = realm.sky;
    ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);

    ctx.save();
    cam.apply(ctx);

    this._drawWorld(ctx);
    this.fx.drawDecals(ctx);
    this._drawAmbient(ctx, 0);

    // pools & holes (ground layer)
    for (const p of this.pools) {
      const fade = Math.max(0, Math.min(1, p.t < 0.3 ? p.t / 0.3 : (p.life - p.t) / 0.8));
      const seed = (p._id || 1) * 0.7;
      // irregular puddle built from overlapping lobes so it never reads as a disc
      ctx.globalAlpha = 0.34 * fade;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + seed;
        const wob = 0.72 + 0.28 * Math.sin(this.runTime * 1.6 + i * 2.1 + seed);
        ctx.arc(p.x + Math.cos(a) * p.radius * 0.34, p.y + Math.sin(a) * p.radius * 0.22,
          p.radius * 0.62 * wob, 0, TAU);
      }
      ctx.fill();
      // darker core + bright rim
      ctx.globalAlpha = 0.28 * fade;
      ctx.fillStyle = '#00000080';
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.radius * 0.5, p.radius * 0.34, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.5 * fade;
      ctx.strokeStyle = p.color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.radius * 0.9, p.radius * 0.62, 0, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
      // bubbles
      if (Math.random() < 0.25 * fade) {
        this.fx.spawn({ x: p.x + rand(-p.radius * 0.7, p.radius * 0.7),
          y: p.y + rand(-p.radius * 0.4, p.radius * 0.4), vx: 0, vy: -8,
          color: p.color, life: 0.5, size: 2, endSize: 0, additive: false });
      }
    }
    for (const h of this.holes) {
      const g = ctx.createRadialGradient(h.x, h.y, 1, h.x, h.y, h.radius);
      g.addColorStop(0, '#000000'); g.addColorStop(0.5, '#2a1240'); g.addColorStop(1, 'rgba(40,10,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, TAU); ctx.fill();
    }

    // ---- boss telegraphs (danger markers) ----
    for (const t of this.telegraphs) {
      const k = t.t / t.dur;
      const pulse = 0.35 + 0.3 * Math.sin(this.runTime * 14);
      if (t.type === 'line') {
        ctx.globalAlpha = 0.28 + pulse * 0.4 * (1 - k);
        ctx.fillStyle = t.color;
        const dx = (t.x2 - t.x), dy = (t.y2 - t.y);
        const L = Math.hypot(dx, dy) || 1;
        const nx = -dy / L, ny = dx / L;
        const w = (t.w || 24) / 2;
        ctx.beginPath();
        ctx.moveTo(t.x + nx * w, t.y + ny * w);
        ctx.lineTo(t.x2 + nx * w, t.y2 + ny * w);
        ctx.lineTo(t.x2 - nx * w, t.y2 - ny * w);
        ctx.lineTo(t.x - nx * w, t.y - ny * w);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        const filled = 1 - k;
        ctx.globalAlpha = 0.16 + pulse * 0.2;
        ctx.fillStyle = t.color;
        ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.5 + pulse * 0.4;
        ctx.strokeStyle = t.color; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(t.x, t.y, t.r * filled, 0, TAU); ctx.stroke();
        if (t.type === 'root') {
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = '#7ae06a';
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * TAU + 0.4;
            ctx.beginPath();
            ctx.moveTo(t.x, t.y);
            ctx.lineTo(t.x + Math.cos(a) * t.r, t.y + Math.sin(a) * t.r);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }
    }

    // ---- waypoint beacon ----
    if (this.waypoint) {
      const w = this.waypoint;
      const pulse = 0.5 + 0.5 * Math.sin(this.runTime * 5);
      ctx.globalAlpha = 0.10 + 0.06 * pulse;
      ctx.fillStyle = w.color;
      ctx.fillRect(w.x - 8, w.y - 60, 16, 120);
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = w.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(w.x, w.y, 12 + pulse * 3, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = w.color;
      ctx.beginPath(); ctx.arc(w.x, w.y, 4, 0, TAU); ctx.fill();
      // contested value ring: full circle = full value, draining as it fades
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(w.x, w.y, 17, -Math.PI / 2, -Math.PI / 2 + TAU * (w.value ?? 1));
      ctx.stroke();
      textC(ctx, Math.round((w.value ?? 1) * 100) + '%', w.x, w.y - 22, '#ffffff', 6, true);
      ctx.globalAlpha = 1;
      this._light(w.x, w.y, 40, w.color, 0.7, 0.2);
    }

    // ---- boss-arena cover pillars (themed) ----
    for (const pl of this.pillars) {
      pl.t += 0.016;
      const rise = Math.min(1, pl.t * 1.4);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0a0612';
      ctx.beginPath(); ctx.ellipse(pl.x, pl.y + 6, pl.r + 2, (pl.r + 2) * 0.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = pl.color;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(pl.x - pl.r, pl.y - 14 * rise, pl.r * 2, 14 * rise);
      ctx.fillStyle = '#ffffff55';
      ctx.fillRect(pl.x - pl.r, pl.y - 14 * rise, pl.r * 2, 2);
      ctx.globalAlpha = 1;
      this._light(pl.x, pl.y - 6, 26, pl.color, 0.35);
    }
    // ---- boss ATTACK TELL: the signature flashes before it lands ----
    if (this.boss?.alive && this.boss._tell) {
      const k = 1 - this.boss._tell.t / 0.55;
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this.runTime * 20);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(this.boss.x, this.boss.y, this.boss.radius + 16 + k * 6, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
      textC(ctx, '!', this.boss.x, this.boss.y - this.boss.radius - 26, '#ffffff', 12, true);
    }
    // ---- challenge door — the reward is printed right on it ----
    if (this.door) {
      const d = this.door;
      const pulse = 0.5 + 0.5 * Math.sin(this.runTime * 6);
      ctx.save();
      ctx.globalAlpha = 0.14 + 0.08 * pulse;
      ctx.fillStyle = '#ffe066';
      ctx.beginPath(); ctx.arc(d.x, d.y, 22 + pulse * 4, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(d.x, d.y, 11 + pulse * 2, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
      drawIcon(ctx, d.type.icon, d.x - 8, d.y - 8, 16, '#ffe066');
      // exact reward, always visible, no surprises
      ctx.fillStyle = '#000000cc';
      ctx.fillRect(d.x - 44, d.y - 30, 88, 16);
      textC(ctx, 'CHALLENGE: ' + d.type.goal, d.x, d.y - 23, '#ffe066', 6, true);
      textC(ctx, 'REWARD: ' + d.type.rewardText, d.x, d.y - 16, '#ffffff', 6, true);
      this._light(d.x, d.y, 50, '#ffe066', 0.8, 0.2);
      ctx.restore();
    }

    // ---- volatile ash: burning ground ----
    for (const hz of this.hazards) {
      const k = Math.min(1, hz.life / 2.6);
      ctx.globalAlpha = 0.30 * k + 0.12;
      ctx.fillStyle = '#ff5a20';
      ctx.beginPath(); ctx.arc(hz.x, hz.y, hz.r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.5 * k;
      ctx.strokeStyle = '#ffb060'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(hz.x, hz.y, hz.r, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
      this._light(hz.x, hz.y, 30, '#ff7a33', 0.4, 0.1);
    }

    // ---- draw order by Y ----
    const drawables = [];
    for (const u of this.pickups) drawables.push({ y: u.y, kind: 'pickup', o: u });
    for (const e of this.enemies) drawables.push({ y: e.y, kind: 'enemy', o: e });
    drawables.push({ y: this.train.y + 10, kind: 'train', o: this.train });
    if (this.boss) drawables.push({ y: this.boss.y, kind: 'boss', o: this.boss });
    if (this.player.alive || this.player.deathT > 0) drawables.push({ y: this.player.y, kind: 'player', o: this.player });
    drawables.sort((a, b) => a.y - b.y);

    for (const d of drawables) {
      if (d.kind === 'pickup') this._drawPickup(ctx, d.o);
      else if (d.kind === 'enemy') this._drawEnemy(ctx, d.o);
      else if (d.kind === 'train') this._drawTrain(ctx, d.o);
      else if (d.kind === 'boss') this._drawBoss(ctx, d.o);
      else if (d.kind === 'player') this._drawPlayer(ctx, d.o);
    }

    // orbitals & drones on top
    const p = this.player;
    for (const o of p.orbitals) {
      const f = A.anim.sawBlade[Math.floor((this.runTime * 18 + o.ang * 3) % A.anim.sawBlade.length)];
      ctx.drawImage(f, Math.round(o.x - f.width / 2), Math.round(o.y - f.height / 2));
      this._light(o.x, o.y, 20, o.color, 0.35);
    }
    for (const d of p.drones) {
      const f = A.anim.orbPlasma[Math.floor(this.runTime * 12) % A.anim.orbPlasma.length];
      ctx.drawImage(f, Math.round(d.x - f.width / 2), Math.round(d.y - f.height / 2));
      this._light(d.x, d.y, 22, '#8ef0ff', 0.4);
    }
    // sentry turrets — little box with a barrel that tracks
    for (const t of p.turrets) {
      ctx.save();
      ctx.translate(Math.round(t.x), Math.round(t.y));
      ctx.fillStyle = '#3a2a18';
      ctx.fillRect(-5, -4, 10, 8);
      ctx.fillStyle = '#ff9a4a';
      ctx.fillRect(-4, -3, 8, 3);
      ctx.rotate(t.ang || 0);
      ctx.fillStyle = '#d8c8b0';
      ctx.fillRect(0, -1.5, 9, 3);
      ctx.restore();
      // life ring
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = '#ff9a4a';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(t.x, t.y, 9, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, t.life / 12)); ctx.stroke();
      ctx.globalAlpha = 1;
      this._light(t.x, t.y, 26, '#ff9a4a', 0.5);
    }
    for (const o of this.train.orbiters) {
      const f = A.anim.orbShadow[Math.floor(this.runTime * 10) % A.anim.orbShadow.length];
      ctx.drawImage(f, Math.round(o.x - f.width / 2), Math.round(o.y - f.height / 2));
    }

    // projectiles / bombs / meteors
    for (const pr of this.projectiles) this._drawProjectile(ctx, pr);
    for (const b of this.bombs) {
      const f = A.anim.bomb[Math.floor(b.t * 14) % A.anim.bomb.length];
      ctx.drawImage(f, Math.round(b.x - f.width / 2), Math.round(b.y - f.height / 2));
      this._light(b.x, b.y, 18, '#ff9033', 0.4);
    }
    for (const m of this.meteors) {
      const f = A.anim.orbFire[Math.floor(this.runTime * 20) % A.anim.orbFire.length];
      ctx.save(); ctx.translate(m.x, m.y); ctx.scale(2.2, 2.2);
      ctx.drawImage(f, -f.width / 2, -f.height / 2); ctx.restore();
      this._light(m.x, m.y, 46, '#ff7a33', 0.8);
      // target marker
      ctx.strokeStyle = '#ff5a33'; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.arc(m.tx, m.ty, m.radius * 0.5, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    this.fx.draw(ctx, this.renderer, cam);
    this._drawAmbient(ctx, 1);
    ctx.restore();

    // ---- lights ----
    for (const wl of this.world.lights) {
      if (Math.abs(wl.x - cam.x) > 340 || Math.abs(wl.y - cam.y) > 240) continue;
      this._light(wl.x, wl.y, wl.radius * 0.8, wl.color, 0.32, 0.05);
    }
    this._light(p.x, p.y, 110, this.apocalypseActive ? '#ff5a33' : '#ffd9a0', this.apocalypseActive ? 1.1 : 0.85, 0.06);
    this._light(this.train.x + 20 * (this.train.facing || 1), this.train.y - 12, 90,
      this.train.set.skin.pal.glow, 0.9, 0.15);

    // ---- composite ----
    this.renderer.composite(out, {
      ambient: this.apocalypseActive ? '#9a6858' : (AMBIENT[this.realmId] || '#7a7a96'),
      grade: this.apocalypseActive ? '#ff5a3a' : GRADE[this.realmId],
      gradeAmount: this.apocalypseActive ? 0.26 : 0.16,
      time: this.runTime,
      aberration: Math.min(3, this.fx.aberration + (this.apocalypseActive ? 0.6 : 0) + cam.trauma * 1.6),
      radial: Math.min(1, this.radialT * 2.2),
      bloomBoost: this.apocalypseActive ? 1.15 : 1,
      flash: this.fx.screenFlash.a > 0.01 ? this.fx.screenFlash : null,
    });

    // ---- HUD (screen space, after post) ----
    this.fx.drawTexts(out, cam);
    // SECTOR IDENTITY: a light theme wash over the whole frame + intro panel
    if (this.theme) {
      // FROSTLINE: slow aurora ribbons across the sky
      if (this.theme.id === 'frostline') {
        const W2 = CFG.VIEW_W;
        for (let b = 0; b < 3; b++) {
          ctx.globalAlpha = 0.05 + 0.03 * Math.sin(this.runTime * (0.7 + b * 0.23) + b * 2);
          ctx.fillStyle = b % 2 ? '#7ec8ff' : '#98e066';
          for (let x = 0; x < W2; x += 12) {
            const h = 14 + Math.sin(x * 0.02 + this.runTime * (0.8 + b * 0.3) + b * 2) * 8;
            ctx.fillRect(x, 34 + b * 22 + Math.sin(x * 0.03 + this.runTime + b) * 6, 12, h);
          }
        }
        ctx.globalAlpha = 1;
      }
      out.fillStyle = this.theme.tint;
      out.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
      if (this.themeT > 0) {
        const a = Math.min(1, Math.min(this.themeT, 0.6) * 2.5);
        const lrn = this._learn();
        const hint = this.stage === 1 && !this._furnaceHintDone;
        const ph = hint ? 64 : lrn ? 52 : 30;
        out.globalAlpha = a * 0.85;
        drawPanel(out, CFG.VIEW_W / 2 - 98, 16, 196, ph, this.theme.color);
        out.globalAlpha = a;
        textC(out, 'SECTOR ' + this.stage + ' — ' + this.theme.name, CFG.VIEW_W / 2, 27, this.theme.color, 8, true);
        textC(out, this.theme.desc, CFG.VIEW_W / 2, 40, '#e8e2f0', 6);
        if (lrn) textC(out, lrn.label, CFG.VIEW_W / 2, 53, '#28f0e0', 6, true);
        if (hint) {
          textC(out, 'KILL BESIDE THE TRAIN', CFG.VIEW_W / 2, lrn ? 66 : 53, '#ffd040', 6, true);
          textC(out, '[E] FURNACE BURST WHEN METER FULL', CFG.VIEW_W / 2, lrn ? 76 : 63, '#ffd040', 6, true);
          if (this.train.furnace >= 20) this._furnaceHintDone = true;
        }
        out.globalAlpha = 1;
      }
      // the difficulty rule, stated plainly while the sector settles in
      const rule = this.difficulty?.rule;
      if (rule && rule.id !== 'none' && this.themeT > 0) {
        out.globalAlpha = Math.min(1, Math.min(this.themeT, 0.6) * 2.5) * 0.95;
        textC(out, 'RULE — ' + rule.name + ': ' + rule.desc, CFG.VIEW_W / 2, this.stage === 1 && !this._furnaceHintDone ? 59 : 51, '#ffb060', 6, true);
        out.globalAlpha = 1;
      }
    }
    this._drawHUD(out);
    if (this.cards) this._drawCards(out);
    if (this.routeCards) this._drawRouteCards(out);
    if (this.wPick) this._drawWPick(out);

    // ---- STOP CARD: each new sector announces itself with story ----
    if (this.stopCard > 0 && !this.cards) {
      const k = Math.min(1, (2.6 - this.stopCard) * 3);
      const fade = Math.min(1, this.stopCard / 0.6);
      const a = k * fade;
      out.globalAlpha = a * 0.72;
      out.fillStyle = '#050210';
      out.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
      out.globalAlpha = a;
      const realm = findRealm(this.realmId);
      out.textAlign = 'center';
      out.font = 'bold 10px "Courier New", monospace';
      out.fillStyle = '#ffd700';
      out.fillText('STOP ' + realm.idx + ' — ' + realm.name.toUpperCase(), CFG.VIEW_W / 2, 105);
      out.font = '6px "Courier New", monospace';
      out.fillStyle = '#c8b8d0';
      out.fillText(realm.desc.toUpperCase(), CFG.VIEW_W / 2, 122);
      out.font = 'bold 8px "Courier New", monospace';
      out.fillStyle = realm.accent;
      out.fillText('BOSS: ' + realm.boss.name.toUpperCase(), CFG.VIEW_W / 2, 140);
      out.textAlign = 'left';
      out.globalAlpha = 1;
    }

    // ---- DEATH SEQUENCE overlay ----
    if (this.deathSeq > 0) {
      const k = 1 - this.deathSeq / 2.6;
      const a = Math.min(1, k * 1.6);
      out.globalAlpha = a * 0.55;
      out.fillStyle = '#2a0000';
      out.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
      out.globalAlpha = a;
      out.textAlign = 'center';
      out.font = 'bold 16px "Courier New", monospace';
      out.fillStyle = '#ff4d6a';
      out.fillText('THE CONDUCTOR HAS FALLEN', CFG.VIEW_W / 2, CFG.VIEW_H / 2 - 6);
      out.font = 'bold 8px "Courier New", monospace';
      out.fillStyle = '#c8a8a0';
      out.fillText('SLAIN BY: ' + (this.lastHitBy || 'THE VOID').toUpperCase(), CFG.VIEW_W / 2, CFG.VIEW_H / 2 + 14);
      out.font = '6px "Courier New", monospace';
      out.fillStyle = '#8a7a8a';
      out.fillText('THE TRAIN REMEMBERS', CFG.VIEW_W / 2, CFG.VIEW_H / 2 + 28);
      out.textAlign = 'left';
      out.globalAlpha = 1;
    }
  }

  _light(wx, wy, r, color, intensity, flicker = 0) {
    const s = this.camera.worldToScreen(wx, wy);
    this.renderer.addLight(s.x, s.y, r * this.camera.zoom, color, intensity, flicker);
  }

  _drawShadow(ctx, x, y, w) {
    const s = w > 34 ? this.art.shadowHuge : w > 18 ? this.art.shadowBig : this.art.shadow;
    ctx.globalAlpha = 0.55;
    ctx.drawImage(s, Math.round(x - s.width / 2), Math.round(y - s.height / 2));
    ctx.globalAlpha = 1;
  }

  _drawPlayer(ctx, p) {
    const f = p.currentFrame();
    if (!f) return;
    this._drawShadow(ctx, p.x, p.y + 9, 16);
    let img = f;
    if (p.hitT > 0) img = this.art.hitFlash(f, '#ff6060');
    else if (p.invuln > 0 && Math.floor(this.runTime * 24) % 2 === 0) img = this.art.hitFlash(f, '#ffffff');
    if (p.shield > 0) {
      ctx.strokeStyle = '#ffe066'; ctx.globalAlpha = 0.5 + 0.2 * Math.sin(this.runTime * 6);
      ctx.beginPath(); ctx.arc(p.x, p.y, 15, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    if (p.flip && p.dirKey() === 'side') ctx.scale(-1, 1);
    if (!p.alive) { ctx.globalAlpha = Math.max(0, p.deathT / 1.4); ctx.rotate((1 - p.deathT / 1.4) * 0.6); }
    ctx.drawImage(img, -Math.round(img.width / 2), -Math.round(img.height / 2) - 3);
    ctx.restore();
    ctx.globalAlpha = 1;
    if (this.apocalypseActive) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.25 + 0.1 * Math.sin(this.runTime * 8);
      ctx.fillStyle = '#ff2a2a';
      ctx.beginPath(); ctx.arc(p.x, p.y - 2, 16, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }

  _drawEnemy(ctx, e) {
    const A = this.art;
    const key = e.spriteName(A.anim);
    const frames = A.anim[key] || A.anim.ghost;
    let f = frames[e.frame % frames.length];
    if (!f) return;
    const scale = e.scale || 1;
    this._drawShadow(ctx, e.x, e.y + 6 * scale, 14 * scale);
    // CLASS SILHOUETTE — one glance tells you what this thing does.
    // Outline hues are picked to never match enemy bullet colours
    // (bullets burn orange / glow violet; outlines are cool or pale).
    if (e.alive) {
      const r = (e.radius + 2) * scale;
      ctx.lineWidth = 1.5;
      const ring = (color) => { ctx.strokeStyle = color; ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, TAU); ctx.stroke(); };
      switch (e.ai) {
        case 'chase': case 'split': ring('#d85870'); break;                    // grunt: dusty rose ring
        case 'tank': {                                                         // tank: heavy steel hexagon
          ctx.strokeStyle = '#9ab0c0'; ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = i / 6 * TAU + 0.52;
            const px = e.x + Math.cos(a) * r, py = e.y + Math.sin(a) * r;
            i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.closePath(); ctx.stroke(); break;
        }
        case 'ranged': {                                                       // shooter: tall diamond
          ctx.strokeStyle = '#7ac0d8'; ctx.beginPath();
          ctx.moveTo(e.x, e.y - r - 2); ctx.lineTo(e.x + r, e.y);
          ctx.lineTo(e.x, e.y + r + 2); ctx.lineTo(e.x - r, e.y);
          ctx.closePath(); ctx.stroke(); break;
        }
        case 'swarm': {                                                        // swarm: three pale dots
          ctx.fillStyle = '#e8e8c8';
          for (let i = 0; i < 3; i++) {
            const a = i / 3 * TAU + this.runTime * 2;
            ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, 1.1, 0, TAU); ctx.fill();
          } break;
        }
        case 'summoner': ring('#b0a0ff'); break;                               // summoner: pale violet ring
        case 'burrower': {                                                     // burrower: broken ground arcs
          ctx.strokeStyle = '#d8b088';
          for (let i = 0; i < 3; i++) {
            const a = i / 3 * TAU + 0.3;
            ctx.beginPath(); ctx.arc(e.x, e.y, r + 1.5, a, a + 0.7); ctx.stroke();
          } break;
        }
        case 'shield': {                                                       // shielded: front shield arc
          ctx.strokeStyle = '#8ef0ff'; ctx.lineWidth = 2;
          const fa = Math.atan2(this.player.y - e.y, this.player.x - e.x);
          ctx.beginPath(); ctx.arc(e.x, e.y, r + 2.5, fa - 0.9, fa + 0.9); ctx.stroke(); break;
        }
        case 'fly': {                                                          // flier: wing ticks
          ctx.strokeStyle = '#a8dce8';
          ctx.beginPath();
          ctx.moveTo(e.x - r, e.y - 2); ctx.lineTo(e.x - r - 4, e.y - 5);
          ctx.moveTo(e.x + r, e.y - 2); ctx.lineTo(e.x + r + 4, e.y - 5);
          ctx.stroke(); break;
        }
        case 'sweep': ring('#ff9a6a'); break;                                  // marker: ember ring
        case 'eater': ring('#98e066'); break;                                  // eater: green maw ring
        case 'mirror': {                                                       // mirror: white double ring
          ctx.strokeStyle = '#f4f0ff'; ring('#f4f0ff');
          ctx.beginPath(); ctx.arc(e.x, e.y, r - 3, 0, TAU); ctx.stroke(); break;
        }
        default: break;
      }
      ctx.lineWidth = 1;
    }
    let img = f;
    if (e.freezeT > 0) img = A.hitFlash(f, '#9cd8ff');
    else if (e.flashT > 0) img = A.hitFlash(f, '#ffffff');
    else if (e.eliteMod) img = A.hitFlash(f, '#ffb020');
    ctx.save();
    ctx.translate(Math.round(e.x), Math.round(e.y));
    if (!e.alive) {
      const k = Math.max(0, e.deathT / 0.55);
      ctx.globalAlpha = k;
      ctx.scale(scale * (1 + (1 - k) * 0.5), scale * (1 - (1 - k) * 0.5));
    } else {
      const squash = e.spawnT > 0 ? 0.4 + (0.25 - e.spawnT) * 2.4 : 1;
      ctx.scale(scale * squash, scale * (2 - squash));
    }
    ctx.drawImage(img, -Math.round(img.width / 2), -Math.round(img.height / 2) - 2);
    // VARIANT DECOR — same body, different creature. Each recycled sprite
    // gets drawn-on features so no two species ever read the same.
    if (e.alive) this._drawVariant(ctx, e, img);
    ctx.restore();
    ctx.globalAlpha = 1;
    if (e.alive && e.hp < e.maxHp) {
      const w = Math.max(14, 10 * scale + 8);
      const pct = Math.max(0, e.hp / e.maxHp);
      const y = e.y - (e.radius + 9) * scale;
      ctx.fillStyle = '#00000099'; ctx.fillRect(e.x - w / 2 - 1, y - 1, w + 2, 4);
      ctx.fillStyle = e.eliteMod ? '#ffb020' : '#ff4d4d';
      ctx.fillRect(e.x - w / 2, y, w * pct, 2);
    }
    // warden tag — these things guard waypoints (and pay 1.5x XP)
    if (e.alive && e.warden && !e.eliteMod) {
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.moveTo(e.x, e.y + (e.radius + 6) * (e.scale || 1));
      ctx.lineTo(e.x + 3, e.y + (e.radius + 3) * (e.scale || 1));
      ctx.lineTo(e.x, e.y + e.radius * (e.scale || 1));
      ctx.lineTo(e.x - 3, e.y + (e.radius + 3) * (e.scale || 1));
      ctx.closePath(); ctx.fill();
    }
    // elite crown marker — a DIFFERENT shape and colour per modifier, so a
    // veteran reads the threat (and its answer) before it arrives
    if (e.alive && e.eliteMod) {
      const cy = e.y - (e.radius + 13) * (e.scale || 1);
      const crown = {
        armoured:      { c: '#ffb020', kind: 'square' },
        fast:          { c: '#8ef0ff', kind: 'chevron' },
        giant:         { c: '#ff4d4d', kind: 'spikes' },
        regenerating:  { c: '#7ae06a', kind: 'cross' },
        teleporting:   { c: '#c07aff', kind: 'diamond' },
        summoner:      { c: '#ff7ad0', kind: 'tri' },
        enraged:       { c: '#ff7a33', kind: 'zig' },
        void_touched:  { c: '#e8e2ff', kind: 'star' },
      }[e.eliteMod] || { c: '#ffb020', kind: 'tri' };
      ctx.fillStyle = crown.c;
      ctx.strokeStyle = crown.c;
      switch (crown.kind) {
        case 'square':
          ctx.fillRect(e.x - 4, cy - 2, 8, 6);
          ctx.fillStyle = '#ffffff55'; ctx.fillRect(e.x - 4, cy - 2, 8, 2);
          break;
        case 'chevron':
          ctx.lineWidth = 2; ctx.beginPath();
          ctx.moveTo(e.x - 5, cy + 3); ctx.lineTo(e.x, cy - 3); ctx.lineTo(e.x + 5, cy + 3);
          ctx.stroke(); ctx.lineWidth = 1;
          break;
        case 'spikes':
          ctx.beginPath();
          ctx.moveTo(e.x - 6, cy + 3); ctx.lineTo(e.x - 3, cy - 4); ctx.lineTo(e.x, cy + 1);
          ctx.lineTo(e.x + 3, cy - 4); ctx.lineTo(e.x + 6, cy + 3);
          ctx.closePath(); ctx.fill();
          break;
        case 'cross':
          ctx.fillRect(e.x - 1.5, cy - 5, 3, 10);
          ctx.fillRect(e.x - 5, cy - 1.5, 10, 3);
          break;
        case 'diamond':
          ctx.beginPath();
          ctx.moveTo(e.x, cy - 5); ctx.lineTo(e.x + 4, cy); ctx.lineTo(e.x, cy + 5); ctx.lineTo(e.x - 4, cy);
          ctx.closePath(); ctx.fill();
          break;
        case 'tri':
          ctx.beginPath();
          ctx.moveTo(e.x - 5, cy + 4); ctx.lineTo(e.x, cy - 3); ctx.lineTo(e.x + 5, cy + 4);
          ctx.closePath(); ctx.fill();
          break;
        case 'zig':
          ctx.lineWidth = 2; ctx.beginPath();
          ctx.moveTo(e.x - 5, cy + 2); ctx.lineTo(e.x - 2, cy - 2); ctx.lineTo(e.x + 1, cy + 2); ctx.lineTo(e.x + 5, cy - 3);
          ctx.stroke(); ctx.lineWidth = 1;
          break;
        case 'star':
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const a = -Math.PI / 2 + i * Math.PI / 5;
            const rr = i % 2 ? 2 : 5;
            const px = e.x + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
            i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.closePath(); ctx.fill();
          break;
      }
      this._light(e.x, e.y, 26, crown.c, 0.4);
    }
  }

  // variant decorations, drawn in the enemy's local (scaled) space
  _drawVariant(ctx, e, img) {
    const w = img.width, h = img.height, t = this.runTime, fr = e.frame || 0;
    switch (e.variant) {
      case 'star': { // Star Wisp — rotating four-point star + twinkle
        ctx.save();
        ctx.rotate(t * 1.2);
        ctx.fillStyle = '#ffe066';
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * h * 0.30, Math.sin(a) * h * 0.30 - 2);
          ctx.lineTo(Math.cos(a + 0.28) * h * 0.42, Math.sin(a + 0.28) * h * 0.42 - 2);
          ctx.lineTo(Math.cos(a - 0.28) * h * 0.42, Math.sin(a - 0.28) * h * 0.42 - 2);
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        if (Math.random() < 0.2) {
          ctx.fillStyle = '#fff8d0';
          ctx.fillRect(rand(-4, 4) - 0.5, rand(-8, 2) - 0.5, 1.4, 1.4);
        }
        break;
      }
      case 'soul': { // Lost Soul — teal inner glow + drooping wisp tails
        ctx.globalAlpha = 0.20;
        ctx.fillStyle = '#7ad0c8';
        ctx.beginPath(); ctx.arc(0, -1, h * 0.52, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = '#7ad0c8'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-2, h * 0.34);
        ctx.quadraticCurveTo(-4 + Math.sin(t * 5) * 2, h * 0.52, -1 + Math.sin(t * 3) * 3, h * 0.66);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(2, h * 0.34);
        ctx.quadraticCurveTo(4 + Math.cos(t * 4) * 2, h * 0.5, 2 + Math.cos(t * 3.4) * 3, h * 0.62);
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
      case 'mirror': { // Mirror Wisp — faceted diamond shell + glints
        ctx.strokeStyle = '#f4f0ff'; ctx.lineWidth = 1;
        const r = h * 0.55;
        ctx.beginPath();
        ctx.moveTo(0, -r - 2); ctx.lineTo(r * 0.7, -2); ctx.lineTo(0, r); ctx.lineTo(-r * 0.7, -2);
        ctx.closePath(); ctx.stroke();
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(-r * 0.35, -r * 0.45); ctx.lineTo(0, -r * 0.1); ctx.lineTo(r * 0.3, -r * 0.5);
        ctx.stroke();
        ctx.globalAlpha = 1;
        if (fr % 3 === 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(r * 0.2, -r * 0.7, 1.5, 1.5); }
        break;
      }
      case 'lurker': { // Marsh Lurker — swaying reeds + moss cap
        ctx.strokeStyle = '#4ad06a'; ctx.lineWidth = 1.5;
        for (let i = -1; i <= 1; i++) {
          const sway = Math.sin(t * 2.2 + i * 2.1) * 2.5;
          ctx.beginPath();
          ctx.moveTo(i * w * 0.22, -h * 0.36);
          ctx.quadraticCurveTo(i * w * 0.22 + sway, -h * 0.55, i * w * 0.24 + sway * 1.6, -h * 0.72);
          ctx.stroke();
        }
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#2e7a44';
        ctx.beginPath(); ctx.ellipse(0, -h * 0.30, w * 0.34, h * 0.12, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case 'maw': { // Slag Gobbler — a mouth that chews, teeth and all
        const open = 0.5 + 0.5 * Math.sin(fr * 1.05); // chews with the walk cycle
        const mw = w * 0.36, mh = h * (0.10 + 0.14 * open);
        ctx.fillStyle = '#3a0d0d';
        ctx.beginPath(); ctx.ellipse(0, h * 0.10, mw, mh, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#e8e0d0';
        for (let i = 0; i < 4; i++) {
          const tx = -mw * 0.7 + i * (mw * 0.47);
          ctx.beginPath();
          ctx.moveTo(tx, h * 0.10 - mh * 0.8); ctx.lineTo(tx + mw * 0.16, h * 0.10 - mh * 0.8);
          ctx.lineTo(tx + mw * 0.08, h * 0.10 - mh * 0.2); ctx.closePath(); ctx.fill();
          ctx.beginPath();
          ctx.moveTo(tx, h * 0.10 + mh * 0.8); ctx.lineTo(tx + mw * 0.16, h * 0.10 + mh * 0.8);
          ctx.lineTo(tx + mw * 0.08, h * 0.10 + mh * 0.2); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = '#fff0d0';
        ctx.fillRect(-w * 0.22, -h * 0.28, 2, 2);
        ctx.fillRect(w * 0.14, -h * 0.28, 2, 2);
        break;
      }
      default: break;
    }
    ctx.lineWidth = 1;
  }

  _drawBoss(ctx, b) {
    const A = this.art;
    let key = b.spriteName;
    if (key === 'trainEngine') key = 'bossTrain';
    if (!A.anim[key]) key = 'bossConductor';
    const frames = A.anim[key];
    const f = frames[Math.floor(this.runTime * 8) % frames.length];
    this._drawShadow(ctx, b.x, b.y + b.radius * 0.7, b.radius * 2.4);
    let img = f;
    if (b.flashT > 0) img = A.hitFlash(f, '#ffffff');
    const intro = b._introT > 0 ? b._introT / 1.4 : 0;
    ctx.save();
    ctx.translate(Math.round(b.x), Math.round(b.y));
    const s = (b.scale || 1) * (1 + intro * 0.3);
    ctx.scale(s, s);
    ctx.globalAlpha = b.alive ? (1 - intro * 0.5) : Math.max(0, b.deathT / 1.2);
    ctx.drawImage(img, -Math.round(img.width / 2), -Math.round(img.height / 2));
    ctx.restore();
    ctx.globalAlpha = 1;
    // boss threat aura — bosses always read instantly against the crowd
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(this.runTime * 4);
    ctx.strokeStyle = b.color || '#ff8040';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius + 8 + Math.sin(this.runTime * 3) * 2, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
    // VULNERABLE window — the clear "hit it NOW" moment after a phase change
    if (b.alive && b.vulnT > 0) {
      const pulse = 0.55 + 0.45 * Math.sin(this.runTime * 14);
      ctx.globalAlpha = 0.5 + 0.5 * pulse;
      ctx.strokeStyle = '#8ef0ff';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.radius + 13 + pulse * 4, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
      textC(ctx, 'VULNERABLE ' + Math.ceil(b.vulnT) + 's', b.x, b.y - b.radius - 22, '#8ef0ff', 8, true);
      this._light(b.x, b.y, 90, '#8ef0ff', 0.7);
    }
    this._light(b.x, b.y, 70, b.color || '#ff8040', 0.6);
  }

  _drawTrain(ctx, t) {
    const set = t.set;
    const i = Math.floor(t.wheelPhase * set.engine.length) % set.engine.length;
    const eng = (t.hp / t.maxHp < 0.4 ? set.engineHurt : set.engine)[i];
    const dir = t.facing || 1;
    this._drawShadow(ctx, t.x, t.y + 14, 60);
    // carriages behind
    let off = -46 * dir;
    for (const c of t.carriages) {
      const car = (c === 'gun' ? set.gun : set.cargo)[i];
      this._drawShadow(ctx, t.x + off, t.y + 12, 46);
      ctx.save();
      ctx.translate(Math.round(t.x + off), Math.round(t.y));
      if (dir < 0) ctx.scale(-1, 1);
      ctx.drawImage(car, -Math.round(car.width / 2), -Math.round(car.height / 2) - 4);
      ctx.restore();
      off -= 46 * dir;
    }
    ctx.save();
    ctx.translate(Math.round(t.x), Math.round(t.y));
    if (dir < 0) ctx.scale(-1, 1);
    let img = eng;
    if (t.hitT > 0) img = this.art.hitFlash(eng, '#ff8080');
    ctx.drawImage(img, -Math.round(img.width / 2), -Math.round(img.height / 2) - 4);
    ctx.restore();
    // headlight cone
    this._light(t.x + 26 * dir, t.y - 8, 60, set.skin.pal.glow, 0.8, 0.1);
    if (t.overdrive) this._light(t.x, t.y, 90, '#ff3a2a', 1.0, 0.3);
  }

  _drawPickup(ctx, u) {
    const A = this.art;
    const frames = A.anim[u.spriteKey()] || A.anim.xp;
    const f = frames[Math.floor(u.frame) % frames.length];
    const bob = Math.sin(u.t * 6) * 1.5;
    ctx.drawImage(f, Math.round(u.x - f.width / 2), Math.round(u.y - f.height / 2 + bob));
    if (u.type === 'coin' || u.type === 'chest' || u.type === 'heart') {
      this._light(u.x, u.y, 14, u.color(), 0.35);
    }
  }

  _drawProjectile(ctx, pr) {
    const A = this.art;
    const key = pr.sprite && A.anim[pr.sprite] ? pr.sprite : null;
    // enemy fire always gets a dark ring so it reads as THREAT instantly
    if (pr.owner === 'enemy') {
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = '#180a12'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(pr.x, pr.y, (pr.size || 4) + 2, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (key) {
      const frames = A.anim[key];
      const f = frames[Math.floor(this.runTime * 22 + pr._id) % frames.length];
      ctx.save();
      ctx.translate(Math.round(pr.x), Math.round(pr.y));
      if (pr.rot || pr.angle !== undefined) ctx.rotate(pr.rot || pr.angle || 0);
      const s = pr.omega ? 2 : 1;
      ctx.drawImage(f, -Math.round(f.width / 2) * s, -Math.round(f.height / 2) * s, f.width * s, f.height * s);
      ctx.restore();
    } else {
      ctx.fillStyle = pr.color || '#ffffff';
      ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.size, 0, TAU); ctx.fill();
    }
    this._light(pr.x, pr.y, (pr.omega ? 60 : 20), pr.color || '#ffffff', pr.omega ? 1 : 0.4);
  }

  _drawAmbient(ctx, layer) {
    const bits = this.ambientBits;
    for (const a of bits) {
      switch (a.kind) {
        case 'snow': if (layer) { ctx.fillStyle = '#d4ecff'; ctx.globalAlpha = 0.7; ctx.fillRect(a.x, a.y, 1, 1); } break;
        case 'ember': if (layer) { ctx.fillStyle = '#ffb040'; ctx.globalAlpha = 0.8; ctx.fillRect(a.x, a.y, 1, 2); } break;
        case 'sand': if (!layer) { ctx.fillStyle = '#c8a464'; ctx.globalAlpha = 0.18; ctx.fillRect(a.x, a.y, 10, 1); } break;
        case 'leaf': if (layer) { ctx.fillStyle = '#5a9c33'; ctx.globalAlpha = 0.7; ctx.fillRect(a.x, a.y, 2, 1); } break;
        case 'spark': if (layer) { ctx.fillStyle = '#c07aff'; ctx.globalAlpha = 0.8; ctx.fillRect(a.x, a.y, 1, 1); } break;
        default: if (!layer) { ctx.fillStyle = '#8a8ab0'; ctx.globalAlpha = 0.07; ctx.fillRect(a.x, a.y, 40, 8); }
      }
      ctx.globalAlpha = 1;
    }
  }

  _drawWorld(ctx) {
    const ts = 16;
    const cam = this.camera;
    const halfW = CFG.VIEW_W / 2 / cam.zoom + 32;
    const halfH = CFG.VIEW_H / 2 / cam.zoom + 32;
    // INFINITE: no clamp to W/H, use tileAtWorld
    const tx0 = Math.floor((cam.x - halfW) / ts) - 1;
    const ty0 = Math.floor((cam.y - halfH) / ts) - 1;
    const tx1 = Math.ceil((cam.x + halfW) / ts) + 1;
    const ty1 = Math.ceil((cam.y + halfH) / ts) + 1;
    const realm = findRealm(this.realmId);
    // AAA: gradient sky based on realm
    const grad = ctx.createLinearGradient(0, cam.y-halfH, 0, cam.y+halfH);
    grad.addColorStop(0, realm.sky || '#1a0a1a');
    grad.addColorStop(1, floorOf(this.realmId, 2));
    ctx.fillStyle = grad;
    ctx.fillRect(cam.x - halfW - 32, cam.y - halfH - 32, halfW * 2 + 64, halfH * 2 + 64);
    // subtle vignette for infinite depth
    const vign = ctx.createRadialGradient(cam.x, cam.y, 0, cam.x, cam.y, halfW*1.4);
    vign.addColorStop(0, 'rgba(0,0,0,0)');
    vign.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vign;
    ctx.fillRect(cam.x - halfW - 32, cam.y - halfH - 32, halfW * 2 + 64, halfH * 2 + 64);
    for (let y = ty0; y <= ty1; y++) {
      for (let x = tx0; x <= tx1; x++) {
        const wx = x * ts + 8, wy = y * ts + 8;
        const t = this.world.tileAtWorld(wx, wy);
        const px = x * ts, py = y * ts;
        const n = ((x * 73856093) ^ (y * 19349663)) & 7;
        if (t === T.WALL) {
          ctx.fillStyle = realm.accent; ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#00000055'; ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
          ctx.fillStyle = realm.accent; ctx.fillRect(px + 2, py + 2, ts - 5, ts - 5);
          ctx.fillStyle = '#ffffff10'; ctx.fillRect(px + 2, py + 2, ts - 5, 2);
        } else if (t === T.TREE) {
          ctx.fillStyle = floorOf(this.realmId, n); ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#1a1208'; ctx.fillRect(px + 6, py + 6, 4, 10);
          ctx.fillStyle = '#24401a'; ctx.beginPath(); ctx.arc(px + 8, py + 6, 6, 0, TAU); ctx.fill();
          ctx.fillStyle = '#3a6a26'; ctx.beginPath(); ctx.arc(px + 7, py + 5, 4, 0, TAU); ctx.fill();
        } else if (t === T.ROCK) {
          ctx.fillStyle = floorOf(this.realmId, n); ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#2c2c38'; ctx.beginPath(); ctx.arc(px + 8, py + 9, 5, 0, TAU); ctx.fill();
          ctx.fillStyle = '#48485a'; ctx.beginPath(); ctx.arc(px + 7, py + 8, 3.4, 0, TAU); ctx.fill();
        } else if (t === T.LAVA) {
          const pulse = 0.5 + 0.5 * Math.sin(this.runTime * 2 + n);
          ctx.fillStyle = '#6b1510'; ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = pulse > 0.6 ? '#ff6a33' : '#d6311a';
          ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
          if (Math.random() < 0.02) this.fx.embers(px + 8, py + 8, '#ffb040', 1);
        } else if (t === T.ICE) {
          ctx.fillStyle = '#16243c'; ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#25436a'; ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
          if (n < 2) { ctx.fillStyle = '#7ab0e0'; ctx.fillRect(px + 4 + n, py + 5, 4, 1); }
        } else if (t === T.SAND) {
          ctx.fillStyle = '#5c4c20'; ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#6d5a28'; ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
          if (n < 3) { ctx.fillStyle = '#7a6530'; ctx.fillRect(px + 3 + n * 2, py + 6 + n, 3, 1); }
        } else if (t === T.VOID) {
          ctx.fillStyle = '#0a0420'; ctx.fillRect(px, py, ts, ts);
          if (n === 0) { ctx.fillStyle = '#482278'; ctx.fillRect(px + 4, py + 6, 1, 1); }
          if (n === 3) { ctx.fillStyle = '#7a44c0'; ctx.fillRect(px + 11, py + 3, 1, 1); }
        } else if (t === T.PLATFORM) {
          ctx.fillStyle = '#1c1c24'; ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#2c2c38'; ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
          ctx.fillStyle = '#3d3d4d'; ctx.fillRect(px, py + 12, ts, 2);
        } else if (t === T.TRACK) {
          ctx.fillStyle = floorOf(this.realmId, n); ctx.fillRect(px, py, ts, ts);
          ctx.fillStyle = '#3a2a18'; ctx.fillRect(px, py + 4, ts, 8);
          ctx.fillStyle = '#6a6a80'; ctx.fillRect(px, py + 5, ts, 1); ctx.fillRect(px, py + 10, ts, 1);
        } else if (t === T.ASH) {
          ctx.fillStyle = '#241a10'; ctx.fillRect(px, py, ts, ts);
          if (n < 2) { ctx.fillStyle = '#3a2a18'; ctx.fillRect(px + 3 + n * 3, py + 4 + n, 2, 2); }
        } else {
          ctx.fillStyle = floorOf(this.realmId, n & 1 ? 0 : 1);
          ctx.fillRect(px, py, ts, ts);
          if (n === 0) { ctx.fillStyle = '#ffffff12'; ctx.fillRect(px + 3, py + 5, 3, 1); }
          if (n === 2) { ctx.fillStyle = '#ffffff0a'; ctx.fillRect(px + 10, py + 2, 2, 2); }
          if (n === 5) { ctx.fillStyle = '#00000033'; ctx.fillRect(px + 9, py + 10, 4, 2); }
          if (n === 6) { ctx.fillStyle = '#00000022'; ctx.fillRect(px + 2, py + 12, 5, 1); }
        }
      }
    }
  }

  // ================================================================
  // HUD
  // ================================================================
  _drawHUD(ctx) {
    const W = CFG.VIEW_W, H = CFG.VIEW_H;
    const p = this.player;

    // ---- XP bar across the very top ----
    ctx.fillStyle = '#0c0a16'; ctx.fillRect(0, 0, W, 7);
    const xpPct = Math.min(1, p.xp / p.xpNeeded());
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#2b6ad0'); g.addColorStop(1, '#8ef0ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W * xpPct, 6);
    ctx.fillStyle = '#ffffff40'; ctx.fillRect(0, 0, W * xpPct, 2);
    text(ctx, 'LV ' + p.level, 4, 13, '#ffffff', 8, true);

    // ---- HP + shield ----
    const hx = 34, hy = 8, hw = 118, hh = 9;
    ctx.fillStyle = '#000000aa'; ctx.fillRect(hx - 1, hy - 1, hw + 2, hh + 2);
    ctx.fillStyle = '#2a0c10'; ctx.fillRect(hx, hy, hw, hh);
    const hpPct = Math.max(0, p.hp / p.maxHp);
    const hg = ctx.createLinearGradient(hx, 0, hx + hw, 0);
    hg.addColorStop(0, '#c81f2a'); hg.addColorStop(1, '#ff6a5a');
    ctx.fillStyle = hg; ctx.fillRect(hx, hy, hw * hpPct, hh);
    ctx.fillStyle = '#ffffff33'; ctx.fillRect(hx, hy, hw * hpPct, 3);
    if (p.shield > 0) {
      ctx.fillStyle = '#ffe06699';
      ctx.fillRect(hx, hy, hw * Math.min(1, p.shield / p.maxHp), hh);
    }
    text(ctx, Math.ceil(p.hp) + '/' + Math.round(p.maxHp), hx + 4, hy + 7, '#ffffff', 7, true);

    // ---- coins / time / kills ----
    const coinF = this.art.anim.coin[Math.floor(this.runTime * 8) % 8];
    ctx.drawImage(coinF, W - 74, 8);
    text(ctx, fmtNum(this.runCoins), W - 62, 16, '#ffe878', 8, true);
    text(ctx, fmtTime(this.runTime)+' / '+fmtTime(this.sectorDuration), W - 74, 26, '#cfd4e0', 7);
    text(ctx, '\u25c6 ' + fmtNum(this.gameStats.shards || 0), W - 74, 36, '#8ef0ff', 7, true);
    // sector timer bar
    {
      const pct = Math.max(0, this.sectorTimeLeft / this.sectorDuration);
      const bx = W/2 - 50, by = 8, bw=100, bh=4;
      ctx.fillStyle='#000000aa'; ctx.fillRect(bx-1,by-1,bw+2,bh+2);
      ctx.fillStyle = pct < 0.25 ? '#ff4d4a' : pct < 0.5 ? '#ff8a30' : '#8ef0ff';
      ctx.fillRect(bx,by,bw*pct,bh);
      textC(ctx, 'SECTOR '+this.stage+' '+Math.ceil(this.sectorTimeLeft)+'s', W/2, 6, '#ffffff', 6, true);
      // active route — what this sector is doing to you, on screen at all times
      let ty = 20;
      if (this.routeName) {
        textC(ctx, this.routeName + ' SECTOR', W / 2, ty, this.theme?.color || '#ffe066', 6, true);
        ty += 8;
      }
      if (this.challenge) {
        const c = this.challenge;
        const prog = c.type === 'survive' ? Math.ceil(c.t) + 's'
          : c.type === 'elites' ? c.done + '/' + c.need
          : (c.core?.alive ? 'CORE UP' : 'DONE');
        textC(ctx, 'CHALLENGE: ' + (c.type === 'survive' ? 'SURVIVE ' : c.type === 'elites' ? 'SLAY ELITES ' : 'BREAK CORE ') + prog
          + ' — +' + c.reward + ' COINS', W / 2, ty, '#ffe066', 6, true);
      }
      // THE GAUNTLET: lieutenant health bar, top center
      if (this.lieutenant?.alive) {
        const e = this.lieutenant;
        const bw = 120;
        ctx.fillStyle = '#000000aa'; ctx.fillRect(W / 2 - bw / 2 - 1, ty + 1, bw + 2, 7);
        ctx.fillStyle = '#ff4d6a'; ctx.fillRect(W / 2 - bw / 2, ty + 2, bw * Math.max(0, e.hp / e.maxHp), 5);
        textC(ctx, 'THE LIEUTENANT', W / 2, ty - 1, '#ff4d6a', 6, true);
      }
    }
    // kills — icon + number, less text-litter
    ctx.fillStyle = '#ff7a6a';
    ctx.beginPath();
    ctx.arc(W - 68, 31, 2.4, 0, TAU); ctx.fill();
    ctx.fillRect(W - 71, 34, 6, 4);
    text(ctx, String(this.runStats.kills), W - 62, 37, '#cfd4e0', 7, true);
    if (this.relicActive) text(ctx, '◆' + this.relicActive.name.toUpperCase().slice(0, 10), W - 74, 46, '#ffe066', 5, true);

    // ---- combo ----
    if (p.combo > 4) {
      const a = Math.min(1, p.comboT);
      ctx.globalAlpha = a;
      textC(ctx, 'x' + p.combo + ' COMBO', W / 2, 22, p.combo > 40 ? '#ff4d6a' : p.combo > 20 ? '#ffb020' : '#ffe066',
        p.combo > 40 ? 12 : 10, true);
      ctx.globalAlpha = 1;
    }

    // ---- weapons (bottom-left) ----
    let wx = 6;
    for (const w of p.weapons) {
      const st = p.weaponStates[w.id];
      drawIcon(ctx, w.icon || 'fire', wx, H - 22, 16, w.evolved ? '#ffe066' : w.color);
      // EVOLVED star badge
      if (w.evolved) {
        ctx.fillStyle = '#ffe066';
        ctx.beginPath();
        ctx.moveTo(wx + 8, H - 26); ctx.lineTo(wx + 10, H - 22); ctx.lineTo(wx + 14, H - 21);
        ctx.lineTo(wx + 11, H - 18); ctx.lineTo(wx + 12, H - 14); ctx.lineTo(wx + 8, H - 16);
        ctx.lineTo(wx + 4, H - 14); ctx.lineTo(wx + 5, H - 18); ctx.lineTo(wx + 2, H - 21);
        ctx.lineTo(wx + 6, H - 22); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#000000aa'; ctx.fillRect(wx, H - 8, 16, 7);
      text(ctx, 'L' + st.level, wx + 2, H - 2, '#ffffff', 6, true);
      if (w.behavior === 'charge') {
        // charge gauge fills up instead of a cooldown draining
        const k = Math.max(0, Math.min(1, (st.chargeT || 0) / (w.chargeTime || 1.7)));
        ctx.fillStyle = '#000000aa'; ctx.fillRect(wx, H - 22, 16, 16);
        ctx.fillStyle = k >= 1 ? '#ffd0ff' : '#e08aff';
        ctx.fillRect(wx, H - 22 + 16 * (1 - k), 16, 16 * k);
      } else if (st.cd > 0 && w.cd) {
        ctx.fillStyle = '#000000aa';
        const k = Math.max(0, Math.min(1, st.cd / w.cd));
        ctx.fillRect(wx, H - 22, 16, 16 * k);
      }
      wx += 19;
    }
    // ---- ability ----
    for (const ab of p.abilities) {
      const st = p.abilityStates[ab.id];
      drawIcon(ctx, 'dash', wx + 4, H - 22, 16, ab.color);
      if (st.cd > 0) {
        ctx.fillStyle = '#000000bb';
        ctx.fillRect(wx + 4, H - 22, 16, 16 * (st.cd / ab.cd));
        text(ctx, st.cd.toFixed(1), wx + 5, H - 12, '#ffffff', 6, true);
      } else text(ctx, 'SPC', wx + 5, H - 2, '#8ef0ff', 6, true);
      wx += 22;
    }

    // ---- train status (bottom-right) — furnace + carriage loadout on show ----
    const tw = 90, tx = W - tw - 6, ty = H - 42;
    ctx.fillStyle = '#000000aa'; ctx.fillRect(tx - 2, ty - 2, tw + 4, 40);
    text(ctx, this.train.set.skin.name.toUpperCase().slice(0, 14), tx, ty + 5, '#cfd4e0', 6, true);
    drawBar(ctx, tx, ty + 8, tw, 5, this.train.hp / this.train.maxHp, '#74c04a', '#0e2410');
    drawBar(ctx, tx, ty + 15, tw, 4, this.train.energy / this.train.maxEnergy, '#8ef0ff', '#101a2a');
    if (!this.train.dead && this.train.energy >= this.train.maxEnergy && !this.train.overdrive) {
      text(ctx, 'Q — ULTIMATE READY', tx, ty - 4, Math.sin(this.runTime * 8) > 0 ? '#8ef0ff' : '#ffffff', 6, true);
    }
    // furnace meter — the E-button promise, always visible
    const fk = Math.min(1, this.train.furnace / this.train.furnaceMax);
    drawBar(ctx, tx, ty + 21, tw, 4, fk, fk >= 1 ? '#ffd040' : '#c96a2a', '#241410');
    if (fk >= 1 && !this.train.overdrive) {
      const near = dist(p.x, p.y, this.train.x, this.train.y) < 90;
      text(ctx, near ? 'E: FURNACE BURST!' : 'E — GET CLOSE TO TRAIN', tx, ty + 31,
        near ? (Math.sin(this.runTime * 10) > 0 ? '#ffe066' : '#ffffff') : '#8a8a9c', 6, true);
    } else if (this.train.overdrive) {
      text(ctx, 'OVERDRIVE ' + Math.ceil(this.train.overdriveT) + 's', tx + 20, ty + 31, '#ff4d6a', 6, true);
    }
    // carriage icons — what your pick-2 actually is, mid-run
    {
      const iconMap = { gunsmith: 'gun', ammo: 'fan', medical: 'cross', engine: 'train', loot: 'coin', plating: 'shield' };
      let cx = tx;
      for (const cid of (this.train.carriageLoadout || [])) {
        drawIcon(ctx, iconMap[cid] || 'dot', cx, ty - 12, 10, '#cfd4e0');
        cx += 13;
      }
    }

    // ---- active buffs (compact) ----
    let by = H - 34;
    if (this.buffs.dmgT > 0) { text(ctx, 'SURGE ' + Math.ceil(this.buffs.dmgT) + 's', tx - 8, by, '#2ff0ff', 6, true); by -= 10; }
    if (this.buffs.xpT > 0) { text(ctx, 'FAVOR ' + Math.ceil(this.buffs.xpT) + 's', tx - 8, by, '#c07aff', 6, true); by -= 10; }
    if (this.player.rootT > 0) { textC(ctx, 'ROOTED', W / 2, H - 44, '#7ae06a', 7, true); }

    // ---- waypoint arrow (edge pointer to the objective) ----
    if (this.waypoint) {
      const w = this.waypoint;
      const dx = w.x - p.x, dy = w.y - p.y;
      const ang = Math.atan2(dy, dx);
      const cx = W / 2, cy = H / 2;
      const ex = cx + Math.cos(ang) * (W / 2 - 14), ey = cy + Math.sin(ang) * (H / 2 - 10);
      const s = 6;
      ctx.save();
      ctx.translate(ex, ey); ctx.rotate(ang);
      ctx.fillStyle = w.color;
      ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * 0.7, -s * 0.7); ctx.lineTo(-s * 0.7, s * 0.7);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      text(ctx, w.label, ex + Math.cos(ang) * 14 - 4, ey + Math.sin(ang) * 14 + 3, w.color, 5, true);
    }

    // ---- AAA MINIMAP (infinite) ----
    {
      const mx = W - 62, my = H - 62, ms = 56;
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(mx-2, my-2, ms+4, ms+4);
      ctx.strokeStyle = '#3a2a4a'; ctx.lineWidth = 1; ctx.strokeRect(mx-2, my-2, ms+4, ms+4);
      // draw nearby tiles mini
      const scale = 0.12;
      const ptx = Math.floor(this.player.x / 16), pty = Math.floor(this.player.y / 16);
      for(let dy=-12; dy<=12; dy++){
        for(let dx=-12; dx<=12; dx++){
          const tx = ptx+dx, ty = pty+dy;
          const t = this.world.tileAtWorld(tx*16+8, ty*16+8);
          let col = null;
          if(t===2) col='#4a3a5a'; else if(t===3) col='#2a5a2a'; else if(t===4) col='#5a5a6a';
          else if(t===6) col='#ff4a18'; else if(t===12) col='#6a4a2a';
          if(col){
            ctx.fillStyle=col;
            ctx.fillRect(mx + ms/2 + dx*scale*16, my + ms/2 + dy*scale*16, 1.2, 1.2);
          }
        }
      }
      // player dot
      ctx.fillStyle='#ffe066'; ctx.beginPath(); ctx.arc(mx+ms/2, my+ms/2, 2.5, 0, Math.PI*2); ctx.fill();
      // enemies dots
      ctx.fillStyle='#ff4d4a';
      for(const e of this.enemies){
        if(!e.alive) continue;
        const dx = (e.x - this.player.x)*scale, dy = (e.y - this.player.y)*scale;
        if(Math.abs(dx) < ms/2 && Math.abs(dy) < ms/2){
          ctx.fillRect(mx+ms/2+dx-0.5, my+ms/2+dy-0.5, 1.5, 1.5);
        }
      }
      // boss
      if(this.boss?.alive){
        const dx = (this.boss.x - this.player.x)*scale, dy = (this.boss.y - this.player.y)*scale;
        if(Math.abs(dx) < ms/2 && Math.abs(dy) < ms/2){
          ctx.fillStyle='#ff2a2a'; ctx.beginPath(); ctx.arc(mx+ms/2+dx, my+ms/2+dy, 3, 0, Math.PI*2); ctx.fill();
        }
      }
      // waypoint objective
      if(this.waypoint){
        const dx = (this.waypoint.x - this.player.x)*scale, dy = (this.waypoint.y - this.player.y)*scale;
        if(Math.abs(dx) < ms/2 && Math.abs(dy) < ms/2){
          ctx.fillStyle=this.waypoint.color;
          ctx.beginPath(); ctx.arc(mx+ms/2+dx, my+ms/2+dy, 2.5, 0, Math.PI*2); ctx.fill();
        }
      }
      // infinite indicator
      ctx.fillStyle='#8ef0ff'; ctx.font='bold 5px monospace'; ctx.textAlign='center';
      ctx.fillText('∞ MAP', mx+ms/2, my+ms+10);
      ctx.textAlign='left';
    }

    // ---- boss bar ----
    if (this.boss?.alive && this.boss._introT <= 0) {
      const bw = W - 120, bx = 60, by = 42;
      ctx.fillStyle = '#000000bb'; ctx.fillRect(bx - 2, by - 2, bw + 4, 12);
      drawBar(ctx, bx, by, bw, 8, this.boss.hp / this.boss.maxHp, '#ff3a4a', '#2a0a10');
      textC(ctx, this.boss.name.toUpperCase() + '   PHASE ' + this.boss.phase + '/' + this.boss.phases,
        W / 2, by + 7, '#ffffff', 7, true);
    }

    // ---- apocalypse banner ----
    if (this.apocalypseActive) {
      ctx.globalAlpha = 0.6 + 0.3 * Math.sin(this.runTime * 5);
      textC(ctx, 'APOCALYPSE PROTOCOL ACTIVE', W / 2, H - 32, '#ff2a2a', 8, true);
      ctx.globalAlpha = 1;
    }

    // ---- low HP vignette ----
    if (p.hp / p.maxHp < 0.3) {
      const a = 0.5 * (1 - p.hp / p.maxHp) * (0.7 + 0.3 * Math.sin(this.runTime * 8));
      ctx.fillStyle = `rgba(255,30,30,${a.toFixed(3)})`;
      ctx.fillRect(0, 0, W, 5); ctx.fillRect(0, H - 5, W, 5);
      ctx.fillRect(0, 0, 5, H); ctx.fillRect(W - 5, 0, 5, H);
    }
  }

  // ================================================================
  // CARD OVERLAY
  // ================================================================
  _drawCards(ctx) {
    const W = CFG.VIEW_W, H = CFG.VIEW_H;
    const apoc = this.cards[0]?.card?.rarity === 'apocalypse';
    ctx.fillStyle = apoc ? 'rgba(40,0,0,0.9)' : 'rgba(6,4,14,0.86)';
    ctx.fillRect(0, 0, W, H);
    const t = Math.min(1, (this.cardT || 0) * 4);
    if (apoc) {
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(this.runTime * 6);
      ctx.fillStyle = '#ff2a2a'; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      textC(ctx, 'THE GRID IS COMPLETE', W / 2, 26, '#ff8080', 8, true);
      textC(ctx, 'APOCALYPSE PROTOCOL', W / 2, 40, '#ffffff', 14, true);
    } else {
      textC(ctx, 'ASCENSION', W / 2, 24, '#ffe066', 12, true);
      textC(ctx, 'LEVEL ' + this.player.level + '  ·  CHOOSE YOUR PATH', W / 2, 36, '#cfd4e0', 7);
    }
    const geo = this._cardGeometry();
    for (let i = 0; i < this.cards.length; i++) {
      const { card, nextLevel } = this.cards[i];
      const gm = geo[i];
      drawCard(ctx, {
        x: gm.x, y: gm.y + (1 - t) * 20 * (i % 2 ? 1 : -1), w: gm.w, h: gm.h,
        title: card.name, level: (card.max || 5) > 1 ? ROMAN[nextLevel] : '',
        desc: typeof card.desc === 'function' ? card.desc(nextLevel) : card.desc,
        rarity: card.rarity, color: RARITY_COLORS[card.rarity], icon: card.icon,
        selected: this.cardIndex === i, index: i + 1, alpha: t,
        target: card.target === 'train' ? 'TRAIN' : null,
        tagline: card.tagline,
        evolved: !!card.req,
        tilt: (this._cardLean || [])[i] || 0,
      });
    }
    if (!apoc) {
      const by = H - 26;
      const rc = this.rerolls > 0 ? '#8ef0ff' : '#555566';
      const bc = this.banishes > 0 ? '#ff8a30' : '#555566';
      drawPanel(ctx, W / 2 - 90, by, 80, 16, rc);
      textC(ctx, 'REROLL (R) ' + this.rerolls, W / 2 - 50, by + 11, rc, 7, true);
      drawPanel(ctx, W / 2 + 10, by, 80, 16, bc);
      textC(ctx, 'BANISH (B) ' + this.banishes, W / 2 + 50, by + 11, bc, 7, true);
    }
  }

  _drawWPick(ctx) {
    const W = CFG.VIEW_W, H = CFG.VIEW_H;
    ctx.fillStyle = 'rgba(6,4,14,0.88)';
    ctx.fillRect(0, 0, W, H);
    const t = Math.min(1, this.wPick.t * 3.4);
    textC(ctx, 'A NEW WEAPON JOINS THE CREW', W / 2, 46, '#ffe066', 12, true);
    textC(ctx, 'pick one — exact stats shown', W / 2, 60, '#cfd4e0', 7);
    const geo = this._wpickGeometry();
    for (let i = 0; i < this.wPick.opts.length; i++) {
      const w = this.wPick.opts[i];
      const g = geo[i];
      const y = g.y + (1 - t) * 24 * (i % 2 ? 1 : -1);
      const sel = this.wPick.idx === i;
      ctx.globalAlpha = t;
      ctx.fillStyle = sel ? '#1c1626' : '#120e1c';
      ctx.fillRect(g.x, y, g.w, g.h);
      const lean = (this._wpickLean || [])[i] || 0;
      if (lean !== 0) {
        // 3D-tilt parity: shear toward the cursor + cast an under-shadow
        ctx.save();
        ctx.globalAlpha = t * 0.35;
        ctx.fillStyle = '#000000';
        ctx.fillRect(g.x - lean * 5 + 3, y + 6, g.w, g.h);
        ctx.restore();
        ctx.save();
        ctx.translate(g.x + g.w / 2, y + g.h / 2);
        ctx.transform(1, 0, lean * 0.085, 1 - Math.abs(lean) * 0.05, -(g.x + g.w / 2), -(y + g.h / 2));
      }
      ctx.strokeStyle = sel ? w.color : '#3a3450';
      ctx.lineWidth = sel ? 2 : 1;
      ctx.strokeRect(g.x + 0.5, y + 0.5, g.w - 1, g.h - 1);
      if (sel) {
        const fg = ctx.createLinearGradient(g.x, y, g.x + g.w, y + g.h);
        fg.addColorStop(0, '#ff3b46'); fg.addColorStop(1, '#28f0e0');
        ctx.strokeStyle = fg;
        ctx.globalAlpha = t * (0.5 + 0.4 * Math.sin(this.runTime * 9));
        ctx.lineWidth = 2.5;
        ctx.strokeRect(g.x - 1.5, y - 1.5, g.w + 3, g.h + 3);
        ctx.lineWidth = 1;
        ctx.globalAlpha = t * 0.22 + 0.1 * Math.sin(this.runTime * 8);
        ctx.strokeStyle = w.color;
        ctx.strokeRect(g.x + 0.5, y + 0.5, g.w - 1, g.h - 1);
        ctx.globalAlpha = t;
        ctx.fillStyle = w.color;
        ctx.fillRect(g.x, y, g.w, g.h);
        ctx.globalAlpha = t;
      }
      drawIcon(ctx, w.icon || 'star', g.x + g.w / 2 - 8, y + 8, 16, w.color);
      textC(ctx, w.name.toUpperCase(), g.x + g.w / 2, y + 34, w.color, 7, true);
      textC(ctx, 'DMG ' + Math.round(w.dmg) + ' · ' + (w.cd || 1).toFixed(1) + 's', g.x + g.w / 2, y + 46, '#cfd4e0', 6);
      let ly = y + 60;
      for (const seg of wrap6(ctx, w.desc, g.w - 12)) {
        textC(ctx, seg, g.x + g.w / 2, ly, '#e8e2f0', 6);
        ly += 9;
      }
      textC(ctx, '[' + (i + 1) + ']', g.x + g.w / 2, y + g.h - 6, '#6a647c', 6);
      ctx.globalAlpha = 1;
      if (lean !== 0) ctx.restore();
    }
    textC(ctx, 'CLICK A CARD  ·  OR PRESS 1 / 2 / 3', W / 2, H - 22, '#8a8a9c', 6);
  }

  // ================================================================
  // ROUTE CARD OVERLAY — pick the next sector, effects spelled out
  // ================================================================
  _drawRouteCards(ctx) {
    const W = CFG.VIEW_W, H = CFG.VIEW_H;
    ctx.fillStyle = 'rgba(6,4,14,0.88)';
    ctx.fillRect(0, 0, W, H);
    const t = Math.min(1, this.routeCards.t * 3.4);
    textC(ctx, 'SECTOR ' + this.stage + ' CLEARED', W / 2, 46, '#ffe066', 13, true);
    textC(ctx, 'CHOOSE THE NEXT LINE — every effect is exact', W / 2, 60, '#cfd4e0', 7);
    textC(ctx, 'sector ' + (this.stage + 1) + ' of ' + this.maxSectors, W / 2, 72, '#8a8a9c', 6);
    const geo = this._routeGeometry();
    for (let i = 0; i < this.routeCards.opts.length; i++) {
      const r = this.routeCards.opts[i];
      const g = geo[i];
      const y = g.y + (1 - t) * 24 * (i % 2 ? 1 : -1);
      const sel = this.routeCards.idx === i;
      ctx.globalAlpha = t;
      // card body
      ctx.fillStyle = sel ? '#1c1626' : '#120e1c';
      ctx.fillRect(g.x, y, g.w, g.h);
      ctx.strokeStyle = sel ? r.color : '#3a3450';
      ctx.lineWidth = sel ? 2 : 1;
      ctx.strokeRect(g.x + 0.5, y + 0.5, g.w - 1, g.h - 1);
      if (sel) {
        ctx.globalAlpha = t * 0.25 + 0.1 * Math.sin(this.runTime * 8);
        ctx.fillStyle = r.color;
        ctx.fillRect(g.x, y, g.w, g.h);
        ctx.globalAlpha = t;
      }
      drawIcon(ctx, r.icon, g.x + g.w / 2 - 8, y + 8, 16, r.color);
      textC(ctx, r.name, g.x + g.w / 2, y + 34, r.color, 8, true);
      let ly = y + 48;
      for (const line of r.desc) {
        for (const seg of wrap6(ctx, line, g.w - 12)) {
          textC(ctx, seg, g.x + g.w / 2, ly, '#e8e2f0', 6);
          ly += 9;
        }
        ly += 2;
      }
      textC(ctx, '[' + (i + 1) + ']', g.x + g.w / 2, y + g.h - 6, '#6a647c', 6);
      ctx.globalAlpha = 1;
    }
    textC(ctx, 'CLICK A CARD  ·  OR PRESS 1 / 2 / 3', W / 2, H - 22, '#8a8a9c', 6);
  }
}

let ID = 1;
function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
  return h >>> 0;
}
// rough word-wrap for tiny HUD text (monospace ~3.6px/char at 6px font)
function wrap6(ctx, s, maxW) {
  const maxChars = Math.max(8, Math.floor(maxW / 3.7));
  if (s.length <= maxChars) return [s];
  const words = s.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > maxChars) { lines.push(cur); cur = w; }
    else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) lines.push(cur);
  return lines;
}
