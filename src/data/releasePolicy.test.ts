import { describe, expect, it } from "vitest";
import {
  LESSONS,
  LESSON_BY_ID,
  RELEASED_LESSONS,
  RELEASED_STORIES,
  RELEASED_VOCABULARY,
  RELEASED_WORD_BY_ID,
  STORIES,
  VOCABULARY,
} from "./curriculum";
import {
  getActivePathReleasedLessons,
  getNextLesson,
  getReleasedLessonProgress,
  isLessonPassed,
  isLessonReleased,
  isLessonUnlocked,
} from "../lib/adaptive";
import type { LearningState, Lesson } from "../types";

const stateWithScores = (scores: Record<string, number> = {}) => ({
  profile: {
    startingLevel: "hsk1",
  },
  completedLessons: Object.fromEntries(Object.entries(scores).map(([lessonId, bestScore]) => [
    lessonId,
    {
      score: bestScore,
      bestScore,
      attempts: 1,
      completedAt: "2026-07-20T00:00:00.000Z",
    },
  ])),
}) as LearningState;

const makeUnavailableLesson = (releaseState: "draft" | "review" | "retired") => {
  const source = RELEASED_LESSONS.find((lesson) => lesson.prerequisiteIds.length === 0);
  if (!source) throw new Error("Missing released root lesson fixture");

  return {
    ...source,
    id: `fixture-${releaseState}`,
    prerequisiteIds: [],
    releaseState,
  } satisfies Lesson;
};

describe("release policy", () => {
  it("exposes only beta and published lessons as released", () => {
    expect(RELEASED_LESSONS).toEqual(
      LESSONS.filter((lesson) => ["beta", "published"].includes(lesson.releaseState)),
    );
    expect(RELEASED_LESSONS.every(isLessonReleased)).toBe(true);
    expect(RELEASED_LESSONS.some((lesson) => lesson.releaseState === "draft")).toBe(false);
    const speakingLessonIds = RELEASED_LESSONS
      .filter((lesson) => lesson.skills.includes("speaking"))
      .map((lesson) => lesson.id);
    expect(speakingLessonIds).toHaveLength(75);
    expect(speakingLessonIds).toEqual(expect.arrayContaining([
      "survival-1",
      "daily-1",
      "journey-1",
      "professional-1",
    ]));
    expect(speakingLessonIds.some((lessonId) =>
      lessonId.startsWith("characters-")
    )).toBe(false);
  });

  it("scopes stories and vocabulary to released content references", () => {
    expect(RELEASED_STORIES).toEqual(
      STORIES.filter((story) => ["beta", "published"].includes(story.releaseState)),
    );
    const releasedWordIds = new Set([
      ...RELEASED_LESSONS.flatMap((lesson) => lesson.wordIds),
      ...RELEASED_STORIES.flatMap((story) =>
        story.sentences.flatMap((sentence) => sentence.wordIds)
      ),
    ]);
    expect(RELEASED_VOCABULARY).toEqual(
      VOCABULARY.filter((word) => releasedWordIds.has(word.id)),
    );
    expect([...RELEASED_WORD_BY_ID.keys()]).toEqual(
      RELEASED_VOCABULARY.map((word) => word.id),
    );
  });

  it("requires every released prerequisite to be passed at 70 percent", () => {
    const root = RELEASED_LESSONS.find((lesson) => lesson.prerequisiteIds.length === 0);
    const dependent = RELEASED_LESSONS.find((lesson) => lesson.prerequisiteIds.length > 0);
    if (!root || !dependent) throw new Error("Missing prerequisite-chain fixtures");

    const passedPrerequisites = Object.fromEntries(
      dependent.prerequisiteIds.map((lessonId) => [lessonId, 70]),
    );
    const belowThreshold = {
      ...passedPrerequisites,
      [dependent.prerequisiteIds[0]]: 69,
    };

    expect(isLessonUnlocked(root, stateWithScores())).toBe(true);
    expect(isLessonUnlocked(dependent, stateWithScores(belowThreshold))).toBe(false);
    expect(isLessonUnlocked(dependent, stateWithScores(passedPrerequisites))).toBe(true);
  });

  it("never unlocks or passes draft content even with historical scores", () => {
    const draft = makeUnavailableLesson("draft");
    const state = stateWithScores({ [draft.id]: 100 });
    expect(isLessonReleased(draft)).toBe(false);
    expect(isLessonUnlocked(draft, state)).toBe(false);
    expect(isLessonPassed(draft, state)).toBe(false);
  });

  it("excludes draft lessons from progress and recommendations", () => {
    const draft = makeUnavailableLesson("draft");
    const released = RELEASED_LESSONS.find((lesson) => lesson.prerequisiteIds.length === 0);
    if (!released) throw new Error("Missing released root lesson fixture");
    const state = stateWithScores({ [draft.id]: 100, [released.id]: 100 });
    const progress = getReleasedLessonProgress(state);
    const activeLessons = getActivePathReleasedLessons("hsk1");

    expect(progress).toMatchObject({
      completedCount: 1,
      totalCount: activeLessons.length,
      remainingCount: activeLessons.length - 1,
    });
    expect(getNextLesson(state)?.id).not.toBe(draft.id);
  });

  it.each(["draft", "review", "retired"] as const)(
    "treats %s as unavailable",
    (releaseState) => {
      const candidate = makeUnavailableLesson(releaseState);
      expect(isLessonReleased(candidate)).toBe(false);
      expect(LESSON_BY_ID.has(candidate.id)).toBe(false);
    },
  );
});
