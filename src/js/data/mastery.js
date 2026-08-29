// ============================================================
// HELL TRAIN — WEAPON FAMILY MASTERY (v1.4)
// A fixed, visible track per weapon family. Kills made with a
// family count forever (saved), crossing fixed milestones:
//   MASTERY I..V — each grants a small permanent damage bonus to
//   that family, and the bonus feeds the level-5 EVOLUTION:
//   an evolved weapon inherits every mastery bonus earned.
// No randomness: the number you see is the number you get.
// ============================================================

// Kills needed for each milestone, and the damage bonus it grants.
export const MASTERY_STEPS = [40, 120, 260, 450, 700];
export const MASTERY_BONUS = [0.04, 0.08, 0.12, 0.17, 0.22];

export const FAMILY_INFO = {
  fire: { name: 'Fire', color: '#ff7a33', icon: 'fire', blurb: 'Burns over time.' },
  ice: { name: 'Frost', color: '#7ec8ff', icon: 'ice', blurb: 'Slows, then freezes.' },
  void: { name: 'Void', color: '#9b6dff', icon: 'void', blurb: 'Implodes and unravels.' },
  lightning: { name: 'Storm', color: '#fff066', icon: 'bolt', blurb: 'Arcs between foes.' },
  explosive: { name: 'Blast', color: '#ff9033', icon: 'bomb', blurb: 'Area detonations.' },
  plasma: { name: 'Plasma', color: '#2ff0ff', icon: 'gun', blurb: 'Rapid bursts.' },
  tech: { name: 'Tech', color: '#c0c8e0', icon: 'rail', blurb: 'Pierce and ricochet.' },
  orbital: { name: 'Orbit', color: '#d0d4e8', icon: 'blade', blurb: 'Blades that circle.' },
  holy: { name: 'Light', color: '#ffe878', icon: 'star', blurb: 'Nova waves, heals.' },
  toxic: { name: 'Plague', color: '#98e066', icon: 'toxic', blurb: 'Lingering pools.' },
  blood: { name: 'Blood', color: '#ff3a4a', icon: 'blood', blurb: 'Drinks what it kills.' },
  shadow: { name: 'Shadow', color: '#9c8ab8', icon: 'shadow', blurb: 'Passes through armour.' },
  spirit: { name: 'Spirit', color: '#a8d4f4', icon: 'echo', blurb: 'Returns to the hand.' },
  physical: { name: 'Force', color: '#d0d4e8', icon: 'crown', blurb: 'Raw impact.' },
  turret: { name: 'Siege', color: '#ff9a4a', icon: 'turret', blurb: 'Holds the ground.' },
  train: { name: 'Train', color: '#ffb040', icon: 'train', blurb: 'The iron horse.' },
};

export function familyColor(f) { return FAMILY_INFO[f]?.color || '#ffb040'; }
export function familyIcon(f) { return FAMILY_INFO[f]?.icon || 'star'; }
export function familyName(f) { return FAMILY_INFO[f]?.name || 'Arcane'; }

// Mastery level 0..5 from total kills.
export function masteryLevel(kills) {
  let lvl = 0;
  for (const s of MASTERY_STEPS) if ((kills || 0) >= s) lvl++;
  return lvl;
}

// The next milestone, or null when the track is complete.
export function nextMilestone(kills) {
  const lvl = masteryLevel(kills);
  if (lvl >= MASTERY_STEPS.length) return null;
  return { level: lvl + 1, need: MASTERY_STEPS[lvl], have: kills || 0 };
}

// Total damage multiplier this family earns from mastery (1.00 .. 1.63).
// Applied to run damage; an evolved weapon keeps every step earned.
export function masteryMult(kills) {
  let m = 1;
  for (let i = 0; i < masteryLevel(kills); i++) m += MASTERY_BONUS[i];
  return m;
}

// One-line status for cards: "MASTERY II · 84/120" or "MASTERY V".
export function masteryLabel(kills) {
  const lvl = masteryLevel(kills);
  if (lvl === 0) return 'MASTERY 0/5';
  const next = nextMilestone(kills);
  return next ? `MASTERY ${'12345'[lvl - 1]}→${'12345'[lvl]} · ${next.have}/${next.need}` : 'MASTERY V — COMPLETE';
}
