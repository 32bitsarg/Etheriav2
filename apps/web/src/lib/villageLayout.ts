import type { BuildingType } from "@etheria/shared";
import { BUILDING_SIZES } from "@/lib/constants";

export interface VillageLayoutAnchor {
  x: number;
  y: number;
  scale?: number;
}

export interface VillageLayoutData {
  version: number;
  backgroundAssetPath: string;
  referenceWidth: number;
  referenceHeight: number;
  anchors: Record<string, VillageLayoutAnchor>;
}

const ISO_MAP_SIZE = 24;
const ISO_TILE_W = 36;
const ISO_TILE_H = 18;

export function getVillageTileKey(tileX: number, tileY: number) {
  return `${tileX}:${tileY}`;
}

export function getDefaultVillageAnchor(
  layout: Pick<VillageLayoutData, "referenceWidth" | "referenceHeight">,
  tileX: number,
  tileY: number,
  buildingType: BuildingType
): VillageLayoutAnchor {
  const size = BUILDING_SIZES[buildingType] ?? { w: 1, h: 1 };
  const centerX = (ISO_MAP_SIZE * ISO_TILE_W) / 2;
  const isoX = (tileX - tileY) * (ISO_TILE_W / 2) + centerX;
  const isoY = (tileX + tileY) * (ISO_TILE_H / 2) + 36;
  const footprintWidth = Math.max(44, (size.w + size.h) * (ISO_TILE_W / 2));
  const footprintHeight = Math.max(28, (size.w + size.h) * (ISO_TILE_H / 2));

  return {
    x: (isoX - footprintWidth / 2) / layout.referenceWidth,
    y: (isoY - footprintHeight / 2 - 18) / layout.referenceHeight,
    scale: 1,
  };
}

export function resolveVillageAnchor(
  layout: VillageLayoutData,
  tileX: number,
  tileY: number,
  buildingType: BuildingType
) {
  return layout.anchors[getVillageTileKey(tileX, tileY)] ?? getDefaultVillageAnchor(layout, tileX, tileY, buildingType);
}

export function getVillageBuildingFrame(
  layout: VillageLayoutData,
  renderWidth: number,
  renderHeight: number,
  tileX: number,
  tileY: number,
  buildingType: BuildingType
) {
  const size = BUILDING_SIZES[buildingType] ?? { w: 1, h: 1 };
  const anchor = resolveVillageAnchor(layout, tileX, tileY, buildingType);
  const scale = anchor.scale ?? 1;
  const scaleX = renderWidth / layout.referenceWidth;
  const scaleY = renderHeight / layout.referenceHeight;
  const footprintWidth = Math.max(44, (size.w + size.h) * (ISO_TILE_W / 2)) * scaleX;
  const footprintHeight = Math.max(28, (size.w + size.h) * (ISO_TILE_H / 2)) * scaleY;
  const height = footprintHeight + (56 * scaleY);

  return {
    left: anchor.x * renderWidth,
    top: anchor.y * renderHeight,
    width: footprintWidth,
    height,
    zIndex: 10 + tileX + tileY,
    spriteScale: Math.min(3, Math.max(0.35, (0.72 + (size.w + size.h) * 0.08) * scale)),
    scale,
  };
}
