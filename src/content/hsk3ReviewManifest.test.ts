import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertValidHsk3ReviewManifestBundle,
  checkedHsk3ReviewManifest,
  loadHsk3ReviewManifestBundle,
  validateHsk3ReviewManifestBundle,
} from "./hsk3ReviewManifest.mjs";

describe("HSK3 bounded human-review manifest", () => {
  it("exports the complete draft chain as exact pending batches", () => {
    const bundle = loadHsk3ReviewManifestBundle();
    const result = assertValidHsk3ReviewManifestBundle(bundle);

    expect(result.summary).toEqual({
      sourceArtifacts: 18,
      reviewBatches: 122,
      pendingBatches: 122,
      approvals: 0,
      blueprintBatches: 55,
      paragraphBatches: 25,
      narrationBatches: 15,
      guidedProductionBatches: 15,
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
    const bundle = loadHsk3ReviewManifestBundle();
    const manifest = structuredClone(bundle.manifest);
    manifest.sources[0].sha256 = "sha256:bad";
    manifest.reviewBatches[0].approvalCount = 1;

    const result = validateHsk3ReviewManifestBundle({
      ...bundle,
      manifest,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK3 review manifest source hashes, batches or counts are stale",
      "HSK3 review manifest must contain only exact pending batches",
    ]));
  });

  it("keeps the checked manifest deterministic", () => {
    const bundle = loadHsk3ReviewManifestBundle();
    expect(readFileSync(bundle.manifestPath, "utf8")).toBe(
      checkedHsk3ReviewManifest(),
    );
  });
});
