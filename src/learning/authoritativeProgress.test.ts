import { describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import {
  CONTENT_VERSION,
  RELEASED_LESSONS,
} from "../data/curriculum";
import type { Lesson } from "../types";
import {
  CURRENT_AUTHORITATIVE_COURSE_ID,
  deriveAuthoritativeReleasedLessonProgress,
  deriveAuthoritativeReleasedLessonProgressForCatalog,
  type AuthoritativeProgressCatalog,
} from "./authoritativeProgress";
import {
  emptyObjectiveEvidenceProjection,
  type NormalizedLearningProjectionV1,
  type SubmittedLessonProjectionV1,
} from "./projectionProtocol";

const enrollmentId = "authoritative-enrollment";
const firstLesson = RELEASED_LESSONS[0];
const secondLesson = RELEASED_LESSONS[1];

const projection = (): NormalizedLearningProjectionV1 => ({
  protocolVersion: 1,
  resetEpoch: 4,
  cursor: 73,
  contentVersion: CONTENT_VERSION,
  manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  enrollment: {
    enrollmentId,
    contentVersion: CONTENT_VERSION,
    courseId: CURRENT_AUTHORITATIVE_COURSE_ID,
    manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
    releaseState: "beta",
    goal: "conversation",
  },
  activeLessonSessions: [],
  submittedLessons: [],
  objectiveEvidence: emptyObjectiveEvidenceProjection(),
});

const submitted = (
  lesson: Pick<Lesson, "id" | "contentVersion">,
  overrides: Partial<SubmittedLessonProjectionV1> = {},
): SubmittedLessonProjectionV1 => ({
  enrollmentId,
  contentVersion: lesson.contentVersion,
  lessonId: lesson.id,
  lessonVersion: `${lesson.contentVersion}:${lesson.id}:1`,
  submittedSessionCount: 1,
  passedSessionCount: 1,
  passed: true,
  bestRawScore: 100,
  bestGateScore: 100,
  lastSubmittedAt: "2026-07-22T10:00:00.000Z",
  ...overrides,
});

describe("authoritative released-lesson progress", () => {
  it("makes only the first released root accessible for an exact enrollment", () => {
    const result = deriveAuthoritativeReleasedLessonProgress(projection());

    expect(firstLesson.prerequisiteIds).toEqual([]);
    expect(result).toMatchObject({
      schemaVersion: 1,
      resetEpoch: 4,
      cursor: 73,
      enrollmentId,
      contentVersion: CONTENT_VERSION,
      manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
      completedCount: 0,
      totalCount: RELEASED_LESSONS.length,
      remainingCount: RELEASED_LESSONS.length,
      progress: 0,
      nextLesson: {
        lessonId: firstLesson.id,
        lessonVersion: `${CONTENT_VERSION}:${firstLesson.id}:1`,
        reason: "prerequisites-satisfied",
      },
    });
    expect(result?.lessons[0]).toMatchObject({
      lessonId: firstLesson.id,
      passed: false,
      unlocked: true,
      status: "unlocked",
    });
    expect(result?.lessons[1]).toMatchObject({
      lessonId: secondLesson.id,
      passed: false,
      unlocked: false,
      status: "locked",
    });
  });

  it("fails closed without an exact current enrollment and package binding", () => {
    expect(deriveAuthoritativeReleasedLessonProgress(null)).toBeNull();

    const noEnrollment = projection();
    noEnrollment.enrollment = null;
    expect(deriveAuthoritativeReleasedLessonProgress(noEnrollment)).toBeNull();

    const staleVersion = projection();
    staleVersion.contentVersion = "foundation-retired";
    staleVersion.enrollment!.contentVersion = "foundation-retired";
    expect(deriveAuthoritativeReleasedLessonProgress(staleVersion)).toBeNull();

    const wrongManifest = projection();
    wrongManifest.manifestSha256 = `sha256:${"f".repeat(64)}`;
    wrongManifest.enrollment!.manifestSha256 = wrongManifest.manifestSha256;
    expect(deriveAuthoritativeReleasedLessonProgress(wrongManifest)).toBeNull();

    const wrongCourse = projection();
    wrongCourse.enrollment!.courseId = "forged-course";
    expect(deriveAuthoritativeReleasedLessonProgress(wrongCourse)).toBeNull();

    const mismatchedEnrollment = projection();
    mismatchedEnrollment.enrollment!.manifestSha256 = `sha256:${"e".repeat(64)}`;
    expect(deriveAuthoritativeReleasedLessonProgress(mismatchedEnrollment))
      .toBeNull();
  });

  it("counts only an exact passed submitted-lesson summary and unlocks its dependent", () => {
    const input = projection();
    input.submittedLessons = [submitted(firstLesson)];

    const result = deriveAuthoritativeReleasedLessonProgress(input);

    expect(result).toMatchObject({
      completedCount: 1,
      remainingCount: RELEASED_LESSONS.length - 1,
      progress: Math.round(100 / RELEASED_LESSONS.length),
      nextLesson: {
        lessonId: secondLesson.id,
        lessonVersion: `${CONTENT_VERSION}:${secondLesson.id}:1`,
      },
    });
    expect(result?.lessons.slice(0, 2)).toMatchObject([
      { lessonId: firstLesson.id, passed: true, unlocked: true, status: "passed" },
      { lessonId: secondLesson.id, passed: false, unlocked: true, status: "unlocked" },
    ]);
  });

  it("ignores failed, stale-version, and unknown forged lesson summaries", () => {
    const failed = projection();
    failed.submittedLessons = [submitted(firstLesson, {
      passedSessionCount: 0,
      passed: false,
      bestGateScore: 100,
    })];
    expect(deriveAuthoritativeReleasedLessonProgress(failed)?.completedCount)
      .toBe(0);

    const staleLesson = projection();
    staleLesson.submittedLessons = [submitted(firstLesson, {
      lessonVersion: `${CONTENT_VERSION}:${firstLesson.id}:0`,
    })];
    expect(deriveAuthoritativeReleasedLessonProgress(staleLesson))
      .toMatchObject({
        completedCount: 0,
        nextLesson: { lessonId: firstLesson.id },
      });

    const unknownLesson = projection();
    unknownLesson.submittedLessons = [submitted({
      id: "forged-lesson",
      contentVersion: CONTENT_VERSION,
    })];
    expect(deriveAuthoritativeReleasedLessonProgress(unknownLesson))
      .toMatchObject({
        completedCount: 0,
        totalCount: RELEASED_LESSONS.length,
      });
  });

  it("fails closed when a submitted row crosses enrollment or content versions", () => {
    const foreignEnrollment = projection();
    foreignEnrollment.submittedLessons = [submitted(firstLesson, {
      enrollmentId: "foreign-enrollment",
    })];
    expect(deriveAuthoritativeReleasedLessonProgress(foreignEnrollment))
      .toBeNull();

    const wrongContentVersion = projection();
    wrongContentVersion.submittedLessons = [submitted(firstLesson, {
      contentVersion: "foundation-other",
    })];
    expect(deriveAuthoritativeReleasedLessonProgress(wrongContentVersion))
      .toBeNull();
  });

  it("deduplicates exact summaries instead of inflating progress", () => {
    const input = projection();
    input.submittedLessons = [submitted(firstLesson), submitted(firstLesson)];

    expect(deriveAuthoritativeReleasedLessonProgress(input)).toMatchObject({
      completedCount: 1,
      remainingCount: RELEASED_LESSONS.length - 1,
      nextLesson: { lessonId: secondLesson.id },
    });
  });

  it("never counts or exposes a submitted historical draft lesson", () => {
    const historicalDraft = {
      id: "historical-authoring-draft",
      contentVersion: CONTENT_VERSION,
    };
    const input = projection();
    input.submittedLessons = [submitted(historicalDraft)];

    const result = deriveAuthoritativeReleasedLessonProgress(input);

    expect(result).toMatchObject({
      completedCount: 0,
      totalCount: RELEASED_LESSONS.length,
      nextLesson: { lessonId: firstLesson.id },
    });
    expect(result?.lessons.some((lesson) =>
      lesson.lessonId === historicalDraft.id
    ))
      .toBe(false);
  });

  it("does not let draft, review, or retired prerequisites unlock a released lesson", () => {
    const draftLesson = {
      id: "fixture-draft",
      contentVersion: CONTENT_VERSION,
      prerequisiteIds: [],
      releaseState: "draft" as const,
    };
    const retiredLesson = {
      id: "fixture-retired",
      contentVersion: CONTENT_VERSION,
      prerequisiteIds: [],
      releaseState: "retired" as const,
    };
    const reviewLesson = {
      id: "fixture-review",
      contentVersion: CONTENT_VERSION,
      prerequisiteIds: [],
      releaseState: "review" as const,
    };
    const dependentLesson = {
      id: "fixture-dependent",
      contentVersion: CONTENT_VERSION,
      prerequisiteIds: [draftLesson.id, reviewLesson.id, retiredLesson.id],
      releaseState: "beta" as const,
    };
    const catalog: AuthoritativeProgressCatalog = {
      courseId: CURRENT_AUTHORITATIVE_COURSE_ID,
      contentVersion: CONTENT_VERSION,
      manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
      lessons: [draftLesson, reviewLesson, retiredLesson, dependentLesson],
    };
    const input = projection();
    input.submittedLessons = [
      submitted(draftLesson),
      submitted(reviewLesson),
      submitted(retiredLesson),
    ];

    const result = deriveAuthoritativeReleasedLessonProgressForCatalog(
      input,
      catalog,
    );

    expect(result).toMatchObject({
      completedCount: 0,
      totalCount: 1,
      remainingCount: 1,
      nextLesson: null,
      lessons: [{
        lessonId: dependentLesson.id,
        prerequisiteIds: [draftLesson.id, reviewLesson.id, retiredLesson.id],
        passed: false,
        unlocked: false,
        status: "locked",
      }],
    });
  });

  it("does not infer completion from objective counts, legacy XP, or mastery", () => {
    const countsOnly = projection();
    countsOnly.objectiveEvidence.vocabulary = {
      attemptCount: 500,
      correctCount: 500,
      incorrectCount: 0,
      masteryEligibleCount: 500,
      masteryEligibleCorrectCount: 500,
    };
    expect(deriveAuthoritativeReleasedLessonProgress(countsOnly))
      .toMatchObject({
        completedCount: 0,
        nextLesson: { lessonId: firstLesson.id },
      });

    const legacyClaims = projection() as NormalizedLearningProjectionV1 & {
      xp: number;
      mastery: Record<string, number>;
      completedLessons: Record<string, { bestScore: number }>;
    };
    legacyClaims.xp = 1_000_000;
    legacyClaims.mastery = { vocabulary: 100 };
    legacyClaims.completedLessons = {
      [firstLesson.id]: { bestScore: 100 },
    };
    expect(deriveAuthoritativeReleasedLessonProgress(legacyClaims)).toBeNull();
  });

  it("returns no recommendation after every released lesson has exact proof", () => {
    const input = projection();
    input.submittedLessons = RELEASED_LESSONS.map((lesson) => submitted(lesson));

    expect(deriveAuthoritativeReleasedLessonProgress(input)).toMatchObject({
      completedCount: RELEASED_LESSONS.length,
      totalCount: RELEASED_LESSONS.length,
      remainingCount: 0,
      progress: 100,
      nextLesson: null,
    });
  });
});
