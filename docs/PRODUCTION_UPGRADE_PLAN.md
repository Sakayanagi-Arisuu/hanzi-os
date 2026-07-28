# HANZI.OS Production Upgrade Plan

## 1. North star

HANZI.OS must help a learner demonstrably retain and use Mandarin for the goal they selected. XP, ranks, streaks and visual effects support that outcome; they never substitute for evidence of learning.

Target states:

- Prototype excellence: every visible workflow is coherent, accurate, responsive, recoverable and honestly scoped.
- Production excellence: accounts, cloud sync, versioned content, defensible mastery measurement, observability, security, privacy, billing readiness and operational ownership.
- Commercial claims are limited to outcomes validated by content coverage and learner data.

## 2. Delivery principles

1. Stabilize correctness before expanding the feature surface.
2. Keep the current frontend and evolve toward a modular monolith before splitting services.
3. Store every learning attempt as versioned evidence, not only an aggregate score.
4. Require native-speaker/editor review for released Mandarin content.
5. Make every release reversible and observable.
6. Do not unlock, recommend or score content that is not production-ready.

## 3. Workstreams mapped to the nine findings

### WS1 - Identity, backend and durable learning data

Scope:

- Add email/OAuth/WebAuthn-ready authentication and anonymous-to-account migration.
- Introduce a TypeScript backend boundary with PostgreSQL as the source of truth.
- Model users, profiles, enrollments, course versions, attempts, mastery evidence, FSRS cards and review logs.
- Use idempotency keys for lesson completion, XP awards and review grading.
- Add encrypted cloud sync, conflict resolution, export, import and account deletion.
- Preserve an offline queue so study can continue without a network connection.
- Add admin-only product analytics and support tooling without exposing one learner's progress to another.

Acceptance gate:

- The same account resumes on two devices with no lost or duplicated attempt.
- Clearing browser storage does not destroy server-backed progress.
- Offline changes reconcile deterministically after reconnect.
- Backup restore and account export/delete are tested.

### WS2 - Curriculum and content production system

Scope:

- Replace the single static curriculum file with versioned content packages and a CMS/editor workflow.
- Define prerequisites for lexemes, grammar, pronunciation, characters and communicative functions.
- Build separate goal paths for conversation, HSK, travel and work instead of relabeling one path.
- Add licensed/native audio, transcript alignment, attribution and content licensing metadata.
- Add distractor review, difficulty tags, explanation rubrics and automated content linting.
- Expand in release gates: A0 foundation, complete HSK 1, HSK 2, then goal-specific tracks.

Acceptance gate:

- Closed alpha: 300-500 reviewed lexemes and a complete A0 path.
- Public beta: complete declared HSK 1-2 coverage, at least 40 graded texts and native audio for released core content.
- Every published item has an owner, version, review status, source/license and prerequisite mapping.
- No UI claims a level or goal that the released content cannot support.

### WS3 - Correct Mandarin phonology and tone model

Scope:

- Replace one `tone` value per word with syllable-level data: initial, final, lexical tone, surface tone and neutral tone.
- Model tone sandhi for third-tone pairs, 不 and 一 without overwriting dictionary forms.
- Generate tone questions per syllable or explicitly identified tone pair.
- Add schema validation that rejects inconsistent pinyin and numbered pinyin.
- Add native-speaker golden fixtures for every generated pronunciation exercise.

Acceptance gate:

- Multi-syllable words can never be graded as having one undifferentiated tone.
- All phonology fixtures pass automated tests and linguistic review.
- Released pronunciation explanations distinguish lexical tone from contextual realization.

### WS4 - Defensible assessment and mastery

Scope:

- Replace the fixed 10-question diagnostic with a versioned item bank and adaptive routing by skill.
- Record evidence separately for pronunciation, listening, speaking, reading, writing, vocabulary and grammar.
- Never infer untested speaking/writing ability from recognition questions or self-declared level.
- Add item difficulty, discrimination, exposure control and confidence intervals.
- Use objective tasks where possible; keep self-rating limited to FSRS recall difficulty.
- Calibrate thresholds with pilot data before mapping scores to HSK or outcome claims.

Acceptance gate:

- Diagnostic reliability and routing accuracy meet predefined pilot thresholds.
- Mastery displays confidence and evidence count, not a naked percentage.
- A skill changes only from evidence valid for that skill.
- Repeat tests draw equivalent forms and control memorization.

### WS5 - Release-state and prerequisite enforcement

Scope:

- Make lesson state explicit: `draft`, `review`, `beta`, `published`, `retired`.
- Enforce state and prerequisites in navigation, recommendation and server APIs.
- Exclude unpublished lessons from progress denominators and daily missions.
- Add route-level guards and content-version compatibility checks.

Acceptance gate:

- Draft/unavailable lessons cannot be opened by URL, unlocked, counted or recommended.
- Contract tests cover every state transition and prerequisite edge case.
- Retiring a lesson does not corrupt historical attempts.

### WS6 - Unified evidence from every practice mode

Scope:

- Define one `LearningEvidence` contract for lessons, reader, writing, pronunciation, mistakes and review.
- Connect Hanzi Writer completion, reader comprehension and pronunciation attempts to the learning store/backend.
- Upgrade speech scoring from transcript overlap to a consented server pipeline with ASR, forced alignment and tone/phoneme feedback.
- Separate practice completion, accuracy and verified mastery.
- Make daily missions complete only when valid evidence is recorded.

Acceptance gate:

- Every core practice produces inspectable evidence and updates only relevant skills.
- Writing and speaking tasks cannot award mastery from page visits or button presses.
- Speech UI states browser recognition limitations until acoustic scoring is available.

### WS7 - Quality engineering and operations

Scope:

- Add ESLint, unit tests, component tests, contract tests, Playwright E2E, accessibility checks and visual regression.
- Add content schema tests and linguistic golden tests.
- Establish CI gates for typecheck, lint, tests, build, dependency audit and bundle budgets.
- Add error reporting, structured logs, release health, uptime checks and privacy-aware product analytics.
- Add feature flags, migration tests, staging and rollback procedures.

Acceptance gate:

- Critical learning, auth, sync, payment and data-migration paths have automated coverage.
- No production deploy can bypass CI gates.
- A release can be detected as unhealthy and rolled back within the defined SLO.
- On-call documentation identifies an owner for every critical alert.

### WS8 - Performance and inclusive UX

Scope:

- Convert the hero to responsive AVIF/WebP variants with a small fallback and explicit dimensions.
- Self-host/subset fonts, remove render-blocking imports and reduce font families/weights.
- Split CSS and routes, remove unused styles and audit eager module preloads.
- Add cache limits/versioning for Hanzi assets and resilient service-worker installation.
- Increase small text and interactive hit areas; retain reduced-motion support.
- Track real-user Core Web Vitals by mobile/desktop and connection class.

Acceptance gate:

- Mobile p75 targets: LCP <= 2.5 s, INP <= 200 ms and CLS <= 0.1.
- Lighthouse lab targets: Performance >= 95, Accessibility >= 98, Best Practices >= 95 and SEO >= 95.
- Initial compressed transfer budget <= 800 KiB, excluding optional on-demand lesson media.
- Offline install/update failures are covered by tests and recovery UI.

### WS9 - Security, privacy, legal and discoverability

Scope:

- Add CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy and frame restrictions.
- Add threat modeling, dependency scanning, secret scanning, rate limiting and authorization tests.
- Publish privacy, terms, cookie/analytics disclosure and a separate voice-data consent flow.
- Define retention, export and deletion policies, including safeguards for minors.
- Add valid robots.txt, sitemap, canonical URLs and indexable public learning pages while keeping private app routes controlled.
- Move to a branded custom domain before paid launch.

Acceptance gate:

- No critical/high findings in the launch security review.
- Authorization tests prove tenant/user isolation.
- Privacy requests and voice-consent withdrawal work end to end.
- Security headers and SEO resources are verified against the public deployment.

## 4. Phased roadmap

### Phase 0 - Stabilize the prototype (Weeks 1-3)

- Fix WS3 tone correctness and WS5 availability enforcement.
- Connect current practice evidence under WS6 without changing the backend yet.
- Add the first WS7 unit/E2E/content tests.
- Complete WS8 image/font optimization and WS9 headers/robots/legal placeholders.

Exit criteria:

- Prototype score >= 9.5/10.
- No known factual Mandarin defect or inaccessible placeholder path.
- Lighthouse mobile performance >= 90 and all current critical flows covered by E2E smoke tests.

Implementation status (26/07/2026): the bootstrap shell lazy-loads the browser
runtime; its `LearningProvider` recovers persisted state before sync and gated
routes consume it, while route surfaces lazy-load separately. Responsive hero
variants stay within the current bundle budget. Local mobile E2E covers focus
trap/restore, keyboard
radiogroups, reduced motion and horizontal overflow. The service worker waits
for every shell-cache task before cleanup, preventing a slower task from
recreating partial caches after an install failure. This is local technical
evidence only; factual Mandarin review and final hosted behavior remain pending.

### Phase 1 - Durable foundation (Weeks 4-9)

- Implement WS1 accounts, PostgreSQL data model, cloud sync and offline outbox.
- Version curriculum and attempts; migrate local profiles safely.
- Add observability, staging, migrations and rollback.

Implementation status (26/07/2026): the closed-alpha slice now has optional
ChatGPT identity, a versioned D1 schema and migrations, server-owned authorization,
per-owner IndexedDB outbox with an owner-generation CAS, deterministic conflict
resolution, retry-safe idempotency, reset-aware anonymous-to-account adoption,
export and account deletion. The server preserves committed immutable evidence,
re-grades objective answers against the released item bank and prevents a
backdated repeat from becoming fresh mastery evidence. The local migration and
restore rehearsal applies 12 migrations `0000`–`0011` across 25 tables.
Migration `0008`
adds assessment terminal reasons, rejects invalid terminal state and changes
started sessions superseded by reset to `abandoned/reset-invalidated`; the
rehearsal verifies the outbox epoch/lease and terminal-reason triggers.
Migration `0009` adds lesson-session activation authority to FSRS cards, while
`0010` makes authoritative-card uniqueness scheduler-aware and adds review
outbox epoch triggers. Built migrations have the same SHA-256 as their sources.
Migration `0011` adds versioned Reader session/exposure/attempt authority,
terminal-state enforcement and Reader outbox epoch triggers.
D1 is an accepted Sites-era adapter; PostgreSQL
remains the production target through the repository boundary. Production
release is still blocked by Sites ownership/provisioning, a hosted backup and
restore drill, native linguistic approval, and a provider-supported immutable
identity/recovery path. Snapshot sync is for durability and does not replace a
normalized, version-aware command pipeline; authenticated lesson, Reader and
assessment now use that separate authority, and authenticated Review uses a
server-owned queue/grade authority plus durable outbox. Legacy sync remains a
compatibility projection.

Exit criteria:

- Closed-alpha data survives device change, refresh, offline use and browser reset.
- No duplicate XP/attempts under retries or double submission.
- Production score >= 7.5/10.

### Phase 2 - Learning engine and content alpha (Weeks 10-17)

- Deliver WS2 A0 content and editor workflow.
- Deliver WS4 skill-specific diagnostic and confidence-aware mastery.
- Complete unified evidence and speech pipeline beta under WS6.

Implementation status (28/07/2026): the technical assessment slice is
server-authoritative and skill-specific. Authenticated lesson, Reader and
assessment screens use owner-scoped command outboxes; projection V2 adds an
answer-free assessment resume and uncalibrated aggregate result; cross-device
adoption is monotonic and cannot synthesize a server receipt. Authenticated
Review now reads a server-owned due queue, grades only an exact
card/word/version/reset offer and revalidates the released enrollment plus
activation session at commit. Server-side `ts-fsrs` runs with fuzz disabled;
the client durably queues grades, and the resulting attempt/evidence stays
unverified, mastery-ineligible and XP-free. Export schema v4, account deletion,
reset invalidation with an explicit terminal reason and the restore rehearsal
  cover the assessment and Review/FSRS graphs. Candidate
  `foundation-2026.07.5` adds content schema v4 / item catalog v2: the full
  authoring inventory contains 74 payloads across lexeme, lesson, graded-text,
  grammar, pronunciation, character and communicative-function types. Typed
  prerequisites, lesson knowledge membership and transitive release/coverage
  closure fail closed. Client runtime reads a separate allow-listed catalog with
  only 24 used lexemes, 14 released lessons and 1 released story; draft/review
  content and governance metadata are excluded. Every registered package keeps
  exact source snapshots and the mandatory gate validates history plus lineage.

This remains a technical authoring envelope, not completed WS2. Candidate
  `foundation-2026.07.6` is unpromoted with zero coverage claims, no
  owner/package-license/native review and no audio. The 25 new knowledge items
  are `review` candidates, not publishable Mandarin content. Its seven
  character items now bind immutable radical, IDS and byte-inspected stroke
  records; the CJKVI/CHISE license identity remains explicitly pending legal
  review, every component role is neutral `graphic`, and no human approval was
  fabricated. Audio assets/review and a multi-user CMS are still absent.
  `content:report` now exposes a deterministic, exact-hash editorial-readiness
  projection for the 74-item backlog without importing authoring data into the
  learner runtime. It is read-only and does not substitute for an assignment
  store, operator authorization, human review or release evidence.
  A bounded E2 contract now defines one immutable editorial assignment bound
  to exact content-version, manifest and catalog identities, with an exact
  item/audio scope and declared operator IDs. Its pure validator does not
  persist or append assignments and no real assignment exists. There is still
  no authenticated operator, API, store, CLI mutation or dashboard UI; an
  assignment is never linguistic review, mastery or release evidence.
  A bounded schema-v5
  importer now validates package-local canonical WAV bytes, duration,
  deterministic transcript alignment, speaker evidence and rights before an
  atomic candidate handoff; legacy/uninspected audio is release-ineligible.
  A bounded schema-v6/catalog-v4 importer also requires exact coverage of the
  character inventory, immutable linguistic source records and byte-inspected
  Hanzi Writer stroke data before atomic handoff. Target record keys,
  independent and compound invariants, source use and hash drift fail closed;
  legacy character fields are release-ineligible. Schema-v6 lifecycle tooling
  now preserves and reinspects both audio and character artifacts across
  routine versioning and specialized imports, permits only same-target audio
  replacement, and rejects target removal without an explicit retirement
  workflow. Package leaves/snapshots are captured through a trusted regular-file
  boundary before staged validation. Dependency validation is iterative and
  uses a bounded reachability index; a matched 10,000-lesson item/runtime graph
  with a knowledge-item frontier is covered without quadratic closure scans. The
  Characters UI no longer promotes vocabulary-derived or hard-coded character
  claims, and no stroke geometry is copied to the public build yet. No real
  audio or human evidence was fabricated or added to the current candidate.
  The real assessment bank therefore remains unissuable. No pilot,
  calibration, item-quality dashboard, native audio, provider speech pipeline
  or 100-person alpha evidence exists; the speech adapter stays disabled and
  mastery-ineligible.

Exit criteria:

- 100-person, 14-day closed alpha completes with measurable learning gain and no material data loss.
- Linguistic QA and item-quality dashboards are operational.
- Production score >= 8.5/10.

### Phase 3 - Public beta and commerce readiness (Weeks 18-26)

- Complete declared HSK 1-2 coverage and graded-reader catalog.
- Add subscription entitlements, billing sandbox, support console and abuse controls.
- Complete WS9 privacy/security review and branded-domain migration.
- Run load, recovery and accessibility testing.

Implementation status (26/07/2026): production scaffolding now includes twelve
endpoint-specific mutation policies, a security-header drift contract,
fail-closed PWA shell installation, accessible destructive dialogs, aggregate
`/api/health/live` and `/api/health/ready` endpoints, and a nine-gate readiness
manifest that requires attributable evidence for operations, SLO/incident
response, load/accessibility/performance and the external release gates.
Local verification passes 131 files/1,021 Vitest and 18/18 E2E. The conservative
full-client-asset plus largest-hero ceiling is 406.2 KiB and is not an actual
initial-transfer measurement. Three cold-profile Lighthouse runs score
Performance 99/98/98, with medians P98/A100/BP100/SEO100, LCP 1,872 ms, CLS 0
and TBT 92 ms; `npm audit --omit=dev` reports zero.

The local release-evidence workflow generates a reproducible artifact manifest
and CycloneDX 1.5 SBOM. Its default invocation is deliberately unattestable
(`sourceRevision: null`); production mode requires a clean exact HEAD and every
approved gate to bind the same source revision, content manifest and build
SHA-256 digest. `verify:production` therefore still fails closed at nine
pending gates/23 blockers.

The typed transactional-outbox engine has local lease/CAS, retry, dead-letter
and replay tests, but its runtime remains disabled. Dedupe alone cannot fence an
external commit racing account reset/deletion; a real sink must enforce the
authoritative account/reset epoch at its commit or read boundary. No production
scheduler, sink/dedup store, hosted delivery, hosted CI enforcement, central
monitoring sink, production-representative load/recovery run, independent audit,
commerce, support console or branded-domain verification is claimed. Sites is
deliberately left to the final phase and remains unverified.

Exit criteria:

- D7/D30 retention, learning gain and willingness-to-pay meet thresholds fixed before the beta.
- SLOs, incident response, backups and restore drills pass.
- Production score >= 9.2/10.

### Phase 4 - Production excellence (Ongoing)

- Validate outcomes with controlled studies and cohort analysis.
- Expand HSK and goal tracks only behind content/evidence gates.
- Add experimentation, teacher/classroom surfaces and AI roleplay with rubric and safety controls.
- Pursue a 9.5+/10 production score through field metrics, not checklist completion alone.

Implementation status (26/07/2026): Phase 4 product surfaces are intentionally
not enabled. Controlled outcomes, experimentation, classroom roles and AI
roleplay require stable identity, reviewed content/rubrics, consent, operational
telemetry and pilot evidence that do not yet exist.

## 5. Quality scorecard

The numbers below are the initial pre-upgrade planning estimate, not a current
self-assessment or release claim.

| Dimension | Initial baseline | Prototype target | Production target |
| --- | ---: | ---: | ---: |
| Visual/interaction quality | 8.5 | 10 | 9.5+ |
| Content depth/accuracy | 3 | 9.5 | 9.5+ |
| Learning measurement | 3 | 9 | 9.5+ |
| Data durability/backend | 1.5 | 6 | 9.5+ |
| Reliability/QA | 3 | 9 | 9.5+ |
| Performance/accessibility | 6.5 | 9.5 | 9.5+ |
| Security/privacy/legal | 4 | 8 | 9.5+ |
| Operations/commercial readiness | 2 | 6 | 9.5+ |

## 6. Metrics fixed before implementation

- Learning: pre/post gain, delayed recall, speaking/writing rubric gain and false-mastery rate.
- Reliability: sync conflict rate, lost-attempt rate, crash-free sessions and migration success.
- Product: activation, lesson completion, D1/D7/D30 retention and review adherence.
- Performance: p75 LCP/INP/CLS, JS errors, API latency and offline recovery success.
- Content: defect rate, item discrimination, distractor selection and review turnaround.
- Business: conversion, churn, refund/support rate and cost per active learner.

## 7. Original dependency order

This order remains the dependency model. Technical parts of steps 1–6 now
exist, but none of that substitutes for the pending review, pilot, hosted
operations and release evidence described above.

1. Introduce tests and content schema validation.
2. Correct the tone model and block unavailable lessons.
3. Connect writing/reader/pronunciation evidence.
4. Optimize hero/fonts and add security/SEO baselines.
5. Design the versioned backend schema and local-to-cloud migration.
6. Build auth/sync/offline outbox with idempotency.
7. Stand up the content CMS and reviewed A0 curriculum.
8. Replace the diagnostic/mastery model and validate it with pilot data.
9. Add commerce only after data, learning and operational gates pass.

Schedule estimates assume a small cross-functional team. A solo implementation should retain this dependency order and release gates, but will require a longer calendar.
