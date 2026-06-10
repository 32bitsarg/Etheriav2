"use client";

import { useMemo, useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { useWorldSeason, useWinterPressure } from "@/hooks/useCity";
import { useI18n } from "@/i18n";
import { getAllianceBuffs, getTechBuffs, getSeasonBuffs, getWinterDebuffs, getZoneBuffs, type ActiveBuff } from "@/lib/buffData";

function formatCountdown(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "0m";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function BuffIcon({ buff }: { buff: ActiveBuff }) {
  const [tapped, setTapped] = useState(false);
  return (
    <div className="relative group flex items-center">
      <button
        onClick={() => setTapped((prev) => !prev)}
        onBlur={() => setTapped(false)}
        className="text-base cursor-pointer leading-none min-h-[32px] min-w-[32px] flex items-center justify-center"
        aria-label={buff.label}
      >
        {buff.icon}
      </button>
      <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 z-[200] pointer-events-none ${tapped ? 'block' : 'hidden group-hover:block'}`}>
        <div className="bg-white border border-stone-200 rounded-xl p-3 text-xs min-w-[180px] max-w-[260px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-md">
          <div className={`font-bold text-sm mb-1 ${buff.type === "debuff" ? "text-red-600" : "text-emerald-600"}`}>
            {buff.label}
          </div>
          <div className="text-stone-600 leading-relaxed">{buff.description}</div>
          {buff.expiresAt && (
            <div className="text-amber-600 mt-1.5 text-[10px]">
              {formatCountdown(buff.expiresAt)}
            </div>
          )}
          <div className="text-stone-400 mt-1.5 text-[10px] uppercase tracking-wider">{buff.source}</div>
        </div>
      </div>
    </div>
  );
}

export function ActiveBuffsPanel() {
  const { t } = useI18n();
  const techBonuses = useGameStore((s) => s.techBonuses);
  const posX = useGameStore((s) => s.posX);
  const posY = useGameStore((s) => s.posY);
  const cityId = useGameStore((s) => s.cityId);
  const allianceMembership = useGameStore((s) => s.allianceMembership);
  const cachedSeasonState = useGameStore((s) => s.seasonState);

  const { data: seasonData } = useWorldSeason(false);
  const season = seasonData?.season ?? cachedSeasonState;
  const { data: winterData } = useWinterPressure(cityId, season?.currentSeason === "WINTER");

  const buffs = useMemo(() => {
    const result: ActiveBuff[] = [];

    result.push(...getAllianceBuffs((allianceMembership as any)?.effects ?? [], t));

    if (techBonuses) {
      result.push(...getTechBuffs(techBonuses, t));
    }

    if (season) {
      // Season modifiers are already shown in SeasonHUD - skip duplicated info
    }

    if (winterData) {
      result.push(...getWinterDebuffs(winterData, t));
    }

    if (posX && posY) {
      result.push(...getZoneBuffs(posX, posY, t));
    }

    return result;
  }, [techBonuses, allianceMembership, season, winterData, posX, posY, t]);

  if (buffs.length === 0) return null;

  return (
    <div className="pointer-events-auto flex items-center gap-1.5">
      {buffs.map((buff) => (
        <BuffIcon key={buff.id} buff={buff} />
      ))}
    </div>
  );
}
