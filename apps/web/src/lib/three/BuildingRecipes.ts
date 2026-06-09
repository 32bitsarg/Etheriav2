type Grid = number[][][]; // [y][z][x]

function empty(w: number, h: number, d: number): Grid {
  return Array.from({ length: h }, () =>
    Array.from({ length: d }, () => new Array(w).fill(0))
  );
}

function set(g: Grid, x: number, z: number, ys: number[], m: number) {
  for (const y of ys) {
    if (g[y]?.[z]?.[x] !== undefined) g[y][z][x] = m;
  }
}

function wall(g: Grid, x1: number, z1: number, x2: number, z2: number, y1: number, y2: number, m: number) {
  for (let x = x1; x <= x2; x++)
    for (let z = z1; z <= z2; z++)
      set(g, x, z, Array.from({ length: y2 - y1 + 1 }, (_, i) => y1 + i), m);
}

function wallHollow(g: Grid, x1: number, z1: number, x2: number, z2: number, y1: number, y2: number, m: number) {
  for (let x = x1; x <= x2; x++) set(g, x, z1, Array.from({ length: y2 - y1 + 1 }, (_, i) => y1 + i), m);
  for (let x = x1; x <= x2; x++) set(g, x, z2, Array.from({ length: y2 - y1 + 1 }, (_, i) => y1 + i), m);
  for (let z = z1; z <= z2; z++) set(g, x1, z, Array.from({ length: y2 - y1 + 1 }, (_, i) => y1 + i), m);
  for (let z = z1; z <= z2; z++) set(g, x2, z, Array.from({ length: y2 - y1 + 1 }, (_, i) => y1 + i), m);
}

function windows(g: Grid, x1: number, z1: number, x2: number, z2: number, y1: number, y2: number, wm: number, gm: number) {
  for (let y = y1; y <= y2; y++) {
    for (let z = z1; z <= z2; z++) {
      for (let x = x1; x <= x2; x++) {
        if (x === x1 || x === x2 || z === z1 || z === z2) set(g, x, z, [y], wm);
        else set(g, x, z, [y], gm);
      }
    }
  }
}

function steppedRoof(g: Grid, x1: number, z1: number, x2: number, z2: number, yBase: number, steps: number, m: number) {
  for (let s = 0; s < steps; s++) {
    const sx1 = x1 + s;
    const sz1 = z1 + s;
    const sx2 = x2 - s;
    const sz2 = z2 - s;
    const y = yBase + s;
    for (let x = sx1; x <= sx2; x++) {
      for (let z = sz1; z <= sz2; z++) {
        if (g[y]?.[z]?.[x] !== undefined) g[y][z][x] = g[y][z][x] === 0 || g[y][z][x] === m ? m : g[y][z][x];
      }
    }
  }
}

function flatFloor(g: Grid, x1: number, z1: number, x2: number, z2: number, y: number, m: number) {
  for (let x = x1; x <= x2; x++)
    for (let z = z1; z <= z2; z++)
      set(g, x, z, [y], m);
}

function pillar(g: Grid, x: number, z: number, y1: number, y2: number, m: number) {
  for (let y = y1; y <= y2; y++) set(g, x, z, [y], m);
}

function pyramidRoof(g: Grid, x1: number, z1: number, x2: number, z2: number, yBase: number, m: number) {
  const w = x2 - x1 + 1;
  const d = z2 - z1 + 1;
  const steps = Math.ceil(Math.max(w, d) / 2);
  steppedRoof(g, x1, z1, x2, z2, yBase, steps, m);
}

// ─── Recipes ───────────────────────────────────────────────────────────────

export type BuildingRecipe = (tier: number, gridW: number, gridD: number, gridH: number) => Grid;

const RECIPES: Record<string, BuildingRecipe> = {
  TOWN_HALL: (tier, w, d, h) => {
    const g = empty(w, d, h);
    const baseH = 2 + tier * 2;
    const roofStart = baseH + 1;
    const maxRoof = roofStart + Math.ceil(tier / 2) + 2;

    // Foundation
    flatFloor(g, 0, 0, w - 1, d - 1, 0, 6);
    wallHollow(g, 1, 1, w - 2, d - 2, 1, baseH, 1);
    // Floor separators
    for (let fh = 4; fh <= baseH; fh += 4) flatFloor(g, 1, 1, w - 2, d - 2, fh, 5);
    // Windows on front wall
    windows(g, 3, 1, 5, 1, 3, 3, 1, 4);
    windows(g, w - 6, 1, w - 4, 1, 3, 3, 1, 4);
    // Double door
    set(g, Math.floor(w / 2), 1, [1, 2], 0); // empty door hole
    // Corner pillars
    pillar(g, 2, 2, 1, baseH, 3);
    pillar(g, w - 3, 2, 1, baseH, 3);
    pillar(g, 2, d - 3, 1, baseH, 3);
    pillar(g, w - 3, d - 3, 1, baseH, 3);
    // Central tower
    const tw = Math.floor(w / 2) - 2;
    wallHollow(g, tw, d - 3, w - tw - 1, d - 1, roofStart, maxRoof - 1, 1);
    windows(g, tw + 1, d - 1, w - tw - 2, d - 1, roofStart + 1, roofStart + 1, 1, 4);
    // Roof (stepped)
    steppedRoof(g, 1, 1, w - 2, d - 2, roofStart, Math.ceil(tier / 2) + 1, 2);
    steppedRoof(g, tw, d - 3, w - tw - 1, d - 1, maxRoof, Math.ceil(tier / 3) + 1, 2);
    // Tower flag
    if (tier >= 3) set(g, Math.floor(w / 2), d - 1, [maxRoof + 2, maxRoof + 3], 3);
    return g;
  },

  TOWER: (tier, w, d, h) => {
    const g = empty(w, d, h);
    const tw = w;
    const td = d;
    const towerH = 5 + tier * 3;
    const roofStart = towerH + 1;
    flatFloor(g, 0, 0, tw - 1, td - 1, 0, 6);
    wallHollow(g, 0, 0, tw - 1, td - 1, 1, towerH, 1);
    // Narrow windows every 3 levels
    for (let wy = 3; wy <= towerH - 2; wy += 3) {
      set(g, 0, Math.floor(td / 2), [wy], 4);
      set(g, tw - 1, Math.floor(td / 2), [wy], 4);
    }
    // Tapered top
    if (tier >= 3) {
      wallHollow(g, 1, 1, tw - 2, td - 2, towerH - 2, towerH, 1);
    }
    // Roof
    pyramidRoof(g, 0, 0, tw - 1, td - 1, roofStart, 2);
    // Flag
    set(g, Math.floor(tw / 2), Math.floor(td / 2), [roofStart + 3], 3);
    return g;
  },

  BARRACKS: (tier, w, d, h) => {
    const g = empty(w, d, h);
    const baseH = 3 + tier;
    const roofY = baseH + 1;
    const hallD = Math.floor(d * 0.6);
    flatFloor(g, 0, 0, w - 1, d - 1, 0, 6);
    // Main hall
    wallHollow(g, 1, 1, w - 2, hallD - 1, 1, baseH, 1);
    // Windows
    for (let wx = 3; wx <= w - 4; wx += 3) set(g, wx, 1, [3], 4);
    // Roof
    steppedRoof(g, 1, 0, w - 2, hallD, roofY, Math.ceil(tier / 2) + 2, 2);
    // Training yard
    flatFloor(g, 1, hallD + 1, w - 2, d - 2, 1, 6);
    // Fence around yard
    for (let x = 1; x <= w - 2; x++) set(g, x, d - 2, [1, 2], 5);
    for (let z = hallD + 1; z <= d - 2; z++) set(g, 1, z, [1, 2], 5);
    for (let z = hallD + 1; z <= d - 2; z++) set(g, w - 2, z, [1, 2], 5);
    // Weapon rack
    if (tier >= 2) set(g, Math.floor(w / 2), 1, [1, 2], 3);
    // Corner towers
    if (tier >= 4) {
      wallHollow(g, 0, hallD - 1, 2, hallD + 1, baseH + 1, baseH + 3, 1);
      wallHollow(g, w - 3, hallD - 1, w - 1, hallD + 1, baseH + 1, baseH + 3, 1);
    }
    return g;
  },

  STABLE: (tier, w, d, h) => {
    const g = empty(w, d, h);
    const baseH = 3 + tier;
    flatFloor(g, 0, 0, w - 1, d - 1, 0, 6);
    // Building
    wallHollow(g, 1, 1, w - 2, d - 2, 1, baseH, 1);
    // Open front side
    for (let x = 2; x <= w - 3; x++) {
      set(g, x, 1, [1, 2], 0); // door size opening
    }
    pillar(g, 1, 1, 1, baseH, 5);
    pillar(g, w - 2, 1, 1, baseH, 5);
    // Roof (slanted)
    steppedRoof(g, 1, 1, w - 2, d - 2, baseH + 1, Math.ceil(tier / 2) + 2, 2);
    // Hay pile outside
    if (tier >= 1) {
      set(g, Math.floor(w / 2), d - 1, [2, 3], 3);
      set(g, Math.floor(w / 2) - 1, d - 1, [2], 3);
      set(g, Math.floor(w / 2) + 1, d - 1, [2], 3);
    }
    // Fence
    for (let x = 0; x <= w - 1; x++) { set(g, x, 0, [1], 5); set(g, x, d - 1, [1], 5); }
    for (let z = 0; z <= d - 1; z++) { set(g, 0, z, [1], 5); set(g, w - 1, z, [1], 5); }
    return g;
  },

  FARM: (tier, w, d, h) => {
    const g = empty(w, d, h);
    const houseW = Math.max(4, Math.floor(w * 0.4));
    const houseD = Math.max(4, Math.floor(d * 0.5));
    const houseH = 3 + tier;
    // Farmland
    flatFloor(g, 0, 0, w - 1, d - 1, 1, 3); // green fields
    // Farmhouse
    wallHollow(g, 0, 0, houseW - 1, houseD - 1, 1, houseH, 1);
    set(g, Math.floor(houseW / 2), 0, [1, 2], 0); // door
    set(g, 1, -1 !== houseD - 1 ? houseD - 1 : 0, [3], 4); // window
    steppedRoof(g, 0, 0, houseW - 1, houseD - 1, houseH + 1, 2, 2);
    // Silo
    const sx = w - 3;
    const sz = d - 3;
    const siloH = 5 + tier;
    for (let y = 1; y <= siloH; y++) {
      set(g, sx, sz, [y], 5);
      set(g, sx, sz - 1, [y], 5);
    }
    flatFloor(g, sx - 1, sz - 1, sx + 1, sz, siloH + 1, 5);
    // Barn
    if (tier >= 3) {
      wallHollow(g, w - 5, 0, w - 1, 2, 1, houseH, 1);
      steppedRoof(g, w - 5, 0, w - 1, 2, houseH + 1, 2, 2);
    }
    // Fence
    for (let x = 0; x <= w - 1; x++) set(g, x, d - 1, [2], 5);
    for (let z = 0; z <= d - 1; z++) set(g, w - 1, z, [2], 5);
    return g;
  },

  LIBRARY: (tier, w, d, h) => {
    const g = empty(w, d, h);
    const baseH = 3 + tier * 2;
    flatFloor(g, 0, 0, w - 1, d - 1, 0, 6);
    wallHollow(g, 1, 1, w - 2, d - 2, 1, baseH, 1);
    // Floors
    for (let fh = 4; fh <= baseH; fh += 4) flatFloor(g, 1, 1, w - 2, d - 2, fh, 5);
    // Arched windows on front
    for (let wx = 2; wx <= w - 3; wx += 3) {
      windows(g, wx, 1, wx + 1, 1, 2, 3, 1, 4);
      windows(g, wx, d - 2, wx + 1, d - 2, 2, 3, 1, 4);
    }
    // Door with arch
    set(g, Math.floor(w / 2), 1, [1, 2, 3], 0);
    set(g, Math.floor(w / 2) - 1, 1, [3], 1);
    set(g, Math.floor(w / 2) + 1, 1, [3], 1);
    // Dome/round roof approximation
    const midX = Math.floor(w / 2);
    const midZ = Math.floor(d / 2);
    for (let dy = baseH + 1; dy <= baseH + 5; dy++) {
      const r = Math.max(0, 5 - (dy - baseH));
      for (let dx = -r; dx <= r; dx++)
        for (let dz = -r; dz <= r; dz++)
          if (Math.sqrt(dx * dx + dz * dz) <= r + 0.5) set(g, midX + dx, midZ + dz, [dy], 2);
    }
    // Side wing
    if (tier >= 4) {
      wallHollow(g, w - 4, 1, w - 1, d - 2, 1, baseH - 2, 1);
      steppedRoof(g, w - 4, 1, w - 1, d - 2, baseH - 1, 2, 2);
    }
    return g;
  },

  GOLD_MINE: (tier, w, d, h) => {
    const g = empty(w, d, h);
    const entryH = 3 + tier;
    // Mine entrance
    wallHollow(g, 0, 0, 3, d - 1, 1, entryH, 1);
    set(g, 1, 0, [3, 4], 0); // tunnel opening
    set(g, 2, 0, [3, 4], 0);
    // Roof over entrance
    steppedRoof(g, 0, 0, 3, d - 1, entryH + 1, 2, 5);
    // Ore cart
    set(g, 4, 1, [1], 3);
    set(g, 4, 2, [1], 3);
    // Crane structure
    pillar(g, w - 2, 1, 1, entryH + 2, 5);
    set(g, w - 2, 1, [entryH + 3], 5);
    // Gold piles
    for (let gx = w - 3; gx <= w - 1; gx++) set(g, gx, d - 2, [1], 3);
    set(g, w - 2, d - 2, [2], 3);
    // Shaft going down
    set(g, Math.floor(w / 2), Math.floor(d / 2), [0], 0); // surface hole
    return g;
  },

  LUMBER_MILL: (tier, w, d, h) => {
    const g = empty(w, d, h);
    const baseH = 3 + tier;
    // Mill building
    wallHollow(g, 1, 1, w - 2, d - 2, 1, baseH, 1);
    // Open side
    for (let x = 2; x <= w - 3; x++) set(g, x, d - 2, [1, 2], 0);
    roof: steppedRoof(g, 1, 1, w - 2, d - 2, baseH + 1, Math.ceil(tier / 2) + 2, 2);
    // Water wheel (side)
    for (let wy = 1; wy <= 4; wy++) {
      set(g, w - 1, 1, [wy], 5);
      set(g, w - 1, 2, [wy], 5);
    }
    // Log piles
    for (let lx = 0; lx <= 1; lx++) {
      set(g, lx, d - 1, [1], 1);
      set(g, lx, d - 2, [1], 1);
    }
    // Saw blade
    set(g, Math.floor(w / 2), d - 1, [2, 3, 4], 3);
    return g;
  },

  QUARRY: (tier, w, d, h) => {
    const g = empty(w, d, h);
    // Open pit (stepped walls)
    const pitW = w - 4;
    const pitD = d - 4;
    const pitH = 2 + tier;
    for (let l = 0; l <= pitH; l++) {
      const px1 = 2 + l;
      const pz1 = 2 + l;
      const px2 = w - 3 - l;
      const pz2 = d - 3 - l;
      if (px2 >= px1 && pz2 >= pz1) {
        for (let x = px1; x <= px2; x++) { set(g, x, pz1, [l], 1); set(g, x, pz2, [l], 1); }
        for (let z = pz1; z <= pz2; z++) { set(g, px1, z, [l], 1); set(g, px2, z, [l], 1); }
      }
    }
    // Crane
    pillar(g, w - 2, 0, 1, pitH + 4, 5);
    set(g, w - 2, 0, [pitH + 4], 5);
    set(g, w - 3, 0, [pitH + 4], 5);
    // Stone blocks
    set(g, 0, d - 1, [1], 1);
    set(g, 1, d - 1, [1, 2], 1);
    return g;
  },

  MARKET: (tier, w, d, h) => {
    const g = empty(w, d, h);
    const baseH = 3 + tier;
    flatFloor(g, 0, 0, w - 1, d - 1, 0, 6);
    // Main building
    wallHollow(g, 0, 0, w - 1, d - 1, 1, baseH, 1);
    // Open front (stalls)
    for (let x = 2; x <= w - 3; x++) set(g, x, 0, [1], 0);
    pillar(g, 1, 0, 1, baseH, 5);
    pillar(g, w - 2, 0, 1, baseH, 5);
    // Stall counters
    flatFloor(g, 2, 0, w - 3, 0, 2, 5);
    // Awning/canopy
    for (let ax = 1; ax <= w - 2; ax++) {
      set(g, ax, -1 >= 0 ? 0 : 1, [3, 4], 3);
    }
    // Crates and barrels
    set(g, 1, d - 1, [1], 5);
    set(g, w - 2, d - 1, [1, 2], 5);
    set(g, w - 2, 1, [1], 5);
    // Roof
    steppedRoof(g, 0, 0, w - 1, d - 1, baseH + 1, Math.ceil(tier / 2) + 2, 2);
    // Second floor
    if (tier >= 3) {
      flatFloor(g, 0, 0, w - 1, d - 1, baseH, 5);
      wallHollow(g, 1, 2, w - 2, d - 2, baseH, baseH + 2, 1);
    }
    // Banners
    set(g, 1, 0, [baseH + 2], 3);
    set(g, w - 2, 0, [baseH + 2], 3);
    return g;
  },

  STORAGE: (tier, w, d, h) => {
    const g = empty(w, d, h);
    const baseH = 3 + tier * 2;
    flatFloor(g, 1, 1, w - 2, d - 2, 0, 6);
    wallHollow(g, 1, 1, w - 2, d - 2, 1, baseH, 1);
    // Arched entrance
    const midZ = 1;
    set(g, Math.floor(w / 2), midZ, [1, 2, 3], 0);
    set(g, Math.floor(w / 2) - 1, midZ, [3], 1);
    set(g, Math.floor(w / 2) + 1, midZ, [3], 1);
    // Few small windows high up
    set(g, 2, d - 2, [baseH - 1], 4);
    set(g, w - 3, d - 2, [baseH - 1], 4);
    // High roof
    steppedRoof(g, 1, 1, w - 2, d - 2, baseH + 1, Math.ceil(tier / 2) + 3, 2);
    // Crate stacks (outside)
    for (let cx = 0; cx <= 1; cx++)
      for (let cz = d - 2; cz <= d - 1; cz++)
        for (let cy = 1; cy <= 3; cy++)
          set(g, cx, cz, [cy], 5);
    return g;
  },

  ALLIANCE_CENTER: (tier, w, d, h) => {
    const g = empty(w, d, h);
    const baseH = 3 + tier * 2;
    flatFloor(g, 0, 0, w - 1, d - 1, 0, 6);
    wallHollow(g, 1, 1, w - 2, d - 2, 1, baseH, 1);
    // Floors
    for (let fh = 4; fh <= baseH; fh += 4) flatFloor(g, 1, 1, w - 2, d - 2, fh, 5);
    // Large arched windows on both sides
    for (let wx = 2; wx <= w - 3; wx += 4)
      for (let wy = 2; wy <= 3; wy++)
        set(g, wx, 1, [wy], 4);
    // Grand entrance
    set(g, Math.floor(w / 2) - 1, 1, [1, 2], 0);
    set(g, Math.floor(w / 2), 1, [1, 2], 0);
    set(g, Math.floor(w / 2) + 1, 1, [1, 2], 0);
    // Twin towers at entrance
    const towerH = baseH + 4;
    wallHollow(g, 1, 1, 3, 3, baseH, towerH, 1);
    wallHollow(g, w - 4, 1, w - 2, 3, baseH, towerH, 1);
    // Tower roofs
    pyramidRoof(g, 1, 1, 3, 3, towerH + 1, 2);
    pyramidRoof(g, w - 4, 1, w - 2, 3, towerH + 1, 2);
    // Flags on towers
    set(g, 2, 2, [towerH + 4], 3);
    set(g, w - 3, 2, [towerH + 4], 3);
    // Main roof
    steppedRoof(g, 1, 1, w - 2, d - 2, baseH + 1, Math.ceil(tier / 2) + 2, 2);
    // Banner poles at entrance
    set(g, 1, 1, [towerH + 3], 3);
    set(g, w - 2, 1, [towerH + 3], 3);
    return g;
  },
};

export function getRecipe(type: string): BuildingRecipe {
  return RECIPES[type] ?? RECIPES.TOWN_HALL;
}

export function getRecipeGridSize(type: string, tier: number): { w: number; d: number; h: number } {
  switch (type) {
    case "TOWER": return { w: 8, d: 8, h: 6 + tier * 4 };
    case "FARM": return { w: 14, d: 14, h: 8 + tier * 2 };
    case "BARRACKS": return { w: 18, d: 14, h: 8 + tier * 2 };
    case "STABLE": return { w: 14, d: 10, h: 6 + tier };
    case "LIBRARY": return { w: 12, d: 16, h: 8 + tier * 3 };
    case "GOLD_MINE": return { w: 12, d: 12, h: 6 + tier * 2 };
    case "LUMBER_MILL": return { w: 12, d: 10, h: 6 + tier };
    case "QUARRY": return { w: 16, d: 12, h: 6 + tier };
    case "MARKET": return { w: 14, d: 12, h: 6 + tier };
    case "STORAGE": return { w: 10, d: 10, h: 6 + tier * 3 };
    case "ALLIANCE_CENTER": return { w: 18, d: 14, h: 8 + tier * 3 };
    case "TOWN_HALL":
    default: return { w: 16, d: 16, h: 8 + tier * 3 };
  }
}
