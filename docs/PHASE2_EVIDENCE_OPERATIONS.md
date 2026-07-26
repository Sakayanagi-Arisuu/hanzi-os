# Phase 2A evidence operations

## Release state

Phase 2A adds normalized lesson, Reader, assessment and Review/FSRS authority
without replacing the Phase 1 compatibility snapshot. Authenticated learner
screens are connected to a command outbox plus normalized projection or review
queue; anonymous assessment and Review continue in separate local-only flows.
The real release policy still rejects session/card activation because
`foundation-2026.07.3` is an unpromoted closed-alpha candidate. Passing
injected-fixture tests does not authorize deployment or any mastery, HSK,
writing or speaking claim.

`config/production-readiness.json` now tracks nine independent external gates:
native linguistic review, content release activation, assessment
pilot/calibration, immutable identity/recovery, hosted restore, independent
security/privacy review, operational ownership/SLO/incident response,
load/accessibility/performance qualification and production Sites
ownership/hosting. Every gate is `pending`; technical tests are not substitutes
for their evidence. On 26 July 2026, `verify:production` reports all nine gates
pending and stops on 23 blockers; Sites remains deliberately unverified until
the final deployment phase.

## Objective attempt boundary

`POST /api/learning/attempts` accepts only bounded, same-origin, authenticated
lesson and reader answer commands for the current content version. A client can
send the selected answer, hint use, optional duration, stable idempotency key,
device sequence, and versioned activity identity. It cannot send an answer key,
correctness, score, verification status, or mastery eligibility.

The server resolves the released answer key, derives the skill and result, and
writes the idempotency record, attempt, evidence, enrollment activity, and
outbox event in one D1 batch. A retry with the same payload returns the stored
receipt; key or device-sequence reuse with another payload fails closed.

Lesson attempts require a server-issued `lesson_sessions` row belonging to the
same user, active enrollment, content version, lesson ID, and lesson version.
`AuthenticatedLessonPage` now opens, resumes, answers, submits and abandons
these rows through the durable command outbox. The current unpromoted package,
not missing UI wiring, keeps the default real path fail-closed.

Reader authenticated builds the same strict objective-attempt command and shows
only the acknowledged server result. Reader answers are objectively scored and
inspectable, but remain mastery-ineligible until a versioned reader session can
prove support and exposure state. Anonymous Reader remains a local practice
flow under the local evidence policy.

The endpoint does not rebuild the Phase 1 compatibility snapshot. The durable
per-owner command outbox, transactional change markers and normalized
projection are now the authenticated UI authority. `/api/sync` remains a
recovery/compatibility boundary and cannot promote its browser-authored
aggregates.

## Compatibility evidence policy

`src/lib/evidencePolicy.ts` is the allow-list for source, method, and skill
combinations in the existing local envelope. Browser transcript, Hanzi Writer
callback, remediation self-check, and FSRS self-rating are always unverified
and mastery-ineligible locally. This prevents anonymous or offline study from
showing temporary false mastery before a cloud re-grade.

The legacy `/api/sync` snapshot is now deliberately fail-closed for aggregates
that the browser can author without a server command:

- answer-key matches are re-scored only for inspection, stored as
  `unverified`, and cannot create knowledge, skill mastery, diagnostic routing,
  lesson completion, prerequisite unlocks, or XP;
- a client-supplied completion remains unverified even when the snapshot also
  contains every correct answer, because snapshot sync cannot prove a
  server-issued lesson session or first exposure;
- activity rows remain inspectable, but cloud canonicalization sets their XP
  to zero and clears the legacy XP baseline, daily XP, and streak;
- mistake counters and resolution flags are not imported into the canonical
  cloud projection;
- FSRS self-ratings arriving through the legacy snapshot remain unverified
  evidence; neither their timestamps nor browser card state can create a cloud
  review schedule or review count.

This means an existing closed-alpha cloud snapshot can lose legacy XP, streak,
mistake, and review projections when it is next canonicalized. That is an
intentional integrity migration: those values were never backed by an
authoritative ledger or server-issued review binding. Local-only state remains
available on the device. The separate normalized review-grade command can now
update an exact server-owned FSRS card and append a review log, but it deliberately
creates no XP and no mastery-eligible evidence; never copy legacy aggregates
back from the snapshot.

The authenticated, normalized session-and-attempt path is the only intended
authority for future verified evidence. `/api/sync` is a recovery/compatibility
projection only; possession of the shipped client answer key must never be
enough to unlock content.

## Speech boundary

`src/server/speechPipeline.ts` is an internal adapter contract, not an upload
API. It is unavailable by default and requires all of the following before it
can call an acoustic provider:

- an explicit feature flag;
- a current purpose-specific, versioned consent ledger;
- tenant-owned object storage with checksum, type, and size verification;
- a released, versioned speech target registry;
- a configured acoustic/forced-alignment provider.

The contract consumes an already-owned object reference and never accepts raw
audio over an HTTP route in this slice. Even a successfully processed beta
artifact is limited to the `pronunciation` skill and has
`masteryEligible: false`. Native golden fixtures, provider evaluation, pilot
thresholds, retention/deletion jobs, export/delete coverage, rate limits, and
legal approval are required before enabling an upload route.

Browser Web Speech remains a separate local-only transcript-overlap practice.
It must not be described as acoustic, tone, phoneme, or speaking mastery.

## Required verification

For Phase 2A changes, run:

```powershell
npx vitest run src/lib/evidencePolicy.test.ts src/lib/evidence.test.ts
npx vitest run src/learning/attemptProtocol.test.ts
npx vitest run src/server/attemptScoring.test.ts
npx vitest run src/server/attemptRepository.test.ts
npx vitest run src/server/attemptRoute.test.ts
npx vitest run src/learning/lessonSessionProtocol.test.ts src/server/lessonSessionRepository.test.ts src/server/lessonSessionRoute.test.ts
npx vitest run src/learning/lessonSessionSubmissionProtocol.test.ts src/server/lessonSessionSubmissionRepository.test.ts src/server/lessonSessionSubmissionRoute.test.ts
npx vitest run src/learning/lessonSessionAbandonmentProtocol.test.ts src/server/lessonSessionAbandonmentRepository.test.ts src/server/lessonSessionAbandonmentRoute.test.ts
npx vitest run src/learning/normalizedReaderCommands.test.ts
npx vitest run src/assessment/assessmentFormProtocol.test.ts src/assessment/assessmentProtocols.test.ts
npx vitest run src/assessment/normalizedAssessmentRuntime.test.ts src/assessment/normalizedAssessmentCommands.test.ts src/assessment/normalizedAssessmentUiAuthority.test.ts
npx vitest run src/server/authoritativeAssessmentItemBank.test.ts src/server/assessmentScoring.test.ts src/server/assessmentRepository.test.ts src/server/assessmentRoute.test.ts
npx vitest run src/learning/projectionProtocol.test.ts src/server/learningProjectionRepository.test.ts src/server/learningProjectionRoute.test.ts src/sync/learningProjectionClient.test.ts src/sync/ownerScopedCache.test.ts
npx vitest run src/sync/learningCommandOutbox.test.ts src/sync/learningCommandCoordinator.test.ts
npx vitest run src/sync/assessmentLearningCommandOutbox.test.ts src/sync/assessmentLearningCommandCoordinator.test.ts src/sync/projectedAssessmentSessionAdoption.test.ts
npx vitest run src/learning/reviewProtocol.test.ts src/server/reviewScheduler.test.ts src/server/reviewQueueRepository.test.ts src/server/reviewRepository.test.ts
npx vitest run src/server/reviewQueueRoute.test.ts src/server/reviewGradeRoute.test.ts src/sync/reviewQueueClient.test.ts src/sync/reviewLearningCommandOutbox.test.ts
npx vitest run src/store/NormalizedLearningProjectionStore.test.ts src/assessment/authenticatedAssessmentBundleBoundary.test.ts
npx vitest run src/server/speechPipeline.test.ts
npm run typecheck
```

Before any production deployment, the repository-wide checks and real release
gates in `AGENTS.md` and `docs/PHASE1_OPERATIONS.md` remain mandatory.

### Local verification snapshot — 26 July 2026

- Vitest passed 131 files/1,008 tests; Playwright passed 18/18 flows.
- The conservative full-client-asset plus largest-hero ceiling is 403.7 KiB.
  It is not an actual initial-transfer measurement.
- Three cold-profile Lighthouse runs scored Performance 98/97/98. The medians
  were P98/A100/BP100/SEO100 with LCP 1,909 ms, CLS 0 and TBT 98 ms.
- `npm audit --omit=dev` reported zero vulnerabilities.
- Local release-evidence tooling produces an artifact manifest and CycloneDX
  1.5 SBOM. The default run is intentionally unattestable with
  `sourceRevision: null`; it is not production provenance.

## Server-owned lesson-session opening

`POST /api/learning/lesson-sessions` is the command boundary used by the
authenticated lesson screen. The client supplies only stable device, sequence,
idempotency, enrollment, content, and lesson identifiers. The server owns the
session ID, start time, exact lesson version, and expected evidence count. It
also uses server randomness to issue an ordered form manifest with the exact
activity IDs, activity versions, methods, skills, required flags, script and
schema version. The canonical SHA-256 binds this answer-free manifest. The
receipt exposes the form and hash; the idempotency receipt, `lesson_sessions`
row, and `lesson.started` event are written in one D1 batch.

Opening is fail-closed unless the immutable current registry entry is explicitly
promoted with matching manifest-hash provenance, the tenant-owned enrollment is
active on that exact package, the D1 course row is `beta` or `published` with
approved linguistic review, and the runtime lesson is `beta` or `published`.
The current package is still an unreviewed candidate, so the real default policy
rejects every new session until the content workflow records genuine approvals
and promotion; tests use an injected promoted policy fixture only.

Prerequisites are never inferred from the Phase 1 snapshot. Every prerequisite
must have an exact-version, same-user, same-enrollment session with
`status='submitted'` and `passed=1`. This proof is now produced only by the
server-owned submission boundary below. Reusing an idempotency key with a
different payload or a device sequence with another operation fails closed.

## Server-owned lesson-session submission

`POST /api/learning/lesson-sessions/submit` accepts only a session identifier,
the server-issued form hash, current content version, and stable
idempotency/device sequencing. It never accepts client scores, correctness,
pass state, evidence counts, lesson version, or completion evidence. The server
reloads the tenant-owned started session and joins its normalized attempts to
their server-scored evidence rows.

Submission recomputes and verifies the canonical form hash, validates every
manifest entry against the exact server item bank, and requires the attempts to
equal that issued activity set. Missing, substituted, cherry-picked, duplicate,
reordered or modified forms, mismatched attempt/evidence rows, stale versions,
wrong tenants, and non-started sessions fail closed. Migration `0002` leaves
legacy sessions with nullable form columns so they remain recoverable/exportable
but can never be submitted. Raw
accuracy remains inspectable, while hinted or prior-exposure answers are
gate-ineligible. The pass gate requires at least 70% fresh, unhinted correctness
and at least 70% of the required set correct under the same policy.

The final D1 batch changes `started` to `submitted`, stores derived scores and
pass fields, appends one `lesson-completion` evidence row, and emits
`lesson.completed`; the same transaction writes an answer-free normalized
change marker. Completion evidence is verified as an aggregate record but
is always `mastery_eligible=0`; this boundary writes no XP and does not infer a
skill result from session completion. Exact retries return the stored receipt.

The authenticated lesson UI now sends submission through the dependency-aware
outbox. Issued forms prevent callers from cherry-picking easier activities, but
they are not calibrated equivalent forms and do not establish
memorization-controlled assessment reliability. The current registry candidate
still rejects new session opening and submission by default until real package
approval and promotion exist.

## Session abandonment and current-version capacity

`POST /api/learning/lesson-sessions/abandon` is an authenticated, rate-limited,
idempotent terminal transition for a tenant-owned `started` session in the
current reset epoch. It accepts no score or completion fact and never creates
mastery. The idempotency row, `started -> abandoned` transition, outbox event
and answer-free change marker commit atomically.

Abandonment intentionally permits historical or retired content versions. A
release withdrawal must not strand an active form forever. For the same reason,
the active-form cap for opening a new lesson counts only sessions from the
current content version; historical rows remain available for audit/export but
cannot block current study.

## Server-owned Review/FSRS boundary

`GET/HEAD /api/learning/reviews` is the authenticated queue authority. It
selects only due cards for the current owner and reset epoch whose enrollment,
exact promoted content, scheduler version and activation lesson session remain
valid. A lesson submission creates an authoritative card only after the exact
released session is `submitted/passed` and contains the word/version. Legacy
cards with no activation session and cards from another scheduler remain
recoverable for export but cannot block or masquerade as the current authority.

`POST /api/learning/reviews/grade` accepts a bounded same-origin command with a
stable idempotency key/device sequence and the exact offered card revision,
word/version, content version, modality, scheduler version and reset epoch. The
repository rechecks the card, release, enrollment and activation-session
binding at commit time, then advances the card with server-side `ts-fsrs`,
retention 0.9 and fuzz disabled. Stale revision, reset/release races, a substituted
word, or reuse of a key/sequence with another request fail closed.

One D1 batch persists the new card revision, an `unverified` and
`mastery_eligible=0` attempt/evidence pair, review log, `review.graded` event,
sync markers and canonical receipt. It writes no XP. The outbox event is also
guarded by database insert/update triggers that require its
`review_log` aggregate to match the same owner and reset epoch.

`AuthenticatedReviewPage` reads an owner/reset/content-scoped queue cache only
as a cold preview, then requires network validation before grade. It durably
enqueues the grade before advancing and keeps retryable offline commands pending;
permanent or reset-conflicting commands remain visible in quarantine. Anonymous
Review keeps the existing local scheduler and does not acquire cloud authority.

## Server-owned assessment boundary

The authenticated assessment screen uses four rate-limited commands:

- `POST /api/assessment/sessions` issues an answer-free form from a versioned
  server-confidential item bank and records item exposure;
- `POST /api/assessment/attempts` stores a learner response and derives the
  item outcome server-side;
- `POST /api/assessment/sessions/submit` requires exact form coverage and
  derives seven skill summaries plus the overall summary;
- `POST /api/assessment/sessions/abandon` terminates an owned active form
  without creating score, mastery or routing.

The public/client assessment bank is marked as answer-exposed and cannot issue
an authoritative form. Items with pending review, synthetic-listening
measurement, missing calibration metadata or invalid form structure fail
closed. Tests use explicit server-confidential approved fixtures; those fixtures
do not promote the real package.

Assessment attempts retain the learner response in the tenant-owned database
for audit/export, but projection V2 never returns that response, the answer key,
explanation, per-item correctness or per-item score. An active projection
contains only form position/identity and `status: recorded`. Submission exposes
aggregate `k/n`, observed accuracy and Wilson 95% intervals. Every assessment
result is uncalibrated and `masteryEligible: false`; it cannot select a route,
unlock a lesson, infer speaking/writing, map HSK or support an outcome claim.

`AssessmentPage` selects `LocalAssessmentPage` for anonymous learners and
`AuthenticatedAssessmentPage` for signed-in learners. The anonymous flow is
local, uncalibrated and mastery-ineligible. The authenticated screen can resume
same-device receipts or explicitly adopt an active session from a strict V2
cache for the same owner/reset/manifest. Adoption refreshes one logical anchor
monotonically; it never fabricates a server open receipt and rejects cursor
regression, attempt removal or mutation after a terminal dependency.

Account export schema v4 includes assessment sessions, exposures, attempts and
skill results plus tenant-owned FSRS cards and review logs, while redacting
answer-key material and assessment per-item outcome/score.
Account deletion cascades the tenant-owned assessment and Review/FSRS tables.
The local restore rehearsal seeds and checks the complete graphs and
form/response checksums across 12 migrations `0000`–`0011` and 25 tables.
Migration `0007` adds lease
state for the server transactional outbox and recovers legacy `processing` rows
without discarding delivery history. Migration `0008` adds
`assessment_sessions.terminal_reason`, enforces terminal-reason/status
coherence with insert/update triggers, and backfills started sessions superseded
by reset as `abandoned` with `reset-invalidated`. The restore sentinel verifies
the outbox epoch/lease and assessment terminal triggers. Migration `0009` adds
lesson-session activation binding to FSRS cards; migration `0010` makes the
current-card uniqueness scheduler-aware and activation-authority-only, and adds
review-outbox epoch triggers. A hosted backup/restore drill has not occurred.

The server outbox has a strict schema-v1 event contract, allow-listed projected
payloads, deterministic D1 claim order, expiring lease ownership, bounded retry
and tenant-scoped dead-letter replay. Local tests cover duplicate delivery,
poison events, expired leases, stale reset epochs and late lease completions.
This is storage and delivery-engine evidence only. Runtime imports of the
publisher/repository are disabled: dedupe does not fence a downstream commit
that races an account reset or deletion. A real sink must validate the
authoritative account/reset epoch at its commit or read boundary. No production
scheduler, downstream sink/dedup store, operator authorization surface or
hosted drain has been configured.

## Client command outbox and projection V2

IndexedDB schema version 2 adds `learning-command-outbox` alongside, without
rewriting, the Phase 1 snapshot `outbox`. It stores normalized lesson-session
open, objective attempt, lesson submit/abandon and assessment
open/attempt/submit/abandon commands plus review-grade commands under the active
owner. Every enqueue, claim, retry, quarantine, receipt mapping, and
acknowledgement checks the owner-generation record in the same transaction.
Switching accounts makes a stale tab fail closed; returning to an owner can
resume that owner's pending commands. Account deletion removes both queues.
Anonymous-to-account adoption deletes owner-bound normalized commands instead
of silently rebinding their server-session/card authority to another owner.

Lesson attempts use a local session alias only inside IndexedDB. The alias is
resolved to the acknowledged open-command receipt, and only the server-issued
`sessionId` is materialized into the attempt request. A missing, pending, or
quarantined dependency can never be sent as a lesson attempt. The dispatcher is
strict FIFO by device sequence, uses a short delivery lease, applies bounded
exponential backoff, preserves network/401/408/425/429/5xx and explicitly
retryable client failures, and quarantines permanent client rejections.
Acknowledgements retain the canonical receipt and are idempotent; a conflicting
receipt fails closed.

The production transport exposes no caller-provided URL. It can post only to
the fixed same-origin lesson-session, attempt, assessment and review-grade
endpoints, uses same-origin credentials, and rejects redirects. The existing
device-sequence allocator is shared with snapshot sync so a device maintains one
monotonic sequence domain.

IndexedDB schema version 3 adds projection, lesson-resume and assessment-resume
stores keyed by owner, reset epoch and entry key. Every cache operation checks
the active owner generation in the same transaction. Owner adoption never
reassigns a normalized resume; reset and account deletion purge only the scoped
owner. The fixed projection client accepts 200/304 only after strict protocol,
manifest, cursor and reset-header validation and never caches a mixed epoch.
V1 remains available for lesson/progress consumers and does not execute
assessment queries; V2 is separately negotiated and adds assessment state.
Atomic monotonic cache writes prevent a slower response from overwriting a
newer cursor.

The bootstrap shell lazy-loads the client runtime. When that module runs,
`LearningProvider` chooses the primary/recovery snapshot once through a lazy
initializer before sync and gated routes consume it. A corrupt primary is
quarantined instead of being silently replaced by default state, and durable
reset/import keeps the previous state unless persistence plus command enqueue
succeed. Route modules and authenticated/local assessment variants are
lazy-loaded separately.

Mobile E2E covers menu focus trap/Escape/restore, route focus, keyboard
radiogroups, reduced motion and horizontal overflow. The service-worker install
waits for every cache task with `Promise.allSettled` before deleting a failed
shell version, preventing a slower task from recreating partial caches after
cleanup. These tests are local evidence only and do not qualify the final hosted
Sites runtime.

Every open, objective-attempt, submit, abandon and review-grade transaction
appends namespaced `sync_changes` markers with its reset epoch.
`GET /api/learning/projection` returns only the exact current released
enrollment, answer-free active lesson forms, server-scored lesson attempt
summaries, submitted lesson summaries and verified objective evidence counts.
V2 additionally returns the answer-free assessment resume/result surfaces
described above; Review uses its separately validated queue endpoint.
`lesson-completion` aggregates are excluded from skill counts. A release
withdrawal returns an explicit empty projection, not a 304 that could preserve
stale unlock state.

The normalized command/projection/queue adapters are connected to authenticated
learner screens but remain governed by the real release policy. They do not
make the current candidate package releasable and do not prove that production
calls succeed: `foundation-2026.07.3` remains fail-closed. Owner-scoped resume,
projection and review-queue caches are recovery mechanisms, not independent
proof of mastery.

## Production release evidence boundary

`npm run release:evidence` can produce a reproducible artifact manifest, build
SHA-256 and CycloneDX 1.5 SBOM for diagnostics, but deliberately emits
`sourceRevision: null` and `attestable: false` by default. Strict evidence uses
`npm run release:evidence:production`: the supplied revision must equal a clean
exact `HEAD`, and approved readiness/content evidence must bind that same source
revision, content manifest hash and build digest. It cannot be used to turn a
pending external or content gate into an approval.
