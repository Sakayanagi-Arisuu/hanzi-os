import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CONTENT_VERSION, COURSE_UNITS, LESSONS, STORIES, VOCABULARY } from "../data/curriculum";
import {
  canonicalJson,
  contentSourceArtifactNames,
  sha256Json,
  sha256NormalizedText,
  validateContentBundle,
} from "./packageLoader";
import {
  assessClosedAlphaEligibility,
  assessPublicationEligibility,
} from "./publicationPolicy";
import type {
  ContentPackageBundle,
  ContentPackageManifest,
  ContentRegistry,
  ContentReviewArtifact,
  CoverageClaimsArtifact,
  RuntimeIdArtifact,
} from "./types";

const readJson = <T>(relativePath: string): T =>
  JSON.parse(
    readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8"),
  ) as T;

const loadCheckedInBundle = (
  version?: string,
): ContentPackageBundle => {
  const registry = readJson<ContentRegistry>("content/registry.json");
  const registryEntry = registry.packages.find(
    (entry) => entry.contentVersion === (version ?? registry.currentContentVersion),
  );
  if (!registryEntry) throw new Error("Current content registry entry is missing");
  const packagePath = `content/${registryEntry.relativePath}`;
  const manifest = readJson<ContentPackageManifest>(`${packagePath}/manifest.json`);
  return {
    registry,
    registryEntry,
    manifest,
    runtimeIds: readJson<RuntimeIdArtifact>(`${packagePath}/runtime-ids.json`),
    coverageClaims: readJson<CoverageClaimsArtifact>(`${packagePath}/coverage-claims.json`),
    reviews: readJson<ContentReviewArtifact>(`${packagePath}/reviews.json`),
    immutableSourceTexts: Object.fromEntries(
      contentSourceArtifactNames(manifest.contentSchemaVersion).map((name) => [
        name,
        readFileSync(
          new URL(`../../${packagePath}/snapshots/${name}`, import.meta.url),
          "utf8",
        ),
      ]),
    ),
    runtimeContentVersion: CONTENT_VERSION,
    runtimeAssessmentSourceText: readFileSync(
      new URL("../data/assessment.ts", import.meta.url),
      "utf8",
    ),
    runtimeSourceText: readFileSync(
      new URL("../data/curriculum.ts", import.meta.url),
      "utf8",
    ),
    runtimeExerciseGenerationSourceText: readFileSync(
      new URL("../lib/exerciseGeneration.ts", import.meta.url),
      "utf8",
    ),
    runtimeAttemptScoringSourceText: readFileSync(
      new URL("../server/attemptScoring.ts", import.meta.url),
      "utf8",
    ),
    runtimeAuthoritativeItemBankSourceText: readFileSync(
      new URL("../server/authoritativeItemBank.ts", import.meta.url),
      "utf8",
    ),
    runtimeLessonCompletionPolicySourceText: readFileSync(
      new URL("../server/lessonCompletionPolicy.ts", import.meta.url),
      "utf8",
    ),
    runtimeAuthoritativeAssessmentItemBankSourceText: readFileSync(
      new URL("../server/authoritativeAssessmentItemBank.ts", import.meta.url),
      "utf8",
    ),
    runtimeAssessmentScoringSourceText: readFileSync(
      new URL("../server/assessmentScoring.ts", import.meta.url),
      "utf8",
    ),
  };
};

const currentRegistryEntry = (registry: ContentRegistry) => {
  const entry = registry.packages.find(
    (candidate) => candidate.contentVersion === registry.currentContentVersion,
  );
  if (!entry) throw new Error("Current content registry entry is missing");
  return entry;
};

const makeEligibleFixture = async (
  audience: "closed-alpha" | "public" = "public",
): Promise<ContentPackageBundle> => {
  const bundle = structuredClone(loadCheckedInBundle());
  bundle.registryEntry = currentRegistryEntry(bundle.registry);
  bundle.manifest.audience = audience;
  bundle.manifest.governance.contentOwner = {
    id: "owner-fixture",
    evidenceRef: "fixture://owner-assignment",
  };
  bundle.manifest.governance.sourceLicense = {
    licenseId: "LicenseRef-Fixture",
    evidenceRef: "fixture://license-evidence",
  };
  const additionalVocabularyIds = Array.from(
    { length: Math.max(0, 300 - bundle.runtimeIds.vocabularyIds.length) },
    (_, index) => `reviewed-fixture-${index + 1}`,
  );
  bundle.runtimeIds.vocabularyIds = [
    ...bundle.runtimeIds.vocabularyIds,
    ...additionalVocabularyIds,
  ];
  const releasedLesson = bundle.runtimeIds.lessons.find(
    (lesson) => lesson.releaseState === "beta" || lesson.releaseState === "published",
  );
  if (!releasedLesson) throw new Error("Fixture requires a released lesson");
  releasedLesson.wordIds = [...releasedLesson.wordIds, ...additionalVocabularyIds];
  bundle.coverageClaims.coverageClaims = audience === "closed-alpha"
    ? [{
        claimId: "a0-fixture",
        framework: "CEFR",
        level: "A0",
        evidenceRef: "fixture://a0-coverage",
      }]
    : [
        {
          claimId: "hsk-1-fixture",
          framework: "HSK",
          level: "1",
          evidenceRef: "fixture://hsk-1-coverage",
        },
        {
          claimId: "hsk-2-fixture",
          framework: "HSK",
          level: "2",
          evidenceRef: "fixture://hsk-2-coverage",
        },
      ];
  if (audience === "public") {
    bundle.runtimeIds.stories = Array.from({ length: 40 }, (_, index) => ({
      id: `graded-story-fixture-${index + 1}`,
      wordIds: [],
      releaseState: "published" as const,
    }));
    bundle.manifest.governance.includesAudio = true;
    bundle.manifest.governance.audioRights = {
      ownerId: "audio-owner-fixture",
      licenseId: "AudioLicenseRef-Fixture",
      evidenceRef: "fixture://audio-rights",
    };
  }
  bundle.manifest.artifacts["runtime-ids.json"] = await sha256Json(bundle.runtimeIds);
  bundle.manifest.artifacts["coverage-claims.json"] = await sha256Json(
    bundle.coverageClaims,
  );
  const manifestHash = await sha256Json(bundle.manifest);
  bundle.registryEntry.audience = audience;
  bundle.registryEntry.manifestSha256 = manifestHash;
  bundle.reviews = {
    schemaVersion: 1,
    contentVersion: bundle.manifest.contentVersion,
    packageManifestSha256: manifestHash,
    reviews: [
      {
        reviewId: "owner-review-fixture",
        role: "content-owner",
        decision: "approved",
        reviewerId: "owner-fixture",
        reviewedAt: "2026-07-22T01:00:00.000Z",
        evidenceRef: "fixture://owner-review",
        packageManifestSha256: manifestHash,
      },
      {
        reviewId: "linguistic-review-fixture",
        role: "native-linguistic",
        decision: "approved",
        reviewerId: "independent-native-reviewer-fixture",
        reviewedAt: "2026-07-22T01:01:00.000Z",
        evidenceRef: "fixture://linguistic-review",
        packageManifestSha256: manifestHash,
      },
      {
        reviewId: "license-review-fixture",
        role: "source-license",
        decision: "approved",
        reviewerId: "license-reviewer-fixture",
        reviewedAt: "2026-07-22T01:02:00.000Z",
        evidenceRef: "fixture://license-review",
        packageManifestSha256: manifestHash,
      },
      ...(audience === "public"
        ? [{
            reviewId: "audio-review-fixture",
            role: "audio-rights" as const,
            decision: "approved" as const,
            reviewerId: "audio-reviewer-fixture",
            reviewedAt: "2026-07-22T01:03:00.000Z",
            evidenceRef: "fixture://audio-review",
            packageManifestSha256: manifestHash,
          }]
        : []),
    ],
  };
  return bundle;
};

describe("content package governance", () => {
  it("uses deterministic canonical SHA-256 independent of object key insertion order", async () => {
    expect(canonicalJson({ z: 1, a: [3, { b: true, a: null }] })).toBe(
      '{"a":[3,{"a":null,"b":true}],"z":1}',
    );
    await expect(sha256Json({ b: 2, a: 1 })).resolves.toBe(
      await sha256Json({ a: 1, b: 2 }),
    );
  });

  it("binds the immutable package to the exact checked-in runtime IDs and graph", async () => {
    const bundle = loadCheckedInBundle();
    const validation = await validateContentBundle(bundle);

    expect(validation.errors).toEqual([]);
    expect(validation.warnings).toEqual([]);
    expect(validation.hashes.assessmentSource).toBe(
      bundle.manifest.artifacts["src/data/assessment.ts"],
    );
    expect(bundle.runtimeIds.contentVersion).toBe(CONTENT_VERSION);
    expect(bundle.runtimeIds.vocabularyIds).toEqual(VOCABULARY.map((word) => word.id));
    expect(bundle.runtimeIds.unitIds).toEqual(COURSE_UNITS.map((unit) => unit.id));
    expect(bundle.runtimeIds.lessons).toEqual(
      LESSONS.map((lesson) => ({
        id: lesson.id,
        unitId: lesson.unitId,
        prerequisiteIds: lesson.prerequisiteIds,
        wordIds: lesson.wordIds,
        releaseState: lesson.releaseState,
      })),
    );
    expect(bundle.runtimeIds.stories).toEqual(
      STORIES.map((story) => ({
        id: story.id,
        wordIds: [...new Set(story.sentences.flatMap((sentence) => sentence.wordIds))],
        releaseState: story.releaseState,
      })),
    );
  });

  it.each([
    "foundation-2026.07.1",
    "foundation-2026.07.2",
  ])("revalidates historical package %s from its own immutable snapshots", async (version) => {
    const bundle = loadCheckedInBundle(version);
    const validation = await validateContentBundle(bundle);

    expect(bundle.runtimeSourceText).not.toBe(
      bundle.immutableSourceTexts["src/data/curriculum.ts"],
    );
    expect(validation.errors).toEqual([]);
  });

  it("rejects live-source drift for a runtime-bound candidate before it becomes registry current", async () => {
    const bundle = structuredClone(loadCheckedInBundle());
    bundle.registryEntry = currentRegistryEntry(bundle.registry);
    bundle.registry.currentContentVersion = "foundation-2026.07.2";
    if (bundle.runtimeSourceText === null) {
      throw new Error("Checked-in curriculum source is missing");
    }
    bundle.runtimeSourceText += "\n// runtime-bound candidate drift";

    const validation = await validateContentBundle(bundle);

    expect(validation.errors).toContain(
      "src/data/curriculum.ts digest does not match manifest",
    );
  });

  it("rejects a missing or tampered immutable source snapshot", async () => {
    const missing = structuredClone(loadCheckedInBundle());
    missing.registryEntry = currentRegistryEntry(missing.registry);
    delete missing.immutableSourceTexts["src/data/assessment.ts"];

    const missingValidation = await validateContentBundle(missing);
    expect(missingValidation.errors).toContain(
      "Immutable package snapshot for src/data/assessment.ts is unavailable",
    );

    const tampered = structuredClone(loadCheckedInBundle());
    tampered.registryEntry = currentRegistryEntry(tampered.registry);
    const assessmentSnapshot =
      tampered.immutableSourceTexts["src/data/assessment.ts"];
    if (typeof assessmentSnapshot !== "string") {
      throw new Error("Assessment snapshot fixture is missing");
    }
    tampered.immutableSourceTexts["src/data/assessment.ts"] =
      `${assessmentSnapshot}\n// tampered package snapshot`;

    const tamperedValidation = await validateContentBundle(tampered);
    expect(tamperedValidation.errors).toContain(
      "src/data/assessment.ts snapshot digest does not match manifest",
    );
  });

  it("fails closed for unsupported future content schema versions", async () => {
    const bundle = structuredClone(loadCheckedInBundle());
    bundle.registryEntry = currentRegistryEntry(bundle.registry);
    bundle.manifest.contentSchemaVersion = 999;

    const validation = await validateContentBundle(bundle);

    expect(validation.errors).toContain(
      "manifest.contentSchemaVersion must be a supported version (1 or 2)",
    );
  });

  it("rejects malformed non-selected registry entries", async () => {
    const bundle = structuredClone(loadCheckedInBundle());
    bundle.registryEntry = currentRegistryEntry(bundle.registry);
    bundle.registry.packages.push({} as ContentRegistry["packages"][number]);

    const validation = await validateContentBundle(bundle);

    expect(validation.errors).toContain(
      "registry.packages[3]: registryEntry.contentVersion is not a safe content version",
    );
    expect(validation.errors).toContain(
      "registry.packages[3]: registryEntry.manifestSha256 must be a SHA-256 digest",
    );
  });

  it("rejects missing and forward package lineage parents", async () => {
    const missingParent = structuredClone(
      loadCheckedInBundle("foundation-2026.07.2"),
    );
    missingParent.manifest.createdFromManifestSha256 =
      `sha256:${"0".repeat(64)}`;
    const missingValidation = await validateContentBundle(missingParent);
    expect(missingValidation.errors).toContain(
      "Package lineage parent manifest is not registered",
    );

    const forwardParent = structuredClone(
      loadCheckedInBundle("foundation-2026.07.2"),
    );
    forwardParent.manifest.createdFromManifestSha256 =
      forwardParent.registry.packages[2].manifestSha256;
    const forwardValidation = await validateContentBundle(forwardParent);
    expect(forwardValidation.errors).toContain(
      "Package lineage parent must precede the selected package",
    );
  });

  it("rejects an assessment item-bank edit that is not bound by a new manifest", async () => {
    const bundle = structuredClone(loadCheckedInBundle());
    bundle.registryEntry = currentRegistryEntry(bundle.registry);
    if (bundle.runtimeAssessmentSourceText === null) {
      throw new Error("Checked-in assessment source is missing");
    }
    bundle.runtimeAssessmentSourceText += "\n// unversioned assessment mutation";

    const validation = await validateContentBundle(bundle);

    expect(validation.errors).toContain("src/data/assessment.ts digest does not match manifest");
  });

  it.each([
    ["exercise generator", "runtimeExerciseGenerationSourceText", "src/lib/exerciseGeneration.ts"],
    ["objective scoring", "runtimeAttemptScoringSourceText", "src/server/attemptScoring.ts"],
    ["authoritative item bank", "runtimeAuthoritativeItemBankSourceText", "src/server/authoritativeItemBank.ts"],
    ["lesson completion policy", "runtimeLessonCompletionPolicySourceText", "src/server/lessonCompletionPolicy.ts"],
    ["authoritative assessment bank", "runtimeAuthoritativeAssessmentItemBankSourceText", "src/server/authoritativeAssessmentItemBank.ts"],
    ["assessment scoring policy", "runtimeAssessmentScoringSourceText", "src/server/assessmentScoring.ts"],
  ] as const)("rejects an unversioned %s edit", async (_label, field, artifactName) => {
    const bundle = structuredClone(loadCheckedInBundle());
    bundle.registryEntry = currentRegistryEntry(bundle.registry);
    if (
      artifactName === "src/server/authoritativeAssessmentItemBank.ts"
      || artifactName === "src/server/assessmentScoring.ts"
    ) {
      bundle.manifest.contentSchemaVersion = 2;
      bundle.manifest.artifacts[
        "src/server/authoritativeAssessmentItemBank.ts"
      ] = await sha256NormalizedText(
        bundle.runtimeAuthoritativeAssessmentItemBankSourceText!,
      );
      bundle.manifest.artifacts["src/server/assessmentScoring.ts"] =
        await sha256NormalizedText(bundle.runtimeAssessmentScoringSourceText!);
    }
    const source = bundle[field];
    if (source === null) throw new Error(`${artifactName} fixture is missing`);
    bundle[field] = `${source}\n// unversioned policy mutation`;

    const validation = await validateContentBundle(bundle);

    expect(validation.errors).toContain(`${artifactName} digest does not match manifest`);
  });

  it("keeps the current closed-alpha candidate honest and fail-closed", async () => {
    const bundle = loadCheckedInBundle();
    const validation = await validateContentBundle(bundle);
    const closedAlpha = assessClosedAlphaEligibility(bundle, validation);
    const publication = assessPublicationEligibility(bundle, validation);

    expect(bundle.registryEntry.closedAlphaEligible).toBe(false);
    expect(bundle.registryEntry.productionEligible).toBe(false);
    expect(bundle.coverageClaims.coverageClaims).toEqual([]);
    expect(publication.eligible).toBe(false);
    expect(publication.missingMetadata).toEqual(["contentOwner", "sourceLicense"]);
    expect(publication.blockers).toEqual(
      expect.arrayContaining([
        "Package audience is closed-alpha, not public",
        "Missing exact-hash approval: native-linguistic",
      ]),
    );
    expect(closedAlpha.eligible).toBe(false);
    expect(closedAlpha.blockers).toEqual(
      expect.arrayContaining([
        "Closed alpha requires at least 300 exact-hash reviewed lexemes",
        "Closed alpha requires an evidence-backed complete A0 coverage claim",
        "Missing exact-hash approval: native-linguistic",
      ]),
    );
    expect(publication.warnings).toContain(
      "No framework, HSK, A0, or goal coverage claim is declared",
    );
  });

  it("allows closed alpha only after 300 released lexemes, A0 evidence, and exact-hash approvals", async () => {
    const bundle = await makeEligibleFixture("closed-alpha");
    const validation = await validateContentBundle(bundle);
    const closedAlpha = assessClosedAlphaEligibility(bundle, validation);
    const publication = assessPublicationEligibility(bundle, validation);

    expect(validation.errors).toEqual([]);
    expect(closedAlpha.channel).toBe("closed-alpha");
    expect(closedAlpha.eligible).toBe(true);
    expect(closedAlpha.blockers).toEqual([]);
    expect(publication.eligible).toBe(false);
    expect(publication.blockers).toContain("Package audience is closed-alpha, not public");
  });

  it("binds an activated release to both the manifest and exact review envelope", async () => {
    const bundle = await makeEligibleFixture("closed-alpha");
    bundle.registryEntry.lifecycle = "published";
    bundle.registryEntry.closedAlphaEligible = true;
    bundle.registryEntry.productionEligible = false;
    bundle.registryEntry.promotion = {
      channel: "closed-alpha",
      actorId: "release-actor-fixture",
      promotedAt: "2026-07-22T03:00:00.000Z",
      packageManifestSha256: bundle.registryEntry.manifestSha256,
      reviewEnvelopeSha256: await sha256Json(bundle.reviews),
    };

    await expect(validateContentBundle(bundle)).resolves.toMatchObject({ errors: [] });

    bundle.reviews.reviews[0].evidenceRef = "fixture://changed-after-promotion";
    const stalePromotion = await validateContentBundle(bundle);
    expect(stalePromotion.errors).toContain(
      "Promotion provenance does not bind the current review envelope",
    );
  });

  it("never permits production eligibility on a closed-alpha audience", async () => {
    const bundle = await makeEligibleFixture("closed-alpha");
    bundle.registryEntry.lifecycle = "published";
    bundle.registryEntry.closedAlphaEligible = true;
    bundle.registryEntry.productionEligible = true;
    bundle.registryEntry.promotion = {
      channel: "production",
      actorId: "release-actor-fixture",
      promotedAt: "2026-07-22T03:00:00.000Z",
      packageManifestSha256: bundle.registryEntry.manifestSha256,
      reviewEnvelopeSha256: await sha256Json(bundle.reviews),
    };
    const validation = await validateContentBundle(bundle);

    expect(validation.errors).toContain("Only a public package may be productionEligible");
  });

  it("rejects unknown dependencies and prerequisite cycles", async () => {
    const bundle = structuredClone(loadCheckedInBundle());
    bundle.registryEntry = currentRegistryEntry(bundle.registry);
    bundle.runtimeIds.lessons[0].prerequisiteIds = ["professional-4", "missing-lesson"];
    const validation = await validateContentBundle(bundle);

    expect(validation.errors).toContain("boot-1: unknown prerequisite missing-lesson");
    expect(validation.errors).toContain("Prerequisite cycle detected at boot-1");
    expect(validation.errors).toContain("runtime-ids.json digest does not match manifest");
  });

  it("can become policy-eligible only with public metadata and exact-hash approvals", async () => {
    const bundle = await makeEligibleFixture();
    const validation = await validateContentBundle(bundle);
    const publication = assessPublicationEligibility(bundle, validation);

    expect(validation.errors).toEqual([]);
    expect(publication.eligible).toBe(true);
    expect(publication.blockers).toEqual([]);
    expect(publication.channel).toBe("production");
    expect(publication.warnings).toEqual([]);
  });

  it("lets the newest exact-hash changes-requested review override an earlier approval", async () => {
    const bundle = await makeEligibleFixture();
    const manifestHash = await sha256Json(bundle.manifest);
    bundle.reviews.reviews.push({
      reviewId: "linguistic-changes-fixture",
      role: "native-linguistic",
      decision: "changes-requested",
      reviewerId: "independent-native-reviewer-fixture",
      reviewedAt: "2026-07-22T02:00:00.000Z",
      evidenceRef: "fixture://linguistic-changes",
      packageManifestSha256: manifestHash,
    });
    const validation = await validateContentBundle(bundle);
    const publication = assessPublicationEligibility(bundle, validation);

    expect(validation.errors).toEqual([]);
    expect(publication.eligible).toBe(false);
    expect(publication.blockers).toContain("Latest native-linguistic review is not approved");
  });

  it("marks every approval stale after even a metadata-only manifest edit", async () => {
    const bundle = await makeEligibleFixture();
    bundle.manifest.createdAt = "2026-07-22T02:00:00.000Z";
    const validation = await validateContentBundle(bundle);
    const publication = assessPublicationEligibility(bundle, validation);

    expect(validation.errors).toContain(
      "Registry manifest digest does not match immutable manifest bytes",
    );
    expect(validation.warnings).toContain(
      "Review envelope is stale for the current manifest digest",
    );
    expect(publication.eligible).toBe(false);
    expect(publication.staleReviewIds).toEqual([
      "owner-review-fixture",
      "linguistic-review-fixture",
      "license-review-fixture",
      "audio-review-fixture",
    ]);
    expect(publication.blockers).toContain("Missing exact-hash approval: native-linguistic");
  });
});
