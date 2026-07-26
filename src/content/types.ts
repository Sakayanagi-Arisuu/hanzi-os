export type Sha256Digest = `sha256:${string}`;

export type ContentPackageAudience = "closed-alpha" | "public";
export type ContentPackageLifecycle = "candidate" | "published" | "retired";
export type ContentReleaseChannel = "closed-alpha" | "production";
export type ContentReleaseState = "draft" | "review" | "beta" | "published" | "retired";

export type ContentOwner = {
  id: string;
  evidenceRef: string;
};

export type SourceLicense = {
  licenseId: string;
  evidenceRef: string;
};

export type AudioRights = {
  ownerId: string;
  licenseId: string;
  evidenceRef: string;
};

export type ContentPackageManifest = {
  schemaVersion: 1;
  packageId: string;
  contentVersion: string;
  contentSchemaVersion: number;
  audience: ContentPackageAudience;
  lifecycle: ContentPackageLifecycle;
  createdAt: string;
  createdFromManifestSha256: Sha256Digest | null;
  artifacts: {
    "coverage-claims.json": Sha256Digest;
    "runtime-ids.json": Sha256Digest;
    "src/data/assessment.ts": Sha256Digest;
    "src/data/curriculum.ts": Sha256Digest;
    "src/lib/exerciseGeneration.ts": Sha256Digest;
    "src/server/attemptScoring.ts": Sha256Digest;
    "src/server/authoritativeItemBank.ts": Sha256Digest;
    "src/server/lessonCompletionPolicy.ts": Sha256Digest;
    /** Required for contentSchemaVersion >= 2. */
    "src/server/authoritativeAssessmentItemBank.ts"?: Sha256Digest;
    /** Required for contentSchemaVersion >= 2. */
    "src/server/assessmentScoring.ts"?: Sha256Digest;
  };
  governance: {
    contentOwner: ContentOwner | null;
    sourceLicense: SourceLicense | null;
    nativeLinguisticReviewRequired: true;
    includesAudio: boolean;
    audioRights: AudioRights | null;
  };
};

export type RuntimeLessonReference = {
  id: string;
  unitId: string;
  prerequisiteIds: string[];
  wordIds: string[];
  releaseState: ContentReleaseState;
};

export type RuntimeStoryReference = {
  id: string;
  wordIds: string[];
  releaseState: ContentReleaseState;
};

export type RuntimeIdArtifact = {
  schemaVersion: 1;
  contentVersion: string;
  vocabularyIds: string[];
  unitIds: string[];
  lessons: RuntimeLessonReference[];
  stories: RuntimeStoryReference[];
};

export type CoverageClaim = {
  claimId: string;
  framework: string;
  level: string;
  evidenceRef: string;
};

export type CoverageClaimsArtifact = {
  schemaVersion: 1;
  contentVersion: string;
  coverageClaims: CoverageClaim[];
};

export type ReviewRole =
  | "content-owner"
  | "native-linguistic"
  | "source-license"
  | "audio-rights";

export type ContentReview = {
  reviewId: string;
  role: ReviewRole;
  decision: "approved" | "changes-requested";
  reviewerId: string;
  reviewedAt: string;
  evidenceRef: string;
  packageManifestSha256: Sha256Digest;
};

export type ContentReviewArtifact = {
  schemaVersion: 1;
  contentVersion: string;
  packageManifestSha256: Sha256Digest;
  reviews: ContentReview[];
};

export type ContentRegistryEntry = {
  packageId: string;
  contentVersion: string;
  relativePath: string;
  manifestSha256: Sha256Digest;
  audience: ContentPackageAudience;
  lifecycle: ContentPackageLifecycle;
  closedAlphaEligible: boolean;
  productionEligible: boolean;
  promotion: {
    channel: ContentReleaseChannel;
    actorId: string;
    promotedAt: string;
    packageManifestSha256: Sha256Digest;
    reviewEnvelopeSha256: Sha256Digest;
  } | null;
};

export type ContentRegistry = {
  schemaVersion: 1;
  currentContentVersion: string;
  packages: ContentRegistryEntry[];
};

export type ContentPackageBundle = {
  registry: ContentRegistry;
  registryEntry: ContentRegistryEntry;
  manifest: ContentPackageManifest;
  runtimeIds: RuntimeIdArtifact;
  coverageClaims: CoverageClaimsArtifact;
  reviews: ContentReviewArtifact;
  runtimeContentVersion: string | null;
  runtimeAssessmentSourceText: string | null;
  runtimeSourceText: string | null;
  runtimeExerciseGenerationSourceText: string | null;
  runtimeAttemptScoringSourceText: string | null;
  runtimeAuthoritativeItemBankSourceText: string | null;
  runtimeLessonCompletionPolicySourceText: string | null;
  runtimeAuthoritativeAssessmentItemBankSourceText: string | null;
  runtimeAssessmentScoringSourceText: string | null;
};

export type ContentValidationResult = {
  errors: string[];
  warnings: string[];
  hashes: {
    manifest: Sha256Digest;
    runtimeIds: Sha256Digest;
    coverageClaims: Sha256Digest;
    reviews: Sha256Digest;
    assessmentSource: Sha256Digest | null;
    runtimeSource: Sha256Digest | null;
    exerciseGenerationSource: Sha256Digest | null;
    attemptScoringSource: Sha256Digest | null;
    authoritativeItemBankSource: Sha256Digest | null;
    lessonCompletionPolicySource: Sha256Digest | null;
    authoritativeAssessmentItemBankSource: Sha256Digest | null;
    assessmentScoringSource: Sha256Digest | null;
  };
};

export type PublicationAssessment = {
  channel: ContentReleaseChannel;
  eligible: boolean;
  blockers: string[];
  warnings: string[];
  missingMetadata: string[];
  staleReviewIds: string[];
};
