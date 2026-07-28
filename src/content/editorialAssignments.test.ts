import { beforeAll, describe, expect, it } from "vitest";
import { loadContentBundle } from "../../scripts/content/lib.mjs";
import { validateEditorialAssignmentEnvelope } from "./editorialAssignments.mjs";
import { assessEditorialReadiness } from "./editorialReadiness.mjs";
import { projectSanitizedRuntimeCatalog } from "./governance.mjs";
import { sha256Json, validateContentBundle } from "./packageLoader";
import type {
  ContentPackageBundle,
  ContentValidationResult,
  EditorialAssignmentEnvelope,
  Sha256Digest,
} from "./types";

const CONTENT_VERSION = "foundation-2026.07.6";
const TARGET_ITEM_KEY = "lexeme:ni";
const AUDIO_ASSET_ID = "assignment-audio-fixture";
const ASSIGNED_AT = "2026-07-28T01:00:00.000Z";
const NOW_EPOCH_MS = Date.parse("2026-07-28T02:00:00.000Z");
const STALE_DIGEST = `sha256:${"f".repeat(64)}` as Sha256Digest;
const OPERATOR_WARNING =
  "Operator identities are claimed metadata; authentication and authorization "
  + "are outside this E2 contract";

let checkedInBundle: ContentPackageBundle;
let checkedInValidation: ContentValidationResult;

beforeAll(async () => {
  checkedInBundle = structuredClone(
    loadContentBundle(CONTENT_VERSION).bundle,
  ) as unknown as ContentPackageBundle;
  checkedInValidation = await validateContentBundle(checkedInBundle);
  expect(checkedInValidation.errors).toEqual([]);
});

const freshContext = () => ({
  bundle: structuredClone(checkedInBundle),
  validation: structuredClone(checkedInValidation),
});

const assignmentFor = (
  bundle: ContentPackageBundle,
  validation: ContentValidationResult,
): EditorialAssignmentEnvelope => {
  if (validation.hashes.itemCatalog === null || bundle.itemCatalog === null) {
    throw new Error("Assignment fixture requires a governed item catalog");
  }
  return {
    schemaVersion: 1,
    assignmentId: "assignment-fixture",
    contentVersion: bundle.manifest.contentVersion,
    packageManifestSha256: validation.hashes.manifest,
    itemCatalogSha256: validation.hashes.itemCatalog,
    role: "content-owner",
    assignedByOperatorId: "operator-fixture",
    assigneeOperatorId: "operator-fixture",
    assignedAt: ASSIGNED_AT,
    scope: {
      itemKeys: [TARGET_ITEM_KEY],
      audioAssetIds: [],
    },
  };
};

const rebindValidation = async (
  bundle: ContentPackageBundle,
  validation: ContentValidationResult,
) => {
  if (bundle.itemCatalog === null) {
    throw new Error("Rebinding fixture requires an item catalog");
  }
  const itemCatalogSha256 = await sha256Json(bundle.itemCatalog);
  bundle.manifest.artifacts["item-catalog.json"] = itemCatalogSha256;
  const packageManifestSha256 = await sha256Json(bundle.manifest);
  return {
    ...structuredClone(validation),
    errors: [],
    hashes: {
      ...structuredClone(validation.hashes),
      manifest: packageManifestSha256,
      itemCatalog: itemCatalogSha256,
    },
  };
};

const addAudioAsset = (
  bundle: ContentPackageBundle,
  {
    audioOwnerId = "audio-owner-fixture",
    targetItemKey = TARGET_ITEM_KEY,
  }: {
    audioOwnerId?: string;
    targetItemKey?: string;
  } = {},
) => {
  if (bundle.itemCatalog === null) {
    throw new Error("Audio assignment fixture requires an item catalog");
  }
  (bundle.itemCatalog.audioAssets as unknown[]).push({
    assetId: AUDIO_ASSET_ID,
    targetItemKey,
    rights: {
      ownerId: audioOwnerId,
    },
  });
};

const validate = (
  envelope: unknown,
  bundle: ContentPackageBundle,
  validation: ContentValidationResult,
) => validateEditorialAssignmentEnvelope(
  envelope,
  bundle,
  validation,
  { nowEpochMs: NOW_EPOCH_MS },
);

describe("validateEditorialAssignmentEnvelope", () => {
  it("accepts one exact immutable assignment with claimed self-assignment", async () => {
    const { bundle, validation } = freshContext();
    const envelope = assignmentFor(bundle, validation);
    const envelopeBefore = JSON.stringify(envelope);
    const bundleBefore = JSON.stringify(bundle);

    const result = await validate(envelope, bundle, validation);

    expect(result).toEqual({
      schemaVersion: 1,
      assignmentSha256: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u),
      valid: true,
      errors: [],
      warnings: [OPERATOR_WARNING],
    });
    expect(envelope.assignedByOperatorId).toBe(envelope.assigneeOperatorId);
    expect(JSON.stringify(envelope)).toBe(envelopeBefore);
    expect(JSON.stringify(bundle)).toBe(bundleBefore);
  });

  it.each([
    {
      name: "an unsupported schema",
      mutate: (value: Record<string, unknown>) => {
        value.schemaVersion = 2;
      },
      error: "assignment.schemaVersion must be 1",
    },
    {
      name: "a missing required root key",
      mutate: (value: Record<string, unknown>) => {
        delete value.assignmentId;
      },
      error: "assignment.assignmentId is required",
    },
    {
      name: "an unknown root key",
      mutate: (value: Record<string, unknown>) => {
        value.assignments = [];
      },
      error: "assignment.assignments is not allowed",
    },
    {
      name: "an unknown scope key",
      mutate: (value: Record<string, unknown>) => {
        (value.scope as Record<string, unknown>).wildcard = "*";
      },
      error: "assignment.scope.wildcard is not allowed",
    },
    {
      name: "an unsafe operator id",
      mutate: (value: Record<string, unknown>) => {
        value.assigneeOperatorId = "../../operator";
      },
      error: "assignment.assigneeOperatorId must be a safe identifier",
    },
    {
      name: "an unsupported role",
      mutate: (value: Record<string, unknown>) => {
        value.role = "administrator";
      },
      error: "assignment.role is unsupported",
    },
    {
      name: "an unbounded assignment id",
      mutate: (value: Record<string, unknown>) => {
        value.assignmentId = "a".repeat(129);
      },
      error: "assignment.assignmentId exceeds 128 characters",
    },
    {
      name: "a noncanonical timestamp",
      mutate: (value: Record<string, unknown>) => {
        value.assignedAt = "2026-07-28T01:00:00Z";
      },
      error: "assignment.assignedAt must be canonical UTC",
    },
    {
      name: "a future timestamp",
      mutate: (value: Record<string, unknown>) => {
        value.assignedAt = "2026-07-28T03:00:00.000Z";
      },
      error: "assignment.assignedAt cannot be in the future",
    },
  ])("rejects $name", async ({ mutate, error }) => {
    const { bundle, validation } = freshContext();
    const envelope = assignmentFor(bundle, validation);
    mutate(envelope as unknown as Record<string, unknown>);

    const result = await validate(envelope, bundle, validation);

    expect(result.valid).toBe(false);
    expect(result.assignmentSha256).toBeNull();
    expect(result.errors).toContain(error);
  });

  it.each([
    {
      name: "a stale manifest hash",
      mutate: (value: EditorialAssignmentEnvelope) => {
        value.packageManifestSha256 = STALE_DIGEST;
      },
      error: "assignment.packageManifestSha256 does not match the package",
    },
    {
      name: "a malformed manifest hash",
      mutate: (value: EditorialAssignmentEnvelope) => {
        value.packageManifestSha256 =
          `SHA256:${"f".repeat(64)}` as Sha256Digest;
      },
      error: "assignment.packageManifestSha256 must be a lowercase SHA-256 digest",
    },
    {
      name: "a stale catalog hash",
      mutate: (value: EditorialAssignmentEnvelope) => {
        value.itemCatalogSha256 = STALE_DIGEST;
      },
      error: "assignment.itemCatalogSha256 does not match the item catalog",
    },
    {
      name: "a mismatched content version",
      mutate: (value: EditorialAssignmentEnvelope) => {
        value.contentVersion = "foundation-stale";
      },
      error: "assignment.contentVersion does not match the package manifest",
    },
  ])("fails closed for $name", async ({ mutate, error }) => {
    const { bundle, validation } = freshContext();
    const envelope = assignmentFor(bundle, validation);
    mutate(envelope);

    const result = await validate(envelope, bundle, validation);

    expect(result.valid).toBe(false);
    expect(result.assignmentSha256).toBeNull();
    expect(result.errors).toContain(error);
  });

  it("does not trust a forged validation hash or a package with validation errors", async () => {
    const { bundle, validation } = freshContext();
    const envelope = assignmentFor(bundle, validation);
    const forgedValidation = structuredClone(validation);
    forgedValidation.hashes.manifest = STALE_DIGEST;
    const forged = await validate(envelope, bundle, forgedValidation);
    expect(forged.errors).toContain(
      "Content validation manifest hash does not match package bytes",
    );

    const invalidValidation = structuredClone(validation);
    invalidValidation.errors.push("fixture package failure");
    const invalid = await validate(envelope, bundle, invalidValidation);
    expect(invalid.errors).toContain(
      "Content package must pass validation before assignment",
    );
    expect(invalid.assignmentSha256).toBeNull();
  });

  it.each([
    {
      name: "an empty scope",
      targets: { itemKeys: [], audioAssetIds: [] },
      error: "assignment.scope cannot be empty",
    },
    {
      name: "a wildcard",
      targets: { itemKeys: ["lexeme:*"], audioAssetIds: [] },
      error: "assignment.scope.itemKeys[0] must not contain wildcard syntax",
    },
    {
      name: "an unknown exact item",
      targets: { itemKeys: ["lexeme:unknown"], audioAssetIds: [] },
      error: "assignment.scope references unknown item lexeme:unknown",
    },
    {
      name: "a duplicate item",
      targets: {
        itemKeys: [TARGET_ITEM_KEY, TARGET_ITEM_KEY],
        audioAssetIds: [],
      },
      error: `assignment.scope.itemKeys contains duplicate target ${TARGET_ITEM_KEY}`,
    },
  ])("rejects $name instead of broadening target scope", async ({
    targets,
    error,
  }) => {
    const { bundle, validation } = freshContext();
    const envelope = assignmentFor(bundle, validation);
    envelope.scope = targets as EditorialAssignmentEnvelope["scope"];

    const result = await validate(envelope, bundle, validation);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(error);
  });

  it("requires canonical ordinal target order", async () => {
    const { bundle, validation } = freshContext();
    if (bundle.itemCatalog === null) throw new Error("Catalog fixture is missing");
    const itemKeys = bundle.itemCatalog.items
      .map((item) => item.itemKey)
      .toSorted()
      .slice(0, 2);
    const envelope = assignmentFor(bundle, validation);
    envelope.scope.itemKeys = itemKeys.toReversed();

    const result = await validate(envelope, bundle, validation);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "assignment.scope.itemKeys must use canonical ordinal order",
    );
  });

  it("rejects a scope above the bounded target ceiling", async () => {
    const { bundle, validation } = freshContext();
    const envelope = assignmentFor(bundle, validation);
    envelope.scope.itemKeys = Array.from(
      { length: 10_001 },
      () => TARGET_ITEM_KEY,
    );

    const result = await validate(envelope, bundle, validation);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "assignment.scope.itemKeys exceeds 10000 targets",
    );
    expect(result.errors).toContain(
      "assignment.scope exceeds 10000 total targets",
    );
  });

  it("enforces the exact role-to-target matrix and native audio target binding", async () => {
    const { bundle, validation: originalValidation } = freshContext();
    addAudioAsset(bundle);
    const validation = await rebindValidation(bundle, originalValidation);
    const base = assignmentFor(bundle, validation);

    const audioRights = structuredClone(base);
    audioRights.role = "audio-rights";
    audioRights.scope = { itemKeys: [], audioAssetIds: [AUDIO_ASSET_ID] };
    expect((await validate(audioRights, bundle, validation)).valid).toBe(true);

    const native = structuredClone(base);
    native.role = "native-linguistic";
    native.scope = {
      itemKeys: [TARGET_ITEM_KEY],
      audioAssetIds: [AUDIO_ASSET_ID],
    };
    expect((await validate(native, bundle, validation)).valid).toBe(true);

    const unrelatedItemKey = bundle.itemCatalog?.items
      .map((item) => item.itemKey)
      .find((itemKey) => itemKey !== TARGET_ITEM_KEY);
    if (!unrelatedItemKey) throw new Error("Unrelated item fixture is missing");
    native.scope.itemKeys = [unrelatedItemKey];
    expect((await validate(native, bundle, validation)).errors).toContain(
      `Native linguistic audio target ${AUDIO_ASSET_ID} requires item target ${TARGET_ITEM_KEY}`,
    );

    const ownerWithAudio = structuredClone(base);
    ownerWithAudio.scope.audioAssetIds = [AUDIO_ASSET_ID];
    expect((await validate(ownerWithAudio, bundle, validation)).errors)
      .toContain("assignment role content-owner cannot target audio assets");

    const audioWithItem = structuredClone(audioRights);
    audioWithItem.scope.itemKeys = [TARGET_ITEM_KEY];
    expect((await validate(audioWithItem, bundle, validation)).errors)
      .toContain("assignment role audio-rights cannot target items");
  });

  it("blocks native assignment to package, item, audio, or audio-target owners", async () => {
    const { bundle, validation: originalValidation } = freshContext();
    if (bundle.itemCatalog === null) throw new Error("Catalog fixture is missing");
    const assigneeId = "conflicted-native-operator";
    bundle.manifest.governance.contentOwner = {
      id: assigneeId,
      evidenceRef: "fixture://package-owner",
    };
    const targetItem = bundle.itemCatalog.items.find(
      (item) => item.itemKey === TARGET_ITEM_KEY,
    );
    if (!targetItem) throw new Error("Target item fixture is missing");
    targetItem.owner = {
      id: assigneeId,
      evidenceRef: "fixture://item-owner",
    };
    addAudioAsset(bundle, { audioOwnerId: assigneeId });
    const validation = await rebindValidation(bundle, originalValidation);
    const envelope = assignmentFor(bundle, validation);
    envelope.role = "native-linguistic";
    envelope.assigneeOperatorId = assigneeId;
    envelope.scope.audioAssetIds = [AUDIO_ASSET_ID];

    const result = await validate(envelope, bundle, validation);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "Native linguistic assignee must differ from the package content owner",
      `Native linguistic assignee must differ from item owner ${TARGET_ITEM_KEY}`,
      `Native linguistic assignee must differ from audio owner ${AUDIO_ASSET_ID}`,
      `Native linguistic assignee must differ from audio target item owner ${AUDIO_ASSET_ID}`,
    ]));
  });

  it("hashes exact-key insertion variants identically without accepting reordered arrays", async () => {
    const { bundle, validation } = freshContext();
    const envelope = assignmentFor(bundle, validation);
    const reordered = {
      scope: {
        audioAssetIds: [],
        itemKeys: [TARGET_ITEM_KEY],
      },
      assignedAt: envelope.assignedAt,
      assigneeOperatorId: envelope.assigneeOperatorId,
      assignedByOperatorId: envelope.assignedByOperatorId,
      role: envelope.role,
      itemCatalogSha256: envelope.itemCatalogSha256,
      packageManifestSha256: envelope.packageManifestSha256,
      contentVersion: envelope.contentVersion,
      assignmentId: envelope.assignmentId,
      schemaVersion: envelope.schemaVersion,
    } satisfies EditorialAssignmentEnvelope;

    const first = await validate(envelope, bundle, validation);
    const second = await validate(reordered, bundle, validation);

    expect(first.valid).toBe(true);
    expect(second.valid).toBe(true);
    expect(first.assignmentSha256).toBe(second.assignmentSha256);
  });

  it("never turns an assignment into approval or learner-runtime data", async () => {
    const { bundle, validation } = freshContext();
    const envelope = assignmentFor(bundle, validation);
    envelope.assignmentId = "assignment-secret-fixture";
    envelope.assignedByOperatorId = "operator-secret-fixture";
    envelope.assigneeOperatorId = "operator-secret-fixture";
    const readinessBefore = assessEditorialReadiness(bundle, validation);
    const reviewsBefore = JSON.stringify(bundle.reviews);

    const result = await validate(envelope, bundle, validation);
    const readinessAfter = assessEditorialReadiness(bundle, validation);
    if (bundle.itemCatalog === null) throw new Error("Catalog fixture is missing");
    const runtimeProjection = projectSanitizedRuntimeCatalog(bundle.itemCatalog);
    const runtimeJson = JSON.stringify(runtimeProjection);

    expect(result.valid).toBe(true);
    expect(JSON.stringify(bundle.reviews)).toBe(reviewsBefore);
    expect(readinessAfter).toEqual(readinessBefore);
    expect(readinessAfter.summary.itemsApproved).toBe(0);
    expect(runtimeJson).not.toContain(envelope.assignmentId);
    expect(runtimeJson).not.toContain(envelope.assigneeOperatorId);
    expect(JSON.stringify(bundle)).not.toContain(envelope.assignmentId);
  });
});
