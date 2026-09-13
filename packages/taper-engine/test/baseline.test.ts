import { describe, expect, it } from "vitest";
import { baselineMinutesFromBucket, blendBaseline } from "../src/baseline";

describe("baselineMinutesFromBucket", () => {
  it("maps every bucket to a positive, increasing midpoint", () => {
    const order = ["under_30m", "30_60m", "1_2h", "2_4h", "4h_plus"] as const;
    const values = order.map(baselineMinutesFromBucket);
    for (const v of values) expect(v).toBeGreaterThan(0);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]!);
    }
  });
});

describe("blendBaseline", () => {
  it("defaults to an even 50/50 blend", () => {
    expect(blendBaseline(100, 200)).toBe(150);
  });

  it("weight=1 keeps only the self-reported value", () => {
    expect(blendBaseline(100, 200, 1)).toBe(100);
  });

  it("weight=0 keeps only the measured value", () => {
    expect(blendBaseline(100, 200, 0)).toBe(200);
  });

  it("is linear between the two extremes", () => {
    expect(blendBaseline(100, 200, 0.25)).toBe(175);
  });
});
