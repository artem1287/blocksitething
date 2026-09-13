export interface EscapeValveUse {
  usedAt: number; // epoch ms
  reason: string;
}

export interface EscapeValveConfig {
  /** Rolling window, not calendar-week — Section 2.4. */
  cooldownDays: number;
  /** Enforced delay before a granted use actually pays out. */
  delayMinutes: number;
  bonusType: "flat" | "percentage";
  flatBonusMinutes: number;
  /** Fraction of today's remaining allowance, used when bonusType is "percentage". */
  percentageBonus: number;
}

export const DEFAULT_ESCAPE_VALVE_CONFIG: EscapeValveConfig = {
  cooldownDays: 7,
  delayMinutes: 10,
  bonusType: "flat",
  flatBonusMinutes: 15,
  percentageBonus: 0.5,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** One use per rolling `cooldownDays`, account-wide (not per site) — Section 2.4. */
export function canUseEscapeValve(
  history: EscapeValveUse[],
  now: Date,
  config: EscapeValveConfig = DEFAULT_ESCAPE_VALVE_CONFIG,
): boolean {
  const cooldownMs = config.cooldownDays * DAY_MS;
  return !history.some((use) => now.getTime() - use.usedAt < cooldownMs);
}

/** Whether the ~10-minute enforced delay (Section 2.4) has passed since the valve was requested. */
export function isEscapeValveDelayElapsed(requestedAt: Date, now: Date, delayMinutes: number): boolean {
  return now.getTime() - requestedAt.getTime() >= delayMinutes * 60 * 1000;
}

/**
 * The one-time bonus granted for *today only* when the escape valve is used — never changes any
 * future day's plan, since it never touches a TaperConfig at all.
 */
export function computeEscapeValveBonus(
  remainingMinutesToday: number,
  config: EscapeValveConfig = DEFAULT_ESCAPE_VALVE_CONFIG,
): number {
  return config.bonusType === "flat" ? config.flatBonusMinutes : remainingMinutesToday * config.percentageBonus;
}
