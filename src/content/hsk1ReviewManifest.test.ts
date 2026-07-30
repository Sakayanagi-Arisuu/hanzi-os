import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertValidHsk1ReviewManifestBundle,
  checkedHsk1ReviewManifest,
  loadHsk1ReviewManifestBundle,
  validateHsk1ReviewManifestBundle,
} from "./hsk1ReviewManifest.mjs";

describe("HSK1 bounded human-review manifest", () => {
  it("exports 97 exact pending batches without duplicating draft content", () => {
    const bundle = loadHsk1ReviewManifestBundle();
    const result = assertValidHsk1ReviewManifestBundle(bundle);

    expect(result.summary).toEqual({
      sourceArtifacts: 8,
      reviewBatches: 97,
      pendingBatches: 97,
      approvals: 0,
      vocabularyBatches: 25,
      characterBatches: 15,
      grammarBatches: 20,
      taskBatches: 15,
      assessmentBatches: 10,
      runtimeProjectionBatches: 12,
    });
    expect(bundle.manifest.policy).toMatchObject({
      exactSourceHashRequired: true,
      manifestDuplicatesContent: false,
      reviewDoesNotPublish: true,
    });
  });

  it("fails closed when a source hash or approval state drifts", () => {
    const bundle = loadHsk1ReviewManifestBundle();
    const manifest = structuredClone(bundle.manifest);
    manifest.sources[0].sha256 = "sha256:bad";
    manifest.reviewBatches[0].approvalCount = 1;

    const result = validateHsk1ReviewManifestBundle({
      ...bundle,
      manifest,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "review manifest source hashes, batches or counts are stale",
      "review manifest must contain only exact pending batches",
    ]));
  });

  it("keeps the checked manifest deterministic", () => {
    const bundle = loadHsk1ReviewManifestBundle();
    expect(readFileSync(bundle.manifestPath, "utf8")).toBe(
      checkedHsk1ReviewManifest(),
    );
  });
});
