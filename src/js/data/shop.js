// ============================================================
// HELL TRAIN — THE HELL FORGE (coin shop)
// Coins drop from everything you kill. Spend them here on
// permanent progression that persists across every run, plus
// fully animated skins for the Conductor and the Train.
// ============================================================
import { CHAR_SKINS, TRAIN_SKINS } from './skins.js';
import { COIN_SHOP } from './progression.js';

const T = (o) => ({ max: 10, curve: 1.55, ...o });

// ---------------- CONDUCTOR TRACKS ----------------
export const PLAYER_TRACKS = [
  T({ id: 'p_hp', name: 'Vitality', icon: 'heart', base: 60, per: 12, unit: 'max HP',
    desc: 'Permanent max health for the Conductor.',
    apply: (p, l) => { p.maxHp += 12 * l; p.hp = p.maxHp; } }),
  T({ id: 'p_dmg', name: 'Fury', icon: 'sword', base: 80, per: 4, unit: '% damage',
    desc: 'Permanent damage on every weapon you carry.',
    apply: (p, l) => p.modMult('atkDmg', 1 + 0.04 * l) }),
  T({ id: 'p_spd', name: 'Alacrity', icon: 'clock', base: 75, per: 3, unit: '% attack speed',
    desc: 'Everything you own fires faster.',
    apply: (p, l) => p.modMult('atkSpd', 1 + 0.03 * l) }),
  T({ id: 'p_move', name: 'Swiftness', icon: 'boot', base: 70, per: 2.5, unit: '% move speed',
    desc: 'Outrun the horde.',
    apply: (p, l) => p.modMult('moveSpd', 1 + 0.025 * l) }),
  T({ id: 'p_crit', name: 'Precision', icon: 'target', base: 110, per: 1.5, unit: '% crit chance', max: 10,
    desc: 'Permanent critical strike chance.',
    apply: (p, l) => { p.crit += 0.015 * l; } }),
  T({ id: 'p_critdmg', name: 'Savagery', icon: 'skull', base: 110, per: 8, unit: '% crit damage',
    desc: 'Crits hit like a locomotive.',
    apply: (p, l) => p.modMult('critDmg', 1 + 0.08 * l) }),
  T({ id: 'p_armour', name: 'Aegis', icon: 'shield', base: 90, per: 1, unit: 'armour',
    desc: 'Flat damage reduction from every source.',
    apply: (p, l) => { p.armour += l; } }),
  T({ id: 'p_regen', name: 'Mending', icon: 'cross', base: 100, per: 0.4, unit: 'HP/s',
    desc: 'Slowly stitch yourself back together.',
    apply: (p, l) => { p.regen += 0.4 * l; } }),
  T({ id: 'p_magnet', name: 'Magnetism', icon: 'magnet', base: 60, per: 10, unit: '% pickup radius',
    desc: 'Loot comes to you.',
    apply: (p, l) => p.modMult('pickupRange', 1 + 0.1 * l) }),
  T({ id: 'p_greed', name: 'Greed', icon: 'coin', base: 130, per: 6, unit: '% coin gain',
    desc: 'Earn more coins from every corpse.',
    apply: (p, l) => { p.coinMult = (p.coinMult || 1) * (1 + 0.06 * l); } }),
  T({ id: 'p_xp', name: 'Insight', icon: 'gem', base: 120, per: 5, unit: '% XP gain',
    desc: 'Level up faster inside a run.',
    apply: (p, l) => p.modMult('xpGain', 1 + 0.05 * l) }),
  T({ id: 'p_cdr', name: 'Overcharge', icon: 'clock', base: 140, per: 2, unit: '% cooldown', max: 8,
    desc: 'Shorter cooldowns on abilities and weapons.',
    apply: (p, l) => p.modMult('cdr', 1 + 0.02 * l) }),
  T({ id: 'p_luck', name: 'Fate', icon: 'star', base: 180, per: 3, unit: '% rare card chance', max: 8,
    desc: 'Better upgrade cards appear on level up.',
    apply: (p, l) => { p.luck = (p.luck || 0) + 0.03 * l; } }),
  T({ id: 'p_revive', name: 'Second Wind', icon: 'wing', base: 900, per: 1, unit: 'revive', max: 3, curve: 2.4,
    desc: 'Start every run with an extra life.',
    apply: (p, l) => { p.revive = (p.revive || 0) + l; } }),
  T({ id: 'p_start_lvl', name: 'Veteran', icon: 'star', base: 400, per: 1, unit: 'starting level', max: 5, curve: 2.0,
    desc: 'Begin each run already levelled up (free upgrade cards).',
    apply: () => {} }),
  T({ id: 'p_reroll', name: 'Foresight', icon: 'dice', base: 250, per: 1, unit: 'card reroll', max: 5, curve: 1.9,
    desc: 'Free rerolls on the upgrade screen each run.',
    apply: () => {} }),
];

// ---------------- TRAIN TRACKS ----------------
export const TRAIN_TRACKS = [
  T({ id: 't_hp', name: 'Boiler Plating', icon: 'train', base: 70, per: 90, unit: 'train HP',
    desc: 'The train survives much longer.',
    apply: (t, l) => { t.maxHp += 90 * l; t.hp = t.maxHp; } }),
  T({ id: 't_armour', name: 'Hell-Iron Hull', icon: 'shield', base: 95, per: 2, unit: 'train armour',
    desc: 'Flat reduction on all train damage.',
    apply: (t, l) => { t.armour += 2 * l; } }),
  T({ id: 't_dmg', name: 'Ordnance', icon: 'sword', base: 100, per: 5, unit: '% train damage',
    desc: 'Every mounted gun hits harder.',
    apply: (t, l) => { t.dmgMul *= 1 + 0.05 * l; } }),
  T({ id: 't_rate', name: 'Autoloaders', icon: 'clock', base: 110, per: 4, unit: '% train fire rate',
    desc: 'The train never stops shooting.',
    apply: (t, l) => { t.fireRate = (t.fireRate || 1) * (1 + 0.04 * l); } }),
  T({ id: 't_energy', name: 'Soul Reactor', icon: 'bolt', base: 120, per: 6, unit: '% ult charge',
    desc: 'Ultimates come online sooner.',
    apply: (t, l) => { t.energyRate = (t.energyRate || 1) * (1 + 0.06 * l); } }),
  T({ id: 't_repair', name: 'Repair Crew', icon: 'cross', base: 130, per: 1.2, unit: 'HP/s repair',
    desc: 'The train patches itself mid-fight.',
    apply: (t, l) => { t.repairRate = (t.repairRate || 0) + 1.2 * l; } }),
  T({ id: 't_slots', name: 'Weapon Racks', icon: 'fan', base: 350, per: 1, unit: 'weapon slot', max: 4, curve: 2.1,
    desc: 'Mount more weapons on the train from the start.',
    apply: (t, l) => { t.extraSlots = (t.extraSlots || 0) + l; } }),
  T({ id: 't_ram', name: 'Siege Ram', icon: 'fist', base: 220, per: 18, unit: 'ram damage', max: 8,
    desc: 'The train grinds enemies to paste on contact.',
    apply: (t, l) => { t.ramDamage = (t.ramDamage || 0) + 18 * l; } }),
  T({ id: 't_aura', name: 'Furnace Aura', icon: 'fire', base: 260, per: 4, unit: 'aura dmg/s', max: 8,
    desc: 'Constant burn field around the locomotive.',
    apply: (t, l) => { t.auraDamage = (t.auraDamage || 0) + 4 * l; } }),
  T({ id: 't_cargo', name: 'Cargo Hold', icon: 'coin', base: 300, per: 5, unit: '% loot', max: 8,
    desc: 'Enemies killed by the train drop extra coins.',
    apply: (t, l) => { t.lootBonus = (t.lootBonus || 0) + 0.05 * l; } }),
];

export const ALL_TRACKS = [...PLAYER_TRACKS, ...TRAIN_TRACKS];
export const findTrack = (id) => ALL_TRACKS.find(t => t.id === id);

export function trackCost(track, level) {
  return Math.round(track.base * Math.pow(track.curve || 1.55, level));
}
export function trackValue(track, level) {
  return +(track.per * level).toFixed(2);
}

// ---------------- SKINS AS SHOP ITEMS ----------------
export function skinItems() {
  return [
    ...CHAR_SKINS.map(s => ({ kind: 'charSkin', ...s })),
    ...TRAIN_SKINS.map(s => ({ kind: 'trainSkin', ...s })),
  ];
}

// ---------------- CLASSIC COIN SHOP (js/ui/coinshop.js) ----------------
// That shop stores ranks in save.coinShopUpgrades against the COIN_SHOP
// tables in data/progression.js. Sum every purchased rank's value so the
// two shops both feed the same run.
export function coinShopValue(save, group, cat, key) {
  const rank = (save.coinShopUpgrades || {})[key] || 0;
  const table = COIN_SHOP?.[group]?.[cat];
  if (!rank || !Array.isArray(table)) return 0;
  let sum = 0;
  for (const row of table) if (row.level <= rank) sum += row.value || 0;
  return sum;
}
export function applyCoinShopToPlayer(player, save) {
  const hp = coinShopValue(save, 'CHARACTER', 'maxHP', 'maxHP');
  if (hp) { player.maxHp += hp; player.hp = player.maxHp; }
  const dmg = coinShopValue(save, 'CHARACTER', 'attackDamage', 'attackDamage');
  if (dmg) player.modMult('atkDmg', 1 + dmg);
  const spd = coinShopValue(save, 'CHARACTER', 'attackSpeed', 'attackSpeed');
  if (spd) player.modMult('atkSpd', 1 + spd);
  const crit = coinShopValue(save, 'CHARACTER', 'critChance', 'critChance');
  if (crit) player.crit += crit;
  const dodge = coinShopValue(save, 'CHARACTER', 'dodge', 'dodge');
  if (dodge) player.dodge = Math.min(0.6, player.dodge + dodge);
  const cdr = coinShopValue(save, 'CHARACTER', 'cooldownReduction', 'cooldownReduction');
  if (cdr) player.modMult('cdr', 1 + cdr);
  return player;
}
export function applyCoinShopToTrain(train, save) {
  const hp = coinShopValue(save, 'TRAIN', 'hp', 'trainHP');
  if (hp) { train.maxHp += hp; train.hp = train.maxHp; }
  const dmg = coinShopValue(save, 'TRAIN', 'damage', 'trainDamage');
  if (dmg) train.dmgMul *= 1 + dmg;
  const rate = coinShopValue(save, 'TRAIN', 'fireRate', 'trainFireRate');
  if (rate) train.fireRate = (train.fireRate || 1) * (1 + rate);
  const arm = coinShopValue(save, 'TRAIN', 'armour', 'trainArmour');
  if (arm) train.armour += arm < 1 ? Math.round(arm * 20) : arm;
  return train;
}

// ---------------- APPLY EVERYTHING TO A NEW RUN ----------------
export function applyPermaToPlayer(player, save) {
  const lv = save.permaLevels || {};
  for (const t of PLAYER_TRACKS) {
    const l = lv[t.id] || 0;
    if (l > 0) t.apply(player, l);
  }
  player.freeRerolls = lv.p_reroll || 0;
  player.startLevelBonus = lv.p_start_lvl || 0;
  applyCoinShopToPlayer(player, save);
  return player;
}
export function applyPermaToTrain(train, save) {
  const lv = save.permaLevels || {};
  for (const t of TRAIN_TRACKS) {
    const l = lv[t.id] || 0;
    if (l > 0) t.apply(train, l);
  }
  applyCoinShopToTrain(train, save);
  return train;
}

export function totalSpent(save) {
  const lv = save.permaLevels || {};
  let sum = 0;
  for (const t of ALL_TRACKS) {
    for (let i = 0; i < (lv[t.id] || 0); i++) sum += trackCost(t, i);
  }
  return sum;
}
