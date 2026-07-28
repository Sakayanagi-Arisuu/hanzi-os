import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk1PersonalExchangePackBundle,
  loadHsk1PersonalExchangePackBundle,
} from "./hsk1PersonalExchangePack.mjs";
import {
  assertValidHsk1CommunicativeUnitPacksBundle,
  loadHsk1CommunicativeUnitPacksBundle,
} from "./hsk1CommunicativeUnitPacks.mjs";
import {
  assertValidHsk1GrammarContextPackBundle,
  loadHsk1GrammarContextPackBundle,
} from "./hsk1GrammarContextPack.mjs";
import {
  assertValidHsk1TaskAssessmentPackBundle,
  loadHsk1TaskAssessmentPackBundle,
} from "./hsk1TaskAssessmentPack.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK1_LEVEL_CHECK_ITEM_BANK_RELATIVE_PATH =
  "content/drafts/hsk1-level-check-items-2026.07.json";

const EXPECTED_COUNTS = {
  objectiveItems: 50,
  listeningItems: 15,
  readingItems: 15,
  vocabularyItems: 10,
  grammarItems: 10,
  reviewBatches: 10,
  reviewedItems: 0,
  calibratedItems: 0,
  measurementEligibleItems: 0,
  masteryEligibleItems: 0,
  releaseEligibleItems: 0,
};
const EXPECTED_SECTION_COUNTS = {
  "listening-objective": 15,
  "reading-objective": 15,
  "vocabulary-grammar-objective": 20,
};
const exactSet = (left, right) =>
  JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
const validText = (value, minimum = 1, maximum = 500) =>
  typeof value === "string"
  && value.length >= minimum
  && value.length <= maximum;
const duplicateValues = (values) => {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
};

export const loadHsk1LevelCheckItemBankBundle = (root = process.cwd()) => {
  const personalBundle = loadHsk1PersonalExchangePackBundle(root);
  const communicativeBundle = loadHsk1CommunicativeUnitPacksBundle(root);
  const grammarBundle = loadHsk1GrammarContextPackBundle(root);
  const taskBundle = loadHsk1TaskAssessmentPackBundle(root);
  const bankPath = join(root, HSK1_LEVEL_CHECK_ITEM_BANK_RELATIVE_PATH);
  return {
    personalBundle,
    communicativeBundle,
    grammarBundle,
    taskBundle,
    bankPath,
    bank: JSON.parse(readFileSync(bankPath, "utf8")),
  };
};

export const validateHsk1LevelCheckItemBankBundle = ({
  personalBundle,
  communicativeBundle,
  grammarBundle,
  taskBundle,
  bank,
}) => {
  const errors = [];
  try {
    assertValidHsk1PersonalExchangePackBundle(personalBundle);
    assertValidHsk1CommunicativeUnitPacksBundle(communicativeBundle);
    assertValidHsk1GrammarContextPackBundle(grammarBundle);
    assertValidHsk1TaskAssessmentPackBundle(taskBundle);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (
    bank?.schemaVersion !== 1
    || bank?.bankId !== "hsk1-level-check-items-2026.07"
    || bank?.blueprintId !== "hsk1-level-check-2026.07"
    || bank?.state !== "uncalibrated-draft"
    || bank?.learnerVisible !== false
    || bank?.runtimeImportEligible !== false
    || bank?.releaseEligible !== false
  ) {
    errors.push("level-check bank must remain a hidden uncalibrated draft");
  }
  if (
    bank?.source?.personalExchangePackId !== personalBundle.pack.packId
    || bank?.source?.personalExchangePackSha256
      !== fileSha256(personalBundle.packPath)
    || bank?.source?.communicativeCollectionId
      !== communicativeBundle.collection.collectionId
    || bank?.source?.communicativeCollectionSha256
      !== fileSha256(communicativeBundle.collectionPath)
    || bank?.source?.grammarPackId !== grammarBundle.pack.packId
    || bank?.source?.grammarPackSha256 !== fileSha256(grammarBundle.packPath)
    || bank?.source?.taskPackId !== taskBundle.pack.packId
    || bank?.source?.taskPackSha256 !== fileSha256(taskBundle.packPath)
  ) {
    errors.push("level-check bank source binding is stale");
  }
  if (
    bank?.authorship?.method
      !== "deterministic-source-bound-ai-assisted-objective-item-draft"
    || bank?.authorship?.nativeMandarinReviewer !== null
    || bank?.authorship?.vietnameseEditor !== null
    || bank?.authorship?.assessmentEditor !== null
    || bank?.authorship?.audioRightsReviewer !== null
  ) {
    errors.push("level-check bank must not imply human review");
  }
  if (
    bank?.policy?.reviewedAudioRequiredForScoredListening !== true
    || bank?.policy?.independentAlternateFormRequiredBeforeCalibration !== true
    || bank?.policy?.answersMustBeServerConfidentialBeforeIssuance !== true
    || bank?.policy?.humanReviewDoesNotCalibrate !== true
    || bank?.policy?.calibrationRequiredForMeasurement !== true
    || bank?.policy?.noRuntimeImportBeforeAllGates !== true
  ) {
    errors.push("level-check bank policy must remain fail-closed");
  }
  if (
    bank?.calibration?.required !== true
    || bank?.calibration?.pilotSampleSize !== 0
    || bank?.calibration?.reliabilityEstimate !== null
    || bank?.calibration?.cutScore !== null
  ) {
    errors.push("level-check bank calibration must remain empty");
  }
  if (JSON.stringify(bank?.counts) !== JSON.stringify(EXPECTED_COUNTS)) {
    errors.push("level-check bank counts are invalid");
  }
  if (
    bank?.coverageClaims?.taskScenarioListeningDraftCoverage !== "15/15"
    || bank?.coverageClaims?.taskScenarioReadingDraftCoverage !== "15/15"
    || bank?.coverageClaims?.objectiveItemDraftComplete !== true
    || bank?.coverageClaims?.independentAssessmentFormsComplete !== false
    || bank?.coverageClaims?.reviewedAudioComplete !== false
    || bank?.coverageClaims?.calibratedAssessmentComplete !== false
    || bank?.coverageClaims?.hsk1LevelCheckComplete !== false
  ) {
    errors.push("level-check coverage claims are invalid");
  }

  const blueprint = taskBundle.pack.levelAssessmentBlueprint;
  if (
    blueprint?.objectiveItemBankId !== bank?.bankId
    || blueprint?.sections?.[0]?.authoredItemCount !== 15
    || blueprint?.sections?.[1]?.authoredItemCount !== 15
    || blueprint?.sections?.[2]?.authoredItemCount !== 20
    || blueprint?.sections?.[3]?.authoredItemCount !== 0
  ) {
    errors.push("task assessment blueprint does not match the item bank");
  }

  const items = Array.isArray(bank?.items) ? bank.items : [];
  if (
    items.length !== 50
    || duplicateValues(items.map((item) => item.itemId)).length > 0
    || duplicateValues(items.map((item) => item.itemVersion)).length > 0
    || duplicateValues(items.map((item) => item.exposureGroupId)).length > 0
    || duplicateValues(items.map((item) => item.equivalentGroupId)).length > 0
  ) {
    errors.push("level-check items must have 50 unique identities");
  }
  for (const [sectionId, expectedCount] of Object.entries(
    EXPECTED_SECTION_COUNTS,
  )) {
    if (items.filter((item) => item.sectionId === sectionId).length !==
      expectedCount) {
      errors.push(`${sectionId} item count is invalid`);
    }
  }

  const scenarios = new Map(taskBundle.pack.taskScenarios.map(
    (scenario) => [scenario.officialTaskId, scenario],
  ));
  const lexemes = new Map([
    ...personalBundle.pack.lexemes.map((lexeme) => ({
      lexeme,
      artifactId: personalBundle.pack.packId,
      unitId: personalBundle.pack.unitId,
      lessonId: personalBundle.pack.lessons.find(
        (lesson) => lesson.vocabularyIds.includes(lexeme.officialId),
      )?.lessonId,
    })),
    ...communicativeBundle.collection.packs.flatMap((pack) =>
      pack.lexemes.map((lexeme) => ({
        lexeme,
        artifactId: pack.packId,
        unitId: pack.unitId,
        lessonId: pack.lessons.find(
          (lesson) => lesson.vocabularyIds.includes(lexeme.officialId),
        )?.lessonId,
      }))
    ),
  ].map((entry) => [entry.lexeme.officialId, entry]));
  const grammarDrafts = new Map(grammarBundle.pack.grammarDrafts.map(
    (draft) => [draft.officialGrammarRowId, draft],
  ));
  for (const item of items) {
    const options = Array.isArray(item.options) ? item.options : [];
    const optionIds = options.map((option) => option.optionId);
    const optionTexts = options.map((option) => option.text);
    if (
      !validText(item.itemId, 10, 200)
      || !validText(item.itemVersion, 10, 300)
      || !validText(item.promptVi, 10, 200)
      || options.length !== 4
      || !exactSet(optionIds, ["A", "B", "C", "D"])
      || duplicateValues(optionTexts).length > 0
      || options.filter(
        (option) => option.optionId === item.correctOptionId,
      ).length !== 1
    ) {
      errors.push(`${item.itemId} objective choices are invalid`);
    }
    if (
      item.answerExposure !== "repository-authoring-only"
      || item.reviewStatus !== "pending"
      || item.calibrationStatus !== "uncalibrated"
      || item.scoringPolicy !== "automatic-draft-only"
      || item.measurementEligible !== false
      || item.masteryEligible !== false
      || item.prerequisiteWaiverEligible !== false
      || item.independentFormStatus
        !== "source-exposed-draft-requires-alternate-form"
    ) {
      errors.push(`${item.itemId} eligibility state is invalid`);
    }
    const correctText = options.find(
      (option) => option.optionId === item.correctOptionId,
    )?.text;
    if (item.skill === "listening" || item.skill === "reading") {
      const scenario = scenarios.get(item.source?.entityId);
      const expectedTurnIndex = item.skill === "listening" ? 0 : 2;
      const turn = scenario?.modelDialogue?.turns?.[expectedTurnIndex];
      if (
        !scenario
        || item.source?.artifactId !== taskBundle.pack.packId
        || item.source?.entityType !== "task-dialogue-turn"
        || item.source?.turnIndex !== expectedTurnIndex
        || item.source?.lessonId !== scenario.lessonId
        || item.source?.unitId !== scenario.unitId
        || correctText !== turn?.meaningVi
      ) {
        errors.push(`${item.itemId} task dialogue binding is stale`);
      }
      if (item.skill === "listening") {
        if (
          item.sectionId !== "listening-objective"
          || item.modality !== "recorded-audio-selection-pending"
          || item.stimulus?.audio !== null
          || item.stimulus?.audioRequirement
            !== "reviewed-human-or-licensed-recording"
          || item.stimulus?.authoringPreview !== "synthetic-browser-voice"
          || item.stimulus?.transcriptHanzi !== turn?.hanzi
          || item.stimulus?.transcriptPinyin !== turn?.pinyin
          || item.stimulus?.transcriptReview !== "pending"
        ) {
          errors.push(`${item.itemId} listening stimulus is invalid`);
        }
      } else if (
        item.sectionId !== "reading-objective"
        || item.modality !== "visual-selection"
        || item.stimulus?.kind !== "hanzi-text"
        || item.stimulus?.text !== turn?.hanzi
      ) {
        errors.push(`${item.itemId} reading stimulus is invalid`);
      }
    } else if (item.skill === "vocabulary") {
      const entry = lexemes.get(item.source?.entityId);
      const lexeme = entry?.lexeme;
      if (
        item.sectionId !== "vocabulary-grammar-objective"
        || item.source?.entityType !== "vocabulary-draft"
        || !lexeme
        || item.source?.artifactId !== entry.artifactId
        || item.source?.lessonId !== entry.lessonId
        || item.source?.unitId !== entry.unitId
        || item.stimulus?.text !== lexeme.simplified
        || item.stimulus?.pinyinAuthoringReference !== lexeme.pinyin
        || correctText !== lexeme.vietnameseGlossDraft
      ) {
        errors.push(`${item.itemId} vocabulary binding is stale`);
      }
    } else if (item.skill === "grammar") {
      const draft = grammarDrafts.get(item.source?.entityId);
      if (
        item.sectionId !== "vocabulary-grammar-objective"
        || item.source?.artifactId !== grammarBundle.pack.packId
        || item.source?.entityType !== "grammar-model-example"
        || !draft
        || item.source?.lessonId !== draft.lessonId
        || item.source?.unitId !== draft.unitId
        || item.stimulus?.text !== draft.modelExample.hanzi
        || item.stimulus?.pinyinAuthoringReference
          !== draft.modelExample.pinyin
        || item.stimulus?.officialGrammarContentAuthoringReference
          !== draft.officialContent
        || correctText !== draft.modelExample.meaningVi
      ) {
        errors.push(`${item.itemId} grammar binding is stale`);
      }
    } else {
      errors.push(`${item.itemId} has an unsupported skill`);
    }
  }
  const taskIds = taskBundle.pack.taskScenarios.map(
    (scenario) => scenario.officialTaskId,
  );
  for (const skill of ["listening", "reading"]) {
    const covered = items.filter((item) => item.skill === skill).map(
      (item) => item.source.entityId,
    );
    if (!exactSet(covered, taskIds)) {
      errors.push(`${skill} items must cover every HSK1 task exactly once`);
    }
  }
  if (
    items.filter((item) => item.skill === "vocabulary").length !== 10
    || items.filter((item) => item.skill === "grammar").length !== 10
  ) {
    errors.push("vocabulary/grammar sample split must remain 10/10");
  }

  const batches = Array.isArray(bank?.reviewBatches)
    ? bank.reviewBatches
    : [];
  const batchedItemIds = batches.flatMap((batch) => batch.itemIds ?? []);
  if (
    batches.length !== 10
    || batches.some(
      (batch) =>
        batch.state !== "pending"
        || batch.itemIds?.length !== 5
        || batch.requiredRoles?.length < 3
        || !Array.isArray(batch.approvals)
        || batch.approvals.length !== 0,
    )
    || !exactSet(batchedItemIds, items.map((item) => item.itemId))
    || duplicateValues(batchedItemIds).length > 0
  ) {
    errors.push("level-check review batches must partition all items once");
  }
  for (const batch of batches) {
    const batchItemIds = Array.isArray(batch.itemIds) ? batch.itemIds : [];
    const requiredRoles = Array.isArray(batch.requiredRoles)
      ? batch.requiredRoles
      : [];
    const batchItems = batchItemIds.map(
      (itemId) => items.find((item) => item.itemId === itemId),
    );
    if (
      batchItems.some((item) => !item || item.sectionId !== batch.sectionId)
      || (batch.sectionId === "listening-objective"
        && (
          batch.reviewedAudioRequired !== true
          || !requiredRoles.includes("audio-rights-reviewer")
        ))
      || (batch.sectionId !== "listening-objective"
        && batch.reviewedAudioRequired !== undefined)
    ) {
      errors.push(`${batch.batchId} review scope is invalid`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: bank?.counts,
  };
};

export const assertValidHsk1LevelCheckItemBankBundle = (bundle) => {
  const result = validateHsk1LevelCheckItemBankBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK1 level-check item bank:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
