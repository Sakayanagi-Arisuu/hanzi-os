import { describe, expect, it } from "vitest";
import {
  calculateLessonCompletionScore,
  LESSON_COMPLETION_POLICY_VERSION,
} from "./lessonCompletionPolicy";

describe("versioned lesson completion policy", () => {
  it("passes when the clean gate score reaches 70%", () => {
    expect(LESSON_COMPLETION_POLICY_VERSION).toBe("lesson-completion-policy-v3");
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

  it("keeps required evidence diagnostic without silently capping the score", () => {
    expect(calculateLessonCompletionScore({
      evidenceCount: 10,
      correctCount: 10,
      gateCorrectCount: 9,
      requiredEvidenceCount: 10,
      requiredCorrectCount: 6,
    })).toMatchObject({ gateScore: 90, passed: true });
  });
});
