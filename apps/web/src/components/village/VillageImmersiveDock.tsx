"use client";

import React, { useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  color: string;
  iconBg: string;
  buildingType?: BuildingType;
  buildingLevel?: number;
  icon?: string;
  refundableCost?: { gold?: number; wood?: number; stone?: number; food?: number };
  cancelKind: "construction" | "training" | "research";
};

const MAX_SLOTS = 3;

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
      buildQueues.slice(0, MAX_SLOTS).map((queue) => ({
        id: queue.id,
        label: t(BUILDING_NAMES[queue.buildingType] ?? queue.buildingType),
        sublabel: `Nv ${queue.targetLevel}`,
        startedAt: queue.startedAt,
        completesAt: queue.completesAt,
        color: "#d97706",
        iconBg: "rgba(217,119,6,0.1)",
        buildingType: queue.buildingType,
        buildingLevel: queue.targetLevel,
        refundableCost: getUpgradeCost(queue.buildingType, Math.max(0, queue.targetLevel - 1)),
        cancelKind: "construction",
      })),
    [buildQueues, t]
  );

  const trainingItems = useMemo<QueueItem[]>(
    () =>
      trainingQueues.slice(0, MAX_SLOTS).map((queue) => ({
        id: queue.id,
        label: t(UNIT_INFO[queue.unitType as UnitType]?.nameKey ?? queue.unitType),
        sublabel: `×${queue.count}`,
        startedAt: queue.startedAt,
        completesAt: queue.completesAt,
        color: "#0284c7",
        iconBg: "rgba(2,132,199,0.1)",
        icon: UNIT_INFO[queue.unitType as UnitType]?.icon ?? "⚔️",
        refundableCost: getTrainingCost(queue.unitType as UnitType, queue.count),
        cancelKind: "training",
      })),
    [trainingQueues, t]
  );

  const researchItems = useMemo<QueueItem[]>(
    () =>
      activeResearch
        ? [
            {
              id: activeResearch.id,
              label: t(TECH_INFO[activeResearch.techId]?.nameKey ?? activeResearch.techId),
              sublabel: `Nv ${activeResearch.targetLevel}`,
              startedAt: activeResearch.startedAt,
              completesAt: activeResearch.completesAt,
              color: "#7c3aed",
              iconBg: "rgba(124,58,237,0.1)",
              icon: "📚",
              refundableCost: getTechCost(activeResearch.techId, Math.max(0, activeResearch.targetLevel - 1)),
              cancelKind: "research" as const,
            },
          ]
        : [],
    [activeResearch, t]
  );

  const hasAny = constructionItems.length > 0 || trainingItems.length > 0 || researchItems.length > 0;
  if (!hasAny) return null;

  const showRefund = (title: string, data?: any) => {
    const refundText = Object.entries(data?.refund ?? {})
      .filter(([, v]) => typeof v === "number" && (v as number) > 0)
      .map(([key, v]) => `${key}: ${formatNumber(v as number)}`)
      .join(" · ");
    addToast({ type: "success", title, message: refundText || t("play.dock.refund50") });
  };

  const handleCancel = (item: QueueItem) => {
    if (!cityId) return;
    if (item.cancelKind === "construction") {
      cancelBuildQueue.mutate(
        { cityId, queueId: item.id },
        {
          onSuccess: (data) => showRefund(t("play.dock.upgradeCancelled"), data),
          onError: (err) => addToast({ type: "error", title: t("play.dock.cancelFailed"), message: err.message }),
        }
      );
    } else if (item.cancelKind === "training") {
      cancelTrainingQueue.mutate(
        { cityId, queueId: item.id },
        {
          onSuccess: (data) => showRefund(t("play.dock.trainingCancelled"), data),
          onError: (err) => addToast({ type: "error", title: t("play.dock.cancelFailed"), message: err.message }),
        }
      );
    } else {
      cancelResearchQueue.mutate(
        { cityId, queueId: item.id },
        {
          onSuccess: (data) => showRefund(t("play.dock.researchCancelled"), data),
          onError: (err) => addToast({ type: "error", title: t("play.dock.cancelFailed"), message: err.message }),
        }
      );
    }
  };

  const cancellingId =
    cancelBuildQueue.variables?.queueId ??
    cancelTrainingQueue.variables?.queueId ??
    cancelResearchQueue.variables?.queueId ??
    null;

  const sections = [
    { label: t("play.dock.construction"), emoji: "🏗️", items: constructionItems },
    { label: t("play.dock.training"), emoji: "🛡️", items: trainingItems },
    { label: t("play.dock.research"), emoji: "📚", items: researchItems },
  ];
  const allItems = [...constructionItems, ...trainingItems, ...researchItems];

  return (
    <>
      {/* Desktop: horizontal three-section rail */}
      <aside className="dock-desktop pointer-events-auto absolute inset-x-3 bottom-3 z-40 hidden items-center gap-1.5 rounded-2xl border border-white/10 bg-[#0b0f0e]/85 px-3 py-2 shadow-lg shadow-black/30 backdrop-blur-xl md:flex">
        {sections.map((section, i) => (
          <React.Fragment key={section.label}>
            {i > 0 && <div className="mx-1 h-8 w-px shrink-0 bg-white/10" />}
            <QueueSection
              label={section.label}
              emoji={section.emoji}
              items={section.items}
              cancellingId={cancellingId}
              onCancel={handleCancel}
              cancelLabel={t("play.dock.cancel")}
            />
          </React.Fragment>
        ))}
      </aside>

      {/* Mobile: compact vertical stack bottom-left — max 3 items to avoid overlap with dock */}
      <div
        className="dock-mobile pointer-events-auto absolute left-2 z-40 flex w-[min(62vw,260px)] flex-col gap-1 md:hidden"
        style={{ bottom: "calc(var(--dock-h, 56px) + env(safe-area-inset-bottom, 0px))" }}
      >
        {allItems.slice(0, 3).map((item) => (
          <QueueSlot
            key={item.id}
            item={item}
            isCancelling={cancellingId === item.id}
            onCancel={handleCancel}
            cancelLabel={t("play.dock.cancel")}
          />
        ))}
        {allItems.length > 3 && (
          <span className="pl-1 text-[11px] font-bold text-white/50 border border-white/15 rounded-md px-2 py-0.5 bg-black/40 w-fit">
            +{allItems.length - 3}
          </span>
        )}
      </div>
    </>
  );
}

function QueueSection({
  label,
  emoji,
  items,
  cancellingId,
  onCancel,
  cancelLabel,
}: {
  label: string;
  emoji: string;
  items: QueueItem[];
  cancellingId: string | null;
  onCancel: (item: QueueItem) => void;
  cancelLabel: string;
}) {
  return (
    // On mobile, sections with nothing queued disappear so active items get the space
    <div className={`flex min-w-0 flex-1 items-center gap-1.5 ${items.length === 0 ? "max-md:hidden" : ""}`}>
      {/* Section label */}
      <div className="flex shrink-0 flex-col items-center gap-0.5 pr-1">
        <span className="text-[15px] leading-none">{emoji}</span>
        <span className="text-[8px] font-bold uppercase tracking-wider text-white/40">{label}</span>
      </div>

      {/* 3 horizontal slots (empty placeholders are desktop-only) */}
      {Array.from({ length: MAX_SLOTS }).map((_, i) => {
        const item = items[i];
        return item ? (
          <QueueSlot
            key={item.id}
            item={item}
            isCancelling={cancellingId === item.id}
            onCancel={onCancel}
            cancelLabel={cancelLabel}
          />
        ) : (
          <EmptySlot key={`empty-${i}`} />
        );
      })}
    </div>
  );
}

function QueueSlot({
  item,
  isCancelling,
  onCancel,
  cancelLabel,
}: {
  item: QueueItem;
  isCancelling: boolean;
  onCancel: (item: QueueItem) => void;
  cancelLabel: string;
}) {
  const { remaining, progress } = useCountdown(item.completesAt);
  const isWaiting = new Date(item.startedAt).getTime() > Date.now();
  const seconds = remaining() ?? 0;
  const queryClient = useQueryClient();
  const cityId = useGameStore((s) => s.cityId);

  // When countdown reaches 0, force an immediate refetch after server processes the queue
  useEffect(() => {
    if (seconds <= 0 && !isWaiting) {
      const id = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["city", cityId] });
      }, 1500);
      return () => clearTimeout(id);
    }
  }, [seconds <= 0, cityId]);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-[#101513]/90 px-2 py-1.5 backdrop-blur-md">
      {/* Icon */}
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg overflow-hidden"
        style={{ background: item.iconBg }}
      >
        {item.buildingType ? (
          <BuildingSprite type={item.buildingType} level={item.buildingLevel} size={22} />
        ) : (
          <span className="text-[12px] leading-none">{item.icon ?? "✦"}</span>
        )}
      </div>

      {/* Text + progress */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-1">
          <span className="truncate text-[11px] font-semibold text-white/90 leading-tight">
            {item.label}
          </span>
          <span className="shrink-0 text-[10px] font-bold tabular-nums" style={{ color: item.color }}>
            {isWaiting ? "—" : formatTime(seconds)}
          </span>
        </div>
        <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full"
            style={{ width: `${isWaiting ? 0 : progress(item.startedAt)}%`, background: item.color }}
          />
        </div>
      </div>

      {/* Cancel */}
      <button
        type="button"
        onClick={() => onCancel(item)}
        disabled={isCancelling}
        title={cancelLabel}
        className="shrink-0 flex h-5 w-5 items-center justify-center rounded text-white/35 hover:bg-rose-500/15 hover:text-rose-300 transition-colors disabled:opacity-40"
      >
        <svg className="h-2.5 w-2.5" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 1l8 8M9 1L1 9" />
        </svg>
      </button>
    </div>
  );
}

function EmptySlot() {
  return (
    <div className="max-md:hidden flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-dashed border-white/15 px-2 py-1.5 opacity-30">
      <div className="h-7 w-7 shrink-0 rounded-lg bg-white/10" />
      <div className="flex-1">
        <div className="h-2 w-12 rounded bg-white/10" />
        <div className="mt-1.5 h-0.5 rounded-full bg-white/10" />
      </div>
    </div>
  );
}
