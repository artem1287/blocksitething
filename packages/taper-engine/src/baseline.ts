export type UsageBucket = "under_30m" | "30_60m" | "1_2h" | "2_4h" | "4h_plus";

// Bucket midpoints in minutes/day (Section 2.1). The top bucket is open-ended ("4h+"), so its
// value is a judgment call, not a true midpoint — 270 assumes a typical heavy self-reporter is
// closer to 4.5h than to some much larger number.
const BUCKET_MIDPOINT_MINUTES: Record<UsageBucket, number> = {
  under_30m: 20,
  "30_60m": 45,
  "1_2h": 90,
  "2_4h": 180,
  "4h_plus": 270,
};

/** Converts a self-reported usage bucket into an immediate baseline estimate (B0), in minutes. */
export function baselineMinutesFromBucket(bucket: UsageBucket): number {
  return BUCKET_MIDPOINT_MINUTES[bucket];
}

/**
 * Blends the self-reported baseline with the measured average from the first 48h of real
 * tracking (Section 2.1). `weight` is how much to trust the self-report, in [0, 1]; 1 keeps the
 * self-report untouched, 0 uses only the measured average. This never touches allowances already
 * shown for past days — callers apply the blended value only from the reconciliation day forward.
 */
export function blendBaseline(
  selfReportedMinutes: number,
  measuredAvgMinutesPerDay: number,
  weight = 0.5,
): number {
  return selfReportedMinutes * weight + measuredAvgMinutesPerDay * (1 - weight);
}
