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

export function ResourceBar({ compact = false }: { compact?: boolean }) {
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
    return (
      <div className="pointer-events-auto flex w-full min-w-0 items-center justify-between gap-1">
        {RESOURCES.map(({ key, storageKey }) => {
          const value = liveResources[key as keyof typeof liveResources] ?? 0;
          const max = storage[storageKey as keyof typeof storage] ?? 0;
          const near = max > 0 && value / max >= 0.9;
          return (
            <div
              key={key}
              className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md bg-stone-900/5 px-1 py-0.5"
            >
              <ResourceIconSVG type={key as any} size={12} />
              <span className={`truncate text-[11px] font-bold tabular-nums ${near ? "text-rose-600" : "text-stone-800"}`}>
                {formatNumber(Math.floor(value))}
              </span>
            </div>
          );
        })}
        {liveResources.gems > 0 && (
          <div className="flex min-w-0 items-center gap-1 rounded-md bg-stone-900/5 px-1 py-0.5">
            <ResourceIconSVG type="gems" size={12} />
            <span className="text-[11px] font-bold tabular-nums text-stone-800">
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

          return (
            <div key={key} className="flex items-center shrink-0 gap-1.5">
              <ResourceIconSVG type={key as any} size={14} />
              <span className={`font-bold tabular-nums text-[13px] ${near ? "text-rose-600" : "text-stone-800"}`}>
                {formatNumber(Math.floor(value))}
              </span>
              <span className={`text-[10px] font-semibold ${near ? "text-rose-600" : "text-emerald-600"}`}>
                +{prod}/h
              </span>
            </div>
          );
        })}

        <div className="flex items-center shrink-0 border-l border-stone-200 gap-1.5 pl-3">
          <ResourceIconSVG type="gems" size={14} />
          <span className="font-bold tabular-nums text-stone-800 text-[13px]">
            {formatNumber(Math.floor(liveResources.gems))}
          </span>
        </div>
      </div>
    </div>
  );
}
