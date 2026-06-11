"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "./adminApi";
import { BanMuteModal } from "./BanMuteModal";

type DrawerMode = "ban" | "mute" | null;

function fmt(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export function UserDetailDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [modal, setModal] = useState<DrawerMode>(null);
  const [confirmKick, setConfirmKick] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => adminFetch(`/admin/users/${userId}`),
    staleTime: 10_000,
  });

  const unbanMutation = useMutation({
    mutationFn: () => adminFetch(`/admin/users/${userId}/unban`, { method: "POST" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin", "users"] }); queryClient.invalidateQueries({ queryKey: ["admin", "user", userId] }); },
  });
  const unmuteMutation = useMutation({
    mutationFn: () => adminFetch(`/admin/users/${userId}/unmute`, { method: "POST" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin", "users"] }); queryClient.invalidateQueries({ queryKey: ["admin", "user", userId] }); },
  });
  const kickMutation = useMutation({
    mutationFn: () => adminFetch(`/admin/users/${userId}/kick`, { method: "POST" }),
    onSuccess: () => { setConfirmKick(false); queryClient.invalidateQueries({ queryKey: ["admin", "user", userId] }); },
  });

  return (
    <>
      <div className="fixed inset-0 z-[800] flex justify-end">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative z-10 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-white/10 bg-[#0b0f0e] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h2 className="text-sm font-bold text-white">Detalle de jugador</h2>
            <button onClick={onClose} className="text-stone-400 hover:text-white text-xl">✕</button>
          </div>

          {isLoading && <div className="p-8 text-center text-sm text-stone-500">Cargando...</div>}
          {isError && <div className="p-8 text-center text-sm text-rose-400">Error al cargar</div>}

          {data && (
            <div className="flex flex-col gap-5 p-5">
              {/* User info */}
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-base font-bold text-white">{data.user.name ?? "(sin nombre)"}</p>
                    <p className="text-xs text-stone-500">{data.user.email ?? "—"}</p>
                    <p className="mt-1 font-mono text-[10px] text-stone-600">{data.user.id}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {data.user.isBanned && <span className="rounded-md bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300">BANEADO</span>}
                    {data.user.isMuted && <span className="rounded-md bg-yellow-500/20 px-2 py-0.5 text-[10px] font-bold text-yellow-300">MUTEADO</span>}
                    {data.user.isBot && <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">BOT</span>}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone-400">
                  <span>Registrado: <span className="text-stone-300">{fmt(data.user.createdAt)}</span></span>
                  <span>Ciudades: <span className="text-stone-300">{data.cities?.length ?? 0}</span></span>
                  {data.user.isBanned && <span className="col-span-2">Razón ban: <span className="text-rose-300">{data.user.banReason ?? "—"}</span></span>}
                  {data.user.isBanned && data.user.bannedUntil && <span className="col-span-2">Hasta: <span className="text-rose-300">{fmt(data.user.bannedUntil)}</span></span>}
                  {data.user.isMuted && <span className="col-span-2">Razón mute: <span className="text-yellow-300">{data.user.muteReason ?? "—"}</span></span>}
                  {data.alliance && <span className="col-span-2">Alianza: <span className="text-emerald-300">{data.alliance.name} ({data.alliance.role})</span></span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {data.user.isBanned ? (
                  <button onClick={() => unbanMutation.mutate()} disabled={unbanMutation.isPending} className="rounded-lg bg-emerald-700/80 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-50">
                    {unbanMutation.isPending ? "..." : "✅ Quitar ban"}
                  </button>
                ) : (
                  <button onClick={() => setModal("ban")} className="rounded-lg bg-rose-700/80 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-600">🔨 Banear</button>
                )}
                {data.user.isMuted ? (
                  <button onClick={() => unmuteMutation.mutate()} disabled={unmuteMutation.isPending} className="rounded-lg bg-emerald-700/80 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-50">
                    {unmuteMutation.isPending ? "..." : "🔊 Quitar mute"}
                  </button>
                ) : (
                  <button onClick={() => setModal("mute")} className="rounded-lg bg-yellow-700/80 px-3 py-1.5 text-xs font-bold text-white hover:bg-yellow-600">🔇 Mutear</button>
                )}
                {confirmKick ? (
                  <button onClick={() => kickMutation.mutate()} disabled={kickMutation.isPending} className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-700">
                    {kickMutation.isPending ? "..." : "¿Confirmar kick?"}
                  </button>
                ) : (
                  <button onClick={() => setConfirmKick(true)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-stone-400 hover:bg-white/5">⚡ Kick sesiones</button>
                )}
              </div>

              {/* Cities */}
              {data.cities?.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold text-stone-400 uppercase tracking-wider">Ciudades</p>
                  <div className="space-y-1">
                    {data.cities.map((city: any) => (
                      <div key={city.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-xs">
                        <span className="text-stone-300">{city.name}</span>
                        <span className="text-stone-500">{city.worldId} · {city.power ?? 0}⚔️</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sessions */}
              <div>
                <p className="mb-2 text-xs font-bold text-stone-400 uppercase tracking-wider">Sesiones ({data.sessions?.length ?? 0})</p>
                <div className="space-y-1">
                  {data.sessions?.slice(0, 5).map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-xs">
                      <span className="text-stone-500">Última actividad:</span>
                      <span className="text-stone-300">{fmt(s.lastSeenAt)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent chat */}
              {data.recentChat?.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold text-stone-400 uppercase tracking-wider">Mensajes recientes</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {data.recentChat.map((m: any) => (
                      <div key={m.id} className="rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-xs">
                        <span className="text-stone-500">[{m.channel}] {fmt(m.createdAt)}</span>
                        <p className="mt-0.5 text-stone-300 break-words">{m.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Moderation history */}
              {data.recentActions?.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold text-stone-400 uppercase tracking-wider">Historial de moderación</p>
                  <div className="space-y-1">
                    {data.recentActions.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-xs">
                        <span className={`font-bold ${a.action.includes("BAN") ? "text-rose-300" : a.action.includes("MUTE") ? "text-yellow-300" : "text-stone-300"}`}>{a.action}</span>
                        <span className="text-stone-500 max-w-[60%] truncate">{a.reason ?? "—"}</span>
                        <span className="text-stone-600">{fmt(a.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {modal && data && (
        <BanMuteModal
          userId={userId}
          userName={data.user.name}
          mode={modal}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
