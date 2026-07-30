import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalJson, sha256Json } from "./governance.mjs";
import {
  assertValidHsk1LessonPromotionHandoffBundle,
  HSK1_LESSON_PROMOTION_HANDOFF_RELATIVE_PATH,
  loadHsk1LessonPromotionHandoffBundle,
} from "./hsk1LessonPromotionHandoff.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK1_LESSON_PROMOTION_DRY_RUN_RELATIVE_PATH =
  "content/reports/hsk1-time-place-events-01-numbers-promotion-dry-run.json";
export const HSK1_LESSON_PROMOTION_DRY_RUN_ID =
  "hsk1-time-place-events-01-numbers-promotion-dry-run-2026.07.1";

const GRAPH_RELATIVE_PATH = "content/curriculum/hsk0-4-graph.json";
const RUNTIME_RELATIVE_PATH = "content/runtime/hsk0-4-runtime-catalog.json";
const TARGET_UNIT_ID = "hsk1-time-place-events";
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const EMPTY_REPOSITORY_EVIDENCE = {
  schemaVersion: 1,
  evidenceMode: "repository-real",
  reviewReceipts: [],
  audioAssets: [],
  runtimePackage: null,
  promotionReceipt: null,
};
const POLICY = {
  dryRunOnly: true,
  writesRegistry: false,
  writesRuntimeCatalog: false,
  exposesLearnerContent: false,
  exactHashesRequired: true,
  testFixturesNeverAuthorizeImport: true,
  atomicUnitReleaseRequired: true,
  unintendedDownstreamActivationForbidden: true,
  grantsCompletionOrMastery: false,
};

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (left, right) => canonicalJson(left) === canonicalJson(right);
const duplicateValues = (values) => {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
};
const exactKeys = (value, keys) =>
  isRecord(value)
  && Object.keys(value).length === keys.length
  && keys.every((key) => Object.hasOwn(value, key));

const sourceBinding = (root, id, relativePath) => ({
  id,
  relativePath,
  sha256: fileSha256(resolve(root, relativePath)),
});

const eligibleUnitIds = (graph, mappedUnitIds) => {
  const eligible = new Set();
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const unit of graph.units) {
      if (
        mappedUnitIds.has(unit.unitId)
        && !eligible.has(unit.unitId)
        && unit.prerequisiteUnitIds.every((unitId) => eligible.has(unitId))
      ) {
        eligible.add(unit.unitId);
        expanded = true;
      }
    }
  }
  return eligible;
};

const projectActivation = async ({ root, graph, runtime, handoff, lessonIds }) => {
  const targetPack = handoff.targetBundle;
  const mappedBefore = new Set(
    graph.lessonMappings.map((mapping) => mapping.unitId),
  );
  const eligibleBefore = eligibleUnitIds(graph, mappedBefore);
  const mappedAfter = new Set(mappedBefore);
  mappedAfter.add(TARGET_UNIT_ID);
  const eligibleAfter = eligibleUnitIds(graph, mappedAfter);
  const newlyEligibleUnitIds = graph.units
    .map((unit) => unit.unitId)
    .filter((unitId) => eligibleAfter.has(unitId) && !eligibleBefore.has(unitId));
  const unintendedNewlyEligibleUnitIds = newlyEligibleUnitIds.filter(
    (unitId) => unitId !== TARGET_UNIT_ID,
  );
  const unintendedLessonIds = graph.lessonMappings
    .filter((mapping) => unintendedNewlyEligibleUnitIds.includes(mapping.unitId))
    .map((mapping) => mapping.lessonId);
  const hsk1Path = runtime.paths.find((path) => path.pathId === "hsk1");
  if (!hsk1Path) throw new Error("Current HSK1 runtime path is missing");
  const prospectiveTargetLessonIds = [
    ...hsk1Path.targetLessonIds,
    ...lessonIds,
    ...unintendedLessonIds,
  ];
  const projectionCore = {
    currentEligibleUnitIds: graph.units
      .map((unit) => unit.unitId)
      .filter((unitId) => eligibleBefore.has(unitId)),
    requestedUnitId: targetPack.unitId,
    requestedLessonIds: lessonIds,
    newlyEligibleUnitIds,
    unintendedNewlyEligibleUnitIds,
    unintendedLessonIds,
    prospectiveHsk1TargetLessonIds: prospectiveTargetLessonIds,
    completionClaim: false,
  };
  return {
    ...projectionCore,
    prospectiveCatalogSha256: await sha256Json({
      currentRuntimeCatalogSha256: fileSha256(
        resolve(root, RUNTIME_RELATIVE_PATH),
      ),
      projection: projectionCore,
    }),
  };
};

const expectedUnitLessonIds = (source) => {
  const pack = source.handoffBundle.source.communicativeBundle.collection.packs
    .find((candidate) => candidate.unitId === TARGET_UNIT_ID);
  if (!pack || !Array.isArray(pack.lessons) || pack.lessons.length !== 6) {
    throw new Error(`${TARGET_UNIT_ID} must contain six authored lessons`);
  }
  return pack.lessons.map((lesson) => lesson.lessonId);
};

const validateReviewReceipts = async (handoff, evidence, errors) => {
  const expected = handoff.requiredReviewReceipts;
  const receipts = Array.isArray(evidence.reviewReceipts)
    ? evidence.reviewReceipts
    : [];
  if (duplicateValues(receipts.map((receipt) => `${receipt.batchId}:${receipt.role}`)).length) {
    errors.push("review receipts contain duplicate batch/role slots");
  }
  if (receipts.length !== expected.length) {
    errors.push("all exact attributable review receipts are required");
    return { complete: false, hashes: [] };
  }
  for (const [index, slot] of expected.entries()) {
    const receipt = receipts[index];
    if (!exactKeys(receipt, [
      "batchId",
      "role",
      "targetDigest",
      "evidenceClass",
      "receiptSha256",
    ])) {
      errors.push(`review receipt ${index} shape is invalid`);
      continue;
    }
    const core = {
      batchId: receipt.batchId,
      role: receipt.role,
      targetDigest: receipt.targetDigest,
      evidenceClass: receipt.evidenceClass,
    };
    if (
      receipt.batchId !== slot.batchId
      || receipt.role !== slot.role
      || receipt.targetDigest !== slot.targetDigest
      || receipt.evidenceClass !== (
        evidence.evidenceMode === "test-fixture"
          ? "test-fixture"
          : "human-review-receipt"
      )
      || receipt.receiptSha256 !== await sha256Json(core)
    ) {
      errors.push(`review receipt ${index} does not match its exact slot`);
    }
  }
  return {
    complete: errors.length === 0,
    hashes: receipts.map((receipt) => receipt.receiptSha256),
  };
};

const validateAudioAssets = async (handoff, evidence, errors) => {
  const expected = handoff.targetBundle.audioRequirements;
  const assets = Array.isArray(evidence.audioAssets) ? evidence.audioAssets : [];
  if (duplicateValues(assets.map((asset) => asset.audioTargetId)).length) {
    errors.push("audio evidence contains duplicate targets");
  }
  if (assets.length !== expected.length) {
    errors.push("all reviewed audio assets and rights records are required");
    return { complete: false, hashes: [] };
  }
  for (const [index, requirement] of expected.entries()) {
    const asset = assets[index];
    if (!exactKeys(asset, [
      "audioTargetId",
      "targetKind",
      "sourceTargetSha256",
      "assetId",
      "assetSha256",
      "rightsEvidenceSha256",
      "nativeReviewReceiptSha256",
      "audioRightsReceiptSha256",
      "evidenceClass",
      "recordSha256",
    ])) {
      errors.push(`audio asset ${index} shape is invalid`);
      continue;
    }
    const core = {
      audioTargetId: asset.audioTargetId,
      targetKind: asset.targetKind,
      sourceTargetSha256: asset.sourceTargetSha256,
      assetId: asset.assetId,
      assetSha256: asset.assetSha256,
      rightsEvidenceSha256: asset.rightsEvidenceSha256,
      nativeReviewReceiptSha256: asset.nativeReviewReceiptSha256,
      audioRightsReceiptSha256: asset.audioRightsReceiptSha256,
      evidenceClass: asset.evidenceClass,
    };
    if (
      asset.audioTargetId !== requirement.audioTargetId
      || asset.targetKind !== requirement.targetKind
      || asset.sourceTargetSha256 !== requirement.sourceTargetSha256
      || typeof asset.assetId !== "string"
      || asset.assetId.length === 0
      || [
        asset.assetSha256,
        asset.rightsEvidenceSha256,
        asset.nativeReviewReceiptSha256,
        asset.audioRightsReceiptSha256,
      ].some((digest) => !DIGEST_PATTERN.test(digest ?? ""))
      || asset.evidenceClass !== (
        evidence.evidenceMode === "test-fixture"
          ? "test-fixture"
          : "reviewed-licensed-audio"
      )
      || asset.recordSha256 !== await sha256Json(core)
    ) {
      errors.push(`audio asset ${index} does not match its exact target`);
    }
  }
  return {
    complete: errors.length === 0,
    hashes: assets.map((asset) => asset.assetSha256),
  };
};

const validateRuntimePackage = async (handoff, evidence, errors) => {
  const runtimePackage = evidence.runtimePackage;
  if (!isRecord(runtimePackage)) {
    errors.push("versioned runtime package binding is required");
    return { complete: false, hash: null };
  }
  if (!exactKeys(runtimePackage, [
    "schemaVersion",
    "targetContentVersion",
    "targetBundleSha256",
    "lessonIds",
    "releaseState",
    "learnerVisible",
    "evidenceClass",
    "packageSha256",
  ])) {
    errors.push("runtime package binding shape is invalid");
    return { complete: false, hash: null };
  }
  const core = {
    schemaVersion: runtimePackage.schemaVersion,
    targetContentVersion: runtimePackage.targetContentVersion,
    targetBundleSha256: runtimePackage.targetBundleSha256,
    lessonIds: runtimePackage.lessonIds,
    releaseState: runtimePackage.releaseState,
    learnerVisible: runtimePackage.learnerVisible,
    evidenceClass: runtimePackage.evidenceClass,
  };
  if (
    runtimePackage.schemaVersion !== 1
    || runtimePackage.targetContentVersion
      !== handoff.plannedImport.targetContentVersion
    || runtimePackage.targetBundleSha256 !== handoff.targetBundleSha256
    || !exact(runtimePackage.lessonIds, [handoff.targetBundle.lessonId])
    || runtimePackage.releaseState !== "review"
    || runtimePackage.learnerVisible !== false
    || runtimePackage.evidenceClass !== (
      evidence.evidenceMode === "test-fixture"
        ? "test-fixture"
        : "validated-runtime-package"
    )
    || runtimePackage.packageSha256 !== await sha256Json(core)
  ) {
    errors.push("runtime package binding does not match the exact handoff");
  }
  return {
    complete: errors.length === 0,
    hash: runtimePackage.packageSha256,
  };
};

const validatePromotionReceipt = async ({
  source,
  handoff,
  evidence,
  activation,
  reviewHashes,
  audioHashes,
  runtimePackageHash,
  errors,
}) => {
  const receipt = evidence.promotionReceipt;
  if (!isRecord(receipt)) {
    errors.push("promotion receipt binding is required");
    return false;
  }
  if (!exactKeys(receipt, [
    "schemaVersion",
    "receiptKind",
    "evidenceClass",
    "handoffSha256",
    "targetBundleSha256",
    "runtimePackageSha256",
    "runtimeCatalogBeforeSha256",
    "runtimeCatalogAfterSha256",
    "reviewReceiptSha256s",
    "audioAssetSha256s",
    "importIdempotencyKey",
    "receiptSha256",
  ])) {
    errors.push("promotion receipt shape is invalid");
    return false;
  }
  const core = {
    schemaVersion: receipt.schemaVersion,
    receiptKind: receipt.receiptKind,
    evidenceClass: receipt.evidenceClass,
    handoffSha256: receipt.handoffSha256,
    targetBundleSha256: receipt.targetBundleSha256,
    runtimePackageSha256: receipt.runtimePackageSha256,
    runtimeCatalogBeforeSha256: receipt.runtimeCatalogBeforeSha256,
    runtimeCatalogAfterSha256: receipt.runtimeCatalogAfterSha256,
    reviewReceiptSha256s: receipt.reviewReceiptSha256s,
    audioAssetSha256s: receipt.audioAssetSha256s,
    importIdempotencyKey: receipt.importIdempotencyKey,
  };
  if (
    receipt.schemaVersion !== handoff.plannedImport.receiptSchemaVersion
    || receipt.receiptKind !== handoff.plannedImport.receiptKind
    || receipt.evidenceClass !== (
      evidence.evidenceMode === "test-fixture"
        ? "test-fixture"
        : "repository-real"
    )
    || receipt.handoffSha256 !== fileSha256(source.handoffBundle.handoffPath)
    || receipt.targetBundleSha256 !== handoff.targetBundleSha256
    || receipt.runtimePackageSha256 !== runtimePackageHash
    || receipt.runtimeCatalogBeforeSha256
      !== fileSha256(resolve(source.root, RUNTIME_RELATIVE_PATH))
    || receipt.runtimeCatalogAfterSha256 !== activation.prospectiveCatalogSha256
    || !exact(receipt.reviewReceiptSha256s, reviewHashes)
    || !exact(receipt.audioAssetSha256s, audioHashes)
    || receipt.importIdempotencyKey !== handoff.plannedImport.importIdempotencyKey
    || receipt.receiptSha256 !== await sha256Json(core)
  ) {
    errors.push("promotion receipt does not bind the exact dry-run inputs");
  }
  return errors.length === 0;
};

export const loadHsk1LessonPromotionDryRunSources = (
  root = process.cwd(),
) => ({
  root,
  handoffBundle: loadHsk1LessonPromotionHandoffBundle(root),
  graph: JSON.parse(readFileSync(resolve(root, GRAPH_RELATIVE_PATH), "utf8")),
  runtime: JSON.parse(readFileSync(resolve(root, RUNTIME_RELATIVE_PATH), "utf8")),
});

export const evaluateHsk1LessonPromotionDryRun = async ({
  source,
  evidence = EMPTY_REPOSITORY_EVIDENCE,
}) => {
  await assertValidHsk1LessonPromotionHandoffBundle(source.handoffBundle);
  const handoff = source.handoffBundle.handoff;
  if (
    !exactKeys(evidence, [
      "schemaVersion",
      "evidenceMode",
      "reviewReceipts",
      "audioAssets",
      "runtimePackage",
      "promotionReceipt",
    ])
    || evidence.schemaVersion !== 1
    || !["repository-real", "test-fixture"].includes(evidence.evidenceMode)
  ) {
    throw new Error("promotion dry-run evidence schema is invalid");
  }
  const expectedLessons = expectedUnitLessonIds(source);
  const requestedLessonIds = [handoff.targetBundle.lessonId];
  const activation = await projectActivation({
    root: source.root,
    graph: source.graph,
    runtime: source.runtime,
    handoff,
    lessonIds: requestedLessonIds,
  });
  const evidenceErrors = [];
  const review = await validateReviewReceipts(handoff, evidence, evidenceErrors);
  const audio = await validateAudioAssets(handoff, evidence, evidenceErrors);
  const runtimePackage = await validateRuntimePackage(
    handoff,
    evidence,
    evidenceErrors,
  );
  await validatePromotionReceipt({
    source,
    handoff,
    evidence,
    activation,
    reviewHashes: review.hashes,
    audioHashes: audio.hashes,
    runtimePackageHash: runtimePackage.hash,
    errors: evidenceErrors,
  });
  const missingUnitLessonIds = expectedLessons.filter(
    (lessonId) => !requestedLessonIds.includes(lessonId),
  );
  const safetyErrors = [];
  if (missingUnitLessonIds.length > 0) {
    safetyErrors.push("atomic six-lesson unit release is incomplete");
  }
  if (activation.unintendedNewlyEligibleUnitIds.length > 0) {
    safetyErrors.push("promotion would activate unintended downstream units");
  }
  if (activation.unintendedLessonIds.length > 0) {
    safetyErrors.push("promotion would expose unintended downstream lessons");
  }
  const evidenceContractSatisfied = evidenceErrors.length === 0;
  const prerequisiteSafe = safetyErrors.length === 0;
  const fixtureOnly = evidence.evidenceMode === "test-fixture";
  return {
    evidenceMode: evidence.evidenceMode,
    evidenceContractSatisfied,
    prerequisiteSafe,
    fixtureOnly,
    importAuthorized:
      evidenceContractSatisfied && prerequisiteSafe && !fixtureOnly,
    evidenceErrors,
    safetyErrors,
    unitBoundary: {
      expectedLessonIds: expectedLessons,
      requestedLessonIds,
      missingLessonIds: missingUnitLessonIds,
      atomicUnitComplete: missingUnitLessonIds.length === 0,
    },
    activation,
    evidenceSummary: {
      requiredReviewReceipts: handoff.requiredReviewReceipts.length,
      suppliedReviewReceipts: evidence.reviewReceipts.length,
      requiredAudioAssets: handoff.targetBundle.audioRequirements.length,
      suppliedAudioAssets: evidence.audioAssets.length,
      runtimePackagePresent: isRecord(evidence.runtimePackage),
      promotionReceiptPresent: isRecord(evidence.promotionReceipt),
    },
  };
};

export const buildHsk1LessonPromotionTestEvidence = async (source) => {
  await assertValidHsk1LessonPromotionHandoffBundle(source.handoffBundle);
  const handoff = source.handoffBundle.handoff;
  const evidence = {
    schemaVersion: 1,
    evidenceMode: "test-fixture",
    reviewReceipts: [],
    audioAssets: [],
    runtimePackage: null,
    promotionReceipt: null,
  };
  for (const slot of handoff.requiredReviewReceipts) {
    const core = {
      batchId: slot.batchId,
      role: slot.role,
      targetDigest: slot.targetDigest,
      evidenceClass: "test-fixture",
    };
    evidence.reviewReceipts.push({
      ...core,
      receiptSha256: await sha256Json(core),
    });
  }
  for (const requirement of handoff.targetBundle.audioRequirements) {
    const fixtureBase = {
      audioTargetId: requirement.audioTargetId,
      sourceTargetSha256: requirement.sourceTargetSha256,
    };
    const core = {
      audioTargetId: requirement.audioTargetId,
      targetKind: requirement.targetKind,
      sourceTargetSha256: requirement.sourceTargetSha256,
      assetId: `${requirement.audioTargetId}:fixture`,
      assetSha256: await sha256Json({ ...fixtureBase, kind: "asset" }),
      rightsEvidenceSha256: await sha256Json({ ...fixtureBase, kind: "rights" }),
      nativeReviewReceiptSha256: await sha256Json({
        ...fixtureBase,
        kind: "native-review",
      }),
      audioRightsReceiptSha256: await sha256Json({
        ...fixtureBase,
        kind: "audio-rights-review",
      }),
      evidenceClass: "test-fixture",
    };
    evidence.audioAssets.push({
      ...core,
      recordSha256: await sha256Json(core),
    });
  }
  const packageCore = {
    schemaVersion: 1,
    targetContentVersion: handoff.plannedImport.targetContentVersion,
    targetBundleSha256: handoff.targetBundleSha256,
    lessonIds: [handoff.targetBundle.lessonId],
    releaseState: "review",
    learnerVisible: false,
    evidenceClass: "test-fixture",
  };
  evidence.runtimePackage = {
    ...packageCore,
    packageSha256: await sha256Json(packageCore),
  };
  const activation = await projectActivation({
    root: source.root,
    graph: source.graph,
    runtime: source.runtime,
    handoff,
    lessonIds: packageCore.lessonIds,
  });
  const receiptCore = {
    schemaVersion: handoff.plannedImport.receiptSchemaVersion,
    receiptKind: handoff.plannedImport.receiptKind,
    evidenceClass: "test-fixture",
    handoffSha256: fileSha256(source.handoffBundle.handoffPath),
    targetBundleSha256: handoff.targetBundleSha256,
    runtimePackageSha256: evidence.runtimePackage.packageSha256,
    runtimeCatalogBeforeSha256: fileSha256(
      resolve(source.root, RUNTIME_RELATIVE_PATH),
    ),
    runtimeCatalogAfterSha256: activation.prospectiveCatalogSha256,
    reviewReceiptSha256s: evidence.reviewReceipts.map(
      (receipt) => receipt.receiptSha256,
    ),
    audioAssetSha256s: evidence.audioAssets.map((asset) => asset.assetSha256),
    importIdempotencyKey: handoff.plannedImport.importIdempotencyKey,
  };
  evidence.promotionReceipt = {
    ...receiptCore,
    receiptSha256: await sha256Json(receiptCore),
  };
  return evidence;
};

export const projectCheckedHsk1LessonPromotionDryRun = async (
  source = loadHsk1LessonPromotionDryRunSources(),
) => {
  const result = await evaluateHsk1LessonPromotionDryRun({ source });
  return {
    schemaVersion: 1,
    reportId: HSK1_LESSON_PROMOTION_DRY_RUN_ID,
    state: "blocked",
    policy: POLICY,
    sourceBindings: [
      sourceBinding(
        source.root,
        "handoff",
        HSK1_LESSON_PROMOTION_HANDOFF_RELATIVE_PATH,
      ),
      sourceBinding(source.root, "curriculumGraph", GRAPH_RELATIVE_PATH),
      sourceBinding(source.root, "runtimeCatalog", RUNTIME_RELATIVE_PATH),
    ],
    result,
    claims: {
      humanReviewPresent: false,
      reviewedAudioPresent: false,
      runtimePackagePresent: false,
      promotionReceiptPresent: false,
      runtimeMutated: false,
      learnerContentExposed: false,
      completionGranted: false,
      masteryGranted: false,
    },
  };
};

export const validateHsk1LessonPromotionDryRunBundle = async ({
  source,
  report,
}) => {
  const errors = [];
  let expected;
  try {
    expected = await projectCheckedHsk1LessonPromotionDryRun(source);
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
    || report.reportId !== HSK1_LESSON_PROMOTION_DRY_RUN_ID
    || report.state !== "blocked"
    || !isRecord(report.policy)
    || !Array.isArray(report.sourceBindings)
    || !isRecord(report.result)
    || !isRecord(report.claims)
  ) {
    errors.push("HSK1 lesson promotion dry-run report shape is invalid");
  }
  if (
    Object.entries(POLICY).some(([key, value]) => report?.policy?.[key] !== value)
    || Object.values(report?.claims ?? {}).some((value) => value !== false)
    || report?.result?.importAuthorized !== false
  ) {
    errors.push("HSK1 lesson promotion dry-run is not fail-closed");
  }
  if (!exact(report, expected)) {
    errors.push("HSK1 lesson promotion dry-run does not match exact sources");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: {
      evidenceContractSatisfied: expected.result.evidenceContractSatisfied,
      prerequisiteSafe: expected.result.prerequisiteSafe,
      importAuthorized: expected.result.importAuthorized,
      missingUnitLessons: expected.result.unitBoundary.missingLessonIds.length,
      unintendedUnits:
        expected.result.activation.unintendedNewlyEligibleUnitIds.length,
      unintendedLessons: expected.result.activation.unintendedLessonIds.length,
    },
  };
};

export const assertValidHsk1LessonPromotionDryRunBundle = async (bundle) => {
  const result = await validateHsk1LessonPromotionDryRunBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK1 lesson promotion dry-run:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};

export const loadHsk1LessonPromotionDryRunBundle = (
  root = process.cwd(),
) => ({
  source: loadHsk1LessonPromotionDryRunSources(root),
  reportPath: resolve(root, HSK1_LESSON_PROMOTION_DRY_RUN_RELATIVE_PATH),
  report: JSON.parse(readFileSync(
    resolve(root, HSK1_LESSON_PROMOTION_DRY_RUN_RELATIVE_PATH),
    "utf8",
  )),
});
