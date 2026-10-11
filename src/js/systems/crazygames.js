// ============================================================
// CrazyGames SDK wrapper (v1.9)
// The platform IS the account: on CrazyGames the player is
// auto-signed-in — username comes from the platform, and the
// "password" is derived from the platform session id (never
// typed, never stored in plain text). Off-platform this is a
// safe no-op so the game still boots.
// ============================================================

function sdk() {
  try {
    return (typeof window !== 'undefined' && window.CrazyGames && window.CrazyGames.SDK) || null;
  } catch { return null; }
}

export const CrazyGames = {
  available() { return !!sdk(); },

  async init() {
    const s = sdk();
    if (!s) return false;
    try { await (s.init ? s.init() : null); return true; } catch { return false; }
  },

  // → { id, username } | null
  async user() {
    const s = sdk();
    if (!s || !s.user || !s.user.getUser) return null;
    try {
      const u = await s.user.getUser();
      if (!u) return null;
      const id = String(u.id || u.uuid || '').trim();
      if (!id) return null;
      return { id, username: String(u.username || u.name || 'CONDUCTOR').trim() };
    } catch { return null; }
  },

  gameplayStart() { try { const s = sdk(); if (s && s.game && s.game.gameplayStart) s.game.gameplayStart(); } catch {} },
  gameplayStop() { try { const s = sdk(); if (s && s.game && s.game.gameplayStop) s.game.gameplayStop(); } catch {} },
};
