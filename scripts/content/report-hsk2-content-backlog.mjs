import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHsk2VocabularyDraftBundle,
  loadHsk2VocabularyDraftBundle,
} from "../../src/content/hsk2VocabularyDraft.mjs";
import {
  assertValidHsk2CurriculumScopeBundle,
  loadHsk2CurriculumScopeBundle,
} from "../../src/content/hsk2CurriculumScope.mjs";
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
  assertValidHsk2SituationalDialoguesBundle,
  loadHsk2SituationalDialoguesBundle,
} from "../../src/content/hsk2SituationalDialogues.mjs";
import {
  assertValidHsk2ShortTextProductionBundle,
  loadHsk2ShortTextProductionBundle,
} from "../../src/content/hsk2ShortTextProduction.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

export const HSK2_CONTENT_BACKLOG_REPORT_RELATIVE_PATH =
  "content/reports/hsk2-content-backlog.json";

export const buildHsk2ContentBacklogReport = (root = process.cwd()) => {
  const vocabularyBundle = loadHsk2VocabularyDraftBundle(root);
  assertValidHsk2VocabularyDraftBundle(vocabularyBundle);
  const scopeBundle = loadHsk2CurriculumScopeBundle(root);
  const scopeResult = assertValidHsk2CurriculumScopeBundle(scopeBundle);
  const blueprintBundle = loadHsk2LessonBlueprintsBundle(root);
  const blueprintResult =
    assertValidHsk2LessonBlueprintsBundle(blueprintBundle);
  const practiceBundle = loadHsk2VocabularyPracticeBundle(root);
  const practiceResult =
    assertValidHsk2VocabularyPracticeBundle(practiceBundle);
  const characterBundle = loadHsk2CharacterPracticeBundle(root);
  const characterResult =
    assertValidHsk2CharacterPracticeBundle(characterBundle);
  const grammarBundle = loadHsk2GrammarContextBundle(root);
  const grammarResult =
    assertValidHsk2GrammarContextBundle(grammarBundle);
  const situationalBundle = loadHsk2SituationalDialoguesBundle(root);
  const situationalResult =
    assertValidHsk2SituationalDialoguesBundle(situationalBundle);
  const productionBundle = loadHsk2ShortTextProductionBundle(root);
  const productionResult =
    assertValidHsk2ShortTextProductionBundle(productionBundle);
  const entries = vocabularyBundle.draft.entries;
  const pronunciationReviewItems = entries.filter(
    (entry) => entry.sourceMatches.some(
      (source) => source.matchType === "surface-only",
    ),
  );

  return {
    schemaVersion: 1,
    reportId: "hsk2-content-backlog-2026.07.28",
    generatedFrom: {
      draftId: vocabularyBundle.draft.draftId,
      sourceId: vocabularyBundle.descriptor.sourceId,
      sourceArchiveSha256: vocabularyBundle.descriptor.archive.sha256,
      sourceSnapshotSha256: vocabularyBundle.descriptor.snapshot.sha256,
      syllabusInventorySha256:
        vocabularyBundle.draft.syllabusInventorySha256,
      scopeId: scopeBundle.scope.scopeId,
      lessonBlueprintPackId: blueprintBundle.pack.packId,
      lessonBlueprintPackSha256: fileSha256(blueprintBundle.packPath),
      vocabularyPracticePackId: practiceBundle.pack.packId,
      vocabularyPracticePackSha256: fileSha256(practiceBundle.packPath),
      characterPracticePackId: characterBundle.pack.packId,
      characterPracticePackSha256: fileSha256(characterBundle.packPath),
      grammarContextPackId: grammarBundle.pack.packId,
      grammarContextPackSha256: fileSha256(grammarBundle.packPath),
      situationalDialoguePackId: situationalBundle.pack.packId,
      situationalDialoguePackSha256: fileSha256(situationalBundle.packPath),
      shortTextProductionPackId: productionBundle.pack.packId,
      shortTextProductionPackSha256: fileSha256(productionBundle.packPath),
    },
    stage: "short-text-production-authoring",
    coverage: {
      officialVocabulary: entries.length,
      dictionaryMatched: entries.filter(
        (entry) => entry.sourceMatches.length > 0,
      ).length,
      englishSourceSenseReady: entries.filter(
        (entry) => entry.sourceMatches.some(
          (source) => source.senses.length > 0,
        ),
      ).length,
      authoringScoped: scopeResult.summary.vocabulary,
      vietnameseGlossDrafted: practiceResult.summary.vocabularyDrafts,
      lessonBlueprintVocabularyMapped:
        blueprintResult.summary.vocabularyBlueprintMappings,
      vocabularyPracticeDrafted: practiceResult.summary.vocabularyDrafts,
      recognitionCharactersDraftMapped:
        blueprintResult.summary.recognitionCharacterBlueprintMappings,
      characterPracticeDrafted: characterResult.summary.characterDrafts,
      charactersWithVocabularyContext:
        characterResult.summary.charactersWithVocabularyContext,
      charactersWithPinnedStrokeMetadata:
        characterResult.summary.charactersWithPinnedStrokeMetadata,
      grammarRowsDraftMapped:
        blueprintResult.summary.grammarBlueprintMappings,
      grammarContextDrafted: grammarResult.summary.grammarDrafts,
      grammarModelExamplesDrafted: grammarResult.summary.modelExamples,
      guidedGrammarPracticeDrafted:
        grammarResult.summary.guidedPracticeItems,
      tasksScenarioDraftMapped:
        blueprintResult.summary.taskBlueprintMappings,
      topicsPromptDraftMapped:
        blueprintResult.summary.topicBlueprintMappings,
      taskScenarioDrafts: situationalResult.summary.officialTaskDrafts,
      topicPromptDrafts: situationalResult.summary.officialTopicDrafts,
      situationalDialogueDrafts:
        situationalResult.summary.situationalLessons,
      modelDialogueTurnsDrafted:
        situationalResult.summary.modelDialogueTurns,
      shortTextProductionLessons: productionResult.summary.lessons,
      shortTextProductionPromptUnits: productionResult.summary.promptUnits,
      shortTextModelSentences: productionResult.summary.modelSentences,
      productiveCharacterPromptMappings:
        productionResult.summary.targetCharacterPromptMappings,
      pronunciationCompatible:
        entries.length - pronunciationReviewItems.length,
      vietnameseGlossReviewed: 0,
      lessonMapped: 0,
      learnerVisible: 0,
      releaseEligible: 0,
    },
    editorialQueue: {
      multipleSourceMatches: entries.filter(
        (entry) => entry.sourceMatches.length > 1,
      ).length,
      pronunciationReviewPending: pronunciationReviewItems.length,
      definitionReviewPending: entries.filter(
        (entry) => entry.editorial.definitionReview === "pending",
      ).length,
      partOfSpeechReviewPending: entries.filter(
        (entry) => entry.editorial.partOfSpeechReview === "pending",
      ).length,
      usageExampleReviewPending: entries.filter(
        (entry) => entry.editorial.usageExampleReview === "pending",
      ).length,
      machineDraftGlossReviewPending: practiceResult.summary.vocabularyDrafts,
      plannedLessonBlueprints: scopeResult.summary.plannedLessonBlueprints,
      draftLessonBlueprints: blueprintResult.summary.lessons,
      pendingBlueprintReviewBatches: blueprintResult.summary.reviewBatches,
      blueprintApprovals: blueprintResult.summary.approvals,
      authoredPracticeItems: practiceResult.summary.authoredPracticeItems,
      authoredAssessmentPrompts:
        blueprintResult.summary.authoredAssessmentPrompts,
      draftVocabularyLessons: practiceResult.summary.situationalLessons,
      pendingVocabularyReviewBatches: practiceResult.summary.reviewBatches,
      vocabularyPracticeApprovals: practiceResult.summary.approvals,
      audioDependentVocabularyItems:
        practiceResult.summary.audioDependentItems,
      reviewedVocabularyAudioItems: practiceResult.summary.reviewedAudioItems,
      authoredCharacterPracticeItems:
        characterResult.summary.authoredPracticeItems,
      pendingCharacterReviewBatches: characterResult.summary.reviewBatches,
      characterPracticeApprovals: characterResult.summary.approvals,
      authoredGrammarPracticeItems:
        grammarResult.summary.guidedPracticeItems,
      pendingGrammarReviewBatches: grammarResult.summary.reviewBatches,
      grammarPracticeApprovals: grammarResult.summary.approvals,
      authoredSituationalRoleplayItems:
        situationalResult.summary.guidedRoleplayItems,
      pendingSituationalReviewBatches:
        situationalResult.summary.reviewBatches,
      situationalDialogueApprovals: situationalResult.summary.approvals,
      audioDependentDialogues:
        situationalResult.summary.audioDependentDialogues,
      reviewedDialogueAudio:
        situationalResult.summary.reviewedAudioDialogues,
      authoredDictationPrompts: productionResult.summary.dictationPrompts,
      authoredReconstructionPrompts:
        productionResult.summary.reconstructionPrompts,
      authoredGuidedMessagePrompts:
        productionResult.summary.guidedMessagePrompts,
      authoredPictureDescriptionPrompts:
        productionResult.summary.pictureDescriptionPrompts,
      pendingProductionReviewBatches:
        productionResult.summary.reviewBatches,
      productionApprovals: productionResult.summary.approvals,
      audioDependentDictationPrompts:
        productionResult.summary.audioDependentPrompts,
      reviewedDictationAudioPrompts:
        productionResult.summary.reviewedAudioPrompts,
      characterContextGaps: characterBundle.pack.characters.filter(
        (item) => item.primaryContext === null,
      ).map((item) => ({
        officialCharacterId: item.officialCharacterId,
        character: item.character,
      })),
      pronunciationReviewItems: pronunciationReviewItems.map((entry) => ({
        officialId: entry.officialId,
        simplified: entry.simplified,
        officialPinyin: entry.officialPinyin,
        sourceNumberedPinyin: [
          ...new Set(entry.sourceMatches.map(
            (source) => source.numberedPinyin,
          )),
        ],
      })),
    },
    claims: {
      hsk2VocabularyComplete: false,
      hsk2Complete: false,
      reason:
        "All HSK2 vocabulary items, recognition characters, official grammar rows, tasks, topics and short-text production stages have bounded draft practice or context, but assessment prompts, complete vocabulary context/stroke metadata, linguistic review, audio and runtime release are incomplete.",
    },
  };
};

export const serializeHsk2ContentBacklogReport = (report) =>
  `${JSON.stringify(report, null, 2)}\n`;

const main = () => {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const outputPath = join(
    process.cwd(),
    HSK2_CONTENT_BACKLOG_REPORT_RELATIVE_PATH,
  );
  const serialized = serializeHsk2ContentBacklogReport(
    buildHsk2ContentBacklogReport(),
  );

  if (check) {
    const checked = readFileSync(outputPath, "utf8");
    if (checked !== serialized) {
      throw new Error("Checked HSK2 content backlog report is stale");
    }
  } else {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized);
  }

  console.log(serialized.trim());
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
