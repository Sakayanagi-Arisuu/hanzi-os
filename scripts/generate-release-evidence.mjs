import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  writeFile,
} from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  BUILD_PROVENANCE_FILE,
  BUILD_PROVENANCE_SCHEMA_VERSION,
  validateAttestableBuildProvenance,
} from "./build-provenance.mjs";

const execFileAsync = promisify(execFile);

export const RELEASE_EVIDENCE_DIRECTORY = "release-evidence";
export const RELEASE_EVIDENCE_MANIFEST = "manifest.json";
export const RELEASE_EVIDENCE_SBOM = "sbom.cdx.json";

const SOURCE_REVISION_PATTERN = /^(?:[0-9a-fA-F]{40}|[0-9a-fA-F]{64})$/u;
const SAFE_CONTENT_VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/u;
const NPM_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const MAX_SBOM_OUTPUT_BYTES = 64 * 1024 * 1024;

const compareCodeUnits = (left, right) => {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
};

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const canonicalizeJson = (value) => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Canonical JSON cannot contain a non-finite number");
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalizeJson);
  }
  if (!isRecord(value)) {
    throw new Error(`Canonical JSON cannot contain ${typeof value}`);
  }

  return Object.fromEntries(
    Object.keys(value)
      .sort(compareCodeUnits)
      .map((key) => [key, canonicalizeJson(value[key])]),
  );
};

export const serializeCanonicalJson = (value) =>
  `${JSON.stringify(canonicalizeJson(value), null, 2)}\n`;

export const computeBuildSha256 = ({
  artifactCount,
  artifacts,
  bytes,
  excludedPath,
  root,
}) =>
  sha256Bytes(
    serializeCanonicalJson({
      artifactCount,
      artifacts,
      bytes,
      excludedPath,
      root,
    }),
  );

const sortCanonicalCollection = (collection) =>
  collection
    .map(canonicalizeJson)
    .sort((left, right) =>
      compareCodeUnits(JSON.stringify(left), JSON.stringify(right)),
    );

const compareRecordKeyThenCanonical = (key) => (left, right) => {
  const keyComparison = compareCodeUnits(
    String(left[key] ?? ""),
    String(right[key] ?? ""),
  );
  if (keyComparison !== 0) return keyComparison;
  return compareCodeUnits(
    JSON.stringify(canonicalizeJson(left)),
    JSON.stringify(canonicalizeJson(right)),
  );
};

export const sanitizeCycloneDxSbom = (input) => {
  if (
    !isRecord(input) ||
    input.bomFormat !== "CycloneDX" ||
    typeof input.specVersion !== "string"
  ) {
    throw new Error("npm did not return a valid CycloneDX SBOM");
  }

  const result = structuredClone(input);
  delete result.serialNumber;

  if (isRecord(result.metadata)) {
    delete result.metadata.timestamp;
    if (Array.isArray(result.metadata.tools)) {
      result.metadata.tools = sortCanonicalCollection(result.metadata.tools);
    }
    if (Array.isArray(result.metadata.lifecycles)) {
      result.metadata.lifecycles = sortCanonicalCollection(
        result.metadata.lifecycles,
      );
    }
  }

  if (Array.isArray(result.components)) {
    result.components = result.components
      .map((component) => {
        if (!isRecord(component)) {
          throw new Error("CycloneDX components must be objects");
        }
        const normalized = structuredClone(component);
        for (const key of [
          "externalReferences",
          "hashes",
          "licenses",
          "properties",
        ]) {
          if (Array.isArray(normalized[key])) {
            normalized[key] = sortCanonicalCollection(normalized[key]);
          }
        }
        return normalized;
      })
      .sort(compareRecordKeyThenCanonical("bom-ref"));
  }

  if (Array.isArray(result.dependencies)) {
    result.dependencies = result.dependencies
      .map((dependency) => {
        if (!isRecord(dependency)) {
          throw new Error("CycloneDX dependencies must be objects");
        }
        const normalized = structuredClone(dependency);
        if (Array.isArray(normalized.dependsOn)) {
          normalized.dependsOn = [...normalized.dependsOn].sort(compareCodeUnits);
        }
        return normalized;
      })
      .sort(compareRecordKeyThenCanonical("ref"));
  }

  return canonicalizeJson(result);
};

export const normalizeSourceRevision = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !SOURCE_REVISION_PATTERN.test(value)) {
    throw new Error("source revision must be exactly 40 or 64 hexadecimal characters");
  }
  return value.toLowerCase();
};

export const validateGitSourceRevision = ({
  requestedRevision,
  headRevision,
  worktreeStatus,
}) => {
  const requested = normalizeSourceRevision(requestedRevision);
  const head = normalizeSourceRevision(
    typeof headRevision === "string" ? headRevision.trim() : headRevision,
  );
  if (requested === null || head === null || requested !== head) {
    throw new Error(
      "source revision must exactly match the checked-out Git HEAD",
    );
  }
  if (typeof worktreeStatus !== "string" || worktreeStatus.trim().length > 0) {
    throw new Error(
      "source revision cannot be verified while the Git worktree is dirty",
    );
  }
  return requested;
};

export const parseCliArguments = (argumentsList) => {
  let rebuildFromSource = false;
  let requireSourceRevision = false;
  let sourceRevision = null;
  let sourceRevisionFromHead = false;
  let sourceRevisionSeen = false;

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--require-source-revision") {
      if (requireSourceRevision) {
        throw new Error("--require-source-revision may be supplied only once");
      }
      requireSourceRevision = true;
      continue;
    }
    if (argument === "--rebuild-from-source") {
      if (rebuildFromSource) {
        throw new Error("--rebuild-from-source may be supplied only once");
      }
      rebuildFromSource = true;
      continue;
    }
    if (argument === "--source-revision-from-head") {
      if (sourceRevisionFromHead) {
        throw new Error("--source-revision-from-head may be supplied only once");
      }
      sourceRevisionFromHead = true;
      continue;
    }
    if (argument === "--source-revision") {
      if (sourceRevisionSeen) {
        throw new Error("--source-revision may be supplied only once");
      }
      const value = argumentsList[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error("--source-revision requires a value");
      }
      sourceRevision = normalizeSourceRevision(value);
      sourceRevisionSeen = true;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  if (sourceRevisionFromHead && sourceRevisionSeen) {
    throw new Error(
      "--source-revision-from-head cannot be combined with --source-revision",
    );
  }
  if (
    requireSourceRevision
    && sourceRevision === null
    && !sourceRevisionFromHead
  ) {
    throw new Error(
      "--require-source-revision requires --source-revision or --source-revision-from-head",
    );
  }
  if (
    rebuildFromSource &&
    sourceRevision === null &&
    !sourceRevisionFromHead
  ) {
    throw new Error(
      "--rebuild-from-source requires --source-revision or --source-revision-from-head",
    );
  }
  if (requireSourceRevision && !rebuildFromSource) {
    throw new Error(
      "--require-source-revision requires --rebuild-from-source so dist is rebuilt from the verified source",
    );
  }

  return {
    attestable: sourceRevision !== null || sourceRevisionFromHead,
    rebuildFromSource,
    requireSourceRevision,
    sourceRevision,
    sourceRevisionFromHead,
  };
};

export const validateSafeRelativePath = (relativePath) => {
  if (
    typeof relativePath !== "string" ||
    relativePath.length === 0 ||
    relativePath.includes("\0") ||
    relativePath.includes("\\") ||
    relativePath.includes(":") ||
    isAbsolute(relativePath)
  ) {
    throw new Error(`Unsafe relative path: ${String(relativePath)}`);
  }

  const segments = relativePath.split("/");
  if (
    segments.some(
      (segment) => segment.length === 0 || segment === "." || segment === "..",
    )
  ) {
    throw new Error(`Unsafe relative path: ${relativePath}`);
  }
  return relativePath;
};

export const resolveContainedPath = (rootPath, relativePath) => {
  const safeRelativePath = validateSafeRelativePath(relativePath);
  const absoluteRoot = resolve(rootPath);
  const candidate = resolve(absoluteRoot, ...safeRelativePath.split("/"));
  const prefix = `${absoluteRoot}${sep}`;
  if (!candidate.startsWith(prefix)) {
    throw new Error(`Path escapes its root: ${relativePath}`);
  }
  return candidate;
};

export const isReleaseEvidencePath = (relativePath) =>
  relativePath === RELEASE_EVIDENCE_DIRECTORY ||
  relativePath.startsWith(`${RELEASE_EVIDENCE_DIRECTORY}/`);

const toPortableRelativePath = (rootPath, absolutePath) => {
  const result = relative(rootPath, absolutePath).split(sep).join("/");
  return validateSafeRelativePath(result);
};

const assertDirectoryWithoutSymlink = async (directoryPath, label) => {
  const stats = await lstat(directoryPath);
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new Error(`${label} must be a real directory, not a symlink`);
  }
  return stats;
};

const assertRegularFileWithoutSymlink = async (filePath, label) => {
  const stats = await lstat(filePath);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new Error(`${label} must be a regular file, not a symlink`);
  }
  return stats;
};

export const sha256Bytes = (value) =>
  createHash("sha256").update(value).digest("hex");

export const hashRegularFile = async (filePath) => {
  await assertRegularFileWithoutSymlink(filePath, filePath);
  const handle = await open(filePath, "r");
  try {
    const openedStats = await handle.stat();
    if (!openedStats.isFile()) {
      throw new Error(`${filePath} is not a regular file`);
    }

    const hash = createHash("sha256");
    const buffer = Buffer.allocUnsafe(64 * 1024);
    let bytes = 0;
    while (true) {
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      hash.update(buffer.subarray(0, bytesRead));
      bytes += bytesRead;
    }
    if (bytes !== openedStats.size) {
      throw new Error(`${filePath} changed while it was being hashed`);
    }
    return {
      bytes,
      sha256: hash.digest("hex"),
    };
  } finally {
    await handle.close();
  }
};

export const collectDistArtifacts = async (distDirectory) => {
  await assertDirectoryWithoutSymlink(distDirectory, "dist");
  const absoluteRoot = await realpath(distDirectory);
  const artifacts = [];

  const walk = async (directoryPath) => {
    const entries = await readdir(directoryPath, { withFileTypes: true });
    entries.sort((left, right) => compareCodeUnits(left.name, right.name));

    for (const entry of entries) {
      const entryPath = resolve(directoryPath, entry.name);
      const relativePath = toPortableRelativePath(absoluteRoot, entryPath);
      if (isReleaseEvidencePath(relativePath)) continue;

      const stats = await lstat(entryPath);
      if (stats.isSymbolicLink()) {
        throw new Error(`Build artifact may not be a symlink: ${relativePath}`);
      }
      if (stats.isDirectory()) {
        await walk(entryPath);
        continue;
      }
      if (!stats.isFile()) {
        throw new Error(`Build artifact must be a regular file: ${relativePath}`);
      }

      artifacts.push({
        path: relativePath,
        ...(await hashRegularFile(entryPath)),
      });
    }
  };

  await walk(absoluteRoot);
  artifacts.sort((left, right) => compareCodeUnits(left.path, right.path));
  return artifacts;
};

const parseJsonFile = async (filePath, label) => {
  const raw = await readFile(filePath, "utf8");
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${label} must contain valid JSON`);
  }
};

const resolveLocalNpmCli = async () => {
  const npmCliPath = resolve(
    dirname(process.execPath),
    "node_modules",
    "npm",
    "bin",
    "npm-cli.js",
  );
  await assertRegularFileWithoutSymlink(
    npmCliPath,
    "locally installed npm CLI",
  );
  return npmCliPath;
};

const runLocalNpm = async (argumentsList, rootDirectory) => {
  const npmCliPath = await resolveLocalNpmCli();
  const { stdout } = await execFileAsync(process.execPath, [npmCliPath, ...argumentsList], {
    cwd: rootDirectory,
    encoding: "utf8",
    env: {
      ...process.env,
      NO_UPDATE_NOTIFIER: "1",
      npm_config_audit: "false",
      npm_config_fund: "false",
      npm_config_offline: "true",
      npm_config_update_notifier: "false",
    },
    maxBuffer: MAX_SBOM_OUTPUT_BYTES,
    windowsHide: true,
  });
  return stdout;
};

const readGitSourceIdentity = async (rootDirectory) => {
  try {
    const [
      { stdout: headRevision },
      { stdout: headTree },
      { stdout: worktreeStatus },
    ] = await Promise.all([
      execFileAsync(
        "git",
        ["rev-parse", "--verify", "HEAD^{commit}"],
        {
          cwd: rootDirectory,
          encoding: "utf8",
          windowsHide: true,
        },
      ),
      execFileAsync(
        "git",
        ["rev-parse", "--verify", "HEAD^{tree}"],
        {
          cwd: rootDirectory,
          encoding: "utf8",
          windowsHide: true,
        },
      ),
      execFileAsync(
        "git",
        ["status", "--porcelain=v1", "--untracked-files=all"],
        {
          cwd: rootDirectory,
          encoding: "utf8",
          windowsHide: true,
        },
      ),
    ]);
    return {
      headRevision,
      headTree,
      worktreeStatus,
    };
  } catch {
    throw new Error(
      "source revision verification requires an accessible Git checkout",
    );
  }
};

const verifyRequestedSourceIdentity = async (
  rootDirectory,
  requestedRevision,
) => {
  if (requestedRevision === null) return null;
  const { headRevision, headTree, worktreeStatus } =
    await readGitSourceIdentity(rootDirectory);
  const sourceRevision = validateGitSourceRevision({
    requestedRevision,
    headRevision,
    worktreeStatus,
  });
  return {
    sourceRevision,
    sourceTree: normalizeSourceRevision(headTree.trim()),
  };
};

export const readGitHeadRevision = async (rootDirectory) => {
  const { headRevision } = await readGitSourceIdentity(rootDirectory);
  return normalizeSourceRevision(headRevision.trim());
};

const generateNpmSbom = async (rootDirectory) => {
  const npmVersion = (await runLocalNpm(["--version"], rootDirectory)).trim();
  if (!NPM_VERSION_PATTERN.test(npmVersion)) {
    throw new Error("The local npm executable returned an invalid version");
  }

  const rawSbom = await runLocalNpm(
    [
      "sbom",
      "--package-lock-only",
      "--sbom-format",
      "cyclonedx",
      "--sbom-type",
      "application",
    ],
    rootDirectory,
  );

  let parsed;
  try {
    parsed = JSON.parse(rawSbom);
  } catch {
    throw new Error("The local npm executable returned invalid SBOM JSON");
  }
  const sbom = sanitizeCycloneDxSbom(parsed);
  const npmTool = Array.isArray(sbom.metadata?.tools)
    ? sbom.metadata.tools.find(
        (tool) =>
          isRecord(tool) &&
          tool.vendor === "npm" &&
          tool.name === "cli",
      )
    : null;
  if (!isRecord(npmTool) || npmTool.version !== npmVersion) {
    throw new Error("The CycloneDX SBOM tool version does not match local npm");
  }

  return { npmVersion, sbom };
};

const readCurrentContentVersion = async (rootDirectory) => {
  const registryPath = resolveContainedPath(rootDirectory, "content/registry.json");
  await assertRegularFileWithoutSymlink(registryPath, "content registry");
  const registry = await parseJsonFile(registryPath, "content registry");
  if (
    !isRecord(registry) ||
    typeof registry.currentContentVersion !== "string" ||
    !SAFE_CONTENT_VERSION_PATTERN.test(registry.currentContentVersion)
  ) {
    throw new Error("content registry has an invalid currentContentVersion");
  }
  return registry.currentContentVersion;
};

const ensureEvidenceDirectory = async (distDirectory) => {
  const outputDirectory = resolveContainedPath(
    distDirectory,
    RELEASE_EVIDENCE_DIRECTORY,
  );
  try {
    await mkdir(outputDirectory, { recursive: false, mode: 0o700 });
  } catch (error) {
    if (!isRecord(error) || error.code !== "EEXIST") throw error;
  }
  await assertDirectoryWithoutSymlink(outputDirectory, "release-evidence output");

  const realDist = await realpath(distDirectory);
  const realOutput = await realpath(outputDirectory);
  if (!realOutput.startsWith(`${realDist}${sep}`)) {
    throw new Error("release-evidence output escapes dist");
  }

  const expectedNames = new Set([
    RELEASE_EVIDENCE_MANIFEST,
    RELEASE_EVIDENCE_SBOM,
  ]);
  for (const entry of await readdir(outputDirectory, { withFileTypes: true })) {
    if (!expectedNames.has(entry.name)) {
      throw new Error(
        `Unexpected stale file in release-evidence output: ${entry.name}`,
      );
    }
    const entryPath = resolve(outputDirectory, entry.name);
    await assertRegularFileWithoutSymlink(entryPath, `existing ${entry.name}`);
  }
  return outputDirectory;
};

const validateHashRecord = (record, label) => {
  if (
    !isRecord(record) ||
    !Number.isSafeInteger(record.bytes) ||
    record.bytes < 0 ||
    typeof record.sha256 !== "string" ||
    !SHA256_PATTERN.test(record.sha256)
  ) {
    throw new Error(`${label} has invalid hash metadata`);
  }
};

const readVerifiedBuildProvenance = async ({
  artifacts,
  distDirectory,
  packageLock,
  sourceIdentity,
}) => {
  if (!isRecord(sourceIdentity)) {
    throw new Error("attestable release evidence requires a verified source identity");
  }
  const provenancePath = resolveContainedPath(
    distDirectory,
    BUILD_PROVENANCE_FILE,
  );
  await assertRegularFileWithoutSymlink(
    provenancePath,
    "build provenance marker",
  );
  const rawProvenance = await readFile(provenancePath, "utf8");
  let provenance;
  try {
    provenance = JSON.parse(rawProvenance);
  } catch {
    throw new Error("build provenance marker must contain valid JSON");
  }
  const validated = validateAttestableBuildProvenance(provenance, {
    expectedPackageLock: packageLock,
    expectedSourceRevision: sourceIdentity.sourceRevision,
    expectedSourceTree: sourceIdentity.sourceTree,
  });
  const artifact = artifacts.find(
    (candidate) => candidate.path === BUILD_PROVENANCE_FILE,
  );
  const markerSha256 = sha256Bytes(rawProvenance);
  if (
    artifact === undefined ||
    artifact.bytes !== Buffer.byteLength(rawProvenance) ||
    artifact.sha256 !== markerSha256
  ) {
    throw new Error(
      "build provenance marker must be included in the exact dist artifact set",
    );
  }
  return {
    path: BUILD_PROVENANCE_FILE,
    schemaVersion: BUILD_PROVENANCE_SCHEMA_VERSION,
    sourceTree: validated.sourceTree,
    sha256: markerSha256,
  };
};

export const buildEvidenceManifest = ({
  artifacts,
  buildProvenance,
  contentVersion,
  nodeVersion,
  npmVersion,
  packageLock,
  sbom,
  sourceRevision,
}) => {
  const normalizedBuildProvenance = buildProvenance ?? null;
  const normalizedRevision = normalizeSourceRevision(sourceRevision);
  if (
    !Array.isArray(artifacts) ||
    artifacts.length === 0 ||
    typeof contentVersion !== "string" ||
    !SAFE_CONTENT_VERSION_PATTERN.test(contentVersion) ||
    typeof nodeVersion !== "string" ||
    nodeVersion.length === 0 ||
    typeof npmVersion !== "string" ||
    !NPM_VERSION_PATTERN.test(npmVersion)
  ) {
    throw new Error("Cannot build a release-evidence manifest from invalid inputs");
  }
  validateHashRecord(packageLock, "package lock");
  validateHashRecord(sbom, "SBOM");
  if (
    normalizedRevision === null &&
    normalizedBuildProvenance !== null
  ) {
    throw new Error(
      "non-attestable release evidence may not claim build provenance",
    );
  }
  if (normalizedRevision !== null) {
    if (
      !isRecord(normalizedBuildProvenance) ||
      normalizedBuildProvenance.path !== BUILD_PROVENANCE_FILE ||
      normalizedBuildProvenance.schemaVersion !==
        BUILD_PROVENANCE_SCHEMA_VERSION ||
      typeof normalizedBuildProvenance.sourceTree !== "string" ||
      normalizeSourceRevision(normalizedBuildProvenance.sourceTree) === null ||
      typeof normalizedBuildProvenance.sha256 !== "string" ||
      !SHA256_PATTERN.test(normalizedBuildProvenance.sha256)
    ) {
      throw new Error(
        "attestable release evidence requires exact build provenance",
      );
    }
  }

  let previousPath = null;
  let totalBytes = 0;
  const normalizedArtifacts = artifacts.map((artifact) => {
    if (!isRecord(artifact)) {
      throw new Error("Build artifact metadata must be an object");
    }
    const artifactPath = validateSafeRelativePath(artifact.path);
    if (isReleaseEvidencePath(artifactPath)) {
      throw new Error("release-evidence may not hash itself");
    }
    if (
      previousPath !== null &&
      compareCodeUnits(previousPath, artifactPath) >= 0
    ) {
      throw new Error("Build artifacts must have unique deterministic path order");
    }
    validateHashRecord(artifact, `artifact ${artifactPath}`);
    previousPath = artifactPath;
    totalBytes += artifact.bytes;
    if (!Number.isSafeInteger(totalBytes)) {
      throw new Error("Build artifact byte total is too large");
    }
    return {
      bytes: artifact.bytes,
      path: artifactPath,
      sha256: artifact.sha256,
    };
  });

  const build = {
    root: "dist",
    excludedPath: "release-evidence/**",
    artifactCount: normalizedArtifacts.length,
    bytes: totalBytes,
    artifacts: normalizedArtifacts,
  };

  return canonicalizeJson({
    schemaVersion: 2,
    evidenceType: "local-release-evidence",
    attestable: normalizedRevision !== null,
    sourceRevision: normalizedRevision,
    buildProvenance:
      normalizedBuildProvenance === null
        ? null
        : {
            path: normalizedBuildProvenance.path,
            schemaVersion: normalizedBuildProvenance.schemaVersion,
            sourceTree: normalizeSourceRevision(
              normalizedBuildProvenance.sourceTree,
            ),
            sha256: normalizedBuildProvenance.sha256,
          },
    contentVersion,
    toolchain: {
      node: nodeVersion,
      npm: npmVersion,
      sbomCommand:
        "npm sbom --package-lock-only --sbom-format cyclonedx --sbom-type application",
      networkMode: "offline",
    },
    packageLock: {
      path: "package-lock.json",
      bytes: packageLock.bytes,
      sha256: packageLock.sha256,
    },
    build: {
      ...build,
      sha256: computeBuildSha256(build),
    },
    sbom: {
      path: `${RELEASE_EVIDENCE_DIRECTORY}/${RELEASE_EVIDENCE_SBOM}`,
      format: "CycloneDX",
      specVersion: sbom.specVersion,
      bytes: sbom.bytes,
      sha256: sbom.sha256,
    },
  });
};

export const generateReleaseEvidence = async ({
  rebuildFromSource = false,
  rootDirectory,
  sourceRevision = null,
}) => {
  const absoluteRoot = resolve(rootDirectory);
  const distDirectory = resolveContainedPath(absoluteRoot, "dist");
  const packageLockPath = resolveContainedPath(absoluteRoot, "package-lock.json");

  await assertRegularFileWithoutSymlink(packageLockPath, "package-lock.json");
  if (rebuildFromSource && sourceRevision === null) {
    throw new Error(
      "rebuilding release evidence requires an exact source revision",
    );
  }
  let verifiedSourceIdentity = await verifyRequestedSourceIdentity(
    absoluteRoot,
    sourceRevision,
  );
  if (rebuildFromSource) {
    await runLocalNpm(["run", "build"], absoluteRoot);
    verifiedSourceIdentity = await verifyRequestedSourceIdentity(
      absoluteRoot,
      sourceRevision,
    );
  }

  await assertDirectoryWithoutSymlink(distDirectory, "dist");
  const [artifacts, packageLock, contentVersion] = await Promise.all([
    collectDistArtifacts(distDirectory),
    hashRegularFile(packageLockPath),
    readCurrentContentVersion(absoluteRoot),
  ]);
  if (artifacts.length === 0) {
    throw new Error(
      "dist has no build artifacts; run the production build before generating evidence",
    );
  }
  const buildProvenance =
    verifiedSourceIdentity === null
      ? null
      : await readVerifiedBuildProvenance({
          artifacts,
          distDirectory,
          packageLock,
          sourceIdentity: verifiedSourceIdentity,
        });

  const { npmVersion, sbom } = await generateNpmSbom(absoluteRoot);
  const [
    artifactsAfterSbom,
    packageLockAfterSbom,
    contentVersionAfterSbom,
  ] = await Promise.all([
    collectDistArtifacts(distDirectory),
    hashRegularFile(packageLockPath),
    readCurrentContentVersion(absoluteRoot),
  ]);
  if (
    serializeCanonicalJson(artifactsAfterSbom)
      !== serializeCanonicalJson(artifacts)
    || serializeCanonicalJson(packageLockAfterSbom)
      !== serializeCanonicalJson(packageLock)
    || contentVersionAfterSbom !== contentVersion
  ) {
    throw new Error(
      "build artifacts, package lock or content version changed while release evidence was generated",
    );
  }
  if (verifiedSourceIdentity !== null) {
    const identityAfterSbom = await verifyRequestedSourceIdentity(
      absoluteRoot,
      sourceRevision,
    );
    if (
      identityAfterSbom.sourceRevision !==
        verifiedSourceIdentity.sourceRevision ||
      identityAfterSbom.sourceTree !== verifiedSourceIdentity.sourceTree
    ) {
      throw new Error(
        "verified Git source identity changed while release evidence was generated",
      );
    }
    await readVerifiedBuildProvenance({
      artifacts: artifactsAfterSbom,
      distDirectory,
      packageLock: packageLockAfterSbom,
      sourceIdentity: identityAfterSbom,
    });
  }
  const sbomJson = serializeCanonicalJson(sbom);
  const sbomMetadata = {
    bytes: Buffer.byteLength(sbomJson),
    sha256: sha256Bytes(sbomJson),
    specVersion: sbom.specVersion,
  };
  const manifest = buildEvidenceManifest({
    artifacts,
    buildProvenance,
    contentVersion,
    nodeVersion: process.version,
    npmVersion,
    packageLock,
    sbom: sbomMetadata,
    sourceRevision: verifiedSourceIdentity?.sourceRevision ?? null,
  });
  const manifestJson = serializeCanonicalJson(manifest);

  const outputDirectory = await ensureEvidenceDirectory(distDirectory);
  const sbomPath = resolveContainedPath(outputDirectory, RELEASE_EVIDENCE_SBOM);
  const manifestPath = resolveContainedPath(
    outputDirectory,
    RELEASE_EVIDENCE_MANIFEST,
  );
  await writeFile(sbomPath, sbomJson, { encoding: "utf8", mode: 0o600 });
  await writeFile(manifestPath, manifestJson, { encoding: "utf8", mode: 0o600 });

  return {
    artifactCount: artifacts.length,
    artifactBytes: manifest.build.bytes,
    attestable: manifest.attestable,
    contentVersion,
    manifestPath,
    sbomPath,
    sbomSha256: sbomMetadata.sha256,
    sourceRevision: manifest.sourceRevision,
  };
};

const isMainModule =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  try {
    const options = parseCliArguments(process.argv.slice(2));
    const scriptDirectory = dirname(fileURLToPath(import.meta.url));
    const rootDirectory = resolve(scriptDirectory, "..");
    const sourceRevision = options.sourceRevisionFromHead
      ? await readGitHeadRevision(rootDirectory)
      : options.sourceRevision;
    const result = await generateReleaseEvidence({
      rebuildFromSource: options.rebuildFromSource,
      rootDirectory,
      sourceRevision,
    });
    console.log(
      [
        `Release evidence generated for ${result.contentVersion}.`,
        `${result.artifactCount} build artifacts (${result.artifactBytes} bytes).`,
        `SBOM SHA-256: ${result.sbomSha256}.`,
        result.attestable
          ? `Source revision: ${result.sourceRevision}.`
          : "Source revision: unavailable; attestable=false.",
      ].join(" "),
    );
  } catch (error) {
    console.error(
      `Release evidence generation failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
    process.exitCode = 1;
  }
}
