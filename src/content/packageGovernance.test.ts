import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CONTENT_VERSION, COURSE_UNITS, LESSONS, STORIES, VOCABULARY } from "../data/curriculum";
import {
  canonicalJson,
  contentSourceArtifactNames,
  sha256NormalizedText,
  sha256Json,
  validateContentBundle,
} from "./packageLoader";
import { projectRuntimeCatalog } from "./runtimeCatalogProjection";
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
  ItemCatalogArtifact,
  RuntimeCatalogArtifact,
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
  const itemCatalogPath = `${packagePath}/item-catalog.json`;
  const itemCatalog = existsSync(
    new URL(`../../${itemCatalogPath}`, import.meta.url),
  )
    ? readJson<ItemCatalogArtifact>(itemCatalogPath)
    : null;
  const runtimeCatalogPath = `${packagePath}/runtime-catalog.json`;
  const runtimeCatalog = existsSync(
    new URL(`../../${runtimeCatalogPath}`, import.meta.url),
  )
    ? readJson<RuntimeCatalogArtifact>(runtimeCatalogPath)
    : null;
  return {
    registry,
    registryEntry,
    manifest,
    runtimeIds: readJson<RuntimeIdArtifact>(`${packagePath}/runtime-ids.json`),
    itemCatalog,
    runtimeCatalog,
    coverageClaims: readJson<CoverageClaimsArtifact>(`${packagePath}/coverage-claims.json`),
    reviews: readJson<ContentReviewArtifact>(`${packagePath}/reviews.json`),
    audioAssetFileHashes: {},
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
    runtimeKnowledgeItemBlueprintsSourceText: readFileSync(
      new URL("../data/knowledgeItemBlueprints.ts", import.meta.url),
      "utf8",
    ),
    runtimeLessonGuidesSourceText: readFileSync(
      new URL("../data/lessonGuides.ts", import.meta.url),
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

const bindRuntimeToImmutableSchemaV3Sources = (
  bundle: ContentPackageBundle,
) => {
  const source = (name: keyof ContentPackageBundle["immutableSourceTexts"]) => {
    const value = bundle.immutableSourceTexts[name];
    if (typeof value !== "string") {
      throw new Error(`Fixture source snapshot is missing: ${name}`);
    }
    return value;
  };
  bundle.registry.currentContentVersion = bundle.manifest.contentVersion;
  bundle.registryEntry = currentRegistryEntry(bundle.registry);
  bundle.runtimeContentVersion = bundle.manifest.contentVersion;
  bundle.runtimeAssessmentSourceText = source("src/data/assessment.ts");
  bundle.runtimeSourceText = source("src/data/curriculum.ts");
  bundle.runtimeExerciseGenerationSourceText = source(
    "src/lib/exerciseGeneration.ts",
  );
  bundle.runtimeAttemptScoringSourceText = source(
    "src/server/attemptScoring.ts",
  );
  bundle.runtimeAuthoritativeItemBankSourceText = source(
    "src/server/authoritativeItemBank.ts",
  );
  bundle.runtimeLessonCompletionPolicySourceText = source(
    "src/server/lessonCompletionPolicy.ts",
  );
  bundle.runtimeAuthoritativeAssessmentItemBankSourceText = source(
    "src/server/authoritativeAssessmentItemBank.ts",
  );
  bundle.runtimeAssessmentScoringSourceText = source(
    "src/server/assessmentScoring.ts",
  );
};

const makeEligibleFixture = async (
  audience: "closed-alpha" | "public" = "public",
): Promise<ContentPackageBundle> => {
  const bundle = structuredClone(
    loadCheckedInBundle("foundation-2026.07.4"),
  );
  bindRuntimeToImmutableSchemaV3Sources(bundle);
  if (bundle.itemCatalog === null) {
    throw new Error("Fixture requires a schema-v3 item catalog");
  }
  bundle.manifest.audience = audience;
  bundle.manifest.governance.contentOwner = {
    id: "owner-fixture",
    evidenceRef: "fixture://owner-assignment",
  };
  bundle.manifest.governance.sourceLicense = {
    licenseId: "LicenseRef-Fixture",
    evidenceRef: "fixture://license-evidence",
  };
  const owner = {
    id: "owner-fixture",
    evidenceRef: "fixture://item-owner",
  };
  const sourceLicense = {
    licenseId: "LicenseRef-Fixture",
    evidenceRef: "fixture://item-license",
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
  const releasedLessonItem = bundle.itemCatalog.items.find(
    (item) => item.itemKey === `lesson:${releasedLesson.id}`,
  );
  if (!releasedLessonItem || releasedLessonItem.itemType !== "lesson") {
    throw new Error("Fixture released lesson catalog item is missing");
  }
  releasedLessonItem.payload.wordIds = [...releasedLesson.wordIds];
  releasedLessonItem.payloadSha256 = await sha256Json({
    itemType: releasedLessonItem.itemType,
    payload: releasedLessonItem.payload,
  });
  const templateLexeme = bundle.itemCatalog.items.find(
    (item) => item.itemType === "lexeme",
  );
  if (!templateLexeme || templateLexeme.itemType !== "lexeme") {
    throw new Error("Fixture lexeme template is missing");
  }
  for (const [index, itemId] of additionalVocabularyIds.entries()) {
    const payload = {
      ...structuredClone(templateLexeme.payload),
      simplified: `测试${index + 1}`,
      traditional: `測試${index + 1}`,
      pinyin: "cèshì",
      pinyinNumbered: "ce4shi4",
      meaning: `fixture ${index + 1}`,
      example: `测试${index + 1}。`,
      examplePinyin: `Cèshì ${index + 1}.`,
      exampleMeaning: `Fixture ${index + 1}.`,
      tags: ["fixture"],
    };
    bundle.itemCatalog.items.push({
      itemKey: `lexeme:${itemId}`,
      itemType: "lexeme",
      itemId,
      itemVersion: bundle.manifest.contentVersion,
      releaseState: "beta",
      payload,
      payloadSha256: await sha256Json({
        itemType: "lexeme",
        payload,
      }),
      owner,
      sourceLicense,
      prerequisites: [],
    });
  }
  if (audience === "public") {
    for (let index = 1; index < 40; index += 1) {
      const itemId = `graded-story-fixture-${index}`;
      const payload = {
        level: "fixture",
        title: `Fixture ${index}`,
        chineseTitle: `测试故事${index}`,
        summary: `Synthetic test story ${index}.`,
        estimatedMinutes: 1,
        sentences: [{
          chinese: "你好。",
          pinyin: "Nǐ hǎo.",
          translation: "Xin chào.",
          wordIds: ["ni", "hao"],
        }],
        comprehension: [{
          id: `${itemId}-question`,
          prompt: "Câu chuyện nói gì?",
          options: ["Xin chào.", "Tạm biệt."],
          correctAnswer: "Xin chào.",
          explanation: "你好 là lời chào.",
        }],
      };
      bundle.runtimeIds.stories.push({
        id: itemId,
        wordIds: ["ni", "hao"],
        releaseState: "published",
      });
      bundle.itemCatalog.items.push({
        itemKey: `graded-text:${itemId}`,
        itemType: "graded-text",
        itemId,
        itemVersion: bundle.manifest.contentVersion,
        releaseState: "published",
        payload,
        payloadSha256: await sha256Json({
          itemType: "graded-text",
          payload,
        }),
        owner,
        sourceLicense,
        prerequisites: [],
      });
    }
  }

  const activeWordIds = new Set([
    ...bundle.runtimeIds.lessons
      .filter((lesson) => lesson.releaseState === "beta" || lesson.releaseState === "published")
      .flatMap((lesson) => lesson.wordIds),
    ...bundle.runtimeIds.stories
      .filter((story) => story.releaseState === "beta" || story.releaseState === "published")
      .flatMap((story) => story.wordIds),
  ]);
  bundle.itemCatalog.items.forEach((item) => {
    const isReleaseRelevant =
      item.releaseState === "beta"
      || item.releaseState === "published"
      || (item.itemType === "lexeme" && activeWordIds.has(item.itemId));
    if (!isReleaseRelevant) return;
    if (item.itemType === "lexeme") item.releaseState = "beta";
    item.owner = owner;
    item.sourceLicense = sourceLicense;
    item.prerequisites ??= [];
  });

  if (audience === "public") {
    const fileHashes: ContentPackageBundle["audioAssetFileHashes"] = {};
    for (const item of bundle.itemCatalog.items.filter(
      (candidate) =>
        candidate.releaseState === "beta" || candidate.releaseState === "published",
    )) {
      const assetId = `audio-${item.itemType}-${item.itemId}`;
      const fileRef = `audio/${assetId}.mp3`;
      const fileSha256 = await sha256Json({ fileRef });
      const transcript = `Reviewed transcript for ${item.itemKey}`;
      bundle.itemCatalog.audioAssets.push({
        assetId,
        targetItemKey: item.itemKey,
        targetPayloadSha256: item.payloadSha256,
        fileRef,
        fileSha256,
        transcript,
        transcriptSha256: await sha256NormalizedText(transcript),
        speaker: {
          id: "native-speaker-fixture",
          nativeSpeakerEvidenceRef: "fixture://native-speaker",
        },
        rights: {
          ownerId: "audio-owner-fixture",
          licenseId: "AudioLicenseRef-Fixture",
          evidenceRef: "fixture://audio-rights",
        },
      });
      fileHashes[fileRef] = fileSha256;
    }
    bundle.audioAssetFileHashes = fileHashes;
    bundle.manifest.governance.includesAudio = true;
    bundle.manifest.governance.audioRights = {
      ownerId: "audio-owner-fixture",
      licenseId: "AudioLicenseRef-Fixture",
      evidenceRef: "fixture://audio-rights",
    };
  }

  const itemCatalogHash = await sha256Json(bundle.itemCatalog);
  const releasedItemKeys = bundle.itemCatalog.items
    .filter((item) => item.releaseState === "beta" || item.releaseState === "published")
    .map((item) => item.itemKey);
  const pathClaimThrough = (terminalLessonId: string) => {
    const includedLessonIds = new Set<string>();
    const includeLesson = (lessonId: string) => {
      if (includedLessonIds.has(lessonId)) return;
      const lesson = bundle.runtimeIds.lessons.find(
        (candidate) => candidate.id === lessonId,
      );
      if (!lesson) throw new Error(`Fixture lesson is missing: ${lessonId}`);
      lesson.prerequisiteIds.forEach(includeLesson);
      includedLessonIds.add(lessonId);
    };
    includeLesson(terminalLessonId);
    const lexemeKeys = new Set(
      bundle.runtimeIds.lessons
        .filter((lesson) => includedLessonIds.has(lesson.id))
        .flatMap((lesson) => lesson.wordIds)
        .map((wordId) => `lexeme:${wordId}` as const),
    );
    return {
      itemKeys: bundle.itemCatalog!.items
        .map((item) => item.itemKey)
        .filter(
          (itemKey) =>
            lexemeKeys.has(itemKey as `lexeme:${string}`)
            || (
              itemKey.startsWith("lesson:")
              && includedLessonIds.has(itemKey.slice("lesson:".length))
            ),
        ),
      entryLessonKeys: ["lesson:boot-1"],
      terminalLessonKeys: [`lesson:${terminalLessonId}`],
    };
  };
  const a0PathClaim = pathClaimThrough("boot-4");
  const hskOnePathClaim = pathClaimThrough("daily-4");
  const hskTwoPathClaim = pathClaimThrough("characters-2");
  bundle.coverageClaims = {
    schemaVersion: 2,
    contentVersion: bundle.manifest.contentVersion,
    itemCatalogSha256: itemCatalogHash,
    coverageClaims: audience === "closed-alpha"
      ? [{
          claimId: "a0-fixture",
          framework: "CEFR",
          level: "A0",
          evidenceRef: "fixture://a0-coverage",
          ...a0PathClaim,
        }]
      : [
          {
            claimId: "a0-fixture",
            framework: "CEFR",
            level: "A0",
            evidenceRef: "fixture://a0-coverage",
            ...a0PathClaim,
          },
          {
            claimId: "hsk-1-fixture",
            framework: "HSK",
            level: "1",
            evidenceRef: "fixture://hsk-1-coverage",
            ...hskOnePathClaim,
          },
          {
            claimId: "hsk-2-fixture",
            framework: "HSK",
            level: "2",
            evidenceRef: "fixture://hsk-2-coverage",
            ...hskTwoPathClaim,
          },
        ],
  };
  bundle.manifest.artifacts["runtime-ids.json"] = await sha256Json(bundle.runtimeIds);
  bundle.manifest.artifacts["item-catalog.json"] = itemCatalogHash;
  bundle.manifest.artifacts["coverage-claims.json"] = await sha256Json(
    bundle.coverageClaims,
  );
  const manifestHash = await sha256Json(bundle.manifest);
  bundle.registryEntry.audience = audience;
  bundle.registryEntry.manifestSha256 = manifestHash;
  const itemScope = {
    itemCatalogSha256: itemCatalogHash,
    itemKeys: releasedItemKeys,
    audioAssetIds: bundle.itemCatalog.audioAssets.map((asset) => asset.assetId),
  };
  bundle.reviews = {
    schemaVersion: 2,
    contentVersion: bundle.manifest.contentVersion,
    packageManifestSha256: manifestHash,
    itemCatalogSha256: itemCatalogHash,
    reviews: [
      {
        reviewId: "owner-review-fixture",
        role: "content-owner",
        decision: "approved",
        reviewerId: "owner-fixture",
        reviewedAt: "2026-07-22T01:00:00.000Z",
        evidenceRef: "fixture://owner-review",
        packageManifestSha256: manifestHash,
        scope: structuredClone(itemScope),
      },
      {
        reviewId: "linguistic-review-fixture",
        role: "native-linguistic",
        decision: "approved",
        reviewerId: "independent-native-reviewer-fixture",
        reviewedAt: "2026-07-22T01:01:00.000Z",
        evidenceRef: "fixture://linguistic-review",
        packageManifestSha256: manifestHash,
        scope: structuredClone(itemScope),
      },
      {
        reviewId: "license-review-fixture",
        role: "source-license",
        decision: "approved",
        reviewerId: "license-reviewer-fixture",
        reviewedAt: "2026-07-22T01:02:00.000Z",
        evidenceRef: "fixture://license-review",
        packageManifestSha256: manifestHash,
        scope: structuredClone(itemScope),
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
            scope: structuredClone(itemScope),
          }]
        : []),
    ],
  };
  return bundle;
};

const rebindMutableFixture = async (bundle: ContentPackageBundle) => {
  if (
    bundle.itemCatalog === null
    || bundle.coverageClaims.schemaVersion !== 2
    || bundle.reviews.schemaVersion !== 2
  ) {
    throw new Error("Fixture rebinding requires schema-v3 artifacts");
  }
  const itemCatalogHash = await sha256Json(bundle.itemCatalog);
  bundle.coverageClaims.itemCatalogSha256 = itemCatalogHash;
  bundle.reviews.itemCatalogSha256 = itemCatalogHash;
  bundle.reviews.reviews.forEach((review) => {
    review.scope.itemCatalogSha256 = itemCatalogHash;
  });
  bundle.manifest.artifacts["runtime-ids.json"] = await sha256Json(
    bundle.runtimeIds,
  );
  bundle.manifest.artifacts["item-catalog.json"] = itemCatalogHash;
  bundle.manifest.artifacts["coverage-claims.json"] = await sha256Json(
    bundle.coverageClaims,
  );
  const manifestHash = await sha256Json(bundle.manifest);
  bundle.registryEntry.manifestSha256 = manifestHash;
  bundle.reviews.packageManifestSha256 = manifestHash;
  bundle.reviews.reviews.forEach((review) => {
    review.packageManifestSha256 = manifestHash;
  });
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
    expect([...bundle.runtimeIds.vocabularyIds].sort()).toEqual(
      VOCABULARY.map((word) => word.id).sort(),
    );
    expect(bundle.runtimeIds.unitIds).toEqual(COURSE_UNITS.map((unit) => unit.id));
    expect(bundle.runtimeCatalog).not.toBeNull();
    expect(projectRuntimeCatalog(bundle.itemCatalog!)).toEqual(
      bundle.runtimeCatalog,
    );
    expect(bundle.runtimeCatalog!.vocabulary.map((item) => item.id)).toEqual(
      VOCABULARY.map((word) => word.id),
    );
    expect(bundle.runtimeCatalog!.lessons).toEqual(LESSONS);
    expect(bundle.runtimeCatalog!.stories).toEqual(STORIES);
    expect(
      bundle.itemCatalog!.items.filter((item) => item.itemType === "lesson"),
    ).toHaveLength(24);
    expect(bundle.runtimeCatalog!.lessons).toHaveLength(14);
  });

  it.each([
    "foundation-2026.07.1",
    "foundation-2026.07.2",
    "foundation-2026.07.3",
    "foundation-2026.07.4",
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

  it("allows schema-v4 runtime source to import only its selected sanitized catalog", async () => {
    const bundle = structuredClone(loadCheckedInBundle());
    const curriculum = bundle.immutableSourceTexts["src/data/curriculum.ts"];
    if (typeof curriculum !== "string") {
      throw new Error("Curriculum source fixture is missing");
    }
    const leakedCurriculum = `${curriculum}\nimport reviewsJson from "../../content/packages/${bundle.manifest.contentVersion}/reviews.json";\nvoid reviewsJson;\n`;
    bundle.immutableSourceTexts["src/data/curriculum.ts"] = leakedCurriculum;
    bundle.runtimeSourceText = leakedCurriculum;
    bundle.manifest.artifacts["src/data/curriculum.ts"] =
      await sha256NormalizedText(leakedCurriculum);
    const manifestHash = await sha256Json(bundle.manifest);
    bundle.registryEntry.manifestSha256 = manifestHash;
    bundle.reviews.packageManifestSha256 = manifestHash;

    const validation = await validateContentBundle(bundle);

    expect(validation.errors).toContain(
      "Schema-v4 runtime source may import only the selected runtime-catalog.json package artifact",
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
      "manifest.contentSchemaVersion must be a supported version (1, 2, 3, or 4)",
    );
  });

  it("rejects malformed non-selected registry entries", async () => {
    const bundle = structuredClone(loadCheckedInBundle());
    bundle.registryEntry = currentRegistryEntry(bundle.registry);
    const invalidIndex = bundle.registry.packages.length;
    bundle.registry.packages.push({} as ContentRegistry["packages"][number]);

    const validation = await validateContentBundle(bundle);

    expect(validation.errors).toContain(
      `registry.packages[${invalidIndex}]: registryEntry.contentVersion is not a safe content version`,
    );
    expect(validation.errors).toContain(
      `registry.packages[${invalidIndex}]: registryEntry.manifestSha256 must be a SHA-256 digest`,
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
        "Released catalog items missing item-level governance or exact scoped review: 64",
      ]),
    );
    expect(closedAlpha.eligible).toBe(false);
    expect(closedAlpha.blockers).toEqual(
      expect.arrayContaining([
        "Closed alpha requires at least 300 released, catalog-backed, native-reviewed lexemes (found 0)",
        "Closed alpha requires an evidence-backed complete A0 coverage claim",
        "Released catalog items missing item-level governance or exact scoped review: 64",
      ]),
    );
    expect(publication.warnings).toContain(
      "No framework, HSK, A0, or goal coverage claim is declared",
    );
  });

  it("rejects a missing or tampered schema-v4 item catalog", async () => {
    const missing = structuredClone(loadCheckedInBundle());
    missing.itemCatalog = null;
    const missingValidation = await validateContentBundle(missing);
    expect(missingValidation.errors).toContain(
      "item-catalog.schemaVersion must be 2",
    );
    expect(missingValidation.errors).toContain(
      "item-catalog.json digest does not match manifest",
    );

    const tampered = structuredClone(loadCheckedInBundle());
    if (tampered.itemCatalog === null) throw new Error("Catalog fixture is missing");
    const lexeme = tampered.itemCatalog.items.find(
      (item) => item.itemType === "lexeme",
    );
    if (!lexeme || lexeme.itemType !== "lexeme") {
      throw new Error("Lexeme fixture is missing");
    }
    lexeme.payload.meaning = "tampered";
    const tamperedValidation = await validateContentBundle(tampered);
    expect(tamperedValidation.errors).toContain(
      "item-catalog.items[0].payloadSha256 does not match its canonical payload",
    );
    expect(tamperedValidation.errors).toContain(
      "item-catalog.json digest does not match manifest",
    );
  });

  it("keeps item-catalog schema versions paired with content schema versions", async () => {
    const schemaV4 = structuredClone(loadCheckedInBundle());
    if (schemaV4.itemCatalog === null) throw new Error("Catalog fixture is missing");
    schemaV4.itemCatalog.schemaVersion = 1 as never;
    const schemaV4Validation = await validateContentBundle(schemaV4);
    expect(schemaV4Validation.errors).toContain(
      "item-catalog.schemaVersion must be 2",
    );

    const schemaV3 = structuredClone(
      loadCheckedInBundle("foundation-2026.07.4"),
    );
    if (schemaV3.itemCatalog === null) throw new Error("Catalog fixture is missing");
    schemaV3.itemCatalog.schemaVersion = 2 as never;
    const schemaV3Validation = await validateContentBundle(schemaV3);
    expect(schemaV3Validation.errors).toContain(
      "item-catalog.schemaVersion must be 1",
    );
  });

  it("rejects unknown payload fields, cosmetic item versions, and malformed prerequisites without crashing", async () => {
    const bundle = structuredClone(loadCheckedInBundle());
    if (bundle.itemCatalog === null) throw new Error("Catalog fixture is missing");
    const lexeme = bundle.itemCatalog.items.find(
      (item) => item.itemType === "lexeme",
    );
    const lesson = bundle.itemCatalog.items.find(
      (item) => item.itemType === "lesson",
    );
    if (!lexeme || lexeme.itemType !== "lexeme" || !lesson) {
      throw new Error("Catalog item fixture is missing");
    }
    (lexeme.payload as unknown as Record<string, unknown>).id = "override";
    lexeme.itemVersion = "cosmetic-version";
    lesson.prerequisites = [null] as unknown as typeof lesson.prerequisites;

    const validation = await validateContentBundle(bundle);

    expect(validation.errors).toContain(
      "item-catalog.items[0].payload has unknown field id",
    );
    expect(validation.errors).toContain(
      "item-catalog.items[0].itemVersion must match item-catalog.contentVersion",
    );
    expect(validation.errors).toContain(
      "item-catalog.items[24].prerequisites[0].itemType is invalid",
    );
  });

  it("validates schema-v4 knowledge payloads and lesson membership fail-closed", async () => {
    const bundle = structuredClone(loadCheckedInBundle());
    if (bundle.itemCatalog?.schemaVersion !== 2) {
      throw new Error("Schema-v4 catalog fixture is missing");
    }
    const grammarIndex = bundle.itemCatalog.items.findIndex(
      (item) => item.itemType === "grammar",
    );
    const characterIndex = bundle.itemCatalog.items.findIndex(
      (item) => item.itemType === "character",
    );
    const lessonIndex = bundle.itemCatalog.items.findIndex(
      (item) => item.itemKey === "lesson:boot-1",
    );
    const grammar = bundle.itemCatalog.items[grammarIndex];
    const character = bundle.itemCatalog.items[characterIndex];
    const lesson = bundle.itemCatalog.items[lessonIndex];
    if (
      !grammar
      || grammar.itemType !== "grammar"
      || !character
      || character.itemType !== "character"
      || !lesson
      || lesson.itemType !== "lesson"
    ) {
      throw new Error("Knowledge item fixtures are missing");
    }
    (grammar.payload as unknown as Record<string, unknown>).editorialNotes =
      "must stay out of the schema";
    grammar.payload.examples[0].meaning = "";
    grammar.payload.sourceLessonIds = ["missing-lesson"];
    character.payload.strokeDataRef = "private://stroke-data";
    character.payload.strokeDataSha256 = null;
    lesson.knowledgeItems = [
      ...lesson.knowledgeItems.filter(
        (reference) => reference.itemType !== "lexeme" || reference.itemId !== "ni",
      ),
      { itemType: "lesson", itemId: "boot-2" } as never,
    ];

    const validation = await validateContentBundle(bundle);

    expect(validation.errors).toContain(
      `item-catalog.items[${grammarIndex}].payload has unknown field editorialNotes`,
    );
    expect(validation.errors).toContain(
      `item-catalog.items[${grammarIndex}].payload.examples[0].meaning is required`,
    );
    expect(validation.errors).toContain(
      `item-catalog.items[${grammarIndex}].payload source lesson id[0] references unknown item lesson:missing-lesson`,
    );
    expect(validation.errors).toContain(
      `${grammar.itemKey}: payload.sourceLessonIds must exactly match lesson knowledgeItems membership`,
    );
    expect(validation.errors).toContain(
      `item-catalog.items[${characterIndex}].payload strokeDataRef and strokeDataSha256 must be supplied together`,
    );
    expect(validation.errors).toContain(
      `item-catalog.items[${lessonIndex}].knowledgeItems[${lesson.knowledgeItems.length - 1}].itemType is invalid`,
    );
    expect(validation.errors).toContain(
      "lesson:boot-1: lexeme knowledgeItems must match payload.wordIds",
    );
  });

  it("rejects dangling and cyclic cross-type prerequisites", async () => {
    const bundle = structuredClone(loadCheckedInBundle());
    if (bundle.itemCatalog?.schemaVersion !== 2) {
      throw new Error("Schema-v4 catalog fixture is missing");
    }
    const grammar = bundle.itemCatalog.items.find(
      (item) => item.itemType === "grammar",
    );
    const pronunciation = bundle.itemCatalog.items.find(
      (item) => item.itemType === "pronunciation",
    );
    const communicativeIndex = bundle.itemCatalog.items.findIndex(
      (item) => item.itemType === "communicative-function",
    );
    const communicative = bundle.itemCatalog.items[communicativeIndex];
    if (
      !grammar
      || grammar.itemType !== "grammar"
      || !pronunciation
      || pronunciation.itemType !== "pronunciation"
      || !communicative
      || communicative.itemType !== "communicative-function"
    ) {
      throw new Error("Typed prerequisite fixtures are missing");
    }
    grammar.prerequisites = [{
      itemType: "pronunciation",
      itemId: pronunciation.itemId,
    }];
    pronunciation.prerequisites = [{
      itemType: "grammar",
      itemId: grammar.itemId,
    }];
    communicative.prerequisites = [{
      itemType: "character",
      itemId: "missing-character",
    }];

    const validation = await validateContentBundle(bundle);

    expect(validation.errors).toContain(
      `item-catalog.items[${communicativeIndex}].prerequisites[0] references unknown item character:missing-character`,
    );
    expect(validation.errors.some((error) =>
      error.startsWith("Item prerequisite cycle detected at "))).toBe(true);
  });

  it("rejects runtime catalogs carrying governance fields or non-canonical content", async () => {
    const bundle = structuredClone(loadCheckedInBundle());
    if (bundle.runtimeCatalog === null) {
      throw new Error("Runtime catalog fixture is missing");
    }
    (bundle.runtimeCatalog as unknown as Record<string, unknown>).reviews = [{
      reviewerId: "must-not-reach-runtime",
    }];
    bundle.runtimeCatalog.lessons[0].title = "tampered runtime title";

    const validation = await validateContentBundle(bundle);

    expect(validation.errors).toContain(
      "runtime-catalog has unknown field reviews",
    );
    expect(validation.errors).toContain(
      "runtime-catalog.json must equal the sanitized released projection",
    );
    expect(validation.errors).toContain(
      "runtime-catalog.json digest does not match manifest",
    );
  });

  it("returns fail-closed errors for malformed scoped claims instead of throwing", async () => {
    const bundle = structuredClone(loadCheckedInBundle());
    if (bundle.coverageClaims.schemaVersion !== 2) {
      throw new Error("Scoped claim fixture is missing");
    }
    bundle.coverageClaims.coverageClaims = [null] as never;

    const validation = await validateContentBundle(bundle);

    expect(validation.errors).toContain("coverageClaims[0] must be an object");
    expect(() =>
      assessClosedAlphaEligibility(bundle, validation)).not.toThrow();
    expect(assessClosedAlphaEligibility(bundle, validation).eligible).toBe(false);
  });

  it("does not count padded runtime IDs as reviewed lexemes", async () => {
    const bundle = structuredClone(loadCheckedInBundle());
    const additionalIds = Array.from(
      { length: 300 },
      (_, index) => `phantom-lexeme-${index + 1}`,
    );
    bundle.runtimeIds.vocabularyIds.push(...additionalIds);
    bundle.runtimeIds.lessons[0].wordIds.push(...additionalIds);
    bundle.manifest.artifacts["runtime-ids.json"] = await sha256Json(
      bundle.runtimeIds,
    );
    const manifestHash = await sha256Json(bundle.manifest);
    bundle.registryEntry.manifestSha256 = manifestHash;
    bundle.reviews.packageManifestSha256 = manifestHash;

    const validation = await validateContentBundle(bundle);
    const assessment = assessClosedAlphaEligibility(bundle, validation);

    expect(validation.errors).toContain(
      "Catalog lexeme inventory must exactly match runtime-ids.json",
    );
    expect(assessment.blockers).toContain(
      "Closed alpha requires at least 300 released, catalog-backed, native-reviewed lexemes (found 0)",
    );
  });

  it("does not treat an audio boolean as licensed native audio", async () => {
    const bundle = structuredClone(loadCheckedInBundle());
    bundle.manifest.governance.includesAudio = true;
    bundle.manifest.governance.audioRights = {
      ownerId: "fixture-owner",
      licenseId: "fixture-license",
      evidenceRef: "fixture://audio-rights",
    };
    const validation = await validateContentBundle(bundle);
    const publication = assessPublicationEligibility(bundle, validation);

    expect(validation.errors).toContain(
      "manifest.governance.includesAudio must equal the presence of catalog audio assets",
    );
    expect(publication.blockers).toContain(
      "Public beta requires licensed native audio for released core content (missing 64 targets)",
    );
  });

  it("does not count empty graded-text envelopes", async () => {
    const bundle = await makeEligibleFixture();
    if (bundle.itemCatalog === null) throw new Error("Catalog fixture is missing");
    for (const item of bundle.itemCatalog.items.filter(
      (candidate) => candidate.itemType === "graded-text",
    )) {
      if (item.itemType !== "graded-text") continue;
      item.payload.sentences = [];
      item.payload.comprehension = [];
      item.payloadSha256 = await sha256Json({
        itemType: item.itemType,
        payload: item.payload,
      });
      const runtimeStory = bundle.runtimeIds.stories.find(
        (story) => story.id === item.itemId,
      );
      if (runtimeStory) runtimeStory.wordIds = [];
      bundle.itemCatalog.audioAssets
        .filter((asset) => asset.targetItemKey === item.itemKey)
        .forEach((asset) => {
          asset.targetPayloadSha256 = item.payloadSha256;
        });
    }
    await rebindMutableFixture(bundle);
    const validation = await validateContentBundle(bundle);
    const publication = assessPublicationEligibility(bundle, validation);

    expect(validation.errors).toEqual([]);
    expect(publication.blockers).toContain(
      "Public beta requires at least 40 non-empty, reviewed graded texts (found 0)",
    );
    expect(publication.blockers).toContain(
      "Released graded texts must contain sentences and comprehension: 40",
    );
  });

  it("blocks one extra released empty text even when 40 valid texts remain", async () => {
    const bundle = await makeEligibleFixture();
    if (
      bundle.itemCatalog === null
      || bundle.reviews.schemaVersion !== 2
    ) {
      throw new Error("Scoped public fixture is missing");
    }
    const itemId = "empty-released-extra";
    const itemKey = `graded-text:${itemId}` as const;
    const payload = {
      level: "fixture",
      title: "Empty released fixture",
      chineseTitle: "空",
      summary: "Intentionally empty regression fixture.",
      estimatedMinutes: 1,
      sentences: [],
      comprehension: [],
    };
    const payloadSha256 = await sha256Json({
      itemType: "graded-text",
      payload,
    });
    bundle.runtimeIds.stories.push({
      id: itemId,
      wordIds: [],
      releaseState: "published",
    });
    bundle.itemCatalog.items.push({
      itemKey,
      itemType: "graded-text",
      itemId,
      itemVersion: bundle.manifest.contentVersion,
      releaseState: "published",
      payload,
      payloadSha256,
      owner: {
        id: "owner-fixture",
        evidenceRef: "fixture://item-owner",
      },
      sourceLicense: {
        licenseId: "LicenseRef-Fixture",
        evidenceRef: "fixture://item-license",
      },
      prerequisites: [],
    });
    const assetId = "audio-empty-released-extra";
    const fileRef = `audio/${assetId}.mp3`;
    const fileSha256 = await sha256Json({ fileRef });
    const transcript = "Reviewed empty-text fixture transcript";
    bundle.itemCatalog.audioAssets.push({
      assetId,
      targetItemKey: itemKey,
      targetPayloadSha256: payloadSha256,
      fileRef,
      fileSha256,
      transcript,
      transcriptSha256: await sha256NormalizedText(transcript),
      speaker: {
        id: "native-speaker-fixture",
        nativeSpeakerEvidenceRef: "fixture://native-speaker",
      },
      rights: {
        ownerId: "audio-owner-fixture",
        licenseId: "AudioLicenseRef-Fixture",
        evidenceRef: "fixture://audio-rights",
      },
    });
    bundle.audioAssetFileHashes[fileRef] = fileSha256;
    bundle.reviews.reviews.forEach((review) => {
      if (review.role !== "audio-rights") review.scope.itemKeys.push(itemKey);
      review.scope.audioAssetIds.push(assetId);
    });
    await rebindMutableFixture(bundle);

    const validation = await validateContentBundle(bundle);
    const publication = assessPublicationEligibility(bundle, validation);

    expect(validation.errors).toEqual([]);
    expect(publication.blockers).toContain(
      "Released graded texts must contain sentences and comprehension: 1",
    );
    expect(publication.blockers).not.toContain(
      "Public beta requires at least 40 non-empty, reviewed graded texts (found 40)",
    );
    expect(publication.eligible).toBe(false);
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

  it("counts distinct lexeme payloads instead of duplicated IDs", async () => {
    const bundle = await makeEligibleFixture("closed-alpha");
    if (bundle.itemCatalog === null) throw new Error("Catalog fixture is missing");
    const lexemes = bundle.itemCatalog.items.filter(
      (item) => item.itemType === "lexeme",
    );
    const first = lexemes[0];
    if (!first || first.itemType !== "lexeme") {
      throw new Error("Lexeme fixture is missing");
    }
    for (const item of lexemes) {
      if (item.itemType !== "lexeme") continue;
      item.payload = structuredClone(first.payload);
      item.payloadSha256 = await sha256Json({
        itemType: item.itemType,
        payload: item.payload,
      });
    }
    await rebindMutableFixture(bundle);

    const validation = await validateContentBundle(bundle);
    const closedAlpha = assessClosedAlphaEligibility(bundle, validation);

    expect(validation.errors).toEqual([]);
    expect(closedAlpha.eligible).toBe(false);
    expect(closedAlpha.blockers).toContain(
      "Closed alpha requires at least 300 released, catalog-backed, native-reviewed lexemes (found 1)",
    );
  });

  it("rejects trivial, lexeme-omitting, and relabeled coverage paths", async () => {
    const closedAlphaBundle = await makeEligibleFixture("closed-alpha");
    if (closedAlphaBundle.coverageClaims.schemaVersion !== 2) {
      throw new Error("Scoped claim fixture is missing");
    }
    const a0Claim = closedAlphaBundle.coverageClaims.coverageClaims[0];
    a0Claim.itemKeys = ["lesson:boot-1"];
    a0Claim.entryLessonKeys = ["lesson:boot-1"];
    a0Claim.terminalLessonKeys = ["lesson:boot-1"];
    await rebindMutableFixture(closedAlphaBundle);
    const trivialValidation = await validateContentBundle(closedAlphaBundle);
    const trivialAssessment = assessClosedAlphaEligibility(
      closedAlphaBundle,
      trivialValidation,
    );
    expect(trivialAssessment.blockers).toContain(
      "Every declared coverage claim must bind a complete reachable reviewed item graph",
    );
    expect(trivialAssessment.blockers).toContain(
      "Closed alpha requires an evidence-backed complete A0 coverage claim",
    );

    const publicBundle = await makeEligibleFixture();
    if (publicBundle.coverageClaims.schemaVersion !== 2) {
      throw new Error("Scoped public claims are missing");
    }
    const hskOne = publicBundle.coverageClaims.coverageClaims.find(
      (claim) => claim.framework === "HSK" && claim.level === "1",
    );
    const hskTwo = publicBundle.coverageClaims.coverageClaims.find(
      (claim) => claim.framework === "HSK" && claim.level === "2",
    );
    if (!hskOne || !hskTwo) throw new Error("HSK fixture claims are missing");
    hskTwo.itemKeys = [...hskOne.itemKeys];
    hskTwo.entryLessonKeys = [...hskOne.entryLessonKeys];
    hskTwo.terminalLessonKeys = [...hskOne.terminalLessonKeys];
    await rebindMutableFixture(publicBundle);
    const relabeledValidation = await validateContentBundle(publicBundle);

    expect(relabeledValidation.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Duplicate coverage framework path scope: hsk|"),
      ]),
    );
    expect(relabeledValidation.errors).toContain(
      "HSK 2 coverage scope must be a strict superset of HSK 1",
    );
    expect(relabeledValidation.errors).toContain(
      "HSK 2 lesson path must extend beyond HSK 1",
    );
  });

  it("requires production eligibility to preserve the closed-alpha A0 gate", async () => {
    const bundle = await makeEligibleFixture();
    if (bundle.coverageClaims.schemaVersion !== 2) {
      throw new Error("Scoped public claims are missing");
    }
    bundle.coverageClaims.coverageClaims =
      bundle.coverageClaims.coverageClaims.filter(
        (claim) => !(claim.framework === "CEFR" && claim.level === "A0"),
      );
    await rebindMutableFixture(bundle);

    const validation = await validateContentBundle(bundle);
    const publication = assessPublicationEligibility(bundle, validation);

    expect(validation.errors).toEqual([]);
    expect(publication.eligible).toBe(false);
    expect(publication.blockers).toContain(
      "Closed alpha requires an evidence-backed complete A0 coverage claim",
    );
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

  it("lets a newer exact-hash rejection invalidate the item and its dependent release graph", async () => {
    const bundle = await makeEligibleFixture();
    const manifestHash = await sha256Json(bundle.manifest);
    if (bundle.itemCatalog === null || bundle.reviews.schemaVersion !== 2) {
      throw new Error("Fixture requires scoped schema-v3 reviews");
    }
    const revokedItemKey = bundle.itemCatalog.items.find(
      (item) => item.itemType === "lexeme",
    )?.itemKey;
    if (!revokedItemKey) throw new Error("Fixture lexeme is missing");
    bundle.reviews.reviews.push({
      reviewId: "linguistic-changes-fixture",
      role: "native-linguistic",
      decision: "changes-requested",
      reviewerId: "independent-native-reviewer-fixture",
      reviewedAt: "2026-07-22T02:00:00.000Z",
      evidenceRef: "fixture://linguistic-changes",
      packageManifestSha256: manifestHash,
      scope: {
        itemCatalogSha256: bundle.reviews.itemCatalogSha256,
        itemKeys: [revokedItemKey],
        audioAssetIds: [],
      },
    });
    const validation = await validateContentBundle(bundle);
    const publication = assessPublicationEligibility(bundle, validation);

    expect(validation.errors).toEqual([]);
    expect(publication.eligible).toBe(false);
    expect(publication.blockers).toContain(
      "Released catalog items missing item-level governance or exact scoped review: 55",
    );
    expect(publication.blockers).toContain(
      "Closed alpha requires at least 300 released, catalog-backed, native-reviewed lexemes (found 299)",
    );
  });

  it("rejects non-canonical and future review timestamps", async () => {
    const nonCanonical = await makeEligibleFixture("closed-alpha");
    nonCanonical.reviews.reviews[0].reviewedAt =
      "2026-07-22T08:00:00+07:00";
    const nonCanonicalValidation = await validateContentBundle(nonCanonical);
    expect(nonCanonicalValidation.errors).toContain(
      "reviews[0].reviewedAt is invalid",
    );

    const future = await makeEligibleFixture("closed-alpha");
    future.reviews.reviews[0].reviewedAt = "2999-01-01T00:00:00.000Z";
    const futureValidation = await validateContentBundle(future);
    expect(futureValidation.errors).toContain(
      "reviews[0].reviewedAt cannot be in the future",
    );
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
    expect(publication.blockers).toContain(
      "Released catalog items missing item-level governance or exact scoped review: 354",
    );
  });
});
