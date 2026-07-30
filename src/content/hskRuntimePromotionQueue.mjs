import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalJson } from "./governance.mjs";
import {
  assertValidHskRuntimeCatalogBundle,
  loadHskRuntimeCatalogBundle,
} from "./hskRuntimeCatalog.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK_RUNTIME_PROMOTION_QUEUE_RELATIVE_PATH =
  "content/reports/hsk0-4-runtime-promotion-queue.json";
export const HSK_RUNTIME_PROMOTION_QUEUE_ID =
  "hsk0-4-runtime-promotion-queue-2026.07.1";

const LEVELS = [1, 2, 3, 4];
const SOURCE_PATHS = {
  graph: "content/curriculum/hsk0-4-graph.json",
  runtime: "content/runtime/hsk0-4-runtime-catalog.json",
  hsk1Scope: "content/curriculum/hsk1-scope.json",
  hsk1Personal: "content/drafts/hsk1-personal-exchange-2026.07.json",
  hsk1Communicative: "content/drafts/hsk1-communicative-units-2026.07.json",
  hsk1Characters: "content/drafts/hsk1-character-foundation-2026.07.json",
  hsk1Review: "content/review/hsk1-review-manifest-2026.07.json",
  hsk2Scope: "content/curriculum/hsk2-scope.json",
  hsk2Blueprints: "content/drafts/hsk2-lesson-blueprints-2026.07.json",
  hsk2Review: "content/review/hsk2-review-manifest-2026.07.json",
  hsk3Scope: "content/curriculum/hsk3-scope.json",
  hsk3Blueprints: "content/drafts/hsk3-lesson-blueprints-2026.07.json",
  hsk3Review: "content/review/hsk3-review-manifest-2026.07.json",
  hsk4Scope: "content/curriculum/hsk4-scope.json",
  hsk4Blueprints: "content/drafts/hsk4-lesson-blueprints-2026.07.json",
  hsk4Review: "content/review/hsk4-review-manifest-2026.07.json",
};

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const exact = (left, right) => canonicalJson(left) === canonicalJson(right);

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const sourceBinding = (root, id, relativePath) => ({
  id,
  relativePath,
  sha256: fileSha256(resolve(root, relativePath)),
});

const assertArray = (value, label) => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
};

const countApprovedBatches = (batches) =>
  batches.filter((batch) => batch?.state === "approved").length;

const mapHsk1AuthoringUnits = (sources) => {
  const packs = [
    sources.hsk1Personal,
    ...assertArray(sources.hsk1Communicative.packs, "HSK1 communicative packs"),
    sources.hsk1Characters,
  ];
  return new Map(packs.map((pack) => {
    const lessons = assertArray(pack.lessons, `${pack.unitId} lessons`);
    const batches = assertArray(pack.reviewBatches, `${pack.unitId} review batches`);
    const practiceItems = Array.isArray(pack.practiceItems)
      ? pack.practiceItems
      : [];
    return [pack.unitId, {
      lessons,
      blueprintReviewBatches: batches,
      authoredPracticeItemCount: practiceItems.length,
      audioDependentItemCount: practiceItems.filter(
        (item) => item?.kind === "listening-selection",
      ).length,
    }];
  }));
};

const mapBlueprintAuthoringUnits = (pack) => {
  const lessons = assertArray(pack.lessons, `${pack.packId} lessons`);
  const batches = assertArray(pack.reviewBatches, `${pack.packId} review batches`);
  const batchesByLesson = new Map();
  for (const batch of batches) {
    const lessonId = batch.lessonId ?? batch.targetLessonIds?.[0];
    if (typeof lessonId === "string") batchesByLesson.set(lessonId, batch);
  }
  const byUnit = new Map();
  for (const lesson of lessons) {
    const current = byUnit.get(lesson.unitId) ?? {
      lessons: [],
      blueprintReviewBatches: [],
      authoredPracticeItemCount: 0,
      audioDependentItemCount: 0,
    };
    current.lessons.push(lesson);
    const batch = batchesByLesson.get(lesson.lessonId);
    if (batch) current.blueprintReviewBatches.push(batch);
    byUnit.set(lesson.unitId, current);
  }
  return byUnit;
};

const validateReviewManifest = (manifest, level) => {
  const batches = assertArray(
    manifest.reviewBatches,
    `HSK${level} review manifest batches`,
  );
  const approvalRecords = batches.reduce(
    (total, batch) => total + (Number.isInteger(batch.approvalCount)
      ? batch.approvalCount
      : 0),
    0,
  );
  if (
    manifest.learnerVisible !== false
    || typeof manifest.releaseEligible !== "boolean"
    || !isRecord(manifest.counts)
    || manifest.counts.reviewBatches !== batches.length
    || manifest.counts.pendingBatches
      !== batches.filter((batch) => batch.state === "pending").length
    || manifest.counts.approvals !== approvalRecords
  ) {
    throw new Error(`HSK${level} review manifest is inconsistent`);
  }
  return {
    manifestId: manifest.manifestId,
    reviewBatchCount: batches.length,
    pendingBatchCount: manifest.counts.pendingBatches,
    approvedBatchCount: countApprovedBatches(batches),
    approvalRecordCount: approvalRecords,
    releaseEligible: manifest.releaseEligible,
  };
};

const validateScope = (scope, graph, level) => {
  const pathId = `hsk${level}`;
  const graphPath = graph.paths.find((path) => path.pathId === pathId);
  if (
    scope.pathId !== pathId
    || scope.graphId !== graph.graphId
    || scope.learnerVisible !== false
    || scope.releaseEligible !== false
    || !Array.isArray(scope.unitScopes)
    || !graphPath
    || !exact(
      scope.unitScopes.map((unit) => unit.unitId),
      graphPath.unitIds,
    )
  ) {
    throw new Error(`HSK${level} scope does not match the curriculum graph`);
  }
};

const projectUnit = ({
  graphUnit,
  authoring,
  sourceLessonIds,
  visibleLessonIds,
  runtimeUnitIds,
  levelReviewComplete,
}) => {
  if (!authoring) {
    throw new Error(`Missing authoring lesson source for ${graphUnit.unitId}`);
  }
  const authoredLessonIds = authoring.lessons.map((lesson) => lesson.lessonId);
  const blueprintApprovedLessonCount = countApprovedBatches(
    authoring.blueprintReviewBatches,
  );
  const prerequisiteRuntimeClosurePresent = graphUnit.prerequisiteUnitIds.every(
    (unitId) => runtimeUnitIds.has(unitId),
  );
  const blockers = [];
  if (!levelReviewComplete) blockers.push("LEVEL_HUMAN_REVIEW_INCOMPLETE");
  if (blueprintApprovedLessonCount < authoredLessonIds.length) {
    blockers.push("LESSON_REVIEW_INCOMPLETE");
  }
  if (authoring.audioDependentItemCount > 0) {
    blockers.push("REVIEWED_AUDIO_MISSING");
  }
  if (!prerequisiteRuntimeClosurePresent) {
    blockers.push("PREREQUISITE_RUNTIME_CLOSURE_MISSING");
  }
  if (sourceLessonIds.length < authoredLessonIds.length) {
    blockers.push("RUNTIME_PACKAGE_MAPPING_INCOMPLETE");
  }
  return {
    unitId: graphUnit.unitId,
    sequence: graphUnit.sequence,
    graphState: graphUnit.status,
    prerequisiteUnitIds: graphUnit.prerequisiteUnitIds,
    authoredLessonBlueprintCount: authoredLessonIds.length,
    blueprintReviewBatchCount: authoring.blueprintReviewBatches.length,
    blueprintApprovedLessonCount,
    authoredPracticeItemCount: authoring.authoredPracticeItemCount,
    audioDependentItemCount: authoring.audioDependentItemCount,
    sourceReleasedLessonIds: sourceLessonIds,
    learnerVisibleLessonIds: visibleLessonIds,
    prerequisiteRuntimeClosurePresent,
    promotionState: visibleLessonIds.length > 0
      ? "learner-visible-partial"
      : blockers.length === 0
        ? "promotion-ready"
        : "blocked",
    blockers,
  };
};

const projectLevel = ({
  graph,
  runtime,
  level,
  scope,
  authoringByUnit,
  reviewManifest,
}) => {
  validateScope(scope, graph, level);
  const pathId = `hsk${level}`;
  const graphPath = graph.paths.find((path) => path.pathId === pathId);
  const runtimePath = runtime.paths.find((path) => path.pathId === pathId);
  if (!graphPath || !runtimePath) throw new Error(`Missing ${pathId} path`);
  const runtimeUnitIds = new Set(runtime.units.map((unit) => unit.unitId));
  const review = validateReviewManifest(reviewManifest, level);
  const levelReviewComplete =
    review.releaseEligible
    && review.pendingBatchCount === 0
    && review.reviewBatchCount === review.approvedBatchCount;
  const units = graphPath.unitIds.map((unitId) => {
    const graphUnit = graph.units.find((unit) => unit.unitId === unitId);
    if (!graphUnit) throw new Error(`Missing graph unit ${unitId}`);
    return projectUnit({
      graphUnit,
      authoring: authoringByUnit.get(unitId),
      sourceLessonIds: graph.lessonMappings
        .filter((mapping) => mapping.unitId === unitId)
        .map((mapping) => mapping.lessonId),
      visibleLessonIds: runtime.lessonMappings
        .filter((mapping) => mapping.unitId === unitId)
        .map((mapping) => mapping.lessonId),
      runtimeUnitIds,
      levelReviewComplete,
    });
  });
  return {
    pathId,
    officialExamLevel: level,
    runtimeState: runtimePath.runtimeState,
    completionClaim: runtimePath.completionClaim,
    authoredLessonBlueprintCount: units.reduce(
      (total, unit) => total + unit.authoredLessonBlueprintCount,
      0,
    ),
    blueprintApprovedLessonCount: units.reduce(
      (total, unit) => total + unit.blueprintApprovedLessonCount,
      0,
    ),
    levelReview: review,
    learnerVisibleTargetLessonCount: runtimePath.targetLessonIds.length,
    sourceReleasedLessonCount: units.reduce(
      (total, unit) => total + unit.sourceReleasedLessonIds.length,
      0,
    ),
    prerequisiteBlockedSourceLessonCount: units.reduce(
      (total, unit) => total + Math.max(
        0,
        unit.sourceReleasedLessonIds.length - unit.learnerVisibleLessonIds.length,
      ),
      0,
    ),
    units,
  };
};

const selectNextCandidate = (levels) => {
  for (const level of levels) {
    for (const unit of level.units) {
      if (
        unit.learnerVisibleLessonIds.length === 0
        && unit.prerequisiteRuntimeClosurePresent
      ) {
        return {
          pathId: level.pathId,
          unitId: unit.unitId,
          authoredLessonBlueprintCount: unit.authoredLessonBlueprintCount,
          authoredPracticeItemCount: unit.authoredPracticeItemCount,
          audioDependentItemCount: unit.audioDependentItemCount,
          sourceReleasedLessonCount: unit.sourceReleasedLessonIds.length,
          blueprintApprovedLessonCount: unit.blueprintApprovedLessonCount,
          blockers: unit.blockers,
          requiredAction:
            "complete attributable review and reviewed audio, then import into a versioned runtime package and recompile prerequisite closure",
        };
      }
    }
  }
  return null;
};

export const loadHskRuntimePromotionQueueSources = (
  root = process.cwd(),
) => {
  const paths = Object.fromEntries(
    Object.entries(SOURCE_PATHS).map(([id, relativePath]) => [
      id,
      resolve(root, relativePath),
    ]),
  );
  const sources = Object.fromEntries(
    Object.entries(paths).map(([id, path]) => [id, readJson(path)]),
  );
  return {
    root,
    paths,
    ...sources,
    runtimeBundle: loadHskRuntimeCatalogBundle(root),
  };
};

export const projectHskRuntimePromotionQueue = (source) => {
  assertValidHskRuntimeCatalogBundle(source.runtimeBundle);
  if (!exact(source.runtime, source.runtimeBundle.catalog)) {
    throw new Error("Promotion queue runtime source is not the checked catalog");
  }
  const graph = source.graph;
  if (
    !isRecord(graph)
    || !Array.isArray(graph.paths)
    || !Array.isArray(graph.units)
    || !Array.isArray(graph.lessonMappings)
  ) {
    throw new Error("Promotion queue curriculum graph is invalid");
  }

  const authoringByLevel = new Map([
    [1, mapHsk1AuthoringUnits(source)],
    [2, mapBlueprintAuthoringUnits(source.hsk2Blueprints)],
    [3, mapBlueprintAuthoringUnits(source.hsk3Blueprints)],
    [4, mapBlueprintAuthoringUnits(source.hsk4Blueprints)],
  ]);
  const scopeByLevel = new Map(LEVELS.map((level) => [
    level,
    source[`hsk${level}Scope`],
  ]));
  const reviewByLevel = new Map(LEVELS.map((level) => [
    level,
    source[`hsk${level}Review`],
  ]));
  const levels = LEVELS.map((level) => projectLevel({
    graph,
    runtime: source.runtime,
    level,
    scope: scopeByLevel.get(level),
    authoringByUnit: authoringByLevel.get(level),
    reviewManifest: reviewByLevel.get(level),
  }));
  const summary = {
    levels: levels.length,
    graphUnits: levels.reduce((total, level) => total + level.units.length, 0),
    authoredLessonBlueprints: levels.reduce(
      (total, level) => total + level.authoredLessonBlueprintCount,
      0,
    ),
    blueprintApprovedLessons: levels.reduce(
      (total, level) => total + level.blueprintApprovedLessonCount,
      0,
    ),
    reviewBatches: levels.reduce(
      (total, level) => total + level.levelReview.reviewBatchCount,
      0,
    ),
    approvalRecords: levels.reduce(
      (total, level) => total + level.levelReview.approvalRecordCount,
      0,
    ),
    learnerVisibleTargetLessons: levels.reduce(
      (total, level) => total + level.learnerVisibleTargetLessonCount,
      0,
    ),
    prerequisiteBlockedSourceLessons: levels.reduce(
      (total, level) => total + level.prerequisiteBlockedSourceLessonCount,
      0,
    ),
    unavailablePaths: levels.filter(
      (level) => level.runtimeState === "unavailable",
    ).length,
    completionClaims: levels.filter((level) => level.completionClaim).length,
    promotionReadyUnits: levels.flatMap((level) => level.units).filter(
      (unit) => unit.promotionState === "promotion-ready",
    ).length,
  };
  return {
    schemaVersion: 1,
    reportId: HSK_RUNTIME_PROMOTION_QUEUE_ID,
    sourceBindings: Object.entries(SOURCE_PATHS).map(([id, relativePath]) =>
      sourceBinding(source.root, id, relativePath)
    ),
    policy: {
      informationalOnly: true,
      mutatesRuntime: false,
      exposesDraftContent: false,
      reviewManifestApprovalPublishesContent: false,
      requiresAttributableHumanReview: true,
      requiresReviewedAudioForListening: true,
      requiresPrerequisiteRuntimeClosure: true,
      requiresVersionedRuntimeImport: true,
      grantsCompletionOrMastery: false,
    },
    summary,
    levels,
    nextPromotionCandidate: selectNextCandidate(levels),
  };
};

export const validateHskRuntimePromotionQueueBundle = ({
  source,
  report,
}) => {
  const errors = [];
  let expected;
  try {
    expected = projectHskRuntimePromotionQueue(source);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      summary: null,
    };
  }
  if (
    !isRecord(report)
    || report.schemaVersion !== 1
    || report.reportId !== HSK_RUNTIME_PROMOTION_QUEUE_ID
    || !Array.isArray(report.sourceBindings)
    || !Array.isArray(report.levels)
    || !isRecord(report.summary)
    || !isRecord(report.policy)
  ) {
    errors.push("HSK runtime promotion queue shape is invalid");
  }
  if (
    report?.policy?.informationalOnly !== true
    || report?.policy?.mutatesRuntime !== false
    || report?.policy?.exposesDraftContent !== false
    || report?.policy?.reviewManifestApprovalPublishesContent !== false
    || report?.policy?.requiresAttributableHumanReview !== true
    || report?.policy?.requiresReviewedAudioForListening !== true
    || report?.policy?.requiresPrerequisiteRuntimeClosure !== true
    || report?.policy?.requiresVersionedRuntimeImport !== true
    || report?.policy?.grantsCompletionOrMastery !== false
  ) {
    errors.push("HSK runtime promotion queue policy is not fail-closed");
  }
  if (!exact(report, expected)) {
    errors.push("HSK runtime promotion queue does not match its exact source projection");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expected.summary,
  };
};

export const assertValidHskRuntimePromotionQueueBundle = (bundle) => {
  const result = validateHskRuntimePromotionQueueBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK runtime promotion queue:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};

export const loadHskRuntimePromotionQueueBundle = (
  root = process.cwd(),
) => ({
  source: loadHskRuntimePromotionQueueSources(root),
  reportPath: resolve(root, HSK_RUNTIME_PROMOTION_QUEUE_RELATIVE_PATH),
  report: readJson(resolve(root, HSK_RUNTIME_PROMOTION_QUEUE_RELATIVE_PATH)),
});
