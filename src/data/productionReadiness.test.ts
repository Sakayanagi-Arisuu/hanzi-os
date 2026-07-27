import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  BUILD_PROVENANCE_FILE,
  BUILD_PROVENANCE_PROTOCOL,
  BUILD_PROVENANCE_SCHEMA_VERSION,
} from "../../scripts/build-provenance.mjs";
import {
  computeBuildSha256,
  serializeCanonicalJson,
  sha256Bytes,
} from "../../scripts/generate-release-evidence.mjs";
import { CONTENT_VERSION } from "./curriculum";

type ProductionBlocker = {
  code: string;
  summary: string;
};

type ProductionGate = {
  status: "pending" | "approved";
  approval: Record<string, unknown> | null;
  evidence: Record<string, unknown> | null;
  blockers: ProductionBlocker[];
  notes: string;
};

type ReadinessManifest = {
  schemaVersion: number;
  contentVersion: string;
  gates: Record<string, ProductionGate>;
};

type HanziDataManifest = {
  schemaVersion: number;
  package: string;
  packageVersion: string;
  characters: string[];
};

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const verifierPath = join(repositoryRoot, "scripts", "verify-production-readiness.mjs");
const readinessPath = join(repositoryRoot, "config", "production-readiness.json");
const manifest = JSON.parse(readFileSync(readinessPath, "utf8")) as ReadinessManifest;
const packageJson = JSON.parse(
  readFileSync(join(repositoryRoot, "package.json"), "utf8"),
) as { scripts: Record<string, string> };

const hanziDataManifest = JSON.parse(
  readFileSync(new URL("../../config/hanzi-data-manifest.json", import.meta.url), "utf8"),
) as HanziDataManifest;

const expectedGateKeys = [
  "nativeLinguisticReview",
  "contentGovernanceReleaseActivation",
  "assessmentPilotCalibration",
  "immutableIdentityRecovery",
  "hostedRestoreRehearsal",
  "independentSecurityPrivacyReview",
  "operationalOwnershipSloIncidentResponse",
  "loadAccessibilityPerformanceQualification",
  "productionSitesOwnershipHosting",
];

const expectedBlockerCodes = Object.values(manifest.gates).flatMap((gate) =>
  gate.blockers.map((blocker) => blocker.code),
);

const digest = (character: string) => `sha256:${character.repeat(64)}`;
const sourceRevision = "0123456789abcdef0123456789abcdef01234567";
const sourceTree = "89abcdef0123456789abcdef0123456789abcdef";

const canonicalJson = (value: unknown): string => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
};

const sha256Json = (value: unknown) =>
  `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;

const approval = (gateKey: string) => ({
  approvedBy: "release-board/hanzi-os",
  approverRole: "Production release authority",
  approvedAt: "2026-07-25T12:00:00.000Z",
  attestationId: `attestation/${gateKey}/2026-07-25`,
});

const approvedGate = (
  gateKey: string,
  evidence: Record<string, unknown>,
): ProductionGate => ({
  status: "approved",
  approval: approval(gateKey),
  evidence,
  blockers: [],
  notes: `Approved fixture for ${gateKey}.`,
});

const createApprovedFixture = () => {
  const packageLock = {
    path: "package-lock.json",
    bytes: 1,
    sha256: "a".repeat(64),
  };
  const buildProvenanceMarker = {
    schemaVersion: BUILD_PROVENANCE_SCHEMA_VERSION,
    evidenceType: "hanzi-os-build-provenance",
    buildProtocol: BUILD_PROVENANCE_PROTOCOL,
    attestable: true,
    sourceRevision,
    sourceTree,
    packageLock: {
      bytes: packageLock.bytes,
      sha256: packageLock.sha256,
    },
    invalidReasons: [],
  };
  const buildProvenanceContent =
    `${JSON.stringify(buildProvenanceMarker, null, 2)}\n`;
  const releaseArtifact = {
    content: "fixture production build\n",
    path: "client/app.js",
  };
  const releaseArtifacts = [
    {
      bytes: Buffer.byteLength(buildProvenanceContent),
      path: BUILD_PROVENANCE_FILE,
      sha256: sha256Bytes(buildProvenanceContent),
    },
    {
      bytes: Buffer.byteLength(releaseArtifact.content),
      path: releaseArtifact.path,
      sha256: sha256Bytes(releaseArtifact.content),
    },
  ];
  const releaseBuild = {
    root: "dist",
    excludedPath: "release-evidence/**",
    artifactCount: releaseArtifacts.length,
    bytes: releaseArtifacts.reduce(
      (total, artifact) => total + artifact.bytes,
      0,
    ),
    artifacts: releaseArtifacts,
  };
  const releaseEvidence = {
    schemaVersion: 2,
    evidenceType: "local-release-evidence",
    attestable: true,
    sourceRevision,
    buildProvenance: {
      path: BUILD_PROVENANCE_FILE,
      schemaVersion: BUILD_PROVENANCE_SCHEMA_VERSION,
      sourceTree,
      sha256: sha256Bytes(buildProvenanceContent),
    },
    contentVersion: CONTENT_VERSION,
    toolchain: {
      networkMode: "offline",
      node: process.version,
      npm: "11.13.0",
      sbomCommand:
        "npm sbom --package-lock-only --sbom-format cyclonedx --sbom-type application",
    },
    packageLock,
    build: {
      ...releaseBuild,
      sha256: computeBuildSha256(releaseBuild),
    },
    sbom: {
      path: "release-evidence/sbom.cdx.json",
      format: "CycloneDX",
      specVersion: "1.5",
      bytes: 1,
      sha256: "b".repeat(64),
    },
  };
  const releaseEvidenceManifestSha256 =
    `sha256:${sha256Bytes(serializeCanonicalJson(releaseEvidence))}`;
  const releaseProvenance = {
    sourceRevision,
    releaseEvidenceManifestSha256,
    releaseBuildSha256: `sha256:${releaseEvidence.build.sha256}`,
  };
  const packageManifest = {
    schemaVersion: 1,
    packageId: CONTENT_VERSION,
    contentVersion: CONTENT_VERSION,
  };
  const packageManifestSha256 = sha256Json(packageManifest);
  const reviews = {
    schemaVersion: 1,
    contentVersion: CONTENT_VERSION,
    packageManifestSha256,
    reviews: [],
  };
  const reviewEnvelopeSha256 = sha256Json(reviews);
  const promotedAt = "2026-07-25T11:00:00.000Z";
  const promotionActorId = "release/actor-001";

  const approvedManifest: ReadinessManifest = {
    schemaVersion: 2,
    contentVersion: CONTENT_VERSION,
    gates: {
      nativeLinguisticReview: approvedGate("nativeLinguisticReview", {
        type: "native-linguistic-review",
        contentVersion: CONTENT_VERSION,
        artifactUrl: "https://evidence.hanzi-os.com/native/review.pdf",
        artifactSha256: digest("a"),
        reviewerId: "reviewer/native-001",
        nativeMandarinQualified: true,
        humanReviewCompleted: true,
        reviewedAt: promotedAt,
        decision: "approved",
      }),
      contentGovernanceReleaseActivation: approvedGate(
        "contentGovernanceReleaseActivation",
        {
          type: "content-governance-release-activation",
          contentVersion: CONTENT_VERSION,
          packageId: CONTENT_VERSION,
          packageManifestSha256,
          reviewEnvelopeSha256,
          promotionActorId,
          channel: "production",
          lifecycle: "published",
          activatedAt: promotedAt,
          promotionRecordUrl: "https://evidence.hanzi-os.com/content/promotion.json",
          promotionRecordSha256: digest("b"),
        },
      ),
      assessmentPilotCalibration: approvedGate("assessmentPilotCalibration", {
        type: "assessment-pilot-calibration-report",
        contentVersion: CONTENT_VERSION,
        pilotId: "pilot/assessment-001",
        pilotReportUrl: "https://evidence.hanzi-os.com/assessment/pilot.pdf",
        pilotReportSha256: digest("c"),
        calibrationArtifactUrl:
          "https://evidence.hanzi-os.com/assessment/calibration.json",
        calibrationArtifactSha256: digest("d"),
        thresholdSpecificationUrl:
          "https://evidence.hanzi-os.com/assessment/thresholds.json",
        thresholdSpecificationSha256: digest("e"),
        pilotCompletedAt: promotedAt,
        sampleSize: 100,
        preRegisteredThresholds: true,
        reliabilityThresholdMet: true,
        routingAccuracyThresholdMet: true,
        calibrationStatus: "calibrated",
      }),
      immutableIdentityRecovery: approvedGate("immutableIdentityRecovery", {
        type: "immutable-identity-recovery-verification",
        contentVersion: CONTENT_VERSION,
        identityProvider: "Provider",
        immutableSubjectClaim: "sub",
        implementationEvidenceUrl:
          "https://evidence.hanzi-os.com/identity/implementation.pdf",
        implementationEvidenceSha256: digest("f"),
        recoveryRehearsalUrl: "https://evidence.hanzi-os.com/identity/recovery.pdf",
        recoveryRehearsalSha256: digest("a"),
        recoveryRehearsalId: "recovery/production-001",
        immutableSubjectVerified: true,
        verifiedIdentityLinking: true,
        recoveryFlowVerified: true,
        destructiveActionReauthenticationVerified: true,
        verifiedAt: promotedAt,
      }),
      hostedRestoreRehearsal: approvedGate("hostedRestoreRehearsal", {
        type: "hosted-restore-rehearsal",
        contentVersion: CONTENT_VERSION,
        environment: "production",
        platform: "Cloudflare D1",
        backupId: "backup/production-001",
        restoreRunId: "restore/production-001",
        reportUrl: "https://evidence.hanzi-os.com/restore/report.pdf",
        reportSha256: digest("b"),
        restoredAt: promotedAt,
        integrityChecks: "passed",
        encryptedBackupVerified: true,
        tenantIsolationVerified: true,
        recoveryPointObjectiveSeconds: 300,
        recoveryTimeObjectiveSeconds: 600,
      }),
      independentSecurityPrivacyReview: approvedGate(
        "independentSecurityPrivacyReview",
        {
          type: "independent-security-privacy-review",
          contentVersion: CONTENT_VERSION,
          reportUrl: "https://evidence.hanzi-os.com/security-privacy/report.pdf",
          reportSha256: digest("c"),
          reviewOrganization: "Independent Review Organization",
          reviewerId: "reviewer/security-privacy-001",
          independent: true,
          securityScopeReviewed: true,
          privacyScopeReviewed: true,
          completedAt: promotedAt,
          unresolvedCriticalFindings: 0,
          unresolvedHighFindings: 0,
          disposition: "approved",
        },
      ),
      operationalOwnershipSloIncidentResponse: approvedGate(
        "operationalOwnershipSloIncidentResponse",
        {
          type: "operational-ownership-slo-incident-response",
          contentVersion: CONTENT_VERSION,
          accountableOwnerId: "owner/operations-001",
          accountableOwnerRole: "Production service owner",
          accountableOwnerConfirmed: true,
          onCallRotationId: "on-call/rotation-001",
          onCallScheduleUrl: "https://evidence.hanzi-os.com/operations/on-call.json",
          onCallScheduleSha256: digest("d"),
          onCallCoverageVerified: true,
          sloSpecificationUrl: "https://evidence.hanzi-os.com/operations/slos.json",
          sloSpecificationSha256: digest("e"),
          sloTargetsRegistered: true,
          errorBudgetPolicyRegistered: true,
          alertRoutingVerificationUrl:
            "https://evidence.hanzi-os.com/operations/alert-routing.pdf",
          alertRoutingVerificationSha256: digest("f"),
          alertRoutingVerified: true,
          incidentRehearsalId: "incident/rehearsal-001",
          incidentRehearsalUrl:
            "https://evidence.hanzi-os.com/operations/incident-rehearsal.pdf",
          incidentRehearsalSha256: digest("a"),
          incidentRehearsalCompletedAt: "2026-07-25T10:00:00.000Z",
          incidentResponseRehearsed: true,
          verifiedAt: promotedAt,
        },
      ),
      loadAccessibilityPerformanceQualification: approvedGate(
        "loadAccessibilityPerformanceQualification",
        {
          type: "load-accessibility-performance-qualification",
          contentVersion: CONTENT_VERSION,
          environment: "production",
          thresholdSpecificationUrl:
            "https://evidence.hanzi-os.com/qualification/thresholds.json",
          thresholdSpecificationSha256: digest("b"),
          thresholdsRegisteredAt: "2026-07-24T00:00:00.000Z",
          thresholdsPreRegistered: true,
          loadTestRunId: "load/run-001",
          loadReportUrl: "https://evidence.hanzi-os.com/qualification/load.pdf",
          loadReportSha256: digest("c"),
          loadCompletedAt: "2026-07-25T10:00:00.000Z",
          loadThresholdsMet: true,
          accessibilityAuditRunId: "accessibility/run-001",
          accessibilityReportUrl:
            "https://evidence.hanzi-os.com/qualification/accessibility.pdf",
          accessibilityReportSha256: digest("d"),
          accessibilityCompletedAt: "2026-07-25T10:00:00.000Z",
          criticalAccessibilityFindings: 0,
          seriousAccessibilityFindings: 0,
          accessibilityThresholdsMet: true,
          performanceRunId: "performance/run-001",
          performanceReportUrl:
            "https://evidence.hanzi-os.com/qualification/performance.pdf",
          performanceReportSha256: digest("e"),
          performanceCompletedAt: "2026-07-25T10:00:00.000Z",
          performanceBudgetsMet: true,
          qualifiedAt: promotedAt,
        },
      ),
      productionSitesOwnershipHosting: approvedGate(
        "productionSitesOwnershipHosting",
        {
          type: "production-sites-ownership-hosting-verification",
          contentVersion: CONTENT_VERSION,
          provider: "OpenAI Sites",
          projectId: "sites/project-001",
          deploymentId: "sites/deployment-001",
          productionUrl: "https://learn.hanzi-os.com/",
          ownershipEvidenceUrl:
            "https://evidence.hanzi-os.com/sites/ownership.pdf",
          ownershipEvidenceSha256: digest("d"),
          ownerId: "owner/hanzi-os",
          ownershipVerified: true,
          hostingVerified: true,
          verifiedAt: promotedAt,
        },
      ),
    },
  };
  for (const gate of Object.values(approvedManifest.gates)) {
    Object.assign(gate.evidence!, releaseProvenance);
  }

  const registry = {
    schemaVersion: 1,
    currentContentVersion: CONTENT_VERSION,
    packages: [
      {
        packageId: CONTENT_VERSION,
        contentVersion: CONTENT_VERSION,
        relativePath: `packages/${CONTENT_VERSION}`,
        manifestSha256: packageManifestSha256,
        audience: "public",
        lifecycle: "published",
        closedAlphaEligible: true,
        productionEligible: true,
        promotion: {
          channel: "production",
          actorId: promotionActorId,
          promotedAt,
          packageManifestSha256,
          reviewEnvelopeSha256,
        },
      },
    ],
  };

  return {
    manifest: approvedManifest,
    registry,
    packageManifest,
    buildProvenanceContent,
    releaseArtifact,
    releaseEvidence,
    reviews,
  };
};

const writeJson = (path: string, value: unknown) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const runVerifier = (arguments_: string[]) =>
  spawnSync(process.execPath, [verifierPath, ...arguments_], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });

const runFixture = (
  mutate?: (fixture: ReturnType<typeof createApprovedFixture>) => void,
) => {
  const root = mkdtempSync(join(tmpdir(), "hanzi-readiness-"));
  const fixture = createApprovedFixture();
  mutate?.(fixture);
  writeJson(join(root, "config", "production-readiness.json"), fixture.manifest);
  writeJson(join(root, "content", "registry.json"), fixture.registry);
  writeJson(
    join(root, "content", "packages", CONTENT_VERSION, "manifest.json"),
    fixture.packageManifest,
  );
  writeJson(
    join(root, "content", "packages", CONTENT_VERSION, "reviews.json"),
    fixture.reviews,
  );
  const releaseArtifactPath = join(root, "dist", fixture.releaseArtifact.path);
  mkdirSync(dirname(releaseArtifactPath), { recursive: true });
  writeFileSync(releaseArtifactPath, fixture.releaseArtifact.content, "utf8");
  writeFileSync(
    join(root, "dist", BUILD_PROVENANCE_FILE),
    fixture.buildProvenanceContent,
    "utf8",
  );
  const releaseEvidencePath = join(
    root,
    "dist",
    "release-evidence",
    "manifest.json",
  );
  mkdirSync(dirname(releaseEvidencePath), { recursive: true });
  writeFileSync(
    releaseEvidencePath,
    serializeCanonicalJson(fixture.releaseEvidence),
    "utf8",
  );
  const result = runVerifier(["--repository-root", root]);
  rmSync(root, { recursive: true, force: true });
  return result;
};

describe("production readiness manifest", () => {
  it("tracks the exact checked-in content version and all required external gates", () => {
    expect(manifest.schemaVersion).toBe(2);
    expect(manifest.contentVersion).toBe(CONTENT_VERSION);
    expect(Object.keys(manifest.gates)).toEqual(expectedGateKeys);
  });

  it("keeps every unverified gate pending with machine-readable blockers", () => {
    for (const gate of Object.values(manifest.gates)) {
      expect(gate.status).toBe("pending");
      expect(gate.approval).toBeNull();
      expect(gate.evidence).toBeNull();
      expect(gate.notes.trim()).toBeTruthy();
      expect(gate.blockers.length).toBeGreaterThan(0);
      expect(new Set(gate.blockers.map((blocker) => blocker.code)).size).toBe(
        gate.blockers.length,
      );
      for (const blocker of gate.blockers) {
        expect(blocker.code).toMatch(/^[A-Z][A-Z0-9_]+$/);
        expect(blocker.summary.trim()).toBeTruthy();
      }
    }
  });

  it("fails closed now and enumerates every blocker without a schema error", () => {
    const result = runVerifier([]);
    const output = `${result.stdout}${result.stderr}`;
    expect(result.status).toBe(1);
    expect(output).toContain(`Outstanding blockers (${expectedBlockerCodes.length})`);
    expect(output).not.toContain("Manifest/evidence validation errors");
    for (const code of expectedBlockerCodes) expect(output).toContain(`[${code}]`);
    expect(output).toContain("are not substitutes");
  });

  it("rechecks readiness after regenerating final production release evidence", () => {
    expect(packageJson.scripts["verify:production"]).toMatch(
      /^node scripts\/verify-production-readiness\.mjs /u,
    );
    expect(packageJson.scripts["verify:production"]).toMatch(
      /npm run release:evidence:production && node scripts\/verify-production-readiness\.mjs$/u,
    );
    expect(packageJson.scripts["release:evidence:production"]).toMatch(
      /--require-source-revision --source-revision-from-head --rebuild-from-source$/u,
    );
    expect(packageJson.scripts.build).toMatch(
      /clean-sites-build\.mjs && node scripts\/build-provenance\.mjs start && vinext build && node scripts\/build-provenance\.mjs finish/u,
    );
  });

  it("accepts only a complete exact-evidence envelope for every approved gate", () => {
    const result = runFixture();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(
      `All ${expectedGateKeys.length} production readiness gates are approved`,
    );
  });

  it("rejects an approved gate with missing source/build provenance", () => {
    const result = runFixture((fixture) => {
      delete fixture.manifest.gates.nativeLinguisticReview.evidence!
        .sourceRevision;
    });
    const output = `${result.stdout}${result.stderr}`;
    expect(result.status).toBe(1);
    expect(output).toContain(
      "nativeLinguisticReview.evidence.sourceRevision is required",
    );
  });

  it.each([
    {
      label: "Git source revision",
      key: "sourceRevision",
      value: "f".repeat(40),
    },
    {
      label: "release-evidence manifest digest",
      key: "releaseEvidenceManifestSha256",
      value: digest("f"),
    },
    {
      label: "release build digest",
      key: "releaseBuildSha256",
      value: digest("e"),
    },
  ])("rejects a mismatched $label binding", ({ key, value }) => {
    const result = runFixture((fixture) => {
      fixture.manifest.gates.nativeLinguisticReview.evidence![key] = value;
    });
    const output = `${result.stdout}${result.stderr}`;
    expect(result.status).toBe(1);
    expect(output).toContain(
      `nativeLinguisticReview.evidence.${key} must match exact local release evidence`,
    );
  });

  it("rejects a release manifest whose artifact set no longer matches dist", () => {
    const result = runFixture((fixture) => {
      fixture.releaseArtifact.content = "tampered production build\n";
    });
    const output = `${result.stdout}${result.stderr}`;
    expect(result.status).toBe(1);
    expect(output).toContain(
      "localReleaseEvidence.build must match the exact current dist artifact set",
    );
  });

  it("rejects a build whose provenance marker is missing or changed", () => {
    const result = runFixture((fixture) => {
      fixture.buildProvenanceContent =
        fixture.buildProvenanceContent.replace(
          '"attestable": true',
          '"attestable": false',
        );
    });
    const output = `${result.stdout}${result.stderr}`;
    expect(result.status).toBe(1);
    expect(output).toContain(
      "localReleaseEvidence.buildProvenance.sha256 must match the exact build provenance marker",
    );
    expect(output).toContain(
      "build provenance is not attestable from a clean source snapshot",
    );
  });

  it.each([
    {
      label: "native review technical-test substitute",
      mutate: (fixture: ReturnType<typeof createApprovedFixture>) => {
        fixture.manifest.gates.nativeLinguisticReview.evidence!.artifactUrl =
          "https://evidence.hanzi-os.com/technical-tests/native.json";
      },
      expected: "nativeLinguisticReview.evidence.artifactUrl",
    },
    {
      label: "content promotion provenance mismatch",
      mutate: (fixture: ReturnType<typeof createApprovedFixture>) => {
        fixture.manifest.gates.contentGovernanceReleaseActivation.evidence!.promotionActorId =
          "release/different-actor";
      },
      expected:
        "contentGovernanceReleaseActivation.evidence.promotionActorId must match registry",
    },
    {
      label: "uncalibrated assessment",
      mutate: (fixture: ReturnType<typeof createApprovedFixture>) => {
        fixture.manifest.gates.assessmentPilotCalibration.evidence!.calibrationStatus =
          "uncalibrated";
      },
      expected: "assessmentPilotCalibration.evidence.calibrationStatus",
    },
    {
      label: "mutable identity",
      mutate: (fixture: ReturnType<typeof createApprovedFixture>) => {
        fixture.manifest.gates.immutableIdentityRecovery.evidence!.immutableSubjectVerified =
          false;
      },
      expected: "immutableIdentityRecovery.evidence.immutableSubjectVerified",
    },
    {
      label: "local restore rehearsal",
      mutate: (fixture: ReturnType<typeof createApprovedFixture>) => {
        fixture.manifest.gates.hostedRestoreRehearsal.evidence!.environment = "local";
      },
      expected: "hostedRestoreRehearsal.evidence.environment",
    },
    {
      label: "unresolved independent-review finding",
      mutate: (fixture: ReturnType<typeof createApprovedFixture>) => {
        fixture.manifest.gates.independentSecurityPrivacyReview.evidence!.unresolvedHighFindings =
          1;
      },
      expected:
        "independentSecurityPrivacyReview.evidence.unresolvedHighFindings",
    },
    {
      label: "unconfirmed operational owner",
      mutate: (fixture: ReturnType<typeof createApprovedFixture>) => {
        fixture.manifest.gates.operationalOwnershipSloIncidentResponse.evidence!.accountableOwnerConfirmed =
          false;
      },
      expected:
        "operationalOwnershipSloIncidentResponse.evidence.accountableOwnerConfirmed",
    },
    {
      label: "unverified on-call coverage",
      mutate: (fixture: ReturnType<typeof createApprovedFixture>) => {
        fixture.manifest.gates.operationalOwnershipSloIncidentResponse.evidence!.onCallCoverageVerified =
          false;
      },
      expected:
        "operationalOwnershipSloIncidentResponse.evidence.onCallCoverageVerified",
    },
    {
      label: "unregistered production SLO",
      mutate: (fixture: ReturnType<typeof createApprovedFixture>) => {
        fixture.manifest.gates.operationalOwnershipSloIncidentResponse.evidence!.sloTargetsRegistered =
          false;
      },
      expected:
        "operationalOwnershipSloIncidentResponse.evidence.sloTargetsRegistered",
    },
    {
      label: "unverified alert routing",
      mutate: (fixture: ReturnType<typeof createApprovedFixture>) => {
        fixture.manifest.gates.operationalOwnershipSloIncidentResponse.evidence!.alertRoutingVerified =
          false;
      },
      expected:
        "operationalOwnershipSloIncidentResponse.evidence.alertRoutingVerified",
    },
    {
      label: "unrehearsed incident response",
      mutate: (fixture: ReturnType<typeof createApprovedFixture>) => {
        fixture.manifest.gates.operationalOwnershipSloIncidentResponse.evidence!.incidentResponseRehearsed =
          false;
      },
      expected:
        "operationalOwnershipSloIncidentResponse.evidence.incidentResponseRehearsed",
    },
    {
      label: "thresholds registered after qualification reports",
      mutate: (fixture: ReturnType<typeof createApprovedFixture>) => {
        fixture.manifest.gates.loadAccessibilityPerformanceQualification.evidence!.thresholdsRegisteredAt =
          "2026-07-25T10:30:00.000Z";
      },
      expected:
        "loadAccessibilityPerformanceQualification.evidence.thresholdsRegisteredAt must predate",
    },
    {
      label: "load thresholds not met",
      mutate: (fixture: ReturnType<typeof createApprovedFixture>) => {
        fixture.manifest.gates.loadAccessibilityPerformanceQualification.evidence!.loadThresholdsMet =
          false;
      },
      expected:
        "loadAccessibilityPerformanceQualification.evidence.loadThresholdsMet",
    },
    {
      label: "critical accessibility finding",
      mutate: (fixture: ReturnType<typeof createApprovedFixture>) => {
        fixture.manifest.gates.loadAccessibilityPerformanceQualification.evidence!.criticalAccessibilityFindings =
          1;
      },
      expected:
        "loadAccessibilityPerformanceQualification.evidence.criticalAccessibilityFindings",
    },
    {
      label: "serious accessibility finding",
      mutate: (fixture: ReturnType<typeof createApprovedFixture>) => {
        fixture.manifest.gates.loadAccessibilityPerformanceQualification.evidence!.seriousAccessibilityFindings =
          1;
      },
      expected:
        "loadAccessibilityPerformanceQualification.evidence.seriousAccessibilityFindings",
    },
    {
      label: "performance budget miss",
      mutate: (fixture: ReturnType<typeof createApprovedFixture>) => {
        fixture.manifest.gates.loadAccessibilityPerformanceQualification.evidence!.performanceBudgetsMet =
          false;
      },
      expected:
        "loadAccessibilityPerformanceQualification.evidence.performanceBudgetsMet",
    },
    {
      label: "unverified Sites ownership",
      mutate: (fixture: ReturnType<typeof createApprovedFixture>) => {
        fixture.manifest.gates.productionSitesOwnershipHosting.evidence!.ownershipVerified =
          false;
      },
      expected: "productionSitesOwnershipHosting.evidence.ownershipVerified",
    },
  ])("rejects $label", ({ mutate, expected }) => {
    const result = runFixture(mutate);
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain(expected);
  });

  it("fails closed when an evidence URL contains malformed percent escapes", () => {
    const result = runFixture((fixture) => {
      fixture.manifest.gates.nativeLinguisticReview.evidence!.artifactUrl =
        "https://evidence.hanzi-os.com/native/%E0%A4%A";
    });
    const output = `${result.stdout}${result.stderr}`;
    expect(result.status).toBe(1);
    expect(output).toContain("nativeLinguisticReview.evidence.artifactUrl");
    expect(output).not.toContain("URIError");
  });

  it("rejects stale schemas, mismatched versions, and undeclared gate fields", () => {
    const root = mkdtempSync(join(tmpdir(), "hanzi-readiness-invalid-"));
    const invalid = structuredClone(manifest);
    invalid.schemaVersion = 1;
    invalid.contentVersion = "foundation-2099.01.1";
    (
      invalid.gates.nativeLinguisticReview as ProductionGate & {
        technicalTestsPassed?: boolean;
      }
    ).technicalTestsPassed = true;
    const invalidPath = join(root, "readiness.json");
    writeJson(invalidPath, invalid);
    const result = runVerifier(["--manifest", invalidPath]);
    rmSync(root, { recursive: true, force: true });
    const output = `${result.stdout}${result.stderr}`;
    expect(result.status).toBe(1);
    expect(output).toContain("manifest.schemaVersion must be 2");
    expect(output).toContain("contentVersion must equal content/registry.json");
    expect(output).toContain("technicalTestsPassed is not allowed");
  });

  it("does not publish stroke geometry before character content is released", () => {
    const publishedCharacterFiles = readdirSync(join(
      repositoryRoot,
      "public",
      "hanzi-data",
    ))
      .filter((name) => name.endsWith(".json"))
      .sort();
    expect(hanziDataManifest.schemaVersion).toBe(1);
    expect(hanziDataManifest.characters).toEqual([]);
    expect(publishedCharacterFiles).toEqual([]);
  });

  it("publishes the stroke-data license byte-for-byte without rewriting it", () => {
    const installedPackage = JSON.parse(readFileSync(
      join(repositoryRoot, "node_modules", hanziDataManifest.package, "package.json"),
      "utf8",
    )) as { version: string };
    const upstreamLicense = readFileSync(join(
      repositoryRoot,
      "node_modules",
      hanziDataManifest.package,
      "ARPHICPL.TXT",
    ));
    const publishedLicense = readFileSync(join(
      repositoryRoot,
      "public",
      "hanzi-data",
      "ARPHICPL.TXT",
    ));

    expect(installedPackage.version).toBe(hanziDataManifest.packageVersion);
    expect(publishedLicense).toEqual(upstreamLicense);
  });
});
