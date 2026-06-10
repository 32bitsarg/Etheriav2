"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { formatNumber } from "@/lib/constants";
import { ResourceIconSVG } from "@/components/village/ResourceIconSVG";

const RESOURCES = [
  { key: "gold", prodKey: "goldPerHour", storageKey: "maxGold" },
  { key: "wood", prodKey: "woodPerHour", storageKey: "maxWood" },
  { key: "stone", prodKey: "stonePerHour", storageKey: "maxStone" },
  { key: "food", prodKey: "foodPerHour", storageKey: "maxFood" },
] as const;

export function ResourceBar({ compact = false, dark = false }: { compact?: boolean; dark?: boolean }) {
  const resources = useGameStore((s) => s.resources);
  const production = useGameStore((s) => s.production);
  const storage = useGameStore((s) => s.storage);
  const [liveResources, setLiveResources] = useState(resources);

  useEffect(() => {
    const interval = setInterval(() => {
      const state = useGameStore.getState();
      const elapsed = state.lastResourceUpdate
        ? (Date.now() - new Date(state.lastResourceUpdate).getTime()) / 1000
        : 0;
      const hours = elapsed / 3600;

      setLiveResources({
        gold: Math.min(state.resources.gold + state.production.goldPerHour * hours, state.storage.maxGold),
        wood: Math.min(state.resources.wood + state.production.woodPerHour * hours, state.storage.maxWood),
        stone: Math.min(state.resources.stone + state.production.stonePerHour * hours, state.storage.maxStone),
        food: Math.min(state.resources.food + state.production.foodPerHour * hours, state.storage.maxFood),
        gems: state.resources.gems,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Compact (mobile): chips de recurso distribuidos a ancho completo, sin
  // shell con padding ancho — estilo barra superior de juego móvil.
  if (compact) {
    const chipBg = dark ? "bg-white/10" : "bg-stone-900/5";
    const textColor = dark ? "text-white/90" : "text-stone-800";
    const nearColor = dark ? "text-rose-300" : "text-rose-600";
    return (
      <div className="pointer-events-auto flex w-full min-w-0 items-center justify-between gap-1">
        {RESOURCES.map(({ key, storageKey }) => {
          const value = liveResources[key as keyof typeof liveResources] ?? 0;
          const max = storage[storageKey as keyof typeof storage] ?? 0;
          const near = max > 0 && value / max >= 0.9;
          return (
            <div
              key={key}
              className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-1 py-0.5 ${chipBg}`}
            >
              <ResourceIconSVG type={key as any} size={12} />
              <span className={`truncate text-[11px] font-bold tabular-nums ${near ? nearColor : textColor}`}>
                {formatNumber(Math.floor(value))}
              </span>
            </div>
          );
        })}
        {liveResources.gems > 0 && (
          <div className={`flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5 ${chipBg}`}>
            <ResourceIconSVG type="gems" size={12} />
            <span className={`text-[11px] font-bold tabular-nums ${textColor}`}>
              {formatNumber(Math.floor(liveResources.gems))}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="resource-bar-shell pointer-events-auto">
      <div className="flex items-center gap-4">
        {RESOURCES.map(({ key, prodKey, storageKey }) => {
          const value = liveResources[key as keyof typeof liveResources] ?? 0;
          const prod = production[prodKey as keyof typeof production] ?? 0;
          const max = storage[storageKey as keyof typeof storage] ?? 0;
          const pct = max > 0 ? Math.round((value / max) * 100) : 0;
          const near = pct >= 90;
          const hoursToFull = prod > 0 && max > value ? (max - value) / prod : null;

          return (
            <div key={key} className="group relative flex items-center shrink-0 gap-1.5">
              <ResourceIconSVG type={key as any} size={14} />
              <span className={`font-bold tabular-nums text-[13px] ${near ? "text-rose-300" : "text-white/90"}`}>
                {formatNumber(Math.floor(value))}
              </span>
              <span className={`text-[10px] font-semibold ${near ? "text-rose-300" : "text-emerald-400"}`}>
                +{prod}/h
              </span>
              {/* Detail tooltip: storage, fill %, time to full */}
              <div className="pointer-events-none absolute left-1/2 top-full z-[60] mt-2 hidden w-44 -translate-x-1/2 rounded-xl border border-white/10 bg-[#0b0f0e]/95 p-2.5 shadow-xl backdrop-blur-xl group-hover:block">
                <div className="mb-1.5 flex items-center justify-between text-[11px]">
                  <span className="text-white/60">{formatNumber(Math.floor(value))} / {formatNumber(max)}</span>
                  <span className={`font-bold ${near ? "text-rose-300" : "text-white/85"}`}>{pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full ${near ? "bg-rose-400" : "bg-amber-400"}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                {hoursToFull !== null && (
                  <div className="mt-1.5 text-[10px] text-white/45">
                    ⏳ {hoursToFull >= 1 ? `${Math.floor(hoursToFull)}h ${Math.round((hoursToFull % 1) * 60)}m` : `${Math.round(hoursToFull * 60)}m`}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div className="flex items-center shrink-0 border-l border-white/15 gap-1.5 pl-3">
          <ResourceIconSVG type="gems" size={14} />
          <span className="font-bold tabular-nums text-white/90 text-[13px]">
            {formatNumber(Math.floor(liveResources.gems))}
          </span>
        </div>
      </div>
    </div>
  );
}
