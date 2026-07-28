import graphJson from "../../content/curriculum/hsk0-4-graph.json";
import type { StartingLevel } from "../learning/startingLevels";

export type HskCurriculumPathId = "hsk0" | "hsk1" | "hsk2" | "hsk3" | "hsk4";

type OfficialInventoryCounts = {
  tasks: number;
  topics: number;
  vocabulary: number;
  recognitionCharacters: number;
  grammarRows: number;
};

type HskCurriculumPathRecord = {
  pathId: HskCurriculumPathId;
  stageIndex: number;
  officialExamLevel: number | null;
  prerequisitePathIds: HskCurriculumPathId[];
  unitIds: string[];
  placementPolicy:
    | "open-foundation"
    | "verified-placement-or-prerequisite-completion";
  officialInventory: OfficialInventoryCounts | null;
};

type HskCurriculumUnitRecord = {
  unitId: string;
  pathId: HskCurriculumPathId;
  sequence: number;
  status: "foundation" | "planned";
  title: string;
  objective: string;
  prerequisiteUnitIds: string[];
};

type HskLessonMappingRecord = {
  lessonId: string;
  unitId: string;
  mappingState: "partial";
  officialVocabularyIds: string[];
  unmappedRuntimeWordIds: string[];
};

type HskCurriculumGraphArtifact = {
  schemaVersion: 1;
  graphId: string;
  runtimeContentVersion: string;
  paths: HskCurriculumPathRecord[];
  units: HskCurriculumUnitRecord[];
  lessonMappings: HskLessonMappingRecord[];
};

const GRAPH = graphJson as unknown as HskCurriculumGraphArtifact;
const PATH_BY_ID = new Map(GRAPH.paths.map((path) => [path.pathId, path]));
const UNIT_BY_ID = new Map(GRAPH.units.map((unit) => [unit.unitId, unit]));
const LESSON_MAPPINGS_BY_UNIT = new Map<string, HskLessonMappingRecord[]>();
for (const mapping of GRAPH.lessonMappings) {
  const mappings = LESSON_MAPPINGS_BY_UNIT.get(mapping.unitId) ?? [];
  mappings.push(mapping);
  LESSON_MAPPINGS_BY_UNIT.set(mapping.unitId, mappings);
}

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

export const getHskCurriculumView = (
  startingLevel: StartingLevel,
): HskCurriculumView => {
  const pathId = canonicalPathId(startingLevel);
  const path = PATH_BY_ID.get(pathId) ?? PATH_BY_ID.get("hsk0")!;
  const units = path.unitIds.map((unitId) => UNIT_BY_ID.get(unitId)!)
    .filter(Boolean);
  const targetLessonIds = lessonIdsForUnits(path.unitIds);
  const bridgeLessonIds = targetLessonIds.length === 0
    ? []
    : lessonIdsForUnits(transitivePrerequisiteUnitIds(path));
  const visibleLessonIds = [...new Set([
    ...bridgeLessonIds,
    ...targetLessonIds,
  ])];
  const mappedOfficialVocabularyCount = new Set(
    GRAPH.lessonMappings
      .filter((mapping) => targetLessonIds.includes(mapping.lessonId))
      .flatMap((mapping) => mapping.officialVocabularyIds),
  ).size;
  return {
    graphId: GRAPH.graphId,
    path,
    units,
    targetLessonIds,
    bridgeLessonIds,
    visibleLessonIds,
    mappedOfficialVocabularyCount,
    targetContentAvailable: targetLessonIds.length > 0,
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
