"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMatecitoAuth } from "@/hooks/useMatecitoAuth";
import { useWorlds, type WorldItem } from "@/hooks/useWorlds";

const WORLD_ID_KEY = "etheria_world_id";

function WorldCard({
  world,
  isSelected,
  onSelect,
}: {
  world: WorldItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`relative rounded-2xl border p-6 text-left transition-all duration-200 ${
        isSelected
          ? "border-amber-500/60 bg-amber-500/10 shadow-[0_0_28px_rgba(245,158,11,0.2)] scale-[1.02]"
          : "border-etheria-border-dim bg-black/20 hover:border-etheria-border hover:bg-black/30"
      }`}
    >
      <div className="mb-2 flex items-center gap-3">
        <span className="text-3xl">🌍</span>
        <div>
          <div className="text-lg font-display font-bold text-white">
            {world.name}
          </div>
          <div className="text-[11px] uppercase tracking-widest text-stone-500">
            {world.slug}
          </div>
        </div>
        {isSelected && (
          <span className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-black">
            ✓
          </span>
        )}
      </div>
      {world.description && (
        <p className="mb-3 text-[13px] leading-relaxed text-stone-400">
          {world.description}
        </p>
      )}
      <div className="flex items-center gap-4 text-[12px] text-stone-500">
        <span>👥 {world.playerCount} jugadores</span>
      </div>
    </button>
  );
}

export default function SelectWorldPage() {
  const router = useRouter();
  const auth = useMatecitoAuth();
  const { data: worlds, isLoading } = useWorlds();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!auth.ready || !auth.isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-etheria-bg">
        <div className="text-2xl animate-bounce">🌍</div>
      </div>
    );
  }

  function handleConfirm() {
    if (!selectedId) return;
    setSubmitting(true);
    localStorage.setItem(WORLD_ID_KEY, selectedId);
    router.replace("/play");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b1111] px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-10 text-center">
          <h1
            className="mb-3 text-4xl font-display font-bold text-etheria-gold-soft"
            style={{ letterSpacing: "-0.02em" }}
          >
            Selecciona tu Mundo
          </h1>
          <p className="mx-auto max-w-md text-[15px] leading-relaxed text-stone-400">
            Cada mundo es un reino independiente con su propio mapa, temporadas y
            jugadores. Elige sabiamente — tus ciudades pertenecerán a este mundo.
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-500" />
              <p className="text-sm text-stone-500">Cargando mundos...</p>
            </div>
          </div>
        )}

        {worlds && worlds.length === 0 && (
          <div className="rounded-2xl border border-etheria-border-dim bg-black/20 p-10 text-center">
            <span className="text-5xl">🏜️</span>
            <p className="mt-4 text-stone-400">
              No hay mundos disponibles en este momento. Vuelve más tarde.
            </p>
          </div>
        )}

        {worlds && worlds.length > 0 && (
          <div className="grid gap-4">
            {worlds.map((world) => (
              <WorldCard
                key={world.id}
                world={world}
                isSelected={selectedId === world.id}
                onSelect={() => setSelectedId(world.id)}
              />
            ))}
          </div>
        )}

        {worlds && worlds.length > 0 && (
          <>
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleConfirm}
                disabled={!selectedId || submitting}
                className="w-full max-w-xs rounded-xl bg-amber-500 px-6 py-3.5 text-base font-display font-bold text-white shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting
                  ? "Ingresando..."
                  : selectedId
                    ? `Ingresar a ${worlds.find((w) => w.id === selectedId)?.name ?? "Mundo"}`
                    : "Selecciona un mundo"}
              </button>
            </div>
            <p className="mt-4 text-center text-[12px] text-stone-600">
              Puedes cambiar de mundo más tarde desde la configuración.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
