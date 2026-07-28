import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHsk1CommunicativeUnitPacksBundle,
  loadHsk1CommunicativeUnitPacksBundle,
} from "../../src/content/hsk1CommunicativeUnitPacks.mjs";
import {
  assertValidHsk1PersonalExchangePackBundle,
  loadHsk1PersonalExchangePackBundle,
} from "../../src/content/hsk1PersonalExchangePack.mjs";
import {
  HSK2_CHARACTER_PRACTICE_RELATIVE_PATH,
} from "../../src/content/hsk2CharacterPractice.mjs";
import {
  assertValidHsk2LessonBlueprintsBundle,
  loadHsk2LessonBlueprintsBundle,
} from "../../src/content/hsk2LessonBlueprints.mjs";
import {
  assertValidHsk2VocabularyPracticeBundle,
  loadHsk2VocabularyPracticeBundle,
} from "../../src/content/hsk2VocabularyPractice.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

const pickWordDistractors = ({
  lexemes,
  targetCharacter,
  correctWord,
  startIndex,
}) => {
  const distractors = [];
  for (
    let offset = 1;
    offset < lexemes.length * 2 && distractors.length < 3;
    offset += 1
  ) {
    const candidate = lexemes[(startIndex + offset) % lexemes.length].simplified;
    if (
      candidate !== correctWord
      && !candidate.includes(targetCharacter)
      && !distractors.includes(candidate)
    ) {
      distractors.push(candidate);
    }
  }
  if (distractors.length !== 3) {
    throw new Error(`Cannot build word distractors for ${targetCharacter}`);
  }
  return distractors;
};

const pickCharacterDistractors = (characters, targetIndex) => {
  const target = characters[targetIndex].character;
  const distractors = [];
  for (
    let offset = 1;
    offset < characters.length && distractors.length < 3;
    offset += 1
  ) {
    const candidate =
      characters[(targetIndex + offset) % characters.length].character;
    if (candidate !== target && !distractors.includes(candidate)) {
      distractors.push(candidate);
    }
  }
  return distractors;
};

export const buildHsk2CharacterPractice = (root = process.cwd()) => {
  const blueprintBundle = loadHsk2LessonBlueprintsBundle(root);
  assertValidHsk2LessonBlueprintsBundle(blueprintBundle);
  const hsk2VocabularyBundle = loadHsk2VocabularyPracticeBundle(root);
  assertValidHsk2VocabularyPracticeBundle(hsk2VocabularyBundle);
  const hsk1PersonalBundle = loadHsk1PersonalExchangePackBundle(root);
  assertValidHsk1PersonalExchangePackBundle(hsk1PersonalBundle);
  const hsk1CommunicativeBundle =
    loadHsk1CommunicativeUnitPacksBundle(root);
  assertValidHsk1CommunicativeUnitPacksBundle(hsk1CommunicativeBundle);

  const inventory =
    blueprintBundle.scopeBundle.graphBundle.syllabus.inventory;
  const officialVocabulary = inventory.vocabulary.filter(
    (item) => item.level <= 2,
  );
  const hsk1Lexemes = [
    ...hsk1PersonalBundle.pack.lexemes,
    ...hsk1CommunicativeBundle.collection.packs.flatMap(
      (unitPack) => unitPack.lexemes,
    ),
  ].map((lexeme) => ({ ...lexeme, level: 1 }));
  const hsk2Lexemes = hsk2VocabularyBundle.pack.lexemes.map(
    (lexeme) => ({ ...lexeme, level: 2 }),
  );
  const lexemeById = new Map(
    [...hsk1Lexemes, ...hsk2Lexemes].map(
      (lexeme) => [lexeme.officialId, lexeme],
    ),
  );
  const productionLessons = blueprintBundle.pack.lessons.filter(
    (lesson) => lesson.blueprintKind === "short-text-production",
  );
  const lessonIdByCharacterId = new Map(
    productionLessons.flatMap((lesson) =>
      lesson.inventoryMappings.recognitionCharacterIds.map(
        (officialId) => [officialId, lesson.lessonId],
      )
    ),
  );
  const officialCharacters = inventory.recognitionCharacters.filter(
    (item) => item.level === 2,
  );
  const characters = officialCharacters.map((official) => {
    const contextVocabularyIds = officialVocabulary.filter(
      (vocabulary) => vocabulary.word.includes(official.character),
    ).map((vocabulary) => vocabulary.id);
    const primaryLexeme = contextVocabularyIds.length > 0
      ? lexemeById.get(contextVocabularyIds[0])
      : null;
    if (contextVocabularyIds.length > 0 && !primaryLexeme) {
      throw new Error(
        `${official.id} context lexeme ${contextVocabularyIds[0]} is missing`,
      );
    }
    return {
      officialCharacterId: official.id,
      officialSequence: official.sequence,
      character: official.character,
      sourcePage: official.sourcePage,
      lessonId: lessonIdByCharacterId.get(official.id),
      contextVocabularyIds,
      primaryContext: primaryLexeme
        ? {
            officialVocabularyId: primaryLexeme.officialId,
            level: primaryLexeme.level,
            simplified: primaryLexeme.simplified,
            pinyin: primaryLexeme.pinyin,
            vietnameseGlossDraft: primaryLexeme.vietnameseGlossDraft,
          }
        : null,
      contextState: primaryLexeme
        ? "cumulative-hsk1-2-vocabulary-context"
        : "no-hsk1-2-vocabulary-context",
      linguisticMetadata: {
        radical: null,
        strokeCount: null,
        strokeDataRef: null,
        state: "source-not-pinned-for-complete-hsk2-inventory",
      },
      review: {
        machineAssembled: true,
        nativeMandarinReview: "pending",
        vietnameseEditorialReview: "pending",
        characterPedagogyReview: "pending",
      },
    };
  });
  const practiceItems = characters.flatMap((item, index) => {
    const recognitionItem = item.primaryContext
      ? {
          itemId: `${item.lessonId}:${item.officialCharacterId}:context`,
          lessonId: item.lessonId,
          officialCharacterId: item.officialCharacterId,
          kind: "character-in-word-recognition",
          prompt: `Chọn từ chứa chữ “${item.character}”.`,
          options: [
            pickWordDistractors({
              lexemes: [...hsk1Lexemes, ...hsk2Lexemes],
              targetCharacter: item.character,
              correctWord: item.primaryContext.simplified,
              startIndex: index,
            })[0],
            item.primaryContext.simplified,
            pickWordDistractors({
              lexemes: [...hsk1Lexemes, ...hsk2Lexemes],
              targetCharacter: item.character,
              correctWord: item.primaryContext.simplified,
              startIndex: index,
            })[1],
            pickWordDistractors({
              lexemes: [...hsk1Lexemes, ...hsk2Lexemes],
              targetCharacter: item.character,
              correctWord: item.primaryContext.simplified,
              startIndex: index,
            })[2],
          ],
          correctAnswer: item.primaryContext.simplified,
          contextPinyin: item.primaryContext.pinyin,
          contextMeaningViDraft: item.primaryContext.vietnameseGlossDraft,
          scoringPolicy: "automatic-draft-only",
          review: "pending",
          measurementEligible: false,
          masteryEligible: false,
          releaseEligible: false,
        }
      : {
          itemId: `${item.lessonId}:${item.officialCharacterId}:isolated`,
          lessonId: item.lessonId,
          officialCharacterId: item.officialCharacterId,
          kind: "isolated-character-recognition",
          prompt: `Chọn đúng chữ “${item.character}”.`,
          options: [
            pickCharacterDistractors(characters, index)[0],
            item.character,
            pickCharacterDistractors(characters, index)[1],
            pickCharacterDistractors(characters, index)[2],
          ],
          correctAnswer: item.character,
          contextReason: "no-hsk1-2-vocabulary-context",
          scoringPolicy: "automatic-draft-only",
          review: "pending",
          measurementEligible: false,
          masteryEligible: false,
          releaseEligible: false,
        };
    return [
      recognitionItem,
      {
        itemId: `${item.lessonId}:${item.officialCharacterId}:copy`,
        lessonId: item.lessonId,
        officialCharacterId: item.officialCharacterId,
        kind: "glyph-copy-self-check",
        prompt: "Nhìn mẫu, che mẫu rồi tự chép lại chữ.",
        modelGlyph: item.character,
        selfCheckCriteria: [
          "recognizable-overall-shape",
          "approximate-proportion",
        ],
        scoringPolicy: "self-reveal-only",
        strokeOrderAssessed: false,
        review: "pending",
        measurementEligible: false,
        masteryEligible: false,
        releaseEligible: false,
      },
    ];
  });
  const lessonAssignments = productionLessons.map((lesson) => ({
    lessonId: lesson.lessonId,
    characterIds: lesson.inventoryMappings.recognitionCharacterIds,
    practiceItemIds: practiceItems.filter(
      (item) => item.lessonId === lesson.lessonId,
    ).map((item) => item.itemId),
  }));
  const reviewBatches = lessonAssignments.map((assignment) => ({
    batchId: `${assignment.lessonId}:character-review-v1`,
    lessonId: assignment.lessonId,
    characterIds: assignment.characterIds,
    practiceItemIds: assignment.practiceItemIds,
    requiredRoles: [
      "native-mandarin-reviewer",
      "vietnamese-editor",
      "character-pedagogy-reviewer",
    ],
    state: "pending",
    approvals: [],
  }));

  return {
    schemaVersion: 1,
    packId: "hsk2-character-practice-2026.07",
    level: 2,
    state: "ai-assisted-draft",
    learnerVisible: false,
    releaseEligible: false,
    source: {
      syllabusInventorySha256:
        blueprintBundle.scopeBundle.graphBundle.syllabus.inventorySha256,
      lessonBlueprintPackId: blueprintBundle.pack.packId,
      lessonBlueprintPackSha256: fileSha256(blueprintBundle.packPath),
      hsk2VocabularyPracticePackId: hsk2VocabularyBundle.pack.packId,
      hsk2VocabularyPracticePackSha256:
        fileSha256(hsk2VocabularyBundle.packPath),
      hsk1PersonalPackSha256: fileSha256(hsk1PersonalBundle.packPath),
      hsk1CommunicativePackSha256:
        fileSha256(hsk1CommunicativeBundle.collectionPath),
    },
    authorship: {
      method:
        "deterministic-context-mapping-with-ai-assisted-draft-instructions",
      assistant: "OpenAI Codex",
      nativeMandarinReviewer: null,
      vietnameseEditor: null,
      characterPedagogyReviewer: null,
    },
    reviewPolicy: {
      nativeMandarinRequiredForRelease: true,
      vietnameseEditorialRequiredForRelease: true,
      characterPedagogyReviewRequiredForRelease: true,
      strokeMetadataRequiredBeforeStrokeOrderInstruction: true,
    },
    mappingPolicy: {
      primaryContext:
        "earliest-official-hsk1-2-vocabulary-containing-character",
      missingContextHandling: "isolated-recognition-with-explicit-gap",
      characterCardinality: "exactly-one-production-lesson",
      recognitionDoesNotInferWriting: true,
    },
    counts: {
      lessons: lessonAssignments.length,
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
    },
    coverageClaims: {
      officialRecognitionInventoryDraftMapped: true,
      vocabularyContextCoverageComplete: false,
      strokeMetadataComplete: false,
      reviewedCharacterContentComplete: false,
      writingMasteryCoverageComplete: false,
      hsk2Complete: false,
    },
    characters,
    lessonAssignments,
    practiceItems,
    reviewBatches,
  };
};

export const serializeHsk2CharacterPractice = (pack) =>
  `${JSON.stringify(pack)}\n`;

const main = () => {
  const outputPath = resolve(
    process.cwd(),
    HSK2_CHARACTER_PRACTICE_RELATIVE_PATH,
  );
  const serialized = serializeHsk2CharacterPractice(
    buildHsk2CharacterPractice(),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK2 character-practice pack is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK2_CHARACTER_PRACTICE_RELATIVE_PATH,
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
