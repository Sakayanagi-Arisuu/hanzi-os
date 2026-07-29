import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertValidHsk2ReviewManifestBundle,
  checkedHsk2ReviewManifest,
  loadHsk2ReviewManifestBundle,
  validateHsk2ReviewManifestBundle,
} from "./hsk2ReviewManifest.mjs";

describe("HSK2 bounded human-review manifest", () => {
  it("exports 122 exact pending batches without duplicating draft content", () => {
    const bundle = loadHsk2ReviewManifestBundle();
    const result = assertValidHsk2ReviewManifestBundle(bundle);

    expect(result.summary).toEqual({
      sourceArtifacts: 7,
      reviewBatches: 122,
      pendingBatches: 122,
      approvals: 0,
      blueprintBatches: 40,
      vocabularyBatches: 20,
      characterBatches: 10,
      grammarBatches: 10,
      situationalBatches: 20,
      productionBatches: 10,
      assessmentBatches: 12,
    });
    expect(bundle.manifest.policy).toMatchObject({
      exactSourceHashRequired: true,
      manifestDuplicatesContent: false,
      reviewDoesNotPublish: true,
      reviewDoesNotCalibrate: true,
      reviewDoesNotGrantMastery: true,
    });
  });

  it("fails closed when a source hash or approval state drifts", () => {
    const bundle = loadHsk2ReviewManifestBundle();
    const manifest = structuredClone(bundle.manifest);
    manifest.sources[0].sha256 = "sha256:bad";
    manifest.reviewBatches[0].approvalCount = 1;

    const result = validateHsk2ReviewManifestBundle({
      ...bundle,
      manifest,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK2 review manifest source hashes, batches or counts are stale",
      "HSK2 review manifest must contain only exact pending batches",
    ]));
  });

  it("keeps the checked manifest deterministic", () => {
    const bundle = loadHsk2ReviewManifestBundle();
    expect(readFileSync(bundle.manifestPath, "utf8")).toBe(
      checkedHsk2ReviewManifest(),
    );
  });
});
