import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHsk1PersonalExchangePackBundle,
  loadHsk1PersonalExchangePackBundle,
} from "../../src/content/hsk1PersonalExchangePack.mjs";
import {
  assertValidHsk1CommunicativeUnitPacksBundle,
  loadHsk1CommunicativeUnitPacksBundle,
} from "../../src/content/hsk1CommunicativeUnitPacks.mjs";
import {
  assertValidHsk1GrammarContextPackBundle,
  loadHsk1GrammarContextPackBundle,
} from "../../src/content/hsk1GrammarContextPack.mjs";
import {
  assertValidHsk1TaskAssessmentPackBundle,
  loadHsk1TaskAssessmentPackBundle,
} from "../../src/content/hsk1TaskAssessmentPack.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

export const HSK1_LEVEL_CHECK_ITEM_BANK_RELATIVE_PATH =
  "content/drafts/hsk1-level-check-items-2026.07.json";

const BANK_ID = "hsk1-level-check-items-2026.07";
const BLUEPRINT_ID = "hsk1-level-check-2026.07";
const VOCABULARY_SAMPLE_INDEXES = [0, 33, 66, 99, 132, 165, 198, 231, 264, 297];
const GRAMMAR_SAMPLE_INDEXES = [0, 7, 14, 21, 28, 35, 42, 49, 56, 63];
const OPTION_IDS = ["A", "B", "C", "D"];

const objectiveOptions = (answerPool, correctIndex) => {
  const correct = answerPool[correctIndex];
  const distractors = [];
  for (let offset = 1; distractors.length < 3; offset += 1) {
    const candidate = answerPool[(correctIndex + offset) % answerPool.length];
    if (candidate !== correct && !distractors.includes(candidate)) {
      distractors.push(candidate);
    }
  }
  const unshifted = [correct, ...distractors];
  const shift = correctIndex % OPTION_IDS.length;
  const texts = [
    ...unshifted.slice(shift),
    ...unshifted.slice(0, shift),
  ];
  const options = texts.map((text, index) => ({
    optionId: OPTION_IDS[index],
    text,
  }));
  return {
    options,
    correctOptionId: options.find((option) => option.text === correct).optionId,
  };
};

const commonItemState = (itemId, answerPool, correctIndex) => ({
  itemVersion: `${BANK_ID}:${itemId}:1`,
  exposureGroupId: `${BANK_ID}:${itemId}`,
  equivalentGroupId: `${BANK_ID}:${itemId}`,
  ...objectiveOptions(answerPool, correctIndex),
  answerExposure: "repository-authoring-only",
  reviewStatus: "pending",
  calibrationStatus: "uncalibrated",
  scoringPolicy: "automatic-draft-only",
  measurementEligible: false,
  masteryEligible: false,
  prerequisiteWaiverEligible: false,
  independentFormStatus: "source-exposed-draft-requires-alternate-form",
});

const chunk = (items, size) => {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
};

export const buildHsk1LevelCheckItemBank = (root = process.cwd()) => {
  const personal = loadHsk1PersonalExchangePackBundle(root);
  assertValidHsk1PersonalExchangePackBundle(personal);
  const communicative = loadHsk1CommunicativeUnitPacksBundle(root);
  assertValidHsk1CommunicativeUnitPacksBundle(communicative);
  const grammar = loadHsk1GrammarContextPackBundle(root);
  assertValidHsk1GrammarContextPackBundle(grammar);
  const task = loadHsk1TaskAssessmentPackBundle(root);
  assertValidHsk1TaskAssessmentPackBundle(task);

  const scenarios = task.pack.taskScenarios;
  const listeningAnswers = scenarios.map(
    (scenario) => scenario.modelDialogue.turns[0].meaningVi,
  );
  const readingAnswers = scenarios.map(
    (scenario) => scenario.modelDialogue.turns[2].meaningVi,
  );
  const listeningItems = scenarios.map((scenario, index) => {
    const turn = scenario.modelDialogue.turns[0];
    const itemId = `hsk1-level-check:listening:${String(index + 1).padStart(2, "0")}`;
    return {
      itemId,
      sectionId: "listening-objective",
      skill: "listening",
      construct: "sentence-meaning-recognition",
      modality: "recorded-audio-selection-pending",
      source: {
        artifactId: task.pack.packId,
        entityType: "task-dialogue-turn",
        entityId: scenario.officialTaskId,
        turnIndex: 0,
        lessonId: scenario.lessonId,
        unitId: scenario.unitId,
      },
      promptVi: "Nghe và chọn nghĩa phù hợp nhất.",
      stimulus: {
        audio: null,
        audioRequirement: "reviewed-human-or-licensed-recording",
        authoringPreview: "synthetic-browser-voice",
        transcriptHanzi: turn.hanzi,
        transcriptPinyin: turn.pinyin,
        transcriptReview: "pending",
      },
      ...commonItemState(itemId, listeningAnswers, index),
    };
  });
  const readingItems = scenarios.map((scenario, index) => {
    const turn = scenario.modelDialogue.turns[2];
    const itemId = `hsk1-level-check:reading:${String(index + 1).padStart(2, "0")}`;
    return {
      itemId,
      sectionId: "reading-objective",
      skill: "reading",
      construct: "sentence-meaning-recognition",
      modality: "visual-selection",
      source: {
        artifactId: task.pack.packId,
        entityType: "task-dialogue-turn",
        entityId: scenario.officialTaskId,
        turnIndex: 2,
        lessonId: scenario.lessonId,
        unitId: scenario.unitId,
      },
      promptVi: "Đọc và chọn nghĩa phù hợp nhất.",
      stimulus: {
        kind: "hanzi-text",
        text: turn.hanzi,
      },
      ...commonItemState(itemId, readingAnswers, index),
    };
  });

  const lessonForVocabularyId = new Map([
    ...personal.pack.lessons.flatMap((lesson) =>
      lesson.vocabularyIds.map((officialId) => [
        officialId,
        {
          artifactId: personal.pack.packId,
          unitId: personal.pack.unitId,
          lessonId: lesson.lessonId,
        },
      ])
    ),
    ...communicative.collection.packs.flatMap((unitPack) =>
      unitPack.lessons.flatMap((lesson) =>
        lesson.vocabularyIds.map((officialId) => [
          officialId,
          {
            artifactId: unitPack.packId,
            unitId: unitPack.unitId,
            lessonId: lesson.lessonId,
          },
        ])
      )
    ),
  ]);
  const allLexemes = [
    ...personal.pack.lexemes,
    ...communicative.collection.packs.flatMap((unitPack) => unitPack.lexemes),
  ].sort((left, right) => left.officialId.localeCompare(right.officialId));
  const selectedLexemes = VOCABULARY_SAMPLE_INDEXES.map(
    (index) => allLexemes[index],
  );
  const vocabularyAnswers = selectedLexemes.map(
    (lexeme) => lexeme.vietnameseGlossDraft,
  );
  const vocabularyItems = selectedLexemes.map((lexeme, index) => {
    const mapping = lessonForVocabularyId.get(lexeme.officialId);
    if (!mapping) throw new Error(`${lexeme.officialId} lesson mapping is missing`);
    const itemId = `hsk1-level-check:vocabulary:${String(index + 1).padStart(2, "0")}`;
    return {
      itemId,
      sectionId: "vocabulary-grammar-objective",
      skill: "vocabulary",
      construct: "word-meaning-recognition",
      modality: "visual-selection",
      source: {
        artifactId: mapping.artifactId,
        entityType: "vocabulary-draft",
        entityId: lexeme.officialId,
        lessonId: mapping.lessonId,
        unitId: mapping.unitId,
      },
      promptVi: "Chọn nghĩa đúng của từ.",
      stimulus: {
        kind: "hanzi-text",
        text: lexeme.simplified,
        pinyinAuthoringReference: lexeme.pinyin,
      },
      ...commonItemState(itemId, vocabularyAnswers, index),
    };
  });

  const selectedGrammar = GRAMMAR_SAMPLE_INDEXES.map(
    (index) => grammar.pack.grammarDrafts[index],
  );
  const grammarAnswers = selectedGrammar.map(
    (draft) => draft.modelExample.meaningVi,
  );
  const grammarItems = selectedGrammar.map((draft, index) => {
    const itemId = `hsk1-level-check:grammar:${String(index + 1).padStart(2, "0")}`;
    return {
      itemId,
      sectionId: "vocabulary-grammar-objective",
      skill: "grammar",
      construct: "grammar-in-context-meaning-recognition",
      modality: "visual-selection",
      source: {
        artifactId: grammar.pack.packId,
        entityType: "grammar-model-example",
        entityId: draft.officialGrammarRowId,
        lessonId: draft.lessonId,
        unitId: draft.unitId,
      },
      promptVi: "Đọc câu và chọn nghĩa phù hợp nhất.",
      stimulus: {
        kind: "hanzi-text",
        text: draft.modelExample.hanzi,
        pinyinAuthoringReference: draft.modelExample.pinyin,
        officialGrammarContentAuthoringReference: draft.officialContent,
      },
      ...commonItemState(itemId, grammarAnswers, index),
    };
  });

  const items = [
    ...listeningItems,
    ...readingItems,
    ...vocabularyItems,
    ...grammarItems,
  ];
  const reviewBatches = [
    ...chunk(listeningItems, 5).map((batchItems, index) => ({
      batchId: `${BANK_ID}:listening-review-${index + 1}`,
      sectionId: "listening-objective",
      itemIds: batchItems.map((item) => item.itemId),
      requiredRoles: [
        "native-mandarin-reviewer",
        "vietnamese-editor",
        "assessment-editor",
        "audio-rights-reviewer",
      ],
      reviewedAudioRequired: true,
      state: "pending",
      approvals: [],
    })),
    ...chunk(readingItems, 5).map((batchItems, index) => ({
      batchId: `${BANK_ID}:reading-review-${index + 1}`,
      sectionId: "reading-objective",
      itemIds: batchItems.map((item) => item.itemId),
      requiredRoles: [
        "native-mandarin-reviewer",
        "vietnamese-editor",
        "assessment-editor",
      ],
      state: "pending",
      approvals: [],
    })),
    ...chunk([...vocabularyItems, ...grammarItems], 5).map(
      (batchItems, index) => ({
        batchId: `${BANK_ID}:vocabulary-grammar-review-${index + 1}`,
        sectionId: "vocabulary-grammar-objective",
        itemIds: batchItems.map((item) => item.itemId),
        requiredRoles: [
          "native-mandarin-reviewer",
          "vietnamese-editor",
          "assessment-editor",
        ],
        state: "pending",
        approvals: [],
      }),
    ),
  ];

  return {
    schemaVersion: 1,
    bankId: BANK_ID,
    blueprintId: BLUEPRINT_ID,
    state: "uncalibrated-draft",
    learnerVisible: false,
    runtimeImportEligible: false,
    releaseEligible: false,
    source: {
      personalExchangePackId: personal.pack.packId,
      personalExchangePackSha256: fileSha256(personal.packPath),
      communicativeCollectionId: communicative.collection.collectionId,
      communicativeCollectionSha256: fileSha256(
        communicative.collectionPath,
      ),
      grammarPackId: grammar.pack.packId,
      grammarPackSha256: fileSha256(grammar.packPath),
      taskPackId: task.pack.packId,
      taskPackSha256: fileSha256(task.packPath),
    },
    authorship: {
      method: "deterministic-source-bound-ai-assisted-objective-item-draft",
      assistant: "OpenAI Codex",
      nativeMandarinReviewer: null,
      vietnameseEditor: null,
      assessmentEditor: null,
      audioRightsReviewer: null,
    },
    policy: {
      reviewedAudioRequiredForScoredListening: true,
      independentAlternateFormRequiredBeforeCalibration: true,
      answersMustBeServerConfidentialBeforeIssuance: true,
      humanReviewDoesNotCalibrate: true,
      calibrationRequiredForMeasurement: true,
      noRuntimeImportBeforeAllGates: true,
    },
    calibration: {
      required: true,
      pilotSampleSize: 0,
      reliabilityEstimate: null,
      cutScore: null,
    },
    counts: {
      objectiveItems: items.length,
      listeningItems: listeningItems.length,
      readingItems: readingItems.length,
      vocabularyItems: vocabularyItems.length,
      grammarItems: grammarItems.length,
      reviewBatches: reviewBatches.length,
      reviewedItems: 0,
      calibratedItems: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      releaseEligibleItems: 0,
    },
    coverageClaims: {
      taskScenarioListeningDraftCoverage: "15/15",
      taskScenarioReadingDraftCoverage: "15/15",
      objectiveItemDraftComplete: true,
      independentAssessmentFormsComplete: false,
      reviewedAudioComplete: false,
      calibratedAssessmentComplete: false,
      hsk1LevelCheckComplete: false,
    },
    items,
    reviewBatches,
  };
};

export const serializeHsk1LevelCheckItemBank = (bank) =>
  `${JSON.stringify(bank)}\n`;

const main = () => {
  const root = process.cwd();
  const outputPath = join(root, HSK1_LEVEL_CHECK_ITEM_BANK_RELATIVE_PATH);
  const serialized = serializeHsk1LevelCheckItemBank(
    buildHsk1LevelCheckItemBank(root),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK1 level-check item bank is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK1_LEVEL_CHECK_ITEM_BANK_RELATIVE_PATH,
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
