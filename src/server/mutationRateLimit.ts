import type { D1Database } from "./d1";

export type MutationRateLimitPolicy = Readonly<{
  scope: string;
  policyVersion: string;
  maxRequests: number;
  windowSeconds: number;
}>;

/**
 * Closed-alpha attempt traffic is human paced. Sixty writes per minute leaves
 * room for outbox recovery while bounding automated mutation abuse.
 */
export const LEARNING_ATTEMPT_MUTATION_POLICY = {
  scope: "learning.attempts.write",
  policyVersion: "2026-07-22.v1",
  maxRequests: 60,
  windowSeconds: 60,
} as const satisfies MutationRateLimitPolicy;

/**
 * Review ratings are human paced but may be retried from an offline outbox.
 * This bounds automated schedule mutation without penalizing a short backlog.
 */
export const REVIEW_GRADE_MUTATION_POLICY = {
  scope: "learning.reviews.grade",
  policyVersion: "2026-07-26.v1",
  maxRequests: 120,
  windowSeconds: 600,
} as const satisfies MutationRateLimitPolicy;

/** Opening forms is less frequent and creates durable session/idempotency rows. */
export const LESSON_SESSION_OPEN_MUTATION_POLICY = {
  scope: "learning.lesson-sessions.open",
  policyVersion: "2026-07-22.v1",
  maxRequests: 30,
  windowSeconds: 600,
} as const satisfies MutationRateLimitPolicy;

/** Submission retries are allowed, while unbounded finalization abuse is not. */
export const LESSON_SESSION_SUBMIT_MUTATION_POLICY = {
  scope: "learning.lesson-sessions.submit",
  policyVersion: "2026-07-22.v1",
  maxRequests: 30,
  windowSeconds: 600,
} as const satisfies MutationRateLimitPolicy;

/** Abandonment releases active-form capacity but remains a durable mutation. */
export const LESSON_SESSION_ABANDON_MUTATION_POLICY = {
  scope: "learning.lesson-sessions.abandon",
  policyVersion: "2026-07-22.v1",
  maxRequests: 30,
  windowSeconds: 600,
} as const satisfies MutationRateLimitPolicy;

/** Enrollment activation is rare but must tolerate bootstrap and network retry. */
export const CURRENT_ENROLLMENT_ACTIVATE_MUTATION_POLICY = {
  scope: "learning.enrollment.activate",
  policyVersion: "2026-07-22.v1",
  maxRequests: 10,
  windowSeconds: 600,
} as const satisfies MutationRateLimitPolicy;

/** Foundation screening forms are scarce and exposure-controlled. */
export const ASSESSMENT_SESSION_OPEN_MUTATION_POLICY = {
  scope: "assessment.sessions.open",
  policyVersion: "2026-07-22.v1",
  maxRequests: 10,
  windowSeconds: 600,
} as const satisfies MutationRateLimitPolicy;

/** One objective selection per issued item, with room for outbox retries. */
export const ASSESSMENT_ATTEMPT_MUTATION_POLICY = {
  scope: "assessment.attempts.write",
  policyVersion: "2026-07-22.v1",
  maxRequests: 40,
  windowSeconds: 600,
} as const satisfies MutationRateLimitPolicy;

export const ASSESSMENT_SESSION_SUBMIT_MUTATION_POLICY = {
  scope: "assessment.sessions.submit",
  policyVersion: "2026-07-22.v1",
  maxRequests: 10,
  windowSeconds: 600,
} as const satisfies MutationRateLimitPolicy;

export const ASSESSMENT_SESSION_ABANDON_MUTATION_POLICY = {
  scope: "assessment.sessions.abandon",
  policyVersion: "2026-07-22.v1",
  maxRequests: 10,
  windowSeconds: 600,
} as const satisfies MutationRateLimitPolicy;

/**
 * Reader forms are durable and exposure-controlled, but a learner can
 * reasonably open more short stories than diagnostic forms.
 */
export const READER_SESSION_OPEN_MUTATION_POLICY = {
  scope: "learning.reader-sessions.open",
  policyVersion: "2026-07-26.v1",
  maxRequests: 30,
  windowSeconds: 600,
} as const satisfies MutationRateLimitPolicy;

/**
 * Reader responses are human paced and may arrive as one offline-recovery
 * burst. This covers three maximum-size forms while bounding automation.
 */
export const READER_ATTEMPT_MUTATION_POLICY = {
  scope: "learning.reader-attempts.write",
  policyVersion: "2026-07-26.v1",
  maxRequests: 120,
  windowSeconds: 600,
} as const satisfies MutationRateLimitPolicy;

export const READER_SESSION_SUBMIT_MUTATION_POLICY = {
  scope: "learning.reader-sessions.submit",
  policyVersion: "2026-07-26.v1",
  maxRequests: 30,
  windowSeconds: 600,
} as const satisfies MutationRateLimitPolicy;

export const READER_SESSION_ABANDON_MUTATION_POLICY = {
  scope: "learning.reader-sessions.abandon",
  policyVersion: "2026-07-26.v1",
  maxRequests: 30,
  windowSeconds: 600,
} as const satisfies MutationRateLimitPolicy;

/**
 * Sync snapshots can arrive in a recovery burst. The five-minute window allows
 * 120 immediate retries/operations while capping the sustained average at 24
 * large requests per minute.
 */
export const SYNC_PUSH_MUTATION_POLICY = {
  scope: "sync.push.write",
  policyVersion: "2026-07-22.v1",
  maxRequests: 120,
  windowSeconds: 300,
} as const satisfies MutationRateLimitPolicy;

/** Account deletion is expected to be exceptional, not an application loop. */
export const ACCOUNT_DELETE_MUTATION_POLICY = {
  scope: "account.delete",
  policyVersion: "2026-07-22.v1",
  maxRequests: 3,
  windowSeconds: 3_600,
} as const satisfies MutationRateLimitPolicy;

export type MutationRateLimitDecision = Readonly<{
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAfterSeconds: number;
  retryAfterSeconds: number;
  windowEndsAt: number;
  policyVersion: string;
}>;

export const mutationRateLimitHeaders = (
  decision: MutationRateLimitDecision,
): Record<string, string> => ({
  "ratelimit-limit": String(decision.limit),
  "ratelimit-remaining": String(decision.remaining),
  "ratelimit-reset": String(decision.resetAfterSeconds),
  "x-rate-limit-policy-version": decision.policyVersion,
  ...(decision.allowed
    ? {}
    : { "retry-after": String(decision.retryAfterSeconds) }),
});

export class MutationRateLimitBackendError extends Error {
  readonly code = "MUTATION_RATE_LIMIT_BACKEND_UNAVAILABLE";

  constructor() {
    super("Persistent mutation rate limiting is unavailable.");
    this.name = "MutationRateLimitBackendError";
  }
}

const positiveInteger = (value: number) =>
  Number.isSafeInteger(value) && value > 0;

const validatePolicy = (policy: MutationRateLimitPolicy) => {
  if (
    !policy.scope
    || policy.scope.length > 120
    || !policy.policyVersion
    || policy.policyVersion.length > 80
    || !positiveInteger(policy.maxRequests)
    || !positiveInteger(policy.windowSeconds)
  ) {
    throw new MutationRateLimitBackendError();
  }
};

type CounterRow = {
  requestCount: number;
  windowStart: number;
};

/**
 * Consumes one authenticated mutation slot with a single atomic SQLite UPSERT.
 * The caller supplies only the server-resolved user id; scope and thresholds
 * come from a server-owned, versioned policy.
 */
export async function consumeMutationRateLimit(
  database: D1Database,
  userId: string,
  policy: MutationRateLimitPolicy,
  nowMs = Date.now(),
): Promise<MutationRateLimitDecision> {
  validatePolicy(policy);
  if (!userId || !Number.isFinite(nowMs) || nowMs < 0) {
    throw new MutationRateLimitBackendError();
  }

  const windowMs = policy.windowSeconds * 1_000;
  const windowStart = Math.floor(nowMs / windowMs) * windowMs;
  const localWindowEnd = windowStart + windowMs;

  try {
    const accepted = await database
      .prepare(
        `INSERT INTO mutation_rate_limits (
           user_id, scope, policy_version, window_start, request_count, updated_at
         ) VALUES (?, ?, ?, ?, 1, ?)
         ON CONFLICT (user_id, scope, policy_version) DO UPDATE SET
           window_start = excluded.window_start,
           request_count = CASE
             WHEN mutation_rate_limits.window_start = excluded.window_start
               THEN mutation_rate_limits.request_count + 1
             ELSE 1
           END,
           updated_at = excluded.updated_at
         WHERE excluded.window_start > mutation_rate_limits.window_start
            OR (
              excluded.window_start = mutation_rate_limits.window_start
              AND mutation_rate_limits.request_count < ?
            )
         RETURNING request_count AS requestCount, window_start AS windowStart`,
      )
      .bind(
        userId,
        policy.scope,
        policy.policyVersion,
        windowStart,
        Math.floor(nowMs),
        policy.maxRequests,
      )
      .first<CounterRow>();

    if (accepted) {
      const requestCount = Number(accepted.requestCount);
      const acceptedWindowStart = Number(accepted.windowStart);
      if (
        !positiveInteger(requestCount)
        || requestCount > policy.maxRequests
        || !Number.isSafeInteger(acceptedWindowStart)
        || acceptedWindowStart !== windowStart
      ) {
        throw new MutationRateLimitBackendError();
      }
      return {
        allowed: true,
        limit: policy.maxRequests,
        remaining: policy.maxRequests - requestCount,
        resetAfterSeconds: Math.max(
          1,
          Math.ceil((localWindowEnd - nowMs) / 1_000),
        ),
        retryAfterSeconds: 0,
        windowEndsAt: localWindowEnd,
        policyVersion: policy.policyVersion,
      };
    }

    const existing = await database
      .prepare(
        `SELECT request_count AS requestCount, window_start AS windowStart
         FROM mutation_rate_limits
         WHERE user_id = ? AND scope = ? AND policy_version = ?
         LIMIT 1`,
      )
      .bind(userId, policy.scope, policy.policyVersion)
      .first<CounterRow>();
    const storedCount = Number(existing?.requestCount);
    const storedWindowStart = Number(existing?.windowStart);
    if (
      !existing
      || !positiveInteger(storedCount)
      || storedCount < policy.maxRequests
      || !Number.isSafeInteger(storedWindowStart)
      || storedWindowStart < windowStart
    ) {
      throw new MutationRateLimitBackendError();
    }
    const windowEndsAt = storedWindowStart + windowMs;
    const resetAfterSeconds = Math.max(
      1,
      Math.ceil((windowEndsAt - nowMs) / 1_000),
    );
    return {
      allowed: false,
      limit: policy.maxRequests,
      remaining: 0,
      resetAfterSeconds,
      retryAfterSeconds: resetAfterSeconds,
      windowEndsAt,
      policyVersion: policy.policyVersion,
    };
  } catch (error) {
    if (error instanceof MutationRateLimitBackendError) throw error;
    throw new MutationRateLimitBackendError();
  }
}
