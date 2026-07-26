import { CONTENT_VERSION } from "../data/curriculum";
import type {
  LearningEvidence,
  LearningState,
  PracticeEvidenceInput,
} from "../types";
import {
  downgradeReaderEvidenceTrust,
  isLocallyVerifiedEvidence,
  isPolicyMasteryEligible,
} from "./evidencePolicy";

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));

export const isMasteryEligibleEvidence = (
  method: PracticeEvidenceInput["method"],
  skill: PracticeEvidenceInput["skill"],
) => isPolicyMasteryEligible(method, skill);

export const materializeEvidence = (
  input: PracticeEvidenceInput,
  occurredAt = new Date().toISOString(),
): LearningEvidence => {
  const verified = input.metadata?.measurementEligible !== false
    && isLocallyVerifiedEvidence(
      input.source,
      input.method,
      input.skill,
    );
  return downgradeReaderEvidenceTrust({
    ...input,
    id: `evidence:${input.idempotencyKey}`,
    schemaVersion: 1,
    contentVersion: input.contentVersion ?? CONTENT_VERSION,
    score: input.score === null ? null : clamp(Math.round(input.score)),
    verified,
    masteryEligible: verified
      && (input.outcome === "correct" || input.outcome === "incorrect")
      && input.metadata?.usedHint !== true
      && input.metadata?.priorExposure !== true
      && isMasteryEligibleEvidence(input.method, input.skill),
    occurredAt,
  });
};

export const recordEvidenceInState = (
  state: LearningState,
  input: PracticeEvidenceInput,
  occurredAt = new Date().toISOString(),
) => {
  if (state.evidence.some((item) => item.idempotencyKey === input.idempotencyKey)) {
    return { state, inserted: false };
  }

  const evidence = materializeEvidence(input, occurredAt);
  const skillMastery = { ...state.skillMastery };
  if (evidence.masteryEligible) {
    const delta = evidence.outcome === "correct"
      ? 1
      : evidence.outcome === "incorrect"
        ? -1
        : 0;
    skillMastery[evidence.skill] = clamp(skillMastery[evidence.skill] + delta);
  }

  return {
    inserted: true,
    state: {
      ...state,
      contentVersion: CONTENT_VERSION,
      evidence: [...state.evidence, evidence],
      skillMastery,
    },
  };
};

export const makeIdempotencyKey = (scope: string) => {
  const random = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${scope}:${random}`;
};

export const scoreLessonSession = (
  answers: readonly LearningEvidence[],
  expectedEvidenceCount: number,
) => {
  if (expectedEvidenceCount <= 0 || answers.length !== expectedEvidenceCount) {
    return null;
  }
  const correctCount = answers.filter((item) => item.outcome === "correct").length;
  const requiredAnswers = answers.filter((item) =>
    item.metadata?.requiredForPass === true
  );
  const requiredCorrect = requiredAnswers.filter((item) =>
    item.outcome === "correct"
  ).length;
  const requiredPassed = requiredAnswers.length === 0
    || requiredCorrect / requiredAnswers.length >= 0.7;
  const rawScore = Math.round((correctCount / answers.length) * 100);
  return {
    rawScore,
    gateScore: requiredPassed ? rawScore : Math.min(rawScore, 69),
    requiredPassed,
    requiredEvidenceCount: requiredAnswers.length,
    requiredCorrect,
  };
};
