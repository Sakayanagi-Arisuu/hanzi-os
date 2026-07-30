import { describe, expect, it } from "vitest";
import {
  CONTENT_VERSION,
  LESSON_BY_ID,
} from "../data/curriculum";
import {
  getHskLessonRuntimeBinding,
  HSK_RUNTIME_CATALOG_IDENTITY,
} from "../data/hskCurriculumGraph";
import { canonicalStringify } from "../sync/canonicalHash";
import {
  localLessonActivityProvenance,
  localLessonEvidenceMetadata,
  localLessonSessionProvenance,
  materializeLocalLessonRuntime,
  resolveExactLocalLessonActivityProvenance,
  resolveExactLocalLessonSessionProvenance,
} from "./localLessonRuntime";

const SESSION_ID = "lesson-session:boot-1:local-runtime-fixture";

const lessonFixture = (lessonId = "boot-1") => {
  const lesson = LESSON_BY_ID.get(lessonId);
  if (!lesson) throw new Error(`Missing lesson fixture: ${lessonId}`);
  return lesson;
};

const runtimeFixture = () => {
  const result = materializeLocalLessonRuntime(
    lessonFixture(),
    "simplified",
    SESSION_ID,
  );
  if (!result.ok) throw new Error(result.reason);
  return result.runtime;
};

describe("checked local lesson runtime", () => {
  it.each([
    "boot-1",
    "boot-2",
    "boot-3",
    "boot-4",
    "survival-1",
    "survival-2",
    "survival-3",
    "survival-4",
  ])("materializes checked eligible lesson %s", (lessonId) => {
    expect(materializeLocalLessonRuntime(
      lessonFixture(lessonId),
      "simplified",
      `lesson-session:${lessonId}:eligible`,
    ).ok).toBe(true);
  });

  it("binds a deterministic lesson/activity form to the checked HSK catalog", () => {
    const first = runtimeFixture();
    const second = runtimeFixture();

    expect(canonicalStringify(first)).toBe(canonicalStringify(second));
    expect(first).toMatchObject({
      schemaVersion: 1,
      runtimeSchemaVersion: 1,
      activitySchemaVersion: 1,
      catalogSchemaVersion: 1,
      catalogId: HSK_RUNTIME_CATALOG_IDENTITY.catalogId,
      catalogImportIdempotencyKey:
        HSK_RUNTIME_CATALOG_IDENTITY.importIdempotencyKey,
      catalogIntegritySha256: HSK_RUNTIME_CATALOG_IDENTITY.integritySha256,
      contentVersion: CONTENT_VERSION,
      contentSchemaVersion:
        HSK_RUNTIME_CATALOG_IDENTITY.contentSchemaVersion,
      itemCatalogSchemaVersion:
        HSK_RUNTIME_CATALOG_IDENTITY.itemCatalogSchemaVersion,
      lessonId: "boot-1",
      lessonVersion: getHskLessonRuntimeBinding("boot-1")?.lessonVersion,
      sessionId: SESSION_ID,
      script: "simplified",
    });
    expect(first.activities).toHaveLength(10);
    expect(first.activities.every((activity, position) =>
      activity.schemaVersion === 1
      && activity.position === position
      && activity.activityId
        === `${first.lessonId}:${activity.exercise.id}`
      && activity.activityVersion === activity.exercise.activityVersion
    )).toBe(true);
  });

  it.each([
    "daily-1",
    "daily-2",
    "daily-3",
    "daily-4",
    "characters-1",
    "characters-2",
  ])("keeps prerequisite-blocked runtime lesson %s unavailable", (lessonId) => {
    const result = materializeLocalLessonRuntime(
      lessonFixture(lessonId),
      "simplified",
      `lesson-session:${lessonId}:blocked`,
    );

    expect(result).toMatchObject({
      ok: false,
      code: "lesson-unavailable",
    });
  });

  it("rejects a stale or altered lesson payload", () => {
    const result = materializeLocalLessonRuntime(
      {
        ...lessonFixture(),
        objective: "altered objective",
      },
      "simplified",
      SESSION_ID,
    );

    expect(result).toMatchObject({
      ok: false,
      code: "lesson-binding-mismatch",
    });
  });

  it("round-trips exact session and activity provenance", () => {
    const runtime = runtimeFixture();
    const session = localLessonSessionProvenance(runtime);
    const activity = localLessonActivityProvenance(runtime, 0);

    expect(resolveExactLocalLessonSessionProvenance(session)?.runtime)
      .toEqual(runtime);
    expect(activity).not.toBeNull();
    expect(resolveExactLocalLessonActivityProvenance(activity)?.activity)
      .toEqual(runtime.activities[0]);
    expect(localLessonEvidenceMetadata(activity!)).toMatchObject({
      localRuntimeSchemaVersion: 1,
      activitySchemaVersion: 1,
      runtimeCatalogId: HSK_RUNTIME_CATALOG_IDENTITY.catalogId,
      runtimeCatalogImportKey:
        HSK_RUNTIME_CATALOG_IDENTITY.importIdempotencyKey,
      lessonId: "boot-1",
      lessonVersion: runtime.lessonVersion,
      sessionId: SESSION_ID,
      activityPosition: 0,
      exerciseId: runtime.activities[0].exercise.id,
    });
  });

  it("fails closed on catalog, lesson, session, activity, or script drift", () => {
    const runtime = runtimeFixture();
    const session = localLessonSessionProvenance(runtime);
    const activity = localLessonActivityProvenance(runtime, 0)!;

    for (const tampered of [
      { ...activity, catalogId: "invented-catalog" },
      { ...activity, lessonVersion: "stale-lesson" },
      { ...activity, sessionId: "other-session" },
      { ...activity, activityVersion: "stale-activity" },
      { ...activity, activityPosition: 1 },
      { ...activity, script: "traditional" as const },
    ]) {
      expect(resolveExactLocalLessonActivityProvenance(tampered)).toBeNull();
    }
    expect(resolveExactLocalLessonSessionProvenance({
      ...session,
      contentSchemaVersion: session.contentSchemaVersion + 1,
    })).toBeNull();
  });
});
