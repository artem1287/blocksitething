import { describe, expect, it } from "vitest";
import {
  PACE_TIERS,
  dailyAllowanceMinutes,
  daysToReachTarget,
  type TaperConfig,
} from "../src/curve";

function baseConfig(overrides: Partial<TaperConfig> = {}): TaperConfig {
  return {
    baselineMinutes: 100,
    frontLoadPct: 0.15,
    mode: "percentage",
    weeklyReductionPct: 0.15,
    floorMinutes: 25,
    fullElimination: false,
    minTaperThresholdMinutes: 10,
    ...overrides,
  };
}

describe("PACE_TIERS", () => {
  it("matches the brief's table exactly", () => {
    expect(PACE_TIERS.gentle).toEqual({ frontLoadPct: 0.15, weeklyReductionPct: 0.15 });
    expect(PACE_TIERS.moderate).toEqual({ frontLoadPct: 0.2, weeklyReductionPct: 0.25 });
    expect(PACE_TIERS.aggressive).toEqual({ frontLoadPct: 0.25, weeklyReductionPct: 0.4 });
  });
});

describe("dailyAllowanceMinutes — validation", () => {
  it("rejects a non-positive day index", () => {
    expect(() => dailyAllowanceMinutes(baseConfig(), 0)).toThrow(RangeError);
    expect(() => dailyAllowanceMinutes(baseConfig(), -1)).toThrow(RangeError);
  });

  it("rejects a non-integer day index", () => {
    expect(() => dailyAllowanceMinutes(baseConfig(), 1.5)).toThrow(RangeError);
  });
});

describe("dailyAllowanceMinutes — percentage mode, day one", () => {
  it("applies exactly the front-load cut on day 1, for every tier", () => {
    for (const [tierName, tier] of Object.entries(PACE_TIERS)) {
      const config = baseConfig({ baselineMinutes: 200, ...tier });
      expect(dailyAllowanceMinutes(config, 1)).toBeCloseTo(200 * (1 - tier.frontLoadPct), 9);
    }
  });
});

describe("dailyAllowanceMinutes — percentage mode, weekly compounding", () => {
  it("reaches exactly one week's worth of reduction after 7 more days, for every tier", () => {
    for (const tier of Object.values(PACE_TIERS)) {
      const config = baseConfig({ baselineMinutes: 300, floorMinutes: 0, ...tier });
      const day1 = dailyAllowanceMinutes(config, 1);
      const day8 = dailyAllowanceMinutes(config, 8);
      expect(day8).toBeCloseTo(day1 * (1 - tier.weeklyReductionPct), 6);
    }
  });

  it("decays monotonically day over day", () => {
    const config = baseConfig({ floorMinutes: 0 });
    let previous = dailyAllowanceMinutes(config, 1);
    for (let d = 2; d <= 30; d++) {
      const current = dailyAllowanceMinutes(config, d);
      expect(current).toBeLessThanOrEqual(previous);
      previous = current;
    }
  });
});

describe("dailyAllowanceMinutes — maintenance floor", () => {
  it("holds at the floor once the raw curve would drop below it, and stays there", () => {
    // Aggressive decay on a small baseline crosses a 25-minute floor quickly.
    const config = baseConfig({ baselineMinutes: 60, weeklyReductionPct: 0.4, frontLoadPct: 0.25, floorMinutes: 25 });
    const values = Array.from({ length: 120 }, (_, i) => dailyAllowanceMinutes(config, i + 1));
    const firstFloorDay = values.findIndex((v) => v === 25);
    expect(firstFloorDay).toBeGreaterThan(-1);
    for (const v of values.slice(firstFloorDay)) {
      expect(v).toBe(25);
    }
  });

  it("never returns a value below the floor", () => {
    const config = baseConfig({ floorMinutes: 30 });
    for (let d = 1; d <= 365; d++) {
      expect(dailyAllowanceMinutes(config, d)).toBeGreaterThanOrEqual(30);
    }
  });
});

describe("dailyAllowanceMinutes — full elimination", () => {
  it("snaps to exactly zero once below the minimum taper threshold, instead of decaying forever", () => {
    const config = baseConfig({
      baselineMinutes: 40,
      weeklyReductionPct: 0.4,
      fullElimination: true,
      minTaperThresholdMinutes: 10,
    });
    const values = Array.from({ length: 200 }, (_, i) => dailyAllowanceMinutes(config, i + 1));
    const firstZeroDay = values.findIndex((v) => v === 0);
    expect(firstZeroDay).toBeGreaterThan(-1);
    for (const v of values.slice(firstZeroDay)) {
      expect(v).toBe(0);
    }
    // and everything before that point was still above the threshold
    for (const v of values.slice(0, firstZeroDay)) {
      expect(v).toBeGreaterThanOrEqual(config.minTaperThresholdMinutes);
    }
  });

  it("ignores floorMinutes entirely when full elimination is chosen", () => {
    const config = baseConfig({
      baselineMinutes: 40,
      weeklyReductionPct: 0.4,
      fullElimination: true,
      floorMinutes: 1000, // should have no effect
    });
    const day200 = dailyAllowanceMinutes(config, 200);
    expect(day200).toBe(0);
  });
});

describe("dailyAllowanceMinutes — linear mode", () => {
  it("still applies the day-1 front-load cut", () => {
    const config = baseConfig({ mode: "linear", linearDailyReductionMinutes: 2, floorMinutes: 0 });
    expect(dailyAllowanceMinutes(config, 1)).toBeCloseTo(100 * 0.85, 9);
  });

  it("reduces by a flat amount per day", () => {
    const config = baseConfig({ mode: "linear", linearDailyReductionMinutes: 2, floorMinutes: 0 });
    const day1 = dailyAllowanceMinutes(config, 1);
    expect(dailyAllowanceMinutes(config, 2)).toBeCloseTo(day1 - 2, 9);
    expect(dailyAllowanceMinutes(config, 10)).toBeCloseTo(day1 - 18, 9);
  });

  it("still respects the floor instead of going negative", () => {
    const config = baseConfig({ mode: "linear", linearDailyReductionMinutes: 10, floorMinutes: 20 });
    expect(dailyAllowanceMinutes(config, 100)).toBe(20);
  });
});

describe("dailyAllowanceMinutes — proportionality (supports baseline re-anchoring)", () => {
  it("scales output linearly with baselineMinutes, before any floor/threshold clamp applies", () => {
    const small = baseConfig({ baselineMinutes: 100, floorMinutes: 0 });
    const scaled = baseConfig({ baselineMinutes: 250, floorMinutes: 0 }); // 2.5x
    for (const d of [1, 2, 5, 10]) {
      expect(dailyAllowanceMinutes(scaled, d)).toBeCloseTo(dailyAllowanceMinutes(small, d) * 2.5, 6);
    }
  });
});

describe("daysToReachTarget", () => {
  it("finds the exact day a flat linear reduction crosses a target", () => {
    // day1 = 100*(1-0.15) = 85; drops 2/day with floor 0 -> reaches 75 on day 6 (85 - 2*5 = 75).
    const config = baseConfig({ mode: "linear", linearDailyReductionMinutes: 2, floorMinutes: 0 });
    expect(daysToReachTarget(config, 75)).toBe(6);
  });

  it("returns day 1 when the target is already at or above day one's allowance", () => {
    const config = baseConfig({ floorMinutes: 0 });
    expect(daysToReachTarget(config, 1000)).toBe(1);
  });

  it("returns Infinity when the floor sits above the target and full elimination isn't chosen", () => {
    const config = baseConfig({ floorMinutes: 50 });
    expect(daysToReachTarget(config, 10)).toBe(Number.POSITIVE_INFINITY);
  });
});
