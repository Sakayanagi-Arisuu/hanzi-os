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
      runtimeTotal: 516,
      runtimeMapped: 515,
      unmatchedRuntime: [{
        runtimeId: "yuenan",
        simplified: "越南",
        pinyin: "Yuènán",
      }],
      pinyinDrift: [
        {
          runtimeId: "hsk-vocab-00014",
          simplified: "不客气",
          runtimePinyin: "bùkèqi",
          officialPinyin: "bú kèqi",
        },
        {
          runtimeId: "hsk-vocab-00015",
          simplified: "不要",
          runtimePinyin: "bùyào",
          officialPinyin: "búyào",
        },
        {
          runtimeId: "hsk-vocab-00181",
          simplified: "谁",
          runtimePinyin: "shéi",
          officialPinyin: "shéi/shuí",
        },
        {
          runtimeId: "hsk-vocab-00248",
          simplified: "学生",
          runtimePinyin: "xuésheng",
          officialPinyin: "xuéshēng",
        },
        {
          runtimeId: "hsk-vocab-00259",
          simplified: "一下",
          runtimePinyin: "yīxià",
          officialPinyin: "yíxià",
        },
        {
          runtimeId: "hsk-vocab-00312",
          simplified: "不错",
          runtimePinyin: "bùcuò",
          officialPinyin: "búcuò",
        },
        {
          runtimeId: "hsk-vocab-00356",
          simplified: "后面",
          runtimePinyin: "hòumian",
          officialPinyin: "hòumiàn",
        },
        {
          runtimeId: "hsk-vocab-00361",
          simplified: "回来",
          runtimePinyin: "huílai",
          officialPinyin: "huílái",
        },
        {
          runtimeId: "hsk-vocab-00362",
          simplified: "回去",
          runtimePinyin: "huíqu",
          officialPinyin: "huíqù",
        },
        {
          runtimeId: "hsk-vocab-00418",
          simplified: "起来",
          runtimePinyin: "qǐlai",
          officialPinyin: "qǐlái",
        },
        {
          runtimeId: "hsk-vocab-00451",
          simplified: "网上",
          runtimePinyin: "wǎngshàng",
          officialPinyin: "wǎngshang",
        },
        {
          runtimeId: "hsk-vocab-00458",
          simplified: "下来",
          runtimePinyin: "xiàlai",
          officialPinyin: "xiàlái",
        },
        {
          runtimeId: "hsk-vocab-00471",
          simplified: "一会儿",
          runtimePinyin: "yīhuìr",
          officialPinyin: "yíhuìr",
        },
        {
          runtimeId: "hsk-vocab-00473",
          simplified: "一起",
          runtimePinyin: "yīqǐ",
          officialPinyin: "yìqǐ",
        },
        {
          runtimeId: "xuesheng",
          simplified: "学生",
          runtimePinyin: "xuésheng",
          officialPinyin: "xuéshēng",
        },
      ],
      coveragePercent: 25.75,
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
      officialVocabularyWithLessonMapping: 498,
      runtimeLessonsMapped: 84,
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
    expect(report.currentCoverage.authoringScope.hsk4).toEqual({
      units: 3,
      discourseDomains: 6,
      grammarModules: 5,
      integrationStages: 6,
      timedIntegrationStages: 3,
      plannedLessonBlueprints: 78,
      plannedMinimumPromptUnits: 106,
      tasks: 30,
      topics: 77,
      vocabulary: 1000,
      recognitionCharacters: 441,
      grammarRows: 95,
      lessonPracticeCoverageComplete: false,
      calibratedMockComplete: false,
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
      report.currentCoverage.draftBlueprintMappings.hsk4VocabularyBacklog,
    ).toEqual({
      officialVocabulary: 1000,
      sourceMatched: 999,
      sourceMatches: 1051,
      multipleSourceMatchEntries: 40,
      pronunciationReviewPending: 15,
      sourceCoverageGaps: 1,
      vietnameseGlossReviewed: 0,
      releaseEligible: 0,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings.hsk4LessonBlueprints,
    ).toEqual({
      lessons: 78,
      deepComprehensionLessons: 36,
      summaryArgumentLessons: 24,
      timedIntegrationLessons: 18,
      tasks: 30,
      topics: 77,
      vocabulary: 1000,
      grammarRows: 95,
      recognitionCharacters: 441,
      sourceSenseKeywordMatches: 187,
      foundationFallbackVocabulary: 813,
      charactersWithIncrementalVocabularyContext: 441,
      charactersWithoutIncrementalVocabularyContext: 0,
      timedLessonBlueprints: 9,
      plannedMinimumPromptUnits: 106,
      authoredPracticeItems: 0,
      reviewed: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings
        .hsk4PersonalCommunityLongFormDraft,
    ).toEqual({
      lessons: 6,
      completedLongFormDomains: 1,
      completedLongFormLessons: 6,
      mappedTopics: 27,
      targetLexemeContexts: 60,
      authoredTexts: 12,
      authoredParagraphs: 36,
      vocabularyPracticeItems: 180,
      comprehensionItems: 60,
      evidenceBoundComprehensionItems: 60,
      inferenceItems: 12,
      noteMapItems: 12,
      noteMapNodes: 60,
      synthesisPrompts: 6,
      authoredPracticeItems: 258,
      audioDependentItems: 96,
      reviewedAudioItems: 0,
      measurementEligibleItems: 0,
      reviewed: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings
        .hsk4EducationWorkLongFormDraft,
    ).toEqual({
      lessons: 6,
      completedLongFormDomains: 2,
      completedLongFormLessons: 12,
      mappedTopics: 15,
      targetLexemeContexts: 60,
      authoredTexts: 12,
      authoredParagraphs: 36,
      vocabularyPracticeItems: 180,
      comprehensionItems: 60,
      evidenceBoundComprehensionItems: 60,
      inferenceItems: 12,
      noteMapItems: 12,
      noteMapNodes: 60,
      synthesisPrompts: 6,
      authoredPracticeItems: 258,
      audioDependentItems: 96,
      reviewedAudioItems: 0,
      measurementEligibleItems: 0,
      reviewed: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings
        .hsk4NatureTechnologyLongFormDraft,
    ).toEqual({
      lessons: 6,
      completedLongFormDomains: 3,
      completedLongFormLessons: 18,
      mappedTopics: 10,
      targetLexemeContexts: 60,
      authoredTexts: 12,
      authoredParagraphs: 36,
      vocabularyPracticeItems: 180,
      comprehensionItems: 60,
      evidenceBoundComprehensionItems: 60,
      inferenceItems: 12,
      noteMapItems: 12,
      noteMapNodes: 60,
      synthesisPrompts: 6,
      authoredPracticeItems: 258,
      audioDependentItems: 96,
      reviewedAudioItems: 0,
      measurementEligibleItems: 0,
      reviewed: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings
        .hsk4SocietyEconomyLongFormDraft,
    ).toEqual({
      lessons: 6,
      completedLongFormDomains: 4,
      completedLongFormLessons: 24,
      mappedTopics: 9,
      targetLexemeContexts: 60,
      authoredTexts: 12,
      authoredParagraphs: 36,
      vocabularyPracticeItems: 180,
      comprehensionItems: 60,
      evidenceBoundComprehensionItems: 60,
      inferenceItems: 12,
      noteMapItems: 12,
      noteMapNodes: 60,
      synthesisPrompts: 6,
      authoredPracticeItems: 258,
      audioDependentItems: 96,
      reviewedAudioItems: 0,
      measurementEligibleItems: 0,
      reviewed: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings
        .hsk4ArtsSportsExchangeLongFormDraft,
    ).toEqual({
      lessons: 6,
      completedLongFormDomains: 5,
      completedLongFormLessons: 30,
      mappedTopics: 7,
      targetLexemeContexts: 60,
      authoredTexts: 12,
      authoredParagraphs: 36,
      vocabularyPracticeItems: 180,
      comprehensionItems: 60,
      evidenceBoundComprehensionItems: 60,
      inferenceItems: 12,
      noteMapItems: 12,
      noteMapNodes: 60,
      synthesisPrompts: 6,
      authoredPracticeItems: 258,
      audioDependentItems: 96,
      reviewedAudioItems: 0,
      measurementEligibleItems: 0,
      reviewed: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings
        .hsk4CultureHistoryLongFormDraft,
    ).toEqual({
      lessons: 6,
      completedLongFormDomains: 6,
      completedLongFormLessons: 36,
      mappedTopics: 9,
      targetLexemeContexts: 60,
      authoredTexts: 12,
      authoredParagraphs: 36,
      vocabularyPracticeItems: 180,
      comprehensionItems: 60,
      evidenceBoundComprehensionItems: 60,
      inferenceItems: 12,
      noteMapItems: 12,
      noteMapNodes: 60,
      synthesisPrompts: 6,
      authoredPracticeItems: 258,
      audioDependentItems: 96,
      reviewedAudioItems: 0,
      measurementEligibleItems: 0,
      reviewed: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings.hsk4IntegrationDraft,
    ).toEqual({
      lessons: 18,
      completedIntegrationStages: 6,
      completedIntegrationLessons: 18,
      sourceBindings: 60,
      uniqueSourceTexts: 60,
      readingSourceBindings: 30,
      listeningSourceBindings: 30,
      promptUnits: 106,
      skillEvidenceUnits: {
        listening: 29,
        reading: 29,
        speaking: 11,
        writing: 37,
      },
      timedPromptUnits: 44,
      audioDependentPromptUnits: 69,
      learnerRecordingPromptUnits: 11,
      reviewedRubrics: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 18,
      approvals: 0,
      releaseEligibleItems: 0,
      reviewed: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings
        .hsk4LevelAssessmentDraft,
    ).toEqual({
      forms: 2,
      itemsPerForm: 96,
      totalItems: 192,
      objectiveItems: 144,
      constructedResponseItems: 48,
      listeningItems: 36,
      readingItems: 36,
      vocabularyItems: 36,
      grammarItems: 36,
      officialVocabularyBindings: 36,
      officialGrammarBindings: 36,
      speakingItems: 24,
      writingItems: 24,
      audioDependentItems: 60,
      sourceFamilies: 12,
      sourceFamiliesPerForm: 6,
      equivalentGroups: 96,
      sourceIdOverlapBetweenForms: 0,
      sourceExposureOverlapBetweenForms: 0,
      sourceTextHashOverlapBetweenForms: 0,
      sourceContentOverlapBetweenForms: 0,
      learningSourceIdOverlap: 0,
      learningSourceTextHashOverlap: 0,
      learningSourceContentOverlap: 0,
      mockItemsPerForm: 54,
      mockAlternateItemsPerForm: 42,
      mockPlannedDurationSeconds: 6000,
      reviewBatches: 12,
      reviewedItems: 0,
      reviewedAudioItems: 0,
      calibratedItems: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      prerequisiteWaiverEligibleItems: 0,
      releaseEligibleItems: 0,
      reviewed: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings.hsk4HumanReviewQueue,
    ).toEqual({
      sourceArtifacts: 19,
      reviewBatches: 168,
      pendingBatches: 168,
      approvals: 0,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings.hsk4SummaryArgumentDraft,
    ).toEqual({
      lessons: 24,
      completedSummaryArgumentModules: 5,
      completedSummaryArgumentLessons: 24,
      sourceBindings: 48,
      grammarTargets: 95,
      grammarPracticeItems: 95,
      sourceAuditItems: 48,
      paraphraseItems: 48,
      structuredSummaryPrompts: 24,
      structuredArgumentPrompts: 24,
      spokenDefensePrompts: 24,
      authoredPracticeItems: 263,
      audioDependentItems: 120,
      learnerRecordingItems: 24,
      reviewedRubrics: 0,
      measurementEligibleItems: 0,
      reviewed: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings
        .hsk4PrecisionReferenceQuantitySummaryArgumentDraft,
    ).toEqual({
      lessons: 6,
      completedSummaryArgumentModules: 1,
      completedSummaryArgumentLessons: 6,
      sourceBindings: 12,
      grammarTargets: 36,
      grammarPracticeItems: 36,
      sourceAuditItems: 12,
      paraphraseItems: 12,
      structuredSummaryPrompts: 6,
      structuredArgumentPrompts: 6,
      spokenDefensePrompts: 6,
      authoredPracticeItems: 78,
      audioDependentItems: 30,
      learnerRecordingItems: 6,
      reviewedRubrics: 0,
      measurementEligibleItems: 0,
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
      completedDomains: 5,
      lessons: 25,
      vocabularyDrafts: 500,
      authoredTexts: 50,
      authoredTextLines: 400,
      vocabularyPracticeItems: 1500,
      comprehensionItems: 250,
      noteGridItems: 50,
      guidedSummaryItems: 50,
      authoredPracticeItems: 1850,
      audioDependentItems: 675,
      reviewBatches: 25,
      reviewedAudioItems: 0,
      measurementEligibleItems: 0,
      reviewed: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings
        .hsk3NarrationGrammarModulesDraft,
    ).toEqual({
      completedModules: 5,
      lessons: 15,
      grammarDrafts: 96,
      modelExamples: 96,
      correctionPairs: 96,
      modelNarrations: 15,
      modelNarrationLines: 90,
      grammarInParagraphItems: 96,
      discourseErrorCorrectionItems: 96,
      orderedRetellingItems: 15,
      authoredPracticeItems: 207,
      reviewBatches: 15,
      measurementEligibleItems: 0,
      reviewed: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings
        .hsk3GuidedProductionStagesDraft,
    ).toEqual({
      lessons: 15,
      completedGuidedProductionStages: 5,
      completedGuidedProductionLessons: 15,
      allGuidedProductionLessonsDrafted: true,
      sourceTexts: 96,
      sourceTextLines: 768,
      sourceInputBindings: 117,
      sourceGuidedSummaries: 54,
      promptUnits: 92,
      readingInputPromptUnits: 52,
      listeningInputPromptUnits: 48,
      integratedListeningReadingPromptUnits: 8,
      temporalOrderingPromptUnits: 7,
      referenceLinkerPromptUnits: 7,
      orderRationalePromptUnits: 6,
      noteCardRetellingPromptUnits: 7,
      changeCauseRetellingPromptUnits: 7,
      structuredRetellingPromptUnits: 6,
      modelRetellings: 20,
      sixSentencePromptUnits: 6,
      comparisonPromptUnits: 5,
      eightSentencePromptUnits: 5,
      dualSourcePromptUnits: 17,
      modelEvidenceSummaries: 45,
      minimumRequiredSentences: 106,
      choiceReasonPromptUnits: 4,
      criteriaComparisonPromptUnits: 4,
      boundedViewpointPromptUnits: 4,
      minimumSpokenSentences: 64,
      requiredRecordingAttempts: 24,
      revisionChecklists: 92,
      audioDependentPromptUnits: 48,
      reviewedAudioPromptUnits: 0,
      learnerRecordingPromptUnits: 32,
      reviewedLearnerRecordingRubrics: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 15,
      approvals: 0,
      releaseEligibleItems: 0,
      reviewed: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings
        .hsk3LevelAssessmentDraft,
    ).toEqual({
      forms: 2,
      itemsPerForm: 86,
      totalItems: 172,
      objectiveItems: 108,
      constructedResponseItems: 64,
      listeningItems: 24,
      readingItems: 24,
      vocabularyItems: 30,
      grammarItems: 30,
      speakingItems: 32,
      writingItems: 32,
      audioDependentItems: 56,
      reviewedAudioItems: 0,
      sourceEntityOverlapBetweenForms: 0,
      reviewBatches: 12,
      reviewedItems: 0,
      calibratedItems: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      prerequisiteWaiverEligibleItems: 0,
      releaseEligibleItems: 0,
      reviewed: false,
      learnerVisible: false,
    });
    expect(
      report.currentCoverage.draftBlueprintMappings.hsk3HumanReviewQueue,
    ).toEqual({
      sourceArtifacts: 18,
      reviewBatches: 122,
      pendingBatches: 122,
      approvals: 0,
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
  }, 30_000);

  it("keeps the checked coverage report deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK4_COVERAGE_REPORT_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk4CoverageReport(buildHsk4CoverageReport()),
    );
  }, 30_000);
});
