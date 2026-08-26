import type { LearningEvidence, MistakeRecord } from "../types";

export type RemediationHintState = Readonly<{
  visible: boolean;
  used: boolean;
}>;

export const toggleRemediationHint = (
  state: RemediationHintState,
): RemediationHintState => ({
  visible: !state.visible,
  used: state.used || !state.visible,
});

export const evaluateRemediationAttempt = (
  currentStreak: number,
  isCorrect: boolean,
  usedHint: boolean,
) => {
  const unassistedCorrect = isCorrect && !usedHint;
  const correctedStreak = !isCorrect
    ? 0
    : usedHint
      ? currentStreak
      : Math.max(1, currentStreak);
  return {
    correctedStreak,
    resolved: correctedStreak >= 1,
    unassistedCorrect,
  };
};

export const canRecordLocalRemediationAttempt = <
  T extends Pick<MistakeRecord, "resolved">,
>(
  mistake: T | null | undefined,
): mistake is T => Boolean(mistake && !mistake.resolved);

export const canAdvanceMistakeFromEvidence = (
  evidence: Pick<
    LearningEvidence,
    "verified" | "masteryEligible" | "outcome"
  >,
) => evidence.verified
  && evidence.masteryEligible
  && evidence.outcome === "correct";
