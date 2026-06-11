export type HudView = "pueblo" | "mapa";

// Shared contract between MobileHUD and DesktopHUD: pure presentation on each
// side, all state stays in VillageView.
export type HudActions = {
  activeView: HudView;
  onViewChange: (view: HudView) => void;
  cityName: string;
  onRename: () => void;
  unreadCount: number;
  onOpenMail: () => void;
  onOpenAlliance: () => void;
  onOpenQuests: () => void;
  onOpenDailyQuests: () => void;
  onOpenRankings: () => void;
  onOpenWonder: () => void;
  onOpenAchievements: () => void;
  onOpenActivityFeed: () => void;
  onOpenSettings: () => void;
  onOpenChat: () => void;
  onOpenMarket?: () => void;
};
