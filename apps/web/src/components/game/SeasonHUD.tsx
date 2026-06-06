"use client";

import { useWorldSeason } from "@/hooks/useCity";
import { useI18n } from "@/i18n";
import { useGameStore } from "@/stores/gameStore";

const SEASON_ASSETS: Record<string, { icon: string; bg: string; accent: string }> = {
  SPRING: {
    icon: "/assets/ui/seasons/season-spring.png",
    bg: "/assets/ui/seasons/season-bg-spring.png",
    accent: "#8fce77",
  },
  SUMMER: {
    icon: "/assets/ui/seasons/season-summer.png",
    bg: "/assets/ui/seasons/season-bg-summer.png",
    accent: "#f4c45f",
  },
  AUTUMN: {
    icon: "/assets/ui/seasons/season-autumn.png",
    bg: "/assets/ui/seasons/season-bg-autumn.png",
    accent: "#d98245",
  },
  WINTER: {
    icon: "/assets/ui/seasons/season-winter.png",
    bg: "/assets/ui/seasons/season-bg-winter.png",
    accent: "#bfe8f7",
  },
};

const SEASON_KEYS: Record<string, string> = {
  SPRING: "play.seasons.spring",
  SUMMER: "play.seasons.summer",
  AUTUMN: "play.seasons.autumn",
  WINTER: "play.seasons.winter",
};

const PHASE_KEYS: Record<string, string> = {
  START: "play.seasons.start",
  PEAK: "play.seasons.mid",
  TRANSITION: "play.seasons.transition",
};

const SEASON_MODIFIERS: Record<string, Array<{ res: string; val: number }>> = {
  SPRING: [{ res: "food", val: 10 }],
  SUMMER: [
    { res: "gold", val: 5 },
    { res: "wood", val: 5 },
    { res: "stone", val: 5 },
    { res: "food", val: 5 },
  ],
  AUTUMN: [{ res: "food", val: 15 }],
  WINTER: [
    { res: "food", val: -15 },
    { res: "wood", val: -5 },
  ],
};

const RESOURCE_SHORT_KEYS: Record<string, string> = {
  gold: "play.resources.gold",
  wood: "play.resources.wood",
  stone: "play.resources.stone",
  food: "play.resources.food",
};

function formatTimeRemaining(endsAt: string): string {
  const diffMs = new Date(endsAt).getTime() - Date.now();
  if (diffMs <= 0) return "0h";
  const days = Math.floor(diffMs / 86_400_000);
  const hours = Math.floor((diffMs % 86_400_000) / 3_600_000);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
}

export function SeasonHUD() {
  const { t } = useI18n();
  const cachedSeasonState = useGameStore((s) => s.seasonState);
  const { data, isLoading } = useWorldSeason(!cachedSeasonState);
  const seasonData = data?.season ?? cachedSeasonState;
  if ((isLoading && !cachedSeasonState) || !seasonData) return null;

  const { currentSeason, phase, intensity, endsAt } = seasonData;
  const intensityPct = Math.round(intensity * 100);
  const modifiers = SEASON_MODIFIERS[currentSeason] ?? [];
  const asset = SEASON_ASSETS[currentSeason];

  return (
    <div className="pointer-events-auto flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white/85 px-2.5 py-1.5 backdrop-blur-md shadow-sm">
      <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-md border border-stone-100 bg-stone-50">
        {asset ? (
          <img src={asset.icon} alt="" className="h-7 w-7 object-contain" />
        ) : (
          <span className="text-[10px] text-stone-400">{currentSeason.slice(0, 2)}</span>
        )}
      </span>
      <div className="flex min-w-[80px] flex-col leading-tight">
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-semibold text-stone-800">{t(SEASON_KEYS[currentSeason] ?? "")}</span>
          <span className="text-[9px] text-stone-400">{t(PHASE_KEYS[phase] ?? "")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {modifiers.map((m) => (
            <span key={m.res} className={`text-[9px] font-semibold ${m.val >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
              {m.val >= 0 ? "+" : ""}
              {m.val}% {t(RESOURCE_SHORT_KEYS[m.res])}
            </span>
          ))}
        </div>
        {currentSeason === "WINTER" && (
          <span className="text-[8px] text-amber-600">{t("play.seasons.winterPressure")}</span>
        )}
      </div>
      <div className="ml-1 flex flex-col items-end">
        <div className="h-1.5 w-12 overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${intensityPct}%`, backgroundColor: asset?.accent ?? "#f59e0b" }}
          />
        </div>
        <span className="font-mono text-[9px] text-stone-400">{formatTimeRemaining(endsAt)}</span>
      </div>
    </div>
  );
}
