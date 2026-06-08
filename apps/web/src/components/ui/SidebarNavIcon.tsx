"use client";

type SidebarNavIconId = "summary" | "village" | "buildings" | "army" | "research" | "map" | "quests" | "mail";

const ICON_PATH: Record<SidebarNavIconId, string> = {
  summary: "/assets/ui/nav-icons/summary.webp",
  village: "/assets/ui/nav-icons/village.webp",
  buildings: "/assets/ui/nav-icons/buildings.webp",
  army: "/assets/ui/nav-icons/army.webp",
  research: "/assets/ui/nav-icons/research.webp",
  map: "/assets/ui/nav-icons/map.webp",
  quests: "/assets/ui/nav-icons/quests.webp",
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
