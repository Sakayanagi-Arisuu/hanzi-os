import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk1CurriculumScopeBundle,
  loadHsk1CurriculumScopeBundle,
} from "./hsk1CurriculumScope.mjs";
import {
  assertValidHsk1PersonalExchangePackBundle,
  loadHsk1PersonalExchangePackBundle,
} from "./hsk1PersonalExchangePack.mjs";
import {
  assertValidHsk1CommunicativeUnitPacksBundle,
  loadHsk1CommunicativeUnitPacksBundle,
} from "./hsk1CommunicativeUnitPacks.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK1_CHARACTER_FOUNDATION_PACK_RELATIVE_PATH =
  "content/drafts/hsk1-character-foundation-2026.07.json";

const EXPECTED_CONTEXT_UNITS = [
  "hsk1-personal-exchange",
  "hsk1-time-place-events",
  "hsk1-daily-life",
  "hsk1-travel-leisure",
  "hsk1-study-work",
];
const EXPECTED_KINDS = [
  "character-in-word-recognition",
  "glyph-copy-self-check",
];
const REQUIRED_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "character-pedagogy-reviewer",
];

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const duplicateValues = (values) => {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
};
const exactSet = (left, right) =>
  JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());

export const loadHsk1CharacterFoundationPackBundle = (
  root = process.cwd(),
) => {
  const scopeBundle = loadHsk1CurriculumScopeBundle(root);
  const personalBundle = loadHsk1PersonalExchangePackBundle(root);
  const communicativeBundle = loadHsk1CommunicativeUnitPacksBundle(root);
  const packPath = join(root, HSK1_CHARACTER_FOUNDATION_PACK_RELATIVE_PATH);
  return {
    scopeBundle,
    personalBundle,
    communicativeBundle,
    packPath,
    pack: JSON.parse(readFileSync(packPath, "utf8")),
  };
};

const validateExactPartition = ({ errors, label, actual, expected }) => {
  if (duplicateValues(actual).length > 0 || !exactSet(actual, expected)) {
    errors.push(`${label} must exactly partition the HSK1 character scope`);
  }
};

export const validateHsk1CharacterFoundationPackBundle = ({
  scopeBundle,
  personalBundle,
  communicativeBundle,
  pack,
}) => {
  const errors = [];
  try {
    assertValidHsk1CurriculumScopeBundle(scopeBundle);
    assertValidHsk1PersonalExchangePackBundle(personalBundle);
    assertValidHsk1CommunicativeUnitPacksBundle(communicativeBundle);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (!isRecord(pack) || pack.schemaVersion !== 1) {
    return { valid: false, errors: ["HSK1 character pack schemaVersion must be 1"] };
  }
  const characterScope = scopeBundle.scope.unitScopes.find(
    (unit) => unit.unitId === "hsk1-character-foundation",
  );
  if (
    pack.unitId !== "hsk1-character-foundation"
    || pack.state !== "ai-assisted-draft"
    || pack.learnerVisible !== false
    || pack.releaseEligible !== false
  ) {
    errors.push("character pack must remain learner-hidden AI-assisted draft");
  }
  if (
    pack.source?.scopeId !== scopeBundle.scope.scopeId
    || pack.source?.scopeSha256 !== fileSha256(scopeBundle.scopePath)
    || pack.source?.syllabusInventorySha256
      !== scopeBundle.graphBundle.syllabus.inventorySha256
    || pack.source?.personalExchangePackId !== personalBundle.pack.packId
    || pack.source?.personalExchangePackSha256
      !== fileSha256(personalBundle.packPath)
    || pack.source?.communicativeCollectionId
      !== communicativeBundle.collection.collectionId
    || pack.source?.communicativeCollectionSha256
      !== fileSha256(communicativeBundle.collectionPath)
  ) {
    errors.push("character pack source binding is stale");
  }
  if (
    pack.authorship?.method
      !== "deterministic-context-mapping-with-ai-assisted-draft-instructions"
    || pack.authorship?.nativeMandarinReviewer !== null
    || pack.authorship?.vietnameseEditor !== null
    || pack.authorship?.characterPedagogyReviewer !== null
  ) {
    errors.push("character pack must not imply human review");
  }
  if (
    pack.reviewPolicy?.nativeMandarinRequiredForRelease !== true
    || pack.reviewPolicy?.vietnameseEditorialRequiredForRelease !== true
    || pack.reviewPolicy?.characterPedagogyReviewRequiredForRelease !== true
    || pack.reviewPolicy?.strokeMetadataRequiredBeforeStrokeOrderInstruction
      !== true
  ) {
    errors.push("character pack review policy must remain fail-closed");
  }
  if (
    pack.mappingPolicy?.primaryContext
      !== "earliest-official-hsk1-vocabulary-containing-character"
    || pack.mappingPolicy?.characterCardinality !== "exactly-one-lesson"
    || pack.mappingPolicy?.recognitionDoesNotInferWriting !== true
  ) {
    errors.push("character pack mapping policy is invalid");
  }
  if (
    pack.coverageClaims?.officialRecognitionInventoryDraftMapped !== true
    || pack.coverageClaims?.vocabularyContextCoverageComplete !== true
    || pack.coverageClaims?.strokeMetadataComplete !== false
    || pack.coverageClaims?.reviewedCharacterContentComplete !== false
    || pack.coverageClaims?.writingMasteryCoverageComplete !== false
    || pack.coverageClaims?.hsk1Complete !== false
  ) {
    errors.push("character pack coverage claims are invalid");
  }
  if (!characterScope) {
    errors.push("HSK1 character-foundation scope is missing");
    return { valid: false, errors };
  }

  const officialCharacterById = new Map(
    scopeBundle.graphBundle.syllabus.inventory.recognitionCharacters.map(
      (item) => [item.id, item],
    ),
  );
  const officialVocabularyById = new Map(
    scopeBundle.graphBundle.syllabus.inventory.vocabulary.map(
      (item) => [item.id, item],
    ),
  );
  const lexemeById = new Map([
    ...personalBundle.pack.lexemes.map((lexeme) => [
      lexeme.officialId,
      { ...lexeme, contextUnitId: personalBundle.pack.unitId },
    ]),
    ...communicativeBundle.collection.packs.flatMap((unitPack) =>
      unitPack.lexemes.map((lexeme) => [
        lexeme.officialId,
        { ...lexeme, contextUnitId: unitPack.unitId },
      ])
    ),
  ]);
  if (!Array.isArray(pack.characters)) {
    errors.push("character drafts must be an array");
  } else {
    validateExactPartition({
      errors,
      label: "character drafts",
      actual: pack.characters.map((item) => item.officialCharacterId),
      expected: characterScope.recognitionCharacterIds,
    });
    for (const item of pack.characters) {
      const official = officialCharacterById.get(item.officialCharacterId);
      const primaryVocabulary = officialVocabularyById.get(
        item.primaryContext?.officialVocabularyId,
      );
      const primaryLexeme = lexemeById.get(
        item.primaryContext?.officialVocabularyId,
      );
      const expectedContextIds = official
        ? scopeBundle.graphBundle.syllabus.inventory.vocabulary.filter(
            (vocabulary) =>
              vocabulary.level === 1
              && vocabulary.word.includes(official.character),
          ).map((vocabulary) => vocabulary.id)
        : [];
      if (
        !official
        || item.character !== official.character
        || item.officialSequence !== official.sequence
        || item.sourcePage !== official.sourcePage
      ) {
        errors.push(`${item.officialCharacterId} official binding is stale`);
        continue;
      }
      if (
        !primaryVocabulary
        || !primaryLexeme
        || primaryVocabulary.level !== 1
        || !primaryVocabulary.word.includes(item.character)
        || item.primaryContextUnitId !== primaryLexeme.contextUnitId
        || item.primaryContext.simplified !== primaryLexeme.simplified
        || item.primaryContext.pinyin !== primaryLexeme.pinyin
        || item.primaryContext.vietnameseGlossDraft
          !== primaryLexeme.vietnameseGlossDraft
        || !exactSet(item.contextVocabularyIds ?? [], expectedContextIds)
        || item.primaryContext.officialVocabularyId !== expectedContextIds[0]
      ) {
        errors.push(`${item.officialCharacterId} vocabulary context is invalid`);
      }
      if (
        item.linguisticMetadata?.radical !== null
        || item.linguisticMetadata?.strokeCount !== null
        || item.linguisticMetadata?.strokeDataRef !== null
        || item.linguisticMetadata?.state
          !== "source-not-pinned-for-complete-hsk1-inventory"
      ) {
        errors.push(`${item.officialCharacterId} must not invent stroke metadata`);
      }
      if (
        item.review?.machineAssembled !== true
        || item.review?.nativeMandarinReview !== "pending"
        || item.review?.vietnameseEditorialReview !== "pending"
        || item.review?.characterPedagogyReview !== "pending"
      ) {
        errors.push(`${item.officialCharacterId} review state must remain pending`);
      }
    }
  }

  if (!Array.isArray(pack.lessons) || pack.lessons.length !== 15) {
    errors.push("character pack must contain exactly 15 lessons");
  } else {
    const lessonIds = pack.lessons.map((lesson) => lesson.lessonId);
    if (duplicateValues(lessonIds).length > 0) {
      errors.push("character lesson IDs must be unique");
    }
    let lastContextIndex = -1;
    for (const [index, lesson] of pack.lessons.entries()) {
      const contextIndex = EXPECTED_CONTEXT_UNITS.indexOf(lesson.contextUnitId);
      const expectedPrerequisites = index === 0 ? [] : [lessonIds[index - 1]];
      if (
        lesson.sequence !== index + 1
        || JSON.stringify(lesson.prerequisiteLessonIds)
          !== JSON.stringify(expectedPrerequisites)
        || contextIndex < lastContextIndex
        || typeof lesson.titleVi !== "string"
        || lesson.titleVi.length < 3
        || typeof lesson.objectiveVi !== "string"
        || lesson.objectiveVi.length < 20
      ) {
        errors.push(`${lesson.lessonId} sequence, context or objective is invalid`);
      }
      lastContextIndex = contextIndex;
      if (
        JSON.stringify(lesson.practiceBlueprint?.requiredKinds)
          !== JSON.stringify(EXPECTED_KINDS)
        || lesson.practiceBlueprint?.authoredItemCount
          !== lesson.officialCharacterIds.length * 2
        || lesson.practiceBlueprint?.strokeOrderTaught !== false
        || lesson.practiceBlueprint?.grantsMastery !== false
      ) {
        errors.push(`${lesson.lessonId} practice blueprint is invalid`);
      }
      const characterById = new Map(
        (pack.characters ?? []).map((item) => [
          item.officialCharacterId,
          item,
        ]),
      );
      if (lesson.officialCharacterIds.some(
        (id) => characterById.get(id)?.primaryContextUnitId !== lesson.contextUnitId,
      )) {
        errors.push(`${lesson.lessonId} contains a character from another context unit`);
      }
    }
    validateExactPartition({
      errors,
      label: "character lessons",
      actual: pack.lessons.flatMap(
        (lesson) => lesson.officialCharacterIds ?? [],
      ),
      expected: characterScope.recognitionCharacterIds,
    });
  }

  const characterById = new Map(
    (pack.characters ?? []).map((item) => [
      item.officialCharacterId,
      item,
    ]),
  );
  const lessonById = new Map(
    (pack.lessons ?? []).map((lesson) => [lesson.lessonId, lesson]),
  );
  if (
    !Array.isArray(pack.practiceItems)
    || pack.practiceItems.length !== 492
  ) {
    errors.push("character pack must contain 492 practice items");
  } else {
    if (duplicateValues(pack.practiceItems.map((item) => item.itemId)).length > 0) {
      errors.push("character practice item IDs must be unique");
    }
    for (const characterId of characterScope.recognitionCharacterIds) {
      const kinds = pack.practiceItems.filter(
        (item) => item.officialCharacterId === characterId,
      ).map((item) => item.kind);
      if (!exactSet(kinds, EXPECTED_KINDS)) {
        errors.push(`${characterId} must have both character practice kinds`);
      }
    }
    for (const item of pack.practiceItems) {
      const character = characterById.get(item.officialCharacterId);
      const lesson = lessonById.get(item.lessonId);
      if (
        !character
        || !lesson
        || !lesson.officialCharacterIds.includes(item.officialCharacterId)
      ) {
        errors.push(`${item.itemId} character or lesson binding is invalid`);
        continue;
      }
      if (
        item.review !== "pending"
        || item.measurementEligible !== false
        || item.masteryEligible !== false
      ) {
        errors.push(`${item.itemId} must remain pending and mastery-ineligible`);
      }
      if (item.kind === "character-in-word-recognition") {
        if (
          item.prompt !== `Chọn từ chứa chữ “${character.character}”.`
          || !Array.isArray(item.options)
          || item.options.length !== 4
          || new Set(item.options).size !== 4
          || item.correctAnswer !== character.primaryContext.simplified
          || !item.options.includes(item.correctAnswer)
          || item.options.filter(
            (option) => option.includes(character.character),
          ).length !== 1
          || item.contextPinyin !== character.primaryContext.pinyin
          || item.contextMeaningViDraft
            !== character.primaryContext.vietnameseGlossDraft
          || item.scoringPolicy !== "automatic-draft-only"
        ) {
          errors.push(`${item.itemId} context-recognition content is invalid`);
        }
      } else if (item.kind === "glyph-copy-self-check") {
        if (
          item.prompt !== "Nhìn mẫu, che mẫu rồi tự chép lại chữ."
          || item.modelGlyph !== character.character
          || item.scoringPolicy !== "self-reveal-only"
          || item.strokeOrderAssessed !== false
          || JSON.stringify(item.selfCheckCriteria) !== JSON.stringify([
            "recognizable-overall-shape",
            "approximate-proportion",
          ])
        ) {
          errors.push(`${item.itemId} copy self-check content is invalid`);
        }
      } else {
        errors.push(`${item.itemId} has unsupported practice kind ${item.kind}`);
      }
    }
  }

  if (
    !Array.isArray(pack.reviewBatches)
    || pack.reviewBatches.length !== 15
  ) {
    errors.push("character pack must have one review batch per lesson");
  } else {
    if (!exactSet(
      pack.reviewBatches.map((batch) => batch.lessonId),
      [...lessonById.keys()],
    )) {
      errors.push("character review batches must cover every lesson once");
    }
    for (const batch of pack.reviewBatches) {
      const lesson = lessonById.get(batch.lessonId);
      const expectedItemIds = (pack.practiceItems ?? []).filter(
        (item) => item.lessonId === batch.lessonId,
      ).map((item) => item.itemId);
      if (
        !lesson
        || !exactSet(batch.characterIds ?? [], lesson.officialCharacterIds)
        || !exactSet(batch.practiceItemIds ?? [], expectedItemIds)
        || JSON.stringify(batch.requiredRoles)
          !== JSON.stringify(REQUIRED_ROLES)
        || batch.state !== "pending"
        || !Array.isArray(batch.approvals)
        || batch.approvals.length !== 0
      ) {
        errors.push(`${batch.batchId} review batch is incomplete or pre-approved`);
      }
    }
  }

  if (
    Array.isArray(pack.characters)
    && Array.isArray(pack.lessons)
    && Array.isArray(pack.practiceItems)
    && Array.isArray(pack.reviewBatches)
  ) {
    const expectedCounts = {
      lessons: pack.lessons.length,
      characterDrafts: pack.characters.length,
      charactersWithVocabularyContext: pack.characters.filter(
        (item) => item.contextVocabularyIds.length > 0,
      ).length,
      charactersWithPinnedStrokeMetadata: pack.characters.filter(
        (item) => item.linguisticMetadata.strokeDataRef !== null,
      ).length,
      authoredPracticeItems: pack.practiceItems.length,
      characterInWordRecognitionItems: pack.practiceItems.filter(
        (item) => item.kind === "character-in-word-recognition",
      ).length,
      glyphCopySelfCheckItems: pack.practiceItems.filter(
        (item) => item.kind === "glyph-copy-self-check",
      ).length,
      reviewBatches: pack.reviewBatches.length,
      releaseEligibleItems: 0,
    };
    if (JSON.stringify(pack.counts) !== JSON.stringify(expectedCounts)) {
      errors.push("character pack counts do not match its content");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: pack.counts,
  };
};

export const assertValidHsk1CharacterFoundationPackBundle = (bundle) => {
  const result = validateHsk1CharacterFoundationPackBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK1 character-foundation pack:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
