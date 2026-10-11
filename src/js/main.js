// ============================================================
// HELL TRAIN — main entry — AAA GOD LEVEL
// ============================================================
import { Engine } from './core/engine.js';
import { Input } from './core/input.js';
import { CFG } from './core/config.js';
import { buildSpriteRegistry } from './data/sprites.js';
import { buildArt } from './data/art.js';
import { loadIcons } from './data/icons.js';
import { loadSave, ensureShape, saveSave } from './core/save.js';
import { SupabaseClient } from './systems/supabase.js';
import { AudioEngine } from './systems/audio.js';
import { AUTH } from './systems/auth.js';
import { CrazyGames } from './systems/crazygames.js';
import { SOUNDS } from './core/sound.js';
import { installGlobalNavigation } from './core/navigation.js';

import { GameplayScene } from './systems/gameplay.js';
import { ShopScene } from './ui/shop.js';
import { CoinShopScene } from './ui/coinshop.js';
import { HomeScene } from './ui/home.js';
import {
  MenuScene, WorldMapScene, TrainBaseScene, RunSummaryScene, PauseScene,
  AchievementsScene, LeaderboardScene, DailyRunScene, WeeklyChallengeScene,
  SettingsScene, ArsenalScene, ArmouryScene, RelicsScene,
  ProfileScene, DailyRewardsScene, IdentityScene, TutorialScene,
} from './ui/menu.js';
import { settleSeason } from './data/season.js';

async function boot() {
  const root = document.getElementById('root');
  const loading = document.getElementById('loading');
  const setStatus = (msg) => {
    // Only ever write to the .subtitle line — the old `|| loading` fallback
    // replaced the whole overlay (title included) with the status string.
    try { const el = loading?.querySelector?.('.subtitle'); if (el) el.textContent = msg; } catch {}
  };
  const setProgress = (pct) => {
    try { const fill = loading?.querySelector?.('.bar-fill'); if (fill) { fill.style.animation = 'none'; fill.style.width = pct + '%'; } } catch {}
  };

  setStatus('FORGING AAA ASSETS...');
  setProgress(10);
  await new Promise(r => setTimeout(r, 16));
  const t0 = performance.now();
  const art = buildArt();
  const legacy = buildSpriteRegistry();
  for (const k of Object.keys(legacy)) if (!(k in art)) art[k] = legacy[k];
  console.log('[HELL TRAIN AAA] art forged in ' + Math.round(performance.now() - t0) + ' ms — GOD LEVEL');
  setStatus('COUPLING INFINITE CARRIAGES...');
  setProgress(70);
  try { await loadIcons(); } catch {}
  setProgress(90);
  setStatus('ALL ABOARD — AAA GOD LEVEL');
  setProgress(100);
  if (loading?.style) loading.style.display = 'none';

  const engine = new Engine(root);
  engine.sprites = art;
  engine.input = new Input(engine.canvas);
  engine.audio = new AudioEngine();
  engine.supabase = new SupabaseClient();
  engine._difficulty = 'normal';
  engine.auth = AUTH;
  installGlobalNavigation(engine);

  // v1.9 — CrazyGames: the platform IS the account. On the CG site we
  // auto sign-in BEFORE the save file is picked: username comes from the
  // CG profile, the password is derived from the CG session (auth.js).
  // Existing local (non-guest) accounts are never hijacked.
  if (CrazyGames.available()) {
    try {
      await CrazyGames.init();
      const cgUser = await CrazyGames.user();
      const cur = AUTH.getCurrentUser();
      if (cgUser && (!cur || cur.guest)) {
        const res = AUTH.crazyLogin(cgUser);
        if (res.ok) setStatus('SIGNED IN — ' + res.user.username.toUpperCase());
      }
    } catch {}
  }
  if (!AUTH.getCurrentUser()) AUTH.guestLogin();

  let save = ensureShape(loadSave());
  if (!save.playerId) {
    save.playerId = 'p_' + Math.random().toString(36).slice(2, 10);
    saveSave(save);
  }
  engine.save = save;

  // Sync both sound engines with the saved settings (SOUNDS.enabled used to
  // stay true even with sound off until the next settings toggle).
  SOUNDS.enabled = save.settings?.sound !== 0;
  engine.audio.enabled = save.settings?.sound !== 0;

  // Scenes — every page speaks the same UI language (ui/kit.js)
  engine.addScene('menu', new HomeScene(engine));
  engine.addScene('hub', new MenuScene(engine));
  engine.addScene('menuClassic', new MenuScene(engine));
  engine.addScene('worldmap', new WorldMapScene(engine));
  engine.addScene('worldMap', new WorldMapScene(engine));
  engine.addScene('gameplay', new GameplayScene(engine));
  engine.addScene('trainbase', new TrainBaseScene(engine));
  engine.addScene('trainBase', new TrainBaseScene(engine));
  engine.addScene('runSummary', new RunSummaryScene(engine));
  engine.addScene('pause', new PauseScene(engine));
  engine.addScene('achievements', new AchievementsScene(engine));
  engine.addScene('leaderboards', new LeaderboardScene(engine));
  engine.addScene('leaderboard', new LeaderboardScene(engine));
  engine.addScene('dailyRun', new DailyRunScene(engine));
  engine.addScene('daily', new DailyRewardsScene(engine));
  engine.addScene('rewards', new DailyRewardsScene(engine));
  engine.addScene('weeklyChallenge', new WeeklyChallengeScene(engine));
  engine.addScene('settings', new SettingsScene(engine));
  engine.addScene('arsenal', new ArsenalScene(engine));
  engine.addScene('armoury', new ArmouryScene(engine));
  engine.addScene('relics', new RelicsScene(engine));
  engine.addScene('shop', new ShopScene(engine));
  engine.addScene('coinShop', new CoinShopScene(engine));
  engine.addScene('profile', new ProfileScene(engine));
  engine.addScene('identity', new IdentityScene(engine));
  engine.addScene('tutorial', new TutorialScene(engine));

  if (typeof globalThis !== 'undefined') globalThis.__ENGINE__ = engine;
  try {
    settleSeason(save, save.playerId, (period) => (engine.supabase && engine.supabase.topMonthly)
      ? engine.supabase.topMonthly(period, 100) : Promise.resolve([]))
      .then((res) => {
        if (res && res.placed) { save._seasonNotice = res; saveSave(save); }
      })
      .catch(() => {});
  } catch {}
  if (!save.tutorialDone) engine.setScene('tutorial', { save });
  else engine.setScene('menu');
  engine.start();

  window.addEventListener('beforeunload', () => saveSave(engine.save));
  setInterval(() => saveSave(engine.save), 10000);

  const resume = () => {
    engine.audio.resume();
    // First user gesture — the AudioContext is allowed to run now, so the
    // menu music (AudioEngine) can finally start. Runs use SOUNDS' THEME.
    const startMenuMusic = () => {
      try {
        if (engine.save?.settings?.sound !== 0 && engine.currentName !== 'gameplay') engine.audio.startMusic('menu');
      } catch {}
    };
    try {
      if (engine.audio.ctx?.state === 'running') startMenuMusic();
      else Promise.resolve(engine.audio.ctx?.resume?.()).then(startMenuMusic).catch(() => {});
    } catch {}
    document.removeEventListener('click', resume);
    document.removeEventListener('keydown', resume);
  };
  document.addEventListener('click', resume);
  document.addEventListener('keydown', resume);
}

boot().catch(err => {
  console.error('Boot error:', err);
  const root = document.getElementById('root');
  root.innerHTML = '<div style="color:#ff5a33;font-family:monospace;padding:24px;max-width:720px">'
    + '<h2>HELL TRAIN AAA failed to load</h2>'
    + '<p style="color:#c8b8d0">Build v' + CFG.VERSION + ' (' + (CFG.BUILD || '') + '). God level.</p>'
    + '<p><button onclick="location.replace(location.pathname + \'?cb=\' + Date.now())"'
    + ' style="font:14px monospace;padding:8px 14px;cursor:pointer">Reload fresh</button></p>'
    + '<pre style="white-space:pre-wrap;color:#8a7a9a">' + (err?.stack || String(err)) + '</pre></div>';
});
