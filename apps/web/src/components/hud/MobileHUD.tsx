"use client";

import { useState } from "react";
import { useI18n } from "@/i18n";
import { ResourceBar } from "@/components/ui/ResourceBar";
import { SeasonHUD } from "@/components/game/SeasonHUD";
import { NotificationBell } from "@/components/game/NotificationBell";
import { SidebarNavIcon } from "@/components/ui/SidebarNavIcon";
import type { HudActions } from "./hudTypes";

export function MobileHUD({
  activeView,
  onViewChange,
  cityName,
  onRename,
  unreadCount,
  onOpenMail,
  onOpenAlliance,
  onOpenQuests,
  onOpenDailyQuests,
  onOpenRankings,
  onOpenWonder,
  onOpenAchievements,
  onOpenActivityFeed,
  onOpenSettings,
}: HudActions) {
  const { t } = useI18n();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const openFromSheet = (open: () => void) => {
    setIsMoreOpen(false);
    open();
  };

  const moreItems = [
    { icon: "📊", label: t("play.sidebar.ranking"), onClick: onOpenRankings },
    { icon: "📜", label: t("play.quests.title"), onClick: onOpenQuests },
    { icon: "📋", label: "Misiones", onClick: onOpenDailyQuests },
    { icon: "🏛️", label: "Maravilla", onClick: onOpenWonder },
    { icon: "🏆", label: "Logros", onClick: onOpenAchievements },
    { icon: "📰", label: "Feed", onClick: onOpenActivityFeed },
    { icon: "⚙️", label: t("play.settings.title"), onClick: onOpenSettings },
  ];

  const dockItems = [
    {
      id: "pueblo",
      label: t("play.sidebar.village"),
      icon: <SidebarNavIcon id="village" size={24} />,
      active: activeView === "pueblo",
      onClick: () => onViewChange("pueblo"),
    },
    {
      id: "mapa",
      label: t("play.sidebar.map"),
      icon: <SidebarNavIcon id="map" size={24} />,
      active: activeView === "mapa",
      onClick: () => onViewChange("mapa"),
    },
    {
      id: "mail",
      label: t("play.sidebar.mail"),
      icon: <SidebarNavIcon id="mail" size={24} />,
      badge: unreadCount,
      active: false,
      onClick: onOpenMail,
    },
    {
      id: "alliance",
      label: t("play.sidebar.alliances"),
      icon: <SidebarNavIcon id="army" size={24} />,
      active: false,
      onClick: onOpenAlliance,
    },
    {
      id: "more",
      label: t("play.mobile.more"),
      icon: <span style={{ fontSize: 22, lineHeight: 1 }}>⋯</span>,
      active: isMoreOpen,
      onClick: () => setIsMoreOpen((v) => !v),
    },
  ];

  return (
    <>
      {/* Compact top bar: city name + critical resources only */}
      <header className="village-topbar pointer-events-auto col-span-3 row-start-1 flex items-center gap-1 px-2 z-50 h-12">
        <SeasonHUD compact />
        <span
          className="shrink-0 max-w-[24vw] text-xs font-semibold text-stone-700 tracking-wide truncate select-none"
          onDoubleClick={onRename}
        >
          {cityName || t("play.sidebar.village")}
        </span>
        <div className="flex-1 min-w-0 flex items-center justify-end gap-1">
          <ResourceBar compact />
          <NotificationBell />
        </div>
      </header>

      {/* Bottom dock — thumb-first navigation */}
      <nav
        className="fixed bottom-0 inset-x-0 z-[60] flex items-stretch justify-around border-t border-white/10 bg-black/80 backdrop-blur-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {dockItems.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            className={`relative flex min-h-[52px] min-w-[52px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors duration-150 ${
              item.active ? "text-amber-400" : "text-white/55 active:text-white/90"
            }`}
          >
            {item.badge !== undefined && item.badge > 0 && (
              <span className="absolute top-0.5 right-[20%] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-sm">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
            {item.icon}
            <span className="text-[9px] font-medium leading-tight tracking-wide">{item.label}</span>
            {item.active && <span className="absolute top-0 inset-x-4 h-[2px] rounded-b bg-amber-400" />}
          </button>
        ))}
      </nav>

      {/* "More" bottom sheet */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-[59]" onClick={() => setIsMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div
            className="absolute inset-x-0 bottom-[52px] rounded-t-2xl border-t border-white/10 bg-[#0b0f0f]/95 backdrop-blur-xl px-4 pt-2 pb-4 shadow-[0_-18px_50px_rgba(0,0,0,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <div className="grid grid-cols-4 gap-2">
              {moreItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => openFromSheet(item.onClick)}
                  className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border border-white/8 bg-white/[0.04] px-1 py-2 text-white/80 active:bg-white/10"
                >
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  <span className="text-[10px] font-medium leading-tight text-center">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
