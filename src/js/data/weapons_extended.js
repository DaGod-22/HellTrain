// ============================================================
// HELL TRAIN — Extended Weapon System
// Bombers, Blasters, and Advanced Weapon Varieties
// ============================================================

export const WEAPONS_EXTENDED = {
  // BOMBER WEAPONS - Area damage specialists
  BOMBERS: {
    basicBomber: {
      name: 'Bomb Launcher',
      type: 'projectile',
      damage: 20,
      firerate: 0.7,
      projectileSpeed: 150,
      projectileSize: 10,
      areaSize: 40,
      desc: 'Launches explosive bombs',
      rarity: 'common',
    },
    clusterBomb: {
      name: 'Cluster Bomb',
      type: 'projectile',
      damage: 25,
      firerate: 0.8,
      projectileSpeed: 140,
      projectileSize: 12,
      areaSize: 50,
      splitCount: 5,
      desc: 'Splits into multiple explosions',
      rarity: 'uncommon',
    },
    mineLayer: {
      name: 'Mine Layer',
      type: 'special',
      damage: 30,
      firerate: 1.0,
      mineCount: 8,
      mineRadius: 30,
      desc: 'Places mines that explode on contact',
      rarity: 'uncommon',
    },
    napalm: {
      name: 'Napalm Thrower',
      type: 'aoe',
      damage: 22,
      firerate: 0.9,
      areaSize: 35,
      burnDuration: 4,
      burnDamage: 5,
      desc: 'Burns area for sustained damage',
      rarity: 'rare',
    },
    nuke: {
      name: 'Nuclear Strike',
      type: 'projectile',
      damage: 60,
      firerate: 0.3,
      projectileSpeed: 160,
      areaSize: 80,
      desc: 'Catastrophic nuclear explosion',
      rarity: 'epic',
    },
    detonator: {
      name: 'Detonation Cascade',
      type: 'special',
      damage: 45,
      firerate: 0.5,
      chainReactions: 10,
      areaSize: 60,
      desc: 'Bombs trigger chain reactions',
      rarity: 'legendary',
    },
  },

  // BLASTER WEAPONS - Rapid fire specialists
  BLASTERS: {
    basicBlaster: {
      name: 'Energy Blaster',
      type: 'projectile',
      damage: 6,
      firerate: 2.5,
      projectileSpeed: 280,
      projectileSize: 3,
      desc: 'Rapid energy projectiles',
      rarity: 'common',
    },
    pulseRifle: {
      name: 'Pulse Rifle',
      type: 'projectile',
      damage: 8,
      firerate: 3.0,
      projectileSpeed: 300,
      projectileSize: 4,
      burstShots: 3,
      desc: 'Fires in rapid bursts',
      rarity: 'uncommon',
    },
    gatling: {
      name: 'Gatling Gun',
      type: 'projectile',
      damage: 10,
      firerate: 4.0,
      projectileSpeed: 320,
      projectileSize: 4,
      desc: 'Ultra-rapid fire',
      rarity: 'uncommon',
    },
    beam: {
      name: 'Energy Beam',
      type: 'projectile',
      damage: 15,
      firerate: 1.5,
      projectileSpeed: 400,
      projectileSize: 6,
      piercingShots: 5,
      desc: 'Piercing energy beam',
      rarity: 'rare',
    },
    railgun: {
      name: 'Railgun',
      type: 'projectile',
      damage: 35,
      firerate: 0.4,
      projectileSpeed: 500,
      projectileSize: 8,
      piercingShots: 999,
      desc: 'Pierces all enemies',
      rarity: 'epic',
    },
    superBlaster: {
      name: 'Infinity Blaster',
      type: 'projectile',
      damage: 50,
      firerate: 2.0,
      projectileSpeed: 400,
      projectileSize: 8,
      burstShots: 10,
      piercingShots: 5,
      desc: 'Ultimate rapid fire',
      rarity: 'legendary',
    },
  },

  // MELEE WEAPONS - Close range devastation
  MELEE: {
    sword: {
      name: 'Executioner Blade',
      type: 'melee',
      damage: 25,
      firerate: 1.2,
      range: 30,
      desc: 'Melee sword attacks',
      rarity: 'uncommon',
    },
    scythe: {
      name: 'Death Scythe',
      type: 'melee',
      damage: 30,
      firerate: 1.0,
      range: 40,
      areaSize: 20,
      desc: 'Wide area melee swing',
      rarity: 'rare',
    },
    hammer: {
      name: 'Godly Maul',
      type: 'melee',
      damage: 40,
      firerate: 0.8,
      range: 35,
      knockback: 100,
      areaSize: 30,
      desc: 'Devastating hammer strikes',
      rarity: 'epic',
    },
  },

  // BEAM WEAPONS - Sustained damage
  BEAMS: {
    laserBeam: {
      name: 'Laser Beam',
      type: 'beam',
      damage: 12,
      firerate: 1.0,
      beamDuration: 2,
      beamWidth: 8,
      desc: 'Sustained laser fire',
      rarity: 'uncommon',
    },
    plasmaBeam: {
      name: 'Plasma Beam',
      type: 'beam',
      damage: 18,
      firerate: 0.9,
      beamDuration: 2.5,
      beamWidth: 10,
      burnChance: 0.4,
      desc: 'Burning plasma beam',
      rarity: 'rare',
    },
    voidBeam: {
      name: 'Void Beam',
      type: 'beam',
      damage: 25,
      firerate: 0.7,
      beamDuration: 3,
      beamWidth: 12,
      pullStrength: 80,
      desc: 'Pulling void energy',
      rarity: 'epic',
    },
  },

  // SUMMON WEAPONS - Minion based
  SUMMONS: {
    basicMinion: {
      name: 'Shadow Minion',
      type: 'summon',
      damage: 8,
      firerate: 1.0,
      maxSummons: 3,
      summonDuration: 10,
      summonSpeed: 80,
      desc: 'Summons shadow minions',
      rarity: 'uncommon',
    },
    golem: {
      name: 'Iron Golem',
      type: 'summon',
      damage: 20,
      firerate: 0.8,
      maxSummons: 2,
      summonDuration: 15,
      summonSpeed: 60,
      minionHP: 50,
      desc: 'Summons durable golems',
      rarity: 'rare',
    },
    dragonling: {
      name: 'Dragon Knight',
      type: 'summon',
      damage: 30,
      firerate: 0.6,
      maxSummons: 1,
      summonDuration: 20,
      summonSpeed: 100,
      minionHP: 80,
      desc: 'Summons powerful dragon',
      rarity: 'epic',
    },
  },

  // SPECIAL WEAPONS - Utility based
  SPECIAL: {
    timeWarp: {
      name: 'Time Warp',
      type: 'special',
      damage: 0,
      firerate: 0.5,
      duration: 3,
      slowAmount: 0.5,
      desc: 'Slows enemies in area',
      rarity: 'rare',
    },
    shockwave: {
      name: 'Shockwave',
      type: 'special',
      damage: 28,
      firerate: 0.7,
      areaSize: 50,
      knockback: 150,
      desc: 'Pushes all enemies away',
      rarity: 'rare',
    },
    blackhole: {
      name: 'Black Hole',
      type: 'special',
      damage: 35,
      firerate: 0.4,
      areaSize: 80,
      pullStrength: 200,
      duration: 4,
      desc: 'Pulls and damages enemies',
      rarity: 'legendary',
    },
  },

  // HYBRID WEAPONS - Combination types
  HYBRID: {
    blasterBomb: {
      name: 'Blaster-Bomb Hybrid',
      type: 'projectile',
      damage: 18,
      firerate: 1.5,
      projectileSpeed: 250,
      areaSize: 35,
      burstShots: 3,
      desc: 'Blaster shots that explode',
      rarity: 'rare',
    },
    chargeShot: {
      name: 'Charge Cannon',
      type: 'projectile',
      damage: 40,
      firerate: 0.5,
      projectileSpeed: 200,
      areaSize: 60,
      chargeTime: 2,
      desc: 'Charge for massive damage',
      rarity: 'epic',
    },
    omnistrike: {
      name: 'Omnistrike',
      type: 'projectile',
      damage: 50,
      firerate: 1.0,
      projectileSpeed: 250,
      areaSize: 40,
      piercingShots: 5,
      burstShots: 5,
      desc: 'All-purpose devastating weapon',
      rarity: 'legendary',
    },
  },
};

// WEAPON EVOLUTION PATHS
export const WEAPON_EVOLUTION_PATHS = {
  fireballPath: [
    'basicFireball',
    'infernoBurst',
    'fireballStorm',
    'hellstormNova',
    'apocalypseFlame',
  ],
  blasterPath: [
    'basicBlaster',
    'pulseRifle',
    'railgun',
    'infinityBlaster',
  ],
  bomberPath: [
    'basicBomber',
    'clusterBomb',
    'napalm',
    'nuclearStrike',
    'detonationCascade',
  ],
  beamPath: [
    'laserBeam',
    'plasmaBeam',
    'voidBeam',
    'infinityBeam',
  ],
  summonPath: [
    'basicMinion',
    'golem',
    'dragonling',
    'armyOfTheGods',
  ],
};

// Get all weapons by category
export function getWeaponsByCategory() {
  return {
    bombers: WEAPONS_EXTENDED.BOMBERS,
    blasters: WEAPONS_EXTENDED.BLASTERS,
    melee: WEAPONS_EXTENDED.MELEE,
    beams: WEAPONS_EXTENDED.BEAMS,
    summons: WEAPONS_EXTENDED.SUMMONS,
    special: WEAPONS_EXTENDED.SPECIAL,
    hybrid: WEAPONS_EXTENDED.HYBRID,
  };
}

// Get weapon rarity color
export function getWeaponRarityColor(rarity) {
  const colors = {
    common: '#888888',
    uncommon: '#22ff22',
    rare: '#00d4ff',
    epic: '#ffd700',
    legendary: '#ff5a33',
  };
  return colors[rarity] || '#ffffff';
}

// Check if weapon can evolve
export function canEvolveWeapon(currentWeapon, allWeapons) {
  for (const path of Object.values(WEAPON_EVOLUTION_PATHS)) {
    const idx = path.indexOf(currentWeapon);
    if (idx !== -1 && idx < path.length - 1) {
      const nextWeapon = path[idx + 1];
      return allWeapons.includes(nextWeapon);
    }
  }
  return false;
}

// Get next evolution
export function getNextEvolution(currentWeapon) {
  for (const path of Object.values(WEAPON_EVOLUTION_PATHS)) {
    const idx = path.indexOf(currentWeapon);
    if (idx !== -1 && idx < path.length - 1) {
      return path[idx + 1];
    }
  }
  return null;
}
