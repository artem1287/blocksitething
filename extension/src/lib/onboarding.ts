import type { PaceTierName } from "@taper/engine";

export type UsageLevel = "a_little" | "a_lot" | "constantly";

// Category-level daily-total estimates (Section 2 step 3) — the user never sees these numbers,
// only the plain labels. Deliberately rough: the 48h measured-baseline reconciliation
// (see lib/taper.ts) corrects them once real tracking data exists.
const USAGE_LEVEL_MINUTES: Record<UsageLevel, number> = {
  a_little: 38, // "30-45m"
  a_lot: 105, // "1.5-2h"
  constantly: 210, // "3h+"
};

export function categoryMinutesForLevel(level: UsageLevel): number {
  return USAGE_LEVEL_MINUTES[level];
}

const MIN_PER_SITE_MINUTES = 15;

/** Splits a category-level total evenly across its confirmed sites, never below a sane floor. */
export function splitBaselineAcrossSites(categoryMinutes: number, siteCount: number): number {
  if (siteCount <= 0) return categoryMinutes;
  return Math.max(MIN_PER_SITE_MINUTES, Math.round(categoryMinutes / siteCount));
}

export type PaceLabel = "ease_in" | "steady" | "cut_now";

const PACE_LABEL_TO_TIER: Record<PaceLabel, PaceTierName> = {
  ease_in: "gentle",
  steady: "moderate",
  cut_now: "aggressive",
};

export function paceTierForLabel(label: PaceLabel): PaceTierName {
  return PACE_LABEL_TO_TIER[label];
}

export interface CategorySelection {
  categoryId: string;
  usageLevel: UsageLevel;
  confirmedDomains: string[];
}

const USAGE_LEVEL_RANK: Record<UsageLevel, number> = { a_little: 0, a_lot: 1, constantly: 2 };

export interface WorstOffenderCandidate {
  categoryId: string;
  domain: string;
}

/** The heaviest-flagged category's first confirmed site — offered as a one-tap suggestion
 *  (Section 2 step 5) rather than making the user type a domain from scratch. */
export function pickWorstOffenderCandidate(selections: CategorySelection[]): WorstOffenderCandidate | null {
  let best: CategorySelection | null = null;
  for (const selection of selections) {
    if (selection.confirmedDomains.length === 0) continue;
    if (!best || USAGE_LEVEL_RANK[selection.usageLevel] > USAGE_LEVEL_RANK[best.usageLevel]) {
      best = selection;
    }
  }
  return best ? { categoryId: best.categoryId, domain: best.confirmedDomains[0]! } : null;
}

/** Every confirmed site's starting baseline, derived from its category's usage level. */
export function baselinesForSelections(selections: CategorySelection[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const selection of selections) {
    if (selection.confirmedDomains.length === 0) continue;
    const perSite = splitBaselineAcrossSites(
      categoryMinutesForLevel(selection.usageLevel),
      selection.confirmedDomains.length,
    );
    for (const domain of selection.confirmedDomains) {
      result[domain] = perSite;
    }
  }
  return result;
}
