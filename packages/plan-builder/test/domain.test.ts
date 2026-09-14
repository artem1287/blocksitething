import { describe, expect, it } from "vitest";
import { normalizeDomain } from "../src/domain";

describe("normalizeDomain", () => {
  it("strips protocol, www, path, query, hash, and port", () => {
    expect(normalizeDomain("https://www.instagram.com/reels?x=1#top")).toBe("instagram.com");
    expect(normalizeDomain("http://instagram.com:8080/path")).toBe("instagram.com");
  });

  it("lowercases and trims", () => {
    expect(normalizeDomain("  Instagram.COM  ")).toBe("instagram.com");
  });

  it("accepts a bare domain with no protocol", () => {
    expect(normalizeDomain("instagram.com")).toBe("instagram.com");
  });

  it("accepts subdomains", () => {
    expect(normalizeDomain("news.ycombinator.com")).toBe("news.ycombinator.com");
  });

  it("rejects empty input", () => {
    expect(normalizeDomain("")).toBeNull();
    expect(normalizeDomain("   ")).toBeNull();
  });

  it("rejects input with no dot", () => {
    expect(normalizeDomain("localhost")).toBeNull();
  });

  it("rejects garbage input", () => {
    expect(normalizeDomain("not a domain")).toBeNull();
    expect(normalizeDomain("http://")).toBeNull();
  });
});
