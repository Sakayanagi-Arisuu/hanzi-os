import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk3StructuredExplanationPackBundle,
  loadHsk3StructuredExplanationPackBundle,
} from "./hsk3StructuredExplanationPack.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK3_LEVEL_ASSESSMENT_RELATIVE_PATH =
  "content/drafts/hsk3-level-assessment-2026.07.json";

const FORM_IDS = ["hsk3-level-form-a", "hsk3-level-form-b"];
const SECTION_COUNTS = {
  "listening-objective": 12,
  "reading-objective": 12,
  "vocabulary-objective": 15,
  "grammar-objective": 15,
  "speaking-performance": 16,
  "writing-performance": 16,
};
const SECTION_SKILLS = {
  "listening-objective": "listening",
  "reading-objective": "reading",
  "vocabulary-objective": "vocabulary",
  "grammar-objective": "grammar",
  "speaking-performance": "speaking",
  "writing-performance": "writing",
};
const PERFORMANCE_SECTIONS = [
  "speaking-performance",
  "writing-performance",
];
const OPTION_IDS = ["A", "B", "C", "D"];
const BASE_REVIEW_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "assessment-editor",
];
const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const validText = (value, minimum = 1, maximum = 4000) =>
  typeof value === "string"
  && value.trim().length >= minimum
  && value.length <= maximum;
const exact = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);
const exactSet = (left, right) =>
  exact([...(left ?? [])].sort(), [...(right ?? [])].sort());
const duplicateValues = (values) => {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
};

export const hsk3AssessmentSourceSnapshotSha256 = (value) =>
  `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;

const paragraphBundlesFromTip = (cultureBundle) => {
  const societyBundle = cultureBundle.prerequisiteBundles[0];
  const natureBundle = societyBundle.prerequisiteBundles[0];
  const studyBundle = natureBundle.prerequisiteBundles[0];
  const personalBundle = studyBundle.prerequisiteBundles[0];
  return [
    personalBundle.priorLessonBundle,
    personalBundle,
    studyBundle,
    natureBundle,
    societyBundle,
    cultureBundle,
  ];
};

const narrationBundlesFromTip = (discourseBundle) => {
  const comparisonBundle = discourseBundle.prerequisiteBundles[0];
  const eventBundle = comparisonBundle.prerequisiteBundles[0];
  const modalityBundle = eventBundle.prerequisiteBundles[0];
  const referenceBundle = modalityBundle.prerequisiteBundles[0];
  return [
    referenceBundle,
    modalityBundle,
    eventBundle,
    comparisonBundle,
    discourseBundle,
  ];
};

export const collectHsk3AssessmentSources = (latestBundle) => {
  const guidedParagraphBundle = latestBundle.prerequisiteBundle;
  const eventRetellingBundle = guidedParagraphBundle.prerequisiteBundle;
  const cohesionBundle = eventRetellingBundle.prerequisiteBundle;
  const guidedNotesBundle = cohesionBundle.prerequisiteBundle;
  const paragraphBundles = paragraphBundlesFromTip(
    latestBundle.paragraphBundle,
  );
  const narrationBundles = narrationBundlesFromTip(
    guidedNotesBundle.narrationBundle,
  );
  const paragraphLessons = paragraphBundles.flatMap((bundle) => {
    const lessons = Array.isArray(bundle.pack.lessons)
      ? bundle.pack.lessons
      : [{
          lessonId: bundle.pack.lessonId,
          texts: bundle.pack.texts,
          comprehensionItems: bundle.pack.comprehensionItems,
          vocabularyPracticeItems: bundle.pack.vocabularyPracticeItems,
        }];
    return lessons.map((lesson) => ({
      sourcePackId: bundle.pack.packId,
      lesson,
    }));
  });
  const textById = new Map();
  for (const { sourcePackId, lesson } of paragraphLessons) {
    for (const text of lesson.texts ?? []) {
      textById.set(text.textId, {
        sourcePackId,
        sourceLessonId: lesson.lessonId,
        text,
      });
    }
  }
  const listeningComprehension = [];
  const readingComprehension = [];
  const vocabulary = [];
  for (const { sourcePackId, lesson } of paragraphLessons) {
    for (const item of lesson.comprehensionItems ?? []) {
      const sourceText = textById.get(item.textId);
      const candidate = {
        sourcePackId,
        sourceLessonId: lesson.lessonId,
        item,
        sourceText: sourceText?.text,
      };
      if (item.skill === "listening" && item.kind === "main-idea") {
        listeningComprehension.push(candidate);
      }
      if (item.skill === "reading" && item.kind === "main-idea") {
        readingComprehension.push(candidate);
      }
    }
    for (const item of lesson.vocabularyPracticeItems ?? []) {
      if (item.kind === "meaning-selection") {
        vocabulary.push({
          sourcePackId,
          sourceLessonId: lesson.lessonId,
          item,
        });
      }
    }
  }
  const grammar = narrationBundles.flatMap((bundle) =>
    bundle.pack.lessons.flatMap((lesson) =>
      lesson.grammarInParagraphItems.map((item) => ({
        sourcePackId: bundle.pack.packId,
        sourceLessonId: lesson.lessonId,
        item,
      }))
    )
  );
  const speaking = [
    ...eventRetellingBundle.pack.lessons.flatMap((lesson) =>
      lesson.promptUnits.map((item) => ({
        sourcePackId: eventRetellingBundle.pack.packId,
        sourceLessonId: lesson.lessonId,
        item,
      }))
    ),
    ...latestBundle.pack.lessons.flatMap((lesson) =>
      lesson.promptUnits.map((item) => ({
        sourcePackId: latestBundle.pack.packId,
        sourceLessonId: lesson.lessonId,
        item,
      }))
    ),
  ];
  const cohesionWriting = cohesionBundle.pack.lessons.flatMap((lesson) =>
    lesson.promptUnits.map((item) => ({
      sourcePackId: cohesionBundle.pack.packId,
      sourceLessonId: lesson.lessonId,
      item,
    }))
  );
  const guidedWriting = guidedParagraphBundle.pack.lessons.flatMap(
    (lesson) =>
      lesson.promptUnits.map((item) => ({
        sourcePackId: guidedParagraphBundle.pack.packId,
        sourceLessonId: lesson.lessonId,
        item,
      })),
  );
  const expectedSourceByKey = new Map();
  const addExpected = ({
    sourcePackId,
    sourceLessonId,
    item,
    sourceText,
    entityType,
  }) => {
    const key = `${sourcePackId}:${item.itemId}`;
    expectedSourceByKey.set(key, {
      sourcePackId,
      sourceLessonId,
      entityType,
      entityId: item.itemId,
      snapshotSha256: hsk3AssessmentSourceSnapshotSha256({
        item,
        ...(sourceText ? { sourceText } : {}),
      }),
    });
  };
  listeningComprehension.forEach((candidate) =>
    addExpected({
      ...candidate,
      entityType: "paragraph-listening-comprehension",
    })
  );
  readingComprehension.forEach((candidate) =>
    addExpected({
      ...candidate,
      entityType: "paragraph-reading-comprehension",
    })
  );
  vocabulary.forEach((candidate) =>
    addExpected({
      ...candidate,
      entityType: "vocabulary-meaning-practice",
    })
  );
  grammar.forEach((candidate) =>
    addExpected({
      ...candidate,
      entityType: "grammar-in-paragraph-practice",
    })
  );
  speaking.forEach((candidate) =>
    addExpected({
      ...candidate,
      entityType: "guided-speaking-prompt",
    })
  );
  [...cohesionWriting, ...guidedWriting].forEach((candidate) =>
    addExpected({
      ...candidate,
      entityType: "guided-writing-prompt",
    })
  );
  return {
    paragraphBundles,
    narrationBundles,
    guidedParagraphBundle,
    eventRetellingBundle,
    cohesionBundle,
    listeningComprehension,
    readingComprehension,
    vocabulary,
    grammar,
    speaking,
    cohesionWriting,
    guidedWriting,
    expectedSourceByKey,
  };
};

export const loadHsk3LevelAssessmentBundle = (
  root = process.cwd(),
) => {
  const sourceBundle = loadHsk3StructuredExplanationPackBundle(root);
  const bankPath = join(root, HSK3_LEVEL_ASSESSMENT_RELATIVE_PATH);
  return {
    sourceBundle,
    bankPath,
    bank: JSON.parse(readFileSync(bankPath, "utf8")),
  };
};

export const validateHsk3LevelAssessmentBundle = ({
  sourceBundle,
  bank,
}) => {
  const errors = [];
  try {
    assertValidHsk3StructuredExplanationPackBundle(sourceBundle);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (
    !isRecord(bank)
    || bank.schemaVersion !== 1
    || bank.bankId !== "hsk3-level-assessment-2026.07"
    || bank.level !== 3
  ) {
    return {
      valid: false,
      errors: ["HSK3 level assessment identity is invalid"],
    };
  }
  if (
    bank.state !== "uncalibrated-source-exposed-draft"
    || bank.learnerVisible !== false
    || bank.runtimeImportEligible !== false
    || bank.releaseEligible !== false
  ) {
    errors.push(
      "HSK3 assessment must remain hidden, uncalibrated and unissuable",
    );
  }
  if (
    bank.source?.sourceTipPackId !== sourceBundle.pack.packId
    || bank.source?.sourceTipPackSha256 !== fileSha256(sourceBundle.packPath)
  ) {
    errors.push("HSK3 assessment source binding is stale");
  }
  if (
    bank.authorship?.method
      !== "deterministic-source-bound-ai-assisted-assessment-draft"
    || bank.authorship?.assistant !== "OpenAI Codex"
    || Object.entries(bank.authorship).some(([key, value]) =>
      (
        key.endsWith("Reviewer")
        || key.endsWith("Editor")
      ) && value !== null
    )
  ) {
    errors.push("HSK3 assessment authorship implies invalid review");
  }
  if (
    bank.policy?.oneSkillPerItem !== true
    || bank.policy?.reviewedAudioRequiredForListeningAndSpeaking !== true
    || bank.policy?.reviewedRubricRequiredForSpeakingAndWriting !== true
    || bank.policy?.independentNonoverlappingFormsRequiredBeforeCalibration
      !== true
    || bank.policy?.repositorySourceExposureBlocksIssuance !== true
    || bank.policy?.answersMustBeServerConfidentialBeforeIssuance !== true
    || bank.policy?.humanReviewDoesNotCalibrate !== true
    || bank.policy?.calibrationRequiredForMeasurement !== true
    || bank.policy?.noRuntimeImportBeforeAllGates !== true
    || bank.policy?.assessmentCannotBackfillPracticeMastery !== true
  ) {
    errors.push("HSK3 assessment policy must remain fail-closed");
  }
  if (
    bank.calibration?.required !== true
    || bank.calibration?.pilotSampleSize !== 0
    || bank.calibration?.reliabilityEstimate !== null
    || bank.calibration?.sectionReliabilityEstimates !== null
    || bank.calibration?.cutScore !== null
    || bank.calibration?.sectionMinimums !== null
  ) {
    errors.push("HSK3 assessment calibration must remain empty");
  }
  if (
    bank.coverageClaims?.objectiveFormPairDraftComplete !== true
    || bank.coverageClaims?.paragraphListeningSourceCoverage !== "24/25"
    || bank.coverageClaims?.paragraphReadingSourceCoverage !== "24/25"
    || bank.coverageClaims?.vocabularyObjectiveSampleCoverage !== "30/500"
    || bank.coverageClaims?.grammarObjectiveSampleCoverage !== "30/96"
    || bank.coverageClaims?.guidedSpeakingPoolDraftCoverage !== "32/32"
    || bank.coverageClaims?.guidedWritingPoolDraftCoverage !== "32/36"
    || bank.coverageClaims?.allLearningSourcePartitionsComplete !== true
    || bank.coverageClaims?.independentFormsPlanned !== true
    || bank.coverageClaims?.independentAssessmentFormsComplete !== false
    || bank.coverageClaims?.reviewedAssessmentComplete !== false
    || bank.coverageClaims?.reviewedAudioComplete !== false
    || bank.coverageClaims?.calibratedAssessmentComplete !== false
    || bank.coverageClaims?.hsk3LevelCheckComplete !== false
    || bank.coverageClaims?.hsk3Complete !== false
  ) {
    errors.push("HSK3 assessment coverage claims are invalid");
  }

  const sources = collectHsk3AssessmentSources(sourceBundle);
  const items = Array.isArray(bank.items) ? bank.items : [];
  const forms = Array.isArray(bank.forms) ? bank.forms : [];
  if (
    items.length !== 172
    || duplicateValues(items.map((item) => item.itemId)).length > 0
    || duplicateValues(items.map((item) => item.exposureGroupId)).length > 0
    || duplicateValues(items.map((item) => item.sourceEntityKey)).length > 0
  ) {
    errors.push("HSK3 assessment must contain 172 unique source items");
  }
  if (
    forms.length !== 2
    || !exactSet(forms.map((form) => form.formId), FORM_IDS)
  ) {
    errors.push("HSK3 assessment must plan exactly two forms");
  }
  const formSourceKeys = new Map(
    FORM_IDS.map((formId) => [formId, new Set()]),
  );
  for (const item of items) {
    const expectedSkill = SECTION_SKILLS[item.sectionId];
    const expectedSource = sources.expectedSourceByKey.get(
      item.sourceEntityKey,
    );
    if (
      !expectedSkill
      || item.skill !== expectedSkill
      || !FORM_IDS.includes(item.formId)
      || !validText(item.itemId)
      || !validText(item.itemVersion)
      || !validText(item.equivalentGroupId)
      || !expectedSource
      || item.source?.artifactId !== expectedSource?.sourcePackId
      || item.source?.entityType !== expectedSource?.entityType
      || item.source?.entityId !== expectedSource?.entityId
      || item.source?.lessonId !== expectedSource?.sourceLessonId
      || item.sourceSnapshotSha256 !== expectedSource?.snapshotSha256
      || !validText(item.promptVi, 10)
    ) {
      errors.push(`${item.itemId ?? "unknown item"} source is invalid`);
      continue;
    }
    formSourceKeys.get(item.formId).add(item.sourceEntityKey);
    if (
      item.answerExposure !== "repository-authoring-only"
      || item.sourceExposure !== "practice-source-exposed-draft"
      || item.reviewStatus !== "pending"
      || item.calibrationStatus !== "uncalibrated"
      || item.independentFormStatus
        !== "planned-nonoverlapping-source-draft"
      || item.scoringPolicy !== "draft-only-not-for-issuance"
      || item.measurementEligible !== false
      || item.masteryEligible !== false
      || item.prerequisiteWaiverEligible !== false
      || item.releaseEligible !== false
    ) {
      errors.push(`${item.itemId} eligibility state is invalid`);
    }
    if (item.sectionId.endsWith("-objective")) {
      if (
        !Array.isArray(item.options)
        || item.options.length !== 4
        || !exactSet(
          item.options.map((option) => option.optionId),
          OPTION_IDS,
        )
        || duplicateValues(item.options.map((option) => option.text)).length
          > 0
        || item.options.some((option) => !validText(option.text))
        || !item.options.some(
          (option) => option.optionId === item.correctOptionId,
        )
      ) {
        errors.push(`${item.itemId} objective options are invalid`);
      }
      if (item.sectionId === "listening-objective") {
        if (
          item.modality !== "recorded-paragraph-selection-pending"
          || item.stimulus?.audio !== null
          || item.stimulus?.audioRequirement
            !== "reviewed-human-or-licensed-recording"
          || item.stimulus?.authoringPreview !== "synthetic-browser-voice"
          || !Array.isArray(item.stimulus?.lines)
          || item.stimulus.lines.length !== 8
          || item.stimulus?.transcriptReview !== "pending"
        ) {
          errors.push(`${item.itemId} listening stimulus is invalid`);
        }
      } else if (
        item.modality !== "visual-selection"
        || !validText(item.stimulus?.text)
      ) {
        errors.push(`${item.itemId} visual stimulus is invalid`);
      }
    } else if (item.sectionId === "speaking-performance") {
      if (
        item.modality !== "reviewed-human-rated-performance-pending"
        || item.stimulus?.audio !== null
        || !Array.isArray(item.stimulus?.sourceTextIds)
        || item.stimulus.sourceTextIds.length < 1
        || item.responseConstraints?.minimumSentences < 4
        || item.responseConstraints?.preparationSeconds !== null
        || item.responseConstraints?.responseSeconds !== null
        || item.responseConstraints?.sourceTranscriptVisible !== false
        || item.responseConstraints?.modelResponseVisible !== false
        || item.rubricDraft?.state !== "pending-review-and-calibration"
        || item.rubricDraft?.dimensions?.length !== 5
        || item.rubricDraft?.scale !== null
        || item.rubricDraft?.passingStandard !== null
      ) {
        errors.push(`${item.itemId} speaking draft is invalid`);
      }
    } else if (
      item.modality !== "reviewed-human-rated-performance-pending"
      || item.responseConstraints?.minimumSentences < 4
      || item.responseConstraints?.maximumSentences !== 8
      || item.responseConstraints?.sourceTextVisible !== true
      || item.responseConstraints?.modelResponseVisible !== false
      || item.rubricDraft?.state !== "pending-review-and-calibration"
      || item.rubricDraft?.dimensions?.length !== 5
      || item.rubricDraft?.scale !== null
      || item.rubricDraft?.passingStandard !== null
    ) {
      errors.push(`${item.itemId} writing draft is invalid`);
    }
  }
  const formAKeys = formSourceKeys.get(FORM_IDS[0]);
  const formBKeys = formSourceKeys.get(FORM_IDS[1]);
  const sourceOverlap = [...formAKeys].filter((key) =>
    formBKeys.has(key)
  );
  if (sourceOverlap.length > 0) {
    errors.push("HSK3 planned forms must not share source entities");
  }

  const equivalentGroups = new Map();
  for (const item of items) {
    const group = equivalentGroups.get(item.equivalentGroupId) ?? [];
    group.push(item);
    equivalentGroups.set(item.equivalentGroupId, group);
  }
  if (
    [...equivalentGroups.values()].some((group) =>
      group.length !== 2
      || !exactSet(group.map((item) => item.formId), FORM_IDS)
      || group[0].sectionId !== group[1].sectionId
      || group[0].skill !== group[1].skill
    )
  ) {
    errors.push("HSK3 equivalent form slots are invalid");
  }

  const formItemIds = [];
  for (const form of forms) {
    const expectedItems = items.filter(
      (item) => item.formId === form.formId,
    );
    const sections = Array.isArray(form.sections) ? form.sections : [];
    if (
      form.state !== "planned-source-exposed-draft"
      || form.learnerVisible !== false
      || form.eligibleForIssuance !== false
      || form.timeLimitMinutes !== null
      || form.passingStandard !== null
      || form.answerKeyServerConfidentialRequired !== true
      || form.sourceEntityOverlapWithOtherForm !== 0
      || form.itemCount !== 86
      || sections.length !== 6
      || !exactSet(
        sections.map((section) => section.sectionId),
        Object.keys(SECTION_COUNTS),
      )
    ) {
      errors.push(`${form.formId} manifest is invalid`);
      continue;
    }
    for (const section of sections) {
      const expectedSectionItems = expectedItems.filter(
        (item) => item.sectionId === section.sectionId,
      );
      if (
        section.skill !== SECTION_SKILLS[section.sectionId]
        || section.itemCount !== SECTION_COUNTS[section.sectionId]
        || !exactSet(
          section.itemIds,
          expectedSectionItems.map((item) => item.itemId),
        )
      ) {
        errors.push(`${form.formId}:${section.sectionId} is invalid`);
      }
      formItemIds.push(...(section.itemIds ?? []));
    }
  }
  if (
    duplicateValues(formItemIds).length > 0
    || !exactSet(formItemIds, items.map((item) => item.itemId))
  ) {
    errors.push("HSK3 form manifests must partition all items");
  }

  const reviewBatches = Array.isArray(bank.reviewBatches)
    ? bank.reviewBatches
    : [];
  const reviewItemIds = [];
  if (reviewBatches.length !== 12) {
    errors.push("HSK3 assessment must have twelve review batches");
  }
  for (const batch of reviewBatches) {
    const expectedItems = items.filter(
      (item) =>
        item.formId === batch.formId
        && item.sectionId === batch.sectionId,
    );
    const roles = [...BASE_REVIEW_ROLES];
    if (
      batch.sectionId === "listening-objective"
      || batch.sectionId === "speaking-performance"
    ) {
      roles.push("audio-rights-reviewer");
    }
    if (batch.sectionId === "speaking-performance") {
      roles.push("speaking-pedagogy-reviewer");
    }
    if (batch.sectionId === "writing-performance") {
      roles.push("writing-pedagogy-reviewer");
    }
    if (
      batch.batchId
        !== `${bank.bankId}:${batch.formId}:${batch.sectionId}:review-v1`
      || !FORM_IDS.includes(batch.formId)
      || !Object.hasOwn(SECTION_COUNTS, batch.sectionId)
      || !exactSet(
        batch.itemIds,
        expectedItems.map((item) => item.itemId),
      )
      || !exactSet(batch.requiredRoles, roles)
      || batch.reviewedAudioRequired
        !== (
          batch.sectionId === "listening-objective"
          || batch.sectionId === "speaking-performance"
        )
      || batch.reviewedRubricRequired
        !== PERFORMANCE_SECTIONS.includes(batch.sectionId)
      || batch.state !== "pending"
      || !exact(batch.approvals, [])
    ) {
      errors.push(`${batch.batchId ?? "unknown batch"} is invalid`);
    }
    reviewItemIds.push(...(batch.itemIds ?? []));
  }
  if (
    duplicateValues(reviewItemIds).length > 0
    || !exactSet(reviewItemIds, items.map((item) => item.itemId))
  ) {
    errors.push("HSK3 assessment review batches must partition all items");
  }

  const countSection = (sectionId) =>
    items.filter((item) => item.sectionId === sectionId).length;
  const expectedCounts = {
    forms: forms.length,
    itemsPerForm: 86,
    totalItems: items.length,
    objectiveItems: items.filter(
      (item) => item.sectionId.endsWith("-objective"),
    ).length,
    constructedResponseItems: items.filter(
      (item) => item.sectionId.endsWith("-performance"),
    ).length,
    listeningItems: countSection("listening-objective"),
    readingItems: countSection("reading-objective"),
    vocabularyItems: countSection("vocabulary-objective"),
    grammarItems: countSection("grammar-objective"),
    speakingItems: countSection("speaking-performance"),
    writingItems: countSection("writing-performance"),
    audioDependentItems:
      countSection("listening-objective")
      + countSection("speaking-performance"),
    reviewedAudioItems: 0,
    sourceEntityOverlapBetweenForms: sourceOverlap.length,
    reviewBatches: reviewBatches.length,
    reviewedItems: 0,
    calibratedItems: 0,
    measurementEligibleItems: 0,
    masteryEligibleItems: 0,
    prerequisiteWaiverEligibleItems: 0,
    releaseEligibleItems: 0,
  };
  if (
    expectedCounts.objectiveItems !== 108
    || expectedCounts.constructedResponseItems !== 64
    || expectedCounts.listeningItems !== 24
    || expectedCounts.readingItems !== 24
    || expectedCounts.vocabularyItems !== 30
    || expectedCounts.grammarItems !== 30
    || expectedCounts.speakingItems !== 32
    || expectedCounts.writingItems !== 32
    || !exact(bank.counts, expectedCounts)
  ) {
    errors.push("HSK3 assessment counts are stale or invalid");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expectedCounts,
  };
};

export const assertValidHsk3LevelAssessmentBundle = (bundle) => {
  const result = validateHsk3LevelAssessmentBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `HSK3 level assessment validation failed:\n- ${
        result.errors.join("\n- ")
      }`,
    );
  }
  return result;
};
