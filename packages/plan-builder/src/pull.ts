import type { PaceLabel, UsageLevel } from "./onboarding";

/** The quiz's "how much of a pull is it" self-check — a friendlier reframing of the same
 *  three-tier signal as the raw usage-level buckets, asked per category. Quietly drives both
 *  the baseline estimate (via PULL_LEVEL_TO_USAGE, reusing the existing usage-level math
 *  unchanged) and the pace pre-selected in the next step. */
export type PullLevel = "barely_notice" | "sometimes_hard" | "hard_to_stop";

export const PULL_LEVEL_TO_USAGE: Record<PullLevel, UsageLevel> = {
  barely_notice: "a_little",
  sometimes_hard: "a_lot",
  hard_to_stop: "constantly",
};

const PULL_LEVEL_TO_PACE: Record<PullLevel, PaceLabel> = {
  barely_notice: "ease_in",
  sometimes_hard: "steady",
  hard_to_stop: "cut_now",
};

const PULL_LEVEL_RANK: Record<PullLevel, number> = {
  barely_notice: 0,
  sometimes_hard: 1,
  hard_to_stop: 2,
};

/** The pace pre-selected on the "pick your pace" screen — driven by the single most severe pull
 *  level across every category answered, not forced, just pre-picked so the default already
 *  feels right. */
export function recommendedPaceFromPullLevels(levels: PullLevel[]): PaceLabel {
  if (levels.length === 0) return "steady";
  const worst = levels.reduce((a, b) => (PULL_LEVEL_RANK[b] > PULL_LEVEL_RANK[a] ? b : a));
  return PULL_LEVEL_TO_PACE[worst];
}
