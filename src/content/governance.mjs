const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;
const SAFE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const RELEASE_STATES = new Set(["draft", "review", "beta", "published", "retired"]);
const REVIEW_ROLES = new Set([
  "content-owner",
  "native-linguistic",
  "source-license",
  "audio-rights",
]);
const REVIEW_DECISIONS = new Set(["approved", "changes-requested"]);
const CONTENT_SCHEMA_V2_POLICY_ARTIFACTS = [
  "src/server/authoritativeAssessmentItemBank.ts",
  "src/server/assessmentScoring.ts",
];

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const isValidDate = (value) =>
  isNonEmptyString(value) && !Number.isNaN(Date.parse(value));

const pushDuplicateErrors = (values, label, errors) => {
  const seen = new Set();
  values.forEach((value) => {
    if (seen.has(value)) errors.push(`Duplicate ${label}: ${value}`);
    seen.add(value);
  });
};

const validateStringArray = (value, label, errors) => {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`);
    return [];
  }
  const strings = value.filter(isNonEmptyString);
  if (strings.length !== value.length) errors.push(`${label} must contain non-empty strings`);
  pushDuplicateErrors(strings, label, errors);
  return strings;
};

export const canonicalJson = (value) => {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Canonical JSON cannot contain non-finite numbers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  throw new TypeError(`Unsupported canonical JSON value: ${typeof value}`);
};

export const sha256Json = async (value) => {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto SHA-256 is unavailable");
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
};

export const sha256NormalizedText = async (value) => {
  if (typeof value !== "string") throw new TypeError("SHA-256 text input must be a string");
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto SHA-256 is unavailable");
  const bytes = new TextEncoder().encode(value.replace(/\r\n?/g, "\n"));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
};

const validateRegistry = (registry, registryEntry, errors) => {
  if (!isRecord(registry) || registry.schemaVersion !== 1) {
    errors.push("registry.schemaVersion must be 1");
    return;
  }
  if (!isNonEmptyString(registry.currentContentVersion)) {
    errors.push("registry.currentContentVersion is required");
  }
  if (!Array.isArray(registry.packages)) {
    errors.push("registry.packages must be an array");
    return;
  }

  const versions = registry.packages.map((entry) => entry?.contentVersion).filter(isNonEmptyString);
  const packageIds = registry.packages.map((entry) => entry?.packageId).filter(isNonEmptyString);
  pushDuplicateErrors(versions, "registry contentVersion", errors);
  pushDuplicateErrors(packageIds, "registry packageId", errors);

  if (!isRecord(registryEntry) || !registry.packages.includes(registryEntry)) {
    errors.push("Selected registry entry is not present in registry.packages");
    return;
  }
  if (!SAFE_ID_PATTERN.test(registryEntry.packageId ?? "")) {
    errors.push("registryEntry.packageId is not a safe immutable package id");
  }
  if (registryEntry.contentVersion !== registryEntry.packageId) {
    errors.push("registryEntry.contentVersion must equal packageId");
  }
  if (registryEntry.relativePath !== `packages/${registryEntry.packageId}`) {
    errors.push("registryEntry.relativePath must be the package's direct registry path");
  }
  if (!DIGEST_PATTERN.test(registryEntry.manifestSha256 ?? "")) {
    errors.push("registryEntry.manifestSha256 must be a SHA-256 digest");
  }
  if (!["closed-alpha", "public"].includes(registryEntry.audience)) {
    errors.push("registryEntry.audience is invalid");
  }
  if (!["candidate", "published", "retired"].includes(registryEntry.lifecycle)) {
    errors.push("registryEntry.lifecycle is invalid");
  }
  if (typeof registryEntry.closedAlphaEligible !== "boolean") {
    errors.push("registryEntry.closedAlphaEligible must be boolean");
  }
  if (typeof registryEntry.productionEligible !== "boolean") {
    errors.push("registryEntry.productionEligible must be boolean");
  }
  if (
    (registryEntry.closedAlphaEligible || registryEntry.productionEligible)
    && registryEntry.lifecycle !== "published"
  ) {
    errors.push("Only a published registry entry may be release eligible");
  }
  if (registryEntry.productionEligible && !registryEntry.closedAlphaEligible) {
    errors.push("A production-eligible registry entry must also be closedAlphaEligible");
  }
  if (registryEntry.productionEligible && registryEntry.audience !== "public") {
    errors.push("Only a public package may be productionEligible");
  }
  const releaseEligible = registryEntry.closedAlphaEligible || registryEntry.productionEligible;
  if (releaseEligible && !isRecord(registryEntry.promotion)) {
    errors.push("A release-eligible registry entry requires promotion provenance");
  }
  if (releaseEligible && isRecord(registryEntry.promotion)) {
    const expectedChannel = registryEntry.productionEligible ? "production" : "closed-alpha";
    if (registryEntry.promotion.channel !== expectedChannel) {
      errors.push(`Promotion provenance channel must be ${expectedChannel}`);
    }
    if (!isNonEmptyString(registryEntry.promotion.actorId)) {
      errors.push("Promotion provenance requires actorId");
    }
    if (!isValidDate(registryEntry.promotion.promotedAt)) {
      errors.push("Promotion provenance requires a valid promotedAt date");
    }
    if (registryEntry.promotion.packageManifestSha256 !== registryEntry.manifestSha256) {
      errors.push("Promotion provenance must bind the registered manifest digest");
    }
    if (!DIGEST_PATTERN.test(registryEntry.promotion.reviewEnvelopeSha256 ?? "")) {
      errors.push("Promotion provenance must bind a review envelope digest");
    }
  }
  if (!releaseEligible && registryEntry.promotion !== null) {
    errors.push("A release-ineligible registry entry cannot retain promotion provenance");
  }
};

const validateManifest = (manifest, errors) => {
  if (!isRecord(manifest) || manifest.schemaVersion !== 1) {
    errors.push("manifest.schemaVersion must be 1");
    return;
  }
  if (!SAFE_ID_PATTERN.test(manifest.packageId ?? "")) {
    errors.push("manifest.packageId is not a safe immutable package id");
  }
  if (manifest.contentVersion !== manifest.packageId) {
    errors.push("manifest.contentVersion must equal packageId");
  }
  if (!Number.isInteger(manifest.contentSchemaVersion) || manifest.contentSchemaVersion < 1) {
    errors.push("manifest.contentSchemaVersion must be a positive integer");
  }
  if (!["closed-alpha", "public"].includes(manifest.audience)) {
    errors.push("manifest.audience is invalid");
  }
  if (!["candidate", "published", "retired"].includes(manifest.lifecycle)) {
    errors.push("manifest.lifecycle is invalid");
  }
  if (!isValidDate(manifest.createdAt)) errors.push("manifest.createdAt must be an ISO date");
  if (
    manifest.createdFromManifestSha256 !== null &&
    !DIGEST_PATTERN.test(manifest.createdFromManifestSha256 ?? "")
  ) {
    errors.push("manifest.createdFromManifestSha256 must be null or a SHA-256 digest");
  }
  if (!isRecord(manifest.artifacts)) {
    errors.push("manifest.artifacts is required");
  } else {
    const requiredArtifacts = [
      "coverage-claims.json",
      "runtime-ids.json",
      "src/data/assessment.ts",
      "src/data/curriculum.ts",
      "src/lib/exerciseGeneration.ts",
      "src/server/attemptScoring.ts",
      "src/server/authoritativeItemBank.ts",
      "src/server/lessonCompletionPolicy.ts",
      ...(manifest.contentSchemaVersion >= 2
        ? CONTENT_SCHEMA_V2_POLICY_ARTIFACTS
        : []),
    ];
    requiredArtifacts.forEach((name) => {
      if (!DIGEST_PATTERN.test(manifest.artifacts[name] ?? "")) {
        errors.push(`manifest.artifacts.${name} must be a SHA-256 digest`);
      }
    });
  }
  if (!isRecord(manifest.governance)) {
    errors.push("manifest.governance is required");
    return;
  }
  if (manifest.governance.nativeLinguisticReviewRequired !== true) {
    errors.push("nativeLinguisticReviewRequired must remain true");
  }
  if (typeof manifest.governance.includesAudio !== "boolean") {
    errors.push("manifest.governance.includesAudio must be boolean");
  }
  if (!manifest.governance.includesAudio && manifest.governance.audioRights !== null) {
    errors.push("audioRights must be null when the package has no audio artifacts");
  }
};

const validateRuntimeIds = (runtimeIds, errors) => {
  if (!isRecord(runtimeIds) || runtimeIds.schemaVersion !== 1) {
    errors.push("runtime-ids.schemaVersion must be 1");
    return;
  }
  const vocabularyIds = validateStringArray(
    runtimeIds.vocabularyIds,
    "runtime vocabulary id",
    errors,
  );
  const unitIds = validateStringArray(runtimeIds.unitIds, "runtime unit id", errors);
  const vocabularySet = new Set(vocabularyIds);
  const unitSet = new Set(unitIds);

  if (!Array.isArray(runtimeIds.lessons)) {
    errors.push("runtime-ids.lessons must be an array");
    return;
  }
  const lessons = runtimeIds.lessons.filter(isRecord);
  if (lessons.length !== runtimeIds.lessons.length) {
    errors.push("runtime-ids.lessons must contain objects");
  }
  const lessonIds = lessons.map((lesson) => lesson.id).filter(isNonEmptyString);
  if (lessonIds.length !== lessons.length) errors.push("Every runtime lesson requires an id");
  pushDuplicateErrors(lessonIds, "runtime lesson id", errors);
  const lessonSet = new Set(lessonIds);

  lessons.forEach((lesson) => {
    if (!unitSet.has(lesson.unitId)) {
      errors.push(`${lesson.id}: unknown unitId ${String(lesson.unitId)}`);
    }
    if (!RELEASE_STATES.has(lesson.releaseState)) {
      errors.push(`${lesson.id}: invalid releaseState ${String(lesson.releaseState)}`);
    }
    const prerequisiteIds = validateStringArray(
      lesson.prerequisiteIds,
      `${lesson.id} prerequisite id`,
      errors,
    );
    prerequisiteIds.forEach((id) => {
      if (!lessonSet.has(id)) errors.push(`${lesson.id}: unknown prerequisite ${id}`);
      if (id === lesson.id) errors.push(`${lesson.id}: cannot depend on itself`);
    });
    validateStringArray(lesson.wordIds, `${lesson.id} word id`, errors).forEach((id) => {
      if (!vocabularySet.has(id)) errors.push(`${lesson.id}: unknown vocabulary id ${id}`);
    });
  });

  const graph = new Map(
    lessons.map((lesson) => [
      lesson.id,
      Array.isArray(lesson.prerequisiteIds) ? lesson.prerequisiteIds : [],
    ]),
  );
  const visiting = new Set();
  const visited = new Set();
  const visit = (lessonId) => {
    if (visiting.has(lessonId)) {
      errors.push(`Prerequisite cycle detected at ${lessonId}`);
      return;
    }
    if (visited.has(lessonId)) return;
    visiting.add(lessonId);
    (graph.get(lessonId) ?? []).forEach((dependencyId) => {
      if (graph.has(dependencyId)) visit(dependencyId);
    });
    visiting.delete(lessonId);
    visited.add(lessonId);
  };
  lessonIds.forEach(visit);

  if (!Array.isArray(runtimeIds.stories)) {
    errors.push("runtime-ids.stories must be an array");
    return;
  }
  const stories = runtimeIds.stories.filter(isRecord);
  if (stories.length !== runtimeIds.stories.length) {
    errors.push("runtime-ids.stories must contain objects");
  }
  const storyIds = stories.map((story) => story.id).filter(isNonEmptyString);
  if (storyIds.length !== stories.length) errors.push("Every runtime story requires an id");
  pushDuplicateErrors(storyIds, "runtime story id", errors);
  stories.forEach((story) => {
    if (!RELEASE_STATES.has(story.releaseState)) {
      errors.push(`${story.id}: invalid releaseState ${String(story.releaseState)}`);
    }
    validateStringArray(story.wordIds, `${story.id} word id`, errors).forEach((id) => {
      if (!vocabularySet.has(id)) errors.push(`${story.id}: unknown vocabulary id ${id}`);
    });
  });
};

const validateCoverageClaims = (coverageClaims, errors) => {
  if (!isRecord(coverageClaims) || coverageClaims.schemaVersion !== 1) {
    errors.push("coverage-claims.schemaVersion must be 1");
    return;
  }
  if (!Array.isArray(coverageClaims.coverageClaims)) {
    errors.push("coverageClaims must be an array");
    return;
  }
  const claimIds = [];
  coverageClaims.coverageClaims.forEach((claim, index) => {
    if (!isRecord(claim)) {
      errors.push(`coverageClaims[${index}] must be an object`);
      return;
    }
    ["claimId", "framework", "level", "evidenceRef"].forEach((field) => {
      if (!isNonEmptyString(claim[field])) errors.push(`coverageClaims[${index}].${field} is required`);
    });
    if (isNonEmptyString(claim.claimId)) claimIds.push(claim.claimId);
  });
  pushDuplicateErrors(claimIds, "coverage claim id", errors);
};

const validateReviews = (reviews, errors) => {
  if (!isRecord(reviews) || reviews.schemaVersion !== 1) {
    errors.push("reviews.schemaVersion must be 1");
    return;
  }
  if (!DIGEST_PATTERN.test(reviews.packageManifestSha256 ?? "")) {
    errors.push("reviews.packageManifestSha256 must be a SHA-256 digest");
  }
  if (!Array.isArray(reviews.reviews)) {
    errors.push("reviews.reviews must be an array");
    return;
  }
  const reviewIds = [];
  reviews.reviews.forEach((review, index) => {
    if (!isRecord(review)) {
      errors.push(`reviews[${index}] must be an object`);
      return;
    }
    if (!isNonEmptyString(review.reviewId)) errors.push(`reviews[${index}].reviewId is required`);
    else reviewIds.push(review.reviewId);
    if (!REVIEW_ROLES.has(review.role)) errors.push(`reviews[${index}].role is invalid`);
    if (!REVIEW_DECISIONS.has(review.decision)) {
      errors.push(`reviews[${index}].decision is invalid`);
    }
    if (!isNonEmptyString(review.reviewerId)) {
      errors.push(`reviews[${index}].reviewerId is required`);
    }
    if (!isValidDate(review.reviewedAt)) errors.push(`reviews[${index}].reviewedAt is invalid`);
    if (!isNonEmptyString(review.evidenceRef)) {
      errors.push(`reviews[${index}].evidenceRef is required`);
    }
    if (!DIGEST_PATTERN.test(review.packageManifestSha256 ?? "")) {
      errors.push(`reviews[${index}].packageManifestSha256 is invalid`);
    }
  });
  pushDuplicateErrors(reviewIds, "review id", errors);
};

export const validateContentBundle = async (bundle) => {
  const errors = [];
  const warnings = [];
  const manifestHash = await sha256Json(bundle.manifest);
  const runtimeIdsHash = await sha256Json(bundle.runtimeIds);
  const coverageClaimsHash = await sha256Json(bundle.coverageClaims);
  const reviewsHash = await sha256Json(bundle.reviews);
  const assessmentSourceHash =
    typeof bundle.runtimeAssessmentSourceText === "string"
      ? await sha256NormalizedText(bundle.runtimeAssessmentSourceText)
      : null;
  const runtimeSourceHash =
    typeof bundle.runtimeSourceText === "string"
      ? await sha256NormalizedText(bundle.runtimeSourceText)
      : null;
  const exerciseGenerationSourceHash =
    typeof bundle.runtimeExerciseGenerationSourceText === "string"
      ? await sha256NormalizedText(bundle.runtimeExerciseGenerationSourceText)
      : null;
  const attemptScoringSourceHash =
    typeof bundle.runtimeAttemptScoringSourceText === "string"
      ? await sha256NormalizedText(bundle.runtimeAttemptScoringSourceText)
      : null;
  const authoritativeItemBankSourceHash =
    typeof bundle.runtimeAuthoritativeItemBankSourceText === "string"
      ? await sha256NormalizedText(bundle.runtimeAuthoritativeItemBankSourceText)
      : null;
  const lessonCompletionPolicySourceHash =
    typeof bundle.runtimeLessonCompletionPolicySourceText === "string"
      ? await sha256NormalizedText(bundle.runtimeLessonCompletionPolicySourceText)
      : null;
  const authoritativeAssessmentItemBankSourceHash =
    typeof bundle.runtimeAuthoritativeAssessmentItemBankSourceText === "string"
      ? await sha256NormalizedText(
        bundle.runtimeAuthoritativeAssessmentItemBankSourceText,
      )
      : null;
  const assessmentScoringSourceHash =
    typeof bundle.runtimeAssessmentScoringSourceText === "string"
      ? await sha256NormalizedText(bundle.runtimeAssessmentScoringSourceText)
      : null;

  validateRegistry(bundle.registry, bundle.registryEntry, errors);
  validateManifest(bundle.manifest, errors);
  validateRuntimeIds(bundle.runtimeIds, errors);
  validateCoverageClaims(bundle.coverageClaims, errors);
  validateReviews(bundle.reviews, errors);

  const version = bundle.manifest?.contentVersion;
  [
    ["registry entry", bundle.registryEntry?.contentVersion],
    ["runtime ids", bundle.runtimeIds?.contentVersion],
    ["coverage claims", bundle.coverageClaims?.contentVersion],
    ["reviews", bundle.reviews?.contentVersion],
  ].forEach(([label, artifactVersion]) => {
    if (artifactVersion !== version) errors.push(`${label} contentVersion does not match manifest`);
  });
  if (bundle.registryEntry?.packageId !== bundle.manifest?.packageId) {
    errors.push("Registry packageId does not match manifest");
  }
  if (bundle.registryEntry?.manifestSha256 !== manifestHash) {
    errors.push("Registry manifest digest does not match immutable manifest bytes");
  }
  if (bundle.manifest?.artifacts?.["runtime-ids.json"] !== runtimeIdsHash) {
    errors.push("runtime-ids.json digest does not match manifest");
  }
  if (bundle.manifest?.artifacts?.["coverage-claims.json"] !== coverageClaimsHash) {
    errors.push("coverage-claims.json digest does not match manifest");
  }
  if (assessmentSourceHash === null) {
    errors.push("Checked-in src/data/assessment.ts source is unavailable");
  } else if (bundle.manifest?.artifacts?.["src/data/assessment.ts"] !== assessmentSourceHash) {
    errors.push("src/data/assessment.ts digest does not match manifest");
  }
  if (runtimeSourceHash === null) {
    errors.push("Checked-in src/data/curriculum.ts source is unavailable");
  } else if (bundle.manifest?.artifacts?.["src/data/curriculum.ts"] !== runtimeSourceHash) {
    errors.push("src/data/curriculum.ts digest does not match manifest");
  }
  const policySources = [
    [
      "src/lib/exerciseGeneration.ts",
      exerciseGenerationSourceHash,
    ],
    ["src/server/attemptScoring.ts", attemptScoringSourceHash],
    ["src/server/authoritativeItemBank.ts", authoritativeItemBankSourceHash],
    ["src/server/lessonCompletionPolicy.ts", lessonCompletionPolicySourceHash],
    ...(
      bundle.manifest?.contentSchemaVersion >= 2
        ? [
            [
              "src/server/authoritativeAssessmentItemBank.ts",
              authoritativeAssessmentItemBankSourceHash,
            ],
            ["src/server/assessmentScoring.ts", assessmentScoringSourceHash],
          ]
        : []
    ),
  ];
  policySources.forEach(([name, sourceHash]) => {
    if (sourceHash === null) {
      errors.push(`Checked-in ${name} source is unavailable`);
    } else if (bundle.manifest?.artifacts?.[name] !== sourceHash) {
      errors.push(`${name} digest does not match manifest`);
    }
  });
  if (bundle.reviews?.packageManifestSha256 !== manifestHash) {
    warnings.push("Review envelope is stale for the current manifest digest");
  }
  if (
    bundle.registryEntry?.promotion !== null
    && bundle.registryEntry?.promotion?.reviewEnvelopeSha256 !== reviewsHash
  ) {
    errors.push("Promotion provenance does not bind the current review envelope");
  }
  (bundle.reviews?.reviews ?? []).forEach((review) => {
    if (review.packageManifestSha256 !== manifestHash) {
      warnings.push(`Review ${review.reviewId} is stale for the current manifest digest`);
    }
  });
  if (
    bundle.registry?.currentContentVersion === version &&
    bundle.runtimeContentVersion !== null &&
    bundle.runtimeContentVersion !== version
  ) {
    errors.push("Current registry package is not bound to the checked-in runtime contentVersion");
  }
  if (bundle.registryEntry?.audience !== bundle.manifest?.audience) {
    errors.push("Registry audience does not match manifest");
  }

  return {
    errors,
    warnings,
    hashes: {
      manifest: manifestHash,
      runtimeIds: runtimeIdsHash,
      coverageClaims: coverageClaimsHash,
      reviews: reviewsHash,
      assessmentSource: assessmentSourceHash,
      runtimeSource: runtimeSourceHash,
      exerciseGenerationSource: exerciseGenerationSourceHash,
      attemptScoringSource: attemptScoringSourceHash,
      authoritativeItemBankSource: authoritativeItemBankSourceHash,
      lessonCompletionPolicySource: lessonCompletionPolicySourceHash,
      authoritativeAssessmentItemBankSource:
        authoritativeAssessmentItemBankSourceHash,
      assessmentScoringSource: assessmentScoringSourceHash,
    },
  };
};

const latestReviewByRole = (reviews, manifestHash) => {
  const latest = new Map();
  reviews
    .filter((review) => review.packageManifestSha256 === manifestHash)
    .forEach((review) => {
      const previous = latest.get(review.role);
      if (!previous || Date.parse(review.reviewedAt) >= Date.parse(previous.reviewedAt)) {
        latest.set(review.role, review);
      }
    });
  return latest;
};

const assessBaseReleaseEligibility = (bundle, validation, channel) => {
  const blockers = [...validation.errors];
  const warnings = [...validation.warnings];
  const missingMetadata = [];
  const manifestHash = validation.hashes.manifest;
  const governance = bundle.manifest.governance;

  if (!governance.contentOwner?.id || !governance.contentOwner?.evidenceRef) {
    missingMetadata.push("contentOwner");
  }
  if (!governance.sourceLicense?.licenseId || !governance.sourceLicense?.evidenceRef) {
    missingMetadata.push("sourceLicense");
  }
  if (
    governance.includesAudio &&
    (!governance.audioRights?.ownerId ||
      !governance.audioRights?.licenseId ||
      !governance.audioRights?.evidenceRef)
  ) {
    missingMetadata.push("audioRights");
  }
  missingMetadata.forEach((field) => blockers.push(`Missing governance metadata: ${field}`));

  if (bundle.registryEntry.lifecycle === "retired") {
    blockers.push("Retired packages cannot be promoted");
  }
  if (bundle.runtimeContentVersion !== bundle.manifest.contentVersion) {
    blockers.push("Package is not bound to the checked-in runtime contentVersion");
  }
  if (bundle.reviews.packageManifestSha256 !== manifestHash) {
    blockers.push("Review envelope does not bind the current manifest digest");
  }

  const staleReviewIds = bundle.reviews.reviews
    .filter((review) => review.packageManifestSha256 !== manifestHash)
    .map((review) => review.reviewId);
  const latestReviews = latestReviewByRole(bundle.reviews.reviews, manifestHash);
  const requiredRoles = ["content-owner", "native-linguistic", "source-license"];
  if (governance.includesAudio) requiredRoles.push("audio-rights");
  requiredRoles.forEach((role) => {
    const review = latestReviews.get(role);
    if (!review) blockers.push(`Missing exact-hash approval: ${role}`);
    else if (review.decision !== "approved") blockers.push(`Latest ${role} review is not approved`);
  });

  const linguisticReview = latestReviews.get("native-linguistic");
  if (
    linguisticReview?.decision === "approved" &&
    linguisticReview.reviewerId === governance.contentOwner?.id
  ) {
    blockers.push("Native linguistic reviewer must be independent from the content owner");
  }
  if (bundle.coverageClaims.coverageClaims.length === 0) {
    warnings.push("No framework, HSK, A0, or goal coverage claim is declared");
  }
  return {
    channel,
    eligible: blockers.length === 0,
    blockers: [...new Set(blockers)],
    warnings: [...new Set(warnings)],
    missingMetadata,
    staleReviewIds,
  };
};

const withAdditionalBlockers = (assessment, blockers, warnings = []) => ({
  ...assessment,
  eligible: assessment.blockers.length + blockers.length === 0,
  blockers: [...new Set([...assessment.blockers, ...blockers])],
  warnings: [...new Set([...assessment.warnings, ...warnings])],
});

const normalizedCoverageClaims = (bundle) => bundle.coverageClaims.coverageClaims.map(
  (claim) => ({
    framework: claim.framework.trim().toLocaleLowerCase("en-US"),
    level: claim.level.trim().toLocaleUpperCase("en-US"),
  }),
);

export const assessClosedAlphaEligibility = (bundle, validation) => {
  const base = assessBaseReleaseEligibility(bundle, validation, "closed-alpha");
  const blockers = [];
  const claims = normalizedCoverageClaims(bundle);
  const releasedLexemeIds = new Set([
    ...bundle.runtimeIds.lessons
      .filter((lesson) => lesson.releaseState === "beta" || lesson.releaseState === "published")
      .flatMap((lesson) => lesson.wordIds),
    ...bundle.runtimeIds.stories
      .filter((story) => story.releaseState === "beta" || story.releaseState === "published")
      .flatMap((story) => story.wordIds),
  ]);
  if (releasedLexemeIds.size < 300) {
    blockers.push("Closed alpha requires at least 300 exact-hash reviewed lexemes");
  }
  if (!claims.some((claim) => claim.level === "A0")) {
    blockers.push("Closed alpha requires an evidence-backed complete A0 coverage claim");
  }
  return withAdditionalBlockers(base, blockers);
};

export const assessPublicationEligibility = (bundle, validation) => {
  const base = assessBaseReleaseEligibility(bundle, validation, "production");
  const blockers = [];
  const claims = normalizedCoverageClaims(bundle);
  if (bundle.manifest.audience !== "public") {
    blockers.push("Package audience is closed-alpha, not public");
  }
  for (const level of ["1", "2"]) {
    if (!claims.some((claim) => claim.framework === "hsk" && claim.level === level)) {
      blockers.push(`Public beta requires an evidence-backed HSK ${level} coverage claim`);
    }
  }
  const releasedStoryCount = bundle.runtimeIds.stories.filter(
    (story) => story.releaseState === "beta" || story.releaseState === "published",
  ).length;
  if (releasedStoryCount < 40) {
    blockers.push("Public beta requires at least 40 versioned graded texts");
  }
  if (!bundle.manifest.governance.includesAudio) {
    blockers.push("Public beta requires licensed native audio for released core content");
  }
  return withAdditionalBlockers(base, blockers);
};
