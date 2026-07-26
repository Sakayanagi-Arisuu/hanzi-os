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
  getNextLesson,
  getReleasedLessonProgress,
  isLessonPassed,
  isLessonReleased,
  isLessonUnlocked,
} from "../lib/adaptive";
import type { LearningState, Lesson } from "../types";

const stateWithScores = (scores: Record<string, number> = {}) => ({
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

describe("release policy", () => {
  it("exposes only beta and published lessons as released", () => {
    expect(RELEASED_LESSONS).toEqual(
      LESSONS.filter((lesson) => ["beta", "published"].includes(lesson.releaseState)),
    );
    expect(RELEASED_LESSONS.every(isLessonReleased)).toBe(true);
    expect(RELEASED_LESSONS.some((lesson) => lesson.releaseState === "draft")).toBe(false);
    expect(RELEASED_LESSONS.every((lesson) => !lesson.skills.includes("speaking"))).toBe(true);
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
    const first = RELEASED_LESSONS[0];
    const second = RELEASED_LESSONS[1];
    expect(first.prerequisiteIds).toEqual([]);
    expect(second.prerequisiteIds).toEqual([first.id]);

    expect(isLessonUnlocked(first, stateWithScores())).toBe(true);
    expect(isLessonUnlocked(second, stateWithScores({ [first.id]: 69 }))).toBe(false);
    expect(isLessonUnlocked(second, stateWithScores({ [first.id]: 70 }))).toBe(true);
  });

  it("never unlocks or passes draft content even with historical scores", () => {
    const draft = LESSONS.find((lesson) => lesson.releaseState === "draft");
    expect(draft).toBeDefined();
    const state = stateWithScores({ [draft!.id]: 100 });
    expect(isLessonReleased(draft!)).toBe(false);
    expect(isLessonUnlocked(draft!, state)).toBe(false);
    expect(isLessonPassed(draft!, state)).toBe(false);
  });

  it("excludes draft lessons from progress and recommendations", () => {
    const draft = LESSONS.find((lesson) => lesson.releaseState === "draft")!;
    const first = RELEASED_LESSONS[0];
    const state = stateWithScores({ [draft.id]: 100, [first.id]: 100 });
    const progress = getReleasedLessonProgress(state);

    expect(progress).toMatchObject({
      completedCount: 1,
      totalCount: RELEASED_LESSONS.length,
      remainingCount: RELEASED_LESSONS.length - 1,
    });
    expect(getNextLesson(state)?.releaseState).not.toBe("draft");
  });

  it.each(["draft", "review", "retired"] as const)(
    "treats %s as unavailable",
    (releaseState) => {
      const released = RELEASED_LESSONS[0];
      const candidate: Lesson = { ...released, id: `fixture-${releaseState}`, releaseState };
      expect(isLessonReleased(candidate)).toBe(false);
      expect(LESSON_BY_ID.has(candidate.id)).toBe(false);
    },
  );
});
