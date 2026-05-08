"use client";

import type { BuildingType } from "@etheria/shared";
import { getBuildingImagePath } from "@/lib/constants";

const SHEET_COLS = 4;
const SHEET_ROWS = 4;
const CELL_WIDTH = 384;
const CELL_HEIGHT = 256;
const SPRITESHEET_PATH = "/assets/buildings/structures/isometric-buildings-sheet.png";

export const BUILDING_SHEET_MAP: Record<BuildingType, number> = {
  TOWN_HALL: 0,
  GOLD_MINE: 1,
  LUMBER_MILL: 2,
  QUARRY: 3,
  FARM: 4,
  BARRACKS: 5,
  STABLE: 6,
  ALLIANCE_CENTER: 7,
  LIBRARY: 8,
  STORAGE: 9,
  TOWER: 11,
  MARKET: 12,
};

export function BuildingSprite({
  type,
  level = 1,
  size = 48,
  className = "",
}: {
  type: BuildingType;
  level?: number;
  size?: number;
  className?: string;
}) {
  const customImage = getBuildingImagePath(type, level);
  if (customImage) {
    return (
      <img
        src={customImage}
        alt={type}
        draggable={false}
        className={`inline-block object-contain ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  const frame = BUILDING_SHEET_MAP[type];
  if (frame === undefined) {
    return <span className={`inline-block bg-etheria-panel-light rounded ${className}`} style={{ width: size, height: size }} />;
  }

  const col = frame % SHEET_COLS;
  const row = Math.floor(frame / SHEET_COLS);
  const bgWidth = SHEET_COLS * size;
  const bgHeight = SHEET_ROWS * size;
  const bgX = -(col * size);
  const bgY = -(row * size);

  return (
    <span
      className={`inline-block ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${SPRITESHEET_PATH})`,
        backgroundPosition: `${bgX}px ${bgY}px`,
        backgroundSize: `${bgWidth}px ${bgHeight}px`,
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}
