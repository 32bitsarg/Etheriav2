"use client";

import { useMemo } from "react";
import type { BuildingType, UnitType } from "@etheria/shared";
import { useCountdown } from "@/hooks/useCountdown";
import { useCancelBuildQueue, useCancelResearchQueue, useCancelTrainingQueue } from "@/hooks/useCity";
import { useGameStore } from "@/stores/gameStore";
import { BUILDING_NAMES, TECH_INFO, UNIT_INFO, formatNumber, formatTime, getTechCost, getTrainingCost, getUpgradeCost } from "@/lib/constants";
import { BuildingSprite } from "@/components/village/BuildingIcon";
import { useToastStore } from "@/stores/toastStore";
import { useI18n } from "@/i18n";

type QueueItem = {
  id: string;
  label: string;
  sublabel: string;
  startedAt: string;
  completesAt: string;
  tone: "gold" | "teal";
  buildingType?: BuildingType;
  buildingLevel?: number;
  icon?: string;
  refundableCost?: { gold?: number; wood?: number; stone?: number; food?: number };
  cancelKind?: "construction" | "training" | "research";
};

export function VillageImmersiveDock() {
  const cityId = useGameStore((s) => s.cityId);
  const buildQueues = useGameStore((s) => s.buildQueues);
  const trainingQueues = useGameStore((s) => s.trainingQueues);
  const activeResearch = useGameStore((s) => s.activeResearch);
  const cancelBuildQueue = useCancelBuildQueue();
  const cancelTrainingQueue = useCancelTrainingQueue();
  const cancelResearchQueue = useCancelResearchQueue();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useI18n();

  const constructionItems = useMemo<QueueItem[]>(
    () =>
      buildQueues.map((queue) => ({
        id: queue.id,
        label: t(BUILDING_NAMES[queue.buildingType] ?? queue.buildingType),
        sublabel: `Lv ${queue.targetLevel}`,
        startedAt: queue.startedAt,
        completesAt: queue.completesAt,
        tone: "gold",
        buildingType: queue.buildingType,
        buildingLevel: queue.targetLevel,
        refundableCost: getUpgradeCost(queue.buildingType, Math.max(0, queue.targetLevel - 1)),
        cancelKind: "construction",
      })),
    [buildQueues]
  );

  const trainingItems = useMemo<QueueItem[]>(
    () =>
      trainingQueues.map((queue) => ({
        id: queue.id,
        label: t(UNIT_INFO[queue.unitType as UnitType]?.nameKey ?? queue.unitType),
        sublabel: `x${queue.count}`,
        startedAt: queue.startedAt,
        completesAt: queue.completesAt,
        tone: "gold",
        icon: UNIT_INFO[queue.unitType as UnitType]?.icon ?? "⚔️",
        refundableCost: getTrainingCost(queue.unitType as UnitType, queue.count),
        cancelKind: "training",
      })),
    [trainingQueues]
  );

  const researchItems = useMemo<QueueItem[]>(
    () =>
      activeResearch
        ? [
            {
              id: activeResearch.id,
              label: t(TECH_INFO[activeResearch.techId]?.nameKey ?? activeResearch.techId),
              sublabel: `Lv ${activeResearch.targetLevel}`,
              startedAt: activeResearch.startedAt,
              completesAt: activeResearch.completesAt,
              tone: "teal",
              icon: "✦",
              refundableCost: getTechCost(activeResearch.techId, Math.max(0, activeResearch.targetLevel - 1)),
              cancelKind: "research",
            },
          ]
        : [],
    [activeResearch]
  );

  return (
    <aside className="village-queue-dock pointer-events-auto absolute bottom-3 left-1/2 z-40 w-[min(760px,calc(100vw-18px))] -translate-x-1/2 overflow-hidden rounded-[18px]">
      <div className="village-queue-dock__crest" aria-hidden="true" />
      <QueueDockPanel
        kind="construction"
        title={t("play.dock.construction")}
        emptyText={t("play.dock.noConstruction")}
        items={constructionItems}
        onCancelItem={(item) => {
          if (!cityId) return;
          cancelBuildQueue.mutate(
            { cityId, queueId: item.id },
            {
              onSuccess: (data) => {
                const refundText = Object.entries(data.refund ?? {})
                  .filter(([, value]) => typeof value === "number" && value > 0)
                  .map(([key, value]) => `${key}: ${formatNumber(value as number)}`)
                  .join(" · ");
                addToast({ type: "success", title: t("play.dock.upgradeCancelled"), message: refundText || t("play.dock.refund50") });
              },
              onError: (error) => {
                addToast({ type: "error", title: t("play.dock.cancelFailed"), message: error.message });
              },
            }
          );
        }}
        cancellingItemId={cancelBuildQueue.variables?.queueId ?? null}
      />
      <QueueDockPanel
        kind="training"
        title={t("play.dock.training")}
        emptyText={t("play.dock.noTraining")}
        items={trainingItems}
        onCancelItem={(item) => {
          if (!cityId) return;
          cancelTrainingQueue.mutate(
            { cityId, queueId: item.id },
            {
              onSuccess: () => addToast({ type: "success", title: t("play.dock.trainingCancelled"), message: t("play.dock.refund50") }),
              onError: (error) => addToast({ type: "error", title: t("play.dock.cancelFailed"), message: error.message }),
            }
          );
        }}
        cancellingItemId={cancelTrainingQueue.variables?.queueId ?? null}
      />
      <QueueDockPanel
        kind="research"
        title={t("play.dock.research")}
        emptyText={t("play.dock.noResearch")}
        items={researchItems}
        onCancelItem={(item) => {
          if (!cityId) return;
          cancelResearchQueue.mutate(
            { cityId, queueId: item.id },
            {
              onSuccess: () => addToast({ type: "success", title: t("play.dock.researchCancelled"), message: t("play.dock.refund50") }),
              onError: (error) => addToast({ type: "error", title: t("play.dock.cancelFailed"), message: error.message }),
            }
          );
        }}
        cancellingItemId={cancelResearchQueue.variables?.queueId ?? null}
      />
    </aside>
  );
}

function QueueDockPanel({
  title,
  emptyText,
  items,
  kind,
  onCancelItem,
  cancellingItemId,
}: {
  title: string;
  emptyText: string;
  items: QueueItem[];
  kind: "construction" | "training" | "research";
  onCancelItem?: (item: QueueItem) => void;
  cancellingItemId?: string | null;
}) {
  return (
    <section className={`village-queue-panel village-queue-panel--${kind}`}>
      <div className="village-queue-rail__header">
        <span>{title}</span>
        <span className="village-queue-rail__count">{items.length}</span>
      </div>
      <div className="px-1.5 pb-1 pt-0.5">
        <QueueStack emptyText={emptyText} items={items} onCancelItem={onCancelItem} cancellingItemId={cancellingItemId} />
      </div>
    </section>
  );
}

function QueueStack({ emptyText, items, onCancelItem, cancellingItemId }: { emptyText: string; items: QueueItem[]; onCancelItem?: (item: QueueItem) => void; cancellingItemId?: string | null }) {
  return (
    items.length === 0 ? (
      <div className="village-queue-empty">
        <span>{emptyText}</span>
      </div>
    ) : (
      <div className="space-y-0.5">
        {items.map((item) => (
          <QueueCard key={item.id} item={item} onCancel={onCancelItem} isCancelling={cancellingItemId === item.id} />
        ))}
      </div>
    )
  );
}

function QueueCard({ item, onCancel, isCancelling }: { item: QueueItem; onCancel?: (item: QueueItem) => void; isCancelling?: boolean }) {
  const { t } = useI18n();
  const { remaining, progress } = useCountdown(item.completesAt);
  const isWaiting = new Date(item.startedAt).getTime() > Date.now();
  const seconds = remaining() ?? 0;
  const refund = item.refundableCost
    ? Object.entries(item.refundableCost)
        .filter(([, value]) => typeof value === "number" && value > 0)
        .map(([key, value]) => `${key.slice(0, 1).toUpperCase()}: ${formatNumber(Math.floor((value as number) * 0.5))}`)
        .join(" · ")
    : "";

  return (
    <div className={`village-queue-card tone-${item.tone} village-queue-card--compact`} title={`${item.label} ${item.sublabel}`}>
      <div className="village-queue-card__badge village-queue-card__badge--compact">
        {item.buildingType ? <BuildingSprite type={item.buildingType} level={item.buildingLevel} size={18} /> : <span>{item.icon ?? "✦"}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <div className="font-mono text-[9px] leading-none text-etheria-text">{isWaiting ? t("play.queues.waiting") : formatTime(seconds)}</div>
          {onCancel ? (
            <button
              type="button"
              onClick={() => onCancel(item)}
              disabled={isCancelling}
              className={`village-queue-cancel ${isCancelling ? "opacity-50" : ""}`}
              aria-label={`${t("play.dock.cancel")} ${item.label}`}
              title={refund ? `${t("play.dock.cancelWithRefund")} ${refund}` : t("play.dock.cancel")}
            >
              ×
            </button>
          ) : null}
        </div>
        <div className="village-queue-card__track mt-1">
          <div className="village-queue-card__fill" style={{ width: `${isWaiting ? 0 : progress(item.startedAt)}%` }} />
        </div>
      </div>
    </div>
  );
}
