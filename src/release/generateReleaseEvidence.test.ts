import { execFileSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  BUILD_PROVENANCE_FILE,
  BUILD_PROVENANCE_SCHEMA_VERSION,
  createBuildProvenance,
  finishBuildSnapshot,
  startBuildSnapshot,
  validateAttestableBuildProvenance,
} from "../../scripts/build-provenance.mjs";
import {
  buildEvidenceManifest,
  canonicalizeJson,
  collectDistArtifacts,
  computeBuildSha256,
  hashRegularFile,
  isReleaseEvidencePath,
  normalizeSourceRevision,
  parseCliArguments,
  resolveContainedPath,
  sanitizeCycloneDxSbom,
  serializeCanonicalJson,
  sha256Bytes,
  validateGitSourceRevision,
  validateSafeRelativePath,
} from "../../scripts/generate-release-evidence.mjs";

const temporaryDirectories: string[] = [];

const makeTemporaryDirectory = async () => {
  const directory = await mkdtemp(join(tmpdir(), "hanzi-release-evidence-"));
  temporaryDirectories.push(directory);
  return directory;
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("release evidence canonicalization", () => {
  it("orders object keys and SBOM collections deterministically", () => {
    const left = {
      zebra: 1,
      alpha: { two: 2, one: 1 },
      list: [{ beta: true, alpha: true }],
    };
    const right = {
      list: [{ alpha: true, beta: true }],
      alpha: { one: 1, two: 2 },
      zebra: 1,
    };
    expect(serializeCanonicalJson(left)).toBe(serializeCanonicalJson(right));
    expect(Object.keys(canonicalizeJson(left))).toEqual([
      "alpha",
      "list",
      "zebra",
    ]);

    const sanitized = sanitizeCycloneDxSbom({
      bomFormat: "CycloneDX",
      specVersion: "1.5",
      serialNumber: "urn:uuid:nondeterministic",
      metadata: {
        timestamp: "2099-01-01T00:00:00.000Z",
        tools: [
          { vendor: "z", name: "z", version: "1" },
          { vendor: "a", name: "a", version: "1" },
        ],
      },
      components: [
        { "bom-ref": "z@1", name: "z" },
        { "bom-ref": "a@1", name: "a" },
      ],
      dependencies: [
        { ref: "z@1", dependsOn: ["z-child@1", "a-child@1"] },
        { ref: "a@1", dependsOn: [] },
      ],
    });

    expect(sanitized).not.toHaveProperty("serialNumber");
    expect(sanitized.metadata).not.toHaveProperty("timestamp");
    expect(
      sanitized.components.map(
        (item: { "bom-ref": string }) => item["bom-ref"],
      ),
    ).toEqual([
      "a@1",
      "z@1",
    ]);
    expect(sanitized.dependencies[1].dependsOn).toEqual([
      "a-child@1",
      "z-child@1",
    ]);
  });
});

describe("release evidence paths", () => {
  it.each([
    "",
    ".",
    "..",
    "../escape",
    "nested/../../escape",
    "/absolute",
    "C:/absolute",
    "nested\\..\\escape",
    "nested//file",
  ])("rejects unsafe relative path %j", (candidate) => {
    expect(() => validateSafeRelativePath(candidate)).toThrow(
      /Unsafe relative path/u,
    );
    expect(() => resolveContainedPath("C:/safe-root", candidate)).toThrow();
  });

  it("recognizes only the dedicated self-excluded evidence subtree", () => {
    expect(isReleaseEvidencePath("release-evidence")).toBe(true);
    expect(isReleaseEvidencePath("release-evidence/manifest.json")).toBe(true);
    expect(isReleaseEvidencePath("release-evidence-copy/file.json")).toBe(false);
  });

  it("sorts build artifacts and excludes prior release evidence", async () => {
    const root = await makeTemporaryDirectory();
    const dist = join(root, "dist");
    await mkdir(join(dist, "nested"), { recursive: true });
    await mkdir(join(dist, "release-evidence"), { recursive: true });
    await writeFile(join(dist, "z.txt"), "last");
    await writeFile(join(dist, "nested", "a.txt"), "first");
    await writeFile(
      join(dist, "release-evidence", "manifest.json"),
      "must not recurse",
    );

    const artifacts = await collectDistArtifacts(dist);
    expect(artifacts.map((artifact) => artifact.path)).toEqual([
      "nested/a.txt",
      "z.txt",
    ]);
  });

  it("rejects a symlink anywhere in the build artifact tree", async () => {
    const root = await makeTemporaryDirectory();
    const dist = join(root, "dist");
    const outside = join(root, "outside");
    await mkdir(dist);
    await mkdir(outside);
    await writeFile(join(outside, "secret.txt"), "not a build artifact");
    await symlink(
      outside,
      join(dist, "linked"),
      process.platform === "win32" ? "junction" : "dir",
    );

    await expect(collectDistArtifacts(dist)).rejects.toThrow(
      /may not be a symlink/u,
    );
  });
});

describe("release evidence provenance and hashing", () => {
  it("defaults to non-attestable and fails closed when revision is required", () => {
    expect(parseCliArguments([])).toEqual({
      attestable: false,
      rebuildFromSource: false,
      requireSourceRevision: false,
      sourceRevision: null,
      sourceRevisionFromHead: false,
    });
    expect(() =>
      parseCliArguments(["--require-source-revision"]),
    ).toThrow(/requires --source-revision/u);
    expect(() => normalizeSourceRevision("abc123")).toThrow(
      /40 or 64 hexadecimal/u,
    );
    expect(() =>
      parseCliArguments(["--source-revision", "g".repeat(40)]),
    ).toThrow(/40 or 64 hexadecimal/u);
    expect(normalizeSourceRevision("A".repeat(64))).toBe("a".repeat(64));

    const revision = "ABCDEF0123456789ABCDEF0123456789ABCDEF01";
    expect(
      parseCliArguments([
        "--require-source-revision",
        "--source-revision",
        revision,
        "--rebuild-from-source",
      ]),
    ).toEqual({
      attestable: true,
      rebuildFromSource: true,
      requireSourceRevision: true,
      sourceRevision: revision.toLowerCase(),
      sourceRevisionFromHead: false,
    });
    expect(parseCliArguments([
      "--require-source-revision",
      "--source-revision-from-head",
      "--rebuild-from-source",
    ])).toEqual({
      attestable: true,
      rebuildFromSource: true,
      requireSourceRevision: true,
      sourceRevision: null,
      sourceRevisionFromHead: true,
    });
    expect(() => parseCliArguments([
      "--source-revision-from-head",
      "--source-revision",
      revision,
    ])).toThrow(/cannot be combined/u);
    expect(() => parseCliArguments([
      "--require-source-revision",
      "--source-revision-from-head",
    ])).toThrow(/requires --rebuild-from-source/u);
    expect(() => parseCliArguments([
      "--rebuild-from-source",
    ])).toThrow(/requires --source-revision/u);
  });

  it("accepts an attestable revision only for the clean checked-out Git HEAD", () => {
    const revision = "ABCDEF0123456789ABCDEF0123456789ABCDEF01";
    expect(validateGitSourceRevision({
      requestedRevision: revision,
      headRevision: `${revision.toLowerCase()}\n`,
      worktreeStatus: "",
    })).toBe(revision.toLowerCase());
    expect(() => validateGitSourceRevision({
      requestedRevision: revision,
      headRevision: "0".repeat(40),
      worktreeStatus: "",
    })).toThrow(/exactly match the checked-out Git HEAD/u);
    expect(() => validateGitSourceRevision({
      requestedRevision: revision,
      headRevision: revision,
      worktreeStatus: " M package.json\n",
    })).toThrow(/worktree is dirty/u);
  });

  it("produces a stable SHA-256 and byte count for identical bytes", async () => {
    const root = await makeTemporaryDirectory();
    const artifact = join(root, "artifact.bin");
    await writeFile(artifact, "abc");

    const first = await hashRegularFile(artifact);
    const second = await hashRegularFile(artifact);
    expect(first).toEqual(second);
    expect(first).toEqual({
      bytes: 3,
      sha256:
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    });
    expect(sha256Bytes("abc")).toBe(first.sha256);
  });

  it("rejects a build made from modified sources even after the worktree is restored", () => {
    const revision = "a".repeat(40);
    const sourceTree = "b".repeat(40);
    const packageLock = {
      bytes: 128,
      sha256: "c".repeat(64),
    };
    const modifiedBuildStart = {
      gitAvailable: true,
      packageLock,
      sourceRevision: revision,
      sourceTree,
      worktreeClean: false,
      worktreeStatusSha256: "d".repeat(64),
    };
    const restoredBuildFinish = {
      ...modifiedBuildStart,
      worktreeClean: true,
      worktreeStatusSha256: sha256Bytes(""),
    };

    const provenance = createBuildProvenance({
      start: modifiedBuildStart,
      finish: restoredBuildFinish,
    });

    expect(provenance).toMatchObject({
      attestable: false,
      sourceRevision: null,
      sourceTree: null,
      invalidReasons: ["worktree-not-clean-at-build-start"],
    });
    expect(() =>
      validateAttestableBuildProvenance(provenance, {
        expectedPackageLock: packageLock,
        expectedSourceRevision: revision,
        expectedSourceTree: sourceTree,
      }),
    ).toThrow(/not attestable from a clean source snapshot/u);
  });

  it("records the dirty build start in a real Git checkout after sources are restored", async () => {
    const root = await makeTemporaryDirectory();
    const runGit = (argumentsList: string[]) =>
      execFileSync("git", argumentsList, {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
    await writeFile(join(root, ".gitignore"), ".vite/\n.wrangler/\ndist/\n");
    await writeFile(join(root, "package-lock.json"), "{}\n");
    await writeFile(join(root, "source.txt"), "committed source\n");
    runGit(["init", "--quiet"]);
    runGit(["config", "user.email", "release-test@hanzi.invalid"]);
    runGit(["config", "user.name", "HANZI.OS Release Test"]);
    runGit(["add", ".gitignore", "package-lock.json", "source.txt"]);
    runGit(["commit", "--quiet", "-m", "fixture"]);
    const revision = runGit([
      "rev-parse",
      "--verify",
      "HEAD^{commit}",
    ]).trim();
    const sourceTree = runGit([
      "rev-parse",
      "--verify",
      "HEAD^{tree}",
    ]).trim();

    await writeFile(join(root, "source.txt"), "modified source used to build\n");
    await startBuildSnapshot(root);
    await mkdir(join(root, "dist"));
    await writeFile(
      join(root, "dist", "client.js"),
      "compiled from modified source\n",
    );
    await writeFile(join(root, "source.txt"), "committed source\n");
    const provenance = await finishBuildSnapshot(root);
    const persisted = JSON.parse(
      await readFile(join(root, "dist", BUILD_PROVENANCE_FILE), "utf8"),
    );

    expect(provenance).toEqual(persisted);
    expect(runGit(["status", "--porcelain=v1", "--untracked-files=all"])).toBe(
      "",
    );
    expect(provenance).toMatchObject({
      attestable: false,
      invalidReasons: ["worktree-not-clean-at-build-start"],
      sourceRevision: null,
      sourceTree: null,
    });
    expect(() =>
      validateAttestableBuildProvenance(provenance, {
        expectedPackageLock: {
          bytes: 3,
          sha256: sha256Bytes("{}\n"),
        },
        expectedSourceRevision: revision,
        expectedSourceTree: sourceTree,
      }),
    ).toThrow(/not attestable from a clean source snapshot/u);
  });

  it("binds a clean build marker to the exact HEAD tree and package lock", () => {
    const revision = "a".repeat(40);
    const sourceTree = "b".repeat(40);
    const packageLock = {
      bytes: 128,
      sha256: "c".repeat(64),
    };
    const cleanState = {
      gitAvailable: true,
      packageLock,
      sourceRevision: revision,
      sourceTree,
      worktreeClean: true,
      worktreeStatusSha256: sha256Bytes(""),
    };
    const provenance = createBuildProvenance({
      start: cleanState,
      finish: cleanState,
    });

    expect(
      validateAttestableBuildProvenance(provenance, {
        expectedPackageLock: packageLock,
        expectedSourceRevision: revision,
        expectedSourceTree: sourceTree,
      }),
    ).toEqual({
      packageLock,
      sourceRevision: revision,
      sourceTree,
    });
    expect(() =>
      validateAttestableBuildProvenance(provenance, {
        expectedPackageLock: packageLock,
        expectedSourceRevision: revision,
        expectedSourceTree: "e".repeat(40),
      }),
    ).toThrow(/does not match the verified Git HEAD tree/u);
  });

  it("keeps provenance null unless an explicit revision is supplied", () => {
    const hash = "a".repeat(64);
    const manifest = buildEvidenceManifest({
      artifacts: [{ bytes: 3, path: "client/app.js", sha256: hash }],
      buildProvenance: null,
      contentVersion: "foundation-2026.07.3",
      nodeVersion: "v24.16.0",
      npmVersion: "11.13.0",
      packageLock: { bytes: 10, sha256: hash },
      sbom: { bytes: 20, sha256: hash, specVersion: "1.5" },
      sourceRevision: null,
    });

    expect(manifest).toMatchObject({
      schemaVersion: 2,
      attestable: false,
      sourceRevision: null,
      buildProvenance: null,
      contentVersion: "foundation-2026.07.3",
      build: {
        artifactCount: 1,
        bytes: 3,
        excludedPath: "release-evidence/**",
      },
    });
    expect(manifest.build.sha256).toBe(
      computeBuildSha256({
        root: "dist",
        excludedPath: "release-evidence/**",
        artifactCount: 1,
        bytes: 3,
        artifacts: [
          { bytes: 3, path: "client/app.js", sha256: hash },
        ],
      }),
    );
    expect(manifest.build.sha256).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("requires exact build provenance for an attestable manifest", () => {
    const hash = "a".repeat(64);
    const sourceTree = "b".repeat(40);
    const makeInput = (
      buildProvenance: null | {
        path: string;
        schemaVersion: number;
        sourceTree: string;
        sha256: string;
      },
    ) => ({
      artifacts: [
        {
          bytes: 3,
          path: BUILD_PROVENANCE_FILE,
          sha256: hash,
        },
      ],
      buildProvenance,
      contentVersion: "foundation-2026.07.3",
      nodeVersion: "v24.16.0",
      npmVersion: "11.13.0",
      packageLock: { bytes: 10, sha256: hash },
      sbom: { bytes: 20, sha256: hash, specVersion: "1.5" },
      sourceRevision: "c".repeat(40),
    });

    expect(() => buildEvidenceManifest(makeInput(null))).toThrow(
      /requires exact build provenance/u,
    );
    expect(
      buildEvidenceManifest(
        makeInput({
          path: BUILD_PROVENANCE_FILE,
          schemaVersion: BUILD_PROVENANCE_SCHEMA_VERSION,
          sourceTree,
          sha256: hash,
        }),
      ),
    ).toMatchObject({
      schemaVersion: 2,
      attestable: true,
      sourceRevision: "c".repeat(40),
      buildProvenance: {
        path: BUILD_PROVENANCE_FILE,
        schemaVersion: BUILD_PROVENANCE_SCHEMA_VERSION,
        sourceTree,
        sha256: hash,
      },
    });
  });
});
