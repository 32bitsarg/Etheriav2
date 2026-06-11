"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useI18n } from "@/i18n";

interface EventInfo {
  id: string;
  name: string;
  summary: string;
  icon: string;
  color: string;
  endsAt?: string;
  startsAt?: string;
}

interface EventsResponse {
  current: (EventInfo & { endsAt: string }) | null;
  today: (EventInfo & { startsAt: string; endsAt: string }) | null;
  next: (EventInfo & { startsAt: string }) | null;
}

function useCountdownStr(target: string | undefined) {
  const [str, setStr] = useState("");
  useEffect(() => {
    if (!target) return;
    const update = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setStr(""); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setStr(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [target]);
  return str;
}

export function DailyEventBanner({ compact }: { compact?: boolean } = {}) {
  const { locale } = useI18n();
  const { data } = useQuery<EventsResponse>({
    queryKey: ["daily-events"],
    queryFn: async () => {
      const res = await fetch("/api/events/current");
      return res.ok ? res.json() : { current: null, today: null, next: null };
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const activeEvent = data?.current;
  const todayEvent = data?.today;
  const nextEvent = data?.next;
  const countdownEnds = useCountdownStr(activeEvent?.endsAt);
  const countdownStarts = useCountdownStr(todayEvent?.startsAt);

  if (!data) return null;

  if (activeEvent) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-white text-xs font-semibold animate-pulse-slow"
        style={{ background: activeEvent.color }}
      >
        <span className="text-base">{activeEvent.icon}</span>
        {!compact && <span>{activeEvent.name}</span>}
        {!compact && <span className="opacity-80">— {countdownEnds}</span>}
        {compact && <span className="font-bold">{activeEvent.name}</span>}
      </div>
    );
  }

  if (todayEvent && countdownStarts) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 text-white/70 text-xs font-medium">
        <span className="text-base">{todayEvent.icon}</span>
        {!compact && <><span className="hidden sm:inline">{todayEvent.name} en</span><span className="font-bold text-white/85">{countdownStarts}</span></>}
        {compact && <span className="font-bold text-white/85">{countdownStarts}</span>}
      </div>
    );
  }

  if (nextEvent) {
    const tomorrow = new Date(nextEvent.startsAt).toLocaleDateString(locale, { weekday: "short" });
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 text-white/60 text-xs">
        <span>{nextEvent.icon}</span>
        {!compact && <span className="hidden sm:inline">{nextEvent.name} — {tomorrow} 20:00</span>}
      </div>
    );
  }

  return null;
}
