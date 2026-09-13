import { describe, expect, it } from "vitest";
import { incrementStat, pruneToToday, toLocalDateKey } from "../src/lib/stats";

describe("toLocalDateKey", () => {
  it("formats using local calendar components, zero-padded", () => {
    expect(toLocalDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toLocalDateKey(new Date(2026, 10, 23))).toBe("2026-11-23");
  });
});

describe("pruneToToday", () => {
  it("drops every date key except today's", () => {
    const stats = { "2026-01-01": { a: 3 }, "2026-01-02": { b: 1 } };
    expect(pruneToToday(stats, "2026-01-02")).toEqual({ "2026-01-02": { b: 1 } });
  });

  it("returns an empty map for today when there is no existing entry", () => {
    expect(pruneToToday({}, "2026-01-02")).toEqual({ "2026-01-02": {} });
  });
});

describe("incrementStat", () => {
  it("starts a domain at 1", () => {
    expect(incrementStat({}, "instagram.com")).toEqual({ "instagram.com": 1 });
  });

  it("increments an existing count without mutating the input", () => {
    const before = { "instagram.com": 2 };
    const after = incrementStat(before, "instagram.com");
    expect(after).toEqual({ "instagram.com": 3 });
    expect(before).toEqual({ "instagram.com": 2 });
  });
});
