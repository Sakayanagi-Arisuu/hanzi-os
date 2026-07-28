import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHsk1VocabularyDraftBundle,
  loadHsk1VocabularyDraftBundle,
} from "../../src/content/hsk1VocabularyDraft.mjs";
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

export const HSK1_CONTENT_BACKLOG_REPORT_RELATIVE_PATH =
  "content/reports/hsk1-content-backlog.json";

export const buildHsk1ContentBacklogReport = (root = process.cwd()) => {
  const bundle = loadHsk1VocabularyDraftBundle(root);
  assertValidHsk1VocabularyDraftBundle(bundle);
  const scopeBundle = loadHsk1CurriculumScopeBundle(root);
  const scopeResult = assertValidHsk1CurriculumScopeBundle(scopeBundle);
  const personalPackBundle = loadHsk1PersonalExchangePackBundle(root);
  const personalPackResult =
    assertValidHsk1PersonalExchangePackBundle(personalPackBundle);
  const communicativePackBundle =
    loadHsk1CommunicativeUnitPacksBundle(root);
  const communicativePackResult =
    assertValidHsk1CommunicativeUnitPacksBundle(communicativePackBundle);
  const totalDraftedVocabulary =
    personalPackResult.summary.vocabularyDrafts
    + communicativePackResult.summary.vocabularyDrafts;
  const graph = JSON.parse(readFileSync(
    join(root, "content/curriculum/hsk0-4-graph.json"),
    "utf8",
  ));
  const lessonMappedIds = new Set(
    graph.lessonMappings.flatMap(
      (mapping) => mapping.officialVocabularyIds ?? [],
    ),
  );
  const entries = bundle.draft.entries;
  return {
    schemaVersion: 1,
    reportId: "hsk1-content-backlog-2026.07.28",
    generatedFrom: {
      draftId: bundle.draft.draftId,
      sourceId: bundle.descriptor.sourceId,
      sourceSnapshotSha256: bundle.descriptor.snapshot.sha256,
      syllabusInventorySha256: bundle.draft.syllabusInventorySha256,
    },
    stage: "draft-content-authoring",
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
      vietnameseGlossDrafted: totalDraftedVocabulary,
      lessonBlueprintVocabularyMapped: totalDraftedVocabulary,
      vocabularyPracticeDrafted: totalDraftedVocabulary,
      pronunciationCompatible: entries.filter(
        (entry) => entry.sourceMatches.some(
          (source) => source.matchType !== "surface-only",
        ),
      ).length,
      vietnameseGlossReviewed: entries.filter(
        (entry) => typeof entry.editorial.vietnameseGloss === "string",
      ).length,
      lessonMapped: entries.filter(
        (entry) => lessonMappedIds.has(entry.officialId),
      ).length,
      learnerVisible: 0,
      releaseEligible: 0,
    },
    editorialQueue: {
      multipleSourceMatches: entries.filter(
        (entry) => entry.sourceMatches.length > 1,
      ).length,
      pronunciationReviewPending: entries.filter(
        (entry) => entry.sourceMatches.some(
          (source) => source.matchType === "surface-only",
        ),
      ).length,
      definitionReviewPending: entries.filter(
        (entry) => entry.editorial.definitionReview === "pending",
      ).length,
      partOfSpeechReviewPending: entries.filter(
        (entry) => entry.editorial.partOfSpeechReview === "pending",
      ).length,
      usageExampleReviewPending: entries.filter(
        (entry) => entry.editorial.usageExampleReview === "pending",
      ).length,
      machineDraftGlossReviewPending:
        totalDraftedVocabulary,
      draftLessonBlueprints:
        personalPackResult.summary.lessons
        + communicativePackResult.summary.lessons,
      draftDialogueTurns:
        personalPackResult.summary.dialogueTurns
        + communicativePackResult.summary.dialogueTurns,
      authoredPracticeItems:
        personalPackResult.summary.authoredPracticeItems
        + communicativePackResult.summary.authoredPracticeItems,
      pendingReviewBatches:
        personalPackResult.summary.reviewBatches
        + communicativePackResult.summary.reviewBatches,
      pronunciationReviewItems: entries.filter(
        (entry) => entry.sourceMatches.some(
          (source) => source.matchType === "surface-only",
        ),
      ).map((entry) => ({
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
      hsk1VocabularyComplete: false,
      hsk1Complete: false,
      reason: "All communicative HSK1 vocabulary has AI-assisted draft practice, but Vietnamese and Mandarin review, character practice, grammar/context assessment and release are incomplete.",
    },
  };
};

export const serializeHsk1ContentBacklogReport = (report) =>
  `${JSON.stringify(report, null, 2)}\n`;

const main = () => {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const outputPath = join(process.cwd(), HSK1_CONTENT_BACKLOG_REPORT_RELATIVE_PATH);
  const serialized = serializeHsk1ContentBacklogReport(
    buildHsk1ContentBacklogReport(),
  );

  if (check) {
    const checked = readFileSync(outputPath, "utf8");
    if (checked !== serialized) {
      throw new Error("Checked HSK1 content backlog report is stale");
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
