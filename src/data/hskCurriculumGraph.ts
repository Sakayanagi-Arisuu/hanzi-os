import runtimeCatalogJson from "../../content/runtime/hsk0-4-runtime-catalog.json";
import type { StartingLevel } from "../learning/startingLevels";
import { CONTENT_VERSION } from "./curriculum";

export type HskCurriculumPathId = "hsk0" | "hsk1" | "hsk2" | "hsk3" | "hsk4";

type HskCurriculumPathRecord = {
  pathId: HskCurriculumPathId;
  stageIndex: number;
  prerequisitePathIds: HskCurriculumPathId[];
  unitIds: string[];
  placementPolicy:
    | "open-foundation"
    | "verified-placement-or-prerequisite-completion";
  runtimeState: "partial" | "unavailable";
  targetLessonIds: string[];
  releasedLessonCount: number;
  mappedOfficialVocabularyCount: number;
  targetContentAvailable: boolean;
  completionClaim: false;
};

type HskCurriculumUnitRecord = {
  unitId: string;
  pathId: HskCurriculumPathId;
  sequence: number;
  title: string;
  objective: string;
  prerequisiteUnitIds: string[];
  runtimeState: "partial";
  lessonIds: string[];
  releasedLessonCount: number;
  mappedOfficialVocabularyCount: number;
};

type HskLessonMappingRecord = {
  lessonId: string;
  lessonVersion: string;
  unitId: string;
  releaseState: "beta" | "published";
  mappedOfficialVocabularyCount: number;
};

type HskRuntimeCatalogArtifact = {
  schemaVersion: 1;
  catalogId: string;
  compilerVersion: string;
  runtimeContentVersion: string;
  importIdempotencyKey: string;
  sourceBindings: {
    curriculumGraph: {
      graphId: string;
    };
    contentPackage: {
      packageId: string;
      contentVersion: string;
      contentSchemaVersion: number;
      itemCatalogSchemaVersion: number;
      manifestSha256: string;
      itemCatalogSha256: string;
      runtimeCatalogSha256: string;
    };
  };
  policy: {
    sanitizedRuntimeCatalogOnly: true;
    requiresCompleteUnitPrerequisiteClosure: true;
    draftArtifactImportsAllowed: false;
    selfDeclarationGrantsMastery: false;
    uncalibratedAssessmentGrantsPrerequisiteWaiver: false;
  };
  paths: HskCurriculumPathRecord[];
  units: HskCurriculumUnitRecord[];
  lessonMappings: HskLessonMappingRecord[];
  integritySha256: string;
};

const GRAPH =
  runtimeCatalogJson as unknown as HskRuntimeCatalogArtifact;
if (
  GRAPH.schemaVersion !== 1
  || !GRAPH.catalogId
  || !GRAPH.compilerVersion
  || GRAPH.runtimeContentVersion !== CONTENT_VERSION
  || !/^sha256:[a-f0-9]{64}$/u.test(GRAPH.importIdempotencyKey)
  || !/^sha256:[a-f0-9]{64}$/u.test(GRAPH.integritySha256)
  || GRAPH.sourceBindings.contentPackage.packageId !== CONTENT_VERSION
  || GRAPH.sourceBindings.contentPackage.contentVersion !== CONTENT_VERSION
  || !Number.isSafeInteger(
    GRAPH.sourceBindings.contentPackage.contentSchemaVersion,
  )
  || GRAPH.sourceBindings.contentPackage.contentSchemaVersion < 1
  || !Number.isSafeInteger(
    GRAPH.sourceBindings.contentPackage.itemCatalogSchemaVersion,
  )
  || GRAPH.sourceBindings.contentPackage.itemCatalogSchemaVersion < 1
  || GRAPH.policy.sanitizedRuntimeCatalogOnly !== true
  || GRAPH.policy.requiresCompleteUnitPrerequisiteClosure !== true
  || GRAPH.policy.draftArtifactImportsAllowed !== false
  || GRAPH.policy.selfDeclarationGrantsMastery !== false
  || GRAPH.policy.uncalibratedAssessmentGrantsPrerequisiteWaiver
    !== false
) {
  throw new Error("HSK runtime curriculum catalog is stale or unsafe.");
}
const PATH_BY_ID = new Map(GRAPH.paths.map((path) => [path.pathId, path]));
const UNIT_BY_ID = new Map(GRAPH.units.map((unit) => [unit.unitId, unit]));
const LESSON_MAPPINGS_BY_UNIT = new Map<string, HskLessonMappingRecord[]>();
const LESSON_MAPPING_BY_ID = new Map<string, HskLessonMappingRecord>();
for (const mapping of GRAPH.lessonMappings) {
  if (LESSON_MAPPING_BY_ID.has(mapping.lessonId)) {
    throw new Error("HSK runtime curriculum catalog has duplicate lessons.");
  }
  const mappings = LESSON_MAPPINGS_BY_UNIT.get(mapping.unitId) ?? [];
  mappings.push(mapping);
  LESSON_MAPPINGS_BY_UNIT.set(mapping.unitId, mappings);
  LESSON_MAPPING_BY_ID.set(mapping.lessonId, mapping);
}

export type HskRuntimeCatalogIdentity = {
  schemaVersion: 1;
  catalogId: string;
  compilerVersion: string;
  runtimeContentVersion: string;
  importIdempotencyKey: string;
  integritySha256: string;
  graphId: string;
  packageId: string;
  contentSchemaVersion: number;
  itemCatalogSchemaVersion: number;
  manifestSha256: string;
  itemCatalogSha256: string;
  runtimeCatalogSha256: string;
};

export const HSK_RUNTIME_CATALOG_IDENTITY: HskRuntimeCatalogIdentity =
  Object.freeze({
    schemaVersion: GRAPH.schemaVersion,
    catalogId: GRAPH.catalogId,
    compilerVersion: GRAPH.compilerVersion,
    runtimeContentVersion: GRAPH.runtimeContentVersion,
    importIdempotencyKey: GRAPH.importIdempotencyKey,
    integritySha256: GRAPH.integritySha256,
    graphId: GRAPH.sourceBindings.curriculumGraph.graphId,
    packageId: GRAPH.sourceBindings.contentPackage.packageId,
    contentSchemaVersion:
      GRAPH.sourceBindings.contentPackage.contentSchemaVersion,
    itemCatalogSchemaVersion:
      GRAPH.sourceBindings.contentPackage.itemCatalogSchemaVersion,
    manifestSha256: GRAPH.sourceBindings.contentPackage.manifestSha256,
    itemCatalogSha256:
      GRAPH.sourceBindings.contentPackage.itemCatalogSha256,
    runtimeCatalogSha256:
      GRAPH.sourceBindings.contentPackage.runtimeCatalogSha256,
  });

export const getHskLessonRuntimeBinding = (
  lessonId: string,
): Readonly<HskLessonMappingRecord> | null =>
  LESSON_MAPPING_BY_ID.get(lessonId) ?? null;

const canonicalPathId = (
  startingLevel: StartingLevel,
): HskCurriculumPathId => startingLevel === "zero"
  ? "hsk0"
  : startingLevel === "basic"
    ? "hsk1"
    : startingLevel;

const lessonIdsForUnits = (unitIds: readonly string[]) =>
  unitIds.flatMap((unitId) =>
    (LESSON_MAPPINGS_BY_UNIT.get(unitId) ?? []).map(
      (mapping) => mapping.lessonId,
    )
  );

const transitivePrerequisiteUnitIds = (path: HskCurriculumPathRecord) => {
  const result: string[] = [];
  const visited = new Set<HskCurriculumPathId>();
  const visit = (pathId: HskCurriculumPathId) => {
    if (visited.has(pathId)) return;
    visited.add(pathId);
    const prerequisitePath = PATH_BY_ID.get(pathId);
    if (!prerequisitePath) return;
    prerequisitePath.prerequisitePathIds.forEach(visit);
    result.push(...prerequisitePath.unitIds);
  };
  path.prerequisitePathIds.forEach(visit);
  return result;
};

export type HskCurriculumView = {
  graphId: string;
  path: HskCurriculumPathRecord;
  units: HskCurriculumUnitRecord[];
  targetLessonIds: string[];
  bridgeLessonIds: string[];
  visibleLessonIds: string[];
  mappedOfficialVocabularyCount: number;
  targetContentAvailable: boolean;
};

export type NextHskRealmPreview = {
  pathId: HskCurriculumPathId;
  lessonCount: number;
  completedPrerequisiteCount: number;
  remainingPrerequisiteCount: number;
  progressPercent: number;
};

export const getHskCurriculumView = (
  startingLevel: StartingLevel,
): HskCurriculumView => {
  const pathId = canonicalPathId(startingLevel);
  const path = PATH_BY_ID.get(pathId) ?? PATH_BY_ID.get("hsk0")!;
  const units = path.unitIds.map((unitId) => UNIT_BY_ID.get(unitId)!)
    .filter(Boolean);
  const targetLessonIds = [...path.targetLessonIds];
  const bridgeLessonIds = targetLessonIds.length === 0
    ? []
    : lessonIdsForUnits(transitivePrerequisiteUnitIds(path));
  const visibleLessonIds = [...new Set([
    ...bridgeLessonIds,
    ...targetLessonIds,
  ])];
  return {
    graphId: GRAPH.sourceBindings.curriculumGraph.graphId,
    path,
    units,
    targetLessonIds,
    bridgeLessonIds,
    visibleLessonIds,
    mappedOfficialVocabularyCount: path.mappedOfficialVocabularyCount,
    targetContentAvailable: path.targetContentAvailable,
  };
};

/**
 * `startingLevel` is an entry target, not a permanent ceiling. Once every
 * target lesson in the current path has exact pass evidence, the learner's
 * visible journey advances to the next HSK path while retaining its
 * prerequisite units.
 */
export const getProgressingHskCurriculumView = (
  startingLevel: StartingLevel,
  passedLessonIds: ReadonlySet<string>,
): HskCurriculumView => {
  let view = getHskCurriculumView(startingLevel);

  while (
    view.targetLessonIds.length > 0
    && view.targetLessonIds.every((lessonId) => passedLessonIds.has(lessonId))
  ) {
    const nextPath = GRAPH.paths.find(
      (path) => path.stageIndex === view.path.stageIndex + 1,
    );
    if (!nextPath) break;
    view = getHskCurriculumView(
      nextPath.pathId === "hsk0" ? "zero" : nextPath.pathId,
    );
  }

  return view;
};

/**
 * Learner-facing certainty for the next realm. This is intentionally derived
 * from the same target lesson IDs that drive progression, so the preview can
 * never promise a different unlock condition from the runtime gate.
 */
export const getNextHskRealmPreview = (
  view: HskCurriculumView,
  passedLessonIds: ReadonlySet<string>,
): NextHskRealmPreview | null => {
  const nextPath = GRAPH.paths.find(
    (path) => path.stageIndex === view.path.stageIndex + 1,
  );
  if (!nextPath) return null;
  const completedPrerequisiteCount = view.targetLessonIds.filter((lessonId) =>
    passedLessonIds.has(lessonId)
  ).length;
  const lessonCount = view.targetLessonIds.length;
  return {
    pathId: nextPath.pathId,
    lessonCount: nextPath.targetLessonIds.length,
    completedPrerequisiteCount,
    remainingPrerequisiteCount: Math.max(
      0,
      lessonCount - completedPrerequisiteCount,
    ),
    progressPercent: lessonCount === 0
      ? 0
      : Math.round((completedPrerequisiteCount / lessonCount) * 100),
  };
};

export type HskPlacementPlan = {
  targetPathId: HskCurriculumPathId;
  status:
    | "open-foundation"
    | "prerequisite-evidence-required"
    | "target-ready"
    | "target-content-unavailable";
  diagnosticUse: "not-completed" | "observed-only";
  recommendedLessonId: string | null;
  grantsMastery: false;
  grantsPrerequisiteWaiver: false;
};

/**
 * Self-declaration chooses a target view, never mastery or an unlock. The
 * current diagnostic is explicitly uncalibrated, so it remains descriptive
 * and cannot waive prerequisite evidence.
 */
export const resolveHskPlacement = ({
  startingLevel,
  diagnosticCompleted,
  passedLessonIds,
}: {
  startingLevel: StartingLevel;
  diagnosticCompleted: boolean;
  passedLessonIds: ReadonlySet<string>;
}): HskPlacementPlan => {
  const view = getHskCurriculumView(startingLevel);
  const diagnosticUse = diagnosticCompleted
    ? "observed-only"
    : "not-completed";
  if (!view.targetContentAvailable) {
    return {
      targetPathId: view.path.pathId,
      status: "target-content-unavailable",
      diagnosticUse,
      recommendedLessonId: null,
      grantsMastery: false,
      grantsPrerequisiteWaiver: false,
    };
  }
  const firstMissingBridge = view.bridgeLessonIds.find(
    (lessonId) => !passedLessonIds.has(lessonId),
  );
  if (firstMissingBridge) {
    return {
      targetPathId: view.path.pathId,
      status: "prerequisite-evidence-required",
      diagnosticUse,
      recommendedLessonId: firstMissingBridge,
      grantsMastery: false,
      grantsPrerequisiteWaiver: false,
    };
  }
  return {
    targetPathId: view.path.pathId,
    status: view.path.pathId === "hsk0" ? "open-foundation" : "target-ready",
    diagnosticUse,
    recommendedLessonId: view.targetLessonIds.find(
      (lessonId) => !passedLessonIds.has(lessonId),
    ) ?? view.targetLessonIds[0] ?? null,
    grantsMastery: false,
    grantsPrerequisiteWaiver: false,
  };
};
