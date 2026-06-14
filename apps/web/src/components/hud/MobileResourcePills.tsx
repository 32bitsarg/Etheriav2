"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { formatNumber } from "@/lib/constants";
import { ResourceIconSVG } from "@/components/village/ResourceIconSVG";
import { NotificationBell } from "@/components/game/NotificationBell";
import { useViewportTier } from "@/hooks/useViewportTier";

const RESOURCES = [
  { key: "gold",  prodKey: "goldPerHour",  storageKey: "maxGold"  },
  { key: "wood",  prodKey: "woodPerHour",  storageKey: "maxWood"  },
  { key: "stone", prodKey: "stonePerHour", storageKey: "maxStone" },
  { key: "food",  prodKey: "foodPerHour",  storageKey: "maxFood"  },
] as const;

export function MobileResourcePills() {
  const resources   = useGameStore((s) => s.resources);
  const production  = useGameStore((s) => s.production);
  const storage     = useGameStore((s) => s.storage);
  const tier        = useViewportTier();
  const showProd    = tier !== "xs";

  const [live, setLive] = useState(resources);

  useEffect(() => {
    const interval = setInterval(() => {
      const state   = useGameStore.getState();
      const elapsed = state.lastResourceUpdate
        ? (Date.now() - new Date(state.lastResourceUpdate).getTime()) / 1000
        : 0;
      const hours = elapsed / 3600;
      setLive({
        gold:  Math.min(state.resources.gold  + state.production.goldPerHour  * hours, state.storage.maxGold),
        wood:  Math.min(state.resources.wood  + state.production.woodPerHour  * hours, state.storage.maxWood),
        stone: Math.min(state.resources.stone + state.production.stonePerHour * hours, state.storage.maxStone),
        food:  Math.min(state.resources.food  + state.production.foodPerHour  * hours, state.storage.maxFood),
        gems:  state.resources.gems,
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[45] flex items-stretch border-b border-white/[0.07] bg-black/65 backdrop-blur-xl"
      style={{ top: "env(safe-area-inset-top, 0px)" }}
    >
      {/* Resource cells */}
      {RESOURCES.map(({ key, prodKey, storageKey }) => {
        const value = live[key as keyof typeof live] as number ?? 0;
        const max   = storage[storageKey as keyof typeof storage] as number ?? 0;
        const prod  = production[prodKey as keyof typeof production] as number ?? 0;
        const near  = max > 0 && value / max >= 0.9;

        return (
          <div
            key={key}
            className="flex min-w-0 flex-1 flex-col items-center justify-center px-0.5 py-[5px]"
          >
            <div className="flex items-center gap-[3px]">
              <ResourceIconSVG type={key as any} size={12} />
              <span
                className={`font-bold tabular-nums leading-none ${near ? "text-rose-300" : "text-white/90"}`}
                style={{ fontSize: "clamp(10px, 2.8vw, 13px)" }}
              >
                {formatNumber(Math.floor(value))}
              </span>
            </div>
            {showProd && prod > 0 && (
              <span
                className="mt-[1px] tabular-nums leading-none text-emerald-400/80"
                style={{ fontSize: "clamp(8px, 2vw, 10px)" }}
              >
                +{formatNumber(Math.round(prod))}/h
              </span>
            )}
          </div>
        );
      })}

      {/* Divider */}
      <div className="w-px self-stretch bg-white/10" />

      {/* Gems + notification bell */}
      <div className="flex items-center gap-1 px-2">
        {live.gems > 0 && (
          <div className="flex items-center gap-[3px]">
            <ResourceIconSVG type="gems" size={12} />
            <span
              className="font-bold tabular-nums leading-none text-white/90"
              style={{ fontSize: "clamp(10px, 2.8vw, 12px)" }}
            >
              {formatNumber(Math.floor(live.gems))}
            </span>
          </div>
        )}
        <span className="pointer-events-auto">
          <NotificationBell />
        </span>
      </div>
    </div>
  );
}
