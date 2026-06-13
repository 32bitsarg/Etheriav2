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
    width: 20000,
    height: 20000,
    cameraMinZoom: 0.07,
    cameraMaxZoom: 2.2,
    cameraInitialZoom: 0.32,
    backgroundAssetPath: "/assets/backgrounds/world-map-terrain-v2.webp",
    terrainSeed: 1337,
    decorDensity: 0.7,
    decorSafeRadius: 280,
    terrainOverlayEnabled: false,
    terrainCols: 700,
    terrainRows: 700,
    tileSize: 24,
  },
  spawn: {
    strategy: "soft-clusters",
    minCityDistance: 480,
    clusterRadius: 2000,
    clusterTargetPlayers: 8,
    clusterSearchStep: 1000,
    edgePadding: 420,
    maxPlacementAttempts: 240,
  },
  createdAt: now,
  updatedAt: now,
};
