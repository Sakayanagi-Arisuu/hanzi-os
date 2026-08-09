import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  deriveAuthoritativeReleasedLessonProgress,
  type AuthoritativeReleasedLessonProgressV1,
} from "../learning/authoritativeProgress";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import {
  toNormalizedLearningProjectionV1,
  toNormalizedLearningProjectionV2,
  toNormalizedLearningProjectionV3,
  type NormalizedLearningProjectionV1,
  type NormalizedLearningProjectionV2,
  type NormalizedLearningProjectionV3,
  type NormalizedLearningProjectionV4,
} from "../learning/projectionProtocol";
import { activateCurrentEnrollment } from "../sync/currentEnrollmentClient";
import {
  readActiveOwnerLearningScope,
  type ActiveOwnerLearningScope,
  type OwnerGeneration,
} from "../sync/indexedDb";
import {
  fetchNormalizedLearningProjectionV4,
  readValidCachedNormalizedLearningProjection,
  readValidCachedNormalizedLearningProjectionV2,
  readValidCachedNormalizedLearningProjectionV3,
  readValidCachedNormalizedLearningProjectionV4,
} from "../sync/learningProjectionClient";
import {
  LEARNING_COMMAND_QUEUE_CHANGED_EVENT,
} from "../sync/learningCommandQueueEvent";
import { useLearning } from "./LearningStore";

export type NormalizedLearningProjectionPhase =
  | "anonymous"
  | "loading"
  | "ready"
  | "unavailable"
  | "retryable";

export type NormalizedLearningProjectionSource = "cache" | "network";

export type NormalizedLearningProjectionRuntimeReason =
  | "identity-pending"
  | "profile-pending"
  | "owner-scope-unavailable"
  | "owner-scope-mismatch"
  | "authentication-required"
  | "content-unavailable"
  | "profile-unavailable"
  | "request-rejected"
  | "no-released-enrollment"
  | "network-unavailable"
  | "rate-limited"
  | "server-unavailable"
  | "invalid-response"
  | "reset-mismatch";

export type NormalizedLearningProjectionRuntimeSnapshot = {
  phase: NormalizedLearningProjectionPhase;
  /** Present only when the projection also yields exact released progress. */
  projection: NormalizedLearningProjectionV1 | null;
  /**
   * The exact V2 projection for assessment resume/result consumption. A
   * legacy-only V1 cache can still authorize lesson progress, but it never
   * synthesizes or carries assessment authority.
   */
  assessmentProjection: NormalizedLearningProjectionV2 | null;
  /**
   * The exact V3 projection carrying an immutable answer-free Reader session.
   * V1/V2 fallbacks never synthesize Reader authority.
   */
  readerProjection: NormalizedLearningProjectionV3 | null;
  /** Exact V4 aggregate used only for descriptive unique-activity breadth. */
  coverageProjection: NormalizedLearningProjectionV4 | null;
  authoritativeProgress: AuthoritativeReleasedLessonProgressV1 | null;
  ownerGeneration: OwnerGeneration | null;
  resetEpoch: number | null;
  source: NormalizedLearningProjectionSource | null;
  reason: NormalizedLearningProjectionRuntimeReason | null;
  retryAfterMs: number | null;
};

export type NormalizedLearningProjectionRuntimeValue =
  NormalizedLearningProjectionRuntimeSnapshot & {
    refresh: () => void;
  };

export type ExactProjectionAuthority = {
  projection: NormalizedLearningProjectionV1;
  assessmentProjection: NormalizedLearningProjectionV2 | null;
  readerProjection: NormalizedLearningProjectionV3 | null;
  coverageProjection: NormalizedLearningProjectionV4 | null;
  authoritativeProgress: AuthoritativeReleasedLessonProgressV1;
  source: NormalizedLearningProjectionSource;
};

const loadingSnapshot = (
  reason: Extract<
    NormalizedLearningProjectionRuntimeReason,
    "identity-pending"
  > = "identity-pending",
): NormalizedLearningProjectionRuntimeSnapshot => ({
  phase: "loading",
  projection: null,
  assessmentProjection: null,
  readerProjection: null,
  coverageProjection: null,
  authoritativeProgress: null,
  ownerGeneration: null,
  resetEpoch: null,
  source: null,
  reason,
  retryAfterMs: null,
});

const anonymousSnapshot = (): NormalizedLearningProjectionRuntimeSnapshot => ({
  phase: "anonymous",
  projection: null,
  assessmentProjection: null,
  readerProjection: null,
  coverageProjection: null,
  authoritativeProgress: null,
  ownerGeneration: null,
  resetEpoch: null,
  source: null,
  reason: null,
  retryAfterMs: null,
});

export const ownerLearningScopesMatch = (
  left: ActiveOwnerLearningScope | null,
  right: ActiveOwnerLearningScope | null,
) => Boolean(
  left
  && right
  && left.resetEpoch === right.resetEpoch
  && left.ownerGeneration.ownerKey === right.ownerGeneration.ownerKey
  && left.ownerGeneration.generation === right.ownerGeneration.generation,
);

export type CurrentEnrollmentBootstrapDecision =
  | "activate"
  | "profile-pending"
  | "scope-mismatch"
  | "projection-mismatch"
  | "enrollment-present";

/**
 * Enrollment creation is a server-owned bootstrap, never a fallback source of
 * authority. The caller must prove that the projection, authenticated account,
 * durable owner generation, reset epoch and checked-in package are still the
 * exact scope that initiated the request.
 */
export const resolveCurrentEnrollmentBootstrapDecision = (input: {
  authenticatedAccountKey: string;
  requestedScope: ActiveOwnerLearningScope;
  currentScope: ActiveOwnerLearningScope | null;
  projection: NormalizedLearningProjectionV1;
  profileSynced: boolean;
}): CurrentEnrollmentBootstrapDecision => {
  if (input.projection.enrollment !== null) return "enrollment-present";
  if (
    input.projection.resetEpoch !== input.requestedScope.resetEpoch
    || input.projection.contentVersion !== CONTENT_VERSION
    || input.projection.manifestSha256 !== CURRENT_CONTENT_MANIFEST_SHA256
  ) return "projection-mismatch";
  if (
    input.requestedScope.ownerGeneration.ownerKey
      !== input.authenticatedAccountKey
    || !ownerLearningScopesMatch(input.requestedScope, input.currentScope)
  ) return "scope-mismatch";
  return input.profileSynced ? "activate" : "profile-pending";
};

const currentEnrollmentBootstrapScopeKey = (
  scope: ActiveOwnerLearningScope,
) => [
  scope.ownerGeneration.ownerKey,
  scope.ownerGeneration.generation,
  scope.resetEpoch,
  CONTENT_VERSION,
  CURRENT_CONTENT_MANIFEST_SHA256,
].join("\u0000");

/**
 * Converts a strictly parsed, version-bound projection into UI authority. A
 * missing or non-released exact enrollment is intentionally not usable.
 */
export const bindExactProjectionAuthority = (
  projection:
    | NormalizedLearningProjectionV1
    | NormalizedLearningProjectionV2
    | NormalizedLearningProjectionV3
    | NormalizedLearningProjectionV4,
  source: NormalizedLearningProjectionSource,
): ExactProjectionAuthority | null => {
  const coverageProjection = projection.protocolVersion === 4
    ? projection
    : null;
  const readerProjection = projection.protocolVersion === 4
    ? toNormalizedLearningProjectionV3(projection)
    : projection.protocolVersion === 3
      ? projection
      : null;
  const assessmentProjection = (
    projection.protocolVersion === 4
    || projection.protocolVersion === 3
  )
    ? toNormalizedLearningProjectionV2(projection)
    : projection.protocolVersion === 2
      ? projection
      : null;
  const v1Projection = projection.protocolVersion === 1
    ? projection
    : toNormalizedLearningProjectionV1(projection);
  const authoritativeProgress =
    deriveAuthoritativeReleasedLessonProgress(v1Projection);
  return authoritativeProgress
    ? {
        projection: v1Projection,
        assessmentProjection,
        readerProjection,
        coverageProjection,
        authoritativeProgress,
        source,
      }
    : null;
};

/**
 * Selects one whole cache generation without combining stale authority from
 * another representation. Cursor wins first; V2 then V3 win equal-cursor ties
 * because their network writers commit down-converted cache views atomically.
 */
export const selectExactCachedProjectionAuthority = (
  legacyProjection: NormalizedLearningProjectionV1 | null,
  assessmentProjection: NormalizedLearningProjectionV2 | null,
  readerProjection: NormalizedLearningProjectionV3 | null = null,
  coverageProjection: NormalizedLearningProjectionV4 | null = null,
): ExactProjectionAuthority | null => {
  const legacyAuthority = legacyProjection
    ? bindExactProjectionAuthority(legacyProjection, "cache")
    : null;
  const assessmentAuthority = assessmentProjection
    ? bindExactProjectionAuthority(assessmentProjection, "cache")
    : null;
  const readerAuthority = readerProjection
    ? bindExactProjectionAuthority(readerProjection, "cache")
    : null;
  const coverageAuthority = coverageProjection
    ? bindExactProjectionAuthority(coverageProjection, "cache")
    : null;
  let selected = legacyAuthority;
  for (const candidate of [
    assessmentAuthority,
    readerAuthority,
    coverageAuthority,
  ]) {
    if (
      candidate
      && (
        selected === null
        || candidate.projection.cursor >= selected.projection.cursor
      )
    ) selected = candidate;
  }
  return selected;
};

const authoritySnapshot = (
  phase: Extract<NormalizedLearningProjectionPhase, "ready" | "retryable">,
  scope: ActiveOwnerLearningScope,
  authority: ExactProjectionAuthority | null,
  reason: NormalizedLearningProjectionRuntimeReason | null,
  retryAfterMs: number | null,
): NormalizedLearningProjectionRuntimeSnapshot => ({
  phase,
  projection: authority?.projection ?? null,
  assessmentProjection: authority?.assessmentProjection ?? null,
  readerProjection: authority?.readerProjection ?? null,
  coverageProjection: authority?.coverageProjection ?? null,
  authoritativeProgress: authority?.authoritativeProgress ?? null,
  ownerGeneration: scope.ownerGeneration,
  resetEpoch: scope.resetEpoch,
  source: authority?.source ?? null,
  reason,
  retryAfterMs,
});

const unavailableSnapshot = (
  scope: ActiveOwnerLearningScope | null,
  reason: NormalizedLearningProjectionRuntimeReason,
): NormalizedLearningProjectionRuntimeSnapshot => ({
  phase: "unavailable",
  projection: null,
  assessmentProjection: null,
  readerProjection: null,
  coverageProjection: null,
  authoritativeProgress: null,
  ownerGeneration: scope?.ownerGeneration ?? null,
  resetEpoch: scope?.resetEpoch ?? null,
  source: null,
  reason,
  retryAfterMs: null,
});

const retryableWithoutAuthoritySnapshot = (
  reason: Extract<
    NormalizedLearningProjectionRuntimeReason,
    "owner-scope-unavailable" | "owner-scope-mismatch"
  >,
): NormalizedLearningProjectionRuntimeSnapshot => ({
  phase: "retryable",
  projection: null,
  assessmentProjection: null,
  readerProjection: null,
  coverageProjection: null,
  authoritativeProgress: null,
  ownerGeneration: null,
  resetEpoch: null,
  source: null,
  reason,
  retryAfterMs: 0,
});

/**
 * Background projection refreshes must not replace an already-authorized view
 * with a full-screen loader. Authority is retained only for the exact same
 * account; identity switches still clear synchronously and fail closed.
 */
export const canRetainProjectionDuringRefresh = (
  current: NormalizedLearningProjectionRuntimeSnapshot,
  accountKey: string,
) => current.ownerGeneration?.ownerKey === accountKey
  && current.projection !== null
  && current.authoritativeProgress !== null;

const NormalizedLearningProjectionContext = createContext<
  NormalizedLearningProjectionRuntimeValue | null
>(null);

export function NormalizedLearningProjectionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { state, sync } = useLearning();
  const identityResolved = sync.session !== null;
  const authenticatedAccountKey = sync.session?.authenticated
    ? sync.session.accountKey
    : null;
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [snapshot, setSnapshot] = useState<
    NormalizedLearningProjectionRuntimeSnapshot
  >(loadingSnapshot);
  const requestGenerationRef = useRef(0);
  const permanentEnrollmentBootstrapRef = useRef<{
    scopeKey: string;
    reason: Extract<
      NormalizedLearningProjectionRuntimeReason,
      | "authentication-required"
      | "content-unavailable"
      | "profile-unavailable"
      | "request-rejected"
    >;
  } | null>(null);

  const refresh = useCallback(() => {
    setRefreshVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    window.addEventListener("online", refresh);
    window.addEventListener(LEARNING_COMMAND_QUEUE_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener(LEARNING_COMMAND_QUEUE_CHANGED_EVENT, refresh);
    };
  }, [refresh]);

  useEffect(() => {
    const requestGeneration = ++requestGenerationRef.current;
    const lifecycle = new AbortController();
    let active = true;
    const requestIsCurrent = () => active
      && requestGenerationRef.current === requestGeneration;

    if (!identityResolved) {
      setSnapshot(loadingSnapshot());
      return () => {
        active = false;
        lifecycle.abort();
      };
    }
    if (authenticatedAccountKey === null) {
      setSnapshot(anonymousSnapshot());
      return () => {
        active = false;
        lifecycle.abort();
      };
    }
    if (sync.ownerKey !== authenticatedAccountKey) {
      setSnapshot(loadingSnapshot());
      return () => {
        active = false;
        lifecycle.abort();
      };
    }

    const accountKey = authenticatedAccountKey;
    // Keep a validated same-owner view visible while the network refreshes in
    // the background. A different owner is still cleared synchronously.
    setSnapshot((current) => canRetainProjectionDuringRefresh(current, accountKey)
      ? current
      : loadingSnapshot());
    const profileSynced = state.profile.onboarded
      && sync.lastSyncedAt !== null
      && sync.pendingCount === 0;
    const publishIfCurrent = async (
      scope: ActiveOwnerLearningScope,
      next: NormalizedLearningProjectionRuntimeSnapshot,
    ) => {
      if (!requestIsCurrent()) return false;
      let currentScope: ActiveOwnerLearningScope | null;
      try {
        currentScope = await readActiveOwnerLearningScope();
      } catch {
        if (requestIsCurrent()) {
          setSnapshot(retryableWithoutAuthoritySnapshot(
            "owner-scope-unavailable",
          ));
        }
        return false;
      }
      if (
        !requestIsCurrent()
        || currentScope?.ownerGeneration.ownerKey !== accountKey
        || !ownerLearningScopesMatch(scope, currentScope)
      ) {
        if (requestIsCurrent()) {
          setSnapshot(retryableWithoutAuthoritySnapshot(
            "owner-scope-mismatch",
          ));
        }
        return false;
      }
      setSnapshot(next);
      return true;
    };

    const load = async () => {
      let scope: ActiveOwnerLearningScope | null = null;
      let cachedAuthority: ExactProjectionAuthority | null = null;
      try {
        scope = await readActiveOwnerLearningScope();
        if (!requestIsCurrent()) return;
        if (!scope) {
          setSnapshot(retryableWithoutAuthoritySnapshot(
            "owner-scope-unavailable",
          ));
          return;
        }
        if (scope.ownerGeneration.ownerKey !== accountKey) {
          setSnapshot(retryableWithoutAuthoritySnapshot(
            "owner-scope-mismatch",
          ));
          return;
        }
        const requestedScope = scope;

        const [cached, cachedV2, cachedV3, cachedV4] = await Promise.all([
          readValidCachedNormalizedLearningProjection(
            requestedScope.ownerGeneration,
            requestedScope.resetEpoch,
          ),
          readValidCachedNormalizedLearningProjectionV2(
            requestedScope.ownerGeneration,
            requestedScope.resetEpoch,
          ),
          readValidCachedNormalizedLearningProjectionV3(
            requestedScope.ownerGeneration,
            requestedScope.resetEpoch,
          ),
          readValidCachedNormalizedLearningProjectionV4(
            requestedScope.ownerGeneration,
            requestedScope.resetEpoch,
          ),
        ]);
        if (!requestIsCurrent()) return;
        cachedAuthority = selectExactCachedProjectionAuthority(
          cached?.value ?? null,
          cachedV2?.value ?? null,
          cachedV3?.value ?? null,
          cachedV4?.value ?? null,
        );
        if (cachedAuthority) {
          await publishIfCurrent(
            requestedScope,
            authoritySnapshot(
              "ready",
              requestedScope,
              cachedAuthority,
              null,
              null,
            ),
          );
        }

        const handleProjectionResult = async (
          result: Awaited<ReturnType<
            typeof fetchNormalizedLearningProjectionV4
          >>,
          allowEnrollmentBootstrap: boolean,
          retryAuthority: ExactProjectionAuthority | null,
        ): Promise<void> => {
          if (!requestIsCurrent()) return;

          if (result.state === "updated" || result.state === "not-modified") {
            const v1Projection = toNormalizedLearningProjectionV1(
              result.projection,
            );
            const authority = bindExactProjectionAuthority(
              result.projection,
              result.state === "updated" ? "network" : "cache",
            );
            if (authority) {
              await publishIfCurrent(
                requestedScope,
                authoritySnapshot(
                  "ready",
                  requestedScope,
                  authority,
                  null,
                  null,
                ),
              );
              return;
            }
            if (
              !allowEnrollmentBootstrap
              || v1Projection.enrollment !== null
            ) {
              await publishIfCurrent(
                requestedScope,
                unavailableSnapshot(
                  requestedScope,
                  "no-released-enrollment",
                ),
              );
              return;
            }

            let currentScope: ActiveOwnerLearningScope | null;
            try {
              currentScope = await readActiveOwnerLearningScope();
            } catch {
              if (requestIsCurrent()) {
                setSnapshot(retryableWithoutAuthoritySnapshot(
                  "owner-scope-unavailable",
                ));
              }
              return;
            }
            if (!requestIsCurrent()) return;
            const bootstrapDecision =
              resolveCurrentEnrollmentBootstrapDecision({
                authenticatedAccountKey: accountKey,
                requestedScope,
                currentScope,
                projection: v1Projection,
                profileSynced,
              });
            if (bootstrapDecision === "profile-pending") {
              await publishIfCurrent(
                requestedScope,
                authoritySnapshot(
                  "retryable",
                  requestedScope,
                  null,
                  "profile-pending",
                  0,
                ),
              );
              return;
            }
            if (bootstrapDecision === "scope-mismatch") {
              setSnapshot(retryableWithoutAuthoritySnapshot(
                "owner-scope-mismatch",
              ));
              return;
            }
            if (bootstrapDecision !== "activate") {
              await publishIfCurrent(
                requestedScope,
                authoritySnapshot(
                  "retryable",
                  requestedScope,
                  null,
                  "invalid-response",
                  0,
                ),
              );
              return;
            }

            const bootstrapScopeKey = currentEnrollmentBootstrapScopeKey(
              requestedScope,
            );
            const permanent = permanentEnrollmentBootstrapRef.current;
            if (permanent?.scopeKey === bootstrapScopeKey) {
              await publishIfCurrent(
                requestedScope,
                unavailableSnapshot(requestedScope, permanent.reason),
              );
              return;
            }

            const activation = await activateCurrentEnrollment({
              signal: lifecycle.signal,
            });
            if (!requestIsCurrent()) return;
            if (activation.state === "permanent-unavailable") {
              permanentEnrollmentBootstrapRef.current = {
                scopeKey: bootstrapScopeKey,
                reason: activation.reason,
              };
              await publishIfCurrent(
                requestedScope,
                unavailableSnapshot(requestedScope, activation.reason),
              );
              return;
            }
            if (activation.state === "retryable") {
              await publishIfCurrent(
                requestedScope,
                authoritySnapshot(
                  "retryable",
                  requestedScope,
                  null,
                  activation.reason,
                  activation.retryAfterMs,
                ),
              );
              return;
            }

            // The client accepts only an exact current course/package/release
            // receipt. Recheck the owner/reset CAS after that network boundary
            // before asking for the marker-backed projection update.
            let postActivationScope: ActiveOwnerLearningScope | null;
            try {
              postActivationScope = await readActiveOwnerLearningScope();
            } catch {
              if (requestIsCurrent()) {
                setSnapshot(retryableWithoutAuthoritySnapshot(
                  "owner-scope-unavailable",
                ));
              }
              return;
            }
            if (
              !requestIsCurrent()
              || !ownerLearningScopesMatch(
                requestedScope,
                postActivationScope,
              )
            ) {
              if (requestIsCurrent()) {
                setSnapshot(retryableWithoutAuthoritySnapshot(
                  "owner-scope-mismatch",
                ));
              }
              return;
            }
            const refreshed = await fetchNormalizedLearningProjectionV4({
              expectedOwnerGeneration: requestedScope.ownerGeneration,
              expectedResetEpoch: requestedScope.resetEpoch,
            });
            await handleProjectionResult(refreshed, false, null);
            return;
          }
          if (result.state === "permanent-unavailable") {
            await publishIfCurrent(
              requestedScope,
              unavailableSnapshot(requestedScope, result.reason),
            );
            return;
          }
          if (result.state === "reset-mismatch") {
            await publishIfCurrent(
              requestedScope,
              authoritySnapshot(
                "retryable",
                requestedScope,
                null,
                "reset-mismatch",
                0,
              ),
            );
            return;
          }
          await publishIfCurrent(
            requestedScope,
            authoritySnapshot(
              "retryable",
              requestedScope,
              retryAuthority,
              result.reason,
              result.retryAfterMs,
            ),
          );
        };

        const result = await fetchNormalizedLearningProjectionV4({
          expectedOwnerGeneration: requestedScope.ownerGeneration,
          expectedResetEpoch: requestedScope.resetEpoch,
        });
        await handleProjectionResult(result, true, cachedAuthority);
      } catch {
        if (!requestIsCurrent()) return;
        if (scope) {
          await publishIfCurrent(
            scope,
            authoritySnapshot(
              "retryable",
              scope,
              cachedAuthority,
              "network-unavailable",
              0,
            ),
          );
        } else {
          setSnapshot(retryableWithoutAuthoritySnapshot(
            "owner-scope-unavailable",
          ));
        }
      }
    };

    void load();
    return () => {
      active = false;
      lifecycle.abort();
    };
  }, [
    authenticatedAccountKey,
    identityResolved,
    refreshVersion,
    state.profile.onboarded,
    sync.lastSyncedAt,
    sync.ownerKey,
    sync.pendingCount,
  ]);

  const value = useMemo<NormalizedLearningProjectionRuntimeValue>(() => ({
    ...snapshot,
    refresh,
  }), [refresh, snapshot]);

  return (
    <NormalizedLearningProjectionContext.Provider value={value}>
      {children}
    </NormalizedLearningProjectionContext.Provider>
  );
}

export const useNormalizedLearningProjection = () => {
  const value = useContext(NormalizedLearningProjectionContext);
  if (!value) {
    throw new Error(
      "useNormalizedLearningProjection must be used inside "
        + "NormalizedLearningProjectionProvider",
    );
  }
  return value;
};
