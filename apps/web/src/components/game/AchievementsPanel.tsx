"use client";

import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";

interface Achievement {
  key: string;
  title: string;
  summary: string;
  icon: string;
  points: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

export function AchievementsPanel({ onClose }: { onClose: () => void }) {
  const { data, isLoading } = useQuery<{ achievements: Achievement[] }>({
    queryKey: ["achievements"],
    queryFn: async () => {
      const res = await fetch("/api/achievements", { credentials: "include" });
      return res.ok ? res.json() : { achievements: [] };
    },
  });

  const unlocked = (data?.achievements ?? []).filter((a) => a.unlocked);
  const locked = (data?.achievements ?? []).filter((a) => !a.unlocked);
  const totalPoints = unlocked.reduce((s, a) => s + a.points, 0);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Logros"
      subtitle={`${unlocked.length} desbloqueados · ${totalPoints} puntos`}
      headerGradient="from-yellow-500 to-amber-500"
      headerIcon="🏆"
      contentClass="p-4 space-y-2"
    >
      {isLoading && <div className="py-8 text-center text-stone-400 text-sm">Cargando...</div>}

      {unlocked.length > 0 && (
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-1">Desbloqueados</p>
      )}
      {unlocked.map((a) => (
        <div key={a.key} className="flex items-center gap-3 p-3 rounded-xl bg-yellow-50 border border-yellow-200">
          <span className="text-2xl">{a.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-stone-700">{a.title}</p>
            <p className="text-xs text-stone-500">{a.summary}</p>
          </div>
          <span className="text-xs font-bold text-yellow-600 bg-yellow-100 rounded-lg px-2 py-1">+{a.points}p</span>
        </div>
      ))}

      {locked.length > 0 && (
        <p className="text-xs font-semibold text-stone-300 uppercase tracking-wider px-1 pt-2">Por desbloquear</p>
      )}
      {locked.map((a) => (
        <div key={a.key} className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100 opacity-60">
          <span className="text-2xl grayscale">{a.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-500">{a.title}</p>
            <p className="text-xs text-stone-400">{a.summary}</p>
          </div>
          <span className="text-xs font-medium text-stone-400">+{a.points}p</span>
        </div>
      ))}
    </Modal>
  );
}
