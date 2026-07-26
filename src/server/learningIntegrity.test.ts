import { describe, expect, it } from "vitest";
import {
  ASSESSMENT_FORM_VERSION,
  ASSESSMENT_QUESTIONS,
} from "../data/assessment";
import { CONTENT_VERSION, RELEASED_STORIES } from "../data/curriculum";
import { createInitialSyncDocument } from "../sync/document";
import type { LearningEvidence, LearningState } from "../types";
import {
  deriveTrustedLearningExposure,
  enforceAuthoritativeLearningDocument,
  getAuthoritativeLessonAnswer,
} from "./learningIntegrity";

const NOW = "2026-07-20T08:00:00.000Z";

const baseState = (): LearningState => ({
  schemaVersion: 2,
  contentVersion: CONTENT_VERSION,
  profile: {
    name: "Learner",
    goal: "conversation",
    dailyMinutes: 10,
    script: "simplified",
    startingLevel: "zero",
    onboarded: true,
  },
  xp: 0,
  dailyXp: 0,
  streak: 0,
  lastStudyDate: null,
  completedLessons: {},
  savedWords: [],
  fsrsCards: {},
  reviewCount: 0,
  skillMastery: {
    pronunciation: 0,
    listening: 0,
    speaking: 0,
    reading: 0,
    writing: 0,
    vocabulary: 0,
    grammar: 0,
  },
  knowledge: {},
  mistakes: [],
  activityLog: [],
  diagnostic: {
    completed: false,
    score: 0,
    recommendedLessonId: "boot-1",
    completedAt: null,
  },
  evidence: [],
});

const shell = (
  idempotencyKey: string,
  patch: Partial<LearningEvidence>,
): LearningEvidence => ({
  id: `forged:${idempotencyKey}`,
  idempotencyKey,
  schemaVersion: 1,
  contentVersion: CONTENT_VERSION,
  activityVersion: `${CONTENT_VERSION}:unknown:1`,
  source: "lesson",
  method: "meaning-selection",
  activityId: "unknown",
  skill: "vocabulary",
  outcome: "correct",
  score: 100,
  verified: true,
  masteryEligible: true,
  occurredAt: NOW,
  metadata: {},
  ...patch,
});

const documentWithEvidence = (evidence: LearningEvidence[]) => {
  const state = baseState();
  state.evidence = evidence;
  return createInitialSyncDocument(state, NOW, "fixture");
};

describe("authoritative learning integrity", () => {
  it("re-scores lesson answers descriptively without verifying snapshot evidence", () => {
    const answer = getAuthoritativeLessonAnswer("boot-2", "ni-meaning");
    expect(answer).not.toBeNull();
    const document = documentWithEvidence([
      shell("session:answer:ni-meaning", {
        activityVersion: answer!.activityVersion,
        activityId: "boot-2:ni-meaning",
        method: answer!.method,
        skill: answer!.skill,
        outcome: "correct",
        score: 100,
        verified: true,
        masteryEligible: true,
        metadata: {
          selectedAnswer: "tôi",
          correctAnswer: "tôi",
        },
      }),
    ]);

    const result = enforceAuthoritativeLearningDocument(document);
    expect(result.document.state.evidence).toHaveLength(1);
    expect(result.document.state.evidence[0]).toMatchObject({
      id: "evidence:session:answer:ni-meaning",
      outcome: "unverified",
      score: null,
      verified: false,
      masteryEligible: false,
      metadata: {
        selectedAnswer: "tôi",
        correctAnswer: "bạn",
        serverScoredOutcome: "incorrect",
        serverScoredScore: 0,
      },
    });
    expect(result.document.state.skillMastery.vocabulary).toBe(0);
    expect(result.document.state.knowledge).toEqual({});
    expect(result.verifiedEvidenceCount).toBe(0);
  });

  it("does not unlock from a complete answer-key set without a server session", () => {
    const questionIds = [
      "ni-meaning",
      "ni-pinyin",
      "ni-tone-0",
      "ni-listening",
      "ni-recall",
      "ni-sentence",
      "hao-meaning",
      "hao-pinyin",
      "hao-tone-0",
      "hao-listening",
    ];
    const answers = questionIds.map((questionId, index) => {
      const answer = getAuthoritativeLessonAnswer("boot-2", questionId)!;
      const selectedAnswer = index < 7 ? answer.answers[0] : "sai";
      return shell(`lesson-session:answer:${questionId}`, {
        activityVersion: answer.activityVersion,
        activityId: `boot-2:${questionId}`,
        method: answer.method,
        skill: answer.skill,
        occurredAt: `2026-07-20T08:00:${String(index).padStart(2, "0")}.000Z`,
        metadata: { selectedAnswer, correctAnswer: "forged" },
      });
    });
    const completion = shell("lesson-session:complete", {
      activityVersion: `${CONTENT_VERSION}:boot-2:1`,
      activityId: "boot-2",
      method: "lesson-completion",
      outcome: "completed",
      score: 100,
      occurredAt: "2026-07-20T08:01:00.000Z",
      metadata: { passed: true, evidenceCount: 1 },
    });
    const forgedState = baseState();
    forgedState.evidence = [...answers, completion];
    forgedState.completedLessons["boot-2"] = {
      score: 100,
      bestScore: 100,
      attempts: 99,
      completedAt: NOW,
    };
    const document = createInitialSyncDocument(forgedState, NOW, "fixture");

    const result = enforceAuthoritativeLearningDocument(document);
    expect(result.document.state.evidence.at(-1)).toMatchObject({
      method: "lesson-completion",
      outcome: "unverified",
      score: null,
      verified: false,
      masteryEligible: false,
      metadata: {
        passed: true,
        evidenceCount: 1,
      },
    });
    expect(result.document.state.evidence.every((item) => !item.verified)).toBe(true);
    expect(result.document.state.completedLessons).toEqual({});
    expect(result.document.state.knowledge).toEqual({});
    expect(Object.values(result.document.state.skillMastery).every((score) => score === 0)).toBe(true);
  });

  it("requires the complete lesson-specific gate set, not any ten easy items", () => {
    const questionIds = [
      "yi-meaning", "yi-pinyin", "yi-listening", "yi-recall", "yi-sentence",
      "ren-meaning", "ren-pinyin", "ren-listening", "ren-recall", "ren-sentence",
    ];
    const answers = questionIds.map((questionId, index) => {
      const answer = getAuthoritativeLessonAnswer("boot-1", questionId)!;
      return shell(`gate-bypass:answer:${questionId}`, {
        activityVersion: answer.activityVersion,
        activityId: `boot-1:${questionId}`,
        method: answer.method,
        skill: answer.skill,
        occurredAt: `2026-07-20T08:03:${String(index).padStart(2, "0")}.000Z`,
        metadata: { selectedAnswer: answer.answers[0] },
      });
    });
    const completion = shell("gate-bypass:complete", {
      activityVersion: `${CONTENT_VERSION}:boot-1:1`,
      activityId: "boot-1",
      method: "lesson-completion",
      outcome: "completed",
      occurredAt: "2026-07-20T08:04:00.000Z",
    });

    const result = enforceAuthoritativeLearningDocument(
      documentWithEvidence([...answers, completion]),
    );
    expect(result.document.state.completedLessons["boot-1"]).toBeUndefined();
    expect(result.document.state.evidence.find(
      (item) => item.method === "lesson-completion",
    )).toMatchObject({ verified: false, masteryEligible: false });
  });

  it("drops aggregate-only completion and downgrades unverifiable writing", () => {
    const forgedState = baseState();
    forgedState.completedLessons["boot-1"] = {
      score: 100,
      bestScore: 100,
      attempts: 1,
      completedAt: NOW,
    };
    forgedState.evidence = [
      shell("stroke-1", {
        source: "writing",
        method: "stroke-quiz",
        activityVersion: `${CONTENT_VERSION}:hanzi-writer:1`,
        activityId: "stroke-quiz:ni:你",
        skill: "writing",
        metadata: { mistakes: 0, character: "你" },
      }),
      shell("fake-completion:complete", {
        activityVersion: `${CONTENT_VERSION}:boot-1:1`,
        activityId: "boot-1",
        method: "lesson-completion",
        outcome: "completed",
      }),
    ];
    const result = enforceAuthoritativeLearningDocument(
      createInitialSyncDocument(forgedState, NOW, "fixture"),
    );

    expect(result.document.state.completedLessons).toEqual({});
    expect(result.document.state.evidence).toHaveLength(2);
    expect(result.document.state.evidence.find((item) => item.method === "stroke-quiz")).toMatchObject({
      method: "stroke-quiz",
      outcome: "unverified",
      verified: false,
      masteryEligible: false,
    });
    expect(result.document.state.evidence.find((item) => item.method === "lesson-completion")).toMatchObject({
      outcome: "unverified",
      score: null,
      verified: false,
      masteryEligible: false,
    });
    expect(result.document.state.skillMastery.writing).toBe(0);
  });

  it("does not derive diagnostic routing from a legacy snapshot form", () => {
    const evidence = ASSESSMENT_QUESTIONS.map((question, index) =>
      shell(`diagnostic-session:${question.id}`, {
        source: "diagnostic",
        method: "diagnostic-selection",
        activityVersion: ASSESSMENT_FORM_VERSION,
        activityId: `diagnostic:${question.id}`,
        skill: question.skill,
        occurredAt: `2026-07-20T08:02:${String(index).padStart(2, "0")}.000Z`,
        metadata: {
          selectedAnswer: index < 5 ? question.correct : "sai",
          correctAnswer: "forged",
        },
      })
    );
    const result = enforceAuthoritativeLearningDocument(documentWithEvidence(evidence));
    expect(result.document.state.diagnostic).toEqual({
      completed: false,
      score: 0,
      recommendedLessonId: "boot-1",
      completedAt: null,
    });
    expect(result.document.state.evidence.filter(
      (item) => item.metadata?.serverScoredOutcome === "correct",
    )).toHaveLength(5);
    expect(result.document.state.evidence.every((item) => !item.verified)).toBe(true);
  });

  it("keeps repeated legacy diagnostic answers descriptive and ineligible", () => {
    const first = ASSESSMENT_QUESTIONS.map((question, index) =>
      shell(`first-screening:${question.id}`, {
        source: "diagnostic",
        method: "diagnostic-selection",
        activityVersion: ASSESSMENT_FORM_VERSION,
        activityId: `diagnostic:${question.id}`,
        skill: question.skill,
        occurredAt: `2026-07-20T08:10:${String(index).padStart(2, "0")}.000Z`,
        metadata: {
          selectedAnswer: index === 0 ? question.correct : "sai",
        },
      })
    );
    const memorizedRepeat = ASSESSMENT_QUESTIONS.map((question, index) =>
      shell(`repeat-screening:${question.id}`, {
        source: "diagnostic",
        method: "diagnostic-selection",
        activityVersion: ASSESSMENT_FORM_VERSION,
        activityId: `diagnostic:${question.id}`,
        skill: question.skill,
        occurredAt: `2026-07-20T09:10:${String(index).padStart(2, "0")}.000Z`,
        metadata: { selectedAnswer: question.correct },
      })
    );

    const result = enforceAuthoritativeLearningDocument(
      documentWithEvidence([...first, ...memorizedRepeat]),
    );
    expect(result.document.state.diagnostic).toMatchObject({
      completed: false,
      score: 0,
      recommendedLessonId: "boot-1",
      completedAt: null,
    });
    expect(result.document.state.evidence.filter((item) =>
      item.idempotencyKey.startsWith("repeat-screening:")
      && item.metadata?.priorExposure === true
    )).toHaveLength(ASSESSMENT_QUESTIONS.length);
  });

  it("keeps synthetic TTS as practice and excludes it from routing estimates", () => {
    const evidence = ASSESSMENT_QUESTIONS.map((question, index) =>
      shell(`tts-screening:${question.id}`, {
        source: "diagnostic",
        method: "diagnostic-selection",
        activityVersion: ASSESSMENT_FORM_VERSION,
        activityId: `diagnostic:${question.id}`,
        skill: question.skill,
        occurredAt: `2026-07-20T10:10:${String(index).padStart(2, "0")}.000Z`,
        metadata: {
          selectedAnswer: question.modality === "synthetic-tts-selection"
            ? question.correct
            : "sai",
        },
      })
    );

    const result = enforceAuthoritativeLearningDocument(documentWithEvidence(evidence));
    const listening = result.document.state.evidence.find((item) =>
      item.skill === "listening"
    );
    expect(result.document.state.diagnostic).toMatchObject({
      score: 0,
      recommendedLessonId: "boot-1",
    });
    expect(listening).toMatchObject({
      outcome: "unverified",
      verified: false,
      masteryEligible: false,
      metadata: {
        modality: "synthetic-tts-selection",
        measurementEligible: false,
        serverScoredOutcome: "correct",
      },
    });
    expect(result.document.state.skillMastery.listening).toBe(0);
  });

  it("re-scores reader snapshots descriptively without verifying them", () => {
    const story = RELEASED_STORIES[0];
    const question = story.comprehension[0];
    const result = enforceAuthoritativeLearningDocument(documentWithEvidence([
      shell("reader-session", {
        source: "reader",
        method: "reading-comprehension",
        activityVersion: `${story.contentVersion}:${question.id}:1`,
        activityId: `${story.id}:${question.id}`,
        skill: "reading",
        metadata: {
          selectedAnswer: question.correctAnswer,
          correctAnswer: "forged",
          usedHint: true,
        },
      }),
    ]));
    expect(result.document.state.evidence[0]).toMatchObject({
      outcome: "unverified",
      verified: false,
      masteryEligible: false,
      metadata: { serverScoredOutcome: "correct" },
    });
    expect(result.document.state.skillMastery.reading).toBe(0);
    expect(result.document.state.knowledge).toEqual({});
  });

  it("cannot restore verification through trusted legacy exposure metadata", () => {
    const answer = getAuthoritativeLessonAnswer("boot-2", "ni-meaning")!;
    const stored = enforceAuthoritativeLearningDocument(documentWithEvidence([
      shell("stored-answer", {
        activityVersion: answer.activityVersion,
        activityId: "boot-2:ni-meaning",
        method: answer.method,
        skill: answer.skill,
        occurredAt: "2026-07-20T08:00:00.000Z",
        metadata: { selectedAnswer: answer.answers[0] },
      }),
    ])).document;
    const combinedState = structuredClone(stored.state);
    combinedState.evidence.push(shell("backdated-answer", {
      activityVersion: answer.activityVersion,
      activityId: "boot-2:ni-meaning",
      method: answer.method,
      skill: answer.skill,
      occurredAt: "2026-07-20T07:00:00.000Z",
      metadata: { selectedAnswer: answer.answers[0] },
    }));
    const combined = createInitialSyncDocument(
      combinedState,
      "2026-07-20T09:00:00.000Z",
      "combined",
    );

    const result = enforceAuthoritativeLearningDocument(combined, {
      trustedExposure: deriveTrustedLearningExposure(stored),
    });
    expect(result.document.state.evidence.find(
      (item) => item.idempotencyKey === "backdated-answer",
    )).toMatchObject({
      outcome: "unverified",
      verified: false,
      masteryEligible: false,
      metadata: { serverScoredOutcome: "correct" },
    });
    expect(result.document.state.evidence.find(
      (item) => item.idempotencyKey === "stored-answer",
    )).toMatchObject({
      outcome: "unverified",
      verified: false,
      masteryEligible: false,
      metadata: { serverScoredOutcome: "correct" },
    });
    expect(result.document.state.knowledge).toEqual({});
    expect(result.document.state.completedLessons).toEqual({});
  });

  it("fails closed for client-authored XP, mistake aggregates, and FSRS timing", () => {
    const state = baseState();
    state.xp = 999_999;
    state.dailyXp = 12_345;
    state.streak = 999;
    state.lastStudyDate = "2026-07-20";
    state.reviewCount = 999;
    state.activityLog = [{
      id: "forged-reward",
      type: "lesson",
      label: "Client says this earned XP",
      xp: 1_000,
      occurredAt: "2026-07-20T08:00:00.000Z",
    }];
    state.evidence = [shell("forged-review", {
      activityVersion: `${CONTENT_VERSION}:fsrs:1`,
      activityId: "review:ni",
      source: "review",
      method: "fsrs-rating",
      skill: "vocabulary",
      occurredAt: "2026-07-20T08:00:00.000Z",
      metadata: { rating: 4 },
    })];
    state.mistakes = [
      {
        id: "valid-mistake",
        lessonId: "boot-2",
        questionId: "ni-meaning",
        wordId: "ni",
        kind: "meaning",
        skill: "vocabulary",
        prompt: "NghÄ©a cá»§a ä½  lÃ  gÃ¬?",
        selectedAnswer: "tÃ´i",
        correctAnswer: "báº¡n",
        explanation: "ä½  nghÄ©a lÃ  báº¡n.",
        occurrences: 1,
        correctedStreak: 0,
        resolved: false,
        lastAttemptAt: "2026-07-20T08:00:00+00:00",
      },
    ];
    const document = createInitialSyncDocument(state, NOW, "fixture");
    expect(document.legacyXpBaseline.value).toBeGreaterThan(0);
    expect(document.state.fsrsCards.ni).toBeDefined();

    const result = enforceAuthoritativeLearningDocument(document);
    expect(result.document.legacyXpBaseline.value).toBe(0);
    expect(result.document.state.xp).toBe(0);
    expect(result.document.state.dailyXp).toBe(0);
    expect(result.document.state.streak).toBe(0);
    expect(result.document.state.lastStudyDate).toBeNull();
    expect(result.document.state.activityLog).toEqual([
      expect.objectContaining({ id: "forged-reward", xp: 0 }),
    ]);
    expect(result.document.state.mistakes).toEqual([]);
    expect(result.document.state.fsrsCards).toEqual({});
    expect(result.document.state.reviewCount).toBe(0);
    expect(result.document.state.evidence).toContainEqual(expect.objectContaining({
      idempotencyKey: "forged-review",
      outcome: "unverified",
      verified: false,
      masteryEligible: false,
    }));
  });
});
