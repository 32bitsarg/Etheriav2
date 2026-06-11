"use client";

import { type BuildingType } from "@etheria/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BuildingSprite } from "@/components/village/BuildingIcon";
import { VillageHTMLCanvas } from "@/components/village/VillageHTMLCanvas";
import { WorldMapHTMLCanvas } from "@/components/worldmap/WorldMapHTMLCanvas";
import { GameInitializer } from "@/components/game/GameInitializer";
import { useGameStore } from "@/stores/gameStore";
import { BUILDING_NAMES } from "@/lib/constants";
import { useSaveVillageLayout, useSaveWorldTerrainMask, useVillageLayout, useWorldMap, useWorldTerrainMask } from "@/hooks/useCity";
import { I18nProvider, useI18n } from "@/i18n";
import { clearAdminSecret, getAdminSecret, setAdminSecret } from "@/lib/adminClient";
import {
  getDefaultVillageAnchor,
  getVillageTileKey,
  resolveVillageRenderableBuildings,
  type VillageLayoutData,
} from "@/lib/villageLayout";
import {
  normalizeWorldTerrainMask,
  TERRAIN_COLOR_HEX,
  TERRAIN_KINDS,
  TERRAIN_RULES,
  type TerrainKind,
  type WorldTerrainMaskData,
} from "@/lib/worldTerrainMask";
import { BotAdminPanel } from "./BotAdminPanel";

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

export default function EditorClient() {
  return (
    <I18nProvider>
      <VillageLayoutEditorContent />
    </I18nProvider>
  );
}

function VillageLayoutEditorContent() {
  const { t } = useI18n();
  const buildings = useGameStore((s) => s.buildings);
  const { data } = useVillageLayout();
  const { data: worldMap } = useWorldMap();
  const { data: terrainData } = useWorldTerrainMask();
  const saveMutation = useSaveVillageLayout();
  const saveTerrainMutation = useSaveWorldTerrainMask();
  const panelDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  const [editorMode, setEditorMode] = useState<"village" | "world-terrain" | "bots">("village");
  const [apiTarget, setApiTarget] = useState<"local" | "prod">("local");
  const [adminSecret, setAdminSecretState] = useState(() => getAdminSecret());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<VillageLayoutData | null>(null);
  const [terrainDraft, setTerrainDraft] = useState<WorldTerrainMaskData | null>(null);
  const [selectedTerrain, setSelectedTerrain] = useState<TerrainKind>("MOUNTAIN");
  const [brushSize, setBrushSize] = useState(2);
  const [showTerrainOverlay, setShowTerrainOverlay] = useState(true);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [panelPos, setPanelPos] = useState({ x: 16, y: 16 });
  const [editorCenterVersion, setEditorCenterVersion] = useState(0);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, ok });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  const layout = draft ?? data ?? {
    version: 1,
    backgroundAssetPath: "/assets/backgrounds/village-fullscreen.webp",
    referenceWidth: 1672,
    referenceHeight: 941,
    anchors: {},
  };

  const terrainMask = terrainDraft ?? normalizeWorldTerrainMask(terrainData);
  const uniqueBuildings = useMemo(() => resolveVillageRenderableBuildings(buildings as EditorBuilding[]).map((building) => ({
    ...building,
    displayName: t(BUILDING_NAMES[building.type] ?? building.type),
  })), [buildings, t]);
  const selectedBuilding = uniqueBuildings.find((building) => building.id === selectedId) ?? uniqueBuildings[0] ?? null;

  useEffect(() => {
    if (selectedId || !layout.editor?.lastSelected) return;
    if (uniqueBuildings.some((building) => building.id === layout.editor?.lastSelected)) setSelectedId(layout.editor.lastSelected);
  }, [layout.editor?.lastSelected, selectedId, uniqueBuildings]);

  const ensureDraft = () => {
    if (draft) return draft;
    const next = structuredClone(layout);
    setDraft(next);
    return next;
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleResetSelected = () => {
    if (!selectedBuilding) return;
    const next = ensureDraft();
    delete next.anchors[getVillageTileKey(selectedBuilding.positionX, selectedBuilding.positionY)];
    setDraft({ ...next, anchors: { ...next.anchors } });
  };

  const handleResetAll = () => {
    const next = ensureDraft();
    setDraft({ ...next, anchors: {} });
  };

  const nudgeSelected = (dx: number, dy: number) => {
    if (!selectedBuilding) return;
    const next = ensureDraft();
    const key = getVillageTileKey(selectedBuilding.positionX, selectedBuilding.positionY);
    const current = next.anchors[key] ?? getDefaultVillageAnchor(layout, selectedBuilding.positionX, selectedBuilding.positionY, selectedBuilding.type);
    next.anchors[key] = {
      ...current,
      x: Number(Math.min(1, Math.max(0, current.x + dx)).toFixed(4)),
      y: Number(Math.min(1, Math.max(0, current.y + dy)).toFixed(4)),
    };
    setDraft({ ...next, anchors: { ...next.anchors } });
  };

  const handleScaleChange = (delta: number) => {
    if (!selectedBuilding) return;
    const next = ensureDraft();
    const key = getVillageTileKey(selectedBuilding.positionX, selectedBuilding.positionY);
    const current = next.anchors[key] ?? getDefaultVillageAnchor(layout, selectedBuilding.positionX, selectedBuilding.positionY, selectedBuilding.type);
    next.anchors[key] = { ...current, scale: Number(Math.min(3, Math.max(0.35, (current.scale ?? 1) + delta)).toFixed(2)) };
    setDraft({ ...next, anchors: { ...next.anchors } });
  };

  const updateEditorMeta = (updater: (editor: NonNullable<VillageLayoutData["editor"]>) => NonNullable<VillageLayoutData["editor"]>) => {
    const next = ensureDraft();
    const editor = updater(next.editor ?? {});
    setDraft({ ...next, editor });
  };

  const updateSelectedMeta = (patch: { locked?: boolean; hidden?: boolean; note?: string }) => {
    if (!selectedBuilding) return;
    updateEditorMeta((editor) => {
      const key = getVillageTileKey(selectedBuilding.positionX, selectedBuilding.positionY);
      return {
        ...editor,
        buildings: {
          ...(editor.buildings ?? {}),
          [key]: {
            ...(editor.buildings?.[key] ?? {}),
            ...patch,
          },
        },
      };
    });
  };

  const selectBuilding = useCallback((id: string) => {
    setSelectedId(id);
    setDraft((current) => {
      const base = current ?? layout;
      return { ...base, editor: { ...(base.editor ?? {}), lastSelected: id } };
    });
  }, [layout]);

  const handleAnchorChange = useCallback((payload: { tileKey: string; anchor: { x: number; y: number; scale?: number } }) => {
    setDraft((current) => {
      const base = current ?? layout;
      const existing = base.anchors[payload.tileKey] ?? {};
      return {
        ...base,
        anchors: {
          ...base.anchors,
          [payload.tileKey]: { ...existing, ...payload.anchor },
        },
      };
    });
  }, [layout]);


  const handlePanelPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    panelDragRef.current = { startX: event.clientX, startY: event.clientY, originX: panelPos.x, originY: panelPos.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePanelPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panelDragRef.current) return;
    setPanelPos({
      x: Math.max(8, panelDragRef.current.originX + event.clientX - panelDragRef.current.startX),
      y: Math.max(8, panelDragRef.current.originY + event.clientY - panelDragRef.current.startY),
    });
  };

  const handlePanelPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    panelDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  // Keyboard arrow-key nudge (Shift = 5× step)
  const nudgeRef = useRef(nudgeSelected);
  const scaleRef = useRef(handleScaleChange);
  nudgeRef.current = nudgeSelected;
  scaleRef.current = handleScaleChange;
  useEffect(() => {
    if (editorMode !== "village") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const step = e.shiftKey ? 0.025 : 0.005;
      if (e.key === "ArrowUp") { e.preventDefault(); nudgeRef.current(0, -step); }
      else if (e.key === "ArrowDown") { e.preventDefault(); nudgeRef.current(0, step); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); nudgeRef.current(-step, 0); }
      else if (e.key === "ArrowRight") { e.preventDefault(); nudgeRef.current(step, 0); }
      else if (e.key === "-") scaleRef.current(-0.05);
      else if (e.key === "=") scaleRef.current(0.05);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editorMode]);

  const handleSave = () => saveMutation.mutate(layout, {
    onSuccess: () => { setDraft(null); showToast("Guardado ✓", true); },
    onError: () => showToast("Error al guardar", false),
  });
  const handleSaveTerrain = () => saveTerrainMutation.mutate(terrainMask, {
    onSuccess: () => { setTerrainDraft(null); showToast("Terreno guardado ✓", true); },
    onError: () => showToast("Error al guardar terreno", false),
  });
  const handleLogout = () => {
    clearAdminSecret();
    setAdminSecretState("");
  };
  const handleResetTerrain = () => setTerrainDraft({ ...terrainMask, cells: terrainMask.cells.map(() => "PLAINS") });

  const hasUnsavedChanges = draft !== null;
  const selectedKey = selectedBuilding ? getVillageTileKey(selectedBuilding.positionX, selectedBuilding.positionY) : null;
  const selectedAnchor = selectedBuilding && selectedKey
    ? (layout.anchors[selectedKey] ?? getDefaultVillageAnchor(layout, selectedBuilding.positionX, selectedBuilding.positionY, selectedBuilding.type))
    : null;
  const selectedMeta = selectedKey ? layout.editor?.buildings?.[selectedKey] ?? {} : {};
  const selectedRule = TERRAIN_RULES[selectedTerrain];

  if (!adminSecret) {
    return (
      <main className="flex h-screen items-center justify-center bg-[#050707] text-etheria-text">
        <div className="w-80 rounded-2xl border border-etheria-border bg-etheria-panel/95 p-8 text-center">
          <h1 className="font-serif text-2xl text-etheria-gold-soft mb-1">/editor</h1>
          <p className="text-xs text-etheria-text-muted mb-6">Ingresá el secreto de administrador para continuar.</p>
          <input
            type="password"
            autoFocus
            placeholder="Admin secret"
            className="w-full rounded-lg border border-etheria-border-dim bg-black/30 px-3 py-2 text-sm text-etheria-text outline-none placeholder:text-etheria-text-muted mb-4"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const val = (e.target as HTMLInputElement).value.trim();
                if (val) { setAdminSecret(val); setAdminSecretState(val); }
              }
            }}
          />
          <button
            className="gold-btn w-full py-2 text-sm"
            onClick={(e) => {
              const input = (e.currentTarget.previousSibling as HTMLInputElement);
              const val = input?.value?.trim();
              if (val) { setAdminSecret(val); setAdminSecretState(val); }
            }}
          >
            Entrar
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-screen overflow-hidden bg-[#050707] text-etheria-text">
      <GameInitializer />
      {toast && (
        <div className={`fixed bottom-6 left-1/2 z-[500] -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-medium shadow-lg transition-all ${toast.ok ? "bg-emerald-800/90 text-emerald-100" : "bg-rose-800/90 text-rose-100"}`}>
          {toast.msg}
        </div>
      )}
      <section
        className={`absolute z-[250] ${panelCollapsed ? "w-[220px]" : "w-[340px]"} overflow-hidden rounded-2xl border border-etheria-border bg-etheria-panel/95 backdrop-blur-[6px]`}
        style={{ left: panelPos.x, top: panelPos.y, maxHeight: "calc(100vh - 32px)" }}
      >
        <div
          className="flex cursor-move items-center justify-between border-b border-etheria-border px-4 py-3"
          onPointerDown={handlePanelPointerDown}
          onPointerMove={handlePanelPointerMove}
          onPointerUp={handlePanelPointerUp}
          onPointerCancel={handlePanelPointerUp}
        >
          <div className="text-[11px] uppercase tracking-[0.2em] text-etheria-gold-soft">{t("editor.title")}</div>
          <button onClick={() => setPanelCollapsed((value) => !value)} className="rounded-lg border border-etheria-border px-2 py-1 text-[11px] text-etheria-text">
            {panelCollapsed ? t("editor.open") : t("editor.hide")}
          </button>
        </div>

        {!panelCollapsed && (
          <div className="overflow-auto p-4">
            <div className="flex items-center justify-between">
              <h1 className="font-serif text-2xl text-etheria-gold-soft">/editor</h1>
              <select
                value={apiTarget}
                onChange={(e) => setApiTarget(e.target.value as any)}
                className="rounded-lg border border-amber-500/30 bg-black/40 px-3 py-1.5 text-xs text-amber-300"
              >
                <option value="local">🖥️ Local</option>
                <option value="prod">🌐 Producción</option>
              </select>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="password"
                placeholder="Admin secret"
                value={adminSecret}
                onChange={(e) => {
                  setAdminSecretState(e.target.value);
                  setAdminSecret(e.target.value);
                }}
                className="flex-1 rounded-lg border border-etheria-border-dim bg-black/30 px-3 py-1.5 text-xs text-etheria-text outline-none placeholder:text-etheria-text-muted"
              />
              <span className="text-[10px] text-emerald-400">✓</span>
              <button onClick={handleLogout} title="Cerrar sesión" className="rounded-lg border border-etheria-border px-2 py-1 text-[10px] text-rose-300 hover:bg-rose-900/20">⏏</button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-etheria-border-dim bg-black/20 p-1">
              <button onClick={() => setEditorMode("village")} className={`rounded-lg px-3 py-2 text-xs ${editorMode === "village" ? "bg-etheria-gold text-black" : "text-etheria-text"}`}>{t("editor.tabs.village")}</button>
              <button onClick={() => setEditorMode("world-terrain")} className={`rounded-lg px-3 py-2 text-xs ${editorMode === "world-terrain" ? "bg-etheria-gold text-black" : "text-etheria-text"}`}>{t("editor.tabs.mask")}</button>
              <button onClick={() => setEditorMode("bots")} className={`rounded-lg px-3 py-2 text-xs ${editorMode === "bots" ? "bg-etheria-gold text-black" : "text-etheria-text"}`}>🤖 Bots</button>
            </div>

            {editorMode === "bots" ? (
              <BotAdminPanel apiTarget={apiTarget} />
            ) : editorMode === "village" ? (
              <>
                <p className="mt-4 text-sm text-etheria-text-muted">{t("editor.village.description")}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={handleSave} className="gold-btn px-4 py-2 text-sm" disabled={saveMutation.isPending}>{saveMutation.isPending ? t("editor.saving") : t("editor.village.saveJson")}</button>
                  <button onClick={handleResetSelected} className="rounded-lg border border-etheria-border px-4 py-2 text-sm">{t("editor.village.resetSelected")}</button>
                  <button onClick={handleResetAll} className="rounded-lg border border-etheria-border px-4 py-2 text-sm">{t("editor.village.resetAll")}</button>
                  <button onClick={() => setEditorCenterVersion((value) => value + 1)} className="rounded-lg border border-etheria-border px-4 py-2 text-sm">{t("editor.village.centerView")}</button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <button onClick={() => updateEditorMeta((editor) => ({ ...editor, showGrid: !editor.showGrid }))} className={`rounded-lg border px-3 py-2 ${layout.editor?.showGrid ? "border-etheria-gold bg-etheria-gold/10" : "border-etheria-border-dim bg-black/10"}`}>{t("editor.village.grid")}</button>
                  <button onClick={() => updateEditorMeta((editor) => ({ ...editor, showSafeAreas: !editor.showSafeAreas }))} className={`rounded-lg border px-3 py-2 ${layout.editor?.showSafeAreas ? "border-etheria-gold bg-etheria-gold/10" : "border-etheria-border-dim bg-black/10"}`}>{t("editor.village.safeAreas")}</button>
                  <button onClick={() => updateEditorMeta((editor) => ({ ...editor, snapToGrid: !editor.snapToGrid }))} className={`rounded-lg border px-3 py-2 ${layout.editor?.snapToGrid ? "border-etheria-gold bg-etheria-gold/10" : "border-etheria-border-dim bg-black/10"}`}>{t("editor.village.snap")}</button>
                  <button onClick={() => updateSelectedMeta({ locked: !selectedMeta.locked })} className={`rounded-lg border px-3 py-2 ${selectedMeta.locked ? "border-rose-300 bg-rose-400/10" : "border-etheria-border-dim bg-black/10"}`}>{selectedMeta.locked ? t("editor.village.unlock") : t("editor.village.lock")}</button>
                  <button onClick={() => updateSelectedMeta({ hidden: !selectedMeta.hidden })} className={`rounded-lg border px-3 py-2 ${selectedMeta.hidden ? "border-cyan-200 bg-cyan-400/10" : "border-etheria-border-dim bg-black/10"}`}>{selectedMeta.hidden ? t("editor.village.show") : t("editor.village.hideBuilding")}</button>
                </div>
                <div className="mt-4 rounded-xl border border-etheria-border-dim bg-black/20 p-3 text-xs text-etheria-text-muted">
                  <div>{t("editor.file")}: <span className="font-mono text-etheria-text">apps/web/src/data/village-layout.json</span></div>
                  <div>{t("editor.reference")}: <span className="font-mono text-etheria-text">{layout.referenceWidth} x {layout.referenceHeight}</span></div>
                  <div>{t("editor.village.savedAnchors")}: <span className="font-mono text-etheria-text">{Object.keys(layout.anchors).length}</span></div>
                  {selectedAnchor && <div>{t("editor.selected")}: <span className="font-mono text-etheria-text">{selectedAnchor.x.toFixed(4)}, {selectedAnchor.y.toFixed(4)}</span></div>}
                  {saveMutation.isError && <div className="mt-2 text-rose-300">{t("editor.saveError")}</div>}
                </div>
                {selectedBuilding && (
                  <label className="mt-4 block text-xs text-etheria-text-muted">
                    {t("editor.village.note")}
                    <textarea
                      value={selectedMeta.note ?? ""}
                      onChange={(event) => updateSelectedMeta({ note: event.target.value })}
                      className="mt-2 h-20 w-full resize-none rounded-lg border border-etheria-border-dim bg-black/25 p-2 text-etheria-text outline-none"
                    />
                  </label>
                )}
                <div className="mt-4 max-h-[58vh] overflow-auto rounded-xl border border-etheria-border-dim bg-black/20 p-2">
                  <div className="space-y-2">
                    {uniqueBuildings.map((building) => {
                      const key = getVillageTileKey(building.positionX, building.positionY);
                      const isSelected = selectedBuilding?.id === building.id;
                      return (
                        <button key={building.id} onClick={() => selectBuilding(building.id)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left ${isSelected ? "border-etheria-gold bg-etheria-gold/10" : "border-etheria-border-dim bg-black/10"}`}>
                          <BuildingSprite type={building.type} level={building.level} size={42} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-serif text-sm text-etheria-gold-soft">{t(BUILDING_NAMES[building.type] ?? building.type)}</div>
                            <div className="font-mono text-[11px] text-etheria-text-muted">{key}</div>
                          </div>
                          <div className="text-[11px] text-etheria-text-muted">
                            {layout.editor?.buildings?.[key]?.hidden ? t("editor.village.hidden") : layout.editor?.buildings?.[key]?.locked ? t("editor.village.locked") : building.ghost ? t("editor.village.ghost") : layout.anchors[key] ? t("editor.village.custom") : t("editor.village.default")}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-etheria-text-muted">{t("editor.mask.description")}</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleSaveTerrain} className="gold-btn px-4 py-2 text-sm" disabled={saveTerrainMutation.isPending}>{saveTerrainMutation.isPending ? t("editor.saving") : t("editor.mask.save")}</button>
                  <button onClick={handleResetTerrain} className="rounded-lg border border-etheria-border px-4 py-2 text-sm">{t("editor.mask.resetPlains")}</button>
                  <button onClick={() => setShowTerrainOverlay((value) => !value)} className="rounded-lg border border-etheria-border px-4 py-2 text-sm">{showTerrainOverlay ? t("editor.mask.hideOverlay") : t("editor.mask.showOverlay")}</button>
                </div>
                <div className="rounded-xl border border-etheria-border-dim bg-black/20 p-3 text-xs text-etheria-text-muted">
                  <div>{t("editor.file")}: <span className="font-mono text-etheria-text">apps/web/src/data/world-terrain-mask.json</span></div>
                  <div>{t("editor.mask.grid")}: <span className="font-mono text-etheria-text">{terrainMask.columns} x {terrainMask.rows}</span></div>
                  <div>{t("editor.mask.rule")}: <span className="font-mono text-etheria-text">{t("editor.mask.spawn")} {selectedRule.buildable ? "OK" : "NO"} / {t("editor.mask.path")} {selectedRule.walkable ? "OK" : "NO"} / {t("editor.mask.speed")} {selectedRule.speedMultiplier}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {TERRAIN_KINDS.map((kind) => {
                    const rule = TERRAIN_RULES[kind];
                    return (
                      <button key={kind} onClick={() => setSelectedTerrain(kind)} className={`rounded-lg border px-3 py-2 text-left text-xs ${selectedTerrain === kind ? "border-etheria-gold bg-etheria-gold/10" : "border-etheria-border-dim bg-black/10"}`}>
                        <span className="mb-1 inline-block h-3 w-8 rounded" style={{ backgroundColor: TERRAIN_COLOR_HEX[kind] }} />
                        <div>{t(`editor.terrain.${kind.toLowerCase()}`)}</div>
                        <div className="font-mono text-[10px] text-etheria-text-muted">{rule.buildable ? t("editor.mask.spawn") : t("editor.mask.noSpawn")} / {rule.walkable ? t("editor.mask.path") : t("editor.mask.block")}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-etheria-border-dim px-3 py-2 text-xs">
                  <button onClick={() => setBrushSize((value) => Math.max(1, value - 1))} className="rounded border border-etheria-border px-2">-</button>
                  <span className="min-w-[70px] text-center font-mono text-etheria-gold-soft">{t("editor.mask.brush")} {brushSize}</span>
                  <button onClick={() => setBrushSize((value) => Math.min(8, value + 1))} className="rounded border border-etheria-border px-2">+</button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="absolute inset-0">
        <div className="h-full w-full">
          {editorMode === "village" ? (
            <div className="relative h-full w-full touch-none overflow-hidden">
              <VillageHTMLCanvas
                layout={layout}
                buildings={uniqueBuildings}
                selectedBuildingId={selectedId}
                onSelectBuilding={selectBuilding}
                queues={[]}
                editorMode
                onAnchorChange={handleAnchorChange}
              />
            </div>
          ) : (
            <div className="relative h-full w-full touch-none overflow-hidden">
              <WorldMapHTMLCanvas
                cities={[]}
                mapConfig={worldMap?.map ?? {
                  width: 2400,
                  height: 1600,
                  cameraMinZoom: 0.45,
                  cameraMaxZoom: 1.8,
                  cameraInitialZoom: 0.72,
                  backgroundAssetPath: terrainMask.mapAssetPath,
                }}
                terrainMask={terrainMask}
                editorMode
                selectedTerrain={selectedTerrain}
                brushSize={brushSize}
                showTerrainOverlay={showTerrainOverlay}
                onTerrainChange={setTerrainDraft}
              />
            </div>
          )}

          <div className="absolute top-4 z-[260] flex items-center gap-2 rounded-xl border border-etheria-border bg-black/58 px-3 py-2 backdrop-blur-[3px]" style={{ left: panelCollapsed ? 252 : 372 }}>
            {editorMode === "village" ? (
              <>
                <button onClick={handleSave} className="gold-btn px-4 text-xs" disabled={saveMutation.isPending}>{saveMutation.isPending ? t("editor.saving") : t("editor.save")}</button>
                <button onClick={handleResetSelected} className="rounded-lg border border-etheria-border px-3 py-1.5 text-xs text-etheria-text">{t("editor.reset")}</button>
                <div className="flex items-center gap-1 rounded-lg border border-etheria-border px-2 py-1 text-xs">
                  <button onClick={() => handleScaleChange(-0.05)} className="text-etheria-text">-</button>
                  <span className="min-w-[54px] text-center font-mono text-etheria-gold-soft">{selectedAnchor ? `${(selectedAnchor.scale ?? 1).toFixed(2)}x` : "1.00x"}</span>
                  <button onClick={() => handleScaleChange(0.05)} className="text-etheria-text">+</button>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-etheria-border px-2 py-1 text-xs">
                  <button onClick={() => nudgeSelected(-0.005, 0)} className="text-etheria-text px-1">◀</button>
                  <button onClick={() => nudgeSelected(0, -0.005)} className="text-etheria-text px-1">▲</button>
                  <button onClick={() => nudgeSelected(0, 0.005)} className="text-etheria-text px-1">▼</button>
                  <button onClick={() => nudgeSelected(0.005, 0)} className="text-etheria-text px-1">▶</button>
                </div>
                {selectedAnchor && (
                  <div className="flex items-center gap-1 rounded-lg border border-etheria-border px-2 py-1 text-xs">
                    <span className="text-etheria-text-muted">X</span>
                    <input
                      type="number" step="0.001" min="0" max="1"
                      value={selectedAnchor.x.toFixed(4)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && selectedBuilding) {
                          const key = getVillageTileKey(selectedBuilding.positionX, selectedBuilding.positionY);
                          const dx = Math.min(1, Math.max(0, val)) - selectedAnchor.x;
                          nudgeSelected(dx, 0);
                        }
                      }}
                      className="w-[62px] bg-transparent font-mono text-etheria-gold-soft outline-none text-center"
                    />
                    <span className="text-etheria-text-muted">Y</span>
                    <input
                      type="number" step="0.001" min="0" max="1"
                      value={selectedAnchor.y.toFixed(4)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && selectedBuilding) {
                          const dy = Math.min(1, Math.max(0, val)) - selectedAnchor.y;
                          nudgeSelected(0, dy);
                        }
                      }}
                      className="w-[62px] bg-transparent font-mono text-etheria-gold-soft outline-none text-center"
                    />
                  </div>
                )}
                <span className="text-[10px] text-etheria-text-muted hidden xl:block" title="Arrow keys to nudge, Shift+arrow for ×5, =/-  for scale">↑↓←→ / Shift×5</span>
                <span className={`text-[11px] font-mono ${hasUnsavedChanges ? "text-amber-300" : "text-etheria-text-muted"}`}>{hasUnsavedChanges ? t("editor.unsaved") : t("editor.noChanges")}</span>
                {saveMutation.isError && <span className="text-[11px] text-rose-300">{t("editor.saveError")}</span>}
              </>
            ) : (
              <>
                <button onClick={handleSaveTerrain} className="gold-btn px-4 text-xs" disabled={saveTerrainMutation.isPending}>{saveTerrainMutation.isPending ? t("editor.saving") : t("editor.mask.save")}</button>
                <span className={`text-[11px] font-mono ${terrainDraft ? "text-amber-300" : "text-etheria-text-muted"}`}>{terrainDraft ? t("editor.unsaved") : t(`editor.terrain.${selectedTerrain.toLowerCase()}`)}</span>
              </>
            )}
          </div>

          {editorMode === "village" && selectedBuilding && (
            <div className="absolute right-4 top-4 z-[260] rounded-xl border border-etheria-border bg-black/58 px-3 py-2 text-right backdrop-blur-[3px]">
              <div className="font-serif text-sm text-etheria-gold-soft">{t(BUILDING_NAMES[selectedBuilding.type] ?? selectedBuilding.type)}</div>
              <div className="font-mono text-[11px] text-etheria-text-muted">{selectedBuilding.positionX}:{selectedBuilding.positionY}</div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
