"use client";

import { useEffect } from "react";
import { useI18n } from "@/i18n";
import { ResourceBar } from "@/components/ui/ResourceBar";
import { SeasonHUD } from "@/components/game/SeasonHUD";
import { ActiveBuffsPanel } from "@/components/game/ActiveBuffsPanel";
import { DailyEventBanner } from "@/components/game/DailyEventBanner";
import { NotificationBell } from "@/components/game/NotificationBell";
import { SidebarNavIcon } from "@/components/ui/SidebarNavIcon";
import type { HudActions } from "./hudTypes";

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

  return (
    <>
      {/* Top Bar — full width, grid row 1 */}
      <header className="village-topbar pointer-events-auto col-span-3 row-start-1 flex items-center gap-2 px-4 z-50 h-12">
        <div className="flex items-center gap-2 shrink-0">
          <SeasonHUD />
          <ActiveBuffsPanel />
          <DailyEventBanner />
        </div>
        <span
          className="flex-1 text-center text-sm font-semibold text-stone-700 tracking-wide truncate cursor-pointer hover:text-amber-600 select-none"
          onDoubleClick={onRename}
          title="Doble click para renombrar"
        >
          {cityName || t("play.sidebar.village")}
        </span>
        <div className="shrink-0 flex items-center gap-2">
          <ResourceBar />
          <NotificationBell />
        </div>
      </header>

      <aside className="grepolis-sidebar village-sidebar">
        <nav className="grepolis-sidebar__nav relative pb-2">
          {/* View switchers */}
          <button onClick={() => onViewChange("pueblo")} title={`${t("play.sidebar.village")} (V)`} className={`grepolis-nav-item ${activeView === "pueblo" ? "active" : ""}`}>
            <span className="grepolis-nav-item__icon-wrap">
              <SidebarNavIcon id="village" size={22} />
            </span>
            <span className="grepolis-nav-item__label">{t("play.sidebar.village")}</span>
          </button>
          <button onClick={() => onViewChange("mapa")} title={`${t("play.sidebar.map")} (M)`} className={`grepolis-nav-item ${activeView === "mapa" ? "active" : ""}`}>
            <span className="grepolis-nav-item__icon-wrap">
              <SidebarNavIcon id="map" size={22} />
            </span>
            <span className="grepolis-nav-item__label">{t("play.sidebar.map")}</span>
          </button>

          <div className="grepolis-sidebar__divider" />

          <button onClick={onOpenRankings} className="grepolis-nav-item">
            <span className="grepolis-nav-item__icon-wrap">
              <SidebarNavIcon id="summary" size={22} />
            </span>
            <span className="grepolis-nav-item__label">{t("play.sidebar.ranking")}</span>
          </button>
          <button onClick={onOpenMail} className="grepolis-nav-item">
            <span className="grepolis-nav-item__icon-wrap relative">
              <SidebarNavIcon id="mail" size={22} />
              {unreadCount > 0 && (
                <span className="grepolis-nav-item__badge">{unreadCount}</span>
              )}
            </span>
            <span className="grepolis-nav-item__label">{t("play.sidebar.mail")}</span>
          </button>
          <button onClick={onOpenQuests} className="grepolis-nav-item">
            <span className="grepolis-nav-item__icon-wrap">
              <SidebarNavIcon id="quests" size={22} />
            </span>
            <span className="grepolis-nav-item__label">{t("play.quests.title")}</span>
          </button>
          <button onClick={onOpenAlliance} className="grepolis-nav-item">
            <span className="grepolis-nav-item__icon-wrap">
              <SidebarNavIcon id="army" size={22} />
            </span>
            <span className="grepolis-nav-item__label">{t("play.sidebar.alliances")}</span>
          </button>

          <div className="grepolis-sidebar__divider" />

          <button onClick={onOpenDailyQuests} className="grepolis-nav-item">
            <span className="grepolis-nav-item__icon-wrap"><span style={{ fontSize: 20 }}>📋</span></span>
            <span className="grepolis-nav-item__label">Misiones</span>
          </button>
          <button onClick={onOpenWonder} className="grepolis-nav-item">
            <span className="grepolis-nav-item__icon-wrap"><span style={{ fontSize: 20 }}>🏛️</span></span>
            <span className="grepolis-nav-item__label">Maravilla</span>
          </button>
          <button onClick={onOpenAchievements} className="grepolis-nav-item">
            <span className="grepolis-nav-item__icon-wrap"><span style={{ fontSize: 20 }}>🏆</span></span>
            <span className="grepolis-nav-item__label">Logros</span>
          </button>
          <button onClick={onOpenActivityFeed} className="grepolis-nav-item">
            <span className="grepolis-nav-item__icon-wrap"><span style={{ fontSize: 20 }}>📰</span></span>
            <span className="grepolis-nav-item__label">Feed</span>
          </button>

          <div className="grepolis-sidebar__divider" />

          <button onClick={onOpenSettings} className="grepolis-nav-item">
            <span className="grepolis-nav-item__icon-wrap">
              <span style={{ fontSize: 20 }}>⚙️</span>
            </span>
            <span className="grepolis-nav-item__label">{t("play.settings.title")}</span>
          </button>
        </nav>
      </aside>
    </>
  );
}
