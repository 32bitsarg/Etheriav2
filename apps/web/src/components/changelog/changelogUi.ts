// Semantic styling per changelog section type, shared by landing and /changelog.
export const SECTION_STYLES: Record<string, { badge: string; dot: string }> = {
  Added:   { badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  Changed: { badge: "bg-amber-100 text-amber-700",     dot: "bg-amber-500" },
  Fixed:   { badge: "bg-rose-100 text-rose-700",       dot: "bg-rose-500" },
  Balance: { badge: "bg-violet-100 text-violet-700",   dot: "bg-violet-500" },
};

export function formatRelativeDate(isoDate: string, locale: string): string {
  const date = new Date(isoDate + "T00:00:00");
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (days < 1) return rtf.format(0, "day");
  if (days < 30) return rtf.format(-days, "day");
  if (days < 365) return rtf.format(-Math.floor(days / 30), "month");
  return rtf.format(-Math.floor(days / 365), "year");
}
