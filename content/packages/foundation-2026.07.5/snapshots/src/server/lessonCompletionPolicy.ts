export const LESSON_COMPLETION_POLICY_VERSION = "lesson-completion-policy-v1";

export type LessonCompletionScore = {
  evidenceCount: number;
  rawScore: number;
  gateScore: number;
  requiredEvidenceCount: number;
  requiredCorrectCount: number;
  passed: boolean;
};

export const calculateLessonCompletionScore = (input: {
  evidenceCount: number;
  correctCount: number;
  gateCorrectCount: number;
  requiredEvidenceCount: number;
  requiredCorrectCount: number;
}): LessonCompletionScore => {
  const rawScore = Math.round((input.correctCount / input.evidenceCount) * 100);
  const ungatedScore = Math.round(
    (input.gateCorrectCount / input.evidenceCount) * 100,
  );
  const requiredPassed = input.requiredEvidenceCount === 0
    || input.requiredCorrectCount / input.requiredEvidenceCount >= 0.7;
  return {
    evidenceCount: input.evidenceCount,
    rawScore,
    gateScore: requiredPassed ? ungatedScore : Math.min(ungatedScore, 69),
    requiredEvidenceCount: input.requiredEvidenceCount,
    requiredCorrectCount: input.requiredCorrectCount,
    passed: requiredPassed && ungatedScore >= 70,
  };
};
