import { sha256Json } from "./governance.mjs";

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const SAFE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u;
const WILDCARD_PATTERN = /[*?[\]]/u;
const ASSIGNMENT_KEYS = [
  "schemaVersion",
  "assignmentId",
  "contentVersion",
  "packageManifestSha256",
  "itemCatalogSha256",
  "role",
  "assignedByOperatorId",
  "assigneeOperatorId",
  "assignedAt",
  "scope",
];
const SCOPE_KEYS = ["itemKeys", "audioAssetIds"];
const REVIEW_ROLES = new Set([
  "content-owner",
  "native-linguistic",
  "source-license",
  "audio-rights",
]);
const ITEM_ONLY_ROLES = new Set(["content-owner", "source-license"]);
const MAX_IDENTIFIER_LENGTH = 128;
const MAX_TARGET_ID_LENGTH = 256;
const MAX_SCOPE_TARGETS = 10_000;
const UNAUTHENTICATED_OPERATOR_WARNING =
  "Operator identities are claimed metadata; authentication and authorization "
  + "are outside this E2 contract";

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const compareOrdinal = (left, right) =>
  left < right ? -1 : left > right ? 1 : 0;

const validateExactKeys = (value, expectedKeys, label, errors) => {
  if (!isRecord(value)) {
    errors.push(`${label} must be an object`);
    return false;
  }
  const expected = new Set(expectedKeys);
  Object.keys(value).forEach((key) => {
    if (!expected.has(key)) errors.push(`${label}.${key} is not allowed`);
  });
  expectedKeys.forEach((key) => {
    if (!Object.hasOwn(value, key)) errors.push(`${label}.${key} is required`);
  });
  return true;
};

const validateSafeId = (value, label, errors) => {
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${label} is required`);
    return;
  }
  if (value.length > MAX_IDENTIFIER_LENGTH) {
    errors.push(`${label} exceeds ${MAX_IDENTIFIER_LENGTH} characters`);
  }
  if (!SAFE_ID_PATTERN.test(value)) {
    errors.push(`${label} must be a safe identifier`);
  }
};

const validateDigest = (value, label, errors) => {
  if (!DIGEST_PATTERN.test(value ?? "")) {
    errors.push(`${label} must be a lowercase SHA-256 digest`);
  }
};

const validateTimestamp = (value, nowEpochMs, errors) => {
  if (typeof value !== "string" || value.length === 0) {
    errors.push("assignment.assignedAt is required");
    return;
  }
  const epoch = Date.parse(value);
  if (Number.isNaN(epoch) || new Date(epoch).toISOString() !== value) {
    errors.push("assignment.assignedAt must be canonical UTC");
    return;
  }
  if (Number.isFinite(nowEpochMs) && epoch > nowEpochMs) {
    errors.push("assignment.assignedAt cannot be in the future");
  }
};

const validateTargetArray = (value, label, errors) => {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`);
    return [];
  }
  if (value.length > MAX_SCOPE_TARGETS) {
    errors.push(`${label} exceeds ${MAX_SCOPE_TARGETS} targets`);
  }
  const targets = [];
  const seen = new Set();
  const duplicates = new Set();
  value.forEach((target, index) => {
    if (typeof target !== "string" || target.length === 0) {
      errors.push(`${label}[${index}] must be a non-empty string`);
      return;
    }
    if (target.length > MAX_TARGET_ID_LENGTH) {
      errors.push(`${label}[${index}] exceeds ${MAX_TARGET_ID_LENGTH} characters`);
    }
    if (WILDCARD_PATTERN.test(target)) {
      errors.push(`${label}[${index}] must not contain wildcard syntax`);
    }
    if (seen.has(target)) duplicates.add(target);
    seen.add(target);
    targets.push(target);
  });
  duplicates.forEach((target) => {
    errors.push(`${label} contains duplicate target ${target}`);
  });
  if (
    targets.length === value.length
    && targets.some((target, index) =>
      index > 0 && compareOrdinal(targets[index - 1], target) > 0)
  ) {
    errors.push(`${label} must use canonical ordinal order`);
  }
  return targets;
};

const hashCanonicalValue = async (value, label, errors) => {
  if (!isRecord(value)) return null;
  try {
    return await sha256Json(value);
  } catch {
    errors.push(`${label} cannot be canonically hashed`);
    return null;
  }
};

const buildCatalogIndexes = (itemCatalog, errors) => {
  if (!isRecord(itemCatalog)) {
    errors.push("Assignment requires an item catalog");
    return { itemByKey: new Map(), audioById: new Map() };
  }
  if (!Array.isArray(itemCatalog.items)) {
    errors.push("item-catalog.items must be an array");
  }
  if (!Array.isArray(itemCatalog.audioAssets)) {
    errors.push("item-catalog.audioAssets must be an array");
  }
  const itemByKey = new Map();
  const audioById = new Map();
  (Array.isArray(itemCatalog.items) ? itemCatalog.items : [])
    .forEach((item) => {
      if (!isRecord(item) || typeof item.itemKey !== "string") return;
      if (itemByKey.has(item.itemKey)) {
        errors.push(`Item catalog contains duplicate item target ${item.itemKey}`);
      }
      itemByKey.set(item.itemKey, item);
    });
  (Array.isArray(itemCatalog.audioAssets) ? itemCatalog.audioAssets : [])
    .forEach((asset) => {
      if (!isRecord(asset) || typeof asset.assetId !== "string") return;
      if (audioById.has(asset.assetId)) {
        errors.push(`Item catalog contains duplicate audio target ${asset.assetId}`);
      }
      audioById.set(asset.assetId, asset);
    });
  return { itemByKey, audioById };
};

const validateRoleScope = (
  role,
  itemKeys,
  audioAssetIds,
  audioById,
  errors,
) => {
  if (itemKeys.length + audioAssetIds.length === 0) {
    errors.push("assignment.scope cannot be empty");
  }
  if (ITEM_ONLY_ROLES.has(role)) {
    if (itemKeys.length === 0) {
      errors.push(`assignment role ${String(role)} requires itemKeys`);
    }
    if (audioAssetIds.length > 0) {
      errors.push(`assignment role ${String(role)} cannot target audio assets`);
    }
    return;
  }
  if (role === "audio-rights") {
    if (audioAssetIds.length === 0) {
      errors.push("assignment role audio-rights requires audioAssetIds");
    }
    if (itemKeys.length > 0) {
      errors.push("assignment role audio-rights cannot target items");
    }
    return;
  }
  if (role !== "native-linguistic") return;
  if (itemKeys.length === 0) {
    errors.push("assignment role native-linguistic requires itemKeys");
  }
  const itemTargets = new Set(itemKeys);
  audioAssetIds.forEach((assetId) => {
    const targetItemKey = audioById.get(assetId)?.targetItemKey;
    if (typeof targetItemKey === "string" && !itemTargets.has(targetItemKey)) {
      errors.push(
        `Native linguistic audio target ${assetId} requires item target ${targetItemKey}`,
      );
    }
  });
};

const validateNativeIndependence = (
  envelope,
  manifest,
  itemKeys,
  audioAssetIds,
  itemByKey,
  audioById,
  errors,
) => {
  if (envelope.role !== "native-linguistic") return;
  const assigneeId = envelope.assigneeOperatorId;
  if (typeof assigneeId !== "string") return;
  if (manifest?.governance?.contentOwner?.id === assigneeId) {
    errors.push("Native linguistic assignee must differ from the package content owner");
  }
  itemKeys.forEach((itemKey) => {
    if (itemByKey.get(itemKey)?.owner?.id === assigneeId) {
      errors.push(
        `Native linguistic assignee must differ from item owner ${itemKey}`,
      );
    }
  });
  audioAssetIds.forEach((assetId) => {
    const asset = audioById.get(assetId);
    if (asset?.rights?.ownerId === assigneeId) {
      errors.push(
        `Native linguistic assignee must differ from audio owner ${assetId}`,
      );
    }
    const targetItemKey = asset?.targetItemKey;
    if (
      typeof targetItemKey === "string"
      && itemByKey.get(targetItemKey)?.owner?.id === assigneeId
    ) {
      errors.push(
        `Native linguistic assignee must differ from audio target item owner ${assetId}`,
      );
    }
  });
};

/**
 * Validates one immutable editorial assignment against an already validated
 * content bundle. This function is deliberately pure: it authenticates no
 * operator, performs no I/O, and never turns an assignment into review
 * evidence.
 *
 * @param {unknown} envelope
 * @param {import("./types").ContentPackageBundle} bundle
 * @param {import("./types").ContentValidationResult} validation
 * @param {{ nowEpochMs: number }} options
 * @returns {Promise<import("./types").EditorialAssignmentValidationResult>}
 */
export const validateEditorialAssignmentEnvelope = async (
  envelope,
  bundle,
  validation,
  options,
) => {
  const errors = [];
  const warnings = [UNAUTHENTICATED_OPERATOR_WARNING];
  const nowEpochMs = options?.nowEpochMs;
  if (!Number.isFinite(nowEpochMs)) {
    errors.push("options.nowEpochMs must be a finite epoch");
  }

  const envelopeIsRecord = validateExactKeys(
    envelope,
    ASSIGNMENT_KEYS,
    "assignment",
    errors,
  );
  if (!envelopeIsRecord) {
    return {
      schemaVersion: 1,
      assignmentSha256: null,
      valid: false,
      errors,
      warnings,
    };
  }

  if (envelope.schemaVersion !== 1) {
    errors.push("assignment.schemaVersion must be 1");
  }
  validateSafeId(envelope.assignmentId, "assignment.assignmentId", errors);
  validateSafeId(envelope.contentVersion, "assignment.contentVersion", errors);
  validateDigest(
    envelope.packageManifestSha256,
    "assignment.packageManifestSha256",
    errors,
  );
  validateDigest(
    envelope.itemCatalogSha256,
    "assignment.itemCatalogSha256",
    errors,
  );
  if (!REVIEW_ROLES.has(envelope.role)) {
    errors.push("assignment.role is unsupported");
  }
  validateSafeId(
    envelope.assignedByOperatorId,
    "assignment.assignedByOperatorId",
    errors,
  );
  validateSafeId(
    envelope.assigneeOperatorId,
    "assignment.assigneeOperatorId",
    errors,
  );
  validateTimestamp(
    envelope.assignedAt,
    nowEpochMs,
    errors,
  );

  const scopeIsRecord = validateExactKeys(
    envelope.scope,
    SCOPE_KEYS,
    "assignment.scope",
    errors,
  );
  const itemKeys = scopeIsRecord
    ? validateTargetArray(
        envelope.scope.itemKeys,
        "assignment.scope.itemKeys",
        errors,
      )
    : [];
  const audioAssetIds = scopeIsRecord
    ? validateTargetArray(
        envelope.scope.audioAssetIds,
        "assignment.scope.audioAssetIds",
        errors,
      )
    : [];
  if (itemKeys.length + audioAssetIds.length > MAX_SCOPE_TARGETS) {
    errors.push(`assignment.scope exceeds ${MAX_SCOPE_TARGETS} total targets`);
  }

  const validationErrors = Array.isArray(validation?.errors)
    ? validation.errors
    : null;
  if (validationErrors === null) {
    errors.push("Content package validation result is malformed");
  } else if (validationErrors.length > 0) {
    errors.push("Content package must pass validation before assignment");
  }
  const manifest = isRecord(bundle?.manifest) ? bundle.manifest : null;
  if (manifest === null) errors.push("Assignment requires a package manifest");
  const itemCatalog = isRecord(bundle?.itemCatalog) ? bundle.itemCatalog : null;
  const { itemByKey, audioById } = buildCatalogIndexes(itemCatalog, errors);
  const computedManifestSha256 = await hashCanonicalValue(
    manifest,
    "Package manifest",
    errors,
  );
  const computedItemCatalogSha256 = await hashCanonicalValue(
    itemCatalog,
    "Item catalog",
    errors,
  );
  if (
    computedManifestSha256 !== null
    && validation?.hashes?.manifest !== computedManifestSha256
  ) {
    errors.push("Content validation manifest hash does not match package bytes");
  }
  if (
    computedItemCatalogSha256 !== null
    && validation?.hashes?.itemCatalog !== computedItemCatalogSha256
  ) {
    errors.push("Content validation item catalog hash does not match package bytes");
  }
  if (
    computedManifestSha256 !== null
    && envelope.packageManifestSha256 !== computedManifestSha256
  ) {
    errors.push("assignment.packageManifestSha256 does not match the package");
  }
  if (
    computedItemCatalogSha256 !== null
    && envelope.itemCatalogSha256 !== computedItemCatalogSha256
  ) {
    errors.push("assignment.itemCatalogSha256 does not match the item catalog");
  }
  if (
    typeof manifest?.contentVersion === "string"
    && envelope.contentVersion !== manifest.contentVersion
  ) {
    errors.push("assignment.contentVersion does not match the package manifest");
  }
  if (
    typeof itemCatalog?.contentVersion === "string"
    && envelope.contentVersion !== itemCatalog.contentVersion
  ) {
    errors.push("assignment.contentVersion does not match the item catalog");
  }

  itemKeys.forEach((itemKey) => {
    if (!itemByKey.has(itemKey)) {
      errors.push(`assignment.scope references unknown item ${itemKey}`);
    }
  });
  audioAssetIds.forEach((assetId) => {
    if (!audioById.has(assetId)) {
      errors.push(`assignment.scope references unknown audio asset ${assetId}`);
    }
  });
  validateRoleScope(
    envelope.role,
    itemKeys,
    audioAssetIds,
    audioById,
    errors,
  );
  validateNativeIndependence(
    envelope,
    manifest,
    itemKeys,
    audioAssetIds,
    itemByKey,
    audioById,
    errors,
  );

  const valid = errors.length === 0;
  return {
    schemaVersion: 1,
    assignmentSha256: valid ? await sha256Json(envelope) : null,
    valid,
    errors,
    warnings,
  };
};
