import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHsk2CurriculumScopeBundle,
  loadHsk2CurriculumScopeBundle,
} from "../../src/content/hsk2CurriculumScope.mjs";
import {
  assertValidHsk2VocabularyDraftBundle,
  loadHsk2VocabularyDraftBundle,
} from "../../src/content/hsk2VocabularyDraft.mjs";
import {
  HSK2_LESSON_BLUEPRINTS_RELATIVE_PATH,
} from "../../src/content/hsk2LessonBlueprints.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

const SITUATIONAL_LESSON_SPECS = {
  "hsk2-person-events-environment": [
    {
      titleVi: "Ngoại hình, thói quen và lai lịch",
      taskOrdinals: [1],
      topicOrdinals: [1, 2],
      vocabularySequences: [302, 309, 314, 341, 344, 410, 412, 462, 498],
    },
    {
      titleVi: "Chi tiết sự kiện và nguyên nhân",
      taskOrdinals: [2],
      topicOrdinals: [3],
      vocabularySequences: [
        323, 330, 331, 332, 333, 334, 336, 376, 382, 384, 386, 399, 431,
        438, 439, 454,
      ],
    },
    {
      titleVi: "Đồ vật, màu sắc và so sánh",
      taskOrdinals: [3],
      topicOrdinals: [4],
      vocabularySequences: [303, 353, 355, 358, 396, 406, 407, 466],
    },
    {
      titleVi: "Thời tiết và thay đổi kế hoạch",
      taskOrdinals: [4],
      topicOrdinals: [5],
      vocabularySequences: [420, 475],
    },
    {
      titleVi: "Địa điểm và đặc điểm môi trường",
      taskOrdinals: [5],
      topicOrdinals: [6],
      vocabularySequences: [321, 366, 403],
    },
  ],
  "hsk2-daily-needs-family": [
    {
      titleVi: "Lịch sự, nhờ giúp và bày tỏ ý muốn",
      taskOrdinals: [6],
      topicOrdinals: [7, 8, 9],
      vocabularySequences: [
        301, 305, 306, 311, 312, 313, 327, 329, 343, 345, 352, 422, 455,
        463,
      ],
    },
    {
      titleVi: "Món ăn, đồ uống và thói quen ăn uống",
      taskOrdinals: [7],
      topicOrdinals: [10, 11, 12],
      vocabularySequences: [
        339, 347, 354, 374, 377, 395, 408, 423, 483, 493,
      ],
    },
    {
      titleVi: "Chọn mua và mô tả sản phẩm",
      taskOrdinals: [9],
      topicOrdinals: [17, 18],
      vocabularySequences: [
        307, 357, 360, 383, 405, 424, 434, 437, 453,
      ],
    },
    {
      titleVi: "Báo bệnh, hỏi thăm và đi khám",
      taskOrdinals: [10],
      topicOrdinals: [19, 20],
      vocabularySequences: [
        388, 429, 433, 436, 440, 445, 456, 457, 467, 468, 469, 476,
      ],
    },
    {
      titleVi: "Quan hệ và hoạt động gia đình",
      taskOrdinals: [12],
      topicOrdinals: [23, 24],
      vocabularySequences: [409, 417, 461, 470, 480, 487, 494],
    },
  ],
  "hsk2-travel-leisure": [
    {
      titleVi: "Hỏi đường và xác nhận vị trí",
      taskOrdinals: [8],
      topicOrdinals: [13],
      vocabularySequences: [
        324, 356, 371, 389, 390, 391, 392, 400, 401, 413, 419, 426, 443,
        447, 450, 459, 481, 482, 484, 499, 500,
      ],
    },
    {
      titleVi: "Chỉ tuyến bằng hướng chuyển động",
      taskOrdinals: [],
      topicOrdinals: [14],
      vocabularySequences: [
        316, 318, 320, 348, 350, 361, 362, 370, 372, 373, 425, 427, 458,
        460, 495,
      ],
    },
    {
      titleVi: "Phương tiện, lịch trình và cảm nhận chuyến đi",
      taskOrdinals: [],
      topicOrdinals: [15, 16],
      vocabularySequences: [
        315, 317, 319, 328, 335, 340, 346, 351, 363, 364, 375, 393, 394,
        397, 398, 402, 416, 496,
      ],
    },
    {
      titleVi: "Trao đổi hoạt động giải trí",
      taskOrdinals: [11],
      topicOrdinals: [21],
      vocabularySequences: [
        338, 387, 411, 414, 415, 421, 428, 441, 444, 451, 477, 478, 479,
        485, 490, 497,
      ],
    },
    {
      titleVi: "Hẹn và sắp xếp thời gian rảnh",
      taskOrdinals: [],
      topicOrdinals: [22],
      vocabularySequences: [418, 471, 473, 486],
    },
  ],
  "hsk2-study-work-culture": [
    {
      titleVi: "Tình hình và kinh nghiệm học tập",
      taskOrdinals: [13],
      topicOrdinals: [25, 26],
      vocabularySequences: [
        304, 308, 310, 322, 325, 326, 337, 342, 365, 367, 380, 381, 442,
        448, 452, 472, 492,
      ],
    },
    {
      titleVi: "Trường học và hoạt động sau giờ học",
      taskOrdinals: [14],
      topicOrdinals: [27, 28],
      vocabularySequences: [359, 368, 369, 378, 379, 435],
    },
    {
      titleVi: "Công việc, trải nghiệm và nghề nghiệp",
      taskOrdinals: [15],
      topicOrdinals: [29, 30, 31],
      vocabularySequences: [404, 432, 449, 491],
    },
    {
      titleVi: "Tết và ấn tượng về món ăn Trung Quốc",
      taskOrdinals: [16],
      topicOrdinals: [32, 33],
      vocabularySequences: [349, 385, 430, 446],
    },
    {
      titleVi: "Họ tên và cách xưng hô trang trọng",
      taskOrdinals: [17],
      topicOrdinals: [34],
      vocabularySequences: [464, 465, 474, 488, 489],
    },
  ],
};

const MODULE_TITLES = {
  "hsk2-reference-description-comparison": [
    "Quy chiếu và số lượng",
    "Vị trí và miêu tả có đối tượng",
    "So sánh và mức độ",
    "Chuỗi miêu tả tổng hợp",
  ],
  "hsk2-aspect-time-experience": [
    "Thời gian, tần suất và trạng thái",
    "Khả năng và trải nghiệm",
  ],
  "hsk2-complements-and-motion": [
    "Kết quả và hướng chuyển động",
    "Chuỗi động từ và quan hệ tân ngữ",
  ],
  "hsk2-clause-linking": [
    "Lựa chọn, chuyển ý và nguyên nhân",
    "Trình tự, kết quả và nhấn mạnh",
  ],
};

const STAGE_TITLES = {
  "hsk2-dictation": [
    "Nghe-chép cụm thông tin",
    "Nghe-chép câu hoàn chỉnh",
    "Nghe-chép chuỗi câu ngắn",
  ],
  "hsk2-sentence-reconstruction": [
    "Dựng câu từ thành phần",
    "Dựng câu có aspect và bổ ngữ",
    "Dựng chuỗi câu có liên kết",
  ],
  "hsk2-guided-message": [
    "Tin nhắn cung cấp thông tin",
    "Tin nhắn yêu cầu và cập nhật",
  ],
  "hsk2-picture-description": [
    "Mô tả người, vật và vị trí",
    "Mô tả diễn biến và lý do",
  ],
};

const splitEvenly = (values, count) => {
  const baseSize = Math.floor(values.length / count);
  const remainder = values.length % count;
  let offset = 0;
  return Array.from({ length: count }, (_, index) => {
    const size = baseSize + (index < remainder ? 1 : 0);
    const bucket = values.slice(offset, offset + size);
    offset += size;
    return bucket;
  });
};

const ordinalId = (prefix, ordinal, width = 2) =>
  `${prefix}${String(ordinal).padStart(width, "0")}`;
const vocabularyId = (sequence) =>
  `hsk-vocab-${String(sequence).padStart(5, "0")}`;

const assertLessonPartition = (label, specs, key, expected) => {
  const actual = specs.flatMap((spec) => spec[key]);
  if (
    actual.length !== new Set(actual).size
    || JSON.stringify([...actual].sort())
      !== JSON.stringify([...expected].sort())
  ) {
    throw new Error(`${label} lesson specification is not an exact partition`);
  }
};

const makeSituationalLessons = (unit) =>
  unit.strands.flatMap((strand) => {
    const specs = SITUATIONAL_LESSON_SPECS[strand.strandId];
    if (!specs) {
      throw new Error(
        `Missing situational lesson specifications for ${strand.strandId}`,
      );
    }
    const resolvedSpecs = specs.map((spec) => ({
      ...spec,
      taskIds: spec.taskOrdinals.map(
        (ordinal) => ordinalId("hsk2-task-", ordinal),
      ),
      topicIds: spec.topicOrdinals.map(
        (ordinal) => ordinalId("hsk2-topic-", ordinal, 3),
      ),
      vocabularyIds: spec.vocabularySequences.map(vocabularyId),
    }));
    assertLessonPartition(
      `${strand.strandId} task`,
      resolvedSpecs,
      "taskIds",
      strand.taskIds,
    );
    assertLessonPartition(
      `${strand.strandId} topic`,
      resolvedSpecs,
      "topicIds",
      strand.topicIds,
    );
    assertLessonPartition(
      `${strand.strandId} vocabulary`,
      resolvedSpecs,
      "vocabularyIds",
      strand.vocabularyIds,
    );
    return resolvedSpecs.map((spec, index) => ({
      lessonId: `${strand.strandId}-lesson-${String(index + 1).padStart(2, "0")}`,
      unitId: unit.unitId,
      trackId: strand.strandId,
      blueprintKind: "situational-dialogue",
      titleVi: spec.titleVi,
      objectiveVi:
        `Duy trì hội thoại nhiều lượt về ${spec.titleVi.toLocaleLowerCase("vi")} bằng cách hỏi tiếp, xác nhận và phản hồi có liên kết; chưa chấm mastery trước review.`,
      inventoryMappings: {
        taskIds: spec.taskIds,
        topicIds: spec.topicIds,
        vocabularyIds: spec.vocabularyIds,
        grammarRowIds: [],
        recognitionCharacterIds: [],
      },
      requiredPracticeKinds: [
        "multi-turn-dialogue",
        "listening-comprehension",
        "guided-roleplay",
      ],
      audioRequirement: "reviewed-human-or-licensed-before-release",
      evidenceMode: unit.exitEvidence.mode,
      evidenceSkills: unit.exitEvidence.skills,
    }));
  });

const makeSentenceChainLessons = (unit) =>
  unit.grammarModules.flatMap((module) => {
    const titles = MODULE_TITLES[module.moduleId];
    if (!titles) throw new Error(`Missing lesson titles for ${module.moduleId}`);
    const grammarBuckets = splitEvenly(module.grammarRowIds, titles.length);
    return titles.map((titleVi, index) => ({
      lessonId: `${module.moduleId}-lesson-${String(index + 1).padStart(2, "0")}`,
      unitId: unit.unitId,
      trackId: module.moduleId,
      blueprintKind: "sentence-chain",
      titleVi,
      objectiveVi:
        `Dựng và tự kiểm tra chuỗi hai đến ba câu cho chủ điểm ${titleVi.toLocaleLowerCase("vi")}, giữ đúng quan hệ ý nghĩa của từng điểm ngữ pháp.`,
      inventoryMappings: {
        taskIds: [],
        topicIds: [],
        vocabularyIds: [],
        grammarRowIds: grammarBuckets[index],
        recognitionCharacterIds: [],
      },
      requiredPracticeKinds: [
        "sentence-reconstruction",
        "guided-sentence-chain",
        "error-correction",
      ],
      audioRequirement: "not-required-for-blueprint",
      evidenceMode: unit.exitEvidence.mode,
      evidenceSkills: unit.exitEvidence.skills,
    }));
  });

const makeProductionLessons = (unit) => {
  const stageLessonCounts = unit.productionStages.map(
    (stage) => STAGE_TITLES[stage.stageId]?.length ?? 0,
  );
  const totalLessons = stageLessonCounts.reduce(
    (total, count) => total + count,
    0,
  );
  const characterBuckets = splitEvenly(
    unit.recognitionCharacterIds,
    totalLessons,
  );
  let characterBucketIndex = 0;
  return unit.productionStages.flatMap((stage) => {
    const titles = STAGE_TITLES[stage.stageId];
    if (!titles) throw new Error(`Missing lesson titles for ${stage.stageId}`);
    return titles.map((titleVi, index) => {
      const characterIds = characterBuckets[characterBucketIndex];
      characterBucketIndex += 1;
      return {
        lessonId: `${stage.stageId}-lesson-${String(index + 1).padStart(2, "0")}`,
        unitId: unit.unitId,
        trackId: stage.stageId,
        blueprintKind: "short-text-production",
        titleVi,
        objectiveVi:
          `Tạo đầu ra ngắn theo khung ${titleVi.toLocaleLowerCase("vi")} và tự đối chiếu trước khi nộp cho reviewer; nhận diện chữ không được suy thành năng lực viết.`,
        inventoryMappings: {
          taskIds: [],
          topicIds: [],
          vocabularyIds: [],
          grammarRowIds: [],
          recognitionCharacterIds: characterIds,
        },
        requiredPracticeKinds: [
          stage.mode,
          "guided-production",
          "self-reveal-revision",
        ],
        audioRequirement: stage.stageId === "hsk2-dictation"
          ? "reviewed-human-or-licensed-before-release"
          : "not-required-for-blueprint",
        evidenceMode: stage.mode,
        evidenceSkills: stage.skills,
        minimumPromptUnits: stage.minimumPromptUnits,
      };
    });
  });
};

export const buildHsk2LessonBlueprints = (root = process.cwd()) => {
  const scopeBundle = loadHsk2CurriculumScopeBundle(root);
  const scopeResult = assertValidHsk2CurriculumScopeBundle(scopeBundle);
  const vocabularyBundle = loadHsk2VocabularyDraftBundle(root);
  assertValidHsk2VocabularyDraftBundle(vocabularyBundle);
  const unitById = new Map(
    scopeBundle.scope.unitScopes.map((unit) => [unit.unitId, unit]),
  );
  const rawLessons = [
    ...makeSituationalLessons(unitById.get("hsk2-situational-dialogue")),
    ...makeSentenceChainLessons(unitById.get("hsk2-sentence-chains")),
    ...makeProductionLessons(unitById.get("hsk2-short-text-production")),
  ];
  if (rawLessons.length !== scopeResult.summary.plannedLessonBlueprints) {
    throw new Error("Generated HSK2 lesson count does not match the scope");
  }
  const lessons = rawLessons.map((lesson, index) => ({
    ...lesson,
    sequence: index + 1,
    prerequisiteLessonIds: index === 0
      ? []
      : [rawLessons[index - 1].lessonId],
    practicePlan: {
      state: "planned",
      requiredKinds: lesson.requiredPracticeKinds,
      authoredItemCount: 0,
      measurementEligible: false,
      masteryEligible: false,
    },
    assessmentPlan: {
      evidenceMode: lesson.evidenceMode,
      skills: lesson.evidenceSkills,
      minimumPromptUnits: lesson.minimumPromptUnits ?? null,
      reviewedRubricRequired: true,
      rubric: null,
      authoredPromptCount: 0,
    },
    audioRequirement: lesson.audioRequirement,
    review: "pending",
    releaseEligible: false,
    requiredPracticeKinds: undefined,
    evidenceMode: undefined,
    evidenceSkills: undefined,
    minimumPromptUnits: undefined,
  }));
  const reviewBatches = lessons.map((lesson) => ({
    batchId: `${lesson.lessonId}:blueprint-review-v1`,
    lessonId: lesson.lessonId,
    targetLessonIds: [lesson.lessonId],
    requiredRoles: [
      "native-mandarin-curriculum-reviewer",
      "vietnamese-editor",
      "assessment-editor",
    ],
    state: "pending",
    approvals: [],
  }));

  return {
    schemaVersion: 1,
    packId: "hsk2-lesson-blueprints-2026.07",
    level: 2,
    state: "ai-assisted-blueprint-draft",
    learnerVisible: false,
    releaseEligible: false,
    derivedArtifactLicense: "CC-BY-SA-4.0",
    source: {
      scopeId: scopeBundle.scope.scopeId,
      scopeSha256: fileSha256(scopeBundle.scopePath),
      vocabularyDraftId: vocabularyBundle.draft.draftId,
      vocabularyDraftSha256: fileSha256(vocabularyBundle.draftPath),
      attribution:
        "content/sources/cc-cedict-debian-2026-04-03/ATTRIBUTION.md",
    },
    authorship: {
      method: "ai-assisted-curriculum-blueprint",
      assistant: "OpenAI Codex",
      nativeMandarinReviewer: null,
      vietnameseEditor: null,
      assessmentEditor: null,
    },
    releasePolicy: {
      linguisticReviewRequired: true,
      vietnameseEditorialReviewRequired: true,
      assessmentReviewRequired: true,
      reviewedAudioRequiredWhereDeclared: true,
      practiceRequiredForRelease: true,
      blueprintGrantsMastery: false,
    },
    counts: {
      lessons: lessons.length,
      situationalDialogueLessons: lessons.filter(
        (lesson) => lesson.blueprintKind === "situational-dialogue",
      ).length,
      sentenceChainLessons: lessons.filter(
        (lesson) => lesson.blueprintKind === "sentence-chain",
      ).length,
      shortTextProductionLessons: lessons.filter(
        (lesson) => lesson.blueprintKind === "short-text-production",
      ).length,
      taskBlueprintMappings: new Set(lessons.flatMap(
        (lesson) => lesson.inventoryMappings.taskIds,
      )).size,
      topicBlueprintMappings: new Set(lessons.flatMap(
        (lesson) => lesson.inventoryMappings.topicIds,
      )).size,
      vocabularyBlueprintMappings: new Set(lessons.flatMap(
        (lesson) => lesson.inventoryMappings.vocabularyIds,
      )).size,
      grammarBlueprintMappings: new Set(lessons.flatMap(
        (lesson) => lesson.inventoryMappings.grammarRowIds,
      )).size,
      recognitionCharacterBlueprintMappings: new Set(lessons.flatMap(
        (lesson) => lesson.inventoryMappings.recognitionCharacterIds,
      )).size,
      authoredPracticeItems: 0,
      authoredAssessmentPrompts: 0,
      reviewBatches: reviewBatches.length,
      approvals: 0,
      releaseEligibleLessons: 0,
    },
    coverageClaims: {
      officialInventoryBlueprintMapped: true,
      lessonBlueprintCoverageComplete: true,
      authoredPracticeCoverageComplete: false,
      reviewedContentComplete: false,
      hsk2Complete: false,
    },
    lessons,
    reviewBatches,
  };
};

export const serializeHsk2LessonBlueprints = (pack) =>
  `${JSON.stringify(pack)}\n`;

const main = () => {
  const outputPath = resolve(
    process.cwd(),
    HSK2_LESSON_BLUEPRINTS_RELATIVE_PATH,
  );
  const serialized = serializeHsk2LessonBlueprints(
    buildHsk2LessonBlueprints(),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK2 lesson-blueprint pack is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK2_LESSON_BLUEPRINTS_RELATIVE_PATH,
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
