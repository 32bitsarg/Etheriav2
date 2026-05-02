"use client";

import type { BuildingType, MailMessage, UnitType } from "@etheria/shared";
import { useGameStore } from "@/stores/gameStore";
import { useToastStore } from "@/stores/toastStore";
import { BUILDING_INFO, BUILDING_NAMES, BUILDING_SIZES, getUpgradeCost, getUpgradeTimeSeconds, UNIT_INFO, UNIT_TRAINING_COST, applyTrainingCostReduction, getTrainingCost, getTrainingTimeSeconds, TECH_INFO, getTechCost, getTechTimeSeconds, formatTime, formatNumber } from "@/lib/constants";
import { BuildingSprite } from "@/components/village/BuildingIcon";
import { VillageStage } from "@/components/village/VillageStage";
import { VillageImmersiveDock } from "@/components/village/VillageImmersiveDock";
import { ResourceIconSVG } from "@/components/village/ResourceIconSVG";
import { useAllCities, useAllianceMembership, useBarbarianCamps, useBreakTreaty, useCreateAlliance, useJoinAlliance, useMailMessages, useMarkMailRead, useProposePeace, useResearchTech, useSendMailMessage, useTechs, useTrainUnits, useUpdateAlliance, useUpgradeBuilding, useVillageLayout, useWorldMap } from "@/hooks/useCity";
import { WorldMapCanvas } from "@/components/worldmap/WorldMapCanvas";
import { BarbarianAttackAlertBanner } from "@/components/barbarians/BarbarianAttackAlertBanner";
import { WinterPressureBanner } from "@/components/barbarians/WinterPressureBanner";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { VillageLayoutData } from "@/lib/villageLayout";

type ViewId = "pueblo" | "mapa";

const VIEWS: { id: ViewId; label: string; iconId: "village" | "buildings" | "army" | "research" | "map" }[] = [
  { id: "pueblo", label: "Pueblo", iconId: "village" },
  { id: "mapa", label: "Mapa", iconId: "map" },
];

const CATEGORY_FILTERS = [
  { id: "all", label: "Todos" },
  { id: "economic", label: "Económicos" },
  { id: "military", label: "Militares" },
  { id: "civic", label: "Cívicos" },
] as const;

const ISO_MAP_SIZE = 24;
const ISO_TILE_W = 36;
const ISO_TILE_H = 18;

export function VillageView() {
  const [activeView, setActiveView] = useState<ViewId>("pueblo");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [upgradingBuildingId, setUpgradingBuildingId] = useState<string | null>(null);
  const [isMailOpen, setIsMailOpen] = useState(false);
  const [isAllianceOpen, setIsAllianceOpen] = useState(false);
  const upgradeLockRef = useRef<string | null>(null);
  const cityName = useGameStore((s) => s.name);
  const cityId = useGameStore((s) => s.cityId);
  const buildings = useGameStore((s) => s.buildings);
  const units = useGameStore((s) => s.units);
  const buildQueues = useGameStore((s) => s.buildQueues);
  const trainingQueues = useGameStore((s) => s.trainingQueues);
  const cityTechs = useGameStore((s) => s.cityTechs);
  const activeResearch = useGameStore((s) => s.activeResearch);
  const techBonuses = useGameStore((s) => s.techBonuses);
  const production = useGameStore((s) => s.production);
  const storage = useGameStore((s) => s.storage);
  const addToast = useToastStore((s) => s.addToast);
  const getLiveResources = useGameStore((s) => s.getLiveResources);
  const upgradeBuilding = useUpgradeBuilding();
  const trainUnits = useTrainUnits();
  const researchTech = useResearchTech();
  const { data: techOptionsData } = useTechs(cityId);
  const { data: mailData } = useMailMessages(true);
  const { data: allianceData } = useAllianceMembership();

  const resources = getLiveResources();
  const isPuebloView = activeView === "pueblo";
  const isMapView = activeView === "mapa";
  const isImmersiveView = isPuebloView || isMapView;
  const pendingUpgradeBuildingIds = useMemo(() => buildQueues.map((queue) => queue.buildingId), [buildQueues]);

  // Deduplicate buildings
  const uniqueBuildings = useMemo(() => {
    const byOrigin = new Map<string, (typeof buildings)[number]>();

    for (const building of buildings) {
      const originKey = `${building.positionX}:${building.positionY}`;
      const existing = byOrigin.get(originKey);

      if (!existing) {
        byOrigin.set(originKey, building);
        continue;
      }

      const existingUpdatedAt = new Date(existing.upgradedAt ?? existing.createdAt ?? 0).getTime();
      const candidateUpdatedAt = new Date(building.upgradedAt ?? building.createdAt ?? 0).getTime();

      if (
        candidateUpdatedAt > existingUpdatedAt ||
        (candidateUpdatedAt === existingUpdatedAt && building.level > existing.level)
      ) {
        byOrigin.set(originKey, building);
      }
    }

    return [...byOrigin.values()];
  }, [buildings]);

  const selectedBuilding = uniqueBuildings.find((b) => b.id === selectedBuildingId);
  const totalLevel = uniqueBuildings.reduce((sum, b) => sum + b.level, 0);
  const researchedLevels = cityTechs.reduce((sum, tech) => sum + tech.level, 0);
  const topBuildings = useMemo(
    () => [...uniqueBuildings].sort((a, b) => b.level - a.level).slice(0, 6),
    [uniqueBuildings]
  );

  const handleUpgrade = useCallback((id: string, type: string, currentLevel: number) => {
    if (!cityId) return;
    if (upgradeLockRef.current) return;
    if (buildQueues.some((queue) => queue.buildingId === id)) return;
    const cost = getUpgradeCost(type, currentLevel);
    if (
      resources.gold >= (cost.gold ?? 0) &&
      resources.wood >= (cost.wood ?? 0) &&
      resources.stone >= (cost.stone ?? 0) &&
      resources.food >= (cost.food ?? 0)
    ) {
      upgradeLockRef.current = id;
      setUpgradingBuildingId(id);
      upgradeBuilding.mutate(
        { cityId, buildingId: id },
        {
          onSuccess: () => {
            addToast({ type: "success", title: "Mejora iniciada", message: BUILDING_NAMES[type as keyof typeof BUILDING_NAMES] });
          },
          onError: (error) => {
            addToast({ type: "error", title: "Mejora fallida", message: error.message });
          },
          onSettled: () => {
            if (upgradeLockRef.current === id) {
              upgradeLockRef.current = null;
              setUpgradingBuildingId(null);
            }
          },
        }
      );
    } else {
      addToast({ type: "error", title: "Recursos insuficientes" });
    }
  }, [buildQueues, cityId, resources, upgradeBuilding, addToast]);

  const handleTrainUnit = useCallback((unitType: string, count: number) => {
    if (!cityId) return;
    const cost = applyTrainingCostReduction(
      getTrainingCost(unitType as UnitType, count),
      techBonuses?.trainingCostReduction ?? 0
    );
    if (
      resources.gold >= (cost.gold ?? 0) &&
      resources.food >= (cost.food ?? 0) &&
      resources.wood >= (cost.wood ?? 0) &&
      resources.stone >= (cost.stone ?? 0)
    ) {
      trainUnits.mutate(
        { cityId, unitType, count },
        {
          onSuccess: () => {
            const name = UNIT_INFO[unitType as UnitType]?.name ?? unitType;
            addToast({ type: "success", title: "Entrenamiento iniciado", message: `${name} x${count}` });
          },
          onError: (error) => {
            addToast({ type: "error", title: "Entrenamiento fallido", message: error.message });
          },
        }
      );
    } else {
      addToast({ type: "error", title: "Recursos insuficientes" });
    }
  }, [cityId, resources, techBonuses, trainUnits, addToast]);

  const handleResearch = useCallback((techId: string) => {
    if (!cityId) return;
    const existing = cityTechs.find((t) => t.techId === techId);
    const currentLevel = existing?.level ?? 0;
    const cost = getTechCost(techId, currentLevel);
    if (
      resources.gold >= (cost.gold ?? 0) &&
      resources.wood >= (cost.wood ?? 0) &&
      resources.stone >= (cost.stone ?? 0) &&
      resources.food >= (cost.food ?? 0)
    ) {
      researchTech.mutate(
        { cityId, techId },
        {
          onSuccess: () => {
            const name = TECH_INFO[techId]?.name ?? techId;
            addToast({ type: "success", title: "Investigación iniciada", message: name });
          },
          onError: (error) => {
            addToast({ type: "error", title: "Investigación fallida", message: error.message });
          },
        }
      );
    } else {
      addToast({ type: "error", title: "Recursos insuficientes" });
    }
  }, [cityId, resources, cityTechs, researchTech, addToast]);

  return (
    <div className="village-shell relative z-10 grid h-screen w-screen overflow-hidden">
      {/* ─── Barbarian Attack Alert ─── */}
      {!isImmersiveView && <BarbarianAttackAlertBanner />}

      {/* ─── Winter Pressure Warning ─── */}
      {!isImmersiveView && <WinterPressureBanner />}

      {/* ─── Sidebar ─── */}
      <aside
        className={
          isImmersiveView
            ? "absolute left-4 top-1/2 z-40 w-[114px] -translate-y-1/2 overflow-hidden rounded-[28px] border border-etheria-border"
            : "village-sidebar row-span-3 border-r border-etheria-border overflow-hidden"
        }
        style={{
          background: isImmersiveView
            ? "linear-gradient(180deg, rgba(16,23,23,.96), rgba(7,10,10,.96))"
            : "radial-gradient(circle at 50% 0%, rgba(27,168,133,.16), transparent 18%), linear-gradient(180deg, #121817, #070909 70%, #040606)",
          boxShadow: isImmersiveView ? "0 18px 45px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.05)" : undefined,
        }}
      >
        {!isImmersiveView && (
          <>
            <div className="px-3 py-4 border-b border-etheria-border">
              <h1 className="m-0 font-serif text-xl text-etheria-text">{cityName || "Aldea"}</h1>
            </div>

            {!isMapView && buildQueues.length > 0 && (
              <div className="px-3 py-2 border-b border-etheria-border">
                <div className="text-[10px] font-serif text-etheria-gold font-bold uppercase mb-1">⚒ Construcción</div>
                <div className="space-y-1">
                  {buildQueues.map((q) => {
                    const name = BUILDING_NAMES[q.buildingType as keyof typeof BUILDING_NAMES] ?? q.buildingType;
                    return (
                      <div key={q.id} className="flex items-center gap-1.5 text-[11px] text-etheria-text-muted py-0.5">
                        <BuildingSprite type={q.buildingType as BuildingType} size={16} />
                        <span className="truncate flex-1">{name}</span>
                        <CountdownSmall completesAt={q.completesAt} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!isMapView && trainingQueues.length > 0 && (
              <div className="px-3 py-2 border-b border-etheria-border">
                <div className="text-[10px] font-serif text-etheria-gold font-bold uppercase mb-1">⚔ Entrenamiento</div>
                <div className="space-y-1">
                  {trainingQueues.map((q) => {
                    const info = UNIT_INFO[q.unitType as UnitType];
                    return (
                      <div key={q.id} className="flex items-center gap-1.5 text-[11px] text-etheria-text-muted py-0.5">
                        <span>{info?.icon ?? "⚔️"}</span>
                        <span className="truncate flex-1">{info?.name ?? q.unitType} x{q.count}</span>
                        <CountdownSmall completesAt={q.completesAt} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        <nav className={`flex flex-col ${isImmersiveView ? "gap-2 p-2" : "gap-1.5 p-2.5 flex-1"}`}>
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => { setActiveView(v.id); setSelectedBuildingId(null); }}
              style={isImmersiveView ? { backgroundImage: "url('/assets/ui/sidebar/sidebar-button-glow.png')", backgroundSize: "100% 100%" } : undefined}
              className={isImmersiveView
                ? `rounded-2xl border px-2 py-3 text-center font-serif text-[11px] uppercase tracking-[0.14em] transition-colors ${
                    activeView === v.id
                      ? "border-etheria-teal/55 bg-etheria-teal/18 text-etheria-gold-soft"
                      : "border-etheria-border-dim bg-black/22 text-etheria-text-muted hover:text-etheria-gold-soft"
                  }`
                : `nav-btn ${activeView === v.id ? "active" : ""}`}
            >
              <span className={isImmersiveView ? "" : "font-serif text-base tracking-wide"}>{v.label}</span>
            </button>
          ))}
          <button
            onClick={() => setIsMailOpen(true)}
            className={isImmersiveView
              ? "relative rounded-2xl border border-etheria-border-dim px-2 py-3 text-center font-serif text-[11px] uppercase tracking-[0.14em] text-etheria-text-muted transition-colors hover:text-etheria-gold-soft"
              : "nav-btn relative"}
            style={isImmersiveView ? { backgroundImage: "url('/assets/ui/sidebar/sidebar-button-glow.png')", backgroundSize: "100% 100%" } : undefined}
          >
            <span>Mensajes</span>
            {(mailData?.unreadCount ?? 0) > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border border-etheria-gold/50 bg-[#7c261d] px-1 font-mono text-[10px] text-[#fff2cb]">
                {mailData?.unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setIsAllianceOpen(true)}
            className={isImmersiveView
              ? "relative rounded-2xl border border-etheria-border-dim px-2 py-3 text-center font-serif text-[11px] uppercase tracking-[0.14em] text-etheria-text-muted transition-colors hover:text-etheria-gold-soft"
              : "nav-btn relative"}
            style={isImmersiveView ? { backgroundImage: "url('/assets/ui/sidebar/sidebar-button-glow.png')", backgroundSize: "100% 100%" } : undefined}
          >
            <span>Alianzas</span>
          </button>
        </nav>
      </aside>

      {/* ─── Top Bar ─── */}
      <header className={`village-topbar col-start-2 col-end-4 border-b border-etheria-border flex items-center gap-2 px-3 overflow-x-auto ${isImmersiveView ? "hidden" : ""}`} style={{
        background: "linear-gradient(180deg, #161a19, #090c0c), repeating-linear-gradient(90deg, rgba(255,255,255,.03) 0 1px, transparent 1px 7px)",
      }}>
        {[
          { key: "gold", label: "Oro", val: resources.gold, max: storage.maxGold, perHour: production.goldPerHour, color: "" },
          { key: "wood", label: "Madera", val: resources.wood, max: storage.maxWood, perHour: production.woodPerHour, color: "green" },
          { key: "stone", label: "Piedra", val: resources.stone, max: storage.maxStone, perHour: production.stonePerHour, color: "blue" },
          { key: "food", label: "Cereal", val: resources.food, max: storage.maxFood, perHour: production.foodPerHour, color: "" },
          { key: "gems", label: "Gemas", val: resources.gems, max: 2000, perHour: 0, color: "blue" },
        ].map((r) => (
          <div key={r.key} className="flex items-center gap-2 min-w-[150px] flex-1 px-3 py-1.5 rounded-xl border border-etheria-border-dim" style={{
            background: "linear-gradient(180deg, rgba(255,255,255,.045), transparent), linear-gradient(135deg, rgba(31,39,31,.9), rgba(8,10,10,.92))",
            boxShadow: "inset 0 0 18px rgba(0,0,0,.42)",
          }}>
            <ResourceIconSVG type={r.key} size={32} />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between font-serif font-bold text-etheria-gold-soft text-sm">
                <span>{r.label}</span>
                <span className="font-mono text-etheria-text text-[13px]">{formatNumber(r.val)} / {formatNumber(r.max)}</span>
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-etheria-success">+{formatNumber(r.perHour)}/h</div>
              <div className={`progress-bar ${r.color} mt-1`}>
                <div style={{ width: `${Math.min((r.val / r.max) * 100, 100)}%` }} />
              </div>
            </div>
          </div>
        ))}
      </header>

      {/* ─── Main Content ─── */}
      <main className={isImmersiveView ? "absolute inset-0 z-10 min-w-0 min-h-0 overflow-hidden" : "village-main col-start-2 row-start-2 min-w-0 min-h-0 overflow-hidden p-2.5"}>
        {activeView === "pueblo" && (
          <PuebloView
            buildings={uniqueBuildings}
            selectedBuildingId={selectedBuildingId}
            onSelectBuilding={setSelectedBuildingId}
            resources={resources}
            storage={storage}
            production={production}
            pendingUpgradeBuildingIds={pendingUpgradeBuildingIds}
          />
        )}
        {activeView === "mapa" && (
          <MapaView
            resources={resources}
            storage={storage}
            production={production}
            allianceData={allianceData}
            onEnterVillage={() => setActiveView("pueblo")}
          />
        )}
      </main>

      {isPuebloView && selectedBuilding && (
      <BuildingModal
        building={selectedBuilding}
        resources={resources}
        onUpgrade={handleUpgrade}
        onTrain={handleTrainUnit}
        onResearch={handleResearch}
        isUpgrading={upgradingBuildingId === selectedBuilding.id}
        pendingUpgradeBuildingIds={pendingUpgradeBuildingIds}
        units={units}
        cityTechs={cityTechs}
        activeResearch={activeResearch}
        techOptions={techOptionsData?.techs ?? null}
        techBonuses={techBonuses}
        onClose={() => setSelectedBuildingId(null)}
      />
      )}

      {isPuebloView && <VillageImmersiveDock />}

      {isMailOpen && <MailModal onClose={() => setIsMailOpen(false)} />}
      {isAllianceOpen && <AllianceModal onClose={() => setIsAllianceOpen(false)} />}

      {/* ─── Right Panel ─── */}
      <aside className={`village-right-panel col-start-3 row-start-2 row-end-4 m-2 ml-0 rounded-lg p-3 overflow-hidden ${isImmersiveView ? "hidden" : ""}`} style={{
        background: "linear-gradient(180deg, rgba(255,255,255,.045), transparent 16%), radial-gradient(circle at top, rgba(215,168,76,.10), transparent 38%), linear-gradient(135deg, rgba(16,23,23,.98), rgba(9,13,13,.98))",
        border: "1px solid rgba(215,168,76,.32)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.07), inset 0 -1px 0 rgba(0,0,0,.8), 0 12px 38px rgba(0,0,0,.35)",
      }}>
        {selectedBuilding ? (
        <DetailPanel
          building={selectedBuilding}
          onUpgrade={handleUpgrade}
          isUpgrading={upgradingBuildingId === selectedBuilding.id}
          pendingUpgradeBuildingIds={pendingUpgradeBuildingIds}
          onClose={() => setSelectedBuildingId(null)}
          resources={resources}
        />
        ) : (
          <EmptySelectionState icon="🏛" title="Panel de inspección" description="Seleccioná un edificio para ver nivel, coste de mejora y datos del lote." />
        )}
      </aside>

      {/* Bottom action dock removed (replaced by Map + Sidebar navigation). */}
    </div>
  );
}

/* ─── Pueblo View ─── */
function PuebloView({ buildings, selectedBuildingId, onSelectBuilding, resources, storage, production, pendingUpgradeBuildingIds }: {
  buildings: any[];
  selectedBuildingId: string | null;
  onSelectBuilding: (id: string) => void;
  resources: any;
  storage: any;
  production: { goldPerHour: number; woodPerHour: number; stonePerHour: number; foodPerHour: number };
  pendingUpgradeBuildingIds: string[];
}) {
  const { data: layout } = useVillageLayout();
  const placedBuildings = useMemo(() => resolveNonOverlappingBuildings(buildings), [buildings]);
  const plottedBuildings = [...placedBuildings]
    .sort((a, b) => {
      if (a.positionY === b.positionY) return a.positionX - b.positionX;
      return a.positionY - b.positionY;
    })
    .slice(0, 12);
  const mapBuildings = [...placedBuildings].sort((a, b) => {
    const depthA = a.positionX + a.positionY;
    const depthB = b.positionX + b.positionY;
    if (depthA === depthB) return a.positionX - b.positionX;
    return depthA - depthB;
  });
  const selectedBuilding = placedBuildings.find((b) => b.id === selectedBuildingId) ?? null;

  const activeLayout: VillageLayoutData = layout ?? {
    version: 1,
    backgroundAssetPath: "/assets/backgrounds/village-isometric-base.png",
    referenceWidth: 1536,
    referenceHeight: 1024,
    anchors: {},
  };

  return (
    <div className="h-full">
      {plottedBuildings.length === 0 ? (
        <div className="empty-state frame-panel h-full rounded-lg">
          <div className="empty-state-card">
            <div className="mb-3 text-4xl">🏰</div>
            <h3 className="m-0 mb-2 text-sm uppercase tracking-[0.18em] text-etheria-gold-soft">Pueblo vacío</h3>
            <p className="m-0 text-sm leading-relaxed">Cuando existan edificios en la ciudad aparecerán posicionados directamente sobre el plano urbano.</p>
          </div>
        </div>
      ) : (
        <div className="relative h-full overflow-hidden">
          <VillageStage
            layout={activeLayout}
            buildings={mapBuildings}
            selectedBuildingId={selectedBuildingId}
            onSelectBuilding={onSelectBuilding}
            showNameWithLevel
            className="h-full w-full"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_8%,rgba(0,0,0,0.16)_70%,rgba(0,0,0,0.4)_100%)]" />
            <div className="absolute left-1/2 top-4 z-30 flex w-[min(980px,calc(100%-160px))] -translate-x-1/2 gap-2 overflow-x-auto rounded-[24px] border border-etheria-border bg-black/38 px-3 py-2 backdrop-blur-[4px]">
              {[
                { key: "gold", label: "Oro", val: resources.gold, max: storage.maxGold, perHour: production.goldPerHour },
                { key: "wood", label: "Madera", val: resources.wood, max: storage.maxWood, perHour: production.woodPerHour },
                { key: "stone", label: "Piedra", val: resources.stone, max: storage.maxStone, perHour: production.stonePerHour },
                { key: "food", label: "Cereal", val: resources.food, max: storage.maxFood, perHour: production.foodPerHour },
                { key: "gems", label: "Gemas", val: resources.gems, max: 2000, perHour: 0 },
              ].map((r) => (
                <div key={r.key} className="min-w-[150px] flex-1 rounded-2xl border border-etheria-border-dim bg-black/24 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <ResourceIconSVG type={r.key} size={24} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 text-xs font-serif text-etheria-gold-soft">
                        <span>{r.label}</span>
                        <span className="font-mono text-etheria-text">{formatNumber(r.val)} / {formatNumber(r.max)}</span>
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-etheria-success">+{formatNumber(r.perHour)}/h</div>
                      <div className="progress-bar mt-1">
                        <div style={{ width: `${Math.min((r.val / r.max) * 100, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </VillageStage>
        </div>
      )}
    </div>
  );
}

/* ─── Edificios View ─── */
function EdificiosView({ buildings, selected, onSelect, onUpgrade, categoryFilter, onCategoryChange, pendingUpgradeBuildingIds }: {
  buildings: any[];
  selected: string | null;
  onSelect: (id: string) => void;
  onUpgrade: (id: string, type: string, level: number) => void;
  categoryFilter: string;
  onCategoryChange: (f: string) => void;
  pendingUpgradeBuildingIds: string[];
}) {
  return (
    <div className="h-full overflow-auto">
      <SectionHero
        title="Edificios"
        subtitle={`${buildings.length} edificios en tu aldea. Seleccioná uno para ver detalles, costes y mejoras disponibles.`}
        eyebrow="Infraestructura"
      />

      {/* Filters */}
      <div className="mt-2 flex flex-col gap-3 rounded-lg px-4 py-3 md:flex-row md:items-center md:justify-between" style={{ background: "rgba(0,0,0,.28)" }}>
        <h2 className="m-0 font-serif text-xl tracking-widest text-etheria-gold-soft uppercase">
          {CATEGORY_FILTERS.find((f) => f.id === categoryFilter)?.label ?? "Todos"} ({buildings.length})
        </h2>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => onCategoryChange(f.id)}
              className={`h-[34px] min-w-[54px] px-3 rounded-lg border text-sm cursor-pointer transition-colors ${categoryFilter === f.id ? "text-etheria-gold-soft border-etheria-teal/55" : "text-etheria-text-muted border-etheria-border-dim hover:text-etheria-gold-soft"}`}
              style={categoryFilter === f.id ? { background: "linear-gradient(180deg, #0f5f50, #082421)", boxShadow: "0 0 16px rgba(46,199,201,.2)" } : { background: "linear-gradient(180deg, #171e1b, #070909)" }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Building grid */}
      <div className="grid grid-cols-1 gap-2 overflow-auto min-h-0 py-2 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        {buildings.map((b) => {
          const info = BUILDING_INFO[b.type as BuildingType];
          const name = info?.name ?? b.type;
          const cost = getUpgradeCost(b.type, b.level);
          const isSelected = selected === b.id;
          return (
            <div
              key={b.id}
              onClick={() => onSelect(b.id)}
              className={`rounded-lg border p-2 grid grid-rows-[24px_72px_auto_30px] gap-1 text-left min-w-0 transition-all cursor-pointer ${isSelected ? "border-etheria-gold-soft/75" : "border-etheria-border-dim"}`}
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,.035), transparent 18%), radial-gradient(circle at 50% 25%, rgba(46,199,201,.09), transparent 34%), linear-gradient(180deg, rgba(20,28,25,.95), rgba(7,9,9,.96))",
                boxShadow: isSelected ? "0 0 18px rgba(215,168,76,.22), inset 0 0 20px rgba(215,168,76,.08)" : "inset 0 0 18px rgba(0,0,0,.35)",
              }}
            >
              <div className="flex justify-between items-center font-serif text-etheria-gold-soft text-sm">
                <span className="truncate">{name}</span>
                <span className="hex-badge w-7 h-7 grid place-items-center text-etheria-gold-soft font-serif text-sm ml-1">{b.level}</span>
              </div>
              <div className="w-24 h-[72px] mx-auto rounded-md bg-black/16 overflow-hidden">
                <BuildingSprite type={b.type as BuildingType} size={96} />
              </div>
              <div className="text-center text-xs text-etheria-gold-soft">
                Mejorar a <b className="text-etheria-success">{b.level + 1}</b>
              </div>
              <button
                disabled={pendingUpgradeBuildingIds.includes(b.id)}
                onClick={(e) => { e.stopPropagation(); onUpgrade(b.id, b.type, b.level); }}
                className="gold-btn text-xs"
              >
                {pendingUpgradeBuildingIds.includes(b.id) ? "En cola" : "Mejorar"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Ejército View ─── */
function EjercitoView({ units, trainingQueues, techBonuses, resources, onTrain }: {
  units: any[];
  trainingQueues: any[];
  techBonuses: any;
  resources: any;
  onTrain: (unitType: string, count: number) => void;
}) {
  const [selectedUnitType, setSelectedUnitType] = useState<string | null>(null);
  const [trainCount, setTrainCount] = useState(1);
  const allUnitTypes = Object.keys(UNIT_INFO) as string[];

  return (
    <div className="h-full overflow-auto">
      <SectionHero
        title="Ejército"
        subtitle={`${units.length} tipos de tropas, ${units.reduce((s, u) => s + u.count, 0)} unidades totales listas para defensa o expansión.`}
        eyebrow="Fuerzas militares"
      />

      <div className="mt-2 grid min-h-0 gap-2 xl:grid-cols-[minmax(0,1fr)_280px]">
        {/* Unit list */}
        <div className="frame-panel rounded-lg p-2 overflow-hidden">
          {/* Header */}
          <div className="hidden gap-2 rounded-[6px] px-3 py-2 text-xs uppercase tracking-wider text-etheria-gold-soft md:grid md:grid-cols-[52px_1fr_80px_80px_80px_80px]" style={{ background: "rgba(0,0,0,.28)" }}>
            <div></div>
            <div>Unidad</div>
            <div className="text-center">Cantidad</div>
            <div className="text-center">Atq</div>
            <div className="text-center">Def</div>
            <div className="text-center">HP</div>
          </div>

          {/* Rows */}
          {allUnitTypes.length === 0 ? (
            <div className="grid place-items-center py-8 text-etheria-text-muted text-sm">No hay tropas disponibles</div>
          ) : (
            allUnitTypes.map((type) => {
              const unitData = units.find((u) => u.type === type);
              const info = UNIT_INFO[type as UnitType];
              const atkBonus = (techBonuses?.unitAttackBonus?.all ?? 0) + (techBonuses?.unitAttackBonus?.[type] ?? 0);
              const defBonus = (techBonuses?.unitDefenseBonus?.all ?? 0) + (techBonuses?.unitDefenseBonus?.[type] ?? 0);
              const hpBonus = (techBonuses?.unitHpBonus?.all ?? 0) + (techBonuses?.unitHpBonus?.[type] ?? 0);
              return (
                <div
                  key={type}
                  onClick={() => { setSelectedUnitType(type); setTrainCount(1); }}
                  className={`mb-1 grid cursor-pointer gap-2 rounded-lg border px-3 py-2 transition-colors md:grid-cols-[52px_1fr_80px_80px_80px_80px] ${selectedUnitType === type ? "border-etheria-teal/55 bg-etheria-emerald/20" : "border-transparent hover:bg-black/20"}`}
                  style={{ color: "#d9cba8", fontSize: 13 }}
                >
                  <div className="w-[42px] h-[42px] grid place-items-center rounded-full border border-etheria-border-gold/30" style={{ background: "linear-gradient(160deg, #263733, #090c0c)", fontSize: 24 }}>
                    {info?.icon ?? "⚔️"}
                  </div>
                  <div className="font-serif text-etheria-gold-soft">{info?.name ?? type}</div>
                  <div className="flex flex-wrap gap-2 md:contents">
                    <div className="text-center font-mono text-etheria-text">{unitData?.count ?? 0}</div>
                    <div className="text-center font-mono text-etheria-success">{atkBonus > 0 ? `+${(atkBonus * 100).toFixed(0)}%` : "—"}</div>
                    <div className="text-center font-mono text-etheria-success">{defBonus > 0 ? `+${(defBonus * 100).toFixed(0)}%` : "—"}</div>
                    <div className="text-center font-mono text-etheria-success">{hpBonus > 0 ? `+${(hpBonus * 100).toFixed(0)}%` : "—"}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Training panel */}
        <div className="frame-panel rounded-lg p-3 overflow-hidden flex flex-col">
          <h3 className="m-0 mb-2 text-etheria-gold-soft font-serif text-sm uppercase tracking-wider">Entrenar</h3>
          {selectedUnitType ? (
            <>
              <div className="text-center mb-2">
                <div className="text-3xl mb-1">{UNIT_INFO[selectedUnitType as UnitType]?.icon}</div>
                <div className="font-serif text-etheria-gold-soft text-sm">{UNIT_INFO[selectedUnitType as UnitType]?.name}</div>
              </div>

              {/* Cost display */}
              <div className="border border-etheria-border-dim rounded-lg p-2 mb-2 text-xs">
                <div className="text-etheria-text-muted mb-1">Costo por unidad:</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(UNIT_TRAINING_COST[selectedUnitType as UnitType] ?? {}).map(([res, val]) => (
                    <div key={res} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/20">
                      <ResourceIconSVG type={res} size={12} />
                      <span className="font-mono text-etheria-text">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Count selector */}
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setTrainCount(Math.max(1, trainCount - 1))} className="w-8 h-8 rounded border border-etheria-border-dim bg-black/20 text-etheria-gold-soft cursor-pointer">−</button>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={trainCount}
                  onChange={(e) => setTrainCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  className="flex-1 h-8 rounded border border-etheria-border-dim bg-black/20 text-center font-mono text-etheria-text"
                />
                <button onClick={() => setTrainCount(Math.min(100, trainCount + 1))} className="w-8 h-8 rounded border border-etheria-border-dim bg-black/20 text-etheria-gold-soft cursor-pointer">+</button>
              </div>

              {/* Total cost */}
              <div className="text-xs text-etheria-text-muted mb-2">
                Total: {Object.entries(getTrainingCost(selectedUnitType as UnitType, trainCount)).map(([res, val]) => (
                  <span key={res} className="mr-2"><ResourceIconSVG type={res} size={10} /> {val}</span>
                ))}
              </div>

              {/* Time */}
              <div className="text-xs text-etheria-text-muted mb-2">
                ⏱ {formatTime(getTrainingTimeSeconds(selectedUnitType as UnitType, trainCount))}
              </div>

              {/* Train button */}
              <button
                onClick={() => onTrain(selectedUnitType, trainCount)}
                className="gold-btn text-sm w-full"
              >
                Entrenar x{trainCount}
              </button>
            </>
          ) : (
            <div className="text-etheria-text-muted text-xs text-center py-4">Selecciona una unidad</div>
          )}

          {/* Training queue */}
          <div className="border-t border-etheria-border-dim pt-2 mt-2">
            <h4 className="m-0 mb-1 text-etheria-gold-soft font-serif text-xs uppercase tracking-wider">En cola</h4>
            {trainingQueues.length === 0 ? (
              <div className="text-etheria-text-muted text-[10px] text-center">Vacío</div>
            ) : (
              <div className="flex flex-col gap-1">
                {trainingQueues.map((q) => {
                  const info = UNIT_INFO[q.unitType as UnitType];
                  return (
                    <div key={q.id} className="flex items-center gap-1.5 text-[11px] text-[#cfc3a8]">
                      <span>{info?.icon ?? "⚔️"}</span>
                      <span className="flex-1 truncate">{info?.name} x{q.count}</span>
                      <b className="text-etheria-success font-mono text-[10px]"><CountdownSmall completesAt={q.completesAt} /></b>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Investigación View ─── */
function InvestigacionView({ cityTechs, techBonuses, resources, onResearch, totalResearchedLevels }: {
  cityTechs: { techId: string; level: number }[];
  techBonuses: any;
  resources: any;
  onResearch: (techId: string) => void;
  totalResearchedLevels: number;
}) {
  const categories = ["ECONOMY", "MILITARY", "DEFENSE"] as const;
  const categoryLabels: Record<string, string> = { ECONOMY: "Economía", MILITARY: "Militar", DEFENSE: "Defensa" };
  const categoryIcons: Record<string, string> = { ECONOMY: "💰", MILITARY: "⚔️", DEFENSE: "🛡️" };

  return (
    <div className="h-full overflow-auto">
      <SectionHero
        title="Investigación"
        subtitle={`${cityTechs.length} tecnologías activas y ${totalResearchedLevels} niveles acumulados de desarrollo.`}
        eyebrow="Desarrollo tecnológico"
      />

      {/* Tech board */}
      <div className="mt-2 grid gap-2 min-h-0 overflow-auto md:grid-cols-2 2xl:grid-cols-3">
        {categories.map((cat) => {
          const catTechs = Object.entries(TECH_INFO).filter(([, info]) => info.category === cat);

          return (
            <div key={cat} className="frame-panel rounded-lg p-3 overflow-hidden flex flex-col">
              <h3 className="m-0 mb-3 text-center text-etheria-gold-soft font-serif text-sm uppercase tracking-wider">
                {categoryIcons[cat]} {categoryLabels[cat]}
              </h3>
              <div className="flex flex-col gap-2 overflow-auto flex-1">
                {catTechs.map(([techId, info]) => {
                  const existing = cityTechs.find((t) => t.techId === techId);
                  const currentLevel = existing?.level ?? 0;
                  const cost = getTechCost(techId, currentLevel);
                  const time = getTechTimeSeconds(techId, currentLevel);
                  const canAfford =
                    resources.gold >= (cost.gold ?? 0) &&
                    resources.wood >= (cost.wood ?? 0) &&
                    resources.stone >= (cost.stone ?? 0) &&
                    resources.food >= (cost.food ?? 0);

                  return (
                    <div key={techId} className={`rounded-lg border p-2 ${currentLevel > 0 ? "border-etheria-teal/30 bg-etheria-emerald/10" : "border-etheria-border-dim"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-[32px] h-[32px] grid place-items-center rounded-full border border-etheria-border-gold/35" style={{ background: "linear-gradient(160deg, #1f5d4f, #090c0c)", fontSize: 18 }}>
                          {info.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-etheria-gold-soft font-serif text-xs truncate">{info.name}</div>
                          <div className="text-etheria-text-muted text-[10px]">{currentLevel > 0 ? `Nivel ${currentLevel}` : "No investigada"}</div>
                        </div>
                      </div>
                      <p className="text-[10px] text-[#cfc3a8] m-0 mb-1.5 leading-snug">{info.description}</p>
                      {/* Cost */}
                      <div className="flex flex-wrap gap-0.5 mb-1.5">
                        {Object.entries(cost).map(([res, val]) => (
                          <div key={res} className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-black/20 text-[10px]">
                            <ResourceIconSVG type={res} size={10} />
                            <span className="font-mono text-etheria-text-muted">{formatNumber(val)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-etheria-text-muted">⏱ {formatTime(time)}</span>
                        <button
                          onClick={() => onResearch(techId)}
                          disabled={!canAfford}
                          className={`gold-btn text-[10px] px-2 py-0.5 ${!canAfford ? "opacity-40 cursor-not-allowed" : ""}`}
                        >
                          {currentLevel > 0 ? "Mejorar" : "Investigar"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoryBar({ label, value, total, colorClass }: { label: string; value: number; total: number; colorClass: string }) {
  const percent = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm text-[#cfc3a8]">
        <span>{label}</span>
        <b className="font-mono text-etheria-gold-soft">{value}</b>
      </div>
      <div className={`progress-bar ${colorClass}`}>
        <div style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function resolveNonOverlappingBuildings<T extends { id: string; type: BuildingType; level: number; positionX: number; positionY: number; createdAt?: string; upgradedAt?: string }>(
  inputBuildings: T[]
) {
  // Prefer the most recently updated buildings when overlaps happen.
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
        // Keep within expected bounds to avoid pathological data inflating occupancy.
        if (x < 0 || y < 0 || x >= ISO_MAP_SIZE || y >= ISO_MAP_SIZE) continue;
        tiles.push(`${x}:${y}`);
      }
    }

    if (tiles.length === 0) continue;
    if (tiles.some((t) => occupied.has(t))) continue;

    tiles.forEach((t) => occupied.add(t));
    chosen.push(building);
  }

  // Stable-ish ordering for rendering & counting.
  return chosen.sort((a, b) => (a.positionY - b.positionY) || (a.positionX - b.positionX));
}

function MapaView({ resources, storage, production, allianceData, onEnterVillage }: {
  resources: any;
  storage: any;
  production: { goldPerHour: number; woodPerHour: number; stonePerHour: number; foodPerHour: number };
  allianceData: any;
  onEnterVillage: () => void;
}) {
  const { data: cities } = useAllCities();
  const { data: worldMap } = useWorldMap();
  const { data: barbarianCamps } = useBarbarianCamps();
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [radialPosition, setRadialPosition] = useState({ x: 0, y: 0 });
  const [isEntering, setIsEntering] = useState(false);

  const myCityId = useGameStore((s) => s.cityId);
  const addToast = useToastStore((s) => s.addToast);
  const selectedCity = cities?.find((city) => city.id === selectedCityId) ?? null;
  const isOwnCity = selectedCityId != null && selectedCityId === myCityId;

  const enterVillage = () => {
    setIsEntering(true);
    window.setTimeout(() => {
      onEnterVillage();
      setIsEntering(false);
      setSelectedCityId(null);
    }, 520);
  };

  return (
    <div className="relative h-full overflow-hidden">
      <MapResourceHud resources={resources} storage={storage} production={production} />
      {isEntering && <div className="etheria-map-enter-zoom pointer-events-none absolute inset-0 z-50" />}
      <div className="absolute inset-0">
        <WorldMapCanvas
          cities={(cities ?? []).map((city) => ({
            ...city,
            relation: getMapRelation(city, allianceData),
          }))}
          mapConfig={worldMap?.map ?? null}
          myCityId={myCityId}
          barbarianCamps={barbarianCamps ?? []}
          onSelectCityId={(cityId, position) => {
            setSelectedCityId(cityId);
            setRadialPosition(position);
          }}
          onCenterMyCity={() => {
            const evt = new CustomEvent("etheria:center-my-city");
            window.dispatchEvent(evt);
          }}
        />
      </div>
      {selectedCity && (
        <MapCityRadial
          cityName={selectedCity.name}
          isOwnCity={isOwnCity}
          position={radialPosition}
          onClose={() => setSelectedCityId(null)}
          onEnter={enterVillage}
          onAttack={() => addToast({ type: "info", title: "Ataque", message: `Seleccioná tropas para atacar ${selectedCity.name}.` })}
          onSpy={() => addToast({ type: "info", title: "Espionaje", message: `Espionaje sobre ${selectedCity.name} pendiente de implementar.` })}
        />
      )}
    </div>
  );
}

function getMapRelation(city: any, allianceData: any) {
  const myAllianceId = allianceData?.membership?.allianceId;
  if (!myAllianceId || !city.allianceId) return "neutral";
  if (city.allianceId === myAllianceId) return "ally";
  const relation = (allianceData?.diplomacy ?? []).find((d: any) =>
    d.allianceAId === city.allianceId || d.allianceBId === city.allianceId
  );
  if (relation?.status === "PEACE") return "peace";
  if (relation?.status === "BROKEN" || relation?.status === "HOSTILE") return "hostile";
  return "neutral";
}

function MapCityRadial({ cityName, isOwnCity, position, onClose, onEnter, onAttack, onSpy }: {
  cityName: string;
  isOwnCity: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onEnter: () => void;
  onAttack: () => void;
  onSpy: () => void;
}) {
  const safeLeft = Math.max(150, Math.min(position.x, window.innerWidth - 150));
  const safeTop = Math.max(120, Math.min(position.y, window.innerHeight - 150));

  return (
    <div className="absolute inset-0 z-40" onClick={onClose}>
      <div
        className="etheria-map-radial absolute"
        style={{ left: safeLeft, top: safeTop }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="etheria-map-radial__core">
          <span className="truncate">{cityName}</span>
        </div>
        {isOwnCity ? (
          <button className="etheria-map-radial__action etheria-map-radial__action--top" onClick={onEnter}>
            Entrar
          </button>
        ) : (
          <>
            <button className="etheria-map-radial__action etheria-map-radial__action--left" onClick={onAttack}>
              Atacar
            </button>
            <button className="etheria-map-radial__action etheria-map-radial__action--right" onClick={onSpy}>
              Espiar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function MapResourceHud({ resources, storage, production }: {
  resources: any;
  storage: any;
  production: { goldPerHour: number; woodPerHour: number; stonePerHour: number; foodPerHour: number };
}) {
  return (
    <div className="absolute left-1/2 top-4 z-30 flex w-[min(980px,calc(100%-180px))] -translate-x-1/2 gap-2 overflow-x-auto rounded-[24px] border border-etheria-border bg-black/38 px-3 py-2 backdrop-blur-[4px]">
      {[
        { key: "gold", label: "Oro", val: resources.gold, max: storage.maxGold, perHour: production.goldPerHour },
        { key: "wood", label: "Madera", val: resources.wood, max: storage.maxWood, perHour: production.woodPerHour },
        { key: "stone", label: "Piedra", val: resources.stone, max: storage.maxStone, perHour: production.stonePerHour },
        { key: "food", label: "Cereal", val: resources.food, max: storage.maxFood, perHour: production.foodPerHour },
        { key: "gems", label: "Gemas", val: resources.gems, max: 2000, perHour: 0 },
      ].map((r) => (
        <div key={r.key} className="min-w-[150px] flex-1 rounded-2xl border border-etheria-border-dim bg-black/24 px-3 py-2">
          <div className="flex items-center gap-2">
            <ResourceIconSVG type={r.key} size={26} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 font-serif text-xs text-etheria-gold-soft">
                <span>{r.label}</span>
                <span className="font-mono text-[11px] text-etheria-text">{formatNumber(r.val)} / {formatNumber(r.max)}</span>
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-etheria-success">+{formatNumber(r.perHour)}/h</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionHero({ title, subtitle, eyebrow }: { title: string; subtitle: string; eyebrow: string }) {
  return (
    <div className="frame-panel hero-panel rounded-lg">
      <div className="absolute left-4 bottom-4 z-2 max-w-[560px] rounded-lg border border-etheria-border-gold bg-[rgba(5,8,8,.74)] p-3 shadow-[0_18px_35px_rgba(0,0,0,.38)]">
        <div className="hero-kicker mb-3">
          <span className="status-dot" />
          <span>{eyebrow}</span>
        </div>
        <h2 className="m-0 mb-1 font-serif text-xl uppercase tracking-widest text-etheria-gold-soft">{title}</h2>
        <p className="m-0 text-sm leading-relaxed text-[#cfc3a8]">{subtitle}</p>
      </div>
    </div>
  );
}

function EmptySelectionState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state-card">
        <div className="mb-3 text-4xl">{icon}</div>
        <h3 className="m-0 mb-2 text-sm uppercase tracking-[0.18em] text-etheria-gold-soft">{title}</h3>
        <p className="m-0 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function MailModal({ onClose }: { onClose: () => void }) {
  const myCityId = useGameStore((s) => s.cityId);
  const { data: cities } = useAllCities();
  const { data: mailData, isLoading } = useMailMessages(true);
  const sendMail = useSendMailMessage();
  const markRead = useMarkMailRead();
  const addToast = useToastStore((s) => s.addToast);
  const recipients = (cities ?? []).filter((city) => city.id !== myCityId);
  const [tab, setTab] = useState<"inbox" | "sent" | "compose">("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recipientCityId, setRecipientCityId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const messages = tab === "sent" ? (mailData?.sent ?? []) : (mailData?.inbox ?? []);
  const selected = messages.find((message) => message.id === selectedId) ?? messages[0] ?? null;

  useEffect(() => {
    if (tab === "compose") return;
    setSelectedId((current) => current && messages.some((message) => message.id === current) ? current : messages[0]?.id ?? null);
  }, [messages, tab]);

  useEffect(() => {
    if (tab !== "inbox" || !selected || selected.readAt) return;
    markRead.mutate({ id: selected.id, read: true });
  }, [markRead, selected, tab]);

  const submit = () => {
    if (!recipientCityId || !subject.trim() || !body.trim()) {
      addToast({ type: "error", title: "Mensaje incompleto" });
      return;
    }
    sendMail.mutate(
      { recipientCityId, subject, body },
      {
        onSuccess: () => {
          setSubject("");
          setBody("");
          setTab("sent");
          addToast({ type: "success", title: "Mensaje enviado" });
        },
        onError: (error) => addToast({ type: "error", title: "No se pudo enviar", message: error.message }),
      }
    );
  };

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/62 px-4 backdrop-blur-[4px]" onClick={onClose}>
      <div
        className="relative grid h-[min(640px,calc(100vh-36px))] w-full max-w-[920px] overflow-hidden rounded-[30px] border border-etheria-border bg-[linear-gradient(180deg,rgba(24,31,29,.97),rgba(7,10,10,.98))] shadow-[0_28px_90px_rgba(0,0,0,.58)] lg:grid-cols-[310px_1fr]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top,rgba(215,168,76,.18),transparent_65%)]" />
        <button onClick={onClose} className="absolute right-5 top-5 z-10 h-10 w-10 rounded-full border border-etheria-border-dim bg-black/30 text-etheria-gold-soft">x</button>
        <aside className="relative border-b border-etheria-border-dim p-4 pt-5 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-center gap-3">
            <img src="/assets/ui/sidebar/mail-seal.png" alt="" className="h-12 w-12" />
            <div>
              <div className="font-serif text-lg uppercase tracking-[0.14em] text-etheria-gold-soft">Mensajes</div>
              <div className="text-xs text-etheria-text-muted">{mailData?.unreadCount ?? 0} sin leer</div>
            </div>
          </div>
          <div className="mb-3 grid grid-cols-3 gap-1">
            {([
              ["inbox", "Inbox"],
              ["sent", "Enviados"],
              ["compose", "Nuevo"],
            ] as const).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className={`rounded-full border px-2 py-1.5 text-[10px] uppercase tracking-[0.1em] ${tab === id ? "border-etheria-teal/50 bg-etheria-emerald/18 text-etheria-gold-soft" : "border-etheria-border-dim bg-black/16 text-etheria-text-muted"}`}>
                {label}
              </button>
            ))}
          </div>
          {tab !== "compose" && (
            <div className="space-y-1.5 overflow-y-auto pr-1">
              {isLoading ? (
                <div className="py-6 text-center text-xs text-etheria-text-muted">Cargando...</div>
              ) : messages.length === 0 ? (
                <div className="py-6 text-center text-xs text-etheria-text-muted">Sin mensajes.</div>
              ) : messages.map((message) => (
                <button
                  key={message.id}
                  onClick={() => setSelectedId(message.id)}
                  className={`w-full rounded-[16px] border px-3 py-2 text-left ${selected?.id === message.id ? "border-etheria-teal/45 bg-etheria-emerald/14" : "border-etheria-border-dim bg-black/14"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-serif text-xs text-etheria-gold-soft">{message.subject}</span>
                    {tab === "inbox" && !message.readAt && <span className="h-2 w-2 rounded-full bg-[#d75f43]" />}
                  </div>
                  <div className="mt-0.5 truncate text-[10px] text-etheria-text-muted">
                    {tab === "sent" ? `Para ${message.recipientName}` : `De ${message.senderName}`}
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>
        <main className="relative p-5 pt-16">
          {tab === "compose" ? (
            <div className="mx-auto max-w-[520px]">
              <label className="mb-2 block text-[10px] uppercase tracking-[0.16em] text-etheria-gold-soft">Destinatario</label>
              <select value={recipientCityId} onChange={(event) => setRecipientCityId(event.target.value)} className="mb-3 h-10 w-full rounded-xl border border-etheria-border-dim bg-black/30 px-3 text-sm text-etheria-text">
                <option value="">Seleccionar ciudad...</option>
                {recipients.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
              </select>
              <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Asunto" maxLength={80} className="mb-3 h-10 w-full rounded-xl border border-etheria-border-dim bg-black/30 px-3 text-sm text-etheria-text" />
              <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Escribí tu mensaje..." maxLength={1200} className="h-64 w-full resize-none rounded-2xl border border-etheria-border-dim bg-black/30 p-3 text-sm leading-relaxed text-etheria-text" />
              <button onClick={submit} disabled={sendMail.isPending} className="mt-3 h-12 w-full rounded-2xl border border-etheria-border-gold/45 bg-etheria-emerald/18 font-serif text-sm uppercase tracking-[0.12em] text-etheria-gold-soft">
                {sendMail.isPending ? "Enviando..." : "Enviar"}
              </button>
            </div>
          ) : selected ? (
            <MailMessageReader message={selected} mode={tab} />
          ) : (
            <div className="grid h-full place-items-center text-sm text-etheria-text-muted">Seleccioná un mensaje.</div>
          )}
        </main>
      </div>
    </div>
  );
}

function MailMessageReader({ message, mode }: { message: MailMessage; mode: "inbox" | "sent" }) {
  return (
    <article className="mx-auto max-w-[560px]">
      <div className="mb-4 border-b border-etheria-border-dim pb-4">
        <div className="font-serif text-2xl text-etheria-gold-soft">{message.subject}</div>
        <div className="mt-2 text-xs text-etheria-text-muted">
          {mode === "sent" ? `Para ${message.recipientName}` : `De ${message.senderName}`} · {new Date(message.createdAt).toLocaleString()}
        </div>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-7 text-[#d3c7aa]">{message.body}</p>
    </article>
  );
}

function AllianceModal({ onClose }: { onClose: () => void }) {
  const { data, isLoading } = useAllianceMembership();
  const createAlliance = useCreateAlliance();
  const updateAlliance = useUpdateAlliance();
  const proposePeace = useProposePeace();
  const breakTreaty = useBreakTreaty();
  const addToast = useToastStore((s) => s.addToast);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [intro, setIntro] = useState("");
  const [forum, setForum] = useState("");
  const [targetAllianceId, setTargetAllianceId] = useState("");

  useEffect(() => {
    const alliance = data?.membership?.alliance;
    if (!alliance) return;
    setIntro(alliance.publicIntro ?? "");
    setForum(alliance.forumText ?? "");
  }, [data?.membership?.alliance]);

  const membership = data?.membership;
  const alliance = membership?.alliance;
  const canEdit = membership?.role === "LEADER" || membership?.role === "OFFICER";
  const canDiplomacy = canEdit || membership?.role === "DIPLOMAT";
  const availableAlliances = (data?.alliances ?? []).filter((item: any) => item.id !== membership?.allianceId);

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/62 px-4 backdrop-blur-[4px]" onClick={onClose}>
      <div className="relative h-[min(680px,calc(100vh-36px))] w-full max-w-[1020px] overflow-hidden rounded-[30px] border border-etheria-border bg-[linear-gradient(180deg,rgba(24,31,29,.97),rgba(7,10,10,.98))] p-5 pt-14 shadow-[0_28px_90px_rgba(0,0,0,.58)]" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-5 top-5 z-10 h-10 w-10 rounded-full border border-etheria-border-dim bg-black/30 text-etheria-gold-soft">x</button>
        <div className="absolute left-5 top-5 font-serif text-xl uppercase tracking-[0.16em] text-etheria-gold-soft">Alianzas</div>
        {isLoading ? (
          <div className="grid h-full place-items-center text-etheria-text-muted">Cargando...</div>
        ) : !data?.gate?.allowed ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <div className="font-serif text-2xl text-etheria-gold-soft">Centro de alianza requerido</div>
              <p className="mt-3 max-w-[520px] text-sm text-etheria-text-muted">Necesitás `Alliance Center` nivel 5 para crear o unirte a una alianza.</p>
            </div>
          </div>
        ) : !membership ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-[24px] border border-etheria-border-dim bg-black/18 p-4">
              <div className="mb-3 font-serif text-lg text-etheria-gold-soft">Crear alianza</div>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className="mb-2 h-10 w-full rounded-xl border border-etheria-border-dim bg-black/30 px-3 text-sm text-etheria-text" />
              <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="TAG" className="mb-3 h-10 w-full rounded-xl border border-etheria-border-dim bg-black/30 px-3 text-sm text-etheria-text" />
              <button onClick={() => createAlliance.mutate({ name, tag }, { onError: (e) => addToast({ type: "error", title: "No se pudo crear", message: e.message }) })} className="h-11 w-full rounded-2xl border border-etheria-border-gold/45 bg-etheria-emerald/18 font-serif text-sm uppercase tracking-[0.12em] text-etheria-gold-soft">Crear</button>
            </section>
            <section className="rounded-[24px] border border-etheria-border-dim bg-black/18 p-4">
              <div className="mb-3 font-serif text-lg text-etheria-gold-soft">Unirse</div>
              <div className="max-h-[420px] space-y-2 overflow-y-auto">
                {(data?.alliances ?? []).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between rounded-2xl border border-etheria-border-dim bg-black/18 px-3 py-2">
                    <div>
                      <div className="font-serif text-sm text-etheria-gold-soft">[{item.tag}] {item.name}</div>
                      <div className="text-[10px] text-etheria-text-muted">Honor {item.honorScore ?? 100} · tratados rotos {item.treatiesBroken ?? 0}</div>
                    </div>
                    <JoinAllianceButton allianceId={item.id} />
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[1fr_1fr]">
            <section className="min-h-0 overflow-y-auto rounded-[24px] border border-etheria-border-dim bg-black/18 p-4">
              <div className="font-serif text-2xl text-etheria-gold-soft">[{alliance?.tag}] {alliance?.name}</div>
              <div className="mt-1 text-xs text-etheria-text-muted">Rol {membership.role} · Honor {alliance?.honorScore ?? 100} · Rotos {alliance?.treatiesBroken ?? 0}</div>
              <label className="mt-4 block text-[10px] uppercase tracking-[0.14em] text-etheria-gold-soft">Presentación pública</label>
              <textarea disabled={!canEdit} value={intro} onChange={(e) => setIntro(e.target.value)} className="mt-1 h-24 w-full resize-none rounded-xl border border-etheria-border-dim bg-black/28 p-3 text-sm text-etheria-text" />
              <label className="mt-3 block text-[10px] uppercase tracking-[0.14em] text-etheria-gold-soft">Foro / anuncio interno</label>
              <textarea disabled={!canEdit} value={forum} onChange={(e) => setForum(e.target.value)} className="mt-1 h-40 w-full resize-none rounded-xl border border-etheria-border-dim bg-black/28 p-3 text-sm text-etheria-text" />
              {canEdit && <button onClick={() => updateAlliance.mutate({ publicIntro: intro, forumText: forum })} className="mt-3 h-10 w-full rounded-xl border border-etheria-border-gold/45 bg-etheria-emerald/18 text-sm text-etheria-gold-soft">Guardar foro</button>}
              <div className="mt-4 text-[10px] uppercase tracking-[0.14em] text-etheria-gold-soft">Miembros</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(data?.members ?? []).map((m: any) => <div key={m.id} className="rounded-xl bg-black/20 px-3 py-2 text-xs text-etheria-text-muted">{m.userId.slice(0, 8)} · {m.role}</div>)}
              </div>
            </section>
            <section className="min-h-0 overflow-y-auto rounded-[24px] border border-etheria-border-dim bg-black/18 p-4">
              <div className="font-serif text-lg text-etheria-gold-soft">Diplomacia</div>
              {canDiplomacy && (
                <div className="mt-3 flex gap-2">
                  <select value={targetAllianceId} onChange={(e) => setTargetAllianceId(e.target.value)} className="h-10 flex-1 rounded-xl border border-etheria-border-dim bg-black/30 px-3 text-sm text-etheria-text">
                    <option value="">Alianza objetivo...</option>
                    {availableAlliances.map((item: any) => <option key={item.id} value={item.id}>[{item.tag}] {item.name}</option>)}
                  </select>
                  <button onClick={() => targetAllianceId && proposePeace.mutate({ targetAllianceId, durationHours: 24 })} className="rounded-xl border border-etheria-border-gold/45 px-3 text-xs text-etheria-gold-soft">Paz 24h</button>
                </div>
              )}
              <div className="mt-4 space-y-2">
                {(data?.diplomacy ?? []).map((d: any) => (
                  <div key={d.id} className="rounded-2xl border border-etheria-border-dim bg-black/18 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-etheria-gold-soft">{d.status}</span>
                      {d.status === "PEACE" && canDiplomacy && <button onClick={() => breakTreaty.mutate(d.id)} className="rounded-full border border-red-400/35 px-3 py-1 text-[10px] uppercase text-red-200">Romper</button>}
                    </div>
                    <div className="mt-1 text-[10px] text-etheria-text-muted">Expira {d.expiresAt ? new Date(d.expiresAt).toLocaleString() : "sin fecha"}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 font-serif text-lg text-etheria-gold-soft">Historia pública</div>
              <div className="mt-2 space-y-2">
                {(data?.events ?? []).map((event: any) => <div key={event.id} className="rounded-xl bg-black/18 px-3 py-2 text-xs text-[#d3c7aa]">{event.message}</div>)}
              </div>
              <div className="mt-5 font-serif text-lg text-etheria-gold-soft">Efectos activos</div>
              <div className="mt-2 space-y-2">
                {(data?.effects ?? []).map((effect: any) => <div key={effect.id} className="rounded-xl bg-black/18 px-3 py-2 text-xs text-etheria-success">{effect.reason}: {Math.round(effect.value * 100)}%</div>)}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function JoinAllianceButton({ allianceId }: { allianceId: string }) {
  const join = useJoinAlliance();
  return <button onClick={() => join.mutate(allianceId)} className="rounded-full border border-etheria-border-gold/45 px-3 py-1 text-[10px] uppercase text-etheria-gold-soft">Unirse</button>;
}

function BuildingModal({ building, onUpgrade, onTrain, onResearch, onClose, resources, isUpgrading, pendingUpgradeBuildingIds, units, cityTechs, activeResearch, techOptions, techBonuses }: {
  building: any;
  onUpgrade: (id: string, type: string, level: number) => void;
  onTrain: (unitType: string, count: number) => void;
  onResearch: (techId: string) => void;
  onClose: () => void;
  resources: any;
  isUpgrading: boolean;
  pendingUpgradeBuildingIds: string[];
  units: any[];
  cityTechs: { techId: string; level: number }[];
  activeResearch: any | null;
  techOptions: { techId: string; name: string; description: string; category: string; currentLevel: number; canResearch: boolean; researchBlockedReason?: string; nextLevelCost: Record<string, number> | null; nextLevelTime: number | null }[] | null;
  techBonuses: any;
}) {
  const [selectedUnitType, setSelectedUnitType] = useState<UnitType | null>(building.type === "STABLE" ? "CAVALRY" : "WARRIOR");
  const [trainCount, setTrainCount] = useState(1);
  const info = BUILDING_INFO[building.type as BuildingType];
  const name = info?.name ?? building.type;
  const cost = getUpgradeCost(building.type, building.level);
  const timeSeconds = getUpgradeTimeSeconds(building.type, building.level);
  const showTraining = building.type === "BARRACKS" || building.type === "STABLE";
  const showResearch = building.type === "LIBRARY";
  const hasActionPanel = showTraining || showResearch;
  const trainableUnits = building.type === "STABLE"
    ? (["CAVALRY"] as UnitType[])
    : (["WARRIOR", "ARCHER", "SIEGE", "SPY"] as UnitType[]);
  const canUpgrade =
    resources.gold >= (cost.gold ?? 0) &&
    resources.wood >= (cost.wood ?? 0) &&
    resources.stone >= (cost.stone ?? 0) &&
    resources.food >= (cost.food ?? 0);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/58 px-4 backdrop-blur-[4px]" onClick={onClose}>
      <div
        className={`relative w-full overflow-hidden rounded-[30px] border border-etheria-border bg-[linear-gradient(180deg,rgba(24,31,29,.97),rgba(7,10,10,.98))] shadow-[0_28px_90px_rgba(0,0,0,.55)] ${hasActionPanel ? "max-w-[1080px]" : "max-w-[760px]"}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(215,168,76,.18),transparent_28%),linear-gradient(135deg,transparent,rgba(46,199,201,.08))]" />

        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-10 h-[56px] w-[56px] bg-contain bg-center bg-no-repeat text-xl text-etheria-text drop-shadow-[0_10px_18px_rgba(0,0,0,.4)]"
          style={{ backgroundImage: "url('/assets/ui/modal/modal-close-button.png')" }}
          aria-label="Cerrar"
        >
          ✕
        </button>

        <div className={`relative grid gap-0 ${hasActionPanel ? "lg:grid-cols-[.82fr_1.18fr]" : "lg:grid-cols-[.9fr_1.1fr]"}`}>
          <div className={`relative border-b border-etheria-border-dim lg:border-b-0 lg:border-r ${hasActionPanel ? "min-h-[430px]" : "min-h-[340px]"}`}>
            <div className="absolute left-1/2 top-7 h-[62px] w-[286px] -translate-x-1/2 bg-contain bg-center bg-no-repeat opacity-90" style={{ backgroundImage: "url('/assets/ui/modal/modal-title-plaque.png')" }} />
            <div className="absolute inset-x-0 top-5 z-[2] text-center">
              <div className="text-[11px] uppercase tracking-[0.22em] text-etheria-text-muted">{info?.category ?? "building"}</div>
              <h2 className="mt-1 font-serif text-[23px] uppercase tracking-[0.12em] text-etheria-gold-soft">{name}</h2>
            </div>

            <div className="absolute inset-x-0 bottom-0 top-0 flex items-center justify-center">
              <div className={`relative rounded-full bg-[radial-gradient(circle,rgba(46,199,201,.15),transparent_60%)] ${hasActionPanel ? "h-[292px] w-[292px]" : "h-[220px] w-[220px]"}`}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`${hasActionPanel ? "scale-[2.38]" : "scale-[1.82]"} drop-shadow-[0_22px_30px_rgba(0,0,0,.45)]`}>
                    <BuildingSprite type={building.type as BuildingType} size={96} />
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between rounded-[20px] border border-etheria-border-dim bg-black/18 px-4 py-2.5">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-etheria-text-muted">Nivel</div>
                <div className="font-serif text-2xl text-etheria-gold-soft">{building.level}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.18em] text-etheria-text-muted">Mejora</div>
                <div className="font-serif text-2xl text-etheria-success">{building.level + 1}</div>
              </div>
            </div>
          </div>

          <div className={`relative flex flex-col p-5 pt-14 ${hasActionPanel ? "min-h-[430px]" : "min-h-[340px]"}`}>
            <p className="m-0 text-xs leading-relaxed text-[#d3c7aa]">
              {info?.description ?? `El ${name} es una estructura clave de tu aldea.`}
            </p>

            <div className={`mt-4 grid gap-3 ${hasActionPanel ? "lg:grid-cols-[.86fr_1.14fr]" : "grid-cols-1"}`}>
              <div className="rounded-[22px] border border-etheria-border-dim bg-black/16 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-etheria-gold-soft">Mejora</div>
                  <div className="font-mono text-[11px] text-etheria-success">{formatTime(timeSeconds)}</div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                {(["gold", "wood", "stone", "food"] as const).map((resourceKey) => {
                  const value = cost[resourceKey];
                  if (!value) return null;
                  return (
                    <div key={resourceKey} className="flex items-center gap-1.5 rounded-full border border-etheria-border-dim bg-black/18 px-2 py-1">
                      <ResourceIconSVG type={resourceKey} size={14} />
                      <div className="font-mono text-[11px] text-etheria-text">{formatNumber(value)}</div>
                    </div>
                  );
                })}
                </div>
                <button
                  onClick={() => onUpgrade(building.id, building.type, building.level)}
                  disabled={!canUpgrade || isUpgrading || pendingUpgradeBuildingIds.includes(building.id)}
                  className={`mt-3 h-[54px] w-full bg-contain bg-center bg-no-repeat px-10 text-center text-[12px] font-serif uppercase tracking-[0.08em] text-[#fff3cf] [text-shadow:0_2px_0_rgba(58,28,5,.9)] ${!canUpgrade || isUpgrading || pendingUpgradeBuildingIds.includes(building.id) ? "opacity-55 grayscale" : ""}`}
                  style={{ backgroundImage: "url('/assets/ui/modal/modal-upgrade-button.png')" }}
                >
                  {pendingUpgradeBuildingIds.includes(building.id) ? "En cola" : isUpgrading ? "Mejorando..." : `Mejorar a ${building.level + 1}`}
                </button>
                {!canUpgrade && (
                  <div className="mt-1 text-center text-[10px] text-amber-200/85">Recursos insuficientes.</div>
                )}
              </div>

              {showTraining && (
                <TrainingModalSection
                  units={units}
                  techBonuses={techBonuses}
                  resources={resources}
                  trainableUnits={trainableUnits}
                  selectedUnitType={selectedUnitType}
                  trainCount={trainCount}
                  onSelectUnit={setSelectedUnitType}
                  onTrainCountChange={setTrainCount}
                  onTrain={onTrain}
                />
              )}

              {showResearch && (
                <ResearchModalSection
                  cityTechs={cityTechs}
                  activeResearch={activeResearch}
                  techOptions={techOptions}
                  resources={resources}
                  onResearch={onResearch}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrainingModalSection({ units, techBonuses, resources, trainableUnits, selectedUnitType, trainCount, onSelectUnit, onTrainCountChange, onTrain }: {
  units: any[];
  techBonuses: any;
  resources: any;
  trainableUnits: UnitType[];
  selectedUnitType: UnitType | null;
  trainCount: number;
  onSelectUnit: (unitType: UnitType) => void;
  onTrainCountChange: (count: number) => void;
  onTrain: (unitType: string, count: number) => void;
}) {
  const selected = selectedUnitType ?? trainableUnits[0];
  const selectedInfo = selected ? UNIT_INFO[selected] : null;
  const cost = selected
    ? applyTrainingCostReduction(getTrainingCost(selected, trainCount), techBonuses?.trainingCostReduction ?? 0)
    : {};
  const time = selected ? getTrainingTimeSeconds(selected, trainCount) : 0;
  const canAfford =
    resources.gold >= (cost.gold ?? 0) &&
    resources.wood >= (cost.wood ?? 0) &&
    resources.stone >= (cost.stone ?? 0) &&
    resources.food >= (cost.food ?? 0);

  return (
    <section className="rounded-[22px] border border-etheria-border-dim bg-[linear-gradient(180deg,rgba(29,43,39,.58),rgba(5,7,7,.28))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.05)]">
      <img src="/assets/ui/modal-actions/training-divider.png" alt="" className="mx-auto mb-1 h-[14px] w-[180px] object-contain opacity-90" />
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-etheria-gold-soft">Entrenar</div>
          <div className="text-[10px] text-etheria-text-muted">Listas: {units.reduce((sum, unit) => sum + unit.count, 0)}</div>
        </div>
        <div className="rounded-full border border-etheria-border-dim bg-black/20 px-2 py-0.5 font-mono text-[10px] text-etheria-success">
          {formatTime(time)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {trainableUnits.map((unitType) => {
          const info = UNIT_INFO[unitType];
          const count = units.find((unit) => unit.type === unitType)?.count ?? 0;
          const attackBonus = (techBonuses?.unitAttackBonus?.all ?? 0) + (techBonuses?.unitAttackBonus?.[unitType] ?? 0);
          const isActive = selected === unitType;
          return (
            <button
              key={unitType}
              onClick={() => onSelectUnit(unitType)}
              className={`rounded-[14px] border px-2 py-1.5 text-left transition-colors ${isActive ? "border-etheria-teal/55 bg-etheria-emerald/18" : "border-etheria-border-dim bg-black/14 hover:bg-black/24"}`}
            >
              <div className="flex items-center gap-1.5">
                <span className="grid h-7 w-7 place-items-center bg-contain bg-center bg-no-repeat text-sm" style={{ backgroundImage: "url('/assets/ui/modal-actions/unit-medallion.png')" }}>{info.icon}</span>
                <span className="min-w-0">
                  <span className="block truncate font-serif text-xs text-etheria-gold-soft">{info.shortName}</span>
                  <span className="block text-[9px] text-etheria-text-muted">x{count}{attackBonus > 0 ? ` +${Math.round(attackBonus * 100)}%` : ""}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {selected && selectedInfo && (
        <div className="mt-2 rounded-[16px] border border-etheria-border-dim bg-black/16 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="font-serif text-xs text-etheria-gold-soft">{selectedInfo.name}</div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => onTrainCountChange(Math.max(1, trainCount - 1))} className="h-7 w-7 rounded-full border border-etheria-border-dim bg-black/20 text-etheria-gold-soft">-</button>
              <input
                type="number"
                min={1}
                max={100}
                value={trainCount}
                onChange={(event) => onTrainCountChange(Math.max(1, Math.min(100, Number.parseInt(event.target.value, 10) || 1)))}
                className="h-7 w-14 rounded-full border border-etheria-border-dim bg-black/20 text-center font-mono text-xs text-etheria-text"
              />
              <button onClick={() => onTrainCountChange(Math.min(100, trainCount + 1))} className="h-7 w-7 rounded-full border border-etheria-border-dim bg-black/20 text-etheria-gold-soft">+</button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(cost).map(([resourceKey, value]) => (
              <div key={resourceKey} className="flex items-center gap-1 rounded-full border border-etheria-border-dim bg-black/18 px-1.5 py-0.5 text-[10px]">
                <ResourceIconSVG type={resourceKey} size={11} />
                <span className="font-mono text-etheria-text-muted">{formatNumber(value)}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => onTrain(selected, trainCount)}
            disabled={!canAfford}
            className={`mt-2 h-[44px] w-full bg-contain bg-center bg-no-repeat font-serif text-xs uppercase tracking-[0.1em] text-[#fff3cf] [text-shadow:0_2px_0_rgba(58,28,5,.9)] ${!canAfford ? "opacity-45 grayscale" : ""}`}
            style={{ backgroundImage: "url('/assets/ui/modal-actions/action-button.png')" }}
          >
            Entrenar x{trainCount}
          </button>
        </div>
      )}
    </section>
  );
}

function ResearchModalSection({ cityTechs, activeResearch, techOptions, resources, onResearch }: {
  cityTechs: { techId: string; level: number }[];
  activeResearch: any | null;
  techOptions: { techId: string; name: string; description: string; category: string; currentLevel: number; canResearch: boolean; researchBlockedReason?: string; nextLevelCost: Record<string, number> | null; nextLevelTime: number | null }[] | null;
  resources: any;
  onResearch: (techId: string) => void;
}) {
  const [category, setCategory] = useState<"ECONOMY" | "MILITARY" | "DEFENSE">("ECONOMY");
  const categoryLabels = { ECONOMY: "Economía", MILITARY: "Militar", DEFENSE: "Defensa" } as const;
  const categoryIcons = { ECONOMY: "💰", MILITARY: "⚔️", DEFENSE: "🛡️" } as const;
  const techs = techOptions
    ? techOptions.filter((tech) => tech.category === category)
    : Object.entries(TECH_INFO).filter(([, info]) => info.category === category).map(([techId, info]) => ({
        techId,
        name: info.name,
        description: info.description,
        category: info.category,
        currentLevel: cityTechs.find((tech) => tech.techId === techId)?.level ?? 0,
        canResearch: true,
        researchBlockedReason: undefined,
        nextLevelCost: getTechCost(techId, cityTechs.find((tech) => tech.techId === techId)?.level ?? 0),
        nextLevelTime: getTechTimeSeconds(techId, cityTechs.find((tech) => tech.techId === techId)?.level ?? 0),
      }));

  return (
    <section className="rounded-[22px] border border-etheria-border-dim bg-[linear-gradient(180deg,rgba(23,46,48,.54),rgba(5,7,7,.28))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.05)]">
      <img src="/assets/ui/modal-actions/research-divider.png" alt="" className="mx-auto mb-1 h-[14px] w-[180px] object-contain opacity-90" />
      <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-etheria-gold-soft">Investigar</div>

      <div className="mb-2 grid grid-cols-3 gap-1">
        {(["ECONOMY", "MILITARY", "DEFENSE"] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`rounded-full border px-1.5 py-1 text-[9px] uppercase tracking-[0.1em] transition-colors ${category === cat ? "border-etheria-teal/55 bg-etheria-emerald/20 text-etheria-gold-soft" : "border-etheria-border-dim bg-black/16 text-etheria-text-muted"}`}
          >
            {categoryIcons[cat]} {categoryLabels[cat]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {techs.slice(0, 6).map((tech) => {
          const info = TECH_INFO[tech.techId];
          const currentLevel = tech.currentLevel;
          const cost = tech.nextLevelCost ?? {};
          const time = tech.nextLevelTime ?? 0;
          const isResearched = currentLevel > 0;
          const icon = info?.icon ?? "📜";
          const canAfford =
            resources.gold >= (cost.gold ?? 0) &&
            resources.wood >= (cost.wood ?? 0) &&
            resources.stone >= (cost.stone ?? 0) &&
            resources.food >= (cost.food ?? 0);
          const disabled = isResearched || !!activeResearch || !canAfford || !tech.canResearch;

          return (
            <div key={tech.techId} className={`rounded-[14px] border p-2 ${isResearched ? "border-etheria-teal/35 bg-etheria-emerald/12" : "border-etheria-border-dim bg-black/14"}`}>
              <div className="flex gap-1.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center bg-contain bg-center bg-no-repeat text-sm" style={{ backgroundImage: "url('/assets/ui/modal-actions/research-medallion.png')" }}>{icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <div className="truncate font-serif text-xs text-etheria-gold-soft">{tech.name}</div>
                      <div className="truncate text-[9px] text-etheria-text-muted">{isResearched ? "Lista" : tech.canResearch ? formatTime(time) : tech.researchBlockedReason ?? "Bloqueada"}</div>
                    </div>
                    <button
                      onClick={() => onResearch(tech.techId)}
                      disabled={disabled}
                      className={`rounded-full border border-etheria-border-gold/45 px-2 py-0.5 text-[9px] uppercase tracking-[0.08em] text-etheria-gold-soft ${disabled ? "opacity-40" : "bg-black/20 hover:bg-etheria-emerald/18"}`}
                    >
                      {isResearched ? "OK" : activeResearch ? "..." : !tech.canResearch ? "No" : "Ir"}
                    </button>
                  </div>
                  {!isResearched && (
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {Object.entries(cost).map(([resourceKey, value]) => (
                        <div key={resourceKey} className="flex items-center gap-0.5 rounded-full bg-black/18 px-1 py-0.5 text-[9px]">
                          <ResourceIconSVG type={resourceKey} size={9} />
                          <span className="font-mono text-etheria-text-muted">{formatNumber(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {techs.length > 6 && (
        <div className="mt-1 text-center text-[9px] uppercase tracking-[0.12em] text-etheria-text-muted">Cambiar categoría para ver más opciones</div>
      )}
    </section>
  );
}

/* ─── Detail Panel ─── */
function DetailPanel({ building, onUpgrade, onClose, resources, isUpgrading, pendingUpgradeBuildingIds }: {
  building: any;
  onUpgrade: (id: string, type: string, level: number) => void;
  onClose: () => void;
  resources: any;
  isUpgrading: boolean;
  pendingUpgradeBuildingIds: string[];
}) {
  const info = BUILDING_INFO[building.type as BuildingType];
  const name = info?.name ?? building.type;
  const cost = getUpgradeCost(building.type, building.level);
  const timeSeconds = getUpgradeTimeSeconds(building.type, building.level);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center gap-2">
        <div className="text-center flex-1">
          <h2 className="m-0 text-etheria-gold-soft font-serif text-xl uppercase tracking-wider">{name}</h2>
          <span className="text-etheria-gold font-serif text-sm">Nivel {building.level}</span>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full border border-etheria-border-gold bg-gradient-to-b from-etheria-gold-deep to-black text-etheria-gold-soft cursor-pointer text-lg">✕</button>
      </div>

      {/* Art */}
      <div className="h-[198px] rounded-lg my-2 relative overflow-hidden border border-etheria-border-dim" style={{
        background: "radial-gradient(circle at 50% 35%, rgba(46,199,201,.20), transparent 28%), linear-gradient(160deg, #16251e, #060808)",
      }}>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 scale-[1.35]">
          <BuildingSprite type={building.type as BuildingType} size={260} />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black/45 to-transparent" />
      </div>

      {/* Description */}
      <p className="text-[#cfc3a8] text-sm leading-relaxed m-0 mb-2">
        {info?.description ?? `El ${name} es un edificio de tu aldea.`}
      </p>

      {/* Stats */}
      <div className="border border-etheria-border-dim rounded-lg overflow-hidden mb-2">
        <div className="grid grid-cols-[1fr_auto] gap-2 px-2.5 py-2 border-b border-etheria-border-dim bg-black/18 text-sm text-[#c8b99b]">
          <span>Categoría</span><strong className="text-etheria-gold-soft font-serif capitalize">{info?.category ?? "—"}</strong>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2 px-2.5 py-2 border-b border-etheria-border-dim bg-black/18 text-sm text-[#c8b99b]">
          <span>Nivel actual</span><strong className="text-etheria-success font-mono">{building.level}</strong>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2 px-2.5 py-2 bg-black/18 text-sm text-[#c8b99b]">
          <span>Posición</span><strong className="text-etheria-text font-mono">({building.positionX}, {building.positionY})</strong>
        </div>
      </div>

      {/* Costs */}
      <div className="grid grid-cols-4 gap-1.5 mb-2">
        {cost.gold != null && cost.gold > 0 && (
          <div className="h-[30px] flex items-center justify-center gap-1 rounded-full bg-black/28 border border-etheria-border-dim text-etheria-text-muted font-mono text-xs">
            <ResourceIconSVG type="gold" size={14} />{formatNumber(cost.gold)}
          </div>
        )}
        {cost.wood != null && cost.wood > 0 && (
          <div className="h-[30px] flex items-center justify-center gap-1 rounded-full bg-black/28 border border-etheria-border-dim text-etheria-text-muted font-mono text-xs">
            <ResourceIconSVG type="wood" size={14} />{formatNumber(cost.wood)}
          </div>
        )}
        {cost.stone != null && cost.stone > 0 && (
          <div className="h-[30px] flex items-center justify-center gap-1 rounded-full bg-black/28 border border-etheria-border-dim text-etheria-text-muted font-mono text-xs">
            <ResourceIconSVG type="stone" size={14} />{formatNumber(cost.stone)}
          </div>
        )}
        {cost.food != null && cost.food > 0 && (
          <div className="h-[30px] flex items-center justify-center gap-1 rounded-full bg-black/28 border border-etheria-border-dim text-etheria-text-muted font-mono text-xs">
            <ResourceIconSVG type="food" size={14} />{formatNumber(cost.food)}
          </div>
        )}
      </div>

      {/* Action */}
      <div className="grid grid-cols-[1fr_150px] items-center gap-2 mb-3">
        <span className="text-etheria-success font-mono text-sm">⏱ {formatTime(timeSeconds)}</span>
        <button
          onClick={() => onUpgrade(building.id, building.type, building.level)}
          disabled={isUpgrading || pendingUpgradeBuildingIds.includes(building.id)}
          className="gold-btn text-sm"
        >
          {pendingUpgradeBuildingIds.includes(building.id) ? "En cola" : isUpgrading ? "Mejorando..." : `Mejorar → Nv ${building.level + 1}`}
        </button>
      </div>

      {/* Queue info */}
      <div className="border-t border-etheria-border-dim pt-2 mt-auto">
        <div className="text-center text-etheria-gold-soft font-serif text-sm uppercase tracking-wider mb-2">Información</div>
        <div className="text-[11px] text-etheria-text-muted text-center">
          ID: {building.id.slice(0, 8)}...<br />
          Creado: {new Date(building.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}

/* ─── Countdown ─── */
function CountdownSmall({ completesAt }: { completesAt: string }) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, new Date(completesAt).getTime() - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTime(`${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [completesAt]);

  return <span className="font-mono">{time}</span>;
}
