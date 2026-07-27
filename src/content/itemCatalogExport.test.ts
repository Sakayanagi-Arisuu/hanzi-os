import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  runItemCatalogExport,
} from "../../scripts/content/export-item-catalog";
import type { KnowledgeItemBlueprint } from "../data/knowledgeItemBlueprints";
import type { LessonGuide } from "../data/lessonGuides";
import type { Lesson, VocabularyItem } from "../types";
import { projectItemCatalogV2 } from "./itemCatalogProjection";
import { sha256Json } from "./packageLoader";
import type {
  ItemCatalogArtifact,
  Sha256Digest,
} from "./types";

const digest = (character: string) =>
  `sha256:${character.repeat(64)}` as Sha256Digest;

const makeCatalogV4 = (
  contentVersion: string,
): Extract<ItemCatalogArtifact, { schemaVersion: 4 }> => {
  const lexemePayloadSha256 = digest("a");
  const characterPayloadSha256 = digest("b");
  const linguisticRecordSha256 = digest("c");
  const strokeRecordSha256 = digest("d");
  const audioFileSha256 = digest("e");
  const transcriptSha256 = digest("f");
  const audioRights = {
    ownerId: "audio-owner-fixture",
    licenseId: "Audio-License-Fixture",
    evidenceRef: "fixture://audio-rights",
  };
  return {
    schemaVersion: 4,
    contentVersion,
    items: [
      {
        itemKey: "lexeme:ni",
        itemType: "lexeme",
        itemId: "ni",
        itemVersion: contentVersion,
        releaseState: "beta",
        payload: {
          simplified: "你",
          traditional: "你",
          pinyin: "nǐ",
          pinyinNumbered: "ni3",
          meaning: "you",
          partOfSpeech: "pronoun",
          example: "你好",
          examplePinyin: "nǐ hǎo",
          exampleMeaning: "hello",
          hsk: 1,
          tags: ["greeting"],
        },
        payloadSha256: lexemePayloadSha256,
        owner: {
          id: "lexeme-owner-fixture",
          evidenceRef: "fixture://lexeme-owner",
        },
        sourceLicense: {
          licenseId: "Lexeme-License-Fixture",
          evidenceRef: "fixture://lexeme-license",
        },
        prerequisites: [],
      },
      {
        itemKey: "character:u4f60",
        itemType: "character",
        itemId: "u4f60",
        itemVersion: contentVersion,
        releaseState: "review",
        payload: {
          character: "你",
          traditional: "你",
          pinyin: "nǐ",
          meaning: "you",
          sourceLexemeIds: ["ni"],
          analysis: {
            schemaVersion: 1,
            decompositionKind: "compound",
            radical: {
              glyph: "亻",
              sourceIds: ["linguistic-fixture"],
            },
            components: [
              {
                componentId: "person",
                glyph: "亻",
                role: "semantic",
                position: "left",
                sourceIds: ["linguistic-fixture"],
              },
              {
                componentId: "er",
                glyph: "尔",
                role: "phonetic",
                position: "right",
                sourceIds: ["linguistic-fixture"],
              },
            ],
            structure: {
              kind: "left-right",
              sourceIds: ["linguistic-fixture"],
            },
            sources: [
              {
                sourceId: "linguistic-fixture",
                kind: "linguistic-reference",
                recordKey: "你",
                citationRef: "fixture://linguistic/u4f60",
                licenseId: "Linguistic-License-Fixture",
                licenseEvidenceRef: "fixture://linguistic-license",
                recordRef:
                  "character-sources/u4f60/linguistic-fixture.json",
                recordSha256: linguisticRecordSha256,
              },
              {
                sourceId: "stroke-fixture",
                kind: "stroke-dataset",
                recordKey: "你",
                citationRef: "fixture://strokes/u4f60",
                licenseId: "Stroke-License-Fixture",
                licenseEvidenceRef: "fixture://stroke-license",
                recordRef: "stroke-data/u4f60.json",
                recordSha256: strokeRecordSha256,
              },
            ],
          },
          strokeCount: 7,
          strokeData: {
            format: "hanzi-writer-v1",
            fileRef: "stroke-data/u4f60.json",
            fileSha256: strokeRecordSha256,
            sourceId: "stroke-fixture",
          },
        },
        payloadSha256: characterPayloadSha256,
        owner: {
          id: "character-owner-fixture",
          evidenceRef: "fixture://character-owner",
        },
        sourceLicense: {
          licenseId: "Character-License-Fixture",
          evidenceRef: "fixture://character-license",
        },
        prerequisites: [{ itemType: "lexeme", itemId: "ni" }],
      },
    ],
    audioAssets: [
      {
        assetId: "ni-audio",
        targetItemKey: "lexeme:ni",
        targetPayloadSha256: lexemePayloadSha256,
        fileRef: "audio/ni-audio.wav",
        fileSha256: audioFileSha256,
        transcript: "你",
        transcriptSha256,
        speaker: {
          id: "native-speaker-fixture",
          nativeSpeakerEvidenceRef: "fixture://native-speaker",
        },
        rights: audioRights,
        media: {
          container: "wav",
          codec: "pcm-s16le",
          sampleRateHz: 16_000,
          channels: 1,
          bitDepth: 16,
          frameCount: 8_000,
          durationMs: 500,
          byteLength: 16_044,
        },
        alignment: {
          schemaVersion: 1,
          targetTextSha256: transcriptSha256,
          segments: [{ startMs: 0, endMs: 500, text: "你" }],
        },
      },
    ],
  };
};

const makeCatalogV2 = (
  contentVersion: string,
): Extract<ItemCatalogArtifact, { schemaVersion: 2 }> => ({
  schemaVersion: 2,
  contentVersion,
  items: [],
  audioAssets: [],
});

const sourceLessonGuide: LessonGuide = {
  concept: "Old authored concept",
  rule: "Old authored rule",
  examples: [{
    chinese: "你好",
    pinyin: "nǐ hǎo",
    meaning: "hello",
  }],
  pitfall: "Old authored pitfall",
  checkpoint: "Old authored checkpoint",
};

const liveLessonGuide: LessonGuide = {
  ...sourceLessonGuide,
  concept: "Corrected live concept",
  rule: "Corrected live rule",
  checkpoint: "Corrected live checkpoint",
};

const fixtureBlueprints: KnowledgeItemBlueprint[] = [
  {
    itemType: "grammar",
    itemId: "greeting-grammar",
    sourceLessonId: "lesson-1",
    prerequisites: [],
  },
  {
    itemType: "character",
    itemId: "u4f60",
    sourceLexemeId: "ni",
    sourceLessonId: "lesson-1",
    prerequisites: [{ itemType: "lexeme", itemId: "ni" }],
  },
];

const makeRebuildableCatalogV4 = async (
  contentVersion: string,
): Promise<Extract<ItemCatalogArtifact, { schemaVersion: 4 }>> => {
  const vocabulary: VocabularyItem[] = [{
    id: "ni",
    simplified: "你",
    traditional: "你",
    pinyin: "nǐ",
    pinyinNumbered: "ni3",
    syllables: [],
    meaning: "you",
    partOfSpeech: "pronoun",
    example: "你好",
    examplePinyin: "nǐ hǎo",
    exampleMeaning: "hello",
    hsk: 1,
    tags: ["greeting"],
  }];
  const lessons: Lesson[] = [{
    id: "lesson-1",
    unitId: "unit-1",
    title: "Greeting",
    chineseTitle: "你好",
    objective: "Greet someone",
    minutes: 5,
    xp: 10,
    skills: ["vocabulary"],
    wordIds: ["ni"],
    prerequisiteIds: [],
    releaseState: "beta",
    contentVersion,
  }];
  const projected = await projectItemCatalogV2({
    contentVersion,
    vocabulary,
    lessons,
    stories: [],
    lessonGuides: { "lesson-1": sourceLessonGuide },
    knowledgeItemBlueprints: fixtureBlueprints,
  });
  const items = await Promise.all(projected.items.map(async (item) => {
    if (item.itemType !== "character") {
      return {
        ...item,
        owner: {
          id: "stale-owner",
          evidenceRef: "fixture://stale-owner",
        },
        sourceLicense: {
          licenseId: "Stale-License",
          evidenceRef: "fixture://stale-license",
        },
      };
    }
    const linguisticRecordSha256 = digest("c");
    const strokeRecordSha256 = digest("d");
    const payload = {
      character: item.payload.character,
      traditional: item.payload.traditional,
      pinyin: item.payload.pinyin,
      meaning: "stale character gloss",
      sourceLexemeIds: structuredClone(item.payload.sourceLexemeIds),
      analysis: {
        schemaVersion: 1 as const,
        decompositionKind: "compound" as const,
        radical: {
          glyph: "亻",
          sourceIds: ["linguistic-fixture"],
        },
        components: [
          {
            componentId: "person",
            glyph: "亻",
            role: "semantic" as const,
            position: "left" as const,
            sourceIds: ["linguistic-fixture"],
          },
          {
            componentId: "er",
            glyph: "尔",
            role: "phonetic" as const,
            position: "right" as const,
            sourceIds: ["linguistic-fixture"],
          },
        ],
        structure: {
          kind: "left-right" as const,
          sourceIds: ["linguistic-fixture"],
        },
        sources: [
          {
            sourceId: "linguistic-fixture",
            kind: "linguistic-reference" as const,
            recordKey: "你",
            citationRef: "fixture://linguistic/u4f60",
            licenseId: "Linguistic-License-Fixture",
            licenseEvidenceRef: "fixture://linguistic-license",
            recordRef: "character-sources/u4f60/linguistic-fixture.json",
            recordSha256: linguisticRecordSha256,
          },
          {
            sourceId: "stroke-fixture",
            kind: "stroke-dataset" as const,
            recordKey: "你",
            citationRef: "fixture://strokes/u4f60",
            licenseId: "Stroke-License-Fixture",
            licenseEvidenceRef: "fixture://stroke-license",
            recordRef: "stroke-data/u4f60.json",
            recordSha256: strokeRecordSha256,
          },
        ],
      },
      strokeCount: 7,
      strokeData: {
        format: "hanzi-writer-v1" as const,
        fileRef: "stroke-data/u4f60.json",
        fileSha256: strokeRecordSha256,
        sourceId: "stroke-fixture",
      },
    };
    return {
      ...item,
      releaseState: "beta" as const,
      payload,
      payloadSha256: await sha256Json({
        itemType: "character",
        payload,
      }),
      owner: {
        id: "stale-character-owner",
        evidenceRef: "fixture://stale-character-owner",
      },
      sourceLicense: {
        licenseId: "Stale-Character-License",
        evidenceRef: "fixture://stale-character-license",
      },
    };
  }));
  const grammar = items.find(
    (item) => item.itemKey === "grammar:greeting-grammar",
  );
  if (grammar === undefined) throw new Error("Fixture grammar is missing");
  return {
    schemaVersion: 4,
    contentVersion,
    items: items as Extract<
      ItemCatalogArtifact,
      { schemaVersion: 4 }
    >["items"],
    audioAssets: [{
      assetId: "greeting-audio",
      targetItemKey: "grammar:greeting-grammar",
      targetPayloadSha256: grammar.payloadSha256,
      fileRef: "audio/greeting-audio.wav",
      fileSha256: digest("e"),
      transcript: "你好",
      transcriptSha256: digest("f"),
      speaker: {
        id: "native-speaker-fixture",
        nativeSpeakerEvidenceRef: "fixture://native-speaker",
      },
      rights: {
        ownerId: "audio-owner-fixture",
        licenseId: "Audio-License-Fixture",
        evidenceRef: "fixture://audio-rights",
      },
      media: {
        container: "wav",
        codec: "pcm-s16le",
        sampleRateHz: 16_000,
        channels: 1,
        bitDepth: 16,
        frameCount: 8_000,
        durationMs: 500,
        byteLength: 16_044,
      },
      alignment: {
        schemaVersion: 1,
        targetTextSha256: digest("f"),
        segments: [{ startMs: 0, endMs: 500, text: "你好" }],
      },
    }],
  };
};

const createExporterFixture = (
  sourceCatalog: ItemCatalogArtifact,
) => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "hanzi-catalog-export-"));
  const sourceVersion = sourceCatalog.contentVersion;
  const packageDirectory = join(
    fixtureRoot,
    "content",
    "packages",
    sourceVersion,
  );
  mkdirSync(packageDirectory, { recursive: true });
  writeFileSync(
    join(packageDirectory, "item-catalog.json"),
    `${JSON.stringify(sourceCatalog, null, 2)}\n`,
  );
  writeFileSync(
    join(fixtureRoot, "content", "registry.json"),
    `${JSON.stringify({
      schemaVersion: 1,
      currentContentVersion: sourceVersion,
      packages: [{
        contentVersion: sourceVersion,
        relativePath: `packages/${sourceVersion}`,
      }],
    }, null, 2)}\n`,
  );
  return { fixtureRoot, sourceVersion };
};

const exportArguments = ({
  sourceVersion,
  targetVersion,
  catalogSchemaVersion,
  output = "content/drafts/exported-catalog.json",
}: {
  sourceVersion: string;
  targetVersion: string;
  catalogSchemaVersion: 1 | 2 | 4;
  output?: string;
}) => [
  "--catalog-schema-version",
  String(catalogSchemaVersion),
  "--content-version",
  targetVersion,
  "--from",
  sourceVersion,
  "--output",
  output,
  "--write",
];

const tryCreateDirectoryLink = (target: string, linkPath: string) => {
  try {
    symlinkSync(
      target,
      linkPath,
      process.platform === "win32" ? "junction" : "dir",
    );
    return true;
  } catch (error) {
    if (
      error instanceof Error
      && "code" in error
      && ["EPERM", "EACCES"].includes(String(error.code))
    ) {
      return false;
    }
    throw error;
  }
};

describe("item catalog export", () => {
  it("rebuilds live derived payloads, resets governance, and safely merges schema-v4 artifacts", async () => {
    const sourceVersion = "fixture-source-v6";
    const targetVersion = "fixture-target-v6";
    const sourceCatalog = await makeRebuildableCatalogV4(sourceVersion);
    const sourceSnapshot = structuredClone(sourceCatalog);
    const { fixtureRoot } = createExporterFixture(sourceCatalog);
    const messages: string[] = [];
    try {
      const exported = await runItemCatalogExport(
        exportArguments({
          sourceVersion,
          targetVersion,
          catalogSchemaVersion: 4,
        }),
        {
          repositoryRoot: fixtureRoot,
          log: (message) => messages.push(message),
          lessonGuides: { "lesson-1": liveLessonGuide },
          knowledgeItemBlueprints: fixtureBlueprints,
        },
      );
      if (exported.schemaVersion !== 4) {
        throw new Error("Expected a schema-v4 export");
      }

      const exportedFromDisk = JSON.parse(readFileSync(
        join(fixtureRoot, "content/drafts/exported-catalog.json"),
        "utf8",
      )) as ItemCatalogArtifact;
      expect(exportedFromDisk).toEqual(exported);
      expect(exported.contentVersion).toBe(targetVersion);
      expect(exported.items.every(
        (item) => item.itemVersion === targetVersion,
      )).toBe(true);

      const sourceGrammar = sourceSnapshot.items.find(
        (item) => item.itemType === "grammar",
      );
      const exportedGrammar = exported.items.find(
        (item) => item.itemType === "grammar",
      );
      if (sourceGrammar?.itemType !== "grammar") {
        throw new Error("Source grammar fixture is missing");
      }
      if (exportedGrammar?.itemType !== "grammar") {
        throw new Error("Exported grammar fixture is missing");
      }
      expect(exportedGrammar.payload).toMatchObject({
        concept: liveLessonGuide.concept,
        rule: liveLessonGuide.rule,
        checkpoint: liveLessonGuide.checkpoint,
      });
      expect(exportedGrammar.payload).not.toEqual(sourceGrammar.payload);
      expect(exportedGrammar.payloadSha256).not.toBe(
        sourceGrammar.payloadSha256,
      );
      expect(exportedGrammar.payloadSha256).toBe(await sha256Json({
        itemType: exportedGrammar.itemType,
        payload: exportedGrammar.payload,
      }));
      expect(exportedGrammar).toMatchObject({
        itemVersion: targetVersion,
        releaseState: "review",
        owner: null,
        sourceLicense: null,
      });

      const sourceCharacter = sourceSnapshot.items.find(
        (item) => item.itemType === "character",
      );
      const exportedCharacter = exported.items.find(
        (item) => item.itemType === "character",
      );
      if (sourceCharacter?.itemType !== "character") {
        throw new Error("Source character fixture is missing");
      }
      if (exportedCharacter?.itemType !== "character") {
        throw new Error("Exported character fixture is missing");
      }
      expect(exportedCharacter.payload.analysis).toEqual(
        sourceCharacter.payload.analysis,
      );
      expect(exportedCharacter.payload.strokeCount).toBe(
        sourceCharacter.payload.strokeCount,
      );
      expect(exportedCharacter.payload.strokeData).toEqual(
        sourceCharacter.payload.strokeData,
      );
      expect(exportedCharacter.payload.meaning).toBe("you");
      expect(exportedCharacter.payload.meaning).not.toBe(
        sourceCharacter.payload.meaning,
      );
      expect(exportedCharacter).toMatchObject({
        itemVersion: targetVersion,
        releaseState: "review",
        owner: null,
        sourceLicense: null,
      });

      expect(exported.audioAssets).toEqual([
        {
          ...sourceSnapshot.audioAssets[0],
          targetPayloadSha256: exportedGrammar.payloadSha256,
        },
      ]);
      expect(sourceCatalog).toEqual(sourceSnapshot);
      expect(messages).toEqual([
        expect.stringContaining("preserved governed media metadata"),
      ]);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("emits an explicitly blocked pending draft when inherited audio needs replacement", async () => {
    const sourceVersion = "fixture-source-audio-replacement";
    const targetVersion = "fixture-target-audio-replacement";
    const sourceCatalog = await makeRebuildableCatalogV4(sourceVersion);
    const sourceAudio = structuredClone(sourceCatalog.audioAssets[0]);
    const { fixtureRoot } = createExporterFixture(sourceCatalog);
    const messages: string[] = [];
    const incompatibleGuide: LessonGuide = {
      ...liveLessonGuide,
      examples: [{
        chinese: "再见",
        pinyin: "zàijiàn",
        meaning: "goodbye",
      }],
    };
    try {
      const exported = await runItemCatalogExport(
        exportArguments({
          sourceVersion,
          targetVersion,
          catalogSchemaVersion: 4,
        }),
        {
          repositoryRoot: fixtureRoot,
          log: (message) => messages.push(message),
          lessonGuides: { "lesson-1": incompatibleGuide },
          knowledgeItemBlueprints: fixtureBlueprints,
        },
      );
      if (exported.schemaVersion !== 4) {
        throw new Error("Expected a schema-v4 export");
      }
      const target = exported.items.find(
        (item) => item.itemKey === sourceAudio.targetItemKey,
      );
      if (target === undefined) {
        throw new Error("Rebuilt audio target is missing");
      }
      expect(target.payloadSha256).not.toBe(sourceAudio.targetPayloadSha256);
      expect(exported.audioAssets).toEqual([sourceAudio]);
      expect(messages).toEqual([
        expect.stringContaining("preserved governed media metadata"),
        expect.stringMatching(
          /1 incompatible audio asset.+must be replaced via import-audio.+cannot use new-version.+greeting-audio/u,
        ),
      ]);
      expect(existsSync(join(
        fixtureRoot,
        "content/drafts/exported-catalog.json",
      ))).toBe(true);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("rejects removal of an audio target because retirement is not supported", async () => {
    const sourceVersion = "fixture-source-removed-audio-target";
    const sourceCatalog = await makeRebuildableCatalogV4(sourceVersion);
    const { fixtureRoot } = createExporterFixture(sourceCatalog);
    const output = "content/drafts/rejected-removed-audio-target.json";
    try {
      await expect(runItemCatalogExport(
        exportArguments({
          sourceVersion,
          targetVersion: "fixture-target-removed-audio-target",
          catalogSchemaVersion: 4,
          output,
        }),
        {
          repositoryRoot: fixtureRoot,
          log: () => undefined,
          lessonGuides: { "lesson-1": liveLessonGuide },
          knowledgeItemBlueprints: fixtureBlueprints.filter(
            (blueprint) => blueprint.itemType !== "grammar",
          ),
        },
      )).rejects.toThrow(
        /target grammar:greeting-grammar was removed.+explicit audio retirement.+not supported/u,
      );
      expect(existsSync(join(fixtureRoot, ...output.split("/")))).toBe(false);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("rejects character inventory drift into the explicit metadata-import workflow", async () => {
    const sourceVersion = "fixture-source-character-drift";
    const sourceCatalog = await makeRebuildableCatalogV4(sourceVersion);
    const { fixtureRoot } = createExporterFixture(sourceCatalog);
    const output = "content/drafts/rejected-character-drift.json";
    try {
      await expect(runItemCatalogExport(
        exportArguments({
          sourceVersion,
          targetVersion: "fixture-target-character-drift",
          catalogSchemaVersion: 4,
          output,
        }),
        {
          repositoryRoot: fixtureRoot,
          log: () => undefined,
          lessonGuides: { "lesson-1": liveLessonGuide },
          knowledgeItemBlueprints: fixtureBlueprints.filter(
            (blueprint) => blueprint.itemType !== "character",
          ),
        },
      )).rejects.toThrow(
        "Schema-v4 character inventory changed during projection",
      );
      expect(existsSync(join(fixtureRoot, ...output.split("/")))).toBe(false);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("rejects an output-parent junction without writing through it", async () => {
    const sourceVersion = "fixture-source-output-junction";
    const sourceCatalog = makeCatalogV4(sourceVersion);
    const { fixtureRoot } = createExporterFixture(sourceCatalog);
    const externalRoot = mkdtempSync(join(tmpdir(), "hanzi-export-outside-"));
    const draftsRoot = join(fixtureRoot, "content", "drafts");
    const linkedParent = join(draftsRoot, "linked");
    mkdirSync(draftsRoot);
    try {
      if (!tryCreateDirectoryLink(externalRoot, linkedParent)) return;
      await expect(runItemCatalogExport(
        exportArguments({
          sourceVersion,
          targetVersion: "fixture-target-output-junction",
          catalogSchemaVersion: 4,
          output: "content/drafts/linked/escaped.json",
        }),
        { repositoryRoot: fixtureRoot, log: () => undefined },
      )).rejects.toThrow(/Catalog output parent.+(?:symlink|junction|reparse)/u);
      expect(existsSync(join(externalRoot, "escaped.json"))).toBe(false);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
      rmSync(externalRoot, { recursive: true, force: true });
    }
  });

  it("rejects a source package root junction before reading its catalog", async () => {
    const sourceVersion = "fixture-source-package-junction";
    const sourceCatalog = makeCatalogV4(sourceVersion);
    const { fixtureRoot } = createExporterFixture(sourceCatalog);
    const externalRoot = mkdtempSync(join(tmpdir(), "hanzi-export-source-"));
    const sourcePackageDirectory = join(
      fixtureRoot,
      "content",
      "packages",
      sourceVersion,
    );
    const externalPackageDirectory = join(externalRoot, "package");
    mkdirSync(externalPackageDirectory);
    writeFileSync(
      join(externalPackageDirectory, "item-catalog.json"),
      readFileSync(join(sourcePackageDirectory, "item-catalog.json")),
    );
    rmSync(sourcePackageDirectory, { recursive: true, force: true });
    try {
      if (
        !tryCreateDirectoryLink(
          externalPackageDirectory,
          sourcePackageDirectory,
        )
      ) {
        return;
      }
      const output = "content/drafts/rejected-package-junction.json";
      await expect(runItemCatalogExport(
        exportArguments({
          sourceVersion,
          targetVersion: "fixture-target-package-junction",
          catalogSchemaVersion: 4,
          output,
        }),
        { repositoryRoot: fixtureRoot, log: () => undefined },
      )).rejects.toThrow(
        /Source package fixture-source-package-junction.+(?:symlink|junction|reparse)/u,
      );
      expect(existsSync(join(fixtureRoot, ...output.split("/")))).toBe(false);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
      rmSync(externalRoot, { recursive: true, force: true });
    }
  });

  it("rejects a source catalog leaf swap during capture without creating output", async () => {
    const sourceVersion = "fixture-source-catalog-swap";
    const sourceCatalog = makeCatalogV4(sourceVersion);
    const { fixtureRoot } = createExporterFixture(sourceCatalog);
    const sourceCatalogPath = join(
      fixtureRoot,
      "content",
      "packages",
      sourceVersion,
      "item-catalog.json",
    );
    const output = "content/drafts/rejected-catalog-swap.json";
    let sourceCatalogWasCaptured = false;
    try {
      await expect(runItemCatalogExport(
        exportArguments({
          sourceVersion,
          targetVersion: "fixture-target-catalog-swap",
          catalogSchemaVersion: 4,
          output,
        }),
        {
          repositoryRoot: fixtureRoot,
          log: () => undefined,
          readTrustedFile: (path) => {
            const bytes = readFileSync(path);
            if (path === sourceCatalogPath) {
              sourceCatalogWasCaptured = true;
              rmSync(path);
              writeFileSync(path, "{}\n");
            }
            return bytes;
          },
        },
      )).rejects.toThrow(
        /Source item catalog .+ changed while its bytes were being captured/u,
      );
      expect(sourceCatalogWasCaptured).toBe(true);
      expect(existsSync(join(fixtureRoot, ...output.split("/")))).toBe(false);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("preserves a registry BOM so malformed JSON fails before output", async () => {
    const sourceVersion = "fixture-source-registry-bom";
    const sourceCatalog = makeCatalogV4(sourceVersion);
    const { fixtureRoot } = createExporterFixture(sourceCatalog);
    const registryPath = join(fixtureRoot, "content", "registry.json");
    writeFileSync(
      registryPath,
      Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        readFileSync(registryPath),
      ]),
    );
    const output = "content/drafts/rejected-registry-bom.json";
    try {
      await expect(runItemCatalogExport(
        exportArguments({
          sourceVersion,
          targetVersion: "fixture-target-registry-bom",
          catalogSchemaVersion: 4,
          output,
        }),
        { repositoryRoot: fixtureRoot, log: () => undefined },
      )).rejects.toThrow("Content registry must contain valid JSON");
      expect(existsSync(join(fixtureRoot, ...output.split("/")))).toBe(false);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it.each([
    {
      name: "schema v4 to v1",
      sourceCatalog: makeCatalogV4("fixture-source-v4-to-v1"),
      requestedSchemaVersion: 1 as const,
      expectedError:
        "Refusing to downgrade a schema-v4 authoring catalog",
    },
    {
      name: "schema v4 to v2",
      sourceCatalog: makeCatalogV4("fixture-source-v4-to-v2"),
      requestedSchemaVersion: 2 as const,
      expectedError:
        "Refusing to downgrade a schema-v4 authoring catalog",
    },
    {
      name: "schema v2 to v4",
      sourceCatalog: makeCatalogV2("fixture-source-v2-to-v4"),
      requestedSchemaVersion: 4 as const,
      expectedError:
        "--catalog-schema-version 4 requires a schema-v4 source catalog",
    },
  ])("rejects unsupported $name export without creating output", async ({
    sourceCatalog,
    requestedSchemaVersion,
    expectedError,
  }) => {
    const { fixtureRoot, sourceVersion } = createExporterFixture(sourceCatalog);
    const output = "content/drafts/rejected-catalog.json";
    try {
      await expect(runItemCatalogExport(
        exportArguments({
          sourceVersion,
          targetVersion: `${sourceVersion}-target`,
          catalogSchemaVersion: requestedSchemaVersion,
          output,
        }),
        { repositoryRoot: fixtureRoot, log: () => undefined },
      )).rejects.toThrow(expectedError);
      expect(existsSync(join(fixtureRoot, ...output.split("/")))).toBe(false);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
