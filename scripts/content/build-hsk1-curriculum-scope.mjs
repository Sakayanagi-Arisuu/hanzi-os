import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadHskCurriculumGraphBundle,
} from "../../src/content/hskCurriculumGraph.mjs";
import {
  assertValidHskSyllabusBundle,
} from "../../src/content/hskSyllabusInventory.mjs";

export const HSK1_CURRICULUM_SCOPE_RELATIVE_PATH =
  "content/curriculum/hsk1-scope.json";

const UNIT_ORDER = [
  "hsk1-personal-exchange",
  "hsk1-time-place-events",
  "hsk1-daily-life",
  "hsk1-travel-leisure",
  "hsk1-study-work",
  "hsk1-character-foundation",
];

const TASK_ORDINALS = {
  "hsk1-personal-exchange": [1, 6],
  "hsk1-time-place-events": [2, 4, 5],
  "hsk1-daily-life": [3, 7, 9, 10, 15],
  "hsk1-travel-leisure": [8, 11],
  "hsk1-study-work": [12, 13, 14],
  "hsk1-character-foundation": [],
};

const TOPIC_ORDINALS = {
  "hsk1-personal-exchange": [1, 2, 8, 9, 10],
  "hsk1-time-place-events": [3, 6, 7],
  "hsk1-daily-life": [4, 5, 11, 12, 16, 17, 18, 19, 29, 30],
  "hsk1-travel-leisure": [13, 14, 15, 20],
  "hsk1-study-work": [21, 22, 23, 24, 25, 26, 27, 28],
  "hsk1-character-foundation": [],
};

const GRAMMAR_ORDINALS = {
  "hsk1-personal-exchange": [
    4, 5, 6, 8, 9, 15, 16, 19, 20, 22, 23, 24, 26, 27, 28, 29, 30, 31,
    35, 37, 38, 39, 42, 43, 45, 46, 47, 48, 49, 50, 56, 57,
  ],
  "hsk1-time-place-events": [
    1, 2, 3, 10, 11, 14, 17, 18, 21, 32, 33, 34, 36, 40, 44, 51, 52, 58,
    59, 60, 61, 62, 64, 65, 66,
  ],
  "hsk1-daily-life": [7, 12, 13, 25, 63],
  "hsk1-travel-leisure": [41, 53, 54],
  "hsk1-study-work": [55],
  "hsk1-character-foundation": [],
};

const VOCABULARY_SEQUENCES = {
  "hsk1-time-place-events": [
    2, 5, 6, 7, 11, 29, 31, 33, 49, 55, 56, 76, 80, 93, 94, 95, 109,
    110, 111, 112, 113, 128, 129, 131,
    132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 149, 163, 168, 169,
    172, 175, 178, 185, 186, 207, 208, 212, 213, 215, 217, 226, 227, 230,
    160, 162, 173, 184, 198, 223, 232, 236, 239, 243, 244, 245, 251, 254,
    267, 269, 271, 273, 275, 279, 280, 281, 282, 283, 284, 286, 291, 294,
    297,
  ],
  "hsk1-daily-life": [
    8, 9, 12, 16, 17, 19, 21, 23, 34, 40, 46, 47, 50, 51, 52, 60, 65, 72,
    77, 84, 85, 89, 90, 100, 104, 105, 116, 117, 125, 126, 127, 151, 157,
    159, 164, 174, 180, 183, 192, 193, 216, 224, 255, 256, 257, 258, 260,
    261, 262, 268, 274, 278, 295, 300,
  ],
  "hsk1-travel-leisure": [
    18, 20, 22, 37, 38, 39, 54, 58, 75, 81, 83, 97, 98, 99, 101, 106,
    167, 209, 210, 214, 246, 298, 299,
  ],
  "hsk1-study-work": [
    10, 27, 28, 36, 42, 43, 62, 63, 69, 70, 103, 107, 118, 176, 177, 179,
    190, 191, 211, 220, 228, 229, 237, 238, 240, 247, 248, 249, 250, 288,
    289, 290, 292, 293, 296,
  ],
};

const UNIT_AUTHORING = {
  "hsk1-personal-exchange": {
    focus: "Danh tính, gia đình, quan hệ, lịch sự, ý muốn và mẫu câu hỏi đáp nền.",
    exitEvidence: {
      mode: "two-turn-personal-dialogue",
      skills: ["listening", "speaking", "reading"],
      reviewedRubricRequired: true,
    },
  },
  "hsk1-time-place-events": {
    focus: "Số, lịch, giờ, vị trí, thời tiết và tiến trình sự kiện đơn giản.",
    exitEvidence: {
      mode: "schedule-and-location-information-gap",
      skills: ["listening", "reading", "speaking"],
      reviewedRubricRequired: true,
    },
  },
  "hsk1-daily-life": {
    focus: "Đồ vật, ăn uống, mua sắm, giá cả, sức khỏe và nhu cầu thiết yếu.",
    exitEvidence: {
      mode: "daily-needs-scenario",
      skills: ["listening", "reading", "speaking"],
      reviewedRubricRequired: true,
    },
  },
  "hsk1-travel-leisure": {
    focus: "Phương tiện, hỏi đường, sắp xếp đi lại và hoạt động giải trí.",
    exitEvidence: {
      mode: "route-and-leisure-plan",
      skills: ["listening", "reading", "speaking"],
      reviewedRubricRequired: true,
    },
  },
  "hsk1-study-work": {
    focus: "Trường lớp, nội dung học, nghề nghiệp, nơi làm việc và lịch hoạt động.",
    exitEvidence: {
      mode: "study-work-profile",
      skills: ["listening", "reading", "writing"],
      reviewedRubricRequired: true,
    },
  },
  "hsk1-character-foundation": {
    focus: "Nhận diện 246 chữ chính thức, liên hệ âm-nghĩa và viết chữ đã học trong từ.",
    exitEvidence: {
      mode: "character-recognition-and-guided-writing",
      skills: ["reading", "writing"],
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
  const sortedMapped = [...mappedIds].sort();
  const sortedExpected = [...expectedIds].sort();
  if (
    new Set(mappedIds).size !== mappedIds.length
    || JSON.stringify(sortedMapped) !== JSON.stringify(sortedExpected)
  ) {
    throw new Error(`${name} mapping is not an exact one-unit partition`);
  }
};

export const buildHsk1CurriculumScope = (root = process.cwd()) => {
  const graphBundle = loadHskCurriculumGraphBundle(root);
  assertValidHskSyllabusBundle(graphBundle.syllabus);
  const inventory = graphBundle.syllabus.inventory;
  const tasks = inventory.tasks.filter((item) => item.level === 1);
  const topics = inventory.topics.filter((item) => item.level === 1);
  const vocabulary = inventory.vocabulary.filter((item) => item.level === 1);
  const recognitionCharacters = inventory.recognitionCharacters.filter(
    (item) => item.level === 1,
  );
  const grammarRows = inventory.grammarRows.filter((item) => item.level === 1);

  const nonPersonalVocabulary = new Set(
    Object.values(VOCABULARY_SEQUENCES).flat(),
  );
  if (nonPersonalVocabulary.size !== Object.values(
    VOCABULARY_SEQUENCES,
  ).flat().length) {
    throw new Error("HSK1 vocabulary planning sequences overlap");
  }
  const vocabularySequences = {
    "hsk1-personal-exchange": vocabulary
      .map((item) => item.sequence)
      .filter((sequence) => !nonPersonalVocabulary.has(sequence)),
    ...VOCABULARY_SEQUENCES,
    "hsk1-character-foundation": [],
  };

  const unitScopes = UNIT_ORDER.map((unitId) => ({
    unitId,
    ...UNIT_AUTHORING[unitId],
    taskIds: TASK_ORDINALS[unitId].map(
      (ordinal) => idByOrdinal(tasks, ordinal, "task"),
    ),
    topicIds: TOPIC_ORDINALS[unitId].map(
      (ordinal) => idByOrdinal(topics, ordinal, "topic"),
    ),
    vocabularyIds: vocabularySequences[unitId].map(
      (sequence) => idBySequence(vocabulary, sequence, "vocabulary"),
    ),
    grammarRowIds: GRAMMAR_ORDINALS[unitId].map(
      (ordinal) => idByOrdinal(grammarRows, ordinal, "grammar"),
    ),
    recognitionCharacterIds: unitId === "hsk1-character-foundation"
      ? recognitionCharacters.map((item) => item.id)
      : [],
  }));

  const all = (field) => unitScopes.flatMap((unit) => unit[field]);
  assertExactPartition("task", all("taskIds"), tasks.map((item) => item.id));
  assertExactPartition("topic", all("topicIds"), topics.map((item) => item.id));
  assertExactPartition(
    "vocabulary",
    all("vocabularyIds"),
    vocabulary.map((item) => item.id),
  );
  assertExactPartition(
    "grammar",
    all("grammarRowIds"),
    grammarRows.map((item) => item.id),
  );
  assertExactPartition(
    "recognition character",
    all("recognitionCharacterIds"),
    recognitionCharacters.map((item) => item.id),
  );

  return {
    schemaVersion: 1,
    scopeId: "hsk1-authoring-scope-2026.07",
    graphId: graphBundle.graph.graphId,
    graphSha256: graphBundle.graphSha256,
    source: {
      sourceId: graphBundle.syllabus.source.sourceId,
      inventorySha256: graphBundle.syllabus.inventorySha256,
      effective: graphBundle.syllabus.source.effective,
    },
    pathId: "hsk1",
    state: "authoring-scope",
    learnerVisible: false,
    releaseEligible: false,
    mappingPolicy: {
      primaryUnitCardinality: "exactly-one",
      scopeIsLessonCoverage: false,
      scopeGrantsMastery: false,
    },
    coverageClaims: {
      officialInventoryScoped: true,
      lessonPracticeCoverageComplete: false,
      hsk1Complete: false,
    },
    unitScopes,
  };
};

export const serializeHsk1CurriculumScope = (scope) =>
  `${JSON.stringify(scope)}\n`;

const main = () => {
  const root = process.cwd();
  const outputPath = join(root, HSK1_CURRICULUM_SCOPE_RELATIVE_PATH);
  const serialized = serializeHsk1CurriculumScope(
    buildHsk1CurriculumScope(root),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK1 curriculum scope is stale");
    }
  } else {
    process.stdout.write(serialized);
  }

  console.log(JSON.stringify({
    valid: true,
    output: HSK1_CURRICULUM_SCOPE_RELATIVE_PATH,
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
