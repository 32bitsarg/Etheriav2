"use client";

import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/i18n";
import { Modal } from "@/components/ui/Modal";

interface ScheduledEvent {
  id: string;
  name: string;
  summary: string;
  icon: string;
  color: string;
  dayOfWeek: number; // 0 = Sunday
}

interface EventsResponse {
  current: ({ endsAt: string } & ScheduledEvent) | null;
  today: ({ startsAt: string; endsAt: string } & ScheduledEvent) | null;
  schedule: ScheduledEvent[];
}

export function WeeklyEventsPanel({ onClose }: { onClose: () => void }) {
  const { t, locale } = useI18n();

  const { data, isLoading } = useQuery<EventsResponse>({
    queryKey: ["daily-events"],
    queryFn: async () => {
      const res = await fetch("/api/events/current");
      return res.ok ? res.json() : { current: null, today: null, schedule: [] };
    },
    staleTime: 60000,
  });

  const todayDow = new Date().getUTCDay();
  const activeId = data?.current?.id ?? null;
  const todayId = data?.today?.id ?? null;

  // Sort schedule starting from today
  const sorted = [...(data?.schedule ?? [])].sort((a, b) => {
    const da = (a.dayOfWeek - todayDow + 7) % 7;
    const db = (b.dayOfWeek - todayDow + 7) % 7;
    return da - db;
  });

  function dayLabel(ev: ScheduledEvent) {
    const daysFromNow = (ev.dayOfWeek - todayDow + 7) % 7;
    if (daysFromNow === 0) return t("play.weeklyEvents.today");
    if (daysFromNow === 1) return t("play.weeklyEvents.tomorrow");
    // Use locale-aware day name
    const refDate = new Date();
    refDate.setUTCDate(refDate.getUTCDate() + daysFromNow);
    return refDate.toLocaleDateString(locale, { weekday: "short" });
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("play.weeklyEvents.title")}
      headerGradient="from-violet-500 to-purple-600"
      headerIcon="🗓️"
    >
      <div className="p-4 space-y-2">
        {isLoading && (
          <div className="py-8 text-center text-stone-400 text-sm">{t("play.weeklyEvents.loading")}</div>
        )}

        {sorted.map((ev) => {
          const isActive = ev.id === activeId;
          const isToday = ev.id === todayId;
          const label = dayLabel(ev);

          return (
            <div
              key={ev.id}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 border transition-all ${
                isActive
                  ? "border-transparent text-white shadow-md"
                  : isToday
                  ? "border-stone-300 bg-stone-50"
                  : "border-stone-100 bg-white opacity-70"
              }`}
              style={isActive ? { background: ev.color } : {}}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: isActive ? "rgba(255,255,255,0.2)" : `${ev.color}22` }}
              >
                {ev.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold leading-tight ${isActive ? "text-white" : "text-stone-800"}`}>
                  {ev.name}
                </p>
                <p className={`text-xs mt-0.5 ${isActive ? "text-white/80" : "text-stone-500"}`}>
                  {ev.summary}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-lg ${
                    isActive
                      ? "bg-white/20 text-white"
                      : isToday
                      ? "bg-amber-100 text-amber-700"
                      : "bg-stone-100 text-stone-500"
                  }`}
                >
                  {isActive ? t("play.weeklyEvents.active") : `${label} 20:00`}
                </span>
              </div>
            </div>
          );
        })}

        <p className="text-center text-[10px] text-stone-400 pt-2">
          {t("play.weeklyEvents.schedule")}
        </p>
      </div>
    </Modal>
  );
}
