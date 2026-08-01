import {
  CONTENT_VERSION,
  LESSON_BY_ID,
} from "../data/curriculum";
import {
  getHskLessonRuntimeBinding,
  HSK_RUNTIME_CATALOG_IDENTITY,
} from "../data/hskCurriculumGraph";
import type { Exercise } from "../lib/exerciseGeneration";
import { canonicalStringify } from "../sync/canonicalHash";
import type { LearningEvidence, Lesson } from "../types";
import { buildLessonResumeExercises } from "./resumeProtocol";

export const LOCAL_LESSON_RUNTIME_SCHEMA_VERSION = 1 as const;
export const LOCAL_LESSON_ACTIVITY_SCHEMA_VERSION = 1 as const;
export const MAX_LOCAL_LESSON_ACTIVITIES = 20;

export type LocalLessonRuntimeFailureCode =
  | "lesson-unavailable"
  | "lesson-binding-mismatch"
  | "session-invalid"
  | "activity-form-invalid";

export type LocalLessonRuntimeActivityV1 = {
  schemaVersion: 1;
  position: number;
  activityId: string;
  activityVersion: string;
  exercise: Exercise;
};

export type LocalLessonSessionProvenanceV1 = {
  runtimeSchemaVersion: 1;
  activitySchemaVersion: 1;
  catalogSchemaVersion: 1;
  catalogId: string;
  compilerVersion: string;
  catalogImportIdempotencyKey: string;
  catalogIntegritySha256: string;
  graphId: string;
  packageId: string;
  contentVersion: string;
  contentSchemaVersion: number;
  itemCatalogSchemaVersion: number;
  lessonId: string;
  lessonVersion: string;
  sessionId: string;
  script: "simplified" | "traditional";
};

export type LocalLessonActivityProvenanceV1 =
  LocalLessonSessionProvenanceV1 & {
    activityPosition: number;
    activityId: string;
    activityVersion: string;
    exerciseId: string;
  };

export type LocalLessonRuntimeV1 = LocalLessonSessionProvenanceV1 & {
  schemaVersion: 1;
  activities: LocalLessonRuntimeActivityV1[];
};

export type MaterializeLocalLessonRuntimeResult =
  | { ok: true; runtime: LocalLessonRuntimeV1 }
  | {
      ok: false;
      code: LocalLessonRuntimeFailureCode;
      reason: string;
    };

const SESSION_PROVENANCE_KEYS = [
  "runtimeSchemaVersion",
  "activitySchemaVersion",
  "catalogSchemaVersion",
  "catalogId",
  "compilerVersion",
  "catalogImportIdempotencyKey",
  "catalogIntegritySha256",
  "graphId",
  "packageId",
  "contentVersion",
  "contentSchemaVersion",
  "itemCatalogSchemaVersion",
  "lessonId",
  "lessonVersion",
  "sessionId",
  "script",
] as const;

const ACTIVITY_PROVENANCE_KEYS = [
  ...SESSION_PROVENANCE_KEYS,
  "activityPosition",
  "activityId",
  "activityVersion",
  "exerciseId",
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (
  value: Record<string, unknown>,
  expected: readonly string[],
) => Object.keys(value).length === expected.length
  && expected.every((key) => Object.hasOwn(value, key));

const boundedString = (value: unknown, maximum: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= maximum;

const validLessonSessionId = (
  lessonId: string,
  sessionId: unknown,
): sessionId is string =>
  boundedString(sessionId, 240)
  && sessionId.startsWith(`lesson-session:${lessonId}:`)
  && sessionId.length > `lesson-session:${lessonId}:`.length;

const cloneExercise = (exercise: Exercise): Exercise => ({
  ...exercise,
  options: [...exercise.options],
});

const currentLessonMatches = (lesson: Lesson) => {
  const current = LESSON_BY_ID.get(lesson.id);
  return Boolean(
    current
    && current.contentVersion === CONTENT_VERSION
    && canonicalStringify(current) === canonicalStringify(lesson),
  );
};

const sessionProvenance = (
  lesson: Lesson,
  sessionId: string,
  script: "simplified" | "traditional",
): LocalLessonSessionProvenanceV1 => {
  const mapping = getHskLessonRuntimeBinding(lesson.id)!;
  return {
    runtimeSchemaVersion: LOCAL_LESSON_RUNTIME_SCHEMA_VERSION,
    activitySchemaVersion: LOCAL_LESSON_ACTIVITY_SCHEMA_VERSION,
    catalogSchemaVersion: HSK_RUNTIME_CATALOG_IDENTITY.schemaVersion,
    catalogId: HSK_RUNTIME_CATALOG_IDENTITY.catalogId,
    compilerVersion: HSK_RUNTIME_CATALOG_IDENTITY.compilerVersion,
    catalogImportIdempotencyKey:
      HSK_RUNTIME_CATALOG_IDENTITY.importIdempotencyKey,
    catalogIntegritySha256: HSK_RUNTIME_CATALOG_IDENTITY.integritySha256,
    graphId: HSK_RUNTIME_CATALOG_IDENTITY.graphId,
    packageId: HSK_RUNTIME_CATALOG_IDENTITY.packageId,
    contentVersion: HSK_RUNTIME_CATALOG_IDENTITY.runtimeContentVersion,
    contentSchemaVersion: HSK_RUNTIME_CATALOG_IDENTITY.contentSchemaVersion,
    itemCatalogSchemaVersion:
      HSK_RUNTIME_CATALOG_IDENTITY.itemCatalogSchemaVersion,
    lessonId: lesson.id,
    lessonVersion: mapping.lessonVersion,
    sessionId,
    script,
  };
};

const MAX_RESOLVED_SESSION_CACHE_ENTRIES = 64;
const resolvedSessionRuntimeCache = new Map<string, LocalLessonRuntimeV1>();

const resolvedSessionCacheKey = (
  lessonId: string,
  sessionId: string,
  script: "simplified" | "traditional",
) => `${lessonId}\u0000${sessionId}\u0000${script}`;

const cacheResolvedSessionRuntime = (
  key: string,
  runtime: LocalLessonRuntimeV1,
) => {
  resolvedSessionRuntimeCache.delete(key);
  resolvedSessionRuntimeCache.set(key, runtime);
  while (resolvedSessionRuntimeCache.size > MAX_RESOLVED_SESSION_CACHE_ENTRIES) {
    const oldestKey = resolvedSessionRuntimeCache.keys().next().value;
    if (oldestKey === undefined) break;
    resolvedSessionRuntimeCache.delete(oldestKey);
  }
};

/**
 * Compiles one local session only when the checked HSK curriculum catalog,
 * the sanitized lesson payload, and the deterministic activity form agree.
 */
export const materializeLocalLessonRuntime = (
  lesson: Lesson,
  script: "simplified" | "traditional",
  sessionId: string,
): MaterializeLocalLessonRuntimeResult => {
  if (!validLessonSessionId(lesson.id, sessionId)) {
    return {
      ok: false,
      code: "session-invalid",
      reason: "Local lesson session identity is invalid.",
    };
  }

  const mapping = getHskLessonRuntimeBinding(lesson.id);
  if (!mapping) {
    return {
      ok: false,
      code: "lesson-unavailable",
      reason: "Lesson is not eligible in the checked HSK runtime catalog.",
    };
  }
  if (
    !currentLessonMatches(lesson)
    || lesson.contentVersion !== HSK_RUNTIME_CATALOG_IDENTITY.runtimeContentVersion
    || mapping.lessonVersion !== lesson.contentVersion
    || mapping.releaseState !== lesson.releaseState
  ) {
    return {
      ok: false,
      code: "lesson-binding-mismatch",
      reason: "Lesson payload does not match its checked runtime binding.",
    };
  }

  const exercises = buildLessonResumeExercises(lesson, script, sessionId);
  if (
    exercises.length < 1
    || exercises.length > MAX_LOCAL_LESSON_ACTIVITIES
    || new Set(exercises.map((exercise) => exercise.id)).size
      !== exercises.length
  ) {
    return {
      ok: false,
      code: "activity-form-invalid",
      reason: "Local lesson activity form is empty, oversized, or duplicated.",
    };
  }

  const activities = exercises.map(
    (exercise, position): LocalLessonRuntimeActivityV1 => ({
      schemaVersion: LOCAL_LESSON_ACTIVITY_SCHEMA_VERSION,
      position,
      activityId: `${lesson.id}:${exercise.id}`,
      activityVersion: exercise.activityVersion,
      exercise: cloneExercise(exercise),
    }),
  );
  const provenance = sessionProvenance(lesson, sessionId, script);
  return {
    ok: true,
    runtime: {
      ...provenance,
      schemaVersion: LOCAL_LESSON_RUNTIME_SCHEMA_VERSION,
      activities,
    },
  };
};

export const localLessonSessionProvenance = (
  runtime: LocalLessonRuntimeV1,
): LocalLessonSessionProvenanceV1 => ({
  runtimeSchemaVersion: runtime.runtimeSchemaVersion,
  activitySchemaVersion: runtime.activitySchemaVersion,
  catalogSchemaVersion: runtime.catalogSchemaVersion,
  catalogId: runtime.catalogId,
  compilerVersion: runtime.compilerVersion,
  catalogImportIdempotencyKey: runtime.catalogImportIdempotencyKey,
  catalogIntegritySha256: runtime.catalogIntegritySha256,
  graphId: runtime.graphId,
  packageId: runtime.packageId,
  contentVersion: runtime.contentVersion,
  contentSchemaVersion: runtime.contentSchemaVersion,
  itemCatalogSchemaVersion: runtime.itemCatalogSchemaVersion,
  lessonId: runtime.lessonId,
  lessonVersion: runtime.lessonVersion,
  sessionId: runtime.sessionId,
  script: runtime.script,
});

export const localLessonActivityProvenance = (
  runtime: LocalLessonRuntimeV1,
  position: number,
): LocalLessonActivityProvenanceV1 | null => {
  const activity = runtime.activities[position];
  if (!activity || activity.position !== position) return null;
  return {
    ...localLessonSessionProvenance(runtime),
    activityPosition: activity.position,
    activityId: activity.activityId,
    activityVersion: activity.activityVersion,
    exerciseId: activity.exercise.id,
  };
};

const resolveExactSessionProvenance = (
  value: unknown,
): {
  provenance: LocalLessonSessionProvenanceV1;
  runtime: LocalLessonRuntimeV1;
} | null => {
  if (
    !isRecord(value)
    || !hasExactKeys(value, SESSION_PROVENANCE_KEYS)
    || !boundedString(value.lessonId, 160)
    || !validLessonSessionId(value.lessonId, value.sessionId)
    || (value.script !== "simplified" && value.script !== "traditional")
  ) return null;

  const lesson = LESSON_BY_ID.get(value.lessonId);
  if (!lesson) return null;
  const cacheKey = resolvedSessionCacheKey(
    value.lessonId,
    value.sessionId,
    value.script,
  );
  let runtime = resolvedSessionRuntimeCache.get(cacheKey);
  if (!runtime) {
    const result = materializeLocalLessonRuntime(
      lesson,
      value.script,
      value.sessionId,
    );
    if (!result.ok) return null;
    runtime = result.runtime;
    cacheResolvedSessionRuntime(cacheKey, runtime);
  } else {
    resolvedSessionRuntimeCache.delete(cacheKey);
    resolvedSessionRuntimeCache.set(cacheKey, runtime);
  }
  const expected = localLessonSessionProvenance(runtime);
  return canonicalStringify(value) === canonicalStringify(expected)
    ? {
        provenance: value as LocalLessonSessionProvenanceV1,
        runtime,
      }
    : null;
};

export const resolveExactLocalLessonSessionProvenance = (
  value: unknown,
) => resolveExactSessionProvenance(value);

export const resolveExactLocalLessonActivityProvenance = (
  value: unknown,
): {
  provenance: LocalLessonActivityProvenanceV1;
  runtime: LocalLessonRuntimeV1;
  activity: LocalLessonRuntimeActivityV1;
} | null => {
  if (
    !isRecord(value)
    || !hasExactKeys(value, ACTIVITY_PROVENANCE_KEYS)
    || !Number.isSafeInteger(value.activityPosition)
    || Number(value.activityPosition) < 0
  ) return null;

  const sessionValue = Object.fromEntries(
    SESSION_PROVENANCE_KEYS.map((key) => [key, value[key]]),
  );
  const resolved = resolveExactSessionProvenance(sessionValue);
  if (!resolved) return null;
  const activity = resolved.runtime.activities[Number(value.activityPosition)];
  if (!activity) return null;
  const expected = localLessonActivityProvenance(
    resolved.runtime,
    activity.position,
  );
  return expected
    && canonicalStringify(value) === canonicalStringify(expected)
    ? {
        provenance: value as LocalLessonActivityProvenanceV1,
        runtime: resolved.runtime,
        activity,
      }
    : null;
};

export const localLessonEvidenceMetadata = (
  provenance:
    | LocalLessonSessionProvenanceV1
    | LocalLessonActivityProvenanceV1,
): Record<string, string | number | boolean | null> => ({
  localRuntimeSchemaVersion: provenance.runtimeSchemaVersion,
  activitySchemaVersion: provenance.activitySchemaVersion,
  runtimeCatalogSchemaVersion: provenance.catalogSchemaVersion,
  runtimeCatalogId: provenance.catalogId,
  runtimeCompilerVersion: provenance.compilerVersion,
  runtimeCatalogImportKey: provenance.catalogImportIdempotencyKey,
  runtimeCatalogIntegrity: provenance.catalogIntegritySha256,
  runtimeGraphId: provenance.graphId,
  runtimePackageId: provenance.packageId,
  contentSchemaVersion: provenance.contentSchemaVersion,
  itemCatalogSchemaVersion: provenance.itemCatalogSchemaVersion,
  lessonId: provenance.lessonId,
  lessonVersion: provenance.lessonVersion,
  sessionId: provenance.sessionId,
  script: provenance.script,
  ...("activityPosition" in provenance
    ? {
        activityPosition: provenance.activityPosition,
        exerciseId: provenance.exerciseId,
      }
    : {}),
});

const PROVENANCE_METADATA_KEYS = [
  "localRuntimeSchemaVersion",
  "activitySchemaVersion",
  "runtimeCatalogSchemaVersion",
  "runtimeCatalogId",
  "runtimeCompilerVersion",
  "runtimeCatalogImportKey",
  "runtimeCatalogIntegrity",
  "runtimeGraphId",
  "runtimePackageId",
  "contentSchemaVersion",
  "itemCatalogSchemaVersion",
  "lessonId",
  "lessonVersion",
  "sessionId",
  "script",
  "activityPosition",
  "exerciseId",
] as const;

export type PersistedLocalLessonProvenanceResult<T> =
  | { kind: "legacy" }
  | { kind: "invalid" }
  | { kind: "exact"; resolved: T };

const hasAnyLocalLessonProvenance = (
  metadata: LearningEvidence["metadata"],
) => Boolean(
  metadata
  && PROVENANCE_METADATA_KEYS.some((key) =>
    Object.hasOwn(metadata, key)
  ),
);

const persistedSessionProvenance = (
  evidence: Pick<
    LearningEvidence,
    "contentVersion" | "metadata"
  >,
): LocalLessonSessionProvenanceV1 | null => {
  const metadata = evidence.metadata;
  if (!metadata) return null;
  return {
    runtimeSchemaVersion: metadata.localRuntimeSchemaVersion as 1,
    activitySchemaVersion: metadata.activitySchemaVersion as 1,
    catalogSchemaVersion: metadata.runtimeCatalogSchemaVersion as 1,
    catalogId: metadata.runtimeCatalogId as string,
    compilerVersion: metadata.runtimeCompilerVersion as string,
    catalogImportIdempotencyKey:
      metadata.runtimeCatalogImportKey as string,
    catalogIntegritySha256: metadata.runtimeCatalogIntegrity as string,
    graphId: metadata.runtimeGraphId as string,
    packageId: metadata.runtimePackageId as string,
    contentVersion: evidence.contentVersion,
    contentSchemaVersion: metadata.contentSchemaVersion as number,
    itemCatalogSchemaVersion: metadata.itemCatalogSchemaVersion as number,
    lessonId: metadata.lessonId as string,
    lessonVersion: metadata.lessonVersion as string,
    sessionId: metadata.sessionId as string,
    script: metadata.script as "simplified" | "traditional",
  };
};

export const resolvePersistedLocalLessonActivityProvenance = (
  evidence: Pick<
    LearningEvidence,
    "contentVersion" | "activityId" | "activityVersion" | "metadata"
  >,
): PersistedLocalLessonProvenanceResult<
  NonNullable<ReturnType<typeof resolveExactLocalLessonActivityProvenance>>
> => {
  if (!hasAnyLocalLessonProvenance(evidence.metadata)) {
    return { kind: "legacy" };
  }
  const session = persistedSessionProvenance(evidence);
  const metadata = evidence.metadata;
  if (!session || !metadata) return { kind: "invalid" };
  const resolved = resolveExactLocalLessonActivityProvenance({
    ...session,
    activityPosition: metadata.activityPosition,
    activityId: evidence.activityId,
    activityVersion: evidence.activityVersion,
    exerciseId: metadata.exerciseId,
  });
  return resolved
    ? { kind: "exact", resolved }
    : { kind: "invalid" };
};

export const resolvePersistedLocalLessonSessionProvenance = (
  evidence: Pick<
    LearningEvidence,
    "contentVersion" | "metadata"
  >,
): PersistedLocalLessonProvenanceResult<
  NonNullable<ReturnType<typeof resolveExactLocalLessonSessionProvenance>>
> => {
  if (!hasAnyLocalLessonProvenance(evidence.metadata)) {
    return { kind: "legacy" };
  }
  const session = persistedSessionProvenance(evidence);
  if (!session) return { kind: "invalid" };
  const resolved = resolveExactLocalLessonSessionProvenance(session);
  return resolved
    ? { kind: "exact", resolved }
    : { kind: "invalid" };
};
