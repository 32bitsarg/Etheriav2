export type TerrainKind =
  | "PLAINS" | "FOREST" | "MOUNTAIN" | "WATER" | "ROAD" | "COAST"
  | "DESERT" | "SWAMP" | "TUNDRA" | "HILLS" | "JUNGLE" | "SAVANNA" | "TAIGA";

export type TerrainArea =
  | { id: string; kind: TerrainKind; shape: "rect"; x: number; y: number; w: number; h: number }
  | { id: string; kind: TerrainKind; shape: "circle"; x: number; y: number; r: number };

export const TERRAIN_COLORS: Record<TerrainKind, number> = {
  PLAINS: 0x8bbf5a,
  FOREST: 0x2e7d45,
  MOUNTAIN: 0x9aa0a6,
  WATER: 0x2d9cdb,
  ROAD: 0xd6b36a,
  COAST: 0x65c7b7,
  DESERT: 0xd6c084,
  SWAMP: 0x4a5636,
  TUNDRA: 0xb0b8b2,
  HILLS: 0x8a8a4f,
  JUNGLE: 0x1c5a2e,
  SAVANNA: 0xc2b257,
  TAIGA: 0x3a5a4a,
};

export const WORLD_TERRAIN_AREAS: TerrainArea[] = [
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
