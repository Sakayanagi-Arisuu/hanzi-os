import { describe, expect, it } from "vitest";
import {
  HSK3_LEVEL_CHECK_ITEMS,
  HSK3_LEVEL_CHECK_SKILL_COUNTS,
} from "./hsk3LevelCheck";

describe("HSK3 local objective level check", () => {
  it("projects fifty-four reviewed local-only items from form A", () => {
    expect(HSK3_LEVEL_CHECK_ITEMS).toHaveLength(54);
    expect(HSK3_LEVEL_CHECK_SKILL_COUNTS).toEqual({
      listening: 12,
      reading: 12,
      vocabulary: 15,
      grammar: 15,
    });
    expect(HSK3_LEVEL_CHECK_ITEMS.every((item) =>
      item.options.length === 4
      && item.measurementEligible === false
      && item.masteryEligible === false
      && item.prerequisiteWaiverEligible === false
    )).toBe(true);
  });

  it("uses browser TTS only for listening practice", () => {
    const listening = HSK3_LEVEL_CHECK_ITEMS.filter(
      (item) => item.skill === "listening",
    );
    expect(listening).toHaveLength(12);
    expect(listening.every((item) => item.syntheticTtsText !== null)).toBe(true);
    expect(HSK3_LEVEL_CHECK_ITEMS.filter(
      (item) => item.skill !== "listening",
    ).every((item) => item.syntheticTtsText === null)).toBe(true);
  });
});
