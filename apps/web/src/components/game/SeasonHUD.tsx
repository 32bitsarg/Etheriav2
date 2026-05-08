"use client";

import { useWorldSeason } from "@/hooks/useCity";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/i18n";

const SEASON_ICONS: Record<string, string> = {
  SPRING: "Sp",
  SUMMER: "Su",
  AUTUMN: "Au",
  WINTER: "Wi",
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

const IMPACT_KEYS: Record<string, string> = {
  SPRING: "play.seasons.impact.spring",
  SUMMER: "play.seasons.impact.summer",
  AUTUMN: "play.seasons.impact.autumn",
  WINTER: "play.seasons.impact.winter",
};

const IMPACT_FALLBACKS: Record<string, string> = {
  SPRING: "Balanced growth",
  SUMMER: "Stronger production",
  AUTUMN: "Stockpile window",
  WINTER: "Food pressure",
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
  const isTransition = phase === "TRANSITION";
  const impactKey = IMPACT_KEYS[currentSeason] ?? "";
  const impactText = t(impactKey) === impactKey ? IMPACT_FALLBACKS[currentSeason] ?? "" : t(impactKey);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-etheria-border/50 bg-etheria-panel/80 px-3 py-1.5 backdrop-blur-sm">
      <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px] font-semibold text-etheria-gold-soft">{SEASON_ICONS[currentSeason] ?? "Se"}</span>
      <div className="flex min-w-[128px] flex-col leading-tight">
        <span className="text-xs font-semibold text-etheria-text">{t(SEASON_KEYS[currentSeason] ?? "")}</span>
        <span className="text-[10px] text-etheria-text-dim">{t(PHASE_KEYS[phase] ?? "")} · {intensityPct}%</span>
        <span className="max-w-[190px] truncate text-[10px] text-etheria-text-dim">{impactText}</span>
      </div>
      <Badge variant={isTransition ? "gold" : "gray"} size="sm">
        {formatTimeRemaining(endsAt)}
      </Badge>
    </div>
  );
}
