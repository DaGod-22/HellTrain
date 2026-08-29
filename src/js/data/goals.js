// ============================================================
// HELL TRAIN — DAILY GOALS (v1.4)
// Two fixed goals per day, chosen by the date. Progress counts up
// during runs; the coin reward is always visible before claiming.
// No randomness in the reward: the number on the tile is the number
// you get.
// ============================================================

export const GOAL_REWARD = 80;
// the daily payout grows with your streak: 60 + 15 per day, capped at 180
export function goalReward(save) {
  return Math.min(180, 60 + 15 * (save?.dailyStreak || 0));
}

const POOL = [
  { key: 'kills', icon: 'skull', label: 'Defeat {n} foes today', ns: [60, 100, 150] },
  { key: 'coins', icon: 'coin', label: 'Collect {n} coins today', ns: [120, 200, 300] },
  { key: 'elites', icon: 'crown', label: 'Defeat {n} elite foes', ns: [3, 4, 6] },
  { key: 'boss', icon: 'trophy', label: 'Defeat a boss', ns: [1, 1, 1] },
];

function seeded(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Two deterministic goals for a given date key ("2026-08-29").
export function todayGoals(dateKey) {
  const rng = seeded('helltrain-goals-' + dateKey);
  const a = Math.floor(rng() * POOL.length);
  let b = Math.floor(rng() * POOL.length);
  if (b === a) b = (b + 1) % POOL.length;
  const pick = (idx) => {
    const p = POOL[idx];
    const n = p.ns[Math.floor(rng() * p.ns.length)];
    return { key: p.key, icon: p.icon, label: p.label, n };
  };
  return [pick(a), pick(b)];
}

export function goalProgressLabel(have, goal) {
  return Math.round(Math.min(have, goal.n)) + '/' + goal.n + ' — keep riding';
}

// Called by gameplay whenever progress happens.
export function bumpGoal(save, key, n = 1) {
  try {
    const dg = save?.dailyGoals;
    if (dg && dg.p && dg.p[key] !== undefined) dg.p[key] = (dg.p[key] || 0) + n;
  } catch {}
}
