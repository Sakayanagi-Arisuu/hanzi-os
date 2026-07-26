import { describe, expect, it } from "vitest";
import { CONTENT_VERSION } from "../data/curriculum";
import { MAX_LEARNING_RESET_EPOCH } from "../learning/resetEpoch";
import type {
  LearningEvidence,
  LearningState,
  StudyEvent,
} from "../types";
import {
  canonicalStringify,
  createInitialSyncDocument,
  evolveSyncDocument,
  mergeSyncDocuments,
  redactStateForCloud,
  sha256Hex,
} from "./document";

const DAY_0 = "2026-07-20T04:00:00.000Z";
const DAY_1 = "2026-07-21T04:00:00.000Z";
const DAY_2 = "2026-07-22T04:00:00.000Z";

const stateFixture = (overrides: Partial<LearningState> = {}): LearningState => ({
  schemaVersion: 2,
  contentVersion: CONTENT_VERSION,
  profile: {
    name: "Sync fixture",
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
  ...overrides,
});

const evidenceFixture = (
  idempotencyKey: string,
  overrides: Partial<LearningEvidence> = {},
): LearningEvidence => ({
  id: `evidence:${idempotencyKey}`,
  idempotencyKey,
  schemaVersion: 1,
  contentVersion: CONTENT_VERSION,
  activityVersion: `${CONTENT_VERSION}:fixture:1`,
  source: "lesson",
  method: "meaning-selection",
  activityId: "boot-1:meaning-ni",
  skill: "vocabulary",
  outcome: "correct",
  score: 100,
  verified: true,
  masteryEligible: true,
  occurredAt: DAY_1,
  ...overrides,
});

const legacyReaderEvidenceFixture = (
  idempotencyKey: string,
): LearningEvidence => evidenceFixture(idempotencyKey, {
  source: "reader",
  method: "reading-comprehension",
  activityId: "reader-story-1:q1",
  activityVersion: `${CONTENT_VERSION}:reader-story-1:q1:1`,
  skill: "reading",
  verified: true,
  masteryEligible: true,
  metadata: {
    selectedAnswer: "学生",
    correctAnswer: "学生",
    measurementEligible: true,
  },
});

const activityFixture = (
  id: string,
  xp: number,
  occurredAt: string,
  overrides: Partial<StudyEvent> = {},
): StudyEvent => ({
  id,
  type: "lesson",
  label: id,
  xp,
  occurredAt,
  ...overrides,
});

describe("canonical cloud representation", () => {
  it("canonicalizes object keys recursively and hashes values consistently", async () => {
    const left = { z: 3, nested: { b: true, a: [2, 1] } };
    const right = { nested: { a: [2, 1], b: true }, z: 3 };

    expect(canonicalStringify(left)).toBe(
      '{"nested":{"a":[2,1],"b":true},"z":3}',
    );
    expect(canonicalStringify(right)).toBe(canonicalStringify(left));
    expect(await sha256Hex(left)).toBe(await sha256Hex(right));
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("drops the entire browser-speech evidence row without mutating local state", () => {
    const speech = evidenceFixture("speech:1", {
      source: "pronunciation",
      method: "speech-transcript",
      activityId: "speech:0",
      skill: "speaking",
      outcome: "unverified",
      verified: false,
      masteryEligible: false,
      metadata: {
        transcript: "我是学生",
        confidence: 0.91,
      },
    });
    const safeEvidence = evidenceFixture("safe:1");
    const local = stateFixture({ evidence: [speech, safeEvidence] });

    const redacted = redactStateForCloud(local);

    expect(local.evidence).toHaveLength(2);
    expect(redacted.evidence).toEqual([safeEvidence]);
    expect(canonicalStringify(redacted)).not.toContain("我是学生");
    expect(canonicalStringify(redacted)).not.toContain("speech-transcript");
  });

  it("downgrades public-client Reader trust without mutating local state", () => {
    const legacyReader = legacyReaderEvidenceFixture("reader:legacy-local");
    const local = stateFixture({
      evidence: [legacyReader],
      skillMastery: {
        ...stateFixture().skillMastery,
        reading: 100,
      },
    });
    const before = canonicalStringify(local);

    const redacted = redactStateForCloud(local);

    expect(canonicalStringify(local)).toBe(before);
    expect(redacted.evidence).toEqual([{
      ...legacyReader,
      verified: false,
      masteryEligible: false,
      metadata: {
        ...legacyReader.metadata,
        measurementEligible: false,
      },
    }]);
  });
});

describe("cloud document lifecycle", () => {
  it("wraps legacy XP, saved-word presence, and a recomputed projection", () => {
    const activity = activityFixture("legacy-visible-event", 25, DAY_0);
    const local = stateFixture({
      xp: 75,
      savedWords: ["ni"],
      activityLog: [activity],
      skillMastery: {
        pronunciation: 100,
        listening: 100,
        speaking: 100,
        reading: 100,
        writing: 100,
        vocabulary: 100,
        grammar: 100,
      },
      evidence: [evidenceFixture("answer:1")],
    });

    const document = createInitialSyncDocument(local, DAY_0, "device-a:initial");

    expect(document.schemaVersion).toBe(1);
    expect(document.legacyXpBaseline.value).toBe(50);
    expect(document.savedWords.ni.present).toBe(true);
    expect(document.state.savedWords).toEqual(["ni"]);
    expect(document.state.xp).toBe(75);
    expect(document.state.skillMastery).toEqual({
      pronunciation: 0,
      listening: 0,
      speaking: 0,
      reading: 0,
      writing: 0,
      vocabulary: 1,
      grammar: 0,
    });
  });

  it("never lets a legacy Reader snapshot seed cloud mastery", () => {
    const legacyReader = legacyReaderEvidenceFixture(
      "reader:legacy-cloud-seed",
    );
    const local = stateFixture({
      evidence: [legacyReader],
      skillMastery: {
        ...stateFixture().skillMastery,
        reading: 100,
      },
    });

    const document = createInitialSyncDocument(
      local,
      DAY_0,
      "reader-legacy-seed",
    );

    expect(document.state.evidence[0]).toMatchObject({
      source: "reader",
      verified: false,
      masteryEligible: false,
      metadata: { measurementEligible: false },
    });
    expect(document.state.skillMastery.reading).toBe(0);
    expect(local.evidence[0]).toBe(legacyReader);
    expect(legacyReader).toMatchObject({
      verified: true,
      masteryEligible: true,
      metadata: { measurementEligible: true },
    });
  });

  it("merges immutable evidence by idempotency and reports payload reuse", () => {
    const baseState = stateFixture();
    const base = createInitialSyncDocument(baseState, DAY_0, "base");
    const correct = evidenceFixture("shared-key", { outcome: "correct", score: 100 });
    const incorrect = evidenceFixture("shared-key", { outcome: "incorrect", score: 0 });
    const left = evolveSyncDocument(
      base,
      baseState,
      stateFixture({ evidence: [correct] }),
      DAY_1,
      "device-a:answer",
    );
    const right = evolveSyncDocument(
      base,
      baseState,
      stateFixture({ evidence: [incorrect] }),
      DAY_1,
      "device-b:answer",
    );

    const forward = mergeSyncDocuments(left, right);
    const reverse = mergeSyncDocuments(right, left);

    expect(forward.document.state.evidence).toHaveLength(1);
    expect(forward.conflicts).toMatchObject([{
      collection: "evidence",
      key: "shared-key",
      reason: "same-key-different-payload",
    }]);
    expect(canonicalStringify(forward)).toBe(canonicalStringify(reverse));
  });

  it("commutatively normalizes legacy Reader trust before immutable merge", () => {
    const legacyReader = legacyReaderEvidenceFixture(
      "reader:legacy-merge",
    );
    const normalized = createInitialSyncDocument(
      stateFixture({ evidence: [legacyReader] }),
      DAY_0,
      "reader-normalized",
    );
    const legacy = structuredClone(normalized);
    const legacyEvidence = legacy.state.evidence[0]!;
    legacyEvidence.verified = true;
    legacyEvidence.masteryEligible = true;
    legacyEvidence.metadata = {
      ...legacyEvidence.metadata,
      measurementEligible: true,
    };
    legacy.state.skillMastery.reading = 100;
    const legacyBefore = canonicalStringify(legacy);
    const normalizedBefore = canonicalStringify(normalized);

    const forward = mergeSyncDocuments(legacy, normalized);
    const reverse = mergeSyncDocuments(normalized, legacy);

    expect(canonicalStringify(forward)).toBe(canonicalStringify(reverse));
    expect(forward.conflicts).toEqual([]);
    expect(forward.document.state.evidence[0]).toMatchObject({
      source: "reader",
      verified: false,
      masteryEligible: false,
      metadata: { measurementEligible: false },
    });
    expect(forward.document.state.skillMastery.reading).toBe(0);
    expect(canonicalStringify(legacy)).toBe(legacyBefore);
    expect(canonicalStringify(normalized)).toBe(normalizedBefore);
  });

  it("uses Lamport LWW clocks for profile and diagnostic fields", () => {
    const baseState = stateFixture();
    const base = createInitialSyncDocument(baseState, DAY_0, "base");
    const deviceAState = stateFixture({
      profile: { ...baseState.profile, name: "Device A" },
      diagnostic: {
        completed: true,
        score: 30,
        recommendedLessonId: "boot-1",
        completedAt: DAY_1,
      },
    });
    const deviceBState = stateFixture({
      profile: { ...baseState.profile, name: "Device B" },
      diagnostic: {
        completed: true,
        score: 80,
        recommendedLessonId: "characters-1",
        completedAt: DAY_1,
      },
    });
    const deviceA = evolveSyncDocument(base, baseState, deviceAState, DAY_1, "device-a:update");
    const deviceB = evolveSyncDocument(base, baseState, deviceBState, DAY_1, "device-b:update");

    const merged = mergeSyncDocuments(deviceA, deviceB).document;

    expect(merged.state.profile.name).toBe("Device B");
    expect(merged.state.diagnostic.score).toBe(80);
    expect(merged.profile.clock.operationId).toBe("device-b:update");
    expect(merged.diagnostic.clock.operationId).toBe("device-b:update");
  });

  it("keeps saved-word removals as tombstones and allows a later explicit add", () => {
    const baseState = stateFixture({ savedWords: ["ni"] });
    const base = createInitialSyncDocument(baseState, DAY_0, "base");
    const removedState = stateFixture({ savedWords: [] });
    const removed = evolveSyncDocument(base, baseState, removedState, DAY_1, "device-a:remove-ni");
    const stale = evolveSyncDocument(
      base,
      baseState,
      stateFixture({
        savedWords: ["ni"],
        evidence: [evidenceFixture("stale-device-answer")],
      }),
      DAY_1,
      "device-b:study",
    );

    const afterRemoval = mergeSyncDocuments(stale, removed).document;
    expect(afterRemoval.savedWords.ni.present).toBe(false);
    expect(afterRemoval.state.savedWords).toEqual([]);

    const readdedState = {
      ...afterRemoval.state,
      savedWords: ["ni"],
    };
    const readded = evolveSyncDocument(
      afterRemoval,
      afterRemoval.state,
      readdedState,
      DAY_2,
      "device-b:add-ni-again",
    );
    expect(readded.savedWords.ni.present).toBe(true);
    expect(readded.state.savedWords).toEqual(["ni"]);
  });

  it("lets a higher reset epoch dominate stale offline operations", () => {
    const existingEvidence = evidenceFixture("before-reset");
    const baseState = stateFixture({
      xp: 40,
      savedWords: ["ni"],
      evidence: [existingEvidence],
    });
    const base = createInitialSyncDocument(baseState, DAY_0, "base");
    const pristine = stateFixture({
      profile: { ...baseState.profile, onboarded: false },
    });
    const reset = evolveSyncDocument(
      base,
      baseState,
      pristine,
      DAY_1,
      "device-a:reset",
      "reset",
    );
    const staleState = stateFixture({
      ...baseState,
      evidence: [existingEvidence, evidenceFixture("offline-after-reset")],
    });
    const stale = evolveSyncDocument(base, baseState, staleState, DAY_2, "device-b:offline-study");

    const merged = mergeSyncDocuments(stale, reset).document;

    expect(reset.reset.epoch).toBe(1);
    expect(merged.reset.epoch).toBe(1);
    expect(merged.state.evidence).toEqual([]);
    expect(merged.state.savedWords).toEqual([]);
    expect(merged.state.xp).toBe(0);
    expect(merged.state.profile.onboarded).toBe(false);
  });

  it("never infers a reset from a missing or pristine local projection", () => {
    const baseState = stateFixture({
      xp: 40,
      evidence: [evidenceFixture("server-backed")],
    });
    const base = createInitialSyncDocument(baseState, DAY_0, "base");
    const missingLocalProjection = stateFixture({
      profile: { ...baseState.profile, onboarded: false },
    });

    const reconciled = evolveSyncDocument(
      base,
      base.state,
      missingLocalProjection,
      DAY_1,
      "startup-reconcile",
      "local-import",
    );

    expect(reconciled.reset.epoch).toBe(0);
    expect(reconciled.state.evidence.map((item) => item.idempotencyKey))
      .toContain("server-backed");
  });

  it("refuses to overflow the shared reset-epoch boundary", () => {
    const state = stateFixture();
    const base = createInitialSyncDocument(state, DAY_0, "base");
    base.reset.epoch = MAX_LEARNING_RESET_EPOCH;

    expect(() => evolveSyncDocument(
      base,
      state,
      stateFixture(),
      DAY_1,
      "overflow-reset",
      "reset",
    )).toThrow(`Learning reset epoch cannot exceed ${MAX_LEARNING_RESET_EPOCH}.`);
  });
});

describe("deterministic learning projection", () => {
  it("does not turn pruned activity into legacy XP and count it twice", () => {
    const oldActivity = activityFixture("old-activity", 20, DAY_0);
    const baseState = stateFixture({
      xp: 70,
      activityLog: [oldActivity],
    });
    const base = createInitialSyncDocument(baseState, DAY_0, "base");
    const newestOnly = activityFixture("new-activity", 5, DAY_1);
    const nextState = stateFixture({
      xp: 75,
      // Simulate the bounded local activity window pruning the older item.
      activityLog: [newestOnly],
    });

    const evolved = evolveSyncDocument(
      base,
      baseState,
      nextState,
      DAY_1,
      "device-a:new-activity",
    );

    expect(evolved.state.activityLog.map((item) => item.id)).toEqual([
      "old-activity",
      "new-activity",
    ]);
    expect(evolved.legacyXpBaseline.value).toBe(50);
    expect(evolved.state.xp).toBe(75);
  });

  it("replays unioned attempts, completion, FSRS reviews, activity, and XP", () => {
    const baseState = stateFixture({ xp: 50 });
    const base = createInitialSyncDocument(baseState, DAY_0, "base");
    const correct = evidenceFixture("answer:correct", {
      outcome: "correct",
      score: 100,
      occurredAt: DAY_0,
    });
    const incorrect = evidenceFixture("answer:incorrect", {
      outcome: "incorrect",
      score: 0,
      occurredAt: DAY_2,
    });
    const completion = evidenceFixture("lesson:complete", {
      method: "lesson-completion",
      activityId: "boot-1",
      outcome: "completed",
      score: 80,
      masteryEligible: false,
      occurredAt: DAY_1,
    });
    const reviewGood = evidenceFixture("review:good", {
      source: "review",
      method: "fsrs-rating",
      activityId: "review:ni",
      outcome: "unverified",
      score: null,
      masteryEligible: false,
      occurredAt: DAY_1,
      metadata: { rating: 3 },
    });
    const reviewAgain = evidenceFixture("review:again", {
      source: "review",
      method: "fsrs-rating",
      activityId: "review:ni",
      outcome: "incorrect",
      score: null,
      masteryEligible: false,
      occurredAt: DAY_2,
      metadata: { rating: 1 },
    });

    const deviceAState = stateFixture({
      xp: 70,
      evidence: [correct, completion, reviewGood],
      activityLog: [activityFixture("lesson-xp", 20, DAY_1)],
    });
    const deviceBState = stateFixture({
      xp: 55,
      evidence: [incorrect, reviewAgain],
      activityLog: [activityFixture("review-xp", 5, DAY_2, { type: "review" })],
    });
    const deviceA = evolveSyncDocument(base, baseState, deviceAState, DAY_1, "device-a:batch");
    const deviceB = evolveSyncDocument(base, baseState, deviceBState, DAY_2, "device-b:batch");

    const forward = mergeSyncDocuments(deviceA, deviceB).document;
    const reverse = mergeSyncDocuments(deviceB, deviceA).document;

    expect(canonicalStringify(forward)).toBe(canonicalStringify(reverse));
    expect(forward.state.evidence).toHaveLength(5);
    expect(forward.state.skillMastery.vocabulary).toBe(0);
    expect(forward.state.knowledge["boot-1:meaning-ni"]).toMatchObject({
      attempts: 2,
      correct: 1,
      currentStreak: 0,
      mastery: 23,
    });
    expect(forward.state.completedLessons["boot-1"]).toEqual({
      score: 80,
      bestScore: 80,
      attempts: 1,
      completedAt: DAY_1,
    });
    expect(forward.state.reviewCount).toBe(2);
    expect(forward.state.fsrsCards.ni).toMatchObject({
      reps: 2,
      state: expect.any(Number),
    });
    expect(Number.isNaN(new Date(forward.state.fsrsCards.ni.due).getTime())).toBe(false);
    expect(forward.state.activityLog.map((item) => item.id)).toEqual(["lesson-xp", "review-xp"]);
    expect(forward.state.xp).toBe(75);
    expect(forward.state.lastStudyDate).toBe("2026-07-22");
    expect(forward.state.dailyXp).toBe(5);
    expect(forward.state.streak).toBe(2);
  });
});
