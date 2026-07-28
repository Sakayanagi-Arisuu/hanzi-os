import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHsk1CurriculumScopeBundle,
  loadHsk1CurriculumScopeBundle,
} from "../../src/content/hsk1CurriculumScope.mjs";
import {
  assertValidHsk1PersonalExchangePackBundle,
  loadHsk1PersonalExchangePackBundle,
} from "../../src/content/hsk1PersonalExchangePack.mjs";
import {
  assertValidHsk1CommunicativeUnitPacksBundle,
  loadHsk1CommunicativeUnitPacksBundle,
} from "../../src/content/hsk1CommunicativeUnitPacks.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

export const HSK1_CHARACTER_FOUNDATION_PACK_RELATIVE_PATH =
  "content/drafts/hsk1-character-foundation-2026.07.json";

const UNIT_ORDER = [
  "hsk1-personal-exchange",
  "hsk1-time-place-events",
  "hsk1-daily-life",
  "hsk1-travel-leisure",
  "hsk1-study-work",
];
const LESSONS_PER_CONTEXT_UNIT = new Map([
  ["hsk1-personal-exchange", 6],
  ["hsk1-time-place-events", 3],
  ["hsk1-daily-life", 3],
  ["hsk1-travel-leisure", 1],
  ["hsk1-study-work", 2],
]);
const UNIT_TITLE_VI = new Map([
  ["hsk1-personal-exchange", "Chữ trong giao tiếp cá nhân"],
  ["hsk1-time-place-events", "Chữ về thời gian và địa điểm"],
  ["hsk1-daily-life", "Chữ trong đời sống hằng ngày"],
  ["hsk1-travel-leisure", "Chữ về đi lại và giải trí"],
  ["hsk1-study-work", "Chữ trong học tập và công việc"],
]);

const balancedChunks = (items, count) => {
  const baseSize = Math.floor(items.length / count);
  const remainder = items.length % count;
  const chunks = [];
  let cursor = 0;
  for (let index = 0; index < count; index += 1) {
    const size = baseSize + (index < remainder ? 1 : 0);
    chunks.push(items.slice(cursor, cursor + size));
    cursor += size;
  }
  return chunks;
};

const exactPartition = (label, actual, expected) => {
  if (
    actual.length !== new Set(actual).size
    || JSON.stringify([...actual].sort()) !== JSON.stringify([...expected].sort())
  ) {
    throw new Error(`${label} is not an exact partition`);
  }
};

const pickWordDistractors = ({
  allLexemes,
  targetCharacter,
  correctWord,
  startIndex,
}) => {
  const distractors = [];
  for (
    let offset = 1;
    offset < allLexemes.length * 2 && distractors.length < 3;
    offset += 1
  ) {
    const candidate = allLexemes[
      (startIndex + offset) % allLexemes.length
    ].simplified;
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

export const buildHsk1CharacterFoundationPack = (root = process.cwd()) => {
  const scopeBundle = loadHsk1CurriculumScopeBundle(root);
  assertValidHsk1CurriculumScopeBundle(scopeBundle);
  const personalBundle = loadHsk1PersonalExchangePackBundle(root);
  assertValidHsk1PersonalExchangePackBundle(personalBundle);
  const communicativeBundle = loadHsk1CommunicativeUnitPacksBundle(root);
  assertValidHsk1CommunicativeUnitPacksBundle(communicativeBundle);

  const characterScope = scopeBundle.scope.unitScopes.find(
    (unit) => unit.unitId === "hsk1-character-foundation",
  );
  if (!characterScope) throw new Error("HSK1 character-foundation scope is missing");
  const inventory = scopeBundle.graphBundle.syllabus.inventory;
  const officialCharacters = inventory.recognitionCharacters.filter(
    (item) => item.level === 1,
  );
  const officialVocabulary = inventory.vocabulary.filter(
    (item) => item.level === 1,
  );
  const packLexemes = [
    ...personalBundle.pack.lexemes.map((lexeme) => ({
      ...lexeme,
      contextUnitId: personalBundle.pack.unitId,
    })),
    ...communicativeBundle.collection.packs.flatMap((pack) =>
      pack.lexemes.map((lexeme) => ({
        ...lexeme,
        contextUnitId: pack.unitId,
      }))
    ),
  ];
  exactPartition(
    "character-context lexemes",
    packLexemes.map((lexeme) => lexeme.officialId),
    officialVocabulary.map((item) => item.id),
  );
  const lexemeById = new Map(
    packLexemes.map((lexeme) => [lexeme.officialId, lexeme]),
  );

  const characters = officialCharacters.map((official) => {
    const contexts = officialVocabulary.filter(
      (vocabulary) => vocabulary.word.includes(official.character),
    ).map((vocabulary) => lexemeById.get(vocabulary.id));
    if (contexts.length === 0 || contexts.some((context) => !context)) {
      throw new Error(`${official.id} has no reviewed-source vocabulary context`);
    }
    const primaryContext = contexts[0];
    return {
      officialCharacterId: official.id,
      character: official.character,
      officialSequence: official.sequence,
      sourcePage: official.sourcePage,
      primaryContextUnitId: primaryContext.contextUnitId,
      primaryContext: {
        officialVocabularyId: primaryContext.officialId,
        simplified: primaryContext.simplified,
        pinyin: primaryContext.pinyin,
        vietnameseGlossDraft: primaryContext.vietnameseGlossDraft,
      },
      contextVocabularyIds: contexts.map((context) => context.officialId),
      linguisticMetadata: {
        radical: null,
        strokeCount: null,
        strokeDataRef: null,
        state: "source-not-pinned-for-complete-hsk1-inventory",
      },
      review: {
        machineAssembled: true,
        nativeMandarinReview: "pending",
        vietnameseEditorialReview: "pending",
        characterPedagogyReview: "pending",
      },
    };
  });
  exactPartition(
    "character drafts",
    characters.map((item) => item.officialCharacterId),
    characterScope.recognitionCharacterIds,
  );

  const lessons = [];
  for (const contextUnitId of UNIT_ORDER) {
    const unitCharacters = characters.filter(
      (item) => item.primaryContextUnitId === contextUnitId,
    );
    const chunks = balancedChunks(
      unitCharacters,
      LESSONS_PER_CONTEXT_UNIT.get(contextUnitId),
    );
    for (const [chunkIndex, chunk] of chunks.entries()) {
      const lessonIndex = lessons.length;
      lessons.push({
        lessonId:
          `hsk1-character-foundation:${String(lessonIndex + 1).padStart(2, "0")}`,
        sequence: lessonIndex + 1,
        titleVi:
          `${UNIT_TITLE_VI.get(contextUnitId)} ${chunkIndex + 1}/${chunks.length}`,
        objectiveVi:
          "Nhận diện chữ trong từ HSK1 đã học và tự chép hình dạng mà không suy diễn mastery viết.",
        contextUnitId,
        prerequisiteLessonIds: lessonIndex === 0
          ? []
          : [
              `hsk1-character-foundation:${String(lessonIndex).padStart(2, "0")}`,
            ],
        officialCharacterIds: chunk.map(
          (item) => item.officialCharacterId,
        ),
        practiceBlueprint: {
          requiredKinds: [
            "character-in-word-recognition",
            "glyph-copy-self-check",
          ],
          authoredItemCount: chunk.length * 2,
          strokeOrderTaught: false,
          grantsMastery: false,
        },
      });
    }
  }
  exactPartition(
    "character lessons",
    lessons.flatMap((lesson) => lesson.officialCharacterIds),
    characterScope.recognitionCharacterIds,
  );

  const characterById = new Map(
    characters.map((item) => [item.officialCharacterId, item]),
  );
  const practiceItems = lessons.flatMap((lesson) =>
    lesson.officialCharacterIds.flatMap((officialCharacterId) => {
      const character = characterById.get(officialCharacterId);
      const startIndex = packLexemes.findIndex(
        (lexeme) =>
          lexeme.officialId === character.primaryContext.officialVocabularyId,
      );
      const wordDistractors = pickWordDistractors({
        allLexemes: packLexemes,
        targetCharacter: character.character,
        correctWord: character.primaryContext.simplified,
        startIndex,
      });
      const base = {
        lessonId: lesson.lessonId,
        officialCharacterId,
        review: "pending",
        measurementEligible: false,
        masteryEligible: false,
      };
      return [
        {
          ...base,
          itemId: `${lesson.lessonId}:${officialCharacterId}:context`,
          kind: "character-in-word-recognition",
          prompt: `Chọn từ chứa chữ “${character.character}”.`,
          options: [
            wordDistractors[0],
            character.primaryContext.simplified,
            wordDistractors[1],
            wordDistractors[2],
          ],
          correctAnswer: character.primaryContext.simplified,
          contextPinyin: character.primaryContext.pinyin,
          contextMeaningViDraft:
            character.primaryContext.vietnameseGlossDraft,
          scoringPolicy: "automatic-draft-only",
        },
        {
          ...base,
          itemId: `${lesson.lessonId}:${officialCharacterId}:copy`,
          kind: "glyph-copy-self-check",
          prompt: "Nhìn mẫu, che mẫu rồi tự chép lại chữ.",
          modelGlyph: character.character,
          scoringPolicy: "self-reveal-only",
          strokeOrderAssessed: false,
          selfCheckCriteria: [
            "recognizable-overall-shape",
            "approximate-proportion",
          ],
        },
      ];
    })
  );
  const reviewBatches = lessons.map((lesson) => ({
    batchId: `${lesson.lessonId}:review-v1`,
    lessonId: lesson.lessonId,
    characterIds: [...lesson.officialCharacterIds],
    practiceItemIds: practiceItems.filter(
      (item) => item.lessonId === lesson.lessonId,
    ).map((item) => item.itemId),
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
    packId: "hsk1-character-foundation-2026.07",
    unitId: "hsk1-character-foundation",
    state: "ai-assisted-draft",
    learnerVisible: false,
    releaseEligible: false,
    source: {
      scopeId: scopeBundle.scope.scopeId,
      scopeSha256: fileSha256(scopeBundle.scopePath),
      syllabusInventorySha256:
        scopeBundle.graphBundle.syllabus.inventorySha256,
      personalExchangePackId: personalBundle.pack.packId,
      personalExchangePackSha256: fileSha256(personalBundle.packPath),
      communicativeCollectionId:
        communicativeBundle.collection.collectionId,
      communicativeCollectionSha256:
        fileSha256(communicativeBundle.collectionPath),
    },
    authorship: {
      method: "deterministic-context-mapping-with-ai-assisted-draft-instructions",
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
        "earliest-official-hsk1-vocabulary-containing-character",
      characterCardinality: "exactly-one-lesson",
      recognitionDoesNotInferWriting: true,
    },
    counts: {
      lessons: lessons.length,
      characterDrafts: characters.length,
      charactersWithVocabularyContext: characters.filter(
        (item) => item.contextVocabularyIds.length > 0,
      ).length,
      charactersWithPinnedStrokeMetadata: characters.filter(
        (item) => item.linguisticMetadata.strokeDataRef !== null,
      ).length,
      authoredPracticeItems: practiceItems.length,
      characterInWordRecognitionItems: practiceItems.filter(
        (item) => item.kind === "character-in-word-recognition",
      ).length,
      glyphCopySelfCheckItems: practiceItems.filter(
        (item) => item.kind === "glyph-copy-self-check",
      ).length,
      reviewBatches: reviewBatches.length,
      releaseEligibleItems: 0,
    },
    coverageClaims: {
      officialRecognitionInventoryDraftMapped: true,
      vocabularyContextCoverageComplete: true,
      strokeMetadataComplete: false,
      reviewedCharacterContentComplete: false,
      writingMasteryCoverageComplete: false,
      hsk1Complete: false,
    },
    characters,
    lessons,
    practiceItems,
    reviewBatches,
  };
};

export const serializeHsk1CharacterFoundationPack = (pack) =>
  `${JSON.stringify(pack)}\n`;

const main = () => {
  const root = process.cwd();
  const outputPath = join(root, HSK1_CHARACTER_FOUNDATION_PACK_RELATIVE_PATH);
  const serialized = serializeHsk1CharacterFoundationPack(
    buildHsk1CharacterFoundationPack(root),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK1 character-foundation pack is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK1_CHARACTER_FOUNDATION_PACK_RELATIVE_PATH,
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
