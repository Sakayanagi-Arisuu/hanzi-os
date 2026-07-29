import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
import {
  assertValidHsk2LevelAssessmentBundle,
  loadHsk2LevelAssessmentBundle,
} from "../../src/content/hsk2LevelAssessment.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

export const HSK2_REVIEW_MANIFEST_RELATIVE_PATH =
  "content/review/hsk2-review-manifest-2026.07.json";

const buildSources = (root) => {
  const blueprints = loadHsk2LessonBlueprintsBundle(root);
  assertValidHsk2LessonBlueprintsBundle(blueprints);
  const vocabulary = loadHsk2VocabularyPracticeBundle(root);
  assertValidHsk2VocabularyPracticeBundle(vocabulary);
  const characters = loadHsk2CharacterPracticeBundle(root);
  assertValidHsk2CharacterPracticeBundle(characters);
  const grammar = loadHsk2GrammarContextBundle(root);
  assertValidHsk2GrammarContextBundle(grammar);
  const situational = loadHsk2SituationalDialoguesBundle(root);
  assertValidHsk2SituationalDialoguesBundle(situational);
  const production = loadHsk2ShortTextProductionBundle(root);
  assertValidHsk2ShortTextProductionBundle(production);
  const assessment = loadHsk2LevelAssessmentBundle(root);
  assertValidHsk2LevelAssessmentBundle(assessment);

  return [
    {
      sourceKind: "lesson-blueprints",
      sourceId: blueprints.pack.packId,
      relativePath: "content/drafts/hsk2-lesson-blueprints-2026.07.json",
      sha256: fileSha256(blueprints.packPath),
      batches: blueprints.pack.reviewBatches,
      targetCounts: {
        lessons: blueprints.pack.counts.lessons,
      },
    },
    {
      sourceKind: "vocabulary-practice",
      sourceId: vocabulary.pack.packId,
      relativePath: "content/drafts/hsk2-vocabulary-practice-2026.07.json",
      sha256: fileSha256(vocabulary.packPath),
      batches: vocabulary.pack.reviewBatches,
      targetCounts: {
        vocabulary: vocabulary.pack.counts.vocabularyDrafts,
        practiceItems: vocabulary.pack.counts.authoredPracticeItems,
      },
    },
    {
      sourceKind: "character-practice",
      sourceId: characters.pack.packId,
      relativePath: "content/drafts/hsk2-character-practice-2026.07.json",
      sha256: fileSha256(characters.packPath),
      batches: characters.pack.reviewBatches,
      targetCounts: {
        characters: characters.pack.counts.characterDrafts,
        practiceItems: characters.pack.counts.authoredPracticeItems,
      },
    },
    {
      sourceKind: "grammar-context",
      sourceId: grammar.pack.packId,
      relativePath: "content/drafts/hsk2-grammar-context-2026.07.json",
      sha256: fileSha256(grammar.packPath),
      batches: grammar.pack.reviewBatches,
      targetCounts: {
        grammarRows: grammar.pack.counts.grammarDrafts,
        practiceItems: grammar.pack.counts.guidedPracticeItems,
      },
    },
    {
      sourceKind: "situational-dialogues",
      sourceId: situational.pack.packId,
      relativePath: "content/drafts/hsk2-situational-dialogues-2026.07.json",
      sha256: fileSha256(situational.packPath),
      batches: situational.pack.reviewBatches,
      targetCounts: {
        dialogues: situational.pack.counts.situationalLessons,
        tasks: situational.pack.counts.officialTaskDrafts,
        topics: situational.pack.counts.officialTopicDrafts,
        practiceItems: situational.pack.counts.guidedRoleplayItems,
      },
    },
    {
      sourceKind: "short-text-production",
      sourceId: production.pack.packId,
      relativePath: "content/drafts/hsk2-short-text-production-2026.07.json",
      sha256: fileSha256(production.packPath),
      batches: production.pack.reviewBatches,
      targetCounts: {
        prompts: production.pack.counts.promptUnits,
      },
    },
    {
      sourceKind: "level-assessment",
      sourceId: assessment.bank.bankId,
      relativePath: "content/drafts/hsk2-level-assessment-2026.07.json",
      sha256: fileSha256(assessment.bankPath),
      batches: assessment.bank.reviewBatches,
      targetCounts: {
        forms: assessment.bank.counts.forms,
        assessmentItems: assessment.bank.counts.totalItems,
        objectiveItems: assessment.bank.counts.objectiveItems,
        constructedResponseItems:
          assessment.bank.counts.constructedResponseItems,
      },
    },
  ];
};

const targetCounts = (batch) => ({
  lessons: batch.targetLessonIds?.length ?? 0,
  vocabulary: batch.lexemeIds?.length ?? 0,
  characters: batch.characterIds?.length ?? 0,
  grammarRows: batch.grammarRowIds?.length ?? 0,
  tasks: batch.taskIds?.length ?? 0,
  topics: batch.topicIds?.length ?? 0,
  dialogues: batch.dialogueIds?.length ?? 0,
  practiceItems: batch.practiceItemIds?.length ?? 0,
  prompts: batch.promptIds?.length ?? 0,
  assessmentItems: batch.itemIds?.length ?? 0,
});

export const buildHsk2ReviewManifest = (root = process.cwd()) => {
  const sources = buildSources(root);
  const reviewBatches = sources.flatMap((source) =>
    source.batches.map((batch) => ({
      batchId: batch.batchId,
      sourceKind: source.sourceKind,
      sourceId: source.sourceId,
      requiredRoles: [...batch.requiredRoles],
      state: batch.state,
      approvalCount: batch.approvals.length,
      targetCounts: targetCounts(batch),
    }))
  );

  const countKind = (sourceKind) => reviewBatches.filter(
    (batch) => batch.sourceKind === sourceKind,
  ).length;

  return {
    schemaVersion: 1,
    manifestId: "hsk2-review-manifest-2026.07",
    state: "ready-for-human-review-assignment",
    learnerVisible: false,
    releaseEligible: false,
    policy: {
      exactSourceHashRequired: true,
      manifestDuplicatesContent: false,
      reviewDoesNotPublish: true,
      reviewDoesNotCalibrate: true,
      reviewDoesNotGrantMastery: true,
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
      blueprintBatches: countKind("lesson-blueprints"),
      vocabularyBatches: countKind("vocabulary-practice"),
      characterBatches: countKind("character-practice"),
      grammarBatches: countKind("grammar-context"),
      situationalBatches: countKind("situational-dialogues"),
      productionBatches: countKind("short-text-production"),
      assessmentBatches: countKind("level-assessment"),
    },
    sources: sources.map(({ batches, ...source }) => ({
      ...source,
      reviewBatchCount: batches.length,
    })),
    reviewBatches,
  };
};

export const serializeHsk2ReviewManifest = (manifest) =>
  `${JSON.stringify(manifest, null, 2)}\n`;

const main = () => {
  const root = process.cwd();
  const outputPath = join(root, HSK2_REVIEW_MANIFEST_RELATIVE_PATH);
  const serialized = serializeHsk2ReviewManifest(
    buildHsk2ReviewManifest(root),
  );
  if (process.argv.includes("--write")) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK2 review manifest is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK2_REVIEW_MANIFEST_RELATIVE_PATH,
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
