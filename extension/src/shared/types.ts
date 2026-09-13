export interface BlocklistEntry {
  id: string;
  domain: string;
  category: string;
  ruleId: number;
  addedAt: number;
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

export interface StorageSchema {
  blocklist: BlocklistEntry[];
  schedule: Schedule;
  nextRuleId: number;
  /** Keyed by local date ("YYYY-MM-DD"); only today's key is ever kept — see pruneToToday. */
  statsByDate: Record<string, DailyStats>;
}

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
};

export const CATEGORIES = ["Social", "Video", "News", "Shopping", "Other"] as const;
export type Category = (typeof CATEGORIES)[number];
