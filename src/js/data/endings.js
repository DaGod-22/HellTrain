// ============================================================
// HELL TRAIN — ENDINGS & RELIC AWARDS
// Every realm has a story beat. The terminus worlds grant real
// ENDINGS; every first boss kill grants a permanent RELIC that
// you can carry into every run from the Relics screen.
// ============================================================

export const ENDINGS = [
  {
    id: 'first_departure', realm: 'purgatory', title: 'DEPARTURE',
    text: 'The fog parts. Somewhere ahead, the line keeps going. You are the conductor now — and the passengers are still waiting.',
  },
  {
    id: 'inferno_vow', realm: 'infernal', title: 'THE INFERNO VOW',
    text: 'You walked through fire and the fire learned your name. The train rolls on, its furnace humming a hymn.',
  },
  {
    id: 'bell_never_rings', realm: 'forgotten', title: 'THE BELL NEVER RINGS',
    text: 'The city forgot its bells. You will remember them for it — every mile, every stop, every echo.',
  },
  {
    id: 'rooted_no_more', realm: 'forest', title: 'ROOTED NO MORE',
    text: 'The Ancient Root spares you one glance. Freedom is a thing you take, not a thing you are given.',
  },
  {
    id: 'thaw', realm: 'frozen', title: 'THE THAW',
    text: 'The Frost King bows. For the first time in an age, something in the frozen realm begins to move.',
  },
  {
    id: 'dust_settles', realm: 'desert', title: 'WHEN THE DUST SETTLES',
    text: 'The Sand Titan crumbles into a monument. The desert keeps your silhouette. It does not let it go.',
  },
  {
    id: 'the_null_gap', realm: 'void', title: 'THE GAP',
    text: 'The Null looks at you and does not understand. You exist anyway. That is the entire trick.',
  },
  {
    id: 'end_of_the_line', realm: 'terminus', title: 'END OF THE LINE',
    text: 'You and your train face each other. Nobody has ever won this argument. You do. The Terminus is yours.',
  },
  {
    id: 'mire_queen', realm: 'dreadmarsh', title: 'THE MIRE QUEEN',
    text: 'The marsh bows its reeds. Beneath the water, something old and patient decides you are worthy of the road.',
  },
  {
    id: 'forge_rebuilt', realm: 'foundry', title: 'THE FORGE REBUILT',
    text: 'The Forge Titan falls into its own fires. The foundry begs for a new master. You do not stay. You never stay.',
  },
  {
    id: 'starfall', realm: 'starlight', title: 'STARFALL',
    text: 'The Star Eater becomes a constellation of fragments. The train passes through the wreckage of a god — and keeps moving.',
  },
  {
    id: 'phantom_echo', realm: 'phantom', title: 'THE PHANTOM ECHO',
    text: 'The Echoing Conductor speaks in your voice. It was you all along. It was always you.',
  },
];

export function findEnding(realmId) {
  return ENDINGS.find(e => e.realm === realmId) || null;
}

// First boss kill in a realm awards its relic — permanent meta power.
export const REALM_RELICS = {
  purgatory: 'broken_clock',      // +25% attack speed
  infernal: 'frozen_heart',       // frozen enemies generate shields
  forgotten: 'black_lantern',     // +35% vision
  forest: 'lost_crown',           // elites drop 2x loot
  frozen: 'railway_ticket',       // +50% XP near train
  desert: 'eye_of_void',          // map reveals nearby areas
  void: 'soul_urn',               // heal 1 hp per 5 kills
  terminus: 'void_compass',       // reveal boss room
  dreadmarsh: 'railway_ticket',
  foundry: 'lost_crown',
  starlight: 'black_lantern',
  phantom: 'void_compass',
};
