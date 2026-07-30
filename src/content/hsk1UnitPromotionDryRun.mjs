import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalJson } from "./governance.mjs";
import {
  assertValidHskRuntimeCatalogBundle,
  HSK_RUNTIME_CATALOG_RELATIVE_PATH,
  HSK_RUNTIME_UNIT_RELEASE_POLICY_RELATIVE_PATH,
  loadHskRuntimeCatalogBundle,
  resolveRuntimeEligibleUnitIds,
} from "./hskRuntimeCatalog.mjs";
import {
  assertValidHsk1UnitPromotionHandoffBundle,
  HSK1_UNIT_PROMOTION_HANDOFF_RELATIVE_PATH,
  loadHsk1UnitPromotionHandoffBundle,
} from "./hsk1UnitPromotionHandoff.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK1_UNIT_PROMOTION_DRY_RUN_RELATIVE_PATH =
  "content/reports/hsk1-time-place-events-unit-promotion-dry-run.json";
export const HSK1_UNIT_PROMOTION_DRY_RUN_ID =
  "hsk1-time-place-events-unit-promotion-dry-run-2026.07.1";

const GRAPH_RELATIVE_PATH = "content/curriculum/hsk0-4-graph.json";
const TARGET_UNIT_ID = "hsk1-time-place-events";
const REQUIRED_WITHHELD_UNIT_ID = "hsk1-daily-life";
const REQUIRED_WITHHELD_LESSON_IDS = [
  "daily-1",
  "daily-2",
  "daily-3",
  "daily-4",
];
const POLICY = {
  dryRunOnly: true,
  completeTestFixtureMayAuthorizeImport: false,
  explicitUnitReleaseAuthorizationRequired: true,
  sourceMappingAloneActivatesUnit: false,
  prerequisiteCompletionAloneActivatesUnit: false,
  downstreamAuthorizationInherited: false,
  writesCurriculumGraph: false,
  writesUnitReleasePolicy: false,
  writesRuntimeCatalog: false,
  exposesLearnerContent: false,
  grantsCompletionOrMastery: false,
};

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (left, right) => canonicalJson(left) === canonicalJson(right);
const sourceBinding = (root, id, relativePath) => ({
  id,
  relativePath,
  sha256: fileSha256(resolve(root, relativePath)),
});

const orderedUnitIds = (graph, unitIds) => graph.units
  .map((unit) => unit.unitId)
  .filter((unitId) => unitIds.has(unitId));

export const projectHsk1AtomicUnitActivation = ({
  source,
  additionalAuthorizedUnitIds = [TARGET_UNIT_ID],
}) => {
  const graph = source.runtimeBundle.source.graphBundle.graph;
  const runtime = source.runtimeBundle.catalog;
  const handoff = source.handoffBundle.handoff;
  const currentAuthorizedUnitIds = new Set(
    source.runtimeBundle.source.unitReleasePolicy.units.map(
      (unit) => unit.unitId,
    ),
  );
  const currentEligibleUnitIds = resolveRuntimeEligibleUnitIds(
    graph,
    currentAuthorizedUnitIds,
  );
  const prospectiveAuthorizedUnitIds = new Set(currentAuthorizedUnitIds);
  for (const unitId of additionalAuthorizedUnitIds) {
    prospectiveAuthorizedUnitIds.add(unitId);
  }
  const prospectiveEligibleUnitIds = resolveRuntimeEligibleUnitIds(
    graph,
    prospectiveAuthorizedUnitIds,
  );
  const newlyEligibleUnitIds = orderedUnitIds(
    graph,
    new Set([...prospectiveEligibleUnitIds].filter(
      (unitId) => !currentEligibleUnitIds.has(unitId),
    )),
  );
  const unintendedNewlyEligibleUnitIds = newlyEligibleUnitIds.filter(
    (unitId) => unitId !== TARGET_UNIT_ID,
  );
  const withheldMappedLessonIds = graph.lessonMappings
    .filter((mapping) => !prospectiveEligibleUnitIds.has(mapping.unitId))
    .map((mapping) => mapping.lessonId);
  const hsk1Path = runtime.paths.find((path) => path.pathId === "hsk1");
  if (!hsk1Path) throw new Error("Current HSK1 runtime path is missing");

  return {
    fixtureKind: "complete-atomic-unit-shape-only",
    targetUnitId: TARGET_UNIT_ID,
    targetLessonIds: [...handoff.targetBundle.lessonIds],
    atomicLessonCount: handoff.targetBundle.atomicLessonCount,
    unitReleaseDigest: handoff.unitReleaseDigest,
    currentReleaseAuthorizedUnitIds: orderedUnitIds(
      graph,
      currentAuthorizedUnitIds,
    ),
    prospectiveReleaseAuthorizedUnitIds: orderedUnitIds(
      graph,
      prospectiveAuthorizedUnitIds,
    ),
    currentEligibleUnitIds: orderedUnitIds(graph, currentEligibleUnitIds),
    prospectiveEligibleUnitIds: orderedUnitIds(
      graph,
      prospectiveEligibleUnitIds,
    ),
    newlyEligibleUnitIds,
    unintendedNewlyEligibleUnitIds,
    requiredDownstreamUnitStillWithheld:
      !prospectiveEligibleUnitIds.has(REQUIRED_WITHHELD_UNIT_ID),
    requiredDownstreamLessonIdsStillWithheld:
      REQUIRED_WITHHELD_LESSON_IDS.filter(
        (lessonId) => withheldMappedLessonIds.includes(lessonId),
      ),
    allMappedLessonIdsStillWithheld: withheldMappedLessonIds,
    prospectiveHsk1TargetLessonIds: [
      ...hsk1Path.targetLessonIds,
      ...handoff.targetBundle.lessonIds,
    ],
    completionClaim: false,
  };
};

export const loadHsk1UnitPromotionDryRunSources = (
  root = process.cwd(),
) => ({
  root,
  handoffBundle: loadHsk1UnitPromotionHandoffBundle(root),
  runtimeBundle: loadHskRuntimeCatalogBundle(root),
});

export const projectCheckedHsk1UnitPromotionDryRun = async (
  source = loadHsk1UnitPromotionDryRunSources(),
) => {
  await assertValidHsk1UnitPromotionHandoffBundle(source.handoffBundle);
  assertValidHskRuntimeCatalogBundle(source.runtimeBundle);
  const activation = projectHsk1AtomicUnitActivation({ source });
  const atomicUnitComplete =
    activation.atomicLessonCount === 6
    && activation.targetLessonIds.length === 6;
  const targetUnitActivates = exact(
    activation.newlyEligibleUnitIds,
    [TARGET_UNIT_ID],
  );
  const downstreamBoundarySafe =
    activation.unintendedNewlyEligibleUnitIds.length === 0
    && activation.requiredDownstreamUnitStillWithheld
    && exact(
      activation.requiredDownstreamLessonIdsStillWithheld,
      REQUIRED_WITHHELD_LESSON_IDS,
    );
  return {
    schemaVersion: 1,
    reportId: HSK1_UNIT_PROMOTION_DRY_RUN_ID,
    state: "safe-test-projection-real-evidence-blocked",
    policy: POLICY,
    sourceBindings: [
      sourceBinding(
        source.root,
        "atomicUnitHandoff",
        HSK1_UNIT_PROMOTION_HANDOFF_RELATIVE_PATH,
      ),
      sourceBinding(source.root, "curriculumGraph", GRAPH_RELATIVE_PATH),
      sourceBinding(
        source.root,
        "unitReleasePolicy",
        HSK_RUNTIME_UNIT_RELEASE_POLICY_RELATIVE_PATH,
      ),
      sourceBinding(
        source.root,
        "runtimeCatalog",
        HSK_RUNTIME_CATALOG_RELATIVE_PATH,
      ),
    ],
    result: {
      atomicUnitComplete,
      targetUnitActivates,
      downstreamBoundarySafe,
      testProjectionSafe:
        atomicUnitComplete && targetUnitActivates && downstreamBoundarySafe,
      realReviewReceiptsPresent: false,
      realReviewedAudioPresent: false,
      realRuntimePackagePresent: false,
      realPromotionReceiptPresent: false,
      importAuthorized: false,
      activation,
    },
    claims: {
      humanReviewPresent: false,
      reviewedAudioPresent: false,
      runtimePackagePresent: false,
      promotionReceiptPresent: false,
      unitReleasePolicyMutated: false,
      runtimeMutated: false,
      learnerContentExposed: false,
      completionGranted: false,
      masteryGranted: false,
    },
  };
};

export const validateHsk1UnitPromotionDryRunBundle = async ({
  source,
  report,
}) => {
  const errors = [];
  let expected;
  try {
    expected = await projectCheckedHsk1UnitPromotionDryRun(source);
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
    || report.reportId !== HSK1_UNIT_PROMOTION_DRY_RUN_ID
    || report.state !== "safe-test-projection-real-evidence-blocked"
    || !isRecord(report.policy)
    || !Array.isArray(report.sourceBindings)
    || !isRecord(report.result)
    || !isRecord(report.claims)
  ) {
    errors.push("HSK1 atomic unit promotion dry-run shape is invalid");
  }
  if (
    Object.entries(POLICY).some(
      ([key, value]) => report?.policy?.[key] !== value,
    )
    || Object.values(report?.claims ?? {}).some((value) => value !== false)
    || report?.result?.testProjectionSafe !== true
    || report?.result?.importAuthorized !== false
  ) {
    errors.push("HSK1 atomic unit promotion dry-run is not fail-closed");
  }
  if (!exact(report, expected)) {
    errors.push(
      "HSK1 atomic unit promotion dry-run does not match exact sources",
    );
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: {
      atomicLessons: expected.result.activation.atomicLessonCount,
      currentReleaseAuthorizedUnits:
        expected.result.activation.currentReleaseAuthorizedUnitIds.length,
      prospectiveReleaseAuthorizedUnits:
        expected.result.activation.prospectiveReleaseAuthorizedUnitIds.length,
      newlyEligibleUnits:
        expected.result.activation.newlyEligibleUnitIds.length,
      unintendedUnits:
        expected.result.activation.unintendedNewlyEligibleUnitIds.length,
      downstreamLessonsStillWithheld:
        expected.result.activation
          .requiredDownstreamLessonIdsStillWithheld.length,
      testProjectionSafe: expected.result.testProjectionSafe,
      importAuthorized: expected.result.importAuthorized,
    },
  };
};

export const assertValidHsk1UnitPromotionDryRunBundle = async (bundle) => {
  const result = await validateHsk1UnitPromotionDryRunBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK1 atomic unit promotion dry-run:\n- ${
        result.errors.join("\n- ")
      }`,
    );
  }
  return result;
};

export const loadHsk1UnitPromotionDryRunBundle = (
  root = process.cwd(),
) => ({
  source: loadHsk1UnitPromotionDryRunSources(root),
  reportPath: resolve(root, HSK1_UNIT_PROMOTION_DRY_RUN_RELATIVE_PATH),
  report: JSON.parse(readFileSync(
    resolve(root, HSK1_UNIT_PROMOTION_DRY_RUN_RELATIVE_PATH),
    "utf8",
  )),
});
