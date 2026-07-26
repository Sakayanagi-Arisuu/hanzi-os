import {
  ASSESSMENT_FORM_VERSION,
  ASSESSMENT_QUESTION_BY_ID,
  ASSESSMENT_QUESTIONS,
} from "../data/assessment";
import {
  CONTENT_VERSION,
  RELEASED_STORIES,
  RELEASED_WORD_BY_ID,
} from "../data/curriculum";
import { answersMatch } from "../lib/exerciseGeneration";
import { mergeSyncDocuments } from "../sync/document";
import type { CloudSyncDocumentV1 } from "../sync/types";
import type {
  EvidenceMethod,
  EvidenceOutcome,
  EvidenceSource,
  LearningEvidence,
  Skill,
} from "../types";
import {
  getAuthoritativeLessonAnswer,
  type AuthoritativeAnswer,
} from "./authoritativeItemBank";

export { getAuthoritativeLessonAnswer } from "./authoritativeItemBank";

const MAX_EVIDENCE_KEY_LENGTH = 240;
const MAX_ACTIVITY_ID_LENGTH = 240;
const MAX_METADATA_ENTRIES = 32;
const MAX_METADATA_STRING_LENGTH = 600;

const releasedStoryById = new Map(
  RELEASED_STORIES.map((story) => [story.id, story]),
);

const evidenceSources = new Set<EvidenceSource>([
  "lesson",
  "reader",
  "writing",
  "pronunciation",
  "mistake",
  "review",
  "diagnostic",
]);
const evidenceMethods = new Set<EvidenceMethod>([
  "meaning-selection",
  "phonology-recognition",
  "listening-selection",
  "typed-character-recall",
  "reading-comprehension",
  "stroke-quiz",
  "speech-transcript",
  "remediation-recall",
  "fsrs-rating",
  "diagnostic-selection",
  "lesson-completion",
]);
const evidenceOutcomes = new Set<EvidenceOutcome>([
  "correct",
  "incorrect",
  "completed",
  "unverified",
]);
const skills = new Set<Skill>([
  "pronunciation",
  "listening",
  "speaking",
  "reading",
  "writing",
  "vocabulary",
  "grammar",
]);
type PrimitiveMetadata = Record<string, string | number | boolean | null>;


export type LearningIntegrityResult = {
  document: CloudSyncDocumentV1;
  acceptedEvidenceCount: number;
  rejectedEvidenceCount: number;
  verifiedEvidenceCount: number;
};

/**
 * A route-scoped view of evidence the server has already committed. Exact
 * stored rows retain their previously derived exposure status, while any new
 * row for an already-seen activity is necessarily a repeat even if its client
 * timestamp is backdated.
 */
export type TrustedLearningExposure = {
  exposureKeys: ReadonlySet<string>;
  evidenceKeys: ReadonlySet<string>;
  priorExposureEvidenceKeys: ReadonlySet<string>;
};

export type LearningIntegrityOptions = {
  trustedExposure?: TrustedLearningExposure;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const boundedString = (value: unknown, maxLength: number) =>
  typeof value === "string" && value.length > 0 && value.length <= maxLength;

const normalizeMetadata = (value: unknown): PrimitiveMetadata => {
  if (!isRecord(value)) return {};
  const entries: Array<[string, string | number | boolean | null]> = [];
  for (const [key, item] of Object.entries(value).slice(0, MAX_METADATA_ENTRIES)) {
    if (!key || key.length > 80) continue;
    if (typeof item === "string") {
      entries.push([key, item.slice(0, MAX_METADATA_STRING_LENGTH)]);
    } else if (typeof item === "number" && Number.isFinite(item)) {
      entries.push([key, item]);
    } else if (typeof item === "boolean" || item === null) {
      entries.push([key, item]);
    }
  }
  return Object.fromEntries(entries);
};

const normalizeEvidenceShell = (value: unknown): LearningEvidence | null => {
  if (!isRecord(value)) return null;
  if (
    !boundedString(value.idempotencyKey, MAX_EVIDENCE_KEY_LENGTH)
    || value.schemaVersion !== 1
    || value.contentVersion !== CONTENT_VERSION
    || !boundedString(value.activityVersion, 160)
    || !boundedString(value.activityId, MAX_ACTIVITY_ID_LENGTH)
    || !evidenceSources.has(value.source as EvidenceSource)
    || !evidenceMethods.has(value.method as EvidenceMethod)
    || !skills.has(value.skill as Skill)
    || !evidenceOutcomes.has(value.outcome as EvidenceOutcome)
    || (value.score !== null && (typeof value.score !== "number" || !Number.isFinite(value.score)))
    || !boundedString(value.occurredAt, 40)
    || !Number.isFinite(Date.parse(value.occurredAt as string))
  ) return null;

  const idempotencyKey = value.idempotencyKey as string;
  return {
    id: `evidence:${idempotencyKey}`,
    idempotencyKey,
    schemaVersion: 1,
    contentVersion: CONTENT_VERSION,
    activityVersion: value.activityVersion as string,
    source: value.source as EvidenceSource,
    method: value.method as EvidenceMethod,
    activityId: value.activityId as string,
    skill: value.skill as Skill,
    outcome: value.outcome as EvidenceOutcome,
    score: value.score === null
      ? null
      : Math.max(0, Math.min(100, Math.round(value.score as number))),
    verified: false,
    masteryEligible: false,
    occurredAt: new Date(value.occurredAt as string).toISOString(),
    metadata: normalizeMetadata(value.metadata),
  };
};

const lessonAnswerFromEvidence = (
  evidence: LearningEvidence,
): { answer: AuthoritativeAnswer; lessonId: string; questionId: string; selected: string } | null => {
  if (evidence.source !== "lesson" || evidence.method === "lesson-completion") return null;
  const separator = evidence.activityId.indexOf(":");
  if (separator <= 0) return null;
  const lessonId = evidence.activityId.slice(0, separator);
  const questionId = evidence.activityId.slice(separator + 1);
  const answer = getAuthoritativeLessonAnswer(lessonId, questionId);
  const selected = evidence.metadata?.selectedAnswer;
  if (
    !answer
    || typeof selected !== "string"
    || evidence.activityVersion !== answer.activityVersion
    || evidence.method !== answer.method
    || evidence.skill !== answer.skill
  ) return null;
  return { answer, lessonId, questionId, selected };
};

const readerAnswerFromEvidence = (
  evidence: LearningEvidence,
): { correct: string; selected: string } | null => {
  if (
    evidence.source !== "reader"
    || evidence.method !== "reading-comprehension"
    || evidence.skill !== "reading"
  ) return null;
  const separator = evidence.activityId.indexOf(":");
  if (separator <= 0) return null;
  const story = releasedStoryById.get(evidence.activityId.slice(0, separator));
  const questionId = evidence.activityId.slice(separator + 1);
  const question = story?.comprehension.find((item) => item.id === questionId);
  const selected = evidence.metadata?.selectedAnswer;
  if (
    !story
    || !question
    || typeof selected !== "string"
    || evidence.activityVersion !== `${story.contentVersion}:${question.id}:1`
  ) return null;
  return { correct: question.correctAnswer, selected };
};

const diagnosticAnswerFromEvidence = (
  evidence: LearningEvidence,
) => {
  if (
    evidence.source !== "diagnostic"
    || evidence.method !== "diagnostic-selection"
    || evidence.activityVersion !== ASSESSMENT_FORM_VERSION
    || !evidence.activityId.startsWith("diagnostic:")
  ) return null;
  const questionId = evidence.activityId.slice("diagnostic:".length);
  const question = ASSESSMENT_QUESTION_BY_ID.get(questionId);
  const selected = evidence.metadata?.selectedAnswer;
  if (!question || evidence.skill !== question.skill || typeof selected !== "string") return null;
  return { question, selected };
};

const objectiveExposureKey = (evidence: LearningEvidence) => {
  if (
    !lessonAnswerFromEvidence(evidence)
    && !readerAnswerFromEvidence(evidence)
    && !diagnosticAnswerFromEvidence(evidence)
  ) return null;
  return `${evidence.activityVersion}|${evidence.activityId}`;
};

export const deriveTrustedLearningExposure = (
  document: CloudSyncDocumentV1,
): TrustedLearningExposure => {
  const exposureKeys = new Set<string>();
  const evidenceKeys = new Set<string>();
  const priorExposureEvidenceKeys = new Set<string>();
  const evidence = Array.isArray(document.state?.evidence)
    ? document.state.evidence
    : [];

  for (const item of evidence) {
    if (!item.verified) continue;
    const shell = normalizeEvidenceShell(item);
    if (!shell) continue;
    const exposureKey = objectiveExposureKey(shell);
    if (!exposureKey) continue;
    exposureKeys.add(exposureKey);
    evidenceKeys.add(shell.idempotencyKey);
    if (item.metadata?.priorExposure === true) {
      priorExposureEvidenceKeys.add(shell.idempotencyKey);
    }
  }

  return { exposureKeys, evidenceKeys, priorExposureEvidenceKeys };
};

/**
 * Snapshot sync can re-score an answer for inspection, but it cannot prove a
 * server-issued session, first exposure, or command sequence. Consequently the
 * canonical evidence remains unverified and projection-ineligible even when
 * its selected answer matches the current server answer key.
 */
const scoreLegacyObjectiveAnswer = (
  evidence: LearningEvidence,
  correctAnswer: string,
  selectedAnswer: string,
  priorExposure: boolean,
  extraMetadata: PrimitiveMetadata = {},
): LearningEvidence => {
  const correct = answersMatch(selectedAnswer, correctAnswer);
  const usedHint = evidence.metadata?.usedHint === true;
  return {
    ...evidence,
    outcome: "unverified",
    score: null,
    verified: false,
    masteryEligible: false,
    metadata: {
      selectedAnswer,
      correctAnswer,
      usedHint,
      priorExposure,
      serverScoredOutcome: correct ? "correct" : "incorrect",
      serverScoredScore: correct ? 100 : 0,
      ...extraMetadata,
    },
  };
};

const sanitizeUnverifiableEvidence = (
  evidence: LearningEvidence,
): LearningEvidence | null => {
  if (evidence.method === "fsrs-rating") {
    const wordId = evidence.activityId.startsWith("review:")
      ? evidence.activityId.slice("review:".length)
      : "";
    const rating = Number(evidence.metadata?.rating);
    if (
      evidence.source !== "review"
      || evidence.skill !== "vocabulary"
      || evidence.activityVersion !== `${CONTENT_VERSION}:fsrs:1`
      || !RELEASED_WORD_BY_ID.has(wordId)
      || ![1, 2, 3, 4].includes(rating)
    ) return null;
    return {
      ...evidence,
      outcome: "unverified",
      score: null,
      metadata: { rating },
    };
  }

  if (evidence.method === "stroke-quiz") {
    const [, wordId = "", character = ""] = evidence.activityId.split(":");
    const word = RELEASED_WORD_BY_ID.get(wordId);
    if (
      evidence.source !== "writing"
      || evidence.skill !== "writing"
      || evidence.activityVersion !== `${CONTENT_VERSION}:hanzi-writer:1`
      || !word
      || ![word.simplified, word.traditional].includes(character)
    ) return null;
    return {
      ...evidence,
      outcome: "unverified",
      verified: false,
      masteryEligible: false,
      metadata: {
        character,
        usedHint: evidence.metadata?.usedHint === true,
      },
    };
  }

  if (evidence.method === "remediation-recall" && evidence.source === "mistake") {
    return {
      ...evidence,
      outcome: "unverified",
      verified: false,
      masteryEligible: false,
    };
  }
  return null;
};

const deriveDiagnostic = (evidence: readonly LearningEvidence[]) => {
  const sessions = new Map<string, LearningEvidence[]>();
  for (const item of evidence) {
    if (item.source !== "diagnostic" || item.method !== "diagnostic-selection") continue;
    const questionId = item.activityId.slice("diagnostic:".length);
    const question = ASSESSMENT_QUESTION_BY_ID.get(questionId);
    if (!question || (!item.verified && question.measurementEligible)) continue;
    const suffix = `:${questionId}`;
    if (!item.idempotencyKey.endsWith(suffix)) continue;
    const sessionId = item.idempotencyKey.slice(0, -suffix.length);
    const values = sessions.get(sessionId) ?? [];
    values.push(item);
    sessions.set(sessionId, values);
  }

  const complete = [...sessions.values()]
    .filter((items) =>
      items.length === ASSESSMENT_QUESTIONS.length
      && new Set(items.map((item) => item.activityId)).size === ASSESSMENT_QUESTIONS.length
    )
    .filter((items) => items.every((item) => {
      const questionId = item.activityId.slice("diagnostic:".length);
      const question = ASSESSMENT_QUESTION_BY_ID.get(questionId);
      return Boolean(
        question
        && (!question.measurementEligible || item.metadata?.priorExposure !== true),
      );
    }))
    .map((items) => ({
      items,
      completedAt: items.map((item) => item.occurredAt).sort().at(-1)!,
    }))
    .sort((left, right) => left.completedAt.localeCompare(right.completedAt))
    .at(-1);

  if (!complete) {
    return {
      completed: false,
      score: 0,
      recommendedLessonId: "boot-1",
      completedAt: null,
    } as const;
  }
  const measuredItems = complete.items.filter((item) => {
    const questionId = item.activityId.slice("diagnostic:".length);
    return ASSESSMENT_QUESTION_BY_ID.get(questionId)?.measurementEligible === true;
  });
  const score = measuredItems.length
    ? Math.round(
      measuredItems.filter((item) => item.outcome === "correct").length
        / measuredItems.length
        * 100,
    )
    : 0;
  return {
    completed: true,
    score,
    recommendedLessonId: score >= 75
      ? "characters-1"
      : score >= 50
        ? "daily-1"
        : score >= 25
          ? "survival-1"
          : "boot-1",
    completedAt: complete.completedAt,
  };
};

/**
 * Legacy activity rows are retained only as an inspectable compatibility log.
 * Their reward amount is browser-authored and therefore must never enter the
 * cloud XP/streak projection. The normalized attempt/XP ledger will replace
 * this zero-reward envelope once it is wired into the learner flow.
 */
const sanitizeUnrewardedActivityLog = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((item) => {
    if (
      !isRecord(item)
      || !boundedString(item.id, 200)
      || seen.has(item.id as string)
      || !["lesson", "review", "correction", "diagnostic", "practice"].includes(String(item.type))
      || typeof item.label !== "string"
      || item.label.length > 240
      || typeof item.xp !== "number"
      || !Number.isFinite(item.xp)
      || item.xp < 0
      || item.xp > 1_000
      || !boundedString(item.occurredAt, 40)
      || !Number.isFinite(Date.parse(item.occurredAt as string))
    ) return [];
    seen.add(item.id as string);
    return [{
      id: item.id as string,
      type: item.type as "lesson" | "review" | "correction" | "diagnostic" | "practice",
      label: item.label,
      xp: 0,
      occurredAt: new Date(item.occurredAt as string).toISOString(),
    }];
  });
};

/**
 * Re-grade every mastery-bearing record against the server-owned, published
 * item bank. Client aggregates and client-supplied correctness flags are never
 * used to unlock lessons. Evidence that cannot be checked objectively remains
 * inspectable but is explicitly unverified.
 */
export const enforceAuthoritativeLearningDocument = (
  input: CloudSyncDocumentV1,
  options: LearningIntegrityOptions = {},
): LearningIntegrityResult => {
  const sourceEvidence = Array.isArray(input.state?.evidence)
    ? input.state.evidence
    : [];
  const shells = sourceEvidence
    .map(normalizeEvidenceShell)
    .filter((item): item is LearningEvidence => Boolean(item))
    .sort((left, right) =>
      left.occurredAt.localeCompare(right.occurredAt)
      || left.idempotencyKey.localeCompare(right.idempotencyKey)
    );
  const seenKeys = new Set<string>();
  const seenActivities = new Set<string>();
  const acceptedAnswers: LearningEvidence[] = [];
  const completionCandidates: LearningEvidence[] = [];

  const markExposure = (shell: LearningEvidence) => {
    const exposureKey = `${shell.activityVersion}|${shell.activityId}`;
    const trusted = options.trustedExposure;
    const trustedEvidence = trusted?.evidenceKeys.has(shell.idempotencyKey) ?? false;
    const priorExposure = trustedEvidence
      ? trusted?.priorExposureEvidenceKeys.has(shell.idempotencyKey) ?? false
      : (trusted?.exposureKeys.has(exposureKey) ?? false)
        || seenActivities.has(exposureKey);
    seenActivities.add(exposureKey);
    return priorExposure;
  };

  for (const shell of shells) {
    if (seenKeys.has(shell.idempotencyKey)) continue;
    seenKeys.add(shell.idempotencyKey);
    if (shell.method === "speech-transcript") continue;
    if (shell.method === "lesson-completion") {
      completionCandidates.push(shell);
      continue;
    }

    const lesson = lessonAnswerFromEvidence(shell);
    if (lesson) {
      const matchedAnswer = lesson.answer.answers.find((answer) =>
        answersMatch(lesson.selected, answer)
      );
      acceptedAnswers.push(scoreLegacyObjectiveAnswer(
        shell,
        matchedAnswer ?? lesson.answer.answers[0],
        lesson.selected,
        markExposure(shell),
        {
          questionId: lesson.questionId,
          wordId: lesson.answer.wordId ?? null,
          requiredForPass: lesson.answer.requiredForPass,
        },
      ));
      continue;
    }

    const reader = readerAnswerFromEvidence(shell);
    if (reader) {
      acceptedAnswers.push(scoreLegacyObjectiveAnswer(
        shell,
        reader.correct,
        reader.selected,
        markExposure(shell),
      ));
      continue;
    }

    const diagnostic = diagnosticAnswerFromEvidence(shell);
    if (diagnostic) {
      const marked = scoreLegacyObjectiveAnswer(
        shell,
        diagnostic.question.correct,
        diagnostic.selected,
        markExposure(shell),
        {
          questionId: diagnostic.question.id,
          itemVersion: diagnostic.question.itemVersion,
          construct: diagnostic.question.construct,
          modality: diagnostic.question.modality,
          equivalentGroupId: diagnostic.question.equivalentGroupId,
          exposureGroupId: diagnostic.question.exposureGroupId,
          reviewStatus: diagnostic.question.reviewStatus,
          calibrationStatus: diagnostic.question.calibrationStatus,
          measurementEligible: diagnostic.question.measurementEligible,
        },
      );
      acceptedAnswers.push(marked);
      continue;
    }

    const unverified = sanitizeUnverifiableEvidence(shell);
    acceptedAnswers.push(unverified ?? {
      ...shell,
      outcome: "unverified",
      verified: false,
      masteryEligible: false,
    });
  }

  // A snapshot completion has no server-issued lesson-session binding. Even a
  // complete set of answer-key matches is descriptive only and cannot unlock.
  const downgradedCompletions = completionCandidates
    .map((completion): LearningEvidence => ({
      ...completion,
      outcome: "unverified",
      score: null,
      verified: false,
      masteryEligible: false,
    }));
  const acceptedEvidence = [
    ...acceptedAnswers,
    ...downgradedCompletions,
  ]
    .sort((left, right) =>
      left.occurredAt.localeCompare(right.occurredAt)
      || left.idempotencyKey.localeCompare(right.idempotencyKey)
    );
  const diagnostic = deriveDiagnostic(acceptedEvidence);
  const savedWords = Object.fromEntries(
    Object.entries(input.savedWords ?? {})
      .filter(([wordId]) => RELEASED_WORD_BY_ID.has(wordId)),
  );
  const candidate: CloudSyncDocumentV1 = {
    ...structuredClone(input),
    // Browser-authored legacy XP is not a ledger and cannot cross the cloud
    // authority boundary. Keep the clock shape for protocol compatibility,
    // but fail closed to a zero baseline.
    legacyXpBaseline: {
      ...structuredClone(input.legacyXpBaseline),
      value: 0,
    },
    diagnostic: {
      ...structuredClone(input.diagnostic),
      value: diagnostic,
    },
    savedWords,
    state: {
      ...structuredClone(input.state),
      contentVersion: CONTENT_VERSION,
      profile: structuredClone(input.profile.value),
      diagnostic,
      xp: 0,
      dailyXp: 0,
      streak: 0,
      completedLessons: {},
      fsrsCards: {},
      reviewCount: 0,
      knowledge: {},
      lastStudyDate: null,
      // Mistake resolution/counters and FSRS timing are self-reported in the
      // compatibility snapshot. Keep them local until normalized server
      // commands can derive them from authoritative attempts.
      mistakes: [],
      evidence: acceptedEvidence,
      activityLog: sanitizeUnrewardedActivityLog(input.state.activityLog),
    },
  };
  const document = mergeSyncDocuments(candidate, candidate).document;
  // Generic local merge deliberately replays unverified FSRS ratings. A cloud
  // integrity pass must not: ratings and timestamps are browser-authored and
  // currently have no server-issued review session or due-time proof.
  document.state.fsrsCards = {};
  document.state.reviewCount = 0;
  return {
    document,
    acceptedEvidenceCount: acceptedEvidence.length,
    rejectedEvidenceCount: sourceEvidence.length - acceptedEvidence.length,
    verifiedEvidenceCount: acceptedEvidence.filter((item) => item.verified).length,
  };
};
