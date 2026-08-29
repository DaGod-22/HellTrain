// ============================================================
// HELL TRAIN — UI icon atlas
// The chunky menu icons are generated plates baked down by
// tools/icons.mjs. They are pure decoration: if a file is missing
// or slow, the UI falls back to the vector glyphs in home.js, so
// boot can never hang or crash on them.
// ============================================================
export const ICON_NAMES = [
  'battle', 'train', 'arsenal', 'forge', 'coinshop',
  'trophy', 'gift', 'daily', 'leaderboard', 'worldmap',
  'armoury', 'relics', 'settings', 'bag', 'quickplay',
];

export const ICONS = {};

export function loadIcons(base = 'assets/icons/', timeoutMs = 4000) {
  if (typeof Image === 'undefined') return Promise.resolve(ICONS);
  // The single-file build inlines the plates as data URIs on
  // globalThis.__ICON_DATA; otherwise we fetch them from assets/icons/.
  const inlined = globalThis.__ICON_DATA || null;
  const one = (name) => new Promise((res) => {
    try {
      const im = new Image();
      im.onload = () => { ICONS[name] = im; res(); };
      im.onerror = () => res();
      im.src = (inlined && inlined[name]) || (base + name + '.png');
    } catch { res(); }
  });
  let timer = null;
  const all = Promise.all(ICON_NAMES.map(one)).then(() => ICONS);
  const bail = new Promise((res) => { timer = setTimeout(() => res(ICONS), timeoutMs); });
  return Promise.race([all, bail]).then((r) => { clearTimeout(timer); return r; });
}
