import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sha256Json } from "../src/content/governance.mjs";
import {
  collectDistArtifacts,
  computeBuildSha256,
  serializeCanonicalJson,
  sha256Bytes,
} from "./generate-release-evidence.mjs";
import {
  BUILD_PROVENANCE_FILE,
  BUILD_PROVENANCE_SCHEMA_VERSION,
  validateAttestableBuildProvenance,
} from "./build-provenance.mjs";

const READINESS_SCHEMA_VERSION = 2;
const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SAFE_CONTENT_VERSION = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const SHA256_DIGEST = /^sha256:[a-f0-9]{64}$/;
const RAW_SHA256_DIGEST = /^[a-f0-9]{64}$/;
const SOURCE_REVISION = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const BLOCKER_CODE = /^[A-Z][A-Z0-9_]{2,79}$/;
const TECHNICAL_TEST_REFERENCE =
  /(?:^|[-_/])(automated|golden|integration|technical|unit)[-_ ]?tests?(?:[-_.?/]|$)/i;

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= 500;

const isIdentifier = (value) =>
  typeof value === "string" &&
  /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{1,254}$/.test(value);

const isCanonicalIsoDate = (value) => {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return !Number.isNaN(timestamp) && new Date(timestamp).toISOString() === value;
};

const parseProductionHttpsUrl = (value) => {
  if (typeof value !== "string" || value.length > 2_048) return null;
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      !hostname ||
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".invalid") ||
      hostname.endsWith(".test") ||
      hostname.endsWith(".example") ||
      hostname === "example.com" ||
      hostname.endsWith(".example.com")
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const isExternalEvidenceUrl = (value) => {
  const parsed = parseProductionHttpsUrl(value);
  if (parsed === null) return false;
  let decodedPathname;
  try {
    decodedPathname = decodeURIComponent(parsed.pathname);
  } catch {
    return false;
  }
  return !TECHNICAL_TEST_REFERENCE.test(decodedPathname);
};

const exact = (expected) => ({
  description: JSON.stringify(expected),
  test: (value) => value === expected,
});

const predicate = (description, test) => ({ description, test });

const COMMON_EVIDENCE_VALIDATORS = {
  contentVersion: predicate("the readiness manifest contentVersion", isNonEmptyString),
  sourceRevision: predicate(
    "the exact lowercase Git source revision in local release evidence",
    (value) => SOURCE_REVISION.test(value ?? ""),
  ),
  releaseEvidenceManifestSha256: predicate(
    "the exact local release-evidence manifest sha256 digest",
    (value) => SHA256_DIGEST.test(value ?? ""),
  ),
  releaseBuildSha256: predicate(
    "the exact local release build sha256 digest",
    (value) => SHA256_DIGEST.test(value ?? ""),
  ),
};

const GATE_DEFINITIONS = {
  nativeLinguisticReview: {
    label: "Native linguistic review",
    evidenceDateKey: "reviewedAt",
    validators: {
      type: exact("native-linguistic-review"),
      ...COMMON_EVIDENCE_VALIDATORS,
      artifactUrl: predicate(
        "a production HTTPS human-review artifact URL (not a technical-test reference)",
        isExternalEvidenceUrl,
      ),
      artifactSha256: predicate("a sha256 digest", (value) => SHA256_DIGEST.test(value ?? "")),
      reviewerId: predicate("a stable reviewer identifier", isIdentifier),
      nativeMandarinQualified: exact(true),
      humanReviewCompleted: exact(true),
      reviewedAt: predicate("a canonical ISO timestamp", isCanonicalIsoDate),
      decision: exact("approved"),
    },
  },
  contentGovernanceReleaseActivation: {
    label: "Content governance and production activation",
    evidenceDateKey: "activatedAt",
    validators: {
      type: exact("content-governance-release-activation"),
      ...COMMON_EVIDENCE_VALIDATORS,
      packageId: predicate("the readiness manifest contentVersion", isNonEmptyString),
      packageManifestSha256: predicate(
        "a sha256 package-manifest digest",
        (value) => SHA256_DIGEST.test(value ?? ""),
      ),
      reviewEnvelopeSha256: predicate(
        "a sha256 review-envelope digest",
        (value) => SHA256_DIGEST.test(value ?? ""),
      ),
      promotionActorId: predicate("a stable promotion actor identifier", isIdentifier),
      channel: exact("production"),
      lifecycle: exact("published"),
      activatedAt: predicate("a canonical ISO timestamp", isCanonicalIsoDate),
      promotionRecordUrl: predicate(
        "a production HTTPS promotion-record URL (not a technical-test reference)",
        isExternalEvidenceUrl,
      ),
      promotionRecordSha256: predicate(
        "a sha256 promotion-record digest",
        (value) => SHA256_DIGEST.test(value ?? ""),
      ),
    },
  },
  assessmentPilotCalibration: {
    label: "Assessment pilot and calibration",
    evidenceDateKey: "pilotCompletedAt",
    validators: {
      type: exact("assessment-pilot-calibration-report"),
      ...COMMON_EVIDENCE_VALIDATORS,
      pilotId: predicate("a stable pilot identifier", isIdentifier),
      pilotReportUrl: predicate(
        "a production HTTPS learner-pilot report URL (not a technical-test reference)",
        isExternalEvidenceUrl,
      ),
      pilotReportSha256: predicate(
        "a sha256 pilot-report digest",
        (value) => SHA256_DIGEST.test(value ?? ""),
      ),
      calibrationArtifactUrl: predicate(
        "a production HTTPS calibration artifact URL (not a technical-test reference)",
        isExternalEvidenceUrl,
      ),
      calibrationArtifactSha256: predicate(
        "a sha256 calibration-artifact digest",
        (value) => SHA256_DIGEST.test(value ?? ""),
      ),
      thresholdSpecificationUrl: predicate(
        "a production HTTPS pre-registered threshold specification URL",
        isExternalEvidenceUrl,
      ),
      thresholdSpecificationSha256: predicate(
        "a sha256 threshold-specification digest",
        (value) => SHA256_DIGEST.test(value ?? ""),
      ),
      pilotCompletedAt: predicate("a canonical ISO timestamp", isCanonicalIsoDate),
      sampleSize: predicate(
        "a positive integer learner sample size",
        (value) => Number.isSafeInteger(value) && value > 0,
      ),
      preRegisteredThresholds: exact(true),
      reliabilityThresholdMet: exact(true),
      routingAccuracyThresholdMet: exact(true),
      calibrationStatus: exact("calibrated"),
    },
  },
  immutableIdentityRecovery: {
    label: "Immutable identity and recovery",
    evidenceDateKey: "verifiedAt",
    validators: {
      type: exact("immutable-identity-recovery-verification"),
      ...COMMON_EVIDENCE_VALIDATORS,
      identityProvider: predicate("a non-empty identity-provider name", isNonEmptyString),
      immutableSubjectClaim: predicate("a stable immutable-subject claim name", isIdentifier),
      implementationEvidenceUrl: predicate(
        "a production HTTPS identity implementation evidence URL",
        isExternalEvidenceUrl,
      ),
      implementationEvidenceSha256: predicate(
        "a sha256 identity implementation digest",
        (value) => SHA256_DIGEST.test(value ?? ""),
      ),
      recoveryRehearsalUrl: predicate(
        "a production HTTPS recovery-rehearsal URL",
        isExternalEvidenceUrl,
      ),
      recoveryRehearsalSha256: predicate(
        "a sha256 recovery-rehearsal digest",
        (value) => SHA256_DIGEST.test(value ?? ""),
      ),
      recoveryRehearsalId: predicate("a stable recovery rehearsal identifier", isIdentifier),
      immutableSubjectVerified: exact(true),
      verifiedIdentityLinking: exact(true),
      recoveryFlowVerified: exact(true),
      destructiveActionReauthenticationVerified: exact(true),
      verifiedAt: predicate("a canonical ISO timestamp", isCanonicalIsoDate),
    },
  },
  hostedRestoreRehearsal: {
    label: "Hosted restore rehearsal",
    evidenceDateKey: "restoredAt",
    validators: {
      type: exact("hosted-restore-rehearsal"),
      ...COMMON_EVIDENCE_VALIDATORS,
      environment: exact("production"),
      platform: exact("Cloudflare D1"),
      backupId: predicate("a stable hosted backup identifier", isIdentifier),
      restoreRunId: predicate("a stable hosted restore-run identifier", isIdentifier),
      reportUrl: predicate(
        "a production HTTPS hosted-restore report URL (not a local test)",
        isExternalEvidenceUrl,
      ),
      reportSha256: predicate(
        "a sha256 hosted-restore report digest",
        (value) => SHA256_DIGEST.test(value ?? ""),
      ),
      restoredAt: predicate("a canonical ISO timestamp", isCanonicalIsoDate),
      integrityChecks: exact("passed"),
      encryptedBackupVerified: exact(true),
      tenantIsolationVerified: exact(true),
      recoveryPointObjectiveSeconds: predicate(
        "a positive integer observed RPO in seconds",
        (value) => Number.isSafeInteger(value) && value > 0,
      ),
      recoveryTimeObjectiveSeconds: predicate(
        "a positive integer observed RTO in seconds",
        (value) => Number.isSafeInteger(value) && value > 0,
      ),
    },
  },
  independentSecurityPrivacyReview: {
    label: "Independent security and privacy review",
    evidenceDateKey: "completedAt",
    validators: {
      type: exact("independent-security-privacy-review"),
      ...COMMON_EVIDENCE_VALIDATORS,
      reportUrl: predicate(
        "a production HTTPS independent-review report URL",
        isExternalEvidenceUrl,
      ),
      reportSha256: predicate(
        "a sha256 independent-review report digest",
        (value) => SHA256_DIGEST.test(value ?? ""),
      ),
      reviewOrganization: predicate("a non-empty independent organization", isNonEmptyString),
      reviewerId: predicate("a stable reviewer identifier", isIdentifier),
      independent: exact(true),
      securityScopeReviewed: exact(true),
      privacyScopeReviewed: exact(true),
      completedAt: predicate("a canonical ISO timestamp", isCanonicalIsoDate),
      unresolvedCriticalFindings: exact(0),
      unresolvedHighFindings: exact(0),
      disposition: exact("approved"),
    },
  },
  operationalOwnershipSloIncidentResponse: {
    label: "Operational ownership, SLO, and incident response",
    evidenceDateKey: "verifiedAt",
    validators: {
      type: exact("operational-ownership-slo-incident-response"),
      ...COMMON_EVIDENCE_VALIDATORS,
      accountableOwnerId: predicate("a stable accountable-owner identifier", isIdentifier),
      accountableOwnerRole: predicate("a non-empty accountable-owner role", isNonEmptyString),
      accountableOwnerConfirmed: exact(true),
      onCallRotationId: predicate("a stable on-call rotation identifier", isIdentifier),
      onCallScheduleUrl: predicate(
        "a production HTTPS on-call schedule evidence URL",
        isExternalEvidenceUrl,
      ),
      onCallScheduleSha256: predicate(
        "a sha256 on-call schedule digest",
        (value) => SHA256_DIGEST.test(value ?? ""),
      ),
      onCallCoverageVerified: exact(true),
      sloSpecificationUrl: predicate(
        "a production HTTPS SLO specification URL",
        isExternalEvidenceUrl,
      ),
      sloSpecificationSha256: predicate(
        "a sha256 SLO specification digest",
        (value) => SHA256_DIGEST.test(value ?? ""),
      ),
      sloTargetsRegistered: exact(true),
      errorBudgetPolicyRegistered: exact(true),
      alertRoutingVerificationUrl: predicate(
        "a production HTTPS alert-routing verification URL",
        isExternalEvidenceUrl,
      ),
      alertRoutingVerificationSha256: predicate(
        "a sha256 alert-routing verification digest",
        (value) => SHA256_DIGEST.test(value ?? ""),
      ),
      alertRoutingVerified: exact(true),
      incidentRehearsalId: predicate("a stable incident rehearsal identifier", isIdentifier),
      incidentRehearsalUrl: predicate(
        "a production HTTPS incident-rehearsal report URL",
        isExternalEvidenceUrl,
      ),
      incidentRehearsalSha256: predicate(
        "a sha256 incident-rehearsal digest",
        (value) => SHA256_DIGEST.test(value ?? ""),
      ),
      incidentRehearsalCompletedAt: predicate(
        "a canonical ISO timestamp",
        isCanonicalIsoDate,
      ),
      incidentResponseRehearsed: exact(true),
      verifiedAt: predicate("a canonical ISO timestamp", isCanonicalIsoDate),
    },
    crossValidate: (evidence, path, errors) => {
      if (
        isCanonicalIsoDate(evidence.incidentRehearsalCompletedAt) &&
        isCanonicalIsoDate(evidence.verifiedAt) &&
        Date.parse(evidence.verifiedAt) < Date.parse(evidence.incidentRehearsalCompletedAt)
      ) {
        errors.push(`${path}.verifiedAt cannot predate the incident rehearsal`);
      }
    },
  },
  loadAccessibilityPerformanceQualification: {
    label: "Load, accessibility, and performance qualification",
    evidenceDateKey: "qualifiedAt",
    validators: {
      type: exact("load-accessibility-performance-qualification"),
      ...COMMON_EVIDENCE_VALIDATORS,
      environment: exact("production"),
      thresholdSpecificationUrl: predicate(
        "a production HTTPS pre-registered qualification threshold URL",
        isExternalEvidenceUrl,
      ),
      thresholdSpecificationSha256: predicate(
        "a sha256 qualification-threshold digest",
        (value) => SHA256_DIGEST.test(value ?? ""),
      ),
      thresholdsRegisteredAt: predicate("a canonical ISO timestamp", isCanonicalIsoDate),
      thresholdsPreRegistered: exact(true),
      loadTestRunId: predicate("a stable production load-run identifier", isIdentifier),
      loadReportUrl: predicate(
        "a production HTTPS load-qualification report URL",
        isExternalEvidenceUrl,
      ),
      loadReportSha256: predicate(
        "a sha256 load-report digest",
        (value) => SHA256_DIGEST.test(value ?? ""),
      ),
      loadCompletedAt: predicate("a canonical ISO timestamp", isCanonicalIsoDate),
      loadThresholdsMet: exact(true),
      accessibilityAuditRunId: predicate(
        "a stable production accessibility-audit identifier",
        isIdentifier,
      ),
      accessibilityReportUrl: predicate(
        "a production HTTPS accessibility-qualification report URL",
        isExternalEvidenceUrl,
      ),
      accessibilityReportSha256: predicate(
        "a sha256 accessibility-report digest",
        (value) => SHA256_DIGEST.test(value ?? ""),
      ),
      accessibilityCompletedAt: predicate("a canonical ISO timestamp", isCanonicalIsoDate),
      criticalAccessibilityFindings: exact(0),
      seriousAccessibilityFindings: exact(0),
      accessibilityThresholdsMet: exact(true),
      performanceRunId: predicate(
        "a stable production performance-run identifier",
        isIdentifier,
      ),
      performanceReportUrl: predicate(
        "a production HTTPS performance-qualification report URL",
        isExternalEvidenceUrl,
      ),
      performanceReportSha256: predicate(
        "a sha256 performance-report digest",
        (value) => SHA256_DIGEST.test(value ?? ""),
      ),
      performanceCompletedAt: predicate("a canonical ISO timestamp", isCanonicalIsoDate),
      performanceBudgetsMet: exact(true),
      qualifiedAt: predicate("a canonical ISO timestamp", isCanonicalIsoDate),
    },
    crossValidate: (evidence, path, errors) => {
      const completedAtKeys = [
        "loadCompletedAt",
        "accessibilityCompletedAt",
        "performanceCompletedAt",
      ];
      if (isCanonicalIsoDate(evidence.thresholdsRegisteredAt)) {
        for (const completedAtKey of completedAtKeys) {
          if (
            isCanonicalIsoDate(evidence[completedAtKey]) &&
            Date.parse(evidence.thresholdsRegisteredAt) >=
              Date.parse(evidence[completedAtKey])
          ) {
            errors.push(
              `${path}.thresholdsRegisteredAt must predate ${completedAtKey}`,
            );
          }
        }
      }
      if (isCanonicalIsoDate(evidence.qualifiedAt)) {
        for (const completedAtKey of completedAtKeys) {
          if (
            isCanonicalIsoDate(evidence[completedAtKey]) &&
            Date.parse(evidence.qualifiedAt) < Date.parse(evidence[completedAtKey])
          ) {
            errors.push(`${path}.qualifiedAt cannot predate ${completedAtKey}`);
          }
        }
      }
    },
  },
  productionSitesOwnershipHosting: {
    label: "Production Sites ownership and hosting",
    evidenceDateKey: "verifiedAt",
    validators: {
      type: exact("production-sites-ownership-hosting-verification"),
      ...COMMON_EVIDENCE_VALIDATORS,
      provider: exact("OpenAI Sites"),
      projectId: predicate("a stable Sites project identifier", isIdentifier),
      deploymentId: predicate("a stable Sites deployment identifier", isIdentifier),
      productionUrl: predicate("a production HTTPS deployment URL", (value) =>
        parseProductionHttpsUrl(value) !== null),
      ownershipEvidenceUrl: predicate(
        "a production HTTPS Sites ownership evidence URL",
        isExternalEvidenceUrl,
      ),
      ownershipEvidenceSha256: predicate(
        "a sha256 ownership-evidence digest",
        (value) => SHA256_DIGEST.test(value ?? ""),
      ),
      ownerId: predicate("a stable production owner identifier", isIdentifier),
      ownershipVerified: exact(true),
      hostingVerified: exact(true),
      verifiedAt: predicate("a canonical ISO timestamp", isCanonicalIsoDate),
    },
  },
};

const EXPECTED_GATE_KEYS = Object.keys(GATE_DEFINITIONS);
const ROOT_KEYS = ["schemaVersion", "contentVersion", "gates"];
const GATE_KEYS = ["status", "approval", "evidence", "blockers", "notes"];
const APPROVAL_KEYS = ["approvedBy", "approverRole", "approvedAt", "attestationId"];
const BLOCKER_KEYS = ["code", "summary"];
const RELEASE_EVIDENCE_KEYS = [
  "schemaVersion",
  "evidenceType",
  "attestable",
  "sourceRevision",
  "buildProvenance",
  "contentVersion",
  "toolchain",
  "packageLock",
  "build",
  "sbom",
];
const RELEASE_BUILD_PROVENANCE_KEYS = [
  "path",
  "schemaVersion",
  "sourceTree",
  "sha256",
];
const RELEASE_BUILD_KEYS = [
  "root",
  "excludedPath",
  "artifactCount",
  "bytes",
  "artifacts",
  "sha256",
];
const RELEASE_ARTIFACT_KEYS = ["bytes", "path", "sha256"];

const validateExactKeys = (value, expectedKeys, path, errors) => {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }
  const expected = new Set(expectedKeys);
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) errors.push(`${path}.${key} is not allowed`);
  }
  for (const key of expectedKeys) {
    if (!Object.hasOwn(value, key)) errors.push(`${path}.${key} is required`);
  }
  return true;
};

const validateApproval = (approval, path, errors) => {
  if (!validateExactKeys(approval, APPROVAL_KEYS, path, errors)) return;
  if (!isIdentifier(approval.approvedBy)) {
    errors.push(`${path}.approvedBy must be a stable approver identifier`);
  }
  if (!isNonEmptyString(approval.approverRole)) {
    errors.push(`${path}.approverRole must be non-empty`);
  }
  if (!isCanonicalIsoDate(approval.approvedAt)) {
    errors.push(`${path}.approvedAt must be a canonical ISO timestamp`);
  }
  if (!isIdentifier(approval.attestationId)) {
    errors.push(`${path}.attestationId must be a stable attestation identifier`);
  }
};

const validateEvidence = (evidence, gateKey, definition, contentVersion, path, errors) => {
  const expectedKeys = Object.keys(definition.validators);
  if (!validateExactKeys(evidence, expectedKeys, path, errors)) return;
  for (const [key, validator] of Object.entries(definition.validators)) {
    const value = evidence[key];
    const valid =
      key === "contentVersion"
        ? value === contentVersion
        : key === "packageId"
          ? value === contentVersion
          : validator.test(value);
    if (!valid) errors.push(`${path}.${key} must be ${validator.description}`);
  }
  if (
    gateKey === "nativeLinguisticReview" &&
    (evidence.humanReviewCompleted !== true || evidence.nativeMandarinQualified !== true)
  ) {
    errors.push(`${path} cannot be satisfied by technical or golden tests`);
  }
  definition.crossValidate?.(evidence, path, errors);
};

const validateBlockers = (blockers, gateKey, path, errors, outputBlockers) => {
  if (!Array.isArray(blockers) || blockers.length === 0) {
    errors.push(`${path} must contain at least one blocker while ${gateKey} is pending`);
    return;
  }
  const seenCodes = new Set();
  blockers.forEach((blocker, index) => {
    const blockerPath = `${path}[${index}]`;
    if (!validateExactKeys(blocker, BLOCKER_KEYS, blockerPath, errors)) return;
    if (!BLOCKER_CODE.test(blocker.code ?? "")) {
      errors.push(`${blockerPath}.code must be an uppercase machine-readable blocker code`);
      return;
    }
    if (seenCodes.has(blocker.code)) {
      errors.push(`${blockerPath}.code duplicates ${blocker.code}`);
      return;
    }
    seenCodes.add(blocker.code);
    if (!isNonEmptyString(blocker.summary)) {
      errors.push(`${blockerPath}.summary must be non-empty`);
      return;
    }
    outputBlockers.push({
      gateKey,
      code: blocker.code,
      summary: blocker.summary,
    });
  });
};

const validateContentSources = async (
  manifest,
  registry,
  packageManifest,
  reviews,
  errors,
) => {
  if (!isRecord(registry)) {
    errors.push("content/registry.json must be an object");
    return { registryEntry: null, manifestHash: null, reviewsHash: null };
  }
  if (registry.schemaVersion !== 1) {
    errors.push("content/registry.json schemaVersion must be 1");
  }
  if (registry.currentContentVersion !== manifest.contentVersion) {
    errors.push(
      `contentVersion must equal content/registry.json currentContentVersion (${String(
        registry.currentContentVersion,
      )})`,
    );
  }
  if (!Array.isArray(registry.packages)) {
    errors.push("content/registry.json packages must be an array");
    return { registryEntry: null, manifestHash: null, reviewsHash: null };
  }

  const matchingEntries = registry.packages.filter(
    (entry) => entry?.contentVersion === manifest.contentVersion,
  );
  if (matchingEntries.length !== 1) {
    errors.push(
      `content/registry.json must contain exactly one entry for ${String(
        manifest.contentVersion,
      )}`,
    );
  }
  const registryEntry = matchingEntries.length === 1 ? matchingEntries[0] : null;

  if (!isRecord(packageManifest)) {
    errors.push(`The package manifest for ${String(manifest.contentVersion)} cannot be read`);
    return { registryEntry, manifestHash: null, reviewsHash: null };
  }
  if (
    packageManifest.packageId !== manifest.contentVersion ||
    packageManifest.contentVersion !== manifest.contentVersion
  ) {
    errors.push("The package manifest packageId/contentVersion must match readiness contentVersion");
  }
  const manifestHash = await sha256Json(packageManifest);
  if (registryEntry?.manifestSha256 !== manifestHash) {
    errors.push("The registry manifestSha256 must match the exact canonical package manifest");
  }

  let reviewsHash = null;
  if (!isRecord(reviews)) {
    errors.push(`The review envelope for ${String(manifest.contentVersion)} cannot be read`);
  } else {
    if (reviews.contentVersion !== manifest.contentVersion) {
      errors.push("The review envelope contentVersion must match readiness contentVersion");
    }
    if (reviews.packageManifestSha256 !== manifestHash) {
      errors.push("The review envelope must bind to the exact canonical package manifest");
    }
    reviewsHash = await sha256Json(reviews);
  }

  return { registryEntry, manifestHash, reviewsHash };
};

const validateApprovedContentActivation = (
  gate,
  registryEntry,
  manifestHash,
  reviewsHash,
  errors,
) => {
  if (gate?.status !== "approved" || !isRecord(gate.evidence)) return;
  const evidence = gate.evidence;
  if (!isRecord(registryEntry)) {
    errors.push(
      "gates.contentGovernanceReleaseActivation cannot be approved without its registry entry",
    );
    return;
  }
  if (
    registryEntry.lifecycle !== "published" ||
    registryEntry.closedAlphaEligible !== true ||
    registryEntry.productionEligible !== true ||
    registryEntry.audience !== "public"
  ) {
    errors.push(
      "gates.contentGovernanceReleaseActivation approval requires a public, published, production-eligible registry entry",
    );
  }
  const promotion = registryEntry.promotion;
  if (
    !isRecord(promotion) ||
    promotion.channel !== "production" ||
    promotion.packageManifestSha256 !== manifestHash ||
    promotion.reviewEnvelopeSha256 !== reviewsHash
  ) {
    errors.push(
      "gates.contentGovernanceReleaseActivation approval requires exact production promotion provenance",
    );
    return;
  }
  const comparisons = [
    ["packageManifestSha256", manifestHash],
    ["reviewEnvelopeSha256", reviewsHash],
    ["promotionActorId", promotion.actorId],
    ["activatedAt", promotion.promotedAt],
  ];
  for (const [key, expected] of comparisons) {
    if (evidence[key] !== expected) {
      errors.push(
        `gates.contentGovernanceReleaseActivation.evidence.${key} must match registry promotion provenance`,
      );
    }
  }
};

const validateLocalReleaseEvidence = async (
  repositoryRoot,
  contentVersion,
  errors,
) => {
  const releaseEvidencePath = join(
    repositoryRoot,
    "dist",
    "release-evidence",
    "manifest.json",
  );
  let rawManifest;
  let releaseEvidence;
  try {
    rawManifest = readFileSync(releaseEvidencePath, "utf8");
    releaseEvidence = JSON.parse(rawManifest);
  } catch (error) {
    errors.push(
      `Local release evidence cannot be read: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }

  if (
    !validateExactKeys(
      releaseEvidence,
      RELEASE_EVIDENCE_KEYS,
      "localReleaseEvidence",
      errors,
    )
  ) {
    return null;
  }
  if (releaseEvidence.schemaVersion !== 2) {
    errors.push("localReleaseEvidence.schemaVersion must be 2");
  }
  if (releaseEvidence.evidenceType !== "local-release-evidence") {
    errors.push(
      'localReleaseEvidence.evidenceType must be "local-release-evidence"',
    );
  }
  if (releaseEvidence.attestable !== true) {
    errors.push(
      "localReleaseEvidence.attestable must be true before any external gate can be approved",
    );
  }
  if (!SOURCE_REVISION.test(releaseEvidence.sourceRevision ?? "")) {
    errors.push(
      "localReleaseEvidence.sourceRevision must be an exact lowercase Git revision",
    );
  }
  if (releaseEvidence.contentVersion !== contentVersion) {
    errors.push(
      "localReleaseEvidence.contentVersion must match readiness contentVersion",
    );
  }
  if (!isRecord(releaseEvidence.toolchain)) {
    errors.push("localReleaseEvidence.toolchain must be an object");
  }
  if (!isRecord(releaseEvidence.packageLock)) {
    errors.push("localReleaseEvidence.packageLock must be an object");
  }
  if (!isRecord(releaseEvidence.sbom)) {
    errors.push("localReleaseEvidence.sbom must be an object");
  }

  const buildProvenance = releaseEvidence.buildProvenance;
  let buildProvenanceMarkerSha256 = null;
  if (
    validateExactKeys(
      buildProvenance,
      RELEASE_BUILD_PROVENANCE_KEYS,
      "localReleaseEvidence.buildProvenance",
      errors,
    )
  ) {
    if (buildProvenance.path !== BUILD_PROVENANCE_FILE) {
      errors.push(
        `localReleaseEvidence.buildProvenance.path must be "${BUILD_PROVENANCE_FILE}"`,
      );
    }
    if (
      buildProvenance.schemaVersion !== BUILD_PROVENANCE_SCHEMA_VERSION
    ) {
      errors.push(
        `localReleaseEvidence.buildProvenance.schemaVersion must be ${BUILD_PROVENANCE_SCHEMA_VERSION}`,
      );
    }
    if (!SOURCE_REVISION.test(buildProvenance.sourceTree ?? "")) {
      errors.push(
        "localReleaseEvidence.buildProvenance.sourceTree must be an exact lowercase Git tree id",
      );
    }
    if (!RAW_SHA256_DIGEST.test(buildProvenance.sha256 ?? "")) {
      errors.push(
        "localReleaseEvidence.buildProvenance.sha256 must be a lowercase sha256 digest",
      );
    }

    try {
      const markerBytes = readFileSync(
        join(repositoryRoot, "dist", BUILD_PROVENANCE_FILE),
      );
      buildProvenanceMarkerSha256 = sha256Bytes(markerBytes);
      if (buildProvenanceMarkerSha256 !== buildProvenance.sha256) {
        errors.push(
          "localReleaseEvidence.buildProvenance.sha256 must match the exact build provenance marker",
        );
      }
      const marker = JSON.parse(markerBytes.toString("utf8"));
      validateAttestableBuildProvenance(marker, {
        expectedPackageLock: {
          bytes: releaseEvidence.packageLock?.bytes,
          sha256: releaseEvidence.packageLock?.sha256,
        },
        expectedSourceRevision: releaseEvidence.sourceRevision,
        expectedSourceTree: buildProvenance.sourceTree,
      });
    } catch (error) {
      errors.push(
        `Local build provenance cannot be verified: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  const build = releaseEvidence.build;
  if (
    !validateExactKeys(
      build,
      RELEASE_BUILD_KEYS,
      "localReleaseEvidence.build",
      errors,
    )
  ) {
    return null;
  }
  if (build.root !== "dist") {
    errors.push('localReleaseEvidence.build.root must be "dist"');
  }
  if (build.excludedPath !== "release-evidence/**") {
    errors.push(
      'localReleaseEvidence.build.excludedPath must be "release-evidence/**"',
    );
  }
  if (!RAW_SHA256_DIGEST.test(build.sha256 ?? "")) {
    errors.push(
      "localReleaseEvidence.build.sha256 must be a lowercase sha256 digest",
    );
  }
  if (!Array.isArray(build.artifacts) || build.artifacts.length === 0) {
    errors.push(
      "localReleaseEvidence.build.artifacts must contain the production build",
    );
  } else {
    build.artifacts.forEach((artifact, index) => {
      const path = `localReleaseEvidence.build.artifacts[${index}]`;
      if (!validateExactKeys(artifact, RELEASE_ARTIFACT_KEYS, path, errors)) {
        return;
      }
      if (!Number.isSafeInteger(artifact.bytes) || artifact.bytes < 0) {
        errors.push(`${path}.bytes must be a non-negative safe integer`);
      }
      if (!isNonEmptyString(artifact.path)) {
        errors.push(`${path}.path must be non-empty`);
      }
      if (!RAW_SHA256_DIGEST.test(artifact.sha256 ?? "")) {
        errors.push(`${path}.sha256 must be a lowercase sha256 digest`);
      }
    });
    const provenanceArtifact = build.artifacts.find(
      (artifact) => artifact?.path === BUILD_PROVENANCE_FILE,
    );
    if (
      provenanceArtifact === undefined ||
      provenanceArtifact.sha256 !== buildProvenanceMarkerSha256
    ) {
      errors.push(
        "localReleaseEvidence.build must include the exact build provenance marker",
      );
    }
  }

  let actualArtifacts;
  try {
    actualArtifacts = await collectDistArtifacts(join(repositoryRoot, "dist"));
  } catch (error) {
    errors.push(
      `The local production build cannot be hashed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
  if (actualArtifacts.length === 0) {
    errors.push("The local production build contains no artifacts");
    return null;
  }
  const actualBytes = actualArtifacts.reduce(
    (total, artifact) => total + artifact.bytes,
    0,
  );
  const actualBuild = {
    root: "dist",
    excludedPath: "release-evidence/**",
    artifactCount: actualArtifacts.length,
    bytes: actualBytes,
    artifacts: actualArtifacts,
  };
  const actualBuildSha256 = computeBuildSha256(actualBuild);
  if (
    build.artifactCount !== actualBuild.artifactCount ||
    build.bytes !== actualBuild.bytes ||
    serializeCanonicalJson(build.artifacts) !==
      serializeCanonicalJson(actualBuild.artifacts) ||
    build.sha256 !== actualBuildSha256
  ) {
    errors.push(
      "localReleaseEvidence.build must match the exact current dist artifact set",
    );
  }

  return {
    sourceRevision: releaseEvidence.sourceRevision,
    releaseEvidenceManifestSha256: `sha256:${sha256Bytes(rawManifest)}`,
    releaseBuildSha256: `sha256:${actualBuildSha256}`,
  };
};

const validateReleaseBinding = (evidence, provenance, path, errors) => {
  if (!isRecord(evidence)) return;
  if (provenance === null) {
    errors.push(
      `${path} cannot be approved without valid local source/build provenance`,
    );
    return;
  }
  for (const [key, expected] of Object.entries(provenance)) {
    if (evidence[key] !== expected) {
      errors.push(`${path}.${key} must match exact local release evidence`);
    }
  }
};

const validateManifest = async ({
  manifest,
  registry,
  packageManifest,
  repositoryRoot,
  reviews,
}) => {
  const errors = [];
  const blockers = [];

  if (!validateExactKeys(manifest, ROOT_KEYS, "manifest", errors)) {
    return { errors, blockers };
  }
  if (manifest.schemaVersion !== READINESS_SCHEMA_VERSION) {
    errors.push(`manifest.schemaVersion must be ${READINESS_SCHEMA_VERSION}`);
  }
  if (
    typeof manifest.contentVersion !== "string" ||
    !SAFE_CONTENT_VERSION.test(manifest.contentVersion)
  ) {
    errors.push(`manifest.contentVersion must match ${SAFE_CONTENT_VERSION}`);
  }
  if (!validateExactKeys(manifest.gates, EXPECTED_GATE_KEYS, "manifest.gates", errors)) {
    return { errors, blockers };
  }

  const hasApprovedGate = Object.values(manifest.gates).some(
    (gate) => gate?.status === "approved",
  );
  const releaseProvenance = hasApprovedGate
    ? await validateLocalReleaseEvidence(
        repositoryRoot,
        manifest.contentVersion,
        errors,
      )
    : null;

  for (const [gateKey, definition] of Object.entries(GATE_DEFINITIONS)) {
    const gate = manifest.gates[gateKey];
    const path = `manifest.gates.${gateKey}`;
    if (!validateExactKeys(gate, GATE_KEYS, path, errors)) continue;
    if (!isNonEmptyString(gate.notes)) {
      errors.push(`${path}.notes must be non-empty`);
    }
    if (gate.status === "pending") {
      if (gate.approval !== null) {
        errors.push(`${path}.approval must be null while the gate is pending`);
      }
      if (gate.evidence !== null) {
        errors.push(`${path}.evidence must be null while the gate is pending`);
      }
      validateBlockers(gate.blockers, gateKey, `${path}.blockers`, errors, blockers);
      continue;
    }
    if (gate.status !== "approved") {
      errors.push(`${path}.status must be "pending" or "approved"`);
      continue;
    }
    if (!Array.isArray(gate.blockers) || gate.blockers.length !== 0) {
      errors.push(`${path}.blockers must be an empty array after approval`);
    }
    validateApproval(gate.approval, `${path}.approval`, errors);
    validateEvidence(
      gate.evidence,
      gateKey,
      definition,
      manifest.contentVersion,
      `${path}.evidence`,
      errors,
    );
    validateReleaseBinding(
      gate.evidence,
      releaseProvenance,
      `${path}.evidence`,
      errors,
    );
    if (
      isRecord(gate.approval) &&
      isCanonicalIsoDate(gate.approval.approvedAt) &&
      isRecord(gate.evidence) &&
      isCanonicalIsoDate(gate.evidence[definition.evidenceDateKey]) &&
      Date.parse(gate.approval.approvedAt) < Date.parse(gate.evidence[definition.evidenceDateKey])
    ) {
      errors.push(`${path}.approval.approvedAt cannot predate the gate evidence`);
    }
  }

  const contentSources = await validateContentSources(
    manifest,
    registry,
    packageManifest,
    reviews,
    errors,
  );
  validateApprovedContentActivation(
    manifest.gates.contentGovernanceReleaseActivation,
    contentSources.registryEntry,
    contentSources.manifestHash,
    contentSources.reviewsHash,
    errors,
  );

  return { errors, blockers };
};

const readJson = (path, label) => {
  try {
    return { value: JSON.parse(readFileSync(path, "utf8")), error: null };
  } catch (error) {
    return {
      value: null,
      error: `${label} cannot be read: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

const parseArguments = (arguments_) => {
  let repositoryRoot = REPOSITORY_ROOT;
  let manifestPath = null;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--repository-root" || argument === "--manifest") {
      const value = arguments_[index + 1];
      if (!value) throw new Error(`${argument} requires a path`);
      if (argument === "--repository-root") repositoryRoot = resolve(value);
      else manifestPath = resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  return {
    repositoryRoot,
    manifestPath: manifestPath ?? join(repositoryRoot, "config", "production-readiness.json"),
  };
};

const main = async () => {
  let paths;
  try {
    paths = parseArguments(process.argv.slice(2));
  } catch (error) {
    console.error(`Production readiness blocked: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const manifestResult = readJson(paths.manifestPath, "Readiness manifest");
  const registryResult = readJson(
    join(paths.repositoryRoot, "content", "registry.json"),
    "Content registry",
  );
  const readErrors = [manifestResult.error, registryResult.error].filter(Boolean);
  const contentVersion = manifestResult.value?.contentVersion;
  let packageManifestResult = { value: null, error: null };
  let reviewsResult = { value: null, error: null };
  if (typeof contentVersion === "string" && SAFE_CONTENT_VERSION.test(contentVersion)) {
    const packageDirectory = join(
      paths.repositoryRoot,
      "content",
      "packages",
      contentVersion,
    );
    packageManifestResult = readJson(
      join(packageDirectory, "manifest.json"),
      "Content package manifest",
    );
    reviewsResult = readJson(
      join(packageDirectory, "reviews.json"),
      "Content review envelope",
    );
    readErrors.push(packageManifestResult.error, reviewsResult.error);
  }

  if (!manifestResult.value || !registryResult.value) {
    console.error("Production readiness blocked: required readiness sources cannot be read.");
    readErrors.filter(Boolean).forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  const result = await validateManifest({
    manifest: manifestResult.value,
    registry: registryResult.value,
    packageManifest: packageManifestResult.value,
    repositoryRoot: paths.repositoryRoot,
    reviews: reviewsResult.value,
  });
  result.errors.unshift(...readErrors.filter(Boolean));

  if (result.errors.length > 0 || result.blockers.length > 0) {
    console.error(
      `Production readiness blocked for ${String(
        manifestResult.value.contentVersion ?? "unknown content version",
      )}.`,
    );
    if (result.errors.length > 0) {
      console.error(`Manifest/evidence validation errors (${result.errors.length}):`);
      result.errors.forEach((error) => console.error(`- ${error}`));
    }
    if (result.blockers.length > 0) {
      console.error(`Outstanding blockers (${result.blockers.length}):`);
      result.blockers.forEach((blocker) => {
        console.error(`- ${blocker.gateKey} [${blocker.code}]: ${blocker.summary}`);
      });
    }
    console.error(
      "Technical, golden, unit, integration, build, and local restore checks are not substitutes for human, pilot, independent, hosted, identity, or ownership evidence.",
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `All ${EXPECTED_GATE_KEYS.length} production readiness gates are approved with exact evidence for ${manifestResult.value.contentVersion}.`,
  );
};

await main();
