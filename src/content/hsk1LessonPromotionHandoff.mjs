import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalJson, sha256Json } from "./governance.mjs";
import {
  assertValidHsk1CommunicativeUnitPacksBundle,
  HSK1_COMMUNICATIVE_UNIT_PACKS_RELATIVE_PATH,
  loadHsk1CommunicativeUnitPacksBundle,
} from "./hsk1CommunicativeUnitPacks.mjs";
import {
  assertValidHsk1GrammarContextPackBundle,
  HSK1_GRAMMAR_CONTEXT_PACK_RELATIVE_PATH,
  loadHsk1GrammarContextPackBundle,
} from "./hsk1GrammarContextPack.mjs";
import {
  assertValidHsk1ReviewManifestBundle,
  loadHsk1ReviewManifestBundle,
} from "./hsk1ReviewManifest.mjs";
import { resolveHsk1ReviewBatch } from "./hsk1ReviewWorkflow.mjs";
import {
  assertValidHskRuntimePromotionQueueBundle,
  HSK_RUNTIME_PROMOTION_QUEUE_RELATIVE_PATH,
  loadHskRuntimePromotionQueueBundle,
} from "./hskRuntimePromotionQueue.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK1_LESSON_PROMOTION_HANDOFF_RELATIVE_PATH =
  "content/review/hsk1-time-place-events-01-numbers-handoff.json";
export const HSK1_LESSON_PROMOTION_HANDOFF_ID =
  "hsk1-time-place-events-01-numbers-handoff-2026.07.1";
export const HSK1_LESSON_PROMOTION_TARGET_VERSION =
  "hsk1-time-place-events-2026.07.1";

const UNIT_ID = "hsk1-time-place-events";
const LESSON_ID = "hsk1-time-place-events:01-numbers";
const VOCABULARY_BATCH_ID = `${LESSON_ID}:review-v1`;
const GRAMMAR_BATCH_ID = `${LESSON_ID}:grammar-review-v1`;
const REVIEW_MANIFEST_RELATIVE_PATH =
  "content/review/hsk1-review-manifest-2026.07.json";

const POLICY = {
  learnerHidden: true,
  informationalHandoffOnly: true,
  mutatesRuntime: false,
  exposesDraftContent: false,
  humanReviewCannotBeSynthesized: true,
  exactTargetHashesRequired: true,
  reviewedAudioAndRightsRequired: true,
  versionedRuntimePackageRequired: true,
  importReceiptRequired: true,
  grantsCompletionOrMastery: false,
};

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (left, right) => canonicalJson(left) === canonicalJson(right);

const requireOne = (values, label) => {
  if (values.length !== 1) {
    throw new Error(`${label} must resolve to exactly one target`);
  }
  return values[0];
};

const bindSource = (root, id, relativePath) => ({
  id,
  relativePath,
  sha256: fileSha256(resolve(root, relativePath)),
});

const bindTarget = async ({
  targetType,
  targetId,
  sourceId,
  sourcePointer,
  value,
}) => ({
  targetType,
  targetId,
  sourceId,
  sourcePointer,
  sha256: await sha256Json(value),
});

const buildContentTargets = async ({ collection, grammarPack }) => {
  const packIndex = collection.packs.findIndex((pack) => pack.unitId === UNIT_ID);
  if (packIndex < 0) throw new Error(`${UNIT_ID} communicative pack is missing`);
  const pack = collection.packs[packIndex];
  const lessonIndex = pack.lessons.findIndex(
    (lesson) => lesson.lessonId === LESSON_ID,
  );
  if (lessonIndex < 0) throw new Error(`${LESSON_ID} blueprint is missing`);
  const lesson = pack.lessons[lessonIndex];
  if (
    lesson.sequence !== 1
    || lesson.prerequisiteLessonIds.length !== 0
    || lesson.practiceBlueprint?.authoredItemCount !== 45
    || lesson.practiceBlueprint?.grantsMastery !== false
    || lesson.modelDialogue?.audio !== null
    || lesson.modelDialogue?.review !== "pending"
  ) {
    throw new Error(`${LESSON_ID} blueprint is not a fail-closed first lesson`);
  }

  const vocabularyIds = lesson.vocabularyIds;
  const lexemes = pack.lexemes.filter((lexeme) =>
    vocabularyIds.includes(lexeme.officialId)
  );
  if (
    lexemes.length !== 15
    || !exact(lexemes.map((lexeme) => lexeme.officialId), vocabularyIds)
  ) {
    throw new Error(`${LESSON_ID} vocabulary partition is invalid`);
  }
  const practiceItems = pack.practiceItems.filter(
    (item) => item.lessonId === LESSON_ID,
  );
  if (
    practiceItems.length !== 45
    || practiceItems.some(
      (item) =>
        item.review !== "pending"
        || item.measurementEligible !== false
        || item.masteryEligible !== false,
    )
  ) {
    throw new Error(`${LESSON_ID} vocabulary practice is not fail-closed`);
  }
  const grammarDrafts = grammarPack.grammarDrafts.filter(
    (item) => item.lessonId === LESSON_ID,
  );
  const grammarPractice = grammarPack.practiceItems.filter(
    (item) => item.lessonId === LESSON_ID,
  );
  const grammarDraft = requireOne(grammarDrafts, `${LESSON_ID} grammar draft`);
  const grammarItem = requireOne(
    grammarPractice,
    `${LESSON_ID} grammar practice`,
  );
  if (
    grammarDraft.officialGrammarRowId !== lesson.grammarRowIds[0]
    || lesson.grammarRowIds.length !== 1
    || grammarItem.officialGrammarRowId !== grammarDraft.officialGrammarRowId
    || grammarItem.review !== "pending"
    || grammarItem.measurementEligible !== false
    || grammarItem.masteryEligible !== false
  ) {
    throw new Error(`${LESSON_ID} grammar targets are not fail-closed`);
  }

  const contentTargets = [
    await bindTarget({
      targetType: "lesson-blueprint",
      targetId: LESSON_ID,
      sourceId: "communicativeCollection",
      sourcePointer: `/packs/${packIndex}/lessons/${lessonIndex}`,
      value: lesson,
    }),
  ];
  for (const lexeme of lexemes) {
    const index = pack.lexemes.indexOf(lexeme);
    contentTargets.push(await bindTarget({
      targetType: "vocabulary-draft",
      targetId: lexeme.officialId,
      sourceId: "communicativeCollection",
      sourcePointer: `/packs/${packIndex}/lexemes/${index}`,
      value: lexeme,
    }));
  }
  for (const [turnIndex, turn] of lesson.modelDialogue.turns.entries()) {
    contentTargets.push(await bindTarget({
      targetType: "dialogue-turn",
      targetId: `${LESSON_ID}:dialogue-turn-${turnIndex + 1}`,
      sourceId: "communicativeCollection",
      sourcePointer:
        `/packs/${packIndex}/lessons/${lessonIndex}/modelDialogue/turns/${turnIndex}`,
      value: turn,
    }));
  }
  for (const item of practiceItems) {
    const index = pack.practiceItems.indexOf(item);
    contentTargets.push(await bindTarget({
      targetType: "vocabulary-practice",
      targetId: item.itemId,
      sourceId: "communicativeCollection",
      sourcePointer: `/packs/${packIndex}/practiceItems/${index}`,
      value: item,
    }));
  }
  const grammarDraftIndex = grammarPack.grammarDrafts.indexOf(grammarDraft);
  contentTargets.push(await bindTarget({
    targetType: "grammar-draft",
    targetId: grammarDraft.officialGrammarRowId,
    sourceId: "grammarPack",
    sourcePointer: `/grammarDrafts/${grammarDraftIndex}`,
    value: grammarDraft,
  }));
  const grammarPracticeIndex = grammarPack.practiceItems.indexOf(grammarItem);
  contentTargets.push(await bindTarget({
    targetType: "grammar-practice",
    targetId: grammarItem.itemId,
    sourceId: "grammarPack",
    sourcePointer: `/practiceItems/${grammarPracticeIndex}`,
    value: grammarItem,
  }));

  const listeningItems = practiceItems.filter(
    (item) => item.kind === "listening-selection",
  );
  if (
    listeningItems.length !== 15
    || listeningItems.some(
      (item) =>
        item.ttsDisclosure !== "synthetic-browser-voice"
        || typeof item.ttsText !== "string"
        || item.ttsText.length === 0,
    )
  ) {
    throw new Error(`${LESSON_ID} listening targets are invalid`);
  }
  const audioRequirements = [{
    audioTargetId: `${LESSON_ID}:dialogue-audio`,
    targetKind: "model-dialogue",
    sourceTargetSha256: await sha256Json(lesson.modelDialogue.turns),
    reviewedAssetId: null,
    reviewedAssetSha256: null,
    rightsEvidenceRef: null,
    nativeReviewReceiptId: null,
    audioRightsReceiptId: null,
  }];
  for (const item of listeningItems) {
    audioRequirements.push({
      audioTargetId: `${item.itemId}:audio`,
      targetKind: "listening-selection",
      sourceTargetSha256: await sha256Json({
        transcript: item.ttsText,
        answer: item.correctAnswer,
      }),
      reviewedAssetId: null,
      reviewedAssetSha256: null,
      rightsEvidenceRef: null,
      nativeReviewReceiptId: null,
      audioRightsReceiptId: null,
    });
  }
  return {
    lesson,
    contentTargets,
    audioRequirements,
    counts: {
      lessonBlueprints: 1,
      vocabularyDrafts: lexemes.length,
      dialogueTurns: lesson.modelDialogue.turns.length,
      vocabularyPracticeItems: practiceItems.length,
      grammarRows: grammarDrafts.length,
      grammarPracticeItems: grammarPractice.length,
      contentTargets: contentTargets.length,
      listeningAudioTargets: listeningItems.length,
      dialogueAudioTargets: 1,
      audioTargets: audioRequirements.length,
      reviewedAudioAssets: 0,
    },
  };
};

const buildReviewRequirements = async (root) => {
  const contexts = await Promise.all([
    resolveHsk1ReviewBatch(root, VOCABULARY_BATCH_ID),
    resolveHsk1ReviewBatch(root, GRAMMAR_BATCH_ID),
  ]);
  const requirements = contexts.flatMap((context) =>
    context.manifestBatch.requiredRoles.map((role) => ({
      batchId: context.batch.batchId,
      role,
      targetDigest: context.targetDigest,
      assignmentDocumentRequired: true,
      completedReviewReceiptId: null,
    }))
  );
  return {
    batches: contexts.map((context) => ({
      batchId: context.batch.batchId,
      sourceKind: context.manifestBatch.sourceKind,
      sourceId: context.manifestBatch.sourceId,
      targetDigest: context.targetDigest,
      targets: context.targets,
      requiredRoles: context.manifestBatch.requiredRoles,
      state: context.manifestBatch.state,
      approvalCount: context.manifestBatch.approvalCount,
    })),
    requirements,
  };
};

export const loadHsk1LessonPromotionHandoffSources = (
  root = process.cwd(),
) => ({
  root,
  communicativeBundle: loadHsk1CommunicativeUnitPacksBundle(root),
  grammarBundle: loadHsk1GrammarContextPackBundle(root),
  reviewBundle: loadHsk1ReviewManifestBundle(root),
  promotionQueueBundle: loadHskRuntimePromotionQueueBundle(root),
});

export const projectHsk1LessonPromotionHandoff = async (source) => {
  assertValidHsk1CommunicativeUnitPacksBundle(source.communicativeBundle);
  assertValidHsk1GrammarContextPackBundle(source.grammarBundle);
  assertValidHsk1ReviewManifestBundle(source.reviewBundle);
  assertValidHskRuntimePromotionQueueBundle(source.promotionQueueBundle);
  const promotionReport = source.promotionQueueBundle.report;
  const candidate = promotionReport.nextPromotionCandidate;
  const candidateUnit = promotionReport.levels
    .find((level) => level.pathId === "hsk1")?.units
    .find((unit) => unit.unitId === UNIT_ID);
  if (
    candidate?.pathId !== "hsk1"
    || candidate?.unitId !== UNIT_ID
    || candidate?.sourceReleasedLessonCount !== 0
    || candidate?.blueprintApprovedLessonCount !== 0
    || candidateUnit?.prerequisiteRuntimeClosurePresent !== true
    || candidateUnit?.learnerVisibleLessonIds?.length !== 0
  ) {
    throw new Error(`${UNIT_ID} is no longer the fail-closed promotion candidate`);
  }

  const targetProjection = await buildContentTargets({
    collection: source.communicativeBundle.collection,
    grammarPack: source.grammarBundle.pack,
  });
  const reviewProjection = await buildReviewRequirements(source.root);
  if (
    reviewProjection.batches.length !== 2
    || reviewProjection.requirements.length !== 6
    || reviewProjection.batches.some(
      (batch) => batch.state !== "pending" || batch.approvalCount !== 0,
    )
  ) {
    throw new Error(`${LESSON_ID} review requirements are not pending and exact`);
  }
  const sourceBindings = [
    bindSource(
      source.root,
      "communicativeCollection",
      HSK1_COMMUNICATIVE_UNIT_PACKS_RELATIVE_PATH,
    ),
    bindSource(
      source.root,
      "grammarPack",
      HSK1_GRAMMAR_CONTEXT_PACK_RELATIVE_PATH,
    ),
    bindSource(source.root, "reviewManifest", REVIEW_MANIFEST_RELATIVE_PATH),
    bindSource(
      source.root,
      "promotionQueue",
      HSK_RUNTIME_PROMOTION_QUEUE_RELATIVE_PATH,
    ),
  ];
  const targetBundle = {
    pathId: "hsk1",
    unitId: UNIT_ID,
    lessonId: LESSON_ID,
    sequence: targetProjection.lesson.sequence,
    prerequisiteLessonIds: targetProjection.lesson.prerequisiteLessonIds,
    prerequisiteRuntimeClosurePresent: true,
    sourceBindings,
    contentTargets: targetProjection.contentTargets,
    reviewBatches: reviewProjection.batches,
    audioRequirements: targetProjection.audioRequirements,
  };
  const targetBundleSha256 = await sha256Json(targetBundle);
  const plannedImport = {
    receiptSchemaVersion: 1,
    receiptKind: "hsk-local-runtime-promotion",
    targetContentVersion: HSK1_LESSON_PROMOTION_TARGET_VERSION,
    importIdempotencyKey:
      `hsk-runtime-import:${HSK1_LESSON_PROMOTION_TARGET_VERSION}:${targetBundleSha256}`,
    requiredBindings: [
      "handoffSha256",
      "targetBundleSha256",
      "runtimePackageSha256",
      "runtimeCatalogBeforeSha256",
      "runtimeCatalogAfterSha256",
      "reviewReceiptSha256s",
      "audioAssetSha256s",
    ],
    targetBundleSha256,
    runtimePackageSha256: null,
    receiptSha256: null,
  };
  return {
    schemaVersion: 1,
    handoffId: HSK1_LESSON_PROMOTION_HANDOFF_ID,
    state: "blocked-awaiting-human-review-audio-and-package",
    learnerVisible: false,
    promotionEligible: false,
    policy: POLICY,
    sourceBindings,
    targetBundle,
    targetBundleSha256,
    requiredReviewReceipts: reviewProjection.requirements,
    plannedImport,
    readiness: {
      contentTargetCount: targetProjection.counts.contentTargets,
      reviewBatchCount: reviewProjection.batches.length,
      requiredRoleReceiptCount: reviewProjection.requirements.length,
      completedRoleReceiptCount: 0,
      audioTargetCount: targetProjection.counts.audioTargets,
      reviewedAudioAssetCount: 0,
      runtimePackagePresent: false,
      promotionReceiptPresent: false,
      blockers: [
        "ATTRIBUTABLE_REVIEW_RECEIPTS_MISSING",
        "REVIEWED_AUDIO_ASSETS_MISSING",
        "VERSIONED_RUNTIME_PACKAGE_MISSING",
        "PROMOTION_RECEIPT_MISSING",
      ],
    },
    counts: {
      ...targetProjection.counts,
      reviewBatches: reviewProjection.batches.length,
      requiredRoleReceipts: reviewProjection.requirements.length,
      completedRoleReceipts: 0,
    },
    claims: {
      humanReviewed: false,
      audioReviewedAndLicensed: false,
      runtimeImported: false,
      learnerVisible: false,
      grantsCompletion: false,
      grantsMastery: false,
    },
  };
};

export const validateHsk1LessonPromotionHandoffBundle = async ({
  source,
  handoff,
}) => {
  const errors = [];
  let expected;
  try {
    expected = await projectHsk1LessonPromotionHandoff(source);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      summary: null,
    };
  }
  if (
    !isRecord(handoff)
    || handoff.schemaVersion !== 1
    || handoff.handoffId !== HSK1_LESSON_PROMOTION_HANDOFF_ID
    || handoff.state !== "blocked-awaiting-human-review-audio-and-package"
    || handoff.learnerVisible !== false
    || handoff.promotionEligible !== false
    || !isRecord(handoff.policy)
    || !isRecord(handoff.targetBundle)
    || !Array.isArray(handoff.requiredReviewReceipts)
    || !isRecord(handoff.plannedImport)
    || !isRecord(handoff.readiness)
    || !isRecord(handoff.counts)
    || !isRecord(handoff.claims)
  ) {
    errors.push("HSK1 lesson promotion handoff shape is invalid");
  }
  if (
    Object.entries(POLICY).some(([key, value]) => handoff?.policy?.[key] !== value)
    || handoff?.claims?.humanReviewed !== false
    || handoff?.claims?.audioReviewedAndLicensed !== false
    || handoff?.claims?.runtimeImported !== false
    || handoff?.claims?.learnerVisible !== false
    || handoff?.claims?.grantsCompletion !== false
    || handoff?.claims?.grantsMastery !== false
  ) {
    errors.push("HSK1 lesson promotion handoff policy is not fail-closed");
  }
  if (!exact(handoff, expected)) {
    errors.push("HSK1 lesson promotion handoff does not match exact source targets");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expected.counts,
  };
};

export const assertValidHsk1LessonPromotionHandoffBundle = async (bundle) => {
  const result = await validateHsk1LessonPromotionHandoffBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK1 lesson promotion handoff:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};

export const loadHsk1LessonPromotionHandoffBundle = (
  root = process.cwd(),
) => ({
  source: loadHsk1LessonPromotionHandoffSources(root),
  handoffPath: resolve(root, HSK1_LESSON_PROMOTION_HANDOFF_RELATIVE_PATH),
  handoff: JSON.parse(readFileSync(
    resolve(root, HSK1_LESSON_PROMOTION_HANDOFF_RELATIVE_PATH),
    "utf8",
  )),
});
