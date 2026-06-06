"use client";

import { useQuery } from "@tanstack/react-query";
import { useGameStore } from "@/stores/gameStore";
import { Modal } from "@/components/ui/Modal";

interface RankingRow {
  rank: number;
  cityId: string;
  cityName: string;
  playerName: string;
  power: number;
}

export function RankingsPanel({ onClose }: { onClose: () => void }) {
  const cityId = useGameStore((s) => s.cityId);

  const { data, isLoading } = useQuery<{ rankings: RankingRow[] }>({
    queryKey: ["rankings"],
    queryFn: async () => {
      const res = await fetch("/api/rankings", { credentials: "include" });
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    staleTime: 60000,
    refetchInterval: 120000,
  });

  const { data: myRank } = useQuery<{ rank: number; power: number; total: number }>({
    queryKey: ["my-rank", cityId],
    queryFn: async () => {
      const res = await fetch(`/api/rankings/my-rank?cityId=${cityId}`, { credentials: "include" });
      if (!res.ok) return { rank: 0, power: 0, total: 0 };
      return res.json();
    },
    enabled: !!cityId,
    staleTime: 60000,
  });

  const myRow = data?.rankings.find((r) => r.cityId === cityId);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Rankings Globales"
      subtitle={myRank && myRank.rank > 0 ? `Tu posición: #${myRank.rank} de ${myRank.total} · ${myRank.power.toLocaleString()} poder` : undefined}
      headerGradient="from-violet-600 to-purple-600"
      headerIcon="📊"
      contentClass="p-0"
    >
      {myRow && (
        <div className="px-4 py-3 bg-violet-50 border-b border-violet-100 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-violet-600 text-white text-sm font-bold flex items-center justify-center">
            #{myRow.rank}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-800 truncate">{myRow.cityName}</p>
            <p className="text-xs text-stone-500">{myRow.playerName}</p>
          </div>
          <span className="text-sm font-bold text-violet-600">{myRow.power.toLocaleString()}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-stone-400 text-sm">Calculando rankings...</div>
      ) : (
        <ul className="divide-y divide-stone-50">
          {(data?.rankings ?? []).slice(0, 100).map((row) => {
            const isMe = row.cityId === cityId;
            const medal = row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : null;
            return (
              <li key={row.cityId} className={`flex items-center gap-3 px-4 py-2.5 ${isMe ? "bg-violet-50" : "hover:bg-stone-50"}`}>
                <span className="w-7 text-center text-sm font-bold text-stone-400">
                  {medal ?? `#${row.rank}`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isMe ? "text-violet-700" : "text-stone-700"}`}>{row.cityName}</p>
                  <p className="text-xs text-stone-400 truncate">{row.playerName}</p>
                </div>
                <span className={`text-sm font-bold ${isMe ? "text-violet-600" : "text-stone-500"}`}>
                  {row.power.toLocaleString()}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
