import { CONTENT_VERSION } from "../data/contentIdentity";
import type {
  LearningEvidence,
  LearningState,
  PracticeEvidenceInput,
} from "../types";
import { canonicalStringify } from "../sync/canonicalHash";
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

const canonicalIdempotencyPayload = (evidence: LearningEvidence) => {
  const {
    occurredAt: _occurredAt,
    verified: _verified,
    masteryEligible: _masteryEligible,
    metadata,
    ...immutable
  } = evidence;
  const {
    // First exposure is derived from state immediately before insertion. A
    // retry necessarily observes the already-inserted row, so this one flag
    // cannot participate in command identity.
    priorExposure: _priorExposure,
    ...immutableMetadata
  } = metadata ?? {};
  return canonicalStringify({
    ...immutable,
    ...(metadata === undefined ? {} : { metadata: immutableMetadata }),
  });
};

export const recordEvidenceInState = (
  state: LearningState,
  input: PracticeEvidenceInput,
  occurredAt = new Date().toISOString(),
) => {
  const existing = state.evidence.find(
    (item) => item.idempotencyKey === input.idempotencyKey,
  );
  if (existing) {
    const replay = materializeEvidence(input, existing.occurredAt);
    return canonicalIdempotencyPayload(existing)
        === canonicalIdempotencyPayload(replay)
      ? { state, inserted: false }
      : { state, inserted: false, conflict: true as const };
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
  const gateEligible = (item: LearningEvidence) =>
    item.metadata?.usedHint !== true
    && item.metadata?.priorExposure !== true;
  const gateCorrectCount = answers.filter((item) =>
    item.outcome === "correct" && gateEligible(item)
  ).length;
  const requiredAnswers = answers.filter((item) =>
    item.metadata?.requiredForPass === true
  );
  const requiredCorrect = requiredAnswers.filter((item) =>
    item.outcome === "correct" && gateEligible(item)
  ).length;
  const requiredPassed = requiredAnswers.length === 0
    || requiredCorrect / requiredAnswers.length >= 0.7;
  const rawScore = Math.round((correctCount / answers.length) * 100);
  const ungatedScore = Math.round((gateCorrectCount / answers.length) * 100);
  return {
    rawScore,
    gateScore: requiredPassed ? ungatedScore : Math.min(ungatedScore, 69),
    requiredPassed,
    requiredEvidenceCount: requiredAnswers.length,
    requiredCorrect,
  };
};
