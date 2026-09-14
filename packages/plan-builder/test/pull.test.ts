import { describe, expect, it } from "vitest";
import { PULL_LEVEL_TO_USAGE, recommendedPaceFromPullLevels } from "../src/pull";

describe("PULL_LEVEL_TO_USAGE", () => {
  it("maps every pull level to a usage level", () => {
    expect(PULL_LEVEL_TO_USAGE.barely_notice).toBe("a_little");
    expect(PULL_LEVEL_TO_USAGE.sometimes_hard).toBe("a_lot");
    expect(PULL_LEVEL_TO_USAGE.hard_to_stop).toBe("constantly");
  });
});

describe("recommendedPaceFromPullLevels", () => {
  it("recommends ease_in when the strongest pull is barely_notice", () => {
    expect(recommendedPaceFromPullLevels(["barely_notice"])).toBe("ease_in");
  });

  it("recommends based on the single most severe pull level across categories", () => {
    expect(recommendedPaceFromPullLevels(["barely_notice", "hard_to_stop", "sometimes_hard"])).toBe("cut_now");
  });

  it("defaults to steady with no answers yet", () => {
    expect(recommendedPaceFromPullLevels([])).toBe("steady");
  });
});
