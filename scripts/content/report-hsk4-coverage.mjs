import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHskCurriculumGraphBundle,
  loadHskCurriculumGraphBundle,
} from "../../src/content/hskCurriculumGraph.mjs";
import {
  assertValidHsk0PronunciationBootcampBundle,
  loadHsk0PronunciationBootcampBundle,
} from "../../src/content/hsk0PronunciationBootcamp.mjs";
import {
  assertValidHsk1CurriculumScopeBundle,
  loadHsk1CurriculumScopeBundle,
} from "../../src/content/hsk1CurriculumScope.mjs";
import {
  assertValidHsk2CurriculumScopeBundle,
  loadHsk2CurriculumScopeBundle,
} from "../../src/content/hsk2CurriculumScope.mjs";
import {
  assertValidHsk2VocabularyDraftBundle,
  loadHsk2VocabularyDraftBundle,
} from "../../src/content/hsk2VocabularyDraft.mjs";
import {
  assertValidHsk2LessonBlueprintsBundle,
  loadHsk2LessonBlueprintsBundle,
} from "../../src/content/hsk2LessonBlueprints.mjs";
import {
  assertValidHsk2VocabularyPracticeBundle,
  loadHsk2VocabularyPracticeBundle,
} from "../../src/content/hsk2VocabularyPractice.mjs";
import {
  assertValidHsk2CharacterPracticeBundle,
  loadHsk2CharacterPracticeBundle,
} from "../../src/content/hsk2CharacterPractice.mjs";
import {
  assertValidHsk2GrammarContextBundle,
  loadHsk2GrammarContextBundle,
} from "../../src/content/hsk2GrammarContext.mjs";
import {
  assertValidHsk1PersonalExchangePackBundle,
  loadHsk1PersonalExchangePackBundle,
} from "../../src/content/hsk1PersonalExchangePack.mjs";
import {
  assertValidHsk1CommunicativeUnitPacksBundle,
  loadHsk1CommunicativeUnitPacksBundle,
} from "../../src/content/hsk1CommunicativeUnitPacks.mjs";
import {
  assertValidHsk1CharacterFoundationPackBundle,
  loadHsk1CharacterFoundationPackBundle,
} from "../../src/content/hsk1CharacterFoundationPack.mjs";
import {
  assertValidHsk1GrammarContextPackBundle,
  loadHsk1GrammarContextPackBundle,
} from "../../src/content/hsk1GrammarContextPack.mjs";
import {
  assertValidHsk1TaskAssessmentPackBundle,
  loadHsk1TaskAssessmentPackBundle,
} from "../../src/content/hsk1TaskAssessmentPack.mjs";
import {
  assertValidHsk1LevelCheckItemBankBundle,
  loadHsk1LevelCheckItemBankBundle,
} from "../../src/content/hsk1LevelCheckItemBank.mjs";
import {
  assertValidHsk1ReviewManifestBundle,
  loadHsk1ReviewManifestBundle,
} from "../../src/content/hsk1ReviewManifest.mjs";
import {
  assertValidHskSyllabusBundle,
  loadHskSyllabusBundle,
} from "../../src/content/hskSyllabusInventory.mjs";

export const HSK4_COVERAGE_REPORT_RELATIVE_PATH =
  "content/reports/hsk4-coverage.json";

const LEVELS = [1, 2, 3, 4];
const RELEASED_STATES = new Set(["beta", "published"]);

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const normalizePinyin = (value) =>
  value.normalize("NFKC").toLocaleLowerCase("en")
    .replace(/[\s'’/-]/g, "");

const percentage = (covered, total) =>
  total === 0 ? 0 : Number(((covered / total) * 100).toFixed(2));

export const buildHsk4CoverageReport = (root = process.cwd()) => {
  const syllabus = loadHskSyllabusBundle(root);
  assertValidHskSyllabusBundle(syllabus);
  const curriculum = loadHskCurriculumGraphBundle(root);
  const curriculumResult = assertValidHskCurriculumGraphBundle(curriculum);
  const hsk0Pronunciation = loadHsk0PronunciationBootcampBundle(root);
  const hsk0PronunciationResult =
    assertValidHsk0PronunciationBootcampBundle(hsk0Pronunciation);
  const hsk1Scope = loadHsk1CurriculumScopeBundle(root);
  const hsk1ScopeResult = assertValidHsk1CurriculumScopeBundle(hsk1Scope);
  const hsk2Scope = loadHsk2CurriculumScopeBundle(root);
  const hsk2ScopeResult = assertValidHsk2CurriculumScopeBundle(hsk2Scope);
  const hsk2Vocabulary = loadHsk2VocabularyDraftBundle(root);
  const hsk2VocabularyResult =
    assertValidHsk2VocabularyDraftBundle(hsk2Vocabulary);
  const hsk2LessonBlueprints = loadHsk2LessonBlueprintsBundle(root);
  const hsk2LessonBlueprintsResult =
    assertValidHsk2LessonBlueprintsBundle(hsk2LessonBlueprints);
  const hsk2VocabularyPractice = loadHsk2VocabularyPracticeBundle(root);
  const hsk2VocabularyPracticeResult =
    assertValidHsk2VocabularyPracticeBundle(hsk2VocabularyPractice);
  const hsk2CharacterPractice = loadHsk2CharacterPracticeBundle(root);
  const hsk2CharacterPracticeResult =
    assertValidHsk2CharacterPracticeBundle(hsk2CharacterPractice);
  const hsk2GrammarContext = loadHsk2GrammarContextBundle(root);
  const hsk2GrammarContextResult =
    assertValidHsk2GrammarContextBundle(hsk2GrammarContext);
  const hsk1PersonalPack = loadHsk1PersonalExchangePackBundle(root);
  const hsk1PersonalPackResult =
    assertValidHsk1PersonalExchangePackBundle(hsk1PersonalPack);
  const hsk1CommunicativePacks =
    loadHsk1CommunicativeUnitPacksBundle(root);
  const hsk1CommunicativePacksResult =
    assertValidHsk1CommunicativeUnitPacksBundle(hsk1CommunicativePacks);
  const hsk1CharacterPack = loadHsk1CharacterFoundationPackBundle(root);
  const hsk1CharacterPackResult =
    assertValidHsk1CharacterFoundationPackBundle(hsk1CharacterPack);
  const hsk1GrammarPack = loadHsk1GrammarContextPackBundle(root);
  const hsk1GrammarPackResult =
    assertValidHsk1GrammarContextPackBundle(hsk1GrammarPack);
  const hsk1TaskPack = loadHsk1TaskAssessmentPackBundle(root);
  const hsk1TaskPackResult =
    assertValidHsk1TaskAssessmentPackBundle(hsk1TaskPack);
  const hsk1LevelCheck = loadHsk1LevelCheckItemBankBundle(root);
  const hsk1LevelCheckResult =
    assertValidHsk1LevelCheckItemBankBundle(hsk1LevelCheck);
  const hsk1ReviewManifest = loadHsk1ReviewManifestBundle(root);
  const hsk1ReviewManifestResult =
    assertValidHsk1ReviewManifestBundle(hsk1ReviewManifest);
  const registry = readJson(join(root, "content/registry.json"));
  const current = registry.packages.find(
    (item) => item.contentVersion === registry.currentContentVersion,
  );
  if (!current) throw new Error("Current content package is missing from registry");
  const packageRoot = join(root, "content", current.relativePath);
  const runtime = readJson(join(packageRoot, "runtime-catalog.json"));
  const authoring = readJson(join(packageRoot, "item-catalog.json"));

  const officialVocabularyByWord = new Map();
  for (const item of syllabus.inventory.vocabulary) {
    const candidates = officialVocabularyByWord.get(item.word) ?? [];
    candidates.push(item);
    officialVocabularyByWord.set(item.word, candidates);
  }
  const vocabularyMatches = [];
  const unmatchedVocabulary = [];
  const pinyinDrift = [];
  for (const item of runtime.vocabulary) {
    const candidates = officialVocabularyByWord.get(item.simplified) ?? [];
    const exact = candidates.find(
      (candidate) =>
        normalizePinyin(candidate.pinyin) === normalizePinyin(item.pinyin),
    );
    const official = exact ?? (candidates.length === 1 ? candidates[0] : null);
    if (official) {
      vocabularyMatches.push({
        runtimeId: item.id,
        officialId: official.id,
        officialLevel: official.level,
        pinyinExact: Boolean(exact),
      });
      if (!exact) {
        pinyinDrift.push({
          runtimeId: item.id,
          simplified: item.simplified,
          runtimePinyin: item.pinyin,
          officialPinyin: official.pinyin,
        });
      }
    } else {
      unmatchedVocabulary.push({
        runtimeId: item.id,
        simplified: item.simplified,
        pinyin: item.pinyin,
      });
    }
  }

  const officialCharacters = new Map(
    syllabus.inventory.recognitionCharacters.map((item) => [
      item.character,
      item,
    ]),
  );
  const characterItems = authoring.items.filter(
    (item) => item.itemType === "character",
  );
  const characterMatches = characterItems
    .map((item) => {
      const official = officialCharacters.get(item.payload.character);
      return official
        ? {
            authoringId: item.itemId,
            officialId: official.id,
            officialLevel: official.level,
            releaseState: item.releaseState,
          }
        : null;
    })
    .filter(Boolean);

  const vocabularyByLevel = LEVELS.map((level) => {
    const official = syllabus.inventory.counts.vocabulary[String(level)];
    const covered = vocabularyMatches.filter(
      (item) => item.officialLevel === level,
    ).length;
    return {
      level,
      officialIncremental: official,
      runtimeMapped: covered,
      coveragePercent: percentage(covered, official),
    };
  });
  const charactersByLevel = LEVELS.map((level) => {
    const official =
      syllabus.inventory.counts.recognitionCharacters[String(level)];
    const authored = characterMatches.filter(
      (item) => item.officialLevel === level,
    ).length;
    const released = characterMatches.filter(
      (item) =>
        item.officialLevel === level && RELEASED_STATES.has(item.releaseState),
    ).length;
    return {
      level,
      officialIncremental: official,
      authoringMapped: authored,
      releasedMapped: released,
      releasedCoveragePercent: percentage(released, official),
    };
  });
  const lessonMappedVocabularyIds = new Set(
    curriculum.graph.lessonMappings.flatMap(
      (mapping) => mapping.officialVocabularyIds,
    ),
  );

  return {
    schemaVersion: 1,
    target: "local-graduation-hsk0-4",
    source: {
      sourceId: syllabus.source.sourceId,
      pdfSha256: syllabus.source.pdfSha256,
      inventorySha256: syllabus.inventorySha256,
      effective: syllabus.source.effective,
      rightsDecision: syllabus.source.rights.decision,
    },
    contentVersion: runtime.contentVersion,
    officialInventory: syllabus.inventory.counts,
    currentCoverage: {
      vocabulary: {
        officialTotal: syllabus.inventory.vocabulary.length,
        runtimeTotal: runtime.vocabulary.length,
        runtimeMapped: vocabularyMatches.length,
        unmatchedRuntime: unmatchedVocabulary,
        pinyinDrift,
        coveragePercent: percentage(
          vocabularyMatches.length,
          syllabus.inventory.vocabulary.length,
        ),
        byLevel: vocabularyByLevel,
      },
      recognitionCharacters: {
        officialTotal: syllabus.inventory.recognitionCharacters.length,
        authoringTotal: characterItems.length,
        authoringMapped: characterMatches.length,
        releasedMapped: characterMatches.filter((item) =>
          RELEASED_STATES.has(item.releaseState)
        ).length,
        releasedCoveragePercent: percentage(
          characterMatches.filter((item) =>
            RELEASED_STATES.has(item.releaseState)
          ).length,
          syllabus.inventory.recognitionCharacters.length,
        ),
        byLevel: charactersByLevel,
      },
      mappings: {
        tasks: 0,
        topics: 0,
        grammarRows: 0,
        officialVocabularyWithLessonMapping:
          lessonMappedVocabularyIds.size,
        runtimeLessonsMapped: curriculumResult.summary.mappedLessons,
      },
      authoringScope: {
        hsk1: {
          tasks: hsk1ScopeResult.summary.tasks,
          topics: hsk1ScopeResult.summary.topics,
          vocabulary: hsk1ScopeResult.summary.vocabulary,
          recognitionCharacters:
            hsk1ScopeResult.summary.recognitionCharacters,
          grammarRows: hsk1ScopeResult.summary.grammarRows,
          lessonPracticeCoverageComplete: false,
        },
        hsk2: {
          units: hsk2ScopeResult.summary.units,
          situationalStrands: hsk2ScopeResult.summary.situationalStrands,
          grammarModules: hsk2ScopeResult.summary.grammarModules,
          productionStages: hsk2ScopeResult.summary.productionStages,
          plannedLessonBlueprints:
            hsk2ScopeResult.summary.plannedLessonBlueprints,
          tasks: hsk2ScopeResult.summary.tasks,
          topics: hsk2ScopeResult.summary.topics,
          vocabulary: hsk2ScopeResult.summary.vocabulary,
          recognitionCharacters:
            hsk2ScopeResult.summary.recognitionCharacters,
          grammarRows: hsk2ScopeResult.summary.grammarRows,
          lessonPracticeCoverageComplete: false,
        },
      },
      draftBlueprintMappings: {
        hsk0PronunciationBootcamp: {
          lessons: hsk0PronunciationResult.summary.lessons,
          targets: hsk0PronunciationResult.summary.targets,
          officialInitials:
            hsk0PronunciationResult.summary.officialInitials,
          officialFinalTableCells:
            hsk0PronunciationResult.summary.officialFinalTableCells,
          officialSpecialFinals:
            hsk0PronunciationResult.summary.officialSpecialFinals,
          toneCategories:
            hsk0PronunciationResult.summary.toneCategories,
          tonePairCells:
            hsk0PronunciationResult.summary.tonePairCells,
          authoredActivities:
            hsk0PronunciationResult.summary.authoredActivities,
          audioDependentActivities:
            hsk0PronunciationResult.summary.audioDependentActivities,
          reviewedAudioActivities:
            hsk0PronunciationResult.summary.reviewedAudioActivities,
          measurementEligibleActivities:
            hsk0PronunciationResult.summary.measurementEligibleActivities,
          reviewed: false,
          learnerVisible: false,
        },
        hsk2VocabularyBacklog: {
          officialVocabulary:
            hsk2VocabularyResult.counts.officialVocabulary,
          sourceMatched: hsk2VocabularyResult.counts.sourceMatched,
          sourceMatches: hsk2VocabularyResult.counts.sourceMatches,
          multipleSourceMatchEntries:
            hsk2VocabularyResult.counts.multipleSourceMatchEntries,
          pronunciationReviewPending:
            hsk2VocabularyResult.counts.pronunciationReviewPending,
          vietnameseGlossReviewed:
            hsk2VocabularyResult.counts.vietnameseGlossReviewed,
          releaseEligible: hsk2VocabularyResult.counts.releaseEligible,
          learnerVisible: false,
        },
        hsk2LessonBlueprints: {
          lessons: hsk2LessonBlueprintsResult.summary.lessons,
          situationalDialogueLessons:
            hsk2LessonBlueprintsResult.summary.situationalDialogueLessons,
          sentenceChainLessons:
            hsk2LessonBlueprintsResult.summary.sentenceChainLessons,
          shortTextProductionLessons:
            hsk2LessonBlueprintsResult.summary.shortTextProductionLessons,
          tasks: hsk2LessonBlueprintsResult.summary.taskBlueprintMappings,
          topics: hsk2LessonBlueprintsResult.summary.topicBlueprintMappings,
          vocabulary:
            hsk2LessonBlueprintsResult.summary.vocabularyBlueprintMappings,
          grammarRows:
            hsk2LessonBlueprintsResult.summary.grammarBlueprintMappings,
          recognitionCharacters:
            hsk2LessonBlueprintsResult.summary
              .recognitionCharacterBlueprintMappings,
          authoredPracticeItems:
            hsk2LessonBlueprintsResult.summary.authoredPracticeItems,
          reviewed: false,
          learnerVisible: false,
        },
        hsk2VocabularyPractice: {
          lessons:
            hsk2VocabularyPracticeResult.summary.situationalLessons,
          vocabularyDrafts:
            hsk2VocabularyPracticeResult.summary.vocabularyDrafts,
          authoredPracticeItems:
            hsk2VocabularyPracticeResult.summary.authoredPracticeItems,
          meaningRecallItems:
            hsk2VocabularyPracticeResult.summary.meaningRecallItems,
          pinyinRecognitionItems:
            hsk2VocabularyPracticeResult.summary.pinyinRecognitionItems,
          listeningSelectionItems:
            hsk2VocabularyPracticeResult.summary.listeningSelectionItems,
          reviewedAudioItems:
            hsk2VocabularyPracticeResult.summary.reviewedAudioItems,
          measurementEligibleItems:
            hsk2VocabularyPracticeResult.summary.measurementEligibleItems,
          reviewed: false,
          learnerVisible: false,
        },
        hsk2CharacterPractice: {
          lessons: hsk2CharacterPracticeResult.summary.lessons,
          characters: hsk2CharacterPracticeResult.summary.characterDrafts,
          vocabularyContextMapped:
            hsk2CharacterPracticeResult.summary
              .charactersWithVocabularyContext,
          vocabularyContextGaps:
            hsk2CharacterPracticeResult.summary
              .charactersWithoutVocabularyContext,
          pinnedStrokeMetadata:
            hsk2CharacterPracticeResult.summary
              .charactersWithPinnedStrokeMetadata,
          authoredPracticeItems:
            hsk2CharacterPracticeResult.summary.authoredPracticeItems,
          measurementEligibleItems:
            hsk2CharacterPracticeResult.summary.measurementEligibleItems,
          reviewed: false,
          learnerVisible: false,
        },
        hsk2GrammarContext: {
          lessons: hsk2GrammarContextResult.summary.sentenceChainLessons,
          grammarDrafts: hsk2GrammarContextResult.summary.grammarDrafts,
          modelExamples: hsk2GrammarContextResult.summary.modelExamples,
          guidedPracticeItems:
            hsk2GrammarContextResult.summary.guidedPracticeItems,
          reviewBatches: hsk2GrammarContextResult.summary.reviewBatches,
          approvals: hsk2GrammarContextResult.summary.approvals,
          measurementEligibleItems:
            hsk2GrammarContextResult.summary.measurementEligibleItems,
          reviewed: false,
          learnerVisible: false,
        },
        hsk1PersonalExchange: {
          lessons: hsk1PersonalPackResult.summary.lessons,
          tasks: hsk1PersonalPackResult.summary.taskBlueprintMappings,
          topics: hsk1PersonalPackResult.summary.topicBlueprintMappings,
          vocabulary: hsk1PersonalPackResult.summary.vocabularyDrafts,
          grammarRows:
            hsk1PersonalPackResult.summary.grammarBlueprintMappings,
          dialogueTurns: hsk1PersonalPackResult.summary.dialogueTurns,
          authoredPracticeItems:
            hsk1PersonalPackResult.summary.authoredPracticeItems,
          reviewed: false,
          learnerVisible: false,
        },
        hsk1CommunicativeUnits: {
          units: hsk1CommunicativePacksResult.summary.units,
          lessons: hsk1CommunicativePacksResult.summary.lessons,
          tasks: hsk1CommunicativePacksResult.summary.taskBlueprintMappings,
          topics: hsk1CommunicativePacksResult.summary.topicBlueprintMappings,
          vocabulary: hsk1CommunicativePacksResult.summary.vocabularyDrafts,
          grammarRows:
            hsk1CommunicativePacksResult.summary.grammarBlueprintMappings,
          dialogueTurns: hsk1CommunicativePacksResult.summary.dialogueTurns,
          authoredPracticeItems:
            hsk1CommunicativePacksResult.summary.authoredPracticeItems,
          reviewed: false,
          learnerVisible: false,
        },
        hsk1CharacterFoundation: {
          lessons: hsk1CharacterPackResult.summary.lessons,
          recognitionCharacters:
            hsk1CharacterPackResult.summary.characterDrafts,
          vocabularyContextMapped:
            hsk1CharacterPackResult.summary.charactersWithVocabularyContext,
          pinnedStrokeMetadata:
            hsk1CharacterPackResult.summary
              .charactersWithPinnedStrokeMetadata,
          authoredPracticeItems:
            hsk1CharacterPackResult.summary.authoredPracticeItems,
          reviewed: false,
          learnerVisible: false,
        },
        hsk1GrammarContext: {
          communicativeLessonBlueprints:
            hsk1GrammarPackResult.summary.communicativeLessonBlueprints,
          lessonsWithGrammarPractice:
            hsk1GrammarPackResult.summary.lessonsWithGrammarPractice,
          grammarRows: hsk1GrammarPackResult.summary.grammarDrafts,
          modelExamples: hsk1GrammarPackResult.summary.modelExamples,
          authoredPracticeItems:
            hsk1GrammarPackResult.summary.guidedPracticeItems,
          measurementEligibleItems:
            hsk1GrammarPackResult.summary.measurementEligibleItems,
          reviewed: false,
          learnerVisible: false,
        },
        hsk1TaskAssessment: {
          tasks: hsk1TaskPackResult.summary.taskScenarios,
          topics: hsk1TaskPackResult.summary.topicDrafts,
          dialogueTurns: hsk1TaskPackResult.summary.modelDialogueTurns,
          authoredPracticeItems:
            hsk1TaskPackResult.summary.guidedRoleplayItems,
          authoredLevelCheckItems:
            hsk1TaskPackResult.summary.authoredLevelCheckItems,
          calibrated: false,
          reviewed: false,
          learnerVisible: false,
        },
        hsk1LevelCheckObjectiveBank: {
          objectiveItems:
            hsk1LevelCheckResult.summary.objectiveItems,
          listeningItems:
            hsk1LevelCheckResult.summary.listeningItems,
          readingItems:
            hsk1LevelCheckResult.summary.readingItems,
          vocabularyItems:
            hsk1LevelCheckResult.summary.vocabularyItems,
          grammarItems:
            hsk1LevelCheckResult.summary.grammarItems,
          reviewedItems:
            hsk1LevelCheckResult.summary.reviewedItems,
          calibratedItems:
            hsk1LevelCheckResult.summary.calibratedItems,
          measurementEligibleItems:
            hsk1LevelCheckResult.summary.measurementEligibleItems,
          independentFormsComplete: false,
          reviewedAudioComplete: false,
          learnerVisible: false,
        },
        hsk1HumanReviewQueue: {
          sourceArtifacts:
            hsk1ReviewManifestResult.summary.sourceArtifacts,
          reviewBatches: hsk1ReviewManifestResult.summary.reviewBatches,
          pendingBatches: hsk1ReviewManifestResult.summary.pendingBatches,
          approvals: hsk1ReviewManifestResult.summary.approvals,
        },
      },
      learningMaterials: {
        runtimeLessons: runtime.lessons.length,
        runtimeGradedTexts: runtime.stories.length,
        curriculumPaths: curriculumResult.summary.paths,
        curriculumUnits: curriculumResult.summary.units,
      },
    },
    coverageClaims: LEVELS.map((level) => ({
      level,
      complete: false,
      reason:
        "Official inventory exists, but task/topic/grammar coverage and reviewed learning mappings are incomplete.",
    })),
  };
};

export const serializeHsk4CoverageReport = (report) =>
  `${JSON.stringify(report, null, 2)}\n`;

const main = () => {
  const root = process.cwd();
  const outputPath = join(root, HSK4_COVERAGE_REPORT_RELATIVE_PATH);
  const serialized = serializeHsk4CoverageReport(
    buildHsk4CoverageReport(root),
  );
  if (process.argv.includes("--write")) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized, "utf8");
    console.log(`Wrote ${HSK4_COVERAGE_REPORT_RELATIVE_PATH}`);
    return;
  }
  if (process.argv.includes("--check")) {
    const current = readFileSync(outputPath, "utf8");
    if (current !== serialized) {
      throw new Error(
        `${HSK4_COVERAGE_REPORT_RELATIVE_PATH} is stale; run npm run content:hsk4:report -- --write`,
      );
    }
    console.log(`${HSK4_COVERAGE_REPORT_RELATIVE_PATH} is current`);
    return;
  }
  process.stdout.write(serialized);
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
