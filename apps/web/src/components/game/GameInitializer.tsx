"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCity, useCreateCity } from "@/hooks/useCity";
import { useGameStore } from "@/stores/gameStore";
import { getCityId, setCityId } from "@/lib/guestAuth";
import { useRouter, usePathname } from "next/navigation";
import { useMatecitoAuth } from "@/hooks/useMatecitoAuth";

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
          const levelDiff = (b.targetLevel ?? 0) - (a.targetLevel ?? 0);
          if (levelDiff !== 0) return levelDiff;
          return new Date(b.startedAt ?? 0).getTime() - new Date(a.startedAt ?? 0).getTime();
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
      goldPerHour: cityData.goldPerHour,
      woodPerHour: cityData.woodPerHour,
      stonePerHour: cityData.stonePerHour,
      foodPerHour: cityData.foodPerHour,
    },
    storage: {
      maxGold: cityData.maxGold,
      maxWood: cityData.maxWood,
      maxStone: cityData.maxStone,
      maxFood: cityData.maxFood,
    },
    buildings: cityData.buildings,
    units: cityData.units,
    buildQueues,
    trainingQueues: cityData.trainingQueues,
    cityTechs: cityData.cityTechs ?? [],
    researchQueue: cityData.researchQueue ?? [],
    activeResearch: cityData.activeResearch ?? null,
    allianceMembership: cityData.allianceMembership ?? null,
    techBonuses: cityData.techBonuses ?? getDefaultTechBonuses(),
    lastResourceUpdate: cityData.lastResourceUpdate ?? new Date().toISOString(),
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
  const { data: cityData, isLoading, error } = useCity(effectiveCityId);
  const createCity = useCreateCity();
  const setCity = useGameStore((s) => s.setCity);

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
    if (cityData) {
      setCity(mapCityToStore(cityData));
    }
  }, [cityData, setCity]);

  // Require Matecito auth for the main game.
  useEffect(() => {
    if (!mounted) return;
    const inAuth = pathname === "/login" || pathname === "/registro";
    if (inAuth) return;
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
        if (!res.ok) throw new Error(data.error || "bootstrap failed");
        if (cancelled) return;
        setCityId(data.city.id);
        setLocalCityId(data.city.id);
        localStorage.removeItem("etheria_pending_city_name");
        setCity(mapCityToStore(data.city));
        queryClient.setQueryData(["city", data.city.id], data.city);
      } catch {
        // If bootstrap fails, let the normal error UI show up via useCity.
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
  }, [auth.isLoggedIn, auth.ready, auth.token, auth.user?.email, auth.user?.name, mounted, pathname, queryClient, setCity]);

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
