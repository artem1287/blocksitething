import { describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "../src/index.js";

describe("toolchain smoke test", () => {
  it("resolves the pure engine module", () => {
    expect(ENGINE_VERSION).toBe("0.0.1");
  });
});
