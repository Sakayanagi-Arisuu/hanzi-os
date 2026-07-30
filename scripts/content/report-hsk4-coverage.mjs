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
  assertValidHsk3CurriculumScopeBundle,
} from "../../src/content/hsk3CurriculumScope.mjs";
import {
  assertValidHsk4CurriculumScopeBundle,
  loadHsk4CurriculumScopeBundle,
} from "../../src/content/hsk4CurriculumScope.mjs";
import {
  assertValidHsk4LessonBlueprintsBundle,
  loadHsk4LessonBlueprintsBundle,
} from "../../src/content/hsk4LessonBlueprints.mjs";
import {
  assertValidHsk4PersonalCommunityLongFormPackBundle,
  loadHsk4PersonalCommunityLongFormPackBundle,
} from "../../src/content/hsk4PersonalCommunityLongFormPack.mjs";
import {
  assertValidHsk3VocabularyDraftBundle,
} from "../../src/content/hsk3VocabularyDraft.mjs";
import {
  assertValidHsk3LessonBlueprintsBundle,
} from "../../src/content/hsk3LessonBlueprints.mjs";
import {
  assertValidHsk3StructuredExplanationPackBundle,
} from "../../src/content/hsk3StructuredExplanationPack.mjs";
import {
  assertValidHsk3LevelAssessmentBundle,
  loadHsk3LevelAssessmentBundle,
} from "../../src/content/hsk3LevelAssessment.mjs";
import {
  loadHsk3ReviewManifestBundle,
} from "../../src/content/hsk3ReviewManifest.mjs";
import {
  loadHsk2VocabularyDraftBundle,
} from "../../src/content/hsk2VocabularyDraft.mjs";
import {
  loadHsk2LessonBlueprintsBundle,
} from "../../src/content/hsk2LessonBlueprints.mjs";
import {
  loadHsk2VocabularyPracticeBundle,
} from "../../src/content/hsk2VocabularyPractice.mjs";
import {
  loadHsk2CharacterPracticeBundle,
} from "../../src/content/hsk2CharacterPractice.mjs";
import {
  loadHsk2GrammarContextBundle,
} from "../../src/content/hsk2GrammarContext.mjs";
import {
  loadHsk2SituationalDialoguesBundle,
} from "../../src/content/hsk2SituationalDialogues.mjs";
import {
  loadHsk2ShortTextProductionBundle,
} from "../../src/content/hsk2ShortTextProduction.mjs";
import {
  loadHsk2LevelAssessmentBundle,
} from "../../src/content/hsk2LevelAssessment.mjs";
import {
  loadHsk2ReviewManifestBundle,
} from "../../src/content/hsk2ReviewManifest.mjs";
import {
  loadHsk1PersonalExchangePackBundle,
} from "../../src/content/hsk1PersonalExchangePack.mjs";
import {
  loadHsk1CommunicativeUnitPacksBundle,
} from "../../src/content/hsk1CommunicativeUnitPacks.mjs";
import {
  loadHsk1CharacterFoundationPackBundle,
} from "../../src/content/hsk1CharacterFoundationPack.mjs";
import {
  loadHsk1GrammarContextPackBundle,
} from "../../src/content/hsk1GrammarContextPack.mjs";
import {
  loadHsk1TaskAssessmentPackBundle,
} from "../../src/content/hsk1TaskAssessmentPack.mjs";
import {
  loadHsk1LevelCheckItemBankBundle,
} from "../../src/content/hsk1LevelCheckItemBank.mjs";
import {
  loadHsk1ReviewManifestBundle,
} from "../../src/content/hsk1ReviewManifest.mjs";
import {
  assertValidHskSyllabusBundle,
  fileSha256,
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

const assertPinnedReviewManifestForReport = ({
  root,
  manifest,
  expectedId,
}) => {
  const sources = Array.isArray(manifest?.sources)
    ? manifest.sources
    : [];
  const batches = Array.isArray(manifest?.reviewBatches)
    ? manifest.reviewBatches
    : [];
  const pendingBatches = batches.filter(
    (batch) => batch.state === "pending",
  ).length;
  const approvals = batches.reduce(
    (total, batch) => total + (batch.approvalCount ?? 0),
    0,
  );
  if (
    manifest?.manifestId !== expectedId
    || manifest?.state !== "ready-for-human-review-assignment"
    || manifest?.learnerVisible !== false
    || manifest?.releaseEligible !== false
    || sources.length === 0
    || new Set(batches.map((batch) => batch.batchId)).size
      !== batches.length
    || pendingBatches !== batches.length
    || approvals !== 0
    || manifest?.counts?.sourceArtifacts !== sources.length
    || manifest?.counts?.reviewBatches !== batches.length
    || manifest?.counts?.pendingBatches !== pendingBatches
    || manifest?.counts?.approvals !== approvals
  ) {
    throw new Error(`${expectedId} report binding is invalid`);
  }
  for (const source of sources) {
    if (
      typeof source.relativePath !== "string"
      || !source.relativePath.startsWith("content/")
      || source.relativePath.includes("..")
      || fileSha256(join(root, source.relativePath)) !== source.sha256
    ) {
      throw new Error(`${expectedId} report source binding is stale`);
    }
  }
  return { summary: manifest.counts };
};

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
  const hsk4Scope = loadHsk4CurriculumScopeBundle(root);
  const hsk4ScopeResult = assertValidHsk4CurriculumScopeBundle(hsk4Scope);
  const hsk4LessonBlueprints = loadHsk4LessonBlueprintsBundle(root);
  const hsk4LessonBlueprintsResult =
    assertValidHsk4LessonBlueprintsBundle(hsk4LessonBlueprints);
  const hsk4PersonalCommunity =
    loadHsk4PersonalCommunityLongFormPackBundle(root);
  const hsk4PersonalCommunityResult =
    assertValidHsk4PersonalCommunityLongFormPackBundle(
      hsk4PersonalCommunity,
    );
  const hsk4Vocabulary = hsk4LessonBlueprints.vocabularyBundle;
  const hsk4VocabularyResult = {
    counts: hsk4Vocabulary.draft.counts,
  };
  const hsk3LevelAssessment = loadHsk3LevelAssessmentBundle(root);
  const hsk3LevelAssessmentResult =
    assertValidHsk3LevelAssessmentBundle(hsk3LevelAssessment);
  const hsk3ReviewManifest = loadHsk3ReviewManifestBundle(root);
  const hsk3ReviewManifestResult =
    assertPinnedReviewManifestForReport({
      root,
      manifest: hsk3ReviewManifest.manifest,
      expectedId: "hsk3-review-manifest-2026.07",
    });
  const hsk3StructuredExplanation =
    hsk3LevelAssessment.sourceBundle;
  const hsk3StructuredExplanationResult =
    assertValidHsk3StructuredExplanationPackBundle(
      hsk3StructuredExplanation,
    );
  const hsk3GuidedParagraph =
    hsk3StructuredExplanation.prerequisiteBundle;
  const hsk3GuidedParagraphResult = {
    summary: hsk3GuidedParagraph.pack.counts,
  };
  const hsk3EventRetelling = hsk3GuidedParagraph.prerequisiteBundle;
  const hsk3EventRetellingResult = {
    summary: hsk3EventRetelling.pack.counts,
  };
  const hsk3CohesionReconstruction =
    hsk3EventRetelling.prerequisiteBundle;
  const hsk3CohesionReconstructionResult = {
    summary: hsk3CohesionReconstruction.pack.counts,
  };
  const hsk3GuidedNotes =
    hsk3CohesionReconstruction.prerequisiteBundle;
  const hsk3GuidedNotesResult = {
    summary: hsk3GuidedNotes.pack.counts,
  };
  const hsk3CultureTraditionDomain =
    hsk3StructuredExplanation.paragraphBundle;
  const hsk3CultureTraditionDomainResult = {
    summary: hsk3CultureTraditionDomain.pack.counts,
  };
  const hsk3SocietyArtsSportsDomain =
    hsk3CultureTraditionDomain.prerequisiteBundles[0];
  const hsk3SocietyArtsSportsDomainResult = {
    summary: hsk3SocietyArtsSportsDomain.pack.counts,
  };
  const hsk3NatureEnvironmentDomain =
    hsk3SocietyArtsSportsDomain.prerequisiteBundles[0];
  const hsk3NatureEnvironmentDomainResult = {
    summary: hsk3NatureEnvironmentDomain.pack.counts,
  };
  const hsk3StudyWorkDomain =
    hsk3NatureEnvironmentDomain.prerequisiteBundles[0];
  const hsk3StudyWorkDomainResult = {
    summary: hsk3StudyWorkDomain.pack.counts,
  };
  const hsk3PersonalDomain =
    hsk3StudyWorkDomain.prerequisiteBundles[0];
  const hsk3PersonalDomainResult = {
    summary: hsk3PersonalDomain.pack.counts,
  };
  const hsk3PersonalParagraph = hsk3PersonalDomain.priorLessonBundle;
  const hsk3PersonalParagraphResult = {
    summary: hsk3PersonalParagraph.pack.counts,
  };
  const hsk3LessonBlueprints =
    hsk3StructuredExplanation.blueprintBundle;
  const hsk3LessonBlueprintsResult =
    assertValidHsk3LessonBlueprintsBundle(hsk3LessonBlueprints);
  const hsk3Vocabulary = hsk3LessonBlueprints.vocabularyBundle;
  const hsk3VocabularyResult =
    assertValidHsk3VocabularyDraftBundle(hsk3Vocabulary);
  const hsk3Scope = hsk3LessonBlueprints.scopeBundle;
  const hsk3ScopeResult =
    assertValidHsk3CurriculumScopeBundle(hsk3Scope);
  const hsk3DiscourseLinkingNarration = hsk3GuidedNotes.narrationBundle;
  const hsk3DiscourseLinkingNarrationResult = {
    summary: hsk3DiscourseLinkingNarration.pack.counts,
  };
  const hsk3ComparisonEvaluationNarration =
    hsk3DiscourseLinkingNarration.prerequisiteBundles[0];
  const hsk3EventComplementsNarration =
    hsk3ComparisonEvaluationNarration.prerequisiteBundles[0];
  const hsk3ModalityTimeNarration =
    hsk3EventComplementsNarration.prerequisiteBundles[0];
  const hsk3ReferenceQuantityNarration =
    hsk3ModalityTimeNarration.prerequisiteBundles[0];
  const hsk3ReferenceQuantityNarrationResult = {
    summary: hsk3ReferenceQuantityNarration.pack.counts,
  };
  const hsk3ModalityTimeNarrationResult = {
    summary: hsk3ModalityTimeNarration.pack.counts,
  };
  const hsk3EventComplementsNarrationResult = {
    summary: hsk3EventComplementsNarration.pack.counts,
  };
  const hsk3ComparisonEvaluationNarrationResult = {
    summary: hsk3ComparisonEvaluationNarration.pack.counts,
  };
  const hsk2ReviewManifest = loadHsk2ReviewManifestBundle(root);
  const hsk2ReviewManifestResult =
    assertPinnedReviewManifestForReport({
      root,
      manifest: hsk2ReviewManifest.manifest,
      expectedId: "hsk2-review-manifest-2026.07",
    });
  const hsk2Vocabulary = loadHsk2VocabularyDraftBundle(root);
  const hsk2VocabularyResult = {
    counts: hsk2Vocabulary.draft.counts,
  };
  const hsk2LessonBlueprints = loadHsk2LessonBlueprintsBundle(root);
  const hsk2LessonBlueprintsResult = {
    summary: hsk2LessonBlueprints.pack.counts,
  };
  const hsk2VocabularyPractice = loadHsk2VocabularyPracticeBundle(root);
  const hsk2VocabularyPracticeResult = {
    summary: hsk2VocabularyPractice.pack.counts,
  };
  const hsk2CharacterPractice = loadHsk2CharacterPracticeBundle(root);
  const hsk2CharacterPracticeResult = {
    summary: hsk2CharacterPractice.pack.counts,
  };
  const hsk2GrammarContext = loadHsk2GrammarContextBundle(root);
  const hsk2GrammarContextResult = {
    summary: hsk2GrammarContext.pack.counts,
  };
  const hsk2SituationalDialogues =
    loadHsk2SituationalDialoguesBundle(root);
  const hsk2SituationalDialoguesResult = {
    summary: hsk2SituationalDialogues.pack.counts,
  };
  const hsk2ShortTextProduction =
    loadHsk2ShortTextProductionBundle(root);
  const hsk2ShortTextProductionResult = {
    summary: hsk2ShortTextProduction.pack.counts,
  };
  const hsk2LevelAssessment = loadHsk2LevelAssessmentBundle(root);
  const hsk2LevelAssessmentResult = {
    summary: hsk2LevelAssessment.bank.counts,
  };
  const hsk1ReviewManifest = loadHsk1ReviewManifestBundle(root);
  const hsk1ReviewManifestResult =
    assertPinnedReviewManifestForReport({
      root,
      manifest: hsk1ReviewManifest.manifest,
      expectedId: "hsk1-review-manifest-2026.07",
    });
  const hsk1PersonalPack = loadHsk1PersonalExchangePackBundle(root);
  const hsk1PersonalPackResult = {
    summary: hsk1PersonalPack.pack.counts,
  };
  const hsk1CommunicativePacks =
    loadHsk1CommunicativeUnitPacksBundle(root);
  const hsk1CommunicativePacksResult = {
    summary: hsk1CommunicativePacks.collection.counts,
  };
  const hsk1CharacterPack = loadHsk1CharacterFoundationPackBundle(root);
  const hsk1CharacterPackResult = {
    summary: hsk1CharacterPack.pack.counts,
  };
  const hsk1GrammarPack = loadHsk1GrammarContextPackBundle(root);
  const hsk1GrammarPackResult = {
    summary: hsk1GrammarPack.pack.counts,
  };
  const hsk1TaskPack = loadHsk1TaskAssessmentPackBundle(root);
  const hsk1TaskPackResult = {
    summary: hsk1TaskPack.pack.counts,
  };
  const hsk1LevelCheck = loadHsk1LevelCheckItemBankBundle(root);
  const hsk1LevelCheckResult = {
    summary: hsk1LevelCheck.bank.counts,
  };
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
        hsk3: {
          units: hsk3ScopeResult.summary.units,
          discourseDomains: hsk3ScopeResult.summary.discourseDomains,
          grammarModules: hsk3ScopeResult.summary.grammarModules,
          productionStages: hsk3ScopeResult.summary.productionStages,
          plannedLessonBlueprints:
            hsk3ScopeResult.summary.plannedLessonBlueprints,
          plannedMinimumPromptUnits:
            hsk3ScopeResult.summary.plannedMinimumPromptUnits,
          tasks: hsk3ScopeResult.summary.tasks,
          topics: hsk3ScopeResult.summary.topics,
          vocabulary: hsk3ScopeResult.summary.vocabulary,
          recognitionCharacters:
            hsk3ScopeResult.summary.recognitionCharacters,
          grammarRows: hsk3ScopeResult.summary.grammarRows,
          lessonPracticeCoverageComplete: false,
        },
        hsk4: {
          units: hsk4ScopeResult.summary.units,
          discourseDomains: hsk4ScopeResult.summary.discourseDomains,
          grammarModules: hsk4ScopeResult.summary.grammarModules,
          integrationStages: hsk4ScopeResult.summary.integrationStages,
          timedIntegrationStages:
            hsk4ScopeResult.summary.timedIntegrationStages,
          plannedLessonBlueprints:
            hsk4ScopeResult.summary.plannedLessonBlueprints,
          plannedMinimumPromptUnits:
            hsk4ScopeResult.summary.plannedMinimumPromptUnits,
          tasks: hsk4ScopeResult.summary.tasks,
          topics: hsk4ScopeResult.summary.topics,
          vocabulary: hsk4ScopeResult.summary.vocabulary,
          recognitionCharacters:
            hsk4ScopeResult.summary.recognitionCharacters,
          grammarRows: hsk4ScopeResult.summary.grammarRows,
          lessonPracticeCoverageComplete: false,
          calibratedMockComplete: false,
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
        hsk4VocabularyBacklog: {
          officialVocabulary:
            hsk4VocabularyResult.counts.officialVocabulary,
          sourceMatched: hsk4VocabularyResult.counts.sourceMatched,
          sourceMatches: hsk4VocabularyResult.counts.sourceMatches,
          multipleSourceMatchEntries:
            hsk4VocabularyResult.counts.multipleSourceMatchEntries,
          pronunciationReviewPending:
            hsk4VocabularyResult.counts.pronunciationReviewPending,
          sourceCoverageGaps:
            hsk4VocabularyResult.counts.officialVocabulary
            - hsk4VocabularyResult.counts.sourceMatched,
          vietnameseGlossReviewed:
            hsk4VocabularyResult.counts.vietnameseGlossReviewed,
          releaseEligible: hsk4VocabularyResult.counts.releaseEligible,
          learnerVisible: false,
        },
        hsk4LessonBlueprints: {
          lessons: hsk4LessonBlueprintsResult.summary.lessons,
          deepComprehensionLessons:
            hsk4LessonBlueprintsResult.summary.deepComprehensionLessons,
          summaryArgumentLessons:
            hsk4LessonBlueprintsResult.summary.summaryArgumentLessons,
          timedIntegrationLessons:
            hsk4LessonBlueprintsResult.summary.timedIntegrationLessons,
          tasks: hsk4LessonBlueprintsResult.summary.taskBlueprintMappings,
          topics: hsk4LessonBlueprintsResult.summary.topicBlueprintMappings,
          vocabulary:
            hsk4LessonBlueprintsResult.summary.vocabularyBlueprintMappings,
          grammarRows:
            hsk4LessonBlueprintsResult.summary.grammarBlueprintMappings,
          recognitionCharacters:
            hsk4LessonBlueprintsResult.summary
              .recognitionCharacterBlueprintMappings,
          sourceSenseKeywordMatches:
            hsk4LessonBlueprintsResult.summary.sourceSenseKeywordMatches,
          foundationFallbackVocabulary:
            hsk4LessonBlueprintsResult.summary.foundationFallbackVocabulary,
          charactersWithIncrementalVocabularyContext:
            hsk4LessonBlueprintsResult.summary
              .charactersWithIncrementalVocabularyContext,
          charactersWithoutIncrementalVocabularyContext:
            hsk4LessonBlueprintsResult.summary
              .charactersWithoutIncrementalVocabularyContext,
          timedLessonBlueprints:
            hsk4LessonBlueprintsResult.summary.timedLessonBlueprints,
          plannedMinimumPromptUnits:
            hsk4LessonBlueprintsResult.summary.plannedMinimumPromptUnits,
          authoredPracticeItems:
            hsk4LessonBlueprintsResult.summary.authoredPracticeItems,
          reviewed: false,
          learnerVisible: false,
        },
        hsk4PersonalCommunityLongFormDraft: {
          lessons: hsk4PersonalCommunityResult.summary.lessons,
          completedLongFormDomains:
            hsk4PersonalCommunityResult.summary.completedLongFormDomains,
          completedLongFormLessons:
            hsk4PersonalCommunityResult.summary.completedLongFormLessons,
          mappedTopics:
            hsk4PersonalCommunityResult.summary.mappedTopics,
          targetLexemeContexts:
            hsk4PersonalCommunityResult.summary.targetLexemeContexts,
          authoredTexts:
            hsk4PersonalCommunityResult.summary.authoredTexts,
          authoredParagraphs:
            hsk4PersonalCommunityResult.summary.authoredParagraphs,
          vocabularyPracticeItems:
            hsk4PersonalCommunityResult.summary.vocabularyPracticeItems,
          comprehensionItems:
            hsk4PersonalCommunityResult.summary.comprehensionItems,
          evidenceBoundComprehensionItems:
            hsk4PersonalCommunityResult.summary
              .evidenceBoundComprehensionItems,
          inferenceItems:
            hsk4PersonalCommunityResult.summary.inferenceItems,
          noteMapItems:
            hsk4PersonalCommunityResult.summary.noteMapItems,
          noteMapNodes:
            hsk4PersonalCommunityResult.summary.noteMapNodes,
          synthesisPrompts:
            hsk4PersonalCommunityResult.summary.synthesisPrompts,
          authoredPracticeItems:
            hsk4PersonalCommunityResult.summary.authoredPracticeItems,
          audioDependentItems:
            hsk4PersonalCommunityResult.summary.audioDependentItems,
          reviewedAudioItems:
            hsk4PersonalCommunityResult.summary.reviewedAudioItems,
          measurementEligibleItems:
            hsk4PersonalCommunityResult.summary.measurementEligibleItems,
          reviewed: false,
          learnerVisible: false,
        },
        hsk3VocabularyBacklog: {
          officialVocabulary:
            hsk3VocabularyResult.counts.officialVocabulary,
          sourceMatched: hsk3VocabularyResult.counts.sourceMatched,
          sourceMatches: hsk3VocabularyResult.counts.sourceMatches,
          multipleSourceMatchEntries:
            hsk3VocabularyResult.counts.multipleSourceMatchEntries,
          pronunciationReviewPending:
            hsk3VocabularyResult.counts.pronunciationReviewPending,
          vietnameseGlossReviewed:
            hsk3VocabularyResult.counts.vietnameseGlossReviewed,
          releaseEligible: hsk3VocabularyResult.counts.releaseEligible,
          learnerVisible: false,
        },
        hsk3LessonBlueprints: {
          lessons: hsk3LessonBlueprintsResult.summary.lessons,
          paragraphInputLessons:
            hsk3LessonBlueprintsResult.summary.paragraphInputLessons,
          narrationGrammarLessons:
            hsk3LessonBlueprintsResult.summary.narrationGrammarLessons,
          guidedProductionLessons:
            hsk3LessonBlueprintsResult.summary.guidedProductionLessons,
          tasks: hsk3LessonBlueprintsResult.summary.taskBlueprintMappings,
          topics: hsk3LessonBlueprintsResult.summary.topicBlueprintMappings,
          vocabulary:
            hsk3LessonBlueprintsResult.summary.vocabularyBlueprintMappings,
          grammarRows:
            hsk3LessonBlueprintsResult.summary.grammarBlueprintMappings,
          recognitionCharacters:
            hsk3LessonBlueprintsResult.summary
              .recognitionCharacterBlueprintMappings,
          sourceSenseKeywordMatches:
            hsk3LessonBlueprintsResult.summary.sourceSenseKeywordMatches,
          foundationFallbackVocabulary:
            hsk3LessonBlueprintsResult.summary.foundationFallbackVocabulary,
          charactersWithIncrementalVocabularyContext:
            hsk3LessonBlueprintsResult.summary
              .charactersWithIncrementalVocabularyContext,
          charactersWithoutIncrementalVocabularyContext:
            hsk3LessonBlueprintsResult.summary
              .charactersWithoutIncrementalVocabularyContext,
          plannedMinimumPromptUnits:
            hsk3LessonBlueprintsResult.summary.plannedMinimumPromptUnits,
          authoredPracticeItems:
            hsk3LessonBlueprintsResult.summary.authoredPracticeItems,
          reviewed: false,
          learnerVisible: false,
        },
        hsk3PersonalParagraph: {
          lessons: hsk3PersonalParagraphResult.summary.lessons,
          vocabularyDrafts:
            hsk3PersonalParagraphResult.summary.vocabularyDrafts,
          authoredTexts: hsk3PersonalParagraphResult.summary.authoredTexts,
          authoredTextLines:
            hsk3PersonalParagraphResult.summary.authoredTextLines,
          vocabularyPracticeItems:
            hsk3PersonalParagraphResult.summary.vocabularyPracticeItems,
          comprehensionItems:
            hsk3PersonalParagraphResult.summary.comprehensionItems,
          readingComprehensionItems:
            hsk3PersonalParagraphResult.summary.readingComprehensionItems,
          listeningComprehensionItems:
            hsk3PersonalParagraphResult.summary.listeningComprehensionItems,
          noteGridItems: hsk3PersonalParagraphResult.summary.noteGridItems,
          guidedSummaryItems:
            hsk3PersonalParagraphResult.summary.guidedSummaryItems,
          authoredPracticeItems:
            hsk3PersonalParagraphResult.summary.authoredPracticeItems,
          audioDependentItems:
            hsk3PersonalParagraphResult.summary.audioDependentItems,
          reviewedAudioItems:
            hsk3PersonalParagraphResult.summary.reviewedAudioItems,
          measurementEligibleItems:
            hsk3PersonalParagraphResult.summary.measurementEligibleItems,
          reviewed: false,
          learnerVisible: false,
        },
        hsk3PersonalDomainDraft: {
          lessons:
            hsk3PersonalParagraphResult.summary.lessons
            + hsk3PersonalDomainResult.summary.lessons,
          vocabularyDrafts:
            hsk3PersonalParagraphResult.summary.vocabularyDrafts
            + hsk3PersonalDomainResult.summary.vocabularyDrafts,
          authoredTexts:
            hsk3PersonalParagraphResult.summary.authoredTexts
            + hsk3PersonalDomainResult.summary.authoredTexts,
          authoredTextLines:
            hsk3PersonalParagraphResult.summary.authoredTextLines
            + hsk3PersonalDomainResult.summary.authoredTextLines,
          vocabularyPracticeItems:
            hsk3PersonalParagraphResult.summary.vocabularyPracticeItems
            + hsk3PersonalDomainResult.summary.vocabularyPracticeItems,
          comprehensionItems:
            hsk3PersonalParagraphResult.summary.comprehensionItems
            + hsk3PersonalDomainResult.summary.comprehensionItems,
          noteGridItems:
            hsk3PersonalParagraphResult.summary.noteGridItems
            + hsk3PersonalDomainResult.summary.noteGridItems,
          guidedSummaryItems:
            hsk3PersonalParagraphResult.summary.guidedSummaryItems
            + hsk3PersonalDomainResult.summary.guidedSummaryItems,
          authoredPracticeItems:
            hsk3PersonalParagraphResult.summary.authoredPracticeItems
            + hsk3PersonalDomainResult.summary.authoredPracticeItems,
          audioDependentItems:
            hsk3PersonalParagraphResult.summary.audioDependentItems
            + hsk3PersonalDomainResult.summary.audioDependentItems,
          reviewBatches:
            hsk3PersonalParagraphResult.summary.reviewBatches
            + hsk3PersonalDomainResult.summary.reviewBatches,
          reviewedAudioItems: 0,
          measurementEligibleItems: 0,
          reviewed: false,
          learnerVisible: false,
        },
        hsk3ParagraphDomainsDraft: {
          completedDomains:
            hsk3CultureTraditionDomainResult.summary
              .completedParagraphDomainCount,
          lessons:
            hsk3PersonalParagraphResult.summary.lessons
            + hsk3PersonalDomainResult.summary.lessons
            + hsk3StudyWorkDomainResult.summary.lessons
            + hsk3NatureEnvironmentDomainResult.summary.lessons
            + hsk3SocietyArtsSportsDomainResult.summary.lessons
            + hsk3CultureTraditionDomainResult.summary.lessons,
          vocabularyDrafts:
            hsk3PersonalParagraphResult.summary.vocabularyDrafts
            + hsk3PersonalDomainResult.summary.vocabularyDrafts
            + hsk3StudyWorkDomainResult.summary.vocabularyDrafts
            + hsk3NatureEnvironmentDomainResult.summary.vocabularyDrafts
            + hsk3SocietyArtsSportsDomainResult.summary.vocabularyDrafts
            + hsk3CultureTraditionDomainResult.summary.vocabularyDrafts,
          authoredTexts:
            hsk3PersonalParagraphResult.summary.authoredTexts
            + hsk3PersonalDomainResult.summary.authoredTexts
            + hsk3StudyWorkDomainResult.summary.authoredTexts
            + hsk3NatureEnvironmentDomainResult.summary.authoredTexts
            + hsk3SocietyArtsSportsDomainResult.summary.authoredTexts
            + hsk3CultureTraditionDomainResult.summary.authoredTexts,
          authoredTextLines:
            hsk3PersonalParagraphResult.summary.authoredTextLines
            + hsk3PersonalDomainResult.summary.authoredTextLines
            + hsk3StudyWorkDomainResult.summary.authoredTextLines
            + hsk3NatureEnvironmentDomainResult.summary.authoredTextLines
            + hsk3SocietyArtsSportsDomainResult.summary.authoredTextLines
            + hsk3CultureTraditionDomainResult.summary.authoredTextLines,
          vocabularyPracticeItems:
            hsk3PersonalParagraphResult.summary.vocabularyPracticeItems
            + hsk3PersonalDomainResult.summary.vocabularyPracticeItems
            + hsk3StudyWorkDomainResult.summary.vocabularyPracticeItems
            + hsk3NatureEnvironmentDomainResult.summary
              .vocabularyPracticeItems
            + hsk3SocietyArtsSportsDomainResult.summary
              .vocabularyPracticeItems
            + hsk3CultureTraditionDomainResult.summary
              .vocabularyPracticeItems,
          comprehensionItems:
            hsk3PersonalParagraphResult.summary.comprehensionItems
            + hsk3PersonalDomainResult.summary.comprehensionItems
            + hsk3StudyWorkDomainResult.summary.comprehensionItems
            + hsk3NatureEnvironmentDomainResult.summary.comprehensionItems
            + hsk3SocietyArtsSportsDomainResult.summary.comprehensionItems
            + hsk3CultureTraditionDomainResult.summary.comprehensionItems,
          noteGridItems:
            hsk3PersonalParagraphResult.summary.noteGridItems
            + hsk3PersonalDomainResult.summary.noteGridItems
            + hsk3StudyWorkDomainResult.summary.noteGridItems
            + hsk3NatureEnvironmentDomainResult.summary.noteGridItems
            + hsk3SocietyArtsSportsDomainResult.summary.noteGridItems
            + hsk3CultureTraditionDomainResult.summary.noteGridItems,
          guidedSummaryItems:
            hsk3PersonalParagraphResult.summary.guidedSummaryItems
            + hsk3PersonalDomainResult.summary.guidedSummaryItems
            + hsk3StudyWorkDomainResult.summary.guidedSummaryItems
            + hsk3NatureEnvironmentDomainResult.summary.guidedSummaryItems
            + hsk3SocietyArtsSportsDomainResult.summary.guidedSummaryItems
            + hsk3CultureTraditionDomainResult.summary.guidedSummaryItems,
          authoredPracticeItems:
            hsk3PersonalParagraphResult.summary.authoredPracticeItems
            + hsk3PersonalDomainResult.summary.authoredPracticeItems
            + hsk3StudyWorkDomainResult.summary.authoredPracticeItems
            + hsk3NatureEnvironmentDomainResult.summary.authoredPracticeItems
            + hsk3SocietyArtsSportsDomainResult.summary.authoredPracticeItems
            + hsk3CultureTraditionDomainResult.summary.authoredPracticeItems,
          audioDependentItems:
            hsk3PersonalParagraphResult.summary.audioDependentItems
            + hsk3PersonalDomainResult.summary.audioDependentItems
            + hsk3StudyWorkDomainResult.summary.audioDependentItems
            + hsk3NatureEnvironmentDomainResult.summary.audioDependentItems
            + hsk3SocietyArtsSportsDomainResult.summary.audioDependentItems
            + hsk3CultureTraditionDomainResult.summary.audioDependentItems,
          reviewBatches:
            hsk3PersonalParagraphResult.summary.reviewBatches
            + hsk3PersonalDomainResult.summary.reviewBatches
            + hsk3StudyWorkDomainResult.summary.reviewBatches
            + hsk3NatureEnvironmentDomainResult.summary.reviewBatches
            + hsk3SocietyArtsSportsDomainResult.summary.reviewBatches
            + hsk3CultureTraditionDomainResult.summary.reviewBatches,
          reviewedAudioItems: 0,
          measurementEligibleItems: 0,
          reviewed: false,
          learnerVisible: false,
        },
        hsk3NarrationGrammarModulesDraft: {
          completedModules:
            hsk3DiscourseLinkingNarrationResult.summary
              .completedNarrationGrammarModules,
          lessons:
            hsk3ReferenceQuantityNarrationResult.summary.lessons
            + hsk3ModalityTimeNarrationResult.summary.lessons
            + hsk3EventComplementsNarrationResult.summary.lessons
            + hsk3ComparisonEvaluationNarrationResult.summary.lessons
            + hsk3DiscourseLinkingNarrationResult.summary.lessons,
          grammarDrafts:
            hsk3ReferenceQuantityNarrationResult.summary.grammarDrafts
            + hsk3ModalityTimeNarrationResult.summary.grammarDrafts
            + hsk3EventComplementsNarrationResult.summary.grammarDrafts
            + hsk3ComparisonEvaluationNarrationResult.summary.grammarDrafts
            + hsk3DiscourseLinkingNarrationResult.summary.grammarDrafts,
          modelExamples:
            hsk3ReferenceQuantityNarrationResult.summary.modelExamples
            + hsk3ModalityTimeNarrationResult.summary.modelExamples
            + hsk3EventComplementsNarrationResult.summary.modelExamples
            + hsk3ComparisonEvaluationNarrationResult.summary.modelExamples
            + hsk3DiscourseLinkingNarrationResult.summary.modelExamples,
          correctionPairs:
            hsk3ReferenceQuantityNarrationResult.summary.correctionPairs
            + hsk3ModalityTimeNarrationResult.summary.correctionPairs
            + hsk3EventComplementsNarrationResult.summary.correctionPairs
            + hsk3ComparisonEvaluationNarrationResult.summary.correctionPairs
            + hsk3DiscourseLinkingNarrationResult.summary.correctionPairs,
          modelNarrations:
            hsk3ReferenceQuantityNarrationResult.summary.modelNarrations
            + hsk3ModalityTimeNarrationResult.summary.modelNarrations
            + hsk3EventComplementsNarrationResult.summary.modelNarrations
            + hsk3ComparisonEvaluationNarrationResult.summary.modelNarrations
            + hsk3DiscourseLinkingNarrationResult.summary.modelNarrations,
          modelNarrationLines:
            hsk3ReferenceQuantityNarrationResult.summary.modelNarrationLines
            + hsk3ModalityTimeNarrationResult.summary.modelNarrationLines
            + hsk3EventComplementsNarrationResult.summary.modelNarrationLines
            + hsk3ComparisonEvaluationNarrationResult.summary
              .modelNarrationLines
            + hsk3DiscourseLinkingNarrationResult.summary.modelNarrationLines,
          grammarInParagraphItems:
            hsk3ReferenceQuantityNarrationResult.summary
              .grammarInParagraphItems
            + hsk3ModalityTimeNarrationResult.summary
              .grammarInParagraphItems
            + hsk3EventComplementsNarrationResult.summary
              .grammarInParagraphItems
            + hsk3ComparisonEvaluationNarrationResult.summary
              .grammarInParagraphItems
            + hsk3DiscourseLinkingNarrationResult.summary
              .grammarInParagraphItems,
          discourseErrorCorrectionItems:
            hsk3ReferenceQuantityNarrationResult.summary
              .discourseErrorCorrectionItems
            + hsk3ModalityTimeNarrationResult.summary
              .discourseErrorCorrectionItems
            + hsk3EventComplementsNarrationResult.summary
              .discourseErrorCorrectionItems
            + hsk3ComparisonEvaluationNarrationResult.summary
              .discourseErrorCorrectionItems
            + hsk3DiscourseLinkingNarrationResult.summary
              .discourseErrorCorrectionItems,
          orderedRetellingItems:
            hsk3ReferenceQuantityNarrationResult.summary.orderedRetellingItems
            + hsk3ModalityTimeNarrationResult.summary.orderedRetellingItems
            + hsk3EventComplementsNarrationResult.summary.orderedRetellingItems
            + hsk3ComparisonEvaluationNarrationResult.summary
              .orderedRetellingItems
            + hsk3DiscourseLinkingNarrationResult.summary.orderedRetellingItems,
          authoredPracticeItems:
            hsk3ReferenceQuantityNarrationResult.summary.authoredPracticeItems
            + hsk3ModalityTimeNarrationResult.summary.authoredPracticeItems
            + hsk3EventComplementsNarrationResult.summary.authoredPracticeItems
            + hsk3ComparisonEvaluationNarrationResult.summary
              .authoredPracticeItems
            + hsk3DiscourseLinkingNarrationResult.summary.authoredPracticeItems,
          reviewBatches:
            hsk3ReferenceQuantityNarrationResult.summary.reviewBatches
            + hsk3ModalityTimeNarrationResult.summary.reviewBatches
            + hsk3EventComplementsNarrationResult.summary.reviewBatches
            + hsk3ComparisonEvaluationNarrationResult.summary.reviewBatches
            + hsk3DiscourseLinkingNarrationResult.summary.reviewBatches,
          measurementEligibleItems: 0,
          reviewed: false,
          learnerVisible: false,
        },
        hsk3GuidedProductionStagesDraft: {
          lessons:
            hsk3GuidedNotesResult.summary.lessons
            + hsk3CohesionReconstructionResult.summary.lessons
            + hsk3EventRetellingResult.summary.lessons
            + hsk3GuidedParagraphResult.summary.lessons
            + hsk3StructuredExplanationResult.summary.lessons,
          completedGuidedProductionStages:
            hsk3StructuredExplanationResult.summary
              .completedGuidedProductionStages,
          completedGuidedProductionLessons:
            hsk3StructuredExplanationResult.summary
              .completedGuidedProductionLessons,
          allGuidedProductionLessonsDrafted: true,
          sourceTexts:
            hsk3GuidedNotesResult.summary.sourceTexts
            + hsk3CohesionReconstructionResult.summary.sourceTexts
            + hsk3EventRetellingResult.summary.sourceTexts
            + hsk3GuidedParagraphResult.summary.sourceTexts
            + hsk3StructuredExplanationResult.summary.sourceTexts,
          sourceTextLines:
            hsk3GuidedNotesResult.summary.sourceTextLines
            + hsk3CohesionReconstructionResult.summary.sourceTextLines
            + hsk3EventRetellingResult.summary.sourceTextLines
            + hsk3GuidedParagraphResult.summary.sourceTextLines
            + hsk3StructuredExplanationResult.summary.sourceTextLines,
          sourceInputBindings:
            hsk3GuidedNotesResult.summary.promptUnits
            + hsk3GuidedNotesResult.summary
              .integratedListeningReadingPromptUnits
            + hsk3CohesionReconstructionResult.summary.promptUnits
            + hsk3EventRetellingResult.summary.promptUnits
            + hsk3GuidedParagraphResult.summary.sourceInputBindings
            + hsk3StructuredExplanationResult.summary.sourceInputBindings,
          sourceGuidedSummaries:
            hsk3EventRetellingResult.summary.sourceGuidedSummaries
            + hsk3GuidedParagraphResult.summary.sourceGuidedSummaries
            + hsk3StructuredExplanationResult.summary
              .sourceGuidedSummaries,
          promptUnits:
            hsk3GuidedNotesResult.summary.promptUnits
            + hsk3CohesionReconstructionResult.summary.promptUnits
            + hsk3EventRetellingResult.summary.promptUnits
            + hsk3GuidedParagraphResult.summary.promptUnits
            + hsk3StructuredExplanationResult.summary.promptUnits,
          readingInputPromptUnits:
            hsk3GuidedNotesResult.summary.readingInputPromptUnits
            + hsk3CohesionReconstructionResult.summary.promptUnits
            + hsk3GuidedParagraphResult.summary.promptUnits,
          listeningInputPromptUnits:
            hsk3GuidedNotesResult.summary.listeningInputPromptUnits
            + hsk3EventRetellingResult.summary.promptUnits
            + hsk3StructuredExplanationResult.summary.promptUnits,
          integratedListeningReadingPromptUnits:
            hsk3GuidedNotesResult.summary
              .integratedListeningReadingPromptUnits,
          temporalOrderingPromptUnits:
            hsk3CohesionReconstructionResult.summary
              .temporalOrderingPromptUnits,
          referenceLinkerPromptUnits:
            hsk3CohesionReconstructionResult.summary
              .referenceLinkerPromptUnits,
          orderRationalePromptUnits:
            hsk3CohesionReconstructionResult.summary
              .orderRationalePromptUnits,
          noteCardRetellingPromptUnits:
            hsk3EventRetellingResult.summary
              .noteCardRetellingPromptUnits,
          changeCauseRetellingPromptUnits:
            hsk3EventRetellingResult.summary
              .changeCauseRetellingPromptUnits,
          structuredRetellingPromptUnits:
            hsk3EventRetellingResult.summary
              .structuredRetellingPromptUnits,
          modelRetellings:
            hsk3EventRetellingResult.summary.modelRetellings,
          sixSentencePromptUnits:
            hsk3GuidedParagraphResult.summary.sixSentencePromptUnits,
          comparisonPromptUnits:
            hsk3GuidedParagraphResult.summary.comparisonPromptUnits,
          eightSentencePromptUnits:
            hsk3GuidedParagraphResult.summary.eightSentencePromptUnits,
          dualSourcePromptUnits:
            hsk3GuidedParagraphResult.summary.dualSourcePromptUnits
            + hsk3StructuredExplanationResult.summary.promptUnits,
          modelEvidenceSummaries:
            hsk3GuidedParagraphResult.summary.modelEvidenceSummaries
            + hsk3StructuredExplanationResult.summary
              .modelEvidenceSummaries,
          minimumRequiredSentences:
            hsk3GuidedParagraphResult.summary.minimumRequiredSentences,
          choiceReasonPromptUnits:
            hsk3StructuredExplanationResult.summary.choiceReasonPromptUnits,
          criteriaComparisonPromptUnits:
            hsk3StructuredExplanationResult.summary
              .criteriaComparisonPromptUnits,
          boundedViewpointPromptUnits:
            hsk3StructuredExplanationResult.summary
              .boundedViewpointPromptUnits,
          minimumSpokenSentences:
            hsk3StructuredExplanationResult.summary
              .minimumSpokenSentences,
          requiredRecordingAttempts:
            hsk3StructuredExplanationResult.summary
              .requiredRecordingAttempts,
          revisionChecklists:
            hsk3GuidedNotesResult.summary.revisionChecklists
            + hsk3CohesionReconstructionResult.summary.revisionChecklists
            + hsk3EventRetellingResult.summary.revisionChecklists
            + hsk3GuidedParagraphResult.summary.revisionChecklists
            + hsk3StructuredExplanationResult.summary.revisionChecklists,
          audioDependentPromptUnits:
            hsk3GuidedNotesResult.summary.audioDependentPromptUnits
            + hsk3EventRetellingResult.summary.audioDependentPromptUnits
            + hsk3StructuredExplanationResult.summary
              .audioDependentPromptUnits,
          reviewedAudioPromptUnits:
            hsk3GuidedNotesResult.summary.reviewedAudioPromptUnits,
          learnerRecordingPromptUnits:
            hsk3EventRetellingResult.summary.learnerRecordingPromptUnits
            + hsk3StructuredExplanationResult.summary
              .learnerRecordingPromptUnits,
          reviewedLearnerRecordingRubrics:
            hsk3EventRetellingResult.summary
              .reviewedLearnerRecordingRubrics,
          measurementEligibleItems: 0,
          masteryEligibleItems: 0,
          reviewBatches:
            hsk3GuidedNotesResult.summary.reviewBatches
            + hsk3CohesionReconstructionResult.summary.reviewBatches
            + hsk3EventRetellingResult.summary.reviewBatches
            + hsk3GuidedParagraphResult.summary.reviewBatches
            + hsk3StructuredExplanationResult.summary.reviewBatches,
          approvals: 0,
          releaseEligibleItems: 0,
          reviewed: false,
          learnerVisible: false,
        },
        hsk3LevelAssessmentDraft: {
          forms: hsk3LevelAssessmentResult.summary.forms,
          itemsPerForm: hsk3LevelAssessmentResult.summary.itemsPerForm,
          totalItems: hsk3LevelAssessmentResult.summary.totalItems,
          objectiveItems:
            hsk3LevelAssessmentResult.summary.objectiveItems,
          constructedResponseItems:
            hsk3LevelAssessmentResult.summary.constructedResponseItems,
          listeningItems:
            hsk3LevelAssessmentResult.summary.listeningItems,
          readingItems:
            hsk3LevelAssessmentResult.summary.readingItems,
          vocabularyItems:
            hsk3LevelAssessmentResult.summary.vocabularyItems,
          grammarItems:
            hsk3LevelAssessmentResult.summary.grammarItems,
          speakingItems:
            hsk3LevelAssessmentResult.summary.speakingItems,
          writingItems:
            hsk3LevelAssessmentResult.summary.writingItems,
          audioDependentItems:
            hsk3LevelAssessmentResult.summary.audioDependentItems,
          reviewedAudioItems:
            hsk3LevelAssessmentResult.summary.reviewedAudioItems,
          sourceEntityOverlapBetweenForms:
            hsk3LevelAssessmentResult.summary
              .sourceEntityOverlapBetweenForms,
          reviewBatches:
            hsk3LevelAssessmentResult.summary.reviewBatches,
          reviewedItems:
            hsk3LevelAssessmentResult.summary.reviewedItems,
          calibratedItems:
            hsk3LevelAssessmentResult.summary.calibratedItems,
          measurementEligibleItems:
            hsk3LevelAssessmentResult.summary.measurementEligibleItems,
          masteryEligibleItems:
            hsk3LevelAssessmentResult.summary.masteryEligibleItems,
          prerequisiteWaiverEligibleItems:
            hsk3LevelAssessmentResult.summary
              .prerequisiteWaiverEligibleItems,
          releaseEligibleItems:
            hsk3LevelAssessmentResult.summary.releaseEligibleItems,
          reviewed: false,
          learnerVisible: false,
        },
        hsk3HumanReviewQueue: {
          sourceArtifacts:
            hsk3ReviewManifestResult.summary.sourceArtifacts,
          reviewBatches: hsk3ReviewManifestResult.summary.reviewBatches,
          pendingBatches: hsk3ReviewManifestResult.summary.pendingBatches,
          approvals: hsk3ReviewManifestResult.summary.approvals,
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
        hsk2SituationalDialogues: {
          lessons:
            hsk2SituationalDialoguesResult.summary.situationalLessons,
          taskDrafts:
            hsk2SituationalDialoguesResult.summary.officialTaskDrafts,
          topicDrafts:
            hsk2SituationalDialoguesResult.summary.officialTopicDrafts,
          modelDialogueTurns:
            hsk2SituationalDialoguesResult.summary.modelDialogueTurns,
          guidedRoleplayItems:
            hsk2SituationalDialoguesResult.summary.guidedRoleplayItems,
          audioDependentDialogues:
            hsk2SituationalDialoguesResult.summary.audioDependentDialogues,
          reviewedAudioDialogues:
            hsk2SituationalDialoguesResult.summary.reviewedAudioDialogues,
          reviewBatches:
            hsk2SituationalDialoguesResult.summary.reviewBatches,
          approvals: hsk2SituationalDialoguesResult.summary.approvals,
          measurementEligibleItems:
            hsk2SituationalDialoguesResult.summary.measurementEligibleItems,
          reviewed: false,
          learnerVisible: false,
        },
        hsk2ShortTextProduction: {
          lessons: hsk2ShortTextProductionResult.summary.lessons,
          promptUnits: hsk2ShortTextProductionResult.summary.promptUnits,
          dictationPrompts:
            hsk2ShortTextProductionResult.summary.dictationPrompts,
          reconstructionPrompts:
            hsk2ShortTextProductionResult.summary.reconstructionPrompts,
          guidedMessagePrompts:
            hsk2ShortTextProductionResult.summary.guidedMessagePrompts,
          pictureDescriptionPrompts:
            hsk2ShortTextProductionResult.summary.pictureDescriptionPrompts,
          modelSentences:
            hsk2ShortTextProductionResult.summary.modelSentences,
          targetCharacterPromptMappings:
            hsk2ShortTextProductionResult.summary
              .targetCharacterPromptMappings,
          reviewedAudioPrompts:
            hsk2ShortTextProductionResult.summary.reviewedAudioPrompts,
          reviewBatches:
            hsk2ShortTextProductionResult.summary.reviewBatches,
          approvals: hsk2ShortTextProductionResult.summary.approvals,
          measurementEligibleItems:
            hsk2ShortTextProductionResult.summary.measurementEligibleItems,
          reviewed: false,
          learnerVisible: false,
        },
        hsk2LevelAssessment: {
          forms: hsk2LevelAssessmentResult.summary.forms,
          itemsPerForm: hsk2LevelAssessmentResult.summary.itemsPerForm,
          totalItems: hsk2LevelAssessmentResult.summary.totalItems,
          objectiveItems:
            hsk2LevelAssessmentResult.summary.objectiveItems,
          constructedResponseItems:
            hsk2LevelAssessmentResult.summary.constructedResponseItems,
          listeningItems:
            hsk2LevelAssessmentResult.summary.listeningItems,
          readingItems: hsk2LevelAssessmentResult.summary.readingItems,
          vocabularyItems:
            hsk2LevelAssessmentResult.summary.vocabularyItems,
          grammarItems: hsk2LevelAssessmentResult.summary.grammarItems,
          speakingItems: hsk2LevelAssessmentResult.summary.speakingItems,
          writingItems: hsk2LevelAssessmentResult.summary.writingItems,
          sourceEntityOverlapBetweenForms:
            hsk2LevelAssessmentResult.summary
              .sourceEntityOverlapBetweenForms,
          reviewBatches: hsk2LevelAssessmentResult.summary.reviewBatches,
          reviewedItems: hsk2LevelAssessmentResult.summary.reviewedItems,
          calibratedItems:
            hsk2LevelAssessmentResult.summary.calibratedItems,
          measurementEligibleItems:
            hsk2LevelAssessmentResult.summary.measurementEligibleItems,
          independentFormsComplete: true,
          reviewedAudioComplete: false,
          learnerVisible: false,
        },
        hsk2HumanReviewQueue: {
          sourceArtifacts:
            hsk2ReviewManifestResult.summary.sourceArtifacts,
          reviewBatches: hsk2ReviewManifestResult.summary.reviewBatches,
          pendingBatches: hsk2ReviewManifestResult.summary.pendingBatches,
          approvals: hsk2ReviewManifestResult.summary.approvals,
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
