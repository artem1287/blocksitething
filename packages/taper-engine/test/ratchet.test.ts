import { describe, expect, it } from "vitest";
import { nextLocalMidnight, planChangeDelayDays } from "../src/ratchet";
import type { TaperConfig } from "../src/curve";

function config(overrides: Partial<TaperConfig> = {}): TaperConfig {
  return {
    baselineMinutes: 100,
    frontLoadPct: 0.15,
    mode: "percentage",
    weeklyReductionPct: 0.15,
    floorMinutes: 0,
    fullElimination: false,
    minTaperThresholdMinutes: 10,
    ...overrides,
  };
}

describe("planChangeDelayDays", () => {
  it("reports positive extra days when loosening the pace (gentler weekly reduction)", () => {
    const current = config({ weeklyReductionPct: 0.4 });
    const loosened = config({ weeklyReductionPct: 0.15 });
    const extraDays = planChangeDelayDays(current, loosened, 30);
    expect(extraDays).toBeGreaterThan(0);
  });

  it("reports zero for an unchanged plan", () => {
    const same = config();
    expect(planChangeDelayDays(same, same, 30)).toBe(0);
  });

  it("reports negative extra days when tightening the pace", () => {
    const current = config({ weeklyReductionPct: 0.15 });
    const tightened = config({ weeklyReductionPct: 0.4 });
    expect(planChangeDelayDays(current, tightened, 30)).toBeLessThan(0);
  });

  it("returns +Infinity when the change makes the target unreachable", () => {
    const current = config({ floorMinutes: 0 });
    const raisedFloor = config({ floorMinutes: 50 });
    expect(planChangeDelayDays(current, raisedFloor, 10)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns 0 when the target was already unreachable on both sides", () => {
    const a = config({ floorMinutes: 50 });
    const b = config({ floorMinutes: 60 });
    expect(planChangeDelayDays(a, b, 10)).toBe(0);
  });
});

describe("nextLocalMidnight", () => {
  it("returns local midnight at the start of the following calendar day", () => {
    const now = new Date(2026, 2, 5, 14, 30, 0);
    const next = nextLocalMidnight(now);
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(2);
    expect(next.getDate()).toBe(6);
    expect(next.getHours()).toBe(0);
    expect(next.getMinutes()).toBe(0);
    expect(next.getSeconds()).toBe(0);
    expect(next.getMilliseconds()).toBe(0);
  });

  it("rolls over the month/year boundary correctly", () => {
    const now = new Date(2025, 11, 31, 23, 59, 59);
    const next = nextLocalMidnight(now);
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(0);
    expect(next.getDate()).toBe(1);
  });

  it("still advances a full day when called exactly at midnight", () => {
    const now = new Date(2026, 2, 5, 0, 0, 0, 0);
    const next = nextLocalMidnight(now);
    expect(next.getDate()).toBe(6);
  });
});
