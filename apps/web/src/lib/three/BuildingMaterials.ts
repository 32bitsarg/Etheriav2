// Material IDs: 0=air, 1=wall, 2=roof, 3=accent, 4=glass, 5=wood, 6=foundation

export type MaterialId = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface MaterialMap {
  colors: Record<number, number>;
  name: string;
}

export const BUILDING_MATERIALS: Record<string, MaterialMap> = {
  TOWN_HALL: {
    name: "Town Hall",
    colors: { 1: 0x8B7355, 2: 0x4A2810, 3: 0xDAA520, 4: 0x88bbee, 5: 0x6B4226, 6: 0x666666 },
  },
  TOWER: {
    name: "Tower",
    colors: { 1: 0x787878, 2: 0x404040, 3: 0xA0A0A0, 4: 0x88bbee, 5: 0x5A3A1A, 6: 0x555555 },
  },
  BARRACKS: {
    name: "Barracks",
    colors: { 1: 0x6B6355, 2: 0x3F1F0F, 3: 0x8B0000, 4: 0x88bbee, 5: 0x5A3A1A, 6: 0x777777 },
  },
  STABLE: {
    name: "Stable",
    colors: { 1: 0x8B6914, 2: 0x6B3410, 3: 0x4A2810, 4: 0x88bbee, 5: 0xC4A060, 6: 0x777766 },
  },
  FARM: {
    name: "Farm",
    colors: { 1: 0xD2B48C, 2: 0x8B4513, 3: 0x228B22, 4: 0x88bbee, 5: 0xA0522D, 6: 0x999999 },
  },
  LIBRARY: {
    name: "Library",
    colors: { 1: 0xC4A882, 2: 0x2A1A0A, 3: 0x8B4513, 4: 0xaaddff, 5: 0x6B4226, 6: 0x888888 },
  },
  GOLD_MINE: {
    name: "Gold Mine",
    colors: { 1: 0x6B5B4A, 2: 0x3A2A1A, 3: 0xFFD700, 4: 0x88bbee, 5: 0x8B6914, 6: 0x555544 },
  },
  LUMBER_MILL: {
    name: "Lumber Mill",
    colors: { 1: 0x6B4423, 2: 0x3A2410, 3: 0x228B22, 4: 0x88bbee, 5: 0xC4A060, 6: 0x666655 },
  },
  QUARRY: {
    name: "Quarry",
    colors: { 1: 0x808080, 2: 0x505050, 3: 0xA0A0A0, 4: 0x88bbee, 5: 0x8B6914, 6: 0x444444 },
  },
  MARKET: {
    name: "Market",
    colors: { 1: 0xDAA520, 2: 0xFF6347, 3: 0x8B4513, 4: 0x88bbee, 5: 0xC4A060, 6: 0x999955 },
  },
  STORAGE: {
    name: "Storage",
    colors: { 1: 0x8B7355, 2: 0x3A2010, 3: 0xA0522D, 4: 0x88bbee, 5: 0x6B4226, 6: 0x777766 },
  },
  ALLIANCE_CENTER: {
    name: "Alliance Center",
    colors: { 1: 0x5A6B7A, 2: 0x2A3040, 3: 0x4169E1, 4: 0xaaddff, 5: 0x5C4033, 6: 0x666677 },
  },
};
