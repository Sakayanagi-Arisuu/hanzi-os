import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertValidHsk1CommunicativeUnitPacksBundle,
  loadHsk1CommunicativeUnitPacksBundle,
} from "./hsk1CommunicativeUnitPacks.mjs";
import {
  assertValidHsk1PersonalExchangePackBundle,
  loadHsk1PersonalExchangePackBundle,
} from "./hsk1PersonalExchangePack.mjs";
import {
  assertValidHsk2LessonBlueprintsBundle,
  loadHsk2LessonBlueprintsBundle,
} from "./hsk2LessonBlueprints.mjs";
import {
  assertValidHsk2VocabularyPracticeBundle,
  loadHsk2VocabularyPracticeBundle,
} from "./hsk2VocabularyPractice.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK2_CHARACTER_PRACTICE_RELATIVE_PATH =
  "content/drafts/hsk2-character-practice-2026.07.json";
export const HSK2_CHARACTER_HSK1_SOURCE_SNAPSHOTS = Object.freeze({
  personal:
    "sha256:3518d598a8cea63a65029c0ddbc9526fe98baab0a142bfab40c60aa9070c9969",
  communicative:
    "sha256:1bd7f00b2d56f810f482ba3f390a73b3675b0ec4a50161c6886d1ccd094ea244",
});

const REQUIRED_ROLES = [
  "native-mandarin-reviewer",
  "vietnamese-editor",
  "character-pedagogy-reviewer",
];
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

export const loadHsk2CharacterPracticeBundle = (root = process.cwd()) => {
  const blueprintBundle = loadHsk2LessonBlueprintsBundle(root);
  const hsk2VocabularyBundle = loadHsk2VocabularyPracticeBundle(root);
  const hsk1PersonalBundle = loadHsk1PersonalExchangePackBundle(root);
  const hsk1CommunicativeBundle =
    loadHsk1CommunicativeUnitPacksBundle(root);
  const packPath = join(root, HSK2_CHARACTER_PRACTICE_RELATIVE_PATH);
  return {
    blueprintBundle,
    hsk2VocabularyBundle,
    hsk1PersonalBundle,
    hsk1CommunicativeBundle,
    packPath,
    pack: JSON.parse(readFileSync(packPath, "utf8")),
  };
};

export const validateHsk2CharacterPracticeBundle = ({
  blueprintBundle,
  hsk2VocabularyBundle,
  hsk1PersonalBundle,
  hsk1CommunicativeBundle,
  pack,
}) => {
  const errors = [];
  try {
    assertValidHsk2LessonBlueprintsBundle(blueprintBundle);
    assertValidHsk2VocabularyPracticeBundle(hsk2VocabularyBundle);
    assertValidHsk1PersonalExchangePackBundle(hsk1PersonalBundle);
    assertValidHsk1CommunicativeUnitPacksBundle(hsk1CommunicativeBundle);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  if (!isRecord(pack) || pack.schemaVersion !== 1) {
    return {
      valid: false,
      errors: ["HSK2 character-practice pack schemaVersion must be 1"],
    };
  }
  if (
    pack.packId !== "hsk2-character-practice-2026.07"
    || pack.level !== 2
    || pack.state !== "ai-assisted-draft"
    || pack.learnerVisible !== false
    || pack.releaseEligible !== false
  ) {
    errors.push("HSK2 character practice must remain learner-hidden draft");
  }
  if (
    pack.source?.syllabusInventorySha256
      !== blueprintBundle.scopeBundle.graphBundle.syllabus.inventorySha256
    || pack.source?.lessonBlueprintPackId !== blueprintBundle.pack.packId
    || pack.source?.lessonBlueprintPackSha256
      !== fileSha256(blueprintBundle.packPath)
    || pack.source?.hsk2VocabularyPracticePackId
      !== hsk2VocabularyBundle.pack.packId
    || pack.source?.hsk2VocabularyPracticePackSha256
      !== fileSha256(hsk2VocabularyBundle.packPath)
    || pack.source?.hsk1PersonalPackSha256
      !== HSK2_CHARACTER_HSK1_SOURCE_SNAPSHOTS.personal
    || pack.source?.hsk1CommunicativePackSha256
      !== HSK2_CHARACTER_HSK1_SOURCE_SNAPSHOTS.communicative
  ) {
    errors.push("HSK2 character-practice source binding is stale");
  }
  if (
    pack.authorship?.method
      !== "deterministic-context-mapping-with-ai-assisted-draft-instructions"
    || pack.authorship?.nativeMandarinReviewer !== null
    || pack.authorship?.vietnameseEditor !== null
    || pack.authorship?.characterPedagogyReviewer !== null
  ) {
    errors.push("HSK2 character-practice authorship must not imply review");
  }
  if (
    pack.reviewPolicy?.nativeMandarinRequiredForRelease !== true
    || pack.reviewPolicy?.vietnameseEditorialRequiredForRelease !== true
    || pack.reviewPolicy?.characterPedagogyReviewRequiredForRelease !== true
    || pack.reviewPolicy?.strokeMetadataRequiredBeforeStrokeOrderInstruction
      !== true
  ) {
    errors.push("HSK2 character-practice review policy must remain fail-closed");
  }
  if (
    pack.mappingPolicy?.primaryContext
      !== "earliest-official-hsk1-2-vocabulary-containing-character"
    || pack.mappingPolicy?.missingContextHandling
      !== "isolated-recognition-with-explicit-gap"
    || pack.mappingPolicy?.characterCardinality
      !== "exactly-one-production-lesson"
    || pack.mappingPolicy?.recognitionDoesNotInferWriting !== true
  ) {
    errors.push("HSK2 character-practice mapping policy is invalid");
  }
  if (
    pack.coverageClaims?.officialRecognitionInventoryDraftMapped !== true
    || pack.coverageClaims?.vocabularyContextCoverageComplete !== false
    || pack.coverageClaims?.strokeMetadataComplete !== false
    || pack.coverageClaims?.reviewedCharacterContentComplete !== false
    || pack.coverageClaims?.writingMasteryCoverageComplete !== false
    || pack.coverageClaims?.hsk2Complete !== false
  ) {
    errors.push("HSK2 character-practice coverage claims are invalid");
  }

  const inventory =
    blueprintBundle.scopeBundle.graphBundle.syllabus.inventory;
  const officialCharacters = inventory.recognitionCharacters.filter(
    (item) => item.level === 2,
  );
  const officialCharacterById = new Map(
    officialCharacters.map((item) => [item.id, item]),
  );
  const officialVocabulary = inventory.vocabulary.filter(
    (item) => item.level <= 2,
  );
  const lexemeById = new Map([
    ...hsk1PersonalBundle.pack.lexemes.map(
      (lexeme) => [lexeme.officialId, { ...lexeme, level: 1 }],
    ),
    ...hsk1CommunicativeBundle.collection.packs.flatMap((unitPack) =>
      unitPack.lexemes.map(
        (lexeme) => [lexeme.officialId, { ...lexeme, level: 1 }],
      )
    ),
    ...hsk2VocabularyBundle.pack.lexemes.map(
      (lexeme) => [lexeme.officialId, { ...lexeme, level: 2 }],
    ),
  ]);
  const productionLessons = blueprintBundle.pack.lessons.filter(
    (lesson) => lesson.blueprintKind === "short-text-production",
  );
  const lessonById = new Map(
    productionLessons.map((lesson) => [lesson.lessonId, lesson]),
  );
  const expectedLessonByCharacterId = new Map(
    productionLessons.flatMap((lesson) =>
      lesson.inventoryMappings.recognitionCharacterIds.map(
        (officialId) => [officialId, lesson.lessonId],
      )
    ),
  );
  const characters = Array.isArray(pack.characters) ? pack.characters : [];
  if (
    characters.length !== 125
    || duplicateValues(characters.map(
      (item) => item.officialCharacterId,
    )).length > 0
    || !exactSet(
      characters.map((item) => item.officialCharacterId),
      officialCharacterById.keys(),
    )
  ) {
    errors.push("HSK2 character drafts must exactly partition 125 records");
  }
  for (const item of characters) {
    const official = officialCharacterById.get(item.officialCharacterId);
    const expectedContextIds = official
      ? officialVocabulary.filter(
          (vocabulary) => vocabulary.word.includes(official.character),
        ).map((vocabulary) => vocabulary.id)
      : [];
    const primaryLexeme = expectedContextIds.length > 0
      ? lexemeById.get(expectedContextIds[0])
      : null;
    if (
      !official
      || item.officialSequence !== official.sequence
      || item.character !== official.character
      || item.sourcePage !== official.sourcePage
      || item.lessonId !== expectedLessonByCharacterId.get(official.id)
      || !exactArray(item.contextVocabularyIds, expectedContextIds)
    ) {
      errors.push(`${item.officialCharacterId} official or lesson binding is stale`);
      continue;
    }
    if (primaryLexeme) {
      if (
        item.contextState !== "cumulative-hsk1-2-vocabulary-context"
        || item.primaryContext?.officialVocabularyId !== primaryLexeme.officialId
        || item.primaryContext?.level !== primaryLexeme.level
        || item.primaryContext?.simplified !== primaryLexeme.simplified
        || item.primaryContext?.pinyin !== primaryLexeme.pinyin
        || item.primaryContext?.vietnameseGlossDraft
          !== primaryLexeme.vietnameseGlossDraft
      ) {
        errors.push(`${item.officialCharacterId} vocabulary context is invalid`);
      }
    } else if (
      item.contextState !== "no-hsk1-2-vocabulary-context"
      || item.primaryContext !== null
    ) {
      errors.push(`${item.officialCharacterId} missing context is not explicit`);
    }
    if (
      item.linguisticMetadata?.radical !== null
      || item.linguisticMetadata?.strokeCount !== null
      || item.linguisticMetadata?.strokeDataRef !== null
      || item.linguisticMetadata?.state
        !== "source-not-pinned-for-complete-hsk2-inventory"
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

  const assignments = Array.isArray(pack.lessonAssignments)
    ? pack.lessonAssignments
    : [];
  if (
    assignments.length !== 10
    || !exactSet(
      assignments.map((assignment) => assignment.lessonId),
      lessonById.keys(),
    )
    || duplicateValues(assignments.flatMap(
      (assignment) => assignment.characterIds ?? [],
    )).length > 0
    || !exactSet(
      assignments.flatMap((assignment) => assignment.characterIds ?? []),
      officialCharacterById.keys(),
    )
  ) {
    errors.push("HSK2 character assignments must cover ten production lessons");
  }
  for (const assignment of assignments) {
    const lesson = lessonById.get(assignment.lessonId);
    if (
      !lesson
      || !exactArray(
        assignment.characterIds,
        lesson.inventoryMappings.recognitionCharacterIds,
      )
      || assignment.practiceItemIds?.length
        !== assignment.characterIds.length * 2
    ) {
      errors.push(`${assignment.lessonId} character assignment is invalid`);
    }
  }

  const characterById = new Map(
    characters.map((item) => [item.officialCharacterId, item]),
  );
  const practiceItems = Array.isArray(pack.practiceItems)
    ? pack.practiceItems
    : [];
  if (
    practiceItems.length !== 250
    || duplicateValues(practiceItems.map((item) => item.itemId)).length > 0
  ) {
    errors.push("HSK2 character practice must contain 250 unique items");
  }
  for (const item of practiceItems) {
    const character = characterById.get(item.officialCharacterId);
    const lesson = lessonById.get(item.lessonId);
    if (
      !character
      || !lesson
      || character.lessonId !== item.lessonId
      || item.review !== "pending"
      || item.measurementEligible !== false
      || item.masteryEligible !== false
      || item.releaseEligible !== false
    ) {
      errors.push(`${item.itemId} identity or eligibility is invalid`);
      continue;
    }
    if (item.kind === "character-in-word-recognition") {
      if (
        !character.primaryContext
        || item.prompt !== `Chọn từ chứa chữ “${character.character}”.`
        || item.correctAnswer !== character.primaryContext.simplified
        || item.contextPinyin !== character.primaryContext.pinyin
        || item.contextMeaningViDraft
          !== character.primaryContext.vietnameseGlossDraft
        || !Array.isArray(item.options)
        || item.options.length !== 4
        || new Set(item.options).size !== 4
        || !item.options.includes(item.correctAnswer)
        || item.options.filter(
          (option) => option.includes(character.character),
        ).length !== 1
        || item.scoringPolicy !== "automatic-draft-only"
      ) {
        errors.push(`${item.itemId} contextual recognition is invalid`);
      }
    } else if (item.kind === "isolated-character-recognition") {
      if (
        character.primaryContext !== null
        || item.prompt !== `Chọn đúng chữ “${character.character}”.`
        || item.correctAnswer !== character.character
        || item.contextReason !== "no-hsk1-2-vocabulary-context"
        || !Array.isArray(item.options)
        || item.options.length !== 4
        || new Set(item.options).size !== 4
        || !item.options.includes(item.correctAnswer)
        || item.scoringPolicy !== "automatic-draft-only"
      ) {
        errors.push(`${item.itemId} isolated recognition is invalid`);
      }
    } else if (item.kind === "glyph-copy-self-check") {
      if (
        item.prompt !== "Nhìn mẫu, che mẫu rồi tự chép lại chữ."
        || item.modelGlyph !== character.character
        || !exactArray(item.selfCheckCriteria, [
          "recognizable-overall-shape",
          "approximate-proportion",
        ])
        || item.scoringPolicy !== "self-reveal-only"
        || item.strokeOrderAssessed !== false
      ) {
        errors.push(`${item.itemId} glyph-copy self-check is invalid`);
      }
    } else {
      errors.push(`${item.itemId} has an unsupported character-practice kind`);
    }
  }
  for (const character of characters) {
    const kinds = practiceItems.filter(
      (item) => item.officialCharacterId === character.officialCharacterId,
    ).map((item) => item.kind);
    const expectedRecognitionKind = character.primaryContext
      ? "character-in-word-recognition"
      : "isolated-character-recognition";
    if (!exactSet(kinds, [
      expectedRecognitionKind,
      "glyph-copy-self-check",
    ])) {
      errors.push(`${character.officialCharacterId} must have two practice kinds`);
    }
  }
  const assignedItemIds = assignments.flatMap(
    (assignment) => assignment.practiceItemIds ?? [],
  );
  if (
    duplicateValues(assignedItemIds).length > 0
    || !exactSet(
      assignedItemIds,
      practiceItems.map((item) => item.itemId),
    )
  ) {
    errors.push("HSK2 character assignments must partition practice items");
  }

  const reviewBatches = Array.isArray(pack.reviewBatches)
    ? pack.reviewBatches
    : [];
  if (
    reviewBatches.length !== 10
    || !exactSet(
      reviewBatches.map((batch) => batch.lessonId),
      lessonById.keys(),
    )
  ) {
    errors.push("HSK2 character review batches must cover ten lessons");
  }
  for (const batch of reviewBatches) {
    const assignment = assignments.find(
      (candidate) => candidate.lessonId === batch.lessonId,
    );
    if (
      !assignment
      || !exactArray(batch.characterIds, assignment.characterIds)
      || !exactArray(batch.practiceItemIds, assignment.practiceItemIds)
      || !exactArray(batch.requiredRoles, REQUIRED_ROLES)
      || batch.state !== "pending"
      || !exactArray(batch.approvals, [])
    ) {
      errors.push(`${batch.batchId} character review batch is invalid`);
    }
  }

  const expectedCounts = {
    lessons: assignments.length,
    characterDrafts: characters.length,
    charactersWithVocabularyContext: characters.filter(
      (item) => item.primaryContext !== null,
    ).length,
    charactersWithoutVocabularyContext: characters.filter(
      (item) => item.primaryContext === null,
    ).length,
    charactersWithPinnedStrokeMetadata: 0,
    authoredPracticeItems: practiceItems.length,
    characterInWordRecognitionItems: practiceItems.filter(
      (item) => item.kind === "character-in-word-recognition",
    ).length,
    isolatedCharacterRecognitionItems: practiceItems.filter(
      (item) => item.kind === "isolated-character-recognition",
    ).length,
    glyphCopySelfCheckItems: practiceItems.filter(
      (item) => item.kind === "glyph-copy-self-check",
    ).length,
    reviewBatches: reviewBatches.length,
    approvals: 0,
    measurementEligibleItems: 0,
    masteryEligibleItems: 0,
    releaseEligibleItems: 0,
  };
  if (!exactArray(pack.counts, expectedCounts)) {
    errors.push("HSK2 character-practice summary counts are stale");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expectedCounts,
  };
};

export const assertValidHsk2CharacterPracticeBundle = (bundle) => {
  const result = validateHsk2CharacterPracticeBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK2 character practice:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
