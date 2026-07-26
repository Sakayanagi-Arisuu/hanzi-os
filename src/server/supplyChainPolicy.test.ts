import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

type JsonRecord = Record<string, unknown>;

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const verifierPath = join(
  repositoryRoot,
  "scripts",
  "verify-lockfile-policy.mjs",
);
const temporaryDirectories: string[] = [];
const integrity =
  "sha512-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

const createLockfile = () => ({
  name: "fixture",
  version: "1.0.0",
  lockfileVersion: 3,
  requires: true,
  packages: {
    "": {
      name: "fixture",
      version: "1.0.0",
      dependencies: {
        safe: "1.0.0",
      },
    },
    "node_modules/safe": {
      version: "1.0.0",
      resolved: "https://registry.npmjs.org/safe/-/safe-1.0.0.tgz",
      integrity,
    },
  },
});

const createPolicy = () => ({
  schemaVersion: 1,
  lockfileVersion: 3,
  allowedRegistryOrigins: ["https://registry.npmjs.org"],
  requiredIntegrityAlgorithm: "sha512",
  installScriptAllowlist: [] as JsonRecord[],
});

const runVerifier = (lockfile: JsonRecord, policy: JsonRecord) => {
  const directory = mkdtempSync(join(tmpdir(), "hanzi-lockfile-policy-"));
  temporaryDirectories.push(directory);
  const lockfilePath = join(directory, "package-lock.json");
  const policyPath = join(directory, "supply-chain-policy.json");
  writeFileSync(lockfilePath, `${JSON.stringify(lockfile, null, 2)}\n`);
  writeFileSync(policyPath, `${JSON.stringify(policy, null, 2)}\n`);

  return spawnSync(
    process.execPath,
    [
      verifierPath,
      "--policy",
      policyPath,
      "--lockfile",
      lockfilePath,
    ],
    { encoding: "utf8" },
  );
};

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
  }
});

describe("supply-chain lockfile policy", () => {
  it("accepts the repository lockfile and exact install-script allowlist", () => {
    const result = spawnSync(process.execPath, [verifierPath], {
      cwd: repositoryRoot,
      encoding: "utf8",
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toMatch(
      /686 registry packages; 6 approved install-script packages/u,
    );
  });

  it.each([
    [
      "plain HTTP",
      "http://registry.npmjs.org/safe/-/safe-1.0.0.tgz",
      "must use HTTPS",
    ],
    [
      "an unapproved HTTPS host",
      "https://github.com/example/safe/archive/v1.0.0.tgz",
      "is not an allowed registry",
    ],
    [
      "a Git source",
      "git+https://github.com/example/safe.git",
      "must use HTTPS",
    ],
    ["a local file source", "file:../safe", "must use HTTPS"],
  ])("rejects %s dependency sources", (_label, resolved, expectedMessage) => {
    const lockfile = createLockfile();
    lockfile.packages["node_modules/safe"].resolved = resolved;

    const result = runVerifier(lockfile, createPolicy());

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(expectedMessage);
  });

  it("rejects a registry package without integrity", () => {
    const lockfile = createLockfile() as JsonRecord;
    delete (
      lockfile.packages as Record<string, JsonRecord>
    )["node_modules/safe"].integrity;

    const result = runVerifier(lockfile, createPolicy());

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "registry package requires a SHA-512 integrity digest",
    );
  });

  it("rejects an install-script package outside the exact allowlist", () => {
    const lockfile = createLockfile();
    Object.assign(lockfile.packages["node_modules/safe"], {
      hasInstallScript: true,
    });

    const result = runVerifier(lockfile, createPolicy());

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "package with install script is not explicitly allowlisted",
    );
  });

  it("rejects an allowlist entry whose version or integrity is stale", () => {
    const lockfile = createLockfile();
    Object.assign(lockfile.packages["node_modules/safe"], {
      hasInstallScript: true,
    });
    const policy = createPolicy();
    policy.installScriptAllowlist = [
      {
        packagePath: "node_modules/safe",
        version: "1.0.1",
        integrity,
      },
    ];

    const result = runVerifier(lockfile, policy);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "does not exactly match its allowlisted version and integrity",
    );
  });

  it("fails closed when the policy itself permits a non-HTTPS registry", () => {
    const policy = createPolicy();
    policy.allowedRegistryOrigins = ["http://registry.npmjs.org"];

    const result = runVerifier(createLockfile(), policy);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "policy registry origin must be a canonical HTTPS origin",
    );
  });
});
