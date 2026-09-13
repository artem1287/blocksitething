export interface BlocklistEntry {
  id: string;
  domain: string;
  category: string;
  ruleId: number;
  addedAt: number;
  /** Self-reported daily baseline for this one site (Section 2.1's "per category/site" ask).
   *  Only meaningful once the taper plan is enabled; free-tier flat scheduling ignores it. */
  baselineMinutes: number;
}

export interface Schedule {
  enabled: boolean;
  /** 0 = Sunday .. 6 = Saturday */
  days: number[];
  /** Minutes since local midnight, [0, 1440). */
  startMinute: number;
  /** Minutes since local midnight, [0, 1440). If <= startMinute, the window wraps past midnight. */
  endMinute: number;
}

export type DailyStats = Record<string, number>;

export type PaceTierName = "gentle" | "moderate" | "aggressive";

export interface TaperPlanState {
  enabled: boolean;
  paceTier: PaceTierName;
  mode: "percentage" | "linear";
  linearDailyReductionMinutes: number;
  floorMinutes: number;
  fullElimination: boolean;
  minTaperThresholdMinutes: number;
  /** Local date ("YYYY-MM-DD") the plan's day-index-1 is anchored to. */
  planStartDate: string;
  /** The one entry (Section 2.1) that gets an unconditional hard block during its focus hours,
   *  on top of still participating in the taper allowance the rest of the day. Null = not set. */
  worstOffenderEntryId: string | null;
  worstOffenderSchedule: Schedule | null;
  /** Set once the 48h self-report/measured blend (Section 2.1) has been applied, so it only
   *  ever happens once per plan. */
  reconciledAt: string | null;
}

export interface PendingPlanChange {
  effectiveDate: string;
  changes: Partial<TaperPlanState>;
  /** Per-entry id -> new baselineMinutes, staged from the Allowances screen. */
  baselineChanges: Record<string, number>;
}

export interface DailyTaperRecord {
  minutesUsedByDomain: Record<string, number>;
  allowanceByDomain: Record<string, number>;
  /** Escape-valve bonus (Section 2.4), added on top of the curve's allowance for today only —
   *  the curve itself is never touched, so tomorrow's computed allowance is unaffected. */
  bonusMinutesByDomain: Record<string, number>;
  /** Whether every taper-tracked domain stayed within its allowance this day. Frozen once the
   *  day rolls over — never recomputed afterward (Section 2.3's ratchet applies to history too). */
  respected: boolean;
  streakAfter: number;
}

export interface StorageSchema {
  blocklist: BlocklistEntry[];
  schedule: Schedule;
  nextRuleId: number;
  /** Keyed by local date ("YYYY-MM-DD"); only today's key is ever kept — see pruneToToday. */
  statsByDate: Record<string, DailyStats>;
  /** Null until the user (Premium — enforced server-side in Phase 4; this flag is a local
   *  placeholder until then) turns on a taper plan. */
  taperPlan: TaperPlanState | null;
  /** Keyed by local date. Unlike statsByDate, this is retained indefinitely once taper is
   *  enabled — the history/analytics premium upsell (Section 3) is exactly this data. */
  taperHistory: Record<string, DailyTaperRecord>;
  escapeValveHistory: { usedAt: number; reason: string }[];
  /** A "soft" plan-level change (Section 2.3) staged at save time, applied at the next local
   *  midnight — never immediately, so it can't be used to undo today's already-locked allowance.
   *  `changes` covers plan-wide fields (pace, floor, ...); `baselineChanges` covers per-site
   *  allowance edits from the Allowances screen. Both stage into the same pending record so
   *  editing one doesn't clobber a change already staged from the other screen. */
  pendingPlanChange: PendingPlanChange | null;
  /** The local date this device last ran day-rollover processing for (finalizing the previous
   *  day's taper history, applying a pending plan change, checking the 48h reconciliation). */
  lastProcessedDateKey: string | null;
  /** Set while the ~10-minute escape-valve delay (Section 2.4) is counting down, so it survives
   *  a page reload or a service-worker restart. */
  pendingEscapeValveRequest: { domain: string; requestedAt: number; reason: string } | null;
  /** True once the user dismisses the "enable incognito" prompt. Reset to false whenever we
   *  observe incognito access is currently granted, so a later revocation re-surfaces it
   *  (Section 4) instead of leaving it dismissed forever. */
  hideIncognitoPrompt: boolean;
  pauseSettings: PauseSettings;
}

/** The pre-open "consider before you open this" interstitial (Section 5) — independent of the
 *  taper allowance; it only adds a moment of friction before entry. */
export interface PauseSettings {
  enabledDomains: string[];
  durationSeconds: number;
}

export const DEFAULT_PAUSE_SETTINGS: PauseSettings = {
  enabledDomains: [],
  durationSeconds: 8,
};

export const DEFAULT_SCHEDULE: Schedule = {
  enabled: false,
  days: [0, 1, 2, 3, 4, 5, 6],
  startMinute: 9 * 60,
  endMinute: 17 * 60,
};

export const DEFAULT_STORAGE: StorageSchema = {
  blocklist: [],
  schedule: DEFAULT_SCHEDULE,
  nextRuleId: 1,
  statsByDate: {},
  taperPlan: null,
  taperHistory: {},
  escapeValveHistory: [],
  pendingPlanChange: null,
  lastProcessedDateKey: null,
  pendingEscapeValveRequest: null,
  hideIncognitoPrompt: false,
  pauseSettings: DEFAULT_PAUSE_SETTINGS,
};

export const DEFAULT_BASELINE_MINUTES = 90;
