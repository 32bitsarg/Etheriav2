"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { formatNumber } from "@/lib/constants";
import { ResourceIconSVG } from "@/components/village/ResourceIconSVG";

const RESOURCES = [
  { key: "gold", storageKey: "maxGold" },
  { key: "wood", storageKey: "maxWood" },
  { key: "stone", storageKey: "maxStone" },
  { key: "food", storageKey: "maxFood" },
] as const;

export function MobileResourcePills() {
  const resources = useGameStore((s) => s.resources);
  const production = useGameStore((s) => s.production);
  const storage = useGameStore((s) => s.storage);
  const [live, setLive] = useState(resources);

  useEffect(() => {
    const interval = setInterval(() => {
      const state = useGameStore.getState();
      const elapsed = state.lastResourceUpdate
        ? (Date.now() - new Date(state.lastResourceUpdate).getTime()) / 1000
        : 0;
      const hours = elapsed / 3600;
      setLive({
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
    <div
      className="pointer-events-none absolute left-2 z-[45] flex flex-col gap-1"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 8px)" }}
    >
      {/* 2×2 grid of resource pills */}
      <div className="grid grid-cols-2 gap-1">
        {RESOURCES.map(({ key, storageKey }) => {
          const value = live[key as keyof typeof live] ?? 0;
          const max = storage[storageKey as keyof typeof storage] ?? 0;
          const near = max > 0 && (value as number) / max >= 0.9;
          return (
            <div
              key={key}
              className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 backdrop-blur-md"
              style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.5)" }}
            >
              <ResourceIconSVG type={key as any} size={13} />
              <span className={`text-[11px] font-bold tabular-nums leading-none ${near ? "text-rose-300" : "text-white/90"}`}>
                {formatNumber(Math.floor(value as number))}
              </span>
            </div>
          );
        })}
      </div>
      {/* Gems pill */}
      {live.gems > 0 && (
        <div
          className="flex w-fit items-center gap-1 rounded-full bg-black/60 px-2 py-1 backdrop-blur-md"
          style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.5)" }}
        >
          <ResourceIconSVG type="gems" size={13} />
          <span className="text-[11px] font-bold tabular-nums leading-none text-white/90">
            {formatNumber(Math.floor(live.gems))}
          </span>
        </div>
      )}
    </div>
  );
}
