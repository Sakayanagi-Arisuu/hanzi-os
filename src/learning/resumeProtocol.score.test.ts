import { describe, expect, it } from "vitest";
import type { Exercise } from "../lib/exerciseGeneration";
import { scoreLessonResumeAnswers } from "./resumeProtocol";

const exercises: Exercise[] = Array.from({ length: 10 }, (_, index) => ({
  id: `exercise-${index}`,
  activityVersion: "test:lesson:1",
  wordId: `word-${index}`,
  kind: "meaning",
  skill: "vocabulary",
  instruction: "Chọn nghĩa",
  prompt: `word-${index}`,
  options: ["đúng", "sai"],
  correct: "đúng",
  explanation: "Giải thích",
}));

describe("scoreLessonResumeAnswers", () => {
  it("includes the just-submitted final answer when the learner crosses 70%", () => {
    const sixCorrect = exercises.slice(0, 6).map((exercise) => ({
      exerciseId: exercise.id,
      selectedAnswer: "đúng",
    }));
    const beforeFinal = [
      ...sixCorrect,
      ...exercises.slice(6, 9).map((exercise) => ({
        exerciseId: exercise.id,
        selectedAnswer: "sai",
      })),
    ];
    const afterFinal = [
      ...beforeFinal,
      { exerciseId: exercises[9].id, selectedAnswer: "đúng" },
    ];

    expect(scoreLessonResumeAnswers(exercises, beforeFinal).gateScore).toBe(60);
    expect(scoreLessonResumeAnswers(exercises, afterFinal).gateScore).toBe(70);
  });

  it("does not let a hinted answer increase the independent gate", () => {
    const answers = exercises.slice(0, 7).map((exercise, index) => ({
      exerciseId: exercise.id,
      selectedAnswer: "đúng",
      usedHint: index === 6,
    }));

    expect(scoreLessonResumeAnswers(exercises, answers)).toMatchObject({
      rawScore: 70,
      gateScore: 60,
    });
  });
});
