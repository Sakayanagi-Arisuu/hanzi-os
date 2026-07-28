import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  inspectAudioAssetFiles,
  runContentCommand,
} from "../../scripts/content/lib.mjs";
import { sha256Json } from "./packageLoader";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const sourceArtifactNames = [
  "src/data/assessment.ts",
  "src/data/curriculum.ts",
  "src/lib/exerciseGeneration.ts",
  "src/server/attemptScoring.ts",
  "src/server/authoritativeItemBank.ts",
  "src/server/lessonCompletionPolicy.ts",
  "src/server/authoritativeAssessmentItemBank.ts",
  "src/server/assessmentScoring.ts",
];
const sourceArtifactNamesV4 = [
  ...sourceArtifactNames,
  "src/data/knowledgeItemBlueprints.ts",
  "src/data/lessonGuides.ts",
];

const copyFixtureFile = (fixtureRoot: string, relativePath: string) => {
  const target = join(fixtureRoot, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(repositoryRoot, relativePath), target);
};

const makeCanonicalWave = () => {
  const frameCount = 8_000;
  const dataByteLength = frameCount * 2;
  const bytes = Buffer.alloc(44 + dataByteLength);
  bytes.write("RIFF", 0, "ascii");
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVE", 8, "ascii");
  bytes.write("fmt ", 12, "ascii");
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(16_000, 24);
  bytes.writeUInt32LE(32_000, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36, "ascii");
  bytes.writeUInt32LE(dataByteLength, 40);
  return bytes;
};

const sha256Bytes = (bytes: Uint8Array) =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

const createAudioCommandFixture = () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "hanzi-audio-command-"));
  const targetVersion = "fixture-2026.08.3";
  [
    "scripts/content/lib.mjs",
    "scripts/content/import-audio.mjs",
    "scripts/content/validate.mjs",
    "src/content/governance.mjs",
    "src/content/editorialReadiness.mjs",
    "src/content/audioInspection.mjs",
    "src/content/characterDataInspection.mjs",
    "content/registry.json",
    "config/production-readiness.json",
    ...sourceArtifactNamesV4,
  ].forEach((path) => copyFixtureFile(fixtureRoot, path));
  for (const version of [
    "foundation-2026.07.1",
    "foundation-2026.07.2",
    "foundation-2026.07.3",
    "foundation-2026.07.4",
    "foundation-2026.07.5",
  ]) {
    cpSync(
      join(repositoryRoot, `content/packages/${version}`),
      join(fixtureRoot, `content/packages/${version}`),
      { recursive: true },
    );
  }
  const registryPath = join(fixtureRoot, "content/registry.json");
  const registry = JSON.parse(readFileSync(registryPath, "utf8")) as {
    currentContentVersion: string;
    packages: Array<{ contentVersion: string }>;
  };
  registry.currentContentVersion = "foundation-2026.07.5";
  registry.packages = registry.packages.filter(
    ({ contentVersion }) => contentVersion !== "foundation-2026.07.6",
  );
  writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
  const readinessPath = join(fixtureRoot, "config/production-readiness.json");
  const readiness = JSON.parse(readFileSync(readinessPath, "utf8")) as {
    contentVersion: string;
  };
  readiness.contentVersion = targetVersion;
  writeFileSync(readinessPath, `${JSON.stringify(readiness, null, 2)}\n`);
  const curriculumPath = join(fixtureRoot, "src/data/curriculum.ts");
  writeFileSync(
    curriculumPath,
    readFileSync(curriculumPath, "utf8").replaceAll(
      "foundation-2026.07.6",
      targetVersion,
    ),
  );
  const catalog = JSON.parse(
    readFileSync(
      join(
        fixtureRoot,
        "content/packages/foundation-2026.07.5/item-catalog.json",
      ),
      "utf8",
    ),
  ) as {
    schemaVersion: number;
    contentVersion: string;
    audioAssets: unknown[];
    items: Array<{
      itemKey: string;
      itemVersion: string;
      payload: { simplified?: string };
    }>;
  };
  catalog.contentVersion = targetVersion;
  catalog.items.forEach((item) => {
    item.itemVersion = targetVersion;
  });
  const catalogPath = join(fixtureRoot, "content/drafts/audio-catalog.json");
  mkdirSync(dirname(catalogPath), { recursive: true });
  writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  const wave = makeCanonicalWave();
  const sourceDirectory = join(fixtureRoot, "content/drafts/音 声");
  mkdirSync(sourceDirectory, { recursive: true });
  writeFileSync(join(sourceDirectory, "ni.payload"), wave);
  writeFileSync(join(sourceDirectory, "hao.data"), wave);
  const descriptor = {
    schemaVersion: 1,
    contentVersion: targetVersion,
    assets: ["ni", "hao"].map((itemId) => {
      const item = catalog.items.find(
        (candidate) => candidate.itemKey === `lexeme:${itemId}`,
      );
      if (!item?.payload.simplified) throw new Error(`Missing fixture ${itemId}`);
      return {
        assetId: `${itemId}-audio`,
        targetItemKey: item.itemKey,
        sourceFile: `content/drafts/音 声/${itemId}.${itemId === "ni" ? "payload" : "data"}`,
        expectedFileSha256: sha256Bytes(wave),
        transcript: item.payload.simplified,
        segments: [{ startMs: 0, endMs: 500, text: item.payload.simplified }],
        speaker: {
          id: "native-speaker-1",
          nativeSpeakerEvidenceRef: "fixture://speaker/native-1",
        },
        rights: {
          ownerId: "fixture-audio-owner",
          licenseId: "fixture-audio-license",
          evidenceRef: "fixture://audio-rights",
        },
      };
    }),
  };
  const descriptorPath = join(fixtureRoot, "content/drafts/audio-descriptor.json");
  writeFileSync(descriptorPath, `${JSON.stringify(descriptor, null, 2)}\n`);
  const args = [
    join(fixtureRoot, "scripts/content/import-audio.mjs"),
    targetVersion,
    "--from", "foundation-2026.07.5",
    "--created-at", "2026-08-03T00:00:00.000Z",
    "--audience", "closed-alpha",
    "--content-schema-version", "5",
    "--item-catalog-file", "content/drafts/audio-catalog.json",
    "--audio-descriptor-file", "content/drafts/audio-descriptor.json",
    "--audio-owner-id", "fixture-audio-owner",
    "--audio-license-id", "fixture-audio-license",
    "--audio-evidence", "fixture://audio-rights",
    "--confirm-runtime-ids-unchanged", "true",
    "--write",
  ];
  return { fixtureRoot, targetVersion, wave, descriptor, descriptorPath, args };
};

const createCharacterCommandFixture = () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "hanzi-character-command-"));
  const targetVersion = "fixture-2026.08.4";
  [
    "scripts/content/lib.mjs",
    "scripts/content/import-character-metadata.mjs",
    "scripts/content/validate.mjs",
    "src/content/governance.mjs",
    "src/content/editorialReadiness.mjs",
    "src/content/audioInspection.mjs",
    "src/content/characterDataInspection.mjs",
    "content/registry.json",
    "config/production-readiness.json",
    ...sourceArtifactNamesV4,
  ].forEach((path) => copyFixtureFile(fixtureRoot, path));
  for (const version of [
    "foundation-2026.07.1",
    "foundation-2026.07.2",
    "foundation-2026.07.3",
    "foundation-2026.07.4",
    "foundation-2026.07.5",
  ]) {
    cpSync(
      join(repositoryRoot, `content/packages/${version}`),
      join(fixtureRoot, `content/packages/${version}`),
      { recursive: true },
    );
  }
  const registryPath = join(fixtureRoot, "content/registry.json");
  const registry = JSON.parse(readFileSync(registryPath, "utf8")) as {
    currentContentVersion: string;
    packages: Array<{ contentVersion: string }>;
  };
  registry.currentContentVersion = "foundation-2026.07.5";
  registry.packages = registry.packages.filter(
    ({ contentVersion }) => contentVersion !== "foundation-2026.07.6",
  );
  writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
  const readinessPath = join(fixtureRoot, "config/production-readiness.json");
  const readiness = JSON.parse(readFileSync(readinessPath, "utf8")) as {
    contentVersion: string;
  };
  readiness.contentVersion = targetVersion;
  writeFileSync(readinessPath, `${JSON.stringify(readiness, null, 2)}\n`);
  const curriculumPath = join(fixtureRoot, "src/data/curriculum.ts");
  writeFileSync(
    curriculumPath,
    readFileSync(curriculumPath, "utf8").replaceAll(
      "foundation-2026.07.6",
      targetVersion,
    ),
  );
  const catalog = JSON.parse(readFileSync(join(
    fixtureRoot,
    "content/packages/foundation-2026.07.5/item-catalog.json",
  ), "utf8")) as {
    schemaVersion: number;
    contentVersion: string;
    audioAssets: unknown[];
    items: Array<{
      itemKey: string;
      itemType: string;
      itemId: string;
      itemVersion: string;
      payloadSha256: string;
      payload: { character?: string };
    }>;
  };
  catalog.contentVersion = targetVersion;
  catalog.items.forEach((item) => {
    item.itemVersion = targetVersion;
  });
  const catalogPath = join(
    fixtureRoot,
    "content/drafts/character-catalog.json",
  );
  mkdirSync(dirname(catalogPath), { recursive: true });
  writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);

  const sourceDirectory = join(
    fixtureRoot,
    "content/drafts/character-import-sources",
  );
  mkdirSync(sourceDirectory, { recursive: true });
  const strokeBytes = Buffer.from(JSON.stringify({
    strokes: ["M 0 0 L 1 1"],
    medians: [[[0, 0], [1, 1]]],
    radStrokes: [0],
  }));
  const characters = catalog.items
    .filter((item) => item.itemType === "character")
    .map((item) => {
      if (typeof item.payload.character !== "string") {
        throw new Error(`Missing fixture character ${item.itemKey}`);
      }
      const linguisticBytes = Buffer.from(JSON.stringify({
        character: item.payload.character,
        fixtureAnalysis: "independent",
      }));
      writeFileSync(join(sourceDirectory, `${item.itemId}.linguistic.json`), linguisticBytes);
      writeFileSync(join(sourceDirectory, `${item.payload.character}.json`), strokeBytes);
      return {
        targetItemKey: item.itemKey,
        expectedTargetPayloadSha256: item.payloadSha256,
        decompositionKind: "independent",
        radical: {
          glyph: item.payload.character,
          sourceIds: ["linguistic-fixture"],
        },
        components: [],
        structure: {
          kind: "independent",
          sourceIds: ["linguistic-fixture"],
        },
        sources: [
          {
            sourceId: "linguistic-fixture",
            kind: "linguistic-reference",
            recordKey: item.payload.character,
            citationRef: `fixture://character/${item.itemId}`,
            licenseId: "fixture-reference-license",
            licenseEvidenceRef: "fixture://license/linguistic-reference",
            sourceFile:
              `content/drafts/character-import-sources/${item.itemId}.linguistic.json`,
            expectedFileSha256: sha256Bytes(linguisticBytes),
          },
          {
            sourceId: "stroke-fixture",
            kind: "stroke-dataset",
            recordKey: item.payload.character,
            citationRef: `fixture://strokes/${item.itemId}`,
            licenseId: "fixture-stroke-license",
            licenseEvidenceRef: "fixture://license/stroke-dataset",
            sourceFile:
              `content/drafts/character-import-sources/${item.payload.character}.json`,
            expectedFileSha256: sha256Bytes(strokeBytes),
          },
        ],
        strokeSourceId: "stroke-fixture",
      };
    });
  const descriptor = {
    schemaVersion: 1,
    contentVersion: targetVersion,
    characters,
  };
  const descriptorPath = join(
    fixtureRoot,
    "content/drafts/character-descriptor.json",
  );
  writeFileSync(descriptorPath, `${JSON.stringify(descriptor, null, 2)}\n`);
  const args = [
    join(fixtureRoot, "scripts/content/import-character-metadata.mjs"),
    targetVersion,
    "--from", "foundation-2026.07.5",
    "--created-at", "2026-08-04T00:00:00.000Z",
    "--audience", "closed-alpha",
    "--content-schema-version", "6",
    "--item-catalog-file", "content/drafts/character-catalog.json",
    "--character-descriptor-file", "content/drafts/character-descriptor.json",
    "--confirm-runtime-ids-unchanged", "true",
    "--write",
  ];
  return {
    fixtureRoot,
    targetVersion,
    descriptor,
    descriptorPath,
    catalogPath,
    strokeBytes,
    args,
  };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("content validation command", () => {
  it("validates every registered package when no version is supplied", async () => {
    const output: string[] = [];
    vi.spyOn(console, "log").mockImplementation((value) => {
      output.push(String(value));
    });

    await expect(runContentCommand("validate", [])).resolves.toBe(0);

    const report = JSON.parse(output.at(-1) ?? "{}") as {
      valid?: boolean;
      packages?: Array<{
        contentVersion: string;
        valid: boolean;
      }>;
    };
    expect(report.valid).toBe(true);
    expect(report.packages).toEqual([
      { contentVersion: "foundation-2026.07.1", valid: true, errors: [], warnings: [] },
      { contentVersion: "foundation-2026.07.2", valid: true, errors: [], warnings: [] },
      { contentVersion: "foundation-2026.07.3", valid: true, errors: [], warnings: [] },
      { contentVersion: "foundation-2026.07.4", valid: true, errors: [], warnings: [] },
      { contentVersion: "foundation-2026.07.5", valid: true, errors: [], warnings: [] },
      { contentVersion: "foundation-2026.07.6", valid: true, errors: [], warnings: [] },
    ]);
  });

  it("reports the exact-hash editorial backlog without treating readiness as command failure", async () => {
    const output: string[] = [];
    vi.spyOn(console, "log").mockImplementation((value) => {
      output.push(String(value));
    });

    await expect(
      runContentCommand("report", ["foundation-2026.07.6"]),
    ).resolves.toBe(0);

    const report = JSON.parse(output.at(-1) ?? "{}") as {
      contentVersion?: string;
      editorialReadiness?: {
        contentVersion: string;
        packageManifestSha256: string;
        itemCatalogSha256: string;
        reviewEnvelopeSha256: string;
        valid: boolean;
        summary: {
          totalItems: number;
          releaseRelevantItems: number;
          releaseRelevantItemsNeedingAuthoring: number;
          itemsApproved: number;
        };
        items: Array<{ itemKey: string }>;
      };
      validation?: {
        hashes: {
          manifest: string;
          itemCatalog: string;
          reviews: string;
        };
      };
      releaseAssessments?: {
        closedAlpha: { eligible: boolean };
        production: { eligible: boolean };
      };
    };
    expect(report.editorialReadiness).toMatchObject({
      contentVersion: "foundation-2026.07.6",
      packageManifestSha256: report.validation?.hashes.manifest,
      itemCatalogSha256: report.validation?.hashes.itemCatalog,
      reviewEnvelopeSha256: report.validation?.hashes.reviews,
      valid: true,
      summary: {
        totalItems: 74,
        releaseRelevantItems: 64,
        releaseRelevantItemsNeedingAuthoring: 64,
        itemsApproved: 0,
      },
    });
    expect(
      report.editorialReadiness?.items.map(({ itemKey }) => itemKey),
    ).toEqual(
      report.editorialReadiness?.items
        .map(({ itemKey }) => itemKey)
        .toSorted((left, right) => left.localeCompare(right, "en-US")),
    );
    expect(report.releaseAssessments?.closedAlpha.eligible).toBe(false);
    expect(report.releaseAssessments?.production.eligible).toBe(false);
  });

  it("rejects ambiguous or unknown mutation arguments before writing", async () => {
    const registryPath = join(repositoryRoot, "content/registry.json");
    const registryBefore = readFileSync(registryPath, "utf8");
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      runContentCommand("new-version", [
        "unsafe-fixture-version",
        "--write",
        "false",
      ]),
    ).resolves.toBe(2);
    await expect(
      runContentCommand("submit-review", [
        "foundation-2026.07.4",
        "--unexpected",
        "value",
        "--write",
      ]),
    ).resolves.toBe(2);

    expect(readFileSync(registryPath, "utf8")).toBe(registryBefore);
  });

  it("stages and selects a candidate with exact live-source snapshots and no inherited approvals", async () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "hanzi-content-command-"));
    try {
      [
        "scripts/content/lib.mjs",
        "scripts/content/new-version.mjs",
        "scripts/content/submit-review.mjs",
        "src/content/governance.mjs",
        "src/content/editorialReadiness.mjs",
        "src/content/audioInspection.mjs",
        "src/content/characterDataInspection.mjs",
        "content/registry.json",
        "config/production-readiness.json",
        ...sourceArtifactNames,
      ].forEach((path) => copyFixtureFile(fixtureRoot, path));
      for (const version of [
        "foundation-2026.07.1",
        "foundation-2026.07.2",
        "foundation-2026.07.3",
        "foundation-2026.07.4",
      ]) {
        cpSync(
          join(repositoryRoot, `content/packages/${version}`),
          join(fixtureRoot, `content/packages/${version}`),
          { recursive: true },
        );
      }
      const fixtureRegistryPath = join(fixtureRoot, "content/registry.json");
      const fixtureRegistry = JSON.parse(
        readFileSync(fixtureRegistryPath, "utf8"),
      ) as {
        currentContentVersion: string;
        packages: Array<{ contentVersion: string }>;
      };
      fixtureRegistry.currentContentVersion = "foundation-2026.07.4";
      fixtureRegistry.packages = fixtureRegistry.packages.filter(
        (entry) => [
          "foundation-2026.07.1",
          "foundation-2026.07.2",
          "foundation-2026.07.3",
          "foundation-2026.07.4",
        ].includes(entry.contentVersion),
      );
      writeFileSync(
        fixtureRegistryPath,
        `${JSON.stringify(fixtureRegistry, null, 2)}\n`,
      );
      const targetVersion = "fixture-2026.08.1";
      const readinessPath = join(
        fixtureRoot,
        "config/production-readiness.json",
      );
      const readiness = JSON.parse(readFileSync(readinessPath, "utf8")) as {
        contentVersion: string;
      };
      readiness.contentVersion = targetVersion;
      writeFileSync(readinessPath, `${JSON.stringify(readiness, null, 2)}\n`);
      const curriculumPath = join(fixtureRoot, "src/data/curriculum.ts");
      writeFileSync(
        curriculumPath,
        readFileSync(
          join(
            fixtureRoot,
            "content/packages/foundation-2026.07.4/snapshots/src/data/curriculum.ts",
          ),
          "utf8",
        ),
      );
      writeFileSync(
        curriculumPath,
        readFileSync(curriculumPath, "utf8").replace(
          'export const CONTENT_VERSION = "foundation-2026.07.4";',
          `export const CONTENT_VERSION = "${targetVersion}";`,
        ),
      );
      const catalogInputPath = join(
        fixtureRoot,
        "content/drafts/fixture-item-catalog.json",
      );
      mkdirSync(dirname(catalogInputPath), { recursive: true });
      const catalogInput = JSON.parse(
        readFileSync(
          join(
            fixtureRoot,
            "content/packages/foundation-2026.07.4/item-catalog.json",
          ),
          "utf8",
        ),
      ) as {
        contentVersion: string;
        items: Array<{ itemVersion: string }>;
      };
      catalogInput.contentVersion = targetVersion;
      catalogInput.items.forEach((item) => {
        item.itemVersion = targetVersion;
      });
      writeFileSync(
        catalogInputPath,
        `${JSON.stringify(catalogInput, null, 2)}\n`,
      );

      const newVersionArguments = [
          join(fixtureRoot, "scripts/content/new-version.mjs"),
          targetVersion,
          "--from",
          "foundation-2026.07.4",
          "--created-at",
          "2026-08-01T00:00:00.000Z",
          "--audience",
          "closed-alpha",
          "--content-schema-version",
          "3",
          "--item-catalog-file",
          "content/drafts/fixture-item-catalog.json",
          "--confirm-runtime-ids-unchanged",
          "true",
          "--write",
      ];
      const registryBeforeRejectedHandoff = readFileSync(
        join(fixtureRoot, "content/registry.json"),
        "utf8",
      );
      const rejectedHandoff = spawnSync(
        process.execPath,
        newVersionArguments,
        { cwd: fixtureRoot, encoding: "utf8" },
      );
      expect(rejectedHandoff.status).toBe(2);
      expect(rejectedHandoff.stderr).toContain(
        `Bind src/data/curriculum.ts to content/packages/${targetVersion}/item-catalog.json`,
      );
      expect(
        existsSync(join(fixtureRoot, `content/packages/${targetVersion}`)),
      ).toBe(false);
      expect(readFileSync(join(fixtureRoot, "content/registry.json"), "utf8"))
        .toBe(registryBeforeRejectedHandoff);

      writeFileSync(
        curriculumPath,
        readFileSync(curriculumPath, "utf8").replace(
          'import itemCatalogJson from "../../content/packages/foundation-2026.07.4/item-catalog.json";',
          `import itemCatalogJson from "../../content/packages/${targetVersion}/item-catalog.json";`,
        ),
      );
      execFileSync(process.execPath, newVersionArguments, {
        cwd: fixtureRoot,
        encoding: "utf8",
      });

      const packageDirectory = join(
        fixtureRoot,
        `content/packages/${targetVersion}`,
      );
      sourceArtifactNames.forEach((artifactName) => {
        expect(
          readFileSync(
            join(packageDirectory, "snapshots", artifactName),
            "utf8",
          ),
        ).toBe(readFileSync(join(fixtureRoot, artifactName), "utf8"));
      });
      expect(
        JSON.parse(readFileSync(join(packageDirectory, "reviews.json"), "utf8")),
      ).toMatchObject({
        schemaVersion: 2,
        contentVersion: targetVersion,
        reviews: [],
      });
      expect(
        JSON.parse(
          readFileSync(join(packageDirectory, "coverage-claims.json"), "utf8"),
        ),
      ).toEqual({
        schemaVersion: 2,
        contentVersion: targetVersion,
        itemCatalogSha256: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u),
        coverageClaims: [],
      });
      const registry = JSON.parse(
        readFileSync(join(fixtureRoot, "content/registry.json"), "utf8"),
      ) as {
        packages: Array<{
          contentVersion: string;
          closedAlphaEligible: boolean;
          productionEligible: boolean;
        }>;
      };
      expect(
        registry.packages.filter(
          (entry) => entry.contentVersion === targetVersion,
        ),
      ).toEqual([
        expect.objectContaining({
          closedAlphaEligible: false,
          productionEligible: false,
        }),
      ]);

      const manifestPath = join(packageDirectory, "manifest.json");
      const reviewsPath = join(packageDirectory, "reviews.json");
      const registryPath = join(fixtureRoot, "content/registry.json");
      const candidateManifestHash = await sha256Json(
        JSON.parse(readFileSync(manifestPath, "utf8")),
      );
      const reviewScopePath = join(
        fixtureRoot,
        "content/drafts/fixture-review-scope.json",
      );
      writeFileSync(
        reviewScopePath,
        `${JSON.stringify({
          itemKeys: ["lexeme:ni"],
          audioAssetIds: [],
        }, null, 2)}\n`,
      );
      execFileSync(
        process.execPath,
        [
          join(fixtureRoot, "scripts/content/submit-review.mjs"),
          targetVersion,
          "--review-id",
          "scoped-owner-review",
          "--role",
          "content-owner",
          "--decision",
          "changes-requested",
          "--reviewer-id",
          "fixture-owner-reviewer",
          "--reviewed-at",
          "2026-07-26T06:05:00.000Z",
          "--evidence-ref",
          "fixture://scoped-owner-review",
          "--manifest-sha256",
          candidateManifestHash,
          "--scope-file",
          "content/drafts/fixture-review-scope.json",
          "--write",
        ],
        { cwd: fixtureRoot, encoding: "utf8" },
      );
      expect(
        JSON.parse(readFileSync(reviewsPath, "utf8")),
      ).toMatchObject({
        reviews: [
          {
            reviewId: "scoped-owner-review",
            scope: {
              itemKeys: ["lexeme:ni"],
              audioAssetIds: [],
            },
          },
        ],
      });
      writeFileSync(
        reviewScopePath,
        `${JSON.stringify({
          itemKeys: ["lexeme:unknown"],
          audioAssetIds: [],
        }, null, 2)}\n`,
      );
      const reviewsBeforeInvalidScope = readFileSync(reviewsPath, "utf8");
      const invalidScopeReview = spawnSync(
        process.execPath,
        [
          join(fixtureRoot, "scripts/content/submit-review.mjs"),
          targetVersion,
          "--review-id",
          "invalid-scope-review",
          "--role",
          "content-owner",
          "--decision",
          "approved",
          "--reviewer-id",
          "fixture-owner-reviewer",
          "--reviewed-at",
          "2026-07-26T06:06:00.000Z",
          "--evidence-ref",
          "fixture://invalid-scope",
          "--manifest-sha256",
          candidateManifestHash,
          "--scope-file",
          "content/drafts/fixture-review-scope.json",
          "--write",
        ],
        { cwd: fixtureRoot, encoding: "utf8" },
      );
      expect(invalidScopeReview.status).toBe(2);
      expect(invalidScopeReview.stderr).toContain(
        "references unknown item lexeme:unknown",
      );
      expect(readFileSync(reviewsPath, "utf8")).toBe(
        reviewsBeforeInvalidScope,
      );

      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        lifecycle: string;
      };
      manifest.lifecycle = "published";
      const manifestHash = await sha256Json(manifest);
      const publishedRegistry = JSON.parse(
        readFileSync(registryPath, "utf8"),
      ) as {
        packages: Array<{
          contentVersion: string;
          lifecycle: string;
          manifestSha256: string;
        }>;
      };
      const publishedEntry = publishedRegistry.packages.find(
        (entry) => entry.contentVersion === targetVersion,
      );
      if (!publishedEntry) throw new Error("Fixture registry entry is missing");
      publishedEntry.lifecycle = "published";
      publishedEntry.manifestSha256 = manifestHash;
      const reviewEnvelope = JSON.parse(
        readFileSync(reviewsPath, "utf8"),
      ) as {
        packageManifestSha256: string;
        reviews: unknown[];
      };
      reviewEnvelope.packageManifestSha256 = manifestHash;
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
      writeFileSync(
        registryPath,
        `${JSON.stringify(publishedRegistry, null, 2)}\n`,
      );
      writeFileSync(
        reviewsPath,
        `${JSON.stringify(reviewEnvelope, null, 2)}\n`,
      );
      const reviewsBeforeRejectedAppend = readFileSync(reviewsPath, "utf8");

      const rejectedReview = spawnSync(
        process.execPath,
        [
          join(fixtureRoot, "scripts/content/submit-review.mjs"),
          targetVersion,
          "--review-id",
          "review-after-publish",
          "--role",
          "native-linguistic",
          "--decision",
          "changes-requested",
          "--reviewer-id",
          "fixture-reviewer",
          "--reviewed-at",
          "2026-08-01T01:00:00.000Z",
          "--evidence-ref",
          "fixture://review",
          "--manifest-sha256",
          manifestHash,
          "--write",
        ],
        { cwd: fixtureRoot, encoding: "utf8" },
      );
      expect(rejectedReview.status).toBe(2);
      expect(rejectedReview.stderr).toContain(
        "Reviews may only be appended to a candidate package",
      );
      expect(readFileSync(reviewsPath, "utf8")).toBe(
        reviewsBeforeRejectedAppend,
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("creates a schema-v4 candidate with a sanitized runtime catalog and rejects mismatched handoffs without mutation", async () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "hanzi-content-v4-command-"));
    try {
      [
        "scripts/content/lib.mjs",
        "scripts/content/new-version.mjs",
        "src/content/governance.mjs",
        "src/content/editorialReadiness.mjs",
        "src/content/audioInspection.mjs",
        "src/content/characterDataInspection.mjs",
        "content/registry.json",
        "config/production-readiness.json",
        ...sourceArtifactNamesV4,
      ].forEach((path) => copyFixtureFile(fixtureRoot, path));
      for (const version of [
        "foundation-2026.07.1",
        "foundation-2026.07.2",
        "foundation-2026.07.3",
        "foundation-2026.07.4",
        "foundation-2026.07.5",
      ]) {
        cpSync(
          join(repositoryRoot, `content/packages/${version}`),
          join(fixtureRoot, `content/packages/${version}`),
          { recursive: true },
        );
      }

      const targetVersion = "fixture-2026.08.2";
      const registryPath = join(fixtureRoot, "content/registry.json");
      const fixtureRegistry = JSON.parse(
        readFileSync(registryPath, "utf8"),
      ) as {
        currentContentVersion: string;
        packages: Array<{ contentVersion: string }>;
      };
      fixtureRegistry.currentContentVersion = "foundation-2026.07.5";
      fixtureRegistry.packages = fixtureRegistry.packages.filter(
        ({ contentVersion }) => contentVersion !== "foundation-2026.07.6",
      );
      writeFileSync(
        registryPath,
        `${JSON.stringify(fixtureRegistry, null, 2)}\n`,
      );
      const readinessPath = join(
        fixtureRoot,
        "config/production-readiness.json",
      );
      const readiness = JSON.parse(readFileSync(readinessPath, "utf8")) as {
        contentVersion: string;
      };
      readiness.contentVersion = targetVersion;
      writeFileSync(readinessPath, `${JSON.stringify(readiness, null, 2)}\n`);

      const curriculumPath = join(fixtureRoot, "src/data/curriculum.ts");
      writeFileSync(
        curriculumPath,
        [
          `import itemCatalogJson from "../../content/packages/${targetVersion}/item-catalog.json";`,
          `export const CONTENT_VERSION = "${targetVersion}";`,
          "void itemCatalogJson;",
          "",
        ].join("\n"),
      );

      const catalogInputPath = join(
        fixtureRoot,
        "content/drafts/fixture-v4-item-catalog.json",
      );
      mkdirSync(dirname(catalogInputPath), { recursive: true });
      const catalogInput = JSON.parse(
        readFileSync(
          join(
            fixtureRoot,
            "content/packages/foundation-2026.07.4/item-catalog.json",
          ),
          "utf8",
        ),
      ) as {
        schemaVersion: number;
        contentVersion: string;
        items: Array<{
          itemId: string;
          itemType: string;
          itemVersion: string;
          payload: { wordIds?: string[] };
          knowledgeItems?: Array<{ itemType: string; itemId: string }>;
        }>;
      };
      catalogInput.schemaVersion = 2;
      catalogInput.contentVersion = targetVersion;
      catalogInput.items.forEach((item) => {
        item.itemVersion = targetVersion;
        if (item.itemType === "lesson") {
          item.knowledgeItems = (item.payload.wordIds ?? []).map((itemId) => ({
            itemType: "lexeme",
            itemId,
          }));
        }
      });
      const grammarPayload = {
        concept: "Fixture grammar concept",
        rule: "Fixture-only rule",
        examples: [
          {
            chinese: "测试",
            pinyin: "cèshì",
            meaning: "fixture test",
          },
        ],
        pitfall: "Fixture-only pitfall",
        checkpoint: "Fixture-only checkpoint",
        sourceLessonIds: ["boot-1"],
      };
      catalogInput.items.push({
        itemKey: "grammar:fixture-grammar",
        itemType: "grammar",
        itemId: "fixture-grammar",
        itemVersion: targetVersion,
        releaseState: "review",
        payload: grammarPayload,
        payloadSha256: await sha256Json({
          itemType: "grammar",
          payload: grammarPayload,
        }),
        owner: null,
        sourceLicense: null,
        prerequisites: [],
      } as never);
      const sourceLesson = catalogInput.items.find(
        (item) => item.itemType === "lesson" && item.itemId === "boot-1",
      );
      if (!sourceLesson?.knowledgeItems) {
        throw new Error("Schema-v4 source lesson fixture is missing");
      }
      sourceLesson.knowledgeItems.push({
        itemType: "grammar",
        itemId: "fixture-grammar",
      });
      writeFileSync(
        catalogInputPath,
        `${JSON.stringify(catalogInput, null, 2)}\n`,
      );

      const newVersionArguments = [
        join(fixtureRoot, "scripts/content/new-version.mjs"),
        targetVersion,
        "--from",
        "foundation-2026.07.5",
        "--created-at",
        "2026-08-02T00:00:00.000Z",
        "--audience",
        "closed-alpha",
        "--content-schema-version",
        "4",
        "--item-catalog-file",
        "content/drafts/fixture-v4-item-catalog.json",
        "--confirm-runtime-ids-unchanged",
        "true",
        "--write",
      ];
      const registryBeforeRejectedHandoff = readFileSync(registryPath, "utf8");
      const rejectedHandoff = spawnSync(
        process.execPath,
        newVersionArguments,
        { cwd: fixtureRoot, encoding: "utf8" },
      );
      expect(rejectedHandoff.status).toBe(2);
      expect(rejectedHandoff.stderr).toContain(
        `Bind src/data/curriculum.ts to content/packages/${targetVersion}/runtime-catalog.json`,
      );
      expect(readFileSync(registryPath, "utf8")).toBe(
        registryBeforeRejectedHandoff,
      );
      expect(
        existsSync(join(fixtureRoot, `content/packages/${targetVersion}`)),
      ).toBe(false);

      writeFileSync(
        curriculumPath,
        [
          `import runtimeCatalogJson from "../../content/packages/${targetVersion}/runtime-catalog.json";`,
          `export const CONTENT_VERSION = "${targetVersion}";`,
          "void runtimeCatalogJson;",
          "",
        ].join("\n"),
      );
      catalogInput.schemaVersion = 1;
      writeFileSync(
        catalogInputPath,
        `${JSON.stringify(catalogInput, null, 2)}\n`,
      );
      const registryBeforeSchemaMismatch = readFileSync(registryPath, "utf8");
      const rejectedSchema = spawnSync(
        process.execPath,
        newVersionArguments,
        { cwd: fixtureRoot, encoding: "utf8" },
      );
      expect(rejectedSchema.status).toBe(2);
      expect(rejectedSchema.stderr).toContain(
        "Content schema v4 requires item-catalog.schemaVersion 2",
      );
      expect(readFileSync(registryPath, "utf8")).toBe(
        registryBeforeSchemaMismatch,
      );
      expect(
        existsSync(join(fixtureRoot, `content/packages/${targetVersion}`)),
      ).toBe(false);

      catalogInput.schemaVersion = 2;
      writeFileSync(
        catalogInputPath,
        `${JSON.stringify(catalogInput, null, 2)}\n`,
      );
      execFileSync(process.execPath, newVersionArguments, {
        cwd: fixtureRoot,
        encoding: "utf8",
      });

      const packageDirectory = join(
        fixtureRoot,
        `content/packages/${targetVersion}`,
      );
      const runtimeCatalog = JSON.parse(
        readFileSync(join(packageDirectory, "runtime-catalog.json"), "utf8"),
      ) as {
        schemaVersion: number;
        contentVersion: string;
        vocabulary: Array<Record<string, unknown>>;
        lessons: Array<Record<string, unknown>>;
        stories: Array<Record<string, unknown>>;
      };
      expect(runtimeCatalog).toMatchObject({
        schemaVersion: 1,
        contentVersion: targetVersion,
        vocabulary: expect.any(Array),
        lessons: expect.any(Array),
        stories: expect.any(Array),
      });
      expect(runtimeCatalog.vocabulary.length).toBeGreaterThan(0);
      expect(runtimeCatalog.lessons.length).toBeGreaterThan(0);
      expect(runtimeCatalog.stories.length).toBeGreaterThan(0);
      for (const entry of [
        ...runtimeCatalog.vocabulary,
        ...runtimeCatalog.lessons,
        ...runtimeCatalog.stories,
      ]) {
        expect(entry).not.toHaveProperty("owner");
        expect(entry).not.toHaveProperty("sourceLicense");
        expect(entry).not.toHaveProperty("payloadSha256");
        expect(entry).not.toHaveProperty("evidenceRef");
      }
      expect(JSON.stringify(runtimeCatalog)).not.toContain("fixture-grammar");

      const manifest = JSON.parse(
        readFileSync(join(packageDirectory, "manifest.json"), "utf8"),
      ) as { artifacts: Record<string, string> };
      expect(manifest.artifacts["runtime-catalog.json"]).toBe(
        await sha256Json(runtimeCatalog),
      );
      expect(manifest.artifacts["src/data/knowledgeItemBlueprints.ts"]).toMatch(
        /^sha256:[a-f0-9]{64}$/u,
      );
      sourceArtifactNamesV4.forEach((artifactName) => {
        expect(
          readFileSync(
            join(packageDirectory, "snapshots", artifactName),
            "utf8",
          ),
        ).toBe(readFileSync(join(fixtureRoot, artifactName), "utf8"));
      });
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("imports canonical audio deterministically, sanitizes runtime output, and detects byte tampering", async () => {
    const fixture = createAudioCommandFixture();
    try {
      const imported = spawnSync(process.execPath, fixture.args, {
        cwd: fixture.fixtureRoot,
        encoding: "utf8",
      });
      expect(imported.status, imported.stderr).toBe(0);
      expect(imported.stdout).toContain(
        "approvals and coverage claims were intentionally cleared",
      );
      const packageDirectory = join(
        fixture.fixtureRoot,
        `content/packages/${fixture.targetVersion}`,
      );
      const catalog = JSON.parse(
        readFileSync(join(packageDirectory, "item-catalog.json"), "utf8"),
      ) as {
        schemaVersion: number;
        audioAssets: Array<{
          assetId: string;
          fileRef: string;
          fileSha256: string;
          transcriptSha256: string;
          targetPayloadSha256: string;
          media: Record<string, unknown>;
          alignment: { targetTextSha256: string };
        }>;
      };
      expect(catalog.schemaVersion).toBe(3);
      expect(catalog.audioAssets.map((asset) => asset.assetId)).toEqual([
        "hao-audio",
        "ni-audio",
      ]);
      expect(catalog.audioAssets[0]).toMatchObject({
        fileRef: "audio/hao-audio.wav",
        fileSha256: sha256Bytes(fixture.wave),
        media: {
          container: "wav",
          codec: "pcm-s16le",
          sampleRateHz: 16_000,
          channels: 1,
          bitDepth: 16,
          frameCount: 8_000,
          durationMs: 500,
          byteLength: fixture.wave.length,
        },
      });
      expect(catalog.audioAssets[0].alignment.targetTextSha256).toBe(
        catalog.audioAssets[0].transcriptSha256,
      );
      expect(catalog.audioAssets.every(
        (asset) => /^sha256:[a-f0-9]{64}$/u.test(asset.targetPayloadSha256),
      )).toBe(true);
      const runtimeCatalogText = readFileSync(
        join(packageDirectory, "runtime-catalog.json"),
        "utf8",
      );
      expect(runtimeCatalogText).not.toContain("audioAssets");
      expect(runtimeCatalogText).not.toContain("fixture://audio-rights");
      const manifest = JSON.parse(
        readFileSync(join(packageDirectory, "manifest.json"), "utf8"),
      ) as {
        contentSchemaVersion: number;
        governance: { includesAudio: boolean };
        artifacts: Record<string, string>;
      };
      expect(manifest).toMatchObject({
        contentSchemaVersion: 5,
        governance: { includesAudio: true },
      });
      expect(manifest.artifacts["item-catalog.json"]).toBe(
        await sha256Json(catalog),
      );
      const validateArguments = [
        join(fixture.fixtureRoot, "scripts/content/validate.mjs"),
        fixture.targetVersion,
      ];
      expect(spawnSync(process.execPath, validateArguments, {
        cwd: fixture.fixtureRoot,
        encoding: "utf8",
      }).status).toBe(0);

      const audioPath = join(packageDirectory, "audio/hao-audio.wav");
      const tampered = Buffer.from(readFileSync(audioPath));
      tampered[tampered.length - 1] = 1;
      writeFileSync(audioPath, tampered);
      const rejectedTamper = spawnSync(process.execPath, validateArguments, {
        cwd: fixture.fixtureRoot,
        encoding: "utf8",
      });
      expect(rejectedTamper.status).toBe(1);
      expect(rejectedTamper.stdout).toContain(
        "fileSha256 does not match package bytes",
      );
    } finally {
      rmSync(fixture.fixtureRoot, { recursive: true, force: true });
    }
  });

  it("imports source-addressed character metadata and detects immutable record tampering", () => {
    const fixture = createCharacterCommandFixture();
    try {
      const imported = spawnSync(process.execPath, fixture.args, {
        cwd: fixture.fixtureRoot,
        encoding: "utf8",
      });
      expect(imported.status, imported.stderr).toBe(0);
      expect(imported.stdout).toContain(
        "approvals and coverage claims were intentionally cleared",
      );
      const packageDirectory = join(
        fixture.fixtureRoot,
        `content/packages/${fixture.targetVersion}`,
      );
      const manifest = JSON.parse(readFileSync(
        join(packageDirectory, "manifest.json"),
        "utf8",
      )) as { contentSchemaVersion: number; governance: { includesAudio: boolean } };
      expect(manifest).toMatchObject({
        contentSchemaVersion: 6,
        governance: { includesAudio: false },
      });
      const catalog = JSON.parse(readFileSync(
        join(packageDirectory, "item-catalog.json"),
        "utf8",
      )) as {
        schemaVersion: number;
        audioAssets: unknown[];
        items: Array<{
          itemType: string;
          itemId: string;
          releaseState: string;
          payload: Record<string, unknown> & {
            analysis?: {
              schemaVersion: number;
              decompositionKind: string;
              sources: Array<{
                sourceId: string;
                kind: string;
                recordRef: string;
                recordSha256: string;
              }>;
            };
            strokeCount?: number;
            strokeData?: {
              format: string;
              fileRef: string;
              fileSha256: string;
              sourceId: string;
            };
          };
        }>;
      };
      expect(catalog.schemaVersion).toBe(4);
      expect(catalog.audioAssets).toEqual([]);
      const characterItems = catalog.items.filter(
        (item) => item.itemType === "character",
      );
      expect(characterItems).toHaveLength(fixture.descriptor.characters.length);
      characterItems.forEach((item) => {
        expect(item.releaseState).toBe("review");
        expect(item.payload).not.toHaveProperty("radical");
        expect(item.payload).not.toHaveProperty("components");
        expect(item.payload).not.toHaveProperty("structure");
        expect(item.payload).not.toHaveProperty("strokeDataRef");
        expect(item.payload).toMatchObject({
          analysis: {
            schemaVersion: 1,
            decompositionKind: "independent",
          },
          strokeCount: 1,
          strokeData: {
            format: "hanzi-writer-v1",
            fileRef: `stroke-data/${item.itemId}.json`,
            sourceId: "stroke-fixture",
          },
        });
        expect(readFileSync(
          join(packageDirectory, `stroke-data/${item.itemId}.json`),
        )).toEqual(fixture.strokeBytes);
        expect(item.payload.analysis?.sources.map((source) => source.sourceId))
          .toEqual(["linguistic-fixture", "stroke-fixture"]);
      });
      expect(JSON.parse(readFileSync(
        join(packageDirectory, "coverage-claims.json"),
        "utf8",
      ))).toMatchObject({ coverageClaims: [] });
      expect(JSON.parse(readFileSync(
        join(packageDirectory, "reviews.json"),
        "utf8",
      ))).toMatchObject({ reviews: [] });
      const runtimeCatalogText = readFileSync(
        join(packageDirectory, "runtime-catalog.json"),
        "utf8",
      );
      expect(runtimeCatalogText).not.toContain("linguistic-fixture");
      expect(runtimeCatalogText).not.toContain("stroke-data/");
      const validateArguments = [
        join(fixture.fixtureRoot, "scripts/content/validate.mjs"),
        fixture.targetVersion,
      ];
      const validation = spawnSync(process.execPath, validateArguments, {
        cwd: fixture.fixtureRoot,
        encoding: "utf8",
      });
      expect(validation.status, validation.stdout).toBe(0);

      const firstLinguisticSource = characterItems[0]?.payload.analysis?.sources
        .find((source) => source.kind === "linguistic-reference");
      if (!firstLinguisticSource) throw new Error("Fixture source is missing");
      writeFileSync(
        join(packageDirectory, ...firstLinguisticSource.recordRef.split("/")),
        "{}",
      );
      const rejectedTamper = spawnSync(process.execPath, validateArguments, {
        cwd: fixture.fixtureRoot,
        encoding: "utf8",
      });
      expect(rejectedTamper.status).toBe(1);
      expect(rejectedTamper.stdout).toContain(
        "recordSha256 does not match package bytes",
      );
    } finally {
      rmSync(fixture.fixtureRoot, { recursive: true, force: true });
    }
  });

  it("preserves catalog-v4 character and canonical audio artifacts across schema-v6 lifecycle mutations", async () => {
    const fixture = createCharacterCommandFixture();
    type LifecycleCatalog = {
      schemaVersion: number;
      contentVersion: string;
      audioAssets: Array<{
        assetId: string;
        targetItemKey: string;
        targetPayloadSha256: string;
        fileRef: string;
        fileSha256: string;
        rights: {
          ownerId: string;
          licenseId: string;
          evidenceRef: string;
        };
      }>;
      items: Array<{
        itemKey: string;
        itemType: string;
        itemId: string;
        itemVersion: string;
        payloadSha256: string;
        payload: {
          character?: string;
          simplified?: string;
          meaning?: string;
          analysis?: {
            radical: { glyph: string };
            sources: Array<{ recordRef: string }>;
          };
        };
      }>;
    };
    const rebindCatalog = (
      source: LifecycleCatalog,
      contentVersion: string,
    ): LifecycleCatalog => ({
      ...structuredClone(source),
      contentVersion,
      items: source.items.map((item) => ({
        ...structuredClone(item),
        itemVersion: contentVersion,
      })),
    });
    const bindRuntime = (
      fromVersion: string,
      toVersion: string,
    ) => {
      const readinessPath = join(
        fixture.fixtureRoot,
        "config/production-readiness.json",
      );
      const readiness = JSON.parse(
        readFileSync(readinessPath, "utf8"),
      ) as { contentVersion: string };
      readiness.contentVersion = toVersion;
      writeFileSync(
        readinessPath,
        `${JSON.stringify(readiness, null, 2)}\n`,
      );
      const curriculumPath = join(
        fixture.fixtureRoot,
        "src/data/curriculum.ts",
      );
      writeFileSync(
        curriculumPath,
        readFileSync(curriculumPath, "utf8").replaceAll(
          fromVersion,
          toVersion,
        ),
      );
    };
    const writeDraft = (name: string, value: unknown) => {
      const path = join(fixture.fixtureRoot, "content/drafts", name);
      writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
      return `content/drafts/${name}`;
    };
    const packageCatalog = (contentVersion: string) =>
      JSON.parse(readFileSync(join(
        fixture.fixtureRoot,
        `content/packages/${contentVersion}/item-catalog.json`,
      ), "utf8")) as LifecycleCatalog;
    const packageManifest = (contentVersion: string) =>
      JSON.parse(readFileSync(join(
        fixture.fixtureRoot,
        `content/packages/${contentVersion}/manifest.json`,
      ), "utf8")) as {
        governance: {
          includesAudio: boolean;
          audioRights: {
            ownerId: string;
            licenseId: string;
            evidenceRef: string;
          } | null;
        };
      };
    const assertCharacterArtifactsEqual = (
      leftVersion: string,
      rightVersion: string,
      catalog: LifecycleCatalog,
    ) => {
      catalog.items
        .filter((item) => item.itemType === "character")
        .flatMap((item) =>
          item.payload.analysis?.sources.map((source) => source.recordRef) ?? []
        )
        .forEach((recordRef) => {
          expect(readFileSync(join(
            fixture.fixtureRoot,
            `content/packages/${rightVersion}`,
            ...recordRef.split("/"),
          ))).toEqual(readFileSync(join(
            fixture.fixtureRoot,
            `content/packages/${leftVersion}`,
            ...recordRef.split("/"),
          )));
        });
    };

    try {
      copyFixtureFile(fixture.fixtureRoot, "scripts/content/import-audio.mjs");
      copyFixtureFile(fixture.fixtureRoot, "scripts/content/new-version.mjs");
      const characterImport = spawnSync(process.execPath, fixture.args, {
        cwd: fixture.fixtureRoot,
        encoding: "utf8",
      });
      expect(characterImport.status, characterImport.stderr).toBe(0);
      const characterVersion = fixture.targetVersion;
      const characterCatalog = packageCatalog(characterVersion);

      const audioVersion = "fixture-2026.08.5";
      bindRuntime(characterVersion, audioVersion);
      const audioBaseCatalog = rebindCatalog(
        characterCatalog,
        audioVersion,
      );
      const audioCatalogRef = writeDraft(
        "schema-v6-audio-catalog.json",
        audioBaseCatalog,
      );
      const wave = makeCanonicalWave();
      const wavePath = join(
        fixture.fixtureRoot,
        "content/drafts/schema-v6-ni.wav",
      );
      writeFileSync(wavePath, wave);
      const audioTarget = audioBaseCatalog.items.find(
        (item) => item.itemType === "character",
      );
      if (!audioTarget?.payload.character) {
        throw new Error("Schema-v6 audio target is missing");
      }
      const audioDescriptorRef = writeDraft(
        "schema-v6-audio-descriptor.json",
        {
          schemaVersion: 1,
          contentVersion: audioVersion,
          assets: [{
            assetId: "schema-v6-ni",
            targetItemKey: audioTarget.itemKey,
            sourceFile: "content/drafts/schema-v6-ni.wav",
            expectedFileSha256: sha256Bytes(wave),
            transcript: audioTarget.payload.character,
            segments: [{
              startMs: 0,
              endMs: 500,
              text: audioTarget.payload.character,
            }],
            speaker: {
              id: "native-speaker-v6",
              nativeSpeakerEvidenceRef: "fixture://speaker/native-v6",
            },
            rights: {
              ownerId: "fixture-audio-owner",
              licenseId: "fixture-audio-license",
              evidenceRef: "fixture://audio-rights",
            },
          }],
        },
      );
      const audioImport = spawnSync(
        process.execPath,
        [
          join(fixture.fixtureRoot, "scripts/content/import-audio.mjs"),
          audioVersion,
          "--from", characterVersion,
          "--created-at", "2026-08-05T00:00:00.000Z",
          "--audience", "closed-alpha",
          "--content-schema-version", "6",
          "--item-catalog-file", audioCatalogRef,
          "--audio-descriptor-file", audioDescriptorRef,
          "--audio-owner-id", "fixture-audio-owner",
          "--audio-license-id", "fixture-audio-license",
          "--audio-evidence", "fixture://audio-rights",
          "--confirm-runtime-ids-unchanged", "true",
          "--write",
        ],
        { cwd: fixture.fixtureRoot, encoding: "utf8" },
      );
      expect(audioImport.status, audioImport.stderr).toBe(0);
      const audioCatalog = packageCatalog(audioVersion);
      expect(audioCatalog).toMatchObject({
        schemaVersion: 4,
        audioAssets: [{ assetId: "schema-v6-ni" }],
      });
      expect(
        audioCatalog.items
          .filter((item) => item.itemType === "character")
          .map((item) => [item.itemKey, item.payloadSha256]),
      ).toEqual(
        characterCatalog.items
          .filter((item) => item.itemType === "character")
          .map((item) => [item.itemKey, item.payloadSha256]),
      );
      assertCharacterArtifactsEqual(
        characterVersion,
        audioVersion,
        audioCatalog,
      );

      const routineVersion = "fixture-2026.08.6";
      bindRuntime(audioVersion, routineVersion);
      const routineCatalog = rebindCatalog(audioCatalog, routineVersion);
      const routineAudioAsset = routineCatalog.audioAssets.find(
        (asset) => asset.assetId === "schema-v6-ni",
      );
      const routineAudioTarget = routineCatalog.items.find(
        (item) => item.itemKey === routineAudioAsset?.targetItemKey,
      );
      if (!routineAudioAsset || !routineAudioTarget?.payload.meaning) {
        throw new Error("Routine audio-bound character is missing");
      }
      routineAudioTarget.payload.meaning =
        `${routineAudioTarget.payload.meaning} (editorial update)`;
      routineAudioTarget.payloadSha256 = await sha256Json({
        itemType: routineAudioTarget.itemType,
        payload: routineAudioTarget.payload,
      });
      routineAudioAsset.targetPayloadSha256 =
        routineAudioTarget.payloadSha256;
      const routineCatalogRef = writeDraft(
        "schema-v6-routine-catalog.json",
        routineCatalog,
      );
      const rejectedCatalog = structuredClone(routineCatalog);
      const rejectedCharacter = rejectedCatalog.items.find(
        (item) => item.itemType === "character",
      );
      if (!rejectedCharacter?.payload.analysis) {
        throw new Error("Schema-v6 character payload is missing");
      }
      rejectedCharacter.payload.analysis.radical.glyph = "X";
      writeDraft("schema-v6-routine-catalog.json", rejectedCatalog);
      const newVersionArgs = [
        join(fixture.fixtureRoot, "scripts/content/new-version.mjs"),
        routineVersion,
        "--from", audioVersion,
        "--created-at", "2026-08-06T00:00:00.000Z",
        "--audience", "closed-alpha",
        "--content-schema-version", "6",
        "--item-catalog-file", routineCatalogRef,
        "--confirm-runtime-ids-unchanged", "true",
        "--write",
      ];
      const registryPath = join(
        fixture.fixtureRoot,
        "content/registry.json",
      );
      const registryBeforeRejectedCharacter = readFileSync(
        registryPath,
        "utf8",
      );
      const rejectedCharacterMutation = spawnSync(
        process.execPath,
        newVersionArgs,
        { cwd: fixture.fixtureRoot, encoding: "utf8" },
      );
      expect(rejectedCharacterMutation.status).toBe(2);
      expect(rejectedCharacterMutation.stderr).toContain(
        "must preserve source character artifacts",
      );
      expect(readFileSync(registryPath, "utf8")).toBe(
        registryBeforeRejectedCharacter,
      );
      expect(existsSync(join(
        fixture.fixtureRoot,
        `content/packages/${routineVersion}`,
      ))).toBe(false);

      writeDraft("schema-v6-routine-catalog.json", routineCatalog);
      const routineBranch = spawnSync(process.execPath, newVersionArgs, {
        cwd: fixture.fixtureRoot,
        encoding: "utf8",
      });
      expect(routineBranch.status, routineBranch.stderr).toBe(0);
      const branchedCatalog = packageCatalog(routineVersion);
      expect(branchedCatalog.audioAssets).toEqual(routineCatalog.audioAssets);
      expect(packageManifest(routineVersion).governance).toMatchObject({
        includesAudio: true,
        audioRights: {
          ownerId: "fixture-audio-owner",
          licenseId: "fixture-audio-license",
          evidenceRef: "fixture://audio-rights",
        },
      });
      expect(readFileSync(join(
        fixture.fixtureRoot,
        `content/packages/${routineVersion}/audio/schema-v6-ni.wav`,
      ))).toEqual(wave);
      assertCharacterArtifactsEqual(
        audioVersion,
        routineVersion,
        branchedCatalog,
      );

      const reimportVersion = "fixture-2026.08.7";
      bindRuntime(routineVersion, reimportVersion);
      const reimportBaseCatalog = rebindCatalog(
        branchedCatalog,
        reimportVersion,
      );
      const reimportCatalogRef = writeDraft(
        "schema-v6-character-reimport-catalog.json",
        {
          ...reimportBaseCatalog,
          audioAssets: [],
        },
      );
      const reimportDescriptor = structuredClone(fixture.descriptor);
      reimportDescriptor.contentVersion = reimportVersion;
      reimportDescriptor.characters.forEach((character) => {
        const target = reimportBaseCatalog.items.find(
          (item) => item.itemKey === character.targetItemKey,
        );
        if (!target) throw new Error("Character reimport target is missing");
        character.expectedTargetPayloadSha256 = target.payloadSha256;
      });
      const audioBoundCharacter = reimportDescriptor.characters.find(
        (character) =>
          character.targetItemKey
          === reimportBaseCatalog.audioAssets[0]?.targetItemKey,
      );
      if (!audioBoundCharacter) {
        throw new Error("Audio-bound character descriptor is missing");
      }
      audioBoundCharacter.radical.glyph = "丨";
      const reimportDescriptorRef = writeDraft(
        "schema-v6-character-reimport-descriptor.json",
        reimportDescriptor,
      );
      const reimportArgs = [
        join(
          fixture.fixtureRoot,
          "scripts/content/import-character-metadata.mjs",
        ),
        reimportVersion,
        "--from", routineVersion,
        "--created-at", "2026-08-07T00:00:00.000Z",
        "--audience", "closed-alpha",
        "--content-schema-version", "6",
        "--item-catalog-file", reimportCatalogRef,
        "--character-descriptor-file", reimportDescriptorRef,
        "--confirm-runtime-ids-unchanged", "true",
        "--write",
      ];
      const textChangedCatalog = structuredClone(reimportBaseCatalog);
      const textChangedCharacter = textChangedCatalog.items.find(
        (item) =>
          item.itemKey
          === reimportBaseCatalog.audioAssets[0]?.targetItemKey,
      );
      if (!textChangedCharacter?.payload.character) {
        throw new Error("Audio-bound character target is missing");
      }
      textChangedCharacter.payload.character = "X";
      textChangedCharacter.payloadSha256 = await sha256Json({
        itemType: textChangedCharacter.itemType,
        payload: textChangedCharacter.payload,
      });
      writeDraft(
        "schema-v6-character-reimport-catalog.json",
        textChangedCatalog,
      );
      const registryBeforeDroppedAudio = readFileSync(registryPath, "utf8");
      const rejectedTextChange = spawnSync(
        process.execPath,
        reimportArgs,
        { cwd: fixture.fixtureRoot, encoding: "utf8" },
      );
      expect(rejectedTextChange.status).toBe(2);
      expect(rejectedTextChange.stderr).toContain(
        "target text or payload changed; replace it through import-audio",
      );
      expect(readFileSync(registryPath, "utf8")).toBe(
        registryBeforeDroppedAudio,
      );
      expect(existsSync(join(
        fixture.fixtureRoot,
        `content/packages/${reimportVersion}`,
      ))).toBe(false);

      writeDraft(
        "schema-v6-character-reimport-catalog.json",
        {
          ...reimportBaseCatalog,
          audioAssets: [],
        },
      );
      const rejectedDroppedAudio = spawnSync(
        process.execPath,
        reimportArgs,
        { cwd: fixture.fixtureRoot, encoding: "utf8" },
      );
      expect(rejectedDroppedAudio.status).toBe(2);
      expect(rejectedDroppedAudio.stderr).toContain(
        "must preserve source audio asset schema-v6-ni bytes and evidence",
      );
      expect(readFileSync(registryPath, "utf8")).toBe(
        registryBeforeDroppedAudio,
      );
      expect(existsSync(join(
        fixture.fixtureRoot,
        `content/packages/${reimportVersion}`,
      ))).toBe(false);

      writeDraft(
        "schema-v6-character-reimport-catalog.json",
        reimportBaseCatalog,
      );
      const characterReimport = spawnSync(
        process.execPath,
        reimportArgs,
        { cwd: fixture.fixtureRoot, encoding: "utf8" },
      );
      expect(characterReimport.status, characterReimport.stderr).toBe(0);
      const reimportedCatalog = packageCatalog(reimportVersion);
      expect(reimportedCatalog.audioAssets).toHaveLength(
        branchedCatalog.audioAssets.length,
      );
      expect(reimportedCatalog.audioAssets[0]).toMatchObject({
        assetId: branchedCatalog.audioAssets[0]?.assetId,
        fileRef: branchedCatalog.audioAssets[0]?.fileRef,
        fileSha256: branchedCatalog.audioAssets[0]?.fileSha256,
        rights: branchedCatalog.audioAssets[0]?.rights,
      });
      expect(readFileSync(join(
        fixture.fixtureRoot,
        `content/packages/${reimportVersion}/audio/schema-v6-ni.wav`,
      ))).toEqual(wave);
      expect(packageManifest(reimportVersion).governance.audioRights).toEqual(
        packageManifest(routineVersion).governance.audioRights,
      );
      const reimportedAudioAsset = reimportedCatalog.audioAssets.find(
        (asset) => asset.assetId === "schema-v6-ni",
      );
      const reimportedAudioTarget = reimportedCatalog.items.find(
        (item) => item.itemKey === reimportedAudioAsset?.targetItemKey,
      );
      const previousAudioAsset = branchedCatalog.audioAssets.find(
        (asset) => asset.assetId === "schema-v6-ni",
      );
      expect(reimportedAudioAsset?.targetPayloadSha256).toBe(
        reimportedAudioTarget?.payloadSha256,
      );
      expect(reimportedAudioAsset?.targetPayloadSha256).not.toBe(
        previousAudioAsset?.targetPayloadSha256,
      );
      const finalValidation = spawnSync(
        process.execPath,
        [
          join(fixture.fixtureRoot, "scripts/content/validate.mjs"),
          reimportVersion,
        ],
        { cwd: fixture.fixtureRoot, encoding: "utf8" },
      );
      expect(finalValidation.status, finalValidation.stdout).toBe(0);
    } finally {
      rmSync(fixture.fixtureRoot, { recursive: true, force: true });
    }
  }, 120_000);

  it("keeps character package and registry writes atomic on untrusted import failures", () => {
    const fixture = createCharacterCommandFixture();
    try {
      const registryPath = join(fixture.fixtureRoot, "content/registry.json");
      const registryBefore = readFileSync(registryPath, "utf8");
      const corruptStroke = Buffer.from(JSON.stringify({ strokes: ["M 0 0"] }));
      writeFileSync(
        join(fixture.fixtureRoot, "content/drafts/corrupt-character-stroke.json"),
        corruptStroke,
      );
      const invalidLinguistic = Buffer.from("{}");
      writeFileSync(
        join(
          fixture.fixtureRoot,
          "content/drafts/invalid-character-linguistic.json",
        ),
        invalidLinguistic,
      );
      const linkedSourceDirectory = join(
        fixture.fixtureRoot,
        "content/drafts/linked-character-source-target",
      );
      mkdirSync(linkedSourceDirectory);
      const linkedSourceBytes = Buffer.from("{\"fixture\":true}");
      writeFileSync(join(linkedSourceDirectory, "source.json"), linkedSourceBytes);
      const linkedSourcePath = join(
        fixture.fixtureRoot,
        "content/drafts/linked-character-source",
      );
      let canCreateSymlink = true;
      try {
        symlinkSync(
          linkedSourceDirectory,
          linkedSourcePath,
          process.platform === "win32" ? "junction" : "dir",
        );
      } catch (error) {
        if (
          error instanceof Error
          && "code" in error
          && ["EPERM", "EACCES"].includes(String(error.code))
        ) {
          canCreateSymlink = false;
        } else {
          throw error;
        }
      }
      const cases: Array<[
        string,
        (descriptor: typeof fixture.descriptor) => void,
        string,
      ]> = [
        ["target digest", (descriptor) => {
          descriptor.characters[0].expectedTargetPayloadSha256 =
            `sha256:${"0".repeat(64)}`;
        }, "expectedTargetPayloadSha256 does not match the target item"],
        ["traversal", (descriptor) => {
          descriptor.characters[0].sources[0].sourceFile = "../outside.json";
        }, "must not contain empty or traversal segments"],
        ["stroke inspection", (descriptor) => {
          const source = descriptor.characters[0].sources[1];
          source.sourceFile = "content/drafts/corrupt-character-stroke.json";
          source.expectedFileSha256 = sha256Bytes(corruptStroke);
        }, "is not canonical Hanzi Writer data"],
        ["linguistic inspection", (descriptor) => {
          const source = descriptor.characters[0].sources[0];
          source.sourceFile =
            "content/drafts/invalid-character-linguistic.json";
          source.expectedFileSha256 = sha256Bytes(invalidLinguistic);
        }, "is not a canonical linguistic JSON record"],
        ["record key", (descriptor) => {
          descriptor.characters[0].sources[0].recordKey = "二";
        }, "recordKey must match the target character"],
        ["missing coverage", (descriptor) => {
          descriptor.characters.pop();
        }, "character descriptor must cover every character item"],
      ];
      if (canCreateSymlink) {
        cases.push(["symlink", (descriptor) => {
          const source = descriptor.characters[0].sources[0];
          source.sourceFile = "content/drafts/linked-character-source/source.json";
          source.expectedFileSha256 = sha256Bytes(linkedSourceBytes);
        }, "must not contain symlinks or junctions"]);
      }
      for (const [_label, mutate, expectedError] of cases) {
        const descriptor = structuredClone(fixture.descriptor);
        mutate(descriptor);
        writeFileSync(
          fixture.descriptorPath,
          `${JSON.stringify(descriptor, null, 2)}\n`,
        );
        const rejected = spawnSync(process.execPath, fixture.args, {
          cwd: fixture.fixtureRoot,
          encoding: "utf8",
        });
        expect(rejected.status).toBe(2);
        expect(rejected.stderr).toContain(expectedError);
        expect(readFileSync(registryPath, "utf8")).toBe(registryBefore);
        expect(existsSync(join(
          fixture.fixtureRoot,
          `content/packages/${fixture.targetVersion}`,
        ))).toBe(false);
        expect(existsSync(join(
          fixture.fixtureRoot,
          "content/.governance.lock",
        ))).toBe(false);
        expect(readdirSync(join(fixture.fixtureRoot, "content/packages")))
          .not.toContainEqual(expect.stringMatching(
            new RegExp(`^${fixture.targetVersion}(?:\\.|$)`, "u"),
          ));
      }
    } finally {
      rmSync(fixture.fixtureRoot, { recursive: true, force: true });
    }
  }, 60_000);

  it("removes a staged character package when final validation rejects catalog drift", () => {
    const fixture = createCharacterCommandFixture();
    try {
      const registryPath = join(fixture.fixtureRoot, "content/registry.json");
      const registryBefore = readFileSync(registryPath, "utf8");
      const catalog = JSON.parse(
        readFileSync(fixture.catalogPath, "utf8"),
      ) as {
        items: Array<{
          itemType: string;
          payload: Record<string, unknown>;
        }>;
      };
      const lexeme = catalog.items.find((item) => item.itemType === "lexeme");
      if (!lexeme) throw new Error("Fixture lexeme is missing");
      lexeme.payload.meaning = "";
      writeFileSync(
        fixture.catalogPath,
        `${JSON.stringify(catalog, null, 2)}\n`,
      );

      const rejected = spawnSync(process.execPath, fixture.args, {
        cwd: fixture.fixtureRoot,
        encoding: "utf8",
      });

      expect(rejected.status).toBe(2);
      expect(rejected.stderr).toContain(
        "Generated staged candidate is invalid",
      );
      expect(readFileSync(registryPath, "utf8")).toBe(registryBefore);
      expect(existsSync(join(
        fixture.fixtureRoot,
        `content/packages/${fixture.targetVersion}`,
      ))).toBe(false);
      expect(readdirSync(join(fixture.fixtureRoot, "content/packages")))
        .not.toContainEqual(expect.stringMatching(
          new RegExp(`^${fixture.targetVersion}(?:\\.|$)`, "u"),
        ));
      expect(existsSync(join(
        fixture.fixtureRoot,
        "content/.governance.lock",
      ))).toBe(false);
    } finally {
      rmSync(fixture.fixtureRoot, { recursive: true, force: true });
    }
  });

  it("retains only explicitly supplied coverage claims in the new audio envelope", async () => {
    const bootstrap = createAudioCommandFixture();
    const fixture = createAudioCommandFixture();
    try {
      const bootstrapImport = spawnSync(process.execPath, bootstrap.args, {
        cwd: bootstrap.fixtureRoot,
        encoding: "utf8",
      });
      expect(bootstrapImport.status, bootstrapImport.stderr).toBe(0);
      const importedCatalog = JSON.parse(readFileSync(join(
        bootstrap.fixtureRoot,
        `content/packages/${bootstrap.targetVersion}/item-catalog.json`,
      ), "utf8"));
      const suppliedClaim = {
        claimId: "fixture-audio-scope",
        framework: "fixture-framework",
        level: "A",
        evidenceRef: "fixture://coverage/audio-scope",
        itemKeys: ["lesson:boot-1"],
        entryLessonKeys: ["lesson:boot-1"],
        terminalLessonKeys: ["lesson:boot-1"],
      };
      const claimsPath = join(
        fixture.fixtureRoot,
        "content/drafts/audio-coverage-claims.json",
      );
      writeFileSync(claimsPath, `${JSON.stringify({
        schemaVersion: 2,
        contentVersion: "must-be-rebound",
        itemCatalogSha256: await sha256Json(importedCatalog),
        coverageClaims: [suppliedClaim],
      }, null, 2)}\n`);
      const args = [
        ...fixture.args.slice(0, -1),
        "--coverage-claims-file",
        "content/drafts/audio-coverage-claims.json",
        "--write",
      ];
      const imported = spawnSync(process.execPath, args, {
        cwd: fixture.fixtureRoot,
        encoding: "utf8",
      });
      expect(imported.status, imported.stderr).toBe(0);
      expect(imported.stdout).toContain(
        "approvals were intentionally cleared; supplied coverage claims were retained in the new candidate envelope",
      );
      expect(JSON.parse(readFileSync(join(
        fixture.fixtureRoot,
        `content/packages/${fixture.targetVersion}/coverage-claims.json`,
      ), "utf8"))).toEqual({
        schemaVersion: 2,
        contentVersion: fixture.targetVersion,
        itemCatalogSha256: await sha256Json(importedCatalog),
        coverageClaims: [suppliedClaim],
      });
    } finally {
      rmSync(bootstrap.fixtureRoot, { recursive: true, force: true });
      rmSync(fixture.fixtureRoot, { recursive: true, force: true });
    }
  });

  it("bounds aggregate captured audio bytes before staging or registry mutation", () => {
    const fixture = createAudioCommandFixture();
    try {
      const fixtureLibPath = join(
        fixture.fixtureRoot,
        "scripts/content/lib.mjs",
      );
      const fixtureLib = readFileSync(fixtureLibPath, "utf8");
      const boundedFixtureLib = fixtureLib.replace(
        "maxAggregateByteLength: 512 * 1024 * 1024",
        "maxAggregateByteLength: 20_000",
      );
      expect(boundedFixtureLib).not.toBe(fixtureLib);
      writeFileSync(fixtureLibPath, boundedFixtureLib);
      const registryPath = join(
        fixture.fixtureRoot,
        "content/registry.json",
      );
      const registryBefore = readFileSync(registryPath, "utf8");

      const rejected = spawnSync(process.execPath, fixture.args, {
        cwd: fixture.fixtureRoot,
        encoding: "utf8",
      });

      expect(rejected.status).toBe(2);
      expect(rejected.stderr).toContain(
        "combined inherited and imported audio bytes exceed the 20000-byte aggregate limit",
      );
      expect(readFileSync(registryPath, "utf8")).toBe(registryBefore);
      expect(existsSync(join(
        fixture.fixtureRoot,
        `content/packages/${fixture.targetVersion}`,
      ))).toBe(false);
      expect(existsSync(join(
        fixture.fixtureRoot,
        "content/.governance.lock",
      ))).toBe(false);
    } finally {
      rmSync(fixture.fixtureRoot, { recursive: true, force: true });
    }
  });

  it("allows full explicit audio replacement to rotate rights and rejects a partial rotation atomically", () => {
    const fixture = createAudioCommandFixture();
    try {
      const initialImport = spawnSync(process.execPath, fixture.args, {
        cwd: fixture.fixtureRoot,
        encoding: "utf8",
      });
      expect(initialImport.status, initialImport.stderr).toBe(0);
      const replacementVersion = "fixture-2026.08.9";
      const readinessPath = join(
        fixture.fixtureRoot,
        "config/production-readiness.json",
      );
      const readiness = JSON.parse(
        readFileSync(readinessPath, "utf8"),
      ) as { contentVersion: string };
      readiness.contentVersion = replacementVersion;
      writeFileSync(
        readinessPath,
        `${JSON.stringify(readiness, null, 2)}\n`,
      );
      const curriculumPath = join(
        fixture.fixtureRoot,
        "src/data/curriculum.ts",
      );
      writeFileSync(
        curriculumPath,
        readFileSync(curriculumPath, "utf8").replaceAll(
          fixture.targetVersion,
          replacementVersion,
        ),
      );
      const sourceCatalog = JSON.parse(readFileSync(join(
        fixture.fixtureRoot,
        `content/packages/${fixture.targetVersion}/item-catalog.json`,
      ), "utf8")) as {
        schemaVersion: number;
        contentVersion: string;
        items: Array<{ itemVersion: string }>;
        audioAssets: Array<{
          assetId: string;
          rights: {
            ownerId: string;
            licenseId: string;
            evidenceRef: string;
          };
        }>;
      };
      const replacementCatalog = {
        ...structuredClone(sourceCatalog),
        contentVersion: replacementVersion,
        items: sourceCatalog.items.map((item) => ({
          ...structuredClone(item),
          itemVersion: replacementVersion,
        })),
      };
      const catalogPath = join(
        fixture.fixtureRoot,
        "content/drafts/replacement-audio-catalog.json",
      );
      writeFileSync(
        catalogPath,
        `${JSON.stringify(replacementCatalog, null, 2)}\n`,
      );
      const replacementDescriptor = structuredClone(fixture.descriptor);
      replacementDescriptor.contentVersion = replacementVersion;
      replacementDescriptor.assets.forEach((asset) => {
        asset.rights = {
          ownerId: "replacement-owner",
          licenseId: "replacement-license",
          evidenceRef: "fixture://replacement-rights",
        };
      });
      const replacementDescriptorPath = join(
        fixture.fixtureRoot,
        "content/drafts/replacement-audio-descriptor.json",
      );
      const replacementArgs = [
        join(fixture.fixtureRoot, "scripts/content/import-audio.mjs"),
        replacementVersion,
        "--from", fixture.targetVersion,
        "--created-at", "2026-08-09T00:00:00.000Z",
        "--audience", "closed-alpha",
        "--content-schema-version", "5",
        "--item-catalog-file",
        "content/drafts/replacement-audio-catalog.json",
        "--audio-descriptor-file",
        "content/drafts/replacement-audio-descriptor.json",
        "--audio-owner-id", "replacement-owner",
        "--audio-license-id", "replacement-license",
        "--audio-evidence", "fixture://replacement-rights",
        "--confirm-runtime-ids-unchanged", "true",
        "--write",
      ];
      writeFileSync(
        replacementDescriptorPath,
        `${JSON.stringify({
          ...replacementDescriptor,
          assets: [replacementDescriptor.assets[0]],
        }, null, 2)}\n`,
      );
      const registryPath = join(
        fixture.fixtureRoot,
        "content/registry.json",
      );
      const registryBeforePartialRotation = readFileSync(
        registryPath,
        "utf8",
      );
      const rejectedPartialRotation = spawnSync(
        process.execPath,
        replacementArgs,
        { cwd: fixture.fixtureRoot, encoding: "utf8" },
      );
      expect(rejectedPartialRotation.status).toBe(2);
      expect(rejectedPartialRotation.stderr).toContain(
        "replace all existing assets to rotate rights",
      );
      expect(readFileSync(registryPath, "utf8")).toBe(
        registryBeforePartialRotation,
      );
      expect(existsSync(join(
        fixture.fixtureRoot,
        `content/packages/${replacementVersion}`,
      ))).toBe(false);

      writeFileSync(
        replacementDescriptorPath,
        `${JSON.stringify(replacementDescriptor, null, 2)}\n`,
      );
      const fullRotation = spawnSync(process.execPath, replacementArgs, {
        cwd: fixture.fixtureRoot,
        encoding: "utf8",
      });
      expect(fullRotation.status, fullRotation.stderr).toBe(0);
      const rotatedCatalog = JSON.parse(readFileSync(join(
        fixture.fixtureRoot,
        `content/packages/${replacementVersion}/item-catalog.json`,
      ), "utf8")) as typeof sourceCatalog;
      expect(rotatedCatalog.audioAssets).toHaveLength(
        sourceCatalog.audioAssets.length,
      );
      rotatedCatalog.audioAssets.forEach((asset) => {
        expect(asset.rights).toEqual({
          ownerId: "replacement-owner",
          licenseId: "replacement-license",
          evidenceRef: "fixture://replacement-rights",
        });
      });
      const rotatedManifest = JSON.parse(readFileSync(join(
        fixture.fixtureRoot,
        `content/packages/${replacementVersion}/manifest.json`,
      ), "utf8")) as {
        governance: {
          audioRights: {
            ownerId: string;
            licenseId: string;
            evidenceRef: string;
          };
        };
      };
      expect(rotatedManifest.governance.audioRights).toEqual({
        ownerId: "replacement-owner",
        licenseId: "replacement-license",
        evidenceRef: "fixture://replacement-rights",
      });
    } finally {
      rmSync(fixture.fixtureRoot, { recursive: true, force: true });
    }
  }, 60_000);

  it("keeps hashing oversized legacy audio without requiring WAV inspection", () => {
    const packageDirectory = mkdtempSync(join(tmpdir(), "hanzi-legacy-audio-"));
    try {
      const audioDirectory = join(packageDirectory, "audio");
      mkdirSync(audioDirectory);
      const bytes = Buffer.alloc((64 * 1024 * 1024) + 1);
      const fileRef = "audio/legacy-large.mp3";
      writeFileSync(join(packageDirectory, fileRef), bytes);
      const itemCatalog = { audioAssets: [{ fileRef }] };

      expect(inspectAudioAssetFiles(
        packageDirectory,
        itemCatalog,
        4,
      )).toEqual({
        hashes: { [fileRef]: sha256Bytes(bytes) },
        inspections: {},
      });
      expect(inspectAudioAssetFiles(
        packageDirectory,
        itemCatalog,
        5,
      )).toMatchObject({
        hashes: { [fileRef]: null },
        inspections: {
          [fileRef]: { ok: false, error: expect.stringContaining("exceeds") },
        },
      });
    } finally {
      rmSync(packageDirectory, { recursive: true, force: true });
    }
  });

  it("rejects corrupt, untrusted, duplicate, unsafe, reserved, and escaped descriptor inputs without mutation", () => {
    const fixture = createAudioCommandFixture();
    try {
      const registryPath = join(fixture.fixtureRoot, "content/registry.json");
      const registryBefore = readFileSync(registryPath, "utf8");
      const cases: Array<[
        string,
        (descriptor: typeof fixture.descriptor) => void,
        string,
      ]> = [
        ["codec", (descriptor) => {
          const corrupt = Buffer.from(fixture.wave);
          corrupt.writeUInt16LE(3, 20);
          writeFileSync(join(fixture.fixtureRoot, "content/drafts/corrupt.bin"), corrupt);
          descriptor.assets[0].sourceFile = "content/drafts/corrupt.bin";
          descriptor.assets[0].expectedFileSha256 = sha256Bytes(corrupt);
        }, "audio format must be PCM"],
        ["hash", (descriptor) => {
          descriptor.assets[0].expectedFileSha256 = `sha256:${"0".repeat(64)}`;
        }, "expectedFileSha256 does not match source bytes"],
        ["evidence", (descriptor) => {
          descriptor.assets[0].rights.evidenceRef = "fixture://wrong-rights";
        }, "rights must exactly match"],
        ["duplicate", (descriptor) => {
          descriptor.assets.push(structuredClone(descriptor.assets[0]));
        }, "Duplicate audio asset id"],
        ["unsafe", (descriptor) => {
          descriptor.assets[0].assetId = "Unsafe/asset";
        }, "lowercase safe file id"],
        ["reserved", (descriptor) => {
          descriptor.assets[0].assetId = "con";
        }, "reserved by Windows"],
        ["escape", (descriptor) => {
          descriptor.assets[0].sourceFile = "../outside.wav";
        }, "traversal segments"],
      ];
      for (const [_label, mutate, expectedError] of cases) {
        const descriptor = structuredClone(fixture.descriptor);
        mutate(descriptor);
        writeFileSync(
          fixture.descriptorPath,
          `${JSON.stringify(descriptor, null, 2)}\n`,
        );
        const rejected = spawnSync(process.execPath, fixture.args, {
          cwd: fixture.fixtureRoot,
          encoding: "utf8",
        });
        expect(rejected.status).toBe(2);
        expect(rejected.stderr).toContain(expectedError);
        expect(readFileSync(registryPath, "utf8")).toBe(registryBefore);
        expect(existsSync(join(
          fixture.fixtureRoot,
          `content/packages/${fixture.targetVersion}`,
        ))).toBe(false);
        expect(existsSync(join(
          fixture.fixtureRoot,
          "content/.governance.lock",
        ))).toBe(false);
        expect(readdirSync(join(fixture.fixtureRoot, "content/packages")))
          .not.toContainEqual(expect.stringMatching(
            new RegExp(`^${fixture.targetVersion}\\.`, "u"),
          ));
      }
    } finally {
      rmSync(fixture.fixtureRoot, { recursive: true, force: true });
    }
  }, 20_000);

  it("cleans a fully staged two-asset package when the second alignment is invalid", () => {
    const fixture = createAudioCommandFixture();
    try {
      const descriptor = structuredClone(fixture.descriptor);
      descriptor.assets[1].segments[0].endMs = 501;
      writeFileSync(
        fixture.descriptorPath,
        `${JSON.stringify(descriptor, null, 2)}\n`,
      );
      const registryPath = join(fixture.fixtureRoot, "content/registry.json");
      const registryBefore = readFileSync(registryPath, "utf8");
      const rejected = spawnSync(process.execPath, fixture.args, {
        cwd: fixture.fixtureRoot,
        encoding: "utf8",
      });
      expect(rejected.status).toBe(2);
      expect(rejected.stderr).toContain("endMs exceeds media duration");
      expect(readFileSync(registryPath, "utf8")).toBe(registryBefore);
      expect(readdirSync(join(fixture.fixtureRoot, "content/packages")))
        .not.toContainEqual(expect.stringMatching(
          new RegExp(`^${fixture.targetVersion}(?:\\.|$)`, "u"),
        ));
      expect(existsSync(join(
        fixture.fixtureRoot,
        "content/.governance.lock",
      ))).toBe(false);
    } finally {
      rmSync(fixture.fixtureRoot, { recursive: true, force: true });
    }
  });

  it("requires --write and never overwrites a colliding target directory", () => {
    const fixture = createAudioCommandFixture();
    try {
      const registryPath = join(fixture.fixtureRoot, "content/registry.json");
      const registryBefore = readFileSync(registryPath, "utf8");
      const withoutWrite = fixture.args.filter((argument) => argument !== "--write");
      expect(spawnSync(process.execPath, withoutWrite, {
        cwd: fixture.fixtureRoot,
        encoding: "utf8",
      }).status).toBe(2);
      const targetDirectory = join(
        fixture.fixtureRoot,
        `content/packages/${fixture.targetVersion}`,
      );
      mkdirSync(targetDirectory);
      writeFileSync(join(targetDirectory, "sentinel.txt"), "keep\n");
      const collision = spawnSync(process.execPath, fixture.args, {
        cwd: fixture.fixtureRoot,
        encoding: "utf8",
      });
      expect(collision.status).toBe(2);
      expect(collision.stderr).toContain("Target package directory already exists");
      expect(readFileSync(join(targetDirectory, "sentinel.txt"), "utf8"))
        .toBe("keep\n");
      expect(readFileSync(registryPath, "utf8")).toBe(registryBefore);
      expect(existsSync(join(
        fixture.fixtureRoot,
        "content/.governance.lock",
      ))).toBe(false);
    } finally {
      rmSync(fixture.fixtureRoot, { recursive: true, force: true });
    }
  });

  it("reports malformed audioAssets through validation instead of throwing", () => {
    const fixture = createAudioCommandFixture();
    try {
      const catalogPath = join(
        fixture.fixtureRoot,
        "content/packages/foundation-2026.07.5/item-catalog.json",
      );
      const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as {
        audioAssets: unknown;
      };
      catalog.audioAssets = {};
      writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
      const validation = spawnSync(
        process.execPath,
        [
          join(fixture.fixtureRoot, "scripts/content/validate.mjs"),
          "foundation-2026.07.5",
        ],
        { cwd: fixture.fixtureRoot, encoding: "utf8" },
      );
      expect(validation.status).toBe(1);
      expect(validation.stdout).toContain(
        "item-catalog.audioAssets must be an array",
      );
    } finally {
      rmSync(fixture.fixtureRoot, { recursive: true, force: true });
    }
  });

  it("rejects a BOM-prefixed package manifest instead of normalizing its bytes", () => {
    const fixture = createAudioCommandFixture();
    try {
      const manifestPath = join(
        fixture.fixtureRoot,
        "content/packages/foundation-2026.07.5/manifest.json",
      );
      writeFileSync(
        manifestPath,
        `\uFEFF${readFileSync(manifestPath, "utf8")}`,
      );
      const registryPath = join(
        fixture.fixtureRoot,
        "content/registry.json",
      );
      const registryBefore = readFileSync(registryPath, "utf8");
      const validation = spawnSync(
        process.execPath,
        [
          join(fixture.fixtureRoot, "scripts/content/validate.mjs"),
          "foundation-2026.07.5",
        ],
        { cwd: fixture.fixtureRoot, encoding: "utf8" },
      );
      expect(validation.status).toBe(2);
      expect(validation.stderr).toContain(
        "Package manifest.json must contain valid JSON",
      );

      const mutation = spawnSync(process.execPath, fixture.args, {
        cwd: fixture.fixtureRoot,
        encoding: "utf8",
      });
      expect(mutation.status).toBe(2);
      expect(mutation.stderr).toContain(
        "Package manifest.json must contain valid JSON",
      );
      expect(readFileSync(registryPath, "utf8")).toBe(registryBefore);
      expect(existsSync(join(
        fixture.fixtureRoot,
        `content/packages/${fixture.targetVersion}`,
      ))).toBe(false);
      expect(existsSync(join(
        fixture.fixtureRoot,
        "content/.governance.lock",
      ))).toBe(false);
    } finally {
      rmSync(fixture.fixtureRoot, { recursive: true, force: true });
    }
  });

  it("rejects a manifest leaf symlink before validation or mutation reads JSON", () => {
    const fixture = createAudioCommandFixture();
    try {
      const packageDirectory = join(
        fixture.fixtureRoot,
        "content/packages/foundation-2026.07.5",
      );
      const manifestPath = join(packageDirectory, "manifest.json");
      const outsideManifestPath = join(
        fixture.fixtureRoot,
        "content/drafts/outside-package-manifest.json",
      );
      copyFileSync(manifestPath, outsideManifestPath);
      rmSync(manifestPath, { force: true });
      try {
        symlinkSync(outsideManifestPath, manifestPath, "file");
      } catch (error) {
        if (
          error instanceof Error
          && "code" in error
          && ["EPERM", "EACCES"].includes(String(error.code))
        ) {
          return;
        }
        throw error;
      }

      const registryPath = join(
        fixture.fixtureRoot,
        "content/registry.json",
      );
      const registryBefore = readFileSync(registryPath, "utf8");
      const validation = spawnSync(
        process.execPath,
        [
          join(fixture.fixtureRoot, "scripts/content/validate.mjs"),
          "foundation-2026.07.5",
        ],
        { cwd: fixture.fixtureRoot, encoding: "utf8" },
      );
      expect(validation.status).toBe(2);
      expect(validation.stderr).toContain(
        "Package manifest.json must not contain symlinks or junctions",
      );

      const mutation = spawnSync(process.execPath, fixture.args, {
        cwd: fixture.fixtureRoot,
        encoding: "utf8",
      });
      expect(mutation.status).toBe(2);
      expect(mutation.stderr).toContain(
        "Package manifest.json must not contain symlinks or junctions",
      );
      expect(readFileSync(registryPath, "utf8")).toBe(registryBefore);
      expect(existsSync(join(
        fixture.fixtureRoot,
        `content/packages/${fixture.targetVersion}`,
      ))).toBe(false);
      expect(existsSync(join(
        fixture.fixtureRoot,
        "content/.governance.lock",
      ))).toBe(false);
    } finally {
      rmSync(fixture.fixtureRoot, { recursive: true, force: true });
    }
  });

  it("rejects a nested snapshot junction before validation or mutation reads it", () => {
    const fixture = createAudioCommandFixture();
    try {
      const packageDirectory = join(
        fixture.fixtureRoot,
        "content/packages/foundation-2026.07.5",
      );
      const snapshotDataDirectory = join(
        packageDirectory,
        "snapshots/src/data",
      );
      const outsideSnapshotDirectory = join(
        fixture.fixtureRoot,
        "content/drafts/outside-package-snapshots",
      );
      cpSync(snapshotDataDirectory, outsideSnapshotDirectory, {
        recursive: true,
      });
      rmSync(snapshotDataDirectory, { recursive: true, force: true });
      try {
        symlinkSync(
          outsideSnapshotDirectory,
          snapshotDataDirectory,
          process.platform === "win32" ? "junction" : "dir",
        );
      } catch (error) {
        if (
          error instanceof Error
          && "code" in error
          && ["EPERM", "EACCES"].includes(String(error.code))
        ) {
          return;
        }
        throw error;
      }

      const registryPath = join(
        fixture.fixtureRoot,
        "content/registry.json",
      );
      const registryBefore = readFileSync(registryPath, "utf8");
      const validation = spawnSync(
        process.execPath,
        [
          join(fixture.fixtureRoot, "scripts/content/validate.mjs"),
          "foundation-2026.07.5",
        ],
        { cwd: fixture.fixtureRoot, encoding: "utf8" },
      );
      expect(validation.status).toBe(2);
      expect(validation.stderr).toContain("Immutable source snapshot");
      expect(validation.stderr).toContain(
        "must not contain symlinks or junctions",
      );

      const mutation = spawnSync(process.execPath, fixture.args, {
        cwd: fixture.fixtureRoot,
        encoding: "utf8",
      });
      expect(mutation.status).toBe(2);
      expect(mutation.stderr).toContain("Immutable source snapshot");
      expect(mutation.stderr).toContain(
        "must not contain symlinks or junctions",
      );
      expect(readFileSync(registryPath, "utf8")).toBe(registryBefore);
      expect(existsSync(join(
        fixture.fixtureRoot,
        `content/packages/${fixture.targetVersion}`,
      ))).toBe(false);
      expect(existsSync(join(
        fixture.fixtureRoot,
        "content/.governance.lock",
      ))).toBe(false);
    } finally {
      rmSync(fixture.fixtureRoot, { recursive: true, force: true });
    }
  });

  it("rejects a package-root junction before validation or promotion reads JSON", () => {
    const fixture = createAudioCommandFixture();
    try {
      copyFixtureFile(fixture.fixtureRoot, "scripts/content/promote.mjs");
      const packageDirectory = join(
        fixture.fixtureRoot,
        "content/packages/foundation-2026.07.5",
      );
      const outsideDirectory = join(
        fixture.fixtureRoot,
        "content/drafts/package-root-junction-target",
      );
      cpSync(packageDirectory, outsideDirectory, { recursive: true });
      rmSync(packageDirectory, { recursive: true, force: true });
      try {
        symlinkSync(
          outsideDirectory,
          packageDirectory,
          process.platform === "win32" ? "junction" : "dir",
        );
      } catch (error) {
        if (
          error instanceof Error
          && "code" in error
          && ["EPERM", "EACCES"].includes(String(error.code))
        ) {
          return;
        }
        throw error;
      }
      const registryPath = join(
        fixture.fixtureRoot,
        "content/registry.json",
      );
      const registryBefore = readFileSync(registryPath, "utf8");
      const validation = spawnSync(
        process.execPath,
        [
          join(fixture.fixtureRoot, "scripts/content/validate.mjs"),
          "foundation-2026.07.5",
        ],
        { cwd: fixture.fixtureRoot, encoding: "utf8" },
      );
      expect(validation.status).toBe(2);
      expect(validation.stderr).toContain(
        "Content package foundation-2026.07.5",
      );
      const promotion = spawnSync(
        process.execPath,
        [
          join(fixture.fixtureRoot, "scripts/content/promote.mjs"),
          "foundation-2026.07.5",
          "--channel", "closed-alpha",
        ],
        { cwd: fixture.fixtureRoot, encoding: "utf8" },
      );
      expect(promotion.status).toBe(2);
      expect(promotion.stderr).toContain(
        "Content package foundation-2026.07.5",
      );
      expect(readFileSync(registryPath, "utf8")).toBe(registryBefore);
    } finally {
      rmSync(fixture.fixtureRoot, { recursive: true, force: true });
    }
  });

  it("rejects an audio directory junction that resolves outside the package", () => {
    const fixture = createAudioCommandFixture();
    try {
      const imported = spawnSync(process.execPath, fixture.args, {
        cwd: fixture.fixtureRoot,
        encoding: "utf8",
      });
      expect(imported.status, imported.stderr).toBe(0);
      const packageDirectory = join(
        fixture.fixtureRoot,
        `content/packages/${fixture.targetVersion}`,
      );
      const audioDirectory = join(packageDirectory, "audio");
      const outsideDirectory = join(
        fixture.fixtureRoot,
        "content/drafts/outside-package-audio",
      );
      cpSync(audioDirectory, outsideDirectory, { recursive: true });
      rmSync(audioDirectory, { recursive: true, force: true });
      try {
        symlinkSync(
          outsideDirectory,
          audioDirectory,
          process.platform === "win32" ? "junction" : "dir",
        );
      } catch (error) {
        if (
          error instanceof Error
          && "code" in error
          && ["EPERM", "EACCES"].includes(String(error.code))
        ) {
          return;
        }
        throw error;
      }
      const validation = spawnSync(
        process.execPath,
        [
          join(fixture.fixtureRoot, "scripts/content/validate.mjs"),
          fixture.targetVersion,
        ],
        { cwd: fixture.fixtureRoot, encoding: "utf8" },
      );
      expect(validation.status).toBe(1);
      expect(validation.stdout).toContain("fileRef WAV inspection failed");
    } finally {
      rmSync(fixture.fixtureRoot, { recursive: true, force: true });
    }
  });
});
