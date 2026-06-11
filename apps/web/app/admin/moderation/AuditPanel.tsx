"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "./adminApi";

const ACTION_COLORS: Record<string, string> = {
  BAN: "text-rose-300",
  UNBAN: "text-emerald-300",
  MUTE: "text-yellow-300",
  UNMUTE: "text-teal-300",
  KICK_SESSIONS: "text-orange-300",
  DELETE_CHAT_MESSAGE: "text-blue-300",
};

function fmt(date: string) {
  return new Date(date).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export function AuditPanel() {
  const [actionFilter, setActionFilter] = useState("");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "audit", { actionFilter, userIdFilter, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (actionFilter) params.set("action", actionFilter);
      if (userIdFilter) params.set("userId", userIdFilter);
      return adminFetch(`/admin/users/audit?${params}`);
    },
    staleTime: 10_000,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-stone-300 outline-none"
        >
          <option value="">Todas las acciones</option>
          {Object.keys(ACTION_COLORS).map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <input
          value={userIdFilter}
          onChange={(e) => { setUserIdFilter(e.target.value); setPage(1); }}
          placeholder="Filtrar por ID de jugador..."
          className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white placeholder:text-stone-600 outline-none font-mono text-xs w-52"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-stone-500">Cargando historial...</div>
      ) : isError ? (
        <div className="text-center py-12 text-rose-400">Error al cargar</div>
      ) : (
        <>
          <div className="text-xs text-stone-500">{data?.total ?? 0} acciones</div>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-stone-500 uppercase tracking-wider">
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Acción</th>
                  <th className="px-4 py-2 text-left">Jugador</th>
                  <th className="px-4 py-2 text-left">Razón</th>
                  <th className="px-4 py-2 text-left">Expira</th>
                </tr>
              </thead>
              <tbody>
                {(data?.actions ?? []).map((a: any) => (
                  <tr key={a.id} className="border-b border-white/5 text-xs">
                    <td className="px-4 py-2.5 text-stone-500 whitespace-nowrap">{fmt(a.createdAt)}</td>
                    <td className={`px-4 py-2.5 font-bold ${ACTION_COLORS[a.action] ?? "text-stone-300"}`}>{a.action}</td>
                    <td className="px-4 py-2.5 text-stone-300">{a.user?.name ?? a.userId ?? "—"}</td>
                    <td className="px-4 py-2.5 text-stone-500 max-w-[200px] truncate">{a.reason ?? "—"}</td>
                    <td className="px-4 py-2.5 text-stone-600 whitespace-nowrap">{a.expiresAt ? fmt(a.expiresAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Página {page} de {Math.max(1, Math.ceil((data?.total ?? 0) / 50))}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-30 hover:text-stone-300">← Anterior</button>
              <button disabled={page * 50 >= (data?.total ?? 0)} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-30 hover:text-stone-300">Siguiente →</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
