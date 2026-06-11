"use client";

import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/i18n";

interface FeedEntry {
  id: string;
  type: string;
  actorName: string;
  payload: Record<string, string>;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  CITY_CONQUERED: "⚔️",
  WONDER_CAPTURED: "🏛️",
  WONDER_SIEGE_STARTED: "🏛️",
  WONDER_VICTORY: "👑",
  BATTLE_MAJOR_VICTORY: "⚔️",
  BARBARIAN_CAMP_CLEARED: "🏕️",
  ALLIANCE_FORMED: "🤝",
  PLAYER_JOINED: "👋",
  FIRST_VICTORY: "🏆",
  RALLY_LAUNCHED: "🚩",
  ACHIEVEMENT_UNLOCKED: "🥇",
};

export function ActivityFeedPanel({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();

  function formatEntry(entry: FeedEntry): string {
    switch (entry.type) {
      case "CITY_CONQUERED": return `${t("play.activityFeed.conquered")} ${entry.payload.defenderName ?? ""}`;
      case "WONDER_CAPTURED": return t("play.feed.WONDER_CAPTURED");
      case "WONDER_SIEGE_STARTED": return t("play.feed.WONDER_SIEGE_STARTED");
      case "WONDER_VICTORY": return t("play.feed.WONDER_VICTORY");
      case "BATTLE_MAJOR_VICTORY": return `${t("play.feed.BATTLE_MAJOR_VICTORY")} ${entry.payload.defenderName ?? ""}`;
      case "BARBARIAN_CAMP_CLEARED": return t("play.feed.BARBARIAN_CAMP_CLEARED");
      case "ALLIANCE_FORMED": return t("play.feed.ALLIANCE_FORMED");
      case "PLAYER_JOINED": return t("play.feed.PLAYER_JOINED");
      case "RALLY_LAUNCHED": return t("play.activityFeed.rally");
      default: return t("play.activityFeed.action");
    }
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return t("play.activityFeed.now");
    if (m < 60) return t("play.activityFeed.minutesAgo").replace("{m}", String(m));
    const h = Math.floor(m / 60);
    if (h < 24) return t("play.activityFeed.hoursAgo").replace("{h}", String(h));
    return t("play.activityFeed.daysAgo").replace("{d}", String(Math.floor(h / 24)));
  }

  const { data, isLoading } = useQuery<{ feed: FeedEntry[] }>({
    queryKey: ["activity-feed"],
    queryFn: async () => {
      const res = await fetch("/api/activity?limit=50", { credentials: "include" });
      return res.ok ? res.json() : { feed: [] };
    },
    refetchInterval: 30000,
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("play.activityFeed.title")}
      subtitle={t("play.activityFeed.subtitle")}
      headerGradient="from-slate-700 to-slate-800"
      headerIcon="📰"
      contentClass="p-0"
    >
      {isLoading && <div className="py-8 text-center text-stone-400 text-sm">{t("play.activityFeed.loading")}</div>}
      {(data?.feed ?? []).length === 0 && !isLoading && (
        <div className="py-8 text-center text-stone-400 text-sm">{t("play.activityFeed.empty")}</div>
      )}
      <ul className="divide-y divide-stone-50">
        {(data?.feed ?? []).map((entry) => (
          <li key={entry.id} className="flex items-start gap-3 px-4 py-3">
            <span className="text-xl mt-0.5 flex-shrink-0">{TYPE_ICONS[entry.type] ?? "🌐"}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-stone-700">
                <span className="font-semibold">{entry.actorName}</span>{" "}
                {formatEntry(entry)}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">{timeAgo(entry.createdAt)}</p>
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
