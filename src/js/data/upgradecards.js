// ============================================================
// HELL TRAIN — Advanced Upgrade Card System
// Tier-based cards with synergies and combinations
// ============================================================

export const UPGRADE_CARDS = {
  // Tier 1 - Basic upgrades
  TIER1: [
    {
      id: 'dmg_basic_1',
      name: 'Power Surge',
      type: 'damage',
      value: 0.15,
      rarity: 'common',
      tier: 1,
      desc: '+15% Damage',
      icon: '⚡',
      synergies: ['dmg_basic_2', 'crit_basic_1'],
    },
    {
      id: 'dmg_basic_2',
      name: 'Force Multiplier',
      type: 'damage',
      value: 0.20,
      rarity: 'uncommon',
      tier: 1,
      desc: '+20% Damage',
      icon: '💥',
      synergies: ['dmg_basic_1', 'spd_basic_1'],
    },
    {
      id: 'spd_basic_1',
      name: 'Haste',
      type: 'attackSpeed',
      value: 0.15,
      rarity: 'common',
      tier: 1,
      desc: '+15% Attack Speed',
      icon: '⚔',
      synergies: ['dmg_basic_1', 'crit_basic_1'],
    },
    {
      id: 'spd_basic_2',
      name: 'Lightning Reflexes',
      type: 'attackSpeed',
      value: 0.25,
      rarity: 'uncommon',
      tier: 1,
      desc: '+25% Attack Speed',
      icon: '⚡',
      synergies: ['spd_basic_1', 'dodge_basic_1'],
    },
    {
      id: 'hp_basic_1',
      name: 'Vitality Boost',
      type: 'maxHP',
      value: 30,
      rarity: 'common',
      tier: 1,
      desc: '+30 Max HP',
      icon: '❤',
      synergies: ['dodge_basic_1', 'armour_basic_1'],
    },
    {
      id: 'hp_basic_2',
      name: 'Regeneration',
      type: 'special',
      value: 0.05,
      rarity: 'uncommon',
      tier: 1,
      desc: 'Passive Heal 5% per second',
      icon: '🌿',
      synergies: ['hp_basic_1', 'dodge_basic_1'],
    },
    {
      id: 'crit_basic_1',
      name: 'Precision Strike',
      type: 'critChance',
      value: 0.15,
      rarity: 'common',
      tier: 1,
      desc: '+15% Crit Chance',
      icon: '🎯',
      synergies: ['dmg_basic_1', 'spd_basic_1'],
    },
    {
      id: 'dodge_basic_1',
      name: 'Evasion',
      type: 'dodge',
      value: 0.15,
      rarity: 'common',
      tier: 1,
      desc: '+15% Dodge',
      icon: '🏃',
      synergies: ['spd_basic_2', 'hp_basic_1'],
    },
    {
      id: 'armour_basic_1',
      name: 'Iron Skin',
      type: 'armour',
      value: 0.15,
      rarity: 'common',
      tier: 1,
      desc: '+15% Armour',
      icon: '🛡',
      synergies: ['hp_basic_1', 'dodge_basic_1'],
    },
  ],

  // Tier 2 - Intermediate upgrades
  TIER2: [
    {
      id: 'dmg_inter_1',
      name: 'Crushing Blow',
      type: 'damage',
      value: 0.35,
      rarity: 'rare',
      tier: 2,
      desc: '+35% Damage',
      icon: '💢',
      synergies: ['dmg_basic_2', 'crit_inter_1'],
    },
    {
      id: 'dmg_inter_2',
      name: 'Omnistrike',
      type: 'damage',
      value: 0.50,
      rarity: 'epic',
      tier: 2,
      desc: '+50% Damage to all weapons',
      icon: '🔥',
      synergies: ['dmg_inter_1', 'crit_inter_1'],
    },
    {
      id: 'spd_inter_1',
      name: 'Velocity Rush',
      type: 'attackSpeed',
      value: 0.40,
      rarity: 'rare',
      tier: 2,
      desc: '+40% Attack Speed',
      icon: '💨',
      synergies: ['spd_basic_2', 'dmg_inter_1'],
    },
    {
      id: 'crit_inter_1',
      name: 'Deathblow',
      type: 'critChance',
      value: 0.30,
      rarity: 'rare',
      tier: 2,
      desc: '+30% Crit Chance, +50% Crit Damage',
      icon: '⚔️',
      synergies: ['crit_basic_1', 'dmg_inter_1'],
      critDamage: 0.50,
    },
    {
      id: 'special_leech',
      name: 'Life Drain',
      type: 'special',
      value: 0.20,
      rarity: 'rare',
      tier: 2,
      desc: 'Heal 20% of damage dealt',
      icon: '🧛',
      synergies: ['dmg_inter_1', 'hp_basic_1'],
    },
    {
      id: 'special_bounce',
      name: 'Ricochet Master',
      type: 'special',
      value: 0.8,
      rarity: 'rare',
      tier: 2,
      desc: 'Projectiles bounce 80% more',
      icon: '🔄',
      synergies: ['spd_inter_1', 'crit_inter_1'],
    },
    {
      id: 'special_explosion',
      name: 'Explosive Rounds',
      type: 'special',
      value: 1.5,
      rarity: 'epic',
      tier: 2,
      desc: 'All hits trigger explosions',
      icon: '💣',
      synergies: ['dmg_inter_2', 'special_bounce'],
    },
    {
      id: 'special_chain',
      name: 'Chain Reaction',
      type: 'special',
      value: 0.5,
      rarity: 'epic',
      tier: 2,
      desc: 'Attacks chain to 5 nearby enemies',
      icon: '⛓',
      synergies: ['spd_inter_1', 'special_leech'],
    },
  ],

  // Tier 3 - Advanced upgrades (requires synergy)
  TIER3: [
    {
      id: 'dmg_adv_1',
      name: 'Titan Strength',
      type: 'damage',
      value: 0.70,
      rarity: 'epic',
      tier: 3,
      desc: '+70% Damage',
      icon: '🗿',
      requires: ['dmg_inter_2'],
      synergies: ['crit_adv_1', 'special_inferno'],
    },
    {
      id: 'crit_adv_1',
      name: 'Assassin Mastery',
      type: 'critChance',
      value: 0.50,
      rarity: 'epic',
      tier: 3,
      desc: '+50% Crit Chance, Guaranteed crit every 3rd hit',
      icon: '🗡',
      requires: ['crit_inter_1'],
      synergies: ['dmg_adv_1', 'special_execution'],
      critDamage: 1.0,
    },
    {
      id: 'special_inferno',
      name: 'Inferno Wave',
      type: 'special',
      value: 2.0,
      rarity: 'epic',
      tier: 3,
      desc: 'Explosions ignite large fire waves',
      icon: '🔥',
      requires: ['special_explosion'],
      synergies: ['dmg_adv_1', 'special_chain'],
    },
    {
      id: 'special_execution',
      name: 'Execute',
      type: 'special',
      value: 0.3,
      rarity: 'epic',
      tier: 3,
      desc: 'Crit hits execute enemies below 30% HP',
      icon: '⚡',
      requires: ['crit_inter_1'],
      synergies: ['crit_adv_1', 'special_leech'],
    },
    {
      id: 'special_vortex',
      name: 'Void Vortex',
      type: 'special',
      value: 150,
      rarity: 'legendary',
      tier: 3,
      desc: 'Create vortex pulling enemies',
      icon: '🌀',
      requires: ['special_chain'],
      synergies: ['special_inferno', 'special_execution'],
      pullStrength: 150,
    },
  ],

  // Tier 4 - Legendary upgrades (final evolution)
  TIER4: [
    {
      id: 'legendary_god',
      name: 'Divine Wrath',
      type: 'damage',
      value: 1.5,
      rarity: 'legendary',
      tier: 4,
      desc: '+150% Damage, all attacks become AOE',
      icon: '⚡',
      requires: ['dmg_adv_1', 'crit_adv_1'],
      synergies: ['special_inferno', 'special_execution', 'special_vortex'],
      aoeRadius: 50,
    },
    {
      id: 'legendary_infinity',
      name: 'Infinity Stone',
      type: 'special',
      value: 3.0,
      rarity: 'legendary',
      tier: 4,
      desc: 'All effects tripled, cooldowns reduced 80%',
      icon: '💎',
      requires: ['special_vortex'],
      synergies: ['legendary_god', 'special_inferno'],
      cooldownReduction: 0.80,
    },
    {
      id: 'legendary_transcendence',
      name: 'Transcendence',
      type: 'special',
      value: 5.0,
      rarity: 'legendary',
      tier: 4,
      desc: 'Maximum power: +200% all stats, automatic dodge every 5s',
      icon: '👑',
      requires: ['legendary_god', 'legendary_infinity'],
      synergies: [],
      allStatsBuff: 2.0,
      autoDodgeInterval: 5,
    },
  ],

  // Tier 5 - Mythic/Ultimate upgrades
  TIER5: [
    {
      id: 'mythic_apocalypse',
      name: 'Apocalypse',
      type: 'damage',
      value: 3.0,
      rarity: 'mythic',
      tier: 5,
      desc: '+300% Damage, destroys everything',
      icon: '☠',
      requires: ['legendary_transcendence'],
      synergies: [],
      piercingShots: 999,
      screenWipe: true,
    },
    {
      id: 'mythic_eternal',
      name: 'Eternal Evolution',
      type: 'special',
      value: 10.0,
      rarity: 'mythic',
      tier: 5,
      desc: 'Ultimate: Godlike power, invulnerability phases',
      icon: '✨',
      requires: ['legendary_transcendence'],
      synergies: [],
      invulnDuration: 2,
      invulnCooldown: 8,
    },
  ],
};

export const SYNERGY_BONUSES = {
  // Damage synergies
  dmg_synergy_1: {
    cards: ['dmg_basic_1', 'crit_basic_1'],
    bonus: { type: 'damage', value: 0.15 },
    name: 'Precision Power',
    desc: 'Combining power and precision',
  },
  dmg_synergy_2: {
    cards: ['dmg_inter_2', 'crit_inter_1'],
    bonus: { type: 'damage', value: 0.35 },
    name: 'Overwhelming Force',
    desc: 'Maximum damage synergy',
  },
  
  // Speed synergies
  spd_synergy_1: {
    cards: ['spd_basic_2', 'dmg_basic_2'],
    bonus: { type: 'attackSpeed', value: 0.20 },
    name: 'Blitzing Strike',
    desc: 'Combine speed and strength',
  },
  
  // Special synergies
  special_synergy_1: {
    cards: ['special_explosion', 'special_chain'],
    bonus: { type: 'special', explosionChains: 3 },
    name: 'Chain Explosions',
    desc: 'Explosions chain between enemies',
  },
  special_synergy_2: {
    cards: ['special_inferno', 'special_execution'],
    bonus: { type: 'special', executeThreshold: 0.5 },
    name: 'Infernal Execution',
    desc: 'Execute at 50% HP when burning',
  },
  
  // Survival synergies
  surv_synergy_1: {
    cards: ['hp_basic_1', 'armour_basic_1'],
    bonus: { type: 'armour', value: 0.20 },
    name: 'Fortress',
    desc: 'Combine health and armour',
  },
  surv_synergy_2: {
    cards: ['dodge_basic_1', 'spd_basic_2'],
    bonus: { type: 'dodge', value: 0.25 },
    name: 'Shadow Dance',
    desc: 'Dodge more through speed',
  },
};

// Helper function to get all available upgrades for a level
export function getUpgradesForLevel(currentLevel, currentCards = []) {
  const available = [];
  
  if (currentLevel < 5) available.push(...UPGRADE_CARDS.TIER1);
  if (currentLevel >= 3) available.push(...UPGRADE_CARDS.TIER2);
  if (currentLevel >= 6) available.push(...UPGRADE_CARDS.TIER3);
  if (currentLevel >= 10) available.push(...UPGRADE_CARDS.TIER4);
  if (currentLevel >= 15) available.push(...UPGRADE_CARDS.TIER5);

  // Filter by requirements
  return available.filter(card => {
    if (!card.requires) return true;
    return card.requires.some(req => currentCards.includes(req));
  });
}

// Helper to calculate synergy bonus
export function calculateSynergyBonus(heldCards) {
  let bonus = { damage: 0, attackSpeed: 0, dodge: 0, armour: 0 };
  
  for (const [key, synergy] of Object.entries(SYNERGY_BONUSES)) {
    if (synergy.cards.every(card => heldCards.includes(card))) {
      if (synergy.bonus.type === 'damage') bonus.damage += synergy.bonus.value;
      else if (synergy.bonus.type === 'attackSpeed') bonus.attackSpeed += synergy.bonus.value;
      else if (synergy.bonus.type === 'dodge') bonus.dodge += synergy.bonus.value;
      else if (synergy.bonus.type === 'armour') bonus.armour += synergy.bonus.value;
    }
  }
  
  return bonus;
}

// Get rarity color for UI
export function getRarityColor(rarity) {
  const colors = {
    common: '#888888',
    uncommon: '#22ff22',
    rare: '#00d4ff',
    epic: '#ffd700',
    legendary: '#ff5a33',
    mythic: '#ff00ff',
  };
  return colors[rarity] || '#ffffff';
}

// Get rarity class for CSS
export function getRarityClass(rarity) {
  return `rarity-${rarity}`;
}
