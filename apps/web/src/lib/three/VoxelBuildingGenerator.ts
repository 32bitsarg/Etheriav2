import * as THREE from "three";
import type { BuildingType } from "@etheria/shared";
import { BUILDING_MATERIALS, type MaterialId } from "./BuildingMaterials";
import { getRecipe, getRecipeGridSize } from "./BuildingRecipes";
import { buildVoxelMesh } from "./VoxelMeshBuilder";

const VOXEL_SIZE = 0.35;
const buildingCache = new Map<string, THREE.Group>();

function getVisualTier(level: number): number {
  if (level >= 25) return 6;
  if (level >= 20) return 5;
  if (level >= 15) return 4;
  if (level >= 10) return 3;
  if (level >= 5) return 2;
  return 1;
}

export function getBuildingGroup(type: BuildingType, level: number): THREE.Group {
  const tier = getVisualTier(level);
  const key = `${type}:${tier}`;
  const cached = buildingCache.get(key);
  if (cached) return cached.clone();

  const recipe = getRecipe(type);
  const { w, d, h } = getRecipeGridSize(type, tier);
  const grid = recipe(tier, w, d, h);
  const mats = BUILDING_MATERIALS[type]?.colors ?? BUILDING_MATERIALS.TOWN_HALL.colors;

  const group = buildVoxelMesh(grid, mats, VOXEL_SIZE);
  buildingCache.set(key, group);
  return group.clone();
}

export function getBuildingWorldSize(type: BuildingType, level: number): { w: number; d: number; h: number } {
  const tier = getVisualTier(level);
  const gs = getRecipeGridSize(type, tier);
  return {
    w: gs.w * VOXEL_SIZE,
    d: gs.d * VOXEL_SIZE,
    h: gs.h * VOXEL_SIZE,
  };
}

export function disposeBuildingCache() {
  for (const group of buildingCache.values()) {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    });
  }
  buildingCache.clear();
}
