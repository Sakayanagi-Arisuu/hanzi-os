import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk3CohesionReconstructionPackBundle,
  collectHsk3ParagraphTextCatalogFromCultureTip,
  loadHsk3CohesionReconstructionPackBundle,
} from "./hsk3CohesionReconstructionPack.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK3_EVENT_RETELLING_PACK_RELATIVE_PATH =
  "content/drafts/hsk3-event-retelling-2026.07.json";
export const HSK3_EVENT_RETELLING_TRACK_ID = "hsk3-event-retelling";
export const HSK3_EVENT_RETELLING_LESSON_IDS = [
  `${HSK3_EVENT_RETELLING_TRACK_ID}-lesson-01`,
  `${HSK3_EVENT_RETELLING_TRACK_ID}-lesson-02`,
  `${HSK3_EVENT_RETELLING_TRACK_ID}-lesson-03`,
];

const PROMPT_KIND_BY_LESSON = new Map([
  [
    HSK3_EVENT_RETELLING_LESSON_IDS[0],
    "note-card-event-retelling",
  ],
  [
    HSK3_EVENT_RETELLING_LESSON_IDS[1],
    "change-cause-event-retelling",
  ],
  [
    HSK3_EVENT_RETELLING_LESSON_IDS[2],
    "opening-body-closing-event-retelling",
  ],
]);
const STRUCTURE_SLOTS_BY_KIND = new Map([
  [
    "note-card-event-retelling",
    [
      "Bối cảnh: ai, ở đâu hoặc khi nào?",
      "Sự kiện hay vấn đề chính là gì?",
      "Nhân vật đã xử lý như thế nào?",
      "Kết quả hoặc bài học cuối là gì?",
    ],
  ],
  [
    "change-cause-event-retelling",
    [
      "Trạng thái hoặc kế hoạch ban đầu.",
      "Thay đổi hay vấn đề đã xảy ra.",
      "Nguyên nhân và cách xử lý.",
      "Kết quả mới hoặc bài học.",
    ],
  ],
  [
    "opening-body-closing-event-retelling",
    [
      "Mở đoạn: đặt nhân vật, bối cảnh và mục tiêu.",
      "Thân đoạn: kể diễn biến theo quan hệ thời gian–nguyên nhân.",
      "Kết đoạn: nêu kết quả và ý nghĩa, không thêm dữ kiện ngoài nguồn.",
    ],
  ],
]);
const REQUIRED_REVIEW_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "assessment-editor",
  "audio-rights-reviewer",
];
const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);
const duplicates = (values) => {
  const seen = new Set();
  const repeated = new Set();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
};
const validText = (value, minimum = 1, maximum = 1000) =>
  typeof value === "string"
  && value.length >= minimum
  && value.length <= maximum;
const failClosed = (item) =>
  item?.review === "pending"
  && item?.measurementEligible === false
  && item?.masteryEligible === false
  && item?.releaseEligible === false;

const paragraphBundlesFromCultureTip = (cultureBundle) => {
  const societyBundle = cultureBundle.prerequisiteBundles[0];
  const natureBundle = societyBundle.prerequisiteBundles[0];
  const studyBundle = natureBundle.prerequisiteBundles[0];
  return [studyBundle, natureBundle, societyBundle, cultureBundle];
};

export const collectHsk3RetellingSourceCatalog = (cultureBundle) => {
  const textCatalog =
    collectHsk3ParagraphTextCatalogFromCultureTip(cultureBundle);
  const catalog = new Map();
  for (const bundle of paragraphBundlesFromCultureTip(cultureBundle)) {
    for (const lesson of bundle.pack.lessons ?? []) {
      for (const summary of lesson.guidedSummaries ?? []) {
        const source = textCatalog.get(summary.textId);
        if (source?.text?.kind === "graded-listening") {
          catalog.set(summary.textId, {
            ...source,
            sourceSummary: summary,
          });
        }
      }
    }
  }
  return catalog;
};

export const loadHsk3EventRetellingPackBundle = (
  root = process.cwd(),
) => {
  const prerequisiteBundle =
    loadHsk3CohesionReconstructionPackBundle(root);
  const paragraphBundle = prerequisiteBundle.paragraphBundle;
  const packPath = join(root, HSK3_EVENT_RETELLING_PACK_RELATIVE_PATH);
  return {
    blueprintBundle: prerequisiteBundle.blueprintBundle,
    prerequisiteBundle,
    paragraphBundle,
    packPath,
    pack: JSON.parse(readFileSync(packPath, "utf8")),
  };
};

export const validateHsk3EventRetellingPackBundle = ({
  blueprintBundle,
  prerequisiteBundle,
  paragraphBundle,
  pack,
}) => {
  const errors = [];
  try {
    assertValidHsk3CohesionReconstructionPackBundle(prerequisiteBundle);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (
    !isRecord(pack)
    || pack.schemaVersion !== 1
    || pack.packId !== "hsk3-event-retelling-2026.07"
    || pack.level !== 3
    || pack.trackId !== HSK3_EVENT_RETELLING_TRACK_ID
    || pack.state !== "ai-assisted-guided-production-draft"
    || pack.learnerVisible !== false
    || pack.releaseEligible !== false
  ) {
    return {
      valid: false,
      errors: ["HSK3 event-retelling pack identity is invalid"],
    };
  }
  if (
    pack.source?.lessonBlueprintPackId !== blueprintBundle.pack.packId
    || pack.source?.lessonBlueprintPackSha256
      !== fileSha256(blueprintBundle.packPath)
    || pack.source?.prerequisitePackId !== prerequisiteBundle.pack.packId
    || pack.source?.prerequisitePackSha256
      !== fileSha256(prerequisiteBundle.packPath)
    || pack.source?.paragraphSourceTipPackId !== paragraphBundle.pack.packId
    || pack.source?.paragraphSourceTipPackSha256
      !== fileSha256(paragraphBundle.packPath)
  ) {
    errors.push("HSK3 event-retelling source binding is stale");
  }
  if (
    pack.authorship?.method !== "ai-assisted-event-retelling-draft"
    || pack.authorship?.assistant !== "OpenAI Codex"
    || pack.authorship?.nativeMandarinReviewer !== null
    || pack.authorship?.vietnameseEditor !== null
    || pack.authorship?.assessmentEditor !== null
    || pack.authorship?.audioRightsReviewer !== null
  ) {
    errors.push("HSK3 event-retelling authorship must not imply review");
  }
  if (
    pack.reviewPolicy?.nativeMandarinRequiredForRelease !== true
    || pack.reviewPolicy?.vietnameseEditorialRequiredForRelease !== true
    || pack.reviewPolicy?.assessmentReviewRequiredForRelease !== true
    || pack.reviewPolicy?.audioRightsRequiredForRelease !== true
    || pack.reviewPolicy?.sourceExposedPracticeCannotCalibrateAssessment
      !== true
    || pack.masteryPolicy?.listeningSeparatedFromSpeakingEvidence !== true
    || pack.masteryPolicy?.modelRevealCannotGrantMastery !== true
    || pack.masteryPolicy?.browserTtsCannotGrantListeningMastery !== true
    || pack.masteryPolicy?.selfRecordingCannotGrantSpeakingMastery !== true
    || pack.masteryPolicy
      ?.reviewedSourceAudioRequiredForListeningMastery !== true
    || pack.masteryPolicy
      ?.reviewedLearnerRecordingRubricRequiredForSpeakingMastery !== true
    || pack.masteryPolicy?.newCharacterOwnershipClaims !== 0
    || pack.masteryPolicy?.sourceRecognitionCharacterMappings !== 284
  ) {
    errors.push("HSK3 event-retelling policy must remain fail-closed");
  }
  if (
    pack.coverageClaims?.stagePromptDraftsComplete !== true
    || pack.coverageClaims?.completedGuidedProductionStages !== 3
    || pack.coverageClaims?.completedGuidedProductionLessons !== 9
    || pack.coverageClaims?.allGuidedProductionLessonsComplete !== false
    || pack.coverageClaims?.reviewedContentComplete !== false
    || pack.coverageClaims?.assessmentCoverageComplete !== false
    || pack.coverageClaims?.hsk3Complete !== false
  ) {
    errors.push("HSK3 event-retelling coverage claims are invalid");
  }

  const sourceCatalog = collectHsk3RetellingSourceCatalog(paragraphBundle);
  const sourceTexts = Array.isArray(pack.sourceTexts)
    ? pack.sourceTexts
    : [];
  if (
    sourceCatalog.size !== 20
    || sourceTexts.length !== 20
    || duplicates(sourceTexts.map((source) => source.textId)).length > 0
    || !exact(
      [...sourceTexts.map((source) => source.textId)].sort(),
      [...sourceCatalog.keys()].sort(),
    )
  ) {
    errors.push("HSK3 event-retelling source partition is invalid");
  }
  const selectedSourceById = new Map();
  for (const source of sourceTexts) {
    const expected = sourceCatalog.get(source.textId);
    if (
      !expected
      || source.sourcePackId !== expected.sourcePackId
      || source.sourceLessonId !== expected.sourceLessonId
      || !exact(source.text, expected.text)
      || !exact(source.sourceSummary, expected.sourceSummary)
      || source.text.kind !== "graded-listening"
      || source.sourceSummary.skill !== "speaking"
      || source.sourceSummary.review !== "pending"
      || source.sourceSummary.measurementEligible !== false
      || source.sourceSummary.masteryEligible !== false
  ) {
      errors.push(
        `${source.textId ?? "unknown"} event-retelling source is stale`,
      );
    }
    selectedSourceById.set(source.textId, source);
  }

  const blueprintById = new Map(
    blueprintBundle.pack.lessons.map((lesson) => [
      lesson.lessonId,
      lesson,
    ]),
  );
  const lessons = Array.isArray(pack.lessons) ? pack.lessons : [];
  if (
    lessons.length !== HSK3_EVENT_RETELLING_LESSON_IDS.length
    || !exact(
      lessons.map((lesson) => lesson.lessonId),
      HSK3_EVENT_RETELLING_LESSON_IDS,
    )
  ) {
    errors.push("HSK3 event-retelling lesson partition is invalid");
  }
  const allItems = [];
  const usedSourceTextIds = [];
  for (const lesson of lessons) {
    const blueprint = blueprintById.get(lesson.lessonId);
    const items = Array.isArray(lesson.promptUnits)
      ? lesson.promptUnits
      : [];
    if (
      blueprint?.trackId !== HSK3_EVENT_RETELLING_TRACK_ID
      || blueprint?.blueprintKind !== "guided-production"
      || lesson.blueprintTitleVi !== blueprint.titleVi
      || lesson.blueprintObjectiveVi !== blueprint.objectiveVi
      || !exact(
        lesson.contextDomainIds,
        blueprint.promptPlan.contextDomainIds,
      )
      || items.length !== blueprint.promptPlan.minimumPromptUnits
    ) {
      errors.push(`${lesson.lessonId} event-retelling blueprint is invalid`);
    }
    const expectedKind = PROMPT_KIND_BY_LESSON.get(lesson.lessonId);
    const expectedStructureSlots =
      STRUCTURE_SLOTS_BY_KIND.get(expectedKind);
    for (const [index, item] of items.entries()) {
      allItems.push(item);
      usedSourceTextIds.push(item.sourceTextId);
      const source = selectedSourceById.get(item.sourceTextId);
      const summary = source?.sourceSummary;
      const expectedModel = {
        hanzi: summary?.modelHanzi,
        pinyin: summary?.modelPinyin,
        vietnamese: summary?.modelVi,
      };
      const expectedLineIds =
        source?.text?.lines?.map((line) => line.lineId) ?? [];
      if (
        item.itemId
          !== `${lesson.lessonId}:prompt-${String(index + 1).padStart(2, "0")}`
        || item.lessonId !== lesson.lessonId
        || item.mode !== blueprint?.promptPlan.mode
        || item.promptKind !== expectedKind
        || !source
        || item.sourceSummaryItemId !== summary?.itemId
        || item.inputSkill !== "listening"
        || item.responseSkill !== "speaking"
        || !validText(item.promptVi, 30, 600)
        || !exact(item.noteCardElementsVi, summary?.requiredElements)
        || item.noteCardElementsVi?.length !== 4
        || !exact(item.evidenceLineIds, expectedLineIds)
        || !exact(item.structureSlotsVi, expectedStructureSlots)
        || !exact(item.modelRetelling, expectedModel)
        || !Array.isArray(item.selfCheckDimensionsVi)
        || item.selfCheckDimensionsVi.length !== 4
        || item.selfCheckDimensionsVi.some(
          (dimension) => !validText(dimension, 8, 240),
        )
        || !Array.isArray(item.revisionChecklistVi)
        || item.revisionChecklistVi.length !== 4
        || item.revisionChecklistVi.some(
          (step) => !validText(step, 8, 300),
        )
        || item.recordingAttemptRequired !== true
        || item.responseMode
          !== "listen-note-record-reveal-revise-record"
        || item.audio !== null
        || item.syntheticBrowserVoicePreviewOnly !== true
        || item.reviewedSourceAudioRequiredForRelease !== true
        || item.reviewedLearnerRecordingRubricRequiredForMastery !== true
        || item.scoringPolicy !== "source-exposed-practice-only"
        || item.reviewedRubric !== null
        || item.modelRevealCanGrantMastery !== false
        || !failClosed(item)
      ) {
        errors.push(
          `${item.itemId ?? "unknown"} event-retelling item is invalid`,
        );
      }
    }
    const batch = lesson.reviewBatch;
    if (
      batch?.batchId !== `${lesson.lessonId}:event-retelling-review-v1`
      || batch.lessonId !== lesson.lessonId
      || !exact(
        batch.promptItemIds,
        items.map((item) => item.itemId),
      )
      || !exact(batch.requiredRoles, REQUIRED_REVIEW_ROLES)
      || batch.state !== "pending"
      || !exact(batch.approvals, [])
    ) {
      errors.push(`${lesson.lessonId} event-retelling review batch is invalid`);
    }
  }
  if (
    duplicates(allItems.map((item) => item.itemId)).length > 0
    || duplicates(usedSourceTextIds).length > 0
    || !exact(
      [...usedSourceTextIds].sort(),
      [...sourceCatalog.keys()].sort(),
    )
    || !exact(
      pack.reviewBatches,
      lessons.map((lesson) => lesson.reviewBatch),
    )
  ) {
    errors.push("HSK3 event-retelling IDs or review batches are invalid");
  }
  const expectedCounts = {
    lessons: lessons.length,
    completedGuidedProductionStages: 3,
    completedGuidedProductionLessons: 9,
    sourceTexts: sourceTexts.length,
    sourceTextLines: sourceTexts.flatMap(
      (source) => source.text?.lines ?? [],
    ).length,
    sourceGuidedSummaries: sourceTexts.length,
    promptUnits: allItems.length,
    noteCardRetellingPromptUnits: allItems.filter(
      (item) => item.promptKind === "note-card-event-retelling",
    ).length,
    changeCauseRetellingPromptUnits: allItems.filter(
      (item) => item.promptKind === "change-cause-event-retelling",
    ).length,
    structuredRetellingPromptUnits: allItems.filter(
      (item) =>
        item.promptKind === "opening-body-closing-event-retelling",
    ).length,
    modelRetellings: allItems.length,
    revisionChecklists: allItems.length,
    audioDependentPromptUnits: allItems.length,
    reviewedAudioPromptUnits: 0,
    learnerRecordingPromptUnits: allItems.length,
    reviewedLearnerRecordingRubrics: 0,
    measurementEligibleItems: 0,
    masteryEligibleItems: 0,
    reviewBatches: lessons.length,
    approvals: 0,
    releaseEligibleItems: 0,
  };
  if (!exact(pack.counts, expectedCounts)) {
    errors.push("HSK3 event-retelling summary counts are stale");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expectedCounts,
  };
};

export const assertValidHsk3EventRetellingPackBundle = (bundle) => {
  const result = validateHsk3EventRetellingPackBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK3 event-retelling pack:\n- ${
        result.errors.join("\n- ")
      }`,
    );
  }
  return result;
};
