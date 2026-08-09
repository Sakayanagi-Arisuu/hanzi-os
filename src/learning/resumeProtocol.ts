import { answersMatch, buildExercises, type Exercise } from "../lib/exerciseGeneration";
import type { ExerciseKind, Lesson, Skill } from "../types";

export type LessonResumePhase = "briefing" | "exercise";

export type LessonResumeAnswer = {
  exerciseId: string;
  selectedAnswer: string;
  usedHint?: boolean;
};

export type LessonResumeV5 = {
  version: 5;
  contentVersion: string;
  sessionId: string;
  lessonId: string;
  script: "simplified" | "traditional";
  phase: LessonResumePhase;
  exercises: Exercise[];
  index: number;
  selected: string | null;
  selectedUsedHint?: boolean;
  checked: boolean;
  answers: LessonResumeAnswer[];
  finished: boolean;
  earnedXp: number;
};

const LESSON_RESUME_KEYS = [
  "version",
  "contentVersion",
  "sessionId",
  "lessonId",
  "script",
  "phase",
  "exercises",
  "index",
  "selected",
  "checked",
  "answers",
  "finished",
  "earnedXp",
] as const;

const LESSON_RESUME_OPTIONAL_KEYS = ["selectedUsedHint"] as const;
const LESSON_RESUME_ANSWER_KEYS = ["exerciseId", "selectedAnswer"] as const;
const LESSON_RESUME_ANSWER_OPTIONAL_KEYS = ["usedHint"] as const;

const EXERCISE_REQUIRED_KEYS = [
  "id",
  "activityVersion",
  "kind",
  "skill",
  "instruction",
  "prompt",
  "options",
  "correct",
  "explanation",
] as const;

const EXERCISE_OPTIONAL_KEYS = [
  "wordId",
  "promptMeta",
  "spokenText",
  "requiredForPass",
] as const;

const EXERCISE_KINDS = new Set<ExerciseKind>([
  "meaning",
  "pinyin",
  "tone",
  "tone-pair",
  "listening",
  "sentence",
  "recall",
]);

const SKILLS = new Set<Skill>([
  "pronunciation",
  "listening",
  "speaking",
  "reading",
  "writing",
  "vocabulary",
  "grammar",
]);

const TONE_SANDHI_EXERCISE_IDS = new Set([
  "sandhi-ni3-hao3",
  "sandhi-bu4-shi4",
  "sandhi-yi1-ben3",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasExactKeys = (
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
) => {
  const allowed = new Set([...required, ...optional]);
  const keys = Object.keys(value);
  return required.every((key) => Object.hasOwn(value, key))
    && keys.every((key) => allowed.has(key));
};

const isBoundedString = (
  value: unknown,
  maximumLength: number,
  allowEmpty = false,
): value is string => typeof value === "string"
  && value.length <= maximumLength
  && (allowEmpty || value.length > 0);

const isSafeCount = (value: unknown, maximum: number): value is number =>
  Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= maximum;

const isNullableBoundedString = (
  value: unknown,
  maximumLength: number,
): value is string | null => value === null
  || isBoundedString(value, maximumLength);

const stableHash = (value: string) => {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
};

const seededRandom = (seed: string) => {
  let state = stableHash(seed);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
};

export const buildLessonResumeExercises = (
  lesson: Lesson,
  script: "simplified" | "traditional",
  sessionId: string,
) => buildExercises(
  lesson,
  script,
  seededRandom(`lesson-resume:v5:${lesson.contentVersion}:${lesson.id}:${script}:${sessionId}`),
);

export const summarizeLessonResumeAnswers = (
  exercises: readonly Exercise[],
  answers: readonly LessonResumeAnswer[],
) => answers.reduce((summary, answer, index) => {
  const exercise = exercises[index];
  if (
    !exercise
    || !answersMatch(answer.selectedAnswer, exercise.correct)
  ) {
    return summary;
  }
  const gateEligible = answer.usedHint !== true;
  return {
    correctCount: summary.correctCount + 1,
    requiredCorrectCount: summary.requiredCorrectCount
      + (gateEligible && exercise.requiredForPass ? 1 : 0),
    gateCorrectCount: summary.gateCorrectCount + (gateEligible ? 1 : 0),
  };
}, { correctCount: 0, requiredCorrectCount: 0, gateCorrectCount: 0 });

const expectedActivityVersion = (lesson: Lesson, exercise: Exercise) =>
  exercise.kind === "tone-pair"
    ? `${lesson.contentVersion}:tone-sandhi:1`
    : `${lesson.contentVersion}:${lesson.id}:1`;

const isExpectedRequiredExercise = (lesson: Lesson, exercise: Exercise) =>
  (lesson.id === "boot-1" && exercise.kind === "tone")
  || (
    lesson.id === "boot-4"
    && exercise.kind === "tone-pair"
    && TONE_SANDHI_EXERCISE_IDS.has(exercise.id)
  );

const parseExercise = (
  value: unknown,
  lesson: Lesson,
): Exercise | null => {
  if (
    !isRecord(value)
    || !hasExactKeys(value, EXERCISE_REQUIRED_KEYS, EXERCISE_OPTIONAL_KEYS)
    || !isBoundedString(value.id, 160)
    || !isBoundedString(value.activityVersion, 200)
    || !EXERCISE_KINDS.has(value.kind as ExerciseKind)
    || !SKILLS.has(value.skill as Skill)
    || !isBoundedString(value.instruction, 1_000)
    || !isBoundedString(value.prompt, 2_000, true)
    || !Array.isArray(value.options)
    || value.options.length > 12
    || !value.options.every((option) => isBoundedString(option, 1_000))
    || new Set(value.options).size !== value.options.length
    || !isBoundedString(value.correct, 1_000)
    || !isBoundedString(value.explanation, 4_000)
    || (value.wordId !== undefined && !isBoundedString(value.wordId, 160))
    || (value.promptMeta !== undefined && !isBoundedString(value.promptMeta, 2_000, true))
    || (value.spokenText !== undefined && !isBoundedString(value.spokenText, 2_000))
    || (value.requiredForPass !== undefined && typeof value.requiredForPass !== "boolean")
  ) return null;

  const exercise = value as Exercise;
  if (exercise.activityVersion !== expectedActivityVersion(lesson, exercise)) {
    return null;
  }
  if (exercise.kind === "tone-pair") {
    if (
      lesson.id !== "boot-4"
      || exercise.wordId !== undefined
      || !TONE_SANDHI_EXERCISE_IDS.has(exercise.id)
    ) return null;
  } else if (!exercise.wordId || !lesson.wordIds.includes(exercise.wordId)) {
    return null;
  }
  if (exercise.kind === "recall") {
    if (exercise.options.length !== 0) return null;
  } else if (!exercise.options.includes(exercise.correct)) {
    return null;
  }
  if (Boolean(exercise.requiredForPass) !== isExpectedRequiredExercise(lesson, exercise)) {
    return null;
  }
  return exercise;
};

const exerciseMatchesAuthoritativeItem = (
  exercise: Exercise,
  authoritative: Exercise,
) => exercise.id === authoritative.id
  && exercise.activityVersion === authoritative.activityVersion
  && exercise.wordId === authoritative.wordId
  && exercise.kind === authoritative.kind
  && exercise.skill === authoritative.skill
  && exercise.instruction === authoritative.instruction
  && exercise.prompt === authoritative.prompt
  && exercise.promptMeta === authoritative.promptMeta
  && exercise.options.length === authoritative.options.length
  && exercise.options.every((option, index) => option === authoritative.options[index])
  && exercise.correct === authoritative.correct
  && exercise.explanation === authoritative.explanation
  && exercise.spokenText === authoritative.spokenText
  && exercise.requiredForPass === authoritative.requiredForPass;

export const parseLessonResume = (
  value: unknown,
  lesson: Lesson,
  script: "simplified" | "traditional",
): LessonResumeV5 | null => {
  if (
    !isRecord(value)
    || !hasExactKeys(value, LESSON_RESUME_KEYS, LESSON_RESUME_OPTIONAL_KEYS)
    || value.version !== 5
    || value.contentVersion !== lesson.contentVersion
    || value.lessonId !== lesson.id
    || value.script !== script
    || (value.phase !== "briefing" && value.phase !== "exercise")
    || !isBoundedString(value.sessionId, 240)
    || !Array.isArray(value.exercises)
    || value.exercises.length < 1
    || value.exercises.length > 20
    || !isSafeCount(value.index, value.exercises.length - 1)
    || !isNullableBoundedString(value.selected, 1_000)
    || (value.selectedUsedHint !== undefined && typeof value.selectedUsedHint !== "boolean")
    || typeof value.checked !== "boolean"
    || !Array.isArray(value.answers)
    || value.answers.length > value.exercises.length
    || typeof value.finished !== "boolean"
    || !isSafeCount(value.earnedXp, 1_000_000)
  ) return null;

  const exercises = value.exercises.map((exercise) =>
    parseExercise(exercise, lesson)
  );
  if (exercises.some((exercise) => exercise === null)) return null;
  const resolvedExercises = exercises as Exercise[];
  if (new Set(resolvedExercises.map((exercise) => exercise.id)).size !== resolvedExercises.length) {
    return null;
  }
  const authoritativeExercises = buildLessonResumeExercises(
    lesson,
    script,
    String(value.sessionId),
  );
  if (
    resolvedExercises.length !== authoritativeExercises.length
    || resolvedExercises.some((exercise, index) =>
      !exerciseMatchesAuthoritativeItem(exercise, authoritativeExercises[index])
    )
  ) return null;
  const answeredCount = Number(value.index) + (value.checked ? 1 : 0);
  if (value.answers.length !== answeredCount) return null;
  const answers: LessonResumeAnswer[] = [];
  for (let answerIndex = 0; answerIndex < value.answers.length; answerIndex += 1) {
    const answer = value.answers[answerIndex];
    const exercise = resolvedExercises[answerIndex];
    if (
      !isRecord(answer)
      || !hasExactKeys(
        answer,
        LESSON_RESUME_ANSWER_KEYS,
        LESSON_RESUME_ANSWER_OPTIONAL_KEYS,
      )
      || answer.exerciseId !== exercise.id
      || !isBoundedString(answer.selectedAnswer, 1_000)
      || (answer.usedHint !== undefined && typeof answer.usedHint !== "boolean")
      || (
        exercise.kind !== "recall"
        && !exercise.options.includes(answer.selectedAnswer)
      )
    ) return null;
    answers.push({
      exerciseId: String(answer.exerciseId),
      selectedAnswer: String(answer.selectedAnswer),
      usedHint: answer.usedHint === true,
    });
  }

  const selected = value.selected as string | null;
  const selectedUsedHint = value.selectedUsedHint === true;
  const current = resolvedExercises[Number(value.index)];
  if (
    (value.checked && !selected?.trim())
    || (
      selected !== null
      && current.kind !== "recall"
      && !current.options.includes(selected)
    )
    || (
      value.checked
      && answers.at(-1)?.selectedAnswer !== selected
    )
  ) return null;

  if (
    (value.phase === "briefing" && (
      Number(value.index) !== 0
      || selected !== null
      || selectedUsedHint
      || value.checked
      || answers.length !== 0
      || value.finished
      || Number(value.earnedXp) !== 0
    ))
    || (value.finished && (
      value.phase !== "exercise"
      || Number(value.index) !== resolvedExercises.length - 1
      || !value.checked
      || Number(value.earnedXp) < 1
      || Number(value.earnedXp) > lesson.xp
    ))
    || (!value.finished && Number(value.earnedXp) !== 0)
  ) return null;

  return {
    ...(value as Omit<LessonResumeV5, "exercises" | "answers">),
    selected,
    selectedUsedHint,
    exercises: resolvedExercises,
    answers,
  };
};
