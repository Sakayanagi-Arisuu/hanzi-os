import { CONTENT_VERSION, LESSON_BY_ID } from "../data/curriculum";
import {
  hashLessonSessionForm,
  LESSON_SESSION_FORM_SCHEMA_VERSION,
  type LessonSessionFormActivityV1,
  type LessonSessionFormHash,
  type LessonSessionFormV1,
} from "../learning/lessonSessionProtocol";
import { getAuthoritativeLessonAnswer } from "./authoritativeItemBank";

export class LessonSessionFormValidationError extends Error {
  readonly code = "LESSON_SESSION_FORM_INVALID";
}

export type StoredLessonSessionFormBinding = {
  lessonId: string;
  lessonVersion: string;
  expectedEvidenceCount: number;
  formSchemaVersion: number | null;
  formScript: string | null;
  formManifestJson: string | null;
  formManifestHash: string | null;
};

const ROOT_KEYS = new Set(["schemaVersion", "script", "activities"]);
const ACTIVITY_KEYS = new Set([
  "position",
  "activityId",
  "activityVersion",
  "method",
  "skill",
  "requiredForPass",
]);
const METHODS = new Set([
  "meaning-selection",
  "phonology-recognition",
  "listening-selection",
  "typed-character-recall",
  "reading-comprehension",
]);
const SKILLS = new Set([
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

const exactKeys = (value: Record<string, unknown>, keys: ReadonlySet<string>) =>
  Object.keys(value).length === keys.size
  && Object.keys(value).every((key) => keys.has(key));

const parseManifest = (
  raw: string,
  expectedEvidenceCount: number,
): LessonSessionFormV1 => {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new LessonSessionFormValidationError(
      "Stored lesson form is not valid JSON.",
    );
  }
  if (
    !isRecord(value)
    || !exactKeys(value, ROOT_KEYS)
    || value.schemaVersion !== LESSON_SESSION_FORM_SCHEMA_VERSION
    || (value.script !== "simplified" && value.script !== "traditional")
    || !Array.isArray(value.activities)
    || value.activities.length !== expectedEvidenceCount
  ) {
    throw new LessonSessionFormValidationError(
      "Stored lesson form manifest is invalid.",
    );
  }
  const activities: LessonSessionFormActivityV1[] = value.activities.map(
    (activity, position) => {
      if (
        !isRecord(activity)
        || !exactKeys(activity, ACTIVITY_KEYS)
        || activity.position !== position
        || typeof activity.activityId !== "string"
        || !activity.activityId
        || activity.activityId.length > 240
        || typeof activity.activityVersion !== "string"
        || !activity.activityVersion
        || activity.activityVersion.length > 160
        || typeof activity.method !== "string"
        || !METHODS.has(activity.method)
        || typeof activity.skill !== "string"
        || !SKILLS.has(activity.skill)
        || typeof activity.requiredForPass !== "boolean"
      ) {
        throw new LessonSessionFormValidationError(
          "Stored lesson form activity is invalid or reordered.",
        );
      }
      return activity as LessonSessionFormActivityV1;
    },
  );
  if (new Set(activities.map((activity) => activity.activityId)).size
    !== activities.length) {
    throw new LessonSessionFormValidationError(
      "Stored lesson form contains duplicate activities.",
    );
  }
  return {
    schemaVersion: LESSON_SESSION_FORM_SCHEMA_VERSION,
    script: value.script,
    activities,
  };
};

export const validateStoredLessonSessionForm = async (
  binding: StoredLessonSessionFormBinding,
  requestedHash?: LessonSessionFormHash,
) => {
  const lesson = LESSON_BY_ID.get(binding.lessonId);
  if (
    !lesson
    || (lesson.releaseState !== "beta" && lesson.releaseState !== "published")
    || lesson.contentVersion !== CONTENT_VERSION
    || binding.lessonVersion !== `${lesson.contentVersion}:${lesson.id}:1`
  ) {
    throw new LessonSessionFormValidationError(
      "Session lesson version is not released by the current item bank.",
    );
  }
  if (
    binding.formSchemaVersion !== LESSON_SESSION_FORM_SCHEMA_VERSION
    || (binding.formScript !== "simplified" && binding.formScript !== "traditional")
    || !binding.formManifestJson
    || !binding.formManifestHash
    || !/^sha256:[a-f0-9]{64}$/u.test(binding.formManifestHash)
  ) {
    throw new LessonSessionFormValidationError(
      "Legacy lesson session has no immutable server-issued form manifest.",
    );
  }
  const form = parseManifest(
    binding.formManifestJson,
    binding.expectedEvidenceCount,
  );
  if (
    form.schemaVersion !== binding.formSchemaVersion
    || form.script !== binding.formScript
  ) {
    throw new LessonSessionFormValidationError(
      "Stored lesson form columns do not match its manifest.",
    );
  }
  const formHash = await hashLessonSessionForm(form);
  if (
    formHash !== binding.formManifestHash
    || (requestedHash !== undefined && requestedHash !== formHash)
  ) {
    throw new LessonSessionFormValidationError(
      "Lesson form hash does not match its server-issued manifest.",
    );
  }
  for (const activity of form.activities) {
    const prefix = `${lesson.id}:`;
    const questionId = activity.activityId.startsWith(prefix)
      ? activity.activityId.slice(prefix.length)
      : "";
    const answer = questionId
      ? getAuthoritativeLessonAnswer(lesson.id, questionId)
      : null;
    if (
      !answer
      || answer.activityVersion !== activity.activityVersion
      || answer.method !== activity.method
      || answer.skill !== activity.skill
      || answer.requiredForPass !== activity.requiredForPass
    ) {
      throw new LessonSessionFormValidationError(
        "Stored lesson form is not bound to the exact server item bank.",
      );
    }
  }
  return { lesson, form, formHash };
};
