"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { formatNumber } from "@/lib/constants";
import { ResourceIcon } from "@/components/village/ResourceIcon";

const RESOURCES = [
  { key: "gold", label: "Oro", prodKey: "goldPerHour" },
  { key: "wood", label: "Madera", prodKey: "woodPerHour" },
  { key: "stone", label: "Piedra", prodKey: "stonePerHour" },
  { key: "food", label: "Cereal", prodKey: "foodPerHour" },
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
    <div className="pointer-events-auto">
      <div className="mx-auto w-[min(980px,calc(100vw-132px))] rounded-xl border border-white/10 bg-black/35 px-2 py-1.5 backdrop-blur-md shadow-[0_10px_28px_rgba(0,0,0,.35)]">
        <div className="flex items-center gap-2">
          {RESOURCES.map(({ key, prodKey }) => {
            const value = liveResources[key as keyof typeof liveResources] ?? 0;
            const prod = production[prodKey as keyof typeof production] ?? 0;
            const max = storage[`max${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof storage] ?? 0;
            const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;

            return (
              <div key={key} className="flex items-center gap-1.5 min-w-0 flex-1">
                <ResourceIcon type={key} size={16} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1 leading-none">
                    <span className="text-[11px] font-semibold text-etheria-text truncate">{formatNumber(Math.floor(value))}</span>
                    <span className="text-[9px] text-etheria-text-dim">+{prod}/h</span>
                  </div>
                  <div className="mt-1 h-[2px] rounded-full bg-black/45 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        key === "gold" ? "bg-etheria-gold" : key === "wood" ? "bg-etheria-wood" : key === "stone" ? "bg-etheria-stone" : "bg-etheria-food"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <div className="ml-1 flex items-center gap-1.5 border-l border-white/10 pl-2 shrink-0">
            <ResourceIcon type="gems" size={16} />
            <span className="text-[11px] font-semibold text-etheria-gems">{formatNumber(Math.floor(liveResources.gems))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
