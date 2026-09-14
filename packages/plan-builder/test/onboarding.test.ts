import { describe, expect, it } from "vitest";
import {
  baselinesForSelections,
  categoryMinutesForLevel,
  paceTierForLabel,
  pickWorstOffenderCandidate,
  splitBaselineAcrossSites,
  type CategorySelection,
} from "../src/onboarding";

describe("categoryMinutesForLevel", () => {
  it("maps each level to a positive, increasing estimate", () => {
    const little = categoryMinutesForLevel("a_little");
    const lot = categoryMinutesForLevel("a_lot");
    const constantly = categoryMinutesForLevel("constantly");
    expect(little).toBeGreaterThan(0);
    expect(lot).toBeGreaterThan(little);
    expect(constantly).toBeGreaterThan(lot);
  });
});

describe("splitBaselineAcrossSites", () => {
  it("splits evenly across confirmed sites", () => {
    expect(splitBaselineAcrossSites(120, 4)).toBe(30);
  });

  it("never drops below the per-site minimum, even with many sites", () => {
    expect(splitBaselineAcrossSites(60, 10)).toBe(15);
  });

  it("gives the whole amount to a single site", () => {
    expect(splitBaselineAcrossSites(90, 1)).toBe(90);
  });

  it("treats zero sites as a no-op (returns the category total)", () => {
    expect(splitBaselineAcrossSites(90, 0)).toBe(90);
  });
});

describe("paceTierForLabel", () => {
  it("maps the three plain-language labels to the engine's tier names", () => {
    expect(paceTierForLabel("ease_in")).toBe("gentle");
    expect(paceTierForLabel("steady")).toBe("moderate");
    expect(paceTierForLabel("cut_now")).toBe("aggressive");
  });
});

describe("pickWorstOffenderCandidate", () => {
  it("picks the first confirmed site from the highest-usage-level category", () => {
    const selections: CategorySelection[] = [
      { categoryId: "social", usageLevel: "a_little", confirmedDomains: ["instagram.com"] },
      { categoryId: "video", usageLevel: "constantly", confirmedDomains: ["youtube.com", "netflix.com"] },
    ];
    expect(pickWorstOffenderCandidate(selections)).toEqual({ categoryId: "video", domain: "youtube.com" });
  });

  it("breaks ties by keeping the first-selected category", () => {
    const selections: CategorySelection[] = [
      { categoryId: "social", usageLevel: "a_lot", confirmedDomains: ["instagram.com"] },
      { categoryId: "video", usageLevel: "a_lot", confirmedDomains: ["youtube.com"] },
    ];
    expect(pickWorstOffenderCandidate(selections)?.categoryId).toBe("social");
  });

  it("skips a category with no confirmed sites", () => {
    const selections: CategorySelection[] = [
      { categoryId: "social", usageLevel: "constantly", confirmedDomains: [] },
      { categoryId: "video", usageLevel: "a_little", confirmedDomains: ["youtube.com"] },
    ];
    expect(pickWorstOffenderCandidate(selections)?.domain).toBe("youtube.com");
  });

  it("returns null when nothing is confirmed anywhere", () => {
    expect(pickWorstOffenderCandidate([])).toBeNull();
  });
});

describe("baselinesForSelections", () => {
  it("produces a per-domain baseline map across every selected category", () => {
    const selections: CategorySelection[] = [
      { categoryId: "social", usageLevel: "a_lot", confirmedDomains: ["instagram.com", "tiktok.com"] },
      { categoryId: "news", usageLevel: "a_little", confirmedDomains: ["cnn.com"] },
    ];
    const baselines = baselinesForSelections(selections);
    expect(baselines["instagram.com"]).toBe(splitBaselineAcrossSites(categoryMinutesForLevel("a_lot"), 2));
    expect(baselines["tiktok.com"]).toBe(baselines["instagram.com"]);
    expect(baselines["cnn.com"]).toBe(categoryMinutesForLevel("a_little"));
  });

  it("ignores categories with nothing confirmed", () => {
    const selections: CategorySelection[] = [{ categoryId: "gaming", usageLevel: "a_lot", confirmedDomains: [] }];
    expect(baselinesForSelections(selections)).toEqual({});
  });
});
