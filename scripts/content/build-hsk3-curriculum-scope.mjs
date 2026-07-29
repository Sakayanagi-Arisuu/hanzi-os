import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHskCurriculumGraphBundle,
  loadHskCurriculumGraphBundle,
} from "../../src/content/hskCurriculumGraph.mjs";

export const HSK3_CURRICULUM_SCOPE_RELATIVE_PATH =
  "content/curriculum/hsk3-scope.json";

const UNIT_ORDER = [
  "hsk3-paragraph-input",
  "hsk3-narration",
  "hsk3-guided-production",
];

const DISCOURSE_DOMAINS = [
  {
    domainId: "hsk3-personal-life-narratives",
    focus:
      "Theo dõi và kể lại trải nghiệm cá nhân, giao dịch, đi lại, sức khỏe, gia đình và sinh hoạt.",
    taskOrdinals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    topicOrdinals: Array.from({ length: 26 }, (_, index) => index + 1),
  },
  {
    domainId: "hsk3-study-work-accounts",
    focus:
      "Tóm lược quá trình học tập, đời sống trường học, giáo dục gia đình và trải nghiệm nghề nghiệp.",
    taskOrdinals: [11, 12, 13, 14, 15],
    topicOrdinals: Array.from({ length: 13 }, (_, index) => index + 27),
  },
  {
    domainId: "hsk3-nature-environment-explanations",
    focus:
      "Mô tả hiện tượng tự nhiên, địa điểm, biến đổi môi trường và giải thích hành động bảo vệ môi trường.",
    taskOrdinals: [16, 17],
    topicOrdinals: [40, 41, 42, 43, 44, 45],
  },
  {
    domainId: "hsk3-society-arts-sports-reports",
    focus:
      "Trình bày thông tin xã hội, hoạt động văn nghệ và diễn biến thể thao theo ý chính–chi tiết.",
    taskOrdinals: [18, 19, 20],
    topicOrdinals: [46, 47, 48, 49, 50],
  },
  {
    domainId: "hsk3-culture-tradition-descriptions",
    focus:
      "Giới thiệu ẩm thực, dụng cụ, phong tục và khác biệt vùng miền bằng đoạn có liên kết.",
    taskOrdinals: [21, 22],
    topicOrdinals: [51, 52, 53, 54],
  },
];

const GRAMMAR_MODULES = [
  {
    moduleId: "hsk3-reference-quantity-phrase-building",
    focus:
      "Mở rộng danh ngữ, quy chiếu, số lượng và thành phần câu để đọc và viết đoạn chính xác.",
    grammarOrdinals: [
      1, 2, 3, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 32, 34, 35, 54,
      55, 56, 95, 96,
    ],
  },
  {
    moduleId: "hsk3-modality-time-viewpoint-framing",
    focus:
      "Đặt thời gian, thái độ, khả năng, căn cứ và góc nhìn để tổ chức thông tin trong đoạn.",
    grammarOrdinals: [
      4, 16, 18, 19, 21, 22, 23, 24, 25, 26, 28, 31, 36, 37, 38, 42,
      45, 46, 47, 48, 50, 51, 52, 64, 65, 66, 80,
    ],
  },
  {
    moduleId: "hsk3-event-complements-voice",
    focus:
      "Tường thuật sự kiện bằng ly hợp từ, bổ ngữ, câu 把/被, tồn hiện và chuỗi hành động.",
    grammarOrdinals: [
      5, 6, 27, 33, 57, 58, 59, 60, 61, 67, 68, 69, 70, 71, 72, 78,
      79, 81,
    ],
  },
  {
    moduleId: "hsk3-comparison-description-evaluation",
    focus:
      "So sánh, mô tả biến đổi, mức độ và đánh giá để làm rõ quan hệ giữa các đối tượng.",
    grammarOrdinals: [39, 40, 41, 43, 49, 53, 62, 63, 73, 74, 75, 76, 77],
  },
  {
    moduleId: "hsk3-discourse-linking",
    focus:
      "Liên kết trình tự, lựa chọn, song song, tăng tiến, chuyển ý, giả thiết, điều kiện và mục đích.",
    grammarOrdinals: [
      20, 29, 30, 44, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92,
      93, 94,
    ],
  },
];

const PRODUCTION_STAGES = [
  {
    stageId: "hsk3-main-idea-detail-notes",
    mode: "paragraph-listening-reading-note-grid",
    skills: ["listening", "reading", "writing"],
    minimumPromptUnits: 24,
  },
  {
    stageId: "hsk3-cohesion-reconstruction",
    mode: "paragraph-order-and-cohesion-reconstruction",
    skills: ["reading", "writing"],
    minimumPromptUnits: 20,
  },
  {
    stageId: "hsk3-event-retelling",
    mode: "reviewed-event-retelling-from-notes",
    skills: ["listening", "speaking"],
    minimumPromptUnits: 20,
  },
  {
    stageId: "hsk3-guided-paragraph",
    mode: "six-to-eight-sentence-guided-paragraph",
    skills: ["reading", "writing"],
    minimumPromptUnits: 16,
  },
  {
    stageId: "hsk3-structured-explanation",
    mode: "reviewed-spoken-explanation-and-comparison",
    skills: ["listening", "speaking"],
    minimumPromptUnits: 12,
  },
];

const UNIT_AUTHORING = {
  "hsk3-paragraph-input": {
    focus:
      "Xây vốn từ và chữ theo 54 chủ đề trong bài nghe/đọc cấp đoạn, luyện ý chính, chi tiết và ghi chú.",
    plannedLessonBlueprints: 25,
    exitEvidence: {
      mode: "paragraph-main-idea-detail-and-note-extraction",
      skills: ["listening", "reading", "writing"],
      reviewedRubricRequired: true,
    },
  },
  "hsk3-narration": {
    focus:
      "Tổ chức 22 nhiệm vụ giao tiếp và 96 điểm ngữ pháp thành tường thuật, mô tả và giải thích có liên kết.",
    plannedLessonBlueprints: 15,
    exitEvidence: {
      mode: "ordered-retelling-with-discourse-links",
      skills: ["listening", "reading", "speaking", "writing"],
      reviewedRubricRequired: true,
    },
  },
  "hsk3-guided-production": {
    focus:
      "Chuyển ghi chú và dựng đoạn sang kể lại, viết đoạn sáu–tám câu và giải thích nói theo rubric.",
    plannedLessonBlueprints: 15,
    exitEvidence: {
      mode: "reviewed-paragraph-and-spoken-explanation-portfolio",
      skills: ["listening", "reading", "speaking", "writing"],
      reviewedRubricRequired: true,
    },
  },
};

const idByOrdinal = (items, ordinal, section) => {
  const item = items.find((candidate) => candidate.ordinal === ordinal);
  if (!item) throw new Error(`HSK3 ${section} ordinal ${ordinal} is missing`);
  return item.id;
};

const assertExactPartition = (name, mappedIds, expectedIds) => {
  if (
    new Set(mappedIds).size !== mappedIds.length
    || JSON.stringify([...mappedIds].sort())
      !== JSON.stringify([...expectedIds].sort())
  ) {
    throw new Error(`${name} mapping is not an exact partition`);
  }
};

export const buildHsk3CurriculumScope = (root = process.cwd()) => {
  const graphBundle = loadHskCurriculumGraphBundle(root);
  assertValidHskCurriculumGraphBundle(graphBundle);
  const inventory = graphBundle.syllabus.inventory;
  const tasks = inventory.tasks.filter((item) => item.level === 3);
  const topics = inventory.topics.filter((item) => item.level === 3);
  const vocabulary = inventory.vocabulary.filter((item) => item.level === 3);
  const recognitionCharacters = inventory.recognitionCharacters.filter(
    (item) => item.level === 3,
  );
  const grammarRows = inventory.grammarRows.filter((item) => item.level === 3);

  const discourseDomains = DISCOURSE_DOMAINS.map((domain) => ({
    domainId: domain.domainId,
    focus: domain.focus,
    taskIds: domain.taskOrdinals.map(
      (ordinal) => idByOrdinal(tasks, ordinal, "task"),
    ),
    topicIds: domain.topicOrdinals.map(
      (ordinal) => idByOrdinal(topics, ordinal, "topic"),
    ),
  }));
  assertExactPartition(
    "HSK3 discourse-domain task",
    discourseDomains.flatMap((domain) => domain.taskIds),
    tasks.map((item) => item.id),
  );
  assertExactPartition(
    "HSK3 discourse-domain topic",
    discourseDomains.flatMap((domain) => domain.topicIds),
    topics.map((item) => item.id),
  );

  const grammarModules = GRAMMAR_MODULES.map((module) => ({
    moduleId: module.moduleId,
    focus: module.focus,
    grammarRowIds: module.grammarOrdinals.map(
      (ordinal) => idByOrdinal(grammarRows, ordinal, "grammar"),
    ),
  }));
  assertExactPartition(
    "HSK3 grammar-module",
    grammarModules.flatMap((module) => module.grammarRowIds),
    grammarRows.map((item) => item.id),
  );

  const unitScopes = UNIT_ORDER.map((unitId) => ({
    unitId,
    ...UNIT_AUTHORING[unitId],
    taskIds: unitId === "hsk3-narration"
      ? tasks.map((item) => item.id)
      : [],
    topicIds: unitId === "hsk3-paragraph-input"
      ? topics.map((item) => item.id)
      : [],
    vocabularyIds: unitId === "hsk3-paragraph-input"
      ? vocabulary.map((item) => item.id)
      : [],
    grammarRowIds: unitId === "hsk3-narration"
      ? grammarRows.map((item) => item.id)
      : [],
    recognitionCharacterIds: unitId === "hsk3-paragraph-input"
      ? recognitionCharacters.map((item) => item.id)
      : [],
    ...(unitId === "hsk3-narration" ? { grammarModules } : {}),
    ...(unitId === "hsk3-guided-production"
      ? { productionStages: PRODUCTION_STAGES }
      : {}),
  }));

  return {
    schemaVersion: 1,
    scopeId: "hsk3-authoring-scope-2026.07",
    graphId: graphBundle.graph.graphId,
    graphSha256: graphBundle.graphSha256,
    source: {
      sourceId: graphBundle.syllabus.source.sourceId,
      inventorySha256: graphBundle.syllabus.inventorySha256,
      effective: graphBundle.syllabus.source.effective,
    },
    pathId: "hsk3",
    state: "authoring-scope",
    learnerVisible: false,
    releaseEligible: false,
    mappingPolicy: {
      primaryUnitCardinality: "exactly-one",
      discourseDomainTaskCardinality: "exactly-one",
      discourseDomainTopicCardinality: "exactly-one",
      grammarModuleCardinality: "exactly-one",
      vocabularySemanticsRequireSourceReview: true,
      scopeIsLessonCoverage: false,
      scopeGrantsMastery: false,
    },
    coverageClaims: {
      officialInventoryScoped: true,
      differentiatedHsk3BlueprintComplete: true,
      lessonPracticeCoverageComplete: false,
      reviewedContentComplete: false,
      hsk3Complete: false,
    },
    discourseDomains,
    unitScopes,
  };
};

export const serializeHsk3CurriculumScope = (scope) =>
  `${JSON.stringify(scope)}\n`;

const main = () => {
  const root = process.cwd();
  const outputPath = join(root, HSK3_CURRICULUM_SCOPE_RELATIVE_PATH);
  const serialized = serializeHsk3CurriculumScope(
    buildHsk3CurriculumScope(root),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK3 curriculum scope is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK3_CURRICULUM_SCOPE_RELATIVE_PATH,
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
