import { describe, expect, it } from "vitest";
import { isWithinSchedule } from "../src/lib/schedule";
import type { Schedule } from "../src/shared/types";

const MON = 1;
const TUE = 2;

function schedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    enabled: true,
    days: [MON],
    startMinute: 9 * 60,
    endMinute: 17 * 60,
    ...overrides,
  };
}

describe("isWithinSchedule — same-day window", () => {
  it("is inactive while disabled, regardless of time", () => {
    expect(isWithinSchedule(schedule({ enabled: false }), MON, 10 * 60)).toBe(false);
  });

  it("is active at the start boundary (inclusive)", () => {
    expect(isWithinSchedule(schedule(), MON, 9 * 60)).toBe(true);
  });

  it("is inactive at the end boundary (exclusive)", () => {
    expect(isWithinSchedule(schedule(), MON, 17 * 60)).toBe(false);
  });

  it("is inactive one minute before start", () => {
    expect(isWithinSchedule(schedule(), MON, 9 * 60 - 1)).toBe(false);
  });

  it("is inactive on a day not in the schedule", () => {
    expect(isWithinSchedule(schedule(), TUE, 10 * 60)).toBe(false);
  });

  it("treats a zero-length window as never active", () => {
    expect(isWithinSchedule(schedule({ startMinute: 9 * 60, endMinute: 9 * 60 }), MON, 9 * 60)).toBe(
      false,
    );
  });
});

describe("isWithinSchedule — overnight window", () => {
  const overnight = schedule({ days: [MON], startMinute: 22 * 60, endMinute: 6 * 60 });

  it("is active late on the scheduled day", () => {
    expect(isWithinSchedule(overnight, MON, 23 * 60)).toBe(true);
  });

  it("is active early the following calendar day even though that day isn't listed", () => {
    expect(isWithinSchedule(overnight, TUE, 3 * 60)).toBe(true);
  });

  it("is inactive once the early segment ends the following day", () => {
    expect(isWithinSchedule(overnight, TUE, 6 * 60)).toBe(false);
  });

  it("is inactive during the day, between the two segments", () => {
    expect(isWithinSchedule(overnight, MON, 12 * 60)).toBe(false);
  });

  it("does not bleed into the day after the wrap", () => {
    const wednesday = 3;
    expect(isWithinSchedule(overnight, wednesday, 3 * 60)).toBe(false);
  });
});
