import { PACE_TIERS, blendBaseline, type TaperConfig } from "@taper/engine";
import { isWithinSchedule } from "./schedule";
import type { TaperPlanState } from "../shared/types";

/** 1-based day index within the plan, counting `planStartDate` itself as day 1. Parses dates as
 *  UTC calendar components so a local DST transition between the two dates can't shift the
 *  count by an hour's worth of a day. */
export function computeDayIndex(planStartDate: string, today: string): number {
  const start = Date.UTC(...parseDateParts(planStartDate));
  const current = Date.UTC(...parseDateParts(today));
  return Math.round((current - start) / (24 * 60 * 60 * 1000)) + 1;
}

function parseDateParts(dateKey: string): [number, number, number] {
  const [year, month, day] = dateKey.split("-").map(Number);
  return [year ?? 1970, (month ?? 1) - 1, day ?? 1];
}

/** Combines the plan's shared pace-tier/mode settings with one entry's own baseline. */
export function buildTaperConfigForEntry(plan: TaperPlanState, baselineMinutes: number): TaperConfig {
  const tier = PACE_TIERS[plan.paceTier];
  return {
    baselineMinutes,
    frontLoadPct: tier.frontLoadPct,
    weeklyReductionPct: tier.weeklyReductionPct,
    mode: plan.mode,
    linearDailyReductionMinutes: plan.linearDailyReductionMinutes,
    floorMinutes: plan.floorMinutes,
    fullElimination: plan.fullElimination,
    minTaperThresholdMinutes: plan.minTaperThresholdMinutes,
  };
}

/** The worst-offender entry (Section 2.1) is hard-blocked during its focus hours regardless of
 *  remaining allowance — on top of, not instead of, still being taper-tracked the rest of the day. */
export function isWorstOffenderHardBlocked(
  plan: TaperPlanState | null,
  entryId: string,
  dayOfWeek: number,
  nowMinute: number,
): boolean {
  if (!plan || plan.worstOffenderEntryId !== entryId || !plan.worstOffenderSchedule) return false;
  return isWithinSchedule(plan.worstOffenderSchedule, dayOfWeek, nowMinute);
}

/** The one-time 48h reconciliation (Section 2.1): blends the self-reported baseline with the
 *  average of whatever measured days are available. With no measured days yet, the self-report
 *  stands unchanged. */
export function reconciledEntryBaseline(selfReportedMinutes: number, measuredDailyMinutes: number[]): number {
  if (measuredDailyMinutes.length === 0) return selfReportedMinutes;
  const avg = measuredDailyMinutes.reduce((sum, m) => sum + m, 0) / measuredDailyMinutes.length;
  return blendBaseline(selfReportedMinutes, avg);
}

/** Whether every tracked domain stayed within its allowance for the day — the input to both the
 *  streak ratchet and the frozen daily history record. */
export function dayOutcomeRespected(
  minutesUsedByDomain: Record<string, number>,
  allowanceByDomain: Record<string, number>,
): boolean {
  return Object.entries(minutesUsedByDomain).every(([domain, used]) => used <= (allowanceByDomain[domain] ?? Infinity));
}
