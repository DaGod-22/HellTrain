// ============================================================
// CONDUCTOR LEVELS — meta progression (v1.9)
// You do NOT get everything at start. Runs, achievements and
// dailies pay XP; every level pays coins+shards and unlocks
// content: relic slots, daily runs, carriages, engines, weekly
// trials, armour sets, weapons, forge tracks...
// ============================================================
import { saveSave } from '../core/save.js';

// page / feature level gates (scenes read these)
export const PAGE_UNLOCKS = {
  relics: 2,        // equip a relic
  daily: 3,         // Daily Run page plays
  carriages: 3,     // carriage modules become buyable
  engines: 4,       // train engines become buyable
  weekly: 5,         // Weekly Trial page plays
};

// what's coming, in order — shown in the profile + home banner
export const LEVEL_UNLOCKS = [
  { level: 2, label: 'RELIC EQUIP SLOT' },
  { level: 3, label: 'DAILY RUN + CARRIAGE MODULES' },
  { level: 4, label: 'TRAIN ENGINES' },
  { level: 5, label: 'WEEKLY TRIAL' },
  { level: 6, label: 'REVIVE + STARTING LEVEL RANKS' },
  { level: 8, label: 'GILDED FORGE MASTERY' },
];

export function xpToNext(level) {
  const lv = Math.max(1, level | 0);
  return 150 + (lv - 1) * 110 + (lv - 1) * (lv - 1) * 20;
}

export function levelTitle(lv) {
  if (lv >= 15) return 'VOID MARSHAL';
  if (lv >= 12) return 'HELL BARON';
  if (lv >= 9) return 'SENIOR CONDUCTOR';
  if (lv >= 6) return 'VETERAN CONDUCTOR';
  if (lv >= 3) return 'CONDUCTOR';
  return 'ROOKIE CONDUCTOR';
}

// grant XP; on every level-up the player is PAID immediately
// (coins + shards) and save.levelUpNotice is set for the home banner.
export function addPlayerXp(save, amount) {
  const gained = { levels: [], coins: 0, shards: 0, xp: Math.max(0, Math.round(amount || 0)) };
  if (!save || gained.xp <= 0) return gained;
  save.playerLevel = Math.max(1, save.playerLevel || 1);
  save.playerXp = (save.playerXp || 0) + gained.xp;
  let guard = 0;
  while (save.playerXp >= xpToNext(save.playerLevel) && guard++ < 50) {
    save.playerXp -= xpToNext(save.playerLevel);
    save.playerLevel += 1;
    const coins = 50 + 25 * save.playerLevel;
    const shards = 5 + 2 * save.playerLevel;
    save.coins = (save.coins || 0) + coins;
    save.shards = (save.shards || 0) + shards;
    gained.levels.push(save.playerLevel);
    gained.coins += coins;
    gained.shards += shards;
  }
  if (gained.levels.length) {
    const n = save.levelUpNotice || { levels: [], coins: 0, shards: 0 };
    n.levels = (n.levels || []).concat(gained.levels);
    n.coins = (n.coins || 0) + gained.coins;
    n.shards = (n.shards || 0) + gained.shards;
    save.levelUpNotice = n;
    try { saveSave(save); } catch {}
  }
  return gained;
}

// weapons unlock with the conductor's level (data stays in one table here)
const WEAPON_LEVELS = {
  fireball: 1, orbital_blades: 1, plasma_blaster: 1, scatter_blaster: 1,
  rail_lance: 1, bomber: 1, lightning: 1, frost: 1,
  void_bomb: 2, sawblade: 2, boomerang: 2, tesla_aura: 2,
  flamethrower: 3, toxic_pool: 3, meteor: 3, drone_swarm: 3,
  missile_pod: 4, black_hole: 4, blood_lance: 4, shadow: 4,
  holy_nova: 5, void_step: 5, arcane_lance: 5, sentry_kit: 5, echo_shard: 5,
};

export function weaponReqLevel(w) {
  if (!w) return 1;
  if (w.reqLevel) return w.reqLevel;
  return WEAPON_LEVELS[w.id] || 1;
}

// pool filter used by the in-run arsenal pick
export function unlockedWeapons(save, list) {
  const lv = Math.max(1, (save || {}).playerLevel || 1);
  const src = Array.isArray(list) ? list : [];
  const open = src.filter(w => weaponReqLevel(w) <= lv);
  // never dead-end: if everything is gated, fall back to the full list
  return open.length ? open : src.slice();
}

export function nextUnlock(save) {
  const lv = Math.max(1, (save || {}).playerLevel || 1);
  return LEVEL_UNLOCKS.find(u => u.level > lv) || null;
}
