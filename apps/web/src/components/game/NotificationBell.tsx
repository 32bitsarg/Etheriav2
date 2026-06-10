"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  BUILD_COMPLETE: "🏗️",
  TRAINING_COMPLETE: "⚔️",
  UNDER_ATTACK: "🚨",
  BATTLE_RESULT: "⚔️",
  RALLY_INVITE: "🚩",
  RALLY_LAUNCHED: "🚩",
  CITY_CONQUERED: "👑",
  SPY_RESULT: "🕵️",
  DAILY_QUEST_RESET: "📋",
  ACHIEVEMENT_UNLOCKED: "🏆",
  RANKED_OVERTAKEN: "📊",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data } = useQuery<{ notifications: Notification[] }>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return { notifications: [] };
      return res.json();
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const unread = (data?.notifications ?? []).filter((n) => !n.read).length;

  const markAllRead = useMutation({
    mutationFn: () => fetch("/api/notifications/read-all", { method: "POST", credentials: "include" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => fetch(`/api/notifications/${id}/read`, { method: "POST", credentials: "include" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    if (!open) return;
    if (unread > 0) markAllRead.mutate();
  }, [open]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Notificaciones"
      >
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-80 max-h-[420px] overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-xl shadow-stone-200/60">
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-stone-100 px-4 py-3 flex items-center justify-between">
              <span className="font-semibold text-sm text-stone-700">Notificaciones</span>
              {unread > 0 && (
                <span className="text-xs text-amber-600 font-medium">{unread} nuevas</span>
              )}
            </div>
            {(data?.notifications ?? []).length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-stone-400">Sin notificaciones</div>
            ) : (
              <ul>
                {(data?.notifications ?? []).map((n) => (
                  <li
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 border-b border-stone-50 last:border-0 ${!n.read ? "bg-amber-50/60" : ""}`}
                  >
                    <span className="text-xl flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type] ?? "🔔"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-stone-700 truncate">{n.title}</p>
                        <span className="text-[10px] text-stone-400 flex-shrink-0">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{n.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
