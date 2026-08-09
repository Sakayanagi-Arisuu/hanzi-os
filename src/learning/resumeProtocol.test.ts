import { describe, expect, it } from "vitest";
import {
  ASSESSMENT_FORM_VERSION,
  ASSESSMENT_QUESTIONS,
  FOUNDATION_SCREENING_BLUEPRINT,
} from "../data/assessment";
import { CONTENT_VERSION, LESSON_BY_ID } from "../data/curriculum";
import { selectAssessmentForm } from "../lib/assessment/formSelector";
import {
  parseAssessmentResume,
  type AssessmentResumeV4,
} from "./assessmentResumeProtocol";
import {
  buildLessonResumeExercises,
  parseLessonResume,
  summarizeLessonResumeAnswers,
  type LessonResumeV5,
} from "./resumeProtocol";

const lesson = LESSON_BY_ID.get("boot-1")!;

const lessonResume = (): LessonResumeV5 => {
  const sessionId = "lesson-session:test-resume";
  return {
    version: 5,
    contentVersion: lesson.contentVersion,
    sessionId,
    lessonId: lesson.id,
    script: "simplified",
    phase: "exercise",
    exercises: buildLessonResumeExercises(lesson, "simplified", sessionId),
    index: 0,
    selected: null,
    selectedUsedHint: false,
    checked: false,
    answers: [],
    finished: false,
    earnedXp: 0,
  };
};

const selectedAssessmentItems = () => {
  const selection = selectAssessmentForm({
    items: ASSESSMENT_QUESTIONS,
    blueprint: FOUNDATION_SCREENING_BLUEPRINT,
    seed: "diagnostic-session:test-resume",
  });
  if (selection.kind !== "selected") {
    throw new Error("Test assessment bank cannot satisfy its blueprint.");
  }
  return selection.items;
};

const assessmentResume = (): AssessmentResumeV4 => ({
  version: 4,
  contentVersion: CONTENT_VERSION,
  formVersion: ASSESSMENT_FORM_VERSION,
  blueprintId: FOUNDATION_SCREENING_BLUEPRINT.id,
  sessionId: "diagnostic-session:test-resume",
  items: selectedAssessmentItems().map((item) => ({
    id: item.id,
    itemVersion: item.itemVersion,
  })),
  index: 0,
  selected: null,
  checked: false,
});

const parseAssessment = (value: unknown) => parseAssessmentResume({
  value,
  contentVersion: CONTENT_VERSION,
  formVersion: ASSESSMENT_FORM_VERSION,
  blueprintId: FOUNDATION_SCREENING_BLUEPRINT.id,
  itemCount: FOUNDATION_SCREENING_BLUEPRINT.itemCount,
  bank: ASSESSMENT_QUESTIONS,
});

describe("lesson resume codec", () => {
  it("restores the deterministic current-content exercise form", () => {
    const snapshot = lessonResume();
    expect(parseLessonResume(snapshot, lesson, "simplified")).toEqual(snapshot);
  });

  it("rejects a stored answer key even when it is another displayed option", () => {
    const snapshot = lessonResume();
    const exerciseIndex = snapshot.exercises.findIndex((exercise) =>
      exercise.options.some((option) => option !== exercise.correct)
    );
    const exercise = snapshot.exercises[exerciseIndex];
    const tamperedCorrect = exercise.options.find((option) =>
      option !== exercise.correct
    )!;
    snapshot.exercises[exerciseIndex] = {
      ...exercise,
      correct: tamperedCorrect,
    };

    expect(parseLessonResume(snapshot, lesson, "simplified")).toBeNull();
  });

  it("rejects unverified aggregate counters and an incomplete answer ledger", () => {
    const snapshot = lessonResume();
    snapshot.index = 2;
    snapshot.answers = snapshot.exercises.slice(0, 2).map((exercise) => ({
      exerciseId: exercise.id,
      selectedAnswer: exercise.correct,
    }));

    expect(parseLessonResume(snapshot, lesson, "simplified")).not.toBeNull();
    expect(parseLessonResume({
      ...snapshot,
      correctCount: 2,
    }, lesson, "simplified")).toBeNull();

    snapshot.answers.pop();
    expect(parseLessonResume(snapshot, lesson, "simplified")).toBeNull();
  });

  it("rejects a fabricated completion before the final checked item", () => {
    const snapshot = lessonResume();
    snapshot.finished = true;
    snapshot.earnedXp = lesson.xp;

    expect(parseLessonResume(snapshot, lesson, "simplified")).toBeNull();
  });

  it("rejects an exercise set generated for a different session seed", () => {
    const snapshot = lessonResume();
    snapshot.exercises = buildLessonResumeExercises(
      lesson,
      "simplified",
      "lesson-session:another-seed",
    );

    expect(parseLessonResume(snapshot, lesson, "simplified")).toBeNull();
  });

  it("recomputes a failed final score from the bounded answer ledger", () => {
    const snapshot = lessonResume();
    snapshot.index = snapshot.exercises.length - 1;
    snapshot.answers = snapshot.exercises.map((exercise) => ({
      exerciseId: exercise.id,
      selectedAnswer: exercise.kind === "recall"
        ? "完全错误"
        : exercise.options.find((option) => option !== exercise.correct)!,
    }));
    snapshot.selected = snapshot.answers.at(-1)!.selectedAnswer;
    snapshot.checked = true;
    snapshot.finished = true;
    snapshot.earnedXp = 1;

    const restored = parseLessonResume(snapshot, lesson, "simplified");
    expect(restored).not.toBeNull();
    expect(summarizeLessonResumeAnswers(
      restored!.exercises,
      restored!.answers,
    )).toEqual({
      correctCount: 0,
      requiredCorrectCount: 0,
      gateCorrectCount: 0,
    });
  });

  it("keeps assisted recall correct in raw score but outside the gate score", () => {
    const snapshot = lessonResume();
    const exercise = snapshot.exercises[0];
    snapshot.index = 1;
    snapshot.answers = [{
      exerciseId: exercise.id,
      selectedAnswer: exercise.correct,
      usedHint: true,
    }];

    const restored = parseLessonResume(snapshot, lesson, "simplified");
    expect(restored).not.toBeNull();
    expect(summarizeLessonResumeAnswers(
      restored!.exercises,
      restored!.answers,
    )).toEqual({
      correctCount: 1,
      requiredCorrectCount: 0,
      gateCorrectCount: 0,
    });
  });

  it("accepts a pre-helper version 5 snapshot without selectedUsedHint", () => {
    const snapshot = lessonResume();
    delete snapshot.selectedUsedHint;

    expect(parseLessonResume(snapshot, lesson, "simplified")?.selectedUsedHint)
      .toBe(false);
  });
});

describe("assessment resume codec", () => {
  it("binds and resolves the exact selected item order", () => {
    const snapshot = assessmentResume();
    const restored = parseAssessment(snapshot);

    expect(restored?.session).toEqual(snapshot);
    expect(restored?.items.map((item) => item.id)).toEqual(
      snapshot.items.map((item) => item.id),
    );
  });

  it("rejects duplicate item bindings instead of silently swapping a form", () => {
    const snapshot = assessmentResume();
    snapshot.items[1] = { ...snapshot.items[0] };

    expect(parseAssessment(snapshot)).toBeNull();
  });

  it("rejects a binding when the current bank item version changed", () => {
    const snapshot = assessmentResume();
    snapshot.items[0] = {
      ...snapshot.items[0],
      itemVersion: `${snapshot.items[0].itemVersion}:tampered`,
    };

    expect(parseAssessment(snapshot)).toBeNull();
  });

  it("rejects unknown snapshot fields and invalid current-item selections", () => {
    const snapshot = assessmentResume();
    snapshot.selected = "not-an-option";

    expect(parseAssessment({ ...snapshot, ownerKey: "account:wrong" })).toBeNull();
    expect(parseAssessment(snapshot)).toBeNull();
  });
});
