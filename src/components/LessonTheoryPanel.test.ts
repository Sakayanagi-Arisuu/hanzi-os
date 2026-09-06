import { describe, expect, it } from "vitest";
import { RELEASED_RICH_LESSONS } from "../learning/richLessonContent";
import { learnerGrammarLabel } from "../learning/lessonTeachingFlow";
import {
  buildTheorySteps,
  canAdvanceTheoryStep,
} from "./LessonTheoryPanel";

describe("LessonTheoryPanel learning sequence", () => {
  it("keeps foundation lessons concise when no authored context exists", () => {
    expect(buildTheorySteps(false).map((step) => step.id)).toEqual([
      "concept",
      "words",
      "practice",
    ]);
  });

  it("makes dialogue and grammar a required bridge before guided practice", () => {
    expect(buildTheorySteps(true).map((step) => step.id)).toEqual([
      "concept",
      "words",
      "context",
      "practice",
    ]);
  });

  it("requires a real tone-direction check before boot-1 can advance", () => {
    expect(canAdvanceTheoryStep({ lessonId: "boot-1", stepId: "concept", selectedTone: null })).toBe(false);
    expect(canAdvanceTheoryStep({ lessonId: "boot-1", stepId: "concept", selectedTone: 2 })).toBe(false);
    expect(canAdvanceTheoryStep({ lessonId: "boot-1", stepId: "concept", selectedTone: 4 })).toBe(true);
    expect(canAdvanceTheoryStep({ lessonId: "boot-2", stepId: "concept", selectedTone: null })).toBe(true);
  });

  it("turns every source taxonomy label into a learner-readable heading", () => {
    const grammarPoints = RELEASED_RICH_LESSONS.flatMap((lesson) => lesson.grammar);
    expect(grammarPoints).toHaveLength(476);
    for (const point of grammarPoints) {
      const label = learnerGrammarLabel(point);
      expect(label).toMatch(/[A-Za-zÀ-ỹ]/u);
      expect(label.length).toBeLessThanOrEqual(84);
    }
  });
});
