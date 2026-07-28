import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadHskCurriculumGraphBundle,
} from "../../src/content/hskCurriculumGraph.mjs";
import {
  assertValidHskSyllabusBundle,
} from "../../src/content/hskSyllabusInventory.mjs";

export const HSK2_CURRICULUM_SCOPE_RELATIVE_PATH =
  "content/curriculum/hsk2-scope.json";

const UNIT_ORDER = [
  "hsk2-situational-dialogue",
  "hsk2-sentence-chains",
  "hsk2-short-text-production",
];

const SITUATIONAL_STRANDS = [
  {
    strandId: "hsk2-person-events-environment",
    focus:
      "Miêu tả người, vật, sự kiện, thời tiết và nơi chốn bằng chuỗi hỏi đáp có lý do.",
    taskOrdinals: [1, 2, 3, 4, 5],
    topicOrdinals: [1, 2, 3, 4, 5, 6],
    vocabularySequences: null,
  },
  {
    strandId: "hsk2-daily-needs-family",
    focus:
      "Xử lý lịch sự, cảm xúc, ăn uống, mua sắm, sức khỏe, gia đình và cách xưng hô.",
    taskOrdinals: [6, 7, 9, 10, 12, 17],
    topicOrdinals: [7, 8, 9, 10, 11, 12, 17, 18, 19, 20, 23, 24, 34],
    vocabularySequences: [
      301, 305, 306, 307, 311, 312, 313, 327, 329, 339, 343, 345, 347,
      352, 354, 357, 360, 374, 377, 383, 388, 395, 405, 408, 409, 417,
      422, 423, 424, 429, 433, 434, 436, 437, 440, 445, 453, 455, 456,
      457, 461, 463, 467, 468, 469, 470, 476, 480, 483, 487, 493, 494,
    ],
  },
  {
    strandId: "hsk2-travel-leisure",
    focus:
      "Hỏi đường, mô tả tuyến đi, đặt lịch di chuyển và trao đổi hoạt động giải trí.",
    taskOrdinals: [8, 11],
    topicOrdinals: [13, 14, 15, 16, 21, 22],
    vocabularySequences: [
      315, 316, 317, 318, 319, 320, 324, 328, 335, 338, 340, 346, 348,
      350, 351, 356, 361, 362, 363, 364, 370, 371, 372, 373, 375, 387,
      389, 390, 391, 392, 393, 394, 397, 398, 400, 401, 402, 411, 413,
      414, 415, 416, 418, 419, 421, 425, 426, 427, 428, 441, 443, 444,
      447, 450, 451, 458, 459, 460, 471, 473, 477, 478, 479, 481, 482,
      484, 485, 486, 490, 495, 496, 497, 499, 500,
    ],
  },
  {
    strandId: "hsk2-study-work-culture",
    focus:
      "Kể trải nghiệm học tập/công việc và giới thiệu lễ hội, món ăn, họ tên, xưng hô.",
    taskOrdinals: [13, 14, 15, 16],
    topicOrdinals: [25, 26, 27, 28, 29, 30, 31, 32, 33],
    vocabularySequences: [
      304, 308, 310, 322, 325, 326, 337, 342, 349, 359, 365, 367, 368,
      369, 378, 379, 380, 381, 385, 404, 430, 432, 435, 442, 446, 448,
      449, 452, 464, 465, 472, 474, 488, 489, 491, 492,
    ],
  },
];

const GRAMMAR_MODULES = [
  {
    moduleId: "hsk2-reference-description-comparison",
    focus:
      "Quy chiếu, số lượng, vị trí, miêu tả và so sánh có đối tượng hoặc mức độ.",
    grammarOrdinals: [
      1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 21, 24, 25, 26, 30,
      33, 35, 38, 39, 42, 43, 44, 52, 53, 55, 56, 58, 59, 60, 61, 72,
      73, 74, 75,
    ],
  },
  {
    moduleId: "hsk2-aspect-time-experience",
    focus:
      "Thời gian, tần suất, khả năng, trạng thái kéo dài và trải nghiệm đã từng.",
    grammarOrdinals: [
      3, 4, 5, 15, 16, 17, 18, 31, 32, 40, 41, 49, 50, 51, 54, 57,
      69, 70, 71,
    ],
  },
  {
    moduleId: "hsk2-complements-and-motion",
    focus:
      "Chuỗi động từ, bổ ngữ kết quả/hướng và cấu trúc sai khiến hoặc hai tân ngữ.",
    grammarOrdinals: [22, 23, 34, 36, 37, 45, 46, 47, 48, 63, 64],
  },
  {
    moduleId: "hsk2-clause-linking",
    focus:
      "Liên kết lựa chọn, chuyển ý, nguyên nhân-kết quả, trình tự và câu nhấn mạnh.",
    grammarOrdinals: [19, 27, 28, 29, 62, 65, 66, 67, 68],
  },
];

const PRODUCTION_STAGES = [
  {
    stageId: "hsk2-dictation",
    mode: "reviewed-audio-dictation",
    skills: ["listening", "writing"],
    minimumPromptUnits: 12,
  },
  {
    stageId: "hsk2-sentence-reconstruction",
    mode: "ordered-sentence-reconstruction",
    skills: ["reading", "writing"],
    minimumPromptUnits: 12,
  },
  {
    stageId: "hsk2-guided-message",
    mode: "three-sentence-guided-message",
    skills: ["reading", "writing"],
    minimumPromptUnits: 8,
  },
  {
    stageId: "hsk2-picture-description",
    mode: "guided-picture-description",
    skills: ["speaking", "writing"],
    minimumPromptUnits: 8,
  },
];

const UNIT_AUTHORING = {
  "hsk2-situational-dialogue": {
    focus:
      "Duy trì hội thoại nhiều lượt theo bốn mạch tình huống thay vì luyện câu đơn.",
    plannedLessonBlueprints: 20,
    exitEvidence: {
      mode: "six-turn-situational-dialogue",
      skills: ["listening", "speaking", "reading"],
      reviewedRubricRequired: true,
    },
  },
  "hsk2-sentence-chains": {
    focus:
      "Kết nối câu bằng aspect, bổ ngữ, so sánh và quan hệ logic HSK2.",
    plannedLessonBlueprints: 10,
    exitEvidence: {
      mode: "sentence-chain-reconstruction-and-production",
      skills: ["listening", "reading", "speaking", "writing"],
      reviewedRubricRequired: true,
    },
  },
  "hsk2-short-text-production": {
    focus:
      "Chuyển từ nghe-chép và dựng câu sang tin nhắn, mô tả ngắn có kiểm soát.",
    plannedLessonBlueprints: 10,
    exitEvidence: {
      mode: "reviewed-dictation-and-short-text-portfolio",
      skills: ["listening", "reading", "writing"],
      reviewedRubricRequired: true,
    },
  },
};

const idByOrdinal = (items, ordinal, section) => {
  const item = items.find((candidate) => candidate.ordinal === ordinal);
  if (!item) throw new Error(`${section} ordinal ${ordinal} is missing`);
  return item.id;
};

const idBySequence = (items, sequence, section) => {
  const item = items.find((candidate) => candidate.sequence === sequence);
  if (!item) throw new Error(`${section} sequence ${sequence} is missing`);
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

export const buildHsk2CurriculumScope = (root = process.cwd()) => {
  const graphBundle = loadHskCurriculumGraphBundle(root);
  assertValidHskSyllabusBundle(graphBundle.syllabus);
  const inventory = graphBundle.syllabus.inventory;
  const tasks = inventory.tasks.filter((item) => item.level === 2);
  const topics = inventory.topics.filter((item) => item.level === 2);
  const vocabulary = inventory.vocabulary.filter((item) => item.level === 2);
  const recognitionCharacters = inventory.recognitionCharacters.filter(
    (item) => item.level === 2,
  );
  const grammarRows = inventory.grammarRows.filter((item) => item.level === 2);

  const explicitlyAssignedVocabulary = SITUATIONAL_STRANDS
    .flatMap((strand) => strand.vocabularySequences ?? []);
  if (
    new Set(explicitlyAssignedVocabulary).size
      !== explicitlyAssignedVocabulary.length
  ) {
    throw new Error("HSK2 situational vocabulary planning overlaps");
  }
  const personalVocabularySequences = vocabulary
    .map((item) => item.sequence)
    .filter((sequence) => !explicitlyAssignedVocabulary.includes(sequence));

  const strands = SITUATIONAL_STRANDS.map((strand) => ({
    strandId: strand.strandId,
    focus: strand.focus,
    taskIds: strand.taskOrdinals.map(
      (ordinal) => idByOrdinal(tasks, ordinal, "task"),
    ),
    topicIds: strand.topicOrdinals.map(
      (ordinal) => idByOrdinal(topics, ordinal, "topic"),
    ),
    vocabularyIds: (
      strand.vocabularySequences ?? personalVocabularySequences
    ).map(
      (sequence) => idBySequence(vocabulary, sequence, "vocabulary"),
    ),
  }));
  assertExactPartition(
    "HSK2 strand task",
    strands.flatMap((strand) => strand.taskIds),
    tasks.map((item) => item.id),
  );
  assertExactPartition(
    "HSK2 strand topic",
    strands.flatMap((strand) => strand.topicIds),
    topics.map((item) => item.id),
  );
  assertExactPartition(
    "HSK2 strand vocabulary",
    strands.flatMap((strand) => strand.vocabularyIds),
    vocabulary.map((item) => item.id),
  );

  const grammarModules = GRAMMAR_MODULES.map((module) => ({
    moduleId: module.moduleId,
    focus: module.focus,
    grammarRowIds: module.grammarOrdinals.map(
      (ordinal) => idByOrdinal(grammarRows, ordinal, "grammar"),
    ),
  }));
  assertExactPartition(
    "HSK2 grammar module",
    grammarModules.flatMap((module) => module.grammarRowIds),
    grammarRows.map((item) => item.id),
  );

  const unitScopes = UNIT_ORDER.map((unitId) => ({
    unitId,
    ...UNIT_AUTHORING[unitId],
    taskIds: unitId === "hsk2-situational-dialogue"
      ? tasks.map((item) => item.id)
      : [],
    topicIds: unitId === "hsk2-situational-dialogue"
      ? topics.map((item) => item.id)
      : [],
    vocabularyIds: unitId === "hsk2-situational-dialogue"
      ? vocabulary.map((item) => item.id)
      : [],
    grammarRowIds: unitId === "hsk2-sentence-chains"
      ? grammarRows.map((item) => item.id)
      : [],
    recognitionCharacterIds: unitId === "hsk2-short-text-production"
      ? recognitionCharacters.map((item) => item.id)
      : [],
    ...(unitId === "hsk2-situational-dialogue" ? { strands } : {}),
    ...(unitId === "hsk2-sentence-chains" ? { grammarModules } : {}),
    ...(unitId === "hsk2-short-text-production"
      ? { productionStages: PRODUCTION_STAGES }
      : {}),
  }));

  return {
    schemaVersion: 1,
    scopeId: "hsk2-authoring-scope-2026.07",
    graphId: graphBundle.graph.graphId,
    graphSha256: graphBundle.graphSha256,
    source: {
      sourceId: graphBundle.syllabus.source.sourceId,
      inventorySha256: graphBundle.syllabus.inventorySha256,
      effective: graphBundle.syllabus.source.effective,
    },
    pathId: "hsk2",
    state: "authoring-scope",
    learnerVisible: false,
    releaseEligible: false,
    mappingPolicy: {
      primaryUnitCardinality: "exactly-one",
      situationalStrandCardinality: "exactly-one",
      grammarModuleCardinality: "exactly-one",
      scopeIsLessonCoverage: false,
      scopeGrantsMastery: false,
    },
    coverageClaims: {
      officialInventoryScoped: true,
      differentiatedHsk2BlueprintComplete: true,
      lessonPracticeCoverageComplete: false,
      reviewedContentComplete: false,
      hsk2Complete: false,
    },
    unitScopes,
  };
};

export const serializeHsk2CurriculumScope = (scope) =>
  `${JSON.stringify(scope)}\n`;

const main = () => {
  const root = process.cwd();
  const outputPath = join(root, HSK2_CURRICULUM_SCOPE_RELATIVE_PATH);
  const serialized = serializeHsk2CurriculumScope(
    buildHsk2CurriculumScope(root),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK2 curriculum scope is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK2_CURRICULUM_SCOPE_RELATIVE_PATH,
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
