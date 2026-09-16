import { describe, expect, it } from "vitest";
import { RELEASED_LESSONS } from "../data/curriculum";
import { buildExerciseCatalog } from "../lib/exerciseGeneration";
import { crowdedPlaceSupport, remediationLessonSupport } from "./remediationLessonSupport";

describe("context-bound remediation support", () => {
  it("binds to a real released sentence without changing its answer or id", () => {
    const exercise = RELEASED_LESSONS.flatMap(lesson => buildExerciseCatalog(lesson, "simplified", () => 0.5)).find(item => item.prompt === crowdedPlaceSupport.prompt);
    expect(exercise).toBeDefined();
    expect(remediationLessonSupport(exercise!)).toBe(crowdedPlaceSupport);
    expect(new Set([exercise!.correct, ...crowdedPlaceSupport.distractors]).size).toBe(4);
    expect(crowdedPlaceSupport.humanReviewed).toBe(false);
    expect(remediationLessonSupport({ ...exercise!, correct: "changed answer" })).toBeNull();
    expect(remediationLessonSupport({ ...exercise!, prompt: "changed prompt" })).toBeNull();
  });
});
