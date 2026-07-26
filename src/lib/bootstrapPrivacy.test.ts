import { describe, expect, it } from "vitest";
import { shouldGateLearningBootstrap } from "./bootstrapPrivacy";

describe("learning bootstrap privacy gate", () => {
  it("keeps cached learning state hidden while account ownership is unresolved", () => {
    expect(shouldGateLearningBootstrap("checking")).toBe(true);
  });

  it.each(["local-only", "offline", "syncing", "synced", "error"] as const)(
    "releases the gate after reconciliation enters %s",
    (phase) => expect(shouldGateLearningBootstrap(phase)).toBe(false),
  );
});
