"use client";

import { useState, memo } from "react";
import { useI18n } from "@/i18n";
import { MobileResourcePills } from "./MobileResourcePills";
import { SeasonHUD } from "@/components/game/SeasonHUD";
import { SidebarNavIcon } from "@/components/ui/SidebarNavIcon";
import { ChecklistIcon, WonderIcon, LaurelsIcon, FeedIcon, GearIcon, SpeechIcon } from "./HudIcons";
import { ScrollIcon } from "@/components/landing/MedievalIcons";
import { DailyEventBanner } from "@/components/game/DailyEventBanner";
import { useViewportTier } from "@/hooks/useViewportTier";
import type { HudActions } from "./hudTypes";

// Strip height: 36px (XS) / 40px (SM) / 44px (MD) + safe-area-top
// City plaque sits immediately below the strip.
const STRIP_H: Record<string, number> = { xs: 36, sm: 40, md: 44 };
// Dock height per tier
const DOCK_H: Record<string, number> = { xs: 44, sm: 48, md: 52 };

export const MobileHUD = memo(function MobileHUD({
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
  onOpenMarket,
  onOpenWeeklyEvents,
}: HudActions) {
  const { t } = useI18n();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const tier = useViewportTier();
  const stripH = STRIP_H[tier] ?? 40;
  const dockH  = DOCK_H[tier]  ?? 48;
  const showLabels = tier !== "xs";

  const openFromSheet = (open: () => void) => {
    setIsMoreOpen(false);
    open();
  };

  // ── More sheet items (7 — infrequent actions) ──────────────────────────────
  const moreItems = [
    { icon: <SidebarNavIcon id="summary" size={20} />, label: t("play.sidebar.ranking"),        onClick: onOpenRankings },
    { icon: <ChecklistIcon className="h-5 w-5" />,      label: t("play.sidebar.dailyQuests"),   onClick: onOpenDailyQuests },
    { icon: <WonderIcon className="h-5 w-5" />,         label: t("play.sidebar.wonder"),        onClick: onOpenWonder },
    { icon: <LaurelsIcon className="h-5 w-5" />,        label: t("play.sidebar.achievements"),  onClick: onOpenAchievements },
    { icon: <FeedIcon className="h-5 w-5" />,           label: t("play.sidebar.feed"),          onClick: onOpenActivityFeed },
    ...(onOpenMarket ? [{ icon: <span style={{ fontSize: 18 }}>⚖️</span>, label: t("play.sidebar.market"), onClick: onOpenMarket }] : []),
    { icon: <GearIcon className="h-5 w-5" />,           label: t("play.settings.title"),        onClick: onOpenSettings },
  ];

  // ── Main dock: 7 direct items (was 5) ─────────────────────────────────────
  const iconSz = tier === "xs" ? 20 : tier === "sm" ? 21 : 22;

  const dockItems = [
    {
      id: "pueblo",
      label: t("play.sidebar.village"),
      icon: <SidebarNavIcon id="village" size={iconSz} />,
      active: activeView === "pueblo",
      onClick: () => onViewChange("pueblo"),
    },
    {
      id: "mapa",
      label: t("play.sidebar.map"),
      icon: <SidebarNavIcon id="map" size={iconSz} />,
      active: activeView === "mapa",
      onClick: () => onViewChange("mapa"),
    },
    {
      id: "alliance",
      label: t("play.sidebar.alliances"),
      icon: <SidebarNavIcon id="army" size={iconSz} />,
      active: false,
      onClick: onOpenAlliance,
    },
    {
      id: "mail",
      label: t("play.sidebar.mail"),
      icon: <SidebarNavIcon id="mail" size={iconSz} />,
      badge: unreadCount,
      active: false,
      onClick: onOpenMail,
    },
    {
      id: "chat",
      label: t("play.chat.title"),
      icon: <SpeechIcon className={`h-[${iconSz}px] w-[${iconSz}px]`} />,
      active: false,
      onClick: onOpenChat,
    },
    {
      id: "quests",
      label: t("play.quests.title"),
      icon: <ScrollIcon className={`h-[${iconSz}px] w-[${iconSz}px]`} />,
      active: false,
      onClick: onOpenQuests,
    },
    {
      id: "more",
      label: t("play.mobile.more"),
      icon: <span style={{ fontSize: iconSz - 1, lineHeight: 1 }}>⋯</span>,
      active: isMoreOpen,
      onClick: () => setIsMoreOpen((v) => !v),
    },
  ];

  return (
    <>
      {/* ── Resource strip + NotificationBell (in MobileResourcePills) ─────── */}
      <MobileResourcePills />

      {/* ── City plaque — below the strip ────────────────────────────────── */}
      <div
        className="pointer-events-none absolute left-2 z-[44] flex items-center gap-1.5"
        style={{ top: `calc(env(safe-area-inset-top, 0px) + ${stripH + 6}px)` }}
      >
        <button
          className="pointer-events-auto flex max-w-[52vw] items-center gap-1.5 rounded-xl border border-white/10 bg-black/60 px-2.5 py-1.5 backdrop-blur-md"
          style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.5)" }}
          onClick={onRename}
        >
          <span className="truncate text-[12px] font-bold text-amber-200">
            {cityName || t("play.sidebar.village")}
          </span>
        </button>
        <span className="pointer-events-auto"><SeasonHUD compact /></span>
        {tier !== "xs" && (
          <span className="pointer-events-auto">
            <DailyEventBanner compact onOpenSchedule={onOpenWeeklyEvents} />
          </span>
        )}
      </div>

      {/* ── Bottom navigation dock ────────────────────────────────────────── */}
      <nav
        className="pointer-events-auto fixed inset-x-2 z-[60] flex items-center rounded-2xl border border-white/12 bg-black/72 shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)",
          height: `${dockH}px`,
          // Expose dock height as CSS variable for VillageImmersiveDock
          // @ts-ignore
          "--dock-h": `${dockH + 8}px`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {dockItems.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-[2px] transition-colors duration-150 ${
              item.active ? "text-amber-300" : "text-white/55 active:text-white/90"
            }`}
            style={{
              height: "100%",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {item.active && (
              <span className="absolute inset-x-1 inset-y-1 rounded-xl bg-amber-400/15" />
            )}
            {item.badge !== undefined && item.badge > 0 && (
              <span className="absolute top-1 right-[16%] z-10 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-bold text-white leading-none">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
            <span className="relative">{item.icon}</span>
            {showLabels && (
              <span
                className="relative truncate px-0.5 font-medium leading-none tracking-wide"
                style={{ fontSize: `clamp(7px, 1.9vw, 9px)` }}
              >
                {item.label}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* ── "Más" bottom sheet (7 infrequent items in 2 rows of 4) ────────── */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-[59]" onClick={() => setIsMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div
            className="absolute inset-x-0 rounded-t-2xl border-t border-white/10 bg-[#0b0f0f]/95 backdrop-blur-xl px-3 pt-2 pb-3 shadow-[0_-18px_50px_rgba(0,0,0,0.6)]"
            style={{ bottom: `calc(${dockH + 12}px + env(safe-area-inset-bottom, 0px))` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <div className="grid grid-cols-4 gap-2">
              {moreItems.slice(0, -1).map((item) => (
                <button
                  key={item.label}
                  onClick={() => openFromSheet(item.onClick)}
                  className="flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-xl border border-white/8 bg-white/[0.04] px-1 py-2 text-white/80 active:bg-white/10"
                >
                  <span style={{ fontSize: 19 }}>{item.icon}</span>
                  <span className="text-[10px] font-medium leading-tight text-center">{item.label}</span>
                </button>
              ))}
            </div>
            {/* Settings — separated at the bottom */}
            {moreItems.length > 0 && (() => {
              const settings = moreItems[moreItems.length - 1];
              return (
                <div className="mt-2 border-t border-white/8 pt-2">
                  <button
                    onClick={() => openFromSheet(settings.onClick)}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-white/70 active:bg-white/10"
                  >
                    <span style={{ fontSize: 18 }}>{settings.icon}</span>
                    <span className="text-[11px] font-medium">{settings.label}</span>
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
});
