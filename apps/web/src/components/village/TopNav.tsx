"use client";

import { useState } from "react";
import { SeasonHUD } from "@/components/game/SeasonHUD";
import { useI18n } from "@/i18n";

const NAV_LINK_KEYS = ["village", "map", "reports", "statistics"] as const;

export function TopNav() {
  const { t } = useI18n();
  const [active, setActive] = useState("village");

  return (
    <nav className="w-full bg-gradient-to-b from-etheria-wood-panel to-etheria-panel border-b-2 border-etheria-border-gold">
      <div className="max-w-5xl mx-auto px-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <span className="text-sm font-decorative text-etheria-gold px-3 py-2 tracking-wider">Etheria</span>
            <div className="flex items-center gap-0.5">
              {NAV_LINK_KEYS.map((linkId) => (
                <button
                  key={linkId}
                  onClick={() => setActive(linkId)}
                  className={`px-3 py-2 text-xs font-display font-semibold tracking-wide transition-all relative ${
                    active === linkId ? "text-etheria-gold" : "text-etheria-text-dim hover:text-etheria-text"
                  }`}
                >
                  {t(`play.topnav.${linkId}`)}
                  {active === linkId && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-etheria-gold" />
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
