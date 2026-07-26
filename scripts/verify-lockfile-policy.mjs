import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const POLICY_SCHEMA_VERSION = 1;
const EXPECTED_POLICY_KEYS = [
  "allowedRegistryOrigins",
  "installScriptAllowlist",
  "lockfileVersion",
  "requiredIntegrityAlgorithm",
  "schemaVersion",
];
const EXPECTED_ALLOWLIST_KEYS = ["integrity", "packagePath", "version"];
const PACKAGE_PATH_PATTERN = /^node_modules\/(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\/\/)[^\\]+$/u;
const SHA512_INTEGRITY_PATTERN = /^sha512-([A-Za-z0-9+/]{86}==)$/u;

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (value, expectedKeys) =>
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify(expectedKeys);

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim() === value && value.length > 0;

const isSha512Integrity = (value) => {
  if (typeof value !== "string") return false;
  const match = SHA512_INTEGRITY_PATTERN.exec(value);
  if (match === null) return false;
  const digest = Buffer.from(match[1], "base64");
  return digest.length === 64 && digest.toString("base64") === match[1];
};

const parseRegistryOrigin = (value) => {
  if (typeof value !== "string") return null;
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash ||
      parsed.origin !== value
    ) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
};

const parsePolicy = (value) => {
  if (!isRecord(value) || !hasExactKeys(value, EXPECTED_POLICY_KEYS)) {
    throw new Error(
      `policy must contain exactly: ${EXPECTED_POLICY_KEYS.join(", ")}`,
    );
  }
  if (value.schemaVersion !== POLICY_SCHEMA_VERSION) {
    throw new Error(
      `policy schemaVersion must be ${POLICY_SCHEMA_VERSION}`,
    );
  }
  if (!Number.isInteger(value.lockfileVersion) || value.lockfileVersion < 1) {
    throw new Error("policy lockfileVersion must be a positive integer");
  }
  if (value.requiredIntegrityAlgorithm !== "sha512") {
    throw new Error("policy requiredIntegrityAlgorithm must be sha512");
  }
  if (
    !Array.isArray(value.allowedRegistryOrigins) ||
    value.allowedRegistryOrigins.length === 0
  ) {
    throw new Error("policy allowedRegistryOrigins must be a non-empty array");
  }

  const allowedRegistryOrigins = value.allowedRegistryOrigins.map(
    (candidate) => {
      const origin = parseRegistryOrigin(candidate);
      if (origin === null) {
        throw new Error(
          `policy registry origin must be a canonical HTTPS origin: ${String(candidate)}`,
        );
      }
      return origin;
    },
  );
  if (new Set(allowedRegistryOrigins).size !== allowedRegistryOrigins.length) {
    throw new Error("policy registry origins must be unique");
  }
  if (
    JSON.stringify([...allowedRegistryOrigins].sort()) !==
    JSON.stringify(allowedRegistryOrigins)
  ) {
    throw new Error("policy registry origins must be sorted");
  }

  if (!Array.isArray(value.installScriptAllowlist)) {
    throw new Error("policy installScriptAllowlist must be an array");
  }
  const installScriptAllowlist = value.installScriptAllowlist.map(
    (candidate, index) => {
      if (
        !isRecord(candidate) ||
        !hasExactKeys(candidate, EXPECTED_ALLOWLIST_KEYS)
      ) {
        throw new Error(
          `installScriptAllowlist[${index}] must contain exactly: ${EXPECTED_ALLOWLIST_KEYS.join(", ")}`,
        );
      }
      if (
        !isNonEmptyString(candidate.packagePath) ||
        candidate.packagePath.includes("\u0000") ||
        !PACKAGE_PATH_PATTERN.test(candidate.packagePath)
      ) {
        throw new Error(
          `installScriptAllowlist[${index}].packagePath is invalid`,
        );
      }
      if (!isNonEmptyString(candidate.version)) {
        throw new Error(
          `installScriptAllowlist[${index}].version is invalid`,
        );
      }
      if (!isSha512Integrity(candidate.integrity)) {
        throw new Error(
          `installScriptAllowlist[${index}].integrity must be a SHA-512 SRI digest`,
        );
      }
      return {
        packagePath: candidate.packagePath,
        version: candidate.version,
        integrity: candidate.integrity,
      };
    },
  );

  const packagePaths = installScriptAllowlist.map(
    (entry) => entry.packagePath,
  );
  if (new Set(packagePaths).size !== packagePaths.length) {
    throw new Error("install-script package paths must be unique");
  }
  if (
    JSON.stringify([...packagePaths].sort()) !== JSON.stringify(packagePaths)
  ) {
    throw new Error("install-script allowlist must be sorted by packagePath");
  }

  return {
    lockfileVersion: value.lockfileVersion,
    allowedRegistryOrigins: new Set(allowedRegistryOrigins),
    installScriptAllowlist,
  };
};

const verifyResolvedSource = (
  packagePath,
  resolved,
  allowedRegistryOrigins,
) => {
  if (typeof resolved !== "string") {
    return `${packagePath}: resolved source is required`;
  }

  let parsed;
  try {
    parsed = new URL(resolved);
  } catch {
    return `${packagePath}: resolved source is not a valid URL`;
  }

  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    return `${packagePath}: resolved source must use HTTPS without credentials`;
  }
  if (!allowedRegistryOrigins.has(parsed.origin)) {
    return `${packagePath}: resolved source origin ${parsed.origin} is not an allowed registry`;
  }
  if (
    parsed.search ||
    parsed.hash ||
    !parsed.pathname.startsWith("/") ||
    !parsed.pathname.endsWith(".tgz")
  ) {
    return `${packagePath}: resolved source must be a canonical registry tarball URL`;
  }
  try {
    const decodedPath = decodeURIComponent(parsed.pathname);
    if (
      decodedPath.includes("\\") ||
      decodedPath.includes("\u0000") ||
      decodedPath.split("/").includes("..")
    ) {
      return `${packagePath}: resolved source contains an unsafe path`;
    }
  } catch {
    return `${packagePath}: resolved source contains invalid URL encoding`;
  }
  return null;
};

export const verifyLockfilePolicy = (lockfileValue, policyValue) => {
  const policy = parsePolicy(policyValue);
  if (!isRecord(lockfileValue)) {
    throw new Error("lockfile root must be an object");
  }
  if (lockfileValue.lockfileVersion !== policy.lockfileVersion) {
    throw new Error(
      `lockfileVersion must be ${policy.lockfileVersion}, received ${String(lockfileValue.lockfileVersion)}`,
    );
  }
  if (!isRecord(lockfileValue.packages) || !isRecord(lockfileValue.packages[""])) {
    throw new Error("lockfile must contain a root packages entry");
  }

  const errors = [];
  const actualInstallScriptEntries = new Map();
  let registryPackageCount = 0;

  for (const [packagePath, packageEntry] of Object.entries(
    lockfileValue.packages,
  )) {
    if (packagePath === "") continue;
    if (!PACKAGE_PATH_PATTERN.test(packagePath)) {
      errors.push(`${packagePath}: package path is invalid`);
      continue;
    }
    if (!isRecord(packageEntry)) {
      errors.push(`${packagePath}: package entry must be an object`);
      continue;
    }
    if (packageEntry.link === true) {
      errors.push(`${packagePath}: local/link package sources are not allowed`);
      continue;
    }
    if (
      Object.hasOwn(packageEntry, "hasInstallScript") &&
      typeof packageEntry.hasInstallScript !== "boolean"
    ) {
      errors.push(`${packagePath}: hasInstallScript must be a boolean`);
    }
    if (!isNonEmptyString(packageEntry.version)) {
      errors.push(`${packagePath}: exact package version is required`);
    }

    const sourceError = verifyResolvedSource(
      packagePath,
      packageEntry.resolved,
      policy.allowedRegistryOrigins,
    );
    if (sourceError !== null) errors.push(sourceError);
    else registryPackageCount += 1;

    if (!isSha512Integrity(packageEntry.integrity)) {
      errors.push(`${packagePath}: registry package requires a SHA-512 integrity digest`);
    }

    if (packageEntry.hasInstallScript === true) {
      actualInstallScriptEntries.set(packagePath, {
        packagePath,
        version: packageEntry.version,
        integrity: packageEntry.integrity,
      });
    }
  }

  const expectedInstallScriptEntries = new Map(
    policy.installScriptAllowlist.map((entry) => [entry.packagePath, entry]),
  );
  for (const [packagePath, actual] of actualInstallScriptEntries) {
    const expected = expectedInstallScriptEntries.get(packagePath);
    if (expected === undefined) {
      errors.push(
        `${packagePath}: package with install script is not explicitly allowlisted`,
      );
      continue;
    }
    if (
      actual.version !== expected.version ||
      actual.integrity !== expected.integrity
    ) {
      errors.push(
        `${packagePath}: install-script package does not exactly match its allowlisted version and integrity`,
      );
    }
  }
  for (const packagePath of expectedInstallScriptEntries.keys()) {
    if (!actualInstallScriptEntries.has(packagePath)) {
      errors.push(
        `${packagePath}: allowlisted install-script package is absent or no longer declares hasInstallScript`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Supply-chain lockfile policy failed:\n${errors.map((error) => `- ${error}`).join("\n")}`,
    );
  }
  return {
    registryPackageCount,
    installScriptPackageCount: actualInstallScriptEntries.size,
  };
};

const readJson = (path, label) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read ${label} JSON at ${path}: ${detail}`, {
      cause: error,
    });
  }
};

const parseArguments = (argv) => {
  const argumentsByName = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (
      (name !== "--policy" && name !== "--lockfile") ||
      value === undefined ||
      argumentsByName.has(name)
    ) {
      throw new Error(
        "Usage: node scripts/verify-lockfile-policy.mjs [--policy PATH] [--lockfile PATH]",
      );
    }
    argumentsByName.set(name, value);
  }
  return argumentsByName;
};

const run = () => {
  const repositoryRoot = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const argumentsByName = parseArguments(process.argv.slice(2));
  const policyPath = resolve(
    argumentsByName.get("--policy") ??
      resolve(repositoryRoot, "config", "supply-chain-policy.json"),
  );
  const lockfilePath = resolve(
    argumentsByName.get("--lockfile") ??
      resolve(repositoryRoot, "package-lock.json"),
  );
  const result = verifyLockfilePolicy(
    readJson(lockfilePath, "lockfile"),
    readJson(policyPath, "policy"),
  );
  process.stdout.write(
    `Supply-chain lockfile policy passed: ${result.registryPackageCount} registry packages; ${result.installScriptPackageCount} approved install-script packages.\n`,
  );
};

if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    run();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${detail}\n`);
    process.exitCode = 1;
  }
}
