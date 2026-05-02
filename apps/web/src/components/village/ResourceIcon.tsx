"use client";

const RESOURCE_SPRITE_MAP: Record<string, { x: number; y: number }> = {
  gold: { x: 256, y: 512 },       // Gold.png
  wood: { x: 1152, y: 256 },      // WoodLogs.png
  stone: { x: 768, y: 896 },      // Stone.png
  food: { x: 1152, y: 128 },      // Wheat.png
  gems: { x: 512, y: 384 },       // Crystal.png
};

const SPRITE_SIZE = 128;

export function ResourceIcon({
  type,
  size = 24,
  className = "",
}: {
  type: string;
  size?: number;
  className?: string;
}) {
  const pos = RESOURCE_SPRITE_MAP[type];
  if (!pos) return <span className={`inline-block w-${size} h-${size}`} />;

  return (
    <span
      className={`inline-block ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: "url(/assets/icons/resources/spritesheet.png)",
        backgroundPosition: `-${(pos.x / SPRITE_SIZE) * size}px -${(pos.y / SPRITE_SIZE) * size}px`,
        backgroundSize: `${(1280 / SPRITE_SIZE) * size}px ${(1152 / SPRITE_SIZE) * size}px`,
        imageRendering: "pixelated",
      }}
    />
  );
}
