"use client";

import { useEffect, useState } from "react";
import { useBarbarianAttackAlerts, useMarkBarbarianAlertRead } from "@/hooks/useCity";
import { useGameStore } from "@/stores/gameStore";

const ARCHETYPE_ICONS: Record<string, string> = {
  RAIDERS: "⚔️",
  HUNTERS: "🏹",
  MARAUDERS: "🔥",
  WARHOST: "💀",
  NOMADS: "🐎",
};

const ARCHETYPE_COLORS: Record<string, string> = {
  RAIDERS: "text-orange-400",
  HUNTERS: "text-green-400",
  MARAUDERS: "text-red-400",
  WARHOST: "text-purple-400",
  NOMADS: "text-yellow-400",
};

export function BarbarianAttackAlertBanner() {
  const cityId = useGameStore((s) => s.cityId);
  const { data: alerts, isLoading } = useBarbarianAttackAlerts(cityId);
  const markRead = useMarkBarbarianAlertRead();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Sync alerts to game store
  useEffect(() => {
    if (alerts) {
      useGameStore.getState().setBarbarianAlerts(alerts);
    }
  }, [alerts]);

  if (!alerts || alerts.length === 0) return null;

  // Only show unread and not dismissed alerts
  const activeAlerts = alerts.filter(
    (a) => !a.read && !dismissed.has(a.id) && new Date(a.arrivesAt) > new Date()
  );

  if (activeAlerts.length === 0) return null;

  // Show the most urgent (earliest arrival)
  const urgentAlert = activeAlerts.sort(
    (a, b) => new Date(a.arrivesAt).getTime() - new Date(b.arrivesAt).getTime()
  )[0];

  const timeUntilArrival = Math.max(
    0,
    Math.floor((new Date(urgentAlert.arrivesAt).getTime() - Date.now()) / 1000)
  );
  const minutes = Math.floor(timeUntilArrival / 60);
  const seconds = timeUntilArrival % 60;

  const handleDismiss = () => {
    setDismissed((prev) => new Set([...prev, urgentAlert.id]));
    markRead.mutate({ alertId: urgentAlert.id });
  };

  return (
    <div className="fixed top-16 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <div className="pointer-events-auto mx-4 max-w-md animate-pulse">
        <div className="rounded-lg border-2 border-red-500/60 bg-red-950/90 px-4 py-3 shadow-lg shadow-red-900/30 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">{ARCHETYPE_ICONS[urgentAlert.archetype] ?? "⚔️"}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${ARCHETYPE_COLORS[urgentAlert.archetype] ?? "text-red-400"}`}>
                  {urgentAlert.campName}
                </span>
                <span className="text-xs text-etheria-text-muted">
                  (Power: {urgentAlert.estimatedPower})
                </span>
              </div>
              <p className="text-xs text-red-300 mt-0.5">
                {minutes > 0
                  ? `⚠️ Attack incoming in ${minutes}m ${seconds}s!`
                  : `⚠️ Attack arriving in ${seconds}s!`}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-shrink-0 rounded p-1 text-etheria-text-muted hover:bg-etheria-border/20 hover:text-etheria-gold-soft"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
