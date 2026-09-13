/**
 * Whether the pre-open pause (Section 5) should fire for this navigation — a fresh "entry" into
 * an opted-in domain, not internal navigation within a site already open. Independent of any
 * taper allowance: callers never consult it for this decision.
 */
export function shouldTriggerPause(domain: string, previousDomain: string | null, enabledDomains: string[]): boolean {
  if (!enabledDomains.includes(domain)) return false;
  return previousDomain !== domain;
}
