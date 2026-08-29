// ============================================================
// HELL TRAIN — TIERED UPGRADE-CARD BRIDGE
// `js/data/upgradecards.js` holds 27 tier-based cards plus synergy
// definitions, but stores them as inert data (type + value) with no
// way to touch the player. This module turns each one into a real
// Ascension the level-up screen can offer and the engine can apply,
// and evaluates the synergy bonuses when their partner cards are held.
// ============================================================
import { UPGRADE_CARDS, SYNERGY_BONUSES } from './upgradecards.js';

const TIER_RARITY = { 1: 'common', 2: 'uncommon', 3: 'rare', 4: 'epic', 5: 'legendary' };
const TYPE_FAMILY = {
  damage: 'offence', attackSpeed: 'offence', critChance: 'offence',
  maxHP: 'defence', armour: 'defence', dodge: 'defence', special: 'utility',
};
const TYPE_ICON = {
  damage: 'sword', attackSpeed: 'clock', critChance: 'target',
  maxHP: 'heart', armour: 'shield', dodge: 'boot', special: 'gem',
};

// Apply one card's payload to the player.
function applyCard(card, p, ctx) {
  const v = card.value || 0;
  switch (card.type) {
    case 'damage': p.modMult('atkDmg', 1 + v); break;
    case 'attackSpeed': p.modMult('atkSpd', 1 + v); break;
    case 'critChance': p.crit += v; break;
    case 'maxHP': p.maxHp += v; p.hp += v; break;
    case 'armour': p.armour += v < 1 ? Math.max(1, Math.round(v * 20)) : v; break;
    case 'dodge': p.dodge = Math.min(0.6, (p.dodge || 0) + v); break;
    default: break;
  }
  // Optional extra payloads any card may carry.
  if (card.critDamage) p.modMult('critDmg', 1 + card.critDamage);
  if (card.cooldownReduction) p.modMult('cdr', 1 + card.cooldownReduction);
  if (card.piercingShots) p.pierceBonus += card.piercingShots;
  if (card.aoeRadius) p.aoeMult = (p.aoeMult || 1) * (1 + card.aoeRadius);
  if (card.pullStrength) p.modMult('pickupRange', 1 + card.pullStrength / 300);
  if (card.allStatsBuff) {
    const a = card.allStatsBuff;
    p.modMult('atkDmg', 1 + a); p.modMult('atkSpd', 1 + a);
    p.modMult('moveSpd', 1 + a * 0.5); p.maxHp += Math.round(p.maxHp * a); p.hp = p.maxHp;
  }
  if (card.invulnDuration) {
    p.autoInvuln = { dur: card.invulnDuration, cd: card.invulnCooldown || 10, t: card.invulnCooldown || 10 };
  }
  if (card.autoDodgeInterval) {
    p.autoDodge = { every: card.autoDodgeInterval, t: card.autoDodgeInterval };
  }
  if (card.screenWipe) {
    p.screenWipe = (p.screenWipe || 0) + 1;
    ctx?.fx?.banner(p.x, p.y - 40, 'ANNIHILATION ARMED', '#ff2a2a');
  }
  if (card.explosionChains) p.chain = (p.chain || 0) + card.explosionChains;
  if (card.executeThreshold) p.headsman = Math.max(p.headsman || 0, card.executeThreshold);
}

function convert(card) {
  const rarity = card.rarity || TIER_RARITY[card.tier] || 'common';
  const a = {
    id: 'uc_' + card.id,
    name: card.name,
    icon: TYPE_ICON[card.type] || 'gem',
    rarity,
    family: TYPE_FAMILY[card.type] || 'utility',
    max: 1,
    tier: card.tier || 1,
    tagline: card.icon && card.icon.length <= 2 ? undefined : undefined,
    desc: () => card.desc,
    tiered: true,
    synergies: card.synergies || [],
    apply: (p, lvl, ctx) => applyCard(card, p, ctx),
  };
  // Tier gating: higher tiers only show up once you are deep enough.
  const minLevel = [0, 1, 6, 12, 20, 28][card.tier || 1] || 1;
  a.cond = (p) => (p?.level || 1) >= minLevel;
  // Explicit prerequisite chains ("upgrades for upgrades").
  if (card.requires) {
    const reqId = Array.isArray(card.requires) ? card.requires[0] : card.requires;
    a.req = { id: 'uc_' + reqId, lvl: 1 };
  }
  return a;
}

export const TIERED_ASCENSIONS = (() => {
  const out = [];
  for (const group of Object.values(UPGRADE_CARDS || {})) {
    if (!Array.isArray(group)) continue;
    for (const card of group) {
      if (!card?.id || !card?.name) continue;
      try { out.push(convert(card)); } catch { /* skip malformed */ }
    }
  }
  return out;
})();

// ---- synergies ----
// Called after every pick: if a synergy's partner cards are all held,
// its bonus fires once and is announced on screen.
export function checkSynergies(owned, player, ctx, fired = {}) {
  const results = [];
  for (const [key, syn] of Object.entries(SYNERGY_BONUSES || {})) {
    if (fired[key]) continue;
    const have = (syn.cards || []).every(id => owned['uc_' + id]);
    if (!have || !(syn.cards || []).length) continue;
    fired[key] = true;
    const b = syn.bonus || {};
    switch (b.type) {
      case 'damage': player.modMult('atkDmg', 1 + (b.value || 0)); break;
      case 'attackSpeed': player.modMult('atkSpd', 1 + (b.value || 0)); break;
      case 'armour': player.armour += Math.max(1, Math.round((b.value || 0) * 20)); break;
      case 'dodge': player.dodge = Math.min(0.6, player.dodge + (b.value || 0)); break;
      case 'special':
        if (b.explosionChains) player.chain = (player.chain || 0) + b.explosionChains;
        if (b.executeThreshold) player.headsman = Math.max(player.headsman || 0, b.executeThreshold);
        break;
      default: break;
    }
    results.push(syn);
    ctx?.fx?.banner(player.x, player.y - 46, 'SYNERGY — ' + syn.name.toUpperCase(), '#ffe066');
    ctx?.fx?.explosion?.(player.x, player.y, 'explHoly', 1.8, { lightColor: '#ffe066' });
  }
  return results;
}
