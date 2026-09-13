const PROTOCOL_RE = /^[a-z][a-z0-9+.-]*:\/\//i;
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/** Reduces a URL or bare domain to a normalized registrable-ish host, or null if invalid. */
export function normalizeDomain(input: string): string | null {
  let value = input.trim().toLowerCase();
  if (!value) return null;

  value = value.replace(PROTOCOL_RE, "");
  value = value.split(/[/?#]/)[0] ?? "";
  value = value.split(":")[0] ?? "";
  value = value.replace(/^www\./, "");

  return DOMAIN_RE.test(value) ? value : null;
}

/** Host-permission origin patterns covering a domain and its subdomains. */
export function originPatternsFor(domain: string): string[] {
  return [`*://${domain}/*`, `*://*.${domain}/*`];
}
