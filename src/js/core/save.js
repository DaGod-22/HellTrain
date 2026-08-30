// ============================================================
// HELL TRAIN — local save system with per-user support (AAA)
// ============================================================
const KEY = 'helltrain.save.v2';
const OLD_KEY = 'helltrain.save.v1';

function getUserKey() {
  try {
    const cur = localStorage.getItem('helltrain.auth.current');
    if (cur) return KEY + '.' + cur;
  } catch {}
  return KEY;
}

export function loadSave() {
  try {
    const userKey = getUserKey();
    const raw = localStorage.getItem(userKey) || localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
export function saveSave(data) {
  try {
    const userKey = getUserKey();
    localStorage.setItem(userKey, JSON.stringify(data));
    // also keep generic copy for backwards compat
    if (userKey !== KEY) localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
}
export function resetSave() {
  try {
    const userKey = getUserKey();
    localStorage.removeItem(userKey);
    localStorage.removeItem(KEY);
    localStorage.removeItem(OLD_KEY);
  } catch {}
}

export function newSave() {
  return {
    version: 2,
    coins: 500,
    shards: 50,
    achievements: [],
    permaLevels: {},
    ownedCharSkins: ['conductor'],
    ownedTrainSkins: ['iron_horse'],
    charSkin: 'conductor',
    trainSkin: 'iron_horse',
    perma: { player: {}, train: {} },
    stats: { totalKills: 0, totalRuns: 0, bestScore: 0, longestRun: 0, highestStage: 0,
      totalCoins: 0, apocalypses: 0, bestCombo: 0 },
    discovered: [],
    characters: ['conductor'],
    weapons: [],
    armour: ['guardian'],
    relics: [],
    activeRelic: null,
    trainParts: 0,
    bossCores: {},
    unlockedRealms: ['purgatory','infernal'],
    endings: [],
    trainCarriages: ['gunsmith', 'medical'],
    settings: { bloom: 1, lighting: 1, scanlines: 0.35, shake: 1, damageNumbers: 1, sound: 1 },
    dailyStreak: 0,
    lastDailyClaim: 0,
    rewardsClaimed: {},
    chests: { common: 1, rare: 0, epic: 0 },
    playerId: 'HT-' + Math.random().toString(36).slice(2,8).toUpperCase(),
    energy: 100,
    // v1.4: per-family weapon mastery kills + daily goal tracking
    familyKills: {},
    dailyGoals: { date: '', goals: [], p: { kills: 0, coins: 0, elites: 0, boss: 0 }, claimed: [] },
    // v1.6: offline-first records + Forge boons
    localScores: [],
    weeklyBest: {},
    dailyBest: {},
    permaBoons: {},
    // v1.7: season identity + leaderboard
    avatar: 'conductor',
    frame: null,
    ownedAvatars: ['conductor'],
    ownedFrames: [],
    seasonRewards: {},
    myBoards: {},
    claimedAchievements: [],
  };
}

export function ensureShape(save) {
  const s = save || newSave();
  const d = newSave();
  for (const k of Object.keys(d)) {
    if (!(k in s) || s[k] === null || s[k] === undefined) s[k] = d[k];
  }
  for (const k of Object.keys(d.stats)) if (!(k in s.stats)) s.stats[k] = d.stats[k];
  for (const k of Object.keys(d.settings)) if (!(k in s.settings)) s.settings[k] = d.settings[k];
  if (!Array.isArray(s.ownedCharSkins) || !s.ownedCharSkins.length) s.ownedCharSkins = ['conductor'];
  if (!Array.isArray(s.ownedTrainSkins) || !s.ownedTrainSkins.length) s.ownedTrainSkins = ['iron_horse'];
  if (!s.ownedCharSkins.includes(s.charSkin)) s.charSkin = 'conductor';
  if (!s.ownedTrainSkins.includes(s.trainSkin)) s.trainSkin = 'iron_horse';
  s.version = 2;
  if (!s.playerId) s.playerId = 'HT-' + Math.random().toString(36).slice(2,8).toUpperCase();
  if (!s.chests) s.chests = { common: 1, rare: 0, epic: 0 };
  if (!Array.isArray(s.trainCarriages)) s.trainCarriages = ['gunsmith', 'medical'];
  if (!Array.isArray(s.relics)) s.relics = [];
  if (!s.activeRelic) s.activeRelic = null;
  if (!Array.isArray(s.endings)) s.endings = [];
  return s;
}

export function addCoins(save, n) {
  save.coins = Math.max(0, Math.round((save.coins || 0) + n));
  save.stats.totalCoins = (save.stats.totalCoins || 0) + Math.max(0, n);
  return save.coins;
}
export function spendCoins(save, n) {
  if ((save.coins || 0) < n) return false;
  save.coins -= n;
  return true;
}
export function addShards(save, n) {
  save.shards = Math.max(0, (save.shards || 0) + n);
}
export function spendShards(save, n) {
  if ((save.shards || 0) < n) return false;
  save.shards -= n;
  return true;
}
// remember a run on this device (local records board)
export function recordLocalScore(save, entry) {
  save.localScores = save.localScores || [];
  save.localScores.push(entry);
  save.localScores.sort((a, b) => b.score - a.score);
  save.localScores.length = Math.min(save.localScores.length, 10);
}
