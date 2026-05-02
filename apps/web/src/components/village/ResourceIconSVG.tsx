"use client";

const SHEET_PATH = "/assets/icons/resources/spritesheet.png";
const SHEET_W = 1280;
const SHEET_H = 1152;
const FRAME = 128;

// Coordinates taken from `public/assets/icons/resources/spritesheet.json`
const RESOURCE_FRAME: Record<string, { x: number; y: number }> = {
  gold: { x: 256, y: 512 },    // Gold.png
  wood: { x: 1152, y: 256 },  // WoodLogs.png
  stone: { x: 768, y: 896 },  // Stone.png
  food: { x: 1152, y: 128 },  // Wheat.png
  gems: { x: 512, y: 384 },   // Crystal.png
};

export function ResourceIconSVG({
  type,
  size = 20,
  className = "",
}: {
  type: string;
  size?: number;
  className?: string;
}) {
  const frame = RESOURCE_FRAME[type];
  if (!frame) return null;

  const scale = size / FRAME;
  const bgW = SHEET_W * scale;
  const bgH = SHEET_H * scale;
  const bgX = -(frame.x * scale);
  const bgY = -(frame.y * scale);

  return (
    <span
      className={`inline-block ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${SHEET_PATH})`,
        backgroundPosition: `${bgX}px ${bgY}px`,
        backgroundSize: `${bgW}px ${bgH}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "auto",
      }}
    />
  );
}
