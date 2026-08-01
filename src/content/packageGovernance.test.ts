import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CONTENT_VERSION, COURSE_UNITS, LESSONS, STORIES, VOCABULARY } from "../data/curriculum";
import {
  inspectCharacterLinguisticSourceRecord,
  inspectHanziWriterCharacterData,
} from "./characterDataInspection.mjs";
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
import { projectSanitizedRuntimeCatalog } from "./governance.mjs";
import type {
  CharacterCatalogPayloadV2,
  ContentCatalogItem,
  ContentPackageBundle,
  ContentPackageManifest,
  ContentRegistry,
  ContentReviewArtifact,
  ContentValidationResult,
  CoverageClaimsArtifact,
  ItemCatalogArtifact,
  LexemeCatalogItem,
  LessonCatalogItemV2,
  RuntimeCatalogArtifact,
  RuntimeIdArtifact,
  Sha256Digest,
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
  const characterSourceFileHashes: NonNullable<
    ContentPackageBundle["characterSourceFileHashes"]
  > = {};
  const characterLinguisticFileInspections: NonNullable<
    ContentPackageBundle["characterLinguisticFileInspections"]
  > = {};
  const characterStrokeFileInspections: NonNullable<
    ContentPackageBundle["characterStrokeFileInspections"]
  > = {};
  if (manifest.contentSchemaVersion >= 6 && itemCatalog?.schemaVersion === 4) {
    const sourceRefs = new Set<string>();
    const strokeRefs = new Set<string>();
    itemCatalog.items.forEach((item) => {
      if (item.itemType !== "character") return;
      item.payload.analysis.sources.forEach((source) => {
        sourceRefs.add(source.recordRef);
      });
      sourceRefs.add(item.payload.strokeData.fileRef);
      strokeRefs.add(item.payload.strokeData.fileRef);
    });
    [...sourceRefs].sort().forEach((fileRef) => {
      const bytes = readFileSync(
        new URL(`../../${packagePath}/${fileRef}`, import.meta.url),
      );
      characterSourceFileHashes[fileRef] =
        `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
      if (strokeRefs.has(fileRef)) {
        characterStrokeFileInspections[fileRef] =
          inspectHanziWriterCharacterData(bytes);
      } else {
        characterLinguisticFileInspections[fileRef] =
          inspectCharacterLinguisticSourceRecord(bytes);
      }
    });
  }
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
    characterSourceFileHashes,
    characterLinguisticFileInspections,
    characterStrokeFileInspections,
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
  audioSchema: "validated-v5" | "legacy" = "validated-v5",
): Promise<ContentPackageBundle> => {
  const bundle = structuredClone(
    loadCheckedInBundle("foundation-2026.07.4"),
  );
  bindRuntimeToImmutableSchemaV3Sources(bundle);
  if (bundle.itemCatalog === null || bundle.itemCatalog.schemaVersion !== 1) {
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

  if (audience === "public" && audioSchema === "validated-v5") {
    const items = bundle.itemCatalog.items.map((item) =>
      item.itemType === "lesson"
        ? {
            ...item,
            knowledgeItems: item.payload.wordIds.map((itemId) => ({
              itemType: "lexeme" as const,
              itemId,
            })),
          }
        : item);
    const audioTargetText = (item: ContentCatalogItem) => {
      if (item.itemType === "lexeme") return item.payload.simplified;
      if (item.itemType === "lesson") return item.payload.chineseTitle;
      if (item.itemType === "graded-text") {
        const text = item.payload.sentences[0]?.chinese;
        if (typeof text === "string" && text.length > 0) return text;
      }
      throw new Error(`Fixture item has no deterministic audio target: ${item.itemKey}`);
    };
    const media = {
      container: "wav" as const,
      codec: "pcm-s16le" as const,
      sampleRateHz: 16_000,
      channels: 1 as const,
      bitDepth: 16 as const,
      frameCount: 16_000,
      durationMs: 1_000,
      byteLength: 32_044,
    };
    const fileHashes: ContentPackageBundle["audioAssetFileHashes"] = {};
    const fileInspections: NonNullable<
      ContentPackageBundle["audioAssetFileInspections"]
    > = {};
    const audioAssets = await Promise.all(
      items
        .filter((item) =>
          item.releaseState === "beta" || item.releaseState === "published")
        .map(async (item) => {
          const assetId = `audio-${item.itemType}-${item.itemId}`;
          const fileRef = `audio/${assetId}.wav`;
          const fileSha256 = await sha256Json({
            fixture: "canonical-pcm-wav",
            fileRef,
            byteLength: media.byteLength,
          });
          const transcript = audioTargetText(item);
          const transcriptSha256 = await sha256NormalizedText(transcript);
          fileHashes[fileRef] = fileSha256;
          fileInspections[fileRef] = {
            ok: true,
            media: structuredClone(media),
          };
          return {
            assetId,
            targetItemKey: item.itemKey,
            targetPayloadSha256: item.payloadSha256,
            fileRef,
            fileSha256,
            transcript,
            transcriptSha256,
            speaker: {
              id: "native-speaker-fixture",
              nativeSpeakerEvidenceRef: "fixture://native-speaker",
            },
            rights: {
              ownerId: "audio-owner-fixture",
              licenseId: "AudioLicenseRef-Fixture",
              evidenceRef: "fixture://audio-rights",
            },
            media: structuredClone(media),
            alignment: {
              schemaVersion: 1 as const,
              targetTextSha256: transcriptSha256,
              segments: [{ startMs: 0, endMs: 1_000, text: transcript }],
            },
          };
        }),
    );
    bundle.itemCatalog = {
      schemaVersion: 3,
      contentVersion: bundle.itemCatalog.contentVersion,
      items,
      audioAssets,
    };
    bundle.audioAssetFileHashes = fileHashes;
    bundle.audioAssetFileInspections = fileInspections;
    bundle.runtimeCatalog = projectRuntimeCatalog(bundle.itemCatalog);
    bundle.manifest.contentSchemaVersion = 5;
    bundle.manifest.artifacts["runtime-catalog.json"] = await sha256Json(
      bundle.runtimeCatalog,
    );

    const curriculumSource = readFileSync(
      new URL("../data/curriculum.ts", import.meta.url),
      "utf8",
    ).replaceAll(CONTENT_VERSION, bundle.manifest.contentVersion);
    const knowledgeBlueprintsSource = readFileSync(
      new URL("../data/knowledgeItemBlueprints.ts", import.meta.url),
      "utf8",
    );
    const lessonGuidesSource = readFileSync(
      new URL("../data/lessonGuides.ts", import.meta.url),
      "utf8",
    );
    bundle.immutableSourceTexts["src/data/curriculum.ts"] = curriculumSource;
    bundle.immutableSourceTexts["src/data/knowledgeItemBlueprints.ts"] =
      knowledgeBlueprintsSource;
    bundle.immutableSourceTexts["src/data/lessonGuides.ts"] = lessonGuidesSource;
    bundle.runtimeSourceText = curriculumSource;
    bundle.runtimeKnowledgeItemBlueprintsSourceText = knowledgeBlueprintsSource;
    bundle.runtimeLessonGuidesSourceText = lessonGuidesSource;
    bundle.manifest.artifacts["src/data/curriculum.ts"] =
      await sha256NormalizedText(curriculumSource);
    bundle.manifest.artifacts["src/data/knowledgeItemBlueprints.ts"] =
      await sha256NormalizedText(knowledgeBlueprintsSource);
    bundle.manifest.artifacts["src/data/lessonGuides.ts"] =
      await sha256NormalizedText(lessonGuidesSource);
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
  if (bundle.manifest.contentSchemaVersion >= 4) {
    bundle.runtimeCatalog = projectRuntimeCatalog(bundle.itemCatalog);
    bundle.manifest.artifacts["runtime-catalog.json"] = await sha256Json(
      bundle.runtimeCatalog,
    );
  }
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

const makeSchemaV5AudioFixture = async (
  targetKind: "lexeme" | "graded-text-crlf" = "lexeme",
): Promise<ContentPackageBundle> => {
  const bundle = structuredClone(
    loadCheckedInBundle("foundation-2026.07.5"),
  );
  if (bundle.itemCatalog?.schemaVersion !== 2) {
    throw new Error("Schema-v4 catalog fixture is missing");
  }
  const target = bundle.itemCatalog.items.find((item) =>
    targetKind === "lexeme"
      ? item.itemType === "lexeme"
      : item.itemType === "graded-text");
  if (!target) throw new Error("Audio target fixture is missing");
  const transcript = target.itemType === "graded-text"
    ? target.payload.sentences.map((sentence) => sentence.chinese).join("\r\n")
    : target.itemType === "lexeme"
      ? target.payload.simplified
      : "";
  const transcriptSha256 = await sha256NormalizedText(transcript);
  const rights = {
    ownerId: "audio-owner-fixture",
    licenseId: "AudioLicenseRef-Fixture",
    evidenceRef: "fixture://audio-rights",
  };
  const media = {
    container: "wav" as const,
    codec: "pcm-s16le" as const,
    sampleRateHz: 16_000,
    channels: 1 as const,
    bitDepth: 16 as const,
    frameCount: 16_000,
    durationMs: 1_000,
    byteLength: 32_044,
  };
  const assetId = `audio-${target.itemType}-${target.itemId}`;
  const fileRef = `audio/${assetId}.wav`;
  const fileSha256 = await sha256Json({
    fixture: "canonical-pcm-wav",
    fileRef,
    byteLength: media.byteLength,
  });
  bundle.itemCatalog = {
    ...bundle.itemCatalog,
    schemaVersion: 3,
    audioAssets: [{
      assetId,
      targetItemKey: target.itemKey,
      targetPayloadSha256: target.payloadSha256,
      fileRef,
      fileSha256,
      transcript,
      transcriptSha256,
      speaker: {
        id: "native-speaker-fixture",
        nativeSpeakerEvidenceRef: "fixture://native-speaker",
      },
      rights,
      media,
      alignment: {
        schemaVersion: 1,
        targetTextSha256: transcriptSha256,
        segments: [{ startMs: 0, endMs: 1_000, text: transcript }],
      },
    }],
  };
  bundle.audioAssetFileHashes = { [fileRef]: fileSha256 };
  bundle.audioAssetFileInspections = {
    [fileRef]: { ok: true, media: structuredClone(media) },
  };
  bundle.manifest.contentSchemaVersion = 5;
  bundle.manifest.governance.includesAudio = true;
  bundle.manifest.governance.audioRights = structuredClone(rights);
  await rebindMutableFixture(bundle);
  return bundle;
};

const makeSchemaV6CharacterFixture = async (): Promise<ContentPackageBundle> => {
  const bundle = structuredClone(
    loadCheckedInBundle("foundation-2026.07.5"),
  );
  if (bundle.itemCatalog?.schemaVersion !== 2) {
    throw new Error("Schema-v4 catalog fixture is missing");
  }
  const legacyCharacter = bundle.itemCatalog.items.find(
    (item) => item.itemKey === "character:u4e00",
  );
  if (!legacyCharacter || legacyCharacter.itemType !== "character") {
    throw new Error("Independent character fixture is missing");
  }
  const linguisticSourceId = "unicode-unihan";
  const strokeSourceId = "hanzi-writer-data";
  const linguisticRef =
    `character-sources/${legacyCharacter.itemId}/${linguisticSourceId}.json`;
  const strokeRef = `stroke-data/${legacyCharacter.itemId}.json`;
  const linguisticHash = await sha256Json({
    fixture: "reviewed-independent-character-analysis",
    character: legacyCharacter.payload.character,
  });
  const strokeHash = await sha256Json({
    fixture: "inspected-hanzi-writer-record",
    character: legacyCharacter.payload.character,
  });
  const payload = {
    character: legacyCharacter.payload.character,
    traditional: legacyCharacter.payload.traditional,
    pinyin: legacyCharacter.payload.pinyin,
    meaning: legacyCharacter.payload.meaning,
    sourceLexemeIds: [...legacyCharacter.payload.sourceLexemeIds],
    analysis: {
      schemaVersion: 1,
      decompositionKind: "independent",
      radical: {
        glyph: legacyCharacter.payload.character,
        sourceIds: [linguisticSourceId],
      },
      components: [],
      structure: {
        kind: "independent",
        sourceIds: [linguisticSourceId],
      },
      sources: [
        {
          sourceId: linguisticSourceId,
          kind: "linguistic-reference",
          recordKey: legacyCharacter.payload.character,
          citationRef: "fixture://unicode-unihan/u4e00",
          licenseId: "Unicode-DFS-2016",
          licenseEvidenceRef: "fixture://unicode-license",
          recordRef: linguisticRef,
          recordSha256: linguisticHash,
        },
        {
          sourceId: strokeSourceId,
          kind: "stroke-dataset",
          recordKey: legacyCharacter.payload.character,
          citationRef: "fixture://hanzi-writer-data/u4e00",
          licenseId: "Arphic-Public-License",
          licenseEvidenceRef: "fixture://arphic-public-license",
          recordRef: strokeRef,
          recordSha256: strokeHash,
        },
      ],
    },
    strokeCount: 1,
    strokeData: {
      format: "hanzi-writer-v1",
      fileRef: strokeRef,
      fileSha256: strokeHash,
      sourceId: strokeSourceId,
    },
  } satisfies CharacterCatalogPayloadV2;
  const characterItem = {
    ...legacyCharacter,
    payload,
    payloadSha256: await sha256Json({ itemType: "character", payload }),
  };
  const items = bundle.itemCatalog.items
    .filter(
      (item) => item.itemType !== "character" || item.itemKey === characterItem.itemKey,
    )
    .map((item) => {
      if (item.itemKey === characterItem.itemKey) return characterItem;
      if (item.itemType !== "lesson") return item;
      return {
        ...item,
        knowledgeItems: item.knowledgeItems.filter(
          (reference) =>
            reference.itemType !== "character"
            || reference.itemId === characterItem.itemId,
        ),
      };
    });
  bundle.itemCatalog = {
    schemaVersion: 4,
    contentVersion: bundle.itemCatalog.contentVersion,
    items: items as Extract<ItemCatalogArtifact, { schemaVersion: 4 }>["items"],
    audioAssets: [],
  };
  bundle.characterSourceFileHashes = {
    [linguisticRef]: linguisticHash,
    [strokeRef]: strokeHash,
  };
  bundle.characterLinguisticFileInspections = {
    [linguisticRef]: {
      ok: true,
      format: "json-object-v1",
      character: legacyCharacter.payload.character,
      byteLength: 128,
    },
  };
  bundle.characterStrokeFileInspections = {
    [strokeRef]: {
      ok: true,
      format: "hanzi-writer-v1",
      strokeCount: 1,
      radicalStrokeIndices: [0],
      byteLength: 256,
    },
  };
  bundle.manifest.contentSchemaVersion = 6;
  bundle.runtimeCatalog = projectRuntimeCatalog(bundle.itemCatalog);
  bundle.manifest.artifacts["runtime-catalog.json"] = await sha256Json(
    bundle.runtimeCatalog,
  );
  await rebindMutableFixture(bundle);
  return bundle;
};

const approveCharacterFixture = async (
  bundle: ContentPackageBundle,
  itemKey = "character:u4e00" as const,
) => {
  if (bundle.itemCatalog === null || bundle.reviews.schemaVersion !== 2) {
    throw new Error("Scoped character review fixture is missing");
  }
  const character = bundle.itemCatalog.items.find(
    (item) => item.itemKey === itemKey,
  );
  if (!character || character.itemType !== "character") {
    throw new Error("Character review target is missing");
  }
  character.releaseState = "beta";
  character.owner = {
    id: "character-owner-fixture",
    evidenceRef: "fixture://character-owner",
  };
  character.sourceLicense = {
    licenseId: "Character-License-Fixture",
    evidenceRef: "fixture://character-source-license",
  };
  character.prerequisites = [];
  const itemCatalogSha256 = await sha256Json(bundle.itemCatalog);
  const packageManifestSha256 = await sha256Json(bundle.manifest);
  bundle.reviews.reviews.push(
    ...[
      ["content-owner", "character-owner-reviewer"],
      ["native-linguistic", "independent-native-character-reviewer"],
      ["source-license", "character-license-reviewer"],
    ].map(([role, reviewerId], index) => ({
      reviewId: `character-${role}-approval-fixture`,
      role: role as "content-owner" | "native-linguistic" | "source-license",
      decision: "approved" as const,
      reviewerId,
      reviewedAt: `2026-07-22T01:0${index}:00.000Z`,
      evidenceRef: `fixture://character-${role}-approval`,
      packageManifestSha256,
      scope: {
        itemCatalogSha256,
        itemKeys: [itemKey],
        audioAssetIds: [],
      },
    })),
  );
  await rebindMutableFixture(bundle);
  return character;
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
    expect([...bundle.runtimeIds.unitIds].sort()).toEqual(
      COURSE_UNITS.map((unit) => unit.id).sort(),
    );
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
    ).toHaveLength(217);
    expect(bundle.runtimeCatalog!.lessons).toHaveLength(217);
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
      "manifest.contentSchemaVersion must be a supported version (1, 2, 3, 4, 5, or 6)",
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
    expect(bundle.coverageClaims.coverageClaims).toEqual([
      expect.objectContaining({
        framework: "CTI HSK 3.0 pinned 2026",
        level: "HSK1",
        evidenceRef: "content/review/hsk1-level-batch-local-study-review.json",
      }),
      expect.objectContaining({
        framework: "CTI HSK 3.0 pinned 2026",
        level: "HSK2",
        evidenceRef: "content/review/hsk2-level-batch-local-study-review.json",
      }),
      expect.objectContaining({
        framework: "CTI HSK 3.0 pinned 2026",
        level: "HSK3",
        evidenceRef: "content/review/hsk3-level-batch-local-study-review.json",
      }),
      expect.objectContaining({
        framework: "CTI HSK 3.0 pinned 2026",
        level: "HSK4",
        evidenceRef: "content/review/hsk4-level-batch-local-study-review.json",
      }),
    ]);
    expect(publication.eligible).toBe(false);
    expect(publication.missingMetadata).toEqual(["contentOwner", "sourceLicense"]);
    expect(publication.blockers).toEqual(
      expect.arrayContaining([
        "Package audience is closed-alpha, not public",
        expect.stringContaining(
          "Released catalog items missing item-level governance or exact scoped review:",
        ),
      ]),
    );
    expect(closedAlpha.eligible).toBe(false);
    expect(closedAlpha.blockers).toEqual(
      expect.arrayContaining([
        "Closed alpha requires at least 300 released, catalog-backed, native-reviewed lexemes (found 0)",
        "Closed alpha requires an evidence-backed complete A0 coverage claim",
        expect.stringContaining(
          "Released catalog items missing item-level governance or exact scoped review:",
        ),
      ]),
    );
    expect(publication.warnings).not.toContain(
      "No framework, HSK, A0, or goal coverage claim is declared",
    );
  });

  it("rejects a missing or tampered schema-v4 item catalog", async () => {
    const missing = structuredClone(
      loadCheckedInBundle("foundation-2026.07.5"),
    );
    missing.itemCatalog = null;
    const missingValidation = await validateContentBundle(missing);
    expect(missingValidation.errors).toContain(
      "item-catalog.schemaVersion must be 2",
    );
    expect(missingValidation.errors).toContain(
      "item-catalog.json digest does not match manifest",
    );

    const tampered = structuredClone(
      loadCheckedInBundle("foundation-2026.07.5"),
    );
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
    const schemaV4 = structuredClone(
      loadCheckedInBundle("foundation-2026.07.5"),
    );
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

    const schemaV5 = await makeSchemaV5AudioFixture();
    if (schemaV5.itemCatalog === null) throw new Error("Catalog fixture is missing");
    schemaV5.itemCatalog.schemaVersion = 2 as never;
    const schemaV5Validation = await validateContentBundle(schemaV5);
    expect(schemaV5Validation.errors).toContain(
      "item-catalog.schemaVersion must be 3",
    );

    const schemaV6 = await makeSchemaV6CharacterFixture();
    if (schemaV6.itemCatalog === null) throw new Error("Catalog fixture is missing");
    schemaV6.itemCatalog.schemaVersion = 3 as never;
    const schemaV6Validation = await validateContentBundle(schemaV6);
    expect(schemaV6Validation.errors).toContain(
      "item-catalog.schemaVersion must be 4",
    );
  });

  it("accepts a sourced independent character with zero components and inspected strokes", async () => {
    const bundle = await makeSchemaV6CharacterFixture();
    const validation = await validateContentBundle(bundle);

    expect(validation.errors).toEqual([]);
    if (bundle.itemCatalog?.schemaVersion !== 4) {
      throw new Error("Schema-v6 character fixture is missing");
    }
    const character = bundle.itemCatalog.items.find(
      (item) => item.itemType === "character",
    );
    expect(character?.itemType === "character" && character.payload.analysis).toMatchObject({
      decompositionKind: "independent",
      components: [],
      structure: { kind: "independent" },
    });
    expect(projectRuntimeCatalog(bundle.itemCatalog)).toEqual(bundle.runtimeCatalog);
    expect(JSON.stringify(bundle.runtimeCatalog)).not.toContain("unicode-unihan");
    expect(JSON.stringify(bundle.runtimeCatalog)).not.toContain("hanzi-writer-data");
  });

  it("enforces the component and structure contract for compound characters", async () => {
    const bundle = await makeSchemaV6CharacterFixture();
    if (bundle.itemCatalog?.schemaVersion !== 4) {
      throw new Error("Schema-v6 character fixture is missing");
    }
    const character = bundle.itemCatalog.items.find(
      (item) => item.itemType === "character",
    );
    if (!character || character.itemType !== "character") {
      throw new Error("Character fixture is missing");
    }
    const linguisticSourceId = character.payload.analysis.sources.find(
      (source) => source.kind === "linguistic-reference",
    )?.sourceId;
    if (!linguisticSourceId) {
      throw new Error("Linguistic source fixture is missing");
    }

    character.payload.analysis.decompositionKind = "compound";
    character.payload.analysis.components = [{
      componentId: "fixture-component",
      glyph: character.payload.character,
      role: "graphic",
      position: "whole",
      sourceIds: [linguisticSourceId],
    }];
    character.payload.analysis.structure.kind = "overlaid";
    character.payloadSha256 = await sha256Json({
      itemType: character.itemType,
      payload: character.payload,
    });
    await rebindMutableFixture(bundle);
    expect((await validateContentBundle(bundle)).errors).toEqual([]);

    character.payload.analysis.components = [];
    character.payload.analysis.structure.kind = "independent";
    character.payloadSha256 = await sha256Json({
      itemType: character.itemType,
      payload: character.payload,
    });
    await rebindMutableFixture(bundle);
    expect((await validateContentBundle(bundle)).errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "compound characters require at least one component",
        ),
        expect.stringContaining(
          "compound characters require non-independent structure",
        ),
      ]),
    );
  });

  it("rejects ungrounded claims, source byte drift, and inspected stroke-count drift", async () => {
    const bundle = await makeSchemaV6CharacterFixture();
    if (bundle.itemCatalog?.schemaVersion !== 4) {
      throw new Error("Schema-v6 character fixture is missing");
    }
    const characterIndex = bundle.itemCatalog.items.findIndex(
      (item) => item.itemType === "character",
    );
    const character = bundle.itemCatalog.items[characterIndex];
    if (!character || character.itemType !== "character") {
      throw new Error("Character fixture is missing");
    }
    const linguisticSource = character.payload.analysis.sources.find(
      (source) => source.kind === "linguistic-reference",
    );
    const strokeSource = character.payload.analysis.sources.find(
      (source) => source.kind === "stroke-dataset",
    );
    if (
      !linguisticSource
      || !strokeSource
      || !bundle.characterSourceFileHashes
      || !bundle.characterLinguisticFileInspections
    ) {
      throw new Error("Character source fixtures are missing");
    }
    character.payload.analysis.radical.sourceIds = [strokeSource.sourceId];
    character.payload.strokeCount = 2;
    linguisticSource.recordKey = "二";
    bundle.characterSourceFileHashes[linguisticSource.recordRef] =
      `sha256:${"f".repeat(64)}`;
    bundle.characterLinguisticFileInspections[linguisticSource.recordRef] = {
      ok: false,
      error: "invalid JSON fixture",
    };
    character.payloadSha256 = await sha256Json({
      itemType: character.itemType,
      payload: character.payload,
    });
    await rebindMutableFixture(bundle);

    const validation = await validateContentBundle(bundle);
    expect(validation.errors).toEqual(expect.arrayContaining([
      `item-catalog.items[${characterIndex}].payload.analysis.radical.sourceIds must include a linguistic-reference source`,
      `item-catalog.items[${characterIndex}].payload.analysis.sources[0].recordKey must match the target character`,
      `item-catalog.items[${characterIndex}].payload.analysis.sources[0].recordSha256 does not match package bytes`,
      `item-catalog.items[${characterIndex}].payload.analysis.sources[0].recordRef linguistic JSON inspection failed`,
      `item-catalog.items[${characterIndex}].payload.strokeCount does not match inspected package bytes`,
    ]));
  });

  it("does not treat plausible strings or drifted source hashes as character release evidence", async () => {
    const legacy = structuredClone(
      loadCheckedInBundle("foundation-2026.07.5"),
    );
    if (legacy.itemCatalog?.schemaVersion !== 2) {
      throw new Error("Legacy character catalog fixture is missing");
    }
    const legacyCharacter = legacy.itemCatalog.items.find(
      (item) => item.itemKey === "character:u4e00",
    );
    if (!legacyCharacter || legacyCharacter.itemType !== "character") {
      throw new Error("Legacy character fixture is missing");
    }
    legacyCharacter.payload.radical = legacyCharacter.payload.character;
    legacyCharacter.payload.strokeCount = 1;
    legacyCharacter.payload.components = [legacyCharacter.payload.character];
    legacyCharacter.payload.structure = "independent";
    legacyCharacter.payload.strokeDataRef = "stroke-data/u4e00.json";
    legacyCharacter.payload.strokeDataSha256 = `sha256:${"a".repeat(64)}`;
    legacyCharacter.payloadSha256 = await sha256Json({
      itemType: legacyCharacter.itemType,
      payload: legacyCharacter.payload,
    });
    await approveCharacterFixture(legacy);
    const legacyValidation = await validateContentBundle(legacy);
    const legacyAssessment = assessClosedAlphaEligibility(legacy, legacyValidation);
    expect(legacyValidation.errors).toEqual([]);
    expect(legacyAssessment.blockers).toContain(
      "Released catalog items missing item-level governance or exact scoped review: 64",
    );

    const sourced = await makeSchemaV6CharacterFixture();
    await approveCharacterFixture(sourced);
    const validValidation = await validateContentBundle(sourced);
    const validAssessment = assessClosedAlphaEligibility(sourced, validValidation);
    expect(validValidation.errors).toEqual([]);
    expect(validAssessment.blockers).toContain(
      "Released catalog items missing item-level governance or exact scoped review: 57",
    );

    if (sourced.itemCatalog?.schemaVersion !== 4) {
      throw new Error("Schema-v6 character fixture is missing");
    }
    const sourcedCharacter = sourced.itemCatalog.items.find(
      (item) => item.itemKey === "character:u4e00",
    );
    if (
      !sourcedCharacter
      || sourcedCharacter.itemType !== "character"
      || !sourced.characterSourceFileHashes
    ) {
      throw new Error("Sourced character fixture is missing");
    }
    const linguisticRef = sourcedCharacter.payload.analysis.sources.find(
      (source) => source.kind === "linguistic-reference",
    )?.recordRef;
    if (!linguisticRef) throw new Error("Linguistic source fixture is missing");
    sourced.characterSourceFileHashes[linguisticRef] = `sha256:${"0".repeat(64)}`;
    const driftValidation = await validateContentBundle(sourced);
    const driftAssessment = assessClosedAlphaEligibility(sourced, driftValidation);
    const sourcedCharacterIndex = sourced.itemCatalog.items.findIndex(
      (item) => item.itemKey === sourcedCharacter.itemKey,
    );
    expect(driftValidation.errors).toContain(
      `item-catalog.items[${sourcedCharacterIndex}].payload.analysis.sources[0].recordSha256 does not match package bytes`,
    );
    expect(driftAssessment.blockers).toContain(
      "Released catalog items missing item-level governance or exact scoped review: 58",
    );
  });

  it("accepts inspected schema-v5 PCM WAV audio without leaking it to runtime", async () => {
    const bundle = await makeSchemaV5AudioFixture();
    const validation = await validateContentBundle(bundle);

    expect(validation.errors).toEqual([]);
    expect(projectRuntimeCatalog(bundle.itemCatalog!)).toEqual(bundle.runtimeCatalog);
    const runtimeJson = JSON.stringify(projectRuntimeCatalog(bundle.itemCatalog!));
    expect(runtimeJson).not.toContain("audio-lexeme");
    expect(runtimeJson).not.toContain("pcm-s16le");
    expect(runtimeJson).not.toContain("native-speaker-fixture");
    expect(runtimeJson).not.toContain("fixture://audio-rights");
  });

  it("normalizes newline spelling only across transcript, alignment, and target text", async () => {
    const bundle = await makeSchemaV5AudioFixture("graded-text-crlf");
    if (bundle.itemCatalog?.schemaVersion !== 3) {
      throw new Error("Schema-v5 audio fixture is missing");
    }
    const asset = bundle.itemCatalog.audioAssets[0];
    asset.alignment.segments[0].text = asset.transcript.replace(/\r\n/g, "\n");
    await rebindMutableFixture(bundle);

    await expect(validateContentBundle(bundle)).resolves.toMatchObject({ errors: [] });
  });

  it("requires a successful byte-derived WAV inspection matching catalog media", async () => {
    const missing = await makeSchemaV5AudioFixture();
    if (missing.itemCatalog?.schemaVersion !== 3) {
      throw new Error("Schema-v5 audio fixture is missing");
    }
    const fileRef = missing.itemCatalog.audioAssets[0].fileRef;
    missing.audioAssetFileInspections = {};
    const missingValidation = await validateContentBundle(missing);
    expect(missingValidation.errors).toContain(
      "item-catalog.audioAssets[0].fileRef requires a successful WAV inspection",
    );

    const failed = await makeSchemaV5AudioFixture();
    failed.audioAssetFileInspections = {
      [fileRef]: { ok: false, error: "truncated RIFF payload" },
    };
    const failedValidation = await validateContentBundle(failed);
    expect(failedValidation.errors).toContain(
      "item-catalog.audioAssets[0].fileRef WAV inspection failed",
    );

    const mismatched = await makeSchemaV5AudioFixture();
    const inspection = mismatched.audioAssetFileInspections?.[fileRef];
    if (!inspection || !inspection.ok) throw new Error("WAV inspection fixture is missing");
    inspection.media.frameCount += 1;
    const mismatchedValidation = await validateContentBundle(mismatched);
    expect(mismatchedValidation.errors).toContain(
      "item-catalog.audioAssets[0].media does not match inspected package bytes",
    );
  });

  it("rejects invalid PCM metadata, duration, alignment, and deterministic target text", async () => {
    const codec = await makeSchemaV5AudioFixture();
    if (codec.itemCatalog?.schemaVersion !== 3) {
      throw new Error("Schema-v5 audio fixture is missing");
    }
    codec.itemCatalog.audioAssets[0].media.codec = "mp3" as never;
    const codecValidation = await validateContentBundle(codec);
    expect(codecValidation.errors).toContain(
      "item-catalog.audioAssets[0].media.codec must be pcm-s16le",
    );

    const duration = await makeSchemaV5AudioFixture();
    if (duration.itemCatalog?.schemaVersion !== 3) {
      throw new Error("Schema-v5 audio fixture is missing");
    }
    duration.itemCatalog.audioAssets[0].media.durationMs = 999;
    const durationValidation = await validateContentBundle(duration);
    expect(durationValidation.errors).toContain(
      "item-catalog.audioAssets[0].media.durationMs must match frameCount and sampleRateHz",
    );

    const alignment = await makeSchemaV5AudioFixture();
    if (alignment.itemCatalog?.schemaVersion !== 3) {
      throw new Error("Schema-v5 audio fixture is missing");
    }
    const alignmentAsset = alignment.itemCatalog.audioAssets[0];
    alignmentAsset.alignment.segments = [
      { startMs: 0, endMs: 800, text: alignmentAsset.transcript },
      { startMs: 700, endMs: 1_000, text: "x" },
    ];
    alignmentAsset.alignment.targetTextSha256 = `sha256:${"0".repeat(64)}`;
    alignmentAsset.transcript = "not a Mandarin target";
    const alignmentValidation = await validateContentBundle(alignment);
    expect(alignmentValidation.errors).toEqual(expect.arrayContaining([
      "item-catalog.audioAssets[0].alignment.targetTextSha256 must match transcript",
      "item-catalog.audioAssets[0].alignment.segments[1] overlaps or precedes the previous segment",
      "item-catalog.audioAssets[0].transcript must equal a deterministic Mandarin target text",
    ]));
  });

  it("binds schema-v5 audio to payload, bytes, package rights, and strict fields", async () => {
    const bundle = await makeSchemaV5AudioFixture();
    if (
      bundle.itemCatalog?.schemaVersion !== 3
      || bundle.manifest.governance.audioRights === null
    ) {
      throw new Error("Schema-v5 audio fixture is missing");
    }
    const asset = bundle.itemCatalog.audioAssets[0];
    asset.targetPayloadSha256 = `sha256:${"1".repeat(64)}`;
    bundle.audioAssetFileHashes[asset.fileRef] = `sha256:${"2".repeat(64)}`;
    asset.media.byteLength = 10;
    asset.rights.ownerId = "different-owner";
    (asset as unknown as Record<string, unknown>).privateNotes = "must reject";
    (asset.media as unknown as Record<string, unknown>).peakAmplitude = 1;
    (asset.alignment.segments[0] as unknown as Record<string, unknown>).confidence = 1;
    (bundle.manifest.governance.audioRights as unknown as Record<string, unknown>)
      .contractName = "must reject";

    const validation = await validateContentBundle(bundle);
    expect(validation.errors).toEqual(expect.arrayContaining([
      "manifest.governance.audioRights has unknown field contractName",
      "item-catalog.audioAssets[0] has unknown field privateNotes",
      "item-catalog.audioAssets[0].targetPayloadSha256 does not match the target item",
      "item-catalog.audioAssets[0].fileSha256 does not match package bytes",
      "item-catalog.audioAssets[0].media has unknown field peakAmplitude",
      "item-catalog.audioAssets[0].media.byteLength is too small for mono PCM WAV frames",
      "item-catalog.audioAssets[0].alignment.segments[0] has unknown field confidence",
      "item-catalog.audioAssets[0].rights must exactly match manifest.governance.audioRights",
    ]));
  });

  it("requires lowercase non-reserved asset IDs and their exact WAV path", async () => {
    const reserved = await makeSchemaV5AudioFixture();
    if (reserved.itemCatalog?.schemaVersion !== 3) {
      throw new Error("Schema-v5 audio fixture is missing");
    }
    reserved.itemCatalog.audioAssets[0].assetId = "con";
    reserved.itemCatalog.audioAssets[0].fileRef = "audio/con.wav";
    const reservedValidation = await validateContentBundle(reserved);
    expect(reservedValidation.errors).toContain(
      "item-catalog.audioAssets[0].assetId must be a lowercase non-reserved safe id",
    );

    const wrongPath = await makeSchemaV5AudioFixture();
    if (wrongPath.itemCatalog?.schemaVersion !== 3) {
      throw new Error("Schema-v5 audio fixture is missing");
    }
    wrongPath.itemCatalog.audioAssets[0].fileRef = "audio/wrong-name.wav";
    const wrongPathValidation = await validateContentBundle(wrongPath);
    expect(wrongPathValidation.errors).toContain(
      "item-catalog.audioAssets[0].fileRef must equal audio/<assetId>.wav",
    );
  });

  it("requires manifest audio rights evidence whenever audio is declared", async () => {
    const bundle = await makeSchemaV5AudioFixture();
    bundle.manifest.governance.audioRights = null;

    const validation = await validateContentBundle(bundle);
    expect(validation.errors).toContain(
      "audioRights must be an object when the package includes audio artifacts",
    );
    expect(validation.errors).toContain(
      "item-catalog.audioAssets[0].rights must exactly match manifest.governance.audioRights",
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
    const lexemeIndex = bundle.itemCatalog.items.findIndex(
      (item) => item.itemKey === lexeme.itemKey,
    );
    const lessonIndex = bundle.itemCatalog.items.findIndex(
      (item) => item.itemKey === lesson.itemKey,
    );
    (lexeme.payload as unknown as Record<string, unknown>).id = "override";
    lexeme.itemVersion = "cosmetic-version";
    lesson.prerequisites = [null] as unknown as typeof lesson.prerequisites;

    const validation = await validateContentBundle(bundle);

    expect(validation.errors).toContain(
      `item-catalog.items[${lexemeIndex}].payload has unknown field id`,
    );
    expect(validation.errors).toContain(
      `item-catalog.items[${lexemeIndex}].itemVersion must match item-catalog.contentVersion`,
    );
    expect(validation.errors).toContain(
      `item-catalog.items[${lessonIndex}].prerequisites[0].itemType is invalid`,
    );
  });

  it("validates schema-v4 knowledge payloads and lesson membership fail-closed", async () => {
    const bundle = structuredClone(
      loadCheckedInBundle("foundation-2026.07.5"),
    );
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
    const bundle = structuredClone(
      loadCheckedInBundle("foundation-2026.07.5"),
    );
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

  it("rejects a knowledge-item frontier that implies an unreachable lesson", async () => {
    const bundle = structuredClone(
      loadCheckedInBundle("foundation-2026.07.5"),
    );
    if (bundle.itemCatalog?.schemaVersion !== 2) {
      throw new Error("Schema-v4 catalog fixture is missing");
    }
    const grammar = bundle.itemCatalog.items.find(
      (item) => item.itemKey === "grammar:shi-nominal-predicate",
    );
    const sourceLesson = bundle.itemCatalog.items.find(
      (item) => item.itemKey === "lesson:survival-1",
    );
    if (
      !grammar
      || grammar.itemType !== "grammar"
      || !sourceLesson
      || sourceLesson.itemType !== "lesson"
    ) {
      throw new Error("Knowledge frontier fixture is missing");
    }
    const unreachableLessonId = "frontier-unreachable";
    const unreachablePayload = {
      ...sourceLesson.payload,
      title: "Unreachable frontier fixture",
      chineseTitle: "不可达前沿",
      objective: "Exercise the indexed non-lesson frontier",
      wordIds: [],
    };
    const unreachablePayloadSha256 = await sha256Json({
      itemType: "lesson",
      payload: unreachablePayload,
    });
    bundle.runtimeIds.lessons.push({
      id: unreachableLessonId,
      unitId: unreachablePayload.unitId,
      releaseState: "draft",
      prerequisiteIds: [],
      wordIds: [],
    });
    bundle.itemCatalog.items.push({
      itemKey: `lesson:${unreachableLessonId}`,
      itemType: "lesson",
      itemId: unreachableLessonId,
      itemVersion: bundle.itemCatalog.contentVersion,
      releaseState: "draft",
      payload: unreachablePayload,
      payloadSha256: unreachablePayloadSha256,
      owner: null,
      sourceLicense: null,
      prerequisites: [],
      knowledgeItems: [],
    });
    grammar.prerequisites = [{
      itemType: "lesson",
      itemId: unreachableLessonId,
    }];

    const validation = await validateContentBundle(bundle);

    expect(validation.errors).toContain(
      `lesson:survival-1: implied lesson prerequisites are absent from runtime-ids.json: ${unreachableLessonId}`,
    );
    expect(validation.errors).toContain(
      `runtime-catalog projection failed: Released lesson survival-1 has implied lesson prerequisites absent from the runtime graph: ${unreachableLessonId}`,
    );
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
    expect(publication.blockers).toEqual(expect.arrayContaining([
      expect.stringContaining(
        "Public beta requires licensed native audio for released core content",
      ),
    ]));
  });

  it("keeps legacy hash-only MP3 assets valid but release-ineligible", async () => {
    const bundle = await makeEligibleFixture("public", "legacy");
    const validation = await validateContentBundle(bundle);
    const publication = assessPublicationEligibility(bundle, validation);

    expect(validation.errors).toEqual([]);
    expect(publication.eligible).toBe(false);
    expect(publication.blockers).toEqual([
      "Public beta requires licensed native audio for released core content (missing 354 targets)",
    ]);
  });

  it("fails closed without throwing on malformed raw audio assets", async () => {
    const bundle = await makeEligibleFixture();
    if (bundle.itemCatalog === null) throw new Error("Catalog fixture is missing");
    bundle.itemCatalog.audioAssets = [null] as never;

    const validation = await validateContentBundle(bundle);
    expect(validation.errors).toContain(
      "item-catalog.audioAssets must contain objects",
    );
    expect(() => assessPublicationEligibility(bundle, validation)).not.toThrow();
    const publication = assessPublicationEligibility(bundle, validation);
    expect(publication.eligible).toBe(false);
    expect(publication.blockers).toContain(
      "Public beta requires licensed native audio for released core content (missing 354 targets)",
    );
  }, 20_000);

  it("does not count empty graded-text envelopes", async () => {
    const bundle = await makeEligibleFixture("public", "legacy");
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
    const bundle = await makeEligibleFixture("public", "legacy");
    if (
      bundle.itemCatalog === null
      || bundle.itemCatalog.schemaVersion !== 1
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

  it("requires exact scoped audio approvals for every schema-v5 asset at closed alpha", async () => {
    const bundle = await makeEligibleFixture();
    if (bundle.reviews.schemaVersion !== 2) {
      throw new Error("Fixture requires scoped schema-v5 reviews");
    }
    bundle.manifest.audience = "closed-alpha";
    bundle.registryEntry.audience = "closed-alpha";
    const linguisticReview = bundle.reviews.reviews.find(
      (review) => review.role === "native-linguistic",
    );
    if (!linguisticReview) throw new Error("Fixture linguistic review is missing");
    linguisticReview.scope.audioAssetIds = [];
    await rebindMutableFixture(bundle);

    const validation = await validateContentBundle(bundle);
    const closedAlpha = assessClosedAlphaEligibility(bundle, validation);

    expect(validation.errors).toEqual([]);
    expect(closedAlpha.eligible).toBe(false);
    expect(closedAlpha.blockers).toContain(
      "Schema-v5 audio requires every declared asset to be release-ready "
        + "with exact scoped native-linguistic and audio-rights approvals "
        + "(unready 354)",
    );
  });

  it("blocks production when an extra audio asset has a newer exact-scope rejection", async () => {
    const bundle = await makeEligibleFixture();
    if (
      bundle.itemCatalog?.schemaVersion !== 3
      || bundle.reviews.schemaVersion !== 2
      || bundle.audioAssetFileInspections === undefined
    ) {
      throw new Error("Fixture requires schema-v5 audio governance");
    }
    const sourceAsset = bundle.itemCatalog.audioAssets[0];
    if (!sourceAsset) throw new Error("Fixture audio asset is missing");
    const extraAsset = structuredClone(sourceAsset);
    extraAsset.assetId = "audio-extra-rejected-duplicate-target";
    extraAsset.fileRef = `audio/${extraAsset.assetId}.wav`;
    extraAsset.fileSha256 = await sha256Json({
      fixture: "extra-canonical-pcm-wav",
      fileRef: extraAsset.fileRef,
      byteLength: extraAsset.media.byteLength,
    });
    bundle.itemCatalog.audioAssets.push(extraAsset);
    bundle.audioAssetFileHashes[extraAsset.fileRef] = extraAsset.fileSha256;
    bundle.audioAssetFileInspections[extraAsset.fileRef] = {
      ok: true,
      media: structuredClone(extraAsset.media),
    };
    bundle.reviews.reviews.forEach((review) => {
      review.scope.audioAssetIds.push(extraAsset.assetId);
    });
    bundle.reviews.reviews.push({
      reviewId: "audio-extra-rights-rejection-fixture",
      role: "audio-rights",
      decision: "changes-requested",
      reviewerId: "audio-reviewer-fixture",
      reviewedAt: "2026-07-22T02:00:00.000Z",
      evidenceRef: "fixture://audio-extra-rights-rejection",
      packageManifestSha256: bundle.reviews.packageManifestSha256,
      scope: {
        itemCatalogSha256: bundle.reviews.itemCatalogSha256,
        itemKeys: [],
        audioAssetIds: [extraAsset.assetId],
      },
    });
    await rebindMutableFixture(bundle);

    const validation = await validateContentBundle(bundle);
    const publication = assessPublicationEligibility(bundle, validation);

    expect(validation.errors).toEqual([]);
    expect(publication.eligible).toBe(false);
    expect(publication.blockers).toContain(
      "Schema-v5 audio requires every declared asset to be release-ready "
        + "with exact scoped native-linguistic and audio-rights approvals "
        + "(unready 1)",
    );
    expect(publication.blockers).not.toContain(
      "Public beta requires licensed native audio for released core content (missing 1 targets)",
    );
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

  it("fails closed before graph traversal above the 200,000-edge reachability bound", () => {
    const catalog = structuredClone(
      loadCheckedInBundle("foundation-2026.07.5").itemCatalog,
    );
    if (catalog?.schemaVersion !== 2) {
      throw new Error("Reachability edge-limit fixture requires catalog schema v2");
    }
    const lessonTemplate = catalog.items.find(
      (item) => item.itemType === "lesson",
    );
    const grammarTemplate = catalog.items.find(
      (item) => item.itemType === "grammar",
    );
    if (
      !lessonTemplate
      || lessonTemplate.itemType !== "lesson"
      || !grammarTemplate
      || grammarTemplate.itemType !== "grammar"
    ) {
      throw new Error("Reachability edge-limit fixture is incomplete");
    }
    const targetReference = {
      itemType: "grammar" as const,
      itemId: "edge-limit-target",
    };
    catalog.items = [
      {
        ...lessonTemplate,
        itemKey: "lesson:edge-limit-root",
        itemId: "edge-limit-root",
        releaseState: "beta",
        payload: {
          ...lessonTemplate.payload,
          wordIds: [],
        },
        prerequisites: [],
        knowledgeItems: [],
      },
      {
        ...grammarTemplate,
        itemKey: "grammar:edge-limit-source",
        itemId: "edge-limit-source",
        releaseState: "draft",
        prerequisites: Array(200_001).fill(targetReference),
      },
      {
        ...grammarTemplate,
        itemKey: "grammar:edge-limit-target",
        itemId: "edge-limit-target",
        releaseState: "draft",
        prerequisites: [],
      },
    ];

    expect(() => projectSanitizedRuntimeCatalog(catalog)).toThrow(
      /^Runtime projection lesson dependency reachability exceeds 200000 edges$/,
    );
  });

  it("fails closed before allocating an index above the 32 MiB reachability bound", () => {
    const catalog = structuredClone(
      loadCheckedInBundle("foundation-2026.07.5").itemCatalog,
    );
    if (catalog?.schemaVersion !== 2) {
      throw new Error("Reachability index-limit fixture requires catalog schema v2");
    }
    const lessonTemplate = catalog.items.find(
      (item) => item.itemType === "lesson",
    );
    if (!lessonTemplate || lessonTemplate.itemType !== "lesson") {
      throw new Error("Reachability index-limit fixture is incomplete");
    }
    const lessonCount = 16_385;
    catalog.items = Array.from(
      { length: lessonCount },
      (_, index): LessonCatalogItemV2 => ({
        ...lessonTemplate,
        itemKey: `lesson:index-limit-${index}`,
        itemId: `index-limit-${index}`,
        releaseState: "beta",
        payload: {
          ...lessonTemplate.payload,
          wordIds: [],
        },
        prerequisites: [],
        knowledgeItems: [],
      }),
    );

    expect(() => projectSanitizedRuntimeCatalog(catalog)).toThrow(
      /^Runtime projection lesson dependency reachability index exceeds 33554432 bytes$/,
    );
  });

  it.each([
    ["acyclic", false],
    ["cyclic", true],
  ] as const)(
    "validates a 10,000-node runtime forward chain without overflowing (%s)",
    async (_variant, cyclic) => {
      const bundle = structuredClone(loadCheckedInBundle());
      const unitId = bundle.runtimeIds.unitIds[0];
      if (!unitId) throw new Error("Runtime stress fixture requires a unit");
      const nodeCount = 10_000;
      bundle.runtimeIds.lessons = Array.from({ length: nodeCount }, (_, index) => ({
        id: `runtime-stress-${index}`,
        unitId,
        releaseState: "draft",
        prerequisiteIds: index === nodeCount - 1
          ? (cyclic ? ["runtime-stress-0"] : [])
          : [`runtime-stress-${index + 1}`],
        wordIds: [],
      }));

      const validation = await validateContentBundle(bundle);

      expect(
        validation.errors.filter((error) =>
          error.startsWith("Prerequisite cycle detected at ")),
      ).toEqual(
        cyclic ? ["Prerequisite cycle detected at runtime-stress-0"] : [],
      );
    },
    20_000,
  );

  it.each([
    ["acyclic", false],
    ["cyclic", true],
  ] as const)(
    "validates a 10,000-node item forward chain without overflowing (%s)",
    async (_variant, cyclic) => {
      const bundle = structuredClone(loadCheckedInBundle());
      if (bundle.itemCatalog === null) {
        throw new Error("Item stress fixture requires a catalog");
      }
      const template = bundle.itemCatalog.items.find(
        (item) => item.itemType === "lexeme",
      );
      if (!template || template.itemType !== "lexeme") {
        throw new Error("Item stress fixture requires a lexeme");
      }
      const nodeCount = 10_000;
      bundle.itemCatalog.items = Array.from(
        { length: nodeCount },
        (_, index): LexemeCatalogItem => ({
          itemKey: `lexeme:item-stress-${index}`,
          itemType: "lexeme",
          itemId: `item-stress-${index}`,
          itemVersion: bundle.itemCatalog!.contentVersion,
          releaseState: "draft",
          payload: template.payload,
          payloadSha256: template.payloadSha256,
          owner: null,
          sourceLicense: null,
          prerequisites: index === nodeCount - 1
            ? (cyclic
                ? [{ itemType: "lexeme", itemId: "item-stress-0" }]
                : [])
            : [{
                itemType: "lexeme",
                itemId: `item-stress-${index + 1}`,
              }],
        }),
      );

      const validation = await validateContentBundle(bundle);

      expect(
        validation.errors.filter((error) =>
          error.startsWith("Item prerequisite cycle detected at ")),
      ).toEqual(
        cyclic
          ? ["Item prerequisite cycle detected at lexeme:item-stress-0"]
          : [],
      );
    },
    20_000,
  );

  it("matches a 10,000-lesson item and runtime forward chain without quadratic closure scans", async () => {
    const bundle = structuredClone(
      loadCheckedInBundle("foundation-2026.07.5"),
    );
    if (bundle.itemCatalog?.schemaVersion !== 2) {
      throw new Error("Matched lesson stress fixture requires catalog schema v2");
    }
    const template = bundle.itemCatalog.items.find(
      (item) => item.itemType === "lesson",
    );
    const grammarTemplate = bundle.itemCatalog.items.find(
      (item) => item.itemType === "grammar",
    );
    const unitId = bundle.runtimeIds.unitIds[0];
    if (
      !template
      || template.itemType !== "lesson"
      || !grammarTemplate
      || grammarTemplate.itemType !== "grammar"
      || !unitId
    ) {
      throw new Error("Matched lesson stress fixture is incomplete");
    }
    const nodeCount = 10_000;
    const knowledgeItemId = "matched-frontier";
    const sourceLessonId = "matched-stress-0";
    const prerequisiteLessonId = "matched-stress-5000";
    const payload = {
      ...template.payload,
      unitId,
      wordIds: [],
    };
    const payloadSha256 = await sha256Json({
      itemType: "lesson",
      payload,
    });
    const grammarPayload = {
      ...grammarTemplate.payload,
      sourceLessonIds: [sourceLessonId],
    };
    const grammarPayloadSha256 = await sha256Json({
      itemType: "grammar",
      payload: grammarPayload,
    });
    bundle.runtimeIds.vocabularyIds = [];
    bundle.runtimeIds.unitIds = [unitId];
    bundle.runtimeIds.stories = [];
    bundle.runtimeIds.lessons = Array.from(
      { length: nodeCount },
      (_, index) => ({
        id: `matched-stress-${index}`,
        unitId,
        releaseState: "beta",
        prerequisiteIds: index === nodeCount - 1
          ? []
          : [`matched-stress-${index + 1}`],
        wordIds: [],
      }),
    );
    const lessonItems = Array.from(
      { length: nodeCount },
      (_, index): LessonCatalogItemV2 => ({
        itemKey: `lesson:matched-stress-${index}`,
        itemType: "lesson",
        itemId: `matched-stress-${index}`,
        itemVersion: bundle.itemCatalog!.contentVersion,
        releaseState: "beta",
        payload,
        payloadSha256,
        owner: null,
        sourceLicense: null,
        prerequisites: index === nodeCount - 1
          ? []
          : [{
              itemType: "lesson",
              itemId: `matched-stress-${index + 1}`,
            }],
        knowledgeItems: index === 0
          ? [{ itemType: "grammar", itemId: knowledgeItemId }]
          : [],
      }),
    );
    const grammarItem: ContentCatalogItem = {
      itemKey: `grammar:${knowledgeItemId}`,
      itemType: "grammar",
      itemId: knowledgeItemId,
      itemVersion: bundle.itemCatalog.contentVersion,
      releaseState: "beta",
      payload: grammarPayload,
      payloadSha256: grammarPayloadSha256,
      owner: null,
      sourceLicense: null,
      prerequisites: [{
        itemType: "lesson",
        itemId: prerequisiteLessonId,
      }],
    };
    bundle.itemCatalog.items = [...lessonItems, grammarItem];
    bundle.itemCatalog.audioAssets = [];

    const validation = await validateContentBundle(bundle);

    expect(
      validation.errors.filter((error) =>
        error.includes("implied lesson prerequisites")
        || error.includes("lesson dependency reachability")
        || error.startsWith("runtime-catalog projection failed:")),
    ).toEqual([]);
  }, 30_000);

  it("evaluates a reviewed 10,000-item dependency chain with shared indexes", async () => {
    const bundle = await makeEligibleFixture("closed-alpha");
    if (
      bundle.itemCatalog === null
      || bundle.reviews.schemaVersion !== 2
    ) {
      throw new Error("Release stress fixture requires scoped catalog reviews");
    }
    const template = bundle.itemCatalog.items.find(
      (item) => item.itemType === "lexeme",
    );
    if (!template || template.itemType !== "lexeme") {
      throw new Error("Release stress fixture requires a lexeme");
    }
    const nodeCount = 10_000;
    const itemKeys = Array.from(
      { length: nodeCount },
      (_, index): `lexeme:${string}` => `lexeme:release-stress-${index}`,
    );
    bundle.itemCatalog.items = itemKeys.map(
      (itemKey, index): LexemeCatalogItem => ({
        itemKey,
        itemType: "lexeme",
        itemId: `release-stress-${index}`,
        itemVersion: bundle.itemCatalog!.contentVersion,
        releaseState: "beta",
        payload: template.payload,
        payloadSha256:
          `sha256:${index.toString(16).padStart(64, "0")}` as Sha256Digest,
        owner: template.owner,
        sourceLicense: template.sourceLicense,
        prerequisites: index === nodeCount - 1
          ? []
          : [{
              itemType: "lexeme",
              itemId: `release-stress-${index + 1}`,
            }],
      }),
    );
    bundle.coverageClaims.coverageClaims = [];
    bundle.reviews.reviews.forEach((review) => {
      review.scope.itemKeys = itemKeys;
      review.scope.audioAssetIds = [];
    });
    const manifestHash = bundle.reviews.packageManifestSha256;
    const validation: ContentValidationResult = {
      errors: [],
      warnings: [],
      hashes: {
        manifest: manifestHash,
        runtimeIds: manifestHash,
        itemCatalog: bundle.reviews.itemCatalogSha256,
        runtimeCatalog: manifestHash,
        coverageClaims: manifestHash,
        reviews: manifestHash,
        assessmentSource: null,
        runtimeSource: null,
        knowledgeItemBlueprintsSource: null,
        lessonGuidesSource: null,
        exerciseGenerationSource: null,
        attemptScoringSource: null,
        authoritativeItemBankSource: null,
        lessonCompletionPolicySource: null,
        authoritativeAssessmentItemBankSource: null,
        assessmentScoringSource: null,
      },
    };

    const assessment = assessClosedAlphaEligibility(bundle, validation);

    expect(
      assessment.blockers.some((blocker) =>
        blocker.startsWith(
          "Released catalog items missing item-level governance or exact scoped review:",
        )),
    ).toBe(false);
    expect(
      assessment.blockers.some((blocker) =>
        blocker.startsWith(
          "Closed alpha requires at least 300 released, catalog-backed, native-reviewed lexemes",
        )),
    ).toBe(false);
    expect(assessment.blockers).toContain(
      "Closed alpha requires an evidence-backed complete A0 coverage claim",
    );
  }, 20_000);
});
