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
    width: 3600,
    height: 3600,
    cameraMinZoom: 0.5,
    cameraMaxZoom: 2.0,
    cameraInitialZoom: 0.85,
    backgroundAssetPath: "/assets/backgrounds/world-map-terrain-v2.webp",
    terrainSeed: 1337,
    decorDensity: 0.7,
    decorSafeRadius: 170,
    terrainOverlayEnabled: false,
    terrainCols: 200,
    terrainRows: 200,
    tileSize: 18,
  },
  spawn: {
    strategy: "soft-clusters",
    minCityDistance: 220,
    clusterRadius: 420,
    clusterTargetPlayers: 8,
    clusterSearchStep: 180,
    edgePadding: 220,
    maxPlacementAttempts: 80,
  },
  createdAt: now,
  updatedAt: now,
};
