// ============================================================
// HELL TRAIN — TRAIN CARRIAGE MODULES (permanent loadout)
// Choose two modules on the train base. They permanently shape
// every run — this is the "build your train" meta.
// ============================================================

export const TRAIN_CARRIAGE_MODULES = [
  {
    id: 'gunsmith', name: 'Gun Car', icon: 'gun',
    desc: 'Starts with an extra mounted weapon.', tier: 2,
    apply: (train) => { train.mountRandomWeapon(); },
  },
  {
    id: 'ammo', name: 'Ammo Car', icon: 'fan',
    desc: 'All train weapons fire +25% faster.', tier: 2,
    apply: (train) => { train.fireRate *= 1.25; },
  },
  {
    id: 'medical', name: 'Medical Car', icon: 'cross',
    desc: 'Train repairs +4 HP/s.', tier: 2,
    apply: (train) => { train.repairRate = (train.repairRate || 0) + 4; },
  },
  {
    id: 'engine', name: 'Engine Car', icon: 'train',
    desc: 'Ultimate charges +35% faster.', tier: 2,
    apply: (train) => { train.energyRate *= 1.35; },
  },
  {
    id: 'loot', name: 'Vault Car', icon: 'coin',
    desc: '+30% coin loot from every kill.', tier: 2,
    apply: (train) => { train.lootBonus = (train.lootBonus || 0) + 0.3; },
  },
  {
    id: 'plating', name: 'Plated Car', icon: 'shield',
    desc: '+250 train HP and +6 armour.', tier: 2,
    apply: (train) => { train.maxHp += 250; train.hp += 250; train.armour += 6; },
  },
];

export const DEFAULT_TRAIN_CARRIAGES = ['gunsmith', 'medical'];

export function applyTrainCarriages(train, save) {
  const loadout = Array.isArray(save?.trainCarriages) ? save.trainCarriages.slice(0, 2) : DEFAULT_TRAIN_CARRIAGES;
  train.carriageLoadout = loadout.slice();
  for (const id of loadout) {
    const mod = TRAIN_CARRIAGE_MODULES.find(m => m.id === id);
    if (mod) {
      try { mod.apply(train); } catch {}
    }
  }
  return train.carriageLoadout;
}
