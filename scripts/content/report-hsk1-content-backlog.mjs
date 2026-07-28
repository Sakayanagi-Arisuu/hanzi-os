import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  assertValidHsk1VocabularyDraftBundle,
  loadHsk1VocabularyDraftBundle,
} from "../../src/content/hsk1VocabularyDraft.mjs";

export const HSK1_CONTENT_BACKLOG_REPORT_RELATIVE_PATH =
  "content/reports/hsk1-content-backlog.json";

export const buildHsk1ContentBacklogReport = (root = process.cwd()) => {
  const bundle = loadHsk1VocabularyDraftBundle(root);
  assertValidHsk1VocabularyDraftBundle(bundle);
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
    stage: "draft-source-enrichment",
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
      reason: "Source enrichment is draft-only; Vietnamese review, examples, practice mapping and release remain incomplete.",
    },
  };
};

export const serializeHsk1ContentBacklogReport = (report) =>
  `${JSON.stringify(report, null, 2)}\n`;

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
