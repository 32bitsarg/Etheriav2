"use client";

import type { BuildingType, MailMessage, UnitType } from "@etheria/shared";
import { useGameStore } from "@/stores/gameStore";
import { useToastStore } from "@/stores/toastStore";
import { BUILDING_INFO, BUILDING_NAMES, BUILDING_SIZES, MAX_BUILDING_LEVEL, getUpgradeCost, getUpgradeTimeSeconds, UNIT_INFO, UNIT_IMAGE_PATHS, UNIT_TRAINING_COST, applyTrainingCostReduction, getTrainingCost, getTrainingTimeSeconds, TECH_INFO, getTechCost, getTechTimeSeconds, formatTime, formatNumber, getBuildingDescriptionKey } from "@/lib/constants";
import { BuildingSprite } from "@/components/village/BuildingIcon";
import { VillageCanvas } from "@/components/village/VillageCanvas";
import { ResourceIconSVG } from "@/components/village/ResourceIconSVG";
import { useAllCities, useAllianceMembership, useBarbarianCamps, useBreakTreaty, useCancelBuildQueue, useCancelResearchQueue, useCancelTrainingQueue, useCityRanking, useCreateAlliance, useDisbandAlliance, useJoinAlliance, useKickAllianceMember, useLeaveAlliance, useMailMessages, useMarkMailRead, useProposePeace, useRenameCity, useResearchTech, useSendMailMessage, useTechs, useTrainUnits, useTransferAllianceLeadership, useUpdateAlliance, useUpdateAllianceMemberRole, useUpgradeBuilding, useVillageLayout, useWorldMap, useWorldMovements, useWorldSeason } from "@/hooks/useCity";
import { WorldMapCanvas } from "@/components/worldmap/WorldMapCanvas";
import { BarbarianAttackAlertBanner } from "@/components/barbarians/BarbarianAttackAlertBanner";
import { WinterPressureBanner } from "@/components/barbarians/WinterPressureBanner";
import { ResourceBar } from "@/components/ui/ResourceBar";
import { SettingsModal } from "@/components/village/SettingsModal";
import { useState, useMemo, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useI18n } from "@/i18n";
import { normalizeVillageLayout, resolveVillageRenderableBuildings } from "@/lib/villageLayout";
import type { VillageLayoutData } from "@/lib/villageLayout";

type ViewId = "pueblo" | "mapa";

const CATEGORY_FILTER_IDS = ["all", "economic", "military", "civic"] as const;

const ISO_MAP_SIZE = 24;

export function VillageView() {
  const { t } = useI18n();
  const [activeView, setActiveView] = useState<ViewId>("pueblo");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [upgradingBuildingId, setUpgradingBuildingId] = useState<string | null>(null);
  const [isMailOpen, setIsMailOpen] = useState(false);
  const [isAllianceOpen, setIsAllianceOpen] = useState(false);
  const [isRankingOpen, setIsRankingOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const upgradeLockRef = useRef<string | null>(null);
  const cityName = useGameStore((s) => s.name);
  const cityId = useGameStore((s) => s.cityId);

  const VIEWS = useMemo(() => [
    { id: "pueblo" as ViewId, label: t("play.sidebar.village"), icon: "🏘️" },
    { id: "mapa" as ViewId, label: t("play.sidebar.map"), icon: "🗺️" },
  ], [t]);
  const buildings = useGameStore((s) => s.buildings);
  const units = useGameStore((s) => s.units);
  const buildQueues = useGameStore((s) => s.buildQueues);
  const trainingQueues = useGameStore((s) => s.trainingQueues);
  const cityTechs = useGameStore((s) => s.cityTechs);
  const researchQueue = useGameStore((s) => s.researchQueue);
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
  const isFullscreenView = isPuebloView || isMapView; 
  const pendingUpgradeBuildingIds = useMemo(() => buildQueues.map((queue) => queue.buildingId), [buildQueues]);

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
      if (candidateUpdatedAt > existingUpdatedAt || (candidateUpdatedAt === existingUpdatedAt && building.level > existing.level)) {
        byOrigin.set(originKey, building);
      }
    }
    return [...byOrigin.values()];
  }, [buildings]);

  const selectedBuilding = uniqueBuildings.find((b) => b.id === selectedBuildingId);

  const handleUpgrade = useCallback((id: string, type: string, currentLevel: number) => {
    if (!cityId) return;
    if (upgradeLockRef.current) return;
    if (buildQueues.some((queue) => queue.buildingId === id)) return;
    const cost = getUpgradeCost(type, currentLevel);
    if (resources.gold >= (cost.gold ?? 0) && resources.wood >= (cost.wood ?? 0) && resources.stone >= (cost.stone ?? 0) && resources.food >= (cost.food ?? 0)) {
      upgradeLockRef.current = id;
      setUpgradingBuildingId(id);
      upgradeBuilding.mutate({ cityId, buildingId: id }, {
          onSuccess: () => {
            addToast({ type: "success", title: t("play.toasts.upgradeStarted"), message: t(BUILDING_NAMES[type as keyof typeof BUILDING_NAMES]) });
          },
          onError: (error) => {
            addToast({ type: "error", title: t("play.toasts.upgradeFailed"), message: error.message });
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
      addToast({ type: "error", title: t("play.toasts.insufficientResources") });
    }
  }, [buildQueues, cityId, resources, upgradeBuilding, addToast, t]);

  const handleTrainUnit = useCallback((unitType: string, count: number) => {
    if (!cityId) return;
    const cost = applyTrainingCostReduction(getTrainingCost(unitType as UnitType, count), techBonuses?.trainingCostReduction ?? 0);
    if (resources.gold >= (cost.gold ?? 0) && resources.food >= (cost.food ?? 0) && resources.wood >= (cost.wood ?? 0) && resources.stone >= (cost.stone ?? 0)) {
      trainUnits.mutate({ cityId, unitType, count }, {
          onSuccess: () => {
            const name = t(UNIT_INFO[unitType as UnitType]?.nameKey ?? unitType);
            addToast({ type: "success", title: t("play.toasts.trainingStarted"), message: `${name} x${count}` });
          },
          onError: (error) => {
            addToast({ type: "error", title: t("play.toasts.trainingFailed"), message: error.message });
          },
        }
      );
    } else {
      addToast({ type: "error", title: t("play.toasts.insufficientResources") });
    }
  }, [cityId, resources, techBonuses, trainUnits, addToast, t]);

  const handleResearch = useCallback((techId: string) => {
    if (!cityId) return;
    const existing = cityTechs.find((t) => t.techId === techId);
    const currentLevel = existing?.level ?? 0;
    const cost = getTechCost(techId, currentLevel);
    if (resources.gold >= (cost.gold ?? 0) && resources.wood >= (cost.wood ?? 0) && resources.stone >= (cost.stone ?? 0) && resources.food >= (cost.food ?? 0)) {
      researchTech.mutate({ cityId, techId }, {
          onSuccess: () => {
            const name = t(TECH_INFO[techId]?.nameKey ?? techId);
            addToast({ type: "success", title: t("play.toasts.researchStarted"), message: name });
          },
          onError: (error) => {
            addToast({ type: "error", title: t("play.toasts.researchFailed"), message: error.message });
          },
        }
      );
    } else {
      addToast({ type: "error", title: t("play.toasts.insufficientResources") });
    }
  }, [cityId, resources, cityTechs, researchTech, addToast]);

  return (
    <div className="village-shell relative z-10 grid h-screen w-screen overflow-hidden">
      <BarbarianAttackAlertBanner />
      <WinterPressureBanner />
      <header className="pointer-events-none absolute left-[calc(var(--sidebar-width)+12px)] right-3 top-2 z-50">
        <ResourceBar />
      </header>
      <aside className="grepolis-sidebar village-sidebar">
        <div className="grepolis-sidebar__header">
          <span className="grepolis-sidebar__city-name">{cityName || t("play.sidebar.village")}</span>
        </div>
        <nav className="grepolis-sidebar__nav relative pb-2">
          {VIEWS.map((v) => (
            <button key={v.id} onClick={() => { setActiveView(v.id); setSelectedBuildingId(null); }} className={`grepolis-nav-item ${activeView === v.id ? "active" : ""}`}>
              <span className="grepolis-nav-item__icon-wrap">
                <span className="grepolis-nav-item__icon">{v.icon}</span>
              </span>
              <span className="grepolis-nav-item__label">{v.label}</span>
            </button>
          ))}
          <div className="grepolis-sidebar__divider" />
          <button onClick={() => setIsRankingOpen(true)} className="grepolis-nav-item">
            <span className="grepolis-nav-item__icon-wrap"><span className="grepolis-nav-item__icon">🏆</span></span>
            <span className="grepolis-nav-item__label">{t("play.sidebar.ranking")}</span>
          </button>
          <button onClick={() => setIsMailOpen(true)} className="grepolis-nav-item">
            <span className="grepolis-nav-item__icon-wrap">
              <span className="grepolis-nav-item__icon">📜</span>
              {(mailData?.unreadCount ?? 0) > 0 && <span className="grepolis-nav-item__badge">{mailData?.unreadCount}</span>}
            </span>
            <span className="grepolis-nav-item__label">{t("play.sidebar.mail")}</span>
          </button>
          <button onClick={() => setIsAllianceOpen(true)} className="grepolis-nav-item">
            <span className="grepolis-nav-item__icon-wrap"><span className="grepolis-nav-item__icon">🛡️</span></span>
            <span className="grepolis-nav-item__label">{t("play.sidebar.alliances")}</span>
          </button>
          <div className="grepolis-sidebar__divider" />
          <button onClick={() => setIsSettingsOpen(true)} className="grepolis-nav-item">
            <span className="grepolis-nav-item__icon-wrap"><span className="grepolis-nav-item__icon">⚙️</span></span>
            <span className="grepolis-nav-item__label">{t("play.settings.title")}</span>
          </button>
        </nav>
      </aside>

      <main className={isFullscreenView ? "absolute top-0 bottom-0 z-10 min-w-0 min-h-0 overflow-hidden" : "village-main col-start-2 row-start-2 min-w-0 min-h-0 overflow-hidden p-2.5"} style={isFullscreenView ? { left: 0, right: 0 } : undefined}>
        {activeView === "pueblo" && (
          <PuebloView
            buildings={uniqueBuildings}
            selectedBuildingId={selectedBuildingId}
            onSelectBuilding={setSelectedBuildingId}
            cityName={cityName}
            resources={resources}
            storage={storage}
            production={production}
            onRename={() => setIsRenameOpen(true)}
            pendingUpgradeBuildingIds={pendingUpgradeBuildingIds}
            t={t}
          />
        )}
        {activeView === "mapa" && (
          <MapaView
            cityName={cityName}
            resources={resources}
            storage={storage}
            production={production}
            allianceData={allianceData}
            onRename={() => setIsRenameOpen(true)}
            onEnterVillage={() => setActiveView("pueblo")}
            t={t}
          />
        )}
      </main>

      <QueueRail
        buildQueues={buildQueues}
        trainingQueues={trainingQueues}
        researchQueues={researchQueue.length > 0 ? researchQueue : activeResearch ? [activeResearch] : []}
        t={t}
      />

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
        t={t}
      />
      )}
      {isMailOpen && <MailModal onClose={() => setIsMailOpen(false)} t={t} />}
      {isAllianceOpen && <AllianceModal onClose={() => setIsAllianceOpen(false)} t={t} />}
      {isRankingOpen && <RankingModal myCityId={cityId} onClose={() => setIsRankingOpen(false)} t={t} />}
      {isRenameOpen && <RenameCityModal cityId={cityId} currentName={cityName} onClose={() => setIsRenameOpen(false)} t={t} />}
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
}

function QueueRail({ buildQueues, trainingQueues, researchQueues, t }: {
  buildQueues: any[];
  trainingQueues: any[];
  researchQueues: any[];
  t: (key: string) => string;
}) {
  const cityId = useGameStore((s) => s.cityId);
  const cancelBuildQueue = useCancelBuildQueue();
  const cancelTrainingQueue = useCancelTrainingQueue();
  const cancelResearchQueue = useCancelResearchQueue();
  const addToast = useToastStore((s) => s.addToast);
  const hasQueues = buildQueues.length > 0 || trainingQueues.length > 0 || researchQueues.length > 0;

  const showCancelResult = (title: string, data?: any) => {
    const refundText = Object.entries(data?.refund ?? {})
      .filter(([, value]) => typeof value === "number" && value > 0)
      .map(([key, value]) => `${t(`play.resources.${key}`)}: ${formatNumber(value as number)}`)
      .join(" · ");
    addToast({ type: "success", title, message: refundText || t("play.dock.refund50") });
  };

  return (
    <aside className="pointer-events-auto absolute right-3 top-[76px] z-40 flex max-h-[calc(100vh-98px)] w-[260px] flex-col overflow-hidden rounded-lg border border-amber-300/20 bg-[#071025]/70 shadow-[0_14px_38px_rgba(0,0,0,0.38)] backdrop-blur-md max-lg:right-2 max-lg:w-[232px] max-md:hidden">
      <div className="border-b border-amber-200/15 px-3 py-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200/85">{t("play.queues.title")}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2">
        {!hasQueues && (
          <div className="rounded-md border border-white/8 bg-black/20 px-3 py-2 text-[11px] text-white/55">
            {t("play.queues.empty")}
          </div>
        )}

        <QueueSection title={t("play.sidebar.construction")} emptyText={t("play.queues.noConstruction")}>
          {buildQueues.map((queue) => {
            const name = t(BUILDING_NAMES[queue.buildingType as keyof typeof BUILDING_NAMES] ?? queue.buildingType);
            return (
              <QueueRailItem
                key={queue.id}
                icon={<BuildingSprite type={queue.buildingType as BuildingType} level={queue.targetLevel} size={30} />}
                title={name}
                subtitle={`${t("play.building.level")} ${queue.targetLevel}`}
                completesAt={queue.completesAt}
                cancelLabel={t("play.dock.cancel")}
                isCancelling={cancelBuildQueue.variables?.queueId === queue.id}
                onCancel={() => {
                  if (!cityId) return;
                  cancelBuildQueue.mutate(
                    { cityId, queueId: queue.id },
                    {
                      onSuccess: (data) => showCancelResult(t("play.dock.upgradeCancelled"), data),
                      onError: (error) => addToast({ type: "error", title: t("play.dock.cancelFailed"), message: error.message }),
                    }
                  );
                }}
              />
            );
          })}
        </QueueSection>

        <QueueSection title={t("play.sidebar.training")} emptyText={t("play.queues.noTraining")}>
          {trainingQueues.map((queue) => {
            const info = UNIT_INFO[queue.unitType as UnitType];
            const imagePath = UNIT_IMAGE_PATHS[queue.unitType as UnitType];
            const icon = imagePath
              ? <img src={imagePath} alt="" className="h-8 w-8 object-contain" />
              : <span className="text-lg leading-none">{info?.icon ?? "?"}</span>;
            return (
              <QueueRailItem
                key={queue.id}
                icon={icon}
                title={info ? t(info.nameKey) : queue.unitType}
                subtitle={`x${queue.count}`}
                completesAt={queue.completesAt}
                cancelLabel={t("play.dock.cancel")}
                isCancelling={cancelTrainingQueue.variables?.queueId === queue.id}
                onCancel={() => {
                  if (!cityId) return;
                  cancelTrainingQueue.mutate(
                    { cityId, queueId: queue.id },
                    {
                      onSuccess: (data) => showCancelResult(t("play.dock.trainingCancelled"), data),
                      onError: (error) => addToast({ type: "error", title: t("play.dock.cancelFailed"), message: error.message }),
                    }
                  );
                }}
              />
            );
          })}
        </QueueSection>

        <QueueSection title={t("play.queues.knowledge")} emptyText={t("play.queues.noResearch")}>
          {researchQueues.map((queue) => (
            <QueueRailItem
              key={queue.id}
              icon={<span className="text-lg leading-none">{TECH_INFO[queue.techId]?.icon ?? "?"}</span>}
              title={t(TECH_INFO[queue.techId]?.nameKey ?? queue.techId)}
              subtitle={`${t("play.building.level")} ${queue.targetLevel}`}
              completesAt={queue.completesAt}
              cancelLabel={t("play.dock.cancel")}
              isCancelling={cancelResearchQueue.variables?.queueId === queue.id}
              onCancel={() => {
                if (!cityId) return;
                cancelResearchQueue.mutate(
                  { cityId, queueId: queue.id },
                  {
                    onSuccess: (data) => showCancelResult(t("play.dock.researchCancelled"), data),
                    onError: (error) => addToast({ type: "error", title: t("play.dock.cancelFailed"), message: error.message }),
                  }
                );
              }}
            />
          ))}
        </QueueSection>
      </div>
    </aside>
  );
}

function QueueSection({ title, emptyText, children }: { title: string; emptyText: string; children: ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  const isEmpty = Array.isArray(items) ? items.length === 0 : !items;

  return (
    <section className="mb-3 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h3 className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100/75">{title}</h3>
      </div>
      <div className="space-y-1.5">
        {isEmpty ? (
          <div className="rounded-md border border-white/8 bg-black/18 px-2.5 py-2 text-[10px] text-white/40">{emptyText}</div>
        ) : items}
      </div>
    </section>
  );
}

function QueueRailItem({ icon, title, subtitle, completesAt, cancelLabel, isCancelling, onCancel }: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  completesAt: string;
  cancelLabel?: string;
  isCancelling?: boolean;
  onCancel?: () => void;
}) {
  return (
    <div className="grid min-h-12 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-white/8 bg-black/24 px-2 py-1.5">
      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded bg-white/6">{icon}</div>
      <div className="min-w-0">
        <div className="truncate text-[11px] font-semibold text-white/82">{title}</div>
        <div className="truncate text-[10px] text-white/42">{subtitle}</div>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-amber-100/78">
        <CountdownSmall completesAt={completesAt} />
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isCancelling}
            className="grid h-5 w-5 place-items-center rounded border border-rose-300/20 bg-rose-950/30 text-[12px] leading-none text-rose-100/80 transition hover:border-rose-200/45 hover:bg-rose-800/40 disabled:opacity-45"
            aria-label={cancelLabel}
            title={cancelLabel}
          >
            x
          </button>
        ) : null}
      </div>
    </div>
  );
}

function PuebloView({ buildings, selectedBuildingId, onSelectBuilding, cityName, resources, storage, production, onRename, pendingUpgradeBuildingIds, t }: {
  buildings: any[];
  selectedBuildingId: string | null;
  onSelectBuilding: (id: string) => void;
  cityName: string;
  resources: any;
  storage: any;
  production: { goldPerHour: number; woodPerHour: number; stonePerHour: number; foodPerHour: number };
  onRename: () => void;
  pendingUpgradeBuildingIds: string[];
  t: (key: string) => string;
}) {
  const { data: layout } = useVillageLayout();
  const placedBuildings = useMemo(() => resolveVillageRenderableBuildings(buildings).map((building) => ({
    ...building,
    displayName: t(BUILDING_NAMES[building.type as BuildingType] ?? building.type),
  })), [buildings, t]);
  const activeLayout: VillageLayoutData = normalizeVillageLayout(layout);

  return (
    <div className="relative h-full overflow-hidden">
      <VillageCanvas
        layout={activeLayout}
        buildings={placedBuildings}
        selectedBuildingId={selectedBuildingId}
        onSelectBuilding={onSelectBuilding}
        queues={pendingUpgradeBuildingIds.map(id => ({ buildingId: id }))}
      />
    </div>
  );
}

function MapaView({ cityName, resources, storage, production, allianceData, onRename, onEnterVillage, t }: {
  cityName: string;
  resources: any;
  storage: any;
  production: { goldPerHour: number; woodPerHour: number; stonePerHour: number; foodPerHour: number };
  allianceData: any;
  onRename: () => void;
  onEnterVillage: () => void;
  t: (key: string) => string;
}) {
  const { data: cities } = useAllCities();
  const { data: worldMap } = useWorldMap();
  const { data: barbarianCamps } = useBarbarianCamps();
  const { data: movements } = useWorldMovements();
  const { data: seasonData } = useWorldSeason();
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
          movements={movements ?? []}
          seasonState={seasonData?.season ?? null}
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
          t={t}
          onClose={() => setSelectedCityId(null)}
          onEnter={enterVillage}
          onAttack={() => addToast({ type: "info", title: t("play.battle.title"), message: t("play.battle.selectTroops") })}
          onSpy={() => addToast({ type: "info", title: t("play.espionage.title"), message: t("play.espionage.pending") })}
        />
      )}
    </div>
  );
}

function MapCityRadial({ cityName, isOwnCity, position, t, onClose, onEnter, onAttack, onSpy }: {
  cityName: string;
  isOwnCity: boolean;
  position: { x: number; y: number };
  t: (key: string) => string;
  onClose: () => void;
  onEnter: () => void;
  onAttack: () => void;
  onSpy: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 pointer-events-none">
      <div className="absolute inset-0 bg-black/15 pointer-events-auto" onClick={onClose} />
      <div className="absolute pointer-events-auto transition-all duration-300 ease-out" style={{ left: position.x, top: position.y }}>
        <div className="relative -translate-x-1/2 -translate-y-1/2">
          <div className="absolute inset-0 bg-etheria-gold/20 rounded-full blur-2xl animate-pulse" />
          <div className="relative bg-black/85 backdrop-blur-xl border-2 border-etheria-gold/40 rounded-full w-48 h-48 flex items-center justify-center shadow-[0_0_50px_rgba(215,168,76,0.3)]">
            <div className="text-center px-4">
              <div className="text-[10px] uppercase tracking-widest text-etheria-gold-soft/70 mb-1">{t("play.map.villageLabel")}</div>
              <div className="font-serif text-sm text-white truncate max-w-[140px] mb-2">{cityName}</div>
              <div className="flex flex-wrap justify-center gap-2">
                {isOwnCity ? (
                  <button onClick={onEnter} className="bg-etheria-gold text-black text-[10px] font-bold px-3 py-1.5 rounded-full hover:bg-white transition-colors">{t("play.map.enter")}</button>
                ) : (
                  <>
                    <button onClick={onAttack} className="bg-[#d75f43] text-white text-[10px] font-bold px-3 py-1.5 rounded-full hover:bg-red-400 transition-colors">{t("play.map.attack")}</button>
                    <button onClick={onSpy} className="bg-etheria-teal text-white text-[10px] font-bold px-3 py-1.5 rounded-full hover:bg-teal-400 transition-colors">{t("play.map.spy")}</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getMapRelation(city: any, allianceData: any) {
  const myAllianceId = allianceData?.membership?.allianceId;
  if (!myAllianceId || !city.allianceId) return "neutral";
  if (city.allianceId === myAllianceId) return "ally";
  const relation = (allianceData?.diplomacy ?? []).find((d: any) => d.allianceAId === city.allianceId || d.allianceBId === city.allianceId);
  if (relation?.status === "PEACE") return "peace";
  if (relation?.status === "BROKEN" || relation?.status === "HOSTILE") return "hostile";
  return "neutral";
}

function resolveNonOverlappingBuildings<T extends { id: string; type: BuildingType; level: number; positionX: number; positionY: number; createdAt?: string; upgradedAt?: string }>(inputBuildings: T[]) {
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
    if (tiles.length > 0 && tiles.some((t) => occupied.has(t))) continue;
    tiles.forEach((t) => occupied.add(t));
    chosen.push(building);
  }
  return chosen.sort((a, b) => (a.positionY - b.positionY) || (a.positionX - b.positionX));
}

/* ─── Mail Modal ─── */
function MailModal({ onClose, t }: { onClose: () => void; t: (key: string) => string }) {
  const { data: mailData, isLoading } = useMailMessages();
  const markRead = useMarkReadMail();
  const sendMail = useSendMailMessage();
  const addToast = useToastStore((s) => s.addToast);
  const { data: allCities } = useAllCities();
  
  const [tab, setTab] = useState<"inbox" | "sent" | "compose">("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recipientCityId, setRecipientCityId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const messages = tab === "inbox" ? mailData?.inbox ?? [] : mailData?.sent ?? [];
  const selected = messages.find((m: any) => m.id === selectedId);
  const recipients = (allCities ?? []).filter((c: any) => c.id !== useGameStore.getState().cityId);

  useEffect(() => {
    if (tab !== "inbox" || !selected || selected.readAt) return;
    markRead.mutate({ id: selected.id, read: true });
  }, [markRead, selected, tab]);

  const submit = () => {
    if (!recipientCityId || !subject.trim() || !body.trim()) {
      addToast({ type: "error", title: t("play.toasts.incompleteMessage") });
      return;
    }
    sendMail.mutate({ recipientCityId, subject, body }, {
        onSuccess: () => {
          setSubject(""); setBody(""); setTab("sent");
          addToast({ type: "success", title: t("play.toasts.messageSent") });
        },
        onError: (error) => addToast({ type: "error", title: t("play.toasts.sendFailed"), message: error.message }),
      }
    );
  };

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/62 px-4 backdrop-blur-[4px]" onClick={onClose}>
      <div className="relative grid h-[min(640px,calc(100vh-36px))] w-full max-w-[920px] overflow-hidden rounded-[30px] border border-etheria-border bg-[#0b1111] shadow-[0_28px_90px_rgba(0,0,0,.58)] lg:grid-cols-[310px_1fr]" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-5 top-5 z-10 text-etheria-gold-soft">✕</button>
        <aside className="border-r border-white/5 p-4 overflow-y-auto">
          <div className="font-serif text-lg text-etheria-gold-soft mb-4 uppercase tracking-widest">{t("play.mail.title")}</div>
          <div className="flex gap-1 mb-4">
            {["inbox", "sent", "compose"].map((tId) => (
              <button key={tId} onClick={() => setTab(tId as any)} className={`flex-1 text-[10px] py-1.5 rounded-full border transition-colors ${tab === tId ? "border-etheria-gold bg-etheria-gold/10 text-etheria-gold" : "border-white/10 text-white/40 hover:text-white"}`}>
                {t(`play.mail.${tId}`)}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            {tab !== "compose" && messages.map((m: any) => (
              <button key={m.id} onClick={() => setSelectedId(m.id)} className={`w-full text-left p-3 rounded-xl border transition-all ${selectedId === m.id ? "border-etheria-gold/40 bg-etheria-gold/5" : "border-transparent hover:bg-white/5"}`}>
                <div className="flex items-center justify-between mb-1">
                   <span className="font-serif text-xs text-white truncate">{m.subject}</span>
                   {tab === "inbox" && !m.readAt && <span className="w-2 h-2 rounded-full bg-etheria-gold" />}
                </div>
                <div className="text-[10px] text-white/40">{tab === "sent" ? m.recipientName : m.senderName}</div>
              </button>
            ))}
          </div>
        </aside>
        <main className="p-6 overflow-y-auto">
          {tab === "compose" ? (
            <div className="max-w-md mx-auto space-y-4">
               <select value={recipientCityId} onChange={(e) => setRecipientCityId(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white">
                 <option value="">{t("play.mail.selectRecipient")}</option>
                 {recipients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
               <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("play.mail.subjectPlaceholder")} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white" />
               <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("play.mail.bodyPlaceholder")} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white h-64 resize-none" />
               <button onClick={submit} className="w-full bg-etheria-gold text-black font-bold py-3 rounded-xl hover:bg-white transition-colors">{t("play.mail.send")}</button>
            </div>
          ) : selected ? (
            <div>
              <div className="font-serif text-2xl text-etheria-gold-soft mb-1">{selected.subject}</div>
              <div className="text-xs text-white/40 mb-6 pb-6 border-b border-white/5">
                {tab === "sent" ? `Para: ${selected.recipientName}` : `De: ${selected.senderName}`} · {new Date(selected.createdAt).toLocaleString()}
              </div>
              <div className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap">{selected.body}</div>
            </div>
          ) : <div className="h-full flex items-center justify-center text-white/20 italic">{t("play.mail.selectMessage")}</div>}
        </main>
      </div>
    </div>
  );
}

/* ─── Ranking Modal ─── */
function RankingModal({ myCityId, onClose, t }: { myCityId: string | null; onClose: () => void; t: (key: string) => string }) {
  const { data: ranking, isLoading } = useCityRanking();
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[86vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-etheria-border bg-[#0b1111] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-serif text-2xl text-etheria-gold-soft uppercase tracking-widest">{t("play.ranking.title")}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">✕</button>
        </div>
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-left">
            <thead className="bg-black/40 text-[10px] uppercase tracking-widest text-white/40">
              <tr>
                <th className="p-4">Rank</th>
                <th className="p-4">{t("play.ranking.village")}</th>
                <th className="p-4 text-right">Poder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ranking?.map((entry: any) => (
                <tr key={entry.cityId} className={entry.cityId === myCityId ? "bg-etheria-gold/10" : ""}>
                  <td className="p-4 font-mono text-white/40">#{entry.rank}</td>
                  <td className="p-4 font-serif text-white">{entry.cityName}</td>
                  <td className="p-4 text-right font-mono text-etheria-gold">{formatNumber(entry.power)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Building Modal ─── */
function BuildingModal({ building, resources, onUpgrade, onTrain, onResearch, isUpgrading, pendingUpgradeBuildingIds, units, cityTechs, activeResearch, techOptions, techBonuses, onClose, t }: any) {
  const info = BUILDING_INFO[building.type as BuildingType];
  const name = info ? t(info.nameKey) : building.type;
  const cost = getUpgradeCost(building.type, building.level);
  const timeSeconds = getUpgradeTimeSeconds(building.type, building.level);
  const isMaxLevel = building.level >= MAX_BUILDING_LEVEL;

  const showTraining = building.type === "BARRACKS" || building.type === "STABLE";
  const showResearch = building.type === "ACADEMY";

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 backdrop-blur-md p-4" onClick={onClose}>
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[40px] border border-etheria-border bg-[#0b1111] shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col md:flex-row" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-6 top-6 z-10 text-white/40 hover:text-white">✕</button>
        
        {/* Left Side: Visuals */}
        <div className="w-full md:w-[400px] bg-black/40 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/5">
          <div className="mb-6 scale-125">
            <BuildingSprite type={building.type as BuildingType} level={building.level} size={300} />
          </div>
          <div className="text-center">
            <div className="text-etheria-gold-soft font-serif text-3xl mb-1">{name}</div>
            <div className="text-white/40 text-sm uppercase tracking-widest">{t("play.building.level")} {building.level}</div>
          </div>
        </div>

        {/* Right Side: Actions */}
        <div className="flex-1 p-8 overflow-y-auto">
          <p className="text-white/70 leading-relaxed mb-8">{t(getBuildingDescriptionKey(building.type))}</p>
          
          <div className="space-y-6">
            <section className="bg-white/5 rounded-3xl p-6 border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-white uppercase tracking-widest">{t("play.building.upgrade")}</h3>
                <span className="font-mono text-etheria-success">{formatTime(timeSeconds)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {Object.entries(cost).map(([res, val]) => (
                  <div key={res} className="bg-black/40 rounded-xl p-2 flex items-center gap-2 border border-white/5">
                    <ResourceIconSVG type={res as any} size={16} />
                    <span className="font-mono text-sm text-white/80">{formatNumber(val)}</span>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => onUpgrade(building.id, building.type, building.level)}
                disabled={isMaxLevel || isUpgrading || pendingUpgradeBuildingIds.includes(building.id)}
                className="w-full bg-etheria-gold text-black font-bold py-4 rounded-2xl hover:bg-white transition-all disabled:opacity-30"
              >
                {isMaxLevel ? t("play.building.maxLevel") : pendingUpgradeBuildingIds.includes(building.id) ? t("play.building.inQueue") : isUpgrading ? t("play.building.upgrading") : `${t("play.building.upgradeTo")} ${building.level + 1}`}
              </button>
            </section>

            {showTraining && (
               <TrainingSection buildingType={building.type} units={units} techBonuses={techBonuses} resources={resources} onTrain={onTrain} t={t} />
            )}
            
            {showResearch && (
               <ResearchSection cityTechs={cityTechs} activeResearch={activeResearch} techOptions={techOptions} resources={resources} onResearch={onResearch} t={t} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TrainingSection({ buildingType, units, techBonuses, resources, onTrain, t }: any) {
  const [count, setCount] = useState(1);
  const unitTypes: UnitType[] = buildingType === "STABLE" ? ["CAVALRY"] : ["WARRIOR", "ARCHER"];
  return (
    <section className="bg-white/5 rounded-3xl p-6 border border-white/5">
      <h3 className="font-serif text-lg text-white uppercase tracking-widest mb-4">{t("play.training.title")}</h3>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {unitTypes.map(type => (
          <button key={type} onClick={() => onTrain(type, count)} className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col items-center hover:bg-etheria-gold/10 transition-colors">
            {UNIT_IMAGE_PATHS[type] ? (
              <img src={UNIT_IMAGE_PATHS[type]} alt="" className="mb-1 h-16 w-16 object-contain" draggable={false} />
            ) : (
              <span className="text-2xl mb-1">{UNIT_INFO[type].icon}</span>
            )}
            <span className="text-[10px] text-white/60 text-center">{t(UNIT_INFO[type].nameKey)}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <input type="number" min="1" max="100" value={count} onChange={(e) => setCount(Number(e.target.value))} className="flex-1 bg-black/40 border border-white/5 rounded-xl p-3 text-white text-center" />
        <span className="text-white/40 text-xs">Cant.</span>
      </div>
    </section>
  );
}

function ResearchSection({ cityTechs, activeResearch, techOptions, resources, onResearch, t }: any) {
  return (
    <section className="bg-white/5 rounded-3xl p-6 border border-white/5">
      <h3 className="font-serif text-lg text-white uppercase tracking-widest mb-4">{t("play.research.title")}</h3>
      <div className="space-y-2">
        {techOptions?.map((tech: any) => (
          <div key={tech.techId} className="bg-black/40 border border-white/5 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-white text-sm font-serif">{tech.name}</div>
              <div className="text-[10px] text-white/40">Nivel {tech.currentLevel}</div>
            </div>
            <button onClick={() => onResearch(tech.techId)} disabled={!tech.canResearch} className="bg-etheria-teal text-white text-[10px] px-4 py-2 rounded-lg disabled:opacity-20">Investigar</button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Utils ─── */
function useMarkReadMail() {
  const markRead = useMarkMailRead();
  return markRead;
}

function RenameCityModal({ cityId, currentName, onClose, t }: any) {
  const [name, setName] = useState(currentName);
  const rename = useRenameCity();
  const addToast = useToastStore((s) => s.addToast);
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
       <div className="bg-[#0b1111] border border-etheria-border p-8 rounded-3xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
          <h2 className="font-serif text-xl text-etheria-gold-soft mb-4">{t("play.rename.title")}</h2>
          <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white mb-4" />
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 bg-white/5 text-white/40 py-3 rounded-xl">{t("play.rename.cancel")}</button>
            <button onClick={() => rename.mutate({ cityId, name }, { onSuccess: onClose })} className="flex-1 bg-etheria-gold text-black font-bold py-3 rounded-xl">{t("play.rename.save")}</button>
          </div>
       </div>
    </div>
  );
}

function AllianceModal({ onClose, t }: any) {
  const { data, isLoading } = useAllianceMembership();
  const createAlliance = useCreateAlliance();
  const joinAlliance = useJoinAlliance();
  const updateAlliance = useUpdateAlliance();
  const proposePeace = useProposePeace();
  const breakTreaty = useBreakTreaty();
  const leaveAlliance = useLeaveAlliance();
  const disbandAlliance = useDisbandAlliance();
  const kickMember = useKickAllianceMember();
  const transferLeadership = useTransferAllianceLeadership();
  const updateRole = useUpdateAllianceMemberRole();
  const addToast = useToastStore((s) => s.addToast);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [targetAllianceId, setTargetAllianceId] = useState("");
  const [publicIntro, setPublicIntro] = useState("");
  const [forumText, setForumText] = useState("");

  useEffect(() => {
    setPublicIntro(data?.membership?.alliance?.publicIntro ?? "");
    setForumText(data?.membership?.alliance?.forumText ?? "");
  }, [data?.membership?.alliance?.forumText, data?.membership?.alliance?.publicIntro]);

  const role = data?.membership?.role;
  const membershipId = data?.membership?.id;
  const canManage = role === "LEADER" || role === "OFFICER" || role === "DIPLOMAT";
  const canEdit = role === "LEADER" || role === "OFFICER";
  const isLeader = role === "LEADER";
  const currentAllianceId = data?.membership?.allianceId;
  const otherAlliances = (data?.alliances ?? []).filter((alliance: any) => alliance.id !== currentAllianceId);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-etheria-border bg-[#0b1111] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/5 p-5">
          <h2 className="font-serif text-2xl uppercase tracking-widest text-etheria-gold-soft">{t("play.alliance.title")}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">?</button>
        </div>

        <div className="max-h-[calc(88vh-76px)] overflow-y-auto p-5">
          {isLoading ? (
            <div className="py-12 text-center text-white/40">{t("play.alliance.loading")}</div>
          ) : !data?.gate?.allowed ? (
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5">
              <div className="font-serif text-lg text-amber-200">{t("play.alliance.requiredCenter")}</div>
              <p className="mt-2 text-sm text-white/55">{t("play.alliance.requiredCenterDesc")}</p>
            </div>
          ) : !data.membership ? (
            <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="font-serif text-lg text-white">{t("play.alliance.createTitle")}</h3>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("play.alliance.namePlaceholder")} className="mt-4 w-full rounded-xl border border-white/10 bg-black/35 p-3 text-sm text-white" />
                <input value={tag} onChange={(e) => setTag(e.target.value.toUpperCase().slice(0, 4))} placeholder={t("play.alliance.tagPlaceholder")} className="mt-3 w-full rounded-xl border border-white/10 bg-black/35 p-3 text-sm text-white" />
                <button onClick={() => createAlliance.mutate({ name, tag })} disabled={createAlliance.isPending || !name.trim() || !tag.trim()} className="mt-4 w-full rounded-xl bg-etheria-gold py-3 font-bold text-black disabled:opacity-35">{t("play.alliance.create")}</button>
              </section>
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="font-serif text-lg text-white">{t("play.alliance.join")}</h3>
                <div className="mt-4 space-y-2">
                  {otherAlliances.map((alliance: any) => (
                    <div key={alliance.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/25 p-3">
                      <div>
                        <div className="font-serif text-sm text-etheria-gold-soft">[{alliance.tag}] {alliance.name}</div>
                        <div className="text-[11px] text-white/35">{t("play.alliance.honor")} {alliance.honorScore ?? 100}</div>
                      </div>
                      <button onClick={() => joinAlliance.mutate(alliance.id)} className="rounded-lg border border-etheria-gold/40 px-3 py-2 text-xs text-etheria-gold-soft">{t("play.alliance.join")}</button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
              <section className="space-y-5">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-serif text-2xl text-etheria-gold-soft">[{data.membership.alliance?.tag}] {data.membership.alliance?.name}</div>
                      <div className="mt-1 text-xs uppercase tracking-widest text-white/35">{t("play.alliance.role")}: {t(`play.alliance.roles.${role}`)}</div>
                    </div>
                    <div className="text-right text-xs text-white/45">
                      <div>{t("play.alliance.honor")}: {data.membership.alliance?.honorScore ?? 100}</div>
                      <div>{t("play.alliance.broken")}: {data.membership.alliance?.treatiesBroken ?? 0}</div>
                    </div>
                  </div>
                </div>

                {canEdit && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <label className="text-xs uppercase tracking-widest text-white/40">{t("play.alliance.publicPresentation")}</label>
                    <textarea value={publicIntro} onChange={(e) => setPublicIntro(e.target.value)} className="mt-2 h-24 w-full resize-none rounded-xl border border-white/10 bg-black/35 p-3 text-sm text-white" />
                    <label className="mt-4 block text-xs uppercase tracking-widest text-white/40">{t("play.alliance.forum")}</label>
                    <textarea value={forumText} onChange={(e) => setForumText(e.target.value)} className="mt-2 h-28 w-full resize-none rounded-xl border border-white/10 bg-black/35 p-3 text-sm text-white" />
                    <button onClick={() => updateAlliance.mutate({ publicIntro, forumText })} className="mt-4 rounded-xl bg-etheria-gold px-5 py-3 text-sm font-bold text-black">{t("play.alliance.saveForum")}</button>
                  </div>
                )}

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <h3 className="font-serif text-lg text-white">{t("play.alliance.members")}</h3>
                  <div className="mt-3 space-y-2">
                    {(data.members ?? []).map((member: any) => (
                      <div key={member.id} className="grid items-center gap-2 rounded-xl border border-white/5 bg-black/25 p-3 text-sm md:grid-cols-[1fr_150px_auto]">
                        <div className="font-mono text-xs text-white/65">{member.userId}</div>
                        <select disabled={!isLeader || member.role === "LEADER"} value={member.role} onChange={(e) => updateRole.mutate({ memberId: member.id, role: e.target.value as any })} className="rounded-lg border border-white/10 bg-black/35 p-2 text-xs text-white">
                          {["MEMBER", "OFFICER", "DIPLOMAT"].map((nextRole) => <option key={nextRole} value={nextRole}>{t(`play.alliance.roles.${nextRole}`)}</option>)}
                          {member.role === "LEADER" && <option value="LEADER">{t("play.alliance.roles.LEADER")}</option>}
                        </select>
                        <div className="flex justify-end gap-2">
                          {isLeader && member.id !== membershipId && <button onClick={() => transferLeadership.mutate(member.id)} className="rounded-lg border border-cyan-300/30 px-2 py-1 text-[11px] text-cyan-200">{t("play.alliance.transfer")}</button>}
                          {(isLeader || role === "OFFICER") && member.id !== membershipId && member.role !== "LEADER" && <button onClick={() => kickMember.mutate(member.id)} className="rounded-lg border border-rose-300/30 px-2 py-1 text-[11px] text-rose-200">{t("play.alliance.kick")}</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="space-y-5">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <h3 className="font-serif text-lg text-white">{t("play.alliance.diplomacy")}</h3>
                  {canManage && (
                    <div className="mt-3 flex gap-2">
                      <select value={targetAllianceId} onChange={(e) => setTargetAllianceId(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/35 p-3 text-sm text-white">
                        <option value="">{t("play.alliance.targetAlliance")}</option>
                        {otherAlliances.map((alliance: any) => <option key={alliance.id} value={alliance.id}>[{alliance.tag}] {alliance.name}</option>)}
                      </select>
                      <button onClick={() => targetAllianceId && proposePeace.mutate({ targetAllianceId, durationHours: 24 })} className="rounded-xl bg-etheria-teal px-4 text-sm font-bold text-white">{t("play.alliance.peace24h")}</button>
                    </div>
                  )}
                  <div className="mt-4 space-y-2">
                    {(data.diplomacy ?? []).map((treaty: any) => (
                      <div key={treaty.id} className="rounded-xl border border-white/5 bg-black/25 p-3 text-xs text-white/55">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono">{treaty.status}</span>
                          {canManage && treaty.status === "PEACE" && <button onClick={() => breakTreaty.mutate(treaty.id)} className="text-rose-200">{t("play.alliance.break")}</button>}
                        </div>
                        <div>{t("play.alliance.expires")}: {treaty.expiresAt ? new Date(treaty.expiresAt).toLocaleString() : t("play.alliance.noDate")}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <h3 className="font-serif text-lg text-white">{t("play.alliance.activeEffects")}</h3>
                  <div className="mt-3 space-y-2 text-xs text-white/55">
                    {(data.effects ?? []).map((effect: any) => <div key={effect.id} className="rounded-lg bg-black/25 p-2">{effect.reason ?? effect.type} {Number(effect.value ?? 0) * 100}%</div>)}
                    {(data.effects ?? []).length === 0 && <div>{t("play.alliance.empty")}</div>}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <h3 className="font-serif text-lg text-white">{t("play.alliance.publicHistory")}</h3>
                  <div className="mt-3 space-y-2 text-xs text-white/55">
                    {(data.events ?? []).map((event: any) => <div key={event.id} className="rounded-lg bg-black/25 p-2">{event.message}</div>)}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => leaveAlliance.mutate(undefined)} className="flex-1 rounded-xl border border-amber-300/30 py-3 text-sm text-amber-200">{t("play.alliance.leave")}</button>
                  {isLeader && <button onClick={() => disbandAlliance.mutate(undefined)} className="flex-1 rounded-xl border border-rose-300/30 py-3 text-sm text-rose-200">{t("play.alliance.disband")}</button>}
                </div>
              </section>
            </div>
          )}
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
