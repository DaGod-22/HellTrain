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

import { GameplayScene } from './systems/gameplay.js';
import { ShopScene as OldShopScene } from './ui/shop.js';
import { CoinShopScene as OldCoinShopScene } from './ui/coinshop.js';
import { MainMenuScene } from './ui/mainmenu.js';
import { HomeScene } from './ui/home.js';
import {
  MenuScene, WorldMapScene, TrainBaseScene, RunSummaryScene, PauseScene,
  AchievementsScene, LeaderboardScene, DailyRunScene, WeeklyChallengeScene,
  SettingsScene, ArsenalScene, ArmouryScene, RelicsScene,
  ProfileScene, DailyRewardsScene, ShopScene, CoinShopScene,
} from './ui/menu.js';

async function boot() {
  const root = document.getElementById('root');
  const loading = document.getElementById('loading');
  const setStatus = (msg) => {
    try { const el = loading?.querySelector?.('.subtitle') || loading; if (el) el.textContent = msg; } catch {}
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

  // Ensure guest or current user
  if (!AUTH.getCurrentUser()) {
    AUTH.guestLogin();
  }

  let save = ensureShape(loadSave());
  if (!save.playerId) {
    save.playerId = 'p_' + Math.random().toString(36).slice(2, 10);
    saveSave(save);
  }
  engine.save = save;

  // Scenes — AAA GOD LEVEL
  engine.addScene('menu', new HomeScene(engine)); // homescreen with profile icon top-right
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
  engine.addScene('shopOld', new OldShopScene(engine));
  engine.addScene('coinshop', new CoinShopScene(engine));
  engine.addScene('coinShop', new CoinShopScene(engine));
  engine.addScene('coinShopOld', new OldCoinShopScene(engine));
  engine.addScene('characterSelect', new MainMenuScene(engine));
  engine.addScene('profile', new ProfileScene(engine));

  if (typeof globalThis !== 'undefined') globalThis.__ENGINE__ = engine;
  engine.setScene('menu');
  engine.start();

  window.addEventListener('beforeunload', () => saveSave(engine.save));
  setInterval(() => saveSave(engine.save), 10000);

  const resume = () => {
    engine.audio.resume();
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
