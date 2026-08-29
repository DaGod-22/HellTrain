// ============================================================
// HELL TRAIN — enemy archetypes
// ============================================================
export const ENEMIES = [
  // chasers
  { id: 'lost_soul', name: 'Lost Soul', hp: 14, dmg: 6, spd: 60, radius: 6, ai: 'chase', xp: 4, sprite: 'ghost',
    behavior: 'floats', desc: 'A wandering spirit.' },
  { id: 'wraithling', name: 'Wraithling', hp: 22, dmg: 9, spd: 80, radius: 6, ai: 'chase', xp: 6, sprite: 'wraith',
    desc: 'A faster, more dangerous wraith.' },
  { id: 'crawler', name: 'Crawler', hp: 18, dmg: 7, spd: 70, radius: 7, ai: 'chase', xp: 5, sprite: 'crawler',
    desc: 'Skitters quickly.' },
  { id: 'shadow_hound', name: 'Shadow Hound', hp: 28, dmg: 12, spd: 120, radius: 7, ai: 'chase', xp: 9, sprite: 'houndShadow',
    desc: 'Fast predator.' },
  // tanks
  { id: 'station_keeper', name: 'Station Keeper', hp: 90, dmg: 14, spd: 38, radius: 10, ai: 'tank', xp: 14, sprite: 'knight',
    desc: 'Armoured guardian.' },
  { id: 'ash_brute', name: 'Ash Brute', hp: 110, dmg: 18, spd: 36, radius: 11, ai: 'tank', xp: 16, sprite: 'brute_ash',
    desc: 'A smouldering giant.' },
  // ranged
  { id: 'station_caster', name: 'Station Caster', hp: 24, dmg: 12, spd: 50, radius: 7, ai: 'ranged', xp: 8, sprite: 'caster',
    desc: 'Hurls bolts from afar.', proj: { id: 'shadow_bolt', dmg: 10, spd: 160, range: 220, cd: 1.6 } },
  { id: 'fire_caster', name: 'Fire Caster', hp: 26, dmg: 14, spd: 50, radius: 7, ai: 'ranged', xp: 9, sprite: 'caster_fire',
    desc: 'Hurls fire.', proj: { id: 'fire_bolt', dmg: 12, spd: 170, range: 220, cd: 1.7 } },
  // swarm
  { id: 'firefly_swarm', name: 'Firefly Swarm', hp: 6, dmg: 4, spd: 75, radius: 5, ai: 'swarm', xp: 2, sprite: 'flyer',
    desc: 'Weak but plentiful.' },
  // summoners
  { id: 'wraith_summoner', name: 'Wraith Summoner', hp: 50, dmg: 8, spd: 44, radius: 8, ai: 'summoner', xp: 18, sprite: 'summoner',
    desc: 'Spawns wraithlings.', summon: { id: 'wraithling', cd: 5, count: 2, max: 6 } },
  // burrower
  { id: 'ash_burrower', name: 'Ash Burrower', hp: 32, dmg: 11, spd: 60, radius: 7, ai: 'burrower', xp: 11, sprite: 'egg',
    desc: 'Emerges from the ground.' },
  // split
  { id: 'slime', name: 'Slime', hp: 40, dmg: 7, spd: 50, radius: 9, ai: 'split', xp: 12, sprite: 'blob',
    desc: 'Splits on death.', splitInto: 'firefly_swarm', splits: 3 },
  // shield
  { id: 'void_sentinel', name: 'Void Sentinel', hp: 70, dmg: 10, spd: 38, radius: 9, ai: 'shield', xp: 18, sprite: 'knight_void',
    desc: 'Block projectiles.' },
  // flyers
  { id: 'shadow_bat', name: 'Shadow Bat', hp: 16, dmg: 6, spd: 90, radius: 6, ai: 'fly', xp: 4, sprite: 'flyer',
    desc: 'Flies over obstacles.' },
  // NEW AAA ENEMIES
  { id: 'marsh_lurker', name: 'Marsh Lurker', hp: 55, dmg: 16, spd: 55, radius: 9, ai: 'tank', xp: 14, sprite: 'blob',
    desc: 'Toxic swamp dweller that leaves poison pools.' },
  { id: 'vine_tangler', name: 'Vine Tangler', hp: 35, dmg: 10, spd: 70, radius: 7, ai: 'chase', xp: 10, sprite: 'crawler',
    desc: 'Roots you in place.' },
  { id: 'foundry_hammer', name: 'Foundry Hammer', hp: 130, dmg: 22, spd: 40, radius: 12, ai: 'tank', xp: 20, sprite: 'brute_ash',
    desc: 'Crushing industrial brute.' },
  { id: 'molten_slinger', name: 'Molten Slinger', hp: 40, dmg: 18, spd: 60, radius: 7, ai: 'ranged', xp: 13, sprite: 'caster_fire',
    desc: 'Hurls molten slag.', proj: { id: 'fire_bolt', dmg: 16, spd: 180, range: 260, cd: 1.5 } },
  { id: 'star_wisp', name: 'Star Wisp', hp: 20, dmg: 12, spd: 110, radius: 5, ai: 'fly', xp: 8, sprite: 'ghost',
    desc: 'Cosmic drifter, phases through walls.' },
  { id: 'void_reaver', name: 'Void Reaver', hp: 80, dmg: 20, spd: 85, radius: 9, ai: 'chase', xp: 18, sprite: 'knight_void',
    desc: 'Tears reality on hit.' },
  { id: 'comet_crawler', name: 'Comet Crawler', hp: 65, dmg: 15, spd: 75, radius: 8, ai: 'burrower', xp: 15, sprite: 'egg',
    desc: 'Burrows through starlight debris.' },
  { id: 'necro_conductor', name: 'Necro Conductor', hp: 90, dmg: 14, spd: 45, radius: 9, ai: 'summoner', xp: 22, sprite: 'summoner',
    desc: 'Summons lost souls endlessly.', summon: { id: 'lost_soul', cd: 3, count: 3, max: 12 } },
];

// Realm-specific roster overrides
export const REALM_ROSTERS = {
  purgatory: ['lost_soul','crawler','wraithling','shadow_hound','station_caster','station_keeper','wraith_summoner','shadow_bat'],
  infernal:  ['ash_brute','fire_caster','slime','ash_burrower','shadow_hound','firefly_swarm','wraith_summoner','station_keeper'],
  forgotten: ['lost_soul','station_caster','station_keeper','shadow_bat','void_sentinel','wraith_summoner','wraithling'],
  forest:    ['crawler','shadow_hound','slime','lost_soul','wraithling','wraith_summoner','firefly_swarm'],
  frozen:    ['slime','station_keeper','wraithling','crawler','void_sentinel','shadow_bat','firefly_swarm'],
  desert:    ['ash_brute','fire_caster','slime','ash_burrower','shadow_hound','wraith_summoner'],
  void:      ['void_sentinel','lost_soul','wraith_summoner','shadow_bat','station_caster','slime','wraithling'],
  terminus:  ['ash_brute','void_sentinel','wraith_summoner','station_keeper','shadow_hound','fire_caster','wraithling','shadow_bat'],
  dreadmarsh: ['marsh_lurker','vine_tangler','slime','crawler','lost_soul','wraith_summoner','shadow_bat','firefly_swarm'],
  foundry: ['foundry_hammer','molten_slinger','ash_brute','fire_caster','ash_burrower','void_sentinel','station_keeper'],
  starlight: ['star_wisp','void_reaver','comet_crawler','void_sentinel','necro_conductor','shadow_bat','wraithling','lost_soul'],
};

// Elite modifiers
export const ELITE_MODS = [
  { id: 'armoured', name: 'Armoured', apply: e => { e.hp *= 2.2; e.radius += 1; e.colorMod = 0.7; } },
  { id: 'fast', name: 'Fast', apply: e => { e.spd *= 1.6; e.dmg *= 0.9; e.colorMod = 1.3; } },
  { id: 'giant', name: 'Giant', apply: e => { e.hp *= 4; e.spd *= 0.85; e.radius *= 1.6; e.scale = 2; e.dmg *= 1.5; e.giant = true; } },
  { id: 'regenerating', name: 'Regenerating', apply: e => { e.regen = Math.max(2, e.hp * 0.04); e.colorMod = 1.6; } },
  { id: 'teleporting', name: 'Teleporting', apply: e => { e.teleportCd = 4; e.teleportRange = 80; e.colorMod = 0.4; } },
  { id: 'summoner', name: 'Summoner', apply: e => { e.ai = 'summoner'; e.summon = { id: 'firefly_swarm', cd: 3.5, count: 2, max: 4 }; e.hp *= 1.4; e.colorMod = 0.2; } },
  { id: 'enraged', name: 'Enraged', apply: e => { e.dmg *= 1.7; e.spd *= 1.15; e.colorMod = -0.15; } },
  { id: 'void_touched', name: 'Void-Touched', apply: e => { e.voidTouched = true; e.hp *= 1.7; e.dmg *= 1.2; e.colorMod = -0.5; } },
];

export function findEnemy(id) { return ENEMIES.find(e => e.id === id); }
