import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertValidHskSyllabusBundle,
  loadHskSyllabusBundle,
  validateHskSyllabusBundle,
} from "./hskSyllabusInventory.mjs";
import {
  buildHsk4CoverageReport,
  HSK4_COVERAGE_REPORT_RELATIVE_PATH,
  serializeHsk4CoverageReport,
} from "../../scripts/content/report-hsk4-coverage.mjs";

describe("pinned official HSK1-4 syllabus inventory", () => {
  it("validates the exact source identity, boundaries and section counts", () => {
    const bundle = loadHskSyllabusBundle();
    const result = assertValidHskSyllabusBundle(bundle);

    expect(result.counts.vocabulary).toEqual({
      "1": 300,
      "2": 200,
      "3": 500,
      "4": 1000,
    });
    expect(bundle.inventory.vocabulary[0]).toMatchObject({
      sequence: 1,
      level: 1,
      word: "爱",
    });
    expect(bundle.inventory.vocabulary[299]).toMatchObject({
      sequence: 300,
      level: 1,
    });
    expect(bundle.inventory.vocabulary[300]).toMatchObject({
      sequence: 301,
      level: 2,
    });
    expect(bundle.inventory.vocabulary[1999]).toMatchObject({
      sequence: 2000,
      level: 4,
      word: "作者",
    });
  });

  it("fails closed on sequence or source-identity drift", () => {
    const bundle = loadHskSyllabusBundle();
    const inventory = structuredClone(bundle.inventory);
    inventory.vocabulary[300].sequence = 302;
    inventory.sourcePdfSha256 = "sha256:".padEnd(71, "0");

    const result = validateHskSyllabusBundle({
      source: bundle.source,
      inventory,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "inventory source identity does not match the pinned descriptor",
      "vocabulary sequence must be exactly 1..2000",
    ]));
  });

  it("fails closed when vocabulary crosses an official level boundary", () => {
    const bundle = loadHskSyllabusBundle();
    const inventory = structuredClone(bundle.inventory);
    inventory.vocabulary[299].level = 2;
    inventory.vocabulary[300].level = 1;

    const result = validateHskSyllabusBundle({
      source: bundle.source,
      inventory,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "hsk-vocab-00300 level 2 does not match sequence 300",
      "hsk-vocab-00301 level 1 does not match sequence 301",
    ]));
  });

  it("removes verified watermark fragments without changing real labels", () => {
    const { inventory } = loadHskSyllabusBundle();
    const topicById = new Map(inventory.topics.map(
      (item: { id: string }) => [item.id, item],
    ));
    const grammarById = new Map(inventory.grammarRows.map(
      (item: { id: string }) => [item.id, item],
    ));

    expect(topicById.get("hsk3-topic-027")).toMatchObject({ group: "学习情况" });
    expect(topicById.get("hsk3-topic-040")).toMatchObject({ domain: "自然与环境" });
    expect(topicById.get("hsk3-topic-053")).toMatchObject({ group: "风俗传统" });
    expect(topicById.get("hsk4-topic-073")).toMatchObject({ topic: "国粹" });
    expect(grammarById.get("hsk1-grammar-row-004"))
      .toMatchObject({ categoryName: "动词" });
    expect(grammarById.get("hsk3-grammar-row-067"))
      .toMatchObject({ detail: "“把”字句1" });
  });

  it("reports current coverage without making an HSK completion claim", () => {
    const report = buildHsk4CoverageReport();

    expect(report.currentCoverage.vocabulary).toMatchObject({
      officialTotal: 2000,
      runtimeTotal: 24,
      runtimeMapped: 23,
      unmatchedRuntime: [{
        runtimeId: "yuenan",
        simplified: "越南",
        pinyin: "Yuènán",
      }],
      pinyinDrift: [{
        runtimeId: "xuesheng",
        simplified: "学生",
        runtimePinyin: "xuésheng",
        officialPinyin: "xuéshēng",
      }],
      coveragePercent: 1.15,
    });
    expect(report.currentCoverage.recognitionCharacters).toMatchObject({
      officialTotal: 1096,
      authoringTotal: 7,
      authoringMapped: 7,
      releasedMapped: 0,
      releasedCoveragePercent: 0,
    });
    expect(report.currentCoverage.mappings).toMatchObject({
      tasks: 0,
      topics: 0,
      grammarRows: 0,
      officialVocabularyWithLessonMapping: 23,
      runtimeLessonsMapped: 14,
    });
    expect(report.currentCoverage.authoringScope.hsk2).toEqual({
      units: 3,
      situationalStrands: 4,
      grammarModules: 4,
      productionStages: 4,
      plannedLessonBlueprints: 40,
      tasks: 17,
      topics: 34,
      vocabulary: 200,
      recognitionCharacters: 125,
      grammarRows: 75,
      lessonPracticeCoverageComplete: false,
    });
    expect(report.currentCoverage.authoringScope.hsk3).toEqual({
      units: 3,
      discourseDomains: 5,
      grammarModules: 5,
      productionStages: 5,
      plannedLessonBlueprints: 55,
      plannedMinimumPromptUnits: 92,
      tasks: 22,
      topics: 54,
      vocabulary: 500,
      recognitionCharacters: 284,
      grammarRows: 96,
      lessonPracticeCoverageComplete: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings.hsk0PronunciationBootcamp,
    ).toEqual({
      lessons: 12,
      targets: 111,
      officialInitials: 21,
      officialFinalTableCells: 35,
      officialSpecialFinals: 1,
      toneCategories: 5,
      tonePairCells: 25,
      authoredActivities: 208,
      audioDependentActivities: 89,
      reviewedAudioActivities: 0,
      measurementEligibleActivities: 0,
      reviewed: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings.hsk3VocabularyBacklog,
    ).toEqual({
      officialVocabulary: 500,
      sourceMatched: 500,
      sourceMatches: 529,
      multipleSourceMatchEntries: 24,
      pronunciationReviewPending: 8,
      vietnameseGlossReviewed: 0,
      releaseEligible: 0,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings.hsk3LessonBlueprints,
    ).toEqual({
      lessons: 55,
      paragraphInputLessons: 25,
      narrationGrammarLessons: 15,
      guidedProductionLessons: 15,
      tasks: 22,
      topics: 54,
      vocabulary: 500,
      grammarRows: 96,
      recognitionCharacters: 284,
      sourceSenseKeywordMatches: 287,
      foundationFallbackVocabulary: 213,
      charactersWithIncrementalVocabularyContext: 283,
      charactersWithoutIncrementalVocabularyContext: 1,
      plannedMinimumPromptUnits: 92,
      authoredPracticeItems: 0,
      reviewed: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings.hsk3PersonalParagraph,
    ).toEqual({
      lessons: 1,
      vocabularyDrafts: 20,
      authoredTexts: 2,
      authoredTextLines: 16,
      vocabularyPracticeItems: 60,
      comprehensionItems: 10,
      readingComprehensionItems: 5,
      listeningComprehensionItems: 5,
      noteGridItems: 2,
      guidedSummaryItems: 2,
      authoredPracticeItems: 74,
      audioDependentItems: 27,
      reviewedAudioItems: 0,
      measurementEligibleItems: 0,
      reviewed: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings.hsk3PersonalDomainDraft,
    ).toEqual({
      lessons: 5,
      vocabularyDrafts: 100,
      authoredTexts: 10,
      authoredTextLines: 80,
      vocabularyPracticeItems: 300,
      comprehensionItems: 50,
      noteGridItems: 10,
      guidedSummaryItems: 10,
      authoredPracticeItems: 370,
      audioDependentItems: 135,
      reviewBatches: 5,
      reviewedAudioItems: 0,
      measurementEligibleItems: 0,
      reviewed: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings.hsk3ParagraphDomainsDraft,
    ).toEqual({
      completedDomains: 4,
      lessons: 20,
      vocabularyDrafts: 403,
      authoredTexts: 40,
      authoredTextLines: 320,
      vocabularyPracticeItems: 1209,
      comprehensionItems: 200,
      noteGridItems: 40,
      guidedSummaryItems: 40,
      authoredPracticeItems: 1489,
      audioDependentItems: 543,
      reviewBatches: 20,
      reviewedAudioItems: 0,
      measurementEligibleItems: 0,
      reviewed: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings.hsk2CharacterPractice,
    ).toEqual({
      lessons: 10,
      characters: 125,
      vocabularyContextMapped: 124,
      vocabularyContextGaps: 1,
      pinnedStrokeMetadata: 0,
      authoredPracticeItems: 250,
      measurementEligibleItems: 0,
      reviewed: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings.hsk2GrammarContext,
    ).toEqual({
      lessons: 10,
      grammarDrafts: 75,
      modelExamples: 75,
      guidedPracticeItems: 75,
      reviewBatches: 10,
      approvals: 0,
      measurementEligibleItems: 0,
      reviewed: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings.hsk2SituationalDialogues,
    ).toEqual({
      lessons: 20,
      taskDrafts: 17,
      topicDrafts: 34,
      modelDialogueTurns: 120,
      guidedRoleplayItems: 20,
      audioDependentDialogues: 20,
      reviewedAudioDialogues: 0,
      reviewBatches: 20,
      approvals: 0,
      measurementEligibleItems: 0,
      reviewed: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings.hsk2ShortTextProduction,
    ).toEqual({
      lessons: 10,
      promptUnits: 104,
      dictationPrompts: 36,
      reconstructionPrompts: 36,
      guidedMessagePrompts: 16,
      pictureDescriptionPrompts: 16,
      modelSentences: 168,
      targetCharacterPromptMappings: 125,
      reviewedAudioPrompts: 0,
      reviewBatches: 10,
      approvals: 0,
      measurementEligibleItems: 0,
      reviewed: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings.hsk2LevelAssessment,
    ).toEqual({
      forms: 2,
      itemsPerForm: 86,
      totalItems: 172,
      objectiveItems: 120,
      constructedResponseItems: 52,
      listeningItems: 30,
      readingItems: 30,
      vocabularyItems: 30,
      grammarItems: 30,
      speakingItems: 20,
      writingItems: 32,
      sourceEntityOverlapBetweenForms: 0,
      reviewBatches: 12,
      reviewedItems: 0,
      calibratedItems: 0,
      measurementEligibleItems: 0,
      independentFormsComplete: true,
      reviewedAudioComplete: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings.hsk2HumanReviewQueue,
    ).toEqual({
      sourceArtifacts: 7,
      reviewBatches: 122,
      pendingBatches: 122,
      approvals: 0,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings.hsk2VocabularyPractice,
    ).toEqual({
      lessons: 20,
      vocabularyDrafts: 200,
      authoredPracticeItems: 600,
      meaningRecallItems: 200,
      pinyinRecognitionItems: 200,
      listeningSelectionItems: 200,
      reviewedAudioItems: 0,
      measurementEligibleItems: 0,
      reviewed: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings.hsk2LessonBlueprints,
    ).toEqual({
      lessons: 40,
      situationalDialogueLessons: 20,
      sentenceChainLessons: 10,
      shortTextProductionLessons: 10,
      tasks: 17,
      topics: 34,
      vocabulary: 200,
      grammarRows: 75,
      recognitionCharacters: 125,
      authoredPracticeItems: 0,
      reviewed: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings.hsk2VocabularyBacklog,
    ).toEqual({
      officialVocabulary: 200,
      sourceMatched: 200,
      sourceMatches: 232,
      multipleSourceMatchEntries: 26,
      pronunciationReviewPending: 6,
      vietnameseGlossReviewed: 0,
      releaseEligible: 0,
      learnerVisible: false,
    });
    expect(report.coverageClaims.every((claim) => claim.complete === false))
      .toBe(true);
  });

  it("keeps the checked coverage report deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK4_COVERAGE_REPORT_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk4CoverageReport(buildHsk4CoverageReport()),
    );
  });
});
