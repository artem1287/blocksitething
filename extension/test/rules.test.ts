import { describe, expect, it } from "vitest";
import { buildBlockRule } from "../src/lib/rules";

describe("buildBlockRule", () => {
  it("matches the domain and its subdomains via an Adblock-style filter", () => {
    const rule = buildBlockRule("instagram.com", 7, "chrome-extension://abc/blocked.html");
    expect(rule.condition.urlFilter).toBe("||instagram.com^");
    expect(rule.condition.resourceTypes).toEqual(["main_frame"]);
  });

  it("carries the rule id through unchanged, for later removal", () => {
    expect(buildBlockRule("x.com", 42, "url").id).toBe(42);
  });

  it("redirects to the blocked page with the domain URL-encoded in the query string", () => {
    const rule = buildBlockRule("a b.com", 1, "chrome-extension://abc/blocked.html");
    expect(rule.action.redirect.url).toBe("chrome-extension://abc/blocked.html?domain=a%20b.com");
  });
});
