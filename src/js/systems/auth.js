// ============================================================
// HELL TRAIN — AAA AUTH SYSTEM
// Username/password, no email required, guest support
// God-level: secure local hash, profiles, avatars, stats
// ============================================================
const AUTH_KEY = 'helltrain.auth.v1';
const CURRENT_KEY = 'helltrain.auth.current';

function hashPass(s) {
  // simple deterministic hash for game (not crypto secure, but obfuscated)
  let h = 5381;
  const salt = 'ht_salt_2026_aaa';
  const str = salt + String(s);
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
  h = h >>> 0;
  // second round
  let h2 = 0;
  for (let i = 0; i < str.length; i++) h2 = (h2 * 31 + str.charCodeAt(i) + h) >>> 0;
  return (h.toString(36) + '_' + h2.toString(36));
}

function randomGuestName() {
  const adj = ['Iron','Shadow','Void','Ashen','Crimson','Neon','Ghost','Frost','Ember','Storm'];
  const noun = ['Conductor','Rider','Drifter','Wraith','Revenant','Specter','Nomad','Vagabond','Outlaw','Phantom'];
  return adj[Math.floor(Math.random()*adj.length)] + noun[Math.floor(Math.random()*noun.length)] + Math.floor(Math.random()*9000+1000);
}

function loadAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return { users: {} };
    const data = JSON.parse(raw);
    if (!data.users) data.users = {};
    return data;
  } catch { return { users: {} }; }
}
function saveAuth(data) {
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(data)); } catch {}
}
function getCurrentUsername() {
  try { return localStorage.getItem(CURRENT_KEY) || null; } catch { return null; }
}
function setCurrentUsername(name) {
  try { if (name) localStorage.setItem(CURRENT_KEY, name); else localStorage.removeItem(CURRENT_KEY); } catch {}
}

export class AuthSystem {
  constructor() {
    this.data = loadAuth();
    this.current = getCurrentUsername();
  }
  _save() { saveAuth(this.data); }
  listUsers() { return Object.keys(this.data.users); }

  // Register new user
  register(username, password) {
    username = String(username||'').trim().slice(0,20);
    if (!username || username.length < 3) return { ok:false, error:'Username too short (min 3)' };
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return { ok:false, error:'Only letters, numbers, _ allowed' };
    if (this.data.users[username]) return { ok:false, error:'Username taken' };
    if (!password || password.length < 3) return { ok:false, error:'Password too short (min 3)' };
    const hash = hashPass(password);
    const now = Date.now();
    this.data.users[username] = {
      username,
      passHash: hash,
      guest: false,
      created: now,
      lastLogin: now,
      avatar: 'conductor',
      level: 1,
      title: 'New Conductor',
      coins: 0,
      gems: 0,
      streak: 0,
      lastDaily: 0,
    };
    this._save();
    this.current = username;
    setCurrentUsername(username);
    return { ok:true, user: this.data.users[username] };
  }

  login(username, password) {
    username = String(username||'').trim();
    const u = this.data.users[username];
    if (!u) return { ok:false, error:'User not found' };
    if (u.guest) {
      // guest has no password, allow any
      this.current = username;
      setCurrentUsername(username);
      u.lastLogin = Date.now();
      this._save();
      return { ok:true, user: u };
    }
    if (u.passHash !== hashPass(password)) return { ok:false, error:'Wrong password' };
    this.current = username;
    setCurrentUsername(username);
    u.lastLogin = Date.now();
    this._save();
    return { ok:true, user: u };
  }

  guestLogin() {
    // find existing guest or create new
    // if current is guest, return it
    if (this.current && this.data.users[this.current]?.guest) {
      return { ok:true, user: this.data.users[this.current] };
    }
    // create new guest
    let name;
    for (let i=0;i<20;i++) {
      const cand = randomGuestName();
      if (!this.data.users[cand]) { name = cand; break; }
    }
    if (!name) name = 'Guest' + Math.floor(Math.random()*100000);
    const now = Date.now();
    this.data.users[name] = {
      username: name,
      passHash: '',
      guest: true,
      created: now,
      lastLogin: now,
      avatar: 'conductor',
      level: 1,
      title: 'Guest Conductor',
      coins: 0,
      gems: 0,
      streak: 0,
      lastDaily: 0,
    };
    this._save();
    this.current = name;
    setCurrentUsername(name);
    return { ok:true, user: this.data.users[name] };
  }

  logout() {
    this.current = null;
    setCurrentUsername(null);
  }

  getCurrentUser() {
    if (!this.current) return null;
    return this.data.users[this.current] || null;
  }

  isGuest() {
    const u = this.getCurrentUser();
    return u ? !!u.guest : false;
  }

  upgradeGuest(newUsername, newPassword) {
    const cur = this.getCurrentUser();
    if (!cur || !cur.guest) return { ok:false, error:'Not a guest' };
    newUsername = String(newUsername||'').trim().slice(0,20);
    if (!newUsername || newUsername.length < 3) return { ok:false, error:'Username too short' };
    if (this.data.users[newUsername]) return { ok:false, error:'Username taken' };
    if (!newPassword || newPassword.length < 3) return { ok:false, error:'Password too short' };
    // rename
    const oldName = cur.username;
    const newUser = { ...cur, username: newUsername, passHash: hashPass(newPassword), guest: false, title: 'Conductor' };
    delete this.data.users[oldName];
    this.data.users[newUsername] = newUser;
    this.current = newUsername;
    setCurrentUsername(newUsername);
    this._save();
    // also migrate save file if exists
    try {
      const oldKey = 'helltrain.save.v2.' + oldName;
      const newKey = 'helltrain.save.v2.' + newUsername;
      const raw = localStorage.getItem(oldKey) || localStorage.getItem('helltrain.save.v2');
      if (raw) {
        localStorage.setItem(newKey, raw);
        localStorage.removeItem(oldKey);
      }
    } catch {}
    return { ok:true, user: newUser };
  }

  deleteUser(username) {
    if (this.data.users[username]) {
      delete this.data.users[username];
      if (this.current === username) {
        this.current = null;
        setCurrentUsername(null);
      }
      this._save();
      try { localStorage.removeItem('helltrain.save.v2.' + username); } catch {}
      return true;
    }
    return false;
  }

  updateProfile(updates) {
    const u = this.getCurrentUser();
    if (!u) return false;
    Object.assign(u, updates);
    this._save();
    return true;
  }

  // daily streak
  claimDaily() {
    const u = this.getCurrentUser();
    if (!u) return { ok:false, error:'No user' };
    const now = Date.now();
    const last = u.lastDaily || 0;
    const oneDay = 24*60*60*1000;
    const twoDays = 2*oneDay;
    if (now - last < oneDay - 1000) {
      return { ok:false, error:'Already claimed today', next: last + oneDay };
    }
    if (now - last > twoDays) {
      u.streak = 1;
    } else {
      u.streak = (u.streak || 0) + 1;
    }
    u.lastDaily = now;
    this._save();
    // reward scales with streak
    const reward = { coins: 100 + u.streak*25, gems: Math.floor(u.streak/3)+1, chest: u.streak % 7 === 0 };
    return { ok:true, reward, streak: u.streak };
  }

  getLeaderboard() {
    const users = Object.values(this.data.users);
    users.sort((a,b)=> (b.level||0)-(a.level||0) || (b.coins||0)-(a.coins||0));
    return users.slice(0,20);
  }
}

export const AUTH = new AuthSystem();
