import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectHsk3ParagraphTextCatalogFromCultureTip,
  HSK3_COHESION_RECONSTRUCTION_LESSON_IDS,
  HSK3_COHESION_RECONSTRUCTION_PACK_RELATIVE_PATH,
  HSK3_COHESION_RECONSTRUCTION_TRACK_ID,
} from "../../src/content/hsk3CohesionReconstructionPack.mjs";
import {
  assertValidHsk3CultureTraditionDomainPackBundle,
  loadHsk3CultureTraditionDomainPackBundle,
} from "../../src/content/hsk3CultureTraditionDomainPack.mjs";
import {
  assertValidHsk3GuidedNotesPackBundle,
  loadHsk3GuidedNotesPackBundle,
} from "../../src/content/hsk3GuidedNotesPack.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

const LESSON_1_SOURCE_IDS = [
  "hsk3-society-arts-sports-reports-modern-life:reading-01",
  "hsk3-society-arts-sports-reports-city-development:reading-01",
  "hsk3-society-arts-sports-reports-arts-activities:reading-01",
  "hsk3-culture-tradition-descriptions-regional-cuisine:reading-01",
  "hsk3-culture-tradition-descriptions-tableware-etiquette:reading-01",
  "hsk3-culture-tradition-descriptions-festivals-customs:reading-01",
  "hsk3-culture-tradition-descriptions-regional-differences:reading-01",
];
const LESSON_2_SOURCE_IDS = [
  "hsk3-culture-tradition-descriptions-festivals-customs:reading-01",
  "hsk3-culture-tradition-descriptions-regional-differences:reading-01",
  "hsk3-culture-tradition-descriptions-customs-comparison:reading-01",
  "hsk3-personal-life-narratives-food-shopping:reading-01",
  "hsk3-personal-life-narratives-travel-transport:reading-01",
  "hsk3-personal-life-narratives-health-care:reading-01",
  "hsk3-personal-life-narratives-home-family-leisure:reading-01",
];
const LESSON_3_SOURCE_IDS = [
  "hsk3-personal-life-narratives-identity-transactions:reading-01",
  "hsk3-study-work-accounts-courses-learning:reading-01",
  "hsk3-study-work-accounts-campus-education:reading-01",
  "hsk3-study-work-accounts-office-tasks:reading-01",
  "hsk3-study-work-accounts-colleague-workplace:reading-01",
  "hsk3-study-work-accounts-career-experience:reading-01",
];

const PRESENTED_ORDERS = [
  ["b3", "b1", "b4", "b2"],
  ["b2", "b4", "b1", "b3"],
  ["b4", "b2", "b3", "b1"],
  ["b2", "b1", "b4", "b3"],
  ["b3", "b4", "b2", "b1"],
  ["b4", "b1", "b3", "b2"],
  ["b3", "b2", "b1", "b4"],
];
const REVISION_CHECKLIST = [
  "Đối chiếu mọi quyết định với từ chỉ thời gian, tham chiếu hoặc quan hệ logic nằm trong chính văn bản nguồn.",
  "Đọc lại toàn đoạn sau khi dựng; kiểm tra chủ thể, mốc thời gian và nguyên nhân–kết quả không bị đứt.",
  "Sau khi xem đáp án mẫu, tự làm lại từ đầu; việc nhìn nguồn hay đáp án không được tính mastery.",
];
const REQUIRED_REVIEW_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "assessment-editor",
];
const LINKER_SPECS = [
  {
    textId: LESSON_2_SOURCE_IDS[0],
    sourceLineId: "r02",
    correctAnswerHanzi: "才",
    optionsHanzi: ["才", "又", "也", "都"],
    functionVi:
      "Đánh dấu kết quả chỉ đạt được sau một quá trình thảo luận kéo dài.",
    antecedentOrRelationVi:
      "Việc chọn xong ngày cưới xảy ra sau khi gia đình đã bàn bạc rất lâu.",
  },
  {
    textId: LESSON_2_SOURCE_IDS[1],
    sourceLineId: "r04",
    correctAnswerHanzi: "但",
    optionsHanzi: ["但", "和", "或", "为"],
    functionVi:
      "Chuyển từ thừa nhận có khác biệt sang giới hạn cách khái quát.",
    antecedentOrRelationVi:
      "Có khác biệt trong lối sống, nhưng một câu chuyện không đại diện toàn bộ.",
  },
  {
    textId: LESSON_2_SOURCE_IDS[2],
    sourceLineId: "r04",
    correctAnswerHanzi: "除了",
    optionsHanzi: ["除了", "为了", "按照", "关于"],
    functionVi:
      "Mở cấu trúc bổ sung: tra tài liệu chưa đủ, còn phải quan tâm suy nghĩ của chủ nhà.",
    antecedentOrRelationVi:
      "Hai cách chuẩn bị được nối theo quan hệ không chỉ A mà còn B.",
  },
  {
    textId: LESSON_2_SOURCE_IDS[3],
    sourceLineId: "r03",
    correctAnswerHanzi: "所以",
    optionsHanzi: ["所以", "虽然", "或者", "但是"],
    functionVi:
      "Nối nguyên nhân lo mua nhầm với hành động so sánh ba cửa hàng.",
    antecedentOrRelationVi:
      "Nỗi lo ở vế trước dẫn trực tiếp tới biện pháp ở vế sau.",
  },
  {
    textId: LESSON_2_SOURCE_IDS[4],
    sourceLineId: "r05",
    correctAnswerHanzi: "就",
    optionsHanzi: ["就", "才", "还", "又"],
    functionVi:
      "Đánh dấu hành động đổi đường diễn ra ngay sau đánh giá rằng không thể chờ tiếp.",
    antecedentOrRelationVi:
      "Nhận định của tài xế tạo điều kiện trực tiếp cho quyết định đổi đường.",
  },
  {
    textId: LESSON_2_SOURCE_IDS[5],
    sourceLineId: "r05",
    correctAnswerHanzi: "直到",
    optionsHanzi: ["直到", "按照", "为了", "关于"],
    functionVi:
      "Nêu ranh giới thời gian: phải chờ tới khi chân hết đau rồi mới luyện đi.",
    antecedentOrRelationVi:
      "Việc chân không còn đau là điều kiện thời gian trước bước luyện tập.",
  },
  {
    textId: LESSON_2_SOURCE_IDS[6],
    sourceLineId: "r04",
    correctAnswerHanzi: "就",
    optionsHanzi: ["就", "才", "只", "再"],
    functionVi:
      "Cho thấy hàng xóm và cụ già tới giúp ngay khi đôi vợ chồng vừa bắt đầu dọn.",
    antecedentOrRelationVi:
      "Mốc 刚开始整理 được nối với hành động hỗ trợ xảy ra liền sau đó.",
  },
];

const makeBlocks = (text) =>
  [0, 2, 4, 6].map((start, index) => {
    const lines = text.lines.slice(start, start + 2);
    return {
      blockId: `b${index + 1}`,
      sourceLineIds: lines.map((line) => line.lineId),
      hanzi: lines.map((line) => line.hanzi).join(""),
    };
  });

const makeCommonItem = ({
  lesson,
  index,
  source,
  promptKind,
  promptVi,
}) => ({
  itemId:
    `${lesson.lessonId}:prompt-${String(index + 1).padStart(2, "0")}`,
  lessonId: lesson.lessonId,
  mode: lesson.promptPlan.mode,
  promptKind,
  sourceTextId: source.textId,
  inputSkill: "reading",
  responseSkill: "writing",
  promptVi,
  revisionChecklistVi: REVISION_CHECKLIST,
  responseMode: "cohesion-reconstruction-with-model-reveal-and-revision",
  scoringPolicy: "source-exposed-practice-only",
  reviewedRubric: null,
  modelRevealCanGrantMastery: false,
  review: "pending",
  measurementEligible: false,
  masteryEligible: false,
  releaseEligible: false,
});

const makeOrderItem = ({
  lesson,
  index,
  source,
  promptKind,
  requireRationale = false,
}) => {
  const blocks = makeBlocks(source.text);
  return {
    ...makeCommonItem({
      lesson,
      index,
      source,
      promptKind,
      promptVi: requireRationale
        ? `Dựng lại “${source.text.titleVi}”, rồi giải thích bốn quyết định nối khối bằng bằng chứng tiếng Trung cụ thể.`
        : `Sắp xếp bốn khối của “${source.text.titleVi}” thành đoạn tám câu; đánh dấu từ hoặc mốc giúp xác định từng bước.`,
    }),
    blocks,
    presentedOrder: PRESENTED_ORDERS[index % PRESENTED_ORDERS.length],
    correctOrder: ["b1", "b2", "b3", "b4"],
    orderingSignalsVi: [
      `b1 mở bối cảnh và chủ thể bằng hai dòng ${blocks[0].sourceLineIds.join("–")}.`,
      `b2 phát triển sự kiện sau bối cảnh bằng hai dòng ${blocks[1].sourceLineIds.join("–")}.`,
      `b3 đưa thay đổi, vấn đề hoặc bước xử lý ở hai dòng ${blocks[2].sourceLineIds.join("–")}.`,
      `b4 khép lại bằng kết quả hay nhận xét ở hai dòng ${blocks[3].sourceLineIds.join("–")}.`,
    ],
    ...(requireRationale
      ? {
          explanationFrameVi: [
            "Bắt đầu bằng b1 vì từ/cụm tiếng Trung nào thiết lập người, nơi hoặc thời điểm?",
            "b2 phải theo b1 vì chủ thể hay sự kiện nào được tiếp tục?",
            "b3 nối với b2 bằng mốc thời gian, nguyên nhân hay thay đổi nào?",
            "b4 kết thúc hợp lý vì nó nêu kết quả hoặc đánh giá nào của cả đoạn?",
          ],
        }
      : {}),
  };
};

const makeLinkerItem = ({ lesson, index, source, spec }) => {
  const line = source.text.lines.find(
    ({ lineId }) => lineId === spec.sourceLineId,
  );
  if (!line) {
    throw new Error(
      `Missing source line ${spec.sourceLineId} in ${source.textId}`,
    );
  }
  return {
    ...makeCommonItem({
      lesson,
      index,
      source,
      promptKind: "reference-linker-restoration",
      promptVi:
        `Khôi phục từ nối bị bỏ trong “${source.text.titleVi}”, rồi giải thích quan hệ với câu hoặc vế trước.`,
    }),
    sourceLineId: spec.sourceLineId,
    clozeLineHanzi: line.hanzi.replace(
      spec.correctAnswerHanzi,
      "____",
    ),
    correctAnswerHanzi: spec.correctAnswerHanzi,
    optionsHanzi: spec.optionsHanzi,
    functionVi: spec.functionVi,
    antecedentOrRelationVi: spec.antecedentOrRelationVi,
  };
};

export const buildHsk3CohesionReconstructionPack = (
  root = process.cwd(),
) => {
  const prerequisiteBundle = loadHsk3GuidedNotesPackBundle(root);
  assertValidHsk3GuidedNotesPackBundle(prerequisiteBundle);
  const paragraphBundle =
    loadHsk3CultureTraditionDomainPackBundle(root);
  assertValidHsk3CultureTraditionDomainPackBundle(paragraphBundle);
  const blueprintBundle = prerequisiteBundle.blueprintBundle;
  const blueprintById = new Map(
    blueprintBundle.pack.lessons.map((lesson) => [
      lesson.lessonId,
      lesson,
    ]),
  );
  const sourceCatalog =
    collectHsk3ParagraphTextCatalogFromCultureTip(paragraphBundle);
  const selectedTextIds = [
    ...new Set([
      ...LESSON_1_SOURCE_IDS,
      ...LESSON_2_SOURCE_IDS,
      ...LESSON_3_SOURCE_IDS,
    ]),
  ];
  const sourceTexts = selectedTextIds.map((textId) => {
    const source = sourceCatalog.get(textId);
    if (!source) {
      throw new Error(`Missing HSK3 cohesion source ${textId}`);
    }
    return {
      textId,
      sourcePackId: source.sourcePackId,
      sourceLessonId: source.sourceLessonId,
      text: source.text,
    };
  });
  const sourceById = new Map(
    sourceTexts.map((source) => [source.textId, source]),
  );
  const [firstLesson, secondLesson, thirdLesson] =
    HSK3_COHESION_RECONSTRUCTION_LESSON_IDS.map(
      (lessonId) => blueprintById.get(lessonId),
    );
  const firstItems = LESSON_1_SOURCE_IDS.map((textId, index) =>
    makeOrderItem({
      lesson: firstLesson,
      index,
      source: sourceById.get(textId),
      promptKind: "temporal-order-reconstruction",
    })
  );
  const secondItems = LINKER_SPECS.map((spec, index) =>
    makeLinkerItem({
      lesson: secondLesson,
      index,
      source: sourceById.get(spec.textId),
      spec,
    })
  );
  const thirdItems = LESSON_3_SOURCE_IDS.map((textId, index) =>
    makeOrderItem({
      lesson: thirdLesson,
      index,
      source: sourceById.get(textId),
      promptKind: "order-rationale-explanation",
      requireRationale: true,
    })
  );
  const itemsByLessonId = new Map([
    [firstLesson.lessonId, firstItems],
    [secondLesson.lessonId, secondItems],
    [thirdLesson.lessonId, thirdItems],
  ]);
  const lessons = HSK3_COHESION_RECONSTRUCTION_LESSON_IDS.map(
    (lessonId) => {
      const blueprint = blueprintById.get(lessonId);
      const promptUnits = itemsByLessonId.get(lessonId);
      const reviewBatch = {
        batchId: `${lessonId}:cohesion-review-v1`,
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
    completedGuidedProductionStages: 2,
    completedGuidedProductionLessons: 6,
    sourceTexts: sourceTexts.length,
    sourceTextLines: sourceTexts.flatMap(
      (source) => source.text.lines,
    ).length,
    promptUnits: allItems.length,
    temporalOrderingPromptUnits: firstItems.length,
    referenceLinkerPromptUnits: secondItems.length,
    orderRationalePromptUnits: thirdItems.length,
    revisionChecklists: allItems.length,
    measurementEligibleItems: 0,
    masteryEligibleItems: 0,
    reviewBatches: lessons.length,
    approvals: 0,
    releaseEligibleItems: 0,
  };
  return {
    schemaVersion: 1,
    packId: "hsk3-cohesion-reconstruction-2026.07",
    level: 3,
    trackId: HSK3_COHESION_RECONSTRUCTION_TRACK_ID,
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
      method: "ai-assisted-cohesion-reconstruction-draft",
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
      automaticOrderingCannotGrantWritingMastery: true,
      newCharacterOwnershipClaims: 0,
      sourceRecognitionCharacterMappings:
        blueprintBundle.pack.counts.recognitionCharacterBlueprintMappings,
    },
    coverageClaims: {
      stagePromptDraftsComplete: true,
      completedGuidedProductionStages: 2,
      completedGuidedProductionLessons: 6,
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

export const serializeHsk3CohesionReconstructionPack = (pack) =>
  `${JSON.stringify(pack)}\n`;

const main = () => {
  const outputPath = resolve(
    process.cwd(),
    HSK3_COHESION_RECONSTRUCTION_PACK_RELATIVE_PATH,
  );
  const serialized = serializeHsk3CohesionReconstructionPack(
    buildHsk3CohesionReconstructionPack(),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error(
        "Checked HSK3 cohesion-reconstruction pack is stale",
      );
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK3_COHESION_RECONSTRUCTION_PACK_RELATIVE_PATH,
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
