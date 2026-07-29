import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHsk3LevelAssessmentBundle,
  loadHsk3LevelAssessmentBundle,
} from "../../src/content/hsk3LevelAssessment.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

export const HSK3_REVIEW_MANIFEST_RELATIVE_PATH =
  "content/review/hsk3-review-manifest-2026.07.json";

const normalizedPath = (root, path) =>
  relative(root, path).replaceAll("\\", "/");

const targetCounts = (batch) => ({
  lessons: batch.targetLessonIds?.length ?? 0,
  vocabulary: batch.lexemeIds?.length ?? 0,
  texts: batch.textIds?.length ?? 0,
  grammarRows: batch.grammarRowIds?.length ?? 0,
  narrations: batch.narrationIds?.length ?? 0,
  practiceItems: batch.practiceItemIds?.length ?? 0,
  prompts: batch.promptItemIds?.length ?? 0,
  assessmentItems: batch.itemIds?.length ?? 0,
});

const addCounts = (left, right) => Object.fromEntries(
  Object.keys(left).map((key) => [key, left[key] + right[key]]),
);

const emptyTargetCounts = () => ({
  lessons: 0,
  vocabulary: 0,
  texts: 0,
  grammarRows: 0,
  narrations: 0,
  practiceItems: 0,
  prompts: 0,
  assessmentItems: 0,
});

const paragraphBundlesFromTip = (cultureBundle) => {
  const societyBundle = cultureBundle.prerequisiteBundles[0];
  const natureBundle = societyBundle.prerequisiteBundles[0];
  const studyBundle = natureBundle.prerequisiteBundles[0];
  const personalBundle = studyBundle.prerequisiteBundles[0];
  return [
    personalBundle.priorLessonBundle,
    personalBundle,
    studyBundle,
    natureBundle,
    societyBundle,
    cultureBundle,
  ];
};

const narrationBundlesFromTip = (discourseBundle) => {
  const comparisonBundle = discourseBundle.prerequisiteBundles[0];
  const eventBundle = comparisonBundle.prerequisiteBundles[0];
  const modalityBundle = eventBundle.prerequisiteBundles[0];
  const referenceBundle = modalityBundle.prerequisiteBundles[0];
  return [
    referenceBundle,
    modalityBundle,
    eventBundle,
    comparisonBundle,
    discourseBundle,
  ];
};

const guidedBundlesFromTip = (structuredBundle) => {
  const guidedParagraphBundle = structuredBundle.prerequisiteBundle;
  const eventRetellingBundle = guidedParagraphBundle.prerequisiteBundle;
  const cohesionBundle = eventRetellingBundle.prerequisiteBundle;
  const guidedNotesBundle = cohesionBundle.prerequisiteBundle;
  return [
    guidedNotesBundle,
    cohesionBundle,
    eventRetellingBundle,
    guidedParagraphBundle,
    structuredBundle,
  ];
};

const packSource = (root, sourceKind, bundle) => ({
  sourceKind,
  sourceId: bundle.pack.packId,
  relativePath: normalizedPath(root, bundle.packPath),
  sha256: fileSha256(bundle.packPath),
  batches: bundle.pack.reviewBatches,
});

const buildSources = (root) => {
  const assessment = loadHsk3LevelAssessmentBundle(root);
  assertValidHsk3LevelAssessmentBundle(assessment);
  const structured = assessment.sourceBundle;
  const guided = guidedBundlesFromTip(structured);
  const guidedNotes = guided[0];
  const narration = narrationBundlesFromTip(
    guidedNotes.narrationBundle,
  );
  const paragraph = paragraphBundlesFromTip(
    structured.paragraphBundle,
  );
  const blueprints = structured.blueprintBundle;

  return [
    packSource(root, "lesson-blueprints", blueprints),
    ...paragraph.map((bundle) =>
      packSource(root, "paragraph-input", bundle)
    ),
    ...narration.map((bundle) =>
      packSource(root, "narration-grammar", bundle)
    ),
    ...guided.map((bundle) =>
      packSource(root, "guided-production", bundle)
    ),
    {
      sourceKind: "level-assessment",
      sourceId: assessment.bank.bankId,
      relativePath: normalizedPath(root, assessment.bankPath),
      sha256: fileSha256(assessment.bankPath),
      batches: assessment.bank.reviewBatches,
    },
  ].map((source) => ({
    ...source,
    targetCounts: source.batches.reduce(
      (counts, batch) => addCounts(counts, targetCounts(batch)),
      emptyTargetCounts(),
    ),
  }));
};

export const buildHsk3ReviewManifest = (root = process.cwd()) => {
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
    manifestId: "hsk3-review-manifest-2026.07",
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
      paragraphBatches: countKind("paragraph-input"),
      narrationBatches: countKind("narration-grammar"),
      guidedProductionBatches: countKind("guided-production"),
      assessmentBatches: countKind("level-assessment"),
    },
    sources: sources.map(({ batches, ...source }) => ({
      ...source,
      reviewBatchCount: batches.length,
    })),
    reviewBatches,
  };
};

export const serializeHsk3ReviewManifest = (manifest) =>
  `${JSON.stringify(manifest, null, 2)}\n`;

const main = () => {
  const root = process.cwd();
  const outputPath = join(root, HSK3_REVIEW_MANIFEST_RELATIVE_PATH);
  const serialized = serializeHsk3ReviewManifest(
    buildHsk3ReviewManifest(root),
  );
  if (process.argv.includes("--write")) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK3 review manifest is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK3_REVIEW_MANIFEST_RELATIVE_PATH,
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
