import type { TerrainKind } from "./worldTerrainConfigData.js";
import type { WorldRegion } from "@etheria/shared";

// ─── Region name lists ───────────────────────────────────────────────────────

const REGION_PREFIXES = [
  "Páramos", "Tierras", "Valle", "Costa", "Sierra", "Bosques",
  "Llanuras", "Estepas", "Montañas", "Selvas", "Desierto", "Marismas",
  "Colinas", "Riberas", "Campos", "Cumbres", "Praderas", "Altiplano",
];

const REGION_SUFFIXES = [
  "del Norte", "Sombrías", "Doradas", "del Este", "del Sur", "Heladas",
  "Ardientes", "Verdes", "Grises", "Perdidas", "Antiguas", "Salvajes",
  "Olvidadas", "Eternas", "Oscuras", "Brillantes", "Secas", "Fértiles",
];

function seededPick<T>(arr: T[], h: number): T {
  return arr[Math.abs(h) % arr.length];
}

function hashInt(n: number): number {
  let x = n ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

function regionName(idx: number): string {
  const h1 = hashInt(idx * 13 + 7);
  const h2 = hashInt(idx * 31 + 17);
  return `${seededPick(REGION_PREFIXES, h1)} ${seededPick(REGION_SUFFIXES, h2)}`;
}

// ─── Region generation ───────────────────────────────────────────────────────

export function generateRegions(
  cells: TerrainKind[],
  cols: number,
  rows: number,
  worldWidth: number,
  worldHeight: number,
  seed: number,
): WorldRegion[] {
  const N = cols * rows;

  // Build a list of land cells (non-WATER) for seed placement
  const landCells: number[] = [];
  for (let i = 0; i < N; i++) {
    if (cells[i] !== "WATER") landCells.push(i);
  }
  if (landCells.length === 0) return [];

  // ── Seed placement: jittered grid on land ────────────────────────────────
  // Divide grid into ~5×5 = 25 zones; pick one land cell per zone as seed.
  const REGION_COLS = 5;
  const REGION_ROWS = 4; // 20 provinces total
  const seeds: number[] = [];

  // Simple mulberry32 PRNG for determinism
  let s = seed ^ 0x4c3a1b9f;
  const rng = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let gr = 0; gr < REGION_ROWS; gr++) {
    for (let gc = 0; gc < REGION_COLS; gc++) {
      const colStart = Math.floor((gc / REGION_COLS) * cols);
      const colEnd = Math.floor(((gc + 1) / REGION_COLS) * cols);
      const rowStart = Math.floor((gr / REGION_ROWS) * rows);
      const rowEnd = Math.floor(((gr + 1) / REGION_ROWS) * rows);

      // Try up to 60 random points inside the zone, pick first land
      let placed = false;
      for (let attempt = 0; attempt < 60; attempt++) {
        const rc = colStart + Math.floor(rng() * (colEnd - colStart));
        const rr = rowStart + Math.floor(rng() * (rowEnd - rowStart));
        const ri = rr * cols + rc;
        if (cells[ri] !== "WATER") {
          seeds.push(ri);
          placed = true;
          break;
        }
      }
      if (!placed) {
        // Fallback: nearest land cell to zone center
        const cc = Math.floor((colStart + colEnd) / 2);
        const cr = Math.floor((rowStart + rowEnd) / 2);
        let best = -1, bestD = Infinity;
        for (const li of landCells) {
          const lc = li % cols, lr = Math.floor(li / cols);
          const d = (lc - cc) ** 2 + (lr - cr) ** 2;
          if (d < bestD) { bestD = d; best = li; }
        }
        if (best >= 0) seeds.push(best);
      }
    }
  }

  const numRegions = seeds.length;
  if (numRegions === 0) return [];

  // ── BFS Voronoi assignment on land cells ────────────────────────────────
  const assign = new Int16Array(N).fill(-1); // -1 = unassigned
  const queue: number[] = [];

  for (let ri = 0; ri < numRegions; ri++) {
    assign[seeds[ri]] = ri;
    queue.push(seeds[ri]);
  }

  let head = 0;
  while (head < queue.length) {
    const ci = queue[head++];
    const reg = assign[ci];
    const cc = ci % cols, cr = Math.floor(ci / cols);
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as const) {
      const nc = cc + dc, nr = cr + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const ni = nr * cols + nc;
      if (assign[ni] !== -1 || cells[ni] === "WATER") continue;
      assign[ni] = reg;
      queue.push(ni);
    }
  }

  // ── Compute centroids in grid space ─────────────────────────────────────
  const sumC = new Float64Array(numRegions);
  const sumR = new Float64Array(numRegions);
  const count = new Int32Array(numRegions);

  for (let i = 0; i < N; i++) {
    const r = assign[i];
    if (r < 0) continue;
    sumC[r] += i % cols;
    sumR[r] += Math.floor(i / cols);
    count[r]++;
  }

  // ── Convert centroid from grid-space to world-space ──────────────────────
  // Grid cell (c, r) maps to world coords:
  //   worldX = (c / cols) * worldWidth  - worldWidth/2
  //   worldY = (r / rows) * worldHeight - worldHeight/2
  const halfW = worldWidth / 2;
  const halfH = worldHeight / 2;

  const regions: WorldRegion[] = [];
  for (let ri = 0; ri < numRegions; ri++) {
    if (count[ri] === 0) continue;
    const avgC = sumC[ri] / count[ri];
    const avgR = sumR[ri] / count[ri];
    regions.push({
      id: `region-${ri}`,
      name: regionName(ri),
      centroidX: Math.round((avgC / cols) * worldWidth - halfW),
      centroidY: Math.round((avgR / rows) * worldHeight - halfH),
    });
  }

  return regions;
}
