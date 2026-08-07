import { describe, expect, it } from "vitest";
import { assessmentPresentationForItem } from "./authoritativeAssessmentItemBank";
import {
  HSK_MOCK_EXAM_DEFINITIONS,
  HSK_MOCK_EXAM_LEVELS,
  getHskMockExamDefinition,
  validateHskMockExamDefinitions,
} from "./hskMockExamBank";

describe("HSK1-4 Mock Exam bank", () => {
  it("publishes two complete versioned forms for every level", () => {
    const validation = validateHskMockExamDefinitions();
    expect(validation).toEqual({ ok: true, errors: [] });
    expect(HSK_MOCK_EXAM_DEFINITIONS).toHaveLength(8);
    for (const level of HSK_MOCK_EXAM_LEVELS) {
      expect(getHskMockExamDefinition(level, "a")?.bank).toHaveLength(12);
      expect(getHskMockExamDefinition(level, "b")?.bank).toHaveLength(12);
    }
  });

  it("keeps answer, explanation and recommendation out of client forms", () => {
    for (const definition of HSK_MOCK_EXAM_DEFINITIONS) {
      const projection = definition.bank.map((item, position) =>
        assessmentPresentationForItem(item, position)
      );
      expect(JSON.stringify(projection)).not.toMatch(
        /correctAnswer|correctOptionId|explanationVi|sourceLessonId|answerKey/iu,
      );
    }
  });

  it("keeps listening synthetic and ineligible for mastery evidence", () => {
    for (const definition of HSK_MOCK_EXAM_DEFINITIONS) {
      expect(definition.humanReviewed).toBe(false);
      expect(definition.masteryEligible).toBe(false);
      expect(definition.prerequisiteUnlockEligible).toBe(false);
      const listening = definition.bank.filter((item) => item.skill === "listening");
      expect(listening).toHaveLength(3);
      expect(listening.every((item) =>
        item.modality === "synthetic-tts-selection"
        && item.measurementEligible === false
        && Boolean(item.stimulusText)
      )).toBe(true);
    }
  });
});
