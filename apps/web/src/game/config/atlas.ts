// Atlas configuration for Etheria building spritesheets
// Each entry maps a BuildingType to [atlasKey, frameName]

export const BUILDING_ATLAS_MAP: Record<string, [string, string]> = {
  // Housing atlas (housing.png)
  TOWN_HALL: ["housing", "town_hall"],
  FARM: ["housing", "farm"],
  STORAGE: ["housing", "storage"],
  LIBRARY: ["housing", "library"],
  MARKET: ["housing", "market"],
  ALLIANCE_CENTER: ["housing", "alliance"],

  // Fortified structures atlas (fortified_structures.png)
  BARRACKS: ["fortified", "barracks"],
  STABLE: ["fortified", "stable"],
  TOWER: ["fortified", "tower"],

  // Nature/Misc (assign later or use misc)
  GOLD_MINE: ["nature", "gold_mine"],
  LUMBER_MILL: ["nature", "lumber_mill"],
  QUARRY: ["nature", "quarry"],
};

// Fallback: if building not in atlas map, use individual texture with same name
export function getBuildingAtlasKey(type: string): { atlas: string | null; frame: string } {
  const mapped = BUILDING_ATLAS_MAP[type];
  if (mapped) {
    return { atlas: mapped[0], frame: mapped[1] };
  }
  // No atlas mapping: use texture directly
  return { atlas: null, frame: type };
}
