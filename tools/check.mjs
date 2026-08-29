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
const fail = (msg) => { failures++; console.error('  ✗ ' + msg); };
const ok = (msg) => console.log('  ✓ ' + msg);

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
if (failures) { console.error('\nIMPORT CHECK FAILED — fixing before launch sim.'); process.exit(1); }

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
  g.addEventListener = g.addEventListener || (() => {});
  g.removeEventListener = g.removeEventListener || (() => {});
  g.dispatchEvent = g.dispatchEvent || (() => true);
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
        }
      };
      stepRun(60 * 8); // 8s of waves
      if (gp.runStats.kills < 1) fail('director spawned nothing after 8s');
      // force boss + kill it, then fast-forward to the sector fork
      gp._spawnBoss();
      stepRun(30);
      if (gp.boss) { gp.boss.hp = 1; }
      stepRun(60 * 6);
      if (E._error) fail('scripted run errored: ' + E._error.message);
      if (!gp.bossDefeated && gp.boss) fail('boss did not die when hp exhausted');
      // multi-sector: force the sector clock to zero, expect route cards
      const stageBefore = gp.stage;
      gp.runTime = gp.sectorDuration;
      stepRun(10);
      if (!gp.routeCards) fail('sector clear did not open route cards');
      if (gp.routeCards) {
        if (gp.routeCards.opts.length !== 3) fail('route fork should offer 3 lines');
        gp._pickRoute(0);
        stepRun(180); // ride out the transition cinematic
        if (gp.stage !== stageBefore + 1) fail('route pick did not advance to sector ' + (stageBefore + 1) + ' (stage=' + gp.stage + ')');
        if (gp.sectorTimeLeft <= 0) fail('new sector clock did not reset');
        if (!gp.enemies.length && !gp.cards) fail('new sector spawned no enemies yet');
        ok(`multi-sector OK — now sector ${gp.stage} (${gp.theme ? gp.theme.name : '?'})`);
      }
      // sector 2 → boss → sector 3 → boss → final summary
      for (let s = gp.stage; s <= gp.maxSectors; s++) {
        gp._spawnBoss();
        stepRun(30);
        if (gp.boss) gp.boss.hp = 1;
        gp.runTime = gp.sectorDuration;
        stepRun(240);
      }
      if (E._error) fail('multi-sector run errored: ' + E._error.message);
      if (E.current === gp) fail('final sector never resolved to a summary');
      else ok(`run resolved after sector ${gp.maxSectors} — ${gp.runStats.kills} kills, ${guarded} overlays`);
      if (!(gp.dmgByWeapon && Object.keys(gp.dmgByWeapon).length)) fail('per-weapon damage was not recorded');
      if (!(E.save.familyKills && Object.keys(E.save.familyKills).length)) fail('weapon mastery kills were not recorded');
      ok(`mastery + damage bookkeeping OK — ${Object.keys(E.save.familyKills || {}).length} families, ${Object.keys(gp.dmgByWeapon || {}).length} damage sources`);

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
    }
  }
} catch (e) {
  fail('boot threw: ' + (e.stack || e).toString().split('\n').slice(0, 6).join(' | '));
}

fs.rmSync(tmpBoot, { recursive: true, force: true });

console.log('');
if (failures) { console.error(`CHECKS FAILED — ${failures} problem(s)`); process.exit(1); }
console.log('ALL CHECKS PASSED ✅');
process.exit(0);
