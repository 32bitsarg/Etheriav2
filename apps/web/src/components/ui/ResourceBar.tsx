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
    <div className="w-full bg-gradient-to-b from-etheria-panel to-etheria-panel-light border-b border-etheria-border">
      <div className="max-w-5xl mx-auto px-2 py-1">
        <div className="flex items-center gap-3">
          {RESOURCES.map(({ key, prodKey }) => {
            const value = liveResources[key as keyof typeof liveResources] ?? 0;
            const prod = production[prodKey as keyof typeof production] ?? 0;
            const max = storage[`max${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof storage] ?? 0;
            const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;

            return (
              <div key={key} className="flex items-center gap-1.5 flex-1 min-w-0">
                <ResourceIcon type={key} size={20} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-semibold text-etheria-text truncate">{formatNumber(Math.floor(value))}</span>
                    <span className="text-[10px] text-etheria-text-dim">+{prod}/h</span>
                  </div>
                  <div className="h-0.5 bg-etheria-bg rounded-full overflow-hidden">
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

          <div className="flex items-center gap-1.5 pl-3 border-l border-etheria-border shrink-0">
            <ResourceIcon type="gems" size={20} />
            <span className="text-xs font-semibold text-etheria-gems">{formatNumber(Math.floor(liveResources.gems))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
