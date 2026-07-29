import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHsk4CurriculumScopeBundle,
  loadHsk4CurriculumScopeBundle,
} from "../../src/content/hsk4CurriculumScope.mjs";
import {
  HSK4_LESSON_BLUEPRINTS_RELATIVE_PATH,
} from "../../src/content/hsk4LessonBlueprints.mjs";
import {
  assertValidHsk4VocabularyDraftBundle,
  loadHsk4VocabularyDraftBundle,
} from "../../src/content/hsk4VocabularyDraft.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

const DOMAIN_AUTHORING = {
  "hsk4-personal-community-analysis": {
    title: "Đời sống cá nhân và cộng đồng",
    signals: [
      "personal", "community", "family", "health", "medical", "shopping",
      "food", "travel", "traffic", "home", "service", "emotion",
      "个人", "社区", "家庭", "健康", "购物", "交通",
    ],
  },
  "hsk4-education-work-evaluation": {
    title: "Giáo dục và nghề nghiệp",
    signals: [
      "education", "school", "campus", "study", "learn", "course",
      "work", "office", "career", "company", "staff", "management",
      "教育", "学校", "学习", "工作", "职业", "单位",
    ],
  },
  "hsk4-nature-technology-explanation": {
    title: "Tự nhiên, môi trường và công nghệ",
    signals: [
      "nature", "environment", "climate", "geography", "animal", "plant",
      "pollution", "protect", "technology", "science", "research", "energy",
      "自然", "环境", "科技", "科学", "气候", "保护",
    ],
  },
  "hsk4-society-economy-argument": {
    title: "Xã hội và kinh tế đương đại",
    signals: [
      "society", "social", "economy", "economic", "business", "market",
      "public", "infrastructure", "internet", "urban", "province", "nation",
      "社会", "经济", "商业", "网络", "城市", "民族",
    ],
  },
  "hsk4-arts-sports-exchange-critique": {
    title: "Nghệ thuật, thể thao và giao lưu",
    signals: [
      "art", "music", "film", "literature", "performance", "artist",
      "sport", "competition", "athlete", "international", "friendship",
      "艺术", "文艺", "体育", "比赛", "交流", "作品",
    ],
  },
  "hsk4-culture-history-interpretation": {
    title: "Văn hóa, truyền thống và lịch sử",
    signals: [
      "culture", "tradition", "custom", "festival", "history", "historic",
      "heritage", "food", "etiquette", "proverb", "ancient", "monument",
      "文化", "传统", "历史", "风俗", "名胜", "名言",
    ],
  },
};

const COMPREHENSION_LENSES = [
  {
    slug: "concept-actor-map",
    title: "Khái niệm, nhân vật và vai trò",
    focus:
      "lập sơ đồ khái niệm, chủ thể, đối tượng và vai trò được nêu qua nhiều đoạn",
  },
  {
    slug: "process-timeline",
    title: "Quá trình, mốc thời gian và chuyển biến",
    focus:
      "theo dõi tiến trình, mốc thời gian và thay đổi trạng thái giữa các phần của văn bản",
  },
  {
    slug: "cause-condition-result",
    title: "Nguyên nhân, điều kiện và hệ quả",
    focus:
      "phân biệt nguyên nhân trực tiếp, điều kiện nền và hệ quả được tác giả hỗ trợ",
  },
  {
    slug: "comparison-variation",
    title: "So sánh, khác biệt và ngoại lệ",
    focus:
      "đối chiếu phương án hoặc hiện tượng và đánh dấu ngoại lệ thay vì khái quát quá mức",
  },
  {
    slug: "claim-evidence-inference",
    title: "Luận điểm, bằng chứng và suy luận",
    focus:
      "tách luận điểm khỏi chi tiết hỗ trợ và kiểm tra suy luận ngầm bằng dòng bằng chứng",
  },
  {
    slug: "viewpoint-synthesis",
    title: "Góc nhìn, giới hạn và tổng hợp",
    focus:
      "nhận diện góc nhìn, giới hạn dữ liệu và viết tổng hợp không vượt quá nguồn",
  },
];

const ARGUMENT_LESSON_COUNTS = {
  "hsk4-precision-reference-quantity": 6,
  "hsk4-stance-comparison-rhetoric": 5,
  "hsk4-event-agency-voice": 4,
  "hsk4-information-order-cohesion": 5,
  "hsk4-argument-logic-concession": 4,
};

const ARGUMENT_LENSES = [
  "Tách dữ kiện và diễn giải",
  "Paraphrase không đổi phạm vi",
  "Sắp xếp bằng chứng theo sức nặng",
  "Nêu phản biện và điều kiện",
  "Viết kết luận có giới hạn",
  "Chuyển bản viết thành phần nói",
];

const INTEGRATION_TITLES = {
  "hsk4-long-input-structure-map": [
    "Dựng sơ đồ bài nghe dài",
    "Dựng sơ đồ bài đọc nhiều đoạn",
    "Đối chiếu cấu trúc nghe và đọc",
  ],
  "hsk4-inference-evidence-check": [
    "Kiểm tra suy luận từ lời nói",
    "Kiểm tra suy luận từ văn bản",
    "Bác bỏ suy luận vượt nguồn",
  ],
  "hsk4-cross-text-synthesis": [
    "Paraphrase nguồn thứ nhất",
    "Đối chiếu hai nguồn",
    "Viết tổng hợp có giới hạn",
  ],
  "hsk4-structured-written-argument": [
    "Lập dàn ý viết có thời gian",
    "Viết luận điểm và phản biện",
    "Rà bằng chứng và kết luận",
  ],
  "hsk4-structured-spoken-defense": [
    "Chuẩn bị quan điểm trong thời gian giới hạn",
    "Trình bày quan điểm có bằng chứng",
    "Phản hồi câu hỏi và tự sửa",
  ],
  "hsk4-timed-sectional-rehearsal": [
    "Luyện section nghe–ghi chú",
    "Luyện section đọc–viết",
    "Luyện nói–viết tích hợp",
  ],
};

const splitEvenly = (values, count) => {
  const base = Math.floor(values.length / count);
  const remainder = values.length % count;
  let offset = 0;
  return Array.from({ length: count }, (_, index) => {
    const size = base + (index < remainder ? 1 : 0);
    const bucket = values.slice(offset, offset + size);
    offset += size;
    return bucket;
  });
};

const normalize = (value) => value.toLocaleLowerCase("en");

const classifyVocabulary = (entries, lessonSpecs) => {
  const assignmentCounts = new Map(
    lessonSpecs.map((spec) => [spec.lessonId, 0]),
  );
  return entries.map((entry) => {
    const haystack = normalize([
      entry.simplified,
      ...entry.sourceMatches.flatMap((match) => match.senses),
    ].join(" "));
    const candidates = [];
    for (const [order, spec] of lessonSpecs.entries()) {
      for (const signal of spec.keywordSignals) {
        if (!haystack.includes(normalize(signal))) continue;
        const score = signal.length >= 8 ? 3 : signal.length >= 4 ? 2 : 1;
        candidates.push({ spec, score, signal, order });
      }
    }
    const best = candidates.sort((left, right) =>
      right.score - left.score
      || assignmentCounts.get(left.spec.lessonId)
        - assignmentCounts.get(right.spec.lessonId)
      || left.order - right.order
    )[0];
    if (!best) {
      const spec = [...lessonSpecs].sort((left, right) =>
        assignmentCounts.get(left.lessonId)
          - assignmentCounts.get(right.lessonId)
        || left.lessonId.localeCompare(right.lessonId)
      )[0];
      assignmentCounts.set(
        spec.lessonId,
        assignmentCounts.get(spec.lessonId) + 1,
      );
      return {
        vocabularyId: entry.officialId,
        lessonId: spec.lessonId,
        method: "cross-domain-foundation-fallback",
        score: 0,
        matchedSignal: null,
      };
    }
    assignmentCounts.set(
      best.spec.lessonId,
      assignmentCounts.get(best.spec.lessonId) + 1,
    );
    return {
      vocabularyId: entry.officialId,
      lessonId: best.spec.lessonId,
      method: "source-sense-keyword-match",
      score: best.score,
      matchedSignal: best.signal,
    };
  });
};

const makeComprehensionLessons = (scopeBundle, vocabularyBundle) => {
  const lessonSpecs = scopeBundle.scope.discourseDomains.flatMap((domain) => {
    const authoring = DOMAIN_AUTHORING[domain.domainId];
    if (!authoring) throw new Error(`Missing authoring for ${domain.domainId}`);
    const topicBuckets = splitEvenly(
      domain.topicIds,
      COMPREHENSION_LENSES.length,
    );
    return COMPREHENSION_LENSES.map((lens, index) => ({
      domainId: domain.domainId,
      lessonId: `${domain.domainId}-${lens.slug}`,
      titleVi: `${authoring.title}: ${lens.title}`,
      focusVi: lens.focus,
      topicIds: topicBuckets[index],
      keywordSignals: authoring.signals,
    }));
  });
  const vocabularyAssignments = classifyVocabulary(
    vocabularyBundle.draft.entries,
    lessonSpecs,
  );
  const vocabularyAssignmentById = new Map(
    vocabularyAssignments.map((assignment) => [
      assignment.vocabularyId,
      assignment,
    ]),
  );
  const characterAssignments = [];
  const characterCounts = new Map(
    lessonSpecs.map((spec) => [spec.lessonId, 0]),
  );
  const officialCharacters =
    scopeBundle.graphBundle.syllabus.inventory.recognitionCharacters
      .filter((item) => item.level === 4);
  for (const character of officialCharacters) {
    const sourceVocabulary = vocabularyBundle.draft.entries.find(
      (entry) => entry.simplified.includes(character.character),
    );
    if (sourceVocabulary) {
      const vocabularyAssignment = vocabularyAssignmentById.get(
        sourceVocabulary.officialId,
      );
      characterCounts.set(
        vocabularyAssignment.lessonId,
        characterCounts.get(vocabularyAssignment.lessonId) + 1,
      );
      characterAssignments.push({
        characterId: character.id,
        character: character.character,
        lessonId: vocabularyAssignment.lessonId,
        method: "incremental-vocabulary-context",
        sourceVocabularyId: sourceVocabulary.officialId,
      });
      continue;
    }
    const spec = [...lessonSpecs].sort((left, right) =>
      characterCounts.get(left.lessonId)
        - characterCounts.get(right.lessonId)
      || left.lessonId.localeCompare(right.lessonId)
    )[0];
    characterCounts.set(
      spec.lessonId,
      characterCounts.get(spec.lessonId) + 1,
    );
    characterAssignments.push({
      characterId: character.id,
      character: character.character,
      lessonId: spec.lessonId,
      method: "no-incremental-vocabulary-context",
      sourceVocabularyId: null,
    });
  }
  const unit = scopeBundle.scope.unitScopes.find(
    (candidate) => candidate.unitId === "hsk4-deep-comprehension",
  );
  const lessons = lessonSpecs.map((spec) => {
    const assignedVocabulary = vocabularyAssignments.filter(
      (assignment) => assignment.lessonId === spec.lessonId,
    );
    return {
      lessonId: spec.lessonId,
      unitId: unit.unitId,
      trackId: spec.domainId,
      blueprintKind: "deep-comprehension",
      titleVi: spec.titleVi,
      objectiveVi:
        `Đọc hoặc nghe văn bản HSK4 nhiều đoạn để ${spec.focusVi}; dẫn dòng nguồn cho mọi kết luận và chưa chấm mastery trước review.`,
      inventoryMappings: {
        taskIds: [],
        topicIds: spec.topicIds,
        vocabularyIds: assignedVocabulary.map(
          (assignment) => assignment.vocabularyId,
        ),
        grammarRowIds: [],
        recognitionCharacterIds: characterAssignments
          .filter((assignment) => assignment.lessonId === spec.lessonId)
          .map((assignment) => assignment.characterId),
      },
      classification: {
        keywordSignals: spec.keywordSignals,
        semanticMatchCount: assignedVocabulary.filter(
          (assignment) =>
            assignment.method === "source-sense-keyword-match",
        ).length,
        foundationFallbackCount: assignedVocabulary.filter(
          (assignment) =>
            assignment.method === "cross-domain-foundation-fallback",
        ).length,
        semanticClaimsReviewed: false,
      },
      requiredPracticeKinds: [
        "long-form-reading",
        "long-form-listening-note-map",
        "claim-evidence-inference-check",
      ],
      audioRequirement: "reviewed-human-or-licensed-before-release",
      evidenceMode: unit.exitEvidence.mode,
      evidenceSkills: unit.exitEvidence.skills,
      timedEvidenceRequired: false,
    };
  });
  return { lessons, vocabularyAssignments, characterAssignments };
};

const taskDomainIds = (scope, taskIds) => scope.discourseDomains
  .filter((domain) => taskIds.some((taskId) => domain.taskIds.includes(taskId)))
  .map((domain) => domain.domainId);

const makeArgumentLessons = (scopeBundle) => {
  const unit = scopeBundle.scope.unitScopes.find(
    (candidate) => candidate.unitId === "hsk4-summary-argument",
  );
  const allTaskBuckets = splitEvenly(
    unit.taskIds,
    unit.plannedLessonBlueprints,
  );
  let taskOffset = 0;
  return unit.grammarModules.flatMap((module) => {
    const lessonCount = ARGUMENT_LESSON_COUNTS[module.moduleId];
    if (!lessonCount) throw new Error(`Missing count for ${module.moduleId}`);
    const grammarBuckets = splitEvenly(module.grammarRowIds, lessonCount);
    return Array.from({ length: lessonCount }, (_, index) => {
      const taskIds = allTaskBuckets[taskOffset];
      taskOffset += 1;
      const title = ARGUMENT_LENSES[index];
      return {
        lessonId:
          `${module.moduleId}-lesson-${String(index + 1).padStart(2, "0")}`,
        unitId: unit.unitId,
        trackId: module.moduleId,
        blueprintKind: "summary-argument",
        titleVi: `${title}: ${module.focus}`,
        objectiveVi:
          `Vận dụng ${title.toLocaleLowerCase("vi")} để paraphrase và lập luận HSK4 có dẫn chứng, phản biện cùng giới hạn; rubric vẫn chờ human review.`,
        inventoryMappings: {
          taskIds,
          topicIds: [],
          vocabularyIds: [],
          grammarRowIds: grammarBuckets[index],
          recognitionCharacterIds: [],
        },
        contextDomainIds: taskDomainIds(scopeBundle.scope, taskIds),
        requiredPracticeKinds: [
          "source-bounded-paraphrase",
          "structured-summary",
          "claim-evidence-counterargument",
        ],
        audioRequirement: "reviewed-human-or-licensed-before-release",
        evidenceMode: unit.exitEvidence.mode,
        evidenceSkills: unit.exitEvidence.skills,
        timedEvidenceRequired: false,
      };
    });
  });
};

const makeIntegrationLessons = (scopeBundle) => {
  const unit = scopeBundle.scope.unitScopes.find(
    (candidate) => candidate.unitId === "hsk4-timed-integration",
  );
  const domainIds = scopeBundle.scope.discourseDomains.map(
    (domain) => domain.domainId,
  );
  let domainOffset = 0;
  return unit.integrationStages.flatMap((stage) => {
    const titles = INTEGRATION_TITLES[stage.stageId];
    if (!titles) throw new Error(`Missing titles for ${stage.stageId}`);
    const promptBuckets = splitEvenly(
      Array.from(
        { length: stage.minimumPromptUnits },
        (_, index) => index + 1,
      ),
      titles.length,
    );
    return titles.map((titleVi, index) => {
      const contextDomainIds = [
        domainIds[domainOffset % domainIds.length],
        domainIds[(domainOffset + 1) % domainIds.length],
      ];
      domainOffset += 1;
      return {
        lessonId:
          `${stage.stageId}-lesson-${String(index + 1).padStart(2, "0")}`,
        unitId: unit.unitId,
        trackId: stage.stageId,
        blueprintKind: "timed-integration",
        titleVi,
        objectiveVi:
          `Hoàn thành ${titleVi.toLocaleLowerCase("vi")} theo luồng HSK4 tích hợp; thời gian, form và rubric chỉ có hiệu lực sau review và calibration.`,
        inventoryMappings: {
          taskIds: [],
          topicIds: [],
          vocabularyIds: [],
          grammarRowIds: [],
          recognitionCharacterIds: [],
        },
        promptPlan: {
          mode: stage.mode,
          minimumPromptUnits: promptBuckets[index].length,
          contextDomainIds,
          timed: stage.timed,
          authoredPromptCount: 0,
        },
        requiredPracticeKinds: [
          stage.mode,
          "source-evidence-check",
          stage.timed ? "timed-rehearsal" : "guided-integration",
        ],
        audioRequirement: stage.skills.includes("listening")
          ? "reviewed-human-or-licensed-before-release"
          : "not-required-for-blueprint",
        evidenceMode: unit.exitEvidence.mode,
        evidenceSkills: stage.skills,
        timedEvidenceRequired: stage.timed,
      };
    });
  });
};

export const buildHsk4LessonBlueprints = (root = process.cwd()) => {
  const scopeBundle = loadHsk4CurriculumScopeBundle(root);
  const scopeResult = assertValidHsk4CurriculumScopeBundle(scopeBundle);
  const vocabularyBundle = loadHsk4VocabularyDraftBundle(root);
  assertValidHsk4VocabularyDraftBundle(vocabularyBundle);
  const comprehension = makeComprehensionLessons(
    scopeBundle,
    vocabularyBundle,
  );
  const rawLessons = [
    ...comprehension.lessons,
    ...makeArgumentLessons(scopeBundle),
    ...makeIntegrationLessons(scopeBundle),
  ];
  if (rawLessons.length !== scopeResult.summary.plannedLessonBlueprints) {
    throw new Error("Generated HSK4 lesson count does not match the scope");
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
      timedEvidenceRequired: lesson.timedEvidenceRequired,
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
    timedEvidenceRequired: undefined,
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
  const semanticMatches = comprehension.vocabularyAssignments.filter(
    (assignment) => assignment.method === "source-sense-keyword-match",
  ).length;
  const contextualCharacters = comprehension.characterAssignments.filter(
    (assignment) =>
      assignment.method === "incremental-vocabulary-context",
  ).length;
  const counts = {
    lessons: lessons.length,
    deepComprehensionLessons: comprehension.lessons.length,
    summaryArgumentLessons: lessons.filter(
      (lesson) => lesson.blueprintKind === "summary-argument",
    ).length,
    timedIntegrationLessons: lessons.filter(
      (lesson) => lesson.blueprintKind === "timed-integration",
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
    sourceSenseKeywordMatches: semanticMatches,
    foundationFallbackVocabulary:
      comprehension.vocabularyAssignments.length - semanticMatches,
    charactersWithIncrementalVocabularyContext: contextualCharacters,
    charactersWithoutIncrementalVocabularyContext:
      comprehension.characterAssignments.length - contextualCharacters,
    timedLessonBlueprints: lessons.filter(
      (lesson) => lesson.promptPlan?.timed === true,
    ).length,
    plannedMinimumPromptUnits: lessons.reduce(
      (total, lesson) =>
        total + (lesson.promptPlan?.minimumPromptUnits ?? 0),
      0,
    ),
    authoredPracticeItems: 0,
    authoredAssessmentPrompts: 0,
    reviewBatches: reviewBatches.length,
    approvals: 0,
    releaseEligibleLessons: 0,
  };
  return {
    schemaVersion: 1,
    packId: "hsk4-lesson-blueprints-2026.07",
    level: 4,
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
    classificationPolicy: {
      method:
        "source-sense-keyword-score-with-declared-foundation-fallback",
      sourceFields: ["simplified", "sourceMatches.senses"],
      tieBreak: "score-then-least-populated-then-spec-order",
      fallback: "least-populated-lesson-then-lesson-id",
      fallbackClaimsSemanticMatch: false,
      sourceCoverageGapClaimsSemanticMatch: false,
      humanSemanticReviewRequired: true,
    },
    releasePolicy: {
      linguisticReviewRequired: true,
      vietnameseEditorialReviewRequired: true,
      assessmentReviewRequired: true,
      reviewedAudioRequiredWhereDeclared: true,
      confidentialFormsRequiredForTimedRelease: true,
      calibrationRequiredForMockScoring: true,
      practiceRequiredForRelease: true,
      blueprintGrantsMastery: false,
    },
    counts,
    coverageClaims: {
      officialInventoryBlueprintMapped: true,
      lessonBlueprintCoverageComplete: true,
      authoredPracticeCoverageComplete: false,
      reviewedContentComplete: false,
      calibratedMockComplete: false,
      hsk4Complete: false,
    },
    vocabularyAssignments: comprehension.vocabularyAssignments,
    characterAssignments: comprehension.characterAssignments,
    lessons,
    reviewBatches,
  };
};

export const serializeHsk4LessonBlueprints = (pack) =>
  `${JSON.stringify(pack)}\n`;

const main = () => {
  const outputPath = resolve(
    process.cwd(),
    HSK4_LESSON_BLUEPRINTS_RELATIVE_PATH,
  );
  const serialized = serializeHsk4LessonBlueprints(
    buildHsk4LessonBlueprints(),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK4 lesson-blueprint pack is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK4_LESSON_BLUEPRINTS_RELATIVE_PATH,
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
