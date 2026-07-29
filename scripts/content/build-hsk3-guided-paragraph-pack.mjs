import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectHsk3GuidedParagraphSourceCatalog,
  HSK3_GUIDED_PARAGRAPH_LESSON_IDS,
  HSK3_GUIDED_PARAGRAPH_PACK_RELATIVE_PATH,
  HSK3_GUIDED_PARAGRAPH_TRACK_ID,
} from "../../src/content/hsk3GuidedParagraphPack.mjs";
import {
  assertValidHsk3EventRetellingPackBundle,
  loadHsk3EventRetellingPackBundle,
} from "../../src/content/hsk3EventRetellingPack.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

const FIRST_SOURCE_IDS = [
  "hsk3-culture-tradition-descriptions-regional-cuisine:reading-01",
  "hsk3-culture-tradition-descriptions-tableware-etiquette:reading-01",
  "hsk3-culture-tradition-descriptions-festivals-customs:reading-01",
  "hsk3-personal-life-narratives-food-shopping:reading-01",
  "hsk3-personal-life-narratives-travel-transport:reading-01",
  "hsk3-personal-life-narratives-health-care:reading-01",
];
const COMPARISON_SOURCE_PAIRS = [
  [
    "hsk3-personal-life-narratives-identity-transactions:reading-01",
    "hsk3-study-work-accounts-courses-learning:reading-01",
  ],
  [
    "hsk3-personal-life-narratives-food-shopping:reading-01",
    "hsk3-study-work-accounts-campus-education:reading-01",
  ],
  [
    "hsk3-personal-life-narratives-travel-transport:reading-01",
    "hsk3-study-work-accounts-office-tasks:reading-01",
  ],
  [
    "hsk3-personal-life-narratives-health-care:reading-01",
    "hsk3-study-work-accounts-colleague-workplace:reading-01",
  ],
  [
    "hsk3-personal-life-narratives-home-family-leisure:reading-01",
    "hsk3-study-work-accounts-career-experience:reading-01",
  ],
];
const THIRD_SOURCE_IDS = [
  "hsk3-study-work-accounts-courses-learning:reading-01",
  "hsk3-study-work-accounts-office-tasks:reading-01",
  "hsk3-nature-environment-explanations-climate-seasons:reading-01",
  "hsk3-nature-environment-explanations-landscape-place:reading-01",
  "hsk3-nature-environment-explanations-environment-protection:reading-01",
];
const KIND_BY_LESSON = new Map([
  [
    HSK3_GUIDED_PARAGRAPH_LESSON_IDS[0],
    "six-sentence-question-guided-paragraph",
  ],
  [
    HSK3_GUIDED_PARAGRAPH_LESSON_IDS[1],
    "evidence-based-comparison-paragraph",
  ],
  [
    HSK3_GUIDED_PARAGRAPH_LESSON_IDS[2],
    "eight-sentence-cohesion-revision-paragraph",
  ],
]);
const SENTENCE_GUIDES = new Map([
  [
    "six-sentence-question-guided-paragraph",
    [
      "Câu 1 đặt nhân vật, nơi chốn hoặc thời điểm.",
      "Câu 2 nêu mục tiêu hay trạng thái ban đầu.",
      "Câu 3 kể sự kiện hoặc vấn đề chính.",
      "Câu 4 nêu cách nhân vật phản ứng hay xử lý.",
      "Câu 5 nêu kết quả có trong nguồn.",
      "Câu 6 kết bằng bài học hoặc ý nghĩa, không thêm dữ kiện.",
    ],
  ],
  [
    "evidence-based-comparison-paragraph",
    [
      "Câu 1 giới thiệu hai trường hợp sẽ so sánh.",
      "Câu 2 nêu mục tiêu hoặc vấn đề chung.",
      "Câu 3 trình bày bằng chứng cụ thể của trường hợp A.",
      "Câu 4 trình bày bằng chứng cụ thể của trường hợp B.",
      "Câu 5 nêu một điểm giống và một điểm khác có căn cứ.",
      "Câu 6 kết luận trong giới hạn của hai nguồn, không xếp hạng tùy ý.",
    ],
  ],
  [
    "eight-sentence-cohesion-revision-paragraph",
    [
      "Câu 1 đặt bối cảnh và chủ thể.",
      "Câu 2 nêu trạng thái hoặc kế hoạch ban đầu.",
      "Câu 3 đưa sự kiện mới theo đúng thứ tự nguồn.",
      "Câu 4 giải thích nguyên nhân hoặc điều kiện.",
      "Câu 5 kể hành động xử lý.",
      "Câu 6 nêu thay đổi do hành động đó tạo ra.",
      "Câu 7 nêu kết quả cuối có bằng chứng.",
      "Câu 8 khép ý nghĩa và nối lại chủ đề mở đoạn.",
    ],
  ],
]);
const COHESION_SELF_AUDIT = [
  "Mỗi đại từ hoặc cách gọi tắt có đối tượng quy chiếu rõ.",
  "Mốc thời gian và trật tự câu không làm đảo diễn biến nguồn.",
  "Từ nối nguyên nhân, đối lập hay kết quả đúng với quan hệ thực.",
  "Không lặp nguyên câu mẫu, không bỏ ý bắt buộc và không thêm kết luận mới.",
];
const REVISION_CHECKLIST = [
  "Lập dàn ý và ghi mã dòng bằng chứng trước khi viết.",
  "Viết bản đầu đủ số câu mà chưa mở model evidence summary.",
  "Đối chiếu từng ý và từ nối với nguồn; đánh dấu ít nhất hai chỗ cần sửa.",
  "Viết lại bản cuối bằng lời của mình; xem mẫu không được tính writing mastery.",
];
const COMPARISON_CRITERIA = [
  "Bối cảnh và mục tiêu ban đầu.",
  "Vấn đề, thay đổi hoặc trở ngại.",
  "Cách xử lý và nguồn lực được dùng.",
  "Kết quả, giới hạn hoặc bài học.",
];
const REQUIRED_REVIEW_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "assessment-editor",
];

const modelEvidenceSummary = (source) => ({
  sourceSummaryItemId: source.sourceSummary.itemId,
  textId: source.textId,
  hanzi: source.sourceSummary.modelHanzi,
  pinyin: source.sourceSummary.modelPinyin,
  vietnamese: source.sourceSummary.modelVi,
});

const makePrompt = ({ lesson, index, sources }) => {
  const promptKind = KIND_BY_LESSON.get(lesson.lessonId);
  const inputRefs = sources.map((source, sourceIndex) => ({
    textId: source.textId,
    role: sources.length === 2
      ? sourceIndex === 0 ? "case-a" : "case-b"
      : "primary-source",
  }));
  const promptLead = promptKind === "evidence-based-comparison-paragraph"
    ? `Đọc “${sources[0].text.titleVi}” và “${sources[1].text.titleVi}”, rồi viết đoạn so sánh có dẫn chứng.`
    : promptKind === "eight-sentence-cohesion-revision-paragraph"
      ? `Viết đoạn tám câu về “${sources[0].text.titleVi}”, rồi tự sửa liên kết.`
      : `Trả lời sáu câu hỏi dẫn để viết đoạn sáu câu về “${sources[0].text.titleVi}”.`;
  const minimumSentenceCount =
    SENTENCE_GUIDES.get(promptKind).length;
  return {
    itemId:
      `${lesson.lessonId}:prompt-${String(index + 1).padStart(2, "0")}`,
    lessonId: lesson.lessonId,
    mode: lesson.promptPlan.mode,
    promptKind,
    inputRefs,
    inputSkill: "reading",
    responseSkill: "writing",
    promptVi:
      `${promptLead} Mỗi ý quan trọng phải truy được về dòng nguồn; chỉ mở phần mẫu sau bản đầu.`,
    evidenceLineIdsByText: sources.map((source) => ({
      textId: source.textId,
      lineIds: source.text.lines.map((line) => line.lineId),
    })),
    requiredEvidenceElementsVi: sources.map((source) => ({
      textId: source.textId,
      elementsVi: source.sourceSummary.requiredElements,
    })),
    modelEvidenceSummaries: sources.map(modelEvidenceSummary),
    minimumSentenceCount,
    maximumSentenceCount: 8,
    sentenceGuideVi: SENTENCE_GUIDES.get(promptKind),
    comparisonCriteriaVi:
      promptKind === "evidence-based-comparison-paragraph"
        ? COMPARISON_CRITERIA
        : null,
    cohesionSelfAuditVi: COHESION_SELF_AUDIT,
    revisionChecklistVi: REVISION_CHECKLIST,
    writingDraftRequired: true,
    revisedDraftRequired: true,
    responseMode: "read-plan-write-reveal-revise",
    scoringPolicy: "source-exposed-practice-only",
    reviewedRubric: null,
    reviewedWritingRubricRequiredForMastery: true,
    modelRevealCanGrantMastery: false,
    review: "pending",
    measurementEligible: false,
    masteryEligible: false,
    releaseEligible: false,
  };
};

export const buildHsk3GuidedParagraphPack = (
  root = process.cwd(),
) => {
  const prerequisiteBundle = loadHsk3EventRetellingPackBundle(root);
  assertValidHsk3EventRetellingPackBundle(prerequisiteBundle);
  const paragraphBundle = prerequisiteBundle.paragraphBundle;
  const blueprintBundle = prerequisiteBundle.blueprintBundle;
  const sourceCatalog =
    collectHsk3GuidedParagraphSourceCatalog(paragraphBundle);
  const blueprintById = new Map(
    blueprintBundle.pack.lessons.map((lesson) => [
      lesson.lessonId,
      lesson,
    ]),
  );
  const selectedTextIds = [
    ...new Set([
      ...FIRST_SOURCE_IDS,
      ...COMPARISON_SOURCE_PAIRS.flat(),
      ...THIRD_SOURCE_IDS,
    ]),
  ];
  const sourceTexts = selectedTextIds.map((textId) => {
    const source = sourceCatalog.get(textId);
    if (!source) {
      throw new Error(`Missing HSK3 guided-paragraph source ${textId}`);
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
  const sourceGroupsByLesson = new Map([
    [
      HSK3_GUIDED_PARAGRAPH_LESSON_IDS[0],
      FIRST_SOURCE_IDS.map((textId) => [sourceById.get(textId)]),
    ],
    [
      HSK3_GUIDED_PARAGRAPH_LESSON_IDS[1],
      COMPARISON_SOURCE_PAIRS.map((pair) =>
        pair.map((textId) => sourceById.get(textId))
      ),
    ],
    [
      HSK3_GUIDED_PARAGRAPH_LESSON_IDS[2],
      THIRD_SOURCE_IDS.map((textId) => [sourceById.get(textId)]),
    ],
  ]);
  const lessons = HSK3_GUIDED_PARAGRAPH_LESSON_IDS.map((lessonId) => {
    const blueprint = blueprintById.get(lessonId);
    const promptUnits = sourceGroupsByLesson.get(lessonId).map(
      (sources, index) =>
        makePrompt({ lesson: blueprint, index, sources }),
    );
    const reviewBatch = {
      batchId: `${lessonId}:guided-paragraph-review-v1`,
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
    completedGuidedProductionStages: 4,
    completedGuidedProductionLessons: 12,
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
    sixSentencePromptUnits: lessons[0].promptUnits.length,
    comparisonPromptUnits: lessons[1].promptUnits.length,
    eightSentencePromptUnits: lessons[2].promptUnits.length,
    dualSourcePromptUnits: lessons[1].promptUnits.length,
    modelEvidenceSummaries: allItems.reduce(
      (total, item) => total + item.modelEvidenceSummaries.length,
      0,
    ),
    minimumRequiredSentences: allItems.reduce(
      (total, item) => total + item.minimumSentenceCount,
      0,
    ),
    revisionChecklists: allItems.length,
    measurementEligibleItems: 0,
    masteryEligibleItems: 0,
    reviewBatches: lessons.length,
    approvals: 0,
    releaseEligibleItems: 0,
  };
  return {
    schemaVersion: 1,
    packId: "hsk3-guided-paragraph-2026.07",
    level: 3,
    trackId: HSK3_GUIDED_PARAGRAPH_TRACK_ID,
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
      method: "ai-assisted-guided-paragraph-draft",
      assistant: "OpenAI Codex",
      nativeMandarinReviewer: null,
      vietnameseEditor: null,
      assessmentEditor: null,
    },
    reviewPolicy: {
      nativeMandarinRequiredForRelease: true,
      vietnameseEditorialRequiredForRelease: true,
      assessmentReviewRequiredForRelease: true,
      sourceExposedPracticeCannotCalibrateAssessment: true,
    },
    masteryPolicy: {
      readingSeparatedFromWritingEvidence: true,
      modelRevealCannotGrantMastery: true,
      selfCheckCannotGrantWritingMastery: true,
      reviewedWritingRubricRequiredForMastery: true,
      newCharacterOwnershipClaims: 0,
      sourceRecognitionCharacterMappings:
        blueprintBundle.pack.counts.recognitionCharacterBlueprintMappings,
    },
    coverageClaims: {
      stagePromptDraftsComplete: true,
      completedGuidedProductionStages: 4,
      completedGuidedProductionLessons: 12,
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

export const serializeHsk3GuidedParagraphPack = (pack) =>
  `${JSON.stringify(pack)}\n`;

const main = () => {
  const outputPath = resolve(
    process.cwd(),
    HSK3_GUIDED_PARAGRAPH_PACK_RELATIVE_PATH,
  );
  const serialized = serializeHsk3GuidedParagraphPack(
    buildHsk3GuidedParagraphPack(),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK3 guided-paragraph pack is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK3_GUIDED_PARAGRAPH_PACK_RELATIVE_PATH,
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
