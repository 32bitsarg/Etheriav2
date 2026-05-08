import type { BuildingType } from "@etheria/shared";
import { BUILDING_SIZES } from "@/lib/constants";

export interface VillageLayoutAnchor {
  x: number;
  y: number;
  scale?: number;
}

export interface VillageLayoutEditorBuildingMeta {
  locked?: boolean;
  hidden?: boolean;
  note?: string;
}

export interface VillageLayoutEditorData {
  buildings?: Record<string, VillageLayoutEditorBuildingMeta>;
  lastSelected?: string | null;
  camera?: { x: number; y: number; zoom: number };
  showGrid?: boolean;
  showSafeAreas?: boolean;
  snapToGrid?: boolean;
}

export interface VillageLayoutData {
  version: number;
  backgroundAssetPath: string;
  referenceWidth: number;
  referenceHeight: number;
  anchors: Record<string, VillageLayoutAnchor>;
  editor?: VillageLayoutEditorData;
}

const DEFAULT_LAYOUT: VillageLayoutData = {
  version: 1,
  backgroundAssetPath: "/assets/backgrounds/village-fullscreen.png",
  referenceWidth: 1672,
  referenceHeight: 941,
  anchors: {},
  editor: {
    buildings: {},
    lastSelected: null,
    showGrid: true,
    showSafeAreas: true,
    snapToGrid: false,
  },
};

const ISO_MAP_SIZE = 24;
const ISO_TILE_W = 36;
const ISO_TILE_H = 18;

export function getVillageTileKey(tileX: number, tileY: number) {
  return `${tileX}:${tileY}`;
}

export function resolveVillageRenderableBuildings<T extends { id: string; type: BuildingType; level: number; positionX: number; positionY: number; createdAt?: string; upgradedAt?: string }>(inputBuildings: T[]) {
  const sorted = [...inputBuildings].sort((a, b) => {
    const aTime = new Date(a.upgradedAt ?? a.createdAt ?? 0).getTime();
    const bTime = new Date(b.upgradedAt ?? b.createdAt ?? 0).getTime();
    if (aTime === bTime) return b.level - a.level;
    return bTime - aTime;
  });
  const occupied = new Set<string>();
  const chosen: T[] = [];
  for (const building of sorted) {
    const size = BUILDING_SIZES[building.type] ?? { w: 1, h: 1 };
    const tiles: string[] = [];
    for (let dx = 0; dx < size.w; dx++) {
      for (let dy = 0; dy < size.h; dy++) {
        const x = building.positionX + dx;
        const y = building.positionY + dy;
        if (x < 0 || y < 0 || x >= ISO_MAP_SIZE || y >= ISO_MAP_SIZE) continue;
        tiles.push(`${x}:${y}`);
      }
    }
    if (tiles.length > 0 && tiles.some((tile) => occupied.has(tile))) continue;
    tiles.forEach((tile) => occupied.add(tile));
    chosen.push(building);
  }
  return chosen.sort((a, b) => (a.positionY - b.positionY) || (a.positionX - b.positionX));
}

export function normalizeVillageLayout(input?: Partial<VillageLayoutData> | null): VillageLayoutData {
  const referenceWidth = Number(input?.referenceWidth);
  const referenceHeight = Number(input?.referenceHeight);
  const editor = input?.editor && typeof input.editor === "object" ? input.editor : {};
  return {
    version: Number.isFinite(Number(input?.version)) ? Number(input?.version) : DEFAULT_LAYOUT.version,
    backgroundAssetPath: typeof input?.backgroundAssetPath === "string" && input.backgroundAssetPath.trim().length > 0
      ? input.backgroundAssetPath
      : DEFAULT_LAYOUT.backgroundAssetPath,
    referenceWidth: Number.isFinite(referenceWidth) && referenceWidth > 32 ? referenceWidth : DEFAULT_LAYOUT.referenceWidth,
    referenceHeight: Number.isFinite(referenceHeight) && referenceHeight > 32 ? referenceHeight : DEFAULT_LAYOUT.referenceHeight,
    anchors: input?.anchors && typeof input.anchors === "object" ? input.anchors : DEFAULT_LAYOUT.anchors,
    editor: {
      buildings: editor.buildings && typeof editor.buildings === "object" ? editor.buildings : {},
      lastSelected: typeof editor.lastSelected === "string" ? editor.lastSelected : null,
      showGrid: typeof editor.showGrid === "boolean" ? editor.showGrid : DEFAULT_LAYOUT.editor!.showGrid,
      showSafeAreas: typeof editor.showSafeAreas === "boolean" ? editor.showSafeAreas : DEFAULT_LAYOUT.editor!.showSafeAreas,
      snapToGrid: typeof editor.snapToGrid === "boolean" ? editor.snapToGrid : DEFAULT_LAYOUT.editor!.snapToGrid,
    },
  };
}

export function getVillageWorldPosition(layout: VillageLayoutData, anchor: VillageLayoutAnchor, worldScale = 1) {
  return {
    x: anchor.x * layout.referenceWidth * worldScale - (layout.referenceWidth * worldScale) / 2,
    y: anchor.y * layout.referenceHeight * worldScale - (layout.referenceHeight * worldScale) / 2,
  };
}

export function getVillageAnchorFromWorld(layout: VillageLayoutData, x: number, y: number, worldScale = 1): VillageLayoutAnchor {
  const worldWidth = layout.referenceWidth * worldScale;
  const worldHeight = layout.referenceHeight * worldScale;
  return {
    x: Math.min(1, Math.max(0, (x + worldWidth / 2) / worldWidth)),
    y: Math.min(1, Math.max(0, (y + worldHeight / 2) / worldHeight)),
  };
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
  buildingType: BuildingType,
  worldScale = 1
) {
  const size = BUILDING_SIZES[buildingType] ?? { w: 1, h: 1 };
  const anchor = resolveVillageAnchor(layout, tileX, tileY, buildingType);
  const scale = anchor.scale ?? 1;
  const scaleX = renderWidth / layout.referenceWidth;
  const scaleY = renderHeight / layout.referenceHeight;
  const footprintWidth = (Math.max(44, (size.w + size.h) * (ISO_TILE_W / 2)) * scaleX) / worldScale;
  const footprintHeight = (Math.max(28, (size.w + size.h) * (ISO_TILE_H / 2)) * scaleY) / worldScale;
  const spriteScale = Math.min(3, Math.max(0.35, (0.72 + (size.w + size.h) * 0.08) * scale));
  const sceneSpriteScale = spriteScale * 0.72;
  const estimatedSpriteWidth = (96 * sceneSpriteScale * scaleX) / worldScale;
  const estimatedSpriteHeight = (96 * sceneSpriteScale * scaleY) / worldScale;
  const spriteLeft = anchor.x * renderWidth + footprintWidth / 2 - estimatedSpriteWidth / 2;
  const spriteTop = anchor.y * renderHeight + footprintHeight / 2 - estimatedSpriteHeight * 0.72;

  return {
    left: spriteLeft,
    top: spriteTop,
    width: estimatedSpriteWidth,
    height: estimatedSpriteHeight,
    zIndex: 10 + tileX + tileY,
    spriteScale,
    scale,
    anchorLeft: anchor.x * renderWidth,
    anchorTop: anchor.y * renderHeight,
    footprintWidth,
    footprintHeight,
  };
}
