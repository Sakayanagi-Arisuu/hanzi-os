import { describe, expect, it } from "vitest";
import { LESSON_BY_ID, RELEASED_LESSONS } from "../data/curriculum";
import type { Lesson } from "../types";
import {
  answersMatch,
  buildExerciseCatalog,
  buildExercises,
  shuffleWith,
  toneLabels,
} from "./exerciseGeneration";

const seededRandom = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value = (value * 1_664_525 + 1_013_904_223) >>> 0;
    return value / 2 ** 32;
  };
};

describe("exercise generation", () => {
  it("is deterministic with an injected random source", () => {
    const lesson = LESSON_BY_ID.get("boot-2")!;
    expect(buildExercises(lesson, "simplified", seededRandom(42))).toEqual(
      buildExercises(lesson, "simplified", seededRandom(42)),
    );
  });

  it("does not mutate candidate arrays when shuffling", () => {
    const source = [1, 2, 3, 4];
    const shuffled = shuffleWith(source, seededRandom(7));
    expect(source).toEqual([1, 2, 3, 4]);
    expect(shuffled).toHaveLength(source.length);
    expect([...shuffled].sort()).toEqual(source);
  });

  it("always covers all four lexical tones in the tone bootcamp", () => {
    const lesson = LESSON_BY_ID.get("boot-1")!;
    const exercises = buildExercises(lesson, "simplified", seededRandom(1));
    const tones = exercises.filter((exercise) => exercise.kind === "tone");

    expect(tones).toHaveLength(4);
    expect(new Set(tones.map((exercise) => exercise.correct))).toEqual(
      new Set([toneLabels[1], toneLabels[2], toneLabels[3], toneLabels[4]]),
    );
    expect(tones.every((exercise) => exercise.requiredForPass)).toBe(true);
  });

  it("does not test untaught writing, sentence reading, or standalone meaning in boot-1", () => {
    const lesson = LESSON_BY_ID.get("boot-1")!;
    const exercises = buildExercises(lesson, "simplified", seededRandom(31));

    expect(exercises).toHaveLength(10);
    expect(new Set(exercises.map((exercise) => exercise.kind))).toEqual(
      new Set(["pinyin", "tone", "listening"]),
    );
    expect(exercises.filter((exercise) => exercise.kind === "tone")).toHaveLength(4);
    expect(exercises.filter((exercise) => exercise.kind === "pinyin")).toHaveLength(4);
    expect(exercises.filter((exercise) => exercise.kind === "listening")).toHaveLength(2);
    expect(exercises.every((exercise) =>
      exercise.wordId && lesson.wordIds.includes(exercise.wordId)
    )).toBe(true);
  });

  it("keeps legacy boot-1 activities resolvable for sessions already in progress", () => {
    const lesson = LESSON_BY_ID.get("boot-1")!;
    const catalog = buildExerciseCatalog(lesson, "simplified", seededRandom(31));

    expect(catalog.some((exercise) => exercise.id === "yi-recall")).toBe(true);
    expect(catalog.some((exercise) => exercise.id === "ren-sentence")).toBe(true);
    expect(catalog.some((exercise) => exercise.id === "ni-meaning")).toBe(true);
  });

  it("keeps the technical sandhi golden fixtures in every tone-pair session", () => {
    const lesson = LESSON_BY_ID.get("boot-4")!;
    const exercises = buildExercises(lesson, "simplified", seededRandom(9));
    const pairs = exercises.filter((exercise) => exercise.kind === "tone-pair");

    expect(pairs.map((exercise) => [exercise.id, exercise.correct])).toEqual(expect.arrayContaining([
      ["sandhi-ni3-hao3", "2 + 3"],
      ["sandhi-bu4-shi4", "2 + 4"],
      ["sandhi-yi1-ben3", "4 + 3"],
    ]));
    expect(pairs.every((exercise) => exercise.explanation.includes("Dạng từ điển vẫn giữ"))).toBe(true);
    expect(pairs.every((exercise) => exercise.requiredForPass)).toBe(true);
  });

  it("grades every syllable of a multisyllable word independently", () => {
    const base = LESSON_BY_ID.get("boot-4")!;
    const fixture: Lesson = {
      ...base,
      id: "fixture-xuesheng",
      wordIds: ["xuesheng"],
      prerequisiteIds: [],
    };
    const exercises = buildExercises(fixture, "simplified", seededRandom(3));
    const tones = exercises.filter((exercise) => exercise.kind === "tone");

    expect(tones.map((exercise) => [exercise.id, exercise.correct]).sort()).toEqual([
      ["xuesheng-tone-0", toneLabels[2]],
      ["xuesheng-tone-1", toneLabels[0]],
    ].sort());
    expect(tones.every((exercise) => exercise.promptMeta?.includes("âm tiết"))).toBe(true);
    expect(exercises.some((exercise) => exercise.id === "xuesheng-tone")).toBe(false);
  });

  it("versions every generated activity", () => {
    const lesson = LESSON_BY_ID.get("boot-2")!;
    const exercises = buildExercises(lesson, "traditional", seededRandom(11));
    expect(exercises).toHaveLength(10);
    expect(exercises.every((exercise) => exercise.activityVersion.length > 0)).toBe(true);
  });

  it("balances every supported activity skill into a grammar lesson session", () => {
    const lesson = LESSON_BY_ID.get("daily-1")!;
    const exercises = buildExercises(lesson, "simplified", seededRandom(17));

    expect(new Set(exercises.map((exercise) => exercise.skill))).toEqual(new Set([
      "vocabulary",
      "pronunciation",
      "listening",
      "writing",
      "grammar",
    ]));
  });

  it("balances reading into a lesson session when grammar is not presented", () => {
    const lesson = LESSON_BY_ID.get("boot-2")!;
    const exercises = buildExercises(lesson, "simplified", seededRandom(23));

    expect(new Set(exercises.map((exercise) => exercise.skill))).toEqual(new Set([
      "vocabulary",
      "pronunciation",
      "listening",
      "writing",
      "reading",
    ]));
  });

  it("keeps every released lesson compatible with the ten-evidence completion contract", () => {
    expect(RELEASED_LESSONS).toHaveLength(217);
    for (const [index, lesson] of RELEASED_LESSONS.entries()) {
      const exercises = buildExercises(lesson, "simplified", seededRandom(index + 1));
      expect(exercises, lesson.id).toHaveLength(10);
      expect(new Set(exercises.map((exercise) => exercise.id)).size, lesson.id).toBe(10);
    }
  }, 60_000);

  it("normalizes learner answers without weakening the expected answer", () => {
    expect(answersMatch("  NǏ, HǍO! ", "nǐhǎo")).toBe(true);
    expect(answersMatch("ni hao", "nǐ hǎo")).toBe(false);
    expect(answersMatch(null, "nǐ hǎo")).toBe(false);
  });
});
