import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assessClosedAlphaEligibility,
  assessPublicationEligibility,
  sha256Json,
  sha256NormalizedText,
  validateContentBundle,
} from "../../src/content/governance.mjs";

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const contentRoot = join(repositoryRoot, "content");
const registryPath = join(contentRoot, "registry.json");
const SAFE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const REVIEW_ROLES = new Set([
  "content-owner",
  "native-linguistic",
  "source-license",
  "audio-rights",
]);
const REVIEW_DECISIONS = new Set(["approved", "changes-requested"]);

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const formatJson = (value) => `${JSON.stringify(value, null, 2)}\n`;

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

export const loadContentBundle = (requestedVersion) => {
  const registry = readJson(registryPath);
  const version = requestedVersion ?? registry.currentContentVersion;
  assertPackageId(version);
  const registryEntry = registry.packages.find((entry) => entry.contentVersion === version);
  if (!registryEntry) throw new Error(`Content version is not registered: ${version}`);
  const packageDirectory = resolvePackageDirectory(registryEntry.relativePath);
  return {
    packageDirectory,
    bundle: {
      registry,
      registryEntry,
      manifest: readJson(join(packageDirectory, "manifest.json")),
      runtimeIds: readJson(join(packageDirectory, "runtime-ids.json")),
      coverageClaims: readJson(join(packageDirectory, "coverage-claims.json")),
      reviews: readJson(join(packageDirectory, "reviews.json")),
      runtimeContentVersion: readRuntimeContentVersion(),
      runtimeAssessmentSourceText: readFileSync(
        join(repositoryRoot, "src", "data", "assessment.ts"),
        "utf8",
      ),
      runtimeSourceText: readFileSync(join(repositoryRoot, "src", "data", "curriculum.ts"), "utf8"),
      runtimeExerciseGenerationSourceText: readFileSync(
        join(repositoryRoot, "src", "lib", "exerciseGeneration.ts"),
        "utf8",
      ),
      runtimeAttemptScoringSourceText: readFileSync(
        join(repositoryRoot, "src", "server", "attemptScoring.ts"),
        "utf8",
      ),
      runtimeAuthoritativeItemBankSourceText: readFileSync(
        join(repositoryRoot, "src", "server", "authoritativeItemBank.ts"),
        "utf8",
      ),
      runtimeLessonCompletionPolicySourceText: readFileSync(
        join(repositoryRoot, "src", "server", "lessonCompletionPolicy.ts"),
        "utf8",
      ),
      runtimeAuthoritativeAssessmentItemBankSourceText: readFileSync(
        join(
          repositoryRoot,
          "src",
          "server",
          "authoritativeAssessmentItemBank.ts",
        ),
        "utf8",
      ),
      runtimeAssessmentScoringSourceText: readFileSync(
        join(repositoryRoot, "src", "server", "assessmentScoring.ts"),
        "utf8",
      ),
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
    if (name === "write") {
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

const requiredFlag = (flags, name) => {
  const value = flags.get(name);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`--${name} is required`);
  }
  return value;
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
  const { positional } = parseArguments(args);
  const { bundle } = loadContentBundle(positional[0]);
  const validation = await validateContentBundle(bundle);
  printValidation(bundle.manifest.contentVersion, validation);
  return validation.errors.length === 0 ? 0 : 1;
};

const hashCommand = async (args) => {
  const { positional } = parseArguments(args);
  const { bundle } = loadContentBundle(positional[0]);
  const hashes = {
    manifest: await sha256Json(bundle.manifest),
    runtimeIds: await sha256Json(bundle.runtimeIds),
    coverageClaims: await sha256Json(bundle.coverageClaims),
    reviews: await sha256Json(bundle.reviews),
    assessmentSource: await sha256NormalizedText(bundle.runtimeAssessmentSourceText),
    runtimeSource: await sha256NormalizedText(bundle.runtimeSourceText),
    exerciseGenerationSource: await sha256NormalizedText(
      bundle.runtimeExerciseGenerationSourceText,
    ),
    attemptScoringSource: await sha256NormalizedText(
      bundle.runtimeAttemptScoringSourceText,
    ),
    authoritativeItemBankSource: await sha256NormalizedText(
      bundle.runtimeAuthoritativeItemBankSourceText,
    ),
    lessonCompletionPolicySource: await sha256NormalizedText(
      bundle.runtimeLessonCompletionPolicySourceText,
    ),
    authoritativeAssessmentItemBankSource: await sha256NormalizedText(
      bundle.runtimeAuthoritativeAssessmentItemBankSourceText,
    ),
    assessmentScoringSource: await sha256NormalizedText(
      bundle.runtimeAssessmentScoringSourceText,
    ),
  };
  console.log(JSON.stringify({ contentVersion: bundle.manifest.contentVersion, hashes }, null, 2));
  return 0;
};

const reportCommand = async (args) => {
  const { positional } = parseArguments(args);
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
          vocabularyIds: bundle.runtimeIds.vocabularyIds.length,
          unitIds: bundle.runtimeIds.unitIds.length,
          lessons: bundle.runtimeIds.lessons.length,
          stories: bundle.runtimeIds.stories.length,
          coverageClaims: bundle.coverageClaims.coverageClaims.length,
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
  requireWrite(flags);
  const { bundle, packageDirectory } = loadContentBundle(positional[0]);
  const validation = await validateContentBundle(bundle);
  if (validation.errors.length > 0) {
    throw new Error(`Cannot review an invalid package:\n${validation.errors.join("\n")}`);
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
  if (Number.isNaN(Date.parse(reviewedAt))) throw new Error("--reviewed-at must be an ISO date");
  const evidenceRef = requiredFlag(flags, "evidence-ref");

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
      },
    ],
  };
  writeJsonAtomic(join(packageDirectory, "reviews.json"), nextReviews);
  console.log(`Recorded ${decision} review ${reviewId} for ${validation.hashes.manifest}`);
  return 0;
};

const cleanupNewPackage = (directory) => {
  ["manifest.json", "runtime-ids.json", "coverage-claims.json", "reviews.json"].forEach(
    (fileName) => {
      const path = join(directory, fileName);
      if (existsSync(path)) unlinkSync(path);
    },
  );
  if (existsSync(directory)) rmdirSync(directory);
};

const newVersionCommand = async (args) => {
  const { positional, flags } = parseArguments(args);
  requireWrite(flags);
  const newVersion = positional[0];
  assertPackageId(newVersion, "new content version");
  const fromVersion = requiredFlag(flags, "from");
  const createdAt = requiredFlag(flags, "created-at");
  if (Number.isNaN(Date.parse(createdAt))) throw new Error("--created-at must be an ISO date");
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
  const sourceValidation = await validateContentBundle(sourceBundle);
  const runtimeSourceChanged = sourceValidation.errors.includes(
    "src/data/curriculum.ts digest does not match manifest",
  );
  const assessmentSourceChanged = sourceValidation.errors.includes(
    "src/data/assessment.ts digest does not match manifest",
  );
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
  const coverageClaimsInput = flags.get("coverage-claims-file");
  const coverageClaimsSource =
    typeof coverageClaimsInput === "string"
      ? readRepositoryJsonInput(coverageClaimsInput, "--coverage-claims-file")
      : { schemaVersion: 1, coverageClaims: [] };
  const coverageClaims = { ...coverageClaimsSource, contentVersion: newVersion };
  const manifest = {
    schemaVersion: 1,
    packageId: newVersion,
    contentVersion: newVersion,
    contentSchemaVersion: Math.max(
      sourceBundle.manifest.contentSchemaVersion,
      2,
    ),
    audience,
    lifecycle: "candidate",
    createdAt,
    createdFromManifestSha256: sourceValidation.hashes.manifest,
    artifacts: {
      "coverage-claims.json": await sha256Json(coverageClaims),
      "runtime-ids.json": await sha256Json(runtimeIds),
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
    schemaVersion: 1,
    contentVersion: newVersion,
    packageManifestSha256: manifestHash,
    reviews: [],
  };
  const nextRegistry = {
    ...sourceBundle.registry,
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
    coverageClaims,
    reviews,
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
    writeFileSync(
      join(temporaryDirectory, "coverage-claims.json"),
      formatJson(coverageClaims),
      "utf8",
    );
    writeFileSync(join(temporaryDirectory, "reviews.json"), formatJson(reviews), "utf8");
    renameSync(temporaryDirectory, targetDirectory);
  } catch (error) {
    cleanupNewPackage(temporaryDirectory);
    throw error;
  }
  writeJsonAtomic(registryPath, nextRegistry);
  console.log(
    `Created candidate ${newVersion} from ${fromVersion}; approvals and coverage claims were intentionally cleared`,
  );
  return 0;
};

const promoteCommand = async (args) => {
  const { positional, flags } = parseArguments(args);
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
  if (Number.isNaN(Date.parse(promotedAt))) throw new Error("--promoted-at must be an ISO date");

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
