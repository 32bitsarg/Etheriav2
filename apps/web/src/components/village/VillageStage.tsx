"use client";

import type { BuildingType } from "@etheria/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { BUILDING_NAMES } from "@/lib/constants";
import { BuildingSprite } from "@/components/village/BuildingIcon";
import { getDefaultVillageAnchor, getVillageBuildingFrame, getVillageTileKey, type VillageLayoutData } from "@/lib/villageLayout";

type StageBuilding = {
  id: string;
  type: BuildingType;
  level: number;
  positionX: number;
  positionY: number;
  ghost?: boolean;
};

type VillageStageProps = {
  layout: VillageLayoutData;
  buildings: StageBuilding[];
  selectedBuildingId?: string | null;
  onSelectBuilding?: (id: string) => void;
  onPointerDownBuilding?: (building: StageBuilding, event: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerMoveBuilding?: (building: StageBuilding, event: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUpBuilding?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  showGhosts?: boolean;
  showEditorCoordinates?: boolean;
  showNameWithLevel?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export function VillageStage({
  layout,
  buildings,
  selectedBuildingId = null,
  onSelectBuilding,
  onPointerDownBuilding,
  onPointerMoveBuilding,
  onPointerUpBuilding,
  showGhosts = false,
  showEditorCoordinates = false,
  showNameWithLevel = false,
  className = "",
  children,
}: VillageStageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState({ width: layout.referenceWidth, height: layout.referenceHeight });

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;

    const updateSize = () => {
      setStageSize({
        width: node.clientWidth || layout.referenceWidth,
        height: node.clientHeight || layout.referenceHeight,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, [layout.referenceHeight, layout.referenceWidth]);

  const backgroundRect = useMemo(() => {
    const viewportRatio = stageSize.width / Math.max(stageSize.height, 1);
    const imageRatio = layout.referenceWidth / Math.max(layout.referenceHeight, 1);

    if (viewportRatio > imageRatio) {
      const renderWidth = stageSize.width;
      const renderHeight = renderWidth / imageRatio;
      return {
        left: 0,
        top: (stageSize.height - renderHeight) / 2,
        width: renderWidth,
        height: renderHeight,
      };
    }

    const renderHeight = stageSize.height;
    const renderWidth = renderHeight * imageRatio;
    return {
      left: (stageSize.width - renderWidth) / 2,
      top: 0,
      width: renderWidth,
      height: renderHeight,
    };
  }, [layout.referenceHeight, layout.referenceWidth, stageSize.height, stageSize.width]);

  return (
    <div
      ref={stageRef}
      className={`relative h-full w-full overflow-hidden bg-cover bg-center ${className}`}
      style={{ backgroundImage: `url('${layout.backgroundAssetPath}')` }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,7,7,0.08),rgba(4,7,7,0.28))]" />
      {children}
      {buildings.map((building) => {
        const frame = getVillageBuildingFrame(
          layout,
          backgroundRect.width,
          backgroundRect.height,
          building.positionX,
          building.positionY,
          building.type
        );
        const selected = selectedBuildingId === building.id;
        const key = getVillageTileKey(building.positionX, building.positionY);
        const anchor = layout.anchors[key] ?? getDefaultVillageAnchor(layout, building.positionX, building.positionY, building.type);
        const spriteBoxWidth = Math.max(48, 96 * frame.spriteScale);
        const spriteBoxHeight = Math.max(48, 96 * frame.spriteScale);

        return (
          <button
            key={building.id}
            onClick={() => onSelectBuilding?.(building.id)}
            onPointerDown={onPointerDownBuilding ? (event) => onPointerDownBuilding(building, event) : undefined}
            onPointerMove={onPointerMoveBuilding ? (event) => onPointerMoveBuilding(building, event) : undefined}
            onPointerUp={onPointerUpBuilding}
            onPointerCancel={onPointerUpBuilding}
            className={`absolute ${onPointerDownBuilding ? "touch-none" : ""}`}
            style={{
              left: `${frame.left}px`,
              top: `${frame.top}px`,
              width: `${frame.width}px`,
              height: `${frame.height}px`,
              zIndex: frame.zIndex,
              transform: `translate(${backgroundRect.left}px, ${backgroundRect.top}px)`,
            }}
            title={`${BUILDING_NAMES[building.type]} (${key})`}
          >
            {showGhosts && building.ghost && (
              <span className="absolute inset-0 rounded-lg border border-dashed border-etheria-gold/30 bg-black/8" />
            )}
            <span className={`absolute left-1/2 top-1/2 ${selected ? "drop-shadow-[0_0_18px_rgba(46,199,201,0.35)]" : ""}`} style={{
              width: `${spriteBoxWidth}px`,
              height: `${spriteBoxHeight}px`,
              transform: "translate(-50%, -66%)",
            }}>
              <span className="absolute left-1/2 top-1/2" style={{ transform: `translate(-50%, -50%) scale(${frame.spriteScale})` }}>
                <BuildingSprite type={building.type} size={96} />
              </span>
            </span>
            {showNameWithLevel ? (
              <span className="absolute bottom-2 left-1/2 flex max-w-[150px] -translate-x-1/2 flex-col items-center rounded-[14px] border border-etheria-border bg-black/68 px-2 py-1 leading-none">
                <span className="text-[10px] font-mono text-etheria-gold-soft">Nv {building.level}</span>
                <span className="mt-1 max-w-[132px] truncate text-[9px] font-serif uppercase tracking-[0.08em] text-etheria-text">
                  {BUILDING_NAMES[building.type]}
                </span>
              </span>
            ) : (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-etheria-border bg-black/60 px-1.5 py-0.5 text-[10px] font-mono text-etheria-gold-soft">
                {building.ghost ? `${key} · ghost` : key}
              </span>
            )}
            {showEditorCoordinates && selected && (
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-full bg-black/75 px-2 py-1 text-[10px] font-mono text-etheria-text">
                {anchor.x.toFixed(4)}, {anchor.y.toFixed(4)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
