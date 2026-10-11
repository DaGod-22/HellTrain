// HELL TRAIN — CrazyGames trailer capture. Drives the real game on a virtual clock (60 ticks/s).
import { launch } from './lib.mjs';
import fs from 'node:fs';
const FPS = 60, DT = 1000 / FPS;
const { browser, page } = await launch();
await page.evaluate(() => { const e = __ENGINE__; e.save.tutorialDone = true; e.audio && (e.audio.muted = true); });

const SEGMENTS = [
  { name: '01_action',  kind: 'game', secs: 3.0 },
  { name: '02_home',    kind: 'menu', secs: 2.2 },
  { name: '03_trainbase', kind: 'menu', secs: 2.2 },
  { name: '04_weapons', kind: 'game', secs: 3.5 },
  { name: '05_cards',   kind: 'game', secs: 2.5 },
  { name: '06_boss',    kind: 'game', secs: 3.5 },
  { name: '07_finale',  kind: 'game', secs: 3.0 },
];

// Run setup: fresh run / menu scene. Each returns nothing; the frame loop handles time.
async function setup(name) {
  // Level-up cards only open in the dedicated card segment; everywhere else they are suppressed at the source.
  await page.evaluate((keep) => {
    const gs = __ENGINE__.scenes.gameplay;
    if (keep) { delete gs._queueLevelUp; delete gs._openCards; }
    else { gs._queueLevelUp = () => {}; gs._openCards = () => {}; gs.pendingLevelUps = 0; }
  }, name === '05_cards');
  switch (name) {
    case '01_action':
    case '04_weapons':
    case '05_cards':
    case '06_boss':
    case '07_finale':
      break;
    default: break;
  }
  if (name === '01_action') {
    await page.evaluate(() => { const e = __ENGINE__; e.setScene('gameplay', { save: e.save, realmId: 'purgatory', stage: 1, difficulty: 'normal' }); });
    await warm(600); // 10s of play before the camera rolls (not captured)
  }
  if (name === '02_home') {
    await page.evaluate(() => { const e = __ENGINE__; e.setScene('menu', { save: e.save }); });
    await warm(30);
  }
  if (name === '03_trainbase') {
    await page.evaluate(() => { const e = __ENGINE__; e.setScene('trainBase', { save: e.save }); });
    await warm(30);
  }
  if (name === '04_weapons') {
    await page.evaluate(() => { const e = __ENGINE__; e.setScene('gameplay', { save: e.save, realmId: 'infernal', stage: 2, difficulty: 'normal' });
      const g = e.current; for (const id of ['lightning', 'frost', 'orbital_blades', 'bomber']) { try { g.player.addWeapon(id); } catch (err) { console.log('addWeapon fail', id, err.message); } } });
    await warm(480);
  }
  if (name === '05_cards') {
    await page.evaluate(() => { const g = __ENGINE__.current; g.player.hp = g.player.maxHp || g.player.hp; g._queueLevelUp(); });
    await warm(20);
  }
  if (name === '06_boss') {
    await page.evaluate(() => { const g = __ENGINE__.current; g.cards = null; g.pendingLevelUps = 0; g.player.hp = g.player.maxHp || g.player.hp; if (!g.bossSpawned) g._spawnBoss(); });
    await warm(120);
  }
  if (name === '07_finale') {
    await page.evaluate(() => { const e = __ENGINE__; e.setScene('gameplay', { save: e.save, realmId: 'forgotten', stage: 3, difficulty: 'normal' }); });
    await warm(480);
  }
}

async function warm(n) {
  await page.evaluate((n) => {
    const g = __ENGINE__.current; g.render = () => {};
    for (let i = 0; i < n; i++) __tick(1000 / 60);
    delete g.render;
  }, n);
}

const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
for (const seg of SEGMENTS) {
  if (ONLY && !ONLY.includes(seg.name)) continue;
  const dir = `frames/${seg.name}`;
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  await page.evaluate((k) => { window.__keepCards = k; }, seg.name === '05_cards');
  await setup(seg.name);
  const n = Math.round(seg.secs * FPS);
  await page.evaluate((seg) => {
    const g = __ENGINE__.current;
    if (seg.name === '01_action') { __ENGINE__.input.keys.add('KeyD'); }
    if (seg.name === '04_weapons') { __ENGINE__.input.keys.add('KeyW'); }
    if (seg.name === '06_boss') { __ENGINE__.input.keys.add('KeyA'); }
  }, seg);
  for (let i = 0; i < n; i++) {
    const d = await page.evaluate((dt) => {
      if (__ENGINE__.current?.player) __ENGINE__.current.player.hp = Math.max(__ENGINE__.current.player.hp, 1);
      if (!(window.__keepCards) && __ENGINE__.current?.cards) { __ENGINE__.current.cards = null; __ENGINE__.current.pendingLevelUps = 0; }
      __tick(dt);
      return __ENGINE__.canvas.toDataURL('image/png');
    }, DT);
    fs.writeFileSync(`${dir}/${String(i).padStart(5, '0')}.png`, Buffer.from(d.split(',')[1], 'base64'));
  }
  await page.evaluate(() => { const g = __ENGINE__.current; __ENGINE__.input.keys.clear(); });
  const err = await page.evaluate(() => __ENGINE__._error ? String(__ENGINE__._error.message) : null);
  console.log(seg.name, 'frames', n, 'engineError', err);
}
await browser.close();
console.log('DONE');
