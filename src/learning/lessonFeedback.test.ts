import { describe, expect, it } from "vitest";
import type { NormalizedLessonPresentationActivityV1 } from "./normalizedLessonRuntime";
import { buildLessonAnswerFeedback } from "./lessonFeedback";

const toneActivity = {
  activityId: "boot-1:tone-1",
  activityVersion: "v1",
  kind: "tone",
  skill: "pronunciation",
  instruction: "Nhận diện thanh",
  prompt: "yī",
  promptMeta: "一",
  options: ["Thanh 1", "Thanh 2"],
  requiredForPass: true,
} as NormalizedLessonPresentationActivityV1;

describe("buildLessonAnswerFeedback", () => {
  it("turns a correct tone result into a retrieval cue", () => {
    expect(buildLessonAnswerFeedback({ activity: toneActivity, selected: "Thanh 1 · cao và ngang", correct: true }))
      .toContain("Vẽ hướng đó bằng tay");
  });

  it("guides an incorrect tone attempt without leaking the answer", () => {
    const feedback = buildLessonAnswerFeedback({ activity: toneActivity, selected: "Thanh 2", correct: false });
    expect(feedback).toContain("ngang, lên, thấp hay rơi");
    expect(feedback).not.toContain("Thanh 1");
  });
});
