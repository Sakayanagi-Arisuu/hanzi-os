# Phase 1 operations: identity, sync and D1

## Release state

The account/sync foundation is a closed-alpha capability. Anonymous study and
public legal pages remain available without identity. Cloud recovery may only be
enabled on a Sites deployment that has the `DB` binding, dispatch-owned SIWC and
an owner-confirmed access policy. A passing technical build does not override the
native linguistic review gate in `config/production-readiness.json`. Sites is
deliberately the last release step and is not verified by the local evidence
below.

## Pre-deploy gates

1. Run `npm ci` with the supported Node version.
2. Run `npm run check`, `npm run test:e2e`, `npm run test:lighthouse` and
   `npm audit --omit=dev`.
3. Confirm `npm run test:restore` passes and that the migration copied to
   `dist/.openai/drizzle` has the same SHA-256 as its source.
4. Inspect generated SQL. Migrations are forward-only; a destructive change
   requires an additive compatibility release and verified backfill first.
5. Confirm the Sites project is owned by the current workspace, SIWC is active,
   the D1 binding is provisioned and the desired access policy is visible.
6. Confirm the linguistic reviewer has recorded real approval. Never replace a
   pending status merely to make the release command pass.
7. Before public account recovery, require an immutable provider subject or a
   verified identity-link/recovery flow. The current SIWC email header is
   normalized and hashed for routing, but an email address can change and is not
   an immutable account identifier.
8. Generate strict production evidence only from a clean exact `HEAD`. Every
   approved readiness/content record must bind the same source revision, content
   manifest hash and build SHA-256 digest; an unattestable local manifest cannot
   authorize deployment.

## Staging smoke

- Anonymous `/`, `/privacy`, `/terms` and `/voice-data` load without auth.
- `/api/session` is `private, no-store`; anonymous `/api/sync` returns `401`.
- Sign in, complete one objective item, go offline, complete another item, then
  reconnect. Pending count returns to zero and a second signed-in browser sees
  both evidence IDs exactly once.
- Re-send the same operation after discarding its first HTTP response. The API
  returns the stored canonical response with `duplicate: true`.
- Reuse its idempotency key with another request hash and verify `409`.
- Switch accounts on the same browser. Account A's outbox must not upload to B.
- Export the account, reset progress, restore the export, sync, then clear browser
  storage and verify the acknowledged server revision is recovered.
- Delete the account, verify its dependent rows are gone, and sign out.
- Inspect worker logs by request ID; logs must not contain email, transcript or
  learning payloads.

## Backup and restore

Before an irreversible hosted migration, obtain a provider-supported D1 backup
or point-in-time bookmark and record its identifier outside the repository. The
local `npm run test:restore` rehearsal applies every committed migration to a new
database, creates a referentially valid learner document, copies the database,
checks integrity/foreign keys/checksum and proves the restored copy is writable.
The current rehearsal applies 12 migrations `0000`–`0011` over 25 tables. It
verifies the outbox epoch/lease triggers and migration `0008`, which adds
`assessment_sessions.terminal_reason`, enforces terminal-state coherence and
marks started sessions superseded by reset as `abandoned/reset-invalidated`.
Migration `0009` adds reset-aware lesson-session activation authority to FSRS
cards. Migration `0010` keeps legacy/unbound cards recoverable without allowing
them to block a current scheduler card, and adds insert/update triggers that
reject a `review_log` outbox event unless owner, aggregate and reset epoch match
the authoritative review log.
Migration `0011` adds the Reader session/exposure/attempt graph, terminal-state
transition enforcement and Reader outbox owner/reset-epoch triggers.

For a hosted restore:

1. Freeze cloud writes or put sync into retryable maintenance mode.
2. Capture the current migration/version, D1 backup identifier and last healthy
   sync cursor.
3. Restore into a separate database/environment; never overwrite the only copy.
4. Apply only migrations newer than the backup.
5. Run integrity, foreign-key, row-count and sampled document checksum checks.
6. Smoke pull/export against the restored environment with an owner test account.
7. Switch the binding only after verification, monitor errors/conflicts, and keep
   the prior database read-only through the rollback window.

## Rollback and incident response

- Application rollback must remain compatible with the preceding schema.
- Do not roll a destructive migration backward. Roll application traffic back,
  repair forward, or restore into a separate database.
- Alert on elevated sync `5xx`, CAS contention, idempotency/hash conflicts,
  migration failure, export/delete failure and a growing pending-outbox cohort.
- A client `5xx` is retryable: data stays in IndexedDB. A `401` pauses upload. A
  `409` requires pull/rebase or investigation; never discard the queued item.
- Security or cross-user isolation incidents require disabling cloud sync,
  preserving audit metadata, rotating affected credentials and notifying the
  accountable owner before re-enable.

## Current external blocker

As of 26 July 2026, Sites has intentionally not been re-verified because hosting
is reserved for the final release step. The last observed state on 22 July was a
persisted `project_id` returning `project not found` to the connector identity
while an older public deployment responded. Do not treat the older deployment as
current evidence, create a replacement project or deploy around the mismatch.
Restore and verify original workspace ownership/access first, then rerun hosted
smoke, headers/cache checks and the backup drill.

The SIWC headers currently available to the app do not include a documented
immutable subject. Closed-alpha participants must be told that changing the
ChatGPT account email can orphan the prior identity until a provider-supported
link/recovery flow exists. This limitation blocks public account recovery even
when the D1 and Sites gates pass.

## Latest local verification evidence

The 26 July 2026 local verification snapshot is technical evidence only; it is
not linguistic approval and does not authorize a deployment.

- `npm run check` passed typecheck, lint, Drizzle check, restore rehearsal,
  130 files/999 Vitest tests and the production build.
- The restore rehearsal applies 12 migrations `0000`–`0011`, finds 25 tables,
  verifies outbox epoch/lease, assessment terminal-reason and review-outbox epoch
  triggers, preserves the assessment and Review/FSRS graphs across reset
  invalidation, and passes SQLite integrity/foreign-key checks while proving the
  restored copy remains writable.
- The source and packaged D1 migration SHA-256 matched.
- Playwright passed 18/18 flows, including persisted lesson/assessment resume,
  offline recovery, mobile focus/keyboard/reduced-motion behavior and no
  horizontal overflow.
- The bootstrap shell lazy-loads the client runtime. Once that module runs,
  `LearningProvider` performs one-time persisted-state recovery in its lazy
  initializer before sync and gated routes consume the state; route modules are
  also lazy-loaded. Corrupt primary state is quarantined, and reset/import does
  not replace recoverable progress unless durable persistence and enqueue
  succeed.
- Service-worker install waits for all shell tasks before cleanup, closing the
  race that could recreate a partial cache after an essential fetch failed.
- The conservative full-client-asset plus largest-hero ceiling is 403.7 KiB.
  This is deliberately not described as an actual initial-transfer measurement.
  Three cold-profile Lighthouse runs scored Performance 99/98/98; medians were
  P98/A100/BP100/SEO100 with LCP 1,877 ms, CLS 0 and TBT 94 ms.
- `npm audit --omit=dev` reported zero vulnerabilities.
- `npm run release:evidence` produces a reproducible artifact manifest and
  CycloneDX 1.5 SBOM. Its default local manifest has `sourceRevision: null` and
  is explicitly unattestable; strict production mode additionally requires a
  clean exact `HEAD`.
- `npm run verify:production` remains fail-closed: all nine readiness gates are
  pending and it reports 23 blockers, including content, external review,
  hosted recovery/operations and Sites.

The transactional outbox publisher remains disconnected from runtime. Its local
lease/CAS/retry/replay tests do not solve a downstream commit racing account
reset or deletion; any future sink must enforce the authoritative account/reset
epoch at its commit or read boundary before runtime enablement.
