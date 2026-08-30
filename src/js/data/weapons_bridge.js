// ============================================================
// HELL TRAIN — EXTENDED ARSENAL BRIDGE
// `js/data/weapons_extended.js` describes 27 weapons as pure data
// (bombers, blasters, melee, beams, summons, specials, hybrids).
// That format has no behaviour attached, so nothing could fire them.
// This module translates every one of them into the live weapon
// schema the engine actually runs (see entities/player.js _cast).
// ============================================================
import { WEAPONS_EXTENDED, WEAPON_EVOLUTION_PATHS } from './weapons_extended.js';

const RARITY_COLOR = {
  common: '#9aa0b4', uncommon: '#5ad07a', rare: '#4a9cff',
  epic: '#c07aff', legendary: '#ffb020', mythic: '#ff2a5a',
};

// Per-category presentation + the behaviour each maps onto.
const CATEGORY = {
  BOMBERS: { family: 'explosive', sprite: 'bomb', icon: 'bomb', color: '#ff9033', slot: 'primary' },
  BLASTERS: { family: 'plasma', sprite: 'orbPlasma', icon: 'blaster', color: '#2ff0ff', slot: 'primary' },
  MELEE: { family: 'physical', sprite: 'sawBlade', icon: 'sword', color: '#d0d4e8', slot: 'melee' },
  BEAMS: { family: 'tech', sprite: 'railSlug', icon: 'bolt', color: '#8ef0ff', slot: 'primary' },
  SUMMONS: { family: 'shadow', sprite: 'orbShadow', icon: 'ghost', color: '#a05cff', slot: 'summon' },
  SPECIAL: { family: 'void', sprite: 'orbVoid', icon: 'moon', color: '#c07aff', slot: 'special' },
  HYBRID: { family: 'fire', sprite: 'orbFire', icon: 'fan', color: '#ff5a33', slot: 'primary' },
};

// Hand-tuned behaviour per weapon key so each one feels like its name.
const BEHAVIOUR = {
  basicBomber: 'bomber', clusterBomb: 'bomber', mineLayer: 'pool', napalm: 'pool',
  nuke: 'bomber', detonator: 'bomber',
  basicBlaster: 'projectile', pulseRifle: 'burst', gatling: 'projectile',
  beam: 'rail', railgun: 'rail', superBlaster: 'shotgun',
  sword: 'cone', scythe: 'cone', hammer: 'nova',
  laserBeam: 'rail', plasmaBeam: 'rail', voidBeam: 'rail',
  basicMinion: 'drones', golem: 'drones', dragonling: 'drones',
  timeWarp: 'aura', shockwave: 'nova', blackhole: 'blackhole',
  blasterBomb: 'bomber', chargeShot: 'rail', omnistrike: 'burst',
};

function convert(key, src, catName) {
  const cat = CATEGORY[catName] || CATEGORY.BLASTERS;
  const behavior = BEHAVIOUR[key] || 'projectile';
  const cd = Math.max(0.12, 1 / (src.firerate || 1));
  const color = RARITY_COLOR[src.rarity] && catName === 'SPECIAL' ? RARITY_COLOR[src.rarity] : cat.color;

  const w = {
    id: 'x_' + key.replace(/([A-Z])/g, '_$1').toLowerCase(),
    name: src.name,
    family: cat.family,
    color,
    sprite: cat.sprite,
    icon: cat.icon,
    slot: cat.slot,
    rarity: src.rarity || 'common',
    desc: src.desc,
    extended: true,
    behavior,
    cd,
    dmg: src.damage || 10,
    speed: src.projectileSpeed || 240,
    projSize: src.projectileSize || 5,
    projLife: src.duration || src.summonDuration || 1.8,
    pierce: src.piercingShots ? Math.min(99, src.piercingShots) : 0,
    projCount: src.splitCount ? Math.max(2, Math.round(src.splitCount / 2)) : 1,
    spread: 0.12,
    knockback: src.knockback || 0,
    explode: !!src.areaSize,
    explodeRadius: src.areaSize || 26,
    burn: src.burnDamage || 0,
    slow: src.slowAmount || 0,
    slowDur: src.slowAmount ? 2 : 0,
  };

  // behaviour-specific fields the engine reads
  if (behavior === 'bomber') {
    w.projCount = src.splitCount ? Math.min(6, src.splitCount) : (key === 'nuke' ? 1 : 2);
    w.cluster = src.chainReactions || (src.splitCount ? 2 : 0);
    w.explodeRadius = src.areaSize || 40;
  }
  if (behavior === 'pool') {
    w.poolRadius = src.mineRadius || src.areaSize || 30;
    w.projLife = src.burnDuration || src.duration || 4;
    w.dmg = (src.damage || 10) * 0.35;   // pools tick, so per-tick damage is lower
    w.cd = Math.max(0.6, cd);
  }
  if (behavior === 'burst') {
    w.burstCount = src.burstShots || 3;
    w.burstDelay = 0.06;
  }
  if (behavior === 'cone') {
    w.range = src.range || 60;
    w.arc = key === 'scythe' ? 1.5 : 0.9;
  }
  if (behavior === 'nova') {
    w.radius = src.areaSize || src.range || 70;
  }
  if (behavior === 'aura') {
    w.radius = src.areaSize || 90;
    w.dmg = (src.damage || 10) * 0.25;
    w.cd = 0.35;
  }
  if (behavior === 'blackhole') {
    w.radius = src.areaSize || 80;
    w.projLife = src.duration || 4;
  }
  if (behavior === 'drones') {
    w.droneCount = src.maxSummons || 2;
    w.droneCd = Math.max(0.3, 1 / (src.firerate || 1));
    w.droneRange = 150;
  }
  if (behavior === 'rail') {
    w.beamWidth = src.beamWidth || 7;
    w.cd = Math.max(0.35, cd);
  }
  if (key === 'gatling') { w.spread = 0.22; w.projCount = 1; }
  if (key === 'railgun') w.pierce = 99;

  // level curve — everything scales, faster and harder each rank
  const baseCd = w.cd, baseDmg = w.dmg, baseCount = w.projCount;
  w.curve = (l) => ({
    cd: Math.max(baseCd * 0.35, baseCd - baseCd * 0.055 * l),
    dmg: baseDmg + baseDmg * 0.28 * l,
    projCount: baseCount + Math.floor(l / 4),
    droneCount: w.droneCount ? w.droneCount + Math.floor(l / 3) : undefined,
    explodeRadius: w.explodeRadius + l * 2,
  });

  const evo = WEAPON_EVOLUTION_PATHS?.[key];
  if (evo) {
    w.evolutions = [{
      id: 'x_evo_' + key,
      name: typeof evo === 'string' ? evo : (evo.name || evo.evolvesTo || 'Ascended Form'),
      requires: [],
      desc: typeof evo === 'string' ? 'Evolves into ' + evo : (evo.desc || 'An ascended form of this weapon.'),
    }];
  }
  return w;
}

// Flatten every category into playable weapons.
export const EXTENDED_WEAPONS = (() => {
  const out = [];
  for (const [catName, group] of Object.entries(WEAPONS_EXTENDED || {})) {
    if (!group || typeof group !== 'object') continue;
    for (const [key, src] of Object.entries(group)) {
      if (!src || typeof src !== 'object' || !src.name) continue;
      try { out.push(convert(key, src, catName)); } catch { /* skip malformed entry */ }
    }
  }
  return out;
})();

export const EXTENDED_BY_CATEGORY = (() => {
  const map = {};
  for (const [catName, group] of Object.entries(WEAPONS_EXTENDED || {})) {
    map[catName] = Object.keys(group || {}).map(k => 'x_' + k.replace(/([A-Z])/g, '_$1').toLowerCase());
  }
  return map;
})();
