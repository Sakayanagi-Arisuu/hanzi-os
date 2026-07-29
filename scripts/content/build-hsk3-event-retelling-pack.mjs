import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectHsk3RetellingSourceCatalog,
  HSK3_EVENT_RETELLING_LESSON_IDS,
  HSK3_EVENT_RETELLING_PACK_RELATIVE_PATH,
  HSK3_EVENT_RETELLING_TRACK_ID,
} from "../../src/content/hsk3EventRetellingPack.mjs";
import {
  assertValidHsk3CohesionReconstructionPackBundle,
  loadHsk3CohesionReconstructionPackBundle,
} from "../../src/content/hsk3CohesionReconstructionPack.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

const LISTENING_TEXT_IDS_BY_LESSON = new Map([
  [
    HSK3_EVENT_RETELLING_LESSON_IDS[0],
    [
      "hsk3-study-work-accounts-courses-learning:listening-01",
      "hsk3-study-work-accounts-campus-education:listening-01",
      "hsk3-study-work-accounts-office-tasks:listening-01",
      "hsk3-study-work-accounts-colleague-workplace:listening-01",
      "hsk3-study-work-accounts-career-experience:listening-01",
      "hsk3-nature-environment-explanations-climate-seasons:listening-01",
      "hsk3-nature-environment-explanations-plants-animals:listening-01",
    ],
  ],
  [
    HSK3_EVENT_RETELLING_LESSON_IDS[1],
    [
      "hsk3-nature-environment-explanations-landscape-place:listening-01",
      "hsk3-nature-environment-explanations-environment-state:listening-01",
      "hsk3-nature-environment-explanations-environment-protection:listening-01",
      "hsk3-society-arts-sports-reports-modern-life:listening-01",
      "hsk3-society-arts-sports-reports-city-development:listening-01",
      "hsk3-society-arts-sports-reports-arts-activities:listening-01",
      "hsk3-society-arts-sports-reports-sports-introduction:listening-01",
    ],
  ],
  [
    HSK3_EVENT_RETELLING_LESSON_IDS[2],
    [
      "hsk3-society-arts-sports-reports-competition-report:listening-01",
      "hsk3-culture-tradition-descriptions-regional-cuisine:listening-01",
      "hsk3-culture-tradition-descriptions-tableware-etiquette:listening-01",
      "hsk3-culture-tradition-descriptions-festivals-customs:listening-01",
      "hsk3-culture-tradition-descriptions-regional-differences:listening-01",
      "hsk3-culture-tradition-descriptions-customs-comparison:listening-01",
    ],
  ],
]);
const KIND_BY_LESSON = new Map([
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
const SELF_CHECK_DIMENSIONS = [
  "Đủ bốn ý bắt buộc trong thẻ ghi chú.",
  "Trật tự sự kiện và quan hệ nguyên nhân–kết quả đúng với nguồn.",
  "Có từ nối nhưng không thêm người, số liệu hay kết quả ngoài nguồn.",
  "Bản kể liền mạch, rõ tiếng và có thể hiểu mà không nhìn văn bản.",
];
const REVISION_CHECKLIST = [
  "Nghe lượt đầu không nhìn lời thoại; chỉ ghi bốn từ khóa của thẻ.",
  "Thu bản kể thứ nhất rồi đối chiếu từng ý với tám dòng bằng chứng.",
  "Chỉ sau đó mới mở mẫu, đánh dấu một thiếu sót về nội dung và một thiếu sót về diễn đạt.",
  "Thu lại bản thứ hai từ thẻ ghi chú; không đọc chép mẫu và không tự tính mastery.",
];
const REQUIRED_REVIEW_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "assessment-editor",
  "audio-rights-reviewer",
];

const makePrompt = ({ lesson, index, source }) => {
  const promptKind = KIND_BY_LESSON.get(lesson.lessonId);
  const promptLead = promptKind === "note-card-event-retelling"
    ? "Dùng bốn ý bắt buộc làm thẻ ghi chú và kể lại sự kiện"
    : promptKind === "change-cause-event-retelling"
      ? "Kể lại trạng thái ban đầu, thay đổi, nguyên nhân và kết quả"
      : "Kể lại thành một đoạn có mở–thân–kết";
  return {
    itemId:
      `${lesson.lessonId}:prompt-${String(index + 1).padStart(2, "0")}`,
    lessonId: lesson.lessonId,
    mode: lesson.promptPlan.mode,
    promptKind,
    sourceTextId: source.textId,
    sourceSummaryItemId: source.sourceSummary.itemId,
    inputSkill: "listening",
    responseSkill: "speaking",
    promptVi:
      `${promptLead} “${source.text.titleVi}”. Nghe trước, tự thu âm, rồi mới xem mẫu để sửa và thu lại.`,
    noteCardElementsVi: source.sourceSummary.requiredElements,
    evidenceLineIds: source.text.lines.map((line) => line.lineId),
    structureSlotsVi: STRUCTURE_SLOTS_BY_KIND.get(promptKind),
    modelRetelling: {
      hanzi: source.sourceSummary.modelHanzi,
      pinyin: source.sourceSummary.modelPinyin,
      vietnamese: source.sourceSummary.modelVi,
    },
    selfCheckDimensionsVi: SELF_CHECK_DIMENSIONS,
    revisionChecklistVi: REVISION_CHECKLIST,
    recordingAttemptRequired: true,
    responseMode: "listen-note-record-reveal-revise-record",
    audio: null,
    syntheticBrowserVoicePreviewOnly: true,
    reviewedSourceAudioRequiredForRelease: true,
    reviewedLearnerRecordingRubricRequiredForMastery: true,
    scoringPolicy: "source-exposed-practice-only",
    reviewedRubric: null,
    modelRevealCanGrantMastery: false,
    review: "pending",
    measurementEligible: false,
    masteryEligible: false,
    releaseEligible: false,
  };
};

export const buildHsk3EventRetellingPack = (
  root = process.cwd(),
) => {
  const prerequisiteBundle =
    loadHsk3CohesionReconstructionPackBundle(root);
  assertValidHsk3CohesionReconstructionPackBundle(prerequisiteBundle);
  const paragraphBundle = prerequisiteBundle.paragraphBundle;
  const blueprintBundle = prerequisiteBundle.blueprintBundle;
  const blueprintById = new Map(
    blueprintBundle.pack.lessons.map((lesson) => [
      lesson.lessonId,
      lesson,
    ]),
  );
  const sourceCatalog =
    collectHsk3RetellingSourceCatalog(paragraphBundle);
  const selectedTextIds = HSK3_EVENT_RETELLING_LESSON_IDS.flatMap(
    (lessonId) => LISTENING_TEXT_IDS_BY_LESSON.get(lessonId),
  );
  const sourceTexts = selectedTextIds.map((textId) => {
    const source = sourceCatalog.get(textId);
    if (!source) {
      throw new Error(`Missing HSK3 event-retelling source ${textId}`);
    }
    return {
      textId,
      sourcePackId: source.sourcePackId,
      sourceLessonId: source.sourceLessonId,
      text: source.text,
      sourceSummary: source.sourceSummary,
    };
  });
  const sourceById = new Map(
    sourceTexts.map((source) => [source.textId, source]),
  );
  const lessons = HSK3_EVENT_RETELLING_LESSON_IDS.map((lessonId) => {
    const blueprint = blueprintById.get(lessonId);
    const promptUnits = LISTENING_TEXT_IDS_BY_LESSON.get(lessonId).map(
      (textId, index) =>
        makePrompt({
          lesson: blueprint,
          index,
          source: sourceById.get(textId),
        }),
    );
    const reviewBatch = {
      batchId: `${lessonId}:event-retelling-review-v1`,
      lessonId,
      promptItemIds: promptUnits.map((item) => item.itemId),
      requiredRoles: REQUIRED_REVIEW_ROLES,
      state: "pending",
      approvals: [],
    };
    return {
      lessonId,
      blueprintTitleVi: blueprint.titleVi,
      blueprintObjectiveVi: blueprint.objectiveVi,
      contextDomainIds: blueprint.promptPlan.contextDomainIds,
      promptUnits,
      reviewBatch,
    };
  });
  const allItems = lessons.flatMap((lesson) => lesson.promptUnits);
  const counts = {
    lessons: lessons.length,
    completedGuidedProductionStages: 3,
    completedGuidedProductionLessons: 9,
    sourceTexts: sourceTexts.length,
    sourceTextLines: sourceTexts.flatMap(
      (source) => source.text.lines,
    ).length,
    sourceGuidedSummaries: sourceTexts.length,
    promptUnits: allItems.length,
    noteCardRetellingPromptUnits: lessons[0].promptUnits.length,
    changeCauseRetellingPromptUnits: lessons[1].promptUnits.length,
    structuredRetellingPromptUnits: lessons[2].promptUnits.length,
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
  return {
    schemaVersion: 1,
    packId: "hsk3-event-retelling-2026.07",
    level: 3,
    trackId: HSK3_EVENT_RETELLING_TRACK_ID,
    state: "ai-assisted-guided-production-draft",
    learnerVisible: false,
    releaseEligible: false,
    derivedArtifactLicense: "CC-BY-SA-4.0",
    source: {
      lessonBlueprintPackId: blueprintBundle.pack.packId,
      lessonBlueprintPackSha256: fileSha256(blueprintBundle.packPath),
      prerequisitePackId: prerequisiteBundle.pack.packId,
      prerequisitePackSha256: fileSha256(prerequisiteBundle.packPath),
      paragraphSourceTipPackId: paragraphBundle.pack.packId,
      paragraphSourceTipPackSha256: fileSha256(paragraphBundle.packPath),
    },
    authorship: {
      method: "ai-assisted-event-retelling-draft",
      assistant: "OpenAI Codex",
      nativeMandarinReviewer: null,
      vietnameseEditor: null,
      assessmentEditor: null,
      audioRightsReviewer: null,
    },
    reviewPolicy: {
      nativeMandarinRequiredForRelease: true,
      vietnameseEditorialRequiredForRelease: true,
      assessmentReviewRequiredForRelease: true,
      audioRightsRequiredForRelease: true,
      sourceExposedPracticeCannotCalibrateAssessment: true,
    },
    masteryPolicy: {
      listeningSeparatedFromSpeakingEvidence: true,
      modelRevealCannotGrantMastery: true,
      browserTtsCannotGrantListeningMastery: true,
      selfRecordingCannotGrantSpeakingMastery: true,
      reviewedSourceAudioRequiredForListeningMastery: true,
      reviewedLearnerRecordingRubricRequiredForSpeakingMastery: true,
      newCharacterOwnershipClaims: 0,
      sourceRecognitionCharacterMappings:
        blueprintBundle.pack.counts.recognitionCharacterBlueprintMappings,
    },
    coverageClaims: {
      stagePromptDraftsComplete: true,
      completedGuidedProductionStages: 3,
      completedGuidedProductionLessons: 9,
      allGuidedProductionLessonsComplete: false,
      reviewedContentComplete: false,
      assessmentCoverageComplete: false,
      hsk3Complete: false,
    },
    counts,
    sourceTexts,
    lessons,
    reviewBatches: lessons.map((lesson) => lesson.reviewBatch),
  };
};

export const serializeHsk3EventRetellingPack = (pack) =>
  `${JSON.stringify(pack)}\n`;

const main = () => {
  const outputPath = resolve(
    process.cwd(),
    HSK3_EVENT_RETELLING_PACK_RELATIVE_PATH,
  );
  const serialized = serializeHsk3EventRetellingPack(
    buildHsk3EventRetellingPack(),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK3 event-retelling pack is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK3_EVENT_RETELLING_PACK_RELATIVE_PATH,
    mode: process.argv.includes("--write")
      ? "write"
      : process.argv.includes("--check")
        ? "check"
        : "stdout",
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
