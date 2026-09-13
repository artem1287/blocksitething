export type PaceTierName = "gentle" | "moderate" | "aggressive";

export interface PaceTierPreset {
  frontLoadPct: number;
  weeklyReductionPct: number;
}

// Section 2.2's table, verbatim.
export const PACE_TIERS: Record<PaceTierName, PaceTierPreset> = {
  gentle: { frontLoadPct: 0.15, weeklyReductionPct: 0.15 },
  moderate: { frontLoadPct: 0.2, weeklyReductionPct: 0.25 },
  aggressive: { frontLoadPct: 0.25, weeklyReductionPct: 0.4 },
};

export type TaperMode = "percentage" | "linear";

export interface TaperConfig {
  /** B0: the anchor the whole curve scales from. Swap this in place to re-anchor mid-plan
   *  (Section 2.1) — dailyAllowanceMinutes is linear in this value, so days already shown to
   *  the user are simply never recomputed with the new figure; only future days use it. */
  baselineMinutes: number;
  frontLoadPct: number;
  mode: TaperMode;
  /** Used when mode === "percentage". */
  weeklyReductionPct: number;
  /** Used when mode === "linear": flat minutes/day cut, applied after the day-1 front load. */
  linearDailyReductionMinutes?: number;
  /** Maintenance floor the curve holds at once reached — ignored entirely when fullElimination
   *  is true, per Section 2.2. */
  floorMinutes: number;
  fullElimination: boolean;
  /** Below this, a non-full-elimination curve is considered to have "reached" its floor even if
   *  floating-point decay hasn't landed exactly on it; a full-elimination curve snaps to 0
   *  instead of trailing off with vanishingly small allowances. Default 10 (Section 2.2). */
  minTaperThresholdMinutes: number;
}

export const DEFAULT_FLOOR_MINUTES = 25;
export const DEFAULT_MIN_TAPER_THRESHOLD_MINUTES = 10;

function rawCurveValue(config: TaperConfig, dayIndex: number): number {
  const day1 = config.baselineMinutes * (1 - config.frontLoadPct);
  if (dayIndex === 1) return day1;

  if (config.mode === "linear") {
    const perDay = config.linearDailyReductionMinutes ?? 0;
    return day1 - perDay * (dayIndex - 1);
  }

  const dailyPct = 1 - Math.pow(1 - config.weeklyReductionPct, 1 / 7);
  return day1 * Math.pow(1 - dailyPct, dayIndex - 1);
}

/** The allowance, in minutes, for the given 1-based day of a taper plan. Pure function of
 *  (config, dayIndex) — callers own all history/timing; this never looks at a clock. */
export function dailyAllowanceMinutes(config: TaperConfig, dayIndex: number): number {
  if (!Number.isInteger(dayIndex) || dayIndex < 1) {
    throw new RangeError(`dayIndex must be a positive integer, got ${dayIndex}`);
  }

  const raw = Math.max(rawCurveValue(config, dayIndex), 0);

  if (config.fullElimination) {
    return raw < config.minTaperThresholdMinutes ? 0 : raw;
  }
  return Math.max(raw, config.floorMinutes);
}

/**
 * The smallest day index at which the plan's allowance first reaches `targetMinutes` or below.
 * Used to price a plan-loosening change in days (Section 2.3): compare this for the current
 * config vs. a proposed looser one. Returns +Infinity if the plan never reaches the target
 * within `maxDays` (e.g. the floor sits above the target and full elimination isn't chosen).
 */
export function daysToReachTarget(
  config: TaperConfig,
  targetMinutes: number,
  maxDays = 3650,
): number {
  for (let day = 1; day <= maxDays; day++) {
    if (dailyAllowanceMinutes(config, day) <= targetMinutes) return day;
  }
  return Number.POSITIVE_INFINITY;
}
