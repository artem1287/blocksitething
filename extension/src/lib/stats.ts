import type { DailyStats } from "../shared/types";

export { toLocalDateKey } from "./dates";

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
