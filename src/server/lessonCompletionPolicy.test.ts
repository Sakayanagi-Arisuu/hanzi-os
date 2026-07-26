import { describe, expect, it } from "vitest";
import {
  calculateLessonCompletionScore,
  LESSON_COMPLETION_POLICY_VERSION,
} from "./lessonCompletionPolicy";

describe("versioned lesson completion policy", () => {
  it("passes only when the clean gate score and required subset both reach 70%", () => {
    expect(LESSON_COMPLETION_POLICY_VERSION).toBe("lesson-completion-policy-v1");
    expect(calculateLessonCompletionScore({
      evidenceCount: 10,
      correctCount: 10,
      gateCorrectCount: 7,
      requiredEvidenceCount: 3,
      requiredCorrectCount: 3,
    })).toEqual({
      evidenceCount: 10,
      rawScore: 100,
      gateScore: 70,
      requiredEvidenceCount: 3,
      requiredCorrectCount: 3,
      passed: true,
    });
  });

  it("caps a high aggregate score when required evidence fails", () => {
    expect(calculateLessonCompletionScore({
      evidenceCount: 10,
      correctCount: 10,
      gateCorrectCount: 9,
      requiredEvidenceCount: 10,
      requiredCorrectCount: 6,
    })).toMatchObject({ gateScore: 69, passed: false });
  });
});
