"use client";

import { useWorldSeason } from "@/hooks/useCity";
import { useI18n } from "@/i18n";

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
  const { data, isLoading } = useWorldSeason();
  if (isLoading || !data?.season) return null;

  const { currentSeason, phase, intensity, endsAt } = data.season;
  const intensityPct = Math.round(intensity * 100);
  const modifiers = SEASON_MODIFIERS[currentSeason] ?? [];
  const asset = SEASON_ASSETS[currentSeason];

  return (
    <div
      className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/10 bg-black/60 bg-cover bg-center backdrop-blur-md px-3 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.28)]"
      style={asset ? { backgroundImage: `linear-gradient(90deg, rgba(4,8,12,0.78), rgba(4,8,12,0.48)), url(${asset.bg})` } : undefined}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-black/35">
        {asset ? (
          <img src={asset.icon} alt="" className="h-9 w-9 object-contain" />
        ) : (
          <span className="text-xs text-white/50">{currentSeason.slice(0, 2)}</span>
        )}
      </span>
      <div className="flex min-w-[100px] flex-col leading-tight">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-white">{t(SEASON_KEYS[currentSeason] ?? "")}</span>
          <span className="text-[9px] text-white/30">{t(PHASE_KEYS[phase] ?? "")}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          {modifiers.map((m) => (
            <span key={m.res} className={`text-[10px] font-mono font-bold ${m.val >= 0 ? "text-etheria-success" : "text-red-400"}`}>
              {m.val >= 0 ? "+" : ""}
              {m.val}% {t(RESOURCE_SHORT_KEYS[m.res])}
            </span>
          ))}
        </div>
        {currentSeason === "WINTER" && (
          <span className="mt-0.5 text-[9px] text-amber-400/80">{t("play.seasons.winterPressure")}</span>
        )}
      </div>
      <div className="ml-1 flex flex-col items-end">
        <span className="text-[9px] text-white/30">{t("play.seasons.intensity")}</span>
        <div
          className="mt-0.5 h-2 w-16 overflow-hidden rounded-full border border-white/10 bg-white/10"
          style={{ backgroundImage: "url(/assets/ui/seasons/phase-bar-sprite.png)", backgroundSize: "100% 100%" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${intensityPct}%`,
              backgroundColor: asset?.accent ?? "rgba(234,179,8,0.8)",
              boxShadow: `0 0 10px ${asset?.accent ?? "rgba(234,179,8,0.8)"}`,
            }}
          />
        </div>
        <span className="mt-0.5 font-mono text-[10px] text-white/50">{formatTimeRemaining(endsAt)}</span>
      </div>
    </div>
  );
}
