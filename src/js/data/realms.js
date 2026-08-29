// ============================================================
// HELL TRAIN — realms, bosses, difficulty, challenges
// ============================================================
export const REALMS = [
  { id: 'purgatory', name: 'Purgatory', idx: 1, sky: '#1d1326', ground: '#1a1322', accent: '#3d2a4f',
    desc: 'Foggy abandoned railway environment.', music: 'wind_chimes', mechanic: 'Fog reduces visibility.',
    boss: { id: 'boss_conductor', name: 'The Conductor' }, tier: 1 },
  { id: 'infernal', name: 'The Infernal Fields', idx: 2, sky: '#2a0c08', ground: '#1f0a0a', accent: '#a0321a',
    desc: 'Lava and ash.', music: 'low_drums', mechanic: 'Heat pulses damage if you stop moving.',
    boss: { id: 'boss_ashen', name: 'The Ashen Giant' }, tier: 2 },
  { id: 'forgotten', name: 'The Forgotten City', idx: 3, sky: '#0d0d1d', ground: '#11111f', accent: '#5a5a78',
    desc: 'Abandoned supernatural city.', music: 'bells', mechanic: 'The map changes when bells ring.',
    boss: { id: 'boss_bell', name: 'The Bellmaster' }, tier: 3 },
  { id: 'forest', name: 'The Haunted Forest', idx: 4, sky: '#09160e', ground: '#0a1410', accent: '#1f3a1a',
    desc: 'Supernatural forest.', music: 'forest', mechanic: 'Vines trap you in place briefly.',
    boss: { id: 'boss_root', name: 'The Ancient Root' }, tier: 4 },
  { id: 'frozen', name: 'The Frozen Realm', idx: 5, sky: '#0c142a', ground: '#0e1428', accent: '#2a4a70',
    desc: 'Frozen railway.', music: 'ice', mechanic: 'Cold slows you down.',
    boss: { id: 'boss_frost', name: 'The Frost King' }, tier: 5 },
  { id: 'desert', name: 'The Sunken Desert', idx: 6, sky: '#2a1c0a', ground: '#23190a', accent: '#9a6c30',
    desc: 'Ancient ruins buried in sand.', music: 'desert', mechanic: 'Sandstorms reduce visibility.',
    boss: { id: 'boss_sand', name: 'The Sand Titan' }, tier: 6 },
  { id: 'void', name: 'The Void', idx: 7, sky: '#080418', ground: '#0a0420', accent: '#482278',
    desc: 'Reality-breaking cosmic realm.', music: 'void', mechanic: 'Reality shifts every 20 seconds.',
    boss: { id: 'boss_null', name: 'The Null' }, tier: 7 },
  { id: 'terminus', name: 'The Terminus', idx: 8, sky: '#0a0a0a', ground: '#101010', accent: '#c8a030',
    desc: 'Final mysterious realm.', music: 'terminus', mechanic: 'The train itself becomes your opponent.',
    boss: { id: 'boss_train', name: 'The Train' }, tier: 8 },
  // NEW AAA SECTORS
  { id: 'dreadmarsh', name: 'The Dread Marsh', idx: 9, sky: '#0a1a14', ground: '#0e1a14', accent: '#2a6a3a',
    desc: 'Endless toxic swamp with sinking ruins. Vines trap, fog chokes.', music: 'marsh', mechanic: 'Toxic pools drain HP, vines root you.',
    boss: { id: 'boss_marsh', name: 'The Mire Mother' }, tier: 9 },
  { id: 'foundry', name: 'The Obsidian Foundry', idx: 10, sky: '#1a0e0a', ground: '#1a100a', accent: '#ff4a18',
    desc: 'Infinite industrial hellforge. Conveyor belts, molten steel, crushing pistons.', music: 'foundry', mechanic: 'Floor pistons crush, lava rivers shift.',
    boss: { id: 'boss_foundry', name: 'The Forge Titan' }, tier: 10 },
  { id: 'starlight', name: 'Starlight Expanse', idx: 11, sky: '#06081a', ground: '#080a20', accent: '#5a8aff',
    desc: 'Infinite cosmic railway among shattered stars. Zero-gravity debris fields.', music: 'starlight', mechanic: 'Zero-G drifts, meteor storms, reality tears.',
    boss: { id: 'boss_starlight', name: 'The Star Eater' }, tier: 11 },
];

export const HIDDEN_REALM = {
  id: 'phantom', name: 'The Phantom Line', idx: 9, sky: '#1a0820', ground: '#0a0a14', accent: '#985ce0',
  desc: 'A hidden realm not on the map.', music: 'phantom',
  boss: { id: 'boss_phantom', name: 'The Echoing Conductor' }, tier: 9, secret: true,
};

export function findRealm(id) { return REALMS.find(r => r.id === id) || HIDDEN_REALM; }

export const BOSS_DEFS = {
  boss_conductor: { name: 'The Conductor', hp: 2200, sprite: 'bossConductor', radius: 16,
    color: '#9a8aa0', phases: 3 },
  boss_ashen: { name: 'The Ashen Giant', hp: 3600, sprite: 'bossAshen', radius: 22,
    color: '#a04020', phases: 3 },
  boss_bell: { name: 'The Bellmaster', hp: 4200, sprite: 'bossBell', radius: 18,
    color: '#c8a030', phases: 4 },
  boss_root: { name: 'The Ancient Root', hp: 5200, sprite: 'bossRoot', radius: 22,
    color: '#5a9c33', phases: 3 },
  boss_frost: { name: 'The Frost King', hp: 6200, sprite: 'bossFrost', radius: 20,
    color: '#7ec8ff', phases: 4 },
  boss_sand: { name: 'The Sand Titan', hp: 7200, sprite: 'bossSand', radius: 24,
    color: '#d4a04a', phases: 4 },
  boss_null: { name: 'The Null', hp: 9000, sprite: 'bossNull', radius: 20,
    color: '#985ce0', phases: 5 },
  boss_train: { name: 'The Train', hp: 12000, sprite: 'trainEngine', radius: 28,
    color: '#9a8aa0', phases: 5 },
  boss_phantom: { name: 'The Echoing Conductor', hp: 15000, sprite: 'bossConductor', radius: 20,
    color: '#985ce0', phases: 6 },
  // NEW BOSSES
  boss_marsh: { name: 'The Mire Mother', hp: 18000, sprite: 'bossRoot', radius: 26, color: '#3a8a4a', phases: 4 },
  boss_foundry: { name: 'The Forge Titan', hp: 22000, sprite: 'bossAshen', radius: 30, color: '#ff4a18', phases: 5 },
  boss_starlight: { name: 'The Star Eater', hp: 28000, sprite: 'bossNull', radius: 28, color: '#5a8aff', phases: 6 },
};

// =============================================================
// UPGRADES — what you can pick when you level up
// =============================================================
export const UPGRADES = [
  { id: 'atk_dmg', rarity: 'common', name: 'Attack Damage +15%', icon: '⚔', apply: (p) => p.modMult('atkDmg', 1.15) },
  { id: 'atk_spd', rarity: 'common', name: 'Attack Speed +10%', icon: '⌛', apply: (p) => p.modMult('atkSpd', 1.10) },
  { id: 'move_spd', rarity: 'common', name: 'Movement Speed +10%', icon: '⏩', apply: (p) => p.modMult('moveSpd', 1.10) },
  { id: 'max_hp', rarity: 'common', name: 'Max Health +20', icon: '❤', apply: (p) => { p.maxHp += 20; p.hp = Math.min(p.maxHp, p.hp + 20); } },
  { id: 'pickup', rarity: 'common', name: 'Pickup Radius +25%', icon: '⭕', apply: (p) => p.modMult('pickupRange', 1.25) },

  { id: 'crit_chance', rarity: 'uncommon', name: 'Critical Chance +5%', icon: '✦', apply: (p) => { p.crit += 0.05; } },
  { id: 'crit_dmg', rarity: 'uncommon', name: 'Critical Damage +25%', icon: '☠', apply: (p) => p.modMult('critDmg', 1.25) },
  { id: 'armour', rarity: 'uncommon', name: 'Armour +2', icon: '🛡', apply: (p) => { p.armour += 2; } },
  { id: 'regen', rarity: 'uncommon', name: 'Regeneration +1 hp/s', icon: '✚', apply: (p) => { p.regen += 1; } },
  { id: 'cdr', rarity: 'uncommon', name: 'Cooldown Reduction -8%', icon: '⌛', apply: (p) => p.modMult('cdr', 1.08) },

  { id: 'fireball_dmg', rarity: 'rare', name: 'Fireball Damage +20%', icon: '🔥', family: 'fire',
    cond: (p) => p.hasWeapon('fireball'),
    apply: (p) => p.modWeapon('fireball', 'dmg', 1.20) },
  { id: 'fireball_count', rarity: 'rare', name: 'Fireball +1 Projectile', icon: '🔥', family: 'fire',
    cond: (p) => p.hasWeapon('fireball'),
    apply: (p) => p.modWeapon('fireball', 'projCount', +1) },
  { id: 'orbital_count', rarity: 'rare', name: 'Orbital Blade +1', icon: '🌀', family: 'orbital',
    cond: (p) => p.hasWeapon('orbital_blades'),
    apply: (p) => p.modWeapon('orbital_blades', 'baseCount', +1) },
  { id: 'lightning_jumps', rarity: 'rare', name: 'Lightning +1 Jump', icon: '⚡', family: 'lightning',
    cond: (p) => p.hasWeapon('lightning'),
    apply: (p) => p.modWeapon('lightning', 'jumps', +1) },
  { id: 'frost_slow', rarity: 'rare', name: 'Frost Slow +20%', icon: '❄', family: 'ice',
    cond: (p) => p.hasWeapon('frost'),
    apply: (p) => p.modWeapon('frost', 'slow', 0.15) },
  { id: 'void_explosion', rarity: 'rare', name: 'Void Bomb Radius +25%', icon: '✷', family: 'void',
    cond: (p) => p.hasWeapon('void_bomb'),
    apply: (p) => p.modWeapon('void_bomb', 'explodeRadius', 1.25) },
  { id: 'meteor_radius', rarity: 'rare', name: 'Meteor Radius +20%', icon: '☄', family: 'fire',
    cond: (p) => p.hasWeapon('meteor'),
    apply: (p) => p.modWeapon('meteor', 'explodeRadius', 1.20) },

  { id: 'execute', rarity: 'epic', name: 'Execute: x2 dmg under 25% HP', icon: '🩸',
    apply: (p) => { p.execute = true; } },
  { id: 'shield', rarity: 'epic', name: 'Periodic Shield (every 8s)', icon: '🔰',
    apply: (p) => { p.shield = (p.shield || 0) + 30; p.shieldTimer = 0; } },
  { id: 'lifesteal', rarity: 'epic', name: 'Lifesteal +5%', icon: '🧛',
    apply: (p) => { p.lifesteal += 0.05; } },
  { id: 'chain_lightning', rarity: 'epic', name: 'All Hits Chain to 1 Enemy', icon: '⚡',
    apply: (p) => { p.chain = 1; } },
  { id: 'burn', rarity: 'epic', name: 'Burn 8 dmg/s for 3s', icon: '🔥',
    apply: (p) => { p.burnDmg += 8; p.burnDur = 3; } },

  { id: 'forbidden_art', rarity: 'legendary', name: 'Forbidden Art: +40% Damage, -10% HP', icon: '🕯',
    apply: (p) => { p.modMult('atkDmg', 1.40); p.maxHp = Math.floor(p.maxHp * 0.9); } },
  { id: 'soulbound', rarity: 'legendary', name: 'Soulbound: Projectiles Pierce +2', icon: '✦',
    apply: (p) => { p.modMult('pierce', 1); p.pierceBonus = (p.pierceBonus || 0) + 2; } },
  { id: 'phoenix', rarity: 'legendary', name: 'Phoenix: Revive once per run', icon: '🦅',
    apply: (p) => { p.revive = (p.revive || 0) + 1; } },

  { id: 'eclipse', rarity: 'mythic', name: 'Eclipse: Damage scales with missing HP', icon: '🌒',
    apply: (p) => { p.eclipse = true; } },
  { id: 'transcendence', rarity: 'transcendent', name: 'Transcendence: All stats +5%', icon: '✺',
    apply: (p) => { p.modMult('atkDmg', 1.05); p.modMult('atkSpd', 1.05); p.modMult('moveSpd', 1.05);
      p.crit += 0.02; p.maxHp = Math.floor(p.maxHp * 1.05); p.hp = Math.min(p.maxHp, p.hp + 10); } },

  // train-themed
  { id: 'train_heal', rarity: 'rare', name: 'Train Repair Aura', icon: '🚂',
    apply: (p) => { p.trainRepairRate += 1; } },
  { id: 'train_fire', rarity: 'rare', name: 'Train Weapon Damage +20%', icon: '🚂',
    apply: (p) => p.modMult('trainDmg', 1.20) },
];

// =============================================================
// RELICS (run-based modifiers)
// =============================================================
export const RELICS = [
  { id: 'broken_clock', name: 'Broken Clock', desc: 'Attack Speed +25%.',
    apply: (p) => p.modMult('atkSpd', 1.25) },
  { id: 'black_lantern', name: 'Black Lantern', desc: 'Visibility radius +35%.',
    apply: (p) => p.modMult('visibility', 1.35) },
  { id: 'frozen_heart', name: 'Frozen Heart', desc: 'Frozen enemies generate shields.',
    apply: (p) => p.frozenHeart = true },
  { id: 'railway_ticket', name: 'Railway Ticket', desc: '+50% XP near train.',
    apply: (p) => p.trainXpBoost = 1.5 },
  { id: 'lost_crown', name: 'Lost Crown', desc: 'Elites drop 2x loot.',
    apply: (p) => p.eliteLoot = 2 },
  { id: 'eye_of_void', name: 'Eye of the Void', desc: 'Map reveals nearby areas.',
    apply: (p) => p.revealMap = true },
  { id: 'soul_urn', name: 'Soul Urn', desc: 'Heal 1 hp per 5 kills.',
    apply: (p) => p.soulUrn = true },
  { id: 'void_compass', name: 'Void Compass', desc: 'Reveal boss room on map.',
    apply: (p) => p.revealBoss = true },
];

// =============================================================
// ARMOUR SETS (visual+stats)
// =============================================================
export const ARMOURS = [
  { id: 'guardian', name: 'Guardian', desc: '+5 Armour, +20 HP.',
    sprite: 'playerArmour', apply: (p) => { p.armour += 5; p.maxHp += 20; } },
  { id: 'phantom', name: 'Phantom', desc: '+20% Move Speed, +10% Dodge.',
    sprite: 'playerDown', apply: (p) => { p.modMult('moveSpd', 1.20); p.dodge += 0.10; } },
  { id: 'infernal', name: 'Infernal', desc: 'Fire damage +30%.',
    sprite: 'playerDown', apply: (p) => { p.modMult('atkDmg', 1.15); p.modWeapon('fireball', 'dmg', 1.30); } },
  { id: 'void_armour', name: 'Void', desc: 'Critical damage +50%, chance +5%.',
    sprite: 'playerArmour', apply: (p) => { p.crit += 0.05; p.modMult('critDmg', 1.50); } },
  { id: 'conductor', name: 'Conductor', desc: 'Train damage +40%, repair +50%.',
    sprite: 'playerArmour', apply: (p) => { p.modMult('trainDmg', 1.40); p.trainRepairRate += 0.5; } },
];

// =============================================================
// DIFFICULTY
// ================================================================
export const DIFFICULTIES = [
  { id: 'easy', name: 'Easy', enemyHp: 0.7, enemyDmg: 0.7, xpMult: 1.2, lootMult: 1.5, trainHp: 1.3,
    rule: { id: 'second_wind', name: 'SECOND WIND', desc: 'survive a killing blow once per sector' } },
  { id: 'normal', name: 'Normal', enemyHp: 1.0, enemyDmg: 1.0, xpMult: 1.0, lootMult: 1.0, trainHp: 1.0,
    rule: { id: 'none', name: 'THE STANDARD LINE', desc: 'no tricks, no twists — the honest line' } },
  { id: 'hard', name: 'Hard', enemyHp: 1.4, enemyDmg: 1.25, xpMult: 1.0, lootMult: 1.0, trainHp: 0.9,
    rule: { id: 'twin_elites', name: 'TWIN TROUBLE', desc: 'elites always travel in pairs' } },
  { id: 'nightmare', name: 'Nightmare', enemyHp: 1.9, enemyDmg: 1.6, xpMult: 1.0, lootMult: 0.9, trainHp: 0.75,
    rule: { id: 'volatile_ash', name: 'VOLATILE ASH', desc: 'slain foes burst into burning ground' } },
  { id: 'abyss', name: 'Abyss', enemyHp: 2.8, enemyDmg: 2.2, xpMult: 0.95, lootMult: 0.85, trainHp: 0.6,
    rule: { id: 'boss_enrage', name: 'IRON SKY', desc: 'bosses enrage at 30% HP — but their weak windows last twice as long' } },
  { id: 'infinite', name: 'Infinite', enemyHp: 3.5, enemyDmg: 2.8, xpMult: 0.9, lootMult: 0.8, trainHp: 0.5,
    rule: { id: 'all', name: 'THE FULL EXPRESS', desc: 'twin elites + volatile ash + boss enrage, stacked' } },
];

export function hasDifficultyRule(difficulty, flag) {
  const id = difficulty?.rule?.id;
  if (!id) return false;
  if (id === 'all') return flag !== 'second_wind';   // the full express earns no safety nets
  return id === flag;
}

export function findDifficulty(id) { return DIFFICULTIES.find(d => d.id === id) || DIFFICULTIES[1]; }

// =============================================================
// CHALLENGES
// =============================================================
export const WEEKLY_CHALLENGES = [
  { id: 'one_weapon', name: 'One Weapon', desc: 'You may only carry one weapon. +50% XP.' },
  { id: 'no_armour', name: 'No Armour', desc: 'No armour sets. +50% damage.' },
  { id: 'elite_invasion', name: 'Elite Invasion', desc: 'Every 5th enemy is elite. +25% loot.' },
  { id: 'double_xp', name: 'Double XP', desc: 'XP gain x2.' },
  { id: 'chaos_train', name: 'Chaos Train', desc: 'Train has random weapons each stage.' },
  { id: 'one_hp', name: 'Glass Cannon', desc: '1 HP. +200% damage.' },
];

// =============================================================
// ACHIEVEMENTS
// =============================================================
export const ACHIEVEMENTS = [
  { id: 'first_departure', name: 'First Departure', desc: 'Complete the first stage.' },
  { id: 'purgatory_clear', name: 'Purgatory Cleansed', desc: 'Defeat The Conductor.' },
  { id: 'infernal_clear', name: 'Infernal Survivor', desc: 'Defeat The Ashen Giant.' },
  { id: 'forgotten_clear', name: 'City Forgotten', desc: 'Defeat The Bellmaster.' },
  { id: 'forest_clear', name: 'Forest Calm', desc: 'Defeat The Ancient Root.' },
  { id: 'frozen_clear', name: 'Frost Breaker', desc: 'Defeat The Frost King.' },
  { id: 'desert_clear', name: 'Sand Conqueror', desc: 'Defeat The Sand Titan.' },
  { id: 'void_clear', name: 'Void Walker', desc: 'Defeat The Null.' },
  { id: 'terminus', name: 'End of the Line', desc: 'Reach The Terminus.' },
  { id: 'unstoppable', name: 'Unstoppable', desc: 'Defeat 1,000 enemies in one run.' },
  { id: 'train_defender', name: 'Train Defender', desc: 'Survive a major train attack.' },
  { id: 'perfect_run', name: 'Perfect Run', desc: 'Complete a stage without taking damage.' },
  { id: 'build_inferno', name: 'Inferno Build', desc: 'Reach 5 fire weapons/evolutions.' },
  { id: 'build_storm', name: 'Tempest Build', desc: 'Reach 5 lightning weapons/evolutions.' },
  { id: 'build_zero', name: 'Absolute Zero', desc: 'Reach 5 frost weapons/evolutions.' },
  { id: 'build_void', name: 'Void Lord', desc: 'Reach 5 void weapons/evolutions.' },
  { id: 'phoenix', name: 'Phoenix', desc: 'Revive using Phoenix upgrade.' },
  { id: 'no_damage', name: 'No Damage Clear', desc: 'Defeat a boss without taking damage.' },
  { id: 'speedrun', name: 'Express', desc: 'Reach The Terminus in under 25 minutes.' },
  { id: 'secret_discovery', name: 'Hidden', desc: 'Find The Phantom Line.' },
  { id: 'all_realms', name: 'Cartographer', desc: 'Visit all 8 realms.' },
  { id: 'infinite_10', name: 'Infinite I', desc: 'Reach wave 10 in Infinite mode.' },
  { id: 'infinite_50', name: 'Infinite II', desc: 'Reach wave 50 in Infinite mode.' },
  { id: 'one_life', name: 'Deathless', desc: 'Complete a run without dying.' },
  { id: 'completionist', name: 'Completionist', desc: 'Unlock 25 achievements.' },
];

// =============================================================
// TRAIN WEAPONS
// =============================================================
export const TRAIN_WEAPONS = [
  { id: 'fireball_cannon', name: 'Fireball Cannon', family: 'fire', dmg: 14, cd: 1.6, range: 260, sprite: 'orbFire' },
  { id: 'phantom_satellites', name: 'Phantom Satellites', family: 'orbital', dmg: 9, cd: 0.5, range: 80, sprite: 'orbShadow', orbital: true },
  { id: 'carriage_bombs', name: 'Carriage Bombs', family: 'fire', dmg: 28, cd: 3.0, range: 90, sprite: 'orbVoid', trigger: 'onApproach' },
  { id: 'lightning_tower', name: 'Lightning Tower', family: 'lightning', dmg: 22, cd: 1.2, range: 220, sprite: 'orbLight' },
  { id: 'flamethrower', name: 'Flamethrower', family: 'fire', dmg: 4, cd: 0.05, range: 110, sprite: 'orbFire', continuous: true },
  { id: 'gravity_engine', name: 'Gravity Engine', family: 'void', dmg: 0, cd: 0, range: 130, pull: true },
  { id: 'train_ram', name: 'Train Ram', family: 'train', dmg: 30, cd: 0.4, range: 24 },
];

export const TRAIN_ULTIMATES = [
  { id: 'hellfire_express', name: 'Hellfire Express', desc: 'Train becomes engulfed in fire.',
    color: '#ff5a33', dur: 6, dmg: 8 },
  { id: 'void_collapse', name: 'Void Collapse', desc: 'Pulls everyone in.',
    color: '#9b6dff', dur: 5, pull: true, dmg: 4 },
  { id: 'storm_departure', name: 'Storm Departure', desc: 'Massive lightning.',
    color: '#fff066', dur: 5, dmg: 12, lightning: true },
  { id: 'ghost_train', name: 'Ghost Train', desc: 'Summons a spectral duplicate.',
    color: '#888899', dur: 8, copy: true },
  { id: 'terminus_cannon', name: 'Terminus Cannon', desc: 'Charges a devastating beam.',
    color: '#fff066', dur: 3, dmg: 90, beam: true },
];

// =============================================================
// TRAIN CARRIAGES
// =============================================================
export const CARRIAGES = [
  { id: 'engine', name: 'Engine Room', desc: 'Engine upgrades.', icon: '🚂' },
  { id: 'arsenal', name: 'Arsenal', desc: 'Weapons.', icon: '⚔' },
  { id: 'workshop', name: 'Workshop', desc: 'Armour.', icon: '🛠' },
  { id: 'library', name: 'Library', desc: 'Lore.', icon: '📜' },
  { id: 'observatory', name: 'Observatory', desc: 'Realm intel.', icon: '🔭' },
  { id: 'vault', name: 'Vault', desc: 'Rare resources.', icon: '💰' },
  { id: 'medical', name: 'Medical Carriage', desc: 'Healing upgrades.', icon: '✚' },
  { id: 'mystery', name: 'Mystery Carriage', desc: 'Random events.', icon: '❓' },
];

// =============================================================
// EVENTS
// =============================================================
export const EVENTS = [
  { id: 'merchant', name: 'Wandering Merchant',
    desc: 'Spend Eclipse Shards for a boon.', icon: '🛒' },
  { id: 'shrine', name: 'Mysterious Shrine',
    desc: 'Choose one of three stat boosts.', icon: '⛩' },
  { id: 'ghost_passenger', name: 'Ghost Passenger',
    desc: 'A spirit joins your train, granting a permanent buff.', icon: '👻' },
  { id: 'treasure', name: 'Treasure Carriage',
    desc: 'Loot explosion!', icon: '💎' },
  { id: 'mini_boss', name: 'Rival Conductor',
    desc: 'A wandering elite awaits.', icon: '⚔' },
  { id: 'lore', name: 'Lore Station',
    desc: 'Discover fragments of the truth.', icon: '📜' },
];

// =============================================================
// PERMANENT UPGRADE TREE
// =============================================================
export const PERMANENT_TREES = {
  player: {
    combat: [
      { id: 'dmg1', name: 'Combat I', desc: '+10% damage.', cost: 1, maxLvl: 5, apply: (p) => p.permaMult('atkDmg', 1.10) },
      { id: 'spd1', name: 'Haste I', desc: '+8% attack speed.', cost: 1, maxLvl: 5, apply: (p) => p.permaMult('atkSpd', 1.08) },
    ],
    survival: [
      { id: 'hp1', name: 'Vitality I', desc: '+20 HP.', cost: 1, maxLvl: 5, apply: (p) => { p.permaMaxHp += 20; } },
      { id: 'arm1', name: 'Armour I', desc: '+2 armour.', cost: 1, maxLvl: 5, apply: (p) => { p.permaArmour += 2; } },
    ],
    weapons: [
      { id: 'wpn1', name: 'Weapons I', desc: '+15% weapon damage.', cost: 1, maxLvl: 5, apply: (p) => p.permaMult('wpnDmg', 1.15) },
    ],
    void: [
      { id: 'void1', name: 'Void I', desc: '+10% XP gain.', cost: 1, maxLvl: 5, apply: (p) => p.permaMult('xpGain', 1.10) },
    ],
  },
  train: {
    engine: [
      { id: 'eng1', name: 'Engine I', desc: '+20% train speed.', cost: 1, maxLvl: 5, apply: (p) => p.permaMult('trainSpeed', 1.20) },
    ],
    weapons: [
      { id: 'twp1', name: 'Weapon I', desc: '+15% train damage.', cost: 1, maxLvl: 5, apply: (p) => p.permaMult('trainDmg', 1.15) },
    ],
    armour: [
      { id: 'arm2', name: 'Armour I', desc: '+20% train HP.', cost: 1, maxLvl: 5, apply: (p) => p.permaMult('trainHp', 1.20) },
    ],
  },
};

// =============================================================
// LORE FRAGMENTS
// =============================================================
export const LORE = [
  { id: 'ticket_01', name: 'Ticket #1029',
    text: 'Departure: Purgatory. Return: ??? — The Conductor did not return. His watch is still ticking.' },
  { id: 'record_01', name: 'Maintenance Log',
    text: 'Engine 13 went dark at station 0. We replaced the heart with a void coil. The passengers... preferred it.' },
  { id: 'news_01', name: 'Newspaper Fragment',
    text: 'MORNING EDITION, 1889 — "Strange train observed leaving the city at midnight. Engine sounds like thunder."' },
  { id: 'symbol_01', name: 'Symbol of the Terminus',
    text: 'A circle within a circle within a circle. The conductor\'s mark. None return from the third ring.' },
  { id: 'passenger_01', name: 'Passenger Log',
    text: 'They all board the same train. They all alight at different stations. Some never alight at all.' },
  { id: 'message_01', name: 'A Scrap of Note',
    text: 'You are reading this because you remember. The train remembers too. It always has.' },
  { id: 'symbol_02', name: 'Eclipse Mark',
    text: 'When two circles touch, the world between them disappears. The Terminus is the overlap.' },
];

// =============================================================
// SYNERGIES — combined train+player upgrades
// =============================================================
export const SYNERGIES = [
  { id: 'conductors_bond', name: "Conductor's Bond",
    desc: 'Train damage temporarily increases player attack speed.',
    apply: (p) => { p.conductorsBond = true; } },
  { id: 'shared_energy', name: 'Shared Energy',
    desc: 'Player abilities charge train abilities.',
    apply: (p) => { p.sharedEnergy = true; } },
  { id: 'phantom_link', name: 'Phantom Link',
    desc: 'Teleport to the train, creating a shockwave.',
    apply: (p) => { p.phantomLink = true; } },
  { id: 'dual_eclipse', name: 'Dual Eclipse',
    desc: 'Activating player and train ultimates together creates a special event.',
    apply: (p) => { p.dualEclipse = true; } },
  { id: 'trains_fury', name: "Train's Fury",
    desc: 'When train HP is low, player and train gain temporary bonuses.',
    apply: (p) => { p.trainsFury = true; } },
];
