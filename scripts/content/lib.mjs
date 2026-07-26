import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
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
  sha256Json,
  sha256NormalizedText,
  validateContentBundle,
} from "../../src/content/governance.mjs";

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const contentRoot = join(repositoryRoot, "content");
const registryPath = join(contentRoot, "registry.json");
const governanceLockPath = join(contentRoot, ".governance.lock");
const SAFE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const REVIEW_ROLES = new Set([
  "content-owner",
  "native-linguistic",
  "source-license",
  "audio-rights",
]);
const REVIEW_DECISIONS = new Set(["approved", "changes-requested"]);
const SOURCE_ARTIFACT_PATHS = {
  "src/data/assessment.ts": join(repositoryRoot, "src", "data", "assessment.ts"),
  "src/data/curriculum.ts": join(repositoryRoot, "src", "data", "curriculum.ts"),
  "src/lib/exerciseGeneration.ts": join(
    repositoryRoot,
    "src",
    "lib",
    "exerciseGeneration.ts",
  ),
  "src/server/attemptScoring.ts": join(
    repositoryRoot,
    "src",
    "server",
    "attemptScoring.ts",
  ),
  "src/server/authoritativeItemBank.ts": join(
    repositoryRoot,
    "src",
    "server",
    "authoritativeItemBank.ts",
  ),
  "src/server/lessonCompletionPolicy.ts": join(
    repositoryRoot,
    "src",
    "server",
    "lessonCompletionPolicy.ts",
  ),
  "src/server/authoritativeAssessmentItemBank.ts": join(
    repositoryRoot,
    "src",
    "server",
    "authoritativeAssessmentItemBank.ts",
  ),
  "src/server/assessmentScoring.ts": join(
    repositoryRoot,
    "src",
    "server",
    "assessmentScoring.ts",
  ),
};

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const formatJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readTextIfPresent = (path) =>
  existsSync(path) ? readFileSync(path, "utf8") : null;

const readLiveSourceTexts = () =>
  Object.fromEntries(
    Object.entries(SOURCE_ARTIFACT_PATHS).map(([name, path]) => [
      name,
      readTextIfPresent(path),
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

const packageLocalPath = (packageDirectory, relativePath) => {
  if (typeof relativePath !== "string") return null;
  const path = resolve(packageDirectory, relativePath);
  const relativeToPackage = relative(packageDirectory, path);
  if (isAbsolute(relativeToPackage) || relativeToPackage.startsWith("..")) {
    return null;
  }
  return path;
};

const readAudioAssetFileHashes = (packageDirectory, itemCatalog) =>
  Object.fromEntries(
    (itemCatalog?.audioAssets ?? []).map((asset) => {
      const path = packageLocalPath(packageDirectory, asset?.fileRef);
      const hash =
        path !== null && existsSync(path)
          ? `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`
          : null;
      return [asset?.fileRef ?? "", hash];
    }),
  );

const liveSourceTextsFromBundle = (bundle) => ({
  "src/data/assessment.ts": bundle.runtimeAssessmentSourceText,
  "src/data/curriculum.ts": bundle.runtimeSourceText,
  "src/lib/exerciseGeneration.ts": bundle.runtimeExerciseGenerationSourceText,
  "src/server/attemptScoring.ts": bundle.runtimeAttemptScoringSourceText,
  "src/server/authoritativeItemBank.ts":
    bundle.runtimeAuthoritativeItemBankSourceText,
  "src/server/lessonCompletionPolicy.ts":
    bundle.runtimeLessonCompletionPolicySourceText,
  "src/server/authoritativeAssessmentItemBank.ts":
    bundle.runtimeAuthoritativeAssessmentItemBankSourceText,
  "src/server/assessmentScoring.ts": bundle.runtimeAssessmentScoringSourceText,
});

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

const readCurriculumCatalogVersion = (sourceText) => {
  if (typeof sourceText !== "string") return null;
  const matches = [
    ...sourceText.matchAll(
      /^import itemCatalogJson from "\.\.\/\.\.\/content\/packages\/([a-zA-Z0-9][a-zA-Z0-9._-]*)\/item-catalog\.json";$/gmu,
    ),
  ];
  return matches.length === 1 ? matches[0][1] : null;
};

export const loadContentBundle = (requestedVersion) => {
  const registry = readJson(registryPath);
  const version = requestedVersion ?? registry.currentContentVersion;
  assertPackageId(version);
  const registryEntry = registry.packages.find((entry) => entry.contentVersion === version);
  if (!registryEntry) throw new Error(`Content version is not registered: ${version}`);
  const packageDirectory = resolvePackageDirectory(registryEntry.relativePath);
  const manifest = readJson(join(packageDirectory, "manifest.json"));
  const itemCatalog = readItemCatalog(
    packageDirectory,
    manifest.contentSchemaVersion,
  );
  const liveSourceTexts = readLiveSourceTexts();
  return {
    packageDirectory,
    bundle: {
      registry,
      registryEntry,
      manifest,
      runtimeIds: readJson(join(packageDirectory, "runtime-ids.json")),
      itemCatalog,
      coverageClaims: readJson(join(packageDirectory, "coverage-claims.json")),
      reviews: readJson(join(packageDirectory, "reviews.json")),
      audioAssetFileHashes: readAudioAssetFileHashes(
        packageDirectory,
        itemCatalog,
      ),
      immutableSourceTexts: readImmutableSourceTexts(
        packageDirectory,
        manifest.contentSchemaVersion,
      ),
      runtimeContentVersion: readRuntimeContentVersion(),
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
    },
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
  const hashes = {
    manifest: await sha256Json(bundle.manifest),
    runtimeIds: await sha256Json(bundle.runtimeIds),
    itemCatalog:
      bundle.itemCatalog === null ? null : await sha256Json(bundle.itemCatalog),
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
          catalogAudioAssets: Array.isArray(bundle.itemCatalog?.audioAssets)
            ? bundle.itemCatalog.audioAssets.length
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
  const includesAudioFlag = flags.get("includes-audio") ?? "false";
  if (!["true", "false"].includes(includesAudioFlag)) {
    throw new Error("--includes-audio must be true or false");
  }
  const includesAudio = includesAudioFlag === "true";
  const audioOwnerId = flags.get("audio-owner-id");
  const audioLicenseId = flags.get("audio-license-id");
  const audioEvidence = flags.get("audio-evidence");
  const audioMetadataValues = [audioOwnerId, audioLicenseId, audioEvidence];
  if (includesAudio && audioMetadataValues.some((value) => value === undefined)) {
    throw new Error(
      "Audio packages require --audio-owner-id, --audio-license-id, and --audio-evidence",
    );
  }
  if (!includesAudio && audioMetadataValues.some((value) => value !== undefined)) {
    throw new Error("Audio rights metadata requires --includes-audio true");
  }

  const { bundle: sourceBundle } = loadContentBundle(fromVersion);
  const requestedContentSchemaVersion = flags.get("content-schema-version");
  const contentSchemaVersion =
    requestedContentSchemaVersion === undefined
      ? Math.max(sourceBundle.manifest.contentSchemaVersion, 2)
      : Number(requestedContentSchemaVersion);
  if (!Number.isInteger(contentSchemaVersion) || ![2, 3].includes(contentSchemaVersion)) {
    throw new Error("--content-schema-version must be 2 or 3");
  }
  if (contentSchemaVersion < sourceBundle.manifest.contentSchemaVersion) {
    throw new Error("A new package cannot downgrade contentSchemaVersion");
  }
  if (sourceBundle.registry.currentContentVersion !== fromVersion) {
    throw new Error("New versions must branch from registry.currentContentVersion");
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
  const liveSourceTexts = liveSourceTextsFromBundle(sourceBundle);
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
    && readCurriculumCatalogVersion(liveSourceTexts["src/data/curriculum.ts"])
      !== newVersion
  ) {
    throw new Error(
      `Bind src/data/curriculum.ts to content/packages/${newVersion}/item-catalog.json before creating the package`,
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
  ) || sourceBundle.manifest.artifacts["src/data/curriculum.ts"] !== liveRuntimeSourceHash;
  const assessmentSourceChanged = sourceValidation.errors.includes(
    "src/data/assessment.ts digest does not match manifest",
  ) || sourceBundle.manifest.artifacts["src/data/assessment.ts"]
    !== liveAssessmentSourceHash;
  const packageBoundSourceErrors = new Set([
    "src/data/curriculum.ts digest does not match manifest",
    "src/data/assessment.ts digest does not match manifest",
    "src/lib/exerciseGeneration.ts digest does not match manifest",
    "src/server/attemptScoring.ts digest does not match manifest",
    "src/server/authoritativeItemBank.ts digest does not match manifest",
    "src/server/lessonCompletionPolicy.ts digest does not match manifest",
    "src/server/authoritativeAssessmentItemBank.ts digest does not match manifest",
    "src/server/assessmentScoring.ts digest does not match manifest",
  ]);
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
    throw new Error(`Cannot branch an invalid package:\n${nonSourceErrors.join("\n")}`);
  }
  const runtimeIdsInput = flags.get("runtime-ids-file");
  if (
    runtimeSourceChanged &&
    runtimeIdsInput === undefined &&
    flags.get("confirm-runtime-ids-unchanged") !== "true"
  ) {
    throw new Error(
      "Runtime source changed: provide --runtime-ids-file or --confirm-runtime-ids-unchanged true",
    );
  }
  if (assessmentSourceChanged && typeof sourceBundle.runtimeAssessmentSourceText !== "string") {
    throw new Error("Assessment source changed but the checked-in source is unavailable");
  }
  if (sourceBundle.registry.packages.some((entry) => entry.contentVersion === newVersion)) {
    throw new Error(`Content version already registered: ${newVersion}`);
  }

  const targetDirectory = resolvePackageDirectory(`packages/${newVersion}`);
  if (existsSync(targetDirectory)) throw new Error(`Target package directory already exists: ${newVersion}`);
  const temporaryDirectory = `${targetDirectory}.${process.pid}.tmp`;
  if (existsSync(temporaryDirectory)) throw new Error(`Temporary package path already exists`);

  const runtimeIdsSource =
    typeof runtimeIdsInput === "string"
      ? readRepositoryJsonInput(runtimeIdsInput, "--runtime-ids-file")
      : sourceBundle.runtimeIds;
  const runtimeIds = { ...runtimeIdsSource, contentVersion: newVersion };
  const itemCatalogInput = flags.get("item-catalog-file");
  if (contentSchemaVersion >= 3 && typeof itemCatalogInput !== "string") {
    throw new Error("Schema-v3 packages require --item-catalog-file");
  }
  if (contentSchemaVersion < 3 && itemCatalogInput !== undefined) {
    throw new Error("--item-catalog-file requires --content-schema-version 3");
  }
  const itemCatalog =
    typeof itemCatalogInput === "string"
      ? readRepositoryJsonInput(itemCatalogInput, "--item-catalog-file")
      : null;
  if (itemCatalog !== null && itemCatalog.contentVersion !== newVersion) {
    throw new Error("--item-catalog-file contentVersion must equal the new version");
  }
  if ((itemCatalog?.audioAssets?.length ?? 0) > 0) {
    throw new Error(
      "Audio asset import is not implemented by new-version; refusing to create dangling catalog files",
    );
  }
  const itemCatalogHash =
    itemCatalog === null ? null : await sha256Json(itemCatalog);
  const coverageClaimsInput = flags.get("coverage-claims-file");
  const coverageClaimsSource =
    typeof coverageClaimsInput === "string"
      ? readRepositoryJsonInput(coverageClaimsInput, "--coverage-claims-file")
      : contentSchemaVersion >= 3
        ? {
            schemaVersion: 2,
            itemCatalogSha256: itemCatalogHash,
            coverageClaims: [],
          }
        : { schemaVersion: 1, coverageClaims: [] };
  const coverageClaims = { ...coverageClaimsSource, contentVersion: newVersion };
  const manifest = {
    schemaVersion: 1,
    packageId: newVersion,
    contentVersion: newVersion,
    contentSchemaVersion,
    audience,
    lifecycle: "candidate",
    createdAt,
    createdFromManifestSha256: sourceValidation.hashes.manifest,
    artifacts: {
      "coverage-claims.json": await sha256Json(coverageClaims),
      "runtime-ids.json": await sha256Json(runtimeIds),
      ...(itemCatalogHash === null
        ? {}
        : { "item-catalog.json": itemCatalogHash }),
      "src/data/assessment.ts": await sha256NormalizedText(
        sourceBundle.runtimeAssessmentSourceText,
      ),
      "src/data/curriculum.ts": await sha256NormalizedText(sourceBundle.runtimeSourceText),
      "src/lib/exerciseGeneration.ts": await sha256NormalizedText(
        sourceBundle.runtimeExerciseGenerationSourceText,
      ),
      "src/server/attemptScoring.ts": await sha256NormalizedText(
        sourceBundle.runtimeAttemptScoringSourceText,
      ),
      "src/server/authoritativeItemBank.ts": await sha256NormalizedText(
        sourceBundle.runtimeAuthoritativeItemBankSourceText,
      ),
      "src/server/lessonCompletionPolicy.ts": await sha256NormalizedText(
        sourceBundle.runtimeLessonCompletionPolicySourceText,
      ),
      "src/server/authoritativeAssessmentItemBank.ts":
        await sha256NormalizedText(
          sourceBundle.runtimeAuthoritativeAssessmentItemBankSourceText,
        ),
      "src/server/assessmentScoring.ts": await sha256NormalizedText(
        sourceBundle.runtimeAssessmentScoringSourceText,
      ),
    },
    governance: {
      contentOwner:
        typeof ownerId === "string" && typeof ownerEvidence === "string"
          ? { id: ownerId, evidenceRef: ownerEvidence }
          : null,
      sourceLicense:
        typeof licenseId === "string" && typeof licenseEvidence === "string"
          ? { licenseId, evidenceRef: licenseEvidence }
          : null,
      nativeLinguisticReviewRequired: true,
      includesAudio,
      audioRights:
        includesAudio &&
        typeof audioOwnerId === "string" &&
        typeof audioLicenseId === "string" &&
        typeof audioEvidence === "string"
          ? {
              ownerId: audioOwnerId,
              licenseId: audioLicenseId,
              evidenceRef: audioEvidence,
            }
          : null,
    },
  };
  const manifestHash = await sha256Json(manifest);
  const reviews = {
    schemaVersion: contentSchemaVersion >= 3 ? 2 : 1,
    contentVersion: newVersion,
    packageManifestSha256: manifestHash,
    ...(itemCatalogHash === null
      ? {}
      : { itemCatalogSha256: itemCatalogHash }),
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
  const nextRegistryEntry = nextRegistry.packages[nextRegistry.packages.length - 1];
  const candidateValidation = await validateContentBundle({
    registry: nextRegistry,
    registryEntry: nextRegistryEntry,
    manifest,
    runtimeIds,
    itemCatalog,
    coverageClaims,
    reviews,
    audioAssetFileHashes: {},
    immutableSourceTexts: liveSourceTexts,
    runtimeContentVersion: readRuntimeContentVersion(),
    runtimeAssessmentSourceText: sourceBundle.runtimeAssessmentSourceText,
    runtimeSourceText: sourceBundle.runtimeSourceText,
    runtimeExerciseGenerationSourceText:
      sourceBundle.runtimeExerciseGenerationSourceText,
    runtimeAttemptScoringSourceText: sourceBundle.runtimeAttemptScoringSourceText,
    runtimeAuthoritativeItemBankSourceText:
      sourceBundle.runtimeAuthoritativeItemBankSourceText,
    runtimeLessonCompletionPolicySourceText:
      sourceBundle.runtimeLessonCompletionPolicySourceText,
    runtimeAuthoritativeAssessmentItemBankSourceText:
      sourceBundle.runtimeAuthoritativeAssessmentItemBankSourceText,
    runtimeAssessmentScoringSourceText:
      sourceBundle.runtimeAssessmentScoringSourceText,
  });
  if (candidateValidation.errors.length > 0) {
    throw new Error(`Generated candidate is invalid:\n${candidateValidation.errors.join("\n")}`);
  }

  mkdirSync(temporaryDirectory);
  try {
    writeFileSync(join(temporaryDirectory, "manifest.json"), formatJson(manifest), "utf8");
    writeFileSync(join(temporaryDirectory, "runtime-ids.json"), formatJson(runtimeIds), "utf8");
    if (itemCatalog !== null) {
      writeFileSync(
        join(temporaryDirectory, "item-catalog.json"),
        formatJson(itemCatalog),
        "utf8",
      );
    }
    writeFileSync(
      join(temporaryDirectory, "coverage-claims.json"),
      formatJson(coverageClaims),
      "utf8",
    );
    writeFileSync(join(temporaryDirectory, "reviews.json"), formatJson(reviews), "utf8");
    writeImmutableSourceTexts(
      temporaryDirectory,
      manifest.contentSchemaVersion,
      liveSourceTexts,
    );
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
  console.log(
    `Created and selected candidate ${newVersion} from ${fromVersion}; approvals were intentionally cleared${coverageClaimsInput === undefined ? " together with coverage claims" : ""}`,
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
