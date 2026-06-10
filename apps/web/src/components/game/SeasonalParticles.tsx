"use client";

import { useMemo } from "react";

type Season = "SPRING" | "SUMMER" | "AUTUMN" | "WINTER";

// Deterministic pseudo-random so particles don't jump between re-renders
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEASON_PARTICLES: Record<Season, {
  count: number;
  animation: string;
  render: (rnd: () => number) => React.CSSProperties;
}> = {
  WINTER: {
    count: 26,
    animation: "season-snow",
    render: (rnd) => ({
      width: 2 + rnd() * 3,
      height: 2 + rnd() * 3,
      borderRadius: "50%",
      background: `rgba(255,255,255,${0.5 + rnd() * 0.4})`,
      filter: "blur(0.5px)",
    }),
  },
  AUTUMN: {
    count: 14,
    animation: "season-leaf",
    render: (rnd) => ({
      width: 5 + rnd() * 4,
      height: 4 + rnd() * 3,
      borderRadius: "60% 5% 60% 5%",
      background: `hsl(${18 + rnd() * 22}, ${60 + rnd() * 25}%, ${42 + rnd() * 14}%)`,
      opacity: 0.85,
    }),
  },
  SUMMER: {
    count: 10,
    animation: "season-firefly",
    render: (rnd) => ({
      width: 3,
      height: 3,
      borderRadius: "50%",
      background: "rgba(255,236,150,0.9)",
      boxShadow: "0 0 6px 2px rgba(255,220,110,0.45)",
    }),
  },
  SPRING: {
    count: 12,
    animation: "season-petal",
    render: (rnd) => ({
      width: 4 + rnd() * 3,
      height: 3 + rnd() * 3,
      borderRadius: "60% 60% 60% 10%",
      background: `hsl(${330 + rnd() * 30}, 70%, ${78 + rnd() * 10}%)`,
      opacity: 0.8,
    }),
  },
};

// Pure-CSS ambient particle layer (snow/leaves/fireflies/petals).
// transform-only animations → composited on GPU, zero JS per frame.
export function SeasonalParticles({ season, intensity = 1 }: { season?: string | null; intensity?: number }) {
  const config = season ? SEASON_PARTICLES[season as Season] : undefined;

  const particles = useMemo(() => {
    if (!config) return [];
    const rnd = mulberry32(season!.length * 7919);
    const count = Math.max(4, Math.round(config.count * Math.min(1, Math.max(0.3, intensity))));
    return Array.from({ length: count }, (_, i) => {
      const style = config.render(rnd);
      const dur = 6 + rnd() * 9;
      const delay = -rnd() * dur;
      return (
        <div
          key={i}
          className="absolute"
          style={{
            ...style,
            left: `${rnd() * 100}%`,
            top: `${rnd() * 100}%`,
            animation: `${config.animation} ${dur.toFixed(1)}s ${delay.toFixed(1)}s linear infinite`,
            willChange: "transform",
          }}
        />
      );
    });
  }, [config, season, intensity]);

  if (!config) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
      {particles}
    </div>
  );
}
