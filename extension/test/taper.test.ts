import { describe, expect, it } from "vitest";
import {
  buildTaperConfigForEntry,
  computeDayIndex,
  dayOutcomeRespected,
  isWorstOffenderHardBlocked,
  reconciledEntryBaseline,
} from "../src/lib/taper";
import type { TaperPlanState } from "../src/shared/types";

function plan(overrides: Partial<TaperPlanState> = {}): TaperPlanState {
  return {
    enabled: true,
    paceTier: "gentle",
    mode: "percentage",
    linearDailyReductionMinutes: 0,
    floorMinutes: 25,
    fullElimination: false,
    minTaperThresholdMinutes: 10,
    planStartDate: "2026-03-01",
    worstOffenderEntryId: null,
    worstOffenderSchedule: null,
    reconciledAt: null,
    ...overrides,
  };
}

describe("computeDayIndex", () => {
  it("is 1 on the plan's own start date", () => {
    expect(computeDayIndex("2026-03-01", "2026-03-01")).toBe(1);
  });

  it("counts forward one-based", () => {
    expect(computeDayIndex("2026-03-01", "2026-03-02")).toBe(2);
    expect(computeDayIndex("2026-03-01", "2026-03-08")).toBe(8);
  });

  it("is unaffected by a DST transition (spring-forward, US 2026-03-08)", () => {
    // Elapsed wall-clock hours across this date are 23, not 24 — a naive ms-diff would break.
    expect(computeDayIndex("2026-03-07", "2026-03-09")).toBe(3);
  });

  it("rolls over month and year boundaries", () => {
    expect(computeDayIndex("2025-12-30", "2026-01-02")).toBe(4);
  });
});

describe("buildTaperConfigForEntry", () => {
  it("pulls the pace tier's percentages from the engine's preset table", () => {
    const config = buildTaperConfigForEntry(plan({ paceTier: "aggressive" }), 100);
    expect(config.frontLoadPct).toBe(0.25);
    expect(config.weeklyReductionPct).toBe(0.4);
    expect(config.baselineMinutes).toBe(100);
  });

  it("carries floor, fullElimination, mode, and threshold through unchanged", () => {
    const config = buildTaperConfigForEntry(
      plan({ floorMinutes: 30, fullElimination: true, mode: "linear", linearDailyReductionMinutes: 5, minTaperThresholdMinutes: 12 }),
      80,
    );
    expect(config.floorMinutes).toBe(30);
    expect(config.fullElimination).toBe(true);
    expect(config.mode).toBe("linear");
    expect(config.linearDailyReductionMinutes).toBe(5);
    expect(config.minTaperThresholdMinutes).toBe(12);
  });
});

describe("isWorstOffenderHardBlocked", () => {
  const schedule = { enabled: true, days: [1], startMinute: 9 * 60, endMinute: 17 * 60 };

  it("is false when there is no plan", () => {
    expect(isWorstOffenderHardBlocked(null, "entry-1", 1, 10 * 60)).toBe(false);
  });

  it("is false for an entry that isn't the designated worst offender", () => {
    const p = plan({ worstOffenderEntryId: "entry-1", worstOffenderSchedule: schedule });
    expect(isWorstOffenderHardBlocked(p, "entry-2", 1, 10 * 60)).toBe(false);
  });

  it("is true for the worst offender inside its focus-hour window", () => {
    const p = plan({ worstOffenderEntryId: "entry-1", worstOffenderSchedule: schedule });
    expect(isWorstOffenderHardBlocked(p, "entry-1", 1, 10 * 60)).toBe(true);
  });

  it("is false for the worst offender outside its focus-hour window (still taper-tracked, just not hard-blocked)", () => {
    const p = plan({ worstOffenderEntryId: "entry-1", worstOffenderSchedule: schedule });
    expect(isWorstOffenderHardBlocked(p, "entry-1", 1, 20 * 60)).toBe(false);
  });

  it("is false when a worst offender is designated but has no focus-hour schedule set", () => {
    const p = plan({ worstOffenderEntryId: "entry-1", worstOffenderSchedule: null });
    expect(isWorstOffenderHardBlocked(p, "entry-1", 1, 10 * 60)).toBe(false);
  });
});

describe("reconciledEntryBaseline", () => {
  it("blends the self-report with the average of the measured days", () => {
    expect(reconciledEntryBaseline(100, [180, 220])).toBe(150); // avg 200, 50/50 blend
  });

  it("falls back to the self-reported value when there are no measured days yet", () => {
    expect(reconciledEntryBaseline(100, [])).toBe(100);
  });
});

describe("dayOutcomeRespected", () => {
  it("is true when every tracked domain stayed within its allowance", () => {
    const used = { "a.com": 20, "b.com": 40 };
    const allowance = { "a.com": 25, "b.com": 40 };
    expect(dayOutcomeRespected(used, allowance)).toBe(true);
  });

  it("is false if even one domain went over", () => {
    const used = { "a.com": 26, "b.com": 10 };
    const allowance = { "a.com": 25, "b.com": 40 };
    expect(dayOutcomeRespected(used, allowance)).toBe(false);
  });

  it("is true for a day with no tracked usage at all", () => {
    expect(dayOutcomeRespected({}, {})).toBe(true);
  });
});
