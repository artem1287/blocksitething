import { describe, expect, it } from "vitest";
import { cumulativeReclaimedMinutes, milestoneReachedAt, nextStreakCount } from "../src/rewards";

describe("nextStreakCount", () => {
  it("increments when today's allowance was respected", () => {
    expect(nextStreakCount(0, true)).toBe(1);
    expect(nextStreakCount(6, true)).toBe(7);
  });

  it("resets to zero when today's allowance was exceeded", () => {
    expect(nextStreakCount(29, false)).toBe(0);
  });
});

describe("milestoneReachedAt", () => {
  it("fires on exactly day 3, 7, 14, and 30", () => {
    expect(milestoneReachedAt(3)).toBe(3);
    expect(milestoneReachedAt(7)).toBe(7);
    expect(milestoneReachedAt(14)).toBe(14);
    expect(milestoneReachedAt(30)).toBe(30);
  });

  it("does not fire on non-milestone streak counts, including ones past 30", () => {
    for (const streak of [0, 1, 2, 4, 5, 6, 8, 13, 15, 29, 31, 100]) {
      expect(milestoneReachedAt(streak)).toBeNull();
    }
  });
});

describe("cumulativeReclaimedMinutes", () => {
  it("sums baseline-minus-allowance across days", () => {
    const days = [
      { baselineMinutes: 100, allowanceMinutes: 85 },
      { baselineMinutes: 100, allowanceMinutes: 72 },
    ];
    expect(cumulativeReclaimedMinutes(days)).toBe(15 + 28);
  });

  it("returns 0 for no history", () => {
    expect(cumulativeReclaimedMinutes([])).toBe(0);
  });

  it("never lets a day count negatively against the total", () => {
    const days = [
      { baselineMinutes: 100, allowanceMinutes: 85 },
      { baselineMinutes: 50, allowanceMinutes: 65 }, // e.g. an escape-valve-boosted day
    ];
    expect(cumulativeReclaimedMinutes(days)).toBe(15);
  });
});
