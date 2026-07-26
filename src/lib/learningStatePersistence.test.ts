import { describe, expect, it } from "vitest";
import { LESSON_BY_ID, RELEASED_STORIES } from "../data/curriculum";
import { buildLessonResumeExercises } from "../learning/resumeProtocol";
import { INITIAL_LEARNING_STATE } from "../store/LearningStore";
import type {
  EvidenceMethod,
  LearningEvidence,
  LearningState,
  Skill,
} from "../types";
import type { Exercise } from "./exerciseGeneration";
import { materializeEvidence, scoreLessonSession } from "./evidence";
import { parseLearningStateImport } from "./learningStateImport";
import { parsePersistedLearningState } from "./learningStatePersistence";

const TIME = "2026-07-26T00:00:00.000Z";
const COMPLETION_TIME = "2026-07-26T00:01:00.000Z";

const methodForExercise = (exercise: Exercise): EvidenceMethod => {
  if (exercise.kind === "meaning") return "meaning-selection";
  if (exercise.kind === "listening") return "listening-selection";
  if (exercise.kind === "sentence") return "reading-comprehension";
  if (exercise.kind === "recall") return "typed-character-recall";
  return "phonology-recognition";
};

const evidence = (
  idempotencyKey: string,
  activityId: string,
): LearningEvidence => ({
  id: `evidence:${idempotencyKey}`,
  idempotencyKey,
  schemaVersion: 1,
  contentVersion: INITIAL_LEARNING_STATE.contentVersion,
  activityVersion: `${activityId}:1`,
  source: "lesson",
  method: "meaning-selection",
  activityId,
  skill: "vocabulary",
  outcome: "correct",
  score: 100,
  verified: true,
  masteryEligible: true,
  occurredAt: TIME,
  metadata: { questionId: activityId.split(":").at(-1) ?? activityId },
});

const lessonSessionEvidence = (
  lessonId: string,
  sessionId = `lesson-session:${lessonId}:persisted-fixture`,
) => {
  const lesson = LESSON_BY_ID.get(lessonId);
  if (!lesson) throw new Error(`Missing lesson fixture: ${lessonId}`);
  const exercises = buildLessonResumeExercises(
    lesson,
    "simplified",
    sessionId,
  );
  const answers = exercises.map((exercise) => materializeEvidence({
    idempotencyKey: `${sessionId}:answer:${exercise.id}`,
    contentVersion: lesson.contentVersion,
    activityVersion: exercise.activityVersion,
    source: "lesson",
    method: methodForExercise(exercise),
    activityId: `${lesson.id}:${exercise.id}`,
    skill: exercise.skill,
    outcome: "correct",
    score: 100,
    metadata: {
      questionId: exercise.id,
      wordId: exercise.wordId ?? null,
      selectedAnswer: exercise.correct,
      correctAnswer: exercise.correct,
      requiredForPass: exercise.requiredForPass ?? false,
      priorExposure: false,
    },
  }, TIME));
  const score = scoreLessonSession(answers, exercises.length);
  if (!score) throw new Error("Lesson fixture did not produce a score.");
  const completion = materializeEvidence({
    idempotencyKey: `${sessionId}:complete`,
    contentVersion: lesson.contentVersion,
    activityVersion: `${lesson.contentVersion}:${lesson.id}:1`,
    source: "lesson",
    method: "lesson-completion",
    activityId: lesson.id,
    skill: lesson.skills[0] ?? "vocabulary",
    outcome: "completed",
    score: score.gateScore,
    metadata: {
      passed: score.gateScore >= 70,
      clientScore: score.rawScore,
      rawScore: score.rawScore,
      evidenceCount: answers.length,
      requiredEvidenceCount: score.requiredEvidenceCount,
      requiredCorrect: score.requiredCorrect,
    },
  }, COMPLETION_TIME);
  return { answers, completion, score };
};

const masteryFromEvidence = (
  items: readonly LearningEvidence[],
): LearningState["skillMastery"] => {
  const result = {
    pronunciation: 0,
    listening: 0,
    speaking: 0,
    reading: 0,
    writing: 0,
    vocabulary: 0,
    grammar: 0,
  } satisfies Record<Skill, number>;
  for (const item of items) {
    if (!item.masteryEligible) continue;
    result[item.skill] = Math.max(
      0,
      Math.min(100, result[item.skill] + (
        item.outcome === "correct" ? 1 : -1
      )),
    );
  }
  return result;
};

const persistedFixture = (): LearningState => {
  const state = structuredClone(INITIAL_LEARNING_STATE);
  const session = lessonSessionEvidence("boot-1");
  state.profile = {
    name: "Local learner",
    goal: "career",
    dailyMinutes: 30,
    script: "traditional",
    startingLevel: "basic",
    onboarded: true,
  };
  state.xp = 480;
  state.dailyXp = 40;
  state.streak = 6;
  state.lastStudyDate = "2026-07-26";
  state.reviewCount = 12;
  state.completedLessons["boot-1"] = {
    score: session.score.gateScore,
    bestScore: session.score.gateScore,
    attempts: 1,
    completedAt: COMPLETION_TIME,
  };
  state.skillMastery = masteryFromEvidence(session.answers);
  state.knowledge = Object.fromEntries(session.answers.map((item) => [
    item.activityId,
    {
      attempts: 1,
      correct: 1,
      currentStreak: 1,
      mastery: 34,
      lastSeenAt: TIME,
    },
  ]));
  state.mistakes = [{
    id: "boot-1:q1",
    lessonId: "boot-1",
    questionId: "q1",
    wordId: "ni",
    kind: "meaning",
    skill: "vocabulary",
    prompt: "你 nghĩa là gì?",
    selectedAnswer: "tôi",
    correctAnswer: "bạn",
    explanation: "你 là đại từ ngôi hai.",
    occurrences: 2,
    correctedStreak: 0,
    resolved: false,
    lastAttemptAt: TIME,
  }];
  state.activityLog = [{
    id: "activity:boot-1",
    type: "lesson",
    label: LESSON_BY_ID.get("boot-1")!.title,
    xp: 40,
    occurredAt: TIME,
  }];
  state.evidence = [...session.answers, session.completion];
  return state;
};

describe("trusted persisted learning state", () => {
  it("preserves valid local progress, profile, aggregates, mistakes, and evidence on reload", () => {
    const before = persistedFixture();
    const decoded = JSON.parse(JSON.stringify(before)) as unknown;
    const result = parsePersistedLearningState(
      decoded,
      INITIAL_LEARNING_STATE,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.profile).toEqual(before.profile);
    expect(result.state).toMatchObject({
      xp: 480,
      dailyXp: 40,
      streak: 6,
      reviewCount: 12,
    });
    expect(result.state.completedLessons["boot-1"])
      .toEqual(before.completedLessons["boot-1"]);
    expect(result.state.knowledge).toEqual(before.knowledge);
    expect(result.state.mistakes).toEqual(before.mistakes);
    expect(result.state.mistakes[0]).toMatchObject({
      resolved: false,
      occurrences: 2,
    });
    expect(result.state.skillMastery).toEqual(before.skillMastery);
    expect(result.state.evidence).toEqual(before.evidence);
    expect(result.state.evidence[0]).toMatchObject({
      verified: true,
      outcome: "correct",
      score: 100,
    });
  });

  it("recomputes authority-bearing aggregates instead of accepting aggregate-only claims", () => {
    const state = structuredClone(INITIAL_LEARNING_STATE);
    state.completedLessons["boot-1"] = {
      score: 100,
      bestScore: 100,
      attempts: 99,
      completedAt: TIME,
    };
    state.skillMastery = {
      pronunciation: 100,
      listening: 100,
      speaking: 100,
      reading: 100,
      writing: 100,
      vocabulary: 100,
      grammar: 100,
    };
    state.knowledge["boot-1:forged-question"] = {
      attempts: 999,
      correct: 999,
      currentStreak: 999,
      mastery: 100,
      lastSeenAt: TIME,
    };

    const result = parsePersistedLearningState(
      state,
      INITIAL_LEARNING_STATE,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.completedLessons).toEqual({});
    expect(result.state.skillMastery).toEqual(
      INITIAL_LEARNING_STATE.skillMastery,
    );
    expect(result.state.knowledge).toEqual({});
  });

  it("caps persisted aggregate claims at what the retained evidence can replay", () => {
    const state = persistedFixture();
    const expectedCompleted = structuredClone(state.completedLessons);
    const expectedMastery = structuredClone(state.skillMastery);
    const expectedKnowledge = structuredClone(state.knowledge);
    state.completedLessons["boot-1"] = {
      score: 100,
      bestScore: 100,
      attempts: 999,
      completedAt: "2026-07-26T23:59:59.000Z",
    };
    state.skillMastery = {
      pronunciation: 100,
      listening: 100,
      speaking: 100,
      reading: 100,
      writing: 100,
      vocabulary: 100,
      grammar: 100,
    };
    for (const trace of Object.values(state.knowledge)) {
      trace.attempts = 999;
      trace.correct = 999;
      trace.currentStreak = 999;
      trace.mastery = 100;
    }

    const result = parsePersistedLearningState(
      state,
      INITIAL_LEARNING_STATE,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.completedLessons).toEqual(expectedCompleted);
    expect(result.state.skillMastery).toEqual(expectedMastery);
    expect(result.state.knowledge).toEqual(expectedKnowledge);
  });

  it("does not restore completion when its exact versioned lesson form is incomplete", () => {
    const state = persistedFixture();
    const missingAnswer = state.evidence.find((item) =>
      item.method !== "lesson-completion"
    );
    if (!missingAnswer) throw new Error("Missing answer fixture.");
    state.evidence = state.evidence.filter((item) =>
      item.id !== missingAnswer.id
    );

    const result = parsePersistedLearningState(
      state,
      INITIAL_LEARNING_STATE,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.completedLessons).toEqual({});
    expect(result.state.evidence.some((item) =>
      item.method === "lesson-completion"
    )).toBe(false);
    expect(result.state.knowledge[missingAnswer.activityId]).toBeUndefined();
    expect(Object.keys(result.state.knowledge)).toHaveLength(9);
  });

  it("downgrades legacy Reader trust without corrupting or mutating the snapshot", () => {
    const state = structuredClone(INITIAL_LEARNING_STATE);
    const story = RELEASED_STORIES[0];
    const question = story?.comprehension[0];
    if (!story || !question) throw new Error("Missing Reader fixture.");
    const currentReaderEvidence = materializeEvidence({
      idempotencyKey: "reader-check:persisted-fixture",
      contentVersion: story.contentVersion,
      activityVersion: `${story.contentVersion}:${question.id}:1`,
      source: "reader",
      method: "reading-comprehension",
      activityId: `${story.id}:${question.id}`,
      skill: "reading",
      outcome: "correct",
      score: 100,
      metadata: {
        selectedAnswer: question.correctAnswer,
        correctAnswer: question.correctAnswer,
        translationVisible: false,
        usedHint: false,
        priorExposure: false,
      },
    }, TIME);
    const readerEvidence: LearningEvidence = {
      ...currentReaderEvidence,
      verified: true,
      masteryEligible: true,
      metadata: {
        ...currentReaderEvidence.metadata,
        measurementEligible: true,
      },
    };
    state.evidence = [readerEvidence];
    state.skillMastery.reading = 100;
    const inputBefore = structuredClone(state);

    const result = parsePersistedLearningState(
      state,
      INITIAL_LEARNING_STATE,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.evidence).toEqual([{
      ...readerEvidence,
      verified: false,
      masteryEligible: false,
      metadata: {
        ...readerEvidence.metadata,
        measurementEligible: false,
      },
    }]);
    expect(result.state.skillMastery).toEqual(
      INITIAL_LEARNING_STATE.skillMastery,
    );
    expect(state).toEqual(inputBefore);
    expect(readerEvidence).toMatchObject({
      verified: true,
      masteryEligible: true,
      metadata: {
        measurementEligible: true,
      },
    });
    expect(result.state.knowledge).toEqual({});
    expect(result.state.completedLessons).toEqual({});
  });

  it("does not revive draft or unknown content from a valid local snapshot", () => {
    const state = persistedFixture();
    const releasedEvidenceKeys = state.evidence.map((item) =>
      item.idempotencyKey
    );
    state.completedLessons["characters-3"] = {
      score: 100,
      bestScore: 100,
      attempts: 1,
      completedAt: TIME,
    };
    state.savedWords = ["ni", "unknown-word"];
    state.fsrsCards["unknown-word"] = {
      due: TIME,
      stability: 1,
      difficulty: 1,
      elapsed_days: 0,
      scheduled_days: 0,
      learning_steps: 0,
      reps: 0,
      lapses: 0,
      state: 0,
    };
    state.knowledge["characters-3:q1"] = {
      attempts: 1,
      correct: 1,
      currentStreak: 1,
      mastery: 100,
      lastSeenAt: TIME,
    };
    state.mistakes.push({
      ...state.mistakes[0],
      id: "characters-3:q1",
      lessonId: "characters-3",
      wordId: undefined,
    });
    state.evidence.push(
      evidence("draft-answer", "characters-3:q1"),
      {
        ...evidence("draft-reader", "unknown-story:q1"),
        source: "reader",
        method: "reading-comprehension",
        skill: "reading",
      },
      {
        ...evidence("unknown-writing", "stroke-quiz:unknown-word:字"),
        source: "writing",
        method: "stroke-quiz",
        skill: "writing",
        verified: false,
        masteryEligible: false,
      },
    );
    state.activityLog.push({
      id: "activity:characters-3",
      type: "lesson",
      label: LESSON_BY_ID.get("characters-3")!.title,
      xp: 40,
      occurredAt: TIME,
    });
    state.diagnostic = {
      completed: true,
      score: 90,
      recommendedLessonId: "characters-3",
      completedAt: TIME,
    };

    const result = parsePersistedLearningState(
      state,
      INITIAL_LEARNING_STATE,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.state.completedLessons)).toEqual(["boot-1"]);
    expect(result.state.savedWords).toEqual(["ni"]);
    expect(result.state.fsrsCards["unknown-word"]).toBeUndefined();
    expect(result.state.knowledge["characters-3:q1"]).toBeUndefined();
    expect(result.state.mistakes.map((item) => item.id))
      .toEqual(["boot-1:q1"]);
    expect(result.state.evidence.map((item) => item.idempotencyKey))
      .toEqual(releasedEvidenceKeys);
    expect(result.state.activityLog.map((item) => item.id))
      .toEqual(["activity:boot-1"]);
    expect(result.state.diagnostic.recommendedLessonId).toBe("boot-1");
  });

  it("fails closed instead of partially loading a corrupt current snapshot", () => {
    const state = persistedFixture();
    state.completedLessons["boot-1"].attempts = 0;

    expect(parsePersistedLearningState(
      state,
      INITIAL_LEARNING_STATE,
    )).toEqual({
      ok: false,
      error: "Persisted learning state is corrupt.",
    });
  });

  it("rejects evidence whose persisted trust flags contradict policy", () => {
    const state = persistedFixture();
    state.evidence[0] = {
      ...state.evidence[0],
      verified: false,
      masteryEligible: false,
    };

    expect(parsePersistedLearningState(
      state,
      INITIAL_LEARNING_STATE,
    )).toEqual({
      ok: false,
      error: "Persisted learning state is corrupt.",
    });
  });

  it("does not weaken the separate untrusted backup-import policy", () => {
    const state = persistedFixture();
    const result = parseLearningStateImport(state, INITIAL_LEARNING_STATE);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.profile).toEqual(state.profile);
    expect(result.state.completedLessons).toEqual({});
    expect(result.state.mistakes).toEqual([]);
    expect(result.state.skillMastery.vocabulary).toBe(0);
    expect(result.state.evidence[0]).toMatchObject({
      verified: false,
      masteryEligible: false,
      outcome: "unverified",
      score: null,
    });
  });
});
