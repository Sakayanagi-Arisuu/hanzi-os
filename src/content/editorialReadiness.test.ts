import { describe, expect, it } from "vitest";
import { loadContentBundle } from "../../scripts/content/lib.mjs";
import {
  sha256Json,
  validateContentBundle,
} from "./packageLoader";
import { assessClosedAlphaEligibility } from "./publicationPolicy";
import { assessEditorialReadiness } from "./editorialReadiness.mjs";
import type {
  ContentPackageBundle,
  ContentReviewArtifact,
} from "./types";

const CURRENT_VERSION = "foundation-2026.07.6";
const TARGET_ITEM_KEY = "lexeme:ni";
const OWNER_ID = "editorial-owner-fixture";

const loadCandidate = (): ContentPackageBundle =>
  structuredClone(
    loadContentBundle(CURRENT_VERSION).bundle,
  ) as unknown as ContentPackageBundle;

type ScopedReview = Extract<
  ContentReviewArtifact,
  { schemaVersion: 2 }
>["reviews"][number];

const review = ({
  bundle,
  reviewId,
  role,
  decision = "approved",
  reviewerId,
  reviewedAt,
  manifestSha256 = bundle.registryEntry.manifestSha256,
  itemCatalogSha256 = bundle.manifest.artifacts["item-catalog.json"],
  itemKeys = [TARGET_ITEM_KEY],
}: {
  bundle: ReturnType<typeof loadCandidate>;
  reviewId: string;
  role:
    | "content-owner"
    | "native-linguistic"
    | "source-license"
    | "audio-rights";
  decision?: "approved" | "changes-requested";
  reviewerId: string;
  reviewedAt: string;
  manifestSha256?: string;
  itemCatalogSha256?: string;
  itemKeys?: string[];
}): ScopedReview => ({
  reviewId,
  role,
  decision,
  reviewerId,
  reviewedAt,
  evidenceRef: `fixture://${reviewId}`,
  packageManifestSha256: manifestSha256,
  scope: {
    itemCatalogSha256,
    itemKeys,
    audioAssetIds: [],
  },
}) as unknown as ScopedReview;

const rebindGovernedTarget = async () => {
  const bundle = loadCandidate();
  const item = bundle.itemCatalog?.items.find(
    ({ itemKey }: { itemKey: string }) => itemKey === TARGET_ITEM_KEY,
  );
  if (!item || !bundle.itemCatalog) {
    throw new Error("The editorial readiness fixture target is missing.");
  }
  item.owner = {
    id: OWNER_ID,
    evidenceRef: "fixture://owner-assignment",
  };
  item.sourceLicense = {
    licenseId: "fixture-license",
    evidenceRef: "fixture://source-license",
  };
  item.prerequisites = [];

  const itemCatalogSha256 = await sha256Json(bundle.itemCatalog);
  if (bundle.coverageClaims.schemaVersion !== 2) {
    throw new Error("The editorial readiness fixture requires coverage schema v2.");
  }
  bundle.coverageClaims.itemCatalogSha256 = itemCatalogSha256;
  bundle.manifest.artifacts["item-catalog.json"] = itemCatalogSha256;
  bundle.manifest.artifacts["coverage-claims.json"] = await sha256Json(
    bundle.coverageClaims,
  );
  const manifestSha256 = await sha256Json(bundle.manifest);
  bundle.registryEntry.manifestSha256 = manifestSha256;
  const registryEntry = bundle.registry.packages.find(
    ({ contentVersion }: { contentVersion: string }) =>
      contentVersion === CURRENT_VERSION,
  );
  if (!registryEntry) {
    throw new Error("The editorial readiness registry fixture is missing.");
  }
  registryEntry.manifestSha256 = manifestSha256;
  bundle.reviews.packageManifestSha256 = manifestSha256;
  if (bundle.reviews.schemaVersion !== 2) {
    throw new Error("The editorial readiness fixture requires review schema v2.");
  }
  bundle.reviews.itemCatalogSha256 = itemCatalogSha256;
  bundle.reviews.reviews = [];

  return bundle;
};

const itemProjection = (
  readiness: ReturnType<typeof assessEditorialReadiness>,
) => {
  const item = readiness.items.find(
    ({ itemKey }: { itemKey: string }) => itemKey === TARGET_ITEM_KEY,
  );
  if (!item) throw new Error("The projected editorial item is missing.");
  return item;
};

const roleProjection = (
  item: ReturnType<typeof itemProjection>,
  role: string,
) => {
  const requirement = item.reviewRequirements.find(
    ({ role: candidateRole }: { role: string }) => candidateRole === role,
  );
  if (!requirement) throw new Error(`The ${role} requirement is missing.`);
  return requirement;
};

describe("assessEditorialReadiness", () => {
  it("projects the exact current candidate backlog deterministically without mutating it", async () => {
    const bundle = loadCandidate();
    const before = JSON.stringify(bundle);
    const validation = await validateContentBundle(bundle);

    expect(validation.errors).toEqual([]);
    const first = assessEditorialReadiness(bundle, validation);
    const second = assessEditorialReadiness(bundle, validation);

    expect(first).toEqual(second);
    expect(JSON.stringify(bundle)).toBe(before);
    expect(first).toMatchObject({
      schemaVersion: 1,
      contentVersion: CURRENT_VERSION,
      packageManifestSha256: validation.hashes.manifest,
      itemCatalogSha256: validation.hashes.itemCatalog,
      reviewEnvelopeSha256: validation.hashes.reviews,
      valid: true,
      summary: {
        totalItems: 74,
        projectedItems: 74,
        invalidCatalogItems: 0,
        releaseStateCounts: {
          draft: 10,
          review: 25,
          beta: 39,
          published: 0,
          retired: 0,
        },
        releasedItems: 39,
        reviewItems: 25,
        draftItems: 10,
        releaseRelevantItems: 64,
        itemsMissingOwner: 74,
        itemsMissingSourceLicense: 74,
        itemsMissingPrerequisites: 25,
        itemsNeedingAuthoring: 74,
        releaseRelevantItemsNeedingAuthoring: 64,
        itemsReadyForReview: 0,
        itemsChangesRequested: 0,
        itemsApproved: 0,
        audioAssets: 0,
        projectedAudioAssets: 0,
        invalidAudioAssets: 0,
        reviewCount: 0,
        usableReviewCount: 0,
        unusableReviewCount: 0,
      },
    });
    expect(first.packageAuthoringIssues).toEqual([
      "missing-package-content-owner",
      "missing-package-source-license",
    ]);
    expect(first.items).toHaveLength(74);
    expect(first.audioAssets).toEqual([]);
    expect(first.items.map(({ itemKey }: { itemKey: string }) => itemKey))
      .toEqual(
        first.items
          .map(({ itemKey }: { itemKey: string }) => itemKey)
          .toSorted((left: string, right: string) =>
            left.localeCompare(right, "en-US")),
      );
    expect(first.items.filter(
      ({ releaseRelevant }: { releaseRelevant: boolean }) => releaseRelevant,
    )).toHaveLength(64);
    expect(first.items.every(
      ({ status }: { status: string }) => status === "needs-authoring",
    )).toBe(true);
    expect(JSON.stringify(first)).not.toContain('"payload"');
    expect(JSON.stringify(first)).not.toContain('"evidenceRef"');
  });

  it("uses the latest exact scoped decision and requires an independent native reviewer", async () => {
    const selfReviewed = await rebindGovernedTarget();
    selfReviewed.reviews.reviews = [
      review({
        bundle: selfReviewed,
        reviewId: "owner-approved",
        role: "content-owner",
        reviewerId: OWNER_ID,
        reviewedAt: "2026-07-28T01:00:00.000Z",
      }),
      review({
        bundle: selfReviewed,
        reviewId: "license-approved",
        role: "source-license",
        reviewerId: "license-reviewer",
        reviewedAt: "2026-07-28T01:01:00.000Z",
      }),
      review({
        bundle: selfReviewed,
        reviewId: "native-self-review",
        role: "native-linguistic",
        reviewerId: OWNER_ID,
        reviewedAt: "2026-07-28T01:02:00.000Z",
      }),
    ];
    const selfValidation = await validateContentBundle(selfReviewed);
    expect(selfValidation.errors).toEqual([]);

    const selfProjection = itemProjection(
      assessEditorialReadiness(selfReviewed, selfValidation),
    );
    expect(selfProjection.authoringIssues).toEqual([]);
    expect(selfProjection.status).toBe("ready-for-review");
    expect(roleProjection(selfProjection, "native-linguistic")).toMatchObject({
      status: "self-review-conflict",
      reviewId: "native-self-review",
      reviewerId: OWNER_ID,
    });

    const changed = structuredClone(selfReviewed);
    changed.reviews.reviews.push(
      review({
        bundle: changed,
        reviewId: "native-independent-approved",
        role: "native-linguistic",
        reviewerId: "independent-native-reviewer",
        reviewedAt: "2026-07-28T01:03:00.000Z",
      }),
      review({
        bundle: changed,
        reviewId: "native-changes-requested",
        role: "native-linguistic",
        decision: "changes-requested",
        reviewerId: "independent-native-reviewer",
        reviewedAt: "2026-07-28T01:04:00.000Z",
      }),
    );
    const changedValidation = await validateContentBundle(changed);
    expect(changedValidation.errors).toEqual([]);
    const changedProjection = itemProjection(
      assessEditorialReadiness(changed, changedValidation),
    );
    expect(changedProjection.status).toBe("changes-requested");
    expect(roleProjection(changedProjection, "native-linguistic"))
      .toMatchObject({
        status: "changes-requested",
        reviewId: "native-changes-requested",
      });

    const approved = structuredClone(changed);
    approved.reviews.reviews.push(
      review({
        bundle: approved,
        reviewId: "native-reapproved",
        role: "native-linguistic",
        reviewerId: "independent-native-reviewer",
        reviewedAt: "2026-07-28T01:05:00.000Z",
      }),
    );
    const approvedValidation = await validateContentBundle(approved);
    expect(approvedValidation.errors).toEqual([]);
    const approvedProjection = itemProjection(
      assessEditorialReadiness(approved, approvedValidation),
    );
    expect(approvedProjection.status).toBe("approved");
    expect(approvedProjection.reviewRequirements.map(
      ({ status }: { status: string }) => status,
    )).toEqual(["approved", "approved", "approved"]);
  });

  it("ignores a newer stale-manifest review instead of overriding current evidence", async () => {
    const bundle = await rebindGovernedTarget();
    bundle.reviews.reviews = [
      review({
        bundle,
        reviewId: "current-native-approval",
        role: "native-linguistic",
        reviewerId: "independent-native-reviewer",
        reviewedAt: "2026-07-28T02:00:00.000Z",
      }),
      review({
        bundle,
        reviewId: "stale-native-change",
        role: "native-linguistic",
        decision: "changes-requested",
        reviewerId: "independent-native-reviewer",
        reviewedAt: "2026-07-28T02:01:00.000Z",
        manifestSha256: `sha256:${"a".repeat(64)}`,
      }),
    ];
    const validation = await validateContentBundle(bundle);
    expect(validation.errors).toEqual([]);

    const readiness = assessEditorialReadiness(bundle, validation);
    expect(readiness.summary).toMatchObject({
      reviewCount: 2,
      usableReviewCount: 1,
      unusableReviewCount: 1,
    });
    expect(roleProjection(itemProjection(readiness), "native-linguistic"))
      .toMatchObject({
        status: "approved",
        reviewId: "current-native-approval",
      });
  });

  it("blocks individually current approvals when the review envelope is stale", async () => {
    const bundle = await rebindGovernedTarget();
    bundle.reviews.reviews = [
      review({
        bundle,
        reviewId: "owner-current",
        role: "content-owner",
        reviewerId: OWNER_ID,
        reviewedAt: "2026-07-28T02:10:00.000Z",
      }),
      review({
        bundle,
        reviewId: "native-current",
        role: "native-linguistic",
        reviewerId: "independent-native-reviewer",
        reviewedAt: "2026-07-28T02:11:00.000Z",
      }),
      review({
        bundle,
        reviewId: "license-current",
        role: "source-license",
        reviewerId: "license-reviewer",
        reviewedAt: "2026-07-28T02:12:00.000Z",
      }),
    ];
    bundle.reviews.packageManifestSha256 = `sha256:${"c".repeat(64)}`;
    const validation = await validateContentBundle(bundle);
    expect(validation.errors).toEqual([]);

    const readiness = assessEditorialReadiness(bundle, validation);
    expect(readiness.valid).toBe(false);
    expect(readiness.packageAuthoringIssues).toContain(
      "stale-review-envelope",
    );
    expect(readiness.summary).toMatchObject({
      reviewCount: 3,
      usableReviewCount: 0,
      unusableReviewCount: 3,
      itemsApproved: 0,
    });
    const item = itemProjection(readiness);
    expect(item.status).toBe("invalid");
    expect(item.reviewRequirements.every(
      ({ status }: { status: string }) =>
        status === "blocked-stale-review-envelope",
    )).toBe(true);
    expect(
      assessClosedAlphaEligibility(bundle, validation).blockers,
    ).toContain("Review envelope does not bind the current manifest digest");
  });

  it.each([
    {
      name: "a stale catalog digest",
      configure: (
        bundle: ReturnType<typeof loadCandidate>,
      ) => [
        review({
          bundle,
          reviewId: "stale-catalog-review",
          role: "native-linguistic",
          reviewerId: "native-reviewer",
          reviewedAt: "2026-07-28T03:00:00.000Z",
          itemCatalogSha256: `sha256:${"b".repeat(64)}`,
        }),
      ],
    },
    {
      name: "a wildcard target",
      configure: (
        bundle: ReturnType<typeof loadCandidate>,
      ) => [
        review({
          bundle,
          reviewId: "wildcard-review",
          role: "native-linguistic",
          reviewerId: "native-reviewer",
          reviewedAt: "2026-07-28T03:00:00.000Z",
          itemKeys: ["*"],
        }),
      ],
    },
    {
      name: "a duplicate target",
      configure: (
        bundle: ReturnType<typeof loadCandidate>,
      ) => [
        review({
          bundle,
          reviewId: "duplicate-target-review",
          role: "native-linguistic",
          reviewerId: "native-reviewer",
          reviewedAt: "2026-07-28T03:00:00.000Z",
          itemKeys: [TARGET_ITEM_KEY, TARGET_ITEM_KEY],
        }),
      ],
    },
    {
      name: "ambiguous equal-timestamp decisions",
      configure: (
        bundle: ReturnType<typeof loadCandidate>,
      ) => [
        review({
          bundle,
          reviewId: "equal-time-approved",
          role: "native-linguistic",
          reviewerId: "native-reviewer",
          reviewedAt: "2026-07-28T03:00:00.000Z",
        }),
        review({
          bundle,
          reviewId: "equal-time-changes",
          role: "native-linguistic",
          decision: "changes-requested",
          reviewerId: "native-reviewer",
          reviewedAt: "2026-07-28T03:00:00.000Z",
        }),
      ],
    },
  ])("fails closed for $name", async ({ configure }) => {
    const bundle = await rebindGovernedTarget();
    bundle.reviews.reviews = configure(bundle);
    const validation = await validateContentBundle(bundle);
    expect(validation.errors.length).toBeGreaterThan(0);

    const readiness = assessEditorialReadiness(bundle, validation);
    expect(readiness.valid).toBe(false);
    expect(readiness.summary.itemsApproved).toBe(0);
    const item = itemProjection(readiness);
    expect(item.status).toBe("invalid");
    expect(item.reviewRequirements.every(
      ({ status }: { status: string }) =>
        status === "blocked-invalid-package",
    )).toBe(true);
  });

  it("accounts for malformed catalog and audio records instead of hiding them", async () => {
    const bundle = loadCandidate();
    if (!bundle.itemCatalog) {
      throw new Error("The malformed editorial fixture requires a catalog.");
    }
    (bundle.itemCatalog.items as unknown[]).push(null, {});
    (bundle.itemCatalog.audioAssets as unknown[]).push(null, {});
    const validation = await validateContentBundle(bundle);
    expect(validation.errors.length).toBeGreaterThan(0);

    const readiness = assessEditorialReadiness(bundle, validation);
    expect(readiness.valid).toBe(false);
    expect(readiness.summary).toMatchObject({
      totalItems: 76,
      projectedItems: 74,
      invalidCatalogItems: 2,
      audioAssets: 2,
      projectedAudioAssets: 0,
      invalidAudioAssets: 2,
      itemsApproved: 0,
    });
  });
});
