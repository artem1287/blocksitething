import type { DailyStats } from "../shared/types";

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Free tier is "today-only" by design (Section 3) — retaining history is the premium
// upsell, so every write collapses storage down to just today's key.
export function pruneToToday(
  statsByDate: Record<string, DailyStats>,
  todayKey: string,
): Record<string, DailyStats> {
  return { [todayKey]: statsByDate[todayKey] ?? {} };
}

export function incrementStat(daily: DailyStats, domain: string): DailyStats {
  return { ...daily, [domain]: (daily[domain] ?? 0) + 1 };
}
