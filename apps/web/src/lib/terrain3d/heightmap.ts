import type { TerrainKind } from "@/lib/worldTerrainMask";

const TERRAIN_HEIGHTS: Record<string, number> = {
  WATER: 0,
  COAST: 1,
  ROAD: 2,
  PLAINS: 3,
  FOREST: 4,
  MOUNTAIN: 7,
};

const TERRAIN_COLORS: Record<string, number> = {
  WATER: 0x247fc0,
  COAST: 0x58b6a5,
  ROAD: 0xc69a53,
  PLAINS: 0x7fae55,
  FOREST: 0x1f6f3a,
  MOUNTAIN: 0x8d9298,
};

export function terrainKindToHeight(kind: TerrainKind): number {
  return TERRAIN_HEIGHTS[kind] ?? 3;
}

export function terrainKindToColor(kind: TerrainKind): number {
  return TERRAIN_COLORS[kind] ?? 0x7fae55;
}

export interface HeightmapData {
  cells: string[];
  columns: number;
  rows: number;
  worldWidth: number;
  worldHeight: number;
}

export function generateHeightmap(data: HeightmapData): Float32Array {
  const { cells, columns, rows } = data;
  const heights = new Float32Array(columns * rows);
  for (let i = 0; i < cells.length; i++) {
    const kind = cells[i] ?? "PLAINS";
    heights[i] = TERRAIN_HEIGHTS[kind] ?? 3;
  }
  return heights;
}

export function generateColorArray(data: HeightmapData): Uint32Array {
  const { cells, columns, rows } = data;
  const colors = new Uint32Array(columns * rows);
  for (let i = 0; i < cells.length; i++) {
    const kind = cells[i] ?? "PLAINS";
    colors[i] = TERRAIN_COLORS[kind] ?? 0x7fae55;
  }
  return colors;
}

export function cellToWorld(col: number, row: number, columns: number, rows: number, worldWidth: number, worldHeight: number) {
  return {
    x: (col / columns) * worldWidth - worldWidth / 2,
    z: (row / rows) * worldHeight - worldHeight / 2,
  };
}
