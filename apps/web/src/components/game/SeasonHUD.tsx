"use client";

import { useWorldSeason } from "@/hooks/useCity";
import { Badge } from "@/components/ui/Badge";

const SEASON_ICONS: Record<string, string> = {
  SPRING: "🌸",
  SUMMER: "☀️",
  AUTUMN: "🍂",
  WINTER: "❄️",
};

const SEASON_NAMES: Record<string, string> = {
  SPRING: "Primavera",
  SUMMER: "Verano",
  AUTUMN: "Otono",
  WINTER: "Invierno",
};

const PHASE_NAMES: Record<string, string> = {
  START: "Inicio",
  PEAK: "Pleno",
  TRANSITION: "Transicion",
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
  const { data, isLoading } = useWorldSeason();

  if (isLoading || !data?.season) {
    return null;
  }

  const { currentSeason, phase, intensity, endsAt } = data.season;
  const icon = SEASON_ICONS[currentSeason] ?? "🌍";
  const name = SEASON_NAMES[currentSeason] ?? currentSeason;
  const phaseName = PHASE_NAMES[phase] ?? phase;
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
