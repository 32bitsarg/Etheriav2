import * as THREE from "three";
import type { BuildingType } from "@etheria/shared";

const BUILDING_PALETTES: Record<string, { base: number; accent: number; roof: number }> = {
  TOWN_HALL:       { base: 0x8B7355, accent: 0xDAA520, roof: 0x4A2810 },
  GOLD_MINE:       { base: 0x6B5B4A, accent: 0xFFD700, roof: 0x3A2A1A },
  LUMBER_MILL:     { base: 0x6B4423, accent: 0x228B22, roof: 0x3A2410 },
  QUARRY:          { base: 0x808080, accent: 0xA0A0A0, roof: 0x505050 },
  FARM:            { base: 0xD2B48C, accent: 0x228B22, roof: 0x8B4513 },
  BARRACKS:        { base: 0x696969, accent: 0x8B0000, roof: 0x2F2F2F },
  STABLE:          { base: 0x8B6914, accent: 0x6B3410, roof: 0x4A2810 },
  LIBRARY:         { base: 0xC4A882, accent: 0x8B4513, roof: 0x2A1A0A },
  STORAGE:         { base: 0x8B7355, accent: 0xA0522D, roof: 0x3A2010 },
  TOWER:           { base: 0x808080, accent: 0xC0C0C0, roof: 0x404040 },
  MARKET:          { base: 0xDAA520, accent: 0xFF6347, roof: 0x8B4513 },
  ALLIANCE_CENTER: { base: 0x6B5B4A, accent: 0x4169E1, roof: 0x3A2A1A },
};

interface Voxel {
  x: number; y: number; z: number;
  color: number;
}

function addBox(voxels: Voxel[], x: number, y: number, z: number, w: number, h: number, d: number, color: number) {
  for (let dx = 0; dx < w; dx++)
    for (let dy = 0; dy < h; dy++)
      for (let dz = 0; dz < d; dz++)
        voxels.push({ x: x + dx, y: y + dy, z: z + dz, color });
}

function generateVoxels(type: string, level: number): Voxel[] {
  const palette = BUILDING_PALETTES[type] ?? BUILDING_PALETTES.TOWN_HALL;
  const tier = Math.min(5, Math.floor(level / 5));
  const h = 2 + tier;
  const voxels: Voxel[] = [];

  switch (type) {
    case "TOWER":
      addBox(voxels, 0, 0, 0, 2, h + 3, 2, palette.base);
      addBox(voxels, -1, h, -1, 1, 1, 1, palette.accent);
      addBox(voxels, 2, h, 2, 1, 1, 1, palette.accent);
      addBox(voxels, 0, h + 3, 0, 2, 1, 2, palette.roof);
      break;
    case "FARM":
      addBox(voxels, 0, 0, 0, 2, h, 2, palette.base);
      addBox(voxels, 3, 0, 1, 3, 1, 3, palette.accent);
      addBox(voxels, 0, h, 0, 2, 1, 2, palette.roof);
      break;
    case "BARRACKS":
      addBox(voxels, 0, 0, 0, 3, h, 2, palette.base);
      addBox(voxels, 0, h, 0, 3, 1, 2, palette.roof);
      addBox(voxels, 1, 1, 0, 1, 1, 1, palette.accent);
      break;
    case "STABLE":
      addBox(voxels, 0, 0, 0, 3, h, 1, palette.base);
      addBox(voxels, 0, h, 0, 3, 1, 1, palette.roof);
      addBox(voxels, 3, 0, 0, 1, 1, 2, palette.accent);
      break;
    case "LIBRARY":
      addBox(voxels, 0, 0, 0, 2, h + 1, 2, palette.base);
      addBox(voxels, 0, h, 0, 2, 1, 2, palette.accent);
      addBox(voxels, 0, h + 1, 0, 2, 1, 2, palette.roof);
      break;
    case "GOLD_MINE":
      addBox(voxels, 0, 0, 0, 2, h, 1, palette.base);
      addBox(voxels, 0, 0, -1, 1, 1, 1, palette.accent);
      addBox(voxels, 0, h, 0, 2, 1, 1, palette.roof);
      break;
    case "LUMBER_MILL":
      addBox(voxels, 0, 0, 0, 2, h, 2, palette.base);
      addBox(voxels, 2, 0, 0, 1, 1, 1, palette.accent);
      addBox(voxels, 0, h, 0, 2, 1, 2, palette.roof);
      break;
    case "QUARRY":
      addBox(voxels, 1, 0, 1, 1, h + 1, 1, palette.base);
      addBox(voxels, 0, 0, 0, 2, 1, 2, palette.accent);
      addBox(voxels, 1, h, 1, 1, 1, 1, palette.roof);
      break;
    case "MARKET":
      addBox(voxels, 0, 0, 0, 3, h, 1, palette.base);
      addBox(voxels, 0, 0, 1, 1, 1, 1, palette.accent);
      addBox(voxels, 2, 0, 1, 1, 1, 1, palette.accent);
      addBox(voxels, 0, h, 0, 3, 1, 1, palette.roof);
      break;
    case "ALLIANCE_CENTER":
      addBox(voxels, 0, 0, 0, 3, h + 1, 3, palette.base);
      addBox(voxels, 1, 0, 2, 1, h + 2, 1, palette.accent);
      addBox(voxels, 0, h + 1, 0, 3, 1, 3, palette.roof);
      break;
    case "TOWN_HALL":
    default:
      addBox(voxels, 0, 0, 0, 3, h + 1, 3, palette.base);
      addBox(voxels, 1, 0, 2, 1, h + 2, 1, palette.accent);
      addBox(voxels, 0, h + 1, 0, 3, 1, 3, palette.roof);
      if (level >= 10) {
        addBox(voxels, 1, h + 2, 1, 1, 1, 1, palette.accent);
      }
      break;
  }
  return voxels;
}

const buildingMeshCache = new Map<string, THREE.InstancedMesh>();

function createInstancedMesh(type: string, level: number, cubeGeo: THREE.BoxGeometry): THREE.InstancedMesh {
  const voxels = generateVoxels(type, level);
  const groups = new Map<number, THREE.Matrix4[]>();

  for (const v of voxels) {
    const list = groups.get(v.color) ?? [];
    const mat = new THREE.Matrix4().makeScale(1, 1, 1);
    mat.setPosition(v.x, v.y, v.z);
    list.push(mat);
    groups.set(v.color, list);
  }

  let result: THREE.InstancedMesh | null = null;
  for (const [color, matrices] of groups) {
    const mat = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.InstancedMesh(cubeGeo, mat, matrices.length);
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    if (!result) result = mesh;
    else mesh.position.copy(result.position);
  }
  return result!;
}

const cubeGeo = new THREE.BoxGeometry(1, 1, 1);

export function getBuildingMesh(type: BuildingType, level: number): THREE.InstancedMesh {
  const key = `${type}:${level}`;
  const cached = buildingMeshCache.get(key);
  if (cached) return cached.clone() as THREE.InstancedMesh;

  const mesh = createInstancedMesh(type, level, cubeGeo);
  buildingMeshCache.set(key, mesh);
  return mesh.clone() as THREE.InstancedMesh;
}

export function disposeBuildingCache() {
  for (const mesh of buildingMeshCache.values()) {
    mesh.geometry?.dispose();
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((m) => m.dispose());
    } else {
      mesh.material?.dispose();
    }
  }
  buildingMeshCache.clear();
}
