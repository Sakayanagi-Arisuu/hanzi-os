import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
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
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

export const HSK1_REVIEW_MANIFEST_RELATIVE_PATH =
  "content/review/hsk1-review-manifest-2026.07.json";

export const buildHsk1ReviewManifest = (root = process.cwd()) => {
  const personal = loadHsk1PersonalExchangePackBundle(root);
  assertValidHsk1PersonalExchangePackBundle(personal);
  const communicative = loadHsk1CommunicativeUnitPacksBundle(root);
  assertValidHsk1CommunicativeUnitPacksBundle(communicative);
  const character = loadHsk1CharacterFoundationPackBundle(root);
  assertValidHsk1CharacterFoundationPackBundle(character);
  const grammar = loadHsk1GrammarContextPackBundle(root);
  assertValidHsk1GrammarContextPackBundle(grammar);
  const task = loadHsk1TaskAssessmentPackBundle(root);
  assertValidHsk1TaskAssessmentPackBundle(task);
  const levelCheck = loadHsk1LevelCheckItemBankBundle(root);
  assertValidHsk1LevelCheckItemBankBundle(levelCheck);

  const sources = [
    {
      sourceKind: "vocabulary-personal-exchange",
      sourceId: personal.pack.packId,
      relativePath: "content/drafts/hsk1-personal-exchange-2026.07.json",
      sha256: fileSha256(personal.packPath),
      batches: personal.pack.reviewBatches,
      targetCounts: {
        lessons: personal.pack.counts.lessons,
        vocabulary: personal.pack.counts.vocabularyDrafts,
        practiceItems: personal.pack.counts.authoredPracticeItems,
      },
    },
    {
      sourceKind: "vocabulary-communicative-units",
      sourceId: communicative.collection.collectionId,
      relativePath: "content/drafts/hsk1-communicative-units-2026.07.json",
      sha256: fileSha256(communicative.collectionPath),
      batches: communicative.collection.packs.flatMap(
        (pack) => pack.reviewBatches,
      ),
      targetCounts: {
        lessons: communicative.collection.counts.lessons,
        vocabulary: communicative.collection.counts.vocabularyDrafts,
        practiceItems: communicative.collection.counts.authoredPracticeItems,
      },
    },
    {
      sourceKind: "character-foundation",
      sourceId: character.pack.packId,
      relativePath: "content/drafts/hsk1-character-foundation-2026.07.json",
      sha256: fileSha256(character.packPath),
      batches: character.pack.reviewBatches,
      targetCounts: {
        lessons: character.pack.counts.lessons,
        characters: character.pack.counts.characterDrafts,
        practiceItems: character.pack.counts.authoredPracticeItems,
      },
    },
    {
      sourceKind: "grammar-context",
      sourceId: grammar.pack.packId,
      relativePath: "content/drafts/hsk1-grammar-context-2026.07.json",
      sha256: fileSha256(grammar.packPath),
      batches: grammar.pack.reviewBatches,
      targetCounts: {
        lessons: grammar.pack.counts.lessonsWithGrammarPractice,
        grammarRows: grammar.pack.counts.grammarDrafts,
        practiceItems: grammar.pack.counts.guidedPracticeItems,
      },
    },
    {
      sourceKind: "task-assessment",
      sourceId: task.pack.packId,
      relativePath: "content/drafts/hsk1-task-assessment-2026.07.json",
      sha256: fileSha256(task.packPath),
      batches: task.pack.reviewBatches,
      targetCounts: {
        tasks: task.pack.counts.taskScenarios,
        topics: task.pack.counts.topicDrafts,
        practiceItems: task.pack.counts.guidedRoleplayItems,
      },
    },
    {
      sourceKind: "level-check-objective-items",
      sourceId: levelCheck.bank.bankId,
      relativePath: "content/drafts/hsk1-level-check-items-2026.07.json",
      sha256: fileSha256(levelCheck.bankPath),
      batches: levelCheck.bank.reviewBatches,
      targetCounts: {
        objectiveItems: levelCheck.bank.counts.objectiveItems,
        listeningItems: levelCheck.bank.counts.listeningItems,
        readingItems: levelCheck.bank.counts.readingItems,
        vocabularyItems: levelCheck.bank.counts.vocabularyItems,
        grammarItems: levelCheck.bank.counts.grammarItems,
      },
    },
  ];
  const reviewBatches = sources.flatMap((source) =>
    source.batches.map((batch) => ({
      batchId: batch.batchId,
      sourceKind: source.sourceKind,
      sourceId: source.sourceId,
      requiredRoles: [...batch.requiredRoles],
      state: batch.state,
      approvalCount: batch.approvals.length,
      targetCounts: {
        practiceItems: batch.practiceItemIds?.length ?? 0,
        assessmentItems: batch.itemIds?.length ?? 0,
        vocabulary:
          source.sourceKind.startsWith("vocabulary")
            ? batch.practiceItemIds.length / 3
            : 0,
        characters: batch.characterIds?.length ?? 0,
        grammarRows: batch.grammarRowIds?.length ?? 0,
        tasks: batch.officialTaskId ? 1 : 0,
        topics: batch.topicIds?.length ?? 0,
      },
    }))
  );
  return {
    schemaVersion: 1,
    manifestId: "hsk1-review-manifest-2026.07",
    state: "ready-for-human-review-assignment",
    learnerVisible: false,
    releaseEligible: false,
    policy: {
      exactSourceHashRequired: true,
      manifestDuplicatesContent: false,
      reviewDoesNotPublish: true,
      allRequiredRolesMustApproveExactTargets: true,
    },
    counts: {
      sourceArtifacts: sources.length,
      reviewBatches: reviewBatches.length,
      pendingBatches: reviewBatches.filter(
        (batch) => batch.state === "pending",
      ).length,
      approvals: reviewBatches.reduce(
        (total, batch) => total + batch.approvalCount,
        0,
      ),
      vocabularyBatches: reviewBatches.filter(
        (batch) => batch.sourceKind.startsWith("vocabulary"),
      ).length,
      characterBatches: reviewBatches.filter(
        (batch) => batch.sourceKind === "character-foundation",
      ).length,
      grammarBatches: reviewBatches.filter(
        (batch) => batch.sourceKind === "grammar-context",
      ).length,
      taskBatches: reviewBatches.filter(
        (batch) => batch.sourceKind === "task-assessment",
      ).length,
      assessmentBatches: reviewBatches.filter(
        (batch) => batch.sourceKind === "level-check-objective-items",
      ).length,
    },
    sources: sources.map(({ batches, ...source }) => ({
      ...source,
      reviewBatchCount: batches.length,
    })),
    reviewBatches,
  };
};

export const serializeHsk1ReviewManifest = (manifest) =>
  `${JSON.stringify(manifest, null, 2)}\n`;

const main = () => {
  const root = process.cwd();
  const outputPath = join(root, HSK1_REVIEW_MANIFEST_RELATIVE_PATH);
  const serialized = serializeHsk1ReviewManifest(
    buildHsk1ReviewManifest(root),
  );
  if (process.argv.includes("--write")) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK1 review manifest is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK1_REVIEW_MANIFEST_RELATIVE_PATH,
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
