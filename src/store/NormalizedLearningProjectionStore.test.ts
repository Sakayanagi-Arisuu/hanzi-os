import { describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import { CURRENT_AUTHORITATIVE_COURSE_ID } from "../learning/authoritativeProgress";
import {
  emptyObjectiveEvidenceProjection,
  type NormalizedLearningProjectionV1,
  type NormalizedLearningProjectionV2,
  type NormalizedLearningProjectionV3,
} from "../learning/projectionProtocol";
import type { ActiveOwnerLearningScope } from "../sync/indexedDb";
import {
  bindExactProjectionAuthority,
  ownerLearningScopesMatch,
  resolveCurrentEnrollmentBootstrapDecision,
  selectExactCachedProjectionAuthority,
} from "./NormalizedLearningProjectionStore";

const projection = (
  overrides: Partial<NormalizedLearningProjectionV1> = {},
): NormalizedLearningProjectionV1 => ({
  protocolVersion: 1,
  resetEpoch: 2,
  cursor: 31,
  contentVersion: CONTENT_VERSION,
  manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  enrollment: {
    enrollmentId: "enrollment:a",
    contentVersion: CONTENT_VERSION,
    courseId: CURRENT_AUTHORITATIVE_COURSE_ID,
    manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
    releaseState: "beta",
    goal: "conversation",
  },
  activeLessonSessions: [],
  submittedLessons: [],
  objectiveEvidence: emptyObjectiveEvidenceProjection(),
  ...overrides,
});

const projectionV2 = (
  overrides: Partial<NormalizedLearningProjectionV2> = {},
): NormalizedLearningProjectionV2 => ({
  ...projection(),
  protocolVersion: 2,
  activeAssessmentSession: null,
  latestAssessmentResult: null,
  ...overrides,
});

const projectionV3 = (
  overrides: Partial<NormalizedLearningProjectionV3> = {},
): NormalizedLearningProjectionV3 => ({
  ...projectionV2(),
  protocolVersion: 3,
  activeReaderSession: null,
  ...overrides,
});

const scope = (
  ownerKey: string,
  generation = 1,
  resetEpoch = 2,
): ActiveOwnerLearningScope => ({
  ownerGeneration: { ownerKey, generation },
  resetEpoch,
});

describe("normalized learning projection runtime authority", () => {
  it("binds an exact released enrollment to authoritative progress", () => {
    const current = projection();

    expect(bindExactProjectionAuthority(current, "network")).toMatchObject({
      projection: current,
      assessmentProjection: null,
      source: "network",
      authoritativeProgress: {
        resetEpoch: current.resetEpoch,
        cursor: current.cursor,
        enrollmentId: current.enrollment?.enrollmentId,
        contentVersion: CONTENT_VERSION,
        manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
      },
    });
  });

  it("downconverts V2 for lesson progress while preserving exact assessment authority", () => {
    const current = projectionV2();
    const authority = bindExactProjectionAuthority(current, "network");

    expect(authority).toMatchObject({
      projection: {
        protocolVersion: 1,
        cursor: current.cursor,
        resetEpoch: current.resetEpoch,
      },
      assessmentProjection: current,
      source: "network",
      authoritativeProgress: {
        resetEpoch: current.resetEpoch,
        cursor: current.cursor,
      },
    });
    expect(authority?.projection).not.toHaveProperty(
      "activeAssessmentSession",
    );
    expect(authority?.projection).not.toHaveProperty(
      "latestAssessmentResult",
    );
  });

  it("derives V1/V2 views from V3 while preserving exact Reader authority", () => {
    const current = projectionV3();
    const authority = bindExactProjectionAuthority(current, "network");

    expect(authority).toMatchObject({
      projection: {
        protocolVersion: 1,
        cursor: current.cursor,
      },
      assessmentProjection: {
        protocolVersion: 2,
        cursor: current.cursor,
      },
      readerProjection: current,
      source: "network",
    });
    expect(authority?.assessmentProjection).not.toHaveProperty(
      "activeReaderSession",
    );
    expect(authority?.projection).not.toHaveProperty(
      "activeReaderSession",
    );
  });

  it("never combines a stale assessment cache with newer V1 progress", () => {
    const newerLegacy = projection({ cursor: 42 });
    const staleV2 = projectionV2({ cursor: 41 });

    expect(selectExactCachedProjectionAuthority(
      newerLegacy,
      staleV2,
    )).toMatchObject({
      projection: newerLegacy,
      assessmentProjection: null,
      source: "cache",
    });
  });

  it("prefers V2 on an equal or newer cursor and keeps V1-only fallback", () => {
    const legacy = projection({ cursor: 42 });
    const equalV2 = projectionV2({ cursor: 42 });
    const newerV2 = projectionV2({ cursor: 43 });

    expect(selectExactCachedProjectionAuthority(
      legacy,
      equalV2,
    )?.assessmentProjection).toBe(equalV2);
    expect(selectExactCachedProjectionAuthority(
      legacy,
      newerV2,
    )?.assessmentProjection).toBe(newerV2);
    expect(selectExactCachedProjectionAuthority(
      legacy,
      null,
    )).toMatchObject({
      projection: legacy,
      assessmentProjection: null,
    });
  });

  it("selects by cursor and gives V3 precedence only on an equal cursor", () => {
    const legacy = projection({ cursor: 50 });
    const assessment = projectionV2({ cursor: 49 });
    const staleReader = projectionV3({ cursor: 48 });

    expect(selectExactCachedProjectionAuthority(
      legacy,
      assessment,
      staleReader,
    )).toMatchObject({
      projection: legacy,
      assessmentProjection: null,
      readerProjection: null,
    });

    const newerAssessment = projectionV2({ cursor: 51 });
    expect(selectExactCachedProjectionAuthority(
      legacy,
      newerAssessment,
      projectionV3({ cursor: 50 }),
    )).toMatchObject({
      assessmentProjection: newerAssessment,
      readerProjection: null,
    });

    const equalReader = projectionV3({ cursor: 51 });
    expect(selectExactCachedProjectionAuthority(
      legacy,
      newerAssessment,
      equalReader,
    )).toMatchObject({
      projection: { protocolVersion: 1, cursor: 51 },
      assessmentProjection: { protocolVersion: 2, cursor: 51 },
      readerProjection: equalReader,
    });

    const readerBehindAssessment = projectionV3({ cursor: 52 });
    expect(selectExactCachedProjectionAuthority(
      legacy,
      projectionV2({ cursor: 53 }),
      readerBehindAssessment,
    )).toMatchObject({
      assessmentProjection: { protocolVersion: 2, cursor: 53 },
      readerProjection: null,
    });

    const newestReader = projectionV3({ cursor: 54 });
    expect(selectExactCachedProjectionAuthority(
      legacy,
      projectionV2({ cursor: 53 }),
      newestReader,
    )?.readerProjection).toBe(newestReader);
  });

  it("fails closed without an exact released enrollment", () => {
    expect(bindExactProjectionAuthority(
      projection({ enrollment: null }),
      "cache",
    )).toBeNull();
    expect(bindExactProjectionAuthority(projection({
      enrollment: {
        ...projection().enrollment!,
        courseId: "other-course",
      },
    }), "network")).toBeNull();
    expect(bindExactProjectionAuthority(projection({
      manifestSha256: `sha256:${"f".repeat(64)}`,
      enrollment: {
        ...projection().enrollment!,
        manifestSha256: `sha256:${"f".repeat(64)}`,
      },
    }), "network")).toBeNull();
  });

  it("matches owner authority only across the exact generation and reset", () => {
    const current = scope("account:a", 3, 7);

    expect(ownerLearningScopesMatch(current, scope("account:a", 3, 7)))
      .toBe(true);
    expect(ownerLearningScopesMatch(current, scope("account:b", 3, 7)))
      .toBe(false);
    expect(ownerLearningScopesMatch(current, scope("account:a", 4, 7)))
      .toBe(false);
    expect(ownerLearningScopesMatch(current, scope("account:a", 3, 8)))
      .toBe(false);
    expect(ownerLearningScopesMatch(current, null)).toBe(false);
  });

  it("bootstraps only an empty exact projection for a synced current owner", () => {
    const requestedScope = scope("account:a", 3, 7);
    const emptyProjection = projection({
      resetEpoch: 7,
      enrollment: null,
    });
    const decide = (overrides: Partial<Parameters<
      typeof resolveCurrentEnrollmentBootstrapDecision
    >[0]> = {}) => resolveCurrentEnrollmentBootstrapDecision({
      authenticatedAccountKey: "account:a",
      requestedScope,
      currentScope: scope("account:a", 3, 7),
      projection: emptyProjection,
      profileSynced: true,
      ...overrides,
    });

    expect(decide()).toBe("activate");
    expect(decide({ profileSynced: false })).toBe("profile-pending");
    expect(decide({
      currentScope: scope("account:a", 4, 7),
    })).toBe("scope-mismatch");
    expect(decide({
      currentScope: scope("account:a", 3, 8),
    })).toBe("scope-mismatch");
    expect(decide({
      authenticatedAccountKey: "account:b",
    })).toBe("scope-mismatch");
    expect(decide({
      projection: projection({ resetEpoch: 8, enrollment: null }),
    })).toBe("projection-mismatch");
    expect(decide({ projection: projection({ resetEpoch: 7 }) }))
      .toBe("enrollment-present");
  });

  it("rejects empty projections from a different content package", () => {
    const requestedScope = scope("account:a", 1, 2);
    const decide = (projectionValue: NormalizedLearningProjectionV1) =>
      resolveCurrentEnrollmentBootstrapDecision({
        authenticatedAccountKey: "account:a",
        requestedScope,
        currentScope: requestedScope,
        projection: projectionValue,
        profileSynced: true,
      });

    expect(decide(projection({
      enrollment: null,
      contentVersion: "other-package",
    }))).toBe("projection-mismatch");
    expect(decide(projection({
      enrollment: null,
      manifestSha256: `sha256:${"f".repeat(64)}`,
    }))).toBe("projection-mismatch");
  });
});
