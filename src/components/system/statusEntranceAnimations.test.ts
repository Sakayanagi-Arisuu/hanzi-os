import { describe, expect, it } from "vitest";
import { statusEntranceAnimations } from "./statusEntranceAnimations";

const animation = (animationName: string, playState = "running", iterations = 1) => ({
  animationName, playState,
  effect: { getComputedTiming: () => ({ iterations }) },
}) as unknown as Animation;

describe("status greeting entrance timing", () => {
  it("waits for panels but excludes slow finite decoration and infinite loops", () => {
    const panel = animation("sysHoloCoreIn");
    expect(statusEntranceAnimations([
      panel, animation("sysHoloScan"), animation("spin", "running", Infinity),
      animation("sysHoloConsoleIn", "finished"),
    ])).toEqual([panel]);
  });
  it("has no animation wait with reduced motion", () => {
    expect(statusEntranceAnimations([])).toEqual([]);
  });
});
