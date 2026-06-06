"use client";

import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";

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
  FIRST_VICTORY: "🏆",
  RALLY_LAUNCHED: "🚩",
  ACHIEVEMENT_UNLOCKED: "🥇",
};

function formatEntry(entry: FeedEntry): string {
  switch (entry.type) {
    case "CITY_CONQUERED": return `conquistó la ciudad de ${entry.payload.defenderName}`;
    case "WONDER_CAPTURED": return `capturó La Maravilla`;
    case "RALLY_LAUNCHED": return `lanzó un rally de alianza`;
    default: return `realizó una acción`;
  }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

export function ActivityFeedPanel({ onClose }: { onClose: () => void }) {
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
      title="Feed Global"
      subtitle="Lo que pasa en el mundo"
      headerGradient="from-slate-700 to-slate-800"
      headerIcon="📰"
      contentClass="p-0"
    >
      {isLoading && <div className="py-8 text-center text-stone-400 text-sm">Cargando...</div>}
      {(data?.feed ?? []).length === 0 && !isLoading && (
        <div className="py-8 text-center text-stone-400 text-sm">Aún no hay actividad</div>
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
