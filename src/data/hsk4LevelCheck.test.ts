import { describe, expect, it } from "vitest";
import {
  HSK4_LEVEL_CHECK_ITEMS,
  HSK4_LEVEL_CHECK_SKILL_COUNTS,
} from "./hsk4LevelCheck";

describe("HSK4 local objective level check", () => {
  it("projects seventy-two local-only objective items from form A", () => {
    expect(HSK4_LEVEL_CHECK_ITEMS).toHaveLength(72);
    expect(HSK4_LEVEL_CHECK_SKILL_COUNTS).toEqual({
      listening: 18,
      reading: 18,
      vocabulary: 18,
      grammar: 18,
    });
    expect(HSK4_LEVEL_CHECK_ITEMS.every((item) =>
      item.options.length === 4
      && item.measurementEligible === false
      && item.masteryEligible === false
      && item.prerequisiteWaiverEligible === false
    )).toBe(true);
  });

  it("uses browser TTS only for listening practice", () => {
    expect(HSK4_LEVEL_CHECK_ITEMS.filter(
      (item) => item.skill === "listening",
    ).every((item) => item.syntheticTtsText !== null)).toBe(true);
    expect(HSK4_LEVEL_CHECK_ITEMS.filter(
      (item) => item.skill !== "listening",
    ).every((item) => item.syntheticTtsText === null)).toBe(true);
  });
});
