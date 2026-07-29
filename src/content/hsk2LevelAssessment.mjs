import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk2VocabularyPracticeBundle,
  loadHsk2VocabularyPracticeBundle,
} from "./hsk2VocabularyPractice.mjs";
import {
  assertValidHsk2GrammarContextBundle,
  loadHsk2GrammarContextBundle,
} from "./hsk2GrammarContext.mjs";
import {
  assertValidHsk2SituationalDialoguesBundle,
  loadHsk2SituationalDialoguesBundle,
} from "./hsk2SituationalDialogues.mjs";
import {
  assertValidHsk2ShortTextProductionBundle,
  loadHsk2ShortTextProductionBundle,
} from "./hsk2ShortTextProduction.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK2_LEVEL_ASSESSMENT_RELATIVE_PATH =
  "content/drafts/hsk2-level-assessment-2026.07.json";

const FORM_IDS = ["hsk2-level-form-a", "hsk2-level-form-b"];
const SECTION_COUNTS = {
  "listening-objective": 15,
  "reading-objective": 15,
  "vocabulary-objective": 15,
  "grammar-objective": 15,
  "speaking-performance": 10,
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
const PERFORMANCE_SECTIONS = ["speaking-performance", "writing-performance"];
const OPTION_IDS = ["A", "B", "C", "D"];
const BASE_REVIEW_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "assessment-editor",
];

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const validText = (value, minimum = 1, maximum = 1400) =>
  typeof value === "string"
  && value.trim().length >= minimum
  && value.length <= maximum;
const exactSet = (left, right) =>
  JSON.stringify([...(left ?? [])].sort())
    === JSON.stringify([...(right ?? [])].sort());
const duplicateValues = (values) => {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
};

export const loadHsk2LevelAssessmentBundle = (
  root = process.cwd(),
) => {
  const vocabularyBundle = loadHsk2VocabularyPracticeBundle(root);
  const grammarBundle = loadHsk2GrammarContextBundle(root);
  const situationalBundle = loadHsk2SituationalDialoguesBundle(root);
  const productionBundle = loadHsk2ShortTextProductionBundle(root);
  const bankPath = join(root, HSK2_LEVEL_ASSESSMENT_RELATIVE_PATH);
  return {
    vocabularyBundle,
    grammarBundle,
    situationalBundle,
    productionBundle,
    bankPath,
    bank: JSON.parse(readFileSync(bankPath, "utf8")),
  };
};

export const validateHsk2LevelAssessmentBundle = ({
  vocabularyBundle,
  grammarBundle,
  situationalBundle,
  productionBundle,
  bank,
}) => {
  const errors = [];
  try {
    assertValidHsk2VocabularyPracticeBundle(vocabularyBundle);
    assertValidHsk2GrammarContextBundle(grammarBundle);
    assertValidHsk2SituationalDialoguesBundle(situationalBundle);
    assertValidHsk2ShortTextProductionBundle(productionBundle);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }

  if (
    !isRecord(bank)
    || bank.schemaVersion !== 1
    || bank.bankId !== "hsk2-level-assessment-2026.07"
    || bank.level !== 2
  ) {
    return {
      valid: false,
      errors: ["HSK2 level assessment identity is invalid"],
    };
  }
  if (
    bank.state !== "uncalibrated-source-exposed-draft"
    || bank.learnerVisible !== false
    || bank.runtimeImportEligible !== false
    || bank.releaseEligible !== false
  ) {
    errors.push(
      "HSK2 level assessment must remain hidden, uncalibrated and unissuable",
    );
  }

  if (
    bank.source?.vocabularyPracticePackId !== vocabularyBundle.pack.packId
    || bank.source?.vocabularyPracticePackSha256
      !== fileSha256(vocabularyBundle.packPath)
    || bank.source?.grammarContextPackId !== grammarBundle.pack.packId
    || bank.source?.grammarContextPackSha256
      !== fileSha256(grammarBundle.packPath)
    || bank.source?.situationalDialoguePackId
      !== situationalBundle.pack.packId
    || bank.source?.situationalDialoguePackSha256
      !== fileSha256(situationalBundle.packPath)
    || bank.source?.shortTextProductionPackId
      !== productionBundle.pack.packId
    || bank.source?.shortTextProductionPackSha256
      !== fileSha256(productionBundle.packPath)
  ) {
    errors.push("HSK2 level assessment source binding is stale");
  }

  if (
    bank.authorship?.method
      !== "deterministic-source-bound-ai-assisted-assessment-draft"
    || bank.authorship?.assistant !== "OpenAI Codex"
    || Object.entries(bank.authorship).some(([key, value]) =>
      key.endsWith("Reviewer") && value !== null
    )
    || bank.authorship?.vietnameseEditor !== null
    || bank.authorship?.assessmentEditor !== null
  ) {
    errors.push("HSK2 level assessment authorship implies invalid review");
  }

  if (
    bank.policy?.oneSkillPerItem !== true
    || bank.policy?.reviewedAudioRequiredForScoredListening !== true
    || bank.policy?.reviewedRubricRequiredForSpeakingAndWriting !== true
    || bank.policy?.independentNonoverlappingFormsRequiredBeforeCalibration
      !== true
    || bank.policy?.repositorySourceExposureBlocksIssuance !== true
    || bank.policy?.answersMustBeServerConfidentialBeforeIssuance !== true
    || bank.policy?.humanReviewDoesNotCalibrate !== true
    || bank.policy?.calibrationRequiredForMeasurement !== true
    || bank.policy?.noRuntimeImportBeforeAllGates !== true
  ) {
    errors.push("HSK2 level assessment policy must remain fail-closed");
  }

  if (
    bank.calibration?.required !== true
    || bank.calibration?.pilotSampleSize !== 0
    || bank.calibration?.reliabilityEstimate !== null
    || bank.calibration?.sectionReliabilityEstimates !== null
    || bank.calibration?.cutScore !== null
    || bank.calibration?.sectionMinimums !== null
  ) {
    errors.push("HSK2 level assessment calibration must remain empty");
  }

  if (
    bank.coverageClaims?.objectiveFormPairDraftComplete !== true
    || bank.coverageClaims?.speakingScenarioPoolDraftCoverage !== "20/20"
    || bank.coverageClaims?.officialTaskPoolDraftCoverage !== "17/17"
    || bank.coverageClaims?.officialTopicPoolDraftCoverage !== "34/34"
    || bank.coverageClaims?.guidedWritingPoolDraftCoverage !== "32/32"
    || bank.coverageClaims?.vocabularyObjectiveSampleCoverage !== "30/200"
    || bank.coverageClaims?.grammarObjectiveSampleCoverage !== "30/75"
    || bank.coverageClaims?.independentFormsPlanned !== true
    || bank.coverageClaims?.independentAssessmentFormsComplete !== false
    || bank.coverageClaims?.reviewedAssessmentComplete !== false
    || bank.coverageClaims?.reviewedAudioComplete !== false
    || bank.coverageClaims?.calibratedAssessmentComplete !== false
    || bank.coverageClaims?.hsk2LevelCheckComplete !== false
  ) {
    errors.push("HSK2 level assessment coverage claims are invalid");
  }

  const items = Array.isArray(bank.items) ? bank.items : [];
  const forms = Array.isArray(bank.forms) ? bank.forms : [];
  if (
    items.length !== 172
    || duplicateValues(items.map((item) => item.itemId)).length > 0
    || duplicateValues(items.map((item) => item.exposureGroupId)).length > 0
  ) {
    errors.push("HSK2 level assessment must contain 172 unique items");
  }
  if (
    forms.length !== 2
    || !exactSet(forms.map((form) => form.formId), FORM_IDS)
  ) {
    errors.push("HSK2 level assessment must plan exactly two forms");
  }

  const expectedSourceArtifactIds = new Set([
    vocabularyBundle.pack.packId,
    grammarBundle.pack.packId,
    situationalBundle.pack.packId,
    productionBundle.pack.packId,
  ]);
  const formSourceKeys = new Map(FORM_IDS.map((formId) => [formId, new Set()]));
  const taskIds = new Set();
  const topicIds = new Set();
  const writingSourceIds = new Set();

  for (const item of items) {
    const expectedSkill = SECTION_SKILLS[item.sectionId];
    if (
      !expectedSkill
      || item.skill !== expectedSkill
      || !FORM_IDS.includes(item.formId)
      || !validText(item.itemId)
      || !validText(item.itemVersion)
      || !validText(item.equivalentGroupId)
      || !validText(item.sourceEntityKey)
      || !isRecord(item.source)
      || !expectedSourceArtifactIds.has(item.source.artifactId)
      || !validText(item.promptVi, 10)
    ) {
      errors.push(`${item.itemId ?? "unknown item"} identity or source is invalid`);
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
        || duplicateValues(item.options.map((option) => option.text)).length > 0
        || item.options.some((option) => !validText(option.text))
        || !item.options.some(
          (option) => option.optionId === item.correctOptionId,
        )
      ) {
        errors.push(`${item.itemId} objective options are invalid`);
      }
      if (item.sectionId === "listening-objective") {
        if (
          item.modality !== "recorded-audio-selection-pending"
          || item.stimulus?.audio !== null
          || item.stimulus?.audioRequirement
            !== "reviewed-human-or-licensed-recording"
          || item.stimulus?.authoringPreview !== "synthetic-browser-voice"
          || !validText(item.stimulus?.transcriptHanzi)
          || !validText(item.stimulus?.transcriptPinyin)
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
      for (const taskId of item.source.officialTaskIds ?? []) taskIds.add(taskId);
      for (const topicId of item.source.officialTopicIds ?? []) {
        topicIds.add(topicId);
      }
      if (
        item.modality !== "reviewed-human-rated-performance-pending"
        || item.responseConstraints?.minimumTurns !== 6
        || item.responseConstraints?.followUpRequired !== true
        || item.responseConstraints?.confirmationRequired !== true
        || item.responseConstraints?.preparationSeconds !== null
        || item.responseConstraints?.responseSeconds !== null
        || item.rubricDraft?.state !== "pending-review-and-calibration"
        || !Array.isArray(item.rubricDraft?.dimensions)
        || item.rubricDraft.dimensions.length !== 4
        || item.rubricDraft?.scale !== null
        || item.rubricDraft?.passingStandard !== null
      ) {
        errors.push(`${item.itemId} speaking draft is invalid`);
      }
    } else {
      writingSourceIds.add(item.source.entityId);
      if (
        item.modality !== "reviewed-human-rated-performance-pending"
        || !validText(item.situationVi, 20)
        || !Array.isArray(item.requiredElementsVi)
        || item.requiredElementsVi.length !== 3
        || item.responseConstraints?.minimumSentences !== 3
        || item.responseConstraints?.maximumSentences !== 5
        || item.responseConstraints?.languageSupportVisible !== false
        || item.responseConstraints?.modelResponseVisible !== false
        || item.rubricDraft?.state !== "pending-review-and-calibration"
        || !Array.isArray(item.rubricDraft?.dimensions)
        || item.rubricDraft.dimensions.length !== 4
        || item.rubricDraft?.scale !== null
        || item.rubricDraft?.passingStandard !== null
      ) {
        errors.push(`${item.itemId} writing draft is invalid`);
      }
    }
  }

  const formAKeys = formSourceKeys.get(FORM_IDS[0]);
  const formBKeys = formSourceKeys.get(FORM_IDS[1]);
  const sourceOverlap = [...formAKeys].filter((key) => formBKeys.has(key));
  if (sourceOverlap.length > 0) {
    errors.push("HSK2 planned forms must not share source entities");
  }
  if (
    taskIds.size !== 17
    || topicIds.size !== 34
    || writingSourceIds.size !== 32
  ) {
    errors.push("HSK2 performance pools do not match declared coverage");
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
    errors.push("HSK2 equivalent form slots are invalid");
  }

  const formItemIds = [];
  for (const form of forms) {
    const expectedItems = items.filter((item) => item.formId === form.formId);
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
        errors.push(`${form.formId}:${section.sectionId} manifest is invalid`);
      }
      formItemIds.push(...(section.itemIds ?? []));
    }
  }
  if (
    duplicateValues(formItemIds).length > 0
    || !exactSet(formItemIds, items.map((item) => item.itemId))
  ) {
    errors.push("HSK2 form manifests must partition all assessment items");
  }

  const reviewBatches = Array.isArray(bank.reviewBatches)
    ? bank.reviewBatches
    : [];
  const reviewItemIds = [];
  if (reviewBatches.length !== 12) {
    errors.push("HSK2 assessment must have twelve review batches");
  }
  for (const batch of reviewBatches) {
    const expectedItems = items.filter(
      (item) =>
        item.formId === batch.formId && item.sectionId === batch.sectionId,
    );
    const roles = [...BASE_REVIEW_ROLES];
    if (batch.sectionId === "listening-objective") {
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
        !== (batch.sectionId === "listening-objective")
      || batch.reviewedRubricRequired
        !== PERFORMANCE_SECTIONS.includes(batch.sectionId)
      || batch.state !== "pending"
      || !Array.isArray(batch.approvals)
      || batch.approvals.length !== 0
    ) {
      errors.push(`${batch.batchId ?? "unknown batch"} review batch is invalid`);
    }
    reviewItemIds.push(...(batch.itemIds ?? []));
  }
  if (
    duplicateValues(reviewItemIds).length > 0
    || !exactSet(reviewItemIds, items.map((item) => item.itemId))
  ) {
    errors.push("HSK2 assessment review batches must partition all items");
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
    audioDependentItems: countSection("listening-objective"),
    reviewedAudioItems: 0,
    sourceEntityOverlapBetweenForms: sourceOverlap.length,
    reviewBatches: reviewBatches.length,
    reviewedItems: items.filter((item) => item.reviewStatus === "approved")
      .length,
    calibratedItems: items.filter(
      (item) => item.calibrationStatus === "calibrated",
    ).length,
    measurementEligibleItems: items.filter(
      (item) => item.measurementEligible,
    ).length,
    masteryEligibleItems: items.filter((item) => item.masteryEligible).length,
    prerequisiteWaiverEligibleItems: items.filter(
      (item) => item.prerequisiteWaiverEligible,
    ).length,
    releaseEligibleItems: items.filter((item) => item.releaseEligible).length,
  };
  if (
    expectedCounts.objectiveItems !== 120
    || expectedCounts.constructedResponseItems !== 52
    || expectedCounts.listeningItems !== 30
    || expectedCounts.readingItems !== 30
    || expectedCounts.vocabularyItems !== 30
    || expectedCounts.grammarItems !== 30
    || expectedCounts.speakingItems !== 20
    || expectedCounts.writingItems !== 32
    || JSON.stringify(bank.counts) !== JSON.stringify(expectedCounts)
  ) {
    errors.push("HSK2 level assessment counts are stale or invalid");
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: bank.counts,
  };
};

export const assertValidHsk2LevelAssessmentBundle = (bundle) => {
  const result = validateHsk2LevelAssessmentBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `HSK2 level assessment validation failed:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
