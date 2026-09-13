import { daysToReachTarget, type TaperConfig } from "./curve";

/**
 * How many extra days a proposed plan change (Section 2.3's "soft" plan-level change) adds
 * before reaching `targetMinutes`, vs. staying on the current plan. Positive = the change delays
 * reaching the target (typical when loosening); negative = it arrives sooner. This is the number
 * a confirmation UI shows ("this adds ~9 days to reach your target") — it never mutates either
 * config, and applying the change is a separate, caller-owned step gated to next local midnight.
 */
export function planChangeDelayDays(
  current: TaperConfig,
  proposed: TaperConfig,
  targetMinutes: number,
): number {
  const currentDays = daysToReachTarget(current, targetMinutes);
  const proposedDays = daysToReachTarget(proposed, targetMinutes);

  if (!Number.isFinite(currentDays) && !Number.isFinite(proposedDays)) return 0;
  return proposedDays - currentDays;
}

/** Local midnight at the start of the calendar day after `now` — when a soft plan change takes
 *  effect (Section 2.3), and when a fresh day's allowance is computed (Section 2.5). */
export function nextLocalMidnight(now: Date): Date {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return next;
}
