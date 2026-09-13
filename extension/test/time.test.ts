import { describe, expect, it } from "vitest";
import { minutesToTimeString, timeStringToMinutes } from "../src/lib/time";

describe("minutesToTimeString / timeStringToMinutes", () => {
  it("round-trips", () => {
    for (const minutes of [0, 5, 60, 90, 9 * 60, 23 * 60 + 59]) {
      expect(timeStringToMinutes(minutesToTimeString(minutes))).toBe(minutes);
    }
  });

  it("zero-pads single-digit hours and minutes", () => {
    expect(minutesToTimeString(65)).toBe("01:05");
  });

  it("wraps at 24 hours", () => {
    expect(minutesToTimeString(24 * 60)).toBe("00:00");
  });
});
