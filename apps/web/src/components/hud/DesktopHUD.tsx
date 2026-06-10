"use client";

import { useEffect } from "react";
import { useI18n } from "@/i18n";
import { ResourceBar } from "@/components/ui/ResourceBar";
import { SeasonHUD } from "@/components/game/SeasonHUD";
import { ActiveBuffsPanel } from "@/components/game/ActiveBuffsPanel";
import { DailyEventBanner } from "@/components/game/DailyEventBanner";
import { NotificationBell } from "@/components/game/NotificationBell";
import { SidebarNavIcon } from "@/components/ui/SidebarNavIcon";
import { ChecklistIcon, WonderIcon, LaurelsIcon, FeedIcon, GearIcon, SpeechIcon } from "./HudIcons";
import type { HudActions } from "./hudTypes";

// HUD v3 (desktop): no full-width topbar — the game takes the whole viewport
// and the HUD floats in three corner clusters plus a grouped sidebar.
export function DesktopHUD({
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

  // Keyboard shortcuts (desktop only): V village, M map
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "m") onViewChange("mapa");
      else if (key === "v") onViewChange("pueblo");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onViewChange]);

  const navGroups: {
    label: string;
    items: { key: string; icon: React.ReactNode; label: string; onClick: () => void; active?: boolean; badge?: number; title?: string }[];
  }[] = [
    {
      label: t("play.hud.groups.views"),
      items: [
        { key: "pueblo", icon: <SidebarNavIcon id="village" size={22} />, label: t("play.sidebar.village"), onClick: () => onViewChange("pueblo"), active: activeView === "pueblo", title: `${t("play.sidebar.village")} (V)` },
        { key: "mapa", icon: <SidebarNavIcon id="map" size={22} />, label: t("play.sidebar.map"), onClick: () => onViewChange("mapa"), active: activeView === "mapa", title: `${t("play.sidebar.map")} (M)` },
      ],
    },
    {
      label: t("play.hud.groups.social"),
      items: [
        { key: "mail", icon: <SidebarNavIcon id="mail" size={22} />, label: t("play.sidebar.mail"), onClick: onOpenMail, badge: unreadCount },
        { key: "chat", icon: <SpeechIcon className="h-[22px] w-[22px]" />, label: t("play.chat.title"), onClick: onOpenChat },
        { key: "alliance", icon: <SidebarNavIcon id="army" size={22} />, label: t("play.sidebar.alliances"), onClick: onOpenAlliance },
      ],
    },
    {
      label: t("play.hud.groups.progress"),
      items: [
        { key: "quests", icon: <SidebarNavIcon id="quests" size={22} />, label: t("play.quests.title"), onClick: onOpenQuests },
        { key: "daily", icon: <ChecklistIcon className="h-[22px] w-[22px]" />, label: t("play.sidebar.dailyQuests"), onClick: onOpenDailyQuests },
        { key: "achievements", icon: <LaurelsIcon className="h-[22px] w-[22px]" />, label: t("play.sidebar.achievements"), onClick: onOpenAchievements },
        { key: "wonder", icon: <WonderIcon className="h-[22px] w-[22px]" />, label: t("play.sidebar.wonder"), onClick: onOpenWonder },
      ],
    },
    {
      label: t("play.hud.groups.world"),
      items: [
        { key: "ranking", icon: <SidebarNavIcon id="summary" size={22} />, label: t("play.sidebar.ranking"), onClick: onOpenRankings },
        { key: "feed", icon: <FeedIcon className="h-[22px] w-[22px]" />, label: t("play.sidebar.feed"), onClick: onOpenActivityFeed },
      ],
    },
  ];

  return (
    <>
      {/* Top-left: city plaque + season + buffs/event */}
      <div className="pointer-events-none absolute left-[88px] top-3 z-50 flex items-center gap-2">
        <button
          onDoubleClick={onRename}
          title={t("play.sidebar.renameHint")}
          className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b0f0e]/80 px-3.5 py-2 backdrop-blur-xl"
        >
          <span className="max-w-[220px] truncate text-[13px] font-bold tracking-wide text-amber-100">
            {cityName || t("play.sidebar.village")}
          </span>
        </button>
        <SeasonHUD />
        <ActiveBuffsPanel />
        <DailyEventBanner />
      </div>

      {/* Top-center: floating resources with hover detail */}
      <div className="pointer-events-none absolute left-1/2 top-3 z-50 hidden -translate-x-1/2 xl:block">
        <span className="pointer-events-auto inline-block rounded-2xl bg-[#0b0f0e]/80 backdrop-blur-xl"><ResourceBar /></span>
      </div>

      {/* Top-right: resources (smaller screens) + bell + settings */}
      <div className="pointer-events-none absolute right-3 top-3 z-50 flex items-center gap-2">
        <span className="pointer-events-auto inline-block rounded-2xl bg-[#0b0f0e]/80 backdrop-blur-xl xl:hidden"><ResourceBar /></span>
        <span className="pointer-events-auto"><NotificationBell /></span>
        <button
          onClick={onOpenSettings}
          title={t("play.settings.title")}
          className="pointer-events-auto grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-[#0b0f0e]/80 backdrop-blur-xl transition-colors hover:bg-white/15"
        >
          <GearIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Left sidebar: grouped navigation */}
      <aside className="grepolis-sidebar village-sidebar">
        <nav className="grepolis-sidebar__nav relative pb-2">
          {navGroups.map((group, gi) => (
            <div key={group.label}>
              {gi > 0 && <div className="grepolis-sidebar__divider" />}
              <div className="grepolis-sidebar__group-label">{group.label}</div>
              {group.items.map((item) => (
                <button
                  key={item.key}
                  onClick={item.onClick}
                  title={item.title ?? item.label}
                  className={`grepolis-nav-item ${item.active ? "active" : ""}`}
                >
                  <span className="grepolis-nav-item__icon-wrap relative">
                    {item.icon}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="grepolis-nav-item__badge">{item.badge}</span>
                    )}
                  </span>
                  <span className="grepolis-nav-item__label">{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
