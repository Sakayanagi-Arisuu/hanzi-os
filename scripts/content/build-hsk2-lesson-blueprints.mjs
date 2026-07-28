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

const STRAND_TITLES = {
  "hsk2-person-events-environment": [
    "Miêu tả người và vật",
    "Vị trí và môi trường xung quanh",
    "Thời tiết và kế hoạch",
    "Sự kiện theo trình tự thời gian",
    "Hỏi tiếp và giải thích lý do",
  ],
  "hsk2-daily-needs-family": [
    "Lời mời và yêu cầu lịch sự",
    "Cảm xúc và trạng thái hằng ngày",
    "Ăn uống và mua sắm",
    "Sức khỏe và gia đình",
    "Xử lý nhu cầu qua hội thoại nhiều lượt",
  ],
  "hsk2-travel-leisure": [
    "Hỏi đường và xác nhận điểm đến",
    "Chỉ tuyến đi theo từng chặng",
    "Phương tiện và thời gian di chuyển",
    "Đặt và thay đổi lịch trình",
    "Trao đổi hoạt động giải trí",
  ],
  "hsk2-study-work-culture": [
    "Lịch học và nhiệm vụ",
    "Kinh nghiệm học tập",
    "Công việc và phối hợp",
    "Lễ hội và món ăn",
    "Họ tên, xưng hô và giới thiệu văn hóa",
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

const makeSituationalLessons = (unit) =>
  unit.strands.flatMap((strand) => {
    const titles = STRAND_TITLES[strand.strandId];
    if (!titles) throw new Error(`Missing lesson titles for ${strand.strandId}`);
    const taskBuckets = splitEvenly(strand.taskIds, titles.length);
    const topicBuckets = splitEvenly(strand.topicIds, titles.length);
    const vocabularyBuckets = splitEvenly(
      strand.vocabularyIds,
      titles.length,
    );
    return titles.map((titleVi, index) => ({
      lessonId: `${strand.strandId}-lesson-${String(index + 1).padStart(2, "0")}`,
      unitId: unit.unitId,
      trackId: strand.strandId,
      blueprintKind: "situational-dialogue",
      titleVi,
      objectiveVi:
        `Duy trì hội thoại nhiều lượt về ${titleVi.toLocaleLowerCase("vi")} bằng cách hỏi tiếp, xác nhận và phản hồi có liên kết; chưa chấm mastery trước review.`,
      inventoryMappings: {
        taskIds: taskBuckets[index],
        topicIds: topicBuckets[index],
        vocabularyIds: vocabularyBuckets[index],
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
