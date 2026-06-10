"use client";

import { type ReactNode } from "react";
import { useI18n } from "@/i18n";
import { SidebarNavIcon } from "@/components/ui/SidebarNavIcon";

type SidebarNavIconId = "summary" | "village" | "buildings" | "army" | "research" | "map" | "quests" | "mail";

type NavItem = {
  id: string;
  icon: SidebarNavIconId;
  labelKey: string; // i18n key
  badge?: number;
};

interface MobileBottomNavProps {
  activeView: "pueblo" | "mapa";
  onViewChange: (view: "pueblo" | "mapa") => void;
  onRankingsOpen: () => void;
  onMailOpen: () => void;
  onAllianceOpen: () => void;
  unreadCount: number;
}

export function MobileBottomNav({
  activeView,
  onViewChange,
  onRankingsOpen,
  onMailOpen,
  onAllianceOpen,
  unreadCount,
}: MobileBottomNavProps) {
  const { t } = useI18n();

  const items: Array<NavItem & { onClick: () => void }> = [
    {
      id: "pueblo",
      icon: "village",
      labelKey: "play.sidebar.village",
      onClick: () => onViewChange("pueblo"),
    },
    {
      id: "mapa",
      icon: "map",
      labelKey: "play.sidebar.map",
      onClick: () => onViewChange("mapa"),
    },
    {
      id: "mail",
      icon: "mail",
      labelKey: "play.sidebar.mail",
      badge: unreadCount > 0 ? unreadCount : undefined,
      onClick: onMailOpen,
    },
    {
      id: "alliance",
      icon: "summary",
      labelKey: "play.sidebar.alliances",
      onClick: onAllianceOpen,
    },
    {
      id: "rankings",
      icon: "quests",
      labelKey: "play.sidebar.ranking",
      onClick: onRankingsOpen,
    },
  ];

  return (
    <nav className="mobile-bottom-nav fixed bottom-0 inset-x-0 z-[60] flex items-center justify-around border-t border-white/10 bg-black/85 backdrop-blur-xl safe-bottom md:hidden">
      {items.map((item) => {
        const isActive = item.id === activeView || item.id === "more"
          ? false
          : false;
        // Only "pueblo" and "mapa" show active state
        const active = item.id === activeView;

        return (
          <button
            key={item.id}
            onClick={item.onClick}
            className={`
              mobile-nav-item relative flex flex-col items-center justify-center gap-0.5
              min-h-[48px] min-w-[48px] px-1 py-1.5
              transition-colors duration-150
              ${active
                ? "text-amber-400"
                : "text-white/50 hover:text-white/80"
              }
            `}
          >
            {/* Badge */}
            {item.badge !== undefined && item.badge > 0 && (
              <span className="absolute -top-0.5 right-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-sm">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}

            {/* Icon */}
            <SidebarNavIcon
              id={item.icon}
              size={22}
              className={active ? "text-amber-400" : undefined}
            />

            {/* Label */}
            <span className="text-[9px] font-medium leading-tight tracking-wide">
              {t(item.labelKey)}
            </span>

            {/* Active indicator */}
            {active && (
              <span className="absolute top-0 inset-x-4 h-[2px] rounded-b bg-amber-400" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
