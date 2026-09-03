// ============================================================
// HELL TRAIN — GLOBAL NAVIGATION
// Centralizes chrome actions shared by every canvas page so a page
// cannot accidentally render a BACK / purse control without wiring it.
// ============================================================
import { KW, KH } from '../ui/kit.js';
import { saveSave } from './save.js';

const TOP = {
  back:   { x: 6, y: 7, w: 52, h: 24 },
  coins:  { x: KW - 116, y: 7, w: 52, h: 24 },
  shards: { x: KW - 60, y: 7, w: 54, h: 24 },
};

function hit(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function installGlobalNavigation(engine) {
  const canvas = engine.canvas;
  if (!canvas || canvas.__hellTrainNavigationInstalled) return;
  canvas.__hellTrainNavigationInstalled = true;

  const point = (e) => {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return {
      x: (e.clientX - r.left) / r.width * KW,
      y: (e.clientY - r.top) / r.height * KH,
    };
  };

  canvas.addEventListener('click', (e) => {
    const p = point(e);
    if (!p) return;
    const scene = engine.current;
    // Gameplay has its own pause/control layer; the shared menu chrome is
    // only authoritative on Page-based screens.
    if (!scene || !scene.save || scene.constructor?.name === 'GameplayScene') return;

    if (hit(p.x, p.y, TOP.back)) {
      e.preventDefault();
      e.stopPropagation();
      if (scene._goBack) scene._goBack();
      else engine.setScene('menu', { save: scene.save });
      return;
    }

    // Purse chips are intentionally useful navigation, not decoration.
    if (hit(p.x, p.y, TOP.coins) || hit(p.x, p.y, TOP.shards)) {
      e.preventDefault();
      e.stopPropagation();
      if (scene.constructor?.name !== 'CoinShopScene') {
        saveSave(scene.save);
        engine.setScene('coinShop', { save: scene.save, from: scene.constructor?.name || 'page' });
      }
    }
  }, true);
}
