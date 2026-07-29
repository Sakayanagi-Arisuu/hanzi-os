import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk4CurriculumScopeBundle,
  loadHsk4CurriculumScopeBundle,
} from "./hsk4CurriculumScope.mjs";
import {
  assertValidHsk4VocabularyDraftBundle,
  loadHsk4VocabularyDraftBundle,
} from "./hsk4VocabularyDraft.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK4_LESSON_BLUEPRINTS_RELATIVE_PATH =
  "content/drafts/hsk4-lesson-blueprints-2026.07.json";

const EXPECTED_TRACK_LESSON_COUNTS = {
  "hsk4-personal-community-analysis": 6,
  "hsk4-education-work-evaluation": 6,
  "hsk4-nature-technology-explanation": 6,
  "hsk4-society-economy-argument": 6,
  "hsk4-arts-sports-exchange-critique": 6,
  "hsk4-culture-history-interpretation": 6,
  "hsk4-precision-reference-quantity": 6,
  "hsk4-stance-comparison-rhetoric": 5,
  "hsk4-event-agency-voice": 4,
  "hsk4-information-order-cohesion": 5,
  "hsk4-argument-logic-concession": 4,
  "hsk4-long-input-structure-map": 3,
  "hsk4-inference-evidence-check": 3,
  "hsk4-cross-text-synthesis": 3,
  "hsk4-structured-written-argument": 3,
  "hsk4-structured-spoken-defense": 3,
  "hsk4-timed-sectional-rehearsal": 3,
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

export const loadHsk4LessonBlueprintsBundle = (root = process.cwd()) => {
  const scopeBundle = loadHsk4CurriculumScopeBundle(root);
  const vocabularyBundle = loadHsk4VocabularyDraftBundle(root);
  const packPath = join(root, HSK4_LESSON_BLUEPRINTS_RELATIVE_PATH);
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
    errors.push(`${label} must exactly partition its HSK4 scope`);
  }
};

export const validateHsk4LessonBlueprintsBundle = ({
  scopeBundle,
  vocabularyBundle,
  pack,
}) => {
  const errors = [];
  try {
    assertValidHsk4CurriculumScopeBundle(scopeBundle);
    assertValidHsk4VocabularyDraftBundle(vocabularyBundle);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (!isRecord(pack) || pack.schemaVersion !== 1) {
    return {
      valid: false,
      errors: ["HSK4 lesson-blueprint pack schemaVersion must be 1"],
    };
  }
  if (
    pack.packId !== "hsk4-lesson-blueprints-2026.07"
    || pack.level !== 4
    || pack.state !== "ai-assisted-blueprint-draft"
    || pack.learnerVisible !== false
    || pack.releaseEligible !== false
  ) {
    errors.push("HSK4 lesson blueprints must remain learner-hidden drafts");
  }
  if (
    pack.derivedArtifactLicense !== "CC-BY-SA-4.0"
    || pack.source?.scopeId !== scopeBundle.scope.scopeId
    || pack.source?.scopeSha256 !== fileSha256(scopeBundle.scopePath)
    || pack.source?.vocabularyDraftId !== vocabularyBundle.draft.draftId
    || pack.source?.vocabularyDraftSha256
      !== fileSha256(vocabularyBundle.draftPath)
  ) {
    errors.push("HSK4 lesson-blueprint source or license binding is stale");
  }
  if (
    pack.authorship?.method !== "ai-assisted-curriculum-blueprint"
    || pack.authorship?.nativeMandarinReviewer !== null
    || pack.authorship?.vietnameseEditor !== null
    || pack.authorship?.assessmentEditor !== null
  ) {
    errors.push("HSK4 lesson-blueprint authorship must not imply human review");
  }
  if (
    pack.releasePolicy?.linguisticReviewRequired !== true
    || pack.releasePolicy?.vietnameseEditorialReviewRequired !== true
    || pack.releasePolicy?.assessmentReviewRequired !== true
    || pack.releasePolicy?.reviewedAudioRequiredWhereDeclared !== true
    || pack.releasePolicy?.confidentialFormsRequiredForTimedRelease !== true
    || pack.releasePolicy?.calibrationRequiredForMockScoring !== true
    || pack.releasePolicy?.practiceRequiredForRelease !== true
    || pack.releasePolicy?.blueprintGrantsMastery !== false
  ) {
    errors.push("HSK4 lesson-blueprint release policy must remain fail-closed");
  }
  if (
    pack.coverageClaims?.officialInventoryBlueprintMapped !== true
    || pack.coverageClaims?.lessonBlueprintCoverageComplete !== true
    || pack.coverageClaims?.authoredPracticeCoverageComplete !== false
    || pack.coverageClaims?.reviewedContentComplete !== false
    || pack.coverageClaims?.calibratedMockComplete !== false
    || pack.coverageClaims?.hsk4Complete !== false
  ) {
    errors.push("HSK4 lesson-blueprint coverage claims are invalid");
  }
  if (
    pack.classificationPolicy?.method
      !== "source-sense-keyword-score-with-declared-foundation-fallback"
    || pack.classificationPolicy?.fallbackClaimsSemanticMatch !== false
    || pack.classificationPolicy?.sourceCoverageGapClaimsSemanticMatch !== false
    || pack.classificationPolicy?.humanSemanticReviewRequired !== true
  ) {
    errors.push("HSK4 vocabulary classification policy is invalid");
  }

  const lessons = Array.isArray(pack.lessons) ? pack.lessons : [];
  const lessonIds = lessons.map((lesson) => lesson.lessonId);
  if (lessons.length !== 78 || duplicates(lessonIds).length > 0) {
    errors.push("HSK4 lesson-blueprint pack must contain 78 unique lessons");
  }
  const unitById = new Map(
    scopeBundle.scope.unitScopes.map((unit) => [unit.unitId, unit]),
  );
  const trackById = new Map();
  for (const domain of scopeBundle.scope.discourseDomains) {
    trackById.set(domain.domainId, {
      ...domain,
      unitId: "hsk4-deep-comprehension",
    });
  }
  const argument = unitById.get("hsk4-summary-argument");
  for (const module of argument?.grammarModules ?? []) {
    trackById.set(module.moduleId, {
      ...module,
      unitId: "hsk4-summary-argument",
    });
  }
  const timed = unitById.get("hsk4-timed-integration");
  for (const stage of timed?.integrationStages ?? []) {
    trackById.set(stage.stageId, {
      ...stage,
      unitId: "hsk4-timed-integration",
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
      || !validText(lesson.titleVi, 5, 260)
      || !validText(lesson.objectiveVi, 60, 600)
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
      "deep-comprehension": {
        unitId: "hsk4-deep-comprehension",
        active: ["topicIds", "vocabularyIds"],
        inactive: ["taskIds", "grammarRowIds"],
      },
      "summary-argument": {
        unitId: "hsk4-summary-argument",
        active: ["taskIds", "grammarRowIds"],
        inactive: [
          "topicIds",
          "vocabularyIds",
          "recognitionCharacterIds",
        ],
      },
      "timed-integration": {
        unitId: "hsk4-timed-integration",
        active: [],
        inactive: MAPPING_FIELDS,
      },
    }[lesson.blueprintKind];
    if (
      !kindContract
      || lesson.unitId !== kindContract.unitId
      || kindContract.active.some((field) => mappings[field].length < 1)
      || kindContract.inactive.some((field) => mappings[field].length !== 0)
    ) {
      errors.push(`${lesson.lessonId} kind and inventory mapping disagree`);
    }
    if (lesson.blueprintKind === "deep-comprehension") {
      if (
        !mappings.topicIds.every((id) => track.topicIds.includes(id))
        || !Array.isArray(lesson.classification?.keywordSignals)
        || lesson.classification.keywordSignals.length < 6
        || !Number.isInteger(lesson.classification.semanticMatchCount)
        || !Number.isInteger(lesson.classification.foundationFallbackCount)
        || lesson.classification.semanticMatchCount
          + lesson.classification.foundationFallbackCount
          !== mappings.vocabularyIds.length
        || lesson.classification.semanticClaimsReviewed !== false
      ) {
        errors.push(`${lesson.lessonId} semantic classification is invalid`);
      }
    }
    if (
      lesson.blueprintKind === "summary-argument"
      && (
        !mappings.grammarRowIds.every(
          (id) => track.grammarRowIds.includes(id),
        )
        || !Array.isArray(lesson.contextDomainIds)
        || lesson.contextDomainIds.length < 1
      )
    ) {
      errors.push(`${lesson.lessonId} argument mapping is invalid`);
    }
    if (
      lesson.blueprintKind === "timed-integration"
      && (
        !Number.isInteger(lesson.promptPlan?.minimumPromptUnits)
        || lesson.promptPlan.minimumPromptUnits < 4
        || !Array.isArray(lesson.promptPlan.contextDomainIds)
        || lesson.promptPlan.contextDomainIds.length !== 2
        || lesson.promptPlan.timed !== track.timed
        || lesson.promptPlan.authoredPromptCount !== 0
      )
    ) {
      errors.push(`${lesson.lessonId} integration prompt plan is invalid`);
    }
    if (
      lesson.practicePlan?.state !== "planned"
      || !Array.isArray(lesson.practicePlan?.requiredKinds)
      || lesson.practicePlan.requiredKinds.length !== 3
      || duplicates(lesson.practicePlan.requiredKinds).length > 0
      || lesson.practicePlan.authoredItemCount !== 0
      || lesson.practicePlan.measurementEligible !== false
      || lesson.practicePlan.masteryEligible !== false
    ) {
      errors.push(`${lesson.lessonId} practice plan must remain unauthored`);
    }
    if (
      !isRecord(lesson.assessmentPlan)
      || !validText(lesson.assessmentPlan.evidenceMode, 20, 140)
      || !Array.isArray(lesson.assessmentPlan.skills)
      || lesson.assessmentPlan.skills.length < 2
      || lesson.assessmentPlan.timedEvidenceRequired
        !== (lesson.promptPlan?.timed ?? false)
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
      expected: scopeBundle.scope.unitScopes.flatMap((unit) => unit[field]),
    });
  }

  const vocabularyAssignments = Array.isArray(pack.vocabularyAssignments)
    ? pack.vocabularyAssignments
    : [];
  const comprehensionLessons = lessons.filter(
    (lesson) => lesson.blueprintKind === "deep-comprehension",
  );
  if (
    vocabularyAssignments.length !== 1_000
    || duplicates(
      vocabularyAssignments.map((assignment) => assignment.vocabularyId),
    ).length > 0
    || !exactSet(
      vocabularyAssignments.map((assignment) => assignment.vocabularyId),
      vocabularyBundle.draft.entries.map((entry) => entry.officialId),
    )
  ) {
    errors.push("HSK4 vocabulary assignments must cover all 1,000 entries");
  }
  for (const assignment of vocabularyAssignments) {
    const lesson = comprehensionLessons.find(
      (candidate) => candidate.lessonId === assignment.lessonId,
    );
    if (
      !lesson
      || !lesson.inventoryMappings.vocabularyIds.includes(
        assignment.vocabularyId,
      )
      || !["source-sense-keyword-match", "cross-domain-foundation-fallback"]
        .includes(assignment.method)
      || (
        assignment.method === "source-sense-keyword-match"
        && (
          !Number.isInteger(assignment.score)
          || assignment.score < 1
          || !validText(assignment.matchedSignal, 1, 80)
        )
      )
      || (
        assignment.method === "cross-domain-foundation-fallback"
        && (assignment.score !== 0 || assignment.matchedSignal !== null)
      )
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
    characterAssignments.length !== 441
    || duplicates(
      characterAssignments.map((assignment) => assignment.characterId),
    ).length > 0
  ) {
    errors.push("HSK4 character assignments must cover all 441 entries");
  }
  for (const assignment of characterAssignments) {
    const lesson = comprehensionLessons.find(
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
    reviewBatches.length !== 78
    || duplicates(reviewBatches.map((batch) => batch.batchId)).length > 0
    || !exactSet(
      reviewBatches.flatMap((batch) => batch.targetLessonIds ?? []),
      lessonIds,
    )
  ) {
    errors.push("HSK4 blueprint review batches must cover every lesson");
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
    deepComprehensionLessons: comprehensionLessons.length,
    summaryArgumentLessons: lessons.filter(
      (lesson) => lesson.blueprintKind === "summary-argument",
    ).length,
    timedIntegrationLessons: lessons.filter(
      (lesson) => lesson.blueprintKind === "timed-integration",
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
  if (!exact(pack.counts, expectedCounts)) {
    errors.push("HSK4 lesson-blueprint summary counts are stale");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expectedCounts,
  };
};

export const assertValidHsk4LessonBlueprintsBundle = (bundle) => {
  const result = validateHsk4LessonBlueprintsBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK4 lesson blueprints:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
