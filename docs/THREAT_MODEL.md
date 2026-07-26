# HANZI.OS threat model

Status: working security model for the closed-alpha architecture, 26 July 2026.
This document records engineering controls and residual risk. It is not an
independent security assessment and does not authorize a public release.

## Scope and security objectives

The model covers the browser application, service worker, ChatGPT identity
adapter, same-origin Next/Vinext API routes, D1 persistence, local IndexedDB and
localStorage, content packages, and the disabled internal speech-processing
adapter contract.
Sites provisioning, a branded domain, payment processing, third-party speech
providers, and support tooling are outside the deployed scope because those
features are not enabled.

Security objectives, in priority order:

1. One learner must never read, mutate, export, or delete another learner's
   data.
2. Browser-authored aggregates must never become verified learning evidence,
   prerequisite proof, mastery, rewards, or review schedules.
3. Retries, multiple tabs, offline recovery, and replay must not duplicate or
   misattribute durable learning records.
4. Unreviewed, retired, mismatched, or unpublished content must fail closed.
5. Voice data must not be uploaded or processed without an explicit,
   purpose-specific consent ledger and tenant-owned storage.
6. A release must preserve recovery, accessibility, and privacy controls rather
   than bypassing them to satisfy availability or schedule pressure.

## Assets and data classification

| Asset | Classification | Required handling |
| --- | --- | --- |
| Identity email/provider subject | Restricted identity data | Server only; never log or expose provider subject in export |
| Learning attempts and responses | Private learner data | Tenant-scoped, versioned, idempotent, exportable and deletable |
| Learning evidence/mastery | Integrity-critical learner data | Derive only from an allowed server policy and immutable activity version |
| Local learning state/outboxes | Private device data | Owner-generation guarded; purge on owner deletion or unsafe transition |
| Voice objects and derived artifacts | Sensitive biometric-adjacent data | Feature off by default; explicit consent, retention, deletion and access policy required |
| Content package and answer keys | Product integrity data | Immutable hashes, review provenance and release-state enforcement |
| Operational logs and request IDs | Internal operational data | No PII, answers, tokens, object keys or client-supplied identity keys |
| Secrets, bindings and deployment credentials | Restricted operational secrets | Platform binding only; never commit or send to the browser |

## Trust boundaries and flows

```text
Untrusted browser input
  -> strict command parser / body bounds / same-origin check
  -> authenticated server identity
  -> persistent per-user abuse policy
  -> immutable content and session authorization
  -> server scoring / transactional repository
  -> tenant-scoped D1 rows and outbox events

Local device storage
  -> owner-generation CAS
  -> per-owner durable command/snapshot outboxes
  -> authenticated API boundary

Git content source
  -> canonical SHA-256 artifacts
  -> exact-hash reviews and promotion provenance
  -> runtime registry binding
  -> course/session release gates
```

The browser is never an authority for correctness, score, mastery eligibility,
XP, streak, prerequisite completion, FSRS timing, content release state,
identity, rate-limit scope, or consent ledger state. Local-only UI projections
may remain useful offline, but cloud canonicalization must not promote them.

## Threats, controls and residual risk

| Threat | Current control | Residual risk / release action |
| --- | --- | --- |
| Cross-tenant reads or writes | Server-resolved user ID, owner predicates and composite tenant foreign keys; export/delete tests | Repeat authorization tests for every new table/API and independent review before public beta |
| Client forges a correct answer, score, XP, mastery or review schedule | Authenticated lesson, Reader and assessment use strict normalized commands with server answer keys/scoring; authenticated Review binds the exact card/revision, word/version, reset epoch, released enrollment and passed activation session before server-side no-fuzz FSRS scheduling; legacy snapshot evidence is forced unverified; review grade writes no XP or mastery | Reader still lacks a versioned session, Review rating remains self-reported/non-mastery, reward authority is disabled, and hosted behavior still needs independent verification |
| Client replays/reorders commands | Per-user idempotency key, device sequence, request hash, transactional receipts and prior-exposure checks | Load-test real D1 contention and multi-region retry behavior before release |
| Client invents or bypasses a lesson session | Server-owned session ID/version/evidence count; exact enrollment/content/lesson/prerequisite checks | Current candidate package intentionally cannot open a production session |
| Stale or modified content is served | Registry/manifest/runtime SHA-256 binding and exact-hash review workflow | Owner, license and native linguistic approvals are still absent |
| CSRF/cross-origin mutation | Same-origin mutation checks and same-origin command transport | Re-evaluate provider cookie/header behavior on the final hosted domain; add an explicit anti-CSRF token if the identity adapter requires cookies |
| Mutation flooding or retry storms | Twelve endpoint-specific persistent atomic per-user fixed-window policies cover every current mutation route | Preserve coverage for every new route, then tune with field telemetry and distributed load tests |
| XSS or hostile embedding | CSP/frame restrictions, security headers, React escaping, no arbitrary remote script surface | Run an independent header/CSP review against final Sites output and branded domain |
| Service worker leaks authenticated/private content or leaves a partial cache | Anonymous shell caching only; privacy bootstrap and policy tests; install waits for every shell task with `Promise.allSettled` before removing a failed version | Re-test final routes and cache headers after every hosting or auth change |
| Owner switch leaks local commands/state | Owner-scoped stores, owner-generation CAS and normalized command/adoption purge tests | Retain multi-tab, relogin and account-switch regressions for every new client store |
| Persisted learning state is lost during corrupt bootstrap, reset or import | One-time lazy primary/recovery selection quarantines corrupt primary data; replacement applies only after durable persistence and command enqueue | Browser storage can still fail or be cleared; hosted recovery and destructive-action drills remain release gates |
| Account deletion leaves user-linked rows | Root user deletion with foreign-key cascades; export/delete graph tests | Hosted verification and backup-retention deletion procedure remain required |
| An external outbox sink commits after account reset/deletion | D1 epoch/lease triggers, review-log aggregate/reset-epoch triggers, explicit assessment `reset-invalidated` terminal reason, and runtime publisher/repository imports disabled | Dedupe is insufficient across systems; any future sink must validate authoritative account/reset epoch at downstream commit or read time before runtime enablement |
| Logs expose PII, answers or speech object keys | Aggregate readiness logging uses a tested allow-listed envelope and server-generated request IDs; mutation routes avoid payload logging | Migrate remaining route logs to the shared logger; central sink, retention ownership and independent redaction review are not configured |
| Voice upload or processing occurs without consent | No upload route; processing adapter unavailable without flag, ledger, storage, registry and provider | Legal review, acoustic validation, retention/deletion jobs and export coverage required before enablement |
| Dependency, source or release-artifact compromise | Local lockfile policy rejects non-registry sources, missing SHA-512 integrity and unapproved install scripts; production audit is clean; proposed workflows pin actions by full commit SHA; reproducible manifest/build hash and CycloneDX 1.5 SBOM are generated locally | Default evidence is intentionally unattestable with no source revision; hosted workflows, signing, provenance verification, branch protection, dependency review, CodeQL and secret scanning/push protection remain required |
| Identity collision or unrecoverable account | Normalized email identity only within the current ChatGPT adapter | Provider-supported immutable subject and recovery are hard public-release blockers |
| Destructive account action from a stolen session | Exact confirmation phrase, same-origin check and low-frequency abuse policy | Provider-supported recent re-authentication is still required before public launch |

## Abuse cases to retain as regression tests

- Reuse an idempotency key with a different body.
- Reuse a device sequence with a different operation.
- Submit an attempt under another user's enrollment or session.
- Submit an activity version not frozen by the session.
- Submit an answer after prior exposure and try to replace the first route.
- Substitute, reorder, duplicate or mutate an assessment form or response.
- Regress a projection V2 cursor, remove an acknowledged assessment attempt or
  mutate an adopted anchor after a terminal command.
- Manufacture legacy snapshot answers/completion/XP/FSRS/mistakes.
- Substitute a review card's word/version, reuse a stale card revision, or grade
  across a reset, release or activation-session boundary.
- Open a draft, review-only, retired, hash-mismatched, unreviewed or
  prerequisite-blocked lesson.
- Cross an owner transition while another tab holds an outbox lease.
- Burst past a mutation policy boundary or roll the client clock backward.
- Reuse a stale voice consent receipt or a voice object owned by another user.
- Export one account while another tenant has structurally identical IDs.
- Delete an account with rows present in every user-linked table.

## Security release gates

Before public beta, all of the following must be evidenced rather than checked
off administratively:

- every mutation endpoint has a separately justified abuse policy and
  authorization tests;
- dependency audit, secret scan, static checks and all configured tests pass;
- final hosted headers, CSP, caching, service worker and same-origin behavior
  are verified on the branded domain;
- production release evidence is generated from a clean exact `HEAD`, and every
  approved gate binds the same source revision, content manifest hash and build
  SHA-256 digest; a local `sourceRevision: null` manifest is never an attestation;
- immutable identity/recovery and recent re-authentication for destructive
  actions are supported by the provider;
- hosted backup/restore and account deletion, including backup-retention
  expiry, are rehearsed;
- content ownership, source licensing and native linguistic review bind the
  exact production manifest hash;
- voice remains disabled unless its consent, storage, provider, retention,
  deletion and legal gates pass;
- an independent security/privacy review has no unresolved critical or high
  findings.
- the nine-gate readiness manifest has exact, attributable evidence for
  operational ownership/SLO/incident response and production-representative
  load/accessibility/performance qualification as well as the other release
  gates. As of 26 July 2026, all nine remain pending and
  `verify:production` reports 23 blockers.

Local 131-file/1,008-test Vitest, 18/18 Playwright, mobile accessibility and
three-run Lighthouse evidence (Performance 98/97/98; medians
P98/A100/BP100/SEO100, LCP 1,909 ms, CLS 0, TBT 98 ms) reduce regression risk
but do not satisfy an independent review, production-representative load
qualification or final Sites verification. The 403.7 KiB figure is a
conservative full-client-asset plus largest-hero ceiling, not an actual
initial-transfer measurement. Sites remains unverified and is intentionally
deferred until the last release step.

Billing, subscription entitlements and commerce webhooks must not be added
before these data, learning and operational gates are met. When commerce is in
scope, create a separate payment threat model; do not store card data in
HANZI.OS.
