"use client";

import { useState } from "react";
import { useI18n } from "@/i18n";
import { ResourceBar } from "@/components/ui/ResourceBar";
import { SeasonHUD } from "@/components/game/SeasonHUD";
import { NotificationBell } from "@/components/game/NotificationBell";
import { SidebarNavIcon } from "@/components/ui/SidebarNavIcon";
import { ChecklistIcon, WonderIcon, LaurelsIcon, FeedIcon, GearIcon, SpeechIcon } from "./HudIcons";
import { ScrollIcon } from "@/components/landing/MedievalIcons";
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
  onOpenChat,
}: HudActions) {
  const { t } = useI18n();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const openFromSheet = (open: () => void) => {
    setIsMoreOpen(false);
    open();
  };

  const moreItems = [
    { icon: <SidebarNavIcon id="army" size={20} />, label: t("play.sidebar.alliances"), onClick: onOpenAlliance },
    { icon: <SidebarNavIcon id="summary" size={20} />, label: t("play.sidebar.ranking"), onClick: onOpenRankings },
    { icon: <ScrollIcon className="h-5 w-5" />, label: t("play.quests.title"), onClick: onOpenQuests },
    { icon: <ChecklistIcon className="h-5 w-5" />, label: t("play.sidebar.dailyQuests"), onClick: onOpenDailyQuests },
    { icon: <WonderIcon className="h-5 w-5" />, label: t("play.sidebar.wonder"), onClick: onOpenWonder },
    { icon: <LaurelsIcon className="h-5 w-5" />, label: t("play.sidebar.achievements"), onClick: onOpenAchievements },
    { icon: <FeedIcon className="h-5 w-5" />, label: t("play.sidebar.feed"), onClick: onOpenActivityFeed },
    { icon: <GearIcon className="h-5 w-5" />, label: t("play.settings.title"), onClick: onOpenSettings },
  ];

  const dockItems = [
    {
      id: "pueblo",
      label: t("play.sidebar.village"),
      icon: <SidebarNavIcon id="village" size={21} />,
      active: activeView === "pueblo",
      onClick: () => onViewChange("pueblo"),
    },
    {
      id: "mapa",
      label: t("play.sidebar.map"),
      icon: <SidebarNavIcon id="map" size={21} />,
      active: activeView === "mapa",
      onClick: () => onViewChange("mapa"),
    },
    {
      id: "chat",
      label: t("play.chat.title"),
      icon: <SpeechIcon className="h-[21px] w-[21px]" />,
      active: false,
      onClick: onOpenChat,
    },
    {
      id: "mail",
      label: t("play.sidebar.mail"),
      icon: <SidebarNavIcon id="mail" size={21} />,
      badge: unreadCount,
      active: false,
      onClick: onOpenMail,
    },
    {
      id: "more",
      label: t("play.mobile.more"),
      icon: <span style={{ fontSize: 20, lineHeight: 1 }}>⋯</span>,
      active: isMoreOpen,
      onClick: () => setIsMoreOpen((v) => !v),
    },
  ];

  return (
    <>
      {/* Topbar: recursos a ancho completo + campana (el nombre vive en su placa) */}
      <header
        className="pointer-events-auto col-span-3 row-start-1 z-50 flex h-12 items-center gap-1.5 border-b border-white/10 bg-black/70 px-1.5 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <ResourceBar compact dark />
        <NotificationBell />
      </header>

      {/* Placa de ciudad: nombre grande y legible + estación, flotando bajo la topbar */}
      <div
        className="pointer-events-none absolute left-1.5 z-40 flex items-center gap-1.5"
        style={{ top: "calc(var(--topbar-height) + env(safe-area-inset-top, 0px) + 6px)" }}
      >
        <button
          className="pointer-events-auto flex max-w-[52vw] items-center gap-1.5 rounded-xl border border-white/10 bg-black/65 px-2.5 py-1.5 backdrop-blur-md"
          onClick={onRename}
        >
          <span className="truncate text-[12px] font-bold text-amber-200">
            {cityName || t("play.sidebar.village")}
          </span>
        </button>
        <span className="pointer-events-auto"><SeasonHUD compact /></span>
      </div>

      {/* Dock inferior: 44px, sin scroll, highlight tipo pill */}
      <nav
        className="fixed bottom-0 inset-x-0 z-[60] flex items-stretch overflow-hidden border-t border-white/10 bg-gradient-to-t from-black/95 to-black/75 backdrop-blur-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {dockItems.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            className={`relative flex h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 transition-colors duration-150 ${
              item.active ? "text-amber-300" : "text-white/55 active:text-white/90"
            }`}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {item.active && (
              <span className="absolute inset-x-2 inset-y-1 rounded-xl bg-amber-400/12" />
            )}
            {item.badge !== undefined && item.badge > 0 && (
              <span className="absolute top-0.5 right-[22%] z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-bold text-white">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
            <span className="relative">{item.icon}</span>
            <span className="relative truncate px-0.5 text-[8px] font-medium leading-none tracking-wide">
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Bottom sheet "Más" */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-[59]" onClick={() => setIsMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div
            className="absolute inset-x-0 rounded-t-2xl border-t border-white/10 bg-[#0b0f0f]/95 backdrop-blur-xl px-4 pt-2 pb-3 shadow-[0_-18px_50px_rgba(0,0,0,0.6)]"
            style={{ bottom: "calc(44px + env(safe-area-inset-bottom, 0px))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <div className="grid grid-cols-4 gap-2">
              {moreItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => openFromSheet(item.onClick)}
                  className="flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-xl border border-white/8 bg-white/[0.04] px-1 py-2 text-white/80 active:bg-white/10"
                >
                  <span style={{ fontSize: 19 }}>{item.icon}</span>
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
