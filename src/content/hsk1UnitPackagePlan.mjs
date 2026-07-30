import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalJson, sha256Json } from "./governance.mjs";
import {
  assertValidHsk1UnitEvidenceReadinessBundle,
  HSK1_UNIT_EVIDENCE_READINESS_RELATIVE_PATH,
  loadHsk1UnitEvidenceReadinessBundle,
} from "./hsk1UnitEvidenceIntake.mjs";
import {
  assertValidHsk1UnitRuntimeProjectionBundle,
  HSK1_UNIT_RUNTIME_PROJECTION_RELATIVE_PATH,
  loadHsk1UnitRuntimeProjectionBundle,
} from "./hsk1UnitRuntimeProjection.mjs";
import {
  assertValidHsk1UnitRuntimeActivityProjectionBundle,
  HSK1_UNIT_RUNTIME_ACTIVITY_PROJECTION_RELATIVE_PATH,
  loadHsk1UnitRuntimeActivityProjectionBundle,
} from "./hsk1UnitRuntimeActivityProjection.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK1_UNIT_PACKAGE_PLAN_RELATIVE_PATH =
  "content/reports/hsk1-time-place-events-package-plan.json";
export const HSK1_UNIT_PACKAGE_PLAN_ID =
  "hsk1-time-place-events-package-plan-2026.07.1";

const UNIT_ID = "hsk1-time-place-events";
const BASE_PACKAGE_VERSION = "foundation-2026.07.6";
const TARGET_PACKAGE_VERSION = "foundation-2026.07.7";
const TARGET_PACKAGE_RELATIVE_PATH =
  `content/packages/${TARGET_PACKAGE_VERSION}`;
const PROMOTION_RECEIPT_RELATIVE_PATH =
  "content/review/hsk1-time-place-events-promotion-receipt.json";
const REGISTRY_RELATIVE_PATH = "content/registry.json";
const BASE_MANIFEST_RELATIVE_PATH =
  `content/packages/${BASE_PACKAGE_VERSION}/manifest.json`;
const BASE_ITEM_CATALOG_RELATIVE_PATH =
  `content/packages/${BASE_PACKAGE_VERSION}/item-catalog.json`;
const BASE_RUNTIME_CATALOG_RELATIVE_PATH =
  `content/packages/${BASE_PACKAGE_VERSION}/runtime-catalog.json`;
const RELEASE_POLICY_RELATIVE_PATH =
  "content/curriculum/hsk0-4-unit-release-policy.json";
const VOCABULARY_SOURCE_RELATIVE_PATH =
  "content/drafts/hsk1-vocabulary-2026.07.28.json";
const RUNTIME_TYPES_RELATIVE_PATH = "src/content/types.ts";
const RUNTIME_PROJECTION_RELATIVE_PATH =
  "src/content/runtimeCatalogProjection.ts";
const SAFE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u;

const POLICY = {
  planningOnly: true,
  mutatesRegistryOrPackage: false,
  checkedEvidenceMustBeRepositoryReal: true,
  testFixturesNeverAuthorizeMaterialization: true,
  runtimePayloadsMustBeExplicitAndReviewed: true,
  authoringIdsMayRequireRuntimeIdProjection: true,
  sourceAmbiguitiesCannotBeGuessed: true,
  packageGovernanceReviewsAreSeparateFromDraftReviewSlots: true,
  unitAuthorizationFollowsImmutablePackageValidation: true,
  grantsReleaseCompletionOrMastery: false,
};

const readJson = (root, relativePath) => JSON.parse(readFileSync(
  resolve(root, relativePath),
  "utf8",
));
const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (left, right) => canonicalJson(left) === canonicalJson(right);
const sourceBinding = (root, id, relativePath) => ({
  id,
  relativePath,
  sha256: fileSha256(resolve(root, relativePath)),
});
const unique = (values) => [...new Set(values)];
const runtimeLessonId = (authoringId) => authoringId.replaceAll(":", "-");

export const loadHsk1UnitPackagePlanSources = (
  root = process.cwd(),
) => ({
  root,
  evidenceBundle: loadHsk1UnitEvidenceReadinessBundle(root),
  runtimeProjectionBundle: loadHsk1UnitRuntimeProjectionBundle(root),
  runtimeActivityProjectionBundle:
    loadHsk1UnitRuntimeActivityProjectionBundle(root),
  registry: readJson(root, REGISTRY_RELATIVE_PATH),
  baseManifest: readJson(root, BASE_MANIFEST_RELATIVE_PATH),
  baseItemCatalog: readJson(root, BASE_ITEM_CATALOG_RELATIVE_PATH),
  baseRuntimeCatalog: readJson(root, BASE_RUNTIME_CATALOG_RELATIVE_PATH),
  releasePolicy: readJson(root, RELEASE_POLICY_RELATIVE_PATH),
  vocabularySource: readJson(root, VOCABULARY_SOURCE_RELATIVE_PATH),
});

const buildLexemeProjectionAudit = ({ packet, vocabularySource }) => {
  const targets = packet.contentTargets.filter(
    (target) => target.targetType === "vocabulary-draft",
  );
  const targetById = new Map();
  for (const target of targets) {
    if (targetById.has(target.targetId)) {
      throw new Error(`Duplicate unit vocabulary target ${target.targetId}`);
    }
    targetById.set(target.targetId, target);
  }
  const sourceById = new Map(vocabularySource.entries.map(
    (entry) => [entry.officialId, entry],
  ));
  const dialogueTurns = packet.contentTargets
    .filter((target) => target.targetType === "dialogue-turn")
    .map((target) => target.payload);
  const traditionalAmbiguityIds = [];
  const pronunciationReconciliationIds = [];
  const dialogueExampleCandidateIds = [];
  const missingDialogueExampleIds = [];
  for (const [officialId, target] of targetById) {
    const source = sourceById.get(officialId);
    if (!source || source.simplified !== target.payload.simplified) {
      throw new Error(`${officialId} vocabulary source binding is missing`);
    }
    const traditionalCandidates = unique(
      source.sourceMatches.map((match) => match.traditional),
    );
    if (traditionalCandidates.length !== 1) {
      traditionalAmbiguityIds.push(officialId);
    }
    if (source.editorial.issueCodes.includes("source-pronunciation-drift")) {
      pronunciationReconciliationIds.push(officialId);
    }
    if (dialogueTurns.some(
      (turn) => turn.hanzi.includes(target.payload.simplified),
    )) {
      dialogueExampleCandidateIds.push(officialId);
    } else {
      missingDialogueExampleIds.push(officialId);
    }
  }
  const ids = [...targetById.keys()];
  return {
    requiredLexemePayloads: ids.length,
    finalizedLexemePayloads: 0,
    safeRuntimeItemIds: ids.filter((id) => SAFE_ID_PATTERN.test(id)).length,
    fieldReadiness: {
      simplifiedDrafts: ids.length,
      pinyinDrafts: ids.length,
      vietnameseMeaningDrafts: ids.length,
      partOfSpeechDrafts: ids.length,
      deterministicHskLevelValues: ids.length,
      unambiguousTraditionalSourceCandidates:
        ids.length - traditionalAmbiguityIds.length,
      traditionalEditorialDecisionIds: traditionalAmbiguityIds,
      sourcePronunciationReconciliationIds:
        pronunciationReconciliationIds,
      surfaceMatchDialogueExampleCandidateIds:
        dialogueExampleCandidateIds,
      missingExampleTripleIds: missingDialogueExampleIds,
      authoredTagSets: 0,
      missingTagSetIds: ids,
    },
    unresolvedRuntimeFields: [
      "traditional",
      "pinyinNumbered",
      "example",
      "examplePinyin",
      "exampleMeaning",
      "tags",
    ],
    projectionReviewRequired: true,
  };
};

const buildLessonProjectionAudit = (packet) => {
  const lessons = packet.contentTargets.filter(
    (target) => target.targetType === "lesson-blueprint",
  );
  const authoringIds = lessons.map((target) => target.targetId);
  const unsafeAuthoringIds = authoringIds.filter(
    (id) => !SAFE_ID_PATTERN.test(id),
  );
  const proposedMappings = authoringIds.map((authoringId) => ({
    authoringId,
    runtimeId: runtimeLessonId(authoringId),
    authorized: false,
  }));
  const runtimeIds = proposedMappings.map((mapping) => mapping.runtimeId);
  if (
    new Set(authoringIds).size !== authoringIds.length
    || new Set(runtimeIds).size !== runtimeIds.length
    || runtimeIds.some((id) => !SAFE_ID_PATTERN.test(id))
  ) {
    throw new Error("Proposed HSK1 runtime lesson IDs are unsafe or duplicated");
  }
  return {
    requiredLessonPayloads: lessons.length,
    finalizedLessonPayloads: 0,
    unsafeAuthoringLessonIds: unsafeAuthoringIds,
    proposedRuntimeIdMappings: proposedMappings,
    fieldReadiness: {
      unitIdDrafts: lessons.length,
      vietnameseTitleDrafts: lessons.length,
      vietnameseObjectiveDrafts: lessons.length,
      wordIdPartitions: lessons.length,
      prerequisitePartitions: lessons.length,
      chineseTitles: 0,
      durationMinutes: 0,
      xpSupportValues: 0,
      skillVectors: 0,
    },
    unresolvedRuntimeFields: [
      "runtimeId",
      "chineseTitle",
      "minutes",
      "xp",
      "skills",
    ],
    projectionReviewRequired: true,
  };
};

export const projectCheckedHsk1UnitPackagePlan = async (
  source = loadHsk1UnitPackagePlanSources(),
) => {
  const evidenceValidation =
    await assertValidHsk1UnitEvidenceReadinessBundle(source.evidenceBundle);
  const runtimeProjectionValidation =
    await assertValidHsk1UnitRuntimeProjectionBundle(
      source.runtimeProjectionBundle,
    );
  const runtimeActivityProjectionValidation =
    await assertValidHsk1UnitRuntimeActivityProjectionBundle(
      source.runtimeActivityProjectionBundle,
    );
  const evidence = source.evidenceBundle.report;
  const packet = source.evidenceBundle.source.packetBundle.packet;
  const handoff = source.evidenceBundle.source.handoffBundle.handoff;
  const runtimeProjectionDraft = source.runtimeProjectionBundle.projection;
  const runtimeActivityProjectionDraft =
    source.runtimeActivityProjectionBundle.projection;
  if (
    source.registry.currentContentVersion !== BASE_PACKAGE_VERSION
    || source.baseManifest.packageId !== BASE_PACKAGE_VERSION
    || source.baseManifest.contentVersion !== BASE_PACKAGE_VERSION
    || source.baseItemCatalog.contentVersion !== BASE_PACKAGE_VERSION
    || source.baseRuntimeCatalog.contentVersion !== BASE_PACKAGE_VERSION
  ) {
    throw new Error("HSK1 package plan base package identity has drifted");
  }
  const registryBase = source.registry.packages.find(
    (entry) => entry.packageId === BASE_PACKAGE_VERSION,
  );
  if (
    !registryBase
    || registryBase.manifestSha256 !== await sha256Json(source.baseManifest)
  ) {
    throw new Error("HSK1 package plan registry binding has drifted");
  }
  if (
    packet.unitReleaseDigest !== handoff.unitReleaseDigest
    || handoff.targetBundle.unitId !== UNIT_ID
    || handoff.counts.lessons !== 6
    || handoff.counts.vocabularyDrafts !== 81
    || runtimeProjectionDraft.unitId !== UNIT_ID
    || runtimeProjectionDraft.targetPackageVersion !== TARGET_PACKAGE_VERSION
    || runtimeActivityProjectionDraft.unitId !== UNIT_ID
    || runtimeActivityProjectionDraft.targetPackageVersion
      !== TARGET_PACKAGE_VERSION
  ) {
    throw new Error("HSK1 package plan atomic handoff has drifted");
  }
  const targetPackagePresent = existsSync(
    resolve(source.root, TARGET_PACKAGE_RELATIVE_PATH),
  );
  const promotionReceiptPresent = existsSync(
    resolve(source.root, PROMOTION_RECEIPT_RELATIVE_PATH),
  );
  const unitAuthorization = source.releasePolicy.units.find(
    (unit) => unit.unitId === UNIT_ID,
  );
  const lexemeProjection = buildLexemeProjectionAudit({
    packet,
    vocabularySource: source.vocabularySource,
  });
  const lessonProjection = buildLessonProjectionAudit(packet);
  const draftedCoreCatalogItems =
    runtimeProjectionValidation.summary.runtimeCatalogItems;
  const finalizedCoreCatalogItems =
    runtimeProjectionValidation.summary.finalizedPayloads;
  const draftedActivityPayloads =
    runtimeActivityProjectionValidation.summary.runtimePayloads;
  const finalizedActivityPayloads =
    runtimeActivityProjectionValidation.summary.finalizedPayloads;
  const draftedRuntimePayloads =
    draftedCoreCatalogItems + draftedActivityPayloads;
  const finalizedRuntimePayloads =
    finalizedCoreCatalogItems + finalizedActivityPayloads;
  const projectionReady =
    draftedRuntimePayloads === 425 && finalizedRuntimePayloads === 425;
  const blockers = [];
  if (!evidence.result.evidenceComplete) {
    blockers.push("REAL_REVIEW_AND_AUDIO_EVIDENCE_INCOMPLETE");
  }
  if (!projectionReady) {
    blockers.push("REVIEWED_RUNTIME_PROJECTION_MISSING");
  }
  blockers.push("CONTENT_OWNER_METADATA_MISSING");
  blockers.push("SOURCE_LICENSE_METADATA_MISSING");
  blockers.push("PACKAGE_GOVERNANCE_APPROVALS_MISSING");
  blockers.push("AUDIO_IMPORT_DESCRIPTOR_MISSING");
  if (!targetPackagePresent) blockers.push("TARGET_PACKAGE_MISSING");
  if (!unitAuthorization) blockers.push("UNIT_RELEASE_AUTHORIZATION_MISSING");
  if (!promotionReceiptPresent) blockers.push("PROMOTION_RECEIPT_MISSING");
  return {
    schemaVersion: 1,
    planId: HSK1_UNIT_PACKAGE_PLAN_ID,
    state: "blocked-before-package-materialization",
    unitId: UNIT_ID,
    policy: POLICY,
    sourceBindings: [
      sourceBinding(
        source.root,
        "evidenceReadiness",
        HSK1_UNIT_EVIDENCE_READINESS_RELATIVE_PATH,
      ),
      sourceBinding(source.root, "registry", REGISTRY_RELATIVE_PATH),
      sourceBinding(source.root, "baseManifest", BASE_MANIFEST_RELATIVE_PATH),
      sourceBinding(
        source.root,
        "baseItemCatalog",
        BASE_ITEM_CATALOG_RELATIVE_PATH,
      ),
      sourceBinding(
        source.root,
        "baseRuntimeCatalog",
        BASE_RUNTIME_CATALOG_RELATIVE_PATH,
      ),
      sourceBinding(
        source.root,
        "unitReleasePolicy",
        RELEASE_POLICY_RELATIVE_PATH,
      ),
      sourceBinding(
        source.root,
        "vocabularySource",
        VOCABULARY_SOURCE_RELATIVE_PATH,
      ),
      sourceBinding(
        source.root,
        "runtimeProjectionDraft",
        HSK1_UNIT_RUNTIME_PROJECTION_RELATIVE_PATH,
      ),
      sourceBinding(
        source.root,
        "runtimeActivityProjectionDraft",
        HSK1_UNIT_RUNTIME_ACTIVITY_PROJECTION_RELATIVE_PATH,
      ),
      sourceBinding(source.root, "runtimeTypes", RUNTIME_TYPES_RELATIVE_PATH),
      sourceBinding(
        source.root,
        "runtimeProjection",
        RUNTIME_PROJECTION_RELATIVE_PATH,
      ),
    ],
    packageIdentity: {
      basePackageVersion: BASE_PACKAGE_VERSION,
      targetPackageVersion: TARGET_PACKAGE_VERSION,
      targetPackageRelativePath: TARGET_PACKAGE_RELATIVE_PATH,
      authoringReleaseVersion: handoff.plannedImport.targetContentVersion,
      unitReleaseDigest: handoff.unitReleaseDigest,
      importIdempotencyKey: handoff.plannedImport.importIdempotencyKey,
    },
    evidence: {
      mode: evidence.result.evidenceMode,
      requiredReviewSlots: evidenceValidation.summary.requiredReviewSlots,
      approvedReviewSlots: evidenceValidation.summary.approvedReviewSlots,
      requiredAudioTargets: evidenceValidation.summary.requiredAudioTargets,
      reviewedAudioTargets: evidenceValidation.summary.reviewedAudioTargets,
      complete: evidenceValidation.summary.evidenceComplete,
      readyForPackage: evidenceValidation.summary.readyForPackage,
    },
    runtimeProjection: {
      requiredRuntimePayloads: 425,
      draftedRuntimePayloads,
      finalizedRuntimePayloads,
      core: {
        requiredCatalogItems: 87,
        draftedCatalogItems: draftedCoreCatalogItems,
        finalizedCatalogItems: finalizedCoreCatalogItems,
        projectionId: runtimeProjectionDraft.projectionId,
        projectionSha256: runtimeProjectionDraft.projectionSha256,
      },
      nonCore: {
        requiredPayloads: 338,
        draftedPayloads: draftedActivityPayloads,
        finalizedPayloads: finalizedActivityPayloads,
        projectionId: runtimeActivityProjectionDraft.projectionId,
        projectionSha256: runtimeActivityProjectionDraft.projectionSha256,
        dialoguePayloads:
          runtimeActivityProjectionValidation.summary.dialoguePayloads,
        activityPayloads:
          runtimeActivityProjectionValidation.summary.activityPayloads,
        knowledgePayloads:
          runtimeActivityProjectionValidation.summary.knowledgePayloads,
      },
      reviewBatches:
        runtimeProjectionValidation.summary.reviewBatches
        + runtimeActivityProjectionValidation.summary.reviewBatches,
      requiredReviewSlots:
        runtimeProjectionValidation.summary.requiredReviewSlots
        + runtimeActivityProjectionValidation.summary.requiredReviewSlots,
      approvals:
        runtimeProjectionValidation.summary.approvals
        + runtimeActivityProjectionValidation.summary.approvals,
      sourceGapAudit: {
        lexemes: lexemeProjection,
        lessons: lessonProjection,
      },
      draftCoverage: {
        lexemes: runtimeProjectionValidation.summary.lexemes,
        lessons: runtimeProjectionValidation.summary.lessons,
        safeRuntimeLexemeIds:
          runtimeProjectionValidation.summary.safeRuntimeLexemeIds,
        safeRuntimeLessonIds:
          runtimeProjectionValidation.summary.safeRuntimeLessonIds,
        traditionalDecisionsDrafted:
          runtimeProjectionValidation.summary.traditionalEditorialDecisions,
        numberedPinyinOverridesDrafted:
          runtimeProjectionValidation.summary.numberedPinyinOverrides,
        exampleTriplesDrafted:
          runtimeProjectionValidation.summary.newExampleDrafts
          + runtimeProjectionValidation.summary.dialogueExampleCandidates,
        tagSetsDrafted: runtimeProjectionValidation.summary.lexemes,
      },
      representability:
        runtimeActivityProjectionDraft.runtimeRepresentability,
    },
    governance: {
      requiredPackageReviewRoles: [
        "content-owner",
        "native-linguistic",
        "source-license",
        "audio-rights",
      ],
      attributablePackageReviewApprovals: 0,
      contentOwnerMetadataPresent: false,
      sourceLicenseMetadataPresent: false,
      audioImportDescriptorPresent: false,
      draftReviewReceiptsDoNotSubstituteForPackageGovernance: true,
    },
    materialization: {
      targetPackagePresent,
      unitReleaseAuthorizationPresent: Boolean(unitAuthorization),
      promotionReceiptPresent,
      ready: blockers.length === 0,
      blockers,
    },
    actionsInDependencyOrder: [
      "REVIEW_EXACT_RUNTIME_PROJECTION_AND_RESOLVE_SOURCE_AMBIGUITIES",
      "COLLECT_REAL_81_ROLE_AND_90_AUDIO_EVIDENCE",
      "BIND_CONTENT_OWNER_SOURCE_LICENSE_AND_AUDIO_IMPORT_DESCRIPTOR",
      "CREATE_AND_VALIDATE_IMMUTABLE_FOUNDATION_2026_07_7_PACKAGE",
      "COLLECT_PACKAGE_GOVERNANCE_APPROVALS",
      "AUTHORIZE_ONLY_HSK1_TIME_PLACE_EVENTS_UNIT",
      "ISSUE_HASH_BOUND_PROMOTION_RECEIPT",
    ],
    claims: {
      runtimeProjectionComplete: false,
      evidenceComplete: false,
      packageGovernanceComplete: false,
      runtimePackagePresent: false,
      unitReleaseAuthorized: false,
      importAuthorized: false,
      runtimeMutated: false,
      learnerContentExposed: false,
      completionGranted: false,
      masteryGranted: false,
    },
  };
};

export const validateHsk1UnitPackagePlanBundle = async ({ source, plan }) => {
  const errors = [];
  let expected;
  try {
    expected = await projectCheckedHsk1UnitPackagePlan(source);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      summary: null,
    };
  }
  if (
    !isRecord(plan)
    || plan.schemaVersion !== 1
    || plan.planId !== HSK1_UNIT_PACKAGE_PLAN_ID
    || plan.state !== "blocked-before-package-materialization"
    || !isRecord(plan.policy)
    || !Array.isArray(plan.sourceBindings)
    || !isRecord(plan.runtimeProjection)
    || !isRecord(plan.materialization)
    || !isRecord(plan.claims)
  ) {
    errors.push("HSK1 unit package plan shape is invalid");
  }
  if (
    Object.entries(POLICY).some(
      ([key, value]) => plan?.policy?.[key] !== value,
    )
    || Object.values(plan?.claims ?? {}).some((value) => value !== false)
    || plan?.materialization?.ready !== false
  ) {
    errors.push("HSK1 unit package plan is not fail-closed");
  }
  if (!exact(plan, expected)) {
    errors.push("HSK1 unit package plan does not match checked sources");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: {
      requiredRuntimePayloads:
        expected.runtimeProjection.requiredRuntimePayloads,
      draftedRuntimePayloads:
        expected.runtimeProjection.draftedRuntimePayloads,
      finalizedRuntimePayloads:
        expected.runtimeProjection.finalizedRuntimePayloads,
      unsafeAuthoringLessonIds:
        expected.runtimeProjection.sourceGapAudit.lessons
          .unsafeAuthoringLessonIds.length,
      safeRuntimeLessonIds:
        expected.runtimeProjection.draftCoverage.safeRuntimeLessonIds,
      traditionalEditorialDecisions:
        expected.runtimeProjection.sourceGapAudit.lexemes.fieldReadiness
          .traditionalEditorialDecisionIds.length,
      pronunciationReconciliations:
        expected.runtimeProjection.sourceGapAudit.lexemes.fieldReadiness
          .sourcePronunciationReconciliationIds.length,
      missingExampleTriples:
        expected.runtimeProjection.core.requiredCatalogItems
          - expected.runtimeProjection.draftCoverage.exampleTriplesDrafted
          - expected.runtimeProjection.draftCoverage.lessons,
      requiredProjectionReviewSlots:
        expected.runtimeProjection.requiredReviewSlots,
      unrepresentedNonCoreTargets:
        expected.runtimeProjection.representability
          .unrepresentedTargets,
      blockers: expected.materialization.blockers,
    },
  };
};

export const assertValidHsk1UnitPackagePlanBundle = async (bundle) => {
  const result = await validateHsk1UnitPackagePlanBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK1 unit package plan:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};

export const loadHsk1UnitPackagePlanBundle = (root = process.cwd()) => ({
  source: loadHsk1UnitPackagePlanSources(root),
  planPath: resolve(root, HSK1_UNIT_PACKAGE_PLAN_RELATIVE_PATH),
  plan: readJson(root, HSK1_UNIT_PACKAGE_PLAN_RELATIVE_PATH),
});
