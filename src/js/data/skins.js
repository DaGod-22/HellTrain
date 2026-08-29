// ============================================================
// HELL TRAIN — SKINS
// Fully pixelated + animated skins for the Conductor and the Train.
// Each skin is a palette + feature set; the art forge (art.js)
// bakes complete animation sets from these definitions.
// ============================================================

export const CHAR_SKINS = [
  {
    id: 'conductor', name: 'The Conductor', cost: 0, rarity: 'common',
    desc: 'The original ticketmaster of the damned.',
    pal: { coat: '#3a2f57', coatDark: '#241a3a', trim: '#c8a030', metal: '#7c7c98',
      skin: '#c89a6a', glow: '#ffd05a', accent: '#985ce0', cloth: '#5a4a78' },
    aura: null, trail: '#ffd05a', cape: 'coat', hat: 'cap', emblem: 'lamp',
  },
  {
    id: 'ashen_warden', name: 'Ashen Warden', cost: 900, rarity: 'uncommon',
    desc: 'Plate armour cooled from the Infernal Fields. Still smoking.',
    pal: { coat: '#5a2318', coatDark: '#2c0f0c', trim: '#ff7a1a', metal: '#8a5a4a',
      skin: '#b0704a', glow: '#ff6a2a', accent: '#ff4d26', cloth: '#7a3020' },
    aura: 'ember', trail: '#ff6a2a', cape: 'tattered', hat: 'horns', emblem: 'ember',
  },
  {
    id: 'frost_marshal', name: 'Frost Marshal', cost: 1400, rarity: 'rare',
    desc: 'Breath of the Frozen Realm, worn as a uniform.',
    pal: { coat: '#2b4a70', coatDark: '#14243c', trim: '#a8d4f4', metal: '#9cb4d0',
      skin: '#cfd6e8', glow: '#8ef0ff', accent: '#5788c4', cloth: '#3d6698' },
    aura: 'frost', trail: '#a8d4f4', cape: 'coat', hat: 'cap', emblem: 'crystal',
  },
  {
    id: 'void_reaper', name: 'Void Reaper', cost: 2200, rarity: 'epic',
    desc: 'Something wearing a conductor’s uniform. Not someone.',
    pal: { coat: '#2a1240', coatDark: '#120722', trim: '#bc84f4', metal: '#6a5a90',
      skin: '#1d1230', glow: '#c07aff', accent: '#7a44c0', cloth: '#3d1c60' },
    aura: 'void', trail: '#bc84f4', cape: 'tattered', hat: 'hood', emblem: 'rift',
  },
  {
    id: 'gilded_baron', name: 'Gilded Baron', cost: 3000, rarity: 'epic',
    desc: 'Paid for the railway. Then paid to leave it.',
    pal: { coat: '#7a5c18', coatDark: '#3a2a08', trim: '#ffe878', metal: '#e8c848',
      skin: '#e0b078', glow: '#ffe878', accent: '#ffc040', cloth: '#a07c24' },
    aura: 'gold', trail: '#ffe878', cape: 'coat', hat: 'top', emblem: 'coin',
  },
  {
    id: 'neon_specter', name: 'Neon Specter', cost: 4200, rarity: 'legendary',
    desc: 'A ghost rendered in 400 nits of bad decisions.',
    pal: { coat: '#161a2e', coatDark: '#0a0c18', trim: '#2ff0ff', metal: '#4a5878',
      skin: '#e8f4ff', glow: '#2ff0ff', accent: '#ff2fa8', cloth: '#252c4a' },
    aura: 'neon', trail: '#2ff0ff', cape: 'coat', hat: 'visor', emblem: 'circuit',
  },
  {
    id: 'bone_prelate', name: 'Bone Prelate', cost: 5200, rarity: 'legendary',
    desc: 'Ordained by the Terminus. Preaches only timetables.',
    pal: { coat: '#20241c', coatDark: '#0e120c', trim: '#c0ff90', metal: '#b8c0a0',
      skin: '#e8e4d0', glow: '#98e066', accent: '#5a9c33', cloth: '#38402c' },
    aura: 'plague', trail: '#98e066', cape: 'tattered', hat: 'mitre', emblem: 'skull',
  },
  {
    id: 'ragnarok', name: 'RAGNARÖK HERALD', cost: 9000, rarity: 'mythic',
    desc: 'Unlocked by those who ran the Apocalypse Protocol and lived.',
    pal: { coat: '#3a0d18', coatDark: '#170408', trim: '#ff2a2a', metal: '#c8c0d8',
      skin: '#ffd0a0', glow: '#ff3a2a', accent: '#ffe066', cloth: '#6b1520' },
    aura: 'apocalypse', trail: '#ff3a2a', cape: 'tattered', hat: 'crown', emblem: 'omega',
  },
];

export const TRAIN_SKINS = [
  {
    id: 'iron_horse', name: 'Iron Horse', cost: 0, rarity: 'common',
    desc: 'Boiler, iron, spite.',
    pal: { body: '#3d3d4d', bodyDark: '#1c1c24', trim: '#c8a030', metal: '#8a8aa0',
      glow: '#ff9033', glass: '#7ab0e0', wheel: '#4a4a5c', smoke: '#8a8aa0' },
    furnace: 'fire', smokeCol: '#9a9ab0', plume: 'steam',
  },
  {
    id: 'hellfire_express', name: 'Hellfire Express', cost: 1200, rarity: 'uncommon',
    desc: 'Runs on screaming. Very fuel efficient.',
    pal: { body: '#5c1810', bodyDark: '#2a0a08', trim: '#ff9a2a', metal: '#a05a3a',
      glow: '#ff4d26', glass: '#ffb040', wheel: '#5c2418', smoke: '#ff6a33' },
    furnace: 'fire', smokeCol: '#ff7a33', plume: 'fire',
  },
  {
    id: 'glacier_crown', name: 'Glacier Crown', cost: 1800, rarity: 'rare',
    desc: 'Hauled out of a frozen lake, still ticking.',
    pal: { body: '#2b4a70', bodyDark: '#14243c', trim: '#d4ecff', metal: '#7ab0e0',
      glow: '#8ef0ff', glass: '#d4ecff', wheel: '#1e3350', smoke: '#cfe8ff' },
    furnace: 'ice', smokeCol: '#cfe8ff', plume: 'frost',
  },
  {
    id: 'void_serpent', name: 'Void Serpent', cost: 2600, rarity: 'epic',
    desc: 'The rails are a suggestion. Space is a suggestion.',
    pal: { body: '#2a1240', bodyDark: '#120722', trim: '#bc84f4', metal: '#6a5a90',
      glow: '#c07aff', glass: '#dcb4ff', wheel: '#241040', smoke: '#985ce0' },
    furnace: 'void', smokeCol: '#985ce0', plume: 'void',
  },
  {
    id: 'gilded_reliquary', name: 'Gilded Reliquary', cost: 3400, rarity: 'epic',
    desc: 'A cathedral that decided to become a locomotive.',
    pal: { body: '#7a5c18', bodyDark: '#3a2a08', trim: '#ffe878', metal: '#e8c848',
      glow: '#ffe878', glass: '#fff0a0', wheel: '#5c4410', smoke: '#e8d090' },
    furnace: 'holy', smokeCol: '#ffe878', plume: 'gold',
  },
  {
    id: 'neon_bullet', name: 'Neon Bullet', cost: 4600, rarity: 'legendary',
    desc: 'Mag-lev heresy. 0 to damned in 2.4 seconds.',
    pal: { body: '#161a2e', bodyDark: '#0a0c18', trim: '#2ff0ff', metal: '#4a5878',
      glow: '#2ff0ff', glass: '#ff2fa8', wheel: '#252c4a', smoke: '#2ff0ff' },
    furnace: 'plasma', smokeCol: '#2ff0ff', plume: 'neon',
  },
  {
    id: 'bone_locomotive', name: 'Bone Locomotive', cost: 5800, rarity: 'legendary',
    desc: 'Assembled from every passenger who missed their stop.',
    pal: { body: '#c8c0a8', bodyDark: '#6a6450', trim: '#98e066', metal: '#e8e4d0',
      glow: '#98e066', glass: '#c0ff90', wheel: '#7a7460', smoke: '#c0ff90' },
    furnace: 'plague', smokeCol: '#98e066', plume: 'plague',
  },
  {
    id: 'ragnarok_engine', name: 'RAGNARÖK ENGINE', cost: 12000, rarity: 'mythic',
    desc: 'The final chassis. Burns realities as coal.',
    pal: { body: '#3a0d18', bodyDark: '#170408', trim: '#ff2a2a', metal: '#c8c0d8',
      glow: '#ff3a2a', glass: '#ffe066', wheel: '#2a0810', smoke: '#ff3a2a' },
    furnace: 'apocalypse', smokeCol: '#ff3a2a', plume: 'apocalypse',
  },
];

export const findCharSkin = (id) => CHAR_SKINS.find(s => s.id === id) || CHAR_SKINS[0];
export const findTrainSkin = (id) => TRAIN_SKINS.find(s => s.id === id) || TRAIN_SKINS[0];
