// ============================================================
// HELL TRAIN — THE MONTHLY SEASON
// Boards reset every month. Where you finish decides your reward —
// every tier's contents are printed here, in the open, forever.
// Rewards are earned by play, never random, never bought.
// ============================================================

export const SEASON_TIERS = [
  { max: 1, name: 'AURUM CONDUCTOR', avatar: 'ava_aurum', frame: 'fra_aurum',
    shards: 1500, coins: 3000, blurb: 'THE NUMBER ONE' },
  { max: 2, name: 'ARGENT CONDUCTOR', avatar: 'ava_argent', frame: 'fra_argent',
    shards: 1000, coins: 2000, blurb: 'THE SILVER SHADOW' },
  { max: 3, name: 'EMBER CONDUCTOR', avatar: 'ava_ember', frame: 'fra_ember',
    shards: 800, coins: 1500, blurb: 'THE BRONZE BRAZIER' },
  { max: 5, name: 'TOP 5 CONDUCTOR', avatar: 'ava_top5', frame: null,
    shards: 500, coins: 1000, blurb: 'RANKS 4–5' },
  { max: 10, name: 'TOP 10 CONDUCTOR', avatar: 'ava_top10', frame: null,
    shards: 300, coins: 600, blurb: 'RANKS 6–10' },
  { max: 25, name: 'TOP 25', avatar: null, frame: null,
    shards: 200, coins: 400, blurb: 'RANKS 11–25' },
  { max: 50, name: 'TOP 50', avatar: null, frame: null,
    shards: 100, coins: 200, blurb: 'RANKS 26–50' },
];

export function tierForRank(rank) {
  if (!rank || rank > 50) return null;
  return SEASON_TIERS.find(t => rank <= t.max) || null;
}

export function monthKey(d = new Date()) {
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
}
export function prevMonthKey(d = new Date()) {
  const p = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
  return monthKey(p);
}
export function monthLabel(key) {
  const [y, m] = String(key || '').split('-').map(Number);
  if (!y || !m) return 'UNKNOWN MONTH';
  return ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][m - 1] + ' ' + y;
}

// AVATARS + FRAMES — drawn by ui/kit.js drawAvatar/drawFrame.
export const AVATARS = {
  conductor:  { name: 'The Conductor', color: '#cfd4e0', desc: 'Standard issue soul.' },
  ava_aurum:  { name: 'Aurum Conductor', color: '#ffd24a', desc: 'Season #1. The line remembers you.' },
  ava_argent: { name: 'Argent Conductor', color: '#d8dce8', desc: 'Season #2. Second at the terminus.' },
  ava_ember:  { name: 'Ember Conductor', color: '#ff9033', desc: 'Season #3. Bronze, still burning.' },
  ava_top5:   { name: 'Top 5 Conductor', color: '#8ef0ff', desc: 'A season finished in the five.' },
  ava_top10:  { name: 'Top 10 Conductor', color: '#c07aff', desc: 'A season finished in the ten.' },
};
export const FRAMES = {
  fra_aurum:  { name: 'Aurum Frame', color: '#ffd24a', desc: 'For the one who owned the month.' },
  fra_argent: { name: 'Argent Frame', color: '#d8dce8', desc: 'Silver lining, literal.' },
  fra_ember:  { name: 'Ember Frame', color: '#ff9033', desc: 'Third place, eternal flame.' },
};

// ================================================================
// SEASON PAYOUT — called when the game comes online and last month
// was never settled for this player. Pure data in, rewards out.
// fetchTop: async (period) => [{player_id, name, score}, ...] ranked.
// ================================================================
export async function settleSeason(save, playerId, fetchTop) {
  const prev = prevMonthKey();
  save.seasonRewards = save.seasonRewards || {};
  save.ownedAvatars = save.ownedAvatars || ['conductor'];
  save.ownedFrames = save.ownedFrames || [];
  if (save.seasonRewards[prev]) return null;               // already settled
  let rows = [];
  try { rows = await fetchTop(prev); } catch { return null; }
  if (!rows || !rows.length) return null;                  // nothing recorded yet
  const rank = rows.findIndex(r => r.player_id === playerId) + 1;
  save.seasonRewards[prev] = { rank: rank || null, at: Date.now() };
  if (!rank || rank > 50) {
    save.seasonRewards[prev].reward = 'none';
    return { rank, tier: null, placed: rank || false };
  }
  const tier = tierForRank(rank);
  const reward = {
    tier: tier.name, shards: tier.shards, coins: tier.coins,
    avatar: tier.avatar, frame: tier.frame,
  };
  save.coins = (save.coins || 0) + reward.coins;
  save.shards = (save.shards || 0) + reward.shards;
  if (reward.avatar && !save.ownedAvatars.includes(reward.avatar)) save.ownedAvatars.push(reward.avatar);
  if (reward.frame && !save.ownedFrames.includes(reward.frame)) save.ownedFrames.push(reward.frame);
  save.avatar = save.avatar || reward.avatar;
  save.frame = reward.frame;
  save.seasonRewards[prev].reward = reward;
  return { rank, tier, placed: true, reward };
}
