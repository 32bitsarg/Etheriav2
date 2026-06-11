"use client";

import type { BanInfo } from "@/hooks/useMatecitoAuth";

function formatBanExpiry(bannedUntil: string | null): string {
  if (!bannedUntil) return "permanente";
  const d = new Date(bannedUntil);
  return `hasta el ${d.toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short" })}`;
}

export function BannedScreen({
  banInfo,
  onSignOut,
}: {
  banInfo: BanInfo;
  onSignOut: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#080c0a]">
      <div className="w-full max-w-sm rounded-2xl border border-rose-900/50 bg-[#0f1210] p-8 text-center shadow-[0_0_80px_rgba(239,68,68,0.08)]">
        <div className="mb-4 text-5xl">🚫</div>
        <h1 className="mb-2 font-serif text-xl font-bold text-rose-300">Cuenta suspendida</h1>
        <p className="mb-5 text-sm text-stone-400">
          Tu cuenta ha sido baneada{" "}
          <span className="font-semibold text-rose-200">{formatBanExpiry(banInfo.bannedUntil)}</span>.
        </p>
        {banInfo.reason && (
          <div className="mb-6 rounded-lg border border-white/8 bg-black/30 px-4 py-3 text-left">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-stone-600">Razón</p>
            <p className="text-sm text-stone-300">{banInfo.reason}</p>
          </div>
        )}
        <button
          onClick={onSignOut}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm text-stone-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
