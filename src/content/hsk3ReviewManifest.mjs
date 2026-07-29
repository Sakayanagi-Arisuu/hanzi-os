import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildHsk3ReviewManifest,
  HSK3_REVIEW_MANIFEST_RELATIVE_PATH,
  serializeHsk3ReviewManifest,
} from "../../scripts/content/build-hsk3-review-manifest.mjs";

const exactSet = (left, right) =>
  JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());

export const loadHsk3ReviewManifestBundle = (root = process.cwd()) => {
  const manifestPath = join(root, HSK3_REVIEW_MANIFEST_RELATIVE_PATH);
  return {
    root,
    manifestPath,
    manifest: JSON.parse(readFileSync(manifestPath, "utf8")),
  };
};

export const validateHsk3ReviewManifestBundle = ({ root, manifest }) => {
  const errors = [];
  const expected = buildHsk3ReviewManifest(root);
  if (
    manifest?.schemaVersion !== 1
    || manifest?.manifestId !== "hsk3-review-manifest-2026.07"
    || manifest?.state !== "ready-for-human-review-assignment"
    || manifest?.learnerVisible !== false
    || manifest?.releaseEligible !== false
  ) {
    errors.push("HSK3 review manifest state is invalid");
  }
  if (
    manifest?.policy?.exactSourceHashRequired !== true
    || manifest?.policy?.manifestDuplicatesContent !== false
    || manifest?.policy?.reviewDoesNotPublish !== true
    || manifest?.policy?.reviewDoesNotCalibrate !== true
    || manifest?.policy?.reviewDoesNotGrantMastery !== true
    || manifest?.policy?.allRequiredRolesMustApproveExactTargets !== true
  ) {
    errors.push("HSK3 review manifest policy must remain fail-closed");
  }
  if (
    JSON.stringify(manifest?.counts) !== JSON.stringify(expected.counts)
    || JSON.stringify(manifest?.sources) !== JSON.stringify(expected.sources)
    || JSON.stringify(manifest?.reviewBatches)
      !== JSON.stringify(expected.reviewBatches)
  ) {
    errors.push("HSK3 review manifest source hashes, batches or counts are stale");
  }
  const batchIds = (manifest?.reviewBatches ?? []).map(
    (batch) => batch.batchId,
  );
  if (new Set(batchIds).size !== batchIds.length) {
    errors.push("HSK3 review manifest batch IDs must be unique");
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
    errors.push("HSK3 review manifest must contain only exact pending batches");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: manifest?.counts,
  };
};

export const assertValidHsk3ReviewManifestBundle = (bundle) => {
  const result = validateHsk3ReviewManifestBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK3 review manifest:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};

export const checkedHsk3ReviewManifest = (root = process.cwd()) =>
  serializeHsk3ReviewManifest(buildHsk3ReviewManifest(root));
