import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectHsk3StructuredExplanationSourceCatalog,
  HSK3_STRUCTURED_EXPLANATION_LESSON_IDS,
  HSK3_STRUCTURED_EXPLANATION_PACK_RELATIVE_PATH,
  HSK3_STRUCTURED_EXPLANATION_TRACK_ID,
} from "../../src/content/hsk3StructuredExplanationPack.mjs";
import {
  assertValidHsk3GuidedParagraphPackBundle,
  loadHsk3GuidedParagraphPackBundle,
} from "../../src/content/hsk3GuidedParagraphPack.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

const SOURCE_PAIRS_BY_LESSON = new Map([
  [
    HSK3_STRUCTURED_EXPLANATION_LESSON_IDS[0],
    [
      [
        "hsk3-nature-environment-explanations-climate-seasons:listening-01",
        "hsk3-society-arts-sports-reports-modern-life:listening-01",
      ],
      [
        "hsk3-nature-environment-explanations-plants-animals:listening-01",
        "hsk3-society-arts-sports-reports-city-development:listening-01",
      ],
      [
        "hsk3-nature-environment-explanations-landscape-place:listening-01",
        "hsk3-society-arts-sports-reports-arts-activities:listening-01",
      ],
      [
        "hsk3-nature-environment-explanations-environment-state:listening-01",
        "hsk3-society-arts-sports-reports-sports-introduction:listening-01",
      ],
    ],
  ],
  [
    HSK3_STRUCTURED_EXPLANATION_LESSON_IDS[1],
    [
      [
        "hsk3-society-arts-sports-reports-city-development:listening-01",
        "hsk3-culture-tradition-descriptions-regional-cuisine:listening-01",
      ],
      [
        "hsk3-society-arts-sports-reports-arts-activities:listening-01",
        "hsk3-culture-tradition-descriptions-tableware-etiquette:listening-01",
      ],
      [
        "hsk3-society-arts-sports-reports-sports-introduction:listening-01",
        "hsk3-culture-tradition-descriptions-festivals-customs:listening-01",
      ],
      [
        "hsk3-society-arts-sports-reports-competition-report:listening-01",
        "hsk3-culture-tradition-descriptions-regional-differences:listening-01",
      ],
    ],
  ],
  [
    HSK3_STRUCTURED_EXPLANATION_LESSON_IDS[2],
    [
      [
        "hsk3-culture-tradition-descriptions-tableware-etiquette:listening-01",
        "hsk3-personal-life-narratives-identity-transactions:listening-01",
      ],
      [
        "hsk3-culture-tradition-descriptions-festivals-customs:listening-01",
        "hsk3-personal-life-narratives-food-shopping:listening-01",
      ],
      [
        "hsk3-culture-tradition-descriptions-regional-differences:listening-01",
        "hsk3-personal-life-narratives-travel-transport:listening-01",
      ],
      [
        "hsk3-culture-tradition-descriptions-customs-comparison:listening-01",
        "hsk3-personal-life-narratives-health-care:listening-01",
      ],
    ],
  ],
]);
const KIND_BY_LESSON = new Map([
  [
    HSK3_STRUCTURED_EXPLANATION_LESSON_IDS[0],
    "choice-and-reason-spoken-explanation",
  ],
  [
    HSK3_STRUCTURED_EXPLANATION_LESSON_IDS[1],
    "criteria-based-spoken-comparison",
  ],
  [
    HSK3_STRUCTURED_EXPLANATION_LESSON_IDS[2],
    "bounded-viewpoint-spoken-explanation",
  ],
]);
const TURN_PLAN_BY_KIND = new Map([
  [
    "choice-and-reason-spoken-explanation",
    [
      "Câu 1 nêu lựa chọn rõ ràng.",
      "Câu 2 dẫn một chi tiết từ nguồn A hoặc B.",
      "Câu 3 giải thích vì sao chi tiết đó hỗ trợ lựa chọn.",
      "Câu 4 nêu một giới hạn hoặc điều kiện có thể làm lựa chọn thay đổi.",
    ],
  ],
  [
    "criteria-based-spoken-comparison",
    [
      "Câu 1 giới thiệu hai trường hợp mà không xếp hạng trước.",
      "Câu 2 nêu một điểm giống có bằng chứng.",
      "Câu 3 trình bày cách xử lý của trường hợp A.",
      "Câu 4 trình bày cách xử lý của trường hợp B.",
      "Câu 5 so sánh kết quả theo một tiêu chí đã chọn.",
      "Câu 6 kết luận trong giới hạn của hai nguồn.",
    ],
  ],
  [
    "bounded-viewpoint-spoken-explanation",
    [
      "Câu 1 nêu quan điểm bằng phạm vi cụ thể.",
      "Câu 2 dẫn bằng chứng từ nguồn A.",
      "Câu 3 dẫn bằng chứng từ nguồn B.",
      "Câu 4 giải thích điểm chung hoặc khác biệt liên quan.",
      "Câu 5 thừa nhận một điều kiện hay phản biện hợp lý.",
      "Câu 6 kết luận mà không biến hai ví dụ thành quy luật chung.",
    ],
  ],
]);
const DECISION_QUESTION_BY_KIND = new Map([
  [
    "choice-and-reason-spoken-explanation",
    "Nếu chỉ được chọn một cách xử lý cho tình huống tương tự, bạn chọn cách nào? Nêu lý do, bằng chứng và một điều kiện có thể làm bạn đổi lựa chọn.",
  ],
  [
    "criteria-based-spoken-comparison",
    "Hai trường hợp giống và khác nhau thế nào về vấn đề, cách xử lý, nguồn lực và kết quả? Chỉ kết luận trong phạm vi bằng chứng đã nghe.",
  ],
  [
    "bounded-viewpoint-spoken-explanation",
    "Từ hai trường hợp, bạn đồng ý với quan điểm nào trong điều kiện nào? Nêu bằng chứng, một phản biện và giới hạn của kết luận.",
  ],
]);
const CRITERIA = [
  "Mục tiêu, bối cảnh hoặc vấn đề ban đầu.",
  "Cách xử lý và nguồn lực được sử dụng.",
  "Kết quả thực tế có trong nguồn.",
  "Điều kiện, giới hạn hoặc bài học không được khái quát quá mức.",
];
const REVISION_CHECKLIST = [
  "Nghe từng nguồn mà không nhìn lời thoại và ghi tối đa bốn từ khóa.",
  "Lập dàn ý theo lượt nói, rồi thu bản đầu trước khi mở model evidence.",
  "Đối chiếu mọi lý do với tám dòng của từng nguồn; xóa chi tiết tự suy đoán.",
  "Thu bản hai rõ hơn, có giới hạn hoặc phản biện; tự thu vẫn không cấp mastery.",
];
const REQUIRED_REVIEW_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "assessment-editor",
  "audio-rights-reviewer",
];

const makePrompt = ({ lesson, index, sources }) => {
  const promptKind = KIND_BY_LESSON.get(lesson.lessonId);
  const speakingTurnPlanVi = TURN_PLAN_BY_KIND.get(promptKind);
  return {
    itemId:
      `${lesson.lessonId}:prompt-${String(index + 1).padStart(2, "0")}`,
    lessonId: lesson.lessonId,
    mode: lesson.promptPlan.mode,
    promptKind,
    inputRefs: sources.map((source, sourceIndex) => ({
      textId: source.textId,
      role: sourceIndex === 0 ? "case-a" : "case-b",
    })),
    inputSkill: "listening",
    responseSkill: "speaking",
    promptVi:
      `Nghe “${sources[0].text.titleVi}” và “${sources[1].text.titleVi}”, lập dàn ý rồi trình bày bằng lời của bạn trước khi mở mẫu.`,
    decisionQuestionVi: DECISION_QUESTION_BY_KIND.get(promptKind),
    evidenceLineIdsByText: sources.map((source) => ({
      textId: source.textId,
      lineIds: source.text.lines.map((line) => line.lineId),
    })),
    requiredEvidenceElementsVi: sources.map((source) => ({
      textId: source.textId,
      elementsVi: source.sourceSummary.requiredElements,
    })),
    modelEvidenceSummaries: sources.map((source) => ({
      sourceSummaryItemId: source.sourceSummary.itemId,
      textId: source.textId,
      hanzi: source.sourceSummary.modelHanzi,
      pinyin: source.sourceSummary.modelPinyin,
      vietnamese: source.sourceSummary.modelVi,
    })),
    criteriaVi: CRITERIA,
    speakingTurnPlanVi,
    minimumSpokenSentences: speakingTurnPlanVi.length,
    limitOrCounterpointRequired: true,
    revisionChecklistVi: REVISION_CHECKLIST,
    minimumRecordingAttempts: 2,
    responseMode: "listen-plan-record-reveal-revise-record",
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

export const buildHsk3StructuredExplanationPack = (
  root = process.cwd(),
) => {
  const prerequisiteBundle = loadHsk3GuidedParagraphPackBundle(root);
  assertValidHsk3GuidedParagraphPackBundle(prerequisiteBundle);
  const paragraphBundle = prerequisiteBundle.paragraphBundle;
  const blueprintBundle = prerequisiteBundle.blueprintBundle;
  const sourceCatalog =
    collectHsk3StructuredExplanationSourceCatalog(paragraphBundle);
  const blueprintById = new Map(
    blueprintBundle.pack.lessons.map((lesson) => [
      lesson.lessonId,
      lesson,
    ]),
  );
  const selectedTextIds = [
    ...new Set(
      HSK3_STRUCTURED_EXPLANATION_LESSON_IDS.flatMap(
        (lessonId) => SOURCE_PAIRS_BY_LESSON.get(lessonId).flat(),
      ),
    ),
  ];
  const sourceTexts = selectedTextIds.map((textId) => {
    const source = sourceCatalog.get(textId);
    if (!source) {
      throw new Error(
        `Missing HSK3 structured-explanation source ${textId}`,
      );
    }
    return {
      textId,
      sourcePackId: source.sourcePackId,
      sourceLessonId: source.sourceLessonId,
      sourceDomainId: source.sourceDomainId,
      text: source.text,
      sourceSummary: source.sourceSummary,
    };
  });
  const sourceById = new Map(
    sourceTexts.map((source) => [source.textId, source]),
  );
  const lessons = HSK3_STRUCTURED_EXPLANATION_LESSON_IDS.map(
    (lessonId) => {
      const blueprint = blueprintById.get(lessonId);
      const promptUnits = SOURCE_PAIRS_BY_LESSON.get(lessonId).map(
        (pair, index) =>
          makePrompt({
            lesson: blueprint,
            index,
            sources: pair.map((textId) => sourceById.get(textId)),
          }),
      );
      const reviewBatch = {
        batchId: `${lessonId}:structured-explanation-review-v1`,
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
    },
  );
  const allItems = lessons.flatMap((lesson) => lesson.promptUnits);
  const counts = {
    lessons: lessons.length,
    completedGuidedProductionStages: 5,
    completedGuidedProductionLessons: 15,
    sourceTexts: sourceTexts.length,
    sourceTextLines: sourceTexts.flatMap(
      (source) => source.text.lines,
    ).length,
    sourceInputBindings: allItems.reduce(
      (total, item) => total + item.inputRefs.length,
      0,
    ),
    sourceGuidedSummaries: sourceTexts.length,
    promptUnits: allItems.length,
    choiceReasonPromptUnits: lessons[0].promptUnits.length,
    criteriaComparisonPromptUnits: lessons[1].promptUnits.length,
    boundedViewpointPromptUnits: lessons[2].promptUnits.length,
    modelEvidenceSummaries: allItems.reduce(
      (total, item) => total + item.modelEvidenceSummaries.length,
      0,
    ),
    minimumSpokenSentences: allItems.reduce(
      (total, item) => total + item.minimumSpokenSentences,
      0,
    ),
    requiredRecordingAttempts: allItems.reduce(
      (total, item) => total + item.minimumRecordingAttempts,
      0,
    ),
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
    packId: "hsk3-structured-explanation-2026.07",
    level: 3,
    trackId: HSK3_STRUCTURED_EXPLANATION_TRACK_ID,
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
      method: "ai-assisted-structured-explanation-draft",
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
      completedGuidedProductionStages: 5,
      completedGuidedProductionLessons: 15,
      allGuidedProductionLessonsComplete: true,
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

export const serializeHsk3StructuredExplanationPack = (pack) =>
  `${JSON.stringify(pack)}\n`;

const main = () => {
  const outputPath = resolve(
    process.cwd(),
    HSK3_STRUCTURED_EXPLANATION_PACK_RELATIVE_PATH,
  );
  const serialized = serializeHsk3StructuredExplanationPack(
    buildHsk3StructuredExplanationPack(),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error(
        "Checked HSK3 structured-explanation pack is stale",
      );
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK3_STRUCTURED_EXPLANATION_PACK_RELATIVE_PATH,
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
