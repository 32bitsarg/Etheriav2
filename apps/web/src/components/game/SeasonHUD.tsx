"use client";

import { useWorldSeason } from "@/hooks/useCity";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/i18n";

const SEASON_ICONS: Record<string, string> = {
  SPRING: "🌸",
  SUMMER: "☀️",
  AUTUMN: "🍂",
  WINTER: "❄️",
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

function formatTimeRemaining(endsAt: string): string {
  const now = new Date();
  const end = new Date(endsAt);
  const diffMs = end.getTime() - now.getTime();

  if (diffMs <= 0) return "0d";

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

export function SeasonHUD() {
  const { t } = useI18n();
  const { data, isLoading } = useWorldSeason();

  if (isLoading || !data?.season) {
    return null;
  }

  const { currentSeason, phase, intensity, endsAt } = data.season;
  const icon = SEASON_ICONS[currentSeason] ?? "🌍";
  const name = t(SEASON_KEYS[currentSeason] ?? "");
  const phaseName = t(PHASE_KEYS[phase] ?? "");
  const timeLeft = formatTimeRemaining(endsAt);
  const isTransition = phase === "TRANSITION";

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-etheria-panel/80 backdrop-blur-sm rounded-lg border border-etheria-border/50">
      <span className="text-sm">{icon}</span>
      <div className="flex flex-col leading-tight">
        <span className="text-xs font-semibold text-etheria-text">{name}</span>
        <span className="text-[10px] text-etheria-text-dim">
          {phaseName}
          {isTransition && ` · ${Math.round(intensity * 100)}%`}
        </span>
      </div>
      <Badge variant={isTransition ? "gold" : "gray"} size="sm">
        {timeLeft}
      </Badge>
    </div>
  );
}
