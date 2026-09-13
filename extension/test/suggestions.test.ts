import { describe, expect, it } from "vitest";
import { pickSuggestion } from "../src/lib/suggestions";

describe("pickSuggestion", () => {
  const list = ["a", "b", "c", "d"];

  it("picks the first item at randomValue 0", () => {
    expect(pickSuggestion(list, 0)).toBe("a");
  });

  it("picks the last item just under randomValue 1", () => {
    expect(pickSuggestion(list, 0.9999)).toBe("d");
  });

  it("never indexes out of bounds even at randomValue exactly 1", () => {
    expect(pickSuggestion(list, 1)).toBe("d");
  });

  it("returns an empty string for an empty list", () => {
    expect(pickSuggestion([], 0.5)).toBe("");
  });
});
