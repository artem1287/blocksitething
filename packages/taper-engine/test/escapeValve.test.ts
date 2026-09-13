import { describe, expect, it } from "vitest";
import {
  DEFAULT_ESCAPE_VALVE_CONFIG,
  canUseEscapeValve,
  computeEscapeValveBonus,
  isEscapeValveDelayElapsed,
  type EscapeValveUse,
} from "../src/escapeValve";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("canUseEscapeValve — rolling 7-day window, account-wide", () => {
  it("allows use when there is no history at all", () => {
    expect(canUseEscapeValve([], new Date())).toBe(true);
  });

  it("blocks a second use immediately after the first", () => {
    const now = new Date(2026, 2, 10);
    const history: EscapeValveUse[] = [{ usedAt: now.getTime(), reason: "rough morning" }];
    expect(canUseEscapeValve(history, now)).toBe(false);
  });

  it("stays blocked just under 7 days later", () => {
    const usedAt = new Date(2026, 2, 10).getTime();
    const now = new Date(usedAt + 7 * DAY_MS - 1000);
    expect(canUseEscapeValve([{ usedAt, reason: "x" }], now)).toBe(false);
  });

  it("allows again at exactly 7 days later", () => {
    const usedAt = new Date(2026, 2, 10).getTime();
    const now = new Date(usedAt + 7 * DAY_MS);
    expect(canUseEscapeValve([{ usedAt, reason: "x" }], now)).toBe(true);
  });

  it("allows well beyond 7 days later", () => {
    const usedAt = new Date(2026, 2, 10).getTime();
    const now = new Date(usedAt + 14 * DAY_MS);
    expect(canUseEscapeValve([{ usedAt, reason: "x" }], now)).toBe(true);
  });

  it("is blocked if ANY use in history falls within the window, not just the most recent", () => {
    const now = new Date(2026, 2, 10);
    const history: EscapeValveUse[] = [
      { usedAt: new Date(2026, 1, 1).getTime(), reason: "old, outside window" },
      { usedAt: new Date(2026, 2, 8).getTime(), reason: "recent, inside window" },
    ];
    expect(canUseEscapeValve(history, now)).toBe(false);
  });
});

describe("isEscapeValveDelayElapsed", () => {
  const requestedAt = new Date(2026, 2, 10, 9, 0, 0);

  it("is false before the delay has passed", () => {
    const now = new Date(requestedAt.getTime() + 5 * 60 * 1000);
    expect(isEscapeValveDelayElapsed(requestedAt, now, 10)).toBe(false);
  });

  it("is true at exactly the delay", () => {
    const now = new Date(requestedAt.getTime() + 10 * 60 * 1000);
    expect(isEscapeValveDelayElapsed(requestedAt, now, 10)).toBe(true);
  });

  it("is true well after the delay", () => {
    const now = new Date(requestedAt.getTime() + 60 * 60 * 1000);
    expect(isEscapeValveDelayElapsed(requestedAt, now, 10)).toBe(true);
  });
});

describe("computeEscapeValveBonus", () => {
  it("grants a flat bonus regardless of remaining allowance, in flat mode", () => {
    const config = { ...DEFAULT_ESCAPE_VALVE_CONFIG, bonusType: "flat" as const, flatBonusMinutes: 15 };
    expect(computeEscapeValveBonus(0, config)).toBe(15);
    expect(computeEscapeValveBonus(200, config)).toBe(15);
  });

  it("grants a percentage of today's remaining allowance, in percentage mode", () => {
    const config = { ...DEFAULT_ESCAPE_VALVE_CONFIG, bonusType: "percentage" as const, percentageBonus: 0.5 };
    expect(computeEscapeValveBonus(20, config)).toBe(10);
    expect(computeEscapeValveBonus(0, config)).toBe(0);
  });
});
