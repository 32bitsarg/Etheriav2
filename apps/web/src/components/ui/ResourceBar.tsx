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

export function ResourceBar() {
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
            <div key={key} className="flex items-center gap-1.5 shrink-0">
              <ResourceIconSVG type={key as any} size={14} />
              <span className="text-[13px] font-bold tabular-nums text-stone-800">
                {formatNumber(Math.floor(value))}
              </span>
              <span className={`text-[10px] font-semibold ${near ? "text-rose-600" : "text-emerald-600"}`}>
                +{prod}/h
              </span>
            </div>
          );
        })}

        <div className="flex items-center gap-1.5 border-l border-stone-200 pl-3 shrink-0">
          <ResourceIconSVG type="gems" size={14} />
          <span className="text-[13px] font-bold tabular-nums text-stone-800">
            {formatNumber(Math.floor(liveResources.gems))}
          </span>
        </div>
      </div>
    </div>
  );
}
