// Deliberately untyped against the `chrome` namespace: that global only exists inside a real
// extension context, and this function needs to stay callable from plain Vitest/Node tests.
// The shape below is exactly what chrome.declarativeNetRequest.Rule expects on the wire —
// callers cast to that type at the one place they actually call the browser API.
export interface BlockRule {
  id: number;
  priority: number;
  action: {
    type: "redirect";
    redirect: { url: string };
  };
  condition: {
    urlFilter: string;
    resourceTypes: ["main_frame"];
  };
}

/** Redirects top-level navigations to `domain` (and subdomains) to the blocked-page UI. */
export function buildBlockRule(domain: string, ruleId: number, blockedPageUrl: string): BlockRule {
  return {
    id: ruleId,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { url: `${blockedPageUrl}?domain=${encodeURIComponent(domain)}` },
    },
    condition: {
      urlFilter: `||${domain}^`,
      resourceTypes: ["main_frame"],
    },
  };
}
