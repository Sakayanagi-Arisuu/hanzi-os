import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import {
  CONTENT_VERSION,
  LESSON_BY_ID,
  RELEASED_LESSONS,
} from "../data/curriculum";
import {
  buildExerciseCatalog,
  type Exercise,
} from "../lib/exerciseGeneration";
import { canonicalStringify } from "../sync/document";
import type { Lesson, Skill } from "../types";
import {
  CURRENT_AUTHORITATIVE_COURSE_ID,
  type AuthoritativeReleasedLessonProgressV1,
} from "./authoritativeProgress";
import type { ObjectiveAttemptMethod } from "./attemptProtocol";
import {
  hashLessonSessionForm,
  LESSON_SESSION_FORM_SCHEMA_VERSION,
  LESSON_SESSION_PROTOCOL_VERSION,
  type LessonSessionFormActivityV1,
  type LessonSessionFormHash,
  type LessonSessionFormV1,
  type LessonSessionAuthorityBindingV1,
  type OpenLessonSessionReceiptV1,
} from "./lessonSessionProtocol";
import { isValidLearningResetEpoch } from "./resetEpoch";

export const NORMALIZED_LESSON_RUNTIME_SCHEMA_VERSION = 1 as const;
export const MAX_NORMALIZED_LESSON_ACTIVITIES = 10;

export type NormalizedLessonRuntimeFailureCode =
  | "lesson-unavailable"
  | "prerequisite-unavailable"
  | "progress-unavailable"
  | "receipt-invalid"
  | "receipt-binding-mismatch"
  | "authority-binding-invalid"
  | "authority-binding-mismatch"
  | "form-hash-mismatch"
  | "activity-unavailable";

export type NormalizedLessonPresentationActivityV1 = {
  position: number;
  activityId: string;
  exerciseId: string;
  activityVersion: string;
  method: ObjectiveAttemptMethod;
  skill: Skill;
  requiredForPass: boolean;
  kind: Exercise["kind"];
  wordId?: string;
  instruction: string;
  prompt: string;
  promptMeta?: string;
  options: string[];
  spokenText?: string;
};

export type NormalizedLessonRuntimeV1 = {
  schemaVersion: 1;
  contentVersion: string;
  manifestSha256: string;
  resetEpoch: number;
  enrollmentId: string;
  lessonId: string;
  lessonVersion: string;
  script: "simplified" | "traditional";
  /** Stable seed for dependent commands; an adopted session has no local open. */
  commandSeed: string;
  sessionId: string;
  formHash: LessonSessionFormHash;
  startedAt: string;
  activities: NormalizedLessonPresentationActivityV1[];
};

export type MaterializeNormalizedLessonRuntimeInput = {
  lesson: Lesson;
  script: "simplified" | "traditional";
  receipt: unknown;
  authoritativeProgress: AuthoritativeReleasedLessonProgressV1;
  expectedOpenCommandId: string;
};

export type MaterializeNormalizedLessonRuntimeFromAuthorityBindingInput = {
  lesson: Lesson;
  script: "simplified" | "traditional";
  binding: unknown;
  authoritativeProgress: AuthoritativeReleasedLessonProgressV1;
  commandSeed: string;
};

export type MaterializeNormalizedLessonRuntimeResult =
  | { ok: true; runtime: NormalizedLessonRuntimeV1 }
  | {
      ok: false;
      code: NormalizedLessonRuntimeFailureCode;
      reason: string;
    };

const RECEIPT_KEYS = [
  "protocolVersion",
  "idempotencyKey",
  "duplicate",
  "sessionId",
  "enrollmentId",
  "contentVersion",
  "resetEpoch",
  "lessonId",
  "lessonVersion",
  "expectedEvidenceCount",
  "form",
  "formHash",
  "status",
  "startedAt",
] as const;

const AUTHORITY_BINDING_KEYS = [
  "sessionId",
  "enrollmentId",
  "contentVersion",
  "resetEpoch",
  "lessonId",
  "lessonVersion",
  "expectedEvidenceCount",
  "form",
  "formHash",
  "status",
  "startedAt",
] as const;

const FORM_KEYS = ["schemaVersion", "script", "activities"] as const;
const ACTIVITY_KEYS = [
  "position",
  "activityId",
  "activityVersion",
  "method",
  "skill",
  "requiredForPass",
] as const;

const RUNTIME_KEYS = [
  "schemaVersion",
  "contentVersion",
  "manifestSha256",
  "resetEpoch",
  "enrollmentId",
  "lessonId",
  "lessonVersion",
  "script",
  "commandSeed",
  "sessionId",
  "formHash",
  "startedAt",
  "activities",
] as const;

const OBJECTIVE_METHODS = new Set<ObjectiveAttemptMethod>([
  "meaning-selection",
  "phonology-recognition",
  "listening-selection",
  "typed-character-recall",
  "reading-comprehension",
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (
  value: Record<string, unknown>,
  expected: readonly string[],
) => Object.keys(value).length === expected.length
  && expected.every((key) => Object.hasOwn(value, key));

const boundedString = (value: unknown, maximum: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= maximum;

const exactIsoTimestamp = (value: unknown): value is string => {
  if (!boundedString(value, 40)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
};

const arraysEqual = (
  left: readonly string[],
  right: readonly string[],
) => left.length === right.length
  && left.every((value, index) => value === right[index]);

const isReleasedLesson = (lesson: Lesson) =>
  lesson.releaseState === "beta" || lesson.releaseState === "published";

const currentLessonVersion = (lesson: Lesson) =>
  `${lesson.contentVersion}:${lesson.id}:1`;

const exactCurrentReleasedLesson = (lesson: Lesson) => {
  const current = LESSON_BY_ID.get(lesson.id);
  return Boolean(
    current
    && current.contentVersion === CONTENT_VERSION
    && isReleasedLesson(current)
    && canonicalStringify(current) === canonicalStringify(lesson),
  );
};

const exactCurrentReleasedPrerequisites = (lesson: Lesson) => {
  if (
    new Set(lesson.prerequisiteIds).size !== lesson.prerequisiteIds.length
    || lesson.prerequisiteIds.includes(lesson.id)
  ) return false;
  return lesson.prerequisiteIds.every((prerequisiteId) => {
    const prerequisite = LESSON_BY_ID.get(prerequisiteId);
    return prerequisite?.contentVersion === CONTENT_VERSION
      && isReleasedLesson(prerequisite);
  });
};

const validProgressBinding = (
  progress: AuthoritativeReleasedLessonProgressV1,
  lesson: Lesson,
) => {
  if (
    progress.schemaVersion !== 1
    || !isValidLearningResetEpoch(progress.resetEpoch)
    || !Number.isSafeInteger(progress.cursor)
    || progress.cursor < 0
    || !boundedString(progress.enrollmentId, 160)
    || progress.courseId !== CURRENT_AUTHORITATIVE_COURSE_ID
    || progress.contentVersion !== CONTENT_VERSION
    || progress.manifestSha256 !== CURRENT_CONTENT_MANIFEST_SHA256
    || !Array.isArray(progress.lessons)
    || progress.lessons.length !== RELEASED_LESSONS.length
  ) return false;

  const passedIds = new Set(
    progress.lessons.filter((entry) => entry.passed).map((entry) => entry.lessonId),
  );
  for (let index = 0; index < RELEASED_LESSONS.length; index += 1) {
    const expected = RELEASED_LESSONS[index];
    const actual = progress.lessons[index];
    const prerequisitesPassed = expected.prerequisiteIds.every((id) =>
      passedIds.has(id)
    );
    const expectedUnlocked = actual?.passed === true || prerequisitesPassed;
    if (
      !actual
      || actual.lessonId !== expected.id
      || actual.lessonVersion !== currentLessonVersion(expected)
      || !arraysEqual(actual.prerequisiteIds, expected.prerequisiteIds)
      || actual.releaseState !== expected.releaseState
      || typeof actual.passed !== "boolean"
      || typeof actual.unlocked !== "boolean"
      || actual.unlocked !== expectedUnlocked
      || (actual.passed && !prerequisitesPassed)
      || actual.status !== (
        actual.passed ? "passed" : actual.unlocked ? "unlocked" : "locked"
      )
    ) return false;
  }

  const completedCount = passedIds.size;
  const expectedNext = progress.lessons.find((entry) =>
    entry.unlocked && !entry.passed
  ) ?? null;
  if (
    progress.completedCount !== completedCount
    || progress.totalCount !== progress.lessons.length
    || progress.remainingCount !== progress.totalCount - completedCount
    || progress.progress !== (
      progress.totalCount === 0
        ? 0
        : Math.round((completedCount / progress.totalCount) * 100)
    )
    || (
      expectedNext === null
        ? progress.nextLesson !== null
        : progress.nextLesson?.lessonId !== expectedNext.lessonId
          || progress.nextLesson.lessonVersion !== expectedNext.lessonVersion
          || progress.nextLesson.reason !== "prerequisites-satisfied"
    )
  ) return false;

  const lessonProgress = progress.lessons.find((entry) =>
    entry.lessonId === lesson.id
  );
  return Boolean(
    lessonProgress
    && lessonProgress.unlocked
    && (lessonProgress.status === "unlocked" || lessonProgress.status === "passed")
    && lesson.prerequisiteIds.every((id) => passedIds.has(id)),
  );
};

export const isExactNormalizedLessonEligibility = (
  lesson: Lesson,
  progress: AuthoritativeReleasedLessonProgressV1,
) => exactCurrentReleasedLesson(lesson)
  && exactCurrentReleasedPrerequisites(lesson)
  && validProgressBinding(progress, lesson);

const hasStrictAuthorityBindingFields = (
  value: Record<string, unknown>,
) => {
  if (
    !boundedString(value.sessionId, 160)
    || !boundedString(value.enrollmentId, 160)
    || value.contentVersion !== CONTENT_VERSION
    || !isValidLearningResetEpoch(value.resetEpoch)
    || !boundedString(value.lessonId, 160)
    || !boundedString(value.lessonVersion, 160)
    || !Number.isSafeInteger(value.expectedEvidenceCount)
    || Number(value.expectedEvidenceCount) < 1
    || Number(value.expectedEvidenceCount) > MAX_NORMALIZED_LESSON_ACTIVITIES
    || !isRecord(value.form)
    || !hasExactKeys(value.form, FORM_KEYS)
    || value.form.schemaVersion !== LESSON_SESSION_FORM_SCHEMA_VERSION
    || (value.form.script !== "simplified" && value.form.script !== "traditional")
    || !Array.isArray(value.form.activities)
    || value.form.activities.length !== value.expectedEvidenceCount
    || typeof value.formHash !== "string"
    || !/^sha256:[a-f0-9]{64}$/u.test(value.formHash)
    || value.status !== "started"
    || !exactIsoTimestamp(value.startedAt)
  ) return false;

  const activityIds = new Set<string>();
  for (let position = 0; position < value.form.activities.length; position += 1) {
    const activity = value.form.activities[position];
    if (
      !isRecord(activity)
      || !hasExactKeys(activity, ACTIVITY_KEYS)
      || activity.position !== position
      || !boundedString(activity.activityId, 240)
      || !boundedString(activity.activityVersion, 160)
      || !OBJECTIVE_METHODS.has(activity.method as ObjectiveAttemptMethod)
      || !SKILLS.has(activity.skill as Skill)
      || typeof activity.requiredForPass !== "boolean"
      || activityIds.has(activity.activityId)
    ) return false;
    activityIds.add(activity.activityId);
  }
  return true;
};

const parseStrictAuthorityBinding = (
  value: unknown,
): LessonSessionAuthorityBindingV1 | null => {
  if (
    !isRecord(value)
    || !hasExactKeys(value, AUTHORITY_BINDING_KEYS)
    || !hasStrictAuthorityBindingFields(value)
  ) return null;
  return value as LessonSessionAuthorityBindingV1;
};

const parseStrictReceipt = (
  value: unknown,
): OpenLessonSessionReceiptV1 | null => {
  if (
    !isRecord(value)
    || !hasExactKeys(value, RECEIPT_KEYS)
    || value.protocolVersion !== LESSON_SESSION_PROTOCOL_VERSION
    || !boundedString(value.idempotencyKey, 200)
    || typeof value.duplicate !== "boolean"
    || !hasStrictAuthorityBindingFields(value)
  ) return null;
  return value as OpenLessonSessionReceiptV1;
};

const methodForExercise = (exercise: Exercise): ObjectiveAttemptMethod => {
  switch (exercise.kind) {
    case "meaning": return "meaning-selection";
    case "pinyin":
    case "tone":
    case "tone-pair": return "phonology-recognition";
    case "listening": return "listening-selection";
    case "recall": return "typed-character-recall";
    case "sentence": return "reading-comprehension";
  }
};

/**
 * Presentation options must not depend on which activities the server picked
 * or how it ordered them. The frozen form owns selection/order; this seed only
 * makes the complete local display catalog stable for an exact content build.
 */
const deterministicCatalogRandom = (
  lesson: Lesson,
  script: "simplified" | "traditional",
) => {
  let state = 0x811c_9dc5;
  for (const character of `${CONTENT_VERSION}\u0000${lesson.id}\u0000${script}`) {
    state ^= character.codePointAt(0) ?? 0;
    state = Math.imul(state, 0x0100_0193);
  }
  if (state === 0) state = 0x9e37_79b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
};

const exerciseMatchesActivity = (
  exercise: Exercise,
  activity: LessonSessionFormActivityV1,
) => {
  const method = methodForExercise(exercise);
  return Boolean(
    activity.activityVersion === exercise.activityVersion
    && activity.method === method
    && activity.skill === exercise.skill
    && activity.requiredForPass === (exercise.requiredForPass === true),
  );
};

const presentationActivity = (
  formActivity: LessonSessionFormActivityV1,
  exercise: Exercise,
): NormalizedLessonPresentationActivityV1 => ({
  position: formActivity.position,
  activityId: formActivity.activityId,
  exerciseId: exercise.id,
  activityVersion: formActivity.activityVersion,
  method: formActivity.method,
  skill: formActivity.skill,
  requiredForPass: formActivity.requiredForPass,
  kind: exercise.kind,
  ...(exercise.wordId === undefined ? {} : { wordId: exercise.wordId }),
  instruction: exercise.instruction,
  prompt: exercise.prompt,
  ...(exercise.promptMeta === undefined ? {} : { promptMeta: exercise.promptMeta }),
  options: [...exercise.options],
  ...(exercise.spokenText === undefined || exercise.kind === "recall"
    ? {}
    : { spokenText: exercise.spokenText }),
});

const buildStableExerciseCatalog = (
  lesson: Lesson,
  script: "simplified" | "traditional",
) => buildExerciseCatalog(
  lesson,
  script,
  deterministicCatalogRandom(lesson, script),
);

const catalogByExerciseId = (
  lesson: Lesson,
  script: "simplified" | "traditional",
) => {
  const exercises = buildStableExerciseCatalog(lesson, script);
  const byId = new Map<string, Exercise>();
  for (const exercise of exercises) {
    if (byId.has(exercise.id)) return null;
    byId.set(exercise.id, exercise);
  }
  return { exercises, byId };
};

const hasExactServerFormCoverage = (
  catalog: readonly Exercise[],
  activities: readonly { activityId: string }[],
  lessonId: string,
) => {
  if (
    activities.length
      !== Math.min(catalog.length, MAX_NORMALIZED_LESSON_ACTIVITIES)
  ) return false;
  const issuedIds = new Set(activities.map((activity) => activity.activityId));
  return catalog
    .filter((exercise) => exercise.requiredForPass === true)
    .slice(0, MAX_NORMALIZED_LESSON_ACTIVITIES)
    .every((exercise) => issuedIds.has(`${lessonId}:${exercise.id}`));
};

/**
 * Revalidates a persisted runtime against the exact current content package.
 * This prevents a mutated presentation model from becoming command authority.
 */
export async function isExactNormalizedLessonRuntime(
  value: unknown,
): Promise<boolean> {
  if (!isRecord(value) || !hasExactKeys(value, RUNTIME_KEYS)) return false;
  if (
    value.schemaVersion !== NORMALIZED_LESSON_RUNTIME_SCHEMA_VERSION
    || value.contentVersion !== CONTENT_VERSION
    || value.manifestSha256 !== CURRENT_CONTENT_MANIFEST_SHA256
    || !isValidLearningResetEpoch(value.resetEpoch)
    || !boundedString(value.enrollmentId, 160)
    || !boundedString(value.lessonId, 160)
    || !boundedString(value.lessonVersion, 160)
    || (value.script !== "simplified" && value.script !== "traditional")
    || !boundedString(value.commandSeed, 200)
    || !boundedString(value.sessionId, 160)
    || typeof value.formHash !== "string"
    || !/^sha256:[a-f0-9]{64}$/u.test(value.formHash)
    || !exactIsoTimestamp(value.startedAt)
    || !Array.isArray(value.activities)
    || value.activities.length < 1
    || value.activities.length > MAX_NORMALIZED_LESSON_ACTIVITIES
  ) return false;

  const lesson = LESSON_BY_ID.get(value.lessonId);
  if (
    !lesson
    || !exactCurrentReleasedLesson(lesson)
    || value.lessonVersion !== currentLessonVersion(lesson)
  ) return false;

  const catalog = catalogByExerciseId(lesson, value.script);
  if (!catalog) return false;
  const activityPrefix = `${lesson.id}:`;
  const formActivities: LessonSessionFormActivityV1[] = [];
  const seenActivityIds = new Set<string>();
  for (let position = 0; position < value.activities.length; position += 1) {
    const candidate = value.activities[position];
    if (
      !isRecord(candidate)
      || candidate.position !== position
      || !boundedString(candidate.activityId, 240)
      || seenActivityIds.has(candidate.activityId)
      || !candidate.activityId.startsWith(activityPrefix)
    ) return false;
    seenActivityIds.add(candidate.activityId);
    const exercise = catalog.byId.get(
      candidate.activityId.slice(activityPrefix.length),
    );
    if (!exercise) return false;
    const formActivity: LessonSessionFormActivityV1 = {
      position,
      activityId: candidate.activityId,
      activityVersion: candidate.activityVersion as string,
      method: candidate.method as ObjectiveAttemptMethod,
      skill: candidate.skill as Skill,
      requiredForPass: candidate.requiredForPass as boolean,
    };
    const expectedPresentation = presentationActivity(formActivity, exercise);
    if (
      !exerciseMatchesActivity(exercise, formActivity)
      || !hasExactKeys(candidate, Object.keys(expectedPresentation))
      || canonicalStringify(candidate)
        !== canonicalStringify(expectedPresentation)
    ) return false;
    formActivities.push(formActivity);
  }
  if (!hasExactServerFormCoverage(catalog.exercises, formActivities, lesson.id)) {
    return false;
  }

  const form: LessonSessionFormV1 = {
    schemaVersion: LESSON_SESSION_FORM_SCHEMA_VERSION,
    script: value.script,
    activities: formActivities,
  };
  try {
    return await hashLessonSessionForm(form) === value.formHash;
  } catch {
    return false;
  }
}

const failure = (
  code: NormalizedLessonRuntimeFailureCode,
  reason: string,
): MaterializeNormalizedLessonRuntimeResult => ({ ok: false, code, reason });

const materializeAuthorityBinding = async (input: {
  lesson: Lesson;
  script: "simplified" | "traditional";
  binding: LessonSessionAuthorityBindingV1;
  authoritativeProgress: AuthoritativeReleasedLessonProgressV1;
  commandSeed: string;
  mismatchCode: Extract<
    NormalizedLessonRuntimeFailureCode,
    "receipt-binding-mismatch" | "authority-binding-mismatch"
  >;
  invalidCode: Extract<
    NormalizedLessonRuntimeFailureCode,
    "receipt-invalid" | "authority-binding-invalid"
  >;
}): Promise<MaterializeNormalizedLessonRuntimeResult> => {
  if (!exactCurrentReleasedLesson(input.lesson)) {
    return failure("lesson-unavailable", "Lesson is not the exact current released lesson.");
  }
  if (!exactCurrentReleasedPrerequisites(input.lesson)) {
    return failure(
      "prerequisite-unavailable",
      "Lesson prerequisites are not current released content.",
    );
  }
  if (!validProgressBinding(input.authoritativeProgress, input.lesson)) {
    return failure(
      "progress-unavailable",
      "Exact authoritative unlocked progress is required.",
    );
  }
  if (!boundedString(input.commandSeed, 200)) {
    return failure(input.mismatchCode, "Lesson command seed is invalid.");
  }

  const binding = input.binding;
  if (
    binding.enrollmentId !== input.authoritativeProgress.enrollmentId
    || binding.resetEpoch !== input.authoritativeProgress.resetEpoch
    || binding.lessonId !== input.lesson.id
    || binding.lessonVersion !== currentLessonVersion(input.lesson)
    || binding.contentVersion !== CONTENT_VERSION
    || binding.form.script !== input.script
  ) {
    return failure(
      input.mismatchCode,
      "Lesson-session receipt does not match the active learning scope.",
    );
  }

  let computedHash: LessonSessionFormHash;
  try {
    computedHash = await hashLessonSessionForm(binding.form);
  } catch {
    return failure(input.invalidCode, "Lesson form cannot be verified.");
  }
  if (computedHash !== binding.formHash) {
    return failure("form-hash-mismatch", "Lesson form hash does not match its manifest.");
  }

  const catalog = catalogByExerciseId(input.lesson, input.script);
  if (!catalog) {
    return failure("activity-unavailable", "Current activity catalog contains duplicates.");
  }
  if (!hasExactServerFormCoverage(
    catalog.exercises,
    binding.form.activities,
    input.lesson.id,
  )) {
    return failure(
      "activity-unavailable",
      "Lesson form does not contain the complete server evidence selection.",
    );
  }

  const activityPrefix = `${input.lesson.id}:`;
  const activities: NormalizedLessonPresentationActivityV1[] = [];
  for (const formActivity of binding.form.activities) {
    if (!formActivity.activityId.startsWith(activityPrefix)) {
      return failure("activity-unavailable", "Form activity belongs to another lesson.");
    }
    const exerciseId = formActivity.activityId.slice(activityPrefix.length);
    const exercise = catalog.byId.get(exerciseId);
    if (
      !exercise
      || !exerciseMatchesActivity(exercise, formActivity)
    ) {
      return failure(
        "activity-unavailable",
        "Form activity is absent or stale in the current authoritative item bank.",
      );
    }
    activities.push(presentationActivity(formActivity, exercise));
  }

  return {
    ok: true,
    runtime: {
      schemaVersion: NORMALIZED_LESSON_RUNTIME_SCHEMA_VERSION,
      contentVersion: CONTENT_VERSION,
      manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
      resetEpoch: binding.resetEpoch,
      enrollmentId: binding.enrollmentId,
      lessonId: binding.lessonId,
      lessonVersion: binding.lessonVersion,
      script: binding.form.script,
      commandSeed: input.commandSeed,
      sessionId: binding.sessionId,
      formHash: binding.formHash,
      startedAt: binding.startedAt,
      activities,
    },
  };
};

/**
 * Resolves presentation data only from a real server open receipt. The local
 * item catalog can supply display copy, but cannot choose, replace, or reorder
 * an activity and the returned model deliberately omits every answer key.
 */
export async function materializeNormalizedLessonRuntime(
  input: MaterializeNormalizedLessonRuntimeInput,
): Promise<MaterializeNormalizedLessonRuntimeResult> {
  const receipt = parseStrictReceipt(input.receipt);
  if (!receipt) return failure("receipt-invalid", "Lesson-session receipt is invalid.");
  if (receipt.idempotencyKey !== input.expectedOpenCommandId) {
    return failure(
      "receipt-binding-mismatch",
      "Lesson-session receipt does not match its open command.",
    );
  }
  return materializeAuthorityBinding({
    lesson: input.lesson,
    script: input.script,
    binding: receipt,
    authoritativeProgress: input.authoritativeProgress,
    commandSeed: receipt.idempotencyKey,
    mismatchCode: "receipt-binding-mismatch",
    invalidCode: "receipt-invalid",
  });
}

/**
 * Resolves a session adopted from an exact cached projection. The binding is
 * validated directly and never wrapped in synthetic open-delivery metadata.
 */
export async function materializeNormalizedLessonRuntimeFromAuthorityBinding(
  input: MaterializeNormalizedLessonRuntimeFromAuthorityBindingInput,
): Promise<MaterializeNormalizedLessonRuntimeResult> {
  const binding = parseStrictAuthorityBinding(input.binding);
  if (!binding) {
    return failure(
      "authority-binding-invalid",
      "Projected lesson-session authority binding is invalid.",
    );
  }
  return materializeAuthorityBinding({
    lesson: input.lesson,
    script: input.script,
    binding,
    authoritativeProgress: input.authoritativeProgress,
    commandSeed: input.commandSeed,
    mismatchCode: "authority-binding-mismatch",
    invalidCode: "authority-binding-invalid",
  });
}
