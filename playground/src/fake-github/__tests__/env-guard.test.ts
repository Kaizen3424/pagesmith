import { allowRealGithub, REAL_TARGET_BANNER, REAL_TARGET_ENV } from "../env-guard";
import { describe, expect, it } from "vitest";

describe("env-kill guard (real GitHub refused by default)", () => {
  it("blocks when the flag is absent", () => {
    expect(allowRealGithub({})).toBe(false);
    expect(allowRealGithub({ OTHER: "1" })).toBe(false);
  });

  it("blocks every non-exact value (accept-by-run explicitness)", () => {
    for (const value of [undefined, "", "0", "true", "true ", "1 ", "yes", " 1", " 1 "]) {
      expect(allowRealGithub({ [REAL_TARGET_ENV]: value })).toBe(false);
    }
  });

  it("unblocks only on exactly 1", () => {
    expect(allowRealGithub({ [REAL_TARGET_ENV]: "1" })).toBe(true);
  });

  it("carries the red-banner law string", () => {
    expect(REAL_TARGET_BANNER).toBe("REAL REPO TARGET");
  });
});
