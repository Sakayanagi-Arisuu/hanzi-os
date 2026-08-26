import { describe, expect, it } from "vitest";
import { RELEASED_LESSONS, WORD_BY_ID } from "../data/curriculum";
import { buildExerciseCatalog } from "../lib/exerciseGeneration";
import { resolveExerciseSpeechText } from "./exerciseSpeech";

const teacher = [...WORD_BY_ID.values()].find((word) => word.simplified === "老师")!;

describe("exercise speech target", () => {
  it("reads only the glyph represented by a tone-per-syllable prompt", () => {
    const exercise = {
      id: `${teacher.id}-tone-1`,
      activityVersion: "fixture:1",
      wordId: teacher.id,
      kind: "tone" as const,
      skill: "pronunciation" as const,
      instruction: "Nhận diện thanh",
      prompt: "shī",
      options: [],
      correct: "Thanh 1",
      explanation: "fixture",
      spokenText: teacher.simplified,
    };
    expect(resolveExerciseSpeechText(exercise, teacher, "simplified")).toBe("师");
    expect(resolveExerciseSpeechText({ ...exercise, id: `${teacher.id}-tone-0` }, teacher, "simplified")).toBe("老");
  });

  it("keeps the original utterance for whole-word activities", () => {
    const exercise = {
      id: `${teacher.id}-meaning`,
      activityVersion: "fixture:1",
      wordId: teacher.id,
      kind: "meaning" as const,
      skill: "vocabulary" as const,
      instruction: "Chọn nghĩa",
      prompt: teacher.simplified,
      options: [],
      correct: teacher.meaning,
      explanation: "fixture",
      spokenText: teacher.simplified,
    };
    expect(resolveExerciseSpeechText(exercise, teacher, "simplified")).toBe("老师");
  });

  it("audits every released tone item so one-syllable prompts play one glyph", () => {
    for (const script of ["simplified", "traditional"] as const) {
      for (const lesson of RELEASED_LESSONS) {
        for (const exercise of buildExerciseCatalog(lesson, script, () => 0.5)) {
          if (exercise.kind !== "tone" || !exercise.wordId) continue;
          const word = WORD_BY_ID.get(exercise.wordId)!;
          const characters = [...(script === "traditional" ? word.traditional : word.simplified)];
          if (characters.length !== word.syllables.length) continue;
          expect(resolveExerciseSpeechText(exercise, word, script)).toHaveLength(1);
        }
      }
    }
  });
});
