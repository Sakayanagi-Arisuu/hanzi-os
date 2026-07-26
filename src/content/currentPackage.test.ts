import { describe, expect, it } from "vitest";
import { CONTENT_VERSION } from "../data/curriculum";
import {
  CURRENT_CONTENT_CLOSED_ALPHA_ELIGIBLE,
  CURRENT_CONTENT_MANIFEST_SHA256,
  CURRENT_CONTENT_PACKAGE,
  CURRENT_CONTENT_PRODUCTION_ELIGIBLE,
} from "./currentPackage";

describe("current content package binding", () => {
  it("binds the runtime version to an exact manifest digest", () => {
    expect(CURRENT_CONTENT_PACKAGE.contentVersion).toBe(CONTENT_VERSION);
    expect(CURRENT_CONTENT_MANIFEST_SHA256).toMatch(/^sha256:[a-f0-9]{64}$/u);
  });

  it("does not expose the closed-alpha candidate as production eligible", () => {
    expect(CURRENT_CONTENT_PACKAGE.audience).toBe("closed-alpha");
    expect(CURRENT_CONTENT_PACKAGE.lifecycle).toBe("candidate");
    expect(CURRENT_CONTENT_CLOSED_ALPHA_ELIGIBLE).toBe(false);
    expect(CURRENT_CONTENT_PRODUCTION_ELIGIBLE).toBe(false);
  });
});
