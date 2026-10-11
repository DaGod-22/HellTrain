#!/usr/bin/env node
// ============================================================
// HELL TRAIN — project checks (no browser needed)
//   1. import check  — every module parses as ESM and every
//      relative import resolves; payload stays in sync with src/
//   2. launch check  — the single-file payload unpacks and the
//      loader graph rebuilds exactly like the browser does
//   3. simulated load — the game actually boots on a stubbed DOM,
//      every scene renders, and a scripted run plays (waves, level
//      cards, boss, victory route, defeat) with zero errors.
// Usage: node tools/check.mjs
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const HTML = path.join(ROOT, 'index.html');

let failures = 0;
const fail = (msg) => { failures++; fs.writeSync(2, '  ✗ ' + msg + '\n'); };
const ok = (msg) => { fs.writeSync(1, '  ✓ ' + msg + '\n'); };

// ------------------------------------------------------------
// Collect modules
// ------------------------------------------------------------
function moduleFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...moduleFiles(p));
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}
const files = moduleFiles(SRC);
const rel = (p) => path.relative(SRC, p).split(path.sep).join('/');

// ------------------------------------------------------------
// 1) IMPORT CHECK — parse each module as ESM + resolve the graph
// ------------------------------------------------------------
console.log('\n[1/3] IMPORT CHECK — ' + files.length + ' modules');
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ht-check-'));
  const mapped = {};
  for (const f of files) {
    const target = path.join(tmp, rel(f).replace(/\.js$/, '.mjs'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    let code = fs.readFileSync(f, 'utf8');
    code = code.replace(/(from\s*)(['"])(\.[^'"]+)\2/g,
      (m, head, q, spec) => head + q + spec.replace(/\.js$/, '.mjs') + q);
    fs.writeFileSync(target, code);
    mapped[rel(f)] = target;
  }
  for (const [name, target] of Object.entries(mapped)) {
    try {
      execFileSync(process.execPath, ['--check', target], { stdio: 'pipe' });
    } catch (e) {
      fail(`${name}: syntax — ${String(e.stderr).split('\n').slice(0, 4).join(' | ')}`);
    }
  }
  // graph resolution
  let badEdges = 0;
  for (const f of files) {
    const code = fs.readFileSync(f, 'utf8');
    const re = /(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g;
    let m;
    while ((m = re.exec(code))) {
      const target = path.resolve(path.dirname(f), m[1]);
      if (!fs.existsSync(target)) { fail(`${rel(f)}: unresolved import ${m[1]}`); badEdges++; }
    }
  }
  if (!badEdges) ok('every relative import resolves');
  // payload ↔ src sync
  const html = fs.readFileSync(HTML, 'utf8');
  const pm = html.match(/<script id="hell-train-payload" type="application\/json">\n(.*?)\n<\/script>/s);
  if (!pm) fail('payload missing from index.html');
  else {
    const payload = JSON.parse(pm[1].replace(/<\\\//g, '</'));
    for (const f of payload.order) {
      if (!files.some((x) => rel(x) === f)) fail(`payload module missing in src/: ${f}`);
    }
    for (const f of files) {
      if (!payload.order.includes(rel(f))) fail(`src module missing from payload: ${rel(f)}`);
    }
    for (const f of payload.order) {
      const srcCode = fs.readFileSync(path.join(SRC, f), 'utf8');
      if (payload.sources[f] !== srcCode) fail(`index.html payload is stale for ${f} — run "npm run build"`);
    }
    if (failures === 0) ok(`payload in sync with src/ (${payload.order.length} modules)`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}
if (failures) { fs.writeSync(2, '\nIMPORT CHECK FAILED — fixing before launch sim.\n'); process.exit(1); }

// ------------------------------------------------------------
// 2 + 3) STUB BROWSER — launch + simulated load
// ------------------------------------------------------------
console.log('\n[2/3] LAUNCH CHECK — stub DOM boot');
console.log('\n[3/3] SIMULATED LOAD — boot, scene sweep, scripted run');

// ---- 2D context stub ----
function makeCtx(canvas) {
  const gradient = { addColorStop() {} };
  const px = (w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h });
  const ctx = {
    canvas,
    globalAlpha: 1, globalCompositeOperation: 'source-over',
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter',
    font: '10px monospace', textAlign: 'left', textBaseline: 'alphabetic',
    shadowBlur: 0, shadowColor: 'transparent', shadowOffsetX: 0, shadowOffsetY: 0,
    imageSmoothingEnabled: false,
    setLineDash() {}, getLineDash() { return []; },
    createLinearGradient() { return gradient; },
    createRadialGradient() { return gradient; },
    createConicGradient() { return gradient; },
    createPattern() { return gradient; },
    createImageData(w, h) { return px(w, h); },
    getImageData(x, y, w, h) { return px(w, h); },
    putImageData() {},
    measureText(s) {
      // rough width that scales with the current font size, like a real font
      const px2 = parseFloat(String(ctx.font)) || 10;
      return { width: String(s ?? '').length * px2 * 0.6 };
    },
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, arcTo() {},
    ellipse() {}, rect() {}, roundRect() {}, quadraticCurveTo() {}, bezierCurveTo() {},
    fill() {}, stroke() {}, clip() {}, save() {}, restore() {},
    translate() {}, rotate() {}, scale() {}, setTransform() {}, resetTransform() {},
    transform() {}, fillRect() {}, strokeRect() {}, clearRect() {}, fillText() {}, strokeText() {},
    drawImage() {}, drawFocusIfNeeded() {},
  };
  return new Proxy(ctx, {
    get(t, k) {
      if (k in t) return t[k];
      return () => gradient; // absorb future API additions safely
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

function makeCanvasEl(w = 300, h = 150) {
  const listeners = {};
  const el = {
    width: w, height: h,
    style: {},
    listeners,
    addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    removeEventListener(t, fn) { const a = listeners[t]; if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } },
    dispatch(type, ev) { for (const fn of listeners[type] || []) fn(ev); },
    getBoundingClientRect() { return { left: 0, top: 0, width: el.width, height: el.height }; },
    getContext() { if (!el._ctx) el._ctx = makeCtx(el); return el._ctx; },
    appendChild() {},
  };
  return el;
}

function stubGlobals() {
  const el = (tag) => {
    const e = makeCanvasEl();
    e.tagName = String(tag || 'div').toUpperCase();
    e.innerHTML = '';
    e.querySelector = () => ({ textContent: '', style: {} });
    e.querySelectorAll = () => [];
    return e;
  };
  const storage = new Map();
  const store = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
    clear: () => storage.clear(),
  };
  const document = {
    getElementById: (id) => (id === 'root' || id === 'loading' ? el(id) : null),
    createElement: (tag) => el(tag),
    addEventListener() {}, removeEventListener() {},
    body: el('body'),
  };
  const g = globalThis;
  g.__frameCbs = [];
  g.window = g;
  // Node has no window event target — stand in for it so keyboard/mouse events
  // dispatched by the checks reach the real listeners (Input, scene handlers).
  const winListeners = {};
  g.addEventListener = (t, fn) => { (winListeners[t] = winListeners[t] || []).push(fn); };
  g.removeEventListener = (t, fn) => { const a = winListeners[t]; if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } };
  g.dispatchEvent = (ev) => { for (const fn of winListeners[ev.type] || []) fn(ev); return true; };
  // a full keypress: down + up, exactly as a browser delivers one
  g.__press = (code) => {
    const mk = (type) => ({ type, code, preventDefault() {}, stopPropagation() {} });
    g.dispatchEvent(mk('keydown'));
    g.dispatchEvent(mk('keyup'));
  };
  g.document = document;
  g.localStorage = store;
  try { Object.defineProperty(g, 'navigator', { value: { userAgent: 'helltrain-check' }, configurable: true }); }
  catch { /* navigator already read-only on this runtime */ }
  g.Image = class { set src(v) { setTimeout(() => this.onload && this.onload(), 0); } };
  g.location = { pathname: '/', replace() {} };
  let now = 0;
  g.performance = { now: () => now };
  g.requestAnimationFrame = (cb) => { g.__frameCbs.push(cb); return g.__frameCbs.length; };
  g.cancelAnimationFrame = () => {};
  g.__pump = (frames, stepMs = 16.7) => {
    for (let i = 0; i < frames; i++) {
      now += stepMs;
      const cbs = g.__frameCbs; g.__frameCbs = [];
      for (const cb of cbs) cb(now);
    }
  };
  return g;
}

const tmpBoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ht-boot-'));
// materialize the whole tree so static import resolution works
for (const f of files) {
  const target = path.join(tmpBoot, rel(f).replace(/\.js$/, '.mjs'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  let code = fs.readFileSync(f, 'utf8');
  code = code.replace(/(from\s*)(['"])(\.[^'"]+)\2/g,
    (m, head, q, spec) => head + q + spec.replace(/\.js$/, '.mjs') + q);
  fs.writeFileSync(target, code);
}
const importModule = (relPath) => import(path.join(tmpBoot, relPath.replace(/\.js$/, '.mjs')));

const G = stubGlobals();
G.__consoleErrors = [];
const _ce = console.error;
console.error = (...a) => { G.__consoleErrors.push(a.map(String).join(' ')); };

// v1.9: fake CrazyGames SDK — boot must auto sign-in with the platform
// username (password derived from the CG session id, never typed).
G.CrazyGames = {
  SDK: {
    init: async () => {},
    user: { getUser: async () => ({ id: 'cg-sky-42', username: 'SkyConductor' }) },
    game: { gameplayStart() {}, gameplayStop() {} },
  },
};

try {
  await importModule('js/main.js');
  // wait for async boot (art forge + icon plates) to finish
  for (let i = 0; i < 100 && !globalThis.__ENGINE__; i++) {
    await new Promise((r) => setTimeout(r, 50));
    G.__pump(3);
  }
  G.__pump(10);
  const E = globalThis.__ENGINE__;
  if (!E) fail('engine did not boot — __ENGINE__ missing');
  else {
    ok(`booted — ${Object.keys(E.scenes).length} scenes registered`);

    // ---- every scene must enter + render without errors ----
    const gameplay = E.scenes.gameplay;
    const enterParams = {
      menu: { save: E.save }, menuClassic: { save: E.save },
      worldmap: { save: E.save }, worldMap: { save: E.save },
      trainbase: { save: E.save }, trainBase: { save: E.save },
      runSummary: { save: E.save, realmId: 'purgatory', stage: 2, runStats: { kills: 3, damageDealt: 400, damageTaken: 12, bestCombo: 9 }, time: 100, sectorDuration: 120, victory: true, coins: 55, level: 4, owned: {}, dmgByWeapon: { fireball: 400 }, dmgOther: 0 },
      pause: { save: E.save, ctx: { gameplay } },
      achievements: { save: E.save }, leaderboards: { save: E.save },
      dailyRun: { save: E.save }, daily: { save: E.save }, rewards: { save: E.save },
      weeklyChallenge: { save: E.save }, settings: { save: E.save },
      arsenal: { save: E.save }, armoury: { save: E.save }, relics: { save: E.save },
      shop: { save: E.save }, coinShop: { save: E.save }, profile: { save: E.save },
      gameplay: { save: E.save, realmId: 'purgatory', stage: 1 },
    };
    for (const name of Object.keys(E.scenes)) {
      E._error = null;
      try {
        E.setScene(name, enterParams[name] || { save: E.save });
        G.__pump(12);
        if (E._error) fail(`scene "${name}" errored: ${E._error.message}`);
      } catch (e) { fail(`scene "${name}" threw: ${e.message}`); }
    }
    if (!failures) ok('all scenes enter and render cleanly');

    // ---- scripted run: waves → cards → boss → route fork → sector 2... ----
    E._error = null;
    E.setScene('gameplay', { save: E.save, realmId: 'infernal', stage: 1 });
    G.__pump(10);
    const gp = E.current;
    if (!gp || !gp.enemies) fail('gameplay did not enter');
    else {
      let guarded = 0;
      const stepRun = (frames) => {
        for (let i = 0; i < frames; i++) {
          G.__pump(1);
          const cur = E.current;
          if (cur === gp && gp.cards) { gp._pickCard(0); guarded++; }
          if (cur === gp && gp.routeCards) { gp._pickRoute(0); guarded++; } // route overlay auto-picks
          if (cur === gp && gp.wPick) { gp._pickWeapon(0); guarded++; }     // weapon choice auto-picks
          // keep the bot alive: the fork/transition asserts must not flake on RNG damage
          if (cur === gp && gp.player?.alive) { gp.player.hp = gp.player.maxHp; gp.player.shield = gp.player.shield || 0; }
          if (cur === gp && gp.train && !gp.train.dead) gp.train.hp = gp.train.maxHp;
        }
      };
      stepRun(60 * 8); // 8s of waves
      if (gp.runStats.kills < 1) fail('director spawned nothing after 8s');
      // force boss + kill it, then fast-forward to the sector fork
      gp._spawnBoss();
      stepRun(30);
      if (gp.boss) { gp.boss.hp = 1; gp.dealDamage(gp.boss, 1, {}); } // ultimate is manual in v1.7 — kill deterministically
      stepRun(60 * 6);
      if (E._error) fail('scripted run errored: ' + E._error.message);
      if (!gp.bossDefeated && gp.boss) fail('boss did not die when hp exhausted');
      // multi-sector: force the sector clock to zero, ride the fork to sector 2
      const stageBefore = gp.stage;
      gp.runTime = gp.sectorDuration;
      stepRun(220); // fork opens, auto-picks, transition cinematic plays
      if (gp.stage !== stageBefore + 1) fail('sector clear did not reach the route fork (stage=' + gp.stage + '/' + stageBefore + ')');
      if (gp.sectorTimeLeft <= 0 && E.current === gp) fail('new sector clock did not reset');
      ok(`multi-sector OK — now sector ${gp.stage} (${gp.theme ? gp.theme.name : '?'})`);
      // sector 2 → boss → sector 3 → boss → final summary
      for (let s = gp.stage; s <= gp.maxSectors; s++) {
        gp._spawnBoss();
        stepRun(30);
        if (gp.boss) gp.boss.hp = 1;
        gp.runTime = gp.sectorDuration;
        stepRun(240);
      }
      if (E._error) fail('multi-sector run errored: ' + E._error.message);
      if (E.current === gp) fail(`final sector never resolved to a summary (stage=${gp.stage} cards=${!!gp.cards} route=${!!gp.routeCards} wPick=${!!gp.wPick} pend=${gp.pendingLevelUps} hitStop=${gp.hitStop} trans=${gp.transition} timeL=${Math.round(gp.sectorTimeLeft)} boss=${!!gp.boss} alive=${gp.player.alive} ended=${gp._ended})`);
      else ok(`run resolved after sector ${gp.maxSectors} — ${gp.runStats.kills} kills, ${guarded} overlays`);
      if (!(gp.dmgByWeapon && Object.keys(gp.dmgByWeapon).length)) fail('per-weapon damage was not recorded');
      if (!(E.save.familyKills && Object.keys(E.save.familyKills).length)) fail('weapon mastery kills were not recorded');
      ok(`mastery + damage bookkeeping OK — ${Object.keys(E.save.familyKills || {}).length} families, ${Object.keys(gp.dmgByWeapon || {}).length} damage sources`);

      // ---- v1.7: shard economy + achievements pay real bounties ----
      E._error = null;
      if (!(E.save.achievements || []).includes('first_departure')) fail('first_departure achievement was not granted after the scripted run');
      else if (!(E.save.claimedAchievements || []).includes('first_departure')) fail('achievement bounty was not paid (claimedAchievements missing)');
      else ok('achievements granted AND shard bounty paid at run end');
      E.setScene('gameplay', { save: E.save, realmId: 'purgatory', stage: 1 });
      G.__pump(5);
      const gpSh = E.current;
      const before = gpSh.gameStats.shards || 0;
      gpSh.openChest();
      if (gpSh.gameStats.shards !== before + 8) fail(`chest bounty wrong: ${before} -> ${gpSh.gameStats.shards} (want +8)`);
      gpSh._spawnElite();
      const el = gpSh.enemies.find(e => e.eliteMod);
      if (el) { el.hp = 1; gpSh._onKill(el, {}); }
      G.__pump(3);
      const dropped = gpSh.pickups.filter(u => u.type === 'shard').reduce((a, u) => a + (u.amount || 1), 0);
      if (dropped !== 12) fail(`elite bounty wrong: ${dropped} shard pickups on the ground (want 12)`);
      if (E._error) fail('shard economy errored: ' + E._error.message);
      ok('in-run shard payouts OK — chest +8, elite +12, exact banners');

      // ---- v1.7: leaderboards degrade gracefully offline ----
      E._error = null;
      E.setScene('leaderboards', { save: E.save });
      G.__pump(6);
      if (E._error) fail('leaderboard errored: ' + E._error.message);
      const lb = E.current;
      if (typeof lb.boardState !== 'string') fail('leaderboard has no boardState');
      else if (lb.boardState !== 'ready' && lb.boardState !== 'offline') fail('leaderboard boardState invalid: ' + lb.boardState);
      G.__pump(30); // render frames: season panel toggle path
      if (E._error) fail('leaderboard render errored: ' + E._error.message);
      ok('leaderboard scene OK (' + lb.boardState + ')');

      // ---- v1.7: run summary offers the opt-in POST strip ----
      E._error = null;
      E.setScene('runSummary', { save: E.save, realmId: 'purgatory', stage: 2, victory: false,
        runStats: { kills: 40, coins: 30, bestCombo: 3, damageTaken: 2 }, time: 61, sectorDuration: 60,
        coins: 30, level: 3, owned: {}, score: 4321, difficulty: 'normal', trainHurt: false, damageTaken: 2, cause: 'TEST' });
      G.__pump(6);
      if (E._error) fail('run summary errored: ' + E._error.message);
      const rs = E.current;
      if (typeof rs._doPost !== 'function' || !rs._postRect()) fail('opt-in POST strip missing from run summary');
      else ok('run summary POST strip present (opt-in, never automatic)');

      // ---- v1.7: identity page wears owned looks only ----
      E._error = null;
      E.setScene('identity', { save: E.save });
      G.__pump(6);
      if (E._error) fail('identity errored: ' + E._error.message);
      const idn = E.current;
      idn._wear('ava_top5', 'a');
      if (E.save.avatar === 'ava_top5') fail('locked avatar was wearable');
      idn._wear('conductor', 'a');
      if (E.save.avatar !== 'conductor') fail('owned avatar failed to equip');
      idn._wear('fra_aurum', 'f');
      if (E.save.frame === 'fra_aurum') fail('locked frame was wearable');
      if (E._error) fail('identity wear errored: ' + E._error.message);
      ok('identity page OK — owned looks wear, locked looks refuse');

      // ---- v1.7: season settle is safe offline / with no rows ----
      E._error = null;
      const seasonMod = await importModule('js/data/season.js');
      if (!/^\d{4}-\d{2}$/.test(seasonMod.monthKey())) fail('monthKey is not YYYY-MM: ' + seasonMod.monthKey());
      if (seasonMod.tierForRank(1).max !== 1) fail('tierForRank(1) is not the top tier');
      const resNoRows = await seasonMod.settleSeason(E.save, 'p_check_norows', async () => []);
      if (resNoRows !== null) fail('settleSeason with no board rows should return null, got ' + JSON.stringify(resNoRows));
      const resOffline = await seasonMod.settleSeason(E.save, 'p_check_offline', async () => { throw new Error('offline'); });
      if (resOffline !== null) fail('settleSeason offline should return null, got ' + JSON.stringify(resOffline));
      if (E._error) fail('season settle errored: ' + E._error.message);
      ok('season settle OK — offline / empty board degrade to null, monthKey YYYY-MM');

      // ---- v1.7.1: home redesign — steel dock, throttle lever, grid menu ----
      E._error = null;
      E.setScene('menu', { save: E.save });
      G.__pump(8);
      if (E._error) fail('redesigned home errored: ' + E._error.message);
      const home2 = E.current;
      if (typeof home2.layout !== 'function') fail('home has no layout()');
      const Lh = home2.layout();
      if (!Lh.throttle) fail('home layout has no throttle lever');
      if (!Lh.tabs || Lh.tabs.length !== 5) fail(`home dock should have 5 tabs, has ${Lh.tabs && Lh.tabs.length}`);
      if (Lh.tabs[2].act !== 'battle') fail('center dock tab is not BATTLE');
      const acts = Lh.tabs.map(t => t.act).join(',');
      if (acts !== 'trainBase,arsenal,battle,shop,coinShop') fail('dock tab mapping wrong: ' + acts);
      const cellsH = home2._gridCells();
      if (cellsH.length !== 13) fail(`grid menu should hold 13 stations (incl. HOW TO PLAY), has ${cellsH.length}`);
      home2._gridOpen = true;
      G.__pump(6);
      if (E._error) fail('grid menu render errored: ' + E._error.message);
      home2._gridOpen = false;
      home2._pullThrottle(); // lever animates ~0.38s, then the run starts
      if (!home2._thr.pulling) fail('throttle lever did not engage');
      G.__pump(40);
      if (E._error) fail('throttle start errored: ' + E._error.message);
      if (E.current === home2) fail('throttle lever never started the run');
      G.__pump(10);
      ok('home redesign OK — 5-tab steel dock, throttle lever starts the run, 13-station System Deck');

      // ---- v1.8: learning phase — the first three sectors ramp up ----
      E._error = null;
      E.setScene('gameplay', { save: E.save, realmId: 'purgatory', stage: 1 });
      G.__pump(5);
      const gpL = E.current;
      const l1 = gpL._learn();
      if (!l1 || l1.elites !== false || l1.rosterMax !== 2) fail('sector 1 learning rules wrong: ' + JSON.stringify(l1 || {}));
      if (gpL.stage >= 4 === false && gpL._learn() === null) fail('learning phase should cover stages 1-3');
      const l4 = gpL._learn.call(Object.assign(Object.create(Object.getPrototypeOf(gpL)), { stage: 4 }));
      if (l4 !== null) fail('stage 4 should have no training wheels');
      if (E._error) fail('learning phase errored: ' + E._error.message);
      ok('learning phase OK — sector 1 basics-only, ramp ends at sector 4');

      // ---- v1.8: hit-stop + disintegration juice ----
      E._error = null;
      const fxA = gpL.fx;
      const species = gpL.world.pickEnemyRoster(1)[0] || 'ghost';
      const mk = gpL.spawnEnemy(species, gpL.player.x + 60, gpL.player.y);
      if (mk) { mk.hp = 1; gpL._onKill(mk, {}); }
      else fail('could not spawn ' + species + ' for the disintegration test');
      const hasEmber = fxA.list.some(p => p.kind === 2 || p.kind === 6);
      if (!hasEmber) fail('disintegration engine produced no embers/dust on kill');
      G.__pump(3);
      if (E._error) fail('disintegration errored: ' + E._error.message);
      ok('disintegration engine OK — neon embers + charcoal dust on every kill');

      // ---- v1.8: pause scene — score, build, opt-in post, end run ----
      E._error = null;
      gpL.player.score = 7777;
      E.setScene('pause', { from: 'gameplay', ctx: { gameplay: gpL } });
      G.__pump(6);
      if (E._error) fail('pause errored: ' + E._error.message);
      const pz = E.current;
      if (typeof pz._scoreLines !== 'function' || !pz._scoreLines().length) fail('pause has no RUN SCORE view');
      if (typeof pz._doPost !== 'function') fail('pause has no SAVE SCORE TO LEADERBOARD');
      if (typeof pz._endRun !== 'function') fail('pause cannot END RUN');
      const bl = pz._buildLines();
      if (!bl.length) fail('pause build view is empty');
      // END RUN resolves to the summary with the opt-in POST strip
      pz._endRun();
      G.__pump(8);
      if (E._error) fail('pause end-run errored: ' + E._error.message);
      if (E.current?.sceneId !== 'runSummary' && E.current?.constructor?.name !== 'RunSummaryScene') fail('END RUN did not reach the summary');
      if (typeof E.current._doPost !== 'function') fail('summary after END RUN lost the POST strip');
      ok('pause signal OK — score view, build view, opt-in post, end run to summary');

      // ---- v1.8: tutorial gate for fresh conductors ----
      E._error = null;
      const fresh = E.engine ? null : null;
      E.save.tutorialDone = false;
      E.setScene('tutorial', { save: E.save });
      G.__pump(6);
      if (E._error) fail('tutorial errored: ' + E._error.message);
      const tut = E.current;
      if (typeof tut._next !== 'function') fail('tutorial scene missing');
      const steps = 11;
      for (let i = 0; i < steps; i++) tut._next();
      G.__pump(4);
      if (E.save.tutorialDone !== true) fail('tutorial did not set tutorialDone');
      if (E._error) fail('tutorial walkthrough errored: ' + E._error.message);
      ok('tutorial OK — 11 pages teach the whole line, then hands over the throttle');

      // ---- v1.9.1 regression: NEXT / SKIP must answer REAL clicks ----
      // The walkthrough above calls _next() directly, so it cannot catch an
      // input bug. Drive the scene through the canvas event listeners instead.
      E._error = null;
      E.save.tutorialDone = false;
      E.setScene('tutorial', { save: E.save });
      G.__pump(20); // let the 0.15s page-open guard expire, like a human pause
      const tutC = E.current;
      const cv = E.canvas;
      const clickAt = (r) => {
        const x = r.x + r.w / 2, y = r.y + r.h / 2;
        cv.dispatch('mousemove', { clientX: x, clientY: y, button: 0 });
        cv.dispatch('mousedown', { clientX: x, clientY: y, button: 0 });
        G.__pump(1);
        cv.dispatch('mouseup', { clientX: x, clientY: y, button: 0 });
        G.__pump(1);
      };
      if (tutC.constructor.name !== 'TutorialScene') fail('tutorial scene did not open for the click test');
      else {
        const s0 = tutC.step;
        clickAt(tutC._nextRect());
        if (E._error) fail('tutorial NEXT click errored: ' + E._error.message);
        if (tutC.step !== s0 + 1) fail(`NEXT click did not advance the page (step ${s0} -> ${tutC.step}, want ${s0 + 1})`);
        G.__pump(10); // a stuck justDown would fire the button again on later frames
        if (tutC.step !== s0 + 1) fail(`one NEXT click fired more than once (step ${tutC.step}, want ${s0 + 1})`);
        const s1 = tutC.step;
        G.__press('Space');
        G.__pump(2);
        if (tutC.step !== s1 + 1) fail(`SPACE did not page the tutorial forward (step ${tutC.step}, want ${s1 + 1})`);
        G.__pump(4);
        if (tutC.step !== s1 + 1) fail(`SPACE held the page turning every frame (step ${tutC.step}, want ${s1 + 1})`);
        const s2 = tutC.step;
        const dot = tutC._dotRect(Math.min(s2 + 2, 10));
        clickAt(dot);
        if (tutC.step !== Math.min(s2 + 2, 10)) fail(`progress dot did not jump the page (step ${tutC.step})`);
        clickAt(tutC._skipRect());
        if (E.current === tutC) fail('SKIP click did not leave the tutorial');
        if (E.save.tutorialDone !== true) fail('SKIP did not mark the handbook as read');
        if (E._error) fail('tutorial SKIP click errored: ' + E._error.message);
        if (!failures) ok('tutorial buttons OK — NEXT, SKIP, SPACE and the page dots all answer real clicks');
      }

      // ---- v1.9.1 regression: one key press = one action on every page ----
      // Menu pages never ticked Input.endFrame(), so a single press repeated
      // on every frame until some other scene cleared it. The engine now clears
      // one-frame input flags at the end of each frame.
      E._error = null;
      E.setScene('hub', { save: E.save });
      G.__pump(20);
      const hubPg = E.current;
      hubPg.list.keyIndex = -1;
      G.__press('ArrowDown');
      G.__pump(1);
      const ki = hubPg.list.keyIndex;
      G.__pump(20);
      if (ki !== 1) fail(`ArrowDown did not move the list selection (keyIndex ${ki}, want 1)`);
      else if (hubPg.list.keyIndex !== ki) fail(`one ArrowDown kept repeating (keyIndex ${hubPg.list.keyIndex}, want ${ki})`);
      // Enter must activate the highlighted row — this line used to throw
      // "Assignment to constant variable" and blank the page.
      const wantScene = hubPg.rows[hubPg.list.keyIndex]?.scene;
      G.__press('Enter');
      G.__pump(3);
      if (E._error) fail('hub ENTER on the highlighted row errored: ' + E._error.message);
      else if (!wantScene) fail('hub row 1 has no scene to open');
      else if (E.current === hubPg) fail('ENTER did not open the highlighted station');
      if (E._error) fail('menu keyboard errored: ' + E._error.message);
      if (!failures) ok('input frame OK — a key press fires once on menu pages, not every frame');

      // ---- v1.8.1: Flywheel Orbit + Rivet Gun replace the old slots ----
      E._error = null;
      E.setScene('gameplay', { save: E.save, realmId: 'purgatory', stage: 1 });
      G.__pump(5);
      const gpW = E.current;
      gpW.player.addWeapon('orbital_blades');
      gpW.player.upgradeWeapon('orbital_blades');
      const wO = gpW.player.weapons.find(w => w.id === 'orbital_blades');
      if (!wO || wO.name !== 'Flywheel Orbit') fail('Flywheel Orbit missing: ' + (wO && wO.name));
      if (gpW.player.orbitals.length !== 2) fail(`Flywheel Orbit should orbit 2 gears, has ${gpW.player.orbitals.length}`);
      G.__pump(30);
      if (E._error) fail('flywheel orbit errored: ' + E._error.message);
      gpW.player.addWeapon('plasma_blaster');
      const wR = gpW.player.weapons.find(w => w.id === 'plasma_blaster');
      if (!wR || wR.name !== 'Rivet Gun') fail('Rivet Gun missing: ' + (wR && wR.name));
      const target = gpW.spawnEnemy(gpW.world.pickEnemyRoster(1)[0] || 'ghost', gpW.player.x + 60, gpW.player.y);
      if (target) { target.maxHp = 99999; target.hp = 99999; } // soak rivets, don't die
      // deterministic volley: cast the Rivet Gun directly at the soak target
      const wR2 = gpW.player.weapons.find(w => w.id === 'plasma_blaster');
      const sR2 = gpW.player.weaponStates['plasma_blaster'];
      gpW.player._cast(gpW, wR2, sR2, target);
      if (!gpW.projectiles.some(pr => pr.weaponId === 'plasma_blaster')) fail('Rivet Gun cast spawned no rivet projectile');
      let dmgDealt = 0;
      for (let i = 0; i < 120; i++) { G.__pump(1); dmgDealt = gpW.dmgByWeapon['plasma_blaster'] || 0; if (dmgDealt > 0) break; }
      if (dmgDealt <= 0) fail(`Rivet Gun rivet never landed (dmg=${dmgDealt}, targetAlive=${target && target.alive}, tdist=${target ? Math.round(Math.hypot(target.x-gpW.player.x, target.y-gpW.player.y)) : '-'})`);
      if (E._error) fail('rivet gun errored: ' + E._error.message);
      ok('Flywheel Orbit (2 gears) + Rivet Gun (auto rivets) live');

      // ---- v1.8.1: passives — Magnetic Polarity & Overdrive Pistons ----
      E._error = null;
      const upgMod = await importModule('js/data/upgrades.js');
      const mag = upgMod.ASCENSIONS.find(c => c.id === 'magnetic_polarity');
      const od = upgMod.ASCENSIONS.find(c => c.id === 'overdrive_pistons');
      if (!mag || !String(mag.desc(2)).includes('50% pickup collection radius')) fail('Magnetic Polarity card missing or wrong: ' + (mag && mag.desc(2)));
      if (!od || !String(od.desc(2)).includes('20% movement speed')) fail('Overdrive Pistons card missing or wrong: ' + (od && od.desc(2)));
      if (upgMod.ASCENSIONS.some(c => c.id === 'swiftness')) fail('old Swiftness card still present — should be replaced');
      if (String(upgMod.ASCENSIONS.find(c => c.id === 'greed').desc(1)).includes('pickup radius')) fail('Greed still grants pickup radius');
      const range0 = gpW.player.pickupRange;
      mag.apply(gpW.player, 2);
      const range2 = gpW.player.pickupRange;
      if (range2 < range0 * 1.49 || range2 > range0 * 1.51) fail(`Magnetic Polarity II should be +50%, got ${((range2 / range0 - 1) * 100).toFixed(1)}%`);
      if (E._error) fail('passive cards errored: ' + E._error.message);
      ok('Magnetic Polarity +25%/lvl and Overdrive Pistons in the grid');

      // ---- v1.8.1: scrap barrels drop exactly one Repair Kit ----
      E._error = null;
      for (let i = 0; i < 60 * 14 && !gpW.barrels.some(b => b.alive); i++) G.__pump(1); // wait for the director to seed one
      if (!gpW.barrels.some(b => b.alive)) fail('no scrap barrels spawned within 14s');
      const b0 = gpW.barrels.find(b => b.alive);
      const kitsBefore = gpW.pickups.filter(u => u.type === 'repair').length;
      gpW._breakBarrel(b0);
      const kitsAfter = gpW.pickups.filter(u => u.type === 'repair').length;
      if (kitsAfter - kitsBefore !== 1) fail(`barrel dropped ${kitsAfter - kitsBefore} repair kits (want exactly 1)`);
      // explosion chain-breaks barrels too
      const b1 = gpW.barrels.find(b => b.alive);
      if (b1) { b1.x = gpW.player.x + 30; b1.y = gpW.player.y; gpW.spawnExplosion(b1.x, b1.y, 40, 5, 'fire'); if (b1.alive) fail('explosion did not break the barrel'); }
      if (E._error) fail('barrel errored: ' + E._error.message);
      ok('scrap barrels OK — break by touch, shot, or blast; exactly 1 Repair Kit each');

      // ---- new weapon mechanics: charge / turret / echo, through evolution ----
      E._error = null;
      E.setScene('gameplay', { save: E.save, realmId: 'purgatory', stage: 1 });
      G.__pump(5);
      const gp3 = E.current;
      for (const wid of ['arcane_lance', 'sentry_kit', 'echo_shard']) {
        gp3.player.addWeapon(wid);
        for (let l = 0; l < 4; l++) gp3.player.upgradeWeapon(wid); // level 5 => evolves
      }
      G.__pump(60 * 6); // let them all fire in anger
      if (E._error) fail('new weapon mechanics errored: ' + E._error.message);
      const evolvedN = ['arcane_lance', 'sentry_kit', 'echo_shard']
        .filter(wid => gp3.player.weapons.find(w => w.id === wid)?.evolved).length;
      if (evolvedN !== 3) fail(`new weapons did not evolve at mastery 5 (${evolvedN}/3)`);
      if (!gp3.player.turrets.length) fail('sentry turret never deployed');
      ok('new weapons OK — charge/turret/echo fire and evolve');

      // ---- v1.5 five-fix verification ----
      E._error = null;
      // (26) variant sprites render for every recycled species
      for (const wid2 of ['mirror_wisp', 'star_wisp', 'lost_soul', 'marsh_lurker', 'slag_gobbler']) {
        const ve = gp3.spawnEnemy(wid2, gp3.player.x + 40, gp3.player.y + 20);
        if (ve && !ve.variant) fail(wid2 + ' has no variant decor');
      }
      G.__pump(30);
      if (E._error) fail('variant rendering errored: ' + E._error.message);
      // (27+30) hard rule: elites arrive as named pairs
      E.setScene('gameplay', { save: E.save, realmId: 'infernal', stage: 1, difficulty: 'hard' });
      G.__pump(5);
      const gpH = E.current;
      gpH._spawnElite();
      const eliteN = gpH.enemies.filter(e => e.eliteMod).length;
      if (eliteN < 2) fail(`TWIN TROUBLE did not pair the elites (${eliteN})`);
      // (28) furnace burst: full meter + burst => overdrive + reset
      gpH.train.furnace = gpH.train.furnaceMax;
      gpH.train.x = gpH.player.x - 40; gpH.train.y = gpH.player.y + 10;
      gpH._furnaceBurst();
      if (gpH.train.furnace !== 0) fail('furnace did not reset after burst');
      if (!gpH.train.overdrive) fail('furnace burst did not trigger overdrive');
      G.__pump(20);
      // (29) waypoints are contested: wardens + decaying value
      gpH._spawnWaypoint();
      if (!gpH.waypoint) fail('waypoint failed to spawn');
      else {
        const wardens = gpH.enemies.filter(e => e.warden).length;
        if (wardens < 3) fail(`waypoint spawned with ${wardens} wardens`);
        gpH.waypoint.life = 2; // let it almost expire
        G.__pump(140);
        if (gpH.waypoint && gpH.waypoint.value > 0.55) fail('waypoint value does not decay');
      }
      // (30) second wind on easy: the killing blow is survived once
      E.setScene('gameplay', { save: E.save, realmId: 'purgatory', stage: 1, difficulty: 'easy' });
      G.__pump(5);
      const gpE = E.current;
      gpE.player.shield = 0;
      gpE.player.invuln = 0;
      gpE.player.takeDamage(999999, gpE, 'CHECK BOT');
      G.__pump(5);
      if (!gpE.player.alive) fail('SECOND WIND did not save the player on easy');
      if (gpE.player.hp <= 0) fail('SECOND WIND left hp at zero');
      G.__pump(60);
      if (E._error) fail('five-fix block errored: ' + E._error.message);
      ok('five fixes OK — variants, twin elites, furnace burst, contested waypoints, second wind');

      // ---- v1.6 ten-fix verification ----
      E._error = null;
      // (31) escalation: stage 2+ surges + 3-shot volleys; stage 3 lieutenant
      E.setScene('gameplay', { save: E.save, realmId: 'infernal', stage: 2, difficulty: 'normal' });
      G.__pump(5);
      const gpS = E.current;
      gpS._spawnSurge();
      G.__pump(120); // ride out the 1.3s delay
      const afterSurge = gpS.enemies.length;
      if (afterSurge < 5) fail(`surge did not spawn a ring (${afterSurge} enemies)`);
      gpS.stage = 3;
      gpS._spawnLieutenant();
      if (!gpS.lieutenant) fail('lieutenant failed to spawn on stage 3');
      G.__pump(10);
      // (34) reroll economy: route pick grants tools
      const rr = gpS.rerolls, bb = gpS.banishes;
      gpS.rerolls = 0; gpS.banishes = 0;
      gpS.routeCards = null;
      gpS._openRouteCards();
      gpS._pickRoute(0);
      if (gpS.rerolls < 1 || gpS.banishes < 1) fail('route pick did not grant reroll+banish');
      gpS.rerolls = rr; gpS.banishes = bb; gpS.transition = 0;
      // (35) weapon grant is now a previewed 3-choice pick
      gpS.wPick = null;
      gpS._grantRandomWeapon();
      if (!gpS.wPick || gpS.wPick.opts.length !== 3) fail('weapon grant did not offer 3 named choices');
      const had = gpS.player.weapons.length;
      gpS._pickWeapon(0);
      if (gpS.player.weapons.length !== had + 1) fail('weapon pick did not grant the chosen weapon');
      // (38) boss arena: pillars rise, tells precede signatures
      gpS._spawnBoss();
      if (gpS.pillars.length !== 4) fail('boss arena did not raise 4 cover pillars');
      if (!gpS.boss) fail('boss failed to spawn');
      else {
        let sawTell = false;
        for (let i = 0; i < 600 && !sawTell; i++) {
          G.__pump(1);
          if (gpS.cards) gpS._pickCard(0);
          if (gpS.wPick) gpS._pickWeapon(0);
          if (gpS.boss?._tell) sawTell = true;
        }
        if (!sawTell) fail('boss signature attack never telegraphs');
      }
      ok('ten fixes part 1 OK — surges, lieutenant, tool economy, weapon picks, pillars');
      // (33) music sequencer ticks without error, per theme
      E.setScene('gameplay', { save: E.save, realmId: 'purgatory', stage: 3, difficulty: 'normal' });
      G.__pump(5);
      const gpM = E.current;
      gpM.stage = 3;
      gpM._spawnLieutenant();
      G.__pump(180);
      if (E._error) fail('music/lieutenant block errored: ' + E._error.message);
      // (36) records: run a short run into a summary, localScores must grow
      const scoresBefore = (E.save.localScores || []).length;
      gpM._endRun(true);
      G.__pump(10);
      if ((E.save.localScores || []).length !== scoresBefore + 1) fail('local scores board did not record the run');
      // (37) boons: grant one, new run applies it
      E.save.permaBoons = { starterKit: true, extraBanish: true, furnaceStart: true };
      E.setScene('gameplay', { save: E.save, realmId: 'purgatory', stage: 1, difficulty: 'normal' });
      G.__pump(5);
      const gpB = E.current;
      if (E._error) fail('boon run enter errored: ' + E._error.message);
      if (!gpB.rerolls && gpB.rerolls !== 0) fail('boon run did not enter gameplay (scene=' + (gpB?.constructor?.name) + ')');
      // base: rerolls=freeRerolls(0 here), banishes=1 — boons stack on top
      if (gpB.rerolls < 1 || gpB.banishes < 3) fail(`boons did not apply (rerolls=${gpB.rerolls}, banishes=${gpB.banishes})`);
      if (gpB.train?.furnace < gpB.train.furnaceMax * 0.5) fail('banked coals boon did not apply');
      // (39) pause build view derives lines without error
      E.setScene('pause', { from: 'gameplay', ctx: { gameplay: gpB } });
      G.__pump(5);
      if (E._error) fail('pause build view errored: ' + E._error.message);
      ok('ten fixes part 2 OK — music, records, boons, pause build view');

      // ---- v1.9.2 regression: the mocked / glitchy UI paths really work ----
      // These drive REAL clicks (including the delegated 'click' event the
      // shared navigation listens for) — method calls cannot catch any of it.
      E._error = null;
      const realmsM = await importModule('js/data/realms.js');
      const soundM = await importModule('js/core/sound.js');
      const fullClick = (r) => {
        const x = r.x + r.w / 2, y = r.y + r.h / 2;
        cv.dispatch('mousemove', { clientX: x, clientY: y, button: 0 });
        cv.dispatch('mousedown', { clientX: x, clientY: y, button: 0 });
        cv.dispatch('mouseup', { clientX: x, clientY: y, button: 0 });
        try { G.dispatchEvent({ type: 'mouseup', button: 0 }); } catch {}   // Input listens on window
        cv.dispatch('click', { clientX: x, clientY: y, button: 0, preventDefault() {}, stopPropagation() {} });
        G.__pump(4);
      };

      // (1) a bad scene key must keep the current scene (it used to blank it)
      E.setScene('hub', { save: E.save });
      G.__pump(2);
      const keepS = E.current, keepName = E.currentName;
      E.setScene('__nope__');
      if (E.current !== keepS || !E.current) fail('bad scene name replaced/blanked the current scene');
      if (E.currentName !== keepName) fail('bad scene name corrupted engine.currentName');

      // (2) nav BACK chip reaches home, and the opening click must not
      //     phantom-fire on home afterwards (stale justDown bug)
      E.setScene('profile', { save: E.save });
      G.__pump(20);
      fullClick({ x: 6, y: 7, w: 52, h: 24 });            // shared TOP.back
      if (E.current?.constructor?.name !== 'HomeScene') fail('nav BACK chip did not reach home (got ' + (E.current?.constructor?.name || 'blank') + ')');
      G.__pump(30);
      if (E.current?.constructor?.name !== 'HomeScene') fail('a stale click phantom-fired after landing on home');

      // (3) home draws its own top bar — nav must not steal its buttons
      E.setScene('menu', { save: E.save });
      G.__pump(20);
      fullClick({ x: 224, y: 5, w: 42, h: 26 });           // deck grid button (sits under the shards chip)
      if (E.current?.constructor?.name !== 'HomeScene') fail('global nav hijacked the home grid button');
      if (!E.current?._gridOpen) fail('home grid button did not open the deck');
      E.setScene('menu', { save: E.save });
      G.__pump(20);
      fullClick({ x: 4, y: 4, w: 96, h: 28 });             // profile button (sits under the BACK chip)
      if (E.current?.constructor?.name !== 'ProfileScene') fail('home profile button did not open the profile (got ' + (E.current?.constructor?.name || 'blank') + ')');

      // (4) purse chip passes a REAL from key, Escape returns to it
      G.__pump(20);
      fullClick({ x: 154, y: 7, w: 52, h: 24 });           // TOP.coins
      if (E.current?.constructor?.name !== 'CoinShopScene') fail('purse chip did not open the coin shop');
      else if (E.current.from !== 'profile') fail('nav purse chip passed a non-scene from key: ' + E.current.from);
      G.__press('Escape');
      G.__pump(6);
      if (E.current?.constructor?.name !== 'ProfileScene') fail('Escape from the coin shop did not return to profile (got ' + (E.current?.constructor?.name || 'blank') + ')');
      if (!failures) ok('nav chrome OK — bad keys no-op, BACK goes home, no phantom taps, real from keys');

      // (5) pause gets the RAW ctx the game really sends; buttons must be
      //     clickable; settings round-trips back into the live run
      E._error = null;
      E.setScene('gameplay', { save: E.save, realmId: 'purgatory', stage: 1 });
      G.__pump(6);
      const gpP = E.current;
      E.setScene('pause', { from: 'gameplay', ctx: gpP });  // raw scene — the real call shape
      G.__pump(20);
      const pzR2 = E.current;
      if (E._error) fail('pause with raw ctx errored: ' + E._error.message);
      if (pzR2._gp() !== gpP) fail('pause _gp() did not resolve the raw gameplay scene');
      if (!pzR2._scoreLines().length) fail('pause score view is empty with the raw ctx');
      if (!pzR2._buildLines().length) fail('pause build view is empty with the raw ctx');
      fullClick({ x: 49, y: 178, w: 172, h: 30 });         // RESUME THE RUN (buttons used to be NaN rects)
      if (E.current !== gpP) fail('RESUME button click did not return to the run');
      if (E.currentName !== 'gameplay') fail('resuming did not restore engine.currentName');
      E.setScene('pause', { from: 'gameplay', ctx: gpP });
      G.__pump(20);
      fullClick({ x: 49, y: 280, w: 172, h: 30 });         // SETTINGS
      if (E.current?.constructor?.name !== 'SettingsScene') fail('pause SETTINGS button did not open settings');
      G.__pump(20);
      const soundWas = E.save.settings.sound;
      fullClick({ x: 8, y: 62, w: 254, h: 34 });            // SOUND row
      if (E.save.settings.sound === soundWas) fail('settings SOUND toggle did not flip');
      if (soundM.SOUNDS.enabled !== !!E.save.settings.sound) fail('SOUND toggle did not sync SOUNDS.enabled');
      E.save.settings.sound = soundWas; soundM.SOUNDS.enabled = !!soundWas;
      fullClick({ x: 8, y: 142, w: 254, h: 34 });           // SCREEN SHAKE row
      if (E.save.settings.shake !== 0) fail('settings SCREEN SHAKE toggle did not flip');
      if (gpP.camera.shakeEnabled !== false) fail('shake toggle did not reach the live gameplay camera');
      fullClick({ x: 8, y: 142, w: 254, h: 34 });           // flip shake back on
      if (gpP.camera.shakeEnabled !== true) fail('shake toggle did not re-enable the live gameplay camera');
      fullClick({ x: 154, y: 7, w: 52, h: 24 });            // purse chip from settings
      if (E.current?.constructor?.name !== 'CoinShopScene') fail('settings purse chip did not open the coin shop');
      G.__press('Escape');
      G.__pump(6);
      if (E.current?.constructor?.name !== 'SettingsScene') fail('coin shop did not return to settings (got ' + (E.current?.constructor?.name || 'blank') + ')');
      G.__press('Escape');
      G.__pump(6);
      if (E.current?.constructor?.name !== 'PauseScene') fail('settings did not return to the pause layer (got ' + (E.current?.constructor?.name || 'blank') + ')');
      if (E.current._gp() !== gpP) fail('settings round trip lost the run context');
      G.__pump(20);
      fullClick({ x: 49, y: 178, w: 172, h: 30 });         // RESUME again
      if (E.current !== gpP) fail('RESUME after the settings round trip failed');
      if (E._error) fail('pause/settings round trip errored: ' + E._error.message);
      if (!failures) ok('pause + settings OK — raw ctx, clickable buttons, live toggles, coin-shop round trip');

      // (6) hit-test sweep: forge BOONS tab, world-map bottom row, profile
      //     identity grid (wrapped cells), leaderboard season strip
      E._error = null;
      E.setScene('shop', { save: E.save });
      G.__pump(20);
      clickAt({ x: 200, y: 50, w: 60, h: 24 });             // 4th tab (BOONS) — was i<3, unreachable
      if (E.current.tab !== 3) fail('shop BOONS tab did not switch (tab=' + E.current.tab + ')');
      if (!E.current.items().some((i) => i.kind === 'boon')) fail('shop tab 3 does not show the boons');
      G.__press('Escape');
      G.__pump(6);
      if (E.current?.constructor?.name !== 'HomeScene') fail('Escape from the forge did not reach home (got ' + (E.current?.constructor?.name || 'blank') + ')');

      E.setScene('worldmap', { save: E.save });
      G.__pump(20);
      E.current.dismissHint && E.current.dismissHint();   // onboarding hint owns clicks until dismissed
      G.__pump(2);
      if (realmsM.DIFFICULTIES.length < 6) fail('expected 6 difficulties for the row-wrap click test');
      clickAt({ x: 8, y: 66, w: 62, h: 24 });               // row 2, tile 1 (gated out before)
      if (E.current.diffTab !== 4) fail('world map bottom difficulty row did not answer (diffTab=' + E.current.diffTab + ', want 4)');

      E.setScene('profile', { save: E.save });
      G.__pump(20);
      clickAt({ x: 180, y: 40, w: 82, h: 24 });             // IDENTITY tab (3rd, was off-canvas)
      if (E.current.tab !== 2) fail('profile IDENTITY tab did not switch (tab=' + E.current.tab + ')');
      const avaIds = Object.keys(seasonMod.AVATARS);
      const frameIds = Object.keys(seasonMod.FRAMES);
      E.save.ownedAvatars = avaIds.slice();
      E.save.ownedFrames = frameIds.slice();
      E.save.avatar = null;
      clickAt({ x: 8, y: 198, w: 60, h: 60 });              // avatar #5 — wrapped row, off-canvas before
      if (E.save.avatar !== avaIds[4]) fail('wrapped avatar cell did not wear ' + avaIds[4] + ' (got ' + E.save.avatar + ')');
      E.save.frame = null;
      clickAt({ x: 72, y: 280, w: 60, h: 34 });             // frame #1 cell — reachable now
      if (E.save.frame !== frameIds[0]) fail('frame cell click did not wear ' + frameIds[0] + ' (got ' + E.save.frame + ')');

      E.setScene('leaderboards', { save: E.save });
      G.__pump(20);
      E.current.dismissHint && E.current.dismissHint();   // scores-saved hint owns clicks until dismissed
      G.__pump(2);
      clickAt({ x: 8, y: 148, w: 254, h: 20 });             // season strip is drawn at y148
      if (!E.current.seasonOpen) fail('season rewards strip did not open');
      if (E._error) fail('hit-test sweep errored: ' + E._error.message);
      if (!failures) ok('hit-test sweep OK — forge BOONS, world-map row 2, identity grid, season strip');

      // (7) settings.shake gates the camera AND the fx.shakeScreen bridge
      //     (shakeScreen used to drive nothing; shake was never read)
      E.save.settings.shake = 0;
      E.setScene('gameplay', { save: E.save, realmId: 'purgatory', stage: 1 });
      G.__pump(4);
      const gpSk = E.current;
      if (gpSk.camera.shakeEnabled !== false) fail('shake=0 was not applied to the camera at run enter');
      gpSk.camera.shake(1);
      if (gpSk.camera.trauma !== 0) fail('camera shook while SCREEN SHAKE was off');
      gpSk.fx.shakeScreen(8, 0.3);
      if (gpSk.camera.trauma !== 0) fail('shakeScreen ignored the SCREEN SHAKE setting');
      gpSk.camera.shakeEnabled = true; gpSk.fx.shakeEnabled = true;
      gpSk.fx.shakeScreen(8, 0.3);
      if (gpSk.camera.trauma <= 0) fail('shakeScreen no longer drives the camera trauma');
      gpSk.camera.trauma = 0;
      E.save.settings.shake = 1;
      if (E._error) fail('shake gate errored: ' + E._error.message);
      if (!failures) ok('shake gate OK — settings.shake gates camera + fx bridge');

      // (8) on-screen controls: visible geometry that answers real clicks,
      //     placed clear of the train-status panel and the minimap
      E.save.settings.shake = 1;
      E.setScene('gameplay', { save: E.save, realmId: 'purgatory', stage: 1 });
      G.__pump(6);
      const gpC = E.current;
      const ctl = gpC._ctl ? gpC._ctl() : null;
      if (!ctl || !ctl.pause || !ctl.dash || !ctl.fire) fail('_ctl() missing button geometry');
      else {
        const HW = 270, HH = 480;
        const hitBox = (A, B) => !(A.x + A.w <= B.x || B.x + B.w <= A.x || A.y + A.h <= B.y || B.y + B.h <= A.y);
        const panelBox = { x: HW - 64 - 90 - 6 - 2, y: HH - 86 - 2, w: 94, h: 40 };  // train status
        const miniBox = { x: HW - 64, y: HH - 64, w: 60, h: 60 };                     // minimap frame
        if (hitBox(panelBox, miniBox)) fail('train status panel still overlaps the minimap');
        for (const k of ['dash', 'fire']) {
          const b = ctl[k];
          const r = { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 };
          if (hitBox(r, panelBox)) fail(k + ' control overlaps the train status panel');
          if (hitBox(r, miniBox)) fail(k + ' control overlaps the minimap');
        }
        // the pause pill must work with a plain mouse click — no key press,
        // and no touch finger (the old gate required touchSeen)
        fullClick({ x: ctl.pause.x - ctl.pause.r, y: ctl.pause.y - ctl.pause.r, w: ctl.pause.r * 2, h: ctl.pause.r * 2 });
        if (E.current?.constructor?.name !== 'PauseScene') fail('on-screen pause pill did not open the pause layer');
        G.__pump(20);
        fullClick({ x: 49, y: 178, w: 172, h: 30 });   // RESUME THE RUN
        if (E.current !== gpC) fail('RESUME after the on-screen pause pill failed');
      }
      if (E._error) fail('HUD controls errored: ' + E._error.message);
      if (!failures) ok('HUD controls OK — visible pause/SPC/Q-E rings, no panel collisions');

      // ---- defeat path on a fresh run ----
      E._error = null;
      E.setScene('gameplay', { save: E.save, realmId: 'frozen', stage: 3 });
      G.__pump(30);
      const gp2 = E.current;
      for (let i = 0; i < 40 && E.current === gp2 && gp2.player.alive; i++) {
        gp2.player.takeDamage(500, gp2, 'CHECK BOT');
        G.__pump(12);
      }
      G.__pump(200);
      if (E._error) fail('defeat path errored: ' + E._error.message);
      ok('defeat path resolves to summary without errors');

      // ==== v1.9: levels + unlocks + saved leaderboards + CG + hints ====
      E._error = null;

      // (a) CrazyGames auto sign-in — username from the platform, password
      //     derived from the CG session (auth.crazyLogin)
      const authM9 = await importModule('js/systems/auth.js');
      const cgM9 = await importModule('js/systems/crazygames.js');
      const lvM9 = await importModule('js/systems/levels.js');
      const curU9 = authM9.AUTH.getCurrentUser();
      if (!curU9 || !curU9.crazy || curU9.username !== 'SkyConductor') {
        fail('boot did not auto sign-in via CrazyGames (got ' + (curU9 ? curU9.username + ' crazy=' + curU9.crazy : 'null') + ')');
      } else if (!authM9.AUTH.isCrazy()) fail('AUTH.isCrazy() false for the CG account');
      else if (!curU9.passHash) fail('CG account has no derived password hash');
      else if (!cgM9.CrazyGames.available()) fail('CrazyGames.available() false with the SDK present');
      else {
        const cgU9 = await cgM9.CrazyGames.user();
        if (!cgU9 || cgU9.username !== 'SkyConductor') fail('CrazyGames.user() did not return the platform profile');
        else ok('CrazyGames auto sign-in OK — username from CG, password derived from the session');
      }
      // the CG account is REUSED on later visits (same id → same user)
      const again9 = authM9.AUTH.crazyLogin({ id: 'cg-sky-42', username: 'SkyConductor' });
      if (!again9.ok || again9.user.username !== 'SkyConductor') fail('repeat CrazyGames sign-in did not reuse the account');

      // (b) XP → level-up pays coins+shards and arms the home banner
      E.save.playerLevel = 1; E.save.playerXp = 0; E.save.levelUpNotice = null;
      const coins9 = E.save.coins, shards9 = E.save.shards;
      const need9 = lvM9.xpToNext(1);
      const gain9 = lvM9.addPlayerXp(E.save, need9);
      if (E.save.playerLevel !== 2 || gain9.levels.length !== 1) fail('XP did not level the conductor (lv=' + E.save.playerLevel + ')');
      else if (E.save.coins - coins9 !== 50 + 25 * 2 || E.save.shards - shards9 !== 5 + 2 * 2) fail('level-up reward payout wrong (+' + (E.save.coins - coins9) + '© +' + (E.save.shards - shards9) + '◆)');
      else if (!E.save.levelUpNotice || !(E.save.levelUpNotice.levels || []).includes(2)) fail('levelUpNotice not armed for the home banner');
      else if (!(lvM9.xpToNext(5) > lvM9.xpToNext(1))) fail('XP curve is not rising');
      else ok('conductor levels OK — XP pays coins+shards on level-up and arms the home banner');

      // (c) content gates: armour, daily run, weapon pool
      const wepM9 = await importModule('js/data/weapons.js');
      E.save.playerLevel = 1;
      const open1_9 = lvM9.unlockedWeapons(E.save, wepM9.WEAPONS);
      if (!open1_9.length || open1_9.some(w => lvM9.weaponReqLevel(w) > 1)) fail('level-1 weapon pool wrong (n=' + open1_9.length + ')');
      E.save.playerLevel = 9;
      if (lvM9.unlockedWeapons(E.save, wepM9.WEAPONS).length !== wepM9.WEAPONS.length) fail('level 9 should open every weapon');
      // armoury refuses a level-locked set even when it is owned
      E.save.playerLevel = 1;
      if (!(E.save.armour || []).includes('phantom')) E.save.armour.push('phantom');
      E.save.activeArmour = 'guardian';
      E.save.hints = {};
      E.setScene('armoury', { save: E.save });
      G.__pump(20);
      E.current.dismissHint && E.current.dismissHint();
      G.__pump(2);
      const phIdx9 = realmsM.ARMOURS.findIndex(a => a.id === 'phantom');
      const phRect9 = E.current.list.rowRect(phIdx9);
      fullClick(phRect9);
      if (E.save.activeArmour !== 'guardian') fail('armoury let a LEVEL-3 set equip at level 1');
      E.save.playerLevel = 9;
      fullClick(phRect9);
      if (E.save.activeArmour !== 'phantom') fail('armoury refused the set even at level 9');
      // daily run refuses at level 1, opens once levelled
      E.save.playerLevel = 1;
      E.setScene('dailyRun', { save: E.save });
      G.__pump(20);
      fullClick({ x: 100, y: 210, w: 160, h: 34 });
      G.__pump(6);
      if (E.current?.constructor?.name === 'GameplayScene') fail('daily run started while still LEVEL 1');
      E.save.playerLevel = 5;
      fullClick({ x: 100, y: 210, w: 160, h: 34 });
      G.__pump(6);
      if (E.current?.constructor?.name !== 'GameplayScene') fail('daily run did not start after reaching level 5');
      G.__pump(10);
      if (E._error) fail('content gates errored: ' + E._error.message);
      else ok('content gates OK — armour, dailies and the weapon pool lock behind levels');

      // (d) leaderboards SAVE: local board rows + offline POST ranks
      const saveM9 = await importModule('js/core/save.js');
      E.save.localBoards = {};
      // file the run under the board the scene will actually open
      // (realm from save.lastRealm, difficulty from engine._difficulty)
      const scenRealm9 = E.save.lastRealm || 'purgatory';
      const scenDiff9 = E._difficulty || 'normal';
      saveM9.recordLocalScore(E.save, { score: 12345, stage: 4, realm: scenRealm9, difficulty: scenDiff9, kills: 77, at: Date.now(), name: 'SkyConductor' });
      const rows9 = saveM9.localBoardRows(E.save, scenRealm9, scenDiff9);
      if (!rows9.length || rows9[0].score !== 12345 || rows9[0].name !== 'SkyConductor') fail('recordLocalScore did not file the run on the local board');
      E.save.hints = {};
      E.setScene('leaderboards', { save: E.save });
      G.__pump(20);
      E.current.dismissHint && E.current.dismissHint();
      G.__pump(2);
      if (E.current.boardState !== 'offline') fail('expected an offline board (got ' + E.current.boardState + ')');
      else if (!E.current.rows.length || E.current.rows[0].score !== 12345) fail('leaderboard did not fall back to the saved local rows');
      // POST with no network → saved on this device, ranked locally
      E.setScene('runSummary', { save: E.save, realmId: scenRealm9, stage: 4, victory: false,
        runStats: { kills: 77, coins: 30, bestCombo: 3, damageTaken: 2 }, time: 61, sectorDuration: 60,
        coins: 30, level: 3, owned: {}, score: 12345, difficulty: scenDiff9, trainHurt: false, damageTaken: 2, cause: 'TEST' });
      G.__pump(6);
      E.current._doPost();
      G.__pump(2);
      if (E.current.post?.state !== 'local' || E.current.post?.rank !== 1) {
        fail('offline POST did not rank locally (state=' + (E.current.post && E.current.post.state) + ' rank=' + (E.current.post && E.current.post.rank) + ')');
      } else if (!(E.save.myBoards || {})[scenRealm9 + '|' + scenDiff9 + '|' + (await importModule('js/data/season.js')).monthKey()]) {
        fail('local POST did not write myBoards');
      }
      if (E._error) fail('saved-leaderboard block errored: ' + E._error.message);
      else ok('leaderboards save OK — local rows show offline and POST ranks them on-device');

      // (e) interactive hints: open, Escape closes WITHOUT leaving, action runs
      E.save.hints = {};
      E.setScene('armoury', { save: E.save });
      G.__pump(20);
      if (!E.current.hintOpen?.()) fail('armoury onboarding hint did not open');
      else {
        G.__press('Escape');
        G.__pump(4);
        if (E.current?.constructor?.name !== 'ArmouryScene') fail('Escape while a hint was open left the page');
        else if (E.current.hintOpen()) fail('Escape did not dismiss the hint');
      }
      E.save.hints = {};
      E.save.activeArmour = null;
      E.setScene('armoury', { save: E.save });
      G.__pump(20);
      fullClick({ x: 19, y: 300, w: 110, h: 30 });       // hint primary action (EQUIP STARTER)
      G.__pump(6);
      if (E.current.hintOpen()) fail('hint stayed open after its action button');
      else if (E.save.activeArmour !== 'guardian') fail('hint action button did not run its function');

      // (f) BACK chip reaches home from every chrome page
      const backPages9 = ['hub', 'menuClassic', 'worldmap', 'trainbase', 'achievements', 'leaderboards',
        'dailyRun', 'weeklyChallenge', 'settings', 'arsenal', 'armoury', 'relics', 'shop', 'coinShop',
        'profile', 'identity', 'daily'];
      for (const nm9 of backPages9) {
        E.setScene(nm9, { save: E.save });
        G.__pump(20);
        if (E.current?.hintOpen?.()) { E.current.dismissHint(); G.__pump(2); }
        fullClick({ x: 6, y: 7, w: 52, h: 24 });           // shared TOP.back
        G.__pump(8);
        if (E.current?.constructor?.name !== 'HomeScene') fail('BACK chip on ' + nm9 + ' went to ' + (E.current?.constructor?.name || 'blank'));
        if (E._error) { fail('BACK chip on ' + nm9 + ' errored: ' + E._error.message); break; }
      }

      // (g) tutorial listens for the keys it just taught
      E.setScene('tutorial', { save: E.save });
      G.__pump(20);
      E.current.step = 1; G.__pump(2);
      G.__press('ArrowRight');
      G.__pump(4);
      if (E.current.step !== 2) fail('tutorial movement page did not advance on an arrow key (step=' + E.current.step + ')');
      E.current.step = 5; G.__pump(2);
      G.__press('KeyQ');
      G.__pump(4);
      if (E.current.step !== 6) fail('tutorial ultimate page did not advance on Q (step=' + E.current.step + ')');
      G.__press('Space');
      G.__pump(4);
      if (E.current.step !== 7) fail('tutorial Space advance broke (step=' + E.current.step + ')');
      G.__press('Escape');
      G.__pump(6);

      if (E._error) fail('v1.9 block errored: ' + E._error.message);
      else ok('v1.9 UX OK — interactive hints, tutorial keys, BACK chip on every page');
    }
  }
} catch (e) {
  fail('boot threw: ' + (e.stack || e).toString().split('\n').slice(0, 6).join(' | '));
}

fs.rmSync(tmpBoot, { recursive: true, force: true });

console.log('');
if (failures) { fs.writeSync(2, `CHECKS FAILED — ${failures} problem(s)\n`); process.exitCode = 1; }
else { fs.writeSync(1, 'ALL CHECKS PASSED ✅\n'); }
process.exit(process.exitCode || 0);
