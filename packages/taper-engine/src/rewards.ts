/** Streak ticks the moment a day's allowance is respected, and resets otherwise — Section 2.6. */
export function nextStreakCount(currentStreak: number, respectedToday: boolean): number {
  return respectedToday ? currentStreak + 1 : 0;
}

export const MILESTONE_DAYS = [3, 7, 14, 30] as const;
export type MilestoneDay = (typeof MILESTONE_DAYS)[number];

/** Which milestone badge, if any, was just reached at this exact streak count. */
export function milestoneReachedAt(streak: number): MilestoneDay | null {
  return (MILESTONE_DAYS as readonly number[]).includes(streak) ? (streak as MilestoneDay) : null;
}

export interface DailyOutcome {
  baselineMinutes: number;
  allowanceMinutes: number;
}

/** Cumulative time reclaimed vs. baseline (Section 2.6's "2.4 hours back this week" framing).
 *  A day never counts negatively, so an escape-valve-boosted day can't erase earlier progress. */
export function cumulativeReclaimedMinutes(days: DailyOutcome[]): number {
  return days.reduce((sum, day) => sum + Math.max(day.baselineMinutes - day.allowanceMinutes, 0), 0);
}
