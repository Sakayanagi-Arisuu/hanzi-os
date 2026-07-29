import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHskCurriculumGraphBundle,
  loadHskCurriculumGraphBundle,
} from "../../src/content/hskCurriculumGraph.mjs";

export const HSK4_CURRICULUM_SCOPE_RELATIVE_PATH =
  "content/curriculum/hsk4-scope.json";

const UNIT_ORDER = [
  "hsk4-deep-comprehension",
  "hsk4-summary-argument",
  "hsk4-timed-integration",
];

const DISCOURSE_DOMAINS = [
  {
    domainId: "hsk4-personal-community-analysis",
    focus:
      "Phân tích trải nghiệm, giao dịch, sức khỏe, gia đình và cộng đồng qua văn bản nhiều đoạn thay vì chỉ kể lại sự kiện.",
    taskOrdinals: Array.from({ length: 11 }, (_, index) => index + 1),
    topicOrdinals: Array.from({ length: 27 }, (_, index) => index + 1),
  },
  {
    domainId: "hsk4-education-work-evaluation",
    focus:
      "Tổng hợp và đánh giá trải nghiệm học tập, quan niệm giáo dục, môi trường nghề nghiệp và hoạt động tổ chức.",
    taskOrdinals: [12, 13, 14, 15, 16],
    topicOrdinals: Array.from({ length: 15 }, (_, index) => index + 28),
  },
  {
    domainId: "hsk4-nature-technology-explanation",
    focus:
      "Giải thích quan hệ nguyên nhân–hệ quả trong tự nhiên, môi trường, ứng dụng công nghệ và thành quả khoa học.",
    taskOrdinals: [17, 18, 19],
    topicOrdinals: Array.from({ length: 10 }, (_, index) => index + 43),
  },
  {
    domainId: "hsk4-society-economy-argument",
    focus:
      "Đọc, nghe và lập luận có bằng chứng về địa phương, dân tộc, kinh tế, hạ tầng và hiện tượng xã hội đương đại.",
    taskOrdinals: [20, 21, 22],
    topicOrdinals: Array.from({ length: 9 }, (_, index) => index + 53),
  },
  {
    domainId: "hsk4-arts-sports-exchange-critique",
    focus:
      "Tóm tắt, so sánh và bình luận hình thức nghệ thuật, tác phẩm, thể thao và giao lưu quốc tế.",
    taskOrdinals: [23, 24, 25],
    topicOrdinals: Array.from({ length: 7 }, (_, index) => index + 62),
  },
  {
    domainId: "hsk4-culture-history-interpretation",
    focus:
      "Giải nghĩa thành ngữ, truyền thống, ẩm thực, lễ nghi, di tích và sự kiện lịch sử bằng ngữ cảnh và quan điểm có giới hạn.",
    taskOrdinals: [26, 27, 28, 29, 30],
    topicOrdinals: Array.from({ length: 9 }, (_, index) => index + 69),
  },
];

const GRAMMAR_MODULES = [
  {
    moduleId: "hsk4-precision-reference-quantity",
    focus:
      "Kiểm soát phạm vi, thời gian, thái độ, lượng, cấu trúc cố định và số liệu để diễn đạt thông tin chính xác.",
    grammarOrdinals: [
      ...Array.from({ length: 18 }, (_, index) => index + 1),
      ...Array.from({ length: 10 }, (_, index) => index + 22),
      33, 34, 35, 51, 52, 93, 94, 95,
    ],
  },
  {
    moduleId: "hsk4-stance-comparison-rhetoric",
    focus:
      "Dùng định dạng tu từ, phản vấn, so sánh và nhấn mạnh để nêu thái độ mà không làm mất ranh giới giữa dữ kiện và ý kiến.",
    grammarOrdinals: [
      32,
      ...Array.from({ length: 15 }, (_, index) => index + 36),
      53, 54, 63, 64, 65,
    ],
  },
  {
    moduleId: "hsk4-event-agency-voice",
    focus:
      "Biểu đạt tác nhân, đối tượng chịu tác động, bổ ngữ và quan hệ sai khiến trong mô tả sự kiện phức tạp.",
    grammarOrdinals: Array.from({ length: 8 }, (_, index) => index + 55),
  },
  {
    moduleId: "hsk4-information-order-cohesion",
    focus:
      "Tổ chức thông tin song song, trình tự, tăng tiến và lựa chọn bằng liên từ cùng dấu hiệu liên kết diễn ngôn.",
    grammarOrdinals: [
      19, 20, 21,
      ...Array.from({ length: 11 }, (_, index) => index + 66),
    ],
  },
  {
    moduleId: "hsk4-argument-logic-concession",
    focus:
      "Xây lập luận chuyển ý, giả thiết, điều kiện, nhân quả, mục đích và nhượng bộ với quan hệ logic có thể kiểm chứng.",
    grammarOrdinals: Array.from({ length: 16 }, (_, index) => index + 77),
  },
];

const INTEGRATION_STAGES = [
  {
    stageId: "hsk4-long-input-structure-map",
    mode: "long-form-listening-reading-structure-map",
    skills: ["listening", "reading", "writing"],
    minimumPromptUnits: 24,
    timed: false,
  },
  {
    stageId: "hsk4-inference-evidence-check",
    mode: "claim-inference-and-source-evidence-check",
    skills: ["listening", "reading", "writing"],
    minimumPromptUnits: 20,
    timed: false,
  },
  {
    stageId: "hsk4-cross-text-synthesis",
    mode: "dual-source-paraphrase-and-synthesis",
    skills: ["listening", "reading", "writing"],
    minimumPromptUnits: 18,
    timed: false,
  },
  {
    stageId: "hsk4-structured-written-argument",
    mode: "evidence-bounded-structured-writing",
    skills: ["reading", "writing"],
    minimumPromptUnits: 16,
    timed: true,
  },
  {
    stageId: "hsk4-structured-spoken-defense",
    mode: "evidence-bounded-spoken-position-and-response",
    skills: ["listening", "speaking"],
    minimumPromptUnits: 16,
    timed: true,
  },
  {
    stageId: "hsk4-timed-sectional-rehearsal",
    mode: "timed-skill-separated-mock-rehearsal",
    skills: ["listening", "reading", "speaking", "writing"],
    minimumPromptUnits: 12,
    timed: true,
  },
];

const UNIT_AUTHORING = {
  "hsk4-deep-comprehension": {
    focus:
      "Xây 1.000 từ và 441 chữ HSK4 trong văn bản nhiều đoạn; phân tích cấu trúc, lập luận, bằng chứng và thông tin ngầm.",
    plannedLessonBlueprints: 36,
    exitEvidence: {
      mode: "long-form-main-claim-evidence-and-inference-analysis",
      skills: ["listening", "reading", "writing"],
      reviewedRubricRequired: true,
      timedEvidenceRequired: false,
    },
  },
  "hsk4-summary-argument": {
    focus:
      "Dùng 30 nhiệm vụ và 95 điểm ngữ pháp để paraphrase, tổng hợp nguồn, viết tóm tắt và bảo vệ quan điểm có cấu trúc.",
    plannedLessonBlueprints: 24,
    exitEvidence: {
      mode: "reviewed-cross-source-summary-and-structured-argument",
      skills: ["listening", "reading", "speaking", "writing"],
      reviewedRubricRequired: true,
      timedEvidenceRequired: false,
    },
  },
  "hsk4-timed-integration": {
    focus:
      "Tích hợp nghe, đọc, nói và viết qua luyện section có thời gian trước khi mở mock HSK4 độc lập và hiệu chuẩn.",
    plannedLessonBlueprints: 18,
    exitEvidence: {
      mode: "reviewed-timed-skill-separated-portfolio-and-mock",
      skills: ["listening", "reading", "speaking", "writing"],
      reviewedRubricRequired: true,
      timedEvidenceRequired: true,
    },
  },
};

const idByOrdinal = (items, ordinal, section) => {
  const item = items.find((candidate) => candidate.ordinal === ordinal);
  if (!item) throw new Error(`HSK4 ${section} ordinal ${ordinal} is missing`);
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

export const buildHsk4CurriculumScope = (root = process.cwd()) => {
  const graphBundle = loadHskCurriculumGraphBundle(root);
  assertValidHskCurriculumGraphBundle(graphBundle);
  const inventory = graphBundle.syllabus.inventory;
  const tasks = inventory.tasks.filter((item) => item.level === 4);
  const topics = inventory.topics.filter((item) => item.level === 4);
  const vocabulary = inventory.vocabulary.filter((item) => item.level === 4);
  const recognitionCharacters = inventory.recognitionCharacters.filter(
    (item) => item.level === 4,
  );
  const grammarRows = inventory.grammarRows.filter((item) => item.level === 4);

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
    "HSK4 discourse-domain task",
    discourseDomains.flatMap((domain) => domain.taskIds),
    tasks.map((item) => item.id),
  );
  assertExactPartition(
    "HSK4 discourse-domain topic",
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
    "HSK4 grammar-module",
    grammarModules.flatMap((module) => module.grammarRowIds),
    grammarRows.map((item) => item.id),
  );

  const unitScopes = UNIT_ORDER.map((unitId) => ({
    unitId,
    ...UNIT_AUTHORING[unitId],
    taskIds: unitId === "hsk4-summary-argument"
      ? tasks.map((item) => item.id)
      : [],
    topicIds: unitId === "hsk4-deep-comprehension"
      ? topics.map((item) => item.id)
      : [],
    vocabularyIds: unitId === "hsk4-deep-comprehension"
      ? vocabulary.map((item) => item.id)
      : [],
    grammarRowIds: unitId === "hsk4-summary-argument"
      ? grammarRows.map((item) => item.id)
      : [],
    recognitionCharacterIds: unitId === "hsk4-deep-comprehension"
      ? recognitionCharacters.map((item) => item.id)
      : [],
    ...(unitId === "hsk4-summary-argument" ? { grammarModules } : {}),
    ...(unitId === "hsk4-timed-integration"
      ? { integrationStages: INTEGRATION_STAGES }
      : {}),
  }));

  return {
    schemaVersion: 1,
    scopeId: "hsk4-authoring-scope-2026.07",
    graphId: graphBundle.graph.graphId,
    graphSha256: graphBundle.graphSha256,
    source: {
      sourceId: graphBundle.syllabus.source.sourceId,
      inventorySha256: graphBundle.syllabus.inventorySha256,
      effective: graphBundle.syllabus.source.effective,
    },
    pathId: "hsk4",
    state: "authoring-scope",
    learnerVisible: false,
    releaseEligible: false,
    mappingPolicy: {
      primaryUnitCardinality: "exactly-one",
      discourseDomainTaskCardinality: "exactly-one",
      discourseDomainTopicCardinality: "exactly-one",
      grammarModuleCardinality: "exactly-one",
      vocabularySemanticsRequireSourceReview: true,
      timedPracticeRequiresConfidentialForms: true,
      scopeIsLessonCoverage: false,
      scopeGrantsMastery: false,
    },
    coverageClaims: {
      officialInventoryScoped: true,
      differentiatedHsk4BlueprintComplete: true,
      timedPracticeArchitecturePlanned: true,
      lessonPracticeCoverageComplete: false,
      reviewedContentComplete: false,
      calibratedMockComplete: false,
      hsk4Complete: false,
    },
    discourseDomains,
    unitScopes,
  };
};

export const serializeHsk4CurriculumScope = (scope) =>
  `${JSON.stringify(scope)}\n`;

const main = () => {
  const root = process.cwd();
  const outputPath = join(root, HSK4_CURRICULUM_SCOPE_RELATIVE_PATH);
  const serialized = serializeHsk4CurriculumScope(
    buildHsk4CurriculumScope(root),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK4 curriculum scope is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK4_CURRICULUM_SCOPE_RELATIVE_PATH,
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
