// ============================================================
// HELL TRAIN — WEAPON EVOLUTIONS
// When a weapon hits mastery level 5 it ASCENDS into a named,
// visually distinct, build-defining weapon. One evolution per
// core weapon; each carries its own playstyle hook.
// ============================================================

export const WEAPON_EVOLUTIONS = {
  fireball: {
    id: 'hellstorm', name: 'HELLSTORM', color: '#ff2a2a', tagline: 'BOLTS THAT BURN THE WORLD',
    apply: (w, p) => {
      w.evolved = true; w.evolution = 'hellstorm';
      w.name = 'HELLSTORM';
      w.color = '#ff2a2a';
      w.dmg = Math.round(w.dmg * 1.9);
      w.projCount = (w.projCount || 1) + 1;
      w.explode = true;
      w.explodeRadius = Math.max(w.explodeRadius || 26, 34);
      w.burn = (w.burn || 0) + 8;
      p.modMult('atkSpd', 1.08);
    },
  },
  orbital_blades: {
    id: 'eclipse_ring', name: 'ECLIPSE RING', color: '#c07aff', tagline: 'THE SUN IS A BLADE',
    apply: (w, p) => {
      w.evolved = true; w.evolution = 'eclipse_ring';
      w.name = 'ECLIPSE RING'; w.color = '#c07aff';
      w.dmg = Math.round(w.dmg * 1.8);
      w.baseCount = Math.min(4, (w.baseCount || 2) + 1);
      w.baseRadius = (w.baseRadius || 46) + 10;
      w.baseSpeed = (w.baseSpeed || 2.6) + 0.8;
      p.orbitBarrage = true; // blades fling outward on a timer (handled in player.update)
      p.orbitBarrageDmg = 24;
    },
  },
  plasma_blaster: {
    id: 'ion_stormfront', name: 'ION STORMFRONT', color: '#2ff0ff', tagline: 'CHAINED LIGHTNING ON EVERY SHOT',
    apply: (w, p) => {
      w.evolved = true; w.evolution = 'ion_stormfront';
      w.name = 'ION STORMFRONT'; w.color = '#2ff0ff';
      w.dmg = Math.round(w.dmg * 1.8);
      w.burstCount = (w.burstCount || 3) + 1;
      w.chainOnHit = true;
      p.chain = (p.chain || 0) + 1;
    },
  },
  lightning: {
    id: 'thunder_god', name: 'THUNDER GOD', color: '#fff066', tagline: 'THE SKY FOLLOWS YOU',
    apply: (w, p) => {
      w.evolved = true; w.evolution = 'thunder_god';
      w.name = 'THUNDER GOD'; w.color = '#fff066';
      w.dmg = Math.round(w.dmg * 2.0);
      w.jumps = Math.min(8, (w.jumps || 3) + 3);
      p.tempest = true;
      p.tempestDmg = 22;
    },
  },
  frost: {
    id: 'absolute_zero', name: 'ABSOLUTE ZERO', color: '#9cd8ff', tagline: 'WINTER IS AN ORDER',
    apply: (w, p) => {
      w.evolved = true; w.evolution = 'absolute_zero';
      w.name = 'ABSOLUTE ZERO'; w.color = '#9cd8ff';
      w.dmg = Math.round(w.dmg * 1.9);
      w.projCount = (w.projCount || 1) + 1;
      w.pierce = (w.pierce || 0) + 2;
      p.absoluteZero = true;
    },
  },
  flamethrower: {
    id: 'sun_breath', name: 'SUN BREATH', color: '#ffb040', tagline: 'A CORONA OF SOLAR FIRE',
    apply: (w, p) => {
      w.evolved = true; w.evolution = 'sun_breath';
      w.name = 'SUN BREATH'; w.color = '#ffb040';
      w.dmg = Math.round(w.dmg * 1.8);
      w.range = (w.range || 78) + 30;
      w.arc = Math.min(1.4, (w.arc || 0.7) + 0.5);
      w.burn = (w.burn || 0) + 8;
      p.burnDmg = (p.burnDmg || 0) + 8;
    },
  },
  void_bomb: {
    id: 'void_impact', name: 'VOID IMPACT', color: '#bc84f4', tagline: 'EVERY CRATER IS A GATEWAY',
    apply: (w, p) => {
      w.evolved = true; w.evolution = 'void_impact';
      w.name = 'VOID IMPACT'; w.color = '#bc84f4';
      w.dmg = Math.round(w.dmg * 1.9);
      w.explodeRadius = Math.min(84, (w.explodeRadius || 44) + 16);
      w.projCount = (w.projCount || 1) + 1;
      w.blackholeOnImpact = true;
    },
  },
  sawblade: {
    id: 'ghost_grinder', name: 'GHOST GRINDER', color: '#e0e0ff', tagline: 'IT NEVER STOPS RETURNING',
    apply: (w, p) => {
      w.evolved = true; w.evolution = 'ghost_grinder';
      w.name = 'GHOST GRINDER'; w.color = '#e0e0ff';
      w.dmg = Math.round(w.dmg * 1.8);
      w.bounces = Math.min(10, (w.bounces || 4) + 4);
      w.spin = (w.spin || 12) + 8;
      w.projCount = (w.projCount || 1) + 1;
    },
  },
  // ---- v1.4 evolutions: charge / deployable / echo ----
  arcane_lance: {
    id: 'star_lance', name: 'STARLANCE', color: '#ffd0ff', tagline: 'A STAR, ON A STICK',
    apply: (w, p) => {
      w.evolved = true; w.evolution = 'star_lance';
      w.name = 'STARLANCE'; w.color = '#ffd0ff';
      w.dmg = Math.round(w.dmg * 2.1);
      w.chargeTime = Math.max(0.9, (w.chargeTime || 1.7) - 0.4);
      w.explode = true;
      w.explodeRadius = 38;
      w.pierce = (w.pierce || 3) + 3;
      p.modMult('atkSpd', 1.05);
    },
  },
  sentry_kit: {
    id: 'fortress_protocol', name: 'FORTRESS PROTOCOL', color: '#ffb06a', tagline: 'THE GROUND FIGHTS BACK',
    apply: (w, p) => {
      w.evolved = true; w.evolution = 'fortress_protocol';
      w.name = 'FORTRESS PROTOCOL'; w.color = '#ffb06a';
      w.dmg = Math.round(w.dmg * 1.6);
      w.turretLife = (w.turretLife || 12) + 6;
      w.turretCd = Math.max(0.3, (w.turretCd || 0.55) - 0.1);
      // two turrets firing homing rockets (handled in the turret logic)
    },
  },
  echo_shard: {
    id: 'chorus', name: 'CHORUS', color: '#cfe8ff', tagline: 'EVERY SHOT, SUNG TWICE',
    apply: (w, p) => {
      w.evolved = true; w.evolution = 'chorus';
      w.name = 'CHORUS'; w.color = '#cfe8ff';
      w.echoMult = 1.0;
      w.echoDelay = Math.max(0.3, (w.echoDelay || 0.7) - 0.15);
    },
  },
};

export function findEvolution(weaponId) {
  return WEAPON_EVOLUTIONS[weaponId] || null;
}
