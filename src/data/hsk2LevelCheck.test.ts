import { describe, expect, it } from "vitest";
import {
  HSK2_LEVEL_CHECK_ITEMS,
  HSK2_LEVEL_CHECK_SKILL_COUNTS,
} from "./hsk2LevelCheck";

describe("HSK2 local objective level check", () => {
  it("projects sixty reviewed local-only items from form A", () => {
    expect(HSK2_LEVEL_CHECK_ITEMS).toHaveLength(60);
    expect(HSK2_LEVEL_CHECK_SKILL_COUNTS).toEqual({
      listening: 15,
      reading: 15,
      vocabulary: 15,
      grammar: 15,
    });
    expect(HSK2_LEVEL_CHECK_ITEMS.every((item) =>
      item.options.length === 4
      && item.measurementEligible === false
      && item.masteryEligible === false
      && item.prerequisiteWaiverEligible === false
    )).toBe(true);
  });

  it("binds listening practice to synthetic TTS without scoring mastery", () => {
    const listening = HSK2_LEVEL_CHECK_ITEMS.filter(
      (item) => item.skill === "listening",
    );
    expect(listening).toHaveLength(15);
    expect(listening.every((item) => item.syntheticTtsText !== null)).toBe(true);
    expect(HSK2_LEVEL_CHECK_ITEMS.filter(
      (item) => item.skill !== "listening",
    ).every((item) => item.syntheticTtsText === null)).toBe(true);
  });
});
