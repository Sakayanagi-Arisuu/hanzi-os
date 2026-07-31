import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  loadHsk4LevelAssessmentBundle,
} from "./hsk4LevelAssessment.mjs";
import {
  assertValidHsk4ReviewManifestBundle,
  checkedHsk4ReviewManifest,
  loadHsk4ReviewManifestBundle,
  validateHsk4ReviewManifestBundle,
} from "./hsk4ReviewManifest.mjs";

type TargetCounts = {
  lessons: number;
  vocabulary: number;
  texts: number;
  sourceTexts: number;
  grammarRows: number;
  practiceItems: number;
  prompts: number;
  rubrics: number;
  assessmentItems: number;
};

type ReviewSource = {
  sourceKind: string;
  targetCounts: TargetCounts;
};

describe("HSK4 bounded human-review manifest", () => {
  it("exports the complete draft chain as exact pending batches", () => {
    const assessment = loadHsk4LevelAssessmentBundle() as {
      bank: { bankId: string; reviewBatches: unknown[] };
    };
    const assessmentBatches = assessment.bank.reviewBatches.length;
    const bundle = loadHsk4ReviewManifestBundle();
    const result = assertValidHsk4ReviewManifestBundle(bundle);
    const sources = bundle.manifest.sources as ReviewSource[];

    expect(result.summary).toEqual({
      sourceArtifacts: 19,
      reviewBatches: 156 + assessmentBatches,
      pendingBatches: 156 + assessmentBatches,
      approvals: 0,
      blueprintBatches: 78,
      longFormBatches: 36,
      summaryArgumentBatches: 24,
      integrationBatches: 18,
      assessmentBatches,
    });
    expect(sources.map((source) => source.sourceKind)).toEqual([
      "lesson-blueprints",
      ...Array.from({ length: 6 }, () => "long-form-input"),
      ...Array.from({ length: 5 }, () => "summary-argument"),
      ...Array.from({ length: 6 }, () => "integration"),
      "level-assessment",
    ]);
    expect(bundle.manifest.sources.map((source: {
      sourceId: string;
    }) => source.sourceId)).toEqual([
      "hsk4-lesson-blueprints-2026.07",
      "hsk4-personal-community-long-form-2026.07",
      "hsk4-education-work-long-form-2026.07",
      "hsk4-nature-technology-long-form-2026.07",
      "hsk4-society-economy-long-form-2026.07",
      "hsk4-arts-sports-exchange-long-form-2026.07",
      "hsk4-culture-history-long-form-2026.07",
      "hsk4-precision-reference-quantity-summary-argument-2026.07",
      "hsk4-stance-comparison-rhetoric-summary-argument-2026.07",
      "hsk4-event-agency-voice-summary-argument-2026.07",
      "hsk4-information-order-cohesion-summary-argument-2026.07",
      "hsk4-argument-logic-concession-summary-argument-2026.07",
      "hsk4-long-input-structure-map-integration-2026.07",
      "hsk4-inference-evidence-check-integration-2026.07",
      "hsk4-cross-text-synthesis-integration-2026.07",
      "hsk4-structured-written-argument-integration-2026.07",
      "hsk4-structured-spoken-defense-integration-2026.07",
      "hsk4-timed-sectional-rehearsal-integration-2026.07",
      assessment.bank.bankId,
    ]);
    expect(bundle.manifest.policy).toMatchObject({
      exactSourceHashRequired: true,
      manifestDuplicatesContent: false,
      reviewDoesNotPublish: true,
      reviewDoesNotCalibrate: true,
      reviewDoesNotGrantMastery: true,
    });
  }, 30_000);

  it("retains the exact HSK4-specific target categories", () => {
    const bundle = loadHsk4ReviewManifestBundle();
    const sources = bundle.manifest.sources as ReviewSource[];
    const totals = sources.slice(0, -1).reduce<TargetCounts>(
      (counts, source) => Object.fromEntries(
        (Object.keys(counts) as Array<keyof TargetCounts>).map((key) => [
          key,
          counts[key] + source.targetCounts[key],
        ]),
      ) as TargetCounts,
      {
        lessons: 0,
        vocabulary: 0,
        texts: 0,
        sourceTexts: 0,
        grammarRows: 0,
        practiceItems: 0,
        prompts: 0,
        rubrics: 0,
        assessmentItems: 0,
      },
    );

    expect(totals).toEqual({
      lessons: 78,
      vocabulary: 360,
      texts: 72,
      sourceTexts: 108,
      grammarRows: 95,
      practiceItems: 1811,
      prompts: 106,
      rubrics: 51,
      assessmentItems: 0,
    });
  });

  it("fails closed when a source hash or approval state drifts", () => {
    const bundle = loadHsk4ReviewManifestBundle();
    const manifest = structuredClone(bundle.manifest);
    manifest.sources[0].sha256 = "sha256:bad";
    manifest.reviewBatches[0].approvalCount = 1;

    const result = validateHsk4ReviewManifestBundle({
      ...bundle,
      manifest,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK4 review manifest source hashes, batches or counts are stale",
      "HSK4 review manifest must contain only exact pending batches",
    ]));
  });

  it("keeps the checked manifest deterministic", () => {
    const bundle = loadHsk4ReviewManifestBundle();
    expect(readFileSync(bundle.manifestPath, "utf8")).toBe(
      checkedHsk4ReviewManifest(),
    );
  });
});
