import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalJson, sha256Json } from "./governance.mjs";
import {
  HSK1_COMMUNICATIVE_UNIT_PACKS_RELATIVE_PATH,
} from "./hsk1CommunicativeUnitPacks.mjs";
import {
  HSK1_GRAMMAR_CONTEXT_PACK_RELATIVE_PATH,
} from "./hsk1GrammarContextPack.mjs";
import {
  HSK1_TASK_ASSESSMENT_PACK_RELATIVE_PATH,
} from "./hsk1TaskAssessmentPack.mjs";
import {
  assertValidHsk1UnitRuntimeProjectionBundle,
  HSK1_UNIT_RUNTIME_PROJECTION_RELATIVE_PATH,
  loadHsk1UnitRuntimeProjectionBundle,
} from "./hsk1UnitRuntimeProjection.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK1_UNIT_RUNTIME_ACTIVITY_PROJECTION_RELATIVE_PATH =
  "content/drafts/hsk1-time-place-events-runtime-activity-projection-2026.07.json";
export const HSK1_UNIT_RUNTIME_ACTIVITY_PROJECTION_ID =
  "hsk1-time-place-events-runtime-activity-projection-2026.07.1";

const UNIT_ID = "hsk1-time-place-events";
const TARGET_PACKAGE_VERSION = "foundation-2026.07.7";
const SAFE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u;
const TARGET_SURFACES = {
  "dialogue-turn": {
    family: "dialogue",
    itemKind: "lesson-dialogue-turn",
    deliveryMode: "reviewed-dialogue-reference",
    observedSkills: [],
  },
  "vocabulary-practice": {
    family: "activity",
    itemKind: "vocabulary-practice",
    deliveryMode: "source-authored-practice",
    observedSkills: [],
  },
  "grammar-draft": {
    family: "knowledge",
    itemKind: "grammar-knowledge",
    deliveryMode: "explanation-and-model",
    observedSkills: [],
  },
  "grammar-practice": {
    family: "activity",
    itemKind: "grammar-guided-production",
    deliveryMode: "self-reveal-guided-production",
    observedSkills: ["grammar", "speaking"],
  },
  "topic-draft": {
    family: "knowledge",
    itemKind: "topic-context",
    deliveryMode: "communicative-context",
    observedSkills: [],
  },
  "task-scenario": {
    family: "knowledge",
    itemKind: "task-scenario",
    deliveryMode: "guided-task-context",
    observedSkills: [],
  },
  "task-dialogue-turn": {
    family: "dialogue",
    itemKind: "task-dialogue-turn",
    deliveryMode: "reviewed-task-dialogue-reference",
    observedSkills: [],
  },
  "task-practice": {
    family: "activity",
    itemKind: "guided-roleplay",
    deliveryMode: "self-reveal-guided-roleplay",
    observedSkills: ["listening", "speaking"],
  },
};
const POLICY = {
  learnerVisible: false,
  exactSourcePayloadPreserved: true,
  oneRuntimePayloadPerSourceTarget: true,
  runtimeIdsMustBeSafeAndUnique: true,
  activityVersionsMustBindTargetPackage: true,
  reviewedAudioRequiredWhereDeclared: true,
  browserTtsDoesNotSatisfyAudioReview: true,
  payloadReviewRequiredBeforePackageImport: true,
  packageImportRemainsBlocked: true,
  grantsMeasurementOrMastery: false,
};

const readJson = (root, relativePath) => JSON.parse(readFileSync(
  resolve(root, relativePath),
  "utf8",
));
const exact = (left, right) => canonicalJson(left) === canonicalJson(right);
const sourceBinding = (root, id, relativePath) => ({
  id,
  relativePath,
  sha256: fileSha256(resolve(root, relativePath)),
});
const safeRuntimeId = (authoringId) => authoringId.replaceAll(":", "-");
const decodeJsonPointerToken = (token) => token
  .replaceAll("~1", "/")
  .replaceAll("~0", "~");
const resolveJsonPointer = (value, pointer) => {
  let current = value;
  for (const token of pointer.slice(1).split("/").map(decodeJsonPointerToken)) {
    if (Array.isArray(current) && /^\d+$/u.test(token)) {
      current = current[Number(token)];
    } else if (
      typeof current === "object"
      && current !== null
      && Object.hasOwn(current, token)
    ) {
      current = current[token];
    } else {
      throw new Error(`Runtime activity source pointer does not resolve: ${pointer}`);
    }
  }
  return current;
};

const activitySemantics = (targetType, payload) => {
  if (targetType !== "vocabulary-practice") return TARGET_SURFACES[targetType];
  if (payload.kind === "meaning-recall") {
    return {
      ...TARGET_SURFACES[targetType],
      deliveryMode: "self-reveal-meaning-recall",
      observedSkills: ["vocabulary"],
    };
  }
  if (payload.kind === "pinyin-recognition") {
    return {
      ...TARGET_SURFACES[targetType],
      deliveryMode: "objective-phonology-recognition",
      observedSkills: ["pronunciation", "vocabulary"],
    };
  }
  if (payload.kind === "listening-selection") {
    return {
      ...TARGET_SURFACES[targetType],
      deliveryMode: "reviewed-audio-selection",
      observedSkills: ["listening", "vocabulary"],
    };
  }
  throw new Error(`Unsupported vocabulary practice kind: ${payload.kind}`);
};

const audioBinding = (target, payload) => {
  if (target.targetType === "dialogue-turn") {
    const segment = Number(target.targetId.match(/dialogue-turn-(\d+)$/u)?.[1]);
    return {
      required: true,
      audioTargetId: `${target.lessonId}:dialogue-audio`,
      segmentIndex: segment - 1,
      reviewedAssetSha256: null,
    };
  }
  if (target.targetType === "task-dialogue-turn") {
    const match = target.targetId.match(/^(.*):dialogue-turn-(\d+)$/u);
    if (!match) throw new Error(`${target.targetId} task dialogue ID is invalid`);
    return {
      required: true,
      audioTargetId: `${match[1]}:scenario-audio`,
      segmentIndex: Number(match[2]) - 1,
      reviewedAssetSha256: null,
    };
  }
  if (
    target.targetType === "vocabulary-practice"
    && payload.kind === "listening-selection"
  ) {
    return {
      required: true,
      audioTargetId: `${target.targetId}:audio`,
      segmentIndex: null,
      reviewedAssetSha256: null,
    };
  }
  if (target.targetType === "task-practice") {
    return {
      required: true,
      audioTargetId: `${payload.officialTaskId}:scenario-audio`,
      segmentIndex: null,
      reviewedAssetSha256: null,
    };
  }
  return {
    required: false,
    audioTargetId: null,
    segmentIndex: null,
    reviewedAssetSha256: null,
  };
};

export const loadHsk1UnitRuntimeActivityProjectionSources = (
  root = process.cwd(),
) => ({
  root,
  coreProjectionBundle: loadHsk1UnitRuntimeProjectionBundle(root),
});

const collectNonCoreTargets = async ({
  communicativePack,
  communicativePackIndex,
  grammarPack,
  taskPack,
}) => {
  const targets = [];
  for (const lesson of communicativePack.lessons) {
    for (const [index, payload] of lesson.modelDialogue.turns.entries()) {
      targets.push({
        lessonId: lesson.lessonId,
        targetType: "dialogue-turn",
        targetId: `${lesson.lessonId}:dialogue-turn-${index + 1}`,
        sourceId: "communicativeCollection",
        sourcePointer:
          `/packs/${communicativePackIndex}/lessons/${lesson.sequence - 1}/modelDialogue/turns/${index}`,
        payload,
      });
    }
    for (const payload of communicativePack.practiceItems.filter(
      (item) => item.lessonId === lesson.lessonId,
    )) {
      targets.push({
        lessonId: lesson.lessonId,
        targetType: "vocabulary-practice",
        targetId: payload.itemId,
        sourceId: "communicativeCollection",
        sourcePointer:
          `/packs/${communicativePackIndex}/practiceItems/${communicativePack.practiceItems.indexOf(payload)}`,
        payload,
      });
    }
    for (const payload of grammarPack.grammarDrafts.filter(
      (item) => item.lessonId === lesson.lessonId,
    )) {
      targets.push({
        lessonId: lesson.lessonId,
        targetType: "grammar-draft",
        targetId: payload.officialGrammarRowId,
        sourceId: "grammarPack",
        sourcePointer:
          `/grammarDrafts/${grammarPack.grammarDrafts.indexOf(payload)}`,
        payload,
      });
    }
    for (const payload of grammarPack.practiceItems.filter(
      (item) => item.lessonId === lesson.lessonId,
    )) {
      targets.push({
        lessonId: lesson.lessonId,
        targetType: "grammar-practice",
        targetId: payload.itemId,
        sourceId: "grammarPack",
        sourcePointer:
          `/practiceItems/${grammarPack.practiceItems.indexOf(payload)}`,
        payload,
      });
    }
    for (const payload of taskPack.topicDrafts.filter(
      (item) => item.lessonId === lesson.lessonId,
    )) {
      targets.push({
        lessonId: lesson.lessonId,
        targetType: "topic-draft",
        targetId: payload.officialTopicId,
        sourceId: "taskPack",
        sourcePointer:
          `/topicDrafts/${taskPack.topicDrafts.indexOf(payload)}`,
        payload,
      });
    }
    for (const task of taskPack.taskScenarios.filter(
      (item) => item.lessonId === lesson.lessonId,
    )) {
      targets.push({
        lessonId: lesson.lessonId,
        targetType: "task-scenario",
        targetId: task.officialTaskId,
        sourceId: "taskPack",
        sourcePointer:
          `/taskScenarios/${taskPack.taskScenarios.indexOf(task)}`,
        payload: task,
      });
      for (const [index, payload] of task.modelDialogue.turns.entries()) {
        targets.push({
          lessonId: lesson.lessonId,
          targetType: "task-dialogue-turn",
          targetId: `${task.officialTaskId}:dialogue-turn-${index + 1}`,
          sourceId: "taskPack",
          sourcePointer:
            `/taskScenarios/${taskPack.taskScenarios.indexOf(task)}/modelDialogue/turns/${index}`,
          payload,
        });
      }
      const payload = taskPack.practiceItems.find(
        (item) => item.officialTaskId === task.officialTaskId,
      );
      if (!payload) throw new Error(`${task.officialTaskId} practice is missing`);
      targets.push({
        lessonId: lesson.lessonId,
        targetType: "task-practice",
        targetId: payload.itemId,
        sourceId: "taskPack",
        sourcePointer:
          `/practiceItems/${taskPack.practiceItems.indexOf(payload)}`,
        payload,
      });
    }
  }
  return Promise.all(targets.map(async (target) => ({
    ...target,
    sha256: await sha256Json(target.payload),
  })));
};

export const projectHsk1UnitRuntimeActivityProjection = async (
  source = loadHsk1UnitRuntimeActivityProjectionSources(),
) => {
  await assertValidHsk1UnitRuntimeProjectionBundle(source.coreProjectionBundle);
  const core = source.coreProjectionBundle.projection;
  if (
    core.unitId !== UNIT_ID
    || core.targetPackageVersion !== TARGET_PACKAGE_VERSION
  ) {
    throw new Error("HSK1 runtime activity projection identity has drifted");
  }
  const coreSource = source.coreProjectionBundle.source;
  const communicativePackIndex =
    coreSource.communicativeBundle.collection.packs.findIndex(
      (pack) => pack.unitId === UNIT_ID,
    );
  if (communicativePackIndex < 0) {
    throw new Error(`${UNIT_ID} communicative pack is missing`);
  }
  const communicativePack =
    coreSource.communicativeBundle.collection.packs[communicativePackIndex];
  const grammarPack = coreSource.grammarBundle.pack;
  const taskPack = coreSource.taskBundle.pack;
  const sourceArtifacts = new Map([
    ["communicativeCollection", coreSource.communicativeBundle.collection],
    ["grammarPack", grammarPack],
    ["taskPack", taskPack],
  ]);
  const runtimeLessonByAuthoringId = new Map(core.lessons.map((lesson) => [
    lesson.authoringLessonId,
    lesson.runtimeLessonId,
  ]));
  const nonCoreTargets = await collectNonCoreTargets({
    communicativePack,
    communicativePackIndex,
    grammarPack,
    taskPack,
  });
  if (nonCoreTargets.length !== 338) {
    throw new Error("HSK1 non-core runtime target count has drifted");
  }

  const payloads = await Promise.all(nonCoreTargets.map(async (target) => {
    const surface = TARGET_SURFACES[target.targetType];
    const runtimeLessonId = runtimeLessonByAuthoringId.get(target.lessonId);
    const sourceArtifact = sourceArtifacts.get(target.sourceId);
    if (!surface || !runtimeLessonId || !sourceArtifact) {
      throw new Error(`${target.targetId} runtime activity source is missing`);
    }
    const payload = target.payload;
    if (!exact(resolveJsonPointer(sourceArtifact, target.sourcePointer), payload)) {
      throw new Error(`${target.targetId} runtime activity pointer has drifted`);
    }
    const semantics = activitySemantics(target.targetType, payload);
    const runtimeItemId = safeRuntimeId(target.targetId);
    const runtimePayload = {
      schemaVersion: 1,
      runtimeItemId,
      runtimeItemType: semantics.itemKind,
      runtimeFamily: semantics.family,
      runtimeLessonId,
      activityVersion: `${TARGET_PACKAGE_VERSION}:${runtimeItemId}:1`,
      deliveryMode: semantics.deliveryMode,
      observedSkills: semantics.observedSkills,
      audio: audioBinding(target, payload),
      payloadBinding: {
        sourceId: target.sourceId,
        sourcePointer: target.sourcePointer,
        sourceTargetSha256: target.sha256,
        projectionMode: "exact-source-payload",
      },
    };
    return {
      authoringLessonId: target.lessonId,
      runtimeLessonId,
      sourceTargetType: target.targetType,
      sourceTargetId: target.targetId,
      sourceTargetSha256: target.sha256,
      runtimeItemId,
      plannedReleaseState: "review",
      learnerVisible: false,
      measurementEligible: false,
      masteryEligible: false,
      runtimePayload,
      runtimePayloadSha256: await sha256Json(runtimePayload),
      review: {
        status: "pending",
        requiredRoles: [
          "native-mandarin-reviewer",
          "vietnamese-editor",
          "assessment-editor",
        ],
        approvalReceiptIds: [],
      },
    };
  }));
  const runtimeIds = payloads.map((item) => item.runtimeItemId);
  const sourceTargetKeys = payloads.map(
    (item) => `${item.sourceTargetType}:${item.sourceTargetId}`,
  );
  if (
    new Set(runtimeIds).size !== payloads.length
    || runtimeIds.some((id) => !SAFE_ID_PATTERN.test(id))
    || new Set(sourceTargetKeys).size !== payloads.length
  ) {
    throw new Error("HSK1 runtime activity IDs are unsafe or duplicated");
  }
  const reviewBatches = [];
  for (const lesson of core.lessons) {
    const lessonPayloads = payloads.filter(
      (item) => item.runtimeLessonId === lesson.runtimeLessonId,
    );
    if (lessonPayloads.length === 0) {
      throw new Error(`${lesson.authoringLessonId} activity partition is empty`);
    }
    const targetDigests = lessonPayloads.map(
      (item) => item.runtimePayloadSha256,
    );
    reviewBatches.push({
      batchId: `${lesson.runtimeLessonId}-runtime-activity-projection-review-v1`,
      authoringLessonId: lesson.authoringLessonId,
      runtimeLessonId: lesson.runtimeLessonId,
      targetDigests,
      targetDigest: await sha256Json(targetDigests),
      requiredRoles: [
        "native-mandarin-reviewer",
        "vietnamese-editor",
        "assessment-editor",
      ],
      approvals: [],
      state: "pending",
    });
  }
  const uniqueAudioTargetIds = new Set(payloads
    .filter((item) => item.runtimePayload.audio.required)
    .map((item) => item.runtimePayload.audio.audioTargetId));
  const projection = {
    schemaVersion: 1,
    projectionId: HSK1_UNIT_RUNTIME_ACTIVITY_PROJECTION_ID,
    state: "ai-assisted-runtime-activity-projection-draft",
    unitId: UNIT_ID,
    targetPackageVersion: TARGET_PACKAGE_VERSION,
    learnerVisible: false,
    releaseEligible: false,
    policy: POLICY,
    sourceBindings: [
      sourceBinding(
        source.root,
        "communicativeCollection",
        HSK1_COMMUNICATIVE_UNIT_PACKS_RELATIVE_PATH,
      ),
      sourceBinding(
        source.root,
        "grammarPack",
        HSK1_GRAMMAR_CONTEXT_PACK_RELATIVE_PATH,
      ),
      sourceBinding(
        source.root,
        "taskPack",
        HSK1_TASK_ASSESSMENT_PACK_RELATIVE_PATH,
      ),
      sourceBinding(
        source.root,
        "runtimeCoreProjection",
        HSK1_UNIT_RUNTIME_PROJECTION_RELATIVE_PATH,
      ),
    ],
    payloads,
    reviewBatches,
    runtimeRepresentability: {
      sourceContentTargets: 425,
      directlyProjectedCoreTargets: 87,
      directlyProjectedNonCoreTargets: payloads.length,
      directlyProjectedTotalTargets: 87 + payloads.length,
      unrepresentedTargets: 0,
      exactSourcePayloadsPreserved: payloads.length,
      packageImportMustRemainBlockedUntilReview: true,
    },
    counts: {
      runtimePayloads: payloads.length,
      dialoguePayloads: payloads.filter(
        (item) => item.runtimePayload.runtimeFamily === "dialogue",
      ).length,
      activityPayloads: payloads.filter(
        (item) => item.runtimePayload.runtimeFamily === "activity",
      ).length,
      knowledgePayloads: payloads.filter(
        (item) => item.runtimePayload.runtimeFamily === "knowledge",
      ).length,
      safeRuntimeItemIds: runtimeIds.filter(
        (id) => SAFE_ID_PATTERN.test(id),
      ).length,
      audioDependentPayloads: payloads.filter(
        (item) => item.runtimePayload.audio.required,
      ).length,
      uniqueAudioTargets: uniqueAudioTargetIds.size,
      reviewBatches: reviewBatches.length,
      requiredReviewSlots: reviewBatches.reduce(
        (sum, batch) => sum + batch.requiredRoles.length,
        0,
      ),
      approvals: 0,
      finalizedPayloads: 0,
      releaseEligibleItems: 0,
    },
    claims: {
      payloadsAuthored: true,
      nonCoreRuntimeProjectionComplete: true,
      combinedRuntimeRepresentabilityComplete: true,
      humanReviewComplete: false,
      packageGovernanceComplete: false,
      packageImportAuthorized: false,
      runtimeMutated: false,
      learnerContentExposed: false,
      completionGranted: false,
      masteryGranted: false,
    },
  };
  return {
    ...projection,
    projectionSha256: await sha256Json(projection),
  };
};

export const validateHsk1UnitRuntimeActivityProjectionBundle = async ({
  source,
  projection,
}) => {
  const errors = [];
  let expected;
  try {
    expected = await projectHsk1UnitRuntimeActivityProjection(source);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      summary: null,
    };
  }
  if (!exact(projection, expected)) {
    errors.push("HSK1 runtime activity projection does not match exact sources");
  }
  if (
    projection?.learnerVisible !== false
    || projection?.releaseEligible !== false
    || projection?.counts?.runtimePayloads !== 338
    || projection?.counts?.finalizedPayloads !== 0
    || projection?.counts?.approvals !== 0
    || projection?.runtimeRepresentability?.unrepresentedTargets !== 0
    || projection?.runtimeRepresentability
      ?.packageImportMustRemainBlockedUntilReview !== true
    || projection?.payloads?.some((item) =>
      item.plannedReleaseState !== "review"
      || item.learnerVisible !== false
      || item.measurementEligible !== false
      || item.masteryEligible !== false
      || item.review.status !== "pending"
      || item.review.approvalReceiptIds.length !== 0
      || item.runtimePayload.audio.reviewedAssetSha256 !== null
    )
    || projection?.claims?.payloadsAuthored !== true
    || projection?.claims?.nonCoreRuntimeProjectionComplete !== true
    || projection?.claims?.combinedRuntimeRepresentabilityComplete !== true
    || Object.entries(projection?.claims ?? {}).some(
      ([key, value]) => ![
        "payloadsAuthored",
        "nonCoreRuntimeProjectionComplete",
        "combinedRuntimeRepresentabilityComplete",
      ].includes(key) && value !== false,
    )
  ) {
    errors.push("HSK1 runtime activity projection is not fail-closed");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expected.counts,
  };
};

export const assertValidHsk1UnitRuntimeActivityProjectionBundle = async (
  bundle,
) => {
  const result = await validateHsk1UnitRuntimeActivityProjectionBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK1 runtime activity projection:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};

export const loadHsk1UnitRuntimeActivityProjectionBundle = (
  root = process.cwd(),
) => ({
  source: loadHsk1UnitRuntimeActivityProjectionSources(root),
  projectionPath: resolve(
    root,
    HSK1_UNIT_RUNTIME_ACTIVITY_PROJECTION_RELATIVE_PATH,
  ),
  projection: readJson(
    root,
    HSK1_UNIT_RUNTIME_ACTIVITY_PROJECTION_RELATIVE_PATH,
  ),
});
