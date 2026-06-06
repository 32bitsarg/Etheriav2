"use client";

type SidebarNavIconId = "summary" | "village" | "buildings" | "army" | "research" | "map" | "quests" | "mail";

const ICON_PATH: Record<SidebarNavIconId, string> = {
  summary: "/assets/ui/nav-icons/summary.png",
  village: "/assets/ui/nav-icons/village.png",
  buildings: "/assets/ui/nav-icons/buildings.png",
  army: "/assets/ui/nav-icons/army.png",
  research: "/assets/ui/nav-icons/research.png",
  map: "/assets/ui/nav-icons/map.png",
  quests: "/assets/ui/nav-icons/quests.png",
  mail: "/assets/ui/sidebar/mail-seal.png",
};

export function SidebarNavIcon({
  id,
  size = 28,
  className = "",
}: {
  id: SidebarNavIconId;
  size?: number;
  className?: string;
}) {
  const iconPath = ICON_PATH[id];

  return (
    <span
      className={`inline-block ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${iconPath})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: `${size}px ${size}px`,
      }}
    />
  );
}
