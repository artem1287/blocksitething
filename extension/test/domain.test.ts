import { describe, expect, it } from "vitest";
import { originPatternsFor } from "../src/lib/domain";

describe("originPatternsFor", () => {
  it("covers the bare domain and all subdomains", () => {
    expect(originPatternsFor("instagram.com")).toEqual(["*://instagram.com/*", "*://*.instagram.com/*"]);
  });
});
