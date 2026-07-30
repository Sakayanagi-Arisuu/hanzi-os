import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AUDIO_IMPORT_POLICY } from "./audioInspection.mjs";
import { canonicalJson, sha256Json } from "./governance.mjs";
import {
  assertValidHsk1UnitPromotionHandoffBundle,
  HSK1_UNIT_PROMOTION_HANDOFF_RELATIVE_PATH,
  loadHsk1UnitPromotionHandoffBundle,
} from "./hsk1UnitPromotionHandoff.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK1_UNIT_REVIEWER_PACKET_RELATIVE_PATH =
  "content/review/hsk1-time-place-events-reviewer-packet.json";
export const HSK1_UNIT_REVIEWER_PACKET_ID =
  "hsk1-time-place-events-reviewer-packet-2026.07.1";

const POLICY = {
  learnerVisible: false,
  containsDraftContent: true,
  reviewerReferenceOnly: true,
  checklistCompletionIsReviewEvidence: false,
  packetPresenceGrantsApproval: false,
  packetPresenceAuthorizesAudio: false,
  packetPresenceAuthorizesImport: false,
  browserTtsReleaseEligible: false,
  grantsMeasurementOrMastery: false,
};
const ROLE_CHECKLISTS = {
  "native-mandarin-reviewer": [
    "hanzi-accuracy",
    "pinyin-tone-accuracy",
    "lexical-sense-fit",
    "dialogue-naturalness",
    "audio-transcript-match",
  ],
  "vietnamese-editor": [
    "vietnamese-meaning-accuracy",
    "vietnamese-naturalness",
    "instruction-clarity",
    "no-overgeneralized-gloss",
  ],
  "assessment-editor": [
    "prompt-answer-consistency",
    "distractor-validity",
    "single-correct-answer",
    "hsk1-level-fit",
    "skill-evidence-alignment",
  ],
  "grammar-pedagogy-reviewer": [
    "form-function-accuracy",
    "constraint-coverage",
    "example-correctness",
    "guided-practice-fit",
  ],
  "task-pedagogy-reviewer": [
    "official-can-do-fit",
    "roleplay-feasibility",
    "instruction-observability",
    "rubric-readiness",
  ],
};

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (left, right) => canonicalJson(left) === canonicalJson(right);
const sourceBinding = (root, id, relativePath) => ({
  id,
  relativePath,
  sha256: fileSha256(resolve(root, relativePath)),
});
const decodeJsonPointerToken = (token) => token
  .replaceAll("~1", "/")
  .replaceAll("~0", "~");
const resolveJsonPointer = (value, pointer) => {
  if (pointer === "") return value;
  if (typeof pointer !== "string" || !pointer.startsWith("/")) {
    throw new Error(`Invalid reviewer packet source pointer: ${pointer}`);
  }
  let current = value;
  for (const token of pointer.slice(1).split("/").map(decodeJsonPointerToken)) {
    if (
      (Array.isArray(current) && /^\d+$/u.test(token))
      || (isRecord(current) && Object.hasOwn(current, token))
    ) {
      current = current[token];
      continue;
    }
    throw new Error(`Reviewer packet source pointer does not resolve: ${pointer}`);
  }
  return current;
};
const safeAudioFileName = (audioTargetId) =>
  `${audioTargetId.replaceAll(":", "__")}.wav`;

const audioScript = async ({ requirement, communicativePack, taskPack }) => {
  let sourceValue;
  let script;
  if (requirement.targetKind === "model-dialogue") {
    const lesson = communicativePack.lessons.find(
      (candidate) => candidate.lessonId === requirement.lessonId,
    );
    if (!lesson) throw new Error(`${requirement.lessonId} lesson is missing`);
    sourceValue = lesson.modelDialogue.turns;
    script = {
      scriptKind: "multi-speaker-dialogue",
      segments: lesson.modelDialogue.turns,
    };
  } else if (requirement.targetKind === "task-model-dialogue") {
    const taskId = requirement.audioTargetId.replace(/:scenario-audio$/u, "");
    const task = taskPack.taskScenarios.find(
      (candidate) => candidate.officialTaskId === taskId,
    );
    if (!task) throw new Error(`${taskId} task scenario is missing`);
    sourceValue = task.modelDialogue.turns;
    script = {
      scriptKind: "multi-speaker-task-dialogue",
      segments: task.modelDialogue.turns,
    };
  } else if (requirement.targetKind === "listening-selection") {
    const itemId = requirement.audioTargetId.replace(/:audio$/u, "");
    const item = communicativePack.practiceItems.find(
      (candidate) => candidate.itemId === itemId,
    );
    const lexeme = communicativePack.lexemes.find(
      (candidate) => candidate.officialId === item?.officialVocabularyId,
    );
    if (!item || !lexeme) {
      throw new Error(`${requirement.audioTargetId} listening script is missing`);
    }
    sourceValue = {
      transcript: item.ttsText,
      answer: item.correctAnswer,
    };
    script = {
      scriptKind: "single-lexeme",
      transcriptHanzi: item.ttsText,
      pronunciationPinyin: lexeme.pinyin,
      meaningVi: lexeme.vietnameseGlossDraft,
    };
  } else {
    throw new Error(`Unsupported audio target kind: ${requirement.targetKind}`);
  }
  if (await sha256Json(sourceValue) !== requirement.sourceTargetSha256) {
    throw new Error(`${requirement.audioTargetId} audio script hash has drifted`);
  }
  return {
    lessonId: requirement.lessonId,
    audioTargetId: requirement.audioTargetId,
    targetKind: requirement.targetKind,
    sourceTargetSha256: requirement.sourceTargetSha256,
    expectedFileName: safeAudioFileName(requirement.audioTargetId),
    script,
    assetStatus: "missing",
    reviewedAssetSha256: null,
    rightsEvidenceRef: null,
    nativeReviewReceiptId: null,
    audioRightsReceiptId: null,
  };
};

export const loadHsk1UnitReviewerPacketSources = (
  root = process.cwd(),
) => ({
  root,
  handoffBundle: loadHsk1UnitPromotionHandoffBundle(root),
});

export const projectHsk1UnitReviewerPacket = async (source) => {
  await assertValidHsk1UnitPromotionHandoffBundle(source.handoffBundle);
  const handoff = source.handoffBundle.handoff;
  const handoffSource = source.handoffBundle.source;
  const communicativeCollection =
    handoffSource.firstHandoffBundle.source.communicativeBundle.collection;
  const grammarPack =
    handoffSource.firstHandoffBundle.source.grammarBundle.pack;
  const taskPack = handoffSource.taskBundle.pack;
  const sourcesById = new Map([
    ["communicativeCollection", communicativeCollection],
    ["grammarPack", grammarPack],
    ["taskPack", taskPack],
  ]);
  const contentTargets = [];
  for (const target of handoff.targetBundle.contentTargets) {
    const sourceArtifact = sourcesById.get(target.sourceId);
    if (!sourceArtifact) {
      throw new Error(`${target.targetId} reviewer packet source is missing`);
    }
    const payload = resolveJsonPointer(sourceArtifact, target.sourcePointer);
    if (await sha256Json(payload) !== target.sha256) {
      throw new Error(`${target.targetId} reviewer packet target has drifted`);
    }
    contentTargets.push({ ...target, payload });
  }
  const communicativePack = communicativeCollection.packs.find(
    (pack) => pack.unitId === handoff.targetBundle.unitId,
  );
  if (!communicativePack) {
    throw new Error("HSK1 time/place/events communicative pack is missing");
  }
  const audioRecordingManifest = [];
  for (const requirement of handoff.targetBundle.audioRequirements) {
    audioRecordingManifest.push(await audioScript({
      requirement,
      communicativePack,
      taskPack,
    }));
  }
  const reviewSlots = handoff.requiredReviewReceipts.map((slot) => {
    const requiredChecklistIds = ROLE_CHECKLISTS[slot.role];
    if (!requiredChecklistIds) {
      throw new Error(`${slot.role} reviewer checklist is missing`);
    }
    return {
      ...slot,
      requiredChecklistIds,
      packetChecklistState: "not-reviewed",
    };
  });
  const lessonIndex = handoff.targetBundle.lessonIds.map((lessonId) => {
    const lesson = communicativePack.lessons.find(
      (candidate) => candidate.lessonId === lessonId,
    );
    if (!lesson) throw new Error(`${lessonId} reviewer lesson is missing`);
    const lessonTargets = contentTargets.filter(
      (target) => target.lessonId === lessonId,
    );
    return {
      lessonId,
      sequence: lesson.sequence,
      titleVi: lesson.titleVi,
      objectiveVi: lesson.objectiveVi,
      prerequisiteLessonIds: [...lesson.prerequisiteLessonIds],
      targetCount: lessonTargets.length,
      targetIdsByType: Object.fromEntries(
        [...new Set(lessonTargets.map((target) => target.targetType))]
          .map((targetType) => [
            targetType,
            lessonTargets
              .filter((target) => target.targetType === targetType)
              .map((target) => target.targetId),
          ]),
      ),
      reviewBatchIds: handoff.targetBundle.reviewBatches
        .filter((batch) => batch.lessonId === lessonId)
        .map((batch) => batch.batchId),
      audioTargetIds: audioRecordingManifest
        .filter((target) => target.lessonId === lessonId)
        .map((target) => target.audioTargetId),
    };
  });
  const payload = {
    schemaVersion: 1,
    packetId: HSK1_UNIT_REVIEWER_PACKET_ID,
    state: "ready-for-attributable-review-and-audio-production",
    unitReleaseDigest: handoff.unitReleaseDigest,
    policy: POLICY,
    sourceBindings: [
      sourceBinding(
        source.root,
        "atomicUnitHandoff",
        HSK1_UNIT_PROMOTION_HANDOFF_RELATIVE_PATH,
      ),
      ...handoff.sourceBindings,
    ],
    reviewerChecklists: ROLE_CHECKLISTS,
    audioRecordingPolicy: {
      ...AUDIO_IMPORT_POLICY,
      oneTargetPerFile: true,
      speakerIdentityRequired: true,
      transcriptNativeReviewRequired: true,
      assetNativeReviewRequired: true,
      rightsEvidenceRequired: true,
      audioRightsReviewRequired: true,
    },
    lessonIndex,
    contentTargets,
    reviewBatches: handoff.targetBundle.reviewBatches,
    reviewSlots,
    audioRecordingManifest,
    counts: {
      lessons: lessonIndex.length,
      contentTargets: contentTargets.length,
      reviewBatches: handoff.targetBundle.reviewBatches.length,
      reviewSlots: reviewSlots.length,
      audioTargets: audioRecordingManifest.length,
      dialogueAudioTargets: audioRecordingManifest.filter(
        (target) => target.targetKind === "model-dialogue",
      ).length,
      vocabularyAudioTargets: audioRecordingManifest.filter(
        (target) => target.targetKind === "listening-selection",
      ).length,
      taskAudioTargets: audioRecordingManifest.filter(
        (target) => target.targetKind === "task-model-dialogue",
      ).length,
      completedReviewSlots: 0,
      reviewedAudioAssets: 0,
      releaseEligibleItems: 0,
    },
  };
  return {
    ...payload,
    packetSha256: await sha256Json(payload),
  };
};

export const validateHsk1UnitReviewerPacketBundle = async ({
  source,
  packet,
}) => {
  const errors = [];
  let expected;
  try {
    expected = await projectHsk1UnitReviewerPacket(source);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      summary: null,
    };
  }
  if (
    !isRecord(packet)
    || packet.schemaVersion !== 1
    || packet.packetId !== HSK1_UNIT_REVIEWER_PACKET_ID
    || packet.state !== "ready-for-attributable-review-and-audio-production"
    || !isRecord(packet.policy)
    || !Array.isArray(packet.sourceBindings)
    || !Array.isArray(packet.lessonIndex)
    || !Array.isArray(packet.contentTargets)
    || !Array.isArray(packet.reviewBatches)
    || !Array.isArray(packet.reviewSlots)
    || !Array.isArray(packet.audioRecordingManifest)
    || !isRecord(packet.counts)
  ) {
    errors.push("HSK1 atomic unit reviewer packet shape is invalid");
  }
  if (
    Object.entries(POLICY).some(
      ([key, value]) => packet?.policy?.[key] !== value,
    )
    || packet?.counts?.completedReviewSlots !== 0
    || packet?.counts?.reviewedAudioAssets !== 0
    || packet?.counts?.releaseEligibleItems !== 0
  ) {
    errors.push("HSK1 atomic unit reviewer packet is not fail-closed");
  }
  if (!exact(packet, expected)) {
    errors.push("HSK1 atomic unit reviewer packet does not match exact sources");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expected.counts,
  };
};

export const assertValidHsk1UnitReviewerPacketBundle = async (bundle) => {
  const result = await validateHsk1UnitReviewerPacketBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK1 atomic unit reviewer packet:\n- ${
        result.errors.join("\n- ")
      }`,
    );
  }
  return result;
};

export const loadHsk1UnitReviewerPacketBundle = (
  root = process.cwd(),
) => ({
  source: loadHsk1UnitReviewerPacketSources(root),
  packetPath: resolve(root, HSK1_UNIT_REVIEWER_PACKET_RELATIVE_PATH),
  packet: JSON.parse(readFileSync(
    resolve(root, HSK1_UNIT_REVIEWER_PACKET_RELATIVE_PATH),
    "utf8",
  )),
});
