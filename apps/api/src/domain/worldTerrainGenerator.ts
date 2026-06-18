import type { TerrainKind } from "./worldTerrainConfigData.js";
import { generateCellHeightmap } from "./voronoiHeightmap.js";
import { buildSiteOfPixel } from "./voronoiGraph.js";

// ── PRNG ─────────────────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── VALUE NOISE (for moisture FBM) ───────────────────────────────────────────

function hash(x: number, y: number, seed: number): number {
  const n = (x * 1619 + y * 31337 + seed * 1013) | 0;
  const m = (n ^ (n << 13)) ^ n;
  return (1 - ((m * (m * m * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824) * 0.5 + 0.5;
}

function quintic(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a: number, b: number, t: number): number { return a + t * (b - a); }

function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = quintic(x - ix), fy = quintic(y - iy);
  return lerp(
    lerp(hash(ix, iy, seed), hash(ix + 1, iy, seed), fx),
    lerp(hash(ix, iy + 1, seed), hash(ix + 1, iy + 1, seed), fx),
    fy
  );
}

function fbm(x: number, y: number, seed: number, octaves: number): number {
  let v = 0, amp = 0.5, freq = 1.0, max = 0;
  for (let i = 0; i < octaves; i++) {
    v += valueNoise(x * freq, y * freq, seed + i * 1997) * amp;
    max += amp; amp *= 0.5; freq *= 2.0;
  }
  return v / max;
}

// ── RANK-PERCENTILE ──────────────────────────────────────────────────────────

function rankPercentile(arr: Float32Array): Float32Array {
  const n = arr.length;
  const indices = new Uint32Array(n);
  for (let i = 0; i < n; i++) indices[i] = i;
  indices.sort((a, b) => arr[a] - arr[b]);
  const result = new Float32Array(n);
  for (let rank = 0; rank < n; rank++) result[indices[rank]] = rank / (n - 1);
  return result;
}

// ── DEPRESSION FILLING (Azgaar preprocessing for rivers) ─────────────────────
// Raises each land cell that is lower than all its neighbors by a tiny amount,
// so greedy descent always finds a downhill path to water. Iterative.
function fillDepressions(h: Float32Array, cols: number, rows: number, iterations = 5) {
  for (let it = 0; it < iterations; it++) {
    let changed = false;
    for (let row = 1; row < rows - 1; row++) {
      for (let col = 1; col < cols - 1; col++) {
        const i = row * cols + col;
        if (h[i] < 20) continue; // skip water
        let minNb = h[i];
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            const nb = (row + dr) * cols + (col + dc);
            if (h[nb] < minNb) minNb = h[nb];
          }
        }
        if (minNb >= h[i] && h[i] > 20) {
          // Depression: raise just above minimum neighbor
          h[i] = minNb + 0.15;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
}

// ── FLUX-BASED RIVERS (Azgaar-style precipitation accumulation) ──────────────
// Each land cell accumulates precipitation flux from higher neighbors.
// Cells processed high→low; flux transferred to the lowest neighbor.
// River tiles form where accumulated flux exceeds MIN_FLUX.
// Rivers widen toward the mouth (higher flux = wider river).
function traceFluxRivers(
  h: Float32Array,
  cells: TerrainKind[],
  cols: number,
  rows: number,
  rng: () => number
): void {
  const N = cols * rows;
  // Precipitation: slightly randomized per cell so rivers are organic
  const prec = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    if (h[i] >= 20) prec[i] = 0.8 + rng() * 0.4; // land gets rain
  }

  // Sort land cells high→low
  const landCells: number[] = [];
  for (let i = 0; i < N; i++) if (h[i] >= 20) landCells.push(i);
  landCells.sort((a, b) => h[b] - h[a]);

  const flux = new Float32Array(N);
  // Seed flux with precipitation
  for (const i of landCells) flux[i] = prec[i];

  // Accumulate flux downhill — 4-directional only (NSEW) to avoid diagonal rivers
  for (const i of landCells) {
    const col = i % cols, row = Math.floor(i / cols);
    let bestNb = -1, bestH = h[i];
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as const) {
      const nc = col + dc, nr = row + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const nb = nr * cols + nc;
      if (h[nb] < bestH) { bestH = h[nb]; bestNb = nb; }
    }
    if (bestNb >= 0) flux[bestNb] += flux[i];
  }

  // MIN_FLUX threshold — percent of max flux so rivers scale correctly regardless of grid size.
  // Top 2% of land-flux cells are rivers (tributaries); top 0.4% are wide river/WATER.
  const landFluxValues = landCells.map(i => flux[i]).filter(f => f > 0);
  landFluxValues.sort((a, b) => a - b);
  const pct980 = landFluxValues[Math.floor(landFluxValues.length * 0.980)] ?? 999999;
  const pct996 = landFluxValues[Math.floor(landFluxValues.length * 0.996)] ?? 999999;

  for (let i = 0; i < N; i++) {
    if (h[i] < 20 || h[i] >= 72) continue;
    if (flux[i] >= pct996) {
      cells[i] = "WATER"; // wide river (dilated below)
    } else if (flux[i] >= pct980) {
      cells[i] = "COAST"; // narrow tributaries
    }
  }

  // Dilate wide-river WATER cells by 1 neighbor to make them 2-3px wide.
  const riverWater = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (cells[i] === "WATER" && h[i] >= 20 && h[i] < 72) riverWater[i] = 1;
  }
  for (let i = 0; i < N; i++) {
    if (!riverWater[i]) continue;
    const col = i % cols, row = Math.floor(i / cols);
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as const) {
      const nc = col + dc, nr = row + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const ni = nr * cols + nc;
      if (h[ni] >= 20 && h[ni] < 72 && cells[ni] !== "WATER") cells[ni] = "WATER";
    }
  }

  // Delta fans: river WATER cells that border ocean WATER get extra spread.
  for (let i = 0; i < N; i++) {
    if (!riverWater[i]) continue;
    const col = i % cols, row = Math.floor(i / cols);
    let nearOcean = false;
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as const) {
      const nc = col + dc, nr = row + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      if (h[nr * cols + nc] < 20) { nearOcean = true; break; }
    }
    if (!nearOcean) continue;
    // Spread 2 cells in cardinal directions into ocean
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]] as const) {
      for (let step = 1; step <= 2; step++) {
        const nc = col + dc * step, nr = row + dr * step;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const ni = nr * cols + nc;
        if (h[ni] < 20) cells[ni] = "WATER"; // already ocean, keeps same color but marks as delta
      }
    }
  }
}

// ── TERRAIN GENERATION ────────────────────────────────────────────────────────

export type TerrainData = { cells: TerrainKind[]; heights: Uint8Array };

export function generateTerrainData(seed: number, cols: number, rows: number): TerrainData {
  const N = cols * rows;
  const rng = mulberry32(seed + 77777);

  // ── Step 1: Voronoi-cell heightmap, rasterized to the grid ────────────────
  // Generation happens on an irregular Voronoi cell graph (organic, no grid
  // artifacts), then every grid pixel takes its owning cell's height.
  const targetCells = Math.max(2000, Math.min(30000, Math.round(N / 18)));
  const cellHm = generateCellHeightmap(seed, cols, rows, targetCells);
  // Domain-warp the rasterization so coastlines and biome edges are organic, not faceted.
  const siteOfPixel = buildSiteOfPixel(cellHm.graph, { seed: (seed * 7919 + 13) | 0, warpAmp: 5, warpScale: 0.05 });
  const hg = { h: new Float32Array(N), cols, rows };
  for (let i = 0; i < N; i++) hg.h[i] = cellHm.height[siteOfPixel[i]];

  // Each Voronoi cell rasterizes to a flat-height region; without smoothing,
  // height-derived fields (temperature, biome cuts) follow the cell facets and
  // look blocky. A couple of light box-blur passes turn the flat cells into
  // smooth gradients → organic coastlines, relief and biome boundaries.
  {
    for (let pass = 0; pass < 2; pass++) {
      const src = hg.h.slice();
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          let sum = 0, cnt = 0;
          for (let dr = -1; dr <= 1; dr++) {
            const nr = row + dr; if (nr < 0 || nr >= rows) continue;
            for (let dc = -1; dc <= 1; dc++) {
              const nc = col + dc; if (nc < 0 || nc >= cols) continue;
              sum += src[nr * cols + nc]; cnt++;
            }
          }
          hg.h[row * cols + col] = sum / cnt;
        }
      }
    }
  }

  // ── Step 2: Balance land/water ratio ──────────────────────────────────────
  // Resolution-independent sea level: find the height at the target water
  // percentile and shift the whole map so that value lands exactly on the
  // shoreline (20). The old iterative ±3 loop under-converged on large grids
  // (1400² came out 95% land); this guarantees the same ratio at any resolution.
  {
    const TARGET_WATER = 0.12; // ~88% land — less open ocean, no fringe seas
    const sorted = Float32Array.from(hg.h).sort();
    const seaLevel = sorted[Math.floor(TARGET_WATER * (N - 1))];
    const shift = 20 - seaLevel;
    if (Math.abs(shift) > 0.01) {
      for (let i = 0; i < N; i++) hg.h[i] = Math.min(100, Math.max(0, hg.h[i] + shift));
    }
  }

  // ── Step 2b: Guarantee inland lakes ──────────────────────────────────────
  {
    const minLakes = 2;
    const visited = new Uint8Array(N);
    let lakeCount = 0;
    for (let i = 0; i < N; i++) {
      if (hg.h[i] >= 20 || visited[i]) continue;
      const q: number[] = [i];
      visited[i] = 1;
      let touchesBorder = false;
      const component: number[] = [];
      while (q.length) {
        const ci = q.pop()!;
        const cc = ci % cols, cr = Math.floor(ci / cols);
        if (cc === 0 || cr === 0 || cc === cols - 1 || cr === rows - 1) touchesBorder = true;
        component.push(ci);
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            const nc = cc + dc, nr = cr + dr;
            if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
            const ni = nr * cols + nc;
            if (!visited[ni] && hg.h[ni] < 20) { visited[ni] = 1; q.push(ni); }
          }
        }
      }
      if (!touchesBorder && component.length >= 4) lakeCount++;
    }
    const existingLakeCenters: Array<[number, number]> = [];
    if (lakeCount < minLakes) {
      const toCarve = minLakes - lakeCount;
      const border = Math.floor(Math.min(cols, rows) * 0.1);
      for (let attempt = 0; attempt < toCarve * 60 && existingLakeCenters.length < toCarve; attempt++) {
        const lc = border + Math.floor(rng() * (cols - border * 2));
        const lr = border + Math.floor(rng() * (rows - border * 2));
        const tooClose = existingLakeCenters.some(([ec, er]) =>
          Math.abs(ec - lc) + Math.abs(er - lr) < Math.floor(Math.min(cols, rows) * 0.15)
        );
        if (tooClose) continue;
        const startI = lr * cols + lc;
        const targetH = 10 + Math.floor(rng() * 6);
        const blobSize = Math.floor(N / 8000) + 10 + Math.floor(rng() * 20); // scale with grid
        const q2: number[] = [startI];
        const seen = new Set<number>([startI]);
        let carved = 0;
        while (q2.length && carved < blobSize) {
          const ci = q2.shift()!;
          hg.h[ci] = Math.min(hg.h[ci], targetH);
          carved++;
          const cc = ci % cols, cr = Math.floor(ci / cols);
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (!dr && !dc) continue;
              const nc = cc + dc, nr = cr + dr;
              if (nc <= 0 || nr <= 0 || nc >= cols - 1 || nr >= rows - 1) continue;
              const ni = nr * cols + nc;
              if (!seen.has(ni)) { seen.add(ni); q2.push(ni); }
            }
          }
        }
        existingLakeCenters.push([lc, lr]);
      }
    }
  }

  // ── Step 3: Depression filling (Azgaar preprocessing for rivers) ──────────
  // Must run BEFORE river tracing so flux has clear paths to water.
  fillDepressions(hg.h, cols, rows, 6);

  // ── Step 4: Moisture via FBM + water proximity ────────────────────────────
  const moistSeed = (seed * 3001 + 17) | 0;
  // Three balanced octave bands (broad climate + mid detail + fine grain). Mixing
  // in stronger mid/high frequencies keeps the field from collapsing into broad
  // flat plateaus (which a low-freq-dominated FBM does), so the moisture has good
  // natural variance and biomes interleave without large uniform blocks.
  // Spectral synthesis: sum of random sinusoids. Unlike value-noise FBM (which
  // saturates into broad flat plateaus → histogram spikes → rank step-function →
  // rectangle artifacts), a sum of ~14 waves is a smooth near-Gaussian field with
  // NO plateaus, so rankPercentile maps it to a clean uniform distribution.
  const moistRaw = new Float32Array(N);
  {
    const wr = mulberry32(moistSeed ^ 0x5bd1e995);
    const K = 14;
    const fx = new Float64Array(K), fy = new Float64Array(K), ph = new Float64Array(K), am = new Float64Array(K);
    let ampNorm = 0;
    for (let k = 0; k < K; k++) {
      // frequencies from broad (continents) to fine (groves), in radians per unit
      const scale = 2.0 + 22.0 * Math.pow(k / (K - 1), 1.6);
      const ang = wr() * Math.PI * 2;
      fx[k] = Math.cos(ang) * scale * Math.PI * 2;
      fy[k] = Math.sin(ang) * scale * Math.PI * 2;
      ph[k] = wr() * Math.PI * 2;
      am[k] = 1 / (1 + scale * 0.12); // lower amplitude for finer waves
      ampNorm += am[k];
    }
    for (let i = 0; i < N; i++) {
      const x = (i % cols) / cols, y = ((i / cols) | 0) / rows;
      let v = 0;
      for (let k = 0; k < K; k++) v += am[k] * Math.sin(fx[k] * x + fy[k] * y + ph[k]);
      moistRaw[i] = 0.5 + 0.5 * (v / ampNorm); // → [0,1], centered
    }
  }

  // BFS water proximity (max 15 tiles → normalized 0–1)
  const waterProx = new Float32Array(N);
  {
    const MAX_DIST = 15;
    const distBuf = new Int16Array(N).fill(-1);
    const bfsQ: number[] = [];
    for (let i = 0; i < N; i++) {
      if (hg.h[i] < 20) { distBuf[i] = 0; bfsQ.push(i); }
    }
    let head = 0;
    while (head < bfsQ.length) {
      const ci = bfsQ[head++];
      const cc = ci % cols, cr = Math.floor(ci / cols);
      const d = distBuf[ci];
      if (d >= MAX_DIST) continue;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nc = cc + dc, nr = cr + dr;
          if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
          const ni = nr * cols + nc;
          if (distBuf[ni] === -1) { distBuf[ni] = d + 1; bfsQ.push(ni); }
        }
      }
    }
    for (let i = 0; i < N; i++) {
      const d = distBuf[i] < 0 ? MAX_DIST : distBuf[i];
      waterProx[i] = 1 - Math.min(1, d / MAX_DIST);
    }
  }

  // Blend FBM + water proximity, then map to [0,1] with a STANDARDIZED (z-score)
  // linear transform — deliberately NOT rankPercentile. rankPercentile over a
  // field with dense value clusters (FBM plateaus) becomes a near-step transfer
  // function that amplifies tiny variations into sharp-edged AXIS-ALIGNED biome
  // rectangles. A continuous z-score map keeps every biome boundary a smooth
  // contour, and mean/std are seed-stable so biome proportions stay consistent.
  // rankPercentile gives the seed-stable uniform distribution we want (consistent
  // biome proportions). Its failure mode is sharp edges: where the FBM saturates
  // into a flat plateau (a histogram spike), the rank becomes a step function and
  // its index tie-break carves AXIS-ALIGNED RECTANGLES. We then SPATIALLY BLUR the
  // rank field: a flat rectangle of rank 0 surrounded by rank ~0.6 becomes a
  // smooth gradient, so the biome threshold contour is an organic curve, not a
  // straight edge — keeping rank's good distribution while removing the artifact.
  const moistBlended = new Float32Array(N);
  for (let i = 0; i < N; i++) moistBlended[i] = moistRaw[i] * 0.72 + waterProx[i] * 0.28;
  const moist = rankPercentile(moistBlended);
  for (let pass = 0; pass < 3; pass++) {
    const src = moist.slice();
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        let s = 0, c = 0;
        for (let dr = -1; dr <= 1; dr++) {
          const nr = row + dr; if (nr < 0 || nr >= rows) continue;
          for (let dc = -1; dc <= 1; dc++) {
            const nc = col + dc; if (nc < 0 || nc >= cols) continue;
            s += src[nr * cols + nc]; c++;
          }
        }
        moist[row * cols + col] = s / c;
      }
    }
  }

  // ── Step 5: Biome classification (Whittaker: temperature × moisture × elev) ─
  // Temperature field: north (row 0) is cold, south is warm; high elevation cools.
  const cells: TerrainKind[] = new Array(N);
  for (let i = 0; i < N; i++) {
    const h = hg.h[i];
    const m = moist[i];
    const row = Math.floor(i / cols);
    const latNorm = row / (rows - 1); // 0=north(cold), 1=south(warm)

    if (h < 20) { cells[i] = "WATER"; continue; }

    // Elevation bands first (relief). Heights were redistributed so these are stable:
    // top ~12% reach MOUNTAIN, the next band is HILLS.
    if (h >= 75) { cells[i] = "MOUNTAIN"; continue; }

    // Temperature [0,1]: latitude warms south, elevation cools, plus a wandering
    // FBM jitter so isotherms aren't flat horizontal bands.
    const elevN = (h - 20) / 80;            // 0 at shore, 1 at peak
    const col = i % cols;
    const tempNoise = (fbm((col / cols) * 6 + 5.5, (row / rows) * 6 + 31.0, moistSeed + 1500, 4) - 0.5) * 0.20;
    const temp = Math.max(0, Math.min(1, 0.26 + 0.74 * latNorm - elevN * 0.42 + tempNoise));

    // Cold high ground → snow-capped mountains even below the absolute line.
    if (h >= 66 && temp < 0.26) { cells[i] = "MOUNTAIN"; continue; }
    if (h >= 60) { cells[i] = "HILLS"; continue; }

    // Lowland Whittaker matrix.
    if (h < 34 && m > 0.70 && temp > 0.42) { cells[i] = "SWAMP"; continue; }    // warm wet lowland
    if (temp < 0.22) { cells[i] = m > 0.55 ? "TAIGA" : "TUNDRA"; continue; }   // cold: taiga or tundra
    if (temp >= 0.22 && temp < 0.40 && m > 0.52) { cells[i] = "TAIGA"; continue; } // cold-temperate wet → taiga
    if (temp > 0.74 && m > 0.74) { cells[i] = "JUNGLE"; continue; }            // hot + very wet → jungle
    if (temp > 0.60 && m > 0.30 && m < 0.52) { cells[i] = "SAVANNA"; continue; } // hot + semi-dry → savanna
    if (temp > 0.66 && m < 0.30) { cells[i] = "DESERT"; continue; }             // hot + dry
    if (m > 0.58) { cells[i] = "FOREST"; continue; }                            // wet temperate/warm
    cells[i] = "PLAINS";                                                         // default grassland
  }

  // ── Step 5.5: Despeckle biomes (majority vote) ────────────────────────────
  // Domain-warped rasterization + threshold biomes leave salt-and-pepper at
  // boundaries. A couple of majority passes merge isolated pixels into their
  // surrounding region. Runs BEFORE rivers so 1-px river lines stay intact.
  {
    // Gentle: only absorb genuinely isolated pixels (≤1 like neighbour) into a
    // strong surrounding majority. Aggressive majority filtering was creating
    // blocky axis-aligned artifacts (morphological closing), so keep it light.
    for (let iter = 0; iter < 2; iter++) {
      const next = cells.slice();
      for (let row = 1; row < rows - 1; row++) {
        for (let col = 1; col < cols - 1; col++) {
          const i = row * cols + col;
          const k = cells[i];
          const counts: Record<string, number> = {};
          let self = 0, bestK = k, bestN = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (!dr && !dc) continue;
              const nk = cells[(row + dr) * cols + (col + dc)];
              const c = (counts[nk] = (counts[nk] || 0) + 1);
              if (nk === k) self = c;
              if (c > bestN) { bestN = c; bestK = nk; }
            }
          }
          if (self <= 1 && bestN >= 5 && bestK !== k) next[i] = bestK;
        }
      }
      for (let i = 0; i < N; i++) cells[i] = next[i];
    }
  }

  // ── Step 5.6: Connected-component blob cleanup ────────────────────────────
  // Erase tiny isolated biome patches (specks of desert in forest, etc.) by
  // flood-fill: any land component smaller than MIN_BIOME_BLOB cells is replaced
  // by the most common biome touching its perimeter.
  {
    const MIN_BIOME_BLOB = Math.max(10, Math.round(N / 180000)); // ~27 at 2200²
    const visited = new Uint8Array(N);
    for (let start = 0; start < N; start++) {
      if (visited[start] || cells[start] === "WATER") continue;
      const kind = cells[start];
      const component: number[] = [];
      const queue = [start];
      visited[start] = 1;
      let head = 0;
      while (head < queue.length) {
        const ci = queue[head++];
        component.push(ci);
        const cc = ci % cols, cr = Math.floor(ci / cols);
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as const) {
          const nr = cr + dr, nc = cc + dc;
          if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
          const ni = nr * cols + nc;
          if (!visited[ni] && cells[ni] === kind) { visited[ni] = 1; queue.push(ni); }
        }
      }
      if (component.length >= MIN_BIOME_BLOB) continue;
      // Count perimeter biomes
      const neighborCounts: Record<string, number> = {};
      for (const ci of component) {
        const cc = ci % cols, cr = Math.floor(ci / cols);
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as const) {
          const nr = cr + dr, nc = cc + dc;
          if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
          const nk = cells[nr * cols + nc];
          if (nk !== kind && nk !== "WATER") neighborCounts[nk] = (neighborCounts[nk] || 0) + 1;
        }
      }
      let bestBiome = kind, bestCount = 0;
      for (const [bk, bc] of Object.entries(neighborCounts)) {
        if (bc > bestCount) { bestCount = bc; bestBiome = bk as typeof kind; }
      }
      if (bestCount === 0) { for (const ci of component) cells[ci] = "WATER"; continue; } // island → sink to water
      for (const ci of component) cells[ci] = bestBiome;
    }
  }

  // ── Step 5.7: Inland water-body cleanup (remove "lagitos") ────────────────
  // The global sea-level cut turns every shallow local minimum in flat lowland
  // into a tiny isolated WATER blob ("lagitos"). fillDepressions skips sub-water
  // cells, and the biome blob cleanup skips WATER, so nothing removes them.
  // Flood-fill each WATER component: ocean (touches border) and genuine large
  // lakes survive; small mediterranean ponds are filled back to land.
  {
    const MIN_LAKE = Math.max(60, Math.round(N / 45000)); // ~107 cells at 2200²
    const visited = new Uint8Array(N);
    for (let start = 0; start < N; start++) {
      if (visited[start] || cells[start] !== "WATER") continue;
      const component: number[] = [];
      const queue = [start];
      visited[start] = 1;
      let head = 0;
      let touchesBorder = false;
      while (head < queue.length) {
        const ci = queue[head++];
        component.push(ci);
        const cc = ci % cols, cr = Math.floor(ci / cols);
        if (cc === 0 || cr === 0 || cc === cols - 1 || cr === rows - 1) touchesBorder = true;
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as const) {
          const nr = cr + dr, nc = cc + dc;
          if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
          const ni = nr * cols + nc;
          if (!visited[ni] && cells[ni] === "WATER") { visited[ni] = 1; queue.push(ni); }
        }
      }
      // Keep oceans (touch border) and lakes large enough to matter.
      if (touchesBorder || component.length >= MIN_LAKE) continue;
      // Fill the pond: raise height just above shore and adopt the dominant
      // surrounding land biome so it blends into the prairie/forest around it.
      const neighborCounts: Record<string, number> = {};
      for (const ci of component) {
        const cc = ci % cols, cr = Math.floor(ci / cols);
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as const) {
          const nr = cr + dr, nc = cc + dc;
          if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
          const nk = cells[nr * cols + nc];
          if (nk !== "WATER") neighborCounts[nk] = (neighborCounts[nk] || 0) + 1;
        }
      }
      let bestBiome: TerrainKind = "PLAINS", bestCount = 0;
      for (const [bk, bc] of Object.entries(neighborCounts)) {
        if (bc > bestCount) { bestCount = bc; bestBiome = bk as TerrainKind; }
      }
      if (bestBiome === "COAST") bestBiome = "PLAINS"; // don't seed beaches inland
      for (const ci of component) {
        cells[ci] = bestBiome;
        if (hg.h[ci] < 22) hg.h[ci] = 22; // lift above sea level for buildability
      }
    }
  }

  // ── Step 6: Flux-based rivers (Azgaar precipitation model) ───────────────
  traceFluxRivers(hg.h, cells, cols, rows, rng);

  // ── Step 6b: Coastline pass — land directly touching water becomes COAST ──
  // (Replaces the old height-band COAST so beaches only appear at real shores.)
  {
    const coastOf = cells.slice();
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col;
        const k = cells[i];
        if (k === "WATER" || k === "MOUNTAIN") continue;
        let touchesWater = false;
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
          const nr = row + dr, nc = col + dc;
          if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
          if (cells[nr * cols + nc] === "WATER") { touchesWater = true; break; }
        }
        if (touchesWater) coastOf[i] = "COAST";
      }
    }
    for (let i = 0; i < N; i++) cells[i] = coastOf[i];
  }

  // ── Step 7: Post-river lagitos cleanup ────────────────────────────────────
  // Rivers (Step 6) create new WATER cells after the earlier lagitos pass (5.7),
  // so isolated tiny water blobs produced by river tributaries are removed here.
  // Threshold is smaller than 5.7 (rivers are intentionally thin lines) — only
  // blobs fully disconnected from the ocean/large-lakes are filled.
  {
    const MIN_RIVER_ISLAND = 8; // blobs smaller than this that don't touch border → fill
    const visited2 = new Uint8Array(N);
    for (let start = 0; start < N; start++) {
      if (visited2[start] || cells[start] !== "WATER") continue;
      const component: number[] = [];
      const queue = [start];
      visited2[start] = 1;
      let head = 0;
      let touchesBorder = false;
      while (head < queue.length) {
        const ci = queue[head++];
        component.push(ci);
        const cc = ci % cols, cr = Math.floor(ci / cols);
        if (cc === 0 || cr === 0 || cc === cols - 1 || cr === rows - 1) touchesBorder = true;
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as const) {
          const nr = cr + dr, nc = cc + dc;
          if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
          const ni = nr * cols + nc;
          if (!visited2[ni] && cells[ni] === "WATER") { visited2[ni] = 1; queue.push(ni); }
        }
      }
      if (touchesBorder || component.length >= MIN_RIVER_ISLAND) continue;
      const neighborCounts: Record<string, number> = {};
      for (const ci of component) {
        const cc = ci % cols, cr = Math.floor(ci / cols);
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as const) {
          const nr = cr + dr, nc = cc + dc;
          if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
          const nk = cells[nr * cols + nc];
          if (nk !== "WATER") neighborCounts[nk] = (neighborCounts[nk] || 0) + 1;
        }
      }
      let bestBiome: TerrainKind = "PLAINS", bestCount = 0;
      for (const [bk, bc] of Object.entries(neighborCounts)) {
        if (bc > bestCount) { bestCount = bc; bestBiome = bk as TerrainKind; }
      }
      if (bestBiome === "COAST") bestBiome = "PLAINS";
      for (const ci of component) cells[ci] = bestBiome;
    }
  }

  // ── Step 7b: Final single-cell speck removal ───────────────────────────────
  const smoothed = cells.slice();
  for (let row = 1; row < rows - 1; row++) {
    for (let col = 1; col < cols - 1; col++) {
      const i = row * cols + col;
      if (cells[i] !== "WATER") continue;
      let land = 0;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++)
          if ((dr || dc) && cells[(row + dr) * cols + (col + dc)] !== "WATER") land++;
      if (land >= 7) smoothed[i] = "COAST";
    }
  }

  // ── Step 8: Pack heights into Uint8 ──────────────────────────────────────
  const heights = new Uint8Array(N);
  for (let i = 0; i < N; i++) heights[i] = Math.round(Math.min(100, Math.max(0, hg.h[i])));

  return { cells: smoothed, heights };
}

// Compatibility wrapper
export function generateTerrain(seed: number, cols: number, rows: number): TerrainKind[] {
  return generateTerrainData(seed, cols, rows).cells;
}

// ── RLE ───────────────────────────────────────────────────────────────────────

export function rleEncode(cells: TerrainKind[]): Array<[TerrainKind, number]> {
  const result: Array<[TerrainKind, number]> = [];
  let i = 0;
  while (i < cells.length) {
    const kind = cells[i];
    let count = 1;
    while (i + count < cells.length && cells[i + count] === kind) count++;
    result.push([kind, count]);
    i += count;
  }
  return result;
}

export function rleDecode(rle: Array<[TerrainKind, number]>): TerrainKind[] {
  const result: TerrainKind[] = [];
  for (const [kind, count] of rle) {
    for (let i = 0; i < count; i++) result.push(kind);
  }
  return result;
}
