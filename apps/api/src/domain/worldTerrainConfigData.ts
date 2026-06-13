import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export type TerrainKind =
  | "PLAINS" | "FOREST" | "MOUNTAIN" | "WATER" | "ROAD" | "COAST"
  | "DESERT" | "SWAMP" | "TUNDRA" | "HILLS";

export type TerrainArea =
  | { id: string; kind: TerrainKind; shape: "rect"; x: number; y: number; w: number; h: number }
  | { id: string; kind: TerrainKind; shape: "circle"; x: number; y: number; r: number };

export type TerrainRule = {
  kind: TerrainKind;
  label: string;
  buildable: boolean;
  walkable: boolean;
  speedMultiplier: number;
};

type WorldTerrainMaskData = {
  columns: number;
  rows: number;
  cells: TerrainKind[];
};

export const TERRAIN_RULES: Record<TerrainKind, TerrainRule> = {
  PLAINS: { kind: "PLAINS", label: "Plains", buildable: true, walkable: true, speedMultiplier: 1 },
  FOREST: { kind: "FOREST", label: "Forest", buildable: true, walkable: true, speedMultiplier: 0.85 },
  MOUNTAIN: { kind: "MOUNTAIN", label: "Mountain", buildable: false, walkable: false, speedMultiplier: 0 },
  WATER: { kind: "WATER", label: "Water", buildable: false, walkable: false, speedMultiplier: 0 },
  ROAD: { kind: "ROAD", label: "Road", buildable: true, walkable: true, speedMultiplier: 1.25 },
  COAST: { kind: "COAST", label: "Coast", buildable: true, walkable: true, speedMultiplier: 0.95 },
  DESERT: { kind: "DESERT", label: "Desert", buildable: true, walkable: true, speedMultiplier: 0.90 },
  SWAMP: { kind: "SWAMP", label: "Swamp", buildable: true, walkable: true, speedMultiplier: 0.70 },
  TUNDRA: { kind: "TUNDRA", label: "Tundra", buildable: true, walkable: true, speedMultiplier: 0.80 },
  HILLS: { kind: "HILLS", label: "Hills", buildable: true, walkable: true, speedMultiplier: 0.80 },
};

export const LOCAL_TERRAIN_AREAS: TerrainArea[] = [
  { id: "river-west", kind: "WATER", shape: "rect", x: 0, y: 0.08, w: 0.15, h: 0.86 },
  { id: "river-east", kind: "WATER", shape: "rect", x: 0.82, y: 0.05, w: 0.18, h: 0.88 },
  { id: "north-ridge", kind: "MOUNTAIN", shape: "rect", x: 0.05, y: 0, w: 0.9, h: 0.18 },
  { id: "east-ridge", kind: "MOUNTAIN", shape: "rect", x: 0.82, y: 0.22, w: 0.18, h: 0.62 },
  { id: "south-forest", kind: "FOREST", shape: "rect", x: 0.08, y: 0.76, w: 0.84, h: 0.24 },
  { id: "west-forest", kind: "FOREST", shape: "rect", x: 0, y: 0.22, w: 0.22, h: 0.58 },
  { id: "center-road", kind: "ROAD", shape: "circle", x: 0.5, y: 0.5, r: 0.16 },
  { id: "north-road", kind: "ROAD", shape: "rect", x: 0.44, y: 0.18, w: 0.12, h: 0.32 },
  { id: "south-road", kind: "ROAD", shape: "rect", x: 0.45, y: 0.5, w: 0.1, h: 0.32 },
  { id: "west-road", kind: "ROAD", shape: "rect", x: 0.22, y: 0.45, w: 0.28, h: 0.1 },
  { id: "east-road", kind: "ROAD", shape: "rect", x: 0.5, y: 0.45, w: 0.3, h: 0.1 },
  { id: "coast-west", kind: "COAST", shape: "rect", x: 0.12, y: 0.16, w: 0.1, h: 0.72 },
  { id: "coast-east", kind: "COAST", shape: "rect", x: 0.76, y: 0.16, w: 0.08, h: 0.72 },
];

const TERRAIN_KINDS: TerrainKind[] = ["PLAINS", "FOREST", "MOUNTAIN", "WATER", "ROAD", "COAST", "DESERT", "SWAMP", "TUNDRA", "HILLS"];
let cachedMask: { mtimeMs: number; data: WorldTerrainMaskData | null } | null = null;

// ── Active procedural terrain ─────────────────────────────────────────────────
// Set by worldTerrainRuntime after generation. Checked first in resolveTerrainAt.
type ProceduralTerrain = { cols: number; rows: number; cells: TerrainKind[] };
let activeProcedural: ProceduralTerrain | null = null;

export function setActiveProceduralTerrain(data: ProceduralTerrain | null) {
  activeProcedural = data;
}

function getMaskPath() {
  const candidates = [
    path.resolve(process.cwd(), "src", "data", "world-terrain-mask.json"),
    path.resolve(process.cwd(), "apps", "web", "src", "data", "world-terrain-mask.json"),
    path.resolve(process.cwd(), "..", "web", "src", "data", "world-terrain-mask.json"),
    path.resolve(process.cwd(), "..", "..", "apps", "web", "src", "data", "world-terrain-mask.json"),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function readTerrainMask(): WorldTerrainMaskData | null {
  const maskPath = getMaskPath();
  if (!maskPath) return null;
  const stat = existsSync(maskPath) ? statSync(maskPath) : null;
  if (cachedMask && cachedMask.mtimeMs === stat?.mtimeMs) return cachedMask.data;

  try {
    const raw = JSON.parse(readFileSync(maskPath, "utf8")) as Partial<WorldTerrainMaskData>;
    const columns = Math.max(8, Math.floor(Number(raw.columns) || 0));
    const rows = Math.max(8, Math.floor(Number(raw.rows) || 0));
    const inputCells = Array.isArray(raw.cells) ? raw.cells : [];
    const cells = Array.from({ length: columns * rows }, (_, index) => {
      const value = inputCells[index];
      return TERRAIN_KINDS.includes(value as TerrainKind) ? value as TerrainKind : "PLAINS";
    });
    const data = { columns, rows, cells };
    cachedMask = { mtimeMs: stat?.mtimeMs ?? Date.now(), data };
    return data;
  } catch {
    cachedMask = { mtimeMs: stat?.mtimeMs ?? Date.now(), data: null };
    return null;
  }
}

export function worldToNormalized(x: number, y: number, width: number, height: number) {
  return {
    x: (x + width / 2) / width,
    y: (y + height / 2) / height,
  };
}

export function resolveTerrainAt(x: number, y: number, width: number, height: number): TerrainRule {
  const p = worldToNormalized(x, y, width, height);

  // Check procedural terrain first (registered by worldTerrainRuntime at boot)
  if (activeProcedural) {
    const { cols, rows, cells } = activeProcedural;
    const col = Math.min(cols - 1, Math.max(0, Math.floor(p.x * cols)));
    const row = Math.min(rows - 1, Math.max(0, Math.floor(p.y * rows)));
    return TERRAIN_RULES[cells[row * cols + col] ?? "PLAINS"];
  }

  const mask = readTerrainMask();
  if (mask) {
    const col = Math.min(mask.columns - 1, Math.max(0, Math.floor(p.x * mask.columns)));
    const row = Math.min(mask.rows - 1, Math.max(0, Math.floor(p.y * mask.rows)));
    return TERRAIN_RULES[mask.cells[row * mask.columns + col] ?? "PLAINS"];
  }

  for (let i = LOCAL_TERRAIN_AREAS.length - 1; i >= 0; i--) {
    const area = LOCAL_TERRAIN_AREAS[i];
    if (area.shape === "rect") {
      if (p.x >= area.x && p.x <= area.x + area.w && p.y >= area.y && p.y <= area.y + area.h) return TERRAIN_RULES[area.kind];
    } else {
      if (Math.hypot(p.x - area.x, p.y - area.y) <= area.r) return TERRAIN_RULES[area.kind];
    }
  }
  return TERRAIN_RULES.PLAINS;
}

export function isBuildableTerrain(x: number, y: number, width: number, height: number) {
  return resolveTerrainAt(x, y, width, height).buildable;
}

function getPathGrid(width: number, height: number) {
  const cols = 72;
  const rows = 48;
  const cellW = width / cols;
  const cellH = height / rows;
  return { cols, rows, cellW, cellH };
}

function pointToCell(x: number, y: number, width: number, height: number) {
  const grid = getPathGrid(width, height);
  const normalized = worldToNormalized(x, y, width, height);
  return {
    ...grid,
    col: Math.min(grid.cols - 1, Math.max(0, Math.floor(normalized.x * grid.cols))),
    row: Math.min(grid.rows - 1, Math.max(0, Math.floor(normalized.y * grid.rows))),
  };
}

function cellCenter(col: number, row: number, width: number, height: number) {
  const grid = getPathGrid(width, height);
  return {
    x: -width / 2 + (col + 0.5) * grid.cellW,
    y: -height / 2 + (row + 0.5) * grid.cellH,
  };
}

function findNearestWalkableCell(col: number, row: number, width: number, height: number) {
  const grid = getPathGrid(width, height);
  for (let radius = 0; radius < Math.max(grid.cols, grid.rows); radius++) {
    for (let y = row - radius; y <= row + radius; y++) {
      for (let x = col - radius; x <= col + radius; x++) {
        if (x < 0 || y < 0 || x >= grid.cols || y >= grid.rows) continue;
        if (Math.abs(x - col) !== radius && Math.abs(y - row) !== radius) continue;
        const center = cellCenter(x, y, width, height);
        if (resolveTerrainAt(center.x, center.y, width, height).walkable) return { col: x, row: y };
      }
    }
  }
  return null;
}

function calculateWalkablePathCost(fromX: number, fromY: number, toX: number, toY: number, width: number, height: number) {
  const grid = getPathGrid(width, height);
  const startCell = pointToCell(fromX, fromY, width, height);
  const endCell = pointToCell(toX, toY, width, height);
  const start = findNearestWalkableCell(startCell.col, startCell.row, width, height);
  const end = findNearestWalkableCell(endCell.col, endCell.row, width, height);
  if (!start || !end) return null;

  const key = (col: number, row: number) => row * grid.cols + col;
  const targetKey = key(end.col, end.row);
  const open = new Set<number>([key(start.col, start.row)]);
  const gScore = new Map<number, number>([[key(start.col, start.row), 0]]);
  const fScore = new Map<number, number>([[key(start.col, start.row), Math.hypot(end.col - start.col, end.row - start.row)]]);
  const neighbors = [
    [-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1],
    [-1, -1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [1, 1, Math.SQRT2],
  ] as const;

  for (let steps = 0; steps < grid.cols * grid.rows && open.size > 0; steps++) {
    let current = -1;
    let best = Infinity;
    for (const candidate of open) {
      const score = fScore.get(candidate) ?? Infinity;
      if (score < best) {
        best = score;
        current = candidate;
      }
    }
    if (current === targetKey) return gScore.get(current) ?? null;
    open.delete(current);
    const col = current % grid.cols;
    const row = Math.floor(current / grid.cols);

    for (const [dx, dy, stepDistance] of neighbors) {
      const nextCol = col + dx;
      const nextRow = row + dy;
      if (nextCol < 0 || nextRow < 0 || nextCol >= grid.cols || nextRow >= grid.rows) continue;
      const center = cellCenter(nextCol, nextRow, width, height);
      const terrain = resolveTerrainAt(center.x, center.y, width, height);
      if (!terrain.walkable) continue;
      const nextKey = key(nextCol, nextRow);
      const worldDistance = stepDistance * Math.hypot(grid.cellW, grid.cellH) / Math.SQRT2;
      const moveCost = worldDistance / Math.max(0.1, terrain.speedMultiplier);
      const tentative = (gScore.get(current) ?? Infinity) + moveCost;
      if (tentative >= (gScore.get(nextKey) ?? Infinity)) continue;
      gScore.set(nextKey, tentative);
      fScore.set(nextKey, tentative + Math.hypot(end.col - nextCol, end.row - nextRow) * Math.min(grid.cellW, grid.cellH));
      open.add(nextKey);
    }
  }

  return null;
}

export function calculatePathSpeedMultiplier(fromX: number, fromY: number, toX: number, toY: number, width: number, height: number) {
  const straightDistance = Math.max(1, Math.hypot(toX - fromX, toY - fromY));
  const pathCost = calculateWalkablePathCost(fromX, fromY, toX, toY, width, height);
  if (pathCost && Number.isFinite(pathCost)) {
    return Math.max(0.15, Math.min(1.4, straightDistance / pathCost));
  }

  const samples = 12;
  let sum = 0;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const x = fromX + (toX - fromX) * t;
    const y = fromY + (toY - fromY) * t;
    const terrain = resolveTerrainAt(x, y, width, height);
    sum += terrain.walkable ? terrain.speedMultiplier : 0.15;
  }
  return Math.max(0.15, sum / (samples + 1));
}

export function findNearestBuildablePoint(x: number, y: number, width: number, height: number) {
  const start = pointToCell(x, y, width, height);
  const grid = getPathGrid(width, height);
  for (let radius = 0; radius < Math.max(grid.cols, grid.rows); radius++) {
    for (let row = start.row - radius; row <= start.row + radius; row++) {
      for (let col = start.col - radius; col <= start.col + radius; col++) {
        if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) continue;
        if (Math.abs(col - start.col) !== radius && Math.abs(row - start.row) !== radius) continue;
        const center = cellCenter(col, row, width, height);
        if (isBuildableTerrain(center.x, center.y, width, height)) return center;
      }
    }
  }
  return { x, y };
}
