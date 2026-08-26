import { describe, expect, it } from "vitest";
import {
  defaultPlacementLevel,
  derivePlacementRecommendation,
} from "./placementPolicy";

describe("placementPolicy", () => {
  it("routes a complete beginner and legacy basic profile to HSK1 screening", () => {
    expect(defaultPlacementLevel("zero")).toBe(1);
    expect(defaultPlacementLevel("basic")).toBe(1);
    expect(defaultPlacementLevel("hsk3")).toBe(3);
  });

  it("advances only when the total and every observed skill clear the conservative floors", () => {
    expect(derivePlacementRecommendation(2, [
      { correct: 13, total: 15 },
      { correct: 12, total: 15 },
      { correct: 12, total: 15 },
      { correct: 12, total: 15 },
    ])).toMatchObject({
      band: "advance",
      acceptedStartingLevel: "hsk2",
      nextAssessmentLevel: 3,
    });

    expect(derivePlacementRecommendation(2, [
      { correct: 15, total: 15 },
      { correct: 15, total: 15 },
      { correct: 15, total: 15 },
      { correct: 8, total: 15 },
    ])).toMatchObject({
      band: "matched",
      acceptedStartingLevel: "hsk2",
      nextAssessmentLevel: null,
    });

    expect(derivePlacementRecommendation(2, [
      { correct: 4, total: 5 },
      { correct: 3, total: 5 },
      { correct: 5, total: 5 },
    ])).toMatchObject({ band: "advance", nextAssessmentLevel: 3 });
    expect(derivePlacementRecommendation(2, [
      { correct: 3, total: 5 },
      { correct: 3, total: 5 },
      { correct: 3, total: 5 },
    ])).toMatchObject({ band: "matched", nextAssessmentLevel: null });
  });

  it("steps down conservatively and never recommends beyond the supported range", () => {
    expect(derivePlacementRecommendation(1, [
      { correct: 5, total: 10 },
      { correct: 5, total: 10 },
    ])).toMatchObject({
      band: "step-down",
      acceptedStartingLevel: "zero",
      nextAssessmentLevel: null,
    });
    expect(derivePlacementRecommendation(4, [
      { correct: 1, total: 10 },
      { correct: 1, total: 10 },
    ])).toMatchObject({
      band: "step-down",
      acceptedStartingLevel: null,
      nextAssessmentLevel: 3,
    });
    expect(derivePlacementRecommendation(4, [
      { correct: 9, total: 10 },
      { correct: 9, total: 10 },
    ])).toMatchObject({
      band: "advance",
      acceptedStartingLevel: "hsk4",
      nextAssessmentLevel: null,
    });
  });

  it("fails closed for malformed score input", () => {
    expect(() => derivePlacementRecommendation(1, [])).toThrow();
    expect(() => derivePlacementRecommendation(1, [
      { correct: 2, total: 1 },
    ])).toThrow();
  });
});
