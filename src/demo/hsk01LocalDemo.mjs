import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertValidHskRuntimeCatalogBundle,
  HSK_RUNTIME_CATALOG_RELATIVE_PATH,
  loadHskRuntimeCatalogBundle,
} from "../content/hskRuntimeCatalog.mjs";

export const HSK01_LOCAL_DEMO_RELATIVE_PATH =
  "content/demo/hsk0-1-local-demo.json";
export const HSK01_LOCAL_DEMO_ID =
  "hsk0-hsk1-local-ui-demo-2026.07.1";

const BRIDGE_LESSON_IDS = [
  "boot-1",
  "boot-2",
  "boot-3",
  "boot-4",
];
const HSK1_TARGET_LESSON_IDS = [
  "survival-1",
  "survival-2",
  "survival-3",
  "survival-4",
  "survival-5",
  "survival-6",
  "survival-7",
  "survival-8",
  "survival-9",
  "hsk1-time-place-events-01-numbers",
  "hsk1-time-place-events-02-calendar",
  "hsk1-time-place-events-03-week-and-day-parts",
  "hsk1-time-place-events-04-clock-and-duration",
  "hsk1-time-place-events-05-location",
  "hsk1-time-place-events-06-weather-and-residence",
  "daily-1",
  "daily-2",
  "daily-3",
  "daily-4",
  "journey-1",
  "journey-2",
  "professional-1",
  "professional-2",
  "professional-3",
  "professional-4",
  "characters-1",
  "characters-2",
  "characters-3",
  "characters-4",
  "characters-5",
  "characters-6",
  "characters-7",
  "characters-8",
  "characters-9",
  "characters-10",
  "characters-11",
  "characters-12",
  "characters-13",
  "characters-14",
  "characters-15",
];
const BLOCKED_LESSON_IDS = [];
const UNAVAILABLE_PATH_IDS = ["hsk3", "hsk4"];
const EXPECTATIONS = Object.freeze({
  lessonActivityCount: 10,
  intentionalIncorrectCount: 1,
  passingScore: 90,
  remediationAttempts: 2,
  totalLessonEvidence: 44,
  totalRemediationEvidence: 2,
});
const FORBIDDEN_PROGRESS_KEYS = new Set([
  "seed",
  "initialState",
  "learningState",
  "answers",
  "evidence",
  "completedLessons",
  "mistakes",
  "knowledge",
  "mastery",
  "xp",
  "streak",
  "lessonResumes",
  "assessmentSessions",
  "assessmentAttempts",
]);

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const forbiddenProgressPaths = (value, parentPath = "$") => {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      forbiddenProgressPaths(item, `${parentPath}[${index}]`)
    );
  }
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const path = `${parentPath}.${key}`;
    return [
      ...(FORBIDDEN_PROGRESS_KEYS.has(key) ? [path] : []),
      ...forbiddenProgressPaths(child, path),
    ];
  });
};

const findPath = (paths, pathId) => {
  const path = paths.find((candidate) => candidate.pathId === pathId);
  if (!path) throw new Error(`Runtime path ${pathId} is unavailable`);
  return path;
};

const deriveBlockedHsk1LessonIds = (bundle) => {
  const graph = bundle.source.graphBundle.graph;
  const sourceRuntimeLessonIds = new Set(
    bundle.source.runtimeCatalog.lessons.map((lesson) => lesson.id),
  );
  const eligibleLessonIds = new Set(
    bundle.catalog.lessonMappings.map((mapping) => mapping.lessonId),
  );
  const hsk1 = findPath(graph.paths, "hsk1");
  const hsk1UnitIds = new Set(hsk1.unitIds);
  return graph.lessonMappings
    .filter((mapping) =>
      hsk1UnitIds.has(mapping.unitId)
      && sourceRuntimeLessonIds.has(mapping.lessonId)
      && !eligibleLessonIds.has(mapping.lessonId)
    )
    .map((mapping) => mapping.lessonId);
};

const assertExpectedDemoBoundary = ({
  bridgeLessonIds,
  hsk1LessonIds,
  blockedLessonIds,
  unavailablePathIds,
}) => {
  if (!exact(bridgeLessonIds, BRIDGE_LESSON_IDS)) {
    throw new Error("HSK0 demo bridge no longer matches the checked catalog");
  }
  if (!exact(hsk1LessonIds, HSK1_TARGET_LESSON_IDS)) {
    throw new Error("HSK1 demo boundary no longer matches the checked catalog");
  }
  if (!exact(blockedLessonIds, BLOCKED_LESSON_IDS)) {
    throw new Error("Blocked HSK1 demo lessons no longer match the source graph");
  }
  if (!exact(unavailablePathIds, UNAVAILABLE_PATH_IDS)) {
    throw new Error("Unavailable demo paths no longer match the checked catalog");
  }
  if (
    EXPECTATIONS.passingScore
      !== (
        (
          EXPECTATIONS.lessonActivityCount
          - EXPECTATIONS.intentionalIncorrectCount
        )
        / EXPECTATIONS.lessonActivityCount
      ) * 100
    || EXPECTATIONS.totalLessonEvidence
      !== (
        BRIDGE_LESSON_IDS.length
        * (EXPECTATIONS.lessonActivityCount + 1)
      )
    || EXPECTATIONS.totalRemediationEvidence
      !== EXPECTATIONS.remediationAttempts
  ) {
    throw new Error("Local demo evidence expectations are inconsistent");
  }
};

export const projectHsk01LocalDemo = (root = process.cwd()) => {
  const bundle = loadHskRuntimeCatalogBundle(root);
  assertValidHskRuntimeCatalogBundle(bundle);
  const hsk0Path = findPath(bundle.catalog.paths, "hsk0");
  const hsk1Path = findPath(bundle.catalog.paths, "hsk1");
  const bridgeLessonIds = [...hsk0Path.targetLessonIds];
  const hsk1LessonIds = [...hsk1Path.targetLessonIds];
  const blockedLessonIds = deriveBlockedHsk1LessonIds(bundle);
  const unavailablePathIds = bundle.catalog.paths
    .filter((path) =>
      path.runtimeState === "unavailable"
      && path.targetContentAvailable === false
    )
    .map((path) => path.pathId);

  assertExpectedDemoBoundary({
    bridgeLessonIds,
    hsk1LessonIds,
    blockedLessonIds,
    unavailablePathIds,
  });

  return {
    schemaVersion: 1,
    demoId: HSK01_LOCAL_DEMO_ID,
    kind: "no-progress-ui-walkthrough",
    runtimeCatalogBinding: {
      relativePath: HSK_RUNTIME_CATALOG_RELATIVE_PATH,
      schemaVersion: bundle.catalog.schemaVersion,
      catalogId: bundle.catalog.catalogId,
      compilerVersion: bundle.catalog.compilerVersion,
      runtimeContentVersion: bundle.catalog.runtimeContentVersion,
      importIdempotencyKey: bundle.catalog.importIdempotencyKey,
      integritySha256: bundle.catalog.integritySha256,
      sourceBindings: structuredClone(bundle.catalog.sourceBindings),
    },
    scenario: {
      profileSelection: {
        startingLevel: "hsk1",
        goal: "hsk",
        script: "simplified",
      },
      targetPathId: "hsk1",
      bridgePathId: "hsk0",
      entryLessonId: bridgeLessonIds[0],
      bridgeLessonIds,
      boundaryUnlockLessonId: hsk1LessonIds[0],
      stillLockedLessonIds: hsk1LessonIds.slice(1),
      blockedLessonIds,
      unavailablePathIds,
    },
    walkthrough: {
      intentionalErrorLessonId: bridgeLessonIds[0],
      intentionalErrorSelection: "first-non-required-after-resume",
      reloadAfterCheckedActivityPosition: 0,
      minimumPassingScore: 70,
    },
    expectations: { ...EXPECTATIONS },
    policy: {
      learnerVisible: false,
      testContractOnly: true,
      storageMutationMode: "real-ui-only",
      exactRuntimeProvenanceRequired: true,
      skillSeparatedEvidenceRequired: true,
      remediationGrantsMastery: false,
      prerequisiteWaiverAllowed: false,
      completionClaim: false,
    },
  };
};

export const loadHsk01LocalDemoBundle = (root = process.cwd()) => {
  const manifestPath = resolve(root, HSK01_LOCAL_DEMO_RELATIVE_PATH);
  return {
    root,
    manifestPath,
    manifest: readJson(manifestPath),
  };
};

export const validateHsk01LocalDemoBundle = ({
  root,
  manifest,
}) => {
  const errors = [];
  let expected;
  try {
    expected = projectHsk01LocalDemo(root);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      summary: null,
    };
  }

  if (
    !isRecord(manifest)
    || manifest.schemaVersion !== 1
    || manifest.demoId !== HSK01_LOCAL_DEMO_ID
    || manifest.kind !== "no-progress-ui-walkthrough"
  ) {
    errors.push("Local demo identity is invalid");
  }
  if (
    !isRecord(manifest?.runtimeCatalogBinding)
    || manifest.runtimeCatalogBinding.relativePath
      !== HSK_RUNTIME_CATALOG_RELATIVE_PATH
    || manifest.runtimeCatalogBinding.catalogId
      !== expected.runtimeCatalogBinding.catalogId
    || manifest.runtimeCatalogBinding.importIdempotencyKey
      !== expected.runtimeCatalogBinding.importIdempotencyKey
    || manifest.runtimeCatalogBinding.integritySha256
      !== expected.runtimeCatalogBinding.integritySha256
  ) {
    errors.push("Local demo runtime catalog binding is stale or invalid");
  }
  if (
    !isRecord(manifest?.scenario)
    || !isRecord(manifest.scenario.profileSelection)
    || manifest.scenario.profileSelection.startingLevel !== "hsk1"
    || manifest.scenario.profileSelection.goal !== "hsk"
    || manifest.scenario.profileSelection.script !== "simplified"
    || manifest.scenario.targetPathId !== "hsk1"
    || manifest.scenario.bridgePathId !== "hsk0"
    || !exact(manifest.scenario.bridgeLessonIds, BRIDGE_LESSON_IDS)
    || manifest.scenario.boundaryUnlockLessonId !== HSK1_TARGET_LESSON_IDS[0]
    || !exact(
      manifest.scenario.stillLockedLessonIds,
      HSK1_TARGET_LESSON_IDS.slice(1),
    )
    || !exact(manifest.scenario.blockedLessonIds, BLOCKED_LESSON_IDS)
    || !exact(manifest.scenario.unavailablePathIds, UNAVAILABLE_PATH_IDS)
  ) {
    errors.push("Local demo HSK0-to-HSK1 boundary is invalid");
  }
  if (
    !isRecord(manifest?.expectations)
    || !exact(manifest.expectations, EXPECTATIONS)
  ) {
    errors.push("Local demo evidence expectations are invalid");
  }
  if (
    !isRecord(manifest?.policy)
    || manifest.policy.learnerVisible !== false
    || manifest.policy.testContractOnly !== true
    || manifest.policy.storageMutationMode !== "real-ui-only"
    || manifest.policy.exactRuntimeProvenanceRequired !== true
    || manifest.policy.skillSeparatedEvidenceRequired !== true
    || manifest.policy.remediationGrantsMastery !== false
    || manifest.policy.prerequisiteWaiverAllowed !== false
    || manifest.policy.completionClaim !== false
  ) {
    errors.push("Local demo policy must remain fail-closed");
  }
  const forbiddenPaths = forbiddenProgressPaths(manifest);
  if (forbiddenPaths.length > 0) {
    errors.push(
      `Local demo contains forbidden progress state: ${forbiddenPaths.join(", ")}`,
    );
  }
  if (!exact(manifest, expected)) {
    errors.push("Local demo does not match its exact checked projection");
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: {
      bridgeLessons: expected.scenario.bridgeLessonIds.length,
      targetLessons:
        1 + expected.scenario.stillLockedLessonIds.length,
      blockedLessons: expected.scenario.blockedLessonIds.length,
      unavailablePaths: expected.scenario.unavailablePathIds.length,
      forbiddenProgressFields: forbiddenPaths.length,
    },
  };
};

export const assertValidHsk01LocalDemoBundle = (bundle) => {
  const result = validateHsk01LocalDemoBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK0-HSK1 local demo:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
