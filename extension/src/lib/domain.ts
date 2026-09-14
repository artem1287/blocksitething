export { normalizeDomain } from "@taper/plan-builder";

/** Host-permission origin patterns covering a domain and its subdomains. */
export function originPatternsFor(domain: string): string[] {
  return [`*://${domain}/*`, `*://*.${domain}/*`];
}
