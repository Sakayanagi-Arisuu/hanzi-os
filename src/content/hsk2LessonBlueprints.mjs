import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk2CurriculumScopeBundle,
  loadHsk2CurriculumScopeBundle,
} from "./hsk2CurriculumScope.mjs";
import {
  assertValidHsk2VocabularyDraftBundle,
  loadHsk2VocabularyDraftBundle,
} from "./hsk2VocabularyDraft.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK2_LESSON_BLUEPRINTS_RELATIVE_PATH =
  "content/drafts/hsk2-lesson-blueprints-2026.07.json";

const EXPECTED_TRACK_LESSON_COUNTS = {
  "hsk2-person-events-environment": 5,
  "hsk2-daily-needs-family": 5,
  "hsk2-travel-leisure": 5,
  "hsk2-study-work-culture": 5,
  "hsk2-reference-description-comparison": 4,
  "hsk2-aspect-time-experience": 2,
  "hsk2-complements-and-motion": 2,
  "hsk2-clause-linking": 2,
  "hsk2-dictation": 3,
  "hsk2-sentence-reconstruction": 3,
  "hsk2-guided-message": 2,
  "hsk2-picture-description": 2,
};

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactArray = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);
const exactSet = (left, right) =>
  JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
const duplicateValues = (values) => {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
};
const validText = (value, minimum = 1, maximum = 500) =>
  typeof value === "string"
  && value.length >= minimum
  && value.length <= maximum;

export const loadHsk2LessonBlueprintsBundle = (root = process.cwd()) => {
  const scopeBundle = loadHsk2CurriculumScopeBundle(root);
  const vocabularyBundle = loadHsk2VocabularyDraftBundle(root);
  const packPath = join(root, HSK2_LESSON_BLUEPRINTS_RELATIVE_PATH);
  return {
    scopeBundle,
    vocabularyBundle,
    packPath,
    pack: JSON.parse(readFileSync(packPath, "utf8")),
  };
};

const validateExactPartition = ({
  errors,
  label,
  actual,
  expected,
}) => {
  if (duplicateValues(actual).length > 0 || !exactSet(actual, expected)) {
    errors.push(`${label} must exactly partition its HSK2 scope`);
  }
};

export const validateHsk2LessonBlueprintsBundle = ({
  scopeBundle,
  vocabularyBundle,
  pack,
}) => {
  const errors = [];
  try {
    assertValidHsk2CurriculumScopeBundle(scopeBundle);
    assertValidHsk2VocabularyDraftBundle(vocabularyBundle);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (!isRecord(pack) || pack.schemaVersion !== 1) {
    return {
      valid: false,
      errors: ["HSK2 lesson-blueprint pack schemaVersion must be 1"],
    };
  }
  if (
    pack.packId !== "hsk2-lesson-blueprints-2026.07"
    || pack.level !== 2
    || pack.state !== "ai-assisted-blueprint-draft"
    || pack.learnerVisible !== false
    || pack.releaseEligible !== false
  ) {
    errors.push("HSK2 lesson blueprints must remain learner-hidden drafts");
  }
  if (
    pack.derivedArtifactLicense !== "CC-BY-SA-4.0"
    || pack.source?.scopeId !== scopeBundle.scope.scopeId
    || pack.source?.scopeSha256 !== fileSha256(scopeBundle.scopePath)
    || pack.source?.vocabularyDraftId !== vocabularyBundle.draft.draftId
    || pack.source?.vocabularyDraftSha256 !== fileSha256(
      vocabularyBundle.draftPath,
    )
  ) {
    errors.push("HSK2 lesson-blueprint source or license binding is stale");
  }
  if (
    pack.authorship?.method !== "ai-assisted-curriculum-blueprint"
    || pack.authorship?.nativeMandarinReviewer !== null
    || pack.authorship?.vietnameseEditor !== null
    || pack.authorship?.assessmentEditor !== null
  ) {
    errors.push("HSK2 lesson-blueprint authorship must not imply human review");
  }
  if (
    pack.releasePolicy?.linguisticReviewRequired !== true
    || pack.releasePolicy?.vietnameseEditorialReviewRequired !== true
    || pack.releasePolicy?.assessmentReviewRequired !== true
    || pack.releasePolicy?.reviewedAudioRequiredWhereDeclared !== true
    || pack.releasePolicy?.practiceRequiredForRelease !== true
    || pack.releasePolicy?.blueprintGrantsMastery !== false
  ) {
    errors.push("HSK2 lesson-blueprint release policy must remain fail-closed");
  }
  if (
    pack.coverageClaims?.officialInventoryBlueprintMapped !== true
    || pack.coverageClaims?.lessonBlueprintCoverageComplete !== true
    || pack.coverageClaims?.authoredPracticeCoverageComplete !== false
    || pack.coverageClaims?.reviewedContentComplete !== false
    || pack.coverageClaims?.hsk2Complete !== false
  ) {
    errors.push("HSK2 lesson-blueprint coverage claims are invalid");
  }

  const unitById = new Map(
    scopeBundle.scope.unitScopes.map((unit) => [unit.unitId, unit]),
  );
  const trackById = new Map();
  for (const unit of scopeBundle.scope.unitScopes) {
    for (const strand of unit.strands ?? []) {
      trackById.set(strand.strandId, { ...strand, unitId: unit.unitId });
    }
    for (const module of unit.grammarModules ?? []) {
      trackById.set(module.moduleId, { ...module, unitId: unit.unitId });
    }
    for (const stage of unit.productionStages ?? []) {
      trackById.set(stage.stageId, { ...stage, unitId: unit.unitId });
    }
  }
  const lessons = Array.isArray(pack.lessons) ? pack.lessons : [];
  if (lessons.length !== 40) {
    errors.push("HSK2 lesson-blueprint pack must contain exactly 40 lessons");
  }
  const lessonIds = lessons.map((lesson) => lesson.lessonId);
  if (duplicateValues(lessonIds).length > 0) {
    errors.push("HSK2 lesson blueprint IDs must be unique");
  }
  for (const [index, lesson] of lessons.entries()) {
    const unit = unitById.get(lesson.unitId);
    const track = trackById.get(lesson.trackId);
    const expectedPrerequisites = index === 0 ? [] : [lessonIds[index - 1]];
    if (
      !validText(lesson.lessonId, 10, 160)
      || lesson.sequence !== index + 1
      || !exactArray(lesson.prerequisiteLessonIds, expectedPrerequisites)
      || !validText(lesson.titleVi, 5, 120)
      || !validText(lesson.objectiveVi, 40, 400)
      || !unit
      || !track
      || track.unitId !== lesson.unitId
      || lesson.review !== "pending"
      || lesson.releaseEligible !== false
    ) {
      errors.push(
        `${lesson.lessonId ?? `lesson-${index + 1}`} contract is invalid`,
      );
      continue;
    }
    const mappings = lesson.inventoryMappings;
    const mappingFields = [
      "taskIds",
      "topicIds",
      "vocabularyIds",
      "grammarRowIds",
      "recognitionCharacterIds",
    ];
    if (
      !isRecord(mappings)
      || mappingFields.some((field) => !Array.isArray(mappings[field]))
      || duplicateValues(mappingFields.flatMap(
        (field) => mappings[field] ?? [],
      )).length > 0
    ) {
      errors.push(`${lesson.lessonId} inventory mappings are invalid`);
      continue;
    }
    const kindContract = {
      "situational-dialogue": {
        unitId: "hsk2-situational-dialogue",
        active: ["taskIds", "topicIds", "vocabularyIds"],
        inactive: ["grammarRowIds", "recognitionCharacterIds"],
      },
      "sentence-chain": {
        unitId: "hsk2-sentence-chains",
        active: ["grammarRowIds"],
        inactive: [
          "taskIds",
          "topicIds",
          "vocabularyIds",
          "recognitionCharacterIds",
        ],
      },
      "short-text-production": {
        unitId: "hsk2-short-text-production",
        active: ["recognitionCharacterIds"],
        inactive: [
          "taskIds",
          "topicIds",
          "vocabularyIds",
          "grammarRowIds",
        ],
      },
    }[lesson.blueprintKind];
    if (
      !kindContract
      || lesson.unitId !== kindContract.unitId
      || kindContract.active.some(
        (field) => mappings[field].length < 1
          && !(lesson.blueprintKind === "situational-dialogue"
            && ["taskIds", "topicIds"].includes(field)),
      )
      || kindContract.inactive.some((field) => mappings[field].length !== 0)
    ) {
      errors.push(`${lesson.lessonId} kind and inventory mapping disagree`);
    }
    if (lesson.blueprintKind === "situational-dialogue") {
      for (const field of ["taskIds", "topicIds", "vocabularyIds"]) {
        if (!mappings[field].every((id) => track[field].includes(id))) {
          errors.push(`${lesson.lessonId} maps outside ${lesson.trackId}`);
        }
      }
    }
    if (
      lesson.blueprintKind === "sentence-chain"
      && !mappings.grammarRowIds.every(
        (id) => track.grammarRowIds.includes(id),
      )
    ) {
      errors.push(`${lesson.lessonId} maps outside ${lesson.trackId}`);
    }
    if (
      lesson.practicePlan?.state !== "planned"
      || !Array.isArray(lesson.practicePlan?.requiredKinds)
      || lesson.practicePlan.requiredKinds.length < 2
      || duplicateValues(lesson.practicePlan.requiredKinds).length > 0
      || lesson.practicePlan.authoredItemCount !== 0
      || lesson.practicePlan.measurementEligible !== false
      || lesson.practicePlan.masteryEligible !== false
    ) {
      errors.push(`${lesson.lessonId} practice plan must remain unauthored`);
    }
    if (
      !isRecord(lesson.assessmentPlan)
      || !validText(lesson.assessmentPlan.evidenceMode, 10, 100)
      || !Array.isArray(lesson.assessmentPlan.skills)
      || lesson.assessmentPlan.skills.length < 2
      || lesson.assessmentPlan.reviewedRubricRequired !== true
      || lesson.assessmentPlan.rubric !== null
      || lesson.assessmentPlan.authoredPromptCount !== 0
    ) {
      errors.push(`${lesson.lessonId} assessment plan must remain unscored`);
    }
    if (
      !["reviewed-human-or-licensed-before-release", "not-required-for-blueprint"]
        .includes(lesson.audioRequirement)
    ) {
      errors.push(`${lesson.lessonId} audio requirement is invalid`);
    }
  }

  for (const [trackId, expectedCount] of Object.entries(
    EXPECTED_TRACK_LESSON_COUNTS,
  )) {
    if (lessons.filter((lesson) => lesson.trackId === trackId).length
      !== expectedCount) {
      errors.push(`${trackId} must contain exactly ${expectedCount} lessons`);
    }
  }
  const allScopes = scopeBundle.scope.unitScopes;
  validateExactPartition({
    errors,
    label: "lesson task mappings",
    actual: lessons.flatMap(
      (lesson) => lesson.inventoryMappings?.taskIds ?? [],
    ),
    expected: allScopes.flatMap((unit) => unit.taskIds),
  });
  validateExactPartition({
    errors,
    label: "lesson topic mappings",
    actual: lessons.flatMap(
      (lesson) => lesson.inventoryMappings?.topicIds ?? [],
    ),
    expected: allScopes.flatMap((unit) => unit.topicIds),
  });
  validateExactPartition({
    errors,
    label: "lesson vocabulary mappings",
    actual: lessons.flatMap(
      (lesson) => lesson.inventoryMappings?.vocabularyIds ?? [],
    ),
    expected: allScopes.flatMap((unit) => unit.vocabularyIds),
  });
  validateExactPartition({
    errors,
    label: "lesson grammar mappings",
    actual: lessons.flatMap(
      (lesson) => lesson.inventoryMappings?.grammarRowIds ?? [],
    ),
    expected: allScopes.flatMap((unit) => unit.grammarRowIds),
  });
  validateExactPartition({
    errors,
    label: "lesson recognition-character mappings",
    actual: lessons.flatMap(
      (lesson) => lesson.inventoryMappings?.recognitionCharacterIds ?? [],
    ),
    expected: allScopes.flatMap((unit) => unit.recognitionCharacterIds),
  });

  const reviewBatches = Array.isArray(pack.reviewBatches)
    ? pack.reviewBatches
    : [];
  if (
    reviewBatches.length !== 40
    || duplicateValues(reviewBatches.map((batch) => batch.batchId)).length > 0
    || !exactSet(
      reviewBatches.flatMap((batch) => batch.targetLessonIds ?? []),
      lessonIds,
    )
  ) {
    errors.push("HSK2 lesson blueprint review batches must cover every lesson");
  }
  for (const batch of reviewBatches) {
    if (
      batch.lessonId !== batch.targetLessonIds?.[0]
      || !lessonIds.includes(batch.lessonId)
      || !exactArray(batch.requiredRoles, [
        "native-mandarin-curriculum-reviewer",
        "vietnamese-editor",
        "assessment-editor",
      ])
      || batch.state !== "pending"
      || !exactArray(batch.approvals, [])
    ) {
      errors.push(`${batch.batchId} review batch is invalid`);
    }
  }

  const expectedCounts = {
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
      (lesson) => lesson.inventoryMappings?.taskIds ?? [],
    )).size,
    topicBlueprintMappings: new Set(lessons.flatMap(
      (lesson) => lesson.inventoryMappings?.topicIds ?? [],
    )).size,
    vocabularyBlueprintMappings: new Set(lessons.flatMap(
      (lesson) => lesson.inventoryMappings?.vocabularyIds ?? [],
    )).size,
    grammarBlueprintMappings: new Set(lessons.flatMap(
      (lesson) => lesson.inventoryMappings?.grammarRowIds ?? [],
    )).size,
    recognitionCharacterBlueprintMappings: new Set(lessons.flatMap(
      (lesson) => lesson.inventoryMappings?.recognitionCharacterIds ?? [],
    )).size,
    authoredPracticeItems: 0,
    authoredAssessmentPrompts: 0,
    reviewBatches: reviewBatches.length,
    approvals: 0,
    releaseEligibleLessons: 0,
  };
  if (!exactArray(pack.counts, expectedCounts)) {
    errors.push("HSK2 lesson-blueprint summary counts are stale");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expectedCounts,
  };
};

export const assertValidHsk2LessonBlueprintsBundle = (bundle) => {
  const result = validateHsk2LessonBlueprintsBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK2 lesson blueprints:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
