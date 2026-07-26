# WS9 abuse-control foundation

## Authenticated mutation limiter

The enforced closed-alpha policies are:

| Mutation | Scope | Version | Limit/window | Rationale |
| --- | --- | --- | --- | --- |
| `POST /api/learning/attempts` | `learning.attempts.write` | `2026-07-22.v1` | 60 / 60 seconds | Human-paced answers with room for retry |
| `POST /api/learning/reviews/grade` | `learning.reviews.grade` | `2026-07-26.v1` | 120 / 600 seconds | Allows an offline review burst while bounding sustained self-rating writes |
| `POST /api/learning/lesson-sessions` | `learning.lesson-sessions.open` | `2026-07-22.v1` | 30 / 600 seconds | Bounds durable form/session creation |
| `POST /api/learning/lesson-sessions/submit` | `learning.lesson-sessions.submit` | `2026-07-22.v1` | 30 / 600 seconds | Allows finalization retries without unbounded writes |
| `POST /api/learning/lesson-sessions/abandon` | `learning.lesson-sessions.abandon` | `2026-07-22.v1` | 30 / 600 seconds | Releases active capacity through a durable transition |
| `POST /api/learning/enrollment` | `learning.enrollment.activate` | `2026-07-22.v1` | 10 / 600 seconds | Allows bootstrap retries while bounding enrollment state transitions |
| `POST /api/assessment/sessions` | `assessment.sessions.open` | `2026-07-22.v1` | 10 / 600 seconds | Bounds scarce exposure-controlled screening forms |
| `POST /api/assessment/attempts` | `assessment.attempts.write` | `2026-07-22.v1` | 40 / 600 seconds | Covers one response per issued item plus durable retries |
| `POST /api/assessment/sessions/submit` | `assessment.sessions.submit` | `2026-07-22.v1` | 10 / 600 seconds | Bounds terminal aggregate scoring and retry |
| `POST /api/assessment/sessions/abandon` | `assessment.sessions.abandon` | `2026-07-22.v1` | 10 / 600 seconds | Allows safe capacity release without unbounded transitions |
| `POST /api/learning/reader-sessions` | `learning.reader-sessions.open` | `2026-07-26.v1` | 30 / 600 seconds | Bounds durable, exposure-controlled Reader form creation |
| `POST /api/learning/reader-attempts` | `learning.reader-attempts.write` | `2026-07-26.v1` | 120 / 600 seconds | Covers three maximum-size forms plus offline retry |
| `POST /api/learning/reader-sessions/submit` | `learning.reader-sessions.submit` | `2026-07-26.v1` | 30 / 600 seconds | Bounds terminal scoring and durable retries |
| `POST /api/learning/reader-sessions/abandon` | `learning.reader-sessions.abandon` | `2026-07-26.v1` | 30 / 600 seconds | Releases an active form through a durable transition |
| `POST /api/sync` | `sync.push.write` | `2026-07-22.v1` | 120 / 300 seconds | Allows an immediate outbox-recovery burst while capping sustained large uploads at 24/minute |
| `DELETE /api/account` | `account.delete` | `2026-07-22.v1` | 3 / 3,600 seconds | Account deletion is exceptional and must not become an application loop |

All policies use a persistent fixed window, the authenticated server-resolved
user ID as the current tenant boundary, and fail closed with HTTP 503.

The server never accepts an IP address, rate-limit scope, policy version, or
identity key from the request. The D1 key is `(user_id, scope,
policy_version)`, and the counter advances with one conditional `UPSERT ...
RETURNING` statement. A policy keeps one row and resets that row when the fixed
window rolls over; changing a threshold requires a new policy version.

The limiter runs after same-origin and identity checks plus server-side user
resolution, but before JSON parsing or mutation-heavy work. Authenticated GET
requests, including sync pull and account export, do not consume mutation
quota. A rejected request returns HTTP 429,
the stable code `MUTATION_RATE_LIMITED`, `retryable: true`, `Retry-After`, and
rate-limit metadata headers. Accepted mutation responses also return limit,
remaining, reset, and policy-version headers so clients can pace an outbox. If
the persistent counter cannot be read or written, the endpoint returns
`MUTATION_RATE_LIMIT_BACKEND_UNAVAILABLE` and does not accept the mutation.

Logs must contain only the request ID and error class. Do not log authenticated
user IDs, identity emails, request bodies, IP addresses, or client-supplied
keys for rate-limit decisions.

## Migration and rollout

Migration `0001_colossal_falcon.sql` adds `mutation_rate_limits` with a foreign
key to `users`, bounded counters, and cascade deletion. Apply it before code
that enforces the policy. Because enforcement fails closed when the table is
missing, a partially rolled-out deployment rejects attempt writes instead of
silently running without abuse control.

Automated coverage verifies the limit boundary, exact-window rollover,
authenticated-user isolation, concurrent over-admission protection, route 429
headers/body, and D1 failure behavior.

Account deletion currently requires exact textual confirmation and same-origin
authentication. It does **not** yet have a verified re-authentication ceremony,
so this limiter must not be described as re-authentication. Successful deletion
cascades the user's limiter rows as part of account erasure; a future immutable
identity/re-auth design must address repeated account recreation without
retaining deleted-account PII.

## Mutation API coverage

All sixteen authenticated mutation routes currently present have their own
enforced server-owned policies. Any future reward, speech upload, billing or
admin mutation must add a separately versioned, endpoint-appropriate policy
before the route can be enabled.
