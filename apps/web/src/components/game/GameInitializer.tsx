"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateCity, usePlayInitial } from "@/hooks/useCity";
import { useGameStore } from "@/stores/gameStore";
import { getCityId, setCityId } from "@/lib/guestAuth";
import { useRouter, usePathname } from "next/navigation";
import { useMatecitoAuth } from "@/hooks/useMatecitoAuth";
import { clearGuestSession } from "@/lib/guestAuth";

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
    resources: cityData.resources,
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
  const [bootstrapResolved, setBootstrapResolved] = useState(false);
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!auth.isLoggedIn) {
      setBootstrapResolved(false);
    }
  }, [auth.isLoggedIn]);

  // Map city data to store when loaded
  useEffect(() => {
    if (!playInitialData?.city) return;

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

    let cancelled = false;
    bootstrapInFlightRef.current = true;
    setBootstrapPending(true);

    (async () => {
      try {
        const pendingCityName = localStorage.getItem("etheria_pending_city_name") ?? "Etheria";
        const res = await fetch("/api/city/bootstrap", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({ cityName: pendingCityName, email: auth.user?.email ?? null, name: auth.user?.name ?? null }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const error = new Error(data.error || "bootstrap failed") as Error & { status?: number };
          error.status = res.status;
          throw error;
        }
        if (cancelled) return;
        setCityId(data.city.id);
        setLocalCityId(data.city.id);
        localStorage.removeItem("etheria_pending_city_name");
        setCity(mapCityToStore(data.city));
        queryClient.setQueryData(["city", data.city.id], data.city);
        queryClient.invalidateQueries({ queryKey: ["play-initial", data.city.id] });
      } catch (error) {
        if ((error as any)?.status === 401) {
          await auth.signOut();
          clearGuestSession();
          setLocalCityId(null);
          router.replace("/login");
        }
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
  }, [auth, auth.isLoggedIn, auth.ready, auth.token, auth.user?.email, auth.user?.name, mounted, pathname, queryClient, router, setCity]);

  // Create city if no cityId exists (guest fallback)
  useEffect(() => {
    if (!auth.isLoggedIn && !cityId && !createCity.isPending && !hasCreatedCity) {
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
  }, [auth.isLoggedIn, cityId, createCity, setCity, hasCreatedCity, queryClient]);

  // Prevent hydration mismatch
  if (!mounted) return null;

  if (!auth.ready || isLoading || createCity.isPending || bootstrapPending || (auth.isLoggedIn && !bootstrapResolved)) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-etheria-bg z-50">
        <div className="text-center">
          <div className="mb-4 text-5xl animate-bounce">🏰</div>
          <h2 className="text-2xl font-display font-bold text-etheria-gold">Building Etheria...</h2>
          <p className="text-sm text-etheria-text-muted mt-2">Preparing your empire</p>
          <div className="mt-4 w-48 h-1.5 bg-etheria-panel rounded-full overflow-hidden mx-auto">
            <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full animate-shimmer" />
          </div>
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
