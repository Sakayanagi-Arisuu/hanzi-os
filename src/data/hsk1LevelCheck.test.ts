import { describe, expect, it } from "vitest";
import {
  HSK1_LEVEL_CHECK_DISCLOSURE,
  HSK1_LEVEL_CHECK_FORM_VERSION,
  HSK1_LEVEL_CHECK_ITEMS,
  HSK1_LEVEL_CHECK_SKILL_COUNTS,
} from "./hsk1LevelCheck";
import { CONTENT_VERSION } from "./curriculum";
import { materializeEvidence } from "../lib/evidence";

describe("HSK1 local level check", () => {
  it("projects the complete source-bound 50-item form", () => {
    expect(HSK1_LEVEL_CHECK_ITEMS).toHaveLength(50);
    expect(HSK1_LEVEL_CHECK_SKILL_COUNTS).toEqual({
      listening: 15,
      reading: 15,
      vocabulary: 10,
      grammar: 10,
    });
    expect(HSK1_LEVEL_CHECK_FORM_VERSION).toContain(CONTENT_VERSION);
    expect(new Set(HSK1_LEVEL_CHECK_ITEMS.map((item) => item.id)).size)
      .toBe(50);
  });

  it("keeps every response descriptive and browser listening synthetic", () => {
    expect(HSK1_LEVEL_CHECK_ITEMS.every((item) =>
      item.measurementEligible === false
      && item.masteryEligible === false
      && item.prerequisiteWaiverEligible === false
      && item.explanationVi.length > 20
    )).toBe(true);
    expect(HSK1_LEVEL_CHECK_ITEMS.filter((item) => item.skill === "listening")
      .every((item) => item.syntheticTtsText !== null)).toBe(true);
    expect(HSK1_LEVEL_CHECK_DISCLOSURE.reviewVi).toContain(
      "humanReviewed=false",
    );

    const item = HSK1_LEVEL_CHECK_ITEMS[0]!;
    const evidence = materializeEvidence({
      idempotencyKey: `hsk1-level-check-test:${item.id}`,
      activityVersion: item.activityVersion,
      source: "diagnostic",
      method: "diagnostic-selection",
      activityId: `hsk1-level-check:${item.id}`,
      skill: item.skill,
      outcome: "correct",
      score: 100,
      metadata: { measurementEligible: false },
    });
    expect(evidence).toMatchObject({
      verified: false,
      masteryEligible: false,
    });
  });
});
