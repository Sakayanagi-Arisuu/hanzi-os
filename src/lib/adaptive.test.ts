import { describe, expect, it } from "vitest";
import {
  CONTENT_VERSION,
  LESSON_BY_ID,
  RELEASED_LESSONS,
} from "../data/curriculum";
import type { LearningState, Lesson } from "../types";
import {
  getNextLesson,
  getReleasedLessonProgress,
  isMistakeFromActivePathContent,
  isLessonPassed,
  isLessonUnlocked,
} from "./adaptive";

const completion = (bestScore: number): LearningState["completedLessons"][string] => ({
  score: bestScore,
  bestScore,
  attempts: 1,
  completedAt: "2026-07-20T00:00:00.000Z",
});

const makeState = (
  completedLessons: LearningState["completedLessons"] = {},
  startingLevel: LearningState["profile"]["startingLevel"] = "hsk1",
): LearningState => ({
  schemaVersion: 2,
  contentVersion: CONTENT_VERSION,
  profile: {
    name: "Policy test",
    goal: "conversation",
    dailyMinutes: 20,
    script: "simplified",
    startingLevel,
    onboarded: true,
  },
  xp: 0,
  dailyXp: 0,
  streak: 0,
  lastStudyDate: null,
  completedLessons,
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
    completed: true,
    score: 100,
    recommendedLessonId: "characters-1",
    completedAt: "2026-07-20T00:00:00.000Z",
  },
  evidence: [],
});

const lesson = (lessonId: string) => {
  const value = LESSON_BY_ID.get(lessonId);
  if (!value) throw new Error(`Missing test lesson: ${lessonId}`);
  return value;
};

describe("lesson release and prerequisite policy", () => {
  it("fails closed for an unreleased lesson even with prerequisite and own completion records", () => {
    const draft = {
      ...lesson("characters-2"),
      id: "characters-3",
      releaseState: "draft",
    } satisfies Lesson;
    const state = makeState({
      "characters-2": completion(100),
      "characters-3": completion(100),
    });

    expect(draft.releaseState).toBe("draft");
    expect(isLessonUnlocked(draft, state)).toBe(false);
    expect(isLessonPassed(draft, state)).toBe(false);
  });

  it("does not let starting level, diagnostic, or the lesson's own completion bypass prerequisites", () => {
    const boot2 = lesson("boot-2");
    const state = makeState({ "boot-2": completion(100) }, "hsk2");

    expect(state.profile.startingLevel).toBe("hsk2");
    expect(state.diagnostic.score).toBe(100);
    expect(isLessonUnlocked(boot2, state)).toBe(false);
  });

  it("requires every released prerequisite to have a best score of at least 70", () => {
    const boot2 = lesson("boot-2");

    expect(isLessonUnlocked(boot2, makeState({ "boot-1": completion(69) }))).toBe(false);
    expect(isLessonUnlocked(boot2, makeState({ "boot-1": completion(70) }))).toBe(true);
  });

  it("keeps a released lesson locked when its curriculum unit prerequisite is unavailable", () => {
    const characters1 = lesson("characters-1");
    const state = makeState({
      "survival-1": completion(100),
      "survival-2": completion(100),
      "survival-3": completion(100),
      "survival-4": completion(100),
    });

    expect(isLessonUnlocked(characters1, state)).toBe(false);
    expect(isMistakeFromActivePathContent({
      lessonId: "characters-1",
      wordId: "hsk-vocab-00254",
    }, "hsk1")).toBe(false);
  });

  it("counts only released lessons in progress", () => {
    const state = makeState({
      "boot-1": completion(100),
      "characters-3": completion(100),
      "unknown-lesson": completion(100),
    });

    expect(getReleasedLessonProgress(state)).toEqual({
      completedCount: 1,
      totalCount: 18,
      remainingCount: 17,
      progress: 6,
    });
  });

  it("uses distinct active slices and never backfills an unpublished target", () => {
    expect(getReleasedLessonProgress(makeState({}, "zero")).totalCount).toBe(4);
    expect(getReleasedLessonProgress(makeState({}, "hsk1")).totalCount).toBe(18);
    expect(getReleasedLessonProgress(makeState({}, "hsk4"))).toEqual({
      completedCount: 0,
      totalCount: 0,
      remainingCount: 0,
      progress: 0,
    });
    expect(getNextLesson(makeState({}, "hsk4"))).toBeUndefined();
  });

  it("never recommends an unreleased lesson", () => {
    const completedLessons = Object.fromEntries(
      RELEASED_LESSONS.map((releasedLesson) => [releasedLesson.id, completion(100)]),
    );
    const nextLesson = getNextLesson(makeState(completedLessons));

    expect(nextLesson).toBeDefined();
    expect(
      nextLesson?.releaseState === "beta" ||
      nextLesson?.releaseState === "published",
    ).toBe(true);
  });
});
