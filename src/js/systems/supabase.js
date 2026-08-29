// ============================================================
// HELL TRAIN — Supabase client with RLS-aware submit + leaderboards
// Uses the official @supabase/supabase-js UMD bundle loaded via
// CDN in index.html. Falls back to local-only mode if absent.
// ============================================================

const SUPABASE_URL = (typeof window !== 'undefined' && window.HELLTRAIN_SUPABASE_URL) || '';
const SUPABASE_KEY = (typeof window !== 'undefined' && window.HELLTRAIN_SUPABASE_ANON) || '';

export class SupabaseClient {
  constructor(url = SUPABASE_URL, key = SUPABASE_KEY) {
    this.url = url; this.key = key;
    this.client = null;
    this.connected = false;
    this._init();
  }
  _init() {
    if (!this.url || !this.key) {
      this.connected = false; return;
    }
    if (!window.supabase) { this.connected = false; return; }
    try {
      this.client = window.supabase.createClient(this.url, this.key, {
        auth: { persistSession: false },
        realtime: { params: { eventsPerSecond: 5 } },
      });
      this.connected = true;
    } catch (e) {
      this.connected = false; this.lastError = e?.message;
    }
  }
  isAvailable() { return this.connected; }
  async submitScore({ score, time, stage, realm, kills, character, difficulty, challenge, playerId }) {
    if (!this.connected) return { ok: false, reason: 'offline' };
    if (typeof score !== 'number' || score < 0 || score > 1e12) return { ok: false, reason: 'invalid' };
    if (typeof time !== 'number' || time < 0 || time > 60 * 60 * 24) return { ok: false, reason: 'invalid' };
    if (typeof stage !== 'number' || stage < 1 || stage > 999) return { ok: false, reason: 'invalid' };
    const row = {
      player_id: String(playerId || 'anon').slice(0, 64),
      score: Math.floor(score),
      time_s: Math.floor(time),
      stage: Math.floor(stage),
      realm: String(realm || 'purgatory').slice(0, 32),
      kills: Math.floor(kills || 0),
      character: String(character || 'conductor').slice(0, 32),
      difficulty: String(difficulty || 'normal').slice(0, 16),
      challenge: challenge ? String(challenge).slice(0, 32) : null,
      client_hash: hashPlayer(playerId),
      created_at: new Date().toISOString(),
    };
    try {
      const { error } = await this.client.from('scores').insert(row);
      if (error) return { ok: false, reason: error.message };
      return { ok: true };
    } catch (e) { return { ok: false, reason: e?.message || 'network' }; }
  }
  async topScores(limit = 20, filter = {}) {
    if (!this.connected) return [];
    try {
      let q = this.client.from('scores').select('*').order('score', { ascending: false }).limit(limit);
      if (filter.realm) q = q.eq('realm', filter.realm);
      if (filter.difficulty) q = q.eq('difficulty', filter.difficulty);
      if (filter.challenge) q = q.eq('challenge', filter.challenge);
      const { data, error } = await q;
      if (error) return [];
      return data || [];
    } catch { return []; }
  }
  subscribe(callback) {
    if (!this.connected) return () => {};
    const sub = this.client.channel('scores_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scores' }, payload => {
        callback(payload.new);
      })
      .subscribe();
    return () => { try { this.client.removeChannel(sub); } catch {} };
  }
}

function hashPlayer(id) {
  // Anti-cheat: hash of player id used for double-submit detection
  let h = 5381;
  const s = 'htrain_' + String(id || 'anon');
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
  return h >>> 0;
}
