// ============================================================
// HELL TRAIN — INFINITE procedural map generation
// AAA scale: truly infinite, chunk-based, with biomes, POIs, tracks
// ============================================================
import { RNG, randInt } from './utils.js';
import { REALM_ROSTERS } from '../data/enemies.js';

const TILE = 16;
export const TILE_SIZE = TILE;

export const T = {
  EMPTY: 0, FLOOR: 1, WALL: 2, TREE: 3, ROCK: 4,
  WATER: 5, LAVA: 6, ICE: 7, SAND: 8, VOID: 9,
  ASH: 10, SNOW: 11, TRACK: 12, PLATFORM: 13,
};

const BIOMES = {
  purgatory: { ground: T.FLOOR, decor: [T.TREE, T.ROCK], hazard: T.WATER, fog: 0.5, color: '#2a1f3c' },
  infernal:  { ground: T.ASH, decor: [T.ROCK, T.LAVA], hazard: T.LAVA, fog: 0.0, color: '#3a1710' },
  forgotten: { ground: T.FLOOR, decor: [T.ROCK, T.WALL], hazard: T.WATER, fog: 0.2, color: '#222234' },
  forest:    { ground: T.FLOOR, decor: [T.TREE, T.TREE], hazard: T.WATER, fog: 0.3, color: '#182e1c' },
  frozen:    { ground: T.ICE, decor: [T.ROCK, T.SNOW], hazard: T.ICE, fog: 0.4, color: '#1e3450' },
  desert:    { ground: T.SAND, decor: [T.ROCK, T.ROCK], hazard: T.SAND, fog: 0.1, color: '#4c391f' },
  void:      { ground: T.VOID, decor: [T.VOID, T.VOID], hazard: T.VOID, fog: 0.0, color: '#140c2c' },
  terminus:  { ground: T.PLATFORM, decor: [T.WALL], hazard: T.VOID, fog: 0.0, color: '#222226' },
  phantom:   { ground: T.VOID, decor: [T.VOID, T.VOID], hazard: T.VOID, fog: 0.6, color: '#1c1034' },
  // NEW SECTORS
  dreadmarsh: { ground: T.FLOOR, decor: [T.TREE, T.ROCK], hazard: T.WATER, fog: 0.6, color: '#1a2a1a' },
  foundry: { ground: T.ASH, decor: [T.WALL, T.ROCK], hazard: T.LAVA, fog: 0.1, color: '#2a1a10' },
  starlight: { ground: T.VOID, decor: [T.PLATFORM, T.VOID], hazard: T.VOID, fog: 0.0, color: '#0e102a' },
};

const CHUNK = 32; // tiles per chunk
const CHUNK_WORLD = CHUNK * TILE;

// Simple hash for deterministic random
function hash2(x, y, seed) {
  let h = seed ^ (x * 374761393) ^ (y * 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}
function hash3(x, y, z) {
  let h = (x * 73856093) ^ (y * 19349663) ^ (z * 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

export class World {
  constructor(seed, realmId, difficulty) {
    this.seed = seed >>> 0;
    this.rng = new RNG(this.seed);
    this.realmId = realmId;
    this.difficulty = difficulty;
    this.biome = BIOMES[realmId] || BIOMES.purgatory;
    this.chunks = new Map(); // key -> {tiles, solid, doodad, lights}
    this.lights = []; // global lights (accumulated from chunks)
    this.rooms = []; // pseudo rooms for compatibility
    this.specials = {};
    this.W = 100000; // fake large for old code that checks W/H, but infinite logic ignores it
    this.H = 100000;
    this.tiles = null; // not used in infinite mode, but keep for compat
    this.solid = null;
    // Infinite: player spawn at 0,0
    this.playerSpawn = { x: 0, y: 0 };
    this.bossSpawn = { x: 0, y: 0 };
    this.bossRoomId = 'infinite_boss';
    // Pre-generate spawn area
    this._ensureArea(0, 0, 5);
    // Clear spawn
    this._clearSpawn();
    // Generate some fake rooms for minimap / legacy
    this._generateLegacyRooms();
  }

  _key(cx, cy) { return cx + ',' + cy; }

  _ensureArea(wx, wy, radiusChunks = 3) {
    const ccx = Math.floor(wx / CHUNK_WORLD);
    const ccy = Math.floor(wy / CHUNK_WORLD);
    for (let dy = -radiusChunks; dy <= radiusChunks; dy++) {
      for (let dx = -radiusChunks; dx <= radiusChunks; dx++) {
        this._getOrGenChunk(ccx + dx, ccy + dy);
      }
    }
  }

  _getOrGenChunk(cx, cy) {
    const k = this._key(cx, cy);
    if (this.chunks.has(k)) return this.chunks.get(k);
    const chunk = this._genChunk(cx, cy);
    this.chunks.set(k, chunk);
    // add its lights to global
    for (const l of chunk.lights) this.lights.push(l);
    // prune old chunks if too many (keep last 100)
    if (this.chunks.size > 120) {
      const first = this.chunks.keys().next().value;
      const old = this.chunks.get(first);
      // remove its lights
      if (old) {
        for (const l of old.lights) {
          const idx = this.lights.indexOf(l);
          if (idx >= 0) this.lights.splice(idx, 1);
        }
      }
      this.chunks.delete(first);
    }
    return chunk;
  }

  _genChunk(cx, cy) {
    const seed = this.seed;
    const h = hash2(cx, cy, seed);
    const rng = new RNG(h);
    const tiles = new Uint8Array(CHUNK * CHUNK);
    const solid = new Uint8Array(CHUNK * CHUNK);
    const doodad = new Uint8Array(CHUNK * CHUNK);
    const lights = [];
    const biome = this.biome;

    // Base ground
    for (let i = 0; i < CHUNK * CHUNK; i++) tiles[i] = biome.ground;

    // Distance from spawn for difficulty scaling
    const distFromSpawn = Math.sqrt(cx * cx + cy * cy);

    // Generate terrain features using noise-like patterns
    for (let ly = 0; ly < CHUNK; ly++) {
      for (let lx = 0; lx < CHUNK; lx++) {
        const wx = cx * CHUNK + lx;
        const wy = cy * CHUNK + ly;
        const idx = ly * CHUNK + lx;
        const worldX = wx * TILE;
        const worldY = wy * TILE;

        // Hash for this tile
        const th = hash3(wx, wy, seed);
        const r = (th & 0xFF) / 255;

        // Spawn safe zone: 12 tile radius clear
        const dSpawn = Math.sqrt(wx * wx + wy * wy);
        if (dSpawn < 12) {
          tiles[idx] = biome.ground;
          solid[idx] = 0;
          continue;
        }

        // Large scale noise for walls / forests
        const noise = Math.sin(wx * 0.1) * Math.cos(wy * 0.1) + Math.sin(wx * 0.05 + wy * 0.07) * 0.5;
        const noise2 = Math.sin(wx * 0.23) * Math.cos(wy * 0.19);

        // Chance of obstacle increases with distance
        let obstacleChance = 0.06 + distFromSpawn * 0.0015;
        if (this.realmId === 'forest' || this.realmId === 'dreadmarsh') obstacleChance = 0.12;
        if (this.realmId === 'foundry') obstacleChance = 0.10;
        if (this.realmId === 'void' || this.realmId === 'starlight') obstacleChance = 0.04;

        if (r < obstacleChance) {
          // pick decor
          const decor = rng.pick(biome.decor);
          tiles[idx] = decor;
          if (decor === T.TREE || decor === T.ROCK || decor === T.WALL) solid[idx] = 1;
          else solid[idx] = 0;
          doodad[idx] = rng.int(0, 3);
          // occasional light
          if (r < 0.01 && (decor === T.LAVA || this.realmId === 'infernal' || this.realmId === 'foundry')) {
            lights.push({ x: worldX + 8, y: worldY + 8, radius: 80, color: '#ff7a33' });
          }
        } else if (r < obstacleChance + 0.03) {
          // hazard
          if (biome.hazard !== biome.ground && rng.chance(0.5)) {
            tiles[idx] = biome.hazard;
            solid[idx] = (biome.hazard === T.WALL) ? 1 : 0;
          }
        } else {
          // occasional track remnants for hell-train vibe
          if (rng.chance(0.008) && Math.abs(noise) > 0.7) {
            tiles[idx] = T.TRACK;
          }
        }

        // Add some procedural walls forming ruins
        if (Math.abs(noise) > 0.85 && rng.chance(0.3)) {
          tiles[idx] = T.WALL;
          solid[idx] = 1;
        }
        // Void sparkles
        if (biome.ground === T.VOID && r < 0.02) {
          doodad[idx] = 1;
        }
      }
    }

    // Add POIs: small ruined rooms / treasure spots
    if (rng.chance(0.25)) {
      const rx = rng.int(4, CHUNK - 12);
      const ry = rng.int(4, CHUNK - 12);
      const rw = rng.int(6, 12);
      const rh = rng.int(5, 9);
      for (let y = ry; y < ry + rh; y++) {
        for (let x = rx; x < rx + rw; x++) {
          const idx = y * CHUNK + x;
          if (x === rx || y === ry || x === rx + rw - 1 || y === ry + rh - 1) {
            if (rng.chance(0.7)) { tiles[idx] = T.WALL; solid[idx] = 1; }
          } else {
            tiles[idx] = biome.ground;
            solid[idx] = 0;
          }
        }
      }
      // door gap
      const side = rng.int(0, 3);
      if (side === 0) { const idx = ry * CHUNK + rx + Math.floor(rw / 2); tiles[idx] = biome.ground; solid[idx] = 0; }
      if (side === 1) { const idx = (ry + rh - 1) * CHUNK + rx + Math.floor(rw / 2); tiles[idx] = biome.ground; solid[idx] = 0; }
      if (side === 2) { const idx = (ry + Math.floor(rh / 2)) * CHUNK + rx; tiles[idx] = biome.ground; solid[idx] = 0; }
      if (side === 3) { const idx = (ry + Math.floor(rh / 2)) * CHUNK + rx + rw - 1; tiles[idx] = biome.ground; solid[idx] = 0; }
      lights.push({ x: (cx * CHUNK + rx + rw / 2) * TILE, y: (cy * CHUNK + ry + rh / 2) * TILE, radius: 120, color: '#fff0a0' });
    }

    return { tiles, solid, doodad, lights, cx, cy };
  }

  _clearSpawn() {
    const radius = 14;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const wx = dx, wy = dy;
        const cx = Math.floor(wx / CHUNK);
        const cy = Math.floor(wy / CHUNK);
        const chunk = this._getOrGenChunk(cx, cy);
        const lx = ((wx % CHUNK) + CHUNK) % CHUNK;
        const ly = ((wy % CHUNK) + CHUNK) % CHUNK;
        const idx = ly * CHUNK + lx;
        chunk.tiles[idx] = this.biome.ground;
        chunk.solid[idx] = 0;
      }
    }
  }

  _generateLegacyRooms() {
    // For minimap / compatibility, create virtual rooms spread infinitely
    // Player can discover them as they explore
    this.rooms = [
      { x: -7, y: -5, w: 14, h: 10, id: 'start', kind: 'start' },
    ];
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const dist = 40 + i * 18;
      this.rooms.push({
        x: Math.cos(ang) * dist,
        y: Math.sin(ang) * dist,
        w: 12 + (i % 3) * 3,
        h: 9 + (i % 2) * 3,
        id: 'poi_' + i,
        kind: i % 3 === 0 ? 'treasure' : i % 3 === 1 ? 'elite' : 'shop',
      });
    }
    this.specials = {};
    for (const r of this.rooms) {
      this.specials[r.id] = {
        x: (r.x + r.w / 2) * TILE,
        y: (r.y + r.h / 2) * TILE,
        w: r.w * TILE, h: r.h * TILE, kind: r.kind, room: r,
      };
    }
  }

  // Compatibility: old code expects tiles array, but we now use chunks
  _worldToChunk(wx, wy) {
    const tx = Math.floor(wx / TILE);
    const ty = Math.floor(wy / TILE);
    const cx = Math.floor(tx / CHUNK);
    const cy = Math.floor(ty / CHUNK);
    const lx = ((tx % CHUNK) + CHUNK) % CHUNK;
    const ly = ((ty % CHUNK) + CHUNK) % CHUNK;
    return { cx, cy, lx, ly, tx, ty };
  }

  isSolidWorld(x, y) {
    const { cx, cy, lx, ly } = this._worldToChunk(x, y);
    const chunk = this._getOrGenChunk(cx, cy);
    if (!chunk) return true;
    return !!chunk.solid[ly * CHUNK + lx];
  }

  tileAtWorld(x, y) {
    const { cx, cy, lx, ly } = this._worldToChunk(x, y);
    const chunk = this._getOrGenChunk(cx, cy);
    if (!chunk) return T.WALL;
    return chunk.tiles[ly * CHUNK + lx];
  }

  // For renderer that wants doodad variant
  doodadAtWorld(x, y) {
    const { cx, cy, lx, ly } = this._worldToChunk(x, y);
    const chunk = this._getOrGenChunk(cx, cy);
    if (!chunk) return 0;
    return chunk.doodad ? chunk.doodad[ly * CHUNK + lx] : 0;
  }

  roomAtWorld(x, y) {
    // Return nearest POI if within
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    for (const r of this.rooms) {
      if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) return r;
    }
    return null;
  }

  pickEnemyRoster(stage) {
    const roster = REALM_ROSTERS[this.realmId] || REALM_ROSTERS.purgatory;
    return roster.slice();
  }

  // Infinite: ensure chunks around a point are loaded (call each frame from gameplay)
  ensureAround(x, y, radius = 4) {
    this._ensureArea(x, y, radius);
  }
}
