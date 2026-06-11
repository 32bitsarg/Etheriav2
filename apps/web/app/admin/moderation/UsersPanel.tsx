"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "./adminApi";
import { UserDetailDrawer } from "./UserDetailDrawer";

const FILTERS = [
  { id: "all", label: "Todos" },
  { id: "banned", label: "Baneados" },
  { id: "muted", label: "Muteados" },
  { id: "online", label: "Online" },
  { id: "bots", label: "Bots" },
];

function fmt(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export function UsersPanel() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["admin", "users", { filter, search, page }],
    queryFn: () => {
      const params = new URLSearchParams({ filter, page: String(page), limit: "25" });
      if (search) params.set("search", search);
      return adminFetch(`/admin/users?${params}`);
    },
    staleTime: 10_000,
  });

  const handleSearch = () => { setSearch(searchInput); setPage(1); };

  return (
    <div className="space-y-4">
      {/* Filters + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id); setPage(1); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.id ? "bg-amber-500/15 text-amber-300" : "border border-white/10 text-stone-400 hover:bg-white/5"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Buscar nombre/email..."
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white placeholder:text-stone-600 outline-none"
          />
          <button onClick={handleSearch} className="rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/25">
            Buscar
          </button>
          {(search || filter !== "all") && (
            <button onClick={() => { setSearch(""); setSearchInput(""); setFilter("all"); setPage(1); }} className="text-xs text-stone-500 hover:text-stone-300">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-stone-500">Cargando usuarios...</div>
      ) : isError ? (
        <div className="text-center py-12 text-rose-400">Error al cargar usuarios</div>
      ) : (
        <>
          <div className="text-xs text-stone-500 mb-2">{data?.total ?? 0} usuarios {isFetching && "· actualizando..."}</div>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-stone-500 uppercase tracking-wider">
                  <th className="px-4 py-2 text-left">Jugador</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-right">Poder</th>
                  <th className="px-4 py-2 text-right">Ciudades</th>
                  <th className="px-4 py-2 text-left">Último acceso</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(data?.users ?? []).map((u: any) => (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedUser(u.id)}
                    className="border-b border-white/5 cursor-pointer hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-stone-200">{u.name ?? "(sin nombre)"}</span>
                      {u.isBot && <span className="ml-1 text-[10px] text-blue-400">BOT</span>}
                    </td>
                    <td className="px-4 py-2.5 text-stone-500 text-xs">{u.email ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right text-stone-300 tabular-nums">{(u.power ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-stone-400">{u.cityCount ?? 0}</td>
                    <td className="px-4 py-2.5 text-stone-500 text-xs">{fmt(u.lastSeenAt)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1 flex-wrap">
                        {u.isBanned && <span className="rounded-md bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">BAN</span>}
                        {u.isMuted && <span className="rounded-md bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-bold text-yellow-300">MUTE</span>}
                        {!u.isBanned && !u.isMuted && <span className="text-[10px] text-stone-600">—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Página {page} de {Math.max(1, Math.ceil((data?.total ?? 0) / 25))}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-30 hover:text-stone-300">← Anterior</button>
              <button disabled={page * 25 >= (data?.total ?? 0)} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-30 hover:text-stone-300">Siguiente →</button>
            </div>
          </div>
        </>
      )}

      {selectedUser && <UserDetailDrawer userId={selectedUser} onClose={() => setSelectedUser(null)} />}
    </div>
  );
}
