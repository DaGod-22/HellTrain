// ============================================================
// HELL TRAIN — ARSENAL
// Weapons, abilities, cores and evolutions.
// Every weapon has a behaviour implemented in entities/player.js.
// ============================================================

import { EXTENDED_WEAPONS } from './weapons_bridge.js';

const W = (o) => o;

export const WEAPONS = [
  // ---------------- STARTERS ----------------
  W({
    id: 'fireball', name: 'Hellfire Bolt', family: 'fire', color: '#ff5a33', sprite: 'orbFire',
    slot: 'primary', icon: 'fire',
    desc: 'Hurls a screaming bolt of hellfire at the nearest soul.',
    cd: 0.95, dmg: 13, speed: 230, projLife: 1.8, projSize: 5,
    pierce: 0, explode: false, burn: 0, behavior: 'fireball', projCount: 1, spread: 0.12,
    curve: (l) => ({ cd: Math.max(0.45, 0.95 - l * 0.03), dmg: 13 + l * 3, projCount: Math.min(2, 1 + Math.floor(l / 5)) }),
    evolutions: [
      { id: 'inferno_nova', requires: ['explosion_core'], name: 'Inferno Nova', desc: 'Bolts detonate in a ring of fire.' },
      { id: 'hellstorm', requires: ['hellstorm_core'], name: 'Hellstorm', desc: 'A rain of meteors follows every cast.' },
    ],
  }),
  W({
    id: 'orbital_blades', name: 'Flywheel Orbit', family: 'orbital', color: '#c8ccd8', sprite: 'sawBlade',
    slot: 'orbital', icon: 'turret',
    desc: 'Two spinning iron train gears revolve around you, grinding anything that gets close.',
    cd: 0, dmg: 10, projSize: 6, pierce: 99, behavior: 'orbital',
    baseRadius: 42, baseSpeed: 3.4, baseCount: 2, baseSize: 8,
    curve: (l) => ({ dmg: 10 + l * 2, baseCount: Math.min(4, 2 + Math.floor(l / 4)),
      baseRadius: 42 + Math.min(28, l * 1.5), baseSpeed: 3.4 + l * 0.06 }),
    evolutions: [
      { id: 'eclipse_ring', requires: ['eclipse_core'], name: 'Eclipse Ring', desc: 'Blades launch outward on a timer.' },
      { id: 'storm_ring', requires: ['lightning'], name: 'Storm Ring', desc: 'Every blade arcs lightning.' },
    ],
  }),

  // ---------------- BLASTERS ----------------
  W({
    id: 'plasma_blaster', name: 'Rivet Gun', family: 'plasma', color: '#9fd8e8', sprite: 'railSlug',
    slot: 'primary', icon: 'blaster',
    desc: 'Automatic steel rivets at the nearest horror. High velocity, punches through one target.',
    cd: 0.9, dmg: 9, speed: 430, projLife: 1.1, projSize: 4, pierce: 1,
    behavior: 'burst', burstCount: 2, burstDelay: 0.06, projCount: 1, spread: 0.03,
    curve: (l) => ({ cd: Math.max(0.4, 0.9 - l * 0.04), dmg: 9 + l * 2.2,
      burstCount: Math.min(4, 2 + Math.floor(l / 5)), pierce: Math.min(3, 1 + Math.floor(l / 6)) }),
    evolutions: [
      { id: 'ion_stormfront', requires: ['thunder_core'], name: 'Ion Stormfront', desc: 'Bolts chain and overcharge.' },
      { id: 'annihilator', requires: ['void_core'], name: 'Annihilator', desc: 'Infinite pierce, void detonations.' },
    ],
  }),
  W({
    id: 'scatter_blaster', name: 'Scatter Blaster', family: 'plasma', color: '#ffb040', sprite: 'orbLight',
    slot: 'primary', icon: 'shotgun',
    desc: 'Point blank devastation. Six pellets, one very bad day.',
    cd: 1.5, dmg: 9, speed: 260, projLife: 0.45, projSize: 4, pierce: 0,
    behavior: 'shotgun', projCount: 6, spread: 0.16, knockback: 90,
    curve: (l) => ({ cd: Math.max(0.7, 1.5 - l * 0.05), dmg: 9 + l * 2.2, projCount: Math.min(8, 6 + Math.floor(l / 4)) }),
    evolutions: [
      { id: 'devils_dozen', requires: ['explosion_core'], name: "Devil's Dozen", desc: 'Twelve explosive pellets.' },
    ],
  }),
  W({
    id: 'rail_lance', name: 'Rail Lance', family: 'tech', color: '#c0c0d8', sprite: 'railSlug',
    slot: 'primary', icon: 'rail',
    desc: 'Charges, then erases a straight line of reality.',
    cd: 2.6, dmg: 55, speed: 620, projLife: 0.9, projSize: 5, pierce: 99,
    behavior: 'rail', chargeTime: 0.5,
    curve: (l) => ({ cd: Math.max(1.2, 2.6 - l * 0.1), dmg: 55 + l * 15 }),
    evolutions: [
      { id: 'terminus_cannon', requires: ['void_core'], name: 'Terminus Cannon', desc: 'Fires a screen-wide void lance.' },
    ],
  }),

  // ---------------- BOMBERS ----------------
  W({
    id: 'bomber', name: 'Cluster Bomber', family: 'explosive', color: '#ff9033', sprite: 'bomb',
    slot: 'special', icon: 'bomb',
    desc: 'Drops timed bombs that split into shrapnel charges.',
    cd: 2.2, dmg: 30, speed: 90, projLife: 1.1, projSize: 6,
    explode: true, explodeRadius: 40, behavior: 'bomber', projCount: 2, cluster: 3,
    curve: (l) => ({ cd: Math.max(1.2, 2.2 - l * 0.06), dmg: 30 + l * 6,
      explodeRadius: Math.min(60, 40 + l * 2), projCount: Math.min(3, 2 + Math.floor(l / 5)), cluster: Math.min(4, 3 + Math.floor(l / 4)) }),
    evolutions: [
      { id: 'carpet_bombing', requires: ['explosion_core'], name: 'Carpet Bombing', desc: 'A rolling barrage follows you everywhere.' },
      { id: 'singularity_mine', requires: ['void_core'], name: 'Singularity Mine', desc: 'Bombs collapse into black holes.' },
    ],
  }),
  W({
    id: 'void_bomb', name: 'Void Bomb', family: 'void', color: '#9b6dff', sprite: 'orbVoid',
    slot: 'special', icon: 'void',
    desc: 'A lobbed hole in the world.',
    cd: 2.2, dmg: 28, speed: 170, projLife: 1.6, projSize: 7,
    explode: true, explodeRadius: 44, behavior: 'lob', projCount: 1,
    curve: (l) => ({ cd: Math.max(1.2, 2.2 - l * 0.05), dmg: 28 + l * 5,
      explodeRadius: Math.min(60, 44 + l * 2), projCount: Math.min(2, 1 + Math.floor(l / 6)) }),
    evolutions: [
      { id: 'chain_reaction', requires: ['explosion_core'], name: 'Chain Reaction', desc: 'Explosions trigger explosions.' },
      { id: 'void_impact', requires: ['meteor'], name: 'Void Impact', desc: 'Calls a void meteor with a lingering singularity.' },
    ],
  }),
  W({
    id: 'missile_pod', name: 'Missile Pod', family: 'explosive', color: '#ff7a33', sprite: 'missile',
    slot: 'special', icon: 'missile',
    desc: 'Homing warheads that hunt whatever hates you most.',
    cd: 2.0, dmg: 22, speed: 150, projLife: 2.6, projSize: 5,
    explode: true, explodeRadius: 26, behavior: 'homing', projCount: 2, turnRate: 5,
    curve: (l) => ({ cd: Math.max(1.0, 2.0 - l * 0.06), dmg: 22 + l * 4, projCount: Math.min(4, 2 + Math.floor(l / 4)) }),
    evolutions: [
      { id: 'saturation_barrage', requires: ['hellstorm_core'], name: 'Saturation Barrage', desc: 'Twelve warheads per volley.' },
    ],
  }),

  // ---------------- ELEMENTAL ----------------
  W({
    id: 'lightning', name: 'Chain Lightning', family: 'lightning', color: '#fff066', sprite: 'orbLight',
    slot: 'primary', icon: 'bolt',
    desc: 'Arcs between the damned. Never misses.',
    cd: 1.35, dmg: 15, behavior: 'lightning', jumps: 3,
    curve: (l) => ({ cd: Math.max(0.6, 1.35 - l * 0.04), dmg: 15 + l * 2.5, jumps: Math.min(6, 3 + Math.floor(l/2)) }),
    evolutions: [
      { id: 'thunder_god', requires: ['thunder_core'], name: 'Thunder God', desc: 'A permanent storm follows you.' },
      { id: 'storm_ring', requires: ['orbital_blades'], name: 'Storm Ring', desc: 'Orbitals conduct the storm.' },
    ],
  }),
  W({
    id: 'frost', name: 'Frostbite', family: 'ice', color: '#7ec8ff', sprite: 'orbIce',
    slot: 'primary', icon: 'ice',
    desc: 'Shards that slow, then freeze, then shatter.',
    cd: 1.05, dmg: 10, speed: 250, projLife: 1.4, projSize: 5, pierce: 1,
    behavior: 'frost', slow: 0.45, slowDur: 2.0, projCount: 1,
    curve: (l) => ({ cd: Math.max(0.5, 1.05 - l * 0.03), dmg: 10 + l * 2.0,
      projCount: Math.min(2, 1 + Math.floor(l / 5)), slowDur: 2 + l * 0.15 }),
    evolutions: [
      { id: 'absolute_zero', requires: ['ice_core'], name: 'Absolute Zero', desc: 'Frozen enemies shatter into frost novas.' },
    ],
  }),
  W({
    id: 'flamethrower', name: 'Pyre Thrower', family: 'fire', color: '#ff7a1a', sprite: null,
    slot: 'primary', icon: 'flame',
    desc: 'A continuous cone of burning judgement.',
    cd: 0.28, dmg: 6, range: 78, behavior: 'cone', arc: 0.7, burn: 5,
    curve: (l) => ({ dmg: 6 + l * 1.8, range: 78 + l * 4, arc: 0.7 + l * 0.03, burn: 5 + l }),
    evolutions: [
      { id: 'sun_breath', requires: ['hellstorm_core'], name: 'Sun Breath', desc: 'A 360° corona of solar fire.' },
    ],
  }),
  W({
    id: 'toxic_pool', name: 'Plague Censer', family: 'toxic', color: '#98e066', sprite: 'orbToxic',
    slot: 'special', icon: 'toxic',
    desc: 'Leaves pools of corrosive plague in your wake.',
    cd: 1.6, dmg: 7, projLife: 4.0, projSize: 16, behavior: 'pool', poolRadius: 26,
    curve: (l) => ({ cd: Math.max(0.9, 1.6 - l * 0.05), dmg: 7 + l * 1.5, poolRadius: Math.min(36, 26 + l * 1.5) }),
    evolutions: [
      { id: 'black_bloom', requires: ['void_core'], name: 'Black Bloom', desc: 'Pools spread and seek.' },
    ],
  }),
  W({
    id: 'blood_lance', name: 'Blood Lance', family: 'blood', color: '#ff3a4a', sprite: 'orbBlood',
    slot: 'primary', icon: 'blood',
    desc: 'A piercing spear that drinks what it kills.',
    cd: 1.7, dmg: 26, speed: 330, projLife: 1.1, projSize: 5, pierce: 4,
    behavior: 'projectile', lifesteal: 0.12,
    curve: (l) => ({ cd: Math.max(0.7, 1.7 - l * 0.06), dmg: 26 + l * 6, pierce: 4 + Math.floor(l / 2) }),
    evolutions: [
      { id: 'crimson_choir', requires: ['blood_core'], name: 'Crimson Choir', desc: 'Lances split on every kill.' },
    ],
  }),
  W({
    id: 'shadow', name: 'Shadowbolt', family: 'shadow', color: '#9c8ab8', sprite: 'orbShadow',
    slot: 'primary', icon: 'shadow',
    desc: 'Silent projectiles that haunt through armour.',
    cd: 1.4, dmg: 12, speed: 210, projLife: 1.6, projSize: 5, pierce: 2,
    behavior: 'projectile', projCount: 1, armourPierce: 0.5,
    curve: (l) => ({ cd: Math.max(0.45, 1.4 - l * 0.05), dmg: 12 + l * 3, projCount: 1 + Math.floor(l / 3) }),
    evolutions: [
      { id: 'shadow_army', requires: ['shadow_core'], name: 'Shadow Army', desc: 'Kills raise shadow copies that fight for you.' },
    ],
  }),
  W({
    id: 'meteor', name: 'Meteor Call', family: 'fire', color: '#ff7a33', sprite: null,
    slot: 'special', icon: 'meteor',
    desc: 'Drags a burning rock out of the sky.',
    cd: 4.2, dmg: 65, explode: true, explodeRadius: 72, behavior: 'meteor',
    curve: (l) => ({ cd: Math.max(2.0, 4.2 - l * 0.12), dmg: 65 + l * 16, explodeRadius: 72 + l * 3 }),
    evolutions: [
      { id: 'world_breaker', requires: ['meteor_core'], name: 'World Breaker', desc: 'Continent-cracking impacts with lava craters.' },
    ],
  }),

  // ---------------- EXOTIC ----------------
  W({
    id: 'sawblade', name: 'Ricochet Saw', family: 'tech', color: '#c0c8e0', sprite: 'sawBlade',
    slot: 'special', icon: 'saw',
    desc: 'Bouncing saws that never seem to run out of walls.',
    cd: 2.0, dmg: 18, speed: 190, projLife: 3.4, projSize: 7, pierce: 99,
    behavior: 'bounce', bounces: 5, projCount: 1,
    curve: (l) => ({ cd: Math.max(0.9, 2.0 - l * 0.07), dmg: 18 + l * 4,
      bounces: 5 + l, projCount: 1 + Math.floor(l / 4) }),
    evolutions: [
      { id: 'meat_grinder', requires: ['blood_core'], name: 'Meat Grinder', desc: 'Saws grow with every kill.' },
    ],
  }),
  W({
    id: 'boomerang', name: 'Soul Boomerang', family: 'spirit', color: '#a8d4f4', sprite: 'orbIce',
    slot: 'special', icon: 'boomerang',
    desc: 'Thrown out, comes back angrier.',
    cd: 1.8, dmg: 20, speed: 220, projLife: 2.0, projSize: 6, pierce: 99,
    behavior: 'boomerang', projCount: 1,
    curve: (l) => ({ cd: Math.max(0.7, 1.8 - l * 0.07), dmg: 20 + l * 4.5, projCount: 1 + Math.floor(l / 3) }),
    evolutions: [
      { id: 'karmic_wheel', requires: ['eclipse_core'], name: 'Karmic Wheel', desc: 'Boomerangs orbit before returning.' },
    ],
  }),
  W({
    id: 'drone_swarm', name: 'Wraith Drones', family: 'tech', color: '#8ef0ff', sprite: 'orbPlasma',
    slot: 'orbital', icon: 'drone',
    desc: 'Autonomous spirits that pick their own targets.',
    cd: 0, dmg: 10, behavior: 'drones', droneCount: 2, droneCd: 1.2, droneRange: 130,
    curve: (l) => ({ dmg: 10 + l * 2.6, droneCount: Math.min(6, 2 + Math.floor(l / 2)),
      droneCd: Math.max(0.4, 1.2 - l * 0.06) }),
    evolutions: [
      { id: 'iron_choir', requires: ['thunder_core'], name: 'Iron Choir', desc: 'Six drones firing beams in unison.' },
    ],
  }),
  W({
    id: 'tesla_aura', name: 'Tesla Halo', family: 'lightning', color: '#8ef0ff', sprite: null,
    slot: 'aura', icon: 'aura',
    desc: 'A crackling field that punishes anything near you.',
    cd: 0.7, dmg: 9, radius: 62, behavior: 'aura',
    curve: (l) => ({ cd: Math.max(0.25, 0.7 - l * 0.03), dmg: 9 + l * 2.4, radius: 62 + l * 3 }),
    evolutions: [
      { id: 'god_capacitor', requires: ['thunder_core'], name: 'God Capacitor', desc: 'The field becomes a permanent storm.' },
    ],
  }),
  W({
    id: 'black_hole', name: 'Event Horizon', family: 'void', color: '#bc84f4', sprite: 'orbVoid',
    slot: 'special', icon: 'hole',
    desc: 'Opens a singularity that drags everything to its death.',
    cd: 8.0, dmg: 14, projLife: 3.2, radius: 78, behavior: 'blackhole',
    curve: (l) => ({ cd: Math.max(4.0, 8.0 - l * 0.3), dmg: 14 + l * 5, radius: 78 + l * 4 }),
    evolutions: [
      { id: 'the_null_point', requires: ['void_core'], name: 'The Null Point', desc: 'A permanent singularity orbits you.' },
    ],
  }),
  W({
    id: 'holy_nova', name: 'Requiem Nova', family: 'holy', color: '#ffe878', sprite: null,
    slot: 'aura', icon: 'nova',
    desc: 'Detonates a ring of consecrated light around you.',
    cd: 3.0, dmg: 28, radius: 84, behavior: 'nova', heal: 4,
    curve: (l) => ({ cd: Math.max(1.2, 3.0 - l * 0.12), dmg: 28 + l * 7, radius: 84 + l * 4, heal: 4 + l }),
    evolutions: [
      { id: 'judgement_day', requires: ['eclipse_core'], name: 'Judgement Day', desc: 'Novas leave pillars of light.' },
    ],
  }),
  W({
    id: 'void_step', name: 'Void Step', family: 'void', color: '#9b6dff', sprite: null,
    slot: 'special', icon: 'step',
    desc: 'Blink through space, leaving a detonating afterimage.',
    cd: 4.0, dmg: 30, explode: true, explodeRadius: 34, behavior: 'teleport',
    curve: (l) => ({ cd: Math.max(2.0, 4.0 - l * 0.1), dmg: 30 + l * 8, explodeRadius: 34 + l * 3 }),
    evolutions: [
      { id: 'phantom_shift', requires: ['shadow_core'], name: 'Phantom Shift', desc: 'Leaves attacking clones at both ends.' },
    ],
  }),
  // ---- v1.4: three new mechanics — charge, deployable, echo ----
  W({
    id: 'arcane_lance', name: 'Arcane Lance', family: 'arcane', color: '#e08aff', sprite: 'orbVoid',
    desc: 'Charges up, then fires a heavy piercing bolt.',
    cd: 0.1, dmg: 26, speed: 460, projLife: 1.3, projSize: 7, pierce: 3,
    behavior: 'charge', chargeTime: 1.7,
    curve: (l) => ({ dmg: 26 + l * 9, chargeTime: Math.max(1.0, 1.7 - l * 0.08), pierce: 3 + Math.floor(l / 3) }),
    evolutions: [
      { id: 'star_lance', requires: ['void_core'], name: 'Starlance', desc: 'Charged bolts detonate in star-fire.' },
    ],
  }),
  W({
    id: 'sentry_kit', name: 'Sentry Kit', family: 'turret', color: '#ff9a4a', sprite: 'bomb',
    desc: 'Deploys a gun turret that holds the ground for 12s.',
    cd: 9.0, dmg: 9, behavior: 'turret', turretLife: 12, turretCd: 0.55,
    curve: (l) => ({ dmg: 9 + l * 2.2, turretLife: 12 + l, turretCd: Math.max(0.3, 0.55 - l * 0.025) }),
    evolutions: [
      { id: 'fortress_protocol', requires: ['explosion_core'], name: 'Fortress Protocol', desc: 'Two turrets firing rockets.' },
    ],
  }),
  W({
    id: 'echo_shard', name: 'Echo Shard', family: 'spirit', color: '#a8d4f4', sprite: 'orbIce',
    desc: 'Repeats your last shot a moment later, slightly weaker.',
    cd: 0.9, dmg: 1, behavior: 'echo', echoMult: 0.6, echoDelay: 0.7,
    curve: (l) => ({ echoMult: Math.min(1.0, 0.6 + l * 0.05), echoDelay: Math.max(0.3, 0.7 - l * 0.04) }),
    evolutions: [
      { id: 'chorus', requires: ['ice_core'], name: 'Chorus', desc: 'Every shot echoes twice, at full power.' },
    ],
  }),
];

// ------------------------------------------------------------------
// ABILITIES (Space bar)
// ------------------------------------------------------------------
export const ABILITIES = [
  { id: 'dodge', name: 'Phase Dodge', family: 'survival', color: '#7ec8ff',
    desc: 'Short invulnerable dash with an afterimage trail.', cd: 2.6, dur: 0.28, dist: 120 },
  { id: 'blast', name: 'Hellfire Blast', family: 'fire', color: '#ff7a33',
    desc: 'Knockback shockwave that ignites everything nearby.', cd: 6.0, radius: 96, dmg: 34 },
  { id: 'magnet', name: 'Soul Magnet', family: 'survival', color: '#9b6dff',
    desc: 'Rips all loot on screen toward you.', cd: 13.0, dur: 4.0, radius: 240 },
  { id: 'overclock', name: 'Overclock', family: 'tech', color: '#2ff0ff',
    desc: 'Triple fire rate for 4 seconds.', cd: 18.0, dur: 4.0 },
  { id: 'bulwark', name: 'Bulwark', family: 'survival', color: '#ffe066',
    desc: 'Absorb shield equal to 40% max HP.', cd: 16.0, dur: 6.0 },
];

// ------------------------------------------------------------------
// CORES — combine with a weapon to evolve it
// ------------------------------------------------------------------
export const CORES = [
  { id: 'explosion_core', name: 'Explosion Core', desc: 'Everything you do detonates.', color: '#ff7a33' },
  { id: 'eclipse_core', name: 'Eclipse Core', desc: 'Bends orbits and light.', color: '#985ce0' },
  { id: 'ice_core', name: 'Ice Core', desc: 'Absolute cold.', color: '#7ec8ff' },
  { id: 'shadow_core', name: 'Shadow Core', desc: 'Borrowed darkness.', color: '#6a5a90' },
  { id: 'hellstorm_core', name: 'Hellstorm Core', desc: 'The sky falls on command.', color: '#ff4d26' },
  { id: 'thunder_core', name: 'Thunder Core', desc: 'Stored sky-rage.', color: '#fff066' },
  { id: 'meteor_core', name: 'Meteor Core', desc: 'A fragment of something that fell.', color: '#ff9033' },
  { id: 'void_core', name: 'Void Core', desc: 'A hole that is also a battery.', color: '#bc84f4' },
  { id: 'blood_core', name: 'Blood Core', desc: 'It beats when you kill.', color: '#ff3a4a' },
];

// ---- fold in the extended arsenal (bombers / blasters / beams / summons) ----
// These come from js/data/weapons_extended.js via the bridge, which converts
// their data-only definitions into behaviours the engine can actually fire.
for (const xw of EXTENDED_WEAPONS) {
  if (!WEAPONS.some(w => w.id === xw.id)) WEAPONS.push(xw);
}

export function findWeapon(id) { return WEAPONS.find(w => w.id === id); }
export function findAbility(id) { return ABILITIES.find(w => w.id === id); }
export function findCore(id) { return CORES.find(w => w.id === id); }

export function findEvolution(weaponId, otherId) {
  const w = findWeapon(weaponId);
  if (!w?.evolutions) return null;
  for (const evo of w.evolutions) if (evo.requires.includes(otherId)) return evo;
  return null;
}

// Weapons that can be offered as level-up picks
export const OFFERABLE_WEAPONS = WEAPONS.map(w => w.id);
