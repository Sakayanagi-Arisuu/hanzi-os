import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";
import {
  assessClosedAlphaEligibility,
  assessPublicationEligibility,
  contentSourceArtifactNames,
  projectSanitizedRuntimeCatalog,
  sha256Json,
  sha256NormalizedText,
  validateContentBundle,
} from "../../src/content/governance.mjs";
import {
  AUDIO_IMPORT_POLICY,
  inspectCanonicalWave,
} from "../../src/content/audioInspection.mjs";
import {
  CHARACTER_DATA_IMPORT_POLICY,
  inspectCharacterLinguisticSourceRecord,
  inspectHanziWriterCharacterData,
} from "../../src/content/characterDataInspection.mjs";

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const contentRoot = join(repositoryRoot, "content");
const registryPath = join(contentRoot, "registry.json");
const governanceLockPath = join(contentRoot, ".governance.lock");
const SAFE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const SAFE_AUDIO_ASSET_ID_PATTERN = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9_-])?$/;
const SHA256_DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;
const WINDOWS_RESERVED_FILE_STEMS = new Set([
  "con",
  "prn",
  "aux",
  "nul",
  ...Array.from({ length: 9 }, (_, index) => `com${index + 1}`),
  ...Array.from({ length: 9 }, (_, index) => `lpt${index + 1}`),
]);
const REVIEW_ROLES = new Set([
  "content-owner",
  "native-linguistic",
  "source-license",
  "audio-rights",
]);
const REVIEW_DECISIONS = new Set(["approved", "changes-requested"]);
const CHARACTER_SOURCE_KINDS = new Set([
  "linguistic-reference",
  "stroke-dataset",
]);
const CHARACTER_COMPONENT_ROLES = new Set([
  "semantic",
  "phonetic",
  "semantic-phonetic",
  "graphic",
]);
const CHARACTER_COMPONENT_POSITIONS = new Set([
  "whole",
  "left",
  "right",
  "top",
  "bottom",
  "center",
  "enclosing",
  "enclosed",
  "overlaid",
]);
const CHARACTER_STRUCTURE_KINDS = new Set([
  "independent",
  "left-right",
  "top-bottom",
  "left-middle-right",
  "top-middle-bottom",
  "full-surround",
  "surround-from-above",
  "surround-from-below",
  "surround-from-left",
  "surround-from-upper-left",
  "surround-from-upper-right",
  "surround-from-lower-left",
  "overlaid",
]);
const CHARACTER_METADATA_IMPORT_POLICY = Object.freeze({
  maxCharacterCount: 2_048,
  maxComponentsPerCharacter: 64,
  maxSourcesPerCharacter: 16,
  maxSourceFileCount: 8_192,
  maxAggregateSourceByteLength: 64 * 1024 * 1024,
});
const AUDIO_CATALOG_MUTATION_POLICY = Object.freeze({
  maxAssetCount: 10_000,
  maxAggregateByteLength: 512 * 1024 * 1024,
});
const PACKAGE_CONTROL_FILE_MAX_BYTE_LENGTH = 64 * 1024 * 1024;
const PACKAGE_SNAPSHOT_MAX_BYTE_LENGTH = 16 * 1024 * 1024;

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const formatJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readTextIfPresent = (path) =>
  existsSync(path) ? readFileSync(path, "utf8") : null;

const readLiveSourceTexts = (contentSchemaVersion) =>
  Object.fromEntries(
    contentSourceArtifactNames(contentSchemaVersion).map((name) => [
      name,
      readTextIfPresent(join(repositoryRoot, ...name.split("/"))),
    ]),
  );

const immutableSnapshotPath = (packageDirectory, artifactName) =>
  join(packageDirectory, "snapshots", ...artifactName.split("/"));

const readTrustedPackageText = (
  packageDirectory,
  fileRef,
  label,
  {
    optional = false,
    maxByteLength = PACKAGE_CONTROL_FILE_MAX_BYTE_LENGTH,
  } = {},
) => {
  const bytes = captureImmutablePackageArtifact(
    packageDirectory,
    fileRef,
    label,
    maxByteLength,
    { optional },
  );
  if (bytes === null) return null;
  try {
    return new TextDecoder("utf-8", {
      fatal: true,
      ignoreBOM: true,
    }).decode(bytes);
  } catch {
    throw new Error(`${label} must contain valid UTF-8`);
  }
};

const readTrustedPackageJson = (packageDirectory, fileRef, label) => {
  const sourceText = readTrustedPackageText(packageDirectory, fileRef, label);
  try {
    return JSON.parse(sourceText);
  } catch (error) {
    throw new Error(`${label} must contain valid JSON`, { cause: error });
  }
};

const readImmutableSourceTexts = (packageDirectory, contentSchemaVersion) =>
  Object.fromEntries(
    contentSourceArtifactNames(contentSchemaVersion).map((name) => [
      name,
      readTrustedPackageText(
        packageDirectory,
        `snapshots/${name}`,
        `Immutable source snapshot ${name}`,
        {
          optional: true,
          maxByteLength: PACKAGE_SNAPSHOT_MAX_BYTE_LENGTH,
        },
      ),
    ]),
  );

const readItemCatalog = (packageDirectory, contentSchemaVersion) =>
  contentSchemaVersion >= 3
    ? readTrustedPackageJson(
        packageDirectory,
        "item-catalog.json",
        "Package item-catalog.json",
      )
    : null;

const readRuntimeCatalog = (packageDirectory, contentSchemaVersion) =>
  contentSchemaVersion >= 4
    ? readTrustedPackageJson(
        packageDirectory,
        "runtime-catalog.json",
        "Package runtime-catalog.json",
      )
    : null;

const packageLocalPath = (packageDirectory, relativePath) => {
  if (typeof relativePath !== "string") return null;
  const path = resolve(packageDirectory, relativePath);
  const relativeToPackage = relative(packageDirectory, path);
  if (isAbsolute(relativeToPackage) || relativeToPackage.startsWith("..")) {
    return null;
  }
  return path;
};

const pathIsContained = (root, candidate) => {
  const relativePath = relative(root, candidate);
  return !isAbsolute(relativePath)
    && relativePath !== ".."
    && !relativePath.startsWith("..\\")
    && !relativePath.startsWith("../");
};

const pathsAreIdentical = (left, right) => {
  const normalizedLeft = resolve(left);
  const normalizedRight = resolve(right);
  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
};

const assertTrustedPackageDirectory = (packageDirectory, label) => {
  const metadata = lstatSync(packageDirectory);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error(`${label} must be a regular non-symlink directory`);
  }
  const realPackagesDirectory = realpathSync(join(contentRoot, "packages"));
  const realPackageDirectory = realpathSync(packageDirectory);
  if (!pathIsContained(realPackagesDirectory, realPackageDirectory)) {
    throw new Error(`${label} resolves outside content/packages`);
  }
  if (!pathsAreIdentical(packageDirectory, realPackageDirectory)) {
    throw new Error(
      `${label} must not traverse a junction or other reparse point`,
    );
  }
  return realPackageDirectory;
};

export const inspectAudioAssetFiles = (
  packageDirectory,
  itemCatalog,
  contentSchemaVersion,
) => {
  const hashes = {};
  const inspections = {};
  const requiresCanonicalInspection = contentSchemaVersion >= 5;
  const audioAssets = Array.isArray(itemCatalog?.audioAssets)
    ? itemCatalog.audioAssets
    : [];
  const realPackageDirectory = realpathSync(packageDirectory);
  audioAssets.forEach((asset) => {
    const fileRef = asset?.fileRef ?? "";
    const path = packageLocalPath(packageDirectory, fileRef);
    if (path === null || !existsSync(path)) {
      hashes[fileRef] = null;
      inspections[fileRef] = null;
      return;
    }
    try {
      let currentPath = packageDirectory;
      for (const part of relative(packageDirectory, path).split(/[\\/]/u)) {
        currentPath = join(currentPath, part);
        if (lstatSync(currentPath).isSymbolicLink()) {
          hashes[fileRef] = null;
          inspections[fileRef] = {
            ok: false,
            error: "Audio asset path must not contain symlinks or junctions",
          };
          return;
        }
      }
      if (!pathIsContained(realPackageDirectory, realpathSync(path))) {
        hashes[fileRef] = null;
        inspections[fileRef] = {
          ok: false,
          error: "Audio asset resolves outside its immutable package",
        };
        return;
      }
      const metadata = lstatSync(path);
      if (!metadata.isFile() || metadata.isSymbolicLink()) {
        hashes[fileRef] = null;
        inspections[fileRef] = {
          ok: false,
          error: "Audio asset is not a regular non-symlink file",
        };
        return;
      }
      if (
        requiresCanonicalInspection
        && metadata.size > AUDIO_IMPORT_POLICY.maxByteLength
      ) {
        hashes[fileRef] = null;
        inspections[fileRef] = {
          ok: false,
          error: `Audio asset exceeds ${AUDIO_IMPORT_POLICY.maxByteLength} bytes`,
        };
        return;
      }
      const bytes = readFileSync(path);
      hashes[fileRef] = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
      if (!requiresCanonicalInspection) return;
      try {
        inspections[fileRef] = {
          ok: true,
          media: inspectCanonicalWave(bytes),
        };
      } catch (error) {
        inspections[fileRef] = {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    } catch (error) {
      hashes[fileRef] = null;
      inspections[fileRef] = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  return { hashes, inspections };
};

const characterFileRefs = (itemCatalog) => {
  const sourceRefs = new Set();
  const strokeRefs = new Set();
  const items = Array.isArray(itemCatalog?.items) ? itemCatalog.items : [];
  items.forEach((item) => {
    if (item?.itemType !== "character") return;
    const sources = Array.isArray(item?.payload?.analysis?.sources)
      ? item.payload.analysis.sources
      : [];
    sources.forEach((source) => {
      if (typeof source?.recordRef === "string") {
        sourceRefs.add(source.recordRef);
      }
    });
    if (typeof item?.payload?.strokeData?.fileRef === "string") {
      sourceRefs.add(item.payload.strokeData.fileRef);
      strokeRefs.add(item.payload.strokeData.fileRef);
    }
  });
  return { sourceRefs, strokeRefs };
};

export const inspectCharacterSourceFiles = (
  packageDirectory,
  itemCatalog,
  contentSchemaVersion,
) => {
  const hashes = {};
  const inspections = {};
  const linguisticInspections = {};
  if (contentSchemaVersion < 6) {
    return { hashes, inspections, linguisticInspections };
  }
  const { sourceRefs, strokeRefs } = characterFileRefs(itemCatalog);
  const packageMetadata = lstatSync(packageDirectory);
  const trustedPackageRoot =
    packageMetadata.isDirectory() && !packageMetadata.isSymbolicLink();
  const realPackageDirectory = realpathSync(packageDirectory);
  [...sourceRefs].sort().forEach((fileRef) => {
    const path = packageLocalPath(packageDirectory, fileRef);
    const reject = (error) => {
      hashes[fileRef] = null;
      if (strokeRefs.has(fileRef)) {
        inspections[fileRef] = { ok: false, error };
      } else {
        linguisticInspections[fileRef] = { ok: false, error };
      }
    };
    if (path === null || !existsSync(path)) {
      reject("Character source file is missing or outside its immutable package");
      return;
    }
    if (!trustedPackageRoot) {
      reject("Character source package root must not be a symlink or junction");
      return;
    }
    try {
      let currentPath = packageDirectory;
      for (const part of relative(packageDirectory, path).split(/[\\/]/u)) {
        currentPath = join(currentPath, part);
        if (lstatSync(currentPath).isSymbolicLink()) {
          reject(
            "Character source path must not contain symlinks or junctions",
          );
          return;
        }
      }
      if (!pathIsContained(realPackageDirectory, realpathSync(path))) {
        reject("Character source resolves outside its immutable package");
        return;
      }
      const metadata = lstatSync(path);
      if (!metadata.isFile() || metadata.isSymbolicLink()) {
        reject("Character source is not a regular non-symlink file");
        return;
      }
      if (metadata.size > CHARACTER_DATA_IMPORT_POLICY.maxByteLength) {
        reject(
          `Character source exceeds ${CHARACTER_DATA_IMPORT_POLICY.maxByteLength} bytes`,
        );
        return;
      }
      const bytes = readFileSync(path);
      hashes[fileRef] = sha256Bytes(bytes);
      try {
        if (strokeRefs.has(fileRef)) {
          inspections[fileRef] = inspectHanziWriterCharacterData(bytes);
        } else {
          linguisticInspections[fileRef] =
            inspectCharacterLinguisticSourceRecord(bytes);
        }
      } catch (error) {
        const failedInspection = {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
        if (strokeRefs.has(fileRef)) {
          inspections[fileRef] = failedInspection;
        } else {
          linguisticInspections[fileRef] = failedInspection;
        }
      }
    } catch (error) {
      reject(error instanceof Error ? error.message : String(error));
    }
  });
  return { hashes, inspections, linguisticInspections };
};

const writeImmutableSourceTexts = (
  packageDirectory,
  contentSchemaVersion,
  sourceTexts,
) => {
  contentSourceArtifactNames(contentSchemaVersion).forEach((name) => {
    const text = sourceTexts[name];
    if (typeof text !== "string") {
      throw new Error(`Cannot snapshot unavailable checked-in source: ${name}`);
    }
    const path = immutableSnapshotPath(packageDirectory, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text, { encoding: "utf8", flag: "wx" });
  });
};

const hashSourceTexts = async (contentSchemaVersion, sourceTexts) =>
  Object.fromEntries(
    await Promise.all(
      contentSourceArtifactNames(contentSchemaVersion).map(async (name) => {
        const text = sourceTexts[name];
        if (typeof text !== "string") {
          throw new Error(`Cannot hash unavailable checked-in source: ${name}`);
        }
        return [name, await sha256NormalizedText(text)];
      }),
    ),
  );

const countCatalogItemsByType = (itemCatalog) => {
  const counts = new Map();
  if (!Array.isArray(itemCatalog?.items)) return {};
  itemCatalog.items.forEach((item) => {
    const itemType = item?.itemType;
    if (typeof itemType !== "string" || !SAFE_ID_PATTERN.test(itemType)) return;
    counts.set(itemType, (counts.get(itemType) ?? 0) + 1);
  });
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) =>
    left.localeCompare(right)
  ));
};

const assertPackageId = (value, label = "content version") => {
  if (!SAFE_ID_PATTERN.test(value ?? "")) {
    throw new Error(`${label} must match ${SAFE_ID_PATTERN}`);
  }
};

const resolvePackageDirectory = (relativePath) => {
  const directory = resolve(contentRoot, relativePath);
  const relativeToPackages = relative(join(contentRoot, "packages"), directory);
  if (
    isAbsolute(relativeToPackages) ||
    relativeToPackages.startsWith("..") ||
    relativeToPackages.includes("\\") ||
    relativeToPackages.includes("/")
  ) {
    throw new Error(`Unsafe package registry path: ${relativePath}`);
  }
  return directory;
};

const readRepositoryJsonInput = (inputPath, label) => {
  const path = resolve(repositoryRoot, inputPath);
  const relativeToRepository = relative(repositoryRoot, path);
  if (isAbsolute(relativeToRepository) || relativeToRepository.startsWith("..")) {
    throw new Error(`${label} must stay inside the repository`);
  }
  if (!existsSync(path)) throw new Error(`${label} does not exist: ${inputPath}`);
  return readJson(path);
};

const readRuntimeContentVersion = () => {
  const readinessPath = join(repositoryRoot, "config", "production-readiness.json");
  if (!existsSync(readinessPath)) return null;
  const readiness = readJson(readinessPath);
  return typeof readiness.contentVersion === "string" ? readiness.contentVersion : null;
};

const readCurriculumContentVersion = (sourceText) => {
  if (typeof sourceText !== "string") return null;
  const matches = [
    ...sourceText.matchAll(
      /^export const CONTENT_VERSION = "([a-zA-Z0-9][a-zA-Z0-9._-]*)";$/gmu,
    ),
  ];
  return matches.length === 1 ? matches[0][1] : null;
};

const readCurriculumCatalogVersion = (sourceText, contentSchemaVersion) => {
  if (typeof sourceText !== "string") return null;
  const catalogArtifact = contentSchemaVersion >= 4
    ? "runtime-catalog"
    : "item-catalog";
  const importName = contentSchemaVersion >= 4
    ? "runtimeCatalogJson"
    : "itemCatalogJson";
  const matches = [
    ...sourceText.matchAll(
      new RegExp(
        `^import ${importName} from "\\.\\.\\/\\.\\.\\/content\\/packages\\/([a-zA-Z0-9][a-zA-Z0-9._-]*)\\/${catalogArtifact}\\.json";$`,
        "gmu",
      ),
    ),
  ];
  return matches.length === 1 ? matches[0][1] : null;
};

const readContentBundleFromDirectory = (
  packageDirectory,
  registry,
  registryEntry,
) => {
  assertTrustedPackageDirectory(
    packageDirectory,
    `Content package ${String(registryEntry?.contentVersion ?? "")}`,
  );
  const manifest = readTrustedPackageJson(
    packageDirectory,
    "manifest.json",
    "Package manifest.json",
  );
  const itemCatalog = readItemCatalog(
    packageDirectory,
    manifest.contentSchemaVersion,
  );
  const runtimeCatalog = readRuntimeCatalog(
    packageDirectory,
    manifest.contentSchemaVersion,
  );
  const liveSourceTexts = readLiveSourceTexts(manifest.contentSchemaVersion);
  const audioAssetFiles = inspectAudioAssetFiles(
    packageDirectory,
    itemCatalog,
    manifest.contentSchemaVersion,
  );
  const characterSourceFiles = inspectCharacterSourceFiles(
    packageDirectory,
    itemCatalog,
    manifest.contentSchemaVersion,
  );
  return {
      registry,
      registryEntry,
      manifest,
      runtimeIds: readTrustedPackageJson(
        packageDirectory,
        "runtime-ids.json",
        "Package runtime-ids.json",
      ),
      itemCatalog,
      runtimeCatalog,
      coverageClaims: readTrustedPackageJson(
        packageDirectory,
        "coverage-claims.json",
        "Package coverage-claims.json",
      ),
      reviews: readTrustedPackageJson(
        packageDirectory,
        "reviews.json",
        "Package reviews.json",
      ),
      audioAssetFileHashes: audioAssetFiles.hashes,
      audioAssetFileInspections: audioAssetFiles.inspections,
      characterSourceFileHashes: characterSourceFiles.hashes,
      characterLinguisticFileInspections:
        characterSourceFiles.linguisticInspections,
      characterStrokeFileInspections: characterSourceFiles.inspections,
      immutableSourceTexts: readImmutableSourceTexts(
        packageDirectory,
        manifest.contentSchemaVersion,
      ),
      runtimeContentVersion: readRuntimeContentVersion(),
      liveSourceTexts,
      runtimeAssessmentSourceText: liveSourceTexts["src/data/assessment.ts"],
      runtimeSourceText: liveSourceTexts["src/data/curriculum.ts"],
      runtimeExerciseGenerationSourceText:
        liveSourceTexts["src/lib/exerciseGeneration.ts"],
      runtimeAttemptScoringSourceText:
        liveSourceTexts["src/server/attemptScoring.ts"],
      runtimeAuthoritativeItemBankSourceText:
        liveSourceTexts["src/server/authoritativeItemBank.ts"],
      runtimeLessonCompletionPolicySourceText:
        liveSourceTexts["src/server/lessonCompletionPolicy.ts"],
      runtimeAuthoritativeAssessmentItemBankSourceText:
        liveSourceTexts["src/server/authoritativeAssessmentItemBank.ts"],
      runtimeAssessmentScoringSourceText:
        liveSourceTexts["src/server/assessmentScoring.ts"],
      runtimeLessonGuidesSourceText: liveSourceTexts["src/data/lessonGuides.ts"],
      runtimeKnowledgeItemBlueprintsSourceText:
        liveSourceTexts["src/data/knowledgeItemBlueprints.ts"],
  };
};

export const loadContentBundle = (requestedVersion) => {
  const registry = readJson(registryPath);
  const version = requestedVersion ?? registry.currentContentVersion;
  assertPackageId(version);
  const registryEntry = registry.packages.find((entry) => entry.contentVersion === version);
  if (!registryEntry) throw new Error(`Content version is not registered: ${version}`);
  const packageDirectory = resolvePackageDirectory(registryEntry.relativePath);
  return {
    packageDirectory,
    bundle: readContentBundleFromDirectory(
      packageDirectory,
      registry,
      registryEntry,
    ),
  };
};

const writeJsonAtomic = (path, value) => {
  const temporaryPath = `${path}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, formatJson(value), { encoding: "utf8", flag: "wx" });
  try {
    renameSync(temporaryPath, path);
  } finally {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
  }
};

const withContentWriteLock = async (callback) => {
  const lockToken = `${process.pid}:${randomUUID()}`;
  let descriptor;
  try {
    descriptor = openSync(governanceLockPath, "wx");
  } catch (error) {
    if (error && typeof error === "object" && error.code === "EEXIST") {
      throw new Error(
        "Another content governance mutation is in progress; refusing a concurrent write",
        { cause: error },
      );
    }
    throw error;
  }
  try {
    writeFileSync(descriptor, `${lockToken}\n`, "utf8");
    return await callback();
  } finally {
    closeSync(descriptor);
    if (
      existsSync(governanceLockPath)
      && readFileSync(governanceLockPath, "utf8").trim() === lockToken
    ) {
      unlinkSync(governanceLockPath);
    }
  }
};

const parseArguments = (args) => {
  const positional = [];
  const flags = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith("--")) {
      positional.push(argument);
      continue;
    }
    const name = argument.slice(2);
    if (flags.has(name)) throw new Error(`Duplicate flag: --${name}`);
    if (name === "write" || name === "all") {
      flags.set(name, true);
      continue;
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`--${name} requires a value`);
    flags.set(name, value);
    index += 1;
  }
  return { positional, flags };
};

const assertCommandShape = (
  positional,
  flags,
  { minPositionals = 0, maxPositionals = 0, allowedFlags = [] } = {},
) => {
  if (
    positional.length < minPositionals
    || positional.length > maxPositionals
  ) {
    const expected =
      minPositionals === maxPositionals
        ? String(minPositionals)
        : `${minPositionals}-${maxPositionals}`;
    throw new Error(`Expected ${expected} positional argument(s)`);
  }
  const allowed = new Set(allowedFlags);
  [...flags.keys()].forEach((name) => {
    if (!allowed.has(name)) throw new Error(`Unknown flag: --${name}`);
  });
};

const requiredFlag = (flags, name) => {
  const value = flags.get(name);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`--${name} is required`);
  }
  return value;
};

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const assertExactObjectKeys = (value, allowedKeys, label) => {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  const allowed = new Set(allowedKeys);
  Object.keys(value).forEach((key) => {
    if (!allowed.has(key)) throw new Error(`${label}.${key} is not allowed`);
  });
};

const requireNonEmptyString = (value, label) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required`);
  }
  return value;
};

const sha256Bytes = (bytes) =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

const resolveRepositoryAudioSource = (sourceFile, label) => {
  requireNonEmptyString(sourceFile, label);
  if (isAbsolute(sourceFile) || sourceFile.includes(":")) {
    throw new Error(`${label} must be a relative repository path`);
  }
  const pathParts = sourceFile.split(/[\\/]/u);
  if (
    pathParts.some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new Error(`${label} must not contain empty or traversal segments`);
  }
  const path = resolve(repositoryRoot, sourceFile);
  const relativeToRepository = relative(repositoryRoot, path);
  if (
    isAbsolute(relativeToRepository)
    || relativeToRepository === ".."
    || relativeToRepository.startsWith("..\\")
    || relativeToRepository.startsWith("../")
  ) {
    throw new Error(`${label} must stay inside the repository`);
  }
  if (!existsSync(path)) throw new Error(`${label} does not exist: ${sourceFile}`);
  let currentPath = repositoryRoot;
  for (const part of pathParts) {
    currentPath = join(currentPath, part);
    if (lstatSync(currentPath).isSymbolicLink()) {
      throw new Error(`${label} must not contain symlinks or junctions`);
    }
    if (!pathsAreIdentical(currentPath, realpathSync(currentPath))) {
      throw new Error(
        `${label} must not traverse junctions or other reparse points`,
      );
    }
  }
  const metadata = lstatSync(path);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error(`${label} must be a regular non-symlink file`);
  }
  if (metadata.size > AUDIO_IMPORT_POLICY.maxByteLength) {
    throw new Error(
      `${label} exceeds the ${AUDIO_IMPORT_POLICY.maxByteLength}-byte import limit`,
    );
  }
  const realRepositoryRoot = realpathSync(repositoryRoot);
  const realPath = realpathSync(path);
  const relativeRealPath = relative(realRepositoryRoot, realPath);
  if (
    isAbsolute(relativeRealPath)
    || relativeRealPath === ".."
    || relativeRealPath.startsWith("..\\")
    || relativeRealPath.startsWith("../")
  ) {
    throw new Error(`${label} resolves outside the repository`);
  }
  const bytes = readFileSync(realPath);
  const metadataAfterRead = lstatSync(path);
  if (
    metadataAfterRead.isSymbolicLink()
    || !metadataAfterRead.isFile()
    || metadataAfterRead.dev !== metadata.dev
    || metadataAfterRead.ino !== metadata.ino
    || metadataAfterRead.size !== metadata.size
    || metadataAfterRead.mtimeMs !== metadata.mtimeMs
    || realpathSync(path) !== realPath
  ) {
    throw new Error(`${label} changed while its bytes were being captured`);
  }
  return { path: realPath, bytes };
};

const resolveRepositoryCharacterSource = (sourceFile, label) => {
  requireNonEmptyString(sourceFile, label);
  if (isAbsolute(sourceFile) || sourceFile.includes(":")) {
    throw new Error(`${label} must be a relative repository path`);
  }
  const pathParts = sourceFile.split(/[\\/]/u);
  if (
    pathParts.some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new Error(`${label} must not contain empty or traversal segments`);
  }
  const path = resolve(repositoryRoot, sourceFile);
  if (!pathIsContained(repositoryRoot, path)) {
    throw new Error(`${label} must stay inside the repository`);
  }
  if (!existsSync(path)) throw new Error(`${label} does not exist: ${sourceFile}`);
  let currentPath = repositoryRoot;
  for (const part of pathParts) {
    currentPath = join(currentPath, part);
    if (lstatSync(currentPath).isSymbolicLink()) {
      throw new Error(`${label} must not contain symlinks or junctions`);
    }
    if (!pathsAreIdentical(currentPath, realpathSync(currentPath))) {
      throw new Error(
        `${label} must not traverse junctions or other reparse points`,
      );
    }
  }
  const metadata = lstatSync(path);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error(`${label} must be a regular non-symlink file`);
  }
  if (metadata.size > CHARACTER_DATA_IMPORT_POLICY.maxByteLength) {
    throw new Error(
      `${label} exceeds the ${CHARACTER_DATA_IMPORT_POLICY.maxByteLength}-byte import limit`,
    );
  }
  const realRepositoryRoot = realpathSync(repositoryRoot);
  const realPath = realpathSync(path);
  if (!pathIsContained(realRepositoryRoot, realPath)) {
    throw new Error(`${label} resolves outside the repository`);
  }
  const bytes = readFileSync(realPath);
  const metadataAfterRead = lstatSync(path);
  if (
    metadataAfterRead.isSymbolicLink()
    || !metadataAfterRead.isFile()
    || !sameFileIdentity(metadata, metadataAfterRead)
    || realpathSync(path) !== realPath
  ) {
    throw new Error(`${label} changed while its bytes were being captured`);
  }
  return { path: realPath, bytes };
};

const sameFileIdentity = (left, right) =>
  left.dev === right.dev
  && left.ino === right.ino
  && left.size === right.size
  && left.mtimeMs === right.mtimeMs;

const captureImmutablePackageArtifact = (
  packageDirectory,
  fileRef,
  label,
  maxByteLength,
  { optional = false } = {},
) => {
  requireNonEmptyString(fileRef, label);
  if (
    isAbsolute(fileRef)
    || fileRef.includes(":")
    || fileRef.includes("\\")
  ) {
    throw new Error(`${label} must be a forward-slash package-relative path`);
  }
  const pathParts = fileRef.split("/");
  if (
    pathParts.some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new Error(`${label} must not contain empty or traversal segments`);
  }

  const realPackageDirectory = assertTrustedPackageDirectory(
    packageDirectory,
    `${label} source package`,
  );

  let currentPath = packageDirectory;
  for (const part of pathParts) {
    currentPath = join(currentPath, part);
    let metadata;
    try {
      metadata = lstatSync(currentPath);
    } catch (error) {
      if (
        error !== null
        && typeof error === "object"
        && "code" in error
        && error.code === "ENOENT"
      ) {
        if (optional) return null;
        throw new Error(
          `${label} is missing from its immutable source package`,
          { cause: error },
        );
      }
      throw error;
    }
    if (metadata.isSymbolicLink()) {
      throw new Error(`${label} must not contain symlinks or junctions`);
    }
    if (!pathsAreIdentical(currentPath, realpathSync(currentPath))) {
      throw new Error(
        `${label} must not traverse junctions or other reparse points`,
      );
    }
  }
  const artifactPath = packageLocalPath(packageDirectory, fileRef);
  if (artifactPath === null || artifactPath !== currentPath) {
    throw new Error(`${label} must stay inside its immutable source package`);
  }
  const metadataBeforeRead = lstatSync(artifactPath);
  if (
    !metadataBeforeRead.isFile()
    || metadataBeforeRead.isSymbolicLink()
  ) {
    throw new Error(`${label} must be a regular non-symlink file`);
  }
  if (metadataBeforeRead.size > maxByteLength) {
    throw new Error(
      `${label} exceeds the ${maxByteLength}-byte inheritance limit`,
    );
  }
  const realArtifactPath = realpathSync(artifactPath);
  if (!pathIsContained(realPackageDirectory, realArtifactPath)) {
    throw new Error(`${label} resolves outside its immutable source package`);
  }

  const bytes = readFileSync(artifactPath);
  const metadataAfterRead = lstatSync(artifactPath);
  if (
    metadataAfterRead.isSymbolicLink()
    || !metadataAfterRead.isFile()
    || !sameFileIdentity(metadataBeforeRead, metadataAfterRead)
    || !pathsAreIdentical(realpathSync(artifactPath), realArtifactPath)
  ) {
    throw new Error(`${label} changed while its bytes were being captured`);
  }
  return bytes;
};

const canonicalObjectsEqual = async (left, right) =>
  await sha256Json(left) === await sha256Json(right);

const normalizeAudioTargetText = (value) =>
  typeof value === "string" ? value.replace(/\r\n?/gu, "\n") : "";

const deterministicMandarinTargetTexts = (item) => {
  if (!isRecord(item?.payload)) return [];
  if (item.itemType === "lexeme") {
    return [item.payload.simplified, item.payload.example]
      .filter((value) => typeof value === "string" && value.trim().length > 0);
  }
  if (item.itemType === "lesson") {
    return [item.payload.chineseTitle]
      .filter((value) => typeof value === "string" && value.trim().length > 0);
  }
  if (item.itemType === "graded-text") {
    const sentenceTexts = (
      Array.isArray(item.payload.sentences) ? item.payload.sentences : []
    )
      .map((sentence) => sentence?.chinese)
      .filter((value) => typeof value === "string" && value.trim().length > 0);
    return [
      ...sentenceTexts,
      ...(sentenceTexts.length > 0 ? [sentenceTexts.join("\n")] : []),
    ];
  }
  if (
    ["grammar", "pronunciation", "communicative-function"]
      .includes(item.itemType)
  ) {
    return (
      Array.isArray(item.payload.examples) ? item.payload.examples : []
    )
      .map((example) => example?.chinese)
      .filter((value) => typeof value === "string" && value.trim().length > 0);
  }
  if (item.itemType === "character") {
    return [item.payload.character]
      .filter((value) => typeof value === "string" && value.trim().length > 0);
  }
  return [];
};

const assertArtifactCatalogContinuity = async ({
  sourceCatalog,
  targetCatalog,
  targetContentSchemaVersion,
  commandLabel,
  preserveCharacters = true,
  requireTargetAudioBinding = true,
}) => {
  if (!isRecord(sourceCatalog) || !isRecord(targetCatalog)) {
    throw new Error(`${commandLabel} requires source and target item catalogs`);
  }
  const sourceAudioAssets = Array.isArray(sourceCatalog.audioAssets)
    ? sourceCatalog.audioAssets
    : [];
  const targetAudioAssets = Array.isArray(targetCatalog.audioAssets)
    ? targetCatalog.audioAssets
    : [];
  if (targetContentSchemaVersion < 5 && targetAudioAssets.length > 0) {
    throw new Error(
      `${commandLabel} cannot carry audio before content schema v5`,
    );
  }
  const sourceAudioById = new Map(
    sourceAudioAssets
      .filter(isRecord)
      .map((asset) => [asset.assetId, asset]),
  );
  if (sourceAudioById.size !== sourceAudioAssets.length) {
    throw new Error(`${commandLabel} source audio inventory is malformed`);
  }
  const targetAudioById = new Map(
    targetAudioAssets
      .filter(isRecord)
      .map((asset) => [asset.assetId, asset]),
  );
  if (targetAudioById.size !== targetAudioAssets.length) {
    throw new Error(`${commandLabel} target audio inventory is malformed`);
  }
  const sourceItemByKey = new Map(
    (Array.isArray(sourceCatalog.items) ? sourceCatalog.items : [])
      .filter(isRecord)
      .map((item) => [item.itemKey, item]),
  );
  const targetItemByKey = new Map(
    (Array.isArray(targetCatalog.items) ? targetCatalog.items : [])
      .filter(isRecord)
      .map((item) => [item.itemKey, item]),
  );
  for (const [assetId, sourceAsset] of sourceAudioById) {
    const targetAsset = targetAudioById.get(assetId);
    const {
      targetPayloadSha256: _sourceTargetPayloadSha256,
      ...sourceAssetWithoutTargetDigest
    } = sourceAsset;
    const {
      targetPayloadSha256: _targetTargetPayloadSha256,
      ...targetAssetWithoutTargetDigest
    } = targetAsset ?? {};
    if (
      targetAsset === undefined
      || !(await canonicalObjectsEqual(
        sourceAssetWithoutTargetDigest,
        targetAssetWithoutTargetDigest,
      ))
    ) {
      throw new Error(
        `${commandLabel} must preserve source audio asset ${String(assetId)} bytes and evidence; use import-audio to replace media`,
      );
    }
    const sourceTarget = sourceItemByKey.get(sourceAsset.targetItemKey);
    const targetTarget = targetItemByKey.get(targetAsset.targetItemKey);
    if (
      !isRecord(sourceTarget)
      || sourceAsset.targetPayloadSha256 !== sourceTarget.payloadSha256
      || !isRecord(targetTarget)
    ) {
      throw new Error(
        `${commandLabel} source audio asset ${String(assetId)} has no valid stable target`,
      );
    }
    if (
      requireTargetAudioBinding
      && (
        targetAsset.targetPayloadSha256 !== targetTarget.payloadSha256
        || !deterministicMandarinTargetTexts(targetTarget).some(
          (text) =>
            normalizeAudioTargetText(text)
            === normalizeAudioTargetText(targetAsset.transcript),
        )
      )
    ) {
      throw new Error(
        `${commandLabel} audio asset ${String(assetId)} target text changed; rebind only an unchanged deterministic transcript or replace it through import-audio`,
      );
    }
  }
  for (const assetId of targetAudioById.keys()) {
    if (!sourceAudioById.has(assetId)) {
      throw new Error(
        `${commandLabel} cannot add audio asset ${String(assetId)}; use import-audio`,
      );
    }
  }

  const sourceCharacterItems = Array.isArray(sourceCatalog.items)
    ? sourceCatalog.items.filter((item) => item?.itemType === "character")
    : [];
  const targetCharacterItems = Array.isArray(targetCatalog.items)
    ? targetCatalog.items.filter((item) => item?.itemType === "character")
    : [];
  if (targetContentSchemaVersion < 6 || !preserveCharacters) return;
  if (sourceCatalog.schemaVersion !== 4) {
    throw new Error(
      `${commandLabel} cannot synthesize catalog-v4 character metadata; use import-character-metadata`,
    );
  }
  const sourceCharactersByKey = new Map(
    sourceCharacterItems
      .filter(isRecord)
      .map((item) => [item.itemKey, item]),
  );
  const targetCharactersByKey = new Map(
    targetCharacterItems
      .filter(isRecord)
      .map((item) => [item.itemKey, item]),
  );
  if (
    sourceCharactersByKey.size !== sourceCharacterItems.length
    || targetCharactersByKey.size !== targetCharacterItems.length
  ) {
    throw new Error(`${commandLabel} character inventory is malformed`);
  }
  for (const [itemKey, sourceItem] of sourceCharactersByKey) {
    const targetItem = targetCharactersByKey.get(itemKey);
    const sourceArtifactPayload = {
      analysis: sourceItem.payload?.analysis,
      strokeCount: sourceItem.payload?.strokeCount,
      strokeData: sourceItem.payload?.strokeData,
    };
    const targetArtifactPayload = {
      analysis: targetItem?.payload?.analysis,
      strokeCount: targetItem?.payload?.strokeCount,
      strokeData: targetItem?.payload?.strokeData,
    };
    if (
      targetItem === undefined
      || targetItem.payload?.character !== sourceItem.payload?.character
      || !(await canonicalObjectsEqual(
        targetArtifactPayload,
        sourceArtifactPayload,
      ))
    ) {
      throw new Error(
        `${commandLabel} must preserve source character artifacts for ${String(itemKey)} exactly; use import-character-metadata to replace sourced analysis`,
      );
    }
  }
  for (const itemKey of targetCharactersByKey.keys()) {
    if (!sourceCharactersByKey.has(itemKey)) {
      throw new Error(
        `${commandLabel} cannot add sourced character ${String(itemKey)}; use import-character-metadata`,
      );
    }
  }
};

const assertInheritedAudioTargetsMatchCatalog = (items, audioAssets) => {
  const itemByKey = new Map(
    items.filter(isRecord).map((item) => [item.itemKey, item]),
  );
  audioAssets.forEach((asset) => {
    const target = itemByKey.get(asset.targetItemKey);
    if (
      !isRecord(target)
      || asset.targetPayloadSha256 !== target.payloadSha256
    ) {
      throw new Error(
        `Inherited audio asset ${String(asset.assetId)} target text or payload changed; replace it through import-audio`,
      );
    }
  });
};

const rebindAudioTargetsAfterCharacterImport = ({
  previousItems,
  nextItems,
  audioAssets,
}) => {
  const previousItemByKey = new Map(
    previousItems.filter(isRecord).map((item) => [item.itemKey, item]),
  );
  const nextItemByKey = new Map(
    nextItems.filter(isRecord).map((item) => [item.itemKey, item]),
  );
  return audioAssets.map((asset) => {
    const previousTarget = previousItemByKey.get(asset.targetItemKey);
    const nextTarget = nextItemByKey.get(asset.targetItemKey);
    if (!isRecord(previousTarget) || !isRecord(nextTarget)) {
      throw new Error(
        `Inherited audio asset ${String(asset.assetId)} has no stable target item`,
      );
    }
    if (asset.targetPayloadSha256 !== previousTarget.payloadSha256) {
      throw new Error(
        `Inherited audio asset ${String(asset.assetId)} target text or payload changed; replace it through import-audio`,
      );
    }
    if (nextTarget.payloadSha256 === previousTarget.payloadSha256) {
      return structuredClone(asset);
    }
    if (
      previousTarget.itemType !== "character"
      || nextTarget.itemType !== "character"
      || previousTarget.payload?.character !== nextTarget.payload?.character
      || normalizeAudioTargetText(asset.transcript)
        !== normalizeAudioTargetText(nextTarget.payload?.character)
    ) {
      throw new Error(
        `Inherited audio asset ${String(asset.assetId)} target text changed; replace it through import-audio`,
      );
    }
    return {
      ...structuredClone(asset),
      targetPayloadSha256: nextTarget.payloadSha256,
    };
  });
};

const captureInheritedCatalogArtifacts = async ({
  sourcePackageDirectory,
  itemCatalog,
  contentSchemaVersion,
  commandLabel,
  includeCharacters = true,
}) => {
  const artifacts = new Map();
  const addArtifact = (fileRef, bytes, expectedSha256, label) => {
    const actualSha256 = sha256Bytes(bytes);
    if (actualSha256 !== expectedSha256) {
      throw new Error(`${label} digest does not match immutable source bytes`);
    }
    const previous = artifacts.get(fileRef);
    if (previous !== undefined) {
      if (previous.sha256 !== actualSha256) {
        throw new Error(
          `${commandLabel} has conflicting inherited artifact ${fileRef}`,
        );
      }
      return;
    }
    artifacts.set(fileRef, { bytes, sha256: actualSha256 });
  };

  const audioAssets = Array.isArray(itemCatalog?.audioAssets)
    ? itemCatalog.audioAssets
    : [];
  if (audioAssets.length > AUDIO_CATALOG_MUTATION_POLICY.maxAssetCount) {
    throw new Error(
      `${commandLabel} audio inventory exceeds the ${AUDIO_CATALOG_MUTATION_POLICY.maxAssetCount}-asset limit`,
    );
  }
  const capturedAudioRefs = new Set();
  let aggregateAudioByteLength = 0;
  for (const [index, asset] of audioAssets.entries()) {
    if (!isRecord(asset)) {
      throw new Error(`${commandLabel} audioAssets[${index}] must be an object`);
    }
    const prefix = `${commandLabel} audioAssets[${index}]`;
    const bytes = captureImmutablePackageArtifact(
      sourcePackageDirectory,
      asset.fileRef,
      `${prefix}.fileRef`,
      AUDIO_IMPORT_POLICY.maxByteLength,
    );
    if (!capturedAudioRefs.has(asset.fileRef)) {
      capturedAudioRefs.add(asset.fileRef);
      aggregateAudioByteLength += bytes.byteLength;
      if (
        aggregateAudioByteLength
        > AUDIO_CATALOG_MUTATION_POLICY.maxAggregateByteLength
      ) {
        throw new Error(
          `${commandLabel} inherited audio bytes exceed the ${AUDIO_CATALOG_MUTATION_POLICY.maxAggregateByteLength}-byte aggregate limit`,
        );
      }
    }
    addArtifact(asset.fileRef, bytes, asset.fileSha256, prefix);
    if (contentSchemaVersion >= 5) {
      const media = inspectCanonicalWave(bytes);
      if (!(await canonicalObjectsEqual(media, asset.media))) {
        throw new Error(
          `${prefix}.media does not match re-inspected immutable source bytes`,
        );
      }
    }
  }

  if (contentSchemaVersion < 6 || !includeCharacters) return artifacts;
  const characterItems = Array.isArray(itemCatalog?.items)
    ? itemCatalog.items.filter((item) => item?.itemType === "character")
    : [];
  const uniqueCharacterRefs = new Set();
  let aggregateCharacterBytes = 0;
  for (const [itemIndex, item] of characterItems.entries()) {
    const sources = Array.isArray(item?.payload?.analysis?.sources)
      ? item.payload.analysis.sources
      : [];
    for (const [sourceIndex, source] of sources.entries()) {
      if (!isRecord(source)) {
        throw new Error(
          `${commandLabel} character ${String(item?.itemKey)} source ${sourceIndex} must be an object`,
        );
      }
      const prefix =
        `${commandLabel} character ${String(item.itemKey)} source ${sourceIndex}`;
      const bytes = captureImmutablePackageArtifact(
        sourcePackageDirectory,
        source.recordRef,
        `${prefix}.recordRef`,
        CHARACTER_DATA_IMPORT_POLICY.maxByteLength,
      );
      if (!uniqueCharacterRefs.has(source.recordRef)) {
        uniqueCharacterRefs.add(source.recordRef);
        aggregateCharacterBytes += bytes.byteLength;
      }
      if (
        uniqueCharacterRefs.size
          > CHARACTER_METADATA_IMPORT_POLICY.maxSourceFileCount
        || aggregateCharacterBytes
          > CHARACTER_METADATA_IMPORT_POLICY.maxAggregateSourceByteLength
      ) {
        throw new Error(
          `${commandLabel} inherited character artifacts exceed the import policy`,
        );
      }
      addArtifact(source.recordRef, bytes, source.recordSha256, prefix);
      if (source.kind === "stroke-dataset") {
        const inspection = inspectHanziWriterCharacterData(bytes);
        if (
          item.payload?.strokeData?.fileRef !== source.recordRef
          || item.payload?.strokeData?.fileSha256 !== source.recordSha256
          || item.payload?.strokeData?.sourceId !== source.sourceId
          || item.payload?.strokeCount !== inspection.strokeCount
        ) {
          throw new Error(
            `${prefix} does not match the character stroke payload after re-inspection`,
          );
        }
      } else if (source.kind === "linguistic-reference") {
        const inspection = inspectCharacterLinguisticSourceRecord(bytes);
        if (inspection.character !== item.payload?.character) {
          throw new Error(
            `${prefix} character does not match the target payload`,
          );
        }
      } else {
        throw new Error(`${prefix}.kind is unsupported`);
      }
    }
    if (sources.length === 0) {
      throw new Error(
        `${commandLabel} character item ${itemIndex} has no inherited sources`,
      );
    }
  }
  return artifacts;
};

const writeCapturedArtifacts = (stagedDirectory, artifacts) => {
  [...artifacts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([fileRef, artifact]) => {
      const targetPath = join(stagedDirectory, ...fileRef.split("/"));
      mkdirSync(dirname(targetPath), { recursive: true });
      writeFileSync(targetPath, artifact.bytes, { flag: "wx" });
    });
};

const assertSafeAudioAssetId = (assetId, label) => {
  if (!SAFE_AUDIO_ASSET_ID_PATTERN.test(assetId ?? "")) {
    throw new Error(`${label} must be a lowercase safe file id`);
  }
  const fileStem = assetId.split(".", 1)[0];
  if (WINDOWS_RESERVED_FILE_STEMS.has(fileStem)) {
    throw new Error(`${label} is reserved by Windows`);
  }
};

const assertSafeCharacterFileId = (value, label) => {
  if (!SAFE_AUDIO_ASSET_ID_PATTERN.test(value ?? "")) {
    throw new Error(`${label} must be a lowercase safe file id`);
  }
  const fileStem = value.split(".", 1)[0];
  if (WINDOWS_RESERVED_FILE_STEMS.has(fileStem)) {
    throw new Error(`${label} is reserved by Windows`);
  }
};

const requireSingleGlyph = (value, label) => {
  requireNonEmptyString(value, label);
  if ([...value].length !== 1) {
    throw new Error(`${label} must contain exactly one Unicode character`);
  }
  return value;
};

const requireSourceIds = (value, label, { allowEmpty = false } = {}) => {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new Error(
      `${label} must be ${allowEmpty ? "an" : "a non-empty"} array`,
    );
  }
  const ids = value.map((sourceId, index) => {
    assertSafeCharacterFileId(sourceId, `${label}[${index}]`);
    return sourceId;
  });
  if (new Set(ids).size !== ids.length) {
    throw new Error(`${label} must not contain duplicate source ids`);
  }
  return [...ids].sort();
};

const requireCanonicalTimestamp = (
  value,
  label,
  { allowFuture = true } = {},
) => {
  const epoch = Date.parse(value);
  if (Number.isNaN(epoch) || new Date(epoch).toISOString() !== value) {
    throw new Error(`${label} must be a canonical UTC ISO timestamp`);
  }
  if (!allowFuture && epoch > Date.now() + 5 * 60 * 1000) {
    throw new Error(`${label} cannot be in the future`);
  }
};

const releaseChannel = (flags, { required = false } = {}) => {
  const channel = flags.get("channel");
  if (channel === undefined && !required) return "production";
  if (channel !== "closed-alpha" && channel !== "production") {
    throw new Error("--channel must be closed-alpha or production");
  }
  return channel;
};

const assessReleaseEligibility = (bundle, validation, channel) =>
  channel === "closed-alpha"
    ? assessClosedAlphaEligibility(bundle, validation)
    : assessPublicationEligibility(bundle, validation);

const requireWrite = (flags) => {
  if (flags.get("write") !== true) {
    throw new Error("Refusing to mutate files without the explicit --write flag");
  }
};

const printValidation = (version, validation) => {
  console.log(
    JSON.stringify(
      {
        contentVersion: version,
        valid: validation.errors.length === 0,
        hashes: validation.hashes,
        errors: validation.errors,
        warnings: validation.warnings,
      },
      null,
      2,
    ),
  );
};

const validateCommand = async (args) => {
  const { positional, flags } = parseArguments(args);
  assertCommandShape(positional, flags, {
    minPositionals: 0,
    maxPositionals: 1,
    allowedFlags: ["all"],
  });
  const validateAll = flags.get("all") === true || positional.length === 0;
  if (validateAll) {
    if (positional.length > 0) {
      throw new Error("validate accepts either one content version or --all");
    }
    const registry = readJson(registryPath);
    const packages = [];
    for (const entry of registry.packages ?? []) {
      try {
        if (typeof entry?.contentVersion !== "string") {
          throw new Error("Registry package entry is missing contentVersion");
        }
        const { bundle } = loadContentBundle(entry.contentVersion);
        const validation = await validateContentBundle(bundle);
        packages.push({
          contentVersion: entry.contentVersion,
          valid: validation.errors.length === 0,
          errors: validation.errors,
          warnings: validation.warnings,
        });
      } catch (error) {
        packages.push({
          contentVersion: entry?.contentVersion ?? null,
          valid: false,
          errors: [error instanceof Error ? error.message : String(error)],
          warnings: [],
        });
      }
    }
    const valid = packages.length > 0 && packages.every((item) => item.valid);
    console.log(JSON.stringify({ valid, packages }, null, 2));
    return valid ? 0 : 1;
  }
  if (positional.length !== 1) {
    throw new Error("validate requires exactly one content version");
  }
  const { bundle } = loadContentBundle(positional[0]);
  const validation = await validateContentBundle(bundle);
  printValidation(bundle.manifest.contentVersion, validation);
  return validation.errors.length === 0 ? 0 : 1;
};

const hashCommand = async (args) => {
  const { positional, flags } = parseArguments(args);
  assertCommandShape(positional, flags, {
    minPositionals: 0,
    maxPositionals: 1,
  });
  const { bundle } = loadContentBundle(positional[0]);
  const immutableHash = async (name) => {
    const text = bundle.immutableSourceTexts[name];
    return typeof text === "string" ? sha256NormalizedText(text) : null;
  };
  const sourceArtifacts = Object.fromEntries(
    await Promise.all(
      contentSourceArtifactNames(bundle.manifest.contentSchemaVersion).map(
        async (name) => [name, await immutableHash(name)],
      ),
    ),
  );
  const hashes = {
    manifest: await sha256Json(bundle.manifest),
    runtimeIds: await sha256Json(bundle.runtimeIds),
    itemCatalog:
      bundle.itemCatalog === null ? null : await sha256Json(bundle.itemCatalog),
    runtimeCatalog:
      bundle.runtimeCatalog === null
        ? null
        : await sha256Json(bundle.runtimeCatalog),
    sourceArtifacts,
    coverageClaims: await sha256Json(bundle.coverageClaims),
    reviews: await sha256Json(bundle.reviews),
    assessmentSource: await immutableHash("src/data/assessment.ts"),
    runtimeSource: await immutableHash("src/data/curriculum.ts"),
    exerciseGenerationSource: await immutableHash(
      "src/lib/exerciseGeneration.ts",
    ),
    attemptScoringSource: await immutableHash("src/server/attemptScoring.ts"),
    authoritativeItemBankSource: await immutableHash(
      "src/server/authoritativeItemBank.ts",
    ),
    lessonCompletionPolicySource: await immutableHash(
      "src/server/lessonCompletionPolicy.ts",
    ),
    authoritativeAssessmentItemBankSource: await immutableHash(
      "src/server/authoritativeAssessmentItemBank.ts",
    ),
    assessmentScoringSource: await immutableHash(
      "src/server/assessmentScoring.ts",
    ),
  };
  console.log(JSON.stringify({ contentVersion: bundle.manifest.contentVersion, hashes }, null, 2));
  return 0;
};

const reportCommand = async (args) => {
  const { positional, flags } = parseArguments(args);
  assertCommandShape(positional, flags, {
    minPositionals: 0,
    maxPositionals: 1,
  });
  const { bundle } = loadContentBundle(positional[0]);
  const validation = await validateContentBundle(bundle);
  const closedAlpha = assessClosedAlphaEligibility(bundle, validation);
  const production = assessPublicationEligibility(bundle, validation);
  console.log(
    JSON.stringify(
      {
        contentVersion: bundle.manifest.contentVersion,
        audience: bundle.manifest.audience,
        lifecycle: bundle.registryEntry.lifecycle,
        closedAlphaEligible: bundle.registryEntry.closedAlphaEligible,
        productionEligible: bundle.registryEntry.productionEligible,
        inventory: {
          vocabularyIds: Array.isArray(bundle.runtimeIds?.vocabularyIds)
            ? bundle.runtimeIds.vocabularyIds.length
            : 0,
          unitIds: Array.isArray(bundle.runtimeIds?.unitIds)
            ? bundle.runtimeIds.unitIds.length
            : 0,
          lessons: Array.isArray(bundle.runtimeIds?.lessons)
            ? bundle.runtimeIds.lessons.length
            : 0,
          stories: Array.isArray(bundle.runtimeIds?.stories)
            ? bundle.runtimeIds.stories.length
            : 0,
          coverageClaims: Array.isArray(
            bundle.coverageClaims?.coverageClaims,
          )
            ? bundle.coverageClaims.coverageClaims.length
            : 0,
          catalogItems: Array.isArray(bundle.itemCatalog?.items)
            ? bundle.itemCatalog.items.length
            : 0,
          catalogItemsByType: countCatalogItemsByType(bundle.itemCatalog),
          catalogAudioAssets: Array.isArray(bundle.itemCatalog?.audioAssets)
            ? bundle.itemCatalog.audioAssets.length
            : 0,
          runtimeVocabulary: Array.isArray(bundle.runtimeCatalog?.vocabulary)
            ? bundle.runtimeCatalog.vocabulary.length
            : 0,
          runtimeLessons: Array.isArray(bundle.runtimeCatalog?.lessons)
            ? bundle.runtimeCatalog.lessons.length
            : 0,
          runtimeStories: Array.isArray(bundle.runtimeCatalog?.stories)
            ? bundle.runtimeCatalog.stories.length
            : 0,
        },
        validation,
        releaseAssessments: { closedAlpha, production },
      },
      null,
      2,
    ),
  );
  return 0;
};

const verifyReleaseCommand = async (args) => {
  const { positional, flags } = parseArguments(args);
  assertCommandShape(positional, flags, {
    minPositionals: 0,
    maxPositionals: 1,
    allowedFlags: ["channel"],
  });
  const { bundle } = loadContentBundle(positional[0]);
  const validation = await validateContentBundle(bundle);
  const channel = releaseChannel(flags);
  const release = assessReleaseEligibility(bundle, validation, channel);
  const promotion = bundle.registryEntry.promotion;
  const activated = bundle.registryEntry.lifecycle === "published"
    && promotion?.channel === channel
    && promotion.packageManifestSha256 === validation.hashes.manifest
    && promotion.reviewEnvelopeSha256 === validation.hashes.reviews
    && (channel === "closed-alpha"
      ? bundle.registryEntry.closedAlphaEligible && !bundle.registryEntry.productionEligible
      : bundle.registryEntry.closedAlphaEligible && bundle.registryEntry.productionEligible);
  console.log(
    JSON.stringify(
      {
        contentVersion: bundle.manifest.contentVersion,
        releaseChannel: channel,
        releaseVerified: release.eligible && activated,
        blockers: [
          ...release.blockers,
          ...(activated ? [] : [`Registry is not activated for ${channel}`]),
        ],
        warnings: release.warnings,
      },
      null,
      2,
    ),
  );
  return release.eligible && activated ? 0 : 1;
};

const submitReviewCommand = async (args) => {
  const { positional, flags } = parseArguments(args);
  assertCommandShape(positional, flags, {
    minPositionals: 1,
    maxPositionals: 1,
    allowedFlags: [
      "write",
      "manifest-sha256",
      "review-id",
      "role",
      "decision",
      "reviewer-id",
      "reviewed-at",
      "evidence-ref",
      "scope-file",
    ],
  });
  requireWrite(flags);
  return withContentWriteLock(async () => {
  const { bundle, packageDirectory } = loadContentBundle(positional[0]);
  const validation = await validateContentBundle(bundle);
  if (validation.errors.length > 0) {
    throw new Error(`Cannot review an invalid package:\n${validation.errors.join("\n")}`);
  }
  if (
    bundle.registryEntry.lifecycle !== "candidate"
    || bundle.manifest.lifecycle !== "candidate"
  ) {
    throw new Error(
      "Reviews may only be appended to a candidate package; create a new version instead",
    );
  }

  const expectedManifestHash = requiredFlag(flags, "manifest-sha256");
  if (expectedManifestHash !== validation.hashes.manifest) {
    throw new Error("--manifest-sha256 does not match the current immutable manifest");
  }
  if (bundle.reviews.packageManifestSha256 !== validation.hashes.manifest) {
    throw new Error("Review envelope is stale; create a new content version instead of rebinding it");
  }

  const reviewId = requiredFlag(flags, "review-id");
  assertPackageId(reviewId, "review id");
  if (bundle.reviews.reviews.some((review) => review.reviewId === reviewId)) {
    throw new Error(`Review id already exists: ${reviewId}`);
  }
  const role = requiredFlag(flags, "role");
  if (!REVIEW_ROLES.has(role)) throw new Error(`Unsupported review role: ${role}`);
  const decision = requiredFlag(flags, "decision");
  if (!REVIEW_DECISIONS.has(decision)) throw new Error(`Unsupported decision: ${decision}`);
  const reviewerId = requiredFlag(flags, "reviewer-id");
  const reviewedAt = requiredFlag(flags, "reviewed-at");
  requireCanonicalTimestamp(reviewedAt, "--reviewed-at", {
    allowFuture: false,
  });
  const evidenceRef = requiredFlag(flags, "evidence-ref");
  const scopeInput = flags.get("scope-file");
  if (bundle.manifest.contentSchemaVersion >= 3 && typeof scopeInput !== "string") {
    throw new Error("Schema-v3 reviews require --scope-file with explicit item/audio targets");
  }
  if (bundle.manifest.contentSchemaVersion < 3 && scopeInput !== undefined) {
    throw new Error("--scope-file is only supported for schema-v3 packages");
  }
  const scope =
    typeof scopeInput === "string"
      ? (() => {
          const input = readRepositoryJsonInput(scopeInput, "--scope-file");
          return {
            itemCatalogSha256: validation.hashes.itemCatalog,
            itemKeys: input.itemKeys,
            audioAssetIds: input.audioAssetIds ?? [],
          };
        })()
      : undefined;

  const nextReviews = {
    ...bundle.reviews,
    reviews: [
      ...bundle.reviews.reviews,
      {
        reviewId,
        role,
        decision,
        reviewerId,
        reviewedAt,
        evidenceRef,
        packageManifestSha256: validation.hashes.manifest,
        ...(scope === undefined ? {} : { scope }),
      },
    ],
  };
  const nextValidation = await validateContentBundle({
    ...bundle,
    reviews: nextReviews,
  });
  if (nextValidation.errors.length > 0) {
    throw new Error(
      `Refusing an invalid review scope:\n${nextValidation.errors.join("\n")}`,
    );
  }
  writeJsonAtomic(join(packageDirectory, "reviews.json"), nextReviews);
  console.log(`Recorded ${decision} review ${reviewId} for ${validation.hashes.manifest}`);
  return 0;
  });
};

const cleanupNewPackage = (directory) => {
  if (existsSync(directory)) rmSync(directory, { recursive: true, force: true });
};

const writeCandidatePackage = async ({
  temporaryDirectory,
  targetDirectory,
  nextRegistry,
  manifest,
  runtimeIds,
  itemCatalog,
  runtimeCatalog,
  coverageClaims,
  reviews,
  sourceTexts,
  writeAdditionalArtifacts,
  validateStaged = false,
}) => {
  mkdirSync(temporaryDirectory);
  try {
    writeFileSync(
      join(temporaryDirectory, "manifest.json"),
      formatJson(manifest),
      { encoding: "utf8", flag: "wx" },
    );
    writeFileSync(
      join(temporaryDirectory, "runtime-ids.json"),
      formatJson(runtimeIds),
      { encoding: "utf8", flag: "wx" },
    );
    if (itemCatalog !== null) {
      writeFileSync(
        join(temporaryDirectory, "item-catalog.json"),
        formatJson(itemCatalog),
        { encoding: "utf8", flag: "wx" },
      );
    }
    if (runtimeCatalog !== null) {
      writeFileSync(
        join(temporaryDirectory, "runtime-catalog.json"),
        formatJson(runtimeCatalog),
        { encoding: "utf8", flag: "wx" },
      );
    }
    writeFileSync(
      join(temporaryDirectory, "coverage-claims.json"),
      formatJson(coverageClaims),
      { encoding: "utf8", flag: "wx" },
    );
    writeFileSync(
      join(temporaryDirectory, "reviews.json"),
      formatJson(reviews),
      { encoding: "utf8", flag: "wx" },
    );
    writeImmutableSourceTexts(
      temporaryDirectory,
      manifest.contentSchemaVersion,
      sourceTexts,
    );
    if (writeAdditionalArtifacts) {
      await writeAdditionalArtifacts(temporaryDirectory);
    }
    if (validateStaged) {
      const stagedRegistryEntry = nextRegistry.packages.at(-1);
      const stagedBundle = readContentBundleFromDirectory(
        temporaryDirectory,
        nextRegistry,
        stagedRegistryEntry,
      );
      const stagedValidation = await validateContentBundle(stagedBundle);
      if (stagedValidation.errors.length > 0) {
        throw new Error(
          `Generated staged candidate is invalid:\n${stagedValidation.errors.join("\n")}`,
        );
      }
    }
    renameSync(temporaryDirectory, targetDirectory);
  } catch (error) {
    cleanupNewPackage(temporaryDirectory);
    throw error;
  }
  try {
    writeJsonAtomic(registryPath, nextRegistry);
  } catch (error) {
    cleanupNewPackage(targetDirectory);
    throw error;
  }
};

const prepareCandidateBranch = async ({
  newVersion,
  fromVersion,
  contentSchemaVersion,
  flags,
  sourceBundle: suppliedSourceBundle,
  sourcePackageDirectory: suppliedSourcePackageDirectory,
  currentVersionError = "New versions must branch from registry.currentContentVersion",
}) => {
  const loadedSource = suppliedSourceBundle === undefined
    ? loadContentBundle(fromVersion)
    : {
        bundle: suppliedSourceBundle,
        packageDirectory:
          suppliedSourcePackageDirectory
          ?? resolvePackageDirectory(
            suppliedSourceBundle.registryEntry.relativePath,
          ),
      };
  const sourceBundle = loadedSource.bundle;
  const sourcePackageDirectory = loadedSource.packageDirectory;
  if (contentSchemaVersion < sourceBundle.manifest.contentSchemaVersion) {
    throw new Error("A new package cannot downgrade contentSchemaVersion");
  }
  if (sourceBundle.registry.currentContentVersion !== fromVersion) {
    throw new Error(currentVersionError);
  }
  const sourceValidation = await validateContentBundle(sourceBundle);
  const historicalPackageErrors = [];
  for (const entry of sourceBundle.registry.packages) {
    if (entry.contentVersion === fromVersion) continue;
    try {
      const { bundle } = loadContentBundle(entry.contentVersion);
      const validation = await validateContentBundle(bundle);
      validation.errors.forEach((error) => {
        historicalPackageErrors.push(`${entry.contentVersion}: ${error}`);
      });
    } catch (error) {
      historicalPackageErrors.push(
        `${String(entry?.contentVersion)}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  if (historicalPackageErrors.length > 0) {
    throw new Error(
      `Cannot branch while the existing registry is invalid:\n${historicalPackageErrors.join("\n")}`,
    );
  }
  const liveSourceTexts = readLiveSourceTexts(contentSchemaVersion);
  if (sourceBundle.runtimeContentVersion !== newVersion) {
    throw new Error(
      `Update config/production-readiness.json contentVersion to ${newVersion} before creating the package`,
    );
  }
  if (
    readCurriculumContentVersion(liveSourceTexts["src/data/curriculum.ts"])
    !== newVersion
  ) {
    throw new Error(
      `Update src/data/curriculum.ts CONTENT_VERSION to ${newVersion} before creating the package`,
    );
  }
  if (
    contentSchemaVersion >= 3
    && readCurriculumCatalogVersion(
      liveSourceTexts["src/data/curriculum.ts"],
      contentSchemaVersion,
    ) !== newVersion
  ) {
    const catalogArtifact = contentSchemaVersion >= 4
      ? "runtime-catalog.json"
      : "item-catalog.json";
    throw new Error(
      `Bind src/data/curriculum.ts to content/packages/${newVersion}/${catalogArtifact} before creating the package`,
    );
  }
  const liveRuntimeSourceHash =
    typeof liveSourceTexts["src/data/curriculum.ts"] === "string"
      ? await sha256NormalizedText(liveSourceTexts["src/data/curriculum.ts"])
      : null;
  const liveAssessmentSourceHash =
    typeof liveSourceTexts["src/data/assessment.ts"] === "string"
      ? await sha256NormalizedText(liveSourceTexts["src/data/assessment.ts"])
      : null;
  const runtimeSourceChanged = sourceValidation.errors.includes(
    "src/data/curriculum.ts digest does not match manifest",
  ) || sourceBundle.manifest.artifacts["src/data/curriculum.ts"]
    !== liveRuntimeSourceHash;
  const assessmentSourceChanged = sourceValidation.errors.includes(
    "src/data/assessment.ts digest does not match manifest",
  ) || sourceBundle.manifest.artifacts["src/data/assessment.ts"]
    !== liveAssessmentSourceHash;
  const packageBoundSourceErrors = new Set(
    contentSourceArtifactNames(sourceBundle.manifest.contentSchemaVersion).map(
      (name) => `${name} digest does not match manifest`,
    ),
  );
  const runtimeVersionHandoffError =
    "Current registry package is not bound to the checked-in runtime contentVersion";
  const nonSourceErrors = sourceValidation.errors.filter(
    (error) => !packageBoundSourceErrors.has(error)
      && !(
        error === runtimeVersionHandoffError
        && sourceBundle.runtimeContentVersion === newVersion
      ),
  );
  if (nonSourceErrors.length > 0) {
    throw new Error(
      `Cannot branch an invalid package:\n${nonSourceErrors.join("\n")}`,
    );
  }
  const runtimeIdsInput = flags.get("runtime-ids-file");
  if (
    runtimeSourceChanged
    && runtimeIdsInput === undefined
    && flags.get("confirm-runtime-ids-unchanged") !== "true"
  ) {
    throw new Error(
      "Runtime source changed: provide --runtime-ids-file or --confirm-runtime-ids-unchanged true",
    );
  }
  if (
    assessmentSourceChanged
    && typeof sourceBundle.runtimeAssessmentSourceText !== "string"
  ) {
    throw new Error(
      "Assessment source changed but the checked-in source is unavailable",
    );
  }
  if (
    sourceBundle.registry.packages.some(
      (entry) => entry.contentVersion === newVersion,
    )
  ) {
    throw new Error(`Content version already registered: ${newVersion}`);
  }
  const targetDirectory = resolvePackageDirectory(`packages/${newVersion}`);
  if (existsSync(targetDirectory)) {
    throw new Error(`Target package directory already exists: ${newVersion}`);
  }
  const temporaryDirectory = `${targetDirectory}.${process.pid}.tmp`;
  if (existsSync(temporaryDirectory)) {
    throw new Error("Temporary package path already exists");
  }
  const runtimeIdsSource = typeof runtimeIdsInput === "string"
    ? readRepositoryJsonInput(runtimeIdsInput, "--runtime-ids-file")
    : sourceBundle.runtimeIds;
  return {
    sourceBundle,
    sourcePackageDirectory,
    sourceValidation,
    liveSourceTexts,
    targetDirectory,
    temporaryDirectory,
    runtimeIds: { ...runtimeIdsSource, contentVersion: newVersion },
  };
};

const buildCandidateEnvelope = async ({
  sourceBundle,
  sourceManifestHash,
  newVersion,
  contentSchemaVersion,
  audience,
  createdAt,
  runtimeIds,
  itemCatalog,
  runtimeCatalog,
  coverageClaimsSource,
  liveSourceTexts,
  contentOwner,
  sourceLicense,
  audioRights,
}) => {
  const itemCatalogHash = itemCatalog === null
    ? null
    : await sha256Json(itemCatalog);
  const runtimeCatalogHash = runtimeCatalog === null
    ? null
    : await sha256Json(runtimeCatalog);
  const coverageClaims = {
    ...(coverageClaimsSource ?? (contentSchemaVersion >= 3
      ? {
          schemaVersion: 2,
          itemCatalogSha256: itemCatalogHash,
          coverageClaims: [],
        }
      : { schemaVersion: 1, coverageClaims: [] })),
    contentVersion: newVersion,
  };
  const manifest = {
    schemaVersion: 1,
    packageId: newVersion,
    contentVersion: newVersion,
    contentSchemaVersion,
    audience,
    lifecycle: "candidate",
    createdAt,
    createdFromManifestSha256: sourceManifestHash,
    artifacts: {
      "coverage-claims.json": await sha256Json(coverageClaims),
      "runtime-ids.json": await sha256Json(runtimeIds),
      ...(itemCatalogHash === null
        ? {}
        : { "item-catalog.json": itemCatalogHash }),
      ...(runtimeCatalogHash === null
        ? {}
        : { "runtime-catalog.json": runtimeCatalogHash }),
      ...await hashSourceTexts(contentSchemaVersion, liveSourceTexts),
    },
    governance: {
      contentOwner,
      sourceLicense,
      nativeLinguisticReviewRequired: true,
      includesAudio: (itemCatalog?.audioAssets?.length ?? 0) > 0,
      audioRights,
    },
  };
  const manifestHash = await sha256Json(manifest);
  const reviews = {
    schemaVersion: contentSchemaVersion >= 3 ? 2 : 1,
    contentVersion: newVersion,
    packageManifestSha256: manifestHash,
    ...(itemCatalogHash === null ? {} : { itemCatalogSha256: itemCatalogHash }),
    reviews: [],
  };
  const nextRegistry = {
    ...sourceBundle.registry,
    currentContentVersion: newVersion,
    packages: [
      ...sourceBundle.registry.packages,
      {
        packageId: newVersion,
        contentVersion: newVersion,
        relativePath: `packages/${newVersion}`,
        manifestSha256: manifestHash,
        audience,
        lifecycle: "candidate",
        closedAlphaEligible: false,
        productionEligible: false,
        promotion: null,
      },
    ],
  };
  return {
    itemCatalogHash,
    runtimeCatalogHash,
    coverageClaims,
    manifest,
    reviews,
    nextRegistry,
  };
};

const newVersionCommand = async (args) => {
  const { positional, flags } = parseArguments(args);
  assertCommandShape(positional, flags, {
    minPositionals: 1,
    maxPositionals: 1,
    allowedFlags: [
      "write",
      "from",
      "created-at",
      "audience",
      "owner-id",
      "owner-evidence",
      "license-id",
      "license-evidence",
      "includes-audio",
      "audio-owner-id",
      "audio-license-id",
      "audio-evidence",
      "runtime-ids-file",
      "confirm-runtime-ids-unchanged",
      "coverage-claims-file",
      "content-schema-version",
      "item-catalog-file",
    ],
  });
  requireWrite(flags);
  return withContentWriteLock(async () => {
  const newVersion = positional[0];
  assertPackageId(newVersion, "new content version");
  const fromVersion = requiredFlag(flags, "from");
  const createdAt = requiredFlag(flags, "created-at");
  requireCanonicalTimestamp(createdAt, "--created-at");
  const audience = flags.get("audience") ?? "closed-alpha";
  if (!["closed-alpha", "public"].includes(audience)) {
    throw new Error("--audience must be closed-alpha or public");
  }
  const ownerId = flags.get("owner-id");
  const ownerEvidence = flags.get("owner-evidence");
  if ((ownerId === undefined) !== (ownerEvidence === undefined)) {
    throw new Error("--owner-id and --owner-evidence must be supplied together");
  }
  const licenseId = flags.get("license-id");
  const licenseEvidence = flags.get("license-evidence");
  if ((licenseId === undefined) !== (licenseEvidence === undefined)) {
    throw new Error("--license-id and --license-evidence must be supplied together");
  }
  if (
    (flags.has("includes-audio") && flags.get("includes-audio") !== "false")
    || [
      "audio-owner-id",
      "audio-license-id",
      "audio-evidence",
    ].some((name) => flags.has(name))
  ) {
    throw new Error("new-version does not import audio; use import-audio");
  }

  const loadedSource = loadContentBundle(fromVersion);
  const sourceBundle = loadedSource.bundle;
  const requestedContentSchemaVersion = flags.get("content-schema-version");
  const contentSchemaVersion =
    requestedContentSchemaVersion === undefined
      ? Math.max(sourceBundle.manifest.contentSchemaVersion, 2)
      : Number(requestedContentSchemaVersion);
  if (
    !Number.isInteger(contentSchemaVersion)
    || ![2, 3, 4, 5, 6].includes(contentSchemaVersion)
  ) {
    throw new Error(
      "--content-schema-version must be 2, 3, 4, 5, or 6",
    );
  }
  const {
    sourceValidation,
    sourcePackageDirectory,
    liveSourceTexts,
    targetDirectory,
    temporaryDirectory,
    runtimeIds,
  } = await prepareCandidateBranch({
    newVersion,
    fromVersion,
    contentSchemaVersion,
    flags,
    sourceBundle,
    sourcePackageDirectory: loadedSource.packageDirectory,
  });
  const itemCatalogInput = flags.get("item-catalog-file");
  if (contentSchemaVersion >= 3 && typeof itemCatalogInput !== "string") {
    throw new Error("Schema-v3+ packages require --item-catalog-file");
  }
  if (contentSchemaVersion < 3 && itemCatalogInput !== undefined) {
    throw new Error("--item-catalog-file requires --content-schema-version 3 or 4");
  }
  const itemCatalog =
    typeof itemCatalogInput === "string"
      ? readRepositoryJsonInput(itemCatalogInput, "--item-catalog-file")
      : null;
  if (itemCatalog !== null && itemCatalog.contentVersion !== newVersion) {
    throw new Error("--item-catalog-file contentVersion must equal the new version");
  }
  const expectedItemCatalogSchemaVersion = contentSchemaVersion >= 6
    ? 4
    : contentSchemaVersion >= 5
      ? 3
      : contentSchemaVersion >= 4
        ? 2
        : 1;
  if (
    itemCatalog !== null
    && itemCatalog.schemaVersion !== expectedItemCatalogSchemaVersion
  ) {
    throw new Error(
      `Content schema v${contentSchemaVersion} requires item-catalog.schemaVersion ${expectedItemCatalogSchemaVersion}`,
    );
  }
  const requiresArtifactContinuity =
    contentSchemaVersion >= 6
    || (itemCatalog?.audioAssets?.length ?? 0) > 0
    || (sourceBundle.itemCatalog?.audioAssets?.length ?? 0) > 0;
  if (itemCatalog !== null && requiresArtifactContinuity) {
    await assertArtifactCatalogContinuity({
      sourceCatalog: sourceBundle.itemCatalog,
      targetCatalog: itemCatalog,
      targetContentSchemaVersion: contentSchemaVersion,
      commandLabel: "new-version",
    });
  }
  const inheritedArtifacts = itemCatalog === null
    ? new Map()
    : await captureInheritedCatalogArtifacts({
        sourcePackageDirectory,
        itemCatalog,
        contentSchemaVersion,
        commandLabel: "new-version",
      });
  const inheritedAudioRights = (itemCatalog?.audioAssets?.length ?? 0) > 0
    ? sourceBundle.manifest.governance.audioRights
    : null;
  if (
    (itemCatalog?.audioAssets?.length ?? 0) > 0
    && !isRecord(inheritedAudioRights)
  ) {
    throw new Error(
      "new-version cannot preserve audio without source manifest audio rights",
    );
  }
  const runtimeCatalog = contentSchemaVersion >= 4
    ? projectSanitizedRuntimeCatalog(itemCatalog)
    : null;
  const coverageClaimsInput = flags.get("coverage-claims-file");
  const coverageClaimsSource =
    typeof coverageClaimsInput === "string"
      ? readRepositoryJsonInput(coverageClaimsInput, "--coverage-claims-file")
      : undefined;
  const {
    coverageClaims,
    manifest,
    reviews,
    nextRegistry,
  } = await buildCandidateEnvelope({
    sourceBundle,
    sourceManifestHash: sourceValidation.hashes.manifest,
    newVersion,
    contentSchemaVersion,
    audience,
    createdAt,
    runtimeIds,
    itemCatalog,
    runtimeCatalog,
    coverageClaimsSource,
    liveSourceTexts,
    contentOwner:
      typeof ownerId === "string" && typeof ownerEvidence === "string"
        ? { id: ownerId, evidenceRef: ownerEvidence }
        : null,
    sourceLicense:
      typeof licenseId === "string" && typeof licenseEvidence === "string"
        ? { licenseId, evidenceRef: licenseEvidence }
        : null,
    audioRights: inheritedAudioRights,
  });
  await writeCandidatePackage({
    temporaryDirectory,
    targetDirectory,
    nextRegistry,
    manifest,
    runtimeIds,
    itemCatalog,
    runtimeCatalog,
    coverageClaims,
    reviews,
    sourceTexts: liveSourceTexts,
    validateStaged: true,
    writeAdditionalArtifacts: inheritedArtifacts.size === 0
      ? undefined
      : (stagedDirectory) => {
          writeCapturedArtifacts(stagedDirectory, inheritedArtifacts);
        },
  });
  console.log(
    `Created and selected candidate ${newVersion} from ${fromVersion}; approvals were intentionally cleared${coverageClaimsInput === undefined ? " together with coverage claims" : ""}`,
  );
  return 0;
  });
};

const importAudioCommand = async (args) => {
  const { positional, flags } = parseArguments(args);
  assertCommandShape(positional, flags, {
    minPositionals: 1,
    maxPositionals: 1,
    allowedFlags: [
      "write",
      "from",
      "created-at",
      "audience",
      "owner-id",
      "owner-evidence",
      "license-id",
      "license-evidence",
      "audio-owner-id",
      "audio-license-id",
      "audio-evidence",
      "runtime-ids-file",
      "confirm-runtime-ids-unchanged",
      "coverage-claims-file",
      "content-schema-version",
      "item-catalog-file",
      "audio-descriptor-file",
    ],
  });
  requireWrite(flags);
  return withContentWriteLock(async () => {
    const newVersion = positional[0];
    assertPackageId(newVersion, "new content version");
    const fromVersion = requiredFlag(flags, "from");
    const createdAt = requiredFlag(flags, "created-at");
    requireCanonicalTimestamp(createdAt, "--created-at");
    const audience = flags.get("audience") ?? "closed-alpha";
    if (!["closed-alpha", "public"].includes(audience)) {
      throw new Error("--audience must be closed-alpha or public");
    }
    const requestedContentSchemaVersion = Number(requiredFlag(
      flags,
      "content-schema-version",
    ));
    const loadedSource = loadContentBundle(fromVersion);
    const requiredContentSchemaVersion = Math.max(
      loadedSource.bundle.manifest.contentSchemaVersion,
      5,
    );
    if (
      !Number.isInteger(requestedContentSchemaVersion)
      || requestedContentSchemaVersion !== requiredContentSchemaVersion
      || ![5, 6].includes(requestedContentSchemaVersion)
    ) {
      throw new Error(
        `import-audio requires --content-schema-version ${requiredContentSchemaVersion} when branching from ${fromVersion}`,
      );
    }
    const ownerId = flags.get("owner-id");
    const ownerEvidence = flags.get("owner-evidence");
    if ((ownerId === undefined) !== (ownerEvidence === undefined)) {
      throw new Error("--owner-id and --owner-evidence must be supplied together");
    }
    const licenseId = flags.get("license-id");
    const licenseEvidence = flags.get("license-evidence");
    if ((licenseId === undefined) !== (licenseEvidence === undefined)) {
      throw new Error("--license-id and --license-evidence must be supplied together");
    }
    const audioOwnerId = requiredFlag(flags, "audio-owner-id");
    const audioLicenseId = requiredFlag(flags, "audio-license-id");
    const audioEvidence = requiredFlag(flags, "audio-evidence");
    const itemCatalogInput = requiredFlag(flags, "item-catalog-file");
    const descriptorInput = requiredFlag(flags, "audio-descriptor-file");

    const contentSchemaVersion = requestedContentSchemaVersion;
    const {
      sourceBundle,
      sourcePackageDirectory,
      sourceValidation,
      liveSourceTexts,
      targetDirectory,
      temporaryDirectory,
      runtimeIds,
    } = await prepareCandidateBranch({
      newVersion,
      fromVersion,
      contentSchemaVersion,
      flags,
      sourceBundle: loadedSource.bundle,
      sourcePackageDirectory: loadedSource.packageDirectory,
      currentVersionError:
        "Audio imports must branch from registry.currentContentVersion",
    });
    const baseItemCatalog = readRepositoryJsonInput(
      itemCatalogInput,
      "--item-catalog-file",
    );
    const expectedBaseCatalogSchemaVersion =
      sourceBundle.itemCatalog?.schemaVersion
      ?? (contentSchemaVersion >= 6 ? 4 : 2);
    if (
      ![2, 3, 4].includes(expectedBaseCatalogSchemaVersion)
      || baseItemCatalog.schemaVersion !== expectedBaseCatalogSchemaVersion
    ) {
      throw new Error(
        `import-audio requires a schema-v${expectedBaseCatalogSchemaVersion} --item-catalog-file when branching from ${fromVersion}`,
      );
    }
    if (baseItemCatalog.contentVersion !== newVersion) {
      throw new Error(
        "--item-catalog-file contentVersion must equal the new version",
      );
    }
    if (!Array.isArray(baseItemCatalog.audioAssets)) {
      throw new Error("--item-catalog-file audioAssets must be an array");
    }
    if (
      baseItemCatalog.schemaVersion < 3
      && baseItemCatalog.audioAssets.length > 0
    ) {
      throw new Error(
        "--item-catalog-file must not carry legacy uninspected audioAssets",
      );
    }
    if (!Array.isArray(baseItemCatalog.items)) {
      throw new Error("--item-catalog-file items must be an array");
    }
    if (isRecord(sourceBundle.itemCatalog)) {
      await assertArtifactCatalogContinuity({
        sourceCatalog: sourceBundle.itemCatalog,
        targetCatalog: baseItemCatalog,
        targetContentSchemaVersion: contentSchemaVersion,
        commandLabel: "import-audio base catalog",
        requireTargetAudioBinding: false,
      });
    } else if (
      contentSchemaVersion >= 6
      || baseItemCatalog.audioAssets.length > 0
    ) {
      throw new Error(
        "import-audio cannot inherit artifact-backed catalog data without a source item catalog",
      );
    }
    const existingAudioAssets = baseItemCatalog.audioAssets;
    const existingAudioById = new Map(
      existingAudioAssets.map((asset) => [asset.assetId, asset]),
    );
    const itemMap = new Map(
      baseItemCatalog.items
        .filter(isRecord)
        .map((item) => [item.itemKey, item]),
    );

    const descriptor = readRepositoryJsonInput(
      descriptorInput,
      "--audio-descriptor-file",
    );
    assertExactObjectKeys(
      descriptor,
      ["schemaVersion", "contentVersion", "assets"],
      "audio descriptor",
    );
    if (descriptor.schemaVersion !== 1) {
      throw new Error("audio descriptor.schemaVersion must be 1");
    }
    if (descriptor.contentVersion !== newVersion) {
      throw new Error(
        "audio descriptor.contentVersion must equal the new version",
      );
    }
    if (!Array.isArray(descriptor.assets) || descriptor.assets.length === 0) {
      throw new Error("audio descriptor.assets must be a non-empty array");
    }
    if (
      descriptor.assets.length
      > AUDIO_CATALOG_MUTATION_POLICY.maxAssetCount
    ) {
      throw new Error(
        `audio descriptor.assets exceeds the ${AUDIO_CATALOG_MUTATION_POLICY.maxAssetCount}-asset import limit`,
      );
    }
    const replacedAudioAssetIds = new Set();
    const descriptorAssetIds = new Set();
    for (const [index, descriptorAsset] of descriptor.assets.entries()) {
      const prefix = `audio descriptor.assets[${index}]`;
      if (!isRecord(descriptorAsset)) {
        throw new Error(`${prefix} must be an object`);
      }
      assertSafeAudioAssetId(descriptorAsset.assetId, `${prefix}.assetId`);
      if (descriptorAssetIds.has(descriptorAsset.assetId)) {
        throw new Error(`Duplicate audio asset id: ${descriptorAsset.assetId}`);
      }
      descriptorAssetIds.add(descriptorAsset.assetId);
      const replacedAsset = existingAudioById.get(descriptorAsset.assetId);
      if (
        replacedAsset !== undefined
        && replacedAsset.targetItemKey !== descriptorAsset.targetItemKey
      ) {
        throw new Error(
          `${prefix}.targetItemKey must match the existing asset when replacing ${descriptorAsset.assetId}`,
        );
      }
      if (replacedAsset !== undefined) {
        replacedAudioAssetIds.add(descriptorAsset.assetId);
      }
    }
    const retainedAudioAssets = existingAudioAssets.filter(
      (asset) => !replacedAudioAssetIds.has(asset.assetId),
    );
    if (
      retainedAudioAssets.length + descriptor.assets.length
      > AUDIO_CATALOG_MUTATION_POLICY.maxAssetCount
    ) {
      throw new Error(
        `combined inherited and imported audioAssets exceed the ${AUDIO_CATALOG_MUTATION_POLICY.maxAssetCount}-asset limit`,
      );
    }
    const inheritedArtifacts = isRecord(sourceBundle.itemCatalog)
      ? await captureInheritedCatalogArtifacts({
          sourcePackageDirectory,
          itemCatalog: {
            ...baseItemCatalog,
            audioAssets: retainedAudioAssets,
          },
          contentSchemaVersion,
          commandLabel: "import-audio",
        })
      : new Map();
    const capturedAudioRefs = new Set();
    let aggregateCapturedAudioByteLength = 0;
    for (const asset of retainedAudioAssets) {
      if (capturedAudioRefs.has(asset.fileRef)) continue;
      const inheritedArtifact = inheritedArtifacts.get(asset.fileRef);
      if (inheritedArtifact === undefined) {
        throw new Error(
          `Inherited audio artifact is unavailable: ${String(asset.fileRef)}`,
        );
      }
      capturedAudioRefs.add(asset.fileRef);
      aggregateCapturedAudioByteLength += inheritedArtifact.bytes.byteLength;
    }
    const importedAssets = [];
    const sourceBytesByAssetId = new Map();
    for (const [index, descriptorAsset] of descriptor.assets.entries()) {
      const prefix = `audio descriptor.assets[${index}]`;
      assertExactObjectKeys(
        descriptorAsset,
        [
          "assetId",
          "targetItemKey",
          "sourceFile",
          "expectedFileSha256",
          "transcript",
          "segments",
          "speaker",
          "rights",
        ],
        prefix,
      );
      assertSafeAudioAssetId(descriptorAsset.assetId, `${prefix}.assetId`);
      const targetItem = itemMap.get(descriptorAsset.targetItemKey);
      if (!isRecord(targetItem)) {
        throw new Error(
          `${prefix}.targetItemKey references unknown item ${String(descriptorAsset.targetItemKey)}`,
        );
      }
      if (!SHA256_DIGEST_PATTERN.test(descriptorAsset.expectedFileSha256 ?? "")) {
        throw new Error(`${prefix}.expectedFileSha256 must be a SHA-256 digest`);
      }
      const { bytes: sourceBytes } = resolveRepositoryAudioSource(
        descriptorAsset.sourceFile,
        `${prefix}.sourceFile`,
      );
      const actualFileSha256 = sha256Bytes(sourceBytes);
      if (actualFileSha256 !== descriptorAsset.expectedFileSha256) {
        throw new Error(
          `${prefix}.expectedFileSha256 does not match source bytes`,
        );
      }
      let media;
      try {
        media = inspectCanonicalWave(sourceBytes);
      } catch (error) {
        throw new Error(
          `${prefix}.sourceFile is not canonical audio: ${
            error instanceof Error ? error.message : String(error)
          }`,
          { cause: error },
        );
      }
      const transcript = requireNonEmptyString(
        descriptorAsset.transcript,
        `${prefix}.transcript`,
      );
      const transcriptSha256 = await sha256NormalizedText(transcript);
      assertExactObjectKeys(
        descriptorAsset.speaker,
        ["id", "nativeSpeakerEvidenceRef"],
        `${prefix}.speaker`,
      );
      requireNonEmptyString(descriptorAsset.speaker.id, `${prefix}.speaker.id`);
      requireNonEmptyString(
        descriptorAsset.speaker.nativeSpeakerEvidenceRef,
        `${prefix}.speaker.nativeSpeakerEvidenceRef`,
      );
      assertExactObjectKeys(
        descriptorAsset.rights,
        ["ownerId", "licenseId", "evidenceRef"],
        `${prefix}.rights`,
      );
      requireNonEmptyString(
        descriptorAsset.rights.ownerId,
        `${prefix}.rights.ownerId`,
      );
      requireNonEmptyString(
        descriptorAsset.rights.licenseId,
        `${prefix}.rights.licenseId`,
      );
      requireNonEmptyString(
        descriptorAsset.rights.evidenceRef,
        `${prefix}.rights.evidenceRef`,
      );
      if (
        descriptorAsset.rights.ownerId !== audioOwnerId
        || descriptorAsset.rights.licenseId !== audioLicenseId
        || descriptorAsset.rights.evidenceRef !== audioEvidence
      ) {
        throw new Error(
          `${prefix}.rights must exactly match the CLI audio rights metadata`,
        );
      }
      if (!Array.isArray(descriptorAsset.segments)) {
        throw new Error(`${prefix}.segments must be an array`);
      }
      const segments = descriptorAsset.segments.map((segment, segmentIndex) => {
        const segmentPrefix = `${prefix}.segments[${segmentIndex}]`;
        assertExactObjectKeys(
          segment,
          ["startMs", "endMs", "text"],
          segmentPrefix,
        );
        if (!Number.isInteger(segment.startMs) || segment.startMs < 0) {
          throw new Error(`${segmentPrefix}.startMs must be a non-negative integer`);
        }
        if (!Number.isInteger(segment.endMs) || segment.endMs <= segment.startMs) {
          throw new Error(`${segmentPrefix}.endMs must be after startMs`);
        }
        requireNonEmptyString(segment.text, `${segmentPrefix}.text`);
        return {
          startMs: segment.startMs,
          endMs: segment.endMs,
          text: segment.text,
        };
      });
      const fileRef = `audio/${descriptorAsset.assetId}.wav`;
      if (!capturedAudioRefs.has(fileRef)) {
        capturedAudioRefs.add(fileRef);
        aggregateCapturedAudioByteLength += sourceBytes.byteLength;
        if (
          aggregateCapturedAudioByteLength
          > AUDIO_CATALOG_MUTATION_POLICY.maxAggregateByteLength
        ) {
          throw new Error(
            `combined inherited and imported audio bytes exceed the ${AUDIO_CATALOG_MUTATION_POLICY.maxAggregateByteLength}-byte aggregate limit`,
          );
        }
      }
      importedAssets.push({
        assetId: descriptorAsset.assetId,
        targetItemKey: descriptorAsset.targetItemKey,
        targetPayloadSha256: targetItem.payloadSha256,
        fileRef,
        fileSha256: actualFileSha256,
        transcript,
        transcriptSha256,
        speaker: {
          id: descriptorAsset.speaker.id,
          nativeSpeakerEvidenceRef:
            descriptorAsset.speaker.nativeSpeakerEvidenceRef,
        },
        rights: {
          ownerId: descriptorAsset.rights.ownerId,
          licenseId: descriptorAsset.rights.licenseId,
          evidenceRef: descriptorAsset.rights.evidenceRef,
        },
        media,
        alignment: {
          schemaVersion: 1,
          targetTextSha256: transcriptSha256,
          segments,
        },
      });
      sourceBytesByAssetId.set(descriptorAsset.assetId, sourceBytes);
    }
    importedAssets.sort((left, right) =>
      left.assetId < right.assetId ? -1 : left.assetId > right.assetId ? 1 : 0
    );
    if (retainedAudioAssets.length > 0) {
      const retainedAudioRights =
        sourceBundle.manifest.governance.audioRights;
      if (
        !isRecord(retainedAudioRights)
        || retainedAudioRights.ownerId !== audioOwnerId
        || retainedAudioRights.licenseId !== audioLicenseId
        || retainedAudioRights.evidenceRef !== audioEvidence
      ) {
        throw new Error(
          "CLI audio rights must exactly match every retained audio asset; replace all existing assets to rotate rights",
        );
      }
    }
    const itemCatalog = {
      ...baseItemCatalog,
      schemaVersion: contentSchemaVersion >= 6 ? 4 : 3,
      audioAssets: [...retainedAudioAssets, ...importedAssets].sort(
        (left, right) =>
          left.assetId < right.assetId
            ? -1
            : left.assetId > right.assetId
              ? 1
              : 0,
      ),
    };
    const runtimeCatalog = projectSanitizedRuntimeCatalog(itemCatalog);
    const coverageClaimsInput = flags.get("coverage-claims-file");
    const coverageClaimsSource = typeof coverageClaimsInput === "string"
      ? readRepositoryJsonInput(
          coverageClaimsInput,
          "--coverage-claims-file",
        )
      : undefined;
    const {
      coverageClaims,
      manifest,
      reviews,
      nextRegistry,
    } = await buildCandidateEnvelope({
      sourceBundle,
      sourceManifestHash: sourceValidation.hashes.manifest,
      newVersion,
      contentSchemaVersion,
      audience,
      createdAt,
      runtimeIds,
      itemCatalog,
      runtimeCatalog,
      coverageClaimsSource,
      liveSourceTexts,
      contentOwner:
        typeof ownerId === "string" && typeof ownerEvidence === "string"
          ? { id: ownerId, evidenceRef: ownerEvidence }
          : null,
      sourceLicense:
        typeof licenseId === "string" && typeof licenseEvidence === "string"
          ? { licenseId, evidenceRef: licenseEvidence }
          : null,
      audioRights: {
        ownerId: audioOwnerId,
        licenseId: audioLicenseId,
        evidenceRef: audioEvidence,
      },
    });

    await writeCandidatePackage({
      temporaryDirectory,
      targetDirectory,
      nextRegistry,
      manifest,
      runtimeIds,
      itemCatalog,
      runtimeCatalog,
      coverageClaims,
      reviews,
      sourceTexts: liveSourceTexts,
      validateStaged: true,
      writeAdditionalArtifacts: (stagedDirectory) => {
        writeCapturedArtifacts(stagedDirectory, inheritedArtifacts);
        const audioDirectory = join(stagedDirectory, "audio");
        if (!existsSync(audioDirectory)) mkdirSync(audioDirectory);
        importedAssets.forEach((asset) => {
          writeFileSync(
            join(stagedDirectory, ...asset.fileRef.split("/")),
            sourceBytesByAssetId.get(asset.assetId),
            { flag: "wx" },
          );
        });
      },
    });
    console.log(
      `Imported ${importedAssets.length} canonical audio asset(s) into candidate ${newVersion} from ${fromVersion}; ${
        coverageClaimsInput === undefined
          ? "approvals and coverage claims were intentionally cleared"
          : "approvals were intentionally cleared; supplied coverage claims were retained in the new candidate envelope"
      }`,
    );
    return 0;
  });
};

const importCharacterMetadataCommand = async (args) => {
  const { positional, flags } = parseArguments(args);
  assertCommandShape(positional, flags, {
    minPositionals: 1,
    maxPositionals: 1,
    allowedFlags: [
      "write",
      "from",
      "created-at",
      "audience",
      "owner-id",
      "owner-evidence",
      "license-id",
      "license-evidence",
      "runtime-ids-file",
      "confirm-runtime-ids-unchanged",
      "content-schema-version",
      "item-catalog-file",
      "character-descriptor-file",
    ],
  });
  requireWrite(flags);
  return withContentWriteLock(async () => {
    const newVersion = positional[0];
    assertPackageId(newVersion, "new content version");
    const fromVersion = requiredFlag(flags, "from");
    const createdAt = requiredFlag(flags, "created-at");
    requireCanonicalTimestamp(createdAt, "--created-at");
    const audience = flags.get("audience") ?? "closed-alpha";
    if (!["closed-alpha", "public"].includes(audience)) {
      throw new Error("--audience must be closed-alpha or public");
    }
    if (requiredFlag(flags, "content-schema-version") !== "6") {
      throw new Error(
        "import-character-metadata requires --content-schema-version 6",
      );
    }
    const ownerId = flags.get("owner-id");
    const ownerEvidence = flags.get("owner-evidence");
    if ((ownerId === undefined) !== (ownerEvidence === undefined)) {
      throw new Error("--owner-id and --owner-evidence must be supplied together");
    }
    const licenseId = flags.get("license-id");
    const licenseEvidence = flags.get("license-evidence");
    if ((licenseId === undefined) !== (licenseEvidence === undefined)) {
      throw new Error("--license-id and --license-evidence must be supplied together");
    }
    const itemCatalogInput = requiredFlag(flags, "item-catalog-file");
    const descriptorInput = requiredFlag(flags, "character-descriptor-file");
    const contentSchemaVersion = 6;
    const {
      sourceBundle,
      sourcePackageDirectory,
      sourceValidation,
      liveSourceTexts,
      targetDirectory,
      temporaryDirectory,
      runtimeIds,
    } = await prepareCandidateBranch({
      newVersion,
      fromVersion,
      contentSchemaVersion,
      flags,
      currentVersionError:
        "Character metadata imports must branch from registry.currentContentVersion",
    });

    const baseItemCatalog = readRepositoryJsonInput(
      itemCatalogInput,
      "--item-catalog-file",
    );
    if (!isRecord(sourceBundle.itemCatalog)) {
      throw new Error(
        "import-character-metadata requires a source item catalog",
      );
    }
    const expectedBaseCatalogSchemaVersion =
      sourceBundle.itemCatalog.schemaVersion;
    if (
      ![2, 3, 4].includes(expectedBaseCatalogSchemaVersion)
      || baseItemCatalog.schemaVersion !== expectedBaseCatalogSchemaVersion
    ) {
      throw new Error(
        `import-character-metadata requires a schema-v${expectedBaseCatalogSchemaVersion} --item-catalog-file when branching from ${fromVersion}`,
      );
    }
    if (baseItemCatalog.contentVersion !== newVersion) {
      throw new Error(
        "--item-catalog-file contentVersion must equal the new version",
      );
    }
    if (!Array.isArray(baseItemCatalog.audioAssets)) {
      throw new Error("--item-catalog-file audioAssets must be an array");
    }
    if (
      baseItemCatalog.schemaVersion < 3
      && baseItemCatalog.audioAssets.length > 0
    ) {
      throw new Error(
        "--item-catalog-file must not carry legacy uninspected audioAssets",
      );
    }
    if (!Array.isArray(baseItemCatalog.items)) {
      throw new Error("--item-catalog-file items must be an array");
    }
    assertInheritedAudioTargetsMatchCatalog(
      baseItemCatalog.items,
      baseItemCatalog.audioAssets,
    );
    await assertArtifactCatalogContinuity({
      sourceCatalog: sourceBundle.itemCatalog,
      targetCatalog: baseItemCatalog,
      targetContentSchemaVersion: contentSchemaVersion,
      commandLabel: "import-character-metadata base catalog",
      preserveCharacters: false,
    });
    const inheritedAudioArtifacts = await captureInheritedCatalogArtifacts({
      sourcePackageDirectory,
      itemCatalog: baseItemCatalog,
      contentSchemaVersion,
      commandLabel: "import-character-metadata",
      includeCharacters: false,
    });
    const inheritedAudioRights = baseItemCatalog.audioAssets.length > 0
      ? sourceBundle.manifest.governance.audioRights
      : null;
    if (
      baseItemCatalog.audioAssets.length > 0
      && !isRecord(inheritedAudioRights)
    ) {
      throw new Error(
        "import-character-metadata cannot preserve audio without source manifest audio rights",
      );
    }
    const itemMap = new Map();
    for (const [index, item] of baseItemCatalog.items.entries()) {
      if (!isRecord(item) || typeof item.itemKey !== "string") {
        throw new Error(`--item-catalog-file items[${index}] must have an itemKey`);
      }
      if (itemMap.has(item.itemKey)) {
        throw new Error(`Duplicate item key in --item-catalog-file: ${item.itemKey}`);
      }
      itemMap.set(item.itemKey, item);
    }
    const characterItems = baseItemCatalog.items.filter(
      (item) => item?.itemType === "character",
    );
    if (characterItems.length === 0) {
      throw new Error("--item-catalog-file contains no character items to enrich");
    }

    const descriptor = readRepositoryJsonInput(
      descriptorInput,
      "--character-descriptor-file",
    );
    assertExactObjectKeys(
      descriptor,
      ["schemaVersion", "contentVersion", "characters"],
      "character descriptor",
    );
    if (descriptor.schemaVersion !== 1) {
      throw new Error("character descriptor.schemaVersion must be 1");
    }
    if (descriptor.contentVersion !== newVersion) {
      throw new Error(
        "character descriptor.contentVersion must equal the new version",
      );
    }
    if (!Array.isArray(descriptor.characters) || descriptor.characters.length === 0) {
      throw new Error("character descriptor.characters must be a non-empty array");
    }
    if (
      descriptor.characters.length
      > CHARACTER_METADATA_IMPORT_POLICY.maxCharacterCount
    ) {
      throw new Error(
        `character descriptor.characters exceeds the ${CHARACTER_METADATA_IMPORT_POLICY.maxCharacterCount}-character import limit`,
      );
    }

    const importsByItemKey = new Map();
    const artifactSourcesByRef = new Map();
    let aggregateSourceFileCount = 0;
    let aggregateSourceByteLength = 0;
    for (const [index, descriptorCharacter] of descriptor.characters.entries()) {
      const prefix = `character descriptor.characters[${index}]`;
      assertExactObjectKeys(
        descriptorCharacter,
        [
          "targetItemKey",
          "expectedTargetPayloadSha256",
          "decompositionKind",
          "radical",
          "components",
          "structure",
          "sources",
          "strokeSourceId",
        ],
        prefix,
      );
      const targetItemKey = requireNonEmptyString(
        descriptorCharacter.targetItemKey,
        `${prefix}.targetItemKey`,
      );
      if (importsByItemKey.has(targetItemKey)) {
        throw new Error(`Duplicate character target: ${targetItemKey}`);
      }
      const targetItem = itemMap.get(targetItemKey);
      if (!isRecord(targetItem) || targetItem.itemType !== "character") {
        throw new Error(
          `${prefix}.targetItemKey references unknown character item ${targetItemKey}`,
        );
      }
      assertSafeCharacterFileId(targetItem.itemId, `${prefix} target itemId`);
      const targetCharacter = requireSingleGlyph(
        targetItem.payload?.character,
        `${prefix} target payload.character`,
      );
      if (
        !SHA256_DIGEST_PATTERN.test(
          descriptorCharacter.expectedTargetPayloadSha256 ?? "",
        )
      ) {
        throw new Error(
          `${prefix}.expectedTargetPayloadSha256 must be a SHA-256 digest`,
        );
      }
      const canonicalTargetPayloadSha256 = await sha256Json({
        itemType: targetItem.itemType,
        payload: targetItem.payload,
      });
      if (targetItem.payloadSha256 !== canonicalTargetPayloadSha256) {
        throw new Error(
          `${prefix}.targetItemKey has a non-canonical payloadSha256`,
        );
      }
      if (
        descriptorCharacter.expectedTargetPayloadSha256
        !== targetItem.payloadSha256
      ) {
        throw new Error(
          `${prefix}.expectedTargetPayloadSha256 does not match the target item`,
        );
      }
      if (
        descriptorCharacter.decompositionKind !== "independent"
        && descriptorCharacter.decompositionKind !== "compound"
      ) {
        throw new Error(
          `${prefix}.decompositionKind must be independent or compound`,
        );
      }

      assertExactObjectKeys(
        descriptorCharacter.radical,
        ["glyph", "sourceIds"],
        `${prefix}.radical`,
      );
      const radical = {
        glyph: requireSingleGlyph(
          descriptorCharacter.radical?.glyph,
          `${prefix}.radical.glyph`,
        ),
        sourceIds: requireSourceIds(
          descriptorCharacter.radical?.sourceIds,
          `${prefix}.radical.sourceIds`,
        ),
      };

      if (!Array.isArray(descriptorCharacter.components)) {
        throw new Error(`${prefix}.components must be an array`);
      }
      if (
        descriptorCharacter.components.length
        > CHARACTER_METADATA_IMPORT_POLICY.maxComponentsPerCharacter
      ) {
        throw new Error(
          `${prefix}.components exceeds the ${CHARACTER_METADATA_IMPORT_POLICY.maxComponentsPerCharacter}-component limit`,
        );
      }
      const componentIds = new Set();
      const components = descriptorCharacter.components.map(
        (component, componentIndex) => {
          const componentPrefix = `${prefix}.components[${componentIndex}]`;
          assertExactObjectKeys(
            component,
            ["componentId", "glyph", "role", "position", "sourceIds"],
            componentPrefix,
          );
          assertSafeCharacterFileId(
            component.componentId,
            `${componentPrefix}.componentId`,
          );
          if (componentIds.has(component.componentId)) {
            throw new Error(`${prefix}.components contains duplicate componentId`);
          }
          componentIds.add(component.componentId);
          if (!CHARACTER_COMPONENT_ROLES.has(component.role)) {
            throw new Error(`${componentPrefix}.role is unsupported`);
          }
          if (!CHARACTER_COMPONENT_POSITIONS.has(component.position)) {
            throw new Error(`${componentPrefix}.position is unsupported`);
          }
          return {
            componentId: component.componentId,
            glyph: requireSingleGlyph(
              component.glyph,
              `${componentPrefix}.glyph`,
            ),
            role: component.role,
            position: component.position,
            sourceIds: requireSourceIds(
              component.sourceIds,
              `${componentPrefix}.sourceIds`,
            ),
          };
        },
      );
      if (
        descriptorCharacter.decompositionKind === "independent"
        && components.length !== 0
      ) {
        throw new Error(`${prefix}.components must be empty for independent characters`);
      }
      if (
        descriptorCharacter.decompositionKind === "compound"
        && components.length === 0
      ) {
        throw new Error(`${prefix}.components must not be empty for compound characters`);
      }

      assertExactObjectKeys(
        descriptorCharacter.structure,
        ["kind", "sourceIds"],
        `${prefix}.structure`,
      );
      if (!CHARACTER_STRUCTURE_KINDS.has(descriptorCharacter.structure?.kind)) {
        throw new Error(`${prefix}.structure.kind is unsupported`);
      }
      if (
        (descriptorCharacter.decompositionKind === "independent")
        !== (descriptorCharacter.structure.kind === "independent")
      ) {
        throw new Error(
          `${prefix}.structure.kind must match decompositionKind`,
        );
      }
      const structure = {
        kind: descriptorCharacter.structure.kind,
        sourceIds: requireSourceIds(
          descriptorCharacter.structure.sourceIds,
          `${prefix}.structure.sourceIds`,
        ),
      };

      if (
        !Array.isArray(descriptorCharacter.sources)
        || descriptorCharacter.sources.length === 0
      ) {
        throw new Error(`${prefix}.sources must be a non-empty array`);
      }
      if (
        descriptorCharacter.sources.length
        > CHARACTER_METADATA_IMPORT_POLICY.maxSourcesPerCharacter
      ) {
        throw new Error(
          `${prefix}.sources exceeds the ${CHARACTER_METADATA_IMPORT_POLICY.maxSourcesPerCharacter}-source limit`,
        );
      }
      const sourceById = new Map();
      const strokeSources = [];
      for (const [sourceIndex, source] of descriptorCharacter.sources.entries()) {
        const sourcePrefix = `${prefix}.sources[${sourceIndex}]`;
        assertExactObjectKeys(
          source,
          [
            "sourceId",
            "kind",
            "recordKey",
            "citationRef",
            "licenseId",
            "licenseEvidenceRef",
            "sourceFile",
            "expectedFileSha256",
          ],
          sourcePrefix,
        );
        assertSafeCharacterFileId(source.sourceId, `${sourcePrefix}.sourceId`);
        if (sourceById.has(source.sourceId)) {
          throw new Error(`${prefix}.sources contains duplicate sourceId`);
        }
        if (!CHARACTER_SOURCE_KINDS.has(source.kind)) {
          throw new Error(`${sourcePrefix}.kind is unsupported`);
        }
        const recordKey = requireSingleGlyph(
          source.recordKey,
          `${sourcePrefix}.recordKey`,
        );
        if (recordKey !== targetCharacter) {
          throw new Error(
            `${sourcePrefix}.recordKey must match the target character`,
          );
        }
        requireNonEmptyString(source.citationRef, `${sourcePrefix}.citationRef`);
        requireNonEmptyString(source.licenseId, `${sourcePrefix}.licenseId`);
        requireNonEmptyString(
          source.licenseEvidenceRef,
          `${sourcePrefix}.licenseEvidenceRef`,
        );
        if (!SHA256_DIGEST_PATTERN.test(source.expectedFileSha256 ?? "")) {
          throw new Error(`${sourcePrefix}.expectedFileSha256 must be a SHA-256 digest`);
        }
        const { bytes } = resolveRepositoryCharacterSource(
          source.sourceFile,
          `${sourcePrefix}.sourceFile`,
        );
        aggregateSourceFileCount += 1;
        aggregateSourceByteLength += bytes.byteLength;
        if (
          aggregateSourceFileCount
          > CHARACTER_METADATA_IMPORT_POLICY.maxSourceFileCount
        ) {
          throw new Error(
            `character descriptor source files exceed the ${CHARACTER_METADATA_IMPORT_POLICY.maxSourceFileCount}-file aggregate limit`,
          );
        }
        if (
          aggregateSourceByteLength
          > CHARACTER_METADATA_IMPORT_POLICY.maxAggregateSourceByteLength
        ) {
          throw new Error(
            `character descriptor source bytes exceed the ${CHARACTER_METADATA_IMPORT_POLICY.maxAggregateSourceByteLength}-byte aggregate limit`,
          );
        }
        const actualSha256 = sha256Bytes(bytes);
        if (actualSha256 !== source.expectedFileSha256) {
          throw new Error(
            `${sourcePrefix}.expectedFileSha256 does not match source bytes`,
          );
        }
        const isStrokeSource = source.kind === "stroke-dataset";
        let strokeInspection = null;
        try {
          if (isStrokeSource) {
            if (basename(source.sourceFile) !== `${recordKey}.json`) {
              throw new Error(
                `${sourcePrefix}.sourceFile must end with the target character file ${recordKey}.json`,
              );
            }
            strokeInspection = inspectHanziWriterCharacterData(bytes);
          } else {
            const linguisticInspection =
              inspectCharacterLinguisticSourceRecord(bytes);
            if (linguisticInspection.character !== recordKey) {
              throw new Error(
                `${sourcePrefix}.sourceFile character does not match recordKey`,
              );
            }
          }
        } catch (error) {
          if (isStrokeSource) {
            throw new Error(
              `${sourcePrefix}.sourceFile is not canonical Hanzi Writer data: ${
                error instanceof Error ? error.message : String(error)
              }`,
              { cause: error },
            );
          }
          throw new Error(
            `${sourcePrefix}.sourceFile is not a canonical linguistic JSON record: ${
              error instanceof Error ? error.message : String(error)
            }`,
            { cause: error },
          );
        }
        if (isStrokeSource) {
          strokeSources.push(source.sourceId);
        }
        const recordRef = isStrokeSource
          ? `stroke-data/${targetItem.itemId}.json`
          : `character-sources/${targetItem.itemId}/${source.sourceId}.json`;
        if (artifactSourcesByRef.has(recordRef)) {
          throw new Error(`Duplicate generated character artifact ref: ${recordRef}`);
        }
        artifactSourcesByRef.set(recordRef, {
          bytes,
          expectedFileSha256: actualSha256,
        });
        sourceById.set(source.sourceId, {
          source: {
            sourceId: source.sourceId,
            kind: source.kind,
            recordKey,
            citationRef: source.citationRef,
            licenseId: source.licenseId,
            licenseEvidenceRef: source.licenseEvidenceRef,
            recordRef,
            recordSha256: actualSha256,
          },
          strokeInspection,
        });
      }
      if (strokeSources.length !== 1) {
        throw new Error(`${prefix}.sources must contain exactly one stroke-dataset`);
      }
      assertSafeCharacterFileId(
        descriptorCharacter.strokeSourceId,
        `${prefix}.strokeSourceId`,
      );
      if (descriptorCharacter.strokeSourceId !== strokeSources[0]) {
        throw new Error(
          `${prefix}.strokeSourceId must identify the only stroke-dataset source`,
        );
      }
      const resolveEvidenceSources = (sourceIds, label) => {
        const resolved = sourceIds.map((sourceId) => sourceById.get(sourceId));
        if (resolved.some((source) => source === undefined)) {
          throw new Error(`${label} references an unknown sourceId`);
        }
        if (!resolved.some((source) =>
          source.source.kind === "linguistic-reference"
        )) {
          throw new Error(`${label} must cite a linguistic-reference source`);
        }
      };
      resolveEvidenceSources(radical.sourceIds, `${prefix}.radical.sourceIds`);
      resolveEvidenceSources(structure.sourceIds, `${prefix}.structure.sourceIds`);
      components.forEach((component, componentIndex) => {
        resolveEvidenceSources(
          component.sourceIds,
          `${prefix}.components[${componentIndex}].sourceIds`,
        );
      });
      const usedSourceIds = new Set([
        ...radical.sourceIds,
        ...structure.sourceIds,
        ...components.flatMap((component) => component.sourceIds),
        descriptorCharacter.strokeSourceId,
      ]);
      const unusedSourceIds = [...sourceById.keys()].filter(
        (sourceId) => !usedSourceIds.has(sourceId),
      );
      if (unusedSourceIds.length > 0) {
        throw new Error(
          `${prefix}.sources contains unused source ids: ${unusedSourceIds.join(", ")}`,
        );
      }
      const strokeSource = sourceById.get(descriptorCharacter.strokeSourceId);
      const strokeInspection = strokeSource?.strokeInspection;
      if (strokeSource === undefined || strokeInspection === null) {
        throw new Error(`${prefix}.strokeSourceId has no canonical stroke inspection`);
      }
      importsByItemKey.set(targetItemKey, {
        analysis: {
          schemaVersion: 1,
          decompositionKind: descriptorCharacter.decompositionKind,
          radical,
          components,
          structure,
          sources: [...sourceById.values()]
            .map((entry) => entry.source)
            .sort((left, right) => left.sourceId.localeCompare(right.sourceId)),
        },
        strokeCount: strokeInspection.strokeCount,
        strokeData: {
          format: "hanzi-writer-v1",
          fileRef: strokeSource.source.recordRef,
          fileSha256: strokeSource.source.recordSha256,
          sourceId: descriptorCharacter.strokeSourceId,
        },
      });
    }

    const missingCharacterItems = characterItems
      .map((item) => item.itemKey)
      .filter((itemKey) => !importsByItemKey.has(itemKey));
    if (missingCharacterItems.length > 0) {
      throw new Error(
        `character descriptor must cover every character item; missing ${missingCharacterItems.join(", ")}`,
      );
    }
    if (importsByItemKey.size !== characterItems.length) {
      throw new Error("character descriptor coverage does not exactly match character items");
    }

    const items = await Promise.all(baseItemCatalog.items.map(async (item) => {
      if (item.itemType !== "character") return item;
      const imported = importsByItemKey.get(item.itemKey);
      if (!imported) throw new Error(`Missing character import: ${item.itemKey}`);
      const payload = {
        character: item.payload.character,
        traditional: item.payload.traditional,
        pinyin: item.payload.pinyin,
        meaning: item.payload.meaning,
        sourceLexemeIds: structuredClone(item.payload.sourceLexemeIds),
        analysis: imported.analysis,
        strokeCount: imported.strokeCount,
        strokeData: imported.strokeData,
      };
      return {
        ...item,
        releaseState: "review",
        payload,
        payloadSha256: await sha256Json({ itemType: "character", payload }),
      };
    }));
    const audioAssets = rebindAudioTargetsAfterCharacterImport({
      previousItems: baseItemCatalog.items,
      nextItems: items,
      audioAssets: baseItemCatalog.audioAssets,
    });
    const itemCatalog = {
      ...baseItemCatalog,
      schemaVersion: 4,
      items,
      audioAssets,
    };
    const runtimeCatalog = projectSanitizedRuntimeCatalog(itemCatalog);
    const {
      coverageClaims,
      manifest,
      reviews,
      nextRegistry,
    } = await buildCandidateEnvelope({
      sourceBundle,
      sourceManifestHash: sourceValidation.hashes.manifest,
      newVersion,
      contentSchemaVersion,
      audience,
      createdAt,
      runtimeIds,
      itemCatalog,
      runtimeCatalog,
      coverageClaimsSource: undefined,
      liveSourceTexts,
      contentOwner:
        typeof ownerId === "string" && typeof ownerEvidence === "string"
          ? { id: ownerId, evidenceRef: ownerEvidence }
          : null,
      sourceLicense:
        typeof licenseId === "string" && typeof licenseEvidence === "string"
          ? { licenseId, evidenceRef: licenseEvidence }
          : null,
      audioRights: inheritedAudioRights,
    });
    await writeCandidatePackage({
      temporaryDirectory,
      targetDirectory,
      nextRegistry,
      manifest,
      runtimeIds,
      itemCatalog,
      runtimeCatalog,
      coverageClaims,
      reviews,
      sourceTexts: liveSourceTexts,
      validateStaged: true,
      writeAdditionalArtifacts: (stagedDirectory) => {
        writeCapturedArtifacts(stagedDirectory, inheritedAudioArtifacts);
        [...artifactSourcesByRef.entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .forEach(([fileRef, sourceArtifact]) => {
            if (
              sha256Bytes(sourceArtifact.bytes)
              !== sourceArtifact.expectedFileSha256
            ) {
              throw new Error(
                `Captured character source changed before staging: ${fileRef}`,
              );
            }
            const targetPath = join(stagedDirectory, ...fileRef.split("/"));
            mkdirSync(dirname(targetPath), { recursive: true });
            writeFileSync(targetPath, sourceArtifact.bytes, { flag: "wx" });
          });
      },
    });
    console.log(
      `Imported sourced metadata for ${importsByItemKey.size} character item(s) into candidate ${newVersion} from ${fromVersion}; approvals and coverage claims were intentionally cleared`,
    );
    return 0;
  });
};

const promoteCommand = async (args) => {
  const { positional, flags } = parseArguments(args);
  assertCommandShape(positional, flags, {
    minPositionals: 1,
    maxPositionals: 1,
    allowedFlags: ["write", "channel", "actor-id", "promoted-at"],
  });
  const executePromotion = async () => {
  const { bundle } = loadContentBundle(positional[0]);
  const validation = await validateContentBundle(bundle);
  const channel = releaseChannel(flags, { required: true });
  const release = assessReleaseEligibility(bundle, validation, channel);
  console.log(
    JSON.stringify(
      {
        contentVersion: bundle.manifest.contentVersion,
        channel,
        eligible: release.eligible,
        blockers: release.blockers,
        warnings: release.warnings,
      },
      null,
      2,
    ),
  );
  if (!release.eligible) return 1;
  requireWrite(flags);
  const actorId = requiredFlag(flags, "actor-id");
  const promotedAt = requiredFlag(flags, "promoted-at");
  requireCanonicalTimestamp(promotedAt, "--promoted-at");

  const nextEntry = {
    ...bundle.registryEntry,
    lifecycle: "published",
    closedAlphaEligible: true,
    productionEligible: channel === "production",
    promotion: {
      channel,
      actorId,
      promotedAt,
      packageManifestSha256: validation.hashes.manifest,
      reviewEnvelopeSha256: validation.hashes.reviews,
    },
  };
  const nextRegistry = {
    ...bundle.registry,
    currentContentVersion: bundle.manifest.contentVersion,
    packages: bundle.registry.packages.map((entry) =>
      entry.contentVersion === bundle.manifest.contentVersion ? nextEntry : entry,
    ),
  };
  writeJsonAtomic(registryPath, nextRegistry);
  console.log(
    `Promoted ${bundle.manifest.contentVersion} to ${channel} with exact-hash provenance`,
  );
  return 0;
  };
  return flags.get("write") === true
    ? withContentWriteLock(executePromotion)
    : executePromotion();
};

const commands = {
  validate: validateCommand,
  hash: hashCommand,
  report: reportCommand,
  "verify-release": verifyReleaseCommand,
  "submit-review": submitReviewCommand,
  "new-version": newVersionCommand,
  "import-audio": importAudioCommand,
  "import-character-metadata": importCharacterMetadataCommand,
  promote: promoteCommand,
};

export const runContentCommand = async (command, args) => {
  try {
    const handler = commands[command];
    if (!handler) throw new Error(`Unknown content command: ${command}`);
    return await handler(args);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 2;
  }
};
