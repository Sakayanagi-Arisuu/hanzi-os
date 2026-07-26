import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION, LESSONS } from "../data/curriculum";
import type { ContentReleaseState } from "../types";
import {
  parseNormalizedLearningProjection,
  type NormalizedLearningProjectionV1,
} from "./projectionProtocol";

export const AUTHORITATIVE_PROGRESS_SCHEMA_VERSION = 1 as const;
export const CURRENT_AUTHORITATIVE_COURSE_ID = "hanzi-os-core" as const;

const RELEASED_STATES = new Set<ContentReleaseState>(["beta", "published"]);
const CONTENT_STATES = new Set<ContentReleaseState>([
  "draft",
  "review",
  "beta",
  "published",
  "retired",
]);

export type AuthoritativeProgressLessonDefinition = {
  id: string;
  contentVersion: string;
  prerequisiteIds: readonly string[];
  releaseState: ContentReleaseState;
};

/**
 * Immutable content boundary used to interpret a normalized projection. The
 * current wrapper below supplies checked-in runtime content; the generic form
 * exists for versioned package tests and future package readers.
 */
export type AuthoritativeProgressCatalog = {
  courseId: string;
  contentVersion: string;
  manifestSha256: string;
  lessons: readonly AuthoritativeProgressLessonDefinition[];
};

export type AuthoritativeLessonProgressV1 = {
  lessonId: string;
  lessonVersion: string;
  prerequisiteIds: string[];
  releaseState: "beta" | "published";
  passed: boolean;
  unlocked: boolean;
  status: "locked" | "unlocked" | "passed";
};

export type AuthoritativeLessonRecommendationV1 = {
  lessonId: string;
  lessonVersion: string;
  reason: "prerequisites-satisfied";
};

export type AuthoritativeReleasedLessonProgressV1 = {
  schemaVersion: 1;
  resetEpoch: number;
  cursor: number;
  enrollmentId: string;
  courseId: string;
  contentVersion: string;
  manifestSha256: string;
  completedCount: number;
  totalCount: number;
  remainingCount: number;
  progress: number;
  lessons: AuthoritativeLessonProgressV1[];
  nextLesson: AuthoritativeLessonRecommendationV1 | null;
};

export const CURRENT_AUTHORITATIVE_PROGRESS_CATALOG:
Readonly<AuthoritativeProgressCatalog> = {
  courseId: CURRENT_AUTHORITATIVE_COURSE_ID,
  contentVersion: CONTENT_VERSION,
  manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  lessons: LESSONS,
};

const boundedString = (value: unknown, maximum: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= maximum;

const validCatalog = (catalog: AuthoritativeProgressCatalog) => {
  if (
    !boundedString(catalog.courseId, 160)
    || !boundedString(catalog.contentVersion, 160)
    || !/^sha256:[a-f0-9]{64}$/u.test(catalog.manifestSha256)
    || !Array.isArray(catalog.lessons)
  ) return false;

  const lessonIds = new Set<string>();
  for (const lesson of catalog.lessons) {
    if (
      !boundedString(lesson.id, 160)
      || lesson.contentVersion !== catalog.contentVersion
      || !CONTENT_STATES.has(lesson.releaseState)
      || !Array.isArray(lesson.prerequisiteIds)
      || lesson.prerequisiteIds.some((id: unknown) => !boundedString(id, 160))
      || new Set(lesson.prerequisiteIds).size !== lesson.prerequisiteIds.length
      || lessonIds.has(lesson.id)
    ) return false;
    lessonIds.add(lesson.id);
  }
  return true;
};

const exactLessonVersion = (
  lesson: AuthoritativeProgressLessonDefinition,
) => `${lesson.contentVersion}:${lesson.id}:1`;

/**
 * Derives progress only from the normalized submitted-session aggregate. No
 * objective count, local completion, XP, streak, or mastery field participates
 * in this calculation.
 *
 * `null` is the fail-closed result: callers must expose no lesson from this
 * model until the projection, enrollment, package version, course and manifest
 * all bind exactly to the supplied authoritative catalog.
 */
export const deriveAuthoritativeReleasedLessonProgressForCatalog = (
  input: NormalizedLearningProjectionV1 | null | undefined,
  catalog: AuthoritativeProgressCatalog,
): AuthoritativeReleasedLessonProgressV1 | null => {
  if (!validCatalog(catalog)) return null;
  const parsed = parseNormalizedLearningProjection(input);
  if (!parsed.ok) return null;

  const projection = parsed.projection;
  const enrollment = projection.enrollment;
  if (
    !enrollment
    || projection.contentVersion !== catalog.contentVersion
    || projection.manifestSha256 !== catalog.manifestSha256
    || enrollment.contentVersion !== catalog.contentVersion
    || enrollment.manifestSha256 !== catalog.manifestSha256
    || enrollment.courseId !== catalog.courseId
  ) return null;

  const releasedLessons = catalog.lessons.filter((lesson) =>
    RELEASED_STATES.has(lesson.releaseState)
  ) as Array<AuthoritativeProgressLessonDefinition & {
    releaseState: "beta" | "published";
  }>;
  const releasedById = new Map(releasedLessons.map((lesson) => [
    lesson.id,
    lesson,
  ]));
  const passedLessonIds = new Set<string>();

  for (const summary of projection.submittedLessons) {
    const lesson = releasedById.get(summary.lessonId);
    if (
      lesson
      && summary.enrollmentId === enrollment.enrollmentId
      && summary.contentVersion === catalog.contentVersion
      && summary.lessonVersion === exactLessonVersion(lesson)
      && summary.passed === true
    ) {
      // The repository emits one aggregate per lesson version. A set keeps a
      // duplicated cache row from inflating progress even if it is otherwise exact.
      passedLessonIds.add(lesson.id);
    }
  }

  const lessons: AuthoritativeLessonProgressV1[] = releasedLessons.map(
    (lesson) => {
      const passed = passedLessonIds.has(lesson.id);
      const prerequisitesPassed = lesson.prerequisiteIds.every(
        (prerequisiteId) => releasedById.has(prerequisiteId)
          && passedLessonIds.has(prerequisiteId),
      );
      const unlocked = passed || prerequisitesPassed;
      return {
        lessonId: lesson.id,
        lessonVersion: exactLessonVersion(lesson),
        prerequisiteIds: [...lesson.prerequisiteIds],
        releaseState: lesson.releaseState,
        passed,
        unlocked,
        status: passed ? "passed" : unlocked ? "unlocked" : "locked",
      };
    },
  );
  const completedCount = passedLessonIds.size;
  const totalCount = lessons.length;
  const recommendation = lessons.find((lesson) =>
    lesson.unlocked && !lesson.passed
  );

  return {
    schemaVersion: AUTHORITATIVE_PROGRESS_SCHEMA_VERSION,
    resetEpoch: projection.resetEpoch,
    cursor: projection.cursor,
    enrollmentId: enrollment.enrollmentId,
    courseId: enrollment.courseId,
    contentVersion: projection.contentVersion,
    manifestSha256: projection.manifestSha256,
    completedCount,
    totalCount,
    remainingCount: Math.max(0, totalCount - completedCount),
    progress: totalCount === 0
      ? 0
      : Math.round((completedCount / totalCount) * 100),
    lessons,
    nextLesson: recommendation
      ? {
          lessonId: recommendation.lessonId,
          lessonVersion: recommendation.lessonVersion,
          reason: "prerequisites-satisfied",
        }
      : null,
  };
};

export const deriveAuthoritativeReleasedLessonProgress = (
  projection: NormalizedLearningProjectionV1 | null | undefined,
) => deriveAuthoritativeReleasedLessonProgressForCatalog(
  projection,
  CURRENT_AUTHORITATIVE_PROGRESS_CATALOG,
);
