import {
  closeSync,
  constants,
  copyFileSync,
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
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
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

const readImmutableSourceTexts = (packageDirectory, contentSchemaVersion) =>
  Object.fromEntries(
    contentSourceArtifactNames(contentSchemaVersion).map((name) => [
      name,
      readTextIfPresent(immutableSnapshotPath(packageDirectory, name)),
    ]),
  );

const readItemCatalog = (packageDirectory, contentSchemaVersion) =>
  contentSchemaVersion >= 3
    ? readJson(join(packageDirectory, "item-catalog.json"))
    : null;

const readRuntimeCatalog = (packageDirectory, contentSchemaVersion) =>
  contentSchemaVersion >= 4
    ? readJson(join(packageDirectory, "runtime-catalog.json"))
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
  const manifest = readJson(join(packageDirectory, "manifest.json"));
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
  return {
      registry,
      registryEntry,
      manifest,
      runtimeIds: readJson(join(packageDirectory, "runtime-ids.json")),
      itemCatalog,
      runtimeCatalog,
      coverageClaims: readJson(join(packageDirectory, "coverage-claims.json")),
      reviews: readJson(join(packageDirectory, "reviews.json")),
      audioAssetFileHashes: audioAssetFiles.hashes,
      audioAssetFileInspections: audioAssetFiles.inspections,
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
  return realPath;
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
  currentVersionError = "New versions must branch from registry.currentContentVersion",
}) => {
  const sourceBundle = suppliedSourceBundle
    ?? loadContentBundle(fromVersion).bundle;
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

  const sourceBundle = loadContentBundle(fromVersion).bundle;
  const requestedContentSchemaVersion = flags.get("content-schema-version");
  const contentSchemaVersion =
    requestedContentSchemaVersion === undefined
      ? Math.max(sourceBundle.manifest.contentSchemaVersion, 2)
      : Number(requestedContentSchemaVersion);
  if (
    !Number.isInteger(contentSchemaVersion)
    || ![2, 3, 4].includes(contentSchemaVersion)
  ) {
    throw new Error("--content-schema-version must be 2, 3, or 4");
  }
  const {
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
    sourceBundle,
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
  const expectedItemCatalogSchemaVersion = contentSchemaVersion >= 4 ? 2 : 1;
  if (
    itemCatalog !== null
    && itemCatalog.schemaVersion !== expectedItemCatalogSchemaVersion
  ) {
    throw new Error(
      `Content schema v${contentSchemaVersion} requires item-catalog.schemaVersion ${expectedItemCatalogSchemaVersion}`,
    );
  }
  if ((itemCatalog?.audioAssets?.length ?? 0) > 0) {
    throw new Error(
      "Audio asset import is not implemented by new-version; refusing to create dangling catalog files",
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
    audioRights: null,
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
    const requestedContentSchemaVersion = requiredFlag(
      flags,
      "content-schema-version",
    );
    if (requestedContentSchemaVersion !== "5") {
      throw new Error("import-audio requires --content-schema-version 5");
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

    const contentSchemaVersion = 5;
    const {
      sourceBundle,
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
        "Audio imports must branch from registry.currentContentVersion",
    });
    const baseItemCatalog = readRepositoryJsonInput(
      itemCatalogInput,
      "--item-catalog-file",
    );
    if (baseItemCatalog.schemaVersion !== 2) {
      throw new Error(
        "import-audio requires a schema-v2 --item-catalog-file",
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
    if (baseItemCatalog.audioAssets.length > 0) {
      throw new Error(
        "--item-catalog-file must have empty audioAssets; import-audio owns asset derivation",
      );
    }
    if (!Array.isArray(baseItemCatalog.items)) {
      throw new Error("--item-catalog-file items must be an array");
    }
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
    if (descriptor.assets.length > 10_000) {
      throw new Error("audio descriptor.assets exceeds the 10000-asset import limit");
    }

    const importedAssets = [];
    const sourceFilesByAssetId = new Map();
    const assetIds = new Set();
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
      if (assetIds.has(descriptorAsset.assetId)) {
        throw new Error(`Duplicate audio asset id: ${descriptorAsset.assetId}`);
      }
      assetIds.add(descriptorAsset.assetId);
      const targetItem = itemMap.get(descriptorAsset.targetItemKey);
      if (!isRecord(targetItem)) {
        throw new Error(
          `${prefix}.targetItemKey references unknown item ${String(descriptorAsset.targetItemKey)}`,
        );
      }
      if (!SHA256_DIGEST_PATTERN.test(descriptorAsset.expectedFileSha256 ?? "")) {
        throw new Error(`${prefix}.expectedFileSha256 must be a SHA-256 digest`);
      }
      const sourcePath = resolveRepositoryAudioSource(
        descriptorAsset.sourceFile,
        `${prefix}.sourceFile`,
      );
      const sourceBytes = readFileSync(sourcePath);
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
      importedAssets.push({
        assetId: descriptorAsset.assetId,
        targetItemKey: descriptorAsset.targetItemKey,
        targetPayloadSha256: targetItem.payloadSha256,
        fileRef: `audio/${descriptorAsset.assetId}.wav`,
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
      sourceFilesByAssetId.set(descriptorAsset.assetId, sourcePath);
    }
    importedAssets.sort((left, right) =>
      left.assetId < right.assetId ? -1 : left.assetId > right.assetId ? 1 : 0
    );
    const itemCatalog = {
      ...baseItemCatalog,
      schemaVersion: 3,
      audioAssets: importedAssets,
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
        const audioDirectory = join(stagedDirectory, "audio");
        mkdirSync(audioDirectory);
        importedAssets.forEach((asset) => {
          copyFileSync(
            sourceFilesByAssetId.get(asset.assetId),
            join(stagedDirectory, ...asset.fileRef.split("/")),
            constants.COPYFILE_EXCL,
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
