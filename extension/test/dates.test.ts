import { describe, expect, it } from "vitest";
import { addDaysToDateKey, dateKeyRange, toLocalDateKey } from "../src/lib/dates";

describe("addDaysToDateKey", () => {
  it("adds positive days, rolling over month/year boundaries", () => {
    expect(addDaysToDateKey("2025-12-30", 3)).toBe("2026-01-02");
  });

  it("subtracts with a negative count", () => {
    expect(addDaysToDateKey("2026-01-02", -3)).toBe("2025-12-30");
  });

  it("is a no-op at 0", () => {
    expect(addDaysToDateKey("2026-03-05", 0)).toBe("2026-03-05");
  });
});

describe("dateKeyRange", () => {
  it("returns `count` consecutive keys starting at the given date, inclusive", () => {
    expect(dateKeyRange("2026-03-01", 3)).toEqual(["2026-03-01", "2026-03-02", "2026-03-03"]);
  });

  it("returns an empty array for count 0", () => {
    expect(dateKeyRange("2026-03-01", 0)).toEqual([]);
  });
});

describe("toLocalDateKey (re-exported, shared with lib/stats)", () => {
  it("formats using local calendar components, zero-padded", () => {
    expect(toLocalDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
