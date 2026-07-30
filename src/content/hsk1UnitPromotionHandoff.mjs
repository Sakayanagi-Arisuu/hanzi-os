import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalJson, sha256Json } from "./governance.mjs";
import {
  assertValidHsk1LessonPromotionHandoffBundle,
  HSK1_LESSON_PROMOTION_HANDOFF_RELATIVE_PATH,
  loadHsk1LessonPromotionHandoffBundle,
} from "./hsk1LessonPromotionHandoff.mjs";
import { resolveHsk1ReviewBatch } from "./hsk1ReviewWorkflow.mjs";
import {
  assertValidHsk1TaskAssessmentPackBundle,
  HSK1_TASK_ASSESSMENT_PACK_RELATIVE_PATH,
  loadHsk1TaskAssessmentPackBundle,
} from "./hsk1TaskAssessmentPack.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK1_UNIT_PROMOTION_HANDOFF_RELATIVE_PATH =
  "content/review/hsk1-time-place-events-unit-handoff.json";
export const HSK1_UNIT_PROMOTION_HANDOFF_ID =
  "hsk1-time-place-events-unit-handoff-2026.07.1";

const UNIT_ID = "hsk1-time-place-events";
const TARGET_CONTENT_VERSION = "hsk1-time-place-events-2026.07.1";
const REVIEW_MANIFEST_RELATIVE_PATH =
  "content/review/hsk1-review-manifest-2026.07.json";
const COMMUNICATIVE_RELATIVE_PATH =
  "content/drafts/hsk1-communicative-units-2026.07.json";
const GRAMMAR_RELATIVE_PATH =
  "content/drafts/hsk1-grammar-context-2026.07.json";
const POLICY = {
  learnerHidden: true,
  informationalHandoffOnly: true,
  mutatesRuntime: false,
  exposesDraftContent: false,
  atomicSixLessonReleaseRequired: true,
  humanReviewCannotBeSynthesized: true,
  exactTargetHashesRequired: true,
  reviewedAudioAndRightsRequired: true,
  downstreamActivationRequiresSeparateRequest: true,
  grantsCompletionOrMastery: false,
};

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (left, right) => canonicalJson(left) === canonicalJson(right);

const bindSource = (root, id, relativePath) => ({
  id,
  relativePath,
  sha256: fileSha256(resolve(root, relativePath)),
});

const bindTarget = async ({
  lessonId,
  targetType,
  targetId,
  sourceId,
  sourcePointer,
  value,
}) => ({
  lessonId,
  targetType,
  targetId,
  sourceId,
  sourcePointer,
  sha256: await sha256Json(value),
});

const failClosedPractice = (item) =>
  item.review === "pending"
  && item.measurementEligible === false
  && item.masteryEligible === false;

const projectContent = async ({ collection, grammarPack, taskPack }) => {
  const packIndex = collection.packs.findIndex((pack) => pack.unitId === UNIT_ID);
  if (packIndex < 0) throw new Error(`${UNIT_ID} communicative pack is missing`);
  const pack = collection.packs[packIndex];
  if (
    pack.lessons.length !== 6
    || pack.lexemes.length !== 81
    || pack.practiceItems.length !== 243
    || pack.reviewBatches.length !== 6
  ) {
    throw new Error(`${UNIT_ID} communicative counts are invalid`);
  }
  const lessonIds = pack.lessons.map((lesson) => lesson.lessonId);
  const grammarDrafts = grammarPack.grammarDrafts.filter(
    (draft) => draft.unitId === UNIT_ID,
  );
  const grammarItems = grammarPack.practiceItems.filter(
    (item) => lessonIds.includes(item.lessonId),
  );
  const topics = taskPack.topicDrafts.filter((topic) => topic.unitId === UNIT_ID);
  const tasks = taskPack.taskScenarios.filter((task) => task.unitId === UNIT_ID);
  const taskItems = taskPack.practiceItems.filter(
    (item) => lessonIds.includes(item.lessonId),
  );
  if (
    grammarDrafts.length !== 25
    || grammarItems.length !== 25
    || topics.length !== 3
    || tasks.length !== 3
    || taskItems.length !== 3
    || pack.practiceItems.some((item) => !failClosedPractice(item))
    || grammarItems.some((item) => !failClosedPractice(item))
    || taskItems.some((item) => !failClosedPractice(item))
    || tasks.some(
      (task) =>
        task.modelDialogue?.audio !== null
        || task.modelDialogue?.review !== "pending"
        || task.evidencePolicy?.grantsMastery !== false,
    )
  ) {
    throw new Error(`${UNIT_ID} cross-pack targets are not fail-closed`);
  }

  const contentTargets = [];
  const audioRequirements = [];
  const perLesson = [];
  for (const [lessonIndex, lesson] of pack.lessons.entries()) {
    if (
      lesson.sequence !== lessonIndex + 1
      || lesson.modelDialogue?.audio !== null
      || lesson.modelDialogue?.review !== "pending"
      || lesson.practiceBlueprint?.grantsMastery !== false
    ) {
      throw new Error(`${lesson.lessonId} blueprint is not fail-closed`);
    }
    const beforeContent = contentTargets.length;
    const beforeAudio = audioRequirements.length;
    contentTargets.push(await bindTarget({
      lessonId: lesson.lessonId,
      targetType: "lesson-blueprint",
      targetId: lesson.lessonId,
      sourceId: "communicativeCollection",
      sourcePointer: `/packs/${packIndex}/lessons/${lessonIndex}`,
      value: lesson,
    }));
    for (const vocabularyId of lesson.vocabularyIds) {
      const lexemeIndex = pack.lexemes.findIndex(
        (lexeme) => lexeme.officialId === vocabularyId,
      );
      if (lexemeIndex < 0) throw new Error(`${vocabularyId} lexeme is missing`);
      contentTargets.push(await bindTarget({
        lessonId: lesson.lessonId,
        targetType: "vocabulary-draft",
        targetId: vocabularyId,
        sourceId: "communicativeCollection",
        sourcePointer: `/packs/${packIndex}/lexemes/${lexemeIndex}`,
        value: pack.lexemes[lexemeIndex],
      }));
    }
    for (const [turnIndex, turn] of lesson.modelDialogue.turns.entries()) {
      contentTargets.push(await bindTarget({
        lessonId: lesson.lessonId,
        targetType: "dialogue-turn",
        targetId: `${lesson.lessonId}:dialogue-turn-${turnIndex + 1}`,
        sourceId: "communicativeCollection",
        sourcePointer:
          `/packs/${packIndex}/lessons/${lessonIndex}/modelDialogue/turns/${turnIndex}`,
        value: turn,
      }));
    }
    const vocabularyItems = pack.practiceItems.filter(
      (item) => item.lessonId === lesson.lessonId,
    );
    if (vocabularyItems.length !== lesson.vocabularyIds.length * 3) {
      throw new Error(`${lesson.lessonId} vocabulary practice is incomplete`);
    }
    for (const item of vocabularyItems) {
      const itemIndex = pack.practiceItems.indexOf(item);
      contentTargets.push(await bindTarget({
        lessonId: lesson.lessonId,
        targetType: "vocabulary-practice",
        targetId: item.itemId,
        sourceId: "communicativeCollection",
        sourcePointer: `/packs/${packIndex}/practiceItems/${itemIndex}`,
        value: item,
      }));
    }
    const lessonGrammarDrafts = grammarDrafts.filter(
      (draft) => draft.lessonId === lesson.lessonId,
    );
    const lessonGrammarItems = grammarItems.filter(
      (item) => item.lessonId === lesson.lessonId,
    );
    if (
      lessonGrammarDrafts.length !== lesson.grammarRowIds.length
      || lessonGrammarItems.length !== lesson.grammarRowIds.length
    ) {
      throw new Error(`${lesson.lessonId} grammar partition is incomplete`);
    }
    for (const draft of lessonGrammarDrafts) {
      const index = grammarPack.grammarDrafts.indexOf(draft);
      contentTargets.push(await bindTarget({
        lessonId: lesson.lessonId,
        targetType: "grammar-draft",
        targetId: draft.officialGrammarRowId,
        sourceId: "grammarPack",
        sourcePointer: `/grammarDrafts/${index}`,
        value: draft,
      }));
    }
    for (const item of lessonGrammarItems) {
      const index = grammarPack.practiceItems.indexOf(item);
      contentTargets.push(await bindTarget({
        lessonId: lesson.lessonId,
        targetType: "grammar-practice",
        targetId: item.itemId,
        sourceId: "grammarPack",
        sourcePointer: `/practiceItems/${index}`,
        value: item,
      }));
    }
    const lessonTopics = topics.filter((topic) => topic.lessonId === lesson.lessonId);
    if (!exact(lessonTopics.map((topic) => topic.officialTopicId), lesson.topicIds)) {
      throw new Error(`${lesson.lessonId} topic partition is incomplete`);
    }
    for (const topic of lessonTopics) {
      const index = taskPack.topicDrafts.indexOf(topic);
      contentTargets.push(await bindTarget({
        lessonId: lesson.lessonId,
        targetType: "topic-draft",
        targetId: topic.officialTopicId,
        sourceId: "taskPack",
        sourcePointer: `/topicDrafts/${index}`,
        value: topic,
      }));
    }
    const lessonTasks = tasks.filter((task) => task.lessonId === lesson.lessonId);
    if (!exact(lessonTasks.map((task) => task.officialTaskId), lesson.taskIds)) {
      throw new Error(`${lesson.lessonId} task partition is incomplete`);
    }
    for (const task of lessonTasks) {
      const taskIndex = taskPack.taskScenarios.indexOf(task);
      contentTargets.push(await bindTarget({
        lessonId: lesson.lessonId,
        targetType: "task-scenario",
        targetId: task.officialTaskId,
        sourceId: "taskPack",
        sourcePointer: `/taskScenarios/${taskIndex}`,
        value: task,
      }));
      for (const [turnIndex, turn] of task.modelDialogue.turns.entries()) {
        contentTargets.push(await bindTarget({
          lessonId: lesson.lessonId,
          targetType: "task-dialogue-turn",
          targetId: `${task.officialTaskId}:dialogue-turn-${turnIndex + 1}`,
          sourceId: "taskPack",
          sourcePointer:
            `/taskScenarios/${taskIndex}/modelDialogue/turns/${turnIndex}`,
          value: turn,
        }));
      }
      const practice = taskItems.find(
        (item) => item.officialTaskId === task.officialTaskId,
      );
      if (!practice) throw new Error(`${task.officialTaskId} practice is missing`);
      const practiceIndex = taskPack.practiceItems.indexOf(practice);
      contentTargets.push(await bindTarget({
        lessonId: lesson.lessonId,
        targetType: "task-practice",
        targetId: practice.itemId,
        sourceId: "taskPack",
        sourcePointer: `/practiceItems/${practiceIndex}`,
        value: practice,
      }));
      audioRequirements.push({
        lessonId: lesson.lessonId,
        audioTargetId: `${task.officialTaskId}:scenario-audio`,
        targetKind: "task-model-dialogue",
        sourceTargetSha256: await sha256Json(task.modelDialogue.turns),
        reviewedAssetId: null,
        reviewedAssetSha256: null,
        rightsEvidenceRef: null,
        nativeReviewReceiptId: null,
        audioRightsReceiptId: null,
      });
    }
    audioRequirements.push({
      lessonId: lesson.lessonId,
      audioTargetId: `${lesson.lessonId}:dialogue-audio`,
      targetKind: "model-dialogue",
      sourceTargetSha256: await sha256Json(lesson.modelDialogue.turns),
      reviewedAssetId: null,
      reviewedAssetSha256: null,
      rightsEvidenceRef: null,
      nativeReviewReceiptId: null,
      audioRightsReceiptId: null,
    });
    for (const item of vocabularyItems.filter(
      (candidate) => candidate.kind === "listening-selection",
    )) {
      audioRequirements.push({
        lessonId: lesson.lessonId,
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
    perLesson.push({
      lessonId: lesson.lessonId,
      sequence: lesson.sequence,
      contentTargetCount: contentTargets.length - beforeContent,
      audioTargetCount: audioRequirements.length - beforeAudio,
      contentTargetSha256: await sha256Json(
        contentTargets.slice(beforeContent),
      ),
      audioTargetSha256: await sha256Json(
        audioRequirements.slice(beforeAudio),
      ),
    });
  }
  return {
    lessonIds,
    contentTargets,
    audioRequirements,
    perLesson,
    counts: {
      lessons: pack.lessons.length,
      vocabularyDrafts: pack.lexemes.length,
      communicativeDialogueTurns: pack.lessons.reduce(
        (total, lesson) => total + lesson.modelDialogue.turns.length,
        0,
      ),
      vocabularyPracticeItems: pack.practiceItems.length,
      grammarRows: grammarDrafts.length,
      grammarPracticeItems: grammarItems.length,
      topicDrafts: topics.length,
      taskScenarios: tasks.length,
      taskDialogueTurns: tasks.reduce(
        (total, task) => total + task.modelDialogue.turns.length,
        0,
      ),
      taskPracticeItems: taskItems.length,
      contentTargets: contentTargets.length,
      lessonDialogueAudioTargets: pack.lessons.length,
      vocabularyListeningAudioTargets: pack.lexemes.length,
      taskDialogueAudioTargets: tasks.length,
      audioTargets: audioRequirements.length,
      reviewedAudioAssets: 0,
    },
  };
};

const projectReview = async (root, content) => {
  const taskBatchIds = content.contentTargets
    .filter((target) => target.targetType === "task-scenario")
    .map((target) => `${target.targetId}:scenario-review-v1`);
  const batchIds = content.lessonIds.flatMap((lessonId) => [
    `${lessonId}:review-v1`,
    `${lessonId}:grammar-review-v1`,
    ...taskBatchIds.filter((batchId) => {
      const taskTarget = content.contentTargets.find(
        (target) => `${target.targetId}:scenario-review-v1` === batchId,
      );
      return taskTarget?.lessonId === lessonId;
    }),
  ]);
  const contexts = await Promise.all(
    batchIds.map((batchId) => resolveHsk1ReviewBatch(root, batchId)),
  );
  const batches = contexts.map((context) => ({
    lessonId: context.batch.lessonId
      ?? content.contentTargets.find(
        (target) => target.targetId === context.batch.officialTaskId,
      )?.lessonId,
    batchId: context.batch.batchId,
    sourceKind: context.manifestBatch.sourceKind,
    sourceId: context.manifestBatch.sourceId,
    targetDigest: context.targetDigest,
    targets: context.targets,
    requiredRoles: context.manifestBatch.requiredRoles,
    state: context.manifestBatch.state,
    approvalCount: context.manifestBatch.approvalCount,
  }));
  if (
    batches.length !== 15
    || batches.some(
      (batch) =>
        typeof batch.lessonId !== "string"
        || batch.state !== "pending"
        || batch.approvalCount !== 0,
    )
  ) {
    throw new Error(`${UNIT_ID} review batch set is invalid`);
  }
  const requirements = batches.flatMap((batch) =>
    batch.requiredRoles.map((role) => ({
      lessonId: batch.lessonId,
      batchId: batch.batchId,
      role,
      targetDigest: batch.targetDigest,
      assignmentDocumentRequired: true,
      completedReviewReceiptId: null,
    }))
  );
  if (requirements.length !== 45) {
    throw new Error(`${UNIT_ID} must require 45 role receipts`);
  }
  return { batches, requirements };
};

const assertFirstLessonParity = (firstHandoff, content, review) => {
  const lessonId = firstHandoff.targetBundle.lessonId;
  const firstTargets = content.contentTargets
    .filter((target) => target.lessonId === lessonId)
    .map(({ lessonId: _lessonId, ...target }) => target);
  const firstAudio = content.audioRequirements
    .filter(
      (target) =>
        target.lessonId === lessonId
        && target.targetKind !== "task-model-dialogue",
    )
    .map(({ lessonId: _lessonId, ...target }) => target);
  const firstBatches = review.batches
    .filter((batch) => batch.lessonId === lessonId)
    .map(({ lessonId: _lessonId, ...batch }) => batch);
  if (
    !exact(firstTargets, firstHandoff.targetBundle.contentTargets)
    || !exact(firstAudio, firstHandoff.targetBundle.audioRequirements)
    || !exact(firstBatches, firstHandoff.targetBundle.reviewBatches)
  ) {
    throw new Error("Atomic unit handoff has drifted from the checked first lesson");
  }
};

export const loadHsk1UnitPromotionHandoffSources = (
  root = process.cwd(),
) => ({
  root,
  firstHandoffBundle: loadHsk1LessonPromotionHandoffBundle(root),
  taskBundle: loadHsk1TaskAssessmentPackBundle(root),
});

export const projectHsk1UnitPromotionHandoff = async (source) => {
  await assertValidHsk1LessonPromotionHandoffBundle(source.firstHandoffBundle);
  assertValidHsk1TaskAssessmentPackBundle(source.taskBundle);
  const firstSource = source.firstHandoffBundle.source;
  const content = await projectContent({
    collection: firstSource.communicativeBundle.collection,
    grammarPack: firstSource.grammarBundle.pack,
    taskPack: source.taskBundle.pack,
  });
  const review = await projectReview(source.root, content);
  assertFirstLessonParity(source.firstHandoffBundle.handoff, content, review);
  const sourceBindings = [
    bindSource(source.root, "communicativeCollection", COMMUNICATIVE_RELATIVE_PATH),
    bindSource(source.root, "grammarPack", GRAMMAR_RELATIVE_PATH),
    bindSource(
      source.root,
      "taskPack",
      HSK1_TASK_ASSESSMENT_PACK_RELATIVE_PATH,
    ),
    bindSource(source.root, "reviewManifest", REVIEW_MANIFEST_RELATIVE_PATH),
    bindSource(
      source.root,
      "firstLessonHandoff",
      HSK1_LESSON_PROMOTION_HANDOFF_RELATIVE_PATH,
    ),
  ];
  const targetBundle = {
    pathId: "hsk1",
    unitId: UNIT_ID,
    lessonIds: content.lessonIds,
    atomicLessonCount: content.lessonIds.length,
    prerequisiteUnitIds: ["hsk1-personal-exchange"],
    prerequisiteRuntimeClosurePresent: true,
    downstreamUnitIdsAuthorizedByThisHandoff: [],
    sourceBindings,
    perLesson: content.perLesson,
    contentTargets: content.contentTargets,
    reviewBatches: review.batches,
    audioRequirements: content.audioRequirements,
  };
  const unitReleaseDigest = await sha256Json(targetBundle);
  return {
    schemaVersion: 1,
    handoffId: HSK1_UNIT_PROMOTION_HANDOFF_ID,
    state: "blocked-awaiting-human-review-audio-and-release-gate",
    learnerVisible: false,
    promotionEligible: false,
    policy: POLICY,
    sourceBindings,
    targetBundle,
    unitReleaseDigest,
    requiredReviewReceipts: review.requirements,
    plannedImport: {
      receiptSchemaVersion: 1,
      receiptKind: "hsk-local-atomic-unit-promotion",
      targetContentVersion: TARGET_CONTENT_VERSION,
      importIdempotencyKey:
        `hsk-runtime-unit-import:${TARGET_CONTENT_VERSION}:${unitReleaseDigest}`,
      unitReleaseDigest,
      runtimePackageSha256: null,
      receiptSha256: null,
    },
    readiness: {
      atomicLessonCount: content.lessonIds.length,
      contentTargetCount: content.counts.contentTargets,
      reviewBatchCount: review.batches.length,
      requiredRoleReceiptCount: review.requirements.length,
      completedRoleReceiptCount: 0,
      audioTargetCount: content.counts.audioTargets,
      reviewedAudioAssetCount: 0,
      explicitUnitReleaseGatePresent: false,
      runtimePackagePresent: false,
      promotionReceiptPresent: false,
      blockers: [
        "ATTRIBUTABLE_REVIEW_RECEIPTS_MISSING",
        "REVIEWED_AUDIO_ASSETS_MISSING",
        "EXPLICIT_UNIT_RELEASE_GATE_MISSING",
        "VERSIONED_RUNTIME_PACKAGE_MISSING",
        "PROMOTION_RECEIPT_MISSING",
      ],
    },
    counts: {
      ...content.counts,
      reviewBatches: review.batches.length,
      requiredRoleReceipts: review.requirements.length,
      completedRoleReceipts: 0,
    },
    claims: {
      humanReviewed: false,
      audioReviewedAndLicensed: false,
      explicitUnitReleaseAuthorized: false,
      runtimeImported: false,
      learnerVisible: false,
      grantsCompletion: false,
      grantsMastery: false,
    },
  };
};

export const validateHsk1UnitPromotionHandoffBundle = async ({
  source,
  handoff,
}) => {
  const errors = [];
  let expected;
  try {
    expected = await projectHsk1UnitPromotionHandoff(source);
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
    || handoff.handoffId !== HSK1_UNIT_PROMOTION_HANDOFF_ID
    || handoff.state !== "blocked-awaiting-human-review-audio-and-release-gate"
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
    errors.push("HSK1 atomic unit handoff shape is invalid");
  }
  if (
    Object.entries(POLICY).some(([key, value]) => handoff?.policy?.[key] !== value)
    || Object.values(handoff?.claims ?? {}).some((value) => value !== false)
  ) {
    errors.push("HSK1 atomic unit handoff is not fail-closed");
  }
  if (!exact(handoff, expected)) {
    errors.push("HSK1 atomic unit handoff does not match exact sources");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expected.counts,
  };
};

export const assertValidHsk1UnitPromotionHandoffBundle = async (bundle) => {
  const result = await validateHsk1UnitPromotionHandoffBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK1 atomic unit handoff:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};

export const loadHsk1UnitPromotionHandoffBundle = (
  root = process.cwd(),
) => ({
  source: loadHsk1UnitPromotionHandoffSources(root),
  handoffPath: resolve(root, HSK1_UNIT_PROMOTION_HANDOFF_RELATIVE_PATH),
  handoff: JSON.parse(readFileSync(
    resolve(root, HSK1_UNIT_PROMOTION_HANDOFF_RELATIVE_PATH),
    "utf8",
  )),
});
