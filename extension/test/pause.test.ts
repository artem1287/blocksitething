import { describe, expect, it } from "vitest";
import { shouldTriggerPause } from "../src/lib/pause";

describe("shouldTriggerPause", () => {
  const enabled = ["instagram.com", "x.com"];

  it("fires when freshly navigating to an enabled domain from elsewhere", () => {
    expect(shouldTriggerPause("instagram.com", "google.com", enabled)).toBe(true);
  });

  it("fires when there is no previous domain at all (a brand new tab)", () => {
    expect(shouldTriggerPause("instagram.com", null, enabled)).toBe(true);
  });

  it("does not fire again for internal navigation within the same domain", () => {
    expect(shouldTriggerPause("instagram.com", "instagram.com", enabled)).toBe(false);
  });

  it("does not fire for a domain that isn't opted in", () => {
    expect(shouldTriggerPause("youtube.com", "google.com", enabled)).toBe(false);
  });
});
