"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchWithTimeout, useCreateCity, usePlayInitial } from "@/hooks/useCity";
import { useGameStore } from "@/stores/gameStore";
import { getCityId, setCityId } from "@/lib/guestAuth";
import { useRouter, usePathname } from "next/navigation";
import { useMatecitoAuth } from "@/hooks/useMatecitoAuth";
import { clearGuestSession } from "@/lib/guestAuth";

// Ampliar timeouts para 4G lenta
const AUTH_TIMEOUT_MS = 12_000;
const BOOTSTRAP_TIMEOUT_MS = 20_000;
const PLAY_INITIAL_TIMEOUT_MS = 25_000;

type InitPhase = "auth" | "bootstrap" | "snapshot" | "ready" | "error";
type InitError = {
  code: string;
  message: string;
  detail?: string;
};

function getDefaultTechBonuses() {
  return {
    unitAttackBonus: {},
    unitHpBonus: {},
    unitDefenseBonus: {},
    unitSpeedBonus: {},
    unitApBonus: {},
    resourceProdBonus: {},
    trainingCostReduction: 0,
    wallBonusMultiplier: 1,
    towerDamageBonus: 0,
  };
}

function mapCityToStore(cityData: any) {
  const buildQueues = Array.isArray(cityData.buildQueues)
    ? [...cityData.buildQueues]
        .sort((a: any, b: any) => {
          const completesDiff = new Date(a.completesAt ?? 0).getTime() - new Date(b.completesAt ?? 0).getTime();
          if (completesDiff !== 0) return completesDiff;
          return new Date(a.startedAt ?? 0).getTime() - new Date(b.startedAt ?? 0).getTime();
        })
        .reduce((acc: any[], queue: any) => {
          const existing = acc.find((item) => item.buildingId === queue.buildingId);
          if (!existing) acc.push(queue);
          return acc;
        }, [])
    : [];

  return {
    cityId: cityData.id,
    name: cityData.name,
    resources: cityData.resources ?? { gold: 0, wood: 0, stone: 0, food: 0, gems: 0 },
    production: {
      goldPerHour: cityData.production?.goldPerHour ?? 0,
      woodPerHour: cityData.production?.woodPerHour ?? 0,
      stonePerHour: cityData.production?.stonePerHour ?? 0,
      foodPerHour: cityData.production?.foodPerHour ?? 0,
    },
    storage: {
      maxGold: cityData.storage?.maxGold ?? 1000,
      maxWood: cityData.storage?.maxWood ?? 1000,
      maxStone: cityData.storage?.maxStone ?? 500,
      maxFood: cityData.storage?.maxFood ?? 500,
    },
    buildings: cityData.buildings,
    units: cityData.units,
    buildQueues,
    trainingQueues: Array.isArray(cityData.trainingQueues)
      ? [...cityData.trainingQueues].sort((a: any, b: any) => new Date(a.completesAt ?? 0).getTime() - new Date(b.completesAt ?? 0).getTime())
      : [],
    cityTechs: cityData.cityTechs ?? [],
    researchQueue: Array.isArray(cityData.researchQueue)
      ? [...cityData.researchQueue].sort((a: any, b: any) => new Date(a.completesAt ?? 0).getTime() - new Date(b.completesAt ?? 0).getTime())
      : [],
    activeResearch: Array.isArray(cityData.researchQueue) ? [...cityData.researchQueue].sort((a: any, b: any) => new Date(a.completesAt ?? 0).getTime() - new Date(b.completesAt ?? 0).getTime())[0] ?? null : cityData.activeResearch ?? null,
    allianceMembership: cityData.allianceMembership ?? null,
    techBonuses: cityData.techBonuses ?? getDefaultTechBonuses(),
    lastResourceUpdate: cityData.lastResourceUpdate ?? new Date().toISOString(),
    posX: cityData.posX ?? 0,
    posY: cityData.posY ?? 0,
  };
}

export function GameInitializer() {
  const [mounted, setMounted] = useState(false);
  const [hasCreatedCity, setHasCreatedCity] = useState(false);
  const [bootstrapPending, setBootstrapPending] = useState(false);
  // Returning users (cityId in localStorage): start play-initial in parallel with bootstrap
  const [bootstrapResolved, setBootstrapResolved] = useState(() => Boolean(getCityId()));
  const [phaseStartedAt, setPhaseStartedAt] = useState(() => Date.now());
  const [initError, setInitError] = useState<InitError | null>(null);
  const [localCityId, setLocalCityId] = useState<string | null>(() => getCityId());
  const bootstrapInFlightRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const auth = useMatecitoAuth();
  const queryClient = useQueryClient();

  const cityId = localCityId;
  const effectiveCityId = auth.isLoggedIn ? (bootstrapResolved ? cityId : null) : cityId;
  const { data: playInitialData, isLoading, error } = usePlayInitial(effectiveCityId);
  const cityData = playInitialData?.city;
  const createCity = useCreateCity();
  const setCity = useGameStore((s) => s.setCity);
  const setActiveBattles = useGameStore((s) => s.setActiveBattles);
  const setBattleReports = useGameStore((s) => s.setBattleReports);
  const setBarbarianAlerts = useGameStore((s) => s.setBarbarianAlerts);
  const setUnreadCounts = useGameStore((s) => s.setUnreadCounts);
  const setSeasonState = useGameStore((s) => s.setSeasonState);
  const setPlayInitialLoadedAt = useGameStore((s) => s.setPlayInitialLoadedAt);
  const setWorldId = useGameStore((s) => s.setWorldId);

  const currentPhase: InitPhase = !auth.ready
    ? "auth"
    : bootstrapPending || (auth.isLoggedIn && !bootstrapResolved)
      ? "bootstrap"
      : isLoading
        ? "snapshot"
        : initError || (!cityData && error)
          ? "error"
          : "ready";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPhaseStartedAt(Date.now());
  }, [currentPhase]);

  // Hide native Capacitor splash when game is ready — must be unconditional (Rules of Hooks)
  const isReady = currentPhase === "ready";
  useEffect(() => {
    if (!isReady) return;
    Promise.all([
      import("@capacitor/core").catch(() => null),
      import("@capacitor/splash-screen").catch(() => null),
    ]).then(([capCore, capSplash]) => {
      if (!capCore || !capSplash) return;
      const { Capacitor } = capCore;
      const { SplashScreen } = capSplash;
      if (Capacitor.isNativePlatform()) {
        SplashScreen.hide({ fadeOutDuration: 500 }).catch(() => {});
      }
    });
  }, [isReady]);

  useEffect(() => {
    if (currentPhase === "ready" || currentPhase === "error") return;
    const timeoutMs = currentPhase === "auth" ? AUTH_TIMEOUT_MS : currentPhase === "bootstrap" ? BOOTSTRAP_TIMEOUT_MS : PLAY_INITIAL_TIMEOUT_MS;
    const id = window.setTimeout(() => {
      setInitError({
        code: currentPhase === "auth" ? "AUTH_TIMEOUT" : currentPhase === "bootstrap" ? "BOOTSTRAP_TIMEOUT" : "PLAY_INITIAL_TIMEOUT",
        message: currentPhase === "auth"
          ? "La sesion tardo demasiado en validarse."
          : currentPhase === "bootstrap"
            ? "La ciudad tardo demasiado en prepararse."
            : "La aldea tardo demasiado en cargar.",
        detail: `Fase: ${currentPhase}`,
      });
      setBootstrapPending(false);
      bootstrapInFlightRef.current = false;
    }, timeoutMs);
    return () => window.clearTimeout(id);
  }, [currentPhase]);

  useEffect(() => {
    if (!auth.isLoggedIn) {
      setBootstrapResolved(false);
      setInitError(null);
    }
  }, [auth.isLoggedIn]);

  // Map city data to store when loaded
  useEffect(() => {
    if (!playInitialData?.city) return;
    setInitError(null);

    const city = playInitialData.city;
    setCity(mapCityToStore(city));
    setActiveBattles(playInitialData.activeBattles ?? []);
    setBattleReports(playInitialData.battleReports ?? []);
    setBarbarianAlerts(playInitialData.barbarianAlerts ?? []);
    setUnreadCounts(playInitialData.unreadCounts ?? {});
    setSeasonState(playInitialData.seasonState ?? null);
    setPlayInitialLoadedAt(playInitialData.serverTime ?? new Date().toISOString());

    queryClient.setQueryData(["city", city.id], city);
    queryClient.setQueryData(["battles", "active", city.id], playInitialData.activeBattles ?? []);
    queryClient.setQueryData(["battles", "reports", city.id], playInitialData.battleReports ?? []);
    queryClient.setQueryData(["barbarian", "attack-alerts", city.id], playInitialData.barbarianAlerts ?? []);
    if (playInitialData.techs) {
      queryClient.setQueryData(["techs", city.id], playInitialData.techs);
    }
    if (playInitialData.seasonState) {
      queryClient.setQueryData(["world", "season"], { season: playInitialData.seasonState });
    }
  }, [
    playInitialData,
    queryClient,
    setActiveBattles,
    setBarbarianAlerts,
    setBattleReports,
    setCity,
    setPlayInitialLoadedAt,
    setSeasonState,
    setUnreadCounts,
  ]);

  // Require Matecito auth for the main game.
  useEffect(() => {
    if (!mounted) return;
    const publicPaths = ["/login", "/registro", "/", "/changelog"];
    const inPublic = publicPaths.some((p) => pathname === p || pathname.startsWith("/changelog/"));
    if (inPublic) return;
    if (!auth.ready) return;
    if (!auth.isLoggedIn) {
      router.replace("/login");
    }
  }, [auth.isLoggedIn, auth.ready, mounted, pathname, router]);

  // After auth, ensure a city exists server-side and store its cityId locally.
  useEffect(() => {
    if (!mounted) return;
    const inAuth = pathname === "/login" || pathname === "/registro";
    if (inAuth) return;
    if (!auth.ready || !auth.isLoggedIn || !auth.token) return;
    if (bootstrapInFlightRef.current) return;

    // Check if world is selected — only required for new cities
    const worldId = localStorage.getItem("etheria_world_id");
    if (worldId) setWorldId(worldId);

    const pendingRace = localStorage.getItem("etheria_pending_race");
    if (!localCityId && !worldId) {
      router.replace("/play/select-world");
      return;
    }
    if (!localCityId && worldId && !pendingRace) {
      router.replace("/play/select-race");
      return;
    }

    let cancelled = false;
    bootstrapInFlightRef.current = true;
    setBootstrapPending(true);
    setInitError(null);

    (async () => {
      try {
        const pendingCityName = localStorage.getItem("etheria_pending_city_name") ?? "Etheria";
        const body: Record<string, unknown> = {
          cityName: pendingCityName,
          email: auth.user?.email ?? null,
          name: auth.user?.name ?? null,
        };
        if (pendingRace) body.race = pendingRace;
        if (worldId) body.worldId = worldId;
        const res = await fetchWithTimeout("/api/city/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }, BOOTSTRAP_TIMEOUT_MS);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const error = new Error(data.error || "bootstrap failed") as Error & { status?: number; code?: string };
          error.status = res.status;
          error.code = data.code;
          throw error;
        }
        if (cancelled) return;
        setCityId(data.city.id);
        setLocalCityId(data.city.id);
        localStorage.removeItem("etheria_pending_city_name");
        localStorage.removeItem("etheria_pending_race");
        if (Array.isArray(data.city.buildings)) {
          setCity(mapCityToStore(data.city));
          queryClient.setQueryData(["city", data.city.id], data.city);
        }
        queryClient.invalidateQueries({ queryKey: ["play-initial", data.city.id] });
      } catch (error) {
        if ((error as any)?.status === 401) {
          await auth.signOut();
          clearGuestSession();
          setLocalCityId(null);
          router.replace("/login");
          return;
        }
        setInitError({
          code: (error as any)?.code ?? "BOOTSTRAP_FAILED",
          message: error instanceof Error ? error.message : "No se pudo preparar la ciudad.",
          detail: (error as any)?.status ? `HTTP ${(error as any).status}` : undefined,
        });
      } finally {
        bootstrapInFlightRef.current = false;
        if (!cancelled) {
          setBootstrapPending(false);
          setBootstrapResolved(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [auth, auth.isLoggedIn, auth.ready, auth.token, auth.user?.email, auth.user?.name, localCityId, mounted, pathname, queryClient, router, setCity]);

  useEffect(() => {
    if (!error) return;
    const status = (error as any)?.status;
    if (status === 404 && effectiveCityId) {
      clearGuestSession();
      setLocalCityId(null);
      setBootstrapResolved(false);
      setInitError(null);
      return;
    }
    setInitError({
      code: (error as any)?.code ?? (status ? `PLAY_INITIAL_${status}` : "PLAY_INITIAL_FAILED"),
      message: error.message,
      detail: status ? `HTTP ${status}` : undefined,
    });
  }, [effectiveCityId, error]);

  // Create city if no cityId exists (guest fallback — only when NOT authenticated)
  useEffect(() => {
    if (!auth.ready || auth.isLoggedIn) return;
    if (!cityId && !createCity.isPending && !hasCreatedCity) {
      setHasCreatedCity(true);
      createCity.mutate("Etheria", {
        onSuccess: (data) => {
          setCityId(data.city.id);
          setLocalCityId(data.city.id);
          setCity(mapCityToStore(data.city));
          queryClient.setQueryData(["city", data.city.id], data.city);
          setBootstrapResolved(true);
        },
      });
    }
  }, [auth.ready, auth.isLoggedIn, cityId, createCity, setCity, hasCreatedCity, queryClient]);

  // Prevent hydration mismatch
  if (!mounted) return null;

  const phaseText = currentPhase === "auth"
    ? "Validando sesion..."
    : currentPhase === "bootstrap"
      ? "Preparando ciudad..."
      : currentPhase === "snapshot"
        ? "Cargando aldea..."
        : "Preparing your empire";
  const stuckSeconds = Math.max(0, Math.floor((Date.now() - phaseStartedAt) / 1000));

  if (initError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-etheria-bg z-50">
        <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-black/50 p-6 text-center text-red-100 shadow-2xl">
          <h2 className="text-xl font-display font-bold text-red-300">No se pudo cargar Etheria</h2>
          <p className="mt-2 text-sm text-red-100/80">{initError.message}</p>
          <p className="mt-2 font-mono text-xs text-red-200/60">{initError.code} {initError.detail ? `- ${initError.detail}` : ""}</p>
          <div className="mt-5 flex justify-center gap-3">
            <button onClick={() => window.location.reload()} className="rounded-lg border border-etheria-gold/40 px-4 py-2 text-sm text-etheria-gold-soft hover:bg-etheria-gold/10">
              Reintentar
            </button>
            <button
              onClick={async () => {
                await auth.signOut();
                clearGuestSession();
                router.replace("/login");
              }}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
            >
              Volver al login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!auth.ready || isLoading || createCity.isPending || bootstrapPending || (auth.isLoggedIn && !bootstrapResolved)) {
    return (
      <div className="absolute inset-0 z-50 overflow-hidden">
        {/* Village background as skeleton — feels much faster than black screen */}
        <img
          src="/assets/backgrounds/village-fullscreen.webp"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: "brightness(0.35)" }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="text-5xl animate-bounce">🏰</div>
          <h2 className="font-display text-2xl font-bold text-amber-300 drop-shadow-lg">Conquest of Etheria</h2>
          <p className="text-sm text-white/60 drop-shadow">{phaseText}</p>
          <div className="mt-2 w-48 h-1.5 rounded-full overflow-hidden bg-white/10">
            <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full animate-shimmer" />
          </div>
          {stuckSeconds > 8 && (
            <p className="mt-1 font-mono text-[10px] text-white/30">{currentPhase} · {stuckSeconds}s</p>
          )}
        </div>
      </div>
    );
  }

  if (!cityData && error && !createCity.isPending && !bootstrapPending) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-etheria-bg z-50">
        <div className="text-center text-red-400">
          <h2 className="text-xl font-display font-bold">Failed to load city</h2>
          <p className="text-sm mt-2">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-etheria-panel border border-etheria-border rounded-lg hover:bg-etheria-panel-hover transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return null;
}
