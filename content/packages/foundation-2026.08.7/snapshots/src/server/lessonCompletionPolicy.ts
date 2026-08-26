export const LESSON_COMPLETION_POLICY_VERSION = "lesson-completion-policy-v3";

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
  return {
    evidenceCount: input.evidenceCount,
    rawScore,
    gateScore: ungatedScore,
    requiredEvidenceCount: input.requiredEvidenceCount,
    requiredCorrectCount: input.requiredCorrectCount,
    passed: ungatedScore >= 70,
  };
};
