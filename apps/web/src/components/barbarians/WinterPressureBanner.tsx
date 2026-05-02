"use client";

import { useState } from "react";
import { useWinterPressure } from "@/hooks/useCity";
import { useGameStore } from "@/stores/gameStore";

const ZONE_NAMES_ES: Record<string, string> = {
  NORTH: "Norte Helado",
  CENTER: "Centro Templado",
  SOUTH: "Sur Calido",
  COAST: "Costa",
  MOUNTAIN: "Montana",
  FOREST: "Bosque",
  PLAINS: "Llanura",
};

function formatHours(hours: number): string {
  if (hours === Infinity || hours > 9999) return "--";
  if (hours < 1) return `${Math.floor(hours * 60)}min`;
  return `${Math.floor(hours)}h ${Math.floor((hours % 1) * 60)}min`;
}

export function WinterPressureBanner() {
  const cityId = useGameStore((s) => s.cityId);
  const { data, isLoading } = useWinterPressure(cityId);
  const [collapsed, setCollapsed] = useState(false);

  if (isLoading || !data) return null;
  if (!data.isWinter) return null;

  const isStarving = data.winterState?.isStarving ?? false;
  const hasDeficit = data.netFoodPerHour < 0;
  const hoursUntilStarvation = data.hoursUntilStarvation;
  const isCritical = isStarving || (hasDeficit && hoursUntilStarvation < 4);
  const isWarning = hasDeficit && hoursUntilStarvation < 12;

  if (!isCritical && !isWarning && !isStarving) return null;

  const borderColor = isCritical ? "border-red-500/60" : "border-amber-500/50";
  const bgColor = isCritical ? "bg-red-950/90" : "bg-amber-950/80";
  const shadowColor = isCritical ? "shadow-red-900/30" : "shadow-amber-900/20";
  const textColor = isCritical ? "text-red-300" : "text-amber-300";
  const titleColor = isCritical ? "text-red-400" : "text-amber-400";

  if (collapsed) {
    return (
      <div className="fixed top-16 left-0 right-0 z-40 flex justify-center pointer-events-none">
        <button
          onClick={() => setCollapsed(false)}
          className={`pointer-events-auto mx-4 rounded-lg border ${borderColor} ${bgColor} px-3 py-1.5 text-xs ${titleColor} shadow-lg ${shadowColor} backdrop-blur-sm hover:opacity-80`}
        >
          {isCritical ? "⚠️ Hambruna activa" : "❄️ Presion invernal"}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-16 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <div className={`pointer-events-auto mx-4 max-w-md rounded-lg border-2 ${borderColor} ${bgColor} px-4 py-3 shadow-lg ${shadowColor} backdrop-blur-sm`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{isCritical ? "⚠️" : "❄️"}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${titleColor}`}>
                {isCritical ? "Hambruna Activa" : "Presion Invernal"}
              </span>
              <span className="text-xs text-etheria-text-muted">
                ({ZONE_NAMES_ES[data.zone.id] ?? data.zone.id}: {data.zone.intensity}x)
              </span>
            </div>

            <div className={`text-xs ${textColor} mt-1 space-y-0.5`}>
              {isStarving && (
                <p>
                  Hambruna activa desde hace {data.winterState?.starvationHours ?? 0}h
                  {data.winterState && data.winterState.combatPenalty < 1 && (
                    <span className="text-red-400"> | Penalidad combate: {Math.round((1 - data.winterState.combatPenalty) * 100)}%</span>
                  )}
                </p>
              )}
              {hasDeficit && !isStarving && (
                <p>
                  Deficit: {Math.abs(Math.round(data.netFoodPerHour))} comida/hora
                  {hoursUntilStarvation < Infinity && (
                    <span> | Hambruna en ~{formatHours(hoursUntilStarvation)}</span>
                  )}
                </p>
              )}
              {data.hourlyConsumption > 0 && (
                <p className="text-etheria-text-muted">
                  Consumo tropas: {Math.round(data.hourlyConsumption)}/h | Produccion: {Math.round(data.effectiveProduction)}/h
                </p>
              )}
              {data.winterState && data.winterState.starvationHours >= 10 && (
                <p className="text-red-400">
                  Riesgo de desercion de tropas
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="flex-shrink-0 rounded p-1 text-etheria-text-muted hover:bg-etheria-border/20 hover:text-etheria-gold-soft"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
