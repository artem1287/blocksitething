import { describe, expect, it } from "vitest";
import { buildExtensionDetailsUrl } from "../src/lib/incognito";

describe("buildExtensionDetailsUrl", () => {
  it("links straight to the extension's own details page", () => {
    expect(buildExtensionDetailsUrl("abcdefghijklmnop")).toBe("chrome://extensions/?id=abcdefghijklmnop");
  });
});
