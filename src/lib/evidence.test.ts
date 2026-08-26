import { describe, expect, it } from "vitest";
import { CONTENT_VERSION } from "../data/curriculum";
import type {
  LearningState,
  PracticeEvidenceInput,
  Skill,
} from "../types";
import {
  isMasteryEligibleEvidence,
  materializeEvidence,
  recordEvidenceInState,
  scoreLessonSession,
} from "./evidence";

const FIXED_TIME = "2026-07-20T04:30:00.000Z";

const mastery = (overrides: Partial<Record<Skill, number>> = {}): LearningState["skillMastery"] => ({
  pronunciation: 10,
  listening: 20,
  speaking: 30,
  reading: 40,
  writing: 50,
  vocabulary: 60,
  grammar: 70,
  ...overrides,
});

const stateFixture = (
  skillMastery: LearningState["skillMastery"] = mastery(),
): LearningState => ({
  schemaVersion: 2,
  contentVersion: CONTENT_VERSION,
  profile: {
    name: "Evidence fixture",
    goal: "conversation",
    dailyMinutes: 20,
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
  skillMastery,
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

const evidenceInput = (
  overrides: Partial<PracticeEvidenceInput> = {},
): PracticeEvidenceInput => ({
  idempotencyKey: "fixture:evidence:1",
  activityVersion: "fixture:activity:1",
  source: "lesson",
  method: "meaning-selection",
  activityId: "fixture-activity",
  skill: "vocabulary",
  outcome: "correct",
  score: 100,
  ...overrides,
});

describe("unified learning evidence", () => {
  it("inserts an idempotency key only once", () => {
    const input = evidenceInput({ idempotencyKey: "stable-key" });
    const first = recordEvidenceInState(stateFixture(), input, FIXED_TIME);
    const second = recordEvidenceInState(first.state, input, FIXED_TIME);

    expect(first.inserted).toBe(true);
    expect(first.state.evidence).toHaveLength(1);
    expect(first.state.skillMastery.vocabulary).toBe(61);
    expect(second).toEqual({ state: first.state, inserted: false });
    expect(second.state).toBe(first.state);
    expect(second.state.evidence).toHaveLength(1);
    expect(second.state.skillMastery.vocabulary).toBe(61);
  });

  it("fails closed when one idempotency key is reused for another payload", () => {
    const first = recordEvidenceInState(
      stateFixture(),
      evidenceInput({
        idempotencyKey: "stable-conflict-key",
        metadata: {
          selectedAnswer: "ä½ ",
          priorExposure: false,
          lessonVersion: "lesson-v1",
        },
      }),
      FIXED_TIME,
    );
    const retry = recordEvidenceInState(
      first.state,
      evidenceInput({
        idempotencyKey: "stable-conflict-key",
        outcome: "incorrect",
        score: 0,
        metadata: {
          selectedAnswer: "æˆ‘",
          priorExposure: true,
          lessonVersion: "lesson-v1",
        },
      }),
      "2026-07-20T04:31:00.000Z",
    );

    expect(retry).toEqual({
      state: first.state,
      inserted: false,
      conflict: true,
    });
    expect(retry.state).toBe(first.state);
    expect(retry.state.evidence).toHaveLength(1);
    expect(retry.state.skillMastery.vocabulary).toBe(61);
  });

  it("accepts an exact retry when only derived exposure has changed", () => {
    const input = evidenceInput({
      idempotencyKey: "stable-exposure-retry",
      metadata: {
        selectedAnswer: "ä½ ",
        priorExposure: false,
        lessonVersion: "lesson-v1",
      },
    });
    const first = recordEvidenceInState(stateFixture(), input, FIXED_TIME);
    const retry = recordEvidenceInState(first.state, {
      ...input,
      metadata: {
        ...input.metadata,
        priorExposure: true,
      },
    }, "2026-07-20T04:31:00.000Z");

    expect(retry).toEqual({ state: first.state, inserted: false });
  });

  it.each([
    ["activity version", { activityVersion: "fixture:activity:2" }],
    ["activity identity", { activityId: "other-activity" }],
    ["lesson provenance", {
      metadata: {
        selectedAnswer: "same",
        priorExposure: true,
        lessonVersion: "lesson-v2",
      },
    }],
  ] as const)("rejects same-key drift in %s", (_label, overrides) => {
    const original = evidenceInput({
      idempotencyKey: "stable-version-conflict",
      metadata: {
        selectedAnswer: "same",
        priorExposure: false,
        lessonVersion: "lesson-v1",
      },
    });
    const first = recordEvidenceInState(
      stateFixture(),
      original,
      FIXED_TIME,
    );
    const retry = recordEvidenceInState(first.state, {
      ...original,
      ...overrides,
    }, "2026-07-20T04:31:00.000Z");

    expect(retry).toMatchObject({
      state: first.state,
      inserted: false,
      conflict: true,
    });
  });

  it("updates only the skill named by eligible evidence", () => {
    const before = stateFixture();
    const result = recordEvidenceInState(before, evidenceInput(), FIXED_TIME);

    expect(result.state.skillMastery).toEqual({
      ...before.skillMastery,
      vocabulary: before.skillMastery.vocabulary + 1,
    });
    expect(before.skillMastery.vocabulary).toBe(60);
  });

  it.each([
    ["browser speech", "speech-transcript", "speaking"],
    ["FSRS rating", "fsrs-rating", "vocabulary"],
    ["phonology recognition", "phonology-recognition", "pronunciation"],
  ] as const)("records %s without increasing mastery", (_label, method, skill) => {
    const before = stateFixture();
    const result = recordEvidenceInState(before, evidenceInput({
      idempotencyKey: `ineligible:${method}`,
      source: method === "speech-transcript" ? "pronunciation" : method === "fsrs-rating" ? "review" : "lesson",
      method,
      skill,
      outcome: "correct",
      score: 100,
    }), FIXED_TIME);
    const stored = result.state.evidence[0];

    expect(result.inserted).toBe(true);
    expect(stored.masteryEligible).toBe(false);
    expect(result.state.skillMastery).toEqual(before.skillMastery);
  });

  it.each([
    ["stroke quiz", "stroke-quiz", "writing", "writing"],
    ["remediation", "remediation-recall", "mistake", "vocabulary"],
  ] as const)(
    "keeps client-reported %s evidence unverified and out of mastery",
    (_label, method, source, skill) => {
      const before = stateFixture();
      const result = recordEvidenceInState(before, evidenceInput({
        idempotencyKey: `client-reported:${method}`,
        source,
        method,
        skill,
      }), FIXED_TIME);

      expect(result.state.evidence[0]).toMatchObject({
        verified: false,
        masteryEligible: false,
      });
      expect(result.state.skillMastery).toEqual(before.skillMastery);
    },
  );

  it("lets versioned lesson recall update only writing mastery", () => {
    const before = stateFixture();
    const result = recordEvidenceInState(before, evidenceInput({
      idempotencyKey: "eligible:typed-character-recall",
      source: "lesson",
      method: "typed-character-recall",
      skill: "writing",
    }), FIXED_TIME);

    expect(isMasteryEligibleEvidence(
      "typed-character-recall",
      "writing",
    )).toBe(true);
    expect(result.state.evidence[0].masteryEligible).toBe(true);
    expect(result.state.skillMastery).toEqual({
      ...before.skillMastery,
      writing: before.skillMastery.writing + 1,
    });
  });

  it("keeps public-client Reader evidence unverified and out of mastery", () => {
    const before = stateFixture();
    const result = recordEvidenceInState(before, evidenceInput({
      idempotencyKey: "reader:public-client",
      source: "reader",
      method: "reading-comprehension",
      skill: "reading",
      metadata: {
        selectedAnswer: "学生",
        correctAnswer: "学生",
      },
    }), FIXED_TIME);

    expect(result.state.evidence[0]).toMatchObject({
      verified: false,
      masteryEligible: false,
      metadata: {
        selectedAnswer: "学生",
        correctAnswer: "学生",
        measurementEligible: false,
      },
    });
    expect(result.state.skillMastery).toEqual(before.skillMastery);
  });

  it("rejects cross-skill inference even for an otherwise eligible method", () => {
    const before = stateFixture();
    const result = recordEvidenceInState(before, evidenceInput({
      idempotencyKey: "reader-cannot-prove-speaking",
      source: "reader",
      method: "reading-comprehension",
      skill: "speaking",
    }), FIXED_TIME);

    expect(isMasteryEligibleEvidence("reading-comprehension", "speaking")).toBe(false);
    expect(result.state.evidence[0].masteryEligible).toBe(false);
    expect(result.state.skillMastery).toEqual(before.skillMastery);
  });

  it("stores hinted objective evidence but removes mastery eligibility", () => {
    const before = stateFixture();
    const result = recordEvidenceInState(before, evidenceInput({
      idempotencyKey: "hinted-recall",
      method: "typed-character-recall",
      source: "lesson",
      skill: "writing",
      metadata: { usedHint: true },
    }), FIXED_TIME);
    const stored = result.state.evidence[0];

    expect(stored.verified).toBe(true);
    expect(stored.masteryEligible).toBe(false);
    expect(stored.metadata).toEqual({ usedHint: true });
    expect(result.state.skillMastery).toEqual(before.skillMastery);
  });

  it("stores repeat exposure without treating it as new mastery evidence", () => {
    const before = stateFixture();
    const result = recordEvidenceInState(before, evidenceInput({
      idempotencyKey: "repeat-reader-item",
      source: "reader",
      method: "reading-comprehension",
      skill: "reading",
      metadata: { priorExposure: true },
    }), FIXED_TIME);

    expect(result.state.evidence[0].masteryEligible).toBe(false);
    expect(result.state.skillMastery).toEqual(before.skillMastery);
  });

  it("keeps synthetic or otherwise non-measurement evidence unverified", () => {
    const before = stateFixture();
    const result = recordEvidenceInState(before, evidenceInput({
      idempotencyKey: "synthetic-listening",
      method: "listening-selection",
      skill: "listening",
      metadata: { measurementEligible: false, audioSource: "synthetic-tts" },
    }), FIXED_TIME);

    expect(result.state.evidence[0]).toMatchObject({
      verified: false,
      masteryEligible: false,
      metadata: {
        measurementEligible: false,
        audioSource: "synthetic-tts",
      },
    });
    expect(result.state.skillMastery).toEqual(before.skillMastery);
  });

  it("separates practice completion from a correct outcome", () => {
    const before = stateFixture();
    const result = recordEvidenceInState(before, evidenceInput({
      idempotencyKey: "completed-stroke-practice",
      source: "writing",
      method: "stroke-quiz",
      skill: "writing",
      outcome: "completed",
      score: 100,
    }), FIXED_TIME);

    expect(result.state.evidence[0].masteryEligible).toBe(false);
    expect(result.state.skillMastery).toEqual(before.skillMastery);
  });

  it.each([
    [149.6, 100],
    [-20, 0],
    [49.6, 50],
    [null, null],
  ] as const)("normalizes evidence score %s to %s", (score, expected) => {
    expect(materializeEvidence(evidenceInput({ score }), FIXED_TIME).score).toBe(expected);
  });

  it("stamps schema, activity, content, identity, and occurrence versions", () => {
    const defaultVersion = materializeEvidence(evidenceInput(), FIXED_TIME);
    expect(defaultVersion).toMatchObject({
      id: "evidence:fixture:evidence:1",
      idempotencyKey: "fixture:evidence:1",
      schemaVersion: 1,
      contentVersion: CONTENT_VERSION,
      activityVersion: "fixture:activity:1",
      occurredAt: FIXED_TIME,
    });

    const legacyInput = evidenceInput({
      idempotencyKey: "legacy-content",
      contentVersion: "foundation-legacy",
      activityVersion: "legacy-activity:7",
    });
    const result = recordEvidenceInState(
      { ...stateFixture(), contentVersion: "stale-client-content" },
      legacyInput,
      FIXED_TIME,
    );

    expect(result.state.contentVersion).toBe(CONTENT_VERSION);
    expect(result.state.evidence[0]).toMatchObject({
      schemaVersion: 1,
      contentVersion: "foundation-legacy",
      activityVersion: "legacy-activity:7",
    });
  });

  it("clamps mastery at both bounds", () => {
    const correctAtCeiling = recordEvidenceInState(
      stateFixture(mastery({ vocabulary: 100 })),
      evidenceInput({ idempotencyKey: "ceiling" }),
      FIXED_TIME,
    );
    const wrongAtFloor = recordEvidenceInState(
      stateFixture(mastery({ vocabulary: 0 })),
      evidenceInput({ idempotencyKey: "floor", outcome: "incorrect", score: 0 }),
      FIXED_TIME,
    );

    expect(correctAtCeiling.state.skillMastery.vocabulary).toBe(100);
    expect(wrongAtFloor.state.skillMastery.vocabulary).toBe(0);
  });
});

describe("lesson session gate", () => {
  const answer = (index: number, correct: boolean, requiredForPass = false) =>
    materializeEvidence(evidenceInput({
      idempotencyKey: `lesson-answer:${index}`,
      activityId: `lesson:question-${index}`,
      outcome: correct ? "correct" : "incorrect",
      score: correct ? 100 : 0,
      metadata: { requiredForPass },
    }), FIXED_TIME);

  it("fails closed when the session evidence count is incomplete", () => {
    expect(scoreLessonSession([answer(1, true)], 10)).toBeNull();
  });

  it("uses the visible unassisted score even when the remediation subset is weak", () => {
    const answers = [
      answer(0, false, true),
      answer(1, false, true),
      answer(2, false, true),
      ...Array.from({ length: 7 }, (_, index) => answer(index + 3, true)),
    ];
    expect(scoreLessonSession(answers, 10)).toEqual({
      rawScore: 70,
      gateScore: 70,
      requiredPassed: false,
      requiredEvidenceCount: 3,
      requiredCorrect: 0,
    });
  });

  it("passes when the visible unassisted score reaches the threshold", () => {
    const answers = [
      answer(0, true, true),
      answer(1, true, true),
      answer(2, true, true),
      answer(3, false, true),
      answer(4, true),
      answer(5, true),
      answer(6, true),
      answer(7, true),
      answer(8, false),
      answer(9, false),
    ];
    expect(scoreLessonSession(answers, 10)).toMatchObject({
      rawScore: 70,
      gateScore: 70,
      requiredPassed: true,
      requiredEvidenceCount: 4,
      requiredCorrect: 3,
    });
  });

  it("lets an unassisted 8/10 lesson unlock the next trial", () => {
    const answers = [
      answer(0, false, true),
      answer(1, false, true),
      ...Array.from({ length: 8 }, (_, index) => answer(index + 2, true)),
    ];
    expect(scoreLessonSession(answers, 10)).toMatchObject({
      rawScore: 80,
      gateScore: 80,
      requiredPassed: false,
    });
  });

  it("keeps hints out of the gate while allowing a clean repeated retry", () => {
    const assisted = materializeEvidence(evidenceInput({
      idempotencyKey: "lesson-answer:assisted",
      activityId: "lesson:question-assisted",
      outcome: "correct",
      score: 100,
      metadata: { requiredForPass: true, usedHint: true },
    }), FIXED_TIME);
    const repeated = materializeEvidence(evidenceInput({
      idempotencyKey: "lesson-answer:repeated",
      activityId: "lesson:question-repeated",
      outcome: "correct",
      score: 100,
      metadata: { requiredForPass: false, priorExposure: true },
    }), FIXED_TIME);

    expect(scoreLessonSession([assisted, repeated], 2)).toEqual({
      rawScore: 100,
      gateScore: 50,
      requiredPassed: false,
      requiredEvidenceCount: 1,
      requiredCorrect: 0,
    });
  });
});
