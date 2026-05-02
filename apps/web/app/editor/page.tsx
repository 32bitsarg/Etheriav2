"use client";

import { STARTER_BUILDING_LAYOUT, type BuildingType } from "@etheria/shared";
import { useMemo, useRef, useState } from "react";
import { BuildingSprite } from "@/components/village/BuildingIcon";
import { VillageStage } from "@/components/village/VillageStage";
import { GameInitializer } from "@/components/game/GameInitializer";
import { useGameStore } from "@/stores/gameStore";
import { BUILDING_NAMES } from "@/lib/constants";
import { useSaveVillageLayout, useVillageLayout } from "@/hooks/useCity";
import {
  getDefaultVillageAnchor,
  getVillageTileKey,
  type VillageLayoutData,
} from "@/lib/villageLayout";

function dedupeBuildings<T extends { id: string; type: BuildingType; level: number; positionX: number; positionY: number; createdAt?: string; upgradedAt?: string }>(
  input: T[]
) {
  const byOrigin = new Map<string, T>();

  for (const building of input) {
    const key = `${building.positionX}:${building.positionY}`;
    const existing = byOrigin.get(key);
    if (!existing) {
      byOrigin.set(key, building);
      continue;
    }

    const existingUpdatedAt = new Date(existing.upgradedAt ?? existing.createdAt ?? 0).getTime();
    const candidateUpdatedAt = new Date(building.upgradedAt ?? building.createdAt ?? 0).getTime();
    if (candidateUpdatedAt >= existingUpdatedAt && building.level >= existing.level) {
      byOrigin.set(key, building);
    }
  }

  return [...byOrigin.values()].sort((a, b) => (a.positionY - b.positionY) || (a.positionX - b.positionX));
}

type EditorBuilding = {
  id: string;
  type: BuildingType;
  level: number;
  positionX: number;
  positionY: number;
  createdAt?: string;
  upgradedAt?: string;
  ghost?: boolean;
};

function withStarterGhosts(buildings: EditorBuilding[]): EditorBuilding[] {
  const byTile = new Set(buildings.map((building) => `${building.positionX}:${building.positionY}`));
  const next = [...buildings];

  for (const starter of STARTER_BUILDING_LAYOUT) {
    const tileKey = `${starter.x}:${starter.y}`;
    if (byTile.has(tileKey)) continue;
    next.push({
      id: `ghost:${starter.type}:${starter.x}:${starter.y}`,
      type: starter.type,
      level: 1,
      positionX: starter.x,
      positionY: starter.y,
      ghost: true,
    });
  }

  return next.sort((a, b) => (a.positionY - b.positionY) || (a.positionX - b.positionX));
}

export default function VillageLayoutEditorPage() {
  const buildings = useGameStore((s) => s.buildings);
  const { data } = useVillageLayout();
  const saveMutation = useSaveVillageLayout();
  const imageRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<VillageLayoutData | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [panelPos, setPanelPos] = useState({ x: 16, y: 16 });
  const panelDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  const layout = draft ?? data ?? {
    version: 1,
    backgroundAssetPath: "/assets/backgrounds/village-isometric-base.png",
    referenceWidth: 1536,
    referenceHeight: 1024,
    anchors: {},
  };

  const uniqueBuildings = useMemo(() => withStarterGhosts(dedupeBuildings(buildings) as EditorBuilding[]), [buildings]);
  const selectedBuilding = uniqueBuildings.find((building) => building.id === selectedId) ?? uniqueBuildings[0] ?? null;

  const ensureDraft = () => {
    if (draft) return draft;
    const next = structuredClone(layout);
    setDraft(next);
    return next;
  };

  const setAnchorFromPointer = (
    building: { positionX: number; positionY: number; type: BuildingType; id: string },
    clientX: number,
    clientY: number
  ) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const renderWidth = rect.width;
    const renderHeight = rect.height;
    const next = ensureDraft();
    const offset = dragOffsetRef.current ?? { x: 0, y: 0 };
    const x = Math.min(1, Math.max(0, (clientX - rect.left - offset.x) / renderWidth));
    const y = Math.min(1, Math.max(0, (clientY - rect.top - offset.y) / renderHeight));
    const key = getVillageTileKey(building.positionX, building.positionY);
    const current = next.anchors[key] ?? getDefaultVillageAnchor(layout, building.positionX, building.positionY, building.type);
    next.anchors[key] = { ...current, x, y };
    setDraft({ ...next, anchors: { ...next.anchors } });
  };

  const handlePointerDown = (building: { positionX: number; positionY: number; type: BuildingType; id: string }, event: React.PointerEvent<HTMLButtonElement>) => {
    setSelectedId(building.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const renderWidth = rect.width;
    const renderHeight = rect.height;
    const currentAnchor = layout.anchors[getVillageTileKey(building.positionX, building.positionY)]
      ?? getDefaultVillageAnchor(layout, building.positionX, building.positionY, building.type);
    dragOffsetRef.current = {
        x: (event.clientX - rect.left) - (currentAnchor.x * renderWidth),
        y: (event.clientY - rect.top) - (currentAnchor.y * renderHeight),
      };
  };

  const handlePointerMove = (building: { positionX: number; positionY: number; type: BuildingType; id: string }, event: React.PointerEvent<HTMLButtonElement>) => {
    if ((event.buttons & 1) !== 1) return;
    setAnchorFromPointer(building, event.clientX, event.clientY);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    dragOffsetRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleResetSelected = () => {
    if (!selectedBuilding) return;
    const next = ensureDraft();
    const key = getVillageTileKey(selectedBuilding.positionX, selectedBuilding.positionY);
    delete next.anchors[key];
    setDraft({ ...next, anchors: { ...next.anchors } });
  };

  const handleScaleChange = (delta: number) => {
    if (!selectedBuilding) return;
    const next = ensureDraft();
    const key = getVillageTileKey(selectedBuilding.positionX, selectedBuilding.positionY);
    const current = next.anchors[key] ?? getDefaultVillageAnchor(layout, selectedBuilding.positionX, selectedBuilding.positionY, selectedBuilding.type);
    const nextScale = Math.min(3, Math.max(0.35, (current.scale ?? 1) + delta));
    next.anchors[key] = { ...current, scale: Number(nextScale.toFixed(2)) };
    setDraft({ ...next, anchors: { ...next.anchors } });
  };

  const handlePanelPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    panelDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: panelPos.x,
      originY: panelPos.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePanelPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panelDragRef.current) return;
    const dx = event.clientX - panelDragRef.current.startX;
    const dy = event.clientY - panelDragRef.current.startY;
    setPanelPos({
      x: Math.max(8, panelDragRef.current.originX + dx),
      y: Math.max(8, panelDragRef.current.originY + dy),
    });
  };

  const handlePanelPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    panelDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleSave = () => {
    saveMutation.mutate(layout, {
      onSuccess: () => setDraft(null),
    });
  };

  const hasUnsavedChanges = draft !== null;
  const selectedKey = selectedBuilding ? getVillageTileKey(selectedBuilding.positionX, selectedBuilding.positionY) : null;
  const selectedAnchor = selectedBuilding && selectedKey
    ? (layout.anchors[selectedKey] ?? getDefaultVillageAnchor(layout, selectedBuilding.positionX, selectedBuilding.positionY, selectedBuilding.type))
    : null;

  return (
    <main className="relative h-screen overflow-hidden bg-[#050707] text-etheria-text">
      <GameInitializer />
      <section
        className={`absolute z-[250] ${panelCollapsed ? "w-[220px]" : "w-[320px]"} overflow-hidden rounded-2xl border border-etheria-border bg-etheria-panel/95 backdrop-blur-[6px]`}
        style={{ left: panelPos.x, top: panelPos.y, maxHeight: "calc(100vh - 32px)" }}
      >
          <div
            className="flex cursor-move items-center justify-between border-b border-etheria-border px-4 py-3"
            onPointerDown={handlePanelPointerDown}
            onPointerMove={handlePanelPointerMove}
            onPointerUp={handlePanelPointerUp}
            onPointerCancel={handlePanelPointerUp}
          >
            <div className="text-[11px] uppercase tracking-[0.2em] text-etheria-gold-soft">Editor de layout</div>
            <button
              onClick={() => setPanelCollapsed((v) => !v)}
              className="rounded-lg border border-etheria-border px-2 py-1 text-[11px] text-etheria-text"
            >
              {panelCollapsed ? "Abrir" : "Ocultar"}
            </button>
          </div>
          {!panelCollapsed && <div className="overflow-auto p-4">
          <h1 className="mt-2 font-serif text-2xl text-etheria-gold-soft">/editor</h1>
          <p className="mt-2 text-sm text-etheria-text-muted">
            Preview 1:1 de la aldea. Arrastrá un edificio sobre el fondo real y guardá el JSON.
          </p>

          <div className="mt-4 flex gap-2">
            <button onClick={handleSave} className="gold-btn px-4 py-2 text-sm" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : "Guardar JSON"}
            </button>
            <button onClick={handleResetSelected} className="rounded-lg border border-etheria-border px-4 py-2 text-sm">
              Reset seleccionado
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-etheria-border-dim bg-black/20 p-3 text-xs text-etheria-text-muted">
            <div>Archivo: <span className="font-mono text-etheria-text">apps/web/src/data/village-layout.json</span></div>
            <div>Referencia: <span className="font-mono text-etheria-text">{layout.referenceWidth} × {layout.referenceHeight}</span></div>
            <div>Anchors guardados: <span className="font-mono text-etheria-text">{Object.keys(layout.anchors).length}</span></div>
          </div>

          <div className="mt-4 max-h-[70vh] overflow-auto rounded-xl border border-etheria-border-dim bg-black/20 p-2">
            {uniqueBuildings.length === 0 ? (
              <div className="rounded-xl border border-etheria-border-dim bg-black/10 px-4 py-6 text-center text-sm text-etheria-text-muted">
                No hay edificios cargados todavía. Si acabás de entrar, esperá a que termine la inicialización de la ciudad.
              </div>
            ) : (
              <div className="space-y-2">
                {uniqueBuildings.map((building) => {
                const key = getVillageTileKey(building.positionX, building.positionY);
                const isSelected = selectedBuilding?.id === building.id;
                return (
                  <button
                    key={building.id}
                    onClick={() => setSelectedId(building.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left ${isSelected ? "border-etheria-gold bg-etheria-gold/10" : "border-etheria-border-dim bg-black/10"}`}
                  >
                    <BuildingSprite type={building.type} size={42} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-serif text-sm text-etheria-gold-soft">{BUILDING_NAMES[building.type]}</div>
                      <div className="font-mono text-[11px] text-etheria-text-muted">{key}</div>
                    </div>
                    <div className="text-[11px] text-etheria-text-muted">
                      {building.ghost ? "Ghost" : layout.anchors[key] ? "Custom" : "Default"}
                    </div>
                  </button>
                );
              })}
              </div>
            )}
          </div>
          </div>}
      </section>

      <section className="absolute inset-0">
          <div
            ref={imageRef}
            className="h-full w-full"
          >
            <VillageStage
              layout={layout}
              buildings={uniqueBuildings}
              selectedBuildingId={selectedId}
              onSelectBuilding={setSelectedId}
              onPointerDownBuilding={handlePointerDown}
              onPointerMoveBuilding={handlePointerMove}
              onPointerUpBuilding={handlePointerUp}
              showGhosts
              showEditorCoordinates
              className="h-full w-full"
            >
            <div className="absolute top-4 z-[260] flex items-center gap-2 rounded-xl border border-etheria-border bg-black/58 px-3 py-2 backdrop-blur-[3px]" style={{ left: panelCollapsed ? 252 : 352 }}>
              <button onClick={handleSave} className="gold-btn px-4 text-xs" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Guardando..." : "Guardar"}
              </button>
              <button onClick={handleResetSelected} className="rounded-lg border border-etheria-border px-3 py-1.5 text-xs text-etheria-text">
                Reset
              </button>
              <div className="flex items-center gap-1 rounded-lg border border-etheria-border px-2 py-1 text-xs">
                <button onClick={() => handleScaleChange(-0.05)} className="text-etheria-text">-</button>
                <span className="min-w-[54px] text-center font-mono text-etheria-gold-soft">
                  {selectedAnchor ? `${(selectedAnchor.scale ?? 1).toFixed(2)}x` : "1.00x"}
                </span>
                <button onClick={() => handleScaleChange(0.05)} className="text-etheria-text">+</button>
              </div>
              <span className={`text-[11px] font-mono ${hasUnsavedChanges ? "text-amber-300" : "text-etheria-text-muted"}`}>
                {hasUnsavedChanges ? "Cambios sin guardar" : "Sin cambios"}
              </span>
            </div>

            {selectedBuilding && (
              <div className="absolute right-4 top-4 z-[260] rounded-xl border border-etheria-border bg-black/58 px-3 py-2 text-right backdrop-blur-[3px]">
                <div className="font-serif text-sm text-etheria-gold-soft">{BUILDING_NAMES[selectedBuilding.type]}</div>
                <div className="font-mono text-[11px] text-etheria-text-muted">
                  {selectedBuilding.positionX}:{selectedBuilding.positionY}
                </div>
              </div>
            )}
            </VillageStage>
          </div>
      </section>
    </main>
  );
}
