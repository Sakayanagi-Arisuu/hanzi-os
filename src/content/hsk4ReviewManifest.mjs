import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildHsk4ReviewManifest,
  HSK4_REVIEW_MANIFEST_RELATIVE_PATH,
  serializeHsk4ReviewManifest,
} from "../../scripts/content/build-hsk4-review-manifest.mjs";

const exactSet = (left, right) =>
  JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());

export const loadHsk4ReviewManifestBundle = (root = process.cwd()) => {
  const manifestPath = join(root, HSK4_REVIEW_MANIFEST_RELATIVE_PATH);
  return {
    root,
    manifestPath,
    manifest: JSON.parse(readFileSync(manifestPath, "utf8")),
  };
};

export const validateHsk4ReviewManifestBundle = ({ root, manifest }) => {
  const errors = [];
  const expected = buildHsk4ReviewManifest(root);
  if (
    manifest?.schemaVersion !== 1
    || manifest?.manifestId !== "hsk4-review-manifest-2026.07"
    || manifest?.state !== "ready-for-human-review-assignment"
    || manifest?.learnerVisible !== false
    || manifest?.releaseEligible !== false
  ) {
    errors.push("HSK4 review manifest state is invalid");
  }
  if (
    manifest?.policy?.exactSourceHashRequired !== true
    || manifest?.policy?.manifestDuplicatesContent !== false
    || manifest?.policy?.reviewDoesNotPublish !== true
    || manifest?.policy?.reviewDoesNotCalibrate !== true
    || manifest?.policy?.reviewDoesNotGrantMastery !== true
    || manifest?.policy?.allRequiredRolesMustApproveExactTargets !== true
  ) {
    errors.push("HSK4 review manifest policy must remain fail-closed");
  }
  if (
    JSON.stringify(manifest?.counts) !== JSON.stringify(expected.counts)
    || JSON.stringify(manifest?.sources) !== JSON.stringify(expected.sources)
    || JSON.stringify(manifest?.reviewBatches)
      !== JSON.stringify(expected.reviewBatches)
  ) {
    errors.push("HSK4 review manifest source hashes, batches or counts are stale");
  }
  const batchIds = (manifest?.reviewBatches ?? []).map(
    (batch) => batch.batchId,
  );
  if (new Set(batchIds).size !== batchIds.length) {
    errors.push("HSK4 review manifest batch IDs must be unique");
  }
  if (
    (manifest?.reviewBatches ?? []).some(
      (batch) =>
        batch.state !== "pending"
        || batch.approvalCount !== 0
        || !Array.isArray(batch.requiredRoles)
        || batch.requiredRoles.length < 3
        || !exactSet(batch.requiredRoles, expected.reviewBatches.find(
          (candidate) => candidate.batchId === batch.batchId,
        )?.requiredRoles ?? []),
    )
  ) {
    errors.push("HSK4 review manifest must contain only exact pending batches");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: manifest?.counts,
  };
};

export const assertValidHsk4ReviewManifestBundle = (bundle) => {
  const result = validateHsk4ReviewManifestBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK4 review manifest:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};

export const checkedHsk4ReviewManifest = (root = process.cwd()) =>
  serializeHsk4ReviewManifest(buildHsk4ReviewManifest(root));
