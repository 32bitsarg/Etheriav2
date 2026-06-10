"use client";

import type { BuildingType, MailMessage, UnitType } from "@etheria/shared";
import { useGameStore } from "@/stores/gameStore";
import { useToastStore, type ToastType } from "@/stores/toastStore";
import { useAudioStore } from "@/stores/audioStore";
import { BUILDING_INFO, BUILDING_NAMES, BUILDING_SIZES, MAX_BUILDING_LEVEL, getUpgradeCost, getUpgradeTimeSeconds, UNIT_INFO, UNIT_IMAGE_PATHS, UNIT_TRAINING_COST, UNIT_STATS, applyTrainingCostReduction, getTrainingCost, getTrainingTimeSeconds, TECH_INFO, getTechCost, getTechTimeSeconds, getTechIconPath, formatTime, formatNumber, getBuildingDescriptionKey } from "@/lib/constants";
import { BuildingSprite } from "@/components/village/BuildingIcon";
import { VillageHTMLCanvas } from "@/components/village/VillageHTMLCanvas";
import { ResourceIconSVG } from "@/components/village/ResourceIconSVG";
import { useAcceptMarketOffer, useActiveBattles, useAllCities, useAllianceMembership, useAttackCity, useBarbarianAttackAlerts, useBattleReports, useBreakTreaty, useCancelBuildQueue, useCancelResearchQueue, useCancelTrainingQueue, useCityRanking, useClaimQuest, useContributeAllianceObjective, useCreateAlliance, useCreateMarketOffer, useDisbandAlliance, useGameReports, useJoinAlliance, useKickAllianceMember, useLeaveAlliance, useMailMessages, useMarkGameReportRead, useMarkMailRead, useMarkMapOpened, useMarkReportRead, useMarketOffers, usePlayerQuests, useProposePeace, useRenameCity, useResearchTech, useScoutTarget, useSendMailMessage, useTechs, useTrainUnits, useTransferAllianceLeadership, useUpdateAlliance, useUpdateAllianceMemberRole, useUpgradeBuilding, useVillageLayout, useWorldMap, useWorldMovements, useWorldSeason } from "@/hooks/useCity";
import { WorldMapHTMLCanvas } from "@/components/worldmap/WorldMapHTMLCanvas";
import { BarbarianAttackAlertBanner } from "@/components/barbarians/BarbarianAttackAlertBanner";
import { WinterPressureBanner } from "@/components/barbarians/WinterPressureBanner";
import { BarbarianCampModal } from "@/components/barbarians/BarbarianCampModal";
import { SettingsModal } from "@/components/village/SettingsModal";
import { VillageImmersiveDock } from "@/components/village/VillageImmersiveDock";
import { MobileHUD } from "@/components/hud/MobileHUD";
import { DesktopHUD } from "@/components/hud/DesktopHUD";
import type { HudActions } from "@/components/hud/hudTypes";
import { useIsMobile } from "@/hooks/useIsMobile";
import { OrientationLock } from "@/components/game/OrientationLock";
import { DailyQuestsPanel } from "@/components/game/DailyQuestsPanel";
import { RankingsPanel } from "@/components/game/RankingsPanel";
import { RallyBanner } from "@/components/game/RallyBanner";
import { WonderPanel } from "@/components/game/WonderPanel";
import { AchievementsPanel } from "@/components/game/AchievementsPanel";
import { ActivityFeedPanel } from "@/components/game/ActivityFeedPanel";
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
  const notifyViewChange = useAudioStore((s) => s.notifyViewChange);

  useEffect(() => {
    notifyViewChange();
  }, [activeView, notifyViewChange]);

  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [upgradingBuildingId, setUpgradingBuildingId] = useState<string | null>(null);
  const [isMailOpen, setIsMailOpen] = useState(false);
  const [isAllianceOpen, setIsAllianceOpen] = useState(false);
  const [isQuestsOpen, setIsQuestsOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDailyQuestsOpen, setIsDailyQuestsOpen] = useState(false);
  const [isNewRankingsOpen, setIsNewRankingsOpen] = useState(false);
  const [isWonderOpen, setIsWonderOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isActivityFeedOpen, setIsActivityFeedOpen] = useState(false);
  const [runtimePollingEnabled, setRuntimePollingEnabled] = useState(false);
  const upgradeLockRef = useRef<string | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  // Prevent wheel events from scrolling page or triggering browser navigation
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => e.preventDefault();
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);
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
  const { data: techOptionsData } = useTechs(cityId, false);
  const { data: mailData } = useMailMessages(isMailOpen);
  const { data: reportsData } = useGameReports(isMailOpen);
  const { data: battleReportsData } = useBattleReports(cityId, runtimePollingEnabled || isMailOpen);
  const { data: allianceData } = useAllianceMembership(isAllianceOpen || activeView === "mapa");
  const { data: activeBattles } = useActiveBattles(cityId, runtimePollingEnabled);
  const { data: barbarianAlerts } = useBarbarianAttackAlerts(cityId, runtimePollingEnabled);
  const { data: worldMoves } = useWorldMovements(activeView === "mapa");
  // Prefetch map data so it's ready when user switches to map view
  const worldId = useGameStore((s) => s.worldId);
  const { data: worldMap } = useWorldMap(worldId);
  const { data: seasonData } = useWorldSeason();

  useEffect(() => {
    const id = window.setTimeout(() => setRuntimePollingEnabled(true), 12_000);
    return () => window.clearTimeout(id);
  }, []);

  const myBattles = activeBattles ?? [];
  const unreadBattleReports = (battleReportsData ?? []).filter((report) => !report.read).length;
  const myName = useGameStore((s) => s.name);
  const myTradeMoves = (worldMoves ?? []).filter(
    (m) => m.type === "TRADE" && (m.from.name === myName || m.to.name === myName)
  );

  const resources = getLiveResources();
  const isMobile = useIsMobile();
  const unreadTotal = (mailData?.unreadCount ?? 0) + (reportsData?.unreadCount ?? 0) + unreadBattleReports;
  const handleViewChange = useCallback((view: ViewId) => {
    setActiveView(view);
    setSelectedBuildingId(null);
  }, []);
  const hudProps: HudActions = {
    activeView,
    onViewChange: handleViewChange,
    cityName,
    onRename: () => setIsRenameOpen(true),
    unreadCount: unreadTotal,
    onOpenMail: () => setIsMailOpen(true),
    onOpenAlliance: () => setIsAllianceOpen(true),
    onOpenQuests: () => setIsQuestsOpen(true),
    onOpenDailyQuests: () => setIsDailyQuestsOpen(true),
    onOpenRankings: () => setIsNewRankingsOpen(true),
    onOpenWonder: () => setIsWonderOpen(true),
    onOpenAchievements: () => setIsAchievementsOpen(true),
    onOpenActivityFeed: () => setIsActivityFeedOpen(true),
    onOpenSettings: () => setIsSettingsOpen(true),
  };
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
  const isModalOpen = !!selectedBuilding || isMailOpen || isAllianceOpen || isQuestsOpen || isRenameOpen || isSettingsOpen || isDailyQuestsOpen || isNewRankingsOpen || isWonderOpen || isAchievementsOpen || isActivityFeedOpen;

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
    <div ref={shellRef} className="village-shell relative z-10 grid h-screen w-screen overflow-hidden pb-16 md:pb-0">
      <BarbarianAttackAlertBanner />
      <WinterPressureBanner />

      {/* HUD: layouts separados mobile/desktop (sin display:none compartido) */}
      {isMobile !== null && (isMobile ? (
        <MobileHUD {...hudProps} />
      ) : (
        <DesktopHUD {...hudProps} />
      ))}

      {/* Main Content — absolute full-width behind sidebars */}
      <main className={`absolute top-[var(--topbar-height)] left-0 right-0 bottom-0 z-10 min-w-0 min-h-0 overflow-hidden ${isModalOpen ? "pointer-events-none" : ""}`}>
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
            interactionsDisabled={isModalOpen}
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
            movements={worldMoves ?? []}
            worldMap={worldMap}
            seasonData={seasonData}
            onRename={() => setIsRenameOpen(true)}
            onEnterVillage={() => setActiveView("pueblo")}
            t={t}
          />
        )}
      </main>

      {/* Bottom dock — queues */}
      <VillageImmersiveDock />

      {/* Rally banner — floats above dock when there's an active rally */}
      <div className="pointer-events-auto absolute inset-x-3 bottom-16 z-40">
        <RallyBanner />
      </div>

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
      {isQuestsOpen && <QuestsModal cityId={cityId} onClose={() => setIsQuestsOpen(false)} t={t} />}
      {isAllianceOpen && <AllianceModal onClose={() => setIsAllianceOpen(false)} t={t} />}
      {isRenameOpen && <RenameCityModal cityId={cityId} currentName={cityName} onClose={() => setIsRenameOpen(false)} t={t} />}
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
      {isDailyQuestsOpen && <DailyQuestsPanel onClose={() => setIsDailyQuestsOpen(false)} />}
      {isNewRankingsOpen && <RankingsPanel onClose={() => setIsNewRankingsOpen(false)} />}
      {isWonderOpen && <WonderPanel onClose={() => setIsWonderOpen(false)} />}
      {isAchievementsOpen && <AchievementsPanel onClose={() => setIsAchievementsOpen(false)} />}
      {isActivityFeedOpen && <ActivityFeedPanel onClose={() => setIsActivityFeedOpen(false)} />}
      <BarbarianCampModal />

      {/* Force landscape on mobile */}
      <OrientationLock />
    </div>
  );
}

function QueueRail({ buildQueues, trainingQueues, researchQueues, battles, barbarianAlerts, tradeMoves, cityName, t }: {
  buildQueues: any[];
  trainingQueues: any[];
  researchQueues: any[];
  battles: any[];
  barbarianAlerts: any[];
  tradeMoves: any[];
  cityName: string;
  t: (key: string) => string;
}) {
  const cityId = useGameStore((s) => s.cityId);
  const cancelBuildQueue = useCancelBuildQueue();
  const cancelTrainingQueue = useCancelTrainingQueue();
  const cancelResearchQueue = useCancelResearchQueue();
  const addToast = useToastStore((s) => s.addToast);
  const incomingBattles = battles.filter((battle: any) => battle.defenderCityId === cityId && battle.status === "MARCHING");
  const incomingBarbarianAttacks = barbarianAlerts.filter((alert: any) => !alert.read && new Date(alert.arrivesAt) > new Date());
  const marchBattles = battles.filter((battle: any) => !(battle.defenderCityId === cityId && battle.status === "MARCHING"));
  const hasQueues = buildQueues.length > 0 || trainingQueues.length > 0 || researchQueues.length > 0 || incomingBattles.length > 0 || incomingBarbarianAttacks.length > 0 || marchBattles.length > 0 || tradeMoves.length > 0;

  const showCancelResult = (title: string, data?: any) => {
    const refundText = Object.entries(data?.refund ?? {})
      .filter(([, value]) => typeof value === "number" && value > 0)
      .map(([key, value]) => `${t(`play.resources.${key}`)}: ${formatNumber(value as number)}`)
      .join(" · ");
    addToast({ type: "success", title, message: refundText || t("play.dock.refund50") });
  };

  const marchIcon = (type: string) => {
    const icons: Record<string, string> = { WARRIOR: "⚔️", ARCHER: "🏹", CAVALRY: "🐴", SIEGE: "🔨", SPY: "🕵️" };
    return icons[type] ?? "⚔️";
  };

  return (
    <aside className="queue-rail-sidebar pointer-events-auto absolute right-2 top-[var(--topbar-height)] z-40 flex max-h-[60vh] w-[150px] flex-col overflow-hidden rounded-bl-lg border-l border-b border-amber-200/15 shadow-[0_14px_38px_rgba(0,0,0,0.38)] backdrop-blur-md max-md:hidden">
      <div className="border-b border-amber-200/15 px-2.5 py-1.5">
        <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-200/85">{t("play.queues.title")}</div>
      </div>
      <div className="overflow-y-auto px-2.5 py-2">
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
                startedAt={queue.startedAt}
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
                startedAt={queue.startedAt}
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
          {researchQueues.map((queue) => {
            const iconPath = getTechIconPath(queue.techId);
            const icon = iconPath
              ? <img src={iconPath} alt="" className="h-8 w-8 object-contain" />
              : <span className="text-lg leading-none">{TECH_INFO[queue.techId]?.icon ?? "?"}</span>;
            return (
              <QueueRailItem
                key={queue.id}
                icon={icon}
                title={t(TECH_INFO[queue.techId]?.nameKey ?? queue.techId)}
                subtitle={`${t("play.building.level")} ${queue.targetLevel}`}
                startedAt={queue.startedAt}
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
            );
          })}
        </QueueSection>

        <QueueSection title={t("play.queues.incomingAttacks")} emptyText={t("play.queues.noIncomingAttacks")}>
          {incomingBattles.map((battle: any) => {
            const subLines = [t("play.queues.arrivesToVillage")];
            if (battle.units && Array.isArray(battle.units)) {
              const comp = battle.units.map((u: any) => `${u.count}${marchIcon(u.type)}`).join(" ");
              subLines.push(comp);
            }
            return (
              <QueueRailItem
                key={battle.id}
                icon={<span className="text-lg leading-none">!</span>}
                title={t("play.queues.incomingAttack")}
                subtitle={subLines.join(" · ")}
                completesAt={battle.arrivesAt}
                tone="danger"
              />
            );
          })}
          {incomingBarbarianAttacks.map((alert: any) => (
            <QueueRailItem
              key={alert.id}
              icon={<span className="text-lg leading-none">!</span>}
              title={t("play.notifications.barbarianAttackTitle")}
              subtitle={alert.campName}
              completesAt={alert.arrivesAt}
              tone="danger"
            />
          ))}
        </QueueSection>

        <QueueSection title={t("play.queues.marches")} emptyText={t("play.queues.noMarches")}>
          {marchBattles.map((battle: any) => {
            const isOutgoing = battle.attackerCityId === cityId;
            const isMarching = battle.status === "MARCHING";
            const isReturning = battle.status === "RETURNING";
            const targetLabel = isMarching
              ? (isOutgoing ? t("play.queues.marchingTo") : t("play.queues.enemyMarching"))
              : (isOutgoing ? t("play.queues.returningFrom") : t("play.queues.enemyReturning"));
            const subLines = [targetLabel];
            if (battle.units && Array.isArray(battle.units)) {
              const comp = battle.units.map((u: any) => `${u.count}${marchIcon(u.type)}`).join(" ");
              subLines.push(comp);
            }
            return (
              <QueueRailItem
                key={battle.id}
                icon={<span className="text-lg leading-none">{isOutgoing ? "⚔️" : "🛡️"}</span>}
                title={isMarching ? t("play.battle.marching") : t("play.battle.returningHome")}
                subtitle={subLines.join(" · ")}
                completesAt={isReturning ? battle.returnsAt : battle.arrivesAt}
              />
            );
          })}
        </QueueSection>

        <QueueSection title={t("play.queues.trade")} emptyText={t("play.queues.noTrade")}>
          {tradeMoves.map((move: any) => {
            const isOutgoing = move.from.name === cityName;
            const isMarching = move.status === "MARCHING";
            const timeKey = isMarching ? move.arrivesAt : move.returnsAt;
            const dir = isMarching
              ? (isOutgoing ? "→" : "←")
              : (isOutgoing ? "←" : "→");
            const peer = isOutgoing ? move.to.name : move.from.name;
            return (
              <QueueRailItem
                key={move.id}
                icon={<span className="text-lg leading-none">{dir}</span>}
                title={peer}
                subtitle={isMarching ? t("play.queues.tradeMarching") : t("play.queues.tradeReturning")}
                completesAt={timeKey}
              />
            );
          })}
        </QueueSection>
      </div>
    </aside>
  );
}

function QueueSection({ title, emptyText, children }: { title: string; emptyText: string; children: ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  const isEmpty = Array.isArray(items) ? items.length === 0 : !items;

  return (
    <section className="mb-2 last:mb-0">
      <div className="mb-1 flex items-center justify-between gap-1">
        <h3 className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-100/65">{title}</h3>
      </div>
      <div className="space-y-1">
        {isEmpty ? (
          <div className="rounded-md border border-white/8 bg-black/18 px-2 py-1.5 text-[9px] text-white/35">{emptyText}</div>
        ) : items}
      </div>
    </section>
  );
}

function QueueRailItem({ icon, title, subtitle, startedAt, completesAt, cancelLabel, isCancelling, onCancel, tone = "default" }: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  startedAt?: string;
  completesAt: string;
  cancelLabel?: string;
  isCancelling?: boolean;
  onCancel?: () => void;
  tone?: "default" | "danger";
}) {
  const toneClass = tone === "danger"
    ? "border-rose-300/35 bg-rose-950/35 shadow-[0_0_18px_rgba(244,63,94,0.16)]"
    : "border-white/8 bg-black/24";
  const iconClass = tone === "danger"
    ? "bg-rose-500/18 text-rose-100"
    : "bg-white/6";
  const titleClass = tone === "danger" ? "text-rose-100" : "text-white/78";

  return (
    <div className={`grid min-h-9 grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-1.5 rounded-md border px-1.5 py-1 ${toneClass}`}>
      <div className={`flex h-7 w-7 items-center justify-center overflow-hidden rounded ${iconClass}`}>{icon}</div>
      <div className="min-w-0">
        <div className={`truncate text-[10px] font-semibold ${titleClass}`}>{title}</div>
        <div className="truncate text-[9px] text-white/38">{subtitle}</div>
      </div>
      <div className="flex items-center gap-1 text-[9px] text-amber-100/70">
        <CountdownSmall startedAt={startedAt} completesAt={completesAt} />
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isCancelling}
            className="grid h-4 w-4 place-items-center rounded border border-rose-300/20 bg-rose-950/30 text-[10px] leading-none text-rose-100/80 transition hover:border-rose-200/45 hover:bg-rose-800/40 disabled:opacity-45"
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

function PuebloView({ buildings, selectedBuildingId, onSelectBuilding, cityName, resources, storage, production, onRename, pendingUpgradeBuildingIds, interactionsDisabled, t }: {
  buildings: any[];
  selectedBuildingId: string | null;
  onSelectBuilding: (id: string) => void;
  cityName: string;
  resources: any;
  storage: any;
  production: { goldPerHour: number; woodPerHour: number; stonePerHour: number; foodPerHour: number };
  onRename: () => void;
  pendingUpgradeBuildingIds: string[];
  interactionsDisabled: boolean;
  t: (key: string) => string;
}) {
  const { data: layout } = useVillageLayout();
  const placedBuildings = useMemo(() => resolveVillageRenderableBuildings(buildings).map((building) => ({
    ...building,
    displayName: t(BUILDING_NAMES[building.type as BuildingType] ?? building.type),
  })), [buildings, t]);
  const activeLayout: VillageLayoutData = normalizeVillageLayout(layout);

  if (placedBuildings.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-etheria-bg">
        <div className="text-center">
          <h2 className="text-xl font-display font-bold text-etheria-gold">Cargando aldea...</h2>
          <p className="mt-2 text-sm text-etheria-text-muted">Preparando edificios</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden">
      <VillageHTMLCanvas
        layout={activeLayout}
        buildings={placedBuildings}
        selectedBuildingId={selectedBuildingId}
        onSelectBuilding={onSelectBuilding}
        queues={pendingUpgradeBuildingIds.map(id => ({ buildingId: id }))}
        interactionsDisabled={interactionsDisabled}
      />
    </div>
  );
}

function MapaView({ cityName, resources, storage, production, allianceData, movements, worldMap, seasonData, onRename, onEnterVillage, t }: {
  cityName: string;
  resources: any;
  storage: any;
  production: { goldPerHour: number; woodPerHour: number; stonePerHour: number; foodPerHour: number };
  allianceData: any;
  movements: any[];
  worldMap: any;
  seasonData: any;
  onRename: () => void;
  onEnterVillage: () => void;
  t: (key: string) => string;
}) {
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [radialPosition, setRadialPosition] = useState({ x: 0, y: 0 });
  const [isEntering, setIsEntering] = useState(false);
  const [attackTarget, setAttackTarget] = useState<{ id: string; name: string } | null>(null);

  const myCityId = useGameStore((s) => s.cityId);
  const units = useGameStore((s) => s.units);
  const attackCity = useAttackCity();
  const setSelectedCamp = useGameStore((s) => s.setSelectedCamp);
  const setShowCampModal = useGameStore((s) => s.setShowCampModal);
  const addToast = useToastStore((s) => s.addToast);
  const scoutTarget = useScoutTarget();
  const markMapOpened = useMarkMapOpened();
  const cities = worldMap?.cities ?? [];
  const barbarianCamps = worldMap?.barbarianCamps ?? [];
  const selectedCity = cities.find((city: any) => city.id === selectedCityId) ?? null;
  const isOwnCity = selectedCityId != null && selectedCityId === myCityId;

  const enterVillage = () => {
    setIsEntering(true);
    window.setTimeout(() => {
      onEnterVillage();
      setIsEntering(false);
      setSelectedCityId(null);
    }, 520);
  };

  useEffect(() => {
    if (myCityId) markMapOpened.mutate(myCityId);
  }, [myCityId]);

  return (
    <div className="relative h-full overflow-hidden">
      {isEntering && <div className="etheria-map-enter-zoom pointer-events-none absolute inset-0 z-50" />}
      <div className="absolute inset-0">
        <WorldMapHTMLCanvas
          cities={cities.map((city: any) => ({
            ...city,
            relation: getMapRelation(city, allianceData),
          }))}
          mapConfig={worldMap?.map ?? null}
          myCityId={myCityId}
          barbarianCamps={barbarianCamps}
          movements={movements.map((m: any) => ({
            ...m,
            relation: m.from.name === cityName || m.to.name === cityName
              ? "own"
              : getMapRelation({ allianceId: m.allianceId }, allianceData),
          }))}
          seasonState={seasonData?.season ?? null}
          onSelectCityId={(cityId, position) => {
            setSelectedCityId(cityId);
            setRadialPosition(position);
          }}
          onSelectCamp={(camp) => {
            setSelectedCamp(camp as any);
            setShowCampModal(true);
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
          onAttack={() => { if (selectedCityId && selectedCity) setAttackTarget({ id: selectedCityId, name: selectedCity.name }); }}
          onSpy={() => {
            if (!myCityId || !selectedCityId) return;
            scoutTarget.mutate(
              { cityId: myCityId, targetType: "CITY", targetId: selectedCityId },
              {
                onSuccess: () => addToast({ type: "success", title: t("play.espionage.title"), message: t("play.espionage.reportCreated") }),
                onError: (error) => addToast({ type: "error", title: t("play.espionage.title"), message: error.message }),
              }
            );
          }}
        />
      )}
      {attackTarget && (
        <AttackCityModal
          targetCityId={attackTarget.id}
          targetCityName={attackTarget.name}
          units={units}
          cityId={myCityId}
          attackCity={attackCity}
          t={t}
          addToast={addToast}
          onClose={() => setAttackTarget(null)}
        />
      )}
    </div>
  );
}

function AttackCityModal({ targetCityId, targetCityName, units, cityId, attackCity, t, addToast, onClose }: {
  targetCityId: string;
  targetCityName: string;
  units: { type: UnitType; count: number }[];
  cityId: string | null;
  attackCity: ReturnType<typeof useAttackCity>;
  t: (key: string) => string;
  addToast: (toast: { type: ToastType; title: string; message: string }) => void;
  onClose: () => void;
}) {
  const [counts, setCounts] = useState<Record<UnitType, number>>({
    WARRIOR: 0, ARCHER: 0, CAVALRY: 0, SIEGE: 0, SPY: 0, PIKEMAN: 0, CROSSBOWMAN: 0, CATAPULT: 0,
  });

  const totalSelected = Object.values(counts).reduce((s, v) => s + v, 0);

  function owned(type: UnitType): number {
    return units.find((u) => u.type === type)?.count ?? 0;
  }

  function adjust(type: UnitType, delta: number) {
    setCounts((prev) => {
      const next = Math.max(0, Math.min(owned(type), prev[type] + delta));
      return { ...prev, [type]: next };
    });
  }

  function handleSend() {
    if (!cityId || totalSelected === 0) return;
    const selected = Object.entries(counts)
      .filter(([, c]) => c > 0)
      .map(([type, c]) => ({ type, count: c }));
    attackCity.mutate(
      { cityId, targetCityId, units: selected },
      {
        onSuccess: () => {
          addToast({ type: "success", title: t("play.battle.attackSent"), message: t("play.battle.attackSentMsg") });
          onClose();
        },
        onError: (err) => addToast({ type: "error", title: t("play.battle.attackFailed"), message: err.message }),
      }
    );
  }

  const types: UnitType[] = ["WARRIOR", "ARCHER", "PIKEMAN", "CAVALRY", "SIEGE", "CROSSBOWMAN", "CATAPULT", "SPY"];

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/75 backdrop-blur-md p-4" onClick={onClose}>
      <div className="w-[min(420px,calc(100vw-32px))] rounded-2xl border border-etheria-border bg-[#0b1111] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-etheria-border px-5 py-4">
          <h2 className="font-serif text-lg text-etheria-gold-soft">{t("play.battle.attack")}</h2>
          <button onClick={onClose} className="rounded-lg border border-etheria-border-dim px-3 py-1 text-xs text-etheria-text-muted hover:text-etheria-gold-soft">{t("play.settings.close")}</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="text-sm text-etheria-text-muted">
            {t("play.battle.targetCity")}: <span className="text-etheria-gold-soft font-serif">{targetCityName}</span>
          </div>

          <div className="space-y-2">
            {types.map((type) => (
              <div key={type} className="flex items-center gap-3 bg-black/30 border border-etheria-border-dim rounded-xl px-4 py-2.5">
                <span className="text-lg w-8 text-center">{UNIT_INFO[type].icon}</span>
                <div className="flex-1">
                  <div className="text-sm text-white font-serif">{t(UNIT_INFO[type].nameKey)}</div>
                  <div className="text-[10px] text-etheria-text-dim">{t("play.battle.available")}: {owned(type)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => adjust(type, -10)} disabled={counts[type] === 0} className="w-7 h-7 rounded-lg border border-etheria-border-dim text-white/60 text-sm hover:bg-white/5 disabled:opacity-20">-10</button>
                  <button onClick={() => adjust(type, -1)} disabled={counts[type] === 0} className="w-7 h-7 rounded-lg border border-etheria-border-dim text-white/60 text-sm hover:bg-white/5 disabled:opacity-20">-1</button>
                  <span className="w-10 text-center text-white font-bold text-sm">{counts[type]}</span>
                  <button onClick={() => adjust(type, 1)} disabled={counts[type] >= owned(type)} className="w-7 h-7 rounded-lg border border-etheria-border-dim text-white/60 text-sm hover:bg-white/5 disabled:opacity-20">+1</button>
                  <button onClick={() => adjust(type, 10)} disabled={counts[type] >= owned(type)} className="w-7 h-7 rounded-lg border border-etheria-border-dim text-white/60 text-sm hover:bg-white/5 disabled:opacity-20">+10</button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSend}
            disabled={totalSelected === 0 || attackCity.isPending}
            className="w-full rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-serif py-3 text-sm tracking-wider disabled:opacity-30 transition-colors"
          >
            {attackCity.isPending ? t("play.battle.sending") : `⚔️ ${t("play.battle.sendAttack")} (${totalSelected})`}
          </button>
        </div>
      </div>
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
  const cityId = useGameStore((s) => s.cityId);
  const { data: mailData, isLoading } = useMailMessages();
  const { data: reportsData, isLoading: reportsLoading } = useGameReports();
  const { data: battleReportsData } = useBattleReports(cityId);
  const markRead = useMarkReadMail();
  const markReportRead = useMarkGameReportRead();
  const markBattleReportRead = useMarkReportRead();
  const sendMail = useSendMailMessage();
  const addToast = useToastStore((s) => s.addToast);
  const [tab, setTab] = useState<"inbox" | "sent" | "reports" | "compose">("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recipientCityId, setRecipientCityId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const { data: allCities } = useAllCities(tab === "compose");

  const battleReports = battleReportsData ?? [];

  const messages = tab === "inbox" ? mailData?.inbox ?? [] : tab === "sent" ? mailData?.sent ?? [] : [];
  const selected = messages.find((m: any) => m.id === selectedId);
  const recipients = (allCities ?? []).filter((c: any) => c.id !== useGameStore.getState().cityId);

  const markBattleReport = (reportId: string) => {
    if (!cityId) return;
    markBattleReportRead.mutate({ cityId, reportId });
  };

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/62 px-4 backdrop-blur-[4px]" onClick={onClose} onPointerDown={(e) => e.stopPropagation()}>
      <div className="relative grid h-[min(640px,calc(100vh-36px))] w-full max-w-[920px] max-sm:max-w-[calc(100vw-24px)] overflow-hidden rounded-[30px] border border-etheria-border bg-[#0b1111] shadow-[0_28px_90px_rgba(0,0,0,.58)] lg:grid-cols-[310px_1fr]" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 z-10 min-h-[44px] min-w-[44px] flex items-center justify-center text-etheria-gold-soft rounded-full hover:bg-white/10">✕</button>
        <aside className="border-r border-white/5 p-4 overflow-y-auto">
          <div className="font-serif text-lg text-etheria-gold-soft mb-4 uppercase tracking-widest">{t("play.mail.title")}</div>
          <div className="flex gap-1 mb-4">
            {["inbox", "sent", "reports", "compose"].map((tId) => (
              <button key={tId} onClick={() => setTab(tId as any)} className={`flex-1 text-[10px] py-1.5 rounded-full border transition-colors ${tab === tId ? "border-etheria-gold bg-etheria-gold/10 text-etheria-gold" : "border-white/10 text-white/40 hover:text-white"}`}>
                {t(`play.mail.${tId}`)}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            {tab === "reports" && <>
              {(reportsData?.reports ?? []).map((report: any) => (
                <button key={`gr-${report.id}`} onClick={() => !report.readAt && markReportRead.mutate(report.id)} className="w-full rounded-xl border border-transparent p-3 text-left transition-all hover:bg-white/5">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate font-serif text-xs text-white">{report.title}</span>
                    {!report.readAt && <span className="h-2 w-2 rounded-full bg-etheria-gold" />}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-etheria-gold-soft/50">{report.type}</div>
                </button>
              ))}
              {battleReports.map((report: any) => (
                <button key={`br-${report.id}`} onClick={() => !report.read && markBattleReport(report.id)} className={`w-full rounded-xl border p-3 text-left transition-all ${report.read ? "border-transparent hover:bg-white/5" : "border-etheria-gold/20 bg-etheria-gold/5 hover:bg-etheria-gold/10"}`}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate font-serif text-xs text-white">
                      {report.status === "VICTORY" ? t("play.battle.victory") : t("play.battle.defeat")} vs {report.defenderName ?? report.attackerName}
                    </span>
                    {!report.read && <span className="h-2 w-2 rounded-full bg-etheria-gold" />}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-etheria-gold-soft/50">{t("play.battle.title")}</div>
                </button>
              ))}
            </>}
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
          {tab === "reports" ? (
            <div>
              <div className="mb-4 font-serif text-2xl text-etheria-gold-soft">{t("play.reports.title")}</div>
              <div className="space-y-3">
                {reportsLoading && <div className="text-sm text-white/40">{t("play.reports.loading")}</div>}
                {(reportsData?.reports ?? []).length === 0 && !reportsLoading && <div className="text-sm text-white/40">{t("play.reports.empty")}</div>}
                {(reportsData?.reports ?? []).map((report: any) => (
                  <article key={report.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-etheria-gold-soft/60">{report.type}</div>
                        <h3 className="mt-1 font-serif text-lg text-white">{report.title}</h3>
                        <p className="mt-1 text-sm text-white/60">{report.summary}</p>
                        <div className="mt-2 text-[11px] text-white/35">{new Date(report.createdAt).toLocaleString()}</div>
                        {report.payload && Object.keys(report.payload).length > 0 && (
                          <pre className="mt-3 max-h-36 overflow-auto rounded-lg bg-black/35 p-3 text-[11px] text-white/55">{JSON.stringify(report.payload, null, 2)}</pre>
                        )}
                      </div>
                      {!report.readAt && <button onClick={() => markReportRead.mutate(report.id)} className="rounded-lg border border-etheria-gold/40 px-3 py-2 text-xs text-etheria-gold-soft">{t("play.reports.markRead")}</button>}
                    </div>
                  </article>
                ))}
                {battleReports.map((report: any) => (
                  <article key={`brd-${report.id}`} onClick={() => !report.read && markBattleReport(report.id)} className="rounded-xl border border-etheria-gold/15 bg-etheria-gold/[0.02] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-etheria-gold-soft/60">{t("play.battle.title")}</div>
                        <h3 className={`mt-1 font-serif text-lg ${report.status === "VICTORY" ? "text-etheria-success" : "text-red-400"}`}>
                          {report.status === "VICTORY" ? t("play.battle.victory") : t("play.battle.defeat")}
                        </h3>
                        <p className="mt-1 text-sm text-white/60">
                          vs {report.defenderName ?? report.attackerName}
                        </p>
                        {report.attackerLosses && Object.keys(report.attackerLosses).length > 0 && (
                          <p className="mt-1 text-[11px] text-white/40">
                            {t("play.battle.attackerLosses")}: {Object.entries(report.attackerLosses).filter(([, c]: any) => Number(c) > 0).map(([t, c]) => `${c} ${t}`).join(", ")}
                          </p>
                        )}
                        {report.defenderLosses && Object.keys(report.defenderLosses).length > 0 && (
                          <p className="mt-1 text-[11px] text-white/40">
                            {t("play.battle.defenderLosses")}: {Object.entries(report.defenderLosses).filter(([, c]: any) => Number(c) > 0).map(([t, c]) => `${c} ${t}`).join(", ")}
                          </p>
                        )}
                        {report.loot && Object.values(report.loot).some((v: any) => Number(v) > 0) && (
                          <p className="mt-1 text-[11px] text-etheria-gold-soft/70">
                            {t("play.battle.loot")} 🪙{report.loot.gold} 🪵{report.loot.wood} 🪨{report.loot.stone} 🍖{report.loot.food}
                          </p>
                        )}
                        <div className="mt-2 text-[11px] text-white/35">{new Date(report.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : tab === "compose" ? (
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
          <button onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/40 hover:text-white rounded-full hover:bg-white/10">✕</button>
        </div>
        <div className="max-h-[calc(84vh-74px)] space-y-3 overflow-y-auto p-5">
          {isLoading && <div className="text-sm text-white/45">{t("play.ranking.loading")}</div>}
        </div>
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-left">
            <thead className="bg-black/40 text-[10px] uppercase tracking-widest text-white/40">
              <tr>
                <th className="p-4">Rank</th>
                <th className="p-4">{t("play.ranking.village")}</th>
                <th className="p-4">{t("play.ranking.alliance")}</th>
                <th className="p-4 text-right" title={`${t("play.ranking.buildings")} / ${t("play.ranking.army")} / ${t("play.ranking.research")}`}>
                  {t("play.ranking.power")} ⓘ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ranking?.map((entry: any) => (
                <tr key={entry.cityId} className={entry.cityId === myCityId ? "bg-etheria-gold/10" : ""}>
                  <td className="p-4 font-mono text-white/40">#{entry.rank}</td>
                  <td className="p-4 font-serif text-white">{entry.cityName}</td>
                  <td className="p-4 text-xs text-white/40">{entry.allianceName ?? "—"}</td>
                  <td className="p-4 text-right font-mono text-etheria-gold" title={`${t("play.ranking.buildings")}: ${formatNumber(entry.powerBreakdown?.buildings ?? 0)} · ${t("play.ranking.army")}: ${formatNumber(entry.powerBreakdown?.army ?? 0)} · ${t("play.ranking.research")}: ${formatNumber(entry.powerBreakdown?.research ?? 0)}`}>
                    {formatNumber(entry.power)}
                  </td>
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
  const showResearch = building.type === "LIBRARY";
  const showMarket = building.type === "MARKET";
  const cityId = useGameStore((s) => s.cityId);

  if (showTraining) {
    return <BarracksModal building={building} resources={resources} onUpgrade={onUpgrade} onTrain={onTrain} isUpgrading={isUpgrading} pendingUpgradeBuildingIds={pendingUpgradeBuildingIds} units={units} onClose={onClose} t={t} />;
  }
  if (showResearch) {
    return <LibraryModal building={building} resources={resources} onUpgrade={onUpgrade} onResearch={onResearch} isUpgrading={isUpgrading} pendingUpgradeBuildingIds={pendingUpgradeBuildingIds} cityTechs={cityTechs} activeResearch={activeResearch} techOptions={techOptions} techBonuses={techBonuses} onClose={onClose} t={t} />;
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 backdrop-blur-md p-4" onClick={onClose} onPointerDownCapture={(e) => e.stopPropagation()}>
      <div className="relative w-full max-w-4xl max-sm:max-w-[calc(100vw-16px)] max-h-[90vh] overflow-hidden rounded-[40px] max-sm:rounded-2xl border border-etheria-border bg-[#0b1111] shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col md:flex-row" onClick={(e) => e.stopPropagation()} onPointerDownCapture={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 z-10 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/40 hover:text-white rounded-full hover:bg-white/10">✕</button>
        
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

            {showMarket && (
              <section className="rounded-3xl border border-white/5 bg-white/5">
                <MarketPanel cityId={cityId} t={t} />
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BarracksModal({ building, resources, onUpgrade, onTrain, isUpgrading, pendingUpgradeBuildingIds, units, onClose, t }: any) {
  const info = BUILDING_INFO[building.type as BuildingType];
  const name = info ? t(info.nameKey) : building.type;
  const cost = getUpgradeCost(building.type, building.level);
  const timeSeconds = getUpgradeTimeSeconds(building.type, building.level);
  const isMaxLevel = building.level >= MAX_BUILDING_LEVEL;

  const unitTypes: UnitType[] = building.type === "STABLE" ? ["CAVALRY"] : ["WARRIOR", "PIKEMAN", "ARCHER", "CROSSBOWMAN", "SIEGE", "CATAPULT", "SPY"];
  const [activeUnit, setActiveUnit] = useState<UnitType>(unitTypes[0]);
  const [count, setCount] = useState(1);

  function ownedCount(type: UnitType): number {
    if (!units || !Array.isArray(units)) return 0;
    return units.filter((u: any) => u.type === type).reduce((s: number, u: any) => s + u.count, 0);
  }

  const unitCost = getTrainingCost(activeUnit, count);
  const unitTime = getTrainingTimeSeconds(activeUnit, count);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 backdrop-blur-md p-4" onClick={onClose}>
      <div className="relative w-full max-w-[640px] max-sm:max-w-[calc(100vw-16px)] overflow-hidden rounded-[40px] max-sm:rounded-2xl border border-etheria-border bg-[#0b1111] shadow-[0_0_100px_rgba(0,0,0,0.5)]" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 z-10 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/40 hover:text-white rounded-full hover:bg-white/10">✕</button>

        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
              <BuildingSprite type={building.type as BuildingType} level={building.level} size={60} />
            </div>
            <div>
              <div className="font-serif text-2xl text-etheria-gold-soft">{name}</div>
              <div className="text-xs text-white/40">{t("play.building.level")} {building.level}</div>
            </div>
          </div>
          <p className="text-sm text-white/50 mt-2">{t(getBuildingDescriptionKey(building.type))}</p>
        </div>

        {/* Unit Tabs */}
        <div className="px-8">
          <div className="flex gap-2">
            {unitTypes.map((type) => (
              <button
                key={type}
                onClick={() => { setActiveUnit(type); setCount(1); }}
                className={`flex-1 py-3 rounded-xl font-serif text-sm transition-all ${
                  activeUnit === type
                    ? "bg-etheria-gold/15 border border-etheria-gold/40 text-etheria-gold-soft"
                    : "bg-white/5 border border-white/5 text-white/40 hover:text-white/70"
                }`}
              >
                {UNIT_INFO[type].icon} {t(UNIT_INFO[type].nameKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Unit Stats + Training */}
        <div className="px-8 py-5">
          <div className="flex gap-5">
            {/* Unit Visual */}
            <div className="shrink-0 w-28 h-28 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center">
              {UNIT_IMAGE_PATHS[activeUnit] ? (
                <img src={UNIT_IMAGE_PATHS[activeUnit]} alt="" className="h-20 w-20 object-contain" />
              ) : (
                <span className="text-4xl">{UNIT_INFO[activeUnit].icon}</span>
              )}
            </div>

            {/* Stats */}
            <div className="flex-1 space-y-2.5">
              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-black/40 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-red-400">{UNIT_STATS[activeUnit].attack}</div>
                  <div className="text-[9px] uppercase tracking-wider text-white/30">{t("play.army.atk")}</div>
                </div>
                <div className="bg-black/40 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-blue-400">{UNIT_STATS[activeUnit].defense}</div>
                  <div className="text-[9px] uppercase tracking-wider text-white/30">{t("play.army.def")}</div>
                </div>
                <div className="bg-black/40 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-green-400">{UNIT_STATS[activeUnit].hp}</div>
                  <div className="text-[9px] uppercase tracking-wider text-white/30">{t("play.army.hp")}</div>
                </div>
                <div className="bg-black/40 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-amber-400">{UNIT_STATS[activeUnit].speed}</div>
                  <div className="text-[9px] uppercase tracking-wider text-white/30">{t("play.army.speed")}</div>
                </div>
                <div className="bg-black/40 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-purple-400">{UNIT_STATS[activeUnit].carry}</div>
                  <div className="text-[9px] uppercase tracking-wider text-white/30">{t("play.army.carry")}</div>
                </div>
                <div className="bg-black/40 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-orange-400">{UNIT_STATS[activeUnit].armorPenetration}</div>
                  <div className="text-[9px] uppercase tracking-wider text-white/30">{t("play.army.ap")}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-black/40 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-etheria-gold-soft">{ownedCount(activeUnit)}</div>
                  <div className="text-[9px] uppercase tracking-wider text-white/30">{t("play.training.owned")}</div>
                </div>
                <div className="bg-black/40 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-white/50">{getTrainingTimeSeconds(activeUnit, 1)}s</div>
                  <div className="text-[9px] uppercase tracking-wider text-white/30">{t("play.training.timePerUnit")}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {Object.entries(UNIT_TRAINING_COST[activeUnit]).filter(([, v]) => Number(v) > 0).map(([res, val]) => (
                  <span key={res} className="bg-black/40 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                    <ResourceIconSVG type={res as any} size={12} />
                    <span className="text-white/70">{formatNumber(val)}</span>
                  </span>
                ))}
                <span className="text-white/30 self-center text-[10px]">each</span>
              </div>
            </div>
          </div>
        </div>

        {/* Training Controls */}
        <div className="px-8 pb-2">
          <div className="flex items-center gap-2 mb-2">
            {[1, 5, 10].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  count === n ? "bg-etheria-gold/20 border border-etheria-gold/40 text-etheria-gold-soft" : "bg-white/5 border border-white/5 text-white/40 hover:text-white"
                }`}
              >
                x{n}
              </button>
            ))}
            <input
              type="number"
              min="1"
              max="100"
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
              className="w-16 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white text-center"
            />
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/50 mb-4">
            <span className="text-white/30">{t("play.training.total")}:</span>
            {Object.entries(unitCost).filter(([, v]) => Number(v) > 0).map(([res, val]) => (
              <span key={res} className="flex items-center gap-1">
                <ResourceIconSVG type={res as any} size={11} />
                <span className={Number(resources[res] ?? 0) >= Number(val) ? "" : "text-red-400"}>{formatNumber(val)}</span>
              </span>
            ))}
            <span>· {formatTime(unitTime)}</span>
          </div>

          <button
            onClick={() => onTrain(activeUnit, count)}
            className="w-full bg-etheria-gold text-black font-bold py-3.5 rounded-2xl hover:bg-white transition-all text-sm tracking-wider"
          >
            {t("play.training.train")} {count} {t(UNIT_INFO[activeUnit].nameKey)}
          </button>
        </div>

        {/* Upgrade Section */}
        <div className="px-8 py-5 mt-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">{t("play.building.upgrade")} → {t("play.building.level")} {building.level + 1}</div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-white/50">
                {Object.entries(cost).map(([res, val]) => (
                  <span key={res} className="flex items-center gap-1">
                    <ResourceIconSVG type={res as any} size={11} />
                    {formatNumber(val)}
                  </span>
                ))}
                <span>· {formatTime(timeSeconds)}</span>
              </div>
            </div>
            <button
              onClick={() => onUpgrade(building.id, building.type, building.level)}
              disabled={isMaxLevel || isUpgrading || pendingUpgradeBuildingIds.includes(building.id)}
              className="shrink-0 bg-etheria-gold/20 border border-etheria-gold/40 text-etheria-gold-soft font-bold px-5 py-2.5 rounded-xl text-xs hover:bg-etheria-gold/30 transition-all disabled:opacity-25 disabled:cursor-not-allowed"
            >
              {isMaxLevel ? t("play.building.maxLevel") : pendingUpgradeBuildingIds.includes(building.id) ? t("play.building.inQueue") : t("play.building.upgrade")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LibraryModal({ building, resources, onUpgrade, onResearch, isUpgrading, pendingUpgradeBuildingIds, cityTechs, activeResearch, techOptions, techBonuses, onClose, t }: any) {
  const info = BUILDING_INFO[building.type as BuildingType];
  const name = info ? t(info.nameKey) : building.type;
  const cost = getUpgradeCost(building.type, building.level);
  const timeSeconds = getUpgradeTimeSeconds(building.type, building.level);
  const isMaxLevel = building.level >= MAX_BUILDING_LEVEL;
  const [tab, setTab] = useState<"ECONOMY" | "MILITARY" | "DEFENSE">("ECONOMY");
  const [filterResearched, setFilterResearched] = useState(false);

  const researchedIds = new Set((cityTechs ?? []).map((t: any) => t.techId));
  const allTechs = (techOptions ?? []).filter((t: any) => {
    const cat = TECH_INFO[t.techId]?.category;
    if (cat !== tab) return false;
    if (filterResearched && !researchedIds.has(t.techId)) return false;
    return true;
  });

  const bonusSummary = techBonuses ?? {};

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 backdrop-blur-md p-4" onClick={onClose}>
      <div className="relative w-full max-w-[720px] max-sm:max-w-[calc(100vw-16px)] overflow-hidden rounded-[40px] max-sm:rounded-2xl border border-etheria-border bg-[#0b1111] shadow-[0_0_100px_rgba(0,0,0,0.5)]" style={{ maxHeight: "calc(100vh - 40px)" }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 z-10 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/40 hover:text-white rounded-full hover:bg-white/10">✕</button>

        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
              <BuildingSprite type={building.type as BuildingType} level={building.level} size={60} />
            </div>
            <div>
              <div className="font-serif text-2xl text-etheria-gold-soft">{name}</div>
              <div className="text-xs text-white/40">{t("play.building.level")} {building.level}</div>
            </div>
          </div>
        </div>

        <div className="flex" style={{ minHeight: 0 }}>
          {/* Right side - Tech list */}
          <div className="flex-1 px-8 pb-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 340px)" }}>
            {/* Category tabs */}
            <div className="flex items-center gap-2 mb-3">
              {(["ECONOMY", "MILITARY", "DEFENSE"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setTab(cat)}
                  className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
                    tab === cat ? "border-etheria-gold bg-etheria-gold/10 text-etheria-gold" : "border-white/10 text-white/40 hover:text-white"
                  }`}
                >
                  {t(`play.research.categories.${cat.toLowerCase()}`)}
                </button>
              ))}
              <button
                onClick={() => setFilterResearched(!filterResearched)}
                className={`ml-auto text-[10px] px-3 py-1.5 rounded-full border transition-colors ${
                  filterResearched ? "border-etheria-teal/40 bg-etheria-teal/10 text-etheria-teal" : "border-white/10 text-white/30 hover:text-white"
                }`}
              >
                {t("play.research.researchedOnly")}
              </button>
            </div>

            {/* Tech cards */}
            <div className="space-y-2">
              {allTechs.map((tech: any) => {
                const tinfo = TECH_INFO[tech.techId];
                const iconPath = getTechIconPath(tech.techId);
                const researched = researchedIds.has(tech.techId);
                const active = activeResearch?.techId === tech.techId || activeResearch?.id === tech.techId;
                const isMax = (tech.currentLevel ?? 0) >= (tech.maxLevel ?? 1);
                const ncost = tech.nextLevelCost ?? {};
                const ntime = tech.nextLevelTime ?? 0;
                const hasCost = Object.values(ncost).some((v: any) => Number(v) > 0);

                return (
                  <div key={tech.techId} className={`rounded-2xl border p-4 transition-colors ${
                    active ? "border-etheria-gold/50 bg-etheria-gold/5" :
                    researched ? "border-etheria-teal/20 bg-etheria-teal/[0.03]" :
                    "border-white/5 bg-black/30"
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
                        {iconPath ? (
                          <img src={iconPath} alt="" className="h-8 w-8 object-contain" />
                        ) : (
                          <span className="text-xs text-white/50">{tinfo?.icon ?? "?"}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-serif text-white text-sm">{t(tinfo?.nameKey ?? tech.techId)}</span>
                          <span className="text-[10px] text-white/30">Lv {tech.currentLevel}/{tech.maxLevel}</span>
                          {active && <span className="text-[9px] text-etheria-success bg-etheria-success/10 px-1.5 py-0.5 rounded-full">{t("play.research.researching")}</span>}
                          {isMax && <span className="text-[9px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full">{t("play.research.max")}</span>}
                          {researched && !isMax && !active && <span className="text-[9px] text-etheria-teal/70 bg-etheria-teal/10 px-1.5 py-0.5 rounded-full">Lv {tech.currentLevel}</span>}
                        </div>
                        <p className="text-[11px] text-white/50 leading-relaxed">{t(tinfo?.descriptionKey ?? "")}</p>

                        {hasCost && !isMax && !active && (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                            <span className="text-[10px] text-white/30">{t("play.research.cost")}:</span>
                            {Object.entries(ncost).filter(([, v]) => Number(v) > 0).map(([res, val]) => (
                              <span key={res} className={`text-[10px] flex items-center gap-1 ${Number(resources[res] ?? 0) >= Number(val) ? "text-white/60" : "text-red-400"}`}>
                                <ResourceIconSVG type={res as any} size={10} />
                                {formatNumber(Number(val))}
                              </span>
                            ))}
                            <span className="text-[10px] text-white/30">· {formatTime(ntime)}</span>
                          </div>
                        )}
                      </div>
                      {!isMax && !active && (
                        <button
                          onClick={() => onResearch(tech.techId)}
                          disabled={!tech.canResearch}
                          className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-bold tracking-wider transition-colors ${
                            tech.canResearch
                              ? "bg-etheria-teal/70 hover:bg-etheria-teal text-white"
                              : "bg-white/5 text-white/20 cursor-not-allowed"
                          }`}
                        >
                          {tech.canResearch ? t("play.research.researchBtn") : t("play.research.locked")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tech Bonuses Summary */}
        <div className="px-8 py-4 border-t border-white/5 bg-white/[0.02]">
          <h3 className="text-[10px] uppercase tracking-widest text-white/30 mb-3">{t("play.research.activeBonuses")}</h3>
          <div className="flex flex-wrap gap-3 text-[10px]">
            {Object.entries(bonusSummary.resourceProdBonus ?? {}).map(([res, val]: any) => (
              <span key={`res-${res}`} className="flex items-center gap-1 bg-white/5 rounded-lg px-2.5 py-1.5">
                <ResourceIconSVG type={res as any} size={11} />
                <span className="text-etheria-success font-bold">+{Math.round(Number(val) * 100 - 100)}%</span>
              </span>
            ))}
            {Number(bonusSummary.trainingCostReduction) > 0 && (
              <span className="bg-white/5 rounded-lg px-2.5 py-1.5 text-etheria-success">🎯 -{Math.round(Number(bonusSummary.trainingCostReduction) * 100)}% train cost</span>
            )}
            {Number(bonusSummary.wallBonusMultiplier) > 1 && (
              <span className="bg-white/5 rounded-lg px-2.5 py-1.5 text-etheria-success">🛡️ Wall x{Number(bonusSummary.wallBonusMultiplier).toFixed(2)}</span>
            )}
            {Number(bonusSummary.towerDamageBonus) > 0 && (
              <span className="bg-white/5 rounded-lg px-2.5 py-1.5 text-etheria-success">🗼 Tower +{bonusSummary.towerDamageBonus}</span>
            )}
            {Object.entries(bonusSummary.unitAttackBonus ?? {}).filter(([, v]: any) => Number(v) > 1).map(([unit, val]: any) => (
              <span key={`atk-${unit}`} className="bg-white/5 rounded-lg px-2.5 py-1.5 text-amber-400">{UNIT_INFO[unit as UnitType]?.icon ?? unit} Atk x{Number(val).toFixed(1)}</span>
            ))}
            {Object.entries(bonusSummary.unitDefenseBonus ?? {}).filter(([, v]: any) => Number(v) > 1).map(([unit, val]: any) => (
              <span key={`def-${unit}`} className="bg-white/5 rounded-lg px-2.5 py-1.5 text-blue-400">{UNIT_INFO[unit as UnitType]?.icon ?? unit} Def x{Number(val).toFixed(1)}</span>
            ))}
            {Object.entries(bonusSummary.unitHpBonus ?? {}).filter(([, v]: any) => Number(v) > 1).map(([unit, val]: any) => (
              <span key={`hp-${unit}`} className="bg-white/5 rounded-lg px-2.5 py-1.5 text-green-400">{UNIT_INFO[unit as UnitType]?.icon ?? unit} HP x{Number(val).toFixed(1)}</span>
            ))}
            {Object.entries(bonusSummary.unitSpeedBonus ?? {}).filter(([, v]: any) => Number(v) > 1).map(([unit, val]: any) => (
              <span key={`spd-${unit}`} className="bg-white/5 rounded-lg px-2.5 py-1.5 text-amber-300">{UNIT_INFO[unit as UnitType]?.icon ?? unit} Spd x{Number(val).toFixed(1)}</span>
            ))}
          </div>
        </div>

        {/* Upgrade */}
        <div className="px-8 py-4 border-t border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">{t("play.building.upgrade")} → {t("play.building.level")} {isMaxLevel ? "MAX" : building.level + 1}</div>
              {!isMaxLevel && (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-white/50">
                  {Object.entries(cost).map(([res, val]) => (
                    <span key={res} className="flex items-center gap-1">
                      <ResourceIconSVG type={res as any} size={11} />
                      {formatNumber(Number(val))}
                    </span>
                  ))}
                  <span>· {formatTime(timeSeconds)}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => onUpgrade(building.id, building.type, building.level)}
              disabled={isMaxLevel || isUpgrading || pendingUpgradeBuildingIds.includes(building.id)}
              className="shrink-0 bg-etheria-gold/20 border border-etheria-gold/40 text-etheria-gold-soft font-bold px-5 py-2.5 rounded-xl text-xs hover:bg-etheria-gold/30 transition-all disabled:opacity-25 disabled:cursor-not-allowed"
            >
              {isMaxLevel ? t("play.building.maxLevel") : pendingUpgradeBuildingIds.includes(building.id) ? t("play.building.inQueue") : t("play.building.upgrade")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrainingSection({ buildingType, units, techBonuses, resources, onTrain, t }: any) {
  const [count, setCount] = useState(1);
  const unitTypes: UnitType[] = buildingType === "STABLE" ? ["CAVALRY"] : ["WARRIOR", "ARCHER"];

  function ownedCount(type: UnitType): number {
    if (!units || !Array.isArray(units)) return 0;
    return units.filter((u: any) => u.type === type).reduce((sum: number, u: any) => sum + u.count, 0);
  }

  return (
    <section className="bg-white/5 rounded-3xl p-6 border border-white/5">
      <h3 className="font-serif text-lg text-white uppercase tracking-widest mb-4">{t("play.training.title")}</h3>

      <div className="space-y-4">
        {unitTypes.map((type) => {
          const owned = ownedCount(type);
          const cost = getTrainingCost(type, count);
          const time = getTrainingTimeSeconds(type, count);
          return (
            <div key={type} className="bg-black/40 border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-4">
                <div className="shrink-0 w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center">
                  {UNIT_IMAGE_PATHS[type] ? (
                    <img src={UNIT_IMAGE_PATHS[type]} alt="" className="h-12 w-12 object-contain" />
                  ) : (
                    <span className="text-2xl">{UNIT_INFO[type].icon}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-serif text-white text-sm">{t(UNIT_INFO[type].nameKey)}</span>
                    <span className="text-[11px] text-white/40">({t("play.training.owned")}: {ownedCount(type)})</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/50">
                    {Object.entries(cost).filter(([, v]) => Number(v) > 0).map(([res, val]) => (
                      <span key={res} className="flex items-center gap-1">
                        <ResourceIconSVG type={res as any} size={12} />
                        {formatNumber(val)}
                      </span>
                    ))}
                    <span className="text-white/30">· {formatTime(time)}</span>
                  </div>
                </div>
                <button
                  onClick={() => onTrain(type, count)}
                  className="shrink-0 bg-etheria-gold/80 hover:bg-etheria-gold text-black font-bold px-5 py-2.5 rounded-xl text-xs tracking-wider transition-colors"
                >
                  {t("play.training.train")} x{count}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-[11px] text-white/40">{t("play.training.quantity")}</span>
        <input type="range" min="1" max="50" value={count} onChange={(e) => setCount(Number(e.target.value))} className="flex-1 h-1 accent-etheria-gold/80 cursor-pointer" />
        <span className="text-sm font-mono text-white w-8 text-center">{count}</span>
      </div>
    </section>
  );
}

function ResearchSection({ cityTechs, activeResearch, techOptions, resources, onResearch, t }: any) {
  const [tab, setTab] = useState<"ECONOMY" | "MILITARY" | "DEFENSE">("ECONOMY");
  const techs = (techOptions ?? []).filter((t: any) => {
    const info = TECH_INFO[t.techId];
    return info && info.category === tab;
  });

  return (
    <section className="bg-white/5 rounded-3xl p-6 border border-white/5">
      <h3 className="font-serif text-lg text-white uppercase tracking-widest mb-4">{t("play.research.title")}</h3>

      <div className="flex gap-1 mb-5">
        {(["ECONOMY", "MILITARY", "DEFENSE"] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setTab(cat)}
            className={`flex-1 text-[10px] py-1.5 rounded-full border transition-colors ${
              tab === cat ? "border-etheria-gold bg-etheria-gold/10 text-etheria-gold" : "border-white/10 text-white/40 hover:text-white"
            }`}
          >
            {t(`play.research.categories.${cat.toLowerCase()}`)}
          </button>
        ))}
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {techs.length === 0 && (
          <div className="text-[11px] text-white/30 text-center py-4">{t("play.research.empty")}</div>
        )}
        {techs.map((tech: any) => {
          const info = TECH_INFO[tech.techId];
          const iconPath = getTechIconPath(tech.techId);
          const active = activeResearch?.techId === tech.techId || activeResearch?.id === tech.techId;
          const isMax = (tech.currentLevel ?? 0) >= (tech.maxLevel ?? 1);
          const cost = tech.nextLevelCost ?? {};
          const time = tech.nextLevelTime ?? 0;
          const hasCost = Object.values(cost).some((v: any) => Number(v) > 0);

          return (
            <div key={tech.techId} className={`bg-black/40 border rounded-2xl p-4 transition-colors ${active ? "border-etheria-gold/50 bg-etheria-gold/5" : "border-white/5"}`}>
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
                  {iconPath ? (
                    <img src={iconPath} alt="" className="h-9 w-9 object-contain" />
                  ) : (
                    <span className="text-xs text-white/50">{info?.icon ?? "?"}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-serif text-white text-sm">{t(info?.nameKey ?? tech.techId)}</span>
                    <span className="text-[10px] text-white/30">Lv {tech.currentLevel}/{tech.maxLevel}</span>
                    {active && <span className="text-[9px] text-etheria-success bg-etheria-success/10 px-1.5 py-0.5 rounded-full">{t("play.research.researching")}</span>}
                    {isMax && <span className="text-[9px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full">{t("play.research.max")}</span>}
                  </div>
                  <p className="text-[11px] text-white/50 leading-relaxed mb-2">{t(info?.descriptionKey ?? "")}</p>

                  {hasCost && !isMax && !active && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                      <span className="text-[10px] text-white/30">{t("play.research.cost")}:</span>
                      {Object.entries(cost).filter(([, v]) => Number(v) > 0).map(([res, val]) => (
                        <span key={res} className={`text-[10px] flex items-center gap-1 ${Number(resources[res] ?? 0) >= Number(val) ? "text-white/60" : "text-red-400"}`}>
                          <ResourceIconSVG type={res as any} size={10} />
                          {formatNumber(Number(val))}
                        </span>
                      ))}
                      <span className="text-[10px] text-white/30">· {formatTime(time)}</span>
                    </div>
                  )}

                  {!isMax && !active && (
                    <button
                      onClick={() => onResearch(tech.techId)}
                      disabled={!tech.canResearch}
                      className={`mt-1 px-4 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-colors ${
                        tech.canResearch
                          ? "bg-etheria-teal/70 hover:bg-etheria-teal text-white"
                          : "bg-white/5 text-white/20 cursor-not-allowed"
                      }`}
                    >
                      {tech.canResearch ? t("play.research.researchBtn") : tech.researchBlockedReason || t("play.research.locked")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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

function ReportsModal({ onClose, t }: any) {
  const { data, isLoading } = useGameReports(true);
  const markRead = useMarkGameReportRead();
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[84vh] w-full max-w-3xl max-sm:max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-etheria-border bg-[#0b1111]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/5 p-5">
          <h2 className="font-serif text-2xl text-etheria-gold-soft">{t("play.reports.title")}</h2>
          <button onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/45 hover:text-white rounded-full hover:bg-white/10 text-sm">{t("play.building.close")}</button>
        </div>
        <div className="max-h-[calc(84vh-74px)] space-y-3 overflow-y-auto p-5">
          {isLoading && <div className="text-sm text-white/45">{t("play.reports.loading")}</div>}
          {(data?.reports ?? []).length === 0 && !isLoading && <div className="text-sm text-white/45">{t("play.reports.empty")}</div>}
          {(data?.reports ?? []).map((report) => (
            <div key={report.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-etheria-gold-soft/60">{report.type}</div>
                  <div className="font-serif text-lg text-white">{report.title}</div>
                  <div className="mt-1 text-sm text-white/55">{report.summary}</div>
                  <div className="mt-2 text-[11px] text-white/35">{new Date(report.createdAt).toLocaleString()}</div>
                </div>
                {!report.readAt && <button onClick={() => markRead.mutate(report.id)} className="rounded-lg border border-etheria-gold/40 px-3 py-2 text-xs text-etheria-gold-soft">{t("play.reports.markRead")}</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuestsModal({ cityId, onClose, t }: any) {
  const { data: quests } = usePlayerQuests(cityId);
  const claim = useClaimQuest();
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[84vh] w-full max-w-3xl max-sm:max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-etheria-border bg-[#0b1111]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/5 p-5">
          <h2 className="font-serif text-2xl text-etheria-gold-soft">{t("play.quests.title")}</h2>
          <button onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/45 hover:text-white rounded-full hover:bg-white/10 text-sm">{t("play.building.close")}</button>
        </div>
        <div className="grid gap-3 p-5 md:grid-cols-2">
          {(quests ?? []).map((quest) => (
            <div key={quest.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="font-serif text-lg text-white">{t(quest.titleKey)}</div>
              <div className="mt-1 text-sm text-white/55">{t(quest.summaryKey)}</div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/40">
                <div className="h-full bg-etheria-gold" style={{ width: `${Math.min(100, (quest.progress / quest.target) * 100)}%` }} />
              </div>
              <div className="mt-2 text-xs text-white/45">{quest.progress}/{quest.target}</div>
              <button disabled={quest.status !== "CLAIMABLE" || claim.isPending} onClick={() => claim.mutate(quest.id)} className="mt-3 w-full rounded-xl bg-etheria-gold px-4 py-2 text-sm font-bold text-black disabled:opacity-30">{quest.status === "CLAIMED" ? t("play.quests.claimed") : t("play.quests.claim")}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MarketModal({ cityId, onClose, t }: any) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-4xl max-sm:max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-etheria-border bg-[#0b1111]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/5 p-5">
          <h2 className="font-serif text-2xl text-etheria-gold-soft">{t("play.market.title")}</h2>
          <button onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/45 hover:text-white rounded-full hover:bg-white/10 text-sm">{t("play.building.close")}</button>
        </div>
        <MarketPanel cityId={cityId} t={t} />
      </div>
    </div>
  );
}

function MarketPanel({ cityId, t }: any) {
  const { data: offers } = useMarketOffers();
  const createOffer = useCreateMarketOffer();
  const acceptOffer = useAcceptMarketOffer();
  const [giveResource, setGiveResource] = useState("wood");
  const [wantResource, setWantResource] = useState("stone");
  const [giveAmount, setGiveAmount] = useState(100);
  const [wantAmount, setWantAmount] = useState(100);
  const resourceOptions = ["gold", "wood", "stone", "food"];
  return (
        <div className="grid max-h-[calc(88vh-74px)] gap-5 overflow-y-auto p-5 lg:grid-cols-[320px_1fr]">
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="font-serif text-lg text-white">{t("play.market.create")}</h3>
            <select value={giveResource} onChange={(e) => setGiveResource(e.target.value)} className="mt-3 w-full rounded-lg border border-white/10 bg-black/35 p-2 text-sm text-white">{resourceOptions.map((r) => <option key={r} value={r}>{t(`play.resources.${r}`)}</option>)}</select>
            <input type="number" min={1} value={giveAmount} onChange={(e) => setGiveAmount(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 p-2 text-sm text-white" />
            <select value={wantResource} onChange={(e) => setWantResource(e.target.value)} className="mt-3 w-full rounded-lg border border-white/10 bg-black/35 p-2 text-sm text-white">{resourceOptions.map((r) => <option key={r} value={r}>{t(`play.resources.${r}`)}</option>)}</select>
            <input type="number" min={1} value={wantAmount} onChange={(e) => setWantAmount(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 p-2 text-sm text-white" />
            <button disabled={!cityId || createOffer.isPending} onClick={() => cityId && createOffer.mutate({ cityId, giveResource, giveAmount, wantResource, wantAmount })} className="mt-4 w-full rounded-xl bg-etheria-gold py-3 text-sm font-bold text-black disabled:opacity-30">{t("play.market.publish")}</button>
          </section>
          <section className="space-y-3">
            {(offers ?? []).map((offer) => (
              <div key={offer.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-sm text-white/75">
                  <span className="text-etheria-gold-soft">{offer.giveAmount} {t(`play.resources.${offer.giveResource}`)}</span>
                  {" "}{t("play.market.for")}{" "}
                  <span className="text-etheria-gold-soft">{offer.wantAmount} {t(`play.resources.${offer.wantResource}`)}</span>
                </div>
                <button disabled={!cityId || offer.creatorCityId === cityId || acceptOffer.isPending} onClick={() => cityId && acceptOffer.mutate({ offerId: offer.id, cityId })} className="rounded-lg border border-etheria-gold/40 px-3 py-2 text-xs text-etheria-gold-soft disabled:opacity-30">{t("play.market.accept")}</button>
              </div>
            ))}
          </section>
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
  const contributeObjective = useContributeAllianceObjective();
  const cityId = useGameStore((s) => s.cityId);
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
      <div className="max-h-[88vh] w-full max-w-5xl max-sm:max-w-[calc(100vw-16px)] overflow-hidden rounded-3xl border border-etheria-border bg-[#0b1111] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/5 p-5">
          <h2 className="font-serif text-2xl uppercase tracking-widest text-etheria-gold-soft">{t("play.alliance.title")}</h2>
          <button onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/40 hover:text-white rounded-full hover:bg-white/10">✕</button>
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
                  <h3 className="font-serif text-lg text-white">{t("play.alliance.objectives")}</h3>
                  <div className="mt-3 space-y-2 text-xs text-white/55">
                    {(data.objectives ?? []).map((objective: any) => (
                      <div key={objective.id} className="rounded-lg bg-black/25 p-3">
                        <div className="font-serif text-sm text-white">{objective.title}</div>
                        <div className="mt-1">{objective.summary}</div>
                        <div className="mt-2 text-white/45">{Object.entries(objective.progress ?? {}).map(([key, value]) => `${t(`play.resources.${key}`)} ${value}/${objective.target?.[key] ?? 0}`).join(" · ")}</div>
                        <button disabled={!cityId || objective.status !== "ACTIVE" || contributeObjective.isPending} onClick={() => cityId && contributeObjective.mutate({ objectiveId: objective.id, cityId, resources: { gold: 50, wood: 50, stone: 50, food: 50, gems: 0 } })} className="mt-3 rounded-lg border border-etheria-gold/40 px-3 py-2 text-xs text-etheria-gold-soft disabled:opacity-30">{t("play.alliance.contribute")}</button>
                      </div>
                    ))}
                    {(data.objectives ?? []).length === 0 && <div>{t("play.alliance.empty")}</div>}
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
function CountdownSmall({ startedAt, completesAt }: { startedAt?: string; completesAt: string }) {
  const { t } = useI18n();
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => {
      if (startedAt && new Date(startedAt).getTime() > Date.now()) {
        setTime(t("play.queues.waiting"));
        return;
      }
      const diff = Math.max(0, new Date(completesAt).getTime() - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTime(`${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [completesAt, startedAt, t]);
  return <span className="font-mono">{time}</span>;
}
