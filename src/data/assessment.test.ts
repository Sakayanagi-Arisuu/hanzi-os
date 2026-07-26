import { describe, expect, it } from "vitest";
import {
  ASSESSMENT_FORM_VERSION,
  ASSESSMENT_QUESTIONS,
} from "./assessment";

describe("closed-alpha assessment catalog", () => {
  it("uses a new form version for the Phase 2 measurement contract", () => {
    expect(ASSESSMENT_FORM_VERSION).toMatch(/:diagnostic-foundation:3$/u);
    expect(new Set(ASSESSMENT_QUESTIONS.map((item) => item.itemVersion)).size)
      .toBe(ASSESSMENT_QUESTIONS.length);
  });

  it("does not fabricate review, calibration, or production-skill coverage", () => {
    expect(ASSESSMENT_QUESTIONS.every((item) =>
      item.reviewStatus === "pending"
      && item.calibrationStatus === "uncalibrated"
      && item.difficulty === null
      && item.discrimination === null
    )).toBe(true);
    expect(ASSESSMENT_QUESTIONS.some((item) => item.skill === "speaking"))
      .toBe(false);
    expect(ASSESSMENT_QUESTIONS.some((item) => item.skill === "writing"))
      .toBe(false);
  });

  it("keeps synthetic TTS outside measurement", () => {
    const synthetic = ASSESSMENT_QUESTIONS.filter(
      (item) => item.modality === "synthetic-tts-selection",
    );
    expect(synthetic.length).toBeGreaterThan(0);
    expect(synthetic.every((item) => item.measurementEligible === false))
      .toBe(true);
  });
});
