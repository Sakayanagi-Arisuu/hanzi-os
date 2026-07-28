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
    },
    stage: "lesson-blueprint-authoring",
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
      vietnameseGlossDrafted: 0,
      lessonBlueprintVocabularyMapped:
        blueprintResult.summary.vocabularyBlueprintMappings,
      vocabularyPracticeDrafted: 0,
      recognitionCharactersDraftMapped:
        blueprintResult.summary.recognitionCharacterBlueprintMappings,
      grammarRowsDraftMapped:
        blueprintResult.summary.grammarBlueprintMappings,
      tasksScenarioDraftMapped:
        blueprintResult.summary.taskBlueprintMappings,
      topicsPromptDraftMapped:
        blueprintResult.summary.topicBlueprintMappings,
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
      machineDraftGlossReviewPending: 0,
      plannedLessonBlueprints: scopeResult.summary.plannedLessonBlueprints,
      draftLessonBlueprints: blueprintResult.summary.lessons,
      pendingBlueprintReviewBatches: blueprintResult.summary.reviewBatches,
      blueprintApprovals: blueprintResult.summary.approvals,
      authoredPracticeItems: blueprintResult.summary.authoredPracticeItems,
      authoredAssessmentPrompts:
        blueprintResult.summary.authoredAssessmentPrompts,
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
        "All official HSK2 inventory sections are assigned to 40 lesson blueprints, but Vietnamese glosses, practice, assessment prompts, linguistic review, audio and runtime release are incomplete.",
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
