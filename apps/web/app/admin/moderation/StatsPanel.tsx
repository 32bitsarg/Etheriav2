"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "./adminApi";

function StatCard({ label, value, sub, color = "text-white" }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{typeof value === "number" ? value.toLocaleString() : value}</p>
      {sub && <p className="text-xs text-stone-600 mt-1">{sub}</p>}
    </div>
  );
}

function Bar({ value, max, color = "bg-amber-500" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-white/5">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StatsPanel() {
  const [days, setDays] = useState(14);

  const overview = useQuery({ queryKey: ["admin", "stats", "overview"], queryFn: () => adminFetch("/admin/stats/overview"), staleTime: 60_000 });
  const timeseries = useQuery({ queryKey: ["admin", "stats", "timeseries", days], queryFn: () => adminFetch(`/admin/stats/timeseries?days=${days}`), staleTime: 60_000 });
  const topPlayers = useQuery({ queryKey: ["admin", "stats", "top-players"], queryFn: () => adminFetch("/admin/stats/top-players?limit=10"), staleTime: 60_000 });
  const bots = useQuery({ queryKey: ["admin", "stats", "bots"], queryFn: () => adminFetch("/admin/stats/bots"), staleTime: 60_000 });

  const ov = overview.data;
  const ts = timeseries.data?.days ?? [];
  const maxMessages = Math.max(1, ...ts.map((d: any) => d.messages));
  const maxUsers = Math.max(1, ...ts.map((d: any) => d.newUsers));

  return (
    <div className="space-y-6">
      {overview.isError && <div className="text-rose-400 text-sm">Error al cargar estadísticas</div>}

      {ov && (
        <>
          <div>
            <p className="mb-3 text-xs font-bold text-stone-400 uppercase tracking-wider">Resumen general</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Jugadores" value={ov.totalPlayers} color="text-amber-300" />
              <StatCard label="Nuevos hoy" value={ov.newToday} color="text-emerald-300" />
              <StatCard label="Activos 24h" value={ov.activeLast24h} />
              <StatCard label="Activos 7d" value={ov.activeLast7d} />
              <StatCard label="Sesiones abiertas" value={ov.openSessions} />
              <StatCard label="Mensajes hoy" value={ov.messagesToday} color="text-blue-300" />
              <StatCard label="Batallas 24h" value={ov.battlesResolved24h} color="text-rose-300" />
              <StatCard label="Bots" value={ov.totalBots} color="text-stone-400" />
            </div>
          </div>

          {ov.recentRegistrations?.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-bold text-stone-400 uppercase tracking-wider">Registros recientes</p>
              <div className="flex flex-wrap gap-2">
                {ov.recentRegistrations.map((u: any) => (
                  <span key={u.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-stone-300">
                    {u.name ?? "(sin nombre)"} <span className="text-stone-600">{new Date(u.createdAt).toLocaleDateString("es-AR")}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Timeseries */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Actividad ({days} días)</p>
          <div className="flex gap-1">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded px-2 py-1 text-xs ${days === d ? "bg-amber-500/20 text-amber-300" : "text-stone-500 hover:text-stone-300"}`}
              >{d}d</button>
            ))}
          </div>
        </div>
        {timeseries.isLoading ? (
          <div className="text-center py-8 text-stone-600 text-sm">Cargando...</div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-black/20 p-4 overflow-x-auto">
            <div className="flex items-end gap-1 min-w-max">
              {ts.map((d: any) => (
                <div key={d.date} className="flex flex-col items-center gap-1 w-8">
                  <div className="w-full space-y-0.5">
                    <Bar value={d.messages} max={maxMessages} color="bg-blue-500" />
                    <Bar value={d.newUsers} max={maxUsers} color="bg-emerald-500" />
                  </div>
                  <span className="text-[8px] text-stone-600 rotate-45 origin-left mt-1">{d.date.slice(5)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-3 text-[10px] text-stone-500">
              <span><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1" />Mensajes</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />Nuevos jugadores</span>
            </div>
          </div>
        )}
      </div>

      {/* Top players */}
      {topPlayers.data?.players?.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-bold text-stone-400 uppercase tracking-wider">Top jugadores por poder</p>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            {topPlayers.data.players.map((p: any, i: number) => (
              <div key={p.userId} className="flex items-center gap-3 border-b border-white/5 px-4 py-2.5 text-sm last:border-0">
                <span className="text-stone-600 w-5 text-right">{i + 1}</span>
                <span className="font-medium text-stone-200 flex-1">{p.userName ?? "—"}</span>
                <span className="text-stone-500 text-xs">{p.cityName}</span>
                <span className="text-amber-300 tabular-nums font-bold">{(p.power ?? 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bots */}
      {bots.data && (
        <div>
          <p className="mb-3 text-xs font-bold text-stone-400 uppercase tracking-wider">Bots (24h)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard label="Acciones totales" value={bots.data.actions24h} />
            <StatCard label="Errores" value={bots.data.errors24h} color={bots.data.errors24h > 0 ? "text-rose-300" : "text-stone-400"} />
            {bots.data.lastSnapshot && <StatCard label="Éxitos" value={bots.data.lastSnapshot.successfulActions} color="text-emerald-300" />}
          </div>
        </div>
      )}
    </div>
  );
}
