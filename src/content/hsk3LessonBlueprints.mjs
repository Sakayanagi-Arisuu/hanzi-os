import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk3CurriculumScopeBundle,
  loadHsk3CurriculumScopeBundle,
} from "./hsk3CurriculumScope.mjs";
import {
  assertValidHsk3VocabularyDraftBundle,
  loadHsk3VocabularyDraftBundle,
} from "./hsk3VocabularyDraft.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK3_LESSON_BLUEPRINTS_RELATIVE_PATH =
  "content/drafts/hsk3-lesson-blueprints-2026.07.json";

const EXPECTED_TRACK_LESSON_COUNTS = {
  "hsk3-personal-life-narratives": 5,
  "hsk3-study-work-accounts": 5,
  "hsk3-nature-environment-explanations": 5,
  "hsk3-society-arts-sports-reports": 5,
  "hsk3-culture-tradition-descriptions": 5,
  "hsk3-reference-quantity-phrase-building": 3,
  "hsk3-modality-time-viewpoint-framing": 3,
  "hsk3-event-complements-voice": 3,
  "hsk3-comparison-description-evaluation": 3,
  "hsk3-discourse-linking": 3,
  "hsk3-main-idea-detail-notes": 3,
  "hsk3-cohesion-reconstruction": 3,
  "hsk3-event-retelling": 3,
  "hsk3-guided-paragraph": 3,
  "hsk3-structured-explanation": 3,
};

const MAPPING_FIELDS = [
  "taskIds",
  "topicIds",
  "vocabularyIds",
  "grammarRowIds",
  "recognitionCharacterIds",
];
const REQUIRED_REVIEW_ROLES = [
  "native-mandarin-curriculum-reviewer",
  "vietnamese-editor",
  "assessment-editor",
];

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);
const exactSet = (left, right) =>
  JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
const duplicates = (values) => {
  const seen = new Set();
  const repeated = new Set();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
};
const validText = (value, minimum = 1, maximum = 500) =>
  typeof value === "string"
  && value.length >= minimum
  && value.length <= maximum;

export const loadHsk3LessonBlueprintsBundle = (root = process.cwd()) => {
  const scopeBundle = loadHsk3CurriculumScopeBundle(root);
  const vocabularyBundle = loadHsk3VocabularyDraftBundle(root);
  const packPath = join(root, HSK3_LESSON_BLUEPRINTS_RELATIVE_PATH);
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
  if (duplicates(actual).length > 0 || !exactSet(actual, expected)) {
    errors.push(`${label} must exactly partition its HSK3 scope`);
  }
};

export const validateHsk3LessonBlueprintsBundle = ({
  scopeBundle,
  vocabularyBundle,
  pack,
}) => {
  const errors = [];
  try {
    assertValidHsk3CurriculumScopeBundle(scopeBundle);
    assertValidHsk3VocabularyDraftBundle(vocabularyBundle);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (!isRecord(pack) || pack.schemaVersion !== 1) {
    return {
      valid: false,
      errors: ["HSK3 lesson-blueprint pack schemaVersion must be 1"],
    };
  }
  if (
    pack.packId !== "hsk3-lesson-blueprints-2026.07"
    || pack.level !== 3
    || pack.state !== "ai-assisted-blueprint-draft"
    || pack.learnerVisible !== false
    || pack.releaseEligible !== false
  ) {
    errors.push("HSK3 lesson blueprints must remain learner-hidden drafts");
  }
  if (
    pack.derivedArtifactLicense !== "CC-BY-SA-4.0"
    || pack.source?.scopeId !== scopeBundle.scope.scopeId
    || pack.source?.scopeSha256 !== fileSha256(scopeBundle.scopePath)
    || pack.source?.vocabularyDraftId !== vocabularyBundle.draft.draftId
    || pack.source?.vocabularyDraftSha256
      !== fileSha256(vocabularyBundle.draftPath)
  ) {
    errors.push("HSK3 lesson-blueprint source or license binding is stale");
  }
  if (
    pack.authorship?.method !== "ai-assisted-curriculum-blueprint"
    || pack.authorship?.nativeMandarinReviewer !== null
    || pack.authorship?.vietnameseEditor !== null
    || pack.authorship?.assessmentEditor !== null
  ) {
    errors.push("HSK3 lesson-blueprint authorship must not imply human review");
  }
  if (
    pack.releasePolicy?.linguisticReviewRequired !== true
    || pack.releasePolicy?.vietnameseEditorialReviewRequired !== true
    || pack.releasePolicy?.assessmentReviewRequired !== true
    || pack.releasePolicy?.reviewedAudioRequiredWhereDeclared !== true
    || pack.releasePolicy?.practiceRequiredForRelease !== true
    || pack.releasePolicy?.blueprintGrantsMastery !== false
  ) {
    errors.push("HSK3 lesson-blueprint release policy must remain fail-closed");
  }
  if (
    pack.coverageClaims?.officialInventoryBlueprintMapped !== true
    || pack.coverageClaims?.lessonBlueprintCoverageComplete !== true
    || pack.coverageClaims?.authoredPracticeCoverageComplete !== false
    || pack.coverageClaims?.reviewedContentComplete !== false
    || pack.coverageClaims?.hsk3Complete !== false
  ) {
    errors.push("HSK3 lesson-blueprint coverage claims are invalid");
  }
  if (
    pack.classificationPolicy?.method
      !== "source-sense-keyword-score-with-declared-foundation-fallback"
    || pack.classificationPolicy?.fallbackClaimsSemanticMatch !== false
    || pack.classificationPolicy?.humanSemanticReviewRequired !== true
  ) {
    errors.push("HSK3 vocabulary classification policy is invalid");
  }

  const lessons = Array.isArray(pack.lessons) ? pack.lessons : [];
  const lessonIds = lessons.map((lesson) => lesson.lessonId);
  if (lessons.length !== 55 || duplicates(lessonIds).length > 0) {
    errors.push("HSK3 lesson-blueprint pack must contain 55 unique lessons");
  }
  const unitById = new Map(
    scopeBundle.scope.unitScopes.map((unit) => [unit.unitId, unit]),
  );
  const trackById = new Map();
  for (const domain of scopeBundle.scope.discourseDomains) {
    trackById.set(domain.domainId, {
      ...domain,
      unitId: "hsk3-paragraph-input",
    });
  }
  const narration = unitById.get("hsk3-narration");
  for (const module of narration?.grammarModules ?? []) {
    trackById.set(module.moduleId, {
      ...module,
      unitId: "hsk3-narration",
    });
  }
  const production = unitById.get("hsk3-guided-production");
  for (const stage of production?.productionStages ?? []) {
    trackById.set(stage.stageId, {
      ...stage,
      unitId: "hsk3-guided-production",
    });
  }

  for (const [index, lesson] of lessons.entries()) {
    const unit = unitById.get(lesson.unitId);
    const track = trackById.get(lesson.trackId);
    const expectedPrerequisites = index === 0 ? [] : [lessonIds[index - 1]];
    if (
      !validText(lesson.lessonId, 10, 180)
      || lesson.sequence !== index + 1
      || !exact(lesson.prerequisiteLessonIds, expectedPrerequisites)
      || !validText(lesson.titleVi, 5, 140)
      || !validText(lesson.objectiveVi, 40, 500)
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
    if (
      !isRecord(mappings)
      || MAPPING_FIELDS.some((field) => !Array.isArray(mappings[field]))
    ) {
      errors.push(`${lesson.lessonId} inventory mappings are invalid`);
      continue;
    }
    const kindContract = {
      "paragraph-input": {
        unitId: "hsk3-paragraph-input",
        active: ["vocabularyIds"],
        inactive: ["taskIds", "grammarRowIds"],
      },
      "narration-grammar": {
        unitId: "hsk3-narration",
        active: ["taskIds", "grammarRowIds"],
        inactive: [
          "topicIds",
          "vocabularyIds",
          "recognitionCharacterIds",
        ],
      },
      "guided-production": {
        unitId: "hsk3-guided-production",
        active: [],
        inactive: MAPPING_FIELDS,
      },
    }[lesson.blueprintKind];
    if (
      !kindContract
      || lesson.unitId !== kindContract.unitId
      || kindContract.active.some(
        (field) => mappings[field].length < 1,
      )
      || kindContract.inactive.some(
        (field) => mappings[field].length !== 0,
      )
    ) {
      errors.push(`${lesson.lessonId} kind and inventory mapping disagree`);
    }
    if (lesson.blueprintKind === "paragraph-input") {
      if (
        !mappings.topicIds.every((id) => track.topicIds.includes(id))
        || !Array.isArray(lesson.classification?.keywordSignals)
        || lesson.classification.keywordSignals.length < 2
        || !Number.isInteger(lesson.classification.semanticMatchCount)
        || !Number.isInteger(lesson.classification.foundationFallbackCount)
        || lesson.classification.semanticMatchCount
          + lesson.classification.foundationFallbackCount
          !== mappings.vocabularyIds.length
      ) {
        errors.push(`${lesson.lessonId} semantic classification is invalid`);
      }
    }
    if (
      lesson.blueprintKind === "narration-grammar"
      && !mappings.grammarRowIds.every(
        (id) => track.grammarRowIds.includes(id),
      )
    ) {
      errors.push(`${lesson.lessonId} maps grammar outside ${lesson.trackId}`);
    }
    if (
      lesson.blueprintKind === "guided-production"
      && (
        !Number.isInteger(lesson.promptPlan?.minimumPromptUnits)
        || lesson.promptPlan.minimumPromptUnits < 4
        || !Array.isArray(lesson.promptPlan.contextDomainIds)
        || lesson.promptPlan.contextDomainIds.length < 1
      )
    ) {
      errors.push(`${lesson.lessonId} production prompt plan is invalid`);
    }
    if (
      lesson.practicePlan?.state !== "planned"
      || !Array.isArray(lesson.practicePlan?.requiredKinds)
      || lesson.practicePlan.requiredKinds.length < 2
      || duplicates(lesson.practicePlan.requiredKinds).length > 0
      || lesson.practicePlan.authoredItemCount !== 0
      || lesson.practicePlan.measurementEligible !== false
      || lesson.practicePlan.masteryEligible !== false
    ) {
      errors.push(`${lesson.lessonId} practice plan must remain unauthored`);
    }
    if (
      !isRecord(lesson.assessmentPlan)
      || !validText(lesson.assessmentPlan.evidenceMode, 10, 120)
      || !Array.isArray(lesson.assessmentPlan.skills)
      || lesson.assessmentPlan.skills.length < 2
      || lesson.assessmentPlan.reviewedRubricRequired !== true
      || lesson.assessmentPlan.rubric !== null
      || lesson.assessmentPlan.authoredPromptCount !== 0
    ) {
      errors.push(`${lesson.lessonId} assessment plan must remain unscored`);
    }
    if (
      ![
        "reviewed-human-or-licensed-before-release",
        "not-required-for-blueprint",
      ].includes(lesson.audioRequirement)
    ) {
      errors.push(`${lesson.lessonId} audio requirement is invalid`);
    }
  }

  for (const [trackId, expectedCount] of Object.entries(
    EXPECTED_TRACK_LESSON_COUNTS,
  )) {
    if (
      lessons.filter((lesson) => lesson.trackId === trackId).length
      !== expectedCount
    ) {
      errors.push(`${trackId} must contain exactly ${expectedCount} lessons`);
    }
  }
  const allScopes = scopeBundle.scope.unitScopes;
  for (const [field, label] of [
    ["taskIds", "lesson task mappings"],
    ["topicIds", "lesson topic mappings"],
    ["vocabularyIds", "lesson vocabulary mappings"],
    ["grammarRowIds", "lesson grammar mappings"],
    ["recognitionCharacterIds", "lesson recognition-character mappings"],
  ]) {
    validateExactPartition({
      errors,
      label,
      actual: lessons.flatMap(
        (lesson) => lesson.inventoryMappings?.[field] ?? [],
      ),
      expected: allScopes.flatMap((unit) => unit[field]),
    });
  }

  const vocabularyAssignments = Array.isArray(pack.vocabularyAssignments)
    ? pack.vocabularyAssignments
    : [];
  const paragraphLessons = lessons.filter(
    (lesson) => lesson.blueprintKind === "paragraph-input",
  );
  if (
    vocabularyAssignments.length !== 500
    || duplicates(
      vocabularyAssignments.map((assignment) => assignment.vocabularyId),
    ).length > 0
    || !exactSet(
      vocabularyAssignments.map((assignment) => assignment.vocabularyId),
      vocabularyBundle.draft.entries.map((entry) => entry.officialId),
    )
  ) {
    errors.push("HSK3 vocabulary assignments must cover all 500 entries");
  }
  for (const assignment of vocabularyAssignments) {
    const lesson = paragraphLessons.find(
      (candidate) => candidate.lessonId === assignment.lessonId,
    );
    if (
      !lesson
      || !lesson.inventoryMappings.vocabularyIds.includes(
        assignment.vocabularyId,
      )
      || !["source-sense-keyword-match", "cross-domain-foundation-fallback"]
        .includes(assignment.method)
      || (assignment.method === "source-sense-keyword-match"
        && (
          !Number.isInteger(assignment.score)
          || assignment.score < 1
          || !validText(assignment.matchedSignal, 1, 80)
        ))
      || (assignment.method === "cross-domain-foundation-fallback"
        && (
          assignment.score !== 0
          || assignment.matchedSignal !== null
        ))
    ) {
      errors.push(
        `${assignment.vocabularyId ?? "unknown"} vocabulary assignment is invalid`,
      );
    }
  }

  const characterAssignments = Array.isArray(pack.characterAssignments)
    ? pack.characterAssignments
    : [];
  if (
    characterAssignments.length !== 284
    || duplicates(
      characterAssignments.map((assignment) => assignment.characterId),
    ).length > 0
  ) {
    errors.push("HSK3 character assignments must cover all 284 entries");
  }
  for (const assignment of characterAssignments) {
    const lesson = paragraphLessons.find(
      (candidate) => candidate.lessonId === assignment.lessonId,
    );
    const methodIsValid =
      assignment.method === "incremental-vocabulary-context"
        ? vocabularyAssignments.some(
          (vocabularyAssignment) =>
            vocabularyAssignment.vocabularyId
              === assignment.sourceVocabularyId
            && vocabularyAssignment.lessonId === assignment.lessonId,
        )
        : assignment.method === "no-incremental-vocabulary-context"
          && assignment.sourceVocabularyId === null;
    if (
      !lesson
      || !lesson.inventoryMappings.recognitionCharacterIds.includes(
        assignment.characterId,
      )
      || !methodIsValid
    ) {
      errors.push(
        `${assignment.characterId ?? "unknown"} character assignment is invalid`,
      );
    }
  }

  const reviewBatches = Array.isArray(pack.reviewBatches)
    ? pack.reviewBatches
    : [];
  if (
    reviewBatches.length !== 55
    || duplicates(reviewBatches.map((batch) => batch.batchId)).length > 0
    || !exactSet(
      reviewBatches.flatMap((batch) => batch.targetLessonIds ?? []),
      lessonIds,
    )
  ) {
    errors.push("HSK3 blueprint review batches must cover every lesson");
  }
  for (const batch of reviewBatches) {
    if (
      batch.lessonId !== batch.targetLessonIds?.[0]
      || !lessonIds.includes(batch.lessonId)
      || !exact(batch.requiredRoles, REQUIRED_REVIEW_ROLES)
      || batch.state !== "pending"
      || !exact(batch.approvals, [])
    ) {
      errors.push(`${batch.batchId} review batch is invalid`);
    }
  }

  const expectedCounts = {
    lessons: lessons.length,
    paragraphInputLessons: paragraphLessons.length,
    narrationGrammarLessons: lessons.filter(
      (lesson) => lesson.blueprintKind === "narration-grammar",
    ).length,
    guidedProductionLessons: lessons.filter(
      (lesson) => lesson.blueprintKind === "guided-production",
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
    sourceSenseKeywordMatches: vocabularyAssignments.filter(
      (assignment) => assignment.method === "source-sense-keyword-match",
    ).length,
    foundationFallbackVocabulary: vocabularyAssignments.filter(
      (assignment) =>
        assignment.method === "cross-domain-foundation-fallback",
    ).length,
    charactersWithIncrementalVocabularyContext: characterAssignments.filter(
      (assignment) =>
        assignment.method === "incremental-vocabulary-context",
    ).length,
    charactersWithoutIncrementalVocabularyContext:
      characterAssignments.filter(
        (assignment) =>
          assignment.method === "no-incremental-vocabulary-context",
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
  if (!exact(pack.counts, expectedCounts)) {
    errors.push("HSK3 lesson-blueprint summary counts are stale");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expectedCounts,
  };
};

export const assertValidHsk3LessonBlueprintsBundle = (bundle) => {
  const result = validateHsk3LessonBlueprintsBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK3 lesson blueprints:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
