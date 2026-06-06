"use client";

import { useState } from "react";
import { SeasonHUD } from "@/components/game/SeasonHUD";
import { useI18n } from "@/i18n";

const NAV_LINK_KEYS = ["village", "map", "reports", "statistics"] as const;

export function TopNav() {
  const { t } = useI18n();
  const [active, setActive] = useState("village");

  return (
    <nav className="w-full bg-white/85 backdrop-blur-xl border-b border-stone-200/70">
      <div className="max-w-5xl mx-auto px-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-stone-700 px-3 py-2">Etheria</span>
            <div className="flex items-center gap-0.5">
              {NAV_LINK_KEYS.map((linkId) => (
                <button
                  key={linkId}
                  onClick={() => setActive(linkId)}
                  className={`px-3 py-2 text-xs font-semibold tracking-wide transition-all relative ${
                    active === linkId ? "text-amber-600" : "text-stone-400 hover:text-stone-700"
                  }`}
                >
                  {t(`play.topnav.${linkId}`)}
                  {active === linkId && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <SeasonHUD />
        </div>
      </div>
    </nav>
  );
}
