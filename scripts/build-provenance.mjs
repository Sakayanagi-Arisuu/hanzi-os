import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const BUILD_PROVENANCE_FILE = "build-provenance.json";
export const BUILD_PROVENANCE_PROTOCOL = "clean-git-snapshot-v1";
export const BUILD_PROVENANCE_SCHEMA_VERSION = 1;

const BUILD_STATE_RELATIVE_PATH = ".vite/hanzi-os-build-provenance.json";
const GIT_OBJECT_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const sha256Bytes = (value) =>
  createHash("sha256").update(value).digest("hex");

const CLEAN_WORKTREE_STATUS_SHA256 = sha256Bytes("");

const normalizeGitObjectId = (value, label) => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!GIT_OBJECT_PATTERN.test(normalized)) {
    throw new Error(`${label} must be a 40 or 64 character Git object id`);
  }
  return normalized;
};

const assertExactKeys = (value, expectedKeys, label) => {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(sortedExpectedKeys)) {
    throw new Error(`${label} has an invalid shape`);
  }
};

const hashRegularFile = async (filePath, label) => {
  const stats = await lstat(filePath);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new Error(`${label} must be a regular file`);
  }
  const bytes = await readFile(filePath);
  return {
    bytes: bytes.byteLength,
    sha256: sha256Bytes(bytes),
  };
};

const runGit = async (argumentsList, rootDirectory) => {
  const { stdout } = await execFileAsync("git", argumentsList, {
    cwd: rootDirectory,
    encoding: "utf8",
    windowsHide: true,
  });
  return stdout;
};

export const captureBuildSourceState = async (rootDirectory) => {
  const absoluteRoot = resolve(rootDirectory);
  const packageLock = await hashRegularFile(
    resolve(absoluteRoot, "package-lock.json"),
    "package-lock.json",
  );

  try {
    const [sourceRevision, sourceTree, worktreeStatus] = await Promise.all([
      runGit(["rev-parse", "--verify", "HEAD^{commit}"], absoluteRoot),
      runGit(["rev-parse", "--verify", "HEAD^{tree}"], absoluteRoot),
      runGit(
        ["status", "--porcelain=v1", "--untracked-files=all"],
        absoluteRoot,
      ),
    ]);
    return {
      gitAvailable: true,
      packageLock,
      sourceRevision: normalizeGitObjectId(
        sourceRevision,
        "Git source revision",
      ),
      sourceTree: normalizeGitObjectId(sourceTree, "Git source tree"),
      worktreeClean: worktreeStatus.length === 0,
      worktreeStatusSha256: sha256Bytes(worktreeStatus),
    };
  } catch {
    return {
      gitAvailable: false,
      packageLock,
      sourceRevision: null,
      sourceTree: null,
      worktreeClean: false,
      worktreeStatusSha256: null,
    };
  }
};

const validateHashRecord = (value, label) => {
  assertExactKeys(value, ["bytes", "sha256"], label);
  if (
    !Number.isSafeInteger(value.bytes) ||
    value.bytes < 0 ||
    typeof value.sha256 !== "string" ||
    !SHA256_PATTERN.test(value.sha256)
  ) {
    throw new Error(`${label} has invalid hash metadata`);
  }
  return {
    bytes: value.bytes,
    sha256: value.sha256,
  };
};

const validateCapturedSourceState = (value, label) => {
  assertExactKeys(
    value,
    [
      "gitAvailable",
      "packageLock",
      "sourceRevision",
      "sourceTree",
      "worktreeClean",
      "worktreeStatusSha256",
    ],
    label,
  );
  if (
    typeof value.gitAvailable !== "boolean" ||
    typeof value.worktreeClean !== "boolean"
  ) {
    throw new Error(`${label} has invalid Git availability metadata`);
  }
  const packageLock = validateHashRecord(
    value.packageLock,
    `${label}.packageLock`,
  );
  if (!value.gitAvailable) {
    if (
      value.sourceRevision !== null ||
      value.sourceTree !== null ||
      value.worktreeClean ||
      value.worktreeStatusSha256 !== null
    ) {
      throw new Error(`${label} has inconsistent unavailable-Git metadata`);
    }
    return {
      gitAvailable: false,
      packageLock,
      sourceRevision: null,
      sourceTree: null,
      worktreeClean: false,
      worktreeStatusSha256: null,
    };
  }
  if (
    typeof value.worktreeStatusSha256 !== "string" ||
    !SHA256_PATTERN.test(value.worktreeStatusSha256)
  ) {
    throw new Error(`${label}.worktreeStatusSha256 must be a sha256 digest`);
  }
  if (
    value.worktreeClean &&
    value.worktreeStatusSha256 !== CLEAN_WORKTREE_STATUS_SHA256
  ) {
    throw new Error(`${label} has inconsistent clean-worktree metadata`);
  }
  return {
    gitAvailable: true,
    packageLock,
    sourceRevision: normalizeGitObjectId(
      value.sourceRevision,
      `${label}.sourceRevision`,
    ),
    sourceTree: normalizeGitObjectId(
      value.sourceTree,
      `${label}.sourceTree`,
    ),
    worktreeClean: value.worktreeClean,
    worktreeStatusSha256: value.worktreeStatusSha256,
  };
};

const sameHashRecord = (left, right) =>
  left.bytes === right.bytes && left.sha256 === right.sha256;

export const createBuildProvenance = ({ start, finish }) => {
  const validStart = validateCapturedSourceState(start, "build start state");
  const validFinish = validateCapturedSourceState(
    finish,
    "build finish state",
  );
  const invalidReasons = [];

  if (!validStart.gitAvailable) {
    invalidReasons.push("git-unavailable-at-build-start");
  }
  if (!validFinish.gitAvailable) {
    invalidReasons.push("git-unavailable-at-build-finish");
  }
  if (!validStart.worktreeClean) {
    invalidReasons.push("worktree-not-clean-at-build-start");
  }
  if (!validFinish.worktreeClean) {
    invalidReasons.push("worktree-not-clean-at-build-finish");
  }
  if (validStart.sourceRevision !== validFinish.sourceRevision) {
    invalidReasons.push("source-revision-changed-during-build");
  }
  if (validStart.sourceTree !== validFinish.sourceTree) {
    invalidReasons.push("source-tree-changed-during-build");
  }
  if (!sameHashRecord(validStart.packageLock, validFinish.packageLock)) {
    invalidReasons.push("package-lock-changed-during-build");
  }

  const attestable = invalidReasons.length === 0;
  return {
    schemaVersion: BUILD_PROVENANCE_SCHEMA_VERSION,
    evidenceType: "hanzi-os-build-provenance",
    buildProtocol: BUILD_PROVENANCE_PROTOCOL,
    attestable,
    sourceRevision: attestable ? validStart.sourceRevision : null,
    sourceTree: attestable ? validStart.sourceTree : null,
    packageLock: attestable ? validStart.packageLock : null,
    invalidReasons,
  };
};

export const validateAttestableBuildProvenance = (
  value,
  {
    expectedPackageLock,
    expectedSourceRevision,
    expectedSourceTree,
  },
) => {
  assertExactKeys(
    value,
    [
      "schemaVersion",
      "evidenceType",
      "buildProtocol",
      "attestable",
      "sourceRevision",
      "sourceTree",
      "packageLock",
      "invalidReasons",
    ],
    "build provenance",
  );
  if (value.schemaVersion !== BUILD_PROVENANCE_SCHEMA_VERSION) {
    throw new Error(
      `build provenance schemaVersion must be ${BUILD_PROVENANCE_SCHEMA_VERSION}`,
    );
  }
  if (value.evidenceType !== "hanzi-os-build-provenance") {
    throw new Error("build provenance has an invalid evidenceType");
  }
  if (value.buildProtocol !== BUILD_PROVENANCE_PROTOCOL) {
    throw new Error("build provenance has an invalid buildProtocol");
  }
  if (
    value.attestable !== true ||
    !Array.isArray(value.invalidReasons) ||
    value.invalidReasons.length !== 0
  ) {
    throw new Error(
      "build provenance is not attestable from a clean source snapshot",
    );
  }

  const sourceRevision = normalizeGitObjectId(
    value.sourceRevision,
    "build provenance sourceRevision",
  );
  const sourceTree = normalizeGitObjectId(
    value.sourceTree,
    "build provenance sourceTree",
  );
  const normalizedExpectedRevision = normalizeGitObjectId(
    expectedSourceRevision,
    "expected source revision",
  );
  const normalizedExpectedTree = normalizeGitObjectId(
    expectedSourceTree,
    "expected source tree",
  );
  if (sourceRevision !== normalizedExpectedRevision) {
    throw new Error(
      "build provenance sourceRevision does not match the verified Git HEAD",
    );
  }
  if (sourceTree !== normalizedExpectedTree) {
    throw new Error(
      "build provenance sourceTree does not match the verified Git HEAD tree",
    );
  }
  const packageLock = validateHashRecord(
    value.packageLock,
    "build provenance packageLock",
  );
  const normalizedExpectedPackageLock = validateHashRecord(
    expectedPackageLock,
    "expected packageLock",
  );
  if (!sameHashRecord(packageLock, normalizedExpectedPackageLock)) {
    throw new Error(
      "build provenance packageLock does not match the release input",
    );
  }
  return {
    packageLock,
    sourceRevision,
    sourceTree,
  };
};

const statePathForRoot = (rootDirectory) =>
  resolve(rootDirectory, BUILD_STATE_RELATIVE_PATH);

const distPathForRoot = (rootDirectory) => resolve(rootDirectory, "dist");

const ensurePathDoesNotExist = async (path, label) => {
  try {
    await lstat(path);
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") return;
    throw error;
  }
  throw new Error(`${label} must not exist when the build snapshot starts`);
};

export const startBuildSnapshot = async (rootDirectory) => {
  const absoluteRoot = resolve(rootDirectory);
  await ensurePathDoesNotExist(distPathForRoot(absoluteRoot), "dist");
  const state = {
    schemaVersion: BUILD_PROVENANCE_SCHEMA_VERSION,
    phase: "started",
    source: await captureBuildSourceState(absoluteRoot),
  };
  const statePath = statePathForRoot(absoluteRoot);
  await mkdir(dirname(statePath), { recursive: true, mode: 0o700 });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  return state.source;
};

const readBuildStartState = async (rootDirectory) => {
  const statePath = statePathForRoot(rootDirectory);
  const stats = await lstat(statePath);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new Error("build provenance start state must be a regular file");
  }
  let value;
  try {
    value = JSON.parse(await readFile(statePath, "utf8"));
  } catch {
    throw new Error("build provenance start state must contain valid JSON");
  }
  assertExactKeys(
    value,
    ["schemaVersion", "phase", "source"],
    "build provenance start state",
  );
  if (
    value.schemaVersion !== BUILD_PROVENANCE_SCHEMA_VERSION ||
    value.phase !== "started"
  ) {
    throw new Error("build provenance start state is invalid");
  }
  return validateCapturedSourceState(
    value.source,
    "build provenance start state.source",
  );
};

export const finishBuildSnapshot = async (rootDirectory) => {
  const absoluteRoot = resolve(rootDirectory);
  const distPath = distPathForRoot(absoluteRoot);
  const distStats = await lstat(distPath);
  if (distStats.isSymbolicLink() || !distStats.isDirectory()) {
    throw new Error("dist must be a real build output directory");
  }
  if ((await readdir(distPath)).length === 0) {
    throw new Error("dist must contain build output before provenance is sealed");
  }

  const start = await readBuildStartState(absoluteRoot);
  const finish = await captureBuildSourceState(absoluteRoot);
  const provenance = createBuildProvenance({ start, finish });
  await writeFile(
    resolve(distPath, BUILD_PROVENANCE_FILE),
    `${JSON.stringify(provenance, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  await rm(statePathForRoot(absoluteRoot), { force: true });
  return provenance;
};

const isMainModule =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  try {
    const command = process.argv[2];
    if (process.argv.length !== 3 || !["start", "finish"].includes(command)) {
      throw new Error("usage: node scripts/build-provenance.mjs <start|finish>");
    }
    const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    if (command === "start") {
      const state = await startBuildSnapshot(rootDirectory);
      console.log(
        state.gitAvailable && state.worktreeClean
          ? `Build source snapshot captured for ${state.sourceRevision}.`
          : "Build source snapshot captured as local/unattestable.",
      );
    } else {
      const provenance = await finishBuildSnapshot(rootDirectory);
      console.log(
        provenance.attestable
          ? `Build provenance sealed for ${provenance.sourceRevision}.`
          : `Build provenance sealed as local/unattestable (${provenance.invalidReasons.join(", ")}).`,
      );
    }
  } catch (error) {
    console.error(
      `Build provenance failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
    process.exitCode = 1;
  }
}
