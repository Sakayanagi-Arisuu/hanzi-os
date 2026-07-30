import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHsk4LevelAssessmentBundle,
  loadHsk4LevelAssessmentBundle,
} from "../../src/content/hsk4LevelAssessment.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

export const HSK4_REVIEW_MANIFEST_RELATIVE_PATH =
  "content/review/hsk4-review-manifest-2026.07.json";

const normalizedPath = (root, path) =>
  relative(root, path).replaceAll("\\", "/");

const targetCounts = (batch) => ({
  lessons: batch.targetLessonIds?.length ?? 0,
  vocabulary: batch.targetLexemeIds?.length ?? 0,
  texts: batch.textIds?.length ?? 0,
  sourceTexts: batch.sourceTextIds?.length ?? 0,
  grammarRows: batch.grammarRowIds?.length ?? 0,
  practiceItems: batch.practiceItemIds?.length ?? 0,
  prompts: batch.promptUnitIds?.length ?? 0,
  rubrics: batch.rubricIds?.length ?? 0,
  assessmentItems: batch.itemIds?.length ?? 0,
});

const addCounts = (left, right) => Object.fromEntries(
  Object.keys(left).map((key) => [key, left[key] + right[key]]),
);

const emptyTargetCounts = () => ({
  lessons: 0,
  vocabulary: 0,
  texts: 0,
  sourceTexts: 0,
  grammarRows: 0,
  practiceItems: 0,
  prompts: 0,
  rubrics: 0,
  assessmentItems: 0,
});

const longFormBundlesFromTip = (cultureBundle) => {
  const artsBundle = cultureBundle.prerequisiteBundles[0];
  const societyBundle = artsBundle.prerequisiteBundles[0];
  const natureBundle = societyBundle.prerequisiteBundles[0];
  const educationBundle = natureBundle.prerequisiteBundles[0];
  const personalBundle = educationBundle.prerequisiteBundles[0];
  return [
    personalBundle,
    educationBundle,
    natureBundle,
    societyBundle,
    artsBundle,
    cultureBundle,
  ];
};

const summaryArgumentBundlesFromTip = (argumentBundle) => {
  const informationBundle = argumentBundle.prerequisiteBundles[0];
  const eventBundle = informationBundle.prerequisiteBundles[0];
  const stanceBundle = eventBundle.prerequisiteBundles[0];
  const precisionBundle = stanceBundle.prerequisiteBundles[0];
  return [
    precisionBundle,
    stanceBundle,
    eventBundle,
    informationBundle,
    argumentBundle,
  ];
};

const integrationBundlesFromTip = (timedBundle) => {
  const spokenBundle = timedBundle.prerequisiteBundles[0];
  const writtenBundle = spokenBundle.prerequisiteBundles[0];
  const synthesisBundle = writtenBundle.prerequisiteBundles[0];
  const inferenceBundle = synthesisBundle.prerequisiteBundles[0];
  const structureBundle = inferenceBundle.prerequisiteBundles[0];
  return [
    structureBundle,
    inferenceBundle,
    synthesisBundle,
    writtenBundle,
    spokenBundle,
    timedBundle,
  ];
};

const packSource = (root, sourceKind, bundle) => ({
  sourceKind,
  sourceId: bundle.pack.packId,
  relativePath: normalizedPath(root, bundle.packPath),
  sha256: fileSha256(bundle.packPath),
  batches: bundle.pack.reviewBatches,
});

const withTargetCounts = (source) => ({
  ...source,
  targetCounts: source.batches.reduce(
    (counts, batch) => addCounts(counts, targetCounts(batch)),
    emptyTargetCounts(),
  ),
});

const buildSources = (root) => {
  const assessment = loadHsk4LevelAssessmentBundle(root);
  assertValidHsk4LevelAssessmentBundle(assessment);
  const integration = integrationBundlesFromTip(
    assessment.integrationBundle,
  );
  const timed = integration.at(-1);
  const summaryArgument = summaryArgumentBundlesFromTip(
    timed.summaryArgumentHeadBundle,
  );
  const longForm = longFormBundlesFromTip(
    timed.longFormHeadBundle,
  );
  const blueprints = timed.blueprintBundle;

  return [
    packSource(root, "lesson-blueprints", blueprints),
    ...longForm.map((bundle) =>
      packSource(root, "long-form-input", bundle)
    ),
    ...summaryArgument.map((bundle) =>
      packSource(root, "summary-argument", bundle)
    ),
    ...integration.map((bundle) =>
      packSource(root, "integration", bundle)
    ),
    {
      sourceKind: "level-assessment",
      sourceId: assessment.bank.bankId,
      relativePath: normalizedPath(root, assessment.bankPath),
      sha256: fileSha256(assessment.bankPath),
      batches: assessment.bank.reviewBatches,
    },
  ].map(withTargetCounts);
};

export const buildHsk4ReviewManifest = (root = process.cwd()) => {
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
    manifestId: "hsk4-review-manifest-2026.07",
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
      longFormBatches: countKind("long-form-input"),
      summaryArgumentBatches: countKind("summary-argument"),
      integrationBatches: countKind("integration"),
      assessmentBatches: countKind("level-assessment"),
    },
    sources: sources.map(({ batches, ...source }) => ({
      ...source,
      reviewBatchCount: batches.length,
    })),
    reviewBatches,
  };
};

export const serializeHsk4ReviewManifest = (manifest) =>
  `${JSON.stringify(manifest, null, 2)}\n`;

const main = () => {
  const root = process.cwd();
  const outputPath = join(root, HSK4_REVIEW_MANIFEST_RELATIVE_PATH);
  const serialized = serializeHsk4ReviewManifest(
    buildHsk4ReviewManifest(root),
  );
  if (process.argv.includes("--write")) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK4 review manifest is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK4_REVIEW_MANIFEST_RELATIVE_PATH,
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
