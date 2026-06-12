export type WorldMapConfig = {
  width: number;
  height: number;
  cameraMinZoom: number;
  cameraMaxZoom: number;
  cameraInitialZoom: number;
  backgroundAssetPath: string;
  terrainSeed: number;
  decorDensity: number;
  decorSafeRadius: number;
  terrainOverlayEnabled?: boolean;
  // Procedural terrain grid dimensions
  terrainCols: number;
  terrainRows: number;
  tileSize: number; // px per tile in world space
};

export type WorldSpawnConfig = {
  strategy: "soft-clusters";
  minCityDistance: number;
  clusterRadius: number;
  clusterTargetPlayers: number;
  clusterSearchStep: number;
  edgePadding: number;
  maxPlacementAttempts: number;
};

export type WorldConfigDoc = {
  id: string;
  version: number;
  map: WorldMapConfig;
  spawn: WorldSpawnConfig;
  createdAt: string;
  updatedAt: string;
};

const now = new Date().toISOString();

export const LOCAL_WORLD_CONFIG: WorldConfigDoc = {
  id: 'local-world-config',
  version: 1,
  map: {
    width: 12000,
    height: 12000,
    cameraMinZoom: 0.12,
    cameraMaxZoom: 2.2,
    cameraInitialZoom: 0.45,
    backgroundAssetPath: "/assets/backgrounds/world-map-terrain-v2.webp",
    terrainSeed: 1337,
    decorDensity: 0.7,
    decorSafeRadius: 200,
    terrainOverlayEnabled: false,
    terrainCols: 500,
    terrainRows: 500,
    tileSize: 24,
  },
  spawn: {
    strategy: "soft-clusters",
    minCityDistance: 350,
    clusterRadius: 1400,
    clusterTargetPlayers: 8,
    clusterSearchStep: 700,
    edgePadding: 300,
    maxPlacementAttempts: 200,
  },
  createdAt: now,
  updatedAt: now,
};
