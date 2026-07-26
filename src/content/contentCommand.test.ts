import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runContentCommand } from "../../scripts/content/lib.mjs";
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

const copyFixtureFile = (fixtureRoot: string, relativePath: string) => {
  const target = join(fixtureRoot, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(repositoryRoot, relativePath), target);
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
});
