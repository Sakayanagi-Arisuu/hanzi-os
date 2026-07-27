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
    "src/content/audioInspection.mjs",
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
      "foundation-2026.07.5",
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
    ]);
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
        "src/content/audioInspection.mjs",
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
        (entry) => entry.contentVersion !== "foundation-2026.07.5",
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
        "src/content/audioInspection.mjs",
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
  });

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
