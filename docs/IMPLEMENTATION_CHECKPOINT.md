# HANZI.OS implementation checkpoint

Date: 28 July 2026

This is a local engineering checkpoint, not production release evidence.

## Active HSK0-4 graduation scope

The active source of truth is now `docs/HSK4_GRADUATION_PLAN.md`. The target is
a local-first graduation and personal-study product with distinct HSK0, HSK1,
HSK2, HSK3 and HSK4 paths. Production-only operator auth, commerce, hosted
pilot, operational qualification and Sites are deferred.

Active progress: **51%**.

| Pillar | Earned / max | Current evidence |
| --- | ---: | --- |
| Application/offline learning foundation | 17 / 20 | Local lesson, Reader, Review, FSRS, persistence, recovery and responsive shell exist. |
| Mastery/evidence/remediation | 12 / 15 | Skill-separated evidence and mistake correction exist; HSK0-4 calibration does not. |
| Distinct HSK0-4 paths | 8 / 15 | Five profiles now have a cycle-safe 15-unit graph, path-specific runtime slices and fail-closed placement; calibrated placement and full level progress remain. |
| HSK0-4 content coverage | 6 / 30 | Official inventory exists and all 14 runtime lessons explicitly map 23 official vocabulary items into HSK0/1 units; task/topic/grammar mappings and HSK2-4 lessons remain absent. |
| HSK0-4 assessment/mock | 3 / 10 | Descriptive diagnostic and assessment authority exist; level exams and timed mocks do not. |
| Graduation QA/local release | 5 / 10 | Strong automated baseline and architecture docs exist; demo pack and local release candidate do not. |

The initial 42% detailed baseline replaced the earlier rough 55-60% estimate for the new
scope. It is lower because “deep HSK4 content” now has an explicit 30-point
denominator while the current runtime content remains a small foundation.
Every commit must update this percentage here and in the active roadmap.

### Active G0 slice completed

- Added exactly five learner-visible starting levels: HSK0, HSK1, HSK2, HSK3
  and HSK4. The legacy stored value `basic` remains accepted and maps to HSK1
  without creating a sixth path.
- Each level has a distinct skill-weight vector, activity set, assessment mode
  and bounded exit-evidence requirements.
- Productive pronunciation, speaking and writing requirements explicitly
  require reviewed rubrics; recognition items cannot stand in for those skills.
- Onboarding, Profile, Path, local persistence, backup import and sync protocol
  all accept the expanded level contract. Self-declaration still grants no
  lesson completion, mastery or prerequisite unlock.

### Active G1 slice completed

- Pinned the official syllabus descriptor to its URL, 406-page PDF SHA-256,
  publication/effective dates, extraction tooling versions and exact page
  ranges. The PDF itself is not redistributed and the rights decision remains
  explicitly pending.
- Added a deterministic extractor and committed data inventory for HSK1-4:
  84 task rows, 195 topics, 2,000 vocabulary entries, 1,096 recognition
  characters and 332 grammar rows.
- Added fail-closed validation for source identity, exact section counts,
  sequence, level boundaries, page ranges, duplicate IDs and required fields.
- Added a checked coverage report. The current runtime maps 23 of 2,000 official
  vocabulary entries (1.15% overall; 7.67% of the HSK1 increment), reports
  `越南` as unmatched and detects a pinyin drift for `学生`. Seven character
  records map in authoring but none are released; task/topic/grammar mappings
  remain zero.
- All four HSK completion claims remain false. Inventory presence does not
  publish content, unlock lessons or count as mastery/review evidence.

### Active G2 slice in progress

- Added an inventory-bound curriculum graph with exactly five paths and 15
  cycle-safe units. Path and unit prerequisites are explicit and HSK1-4 use
  the exact incremental inventory counts from the pinned syllabus.
- Mapped all 14 released runtime lessons to HSK0/1 units and to the exact 23
  official vocabulary records they currently teach. `越南` remains explicitly
  unmapped; no task/topic/grammar mapping was invented.
- Anonymous Path and Dashboard now use the selected graph slice. HSK0 exposes
  the four boot lessons, HSK1 retains the prerequisite bridge plus ten target
  lessons, and HSK2-4 expose no lower-level substitute while their target
  packages are unpublished.
- Placement is fail-closed: self-declaration chooses the target view only;
  the current uncalibrated diagnostic remains observed-only and grants neither
  mastery nor a prerequisite waiver.
- Expanded the D1 `profiles.starting_level` constraint with a data-preserving
  migration. Restore rehearsal proves an existing HSK2 row survives, HSK4 is
  accepted and HSK5 is rejected; authenticated sync now covers HSK4.
- G2 remains open until calibrated placement authority, topic/task/grammar
  mappings and complete per-level progress behavior exist.

## Repository state

- Branch: `codex/hsk4-graduation`
- Base commit: `5cc78673cd91445adbcad8f69286c0b9081d1d1d`
- Production checkpoint carried forward: `594cf83`.
- This branch contains a reviewed local engineering checkpoint split into
  auditable commits. No release tag, saved Sites version, deployment or
  production evidence was created.
- Commit boundaries organize the reconstructed worktree by dependency layer
  for review; intermediate commits are not a green-bisect guarantee. The full
  verification below applies to the complete branch tip.
- The committed source contains technical slices mapped to Phases 0-3; it does
  not satisfy any phase exit criterion.
- Phase 4, commerce, reviewed A0/HSK coverage, pilot evidence, hosted
  operational qualification and Sites deployment remain pending.
- The local Sites-era D1 binding and Drizzle migration packaging in
  `.openai/hosting.json` and `build/sites-vite-plugin.ts` are preparation only.
  Freeze both files until the final Sites step; no saved version or deployment
  has occurred.

## Deferred production roadmap progress estimate

Headline estimate: **55.1% of the original production roadmap** as of
28 July 2026.

This is a planning estimate, not a release claim. The nine workstreams are
weighted equally. Each workstream has at most 40 points for implemented product
and infrastructure, 30 points for repeatable local evidence, and 30 points for
hosted, human, pilot, legal or operational acceptance evidence. No production
acceptance points are claimed yet because the project still has no deployment,
reviewed content release, learner pilot, hosted recovery drill or independent
security/privacy sign-off.

| Workstream | Technical + local evidence (max 70) | Production acceptance (max 30) | Overall | Current position |
| --- | ---: | ---: | ---: | --- |
| WS1 Identity/backend/durable data | 58 | 0 | 58% | Repository boundaries, D1 schema, sync/outboxes, export/delete and local restore exist; immutable provider identity, hosted multi-device proof, PostgreSQL target and hosted recovery remain. |
| WS2 Curriculum/content production | 56 | 0 | 56% | Versioned packages, governance/import tooling, readiness projection and the verified E3a assignment persistence kernel exist; authenticated editor workflow, reviewed A0 volume, licensed audio and human approvals remain. |
| WS3 Mandarin phonology/tone | 52 | 0 | 52% | Syllable-aware technical model and validation exist; native golden approval and release evidence remain. |
| WS4 Assessment/mastery | 55 | 0 | 55% | Skill-specific server authority and evidence separation exist; adaptive calibration, confidence thresholds and pilot validity remain. |
| WS5 Release/prerequisites | 64 | 0 | 64% | Fail-closed states, prerequisites, content versions and route/server guards are broadly implemented; hosted contract proof and reviewed activation remain. |
| WS6 Unified learning evidence | 51 | 0 | 51% | Lesson, Reader, assessment and Review command/evidence paths exist; verified writing/speaking and consented acoustic scoring remain. |
| WS7 Quality/operations | 58 | 0 | 58% | Strong local unit/content/restore/E2E/Lighthouse gates include the E3a database boundary; production telemetry, staging, alert ownership, SLO and incident/rollback drills remain. |
| WS8 Performance/inclusive UX | 62 | 0 | 62% | Bundle budgets, responsive assets, offline recovery, keyboard/mobile/reduced-motion and local Lighthouse targets exist; production RUM p75 evidence remains. |
| WS9 Security/privacy/legal/SEO | 40 | 0 | 40% | Baseline headers, policy gates, dependency audit and public metadata exist; independent review, consent lifecycle, privacy operations, legal decisions and public verification remain. |

The technical/local portion is about **79% complete** (496 of 630 possible
technical/local points), while the end-to-end production acceptance portion is
still **0% claimed**. This explains why the repository can contain substantial
engineering work while `verify:production` correctly remains fail-closed.

Current bounded milestone:

- E3a assignment persistence kernel: **100%** — implementation, migration,
  restore rehearsal, focused lifecycle/integrity tests and the complete local
  baseline are green.
- E3b authenticated/authorized operator workflow: **0%** — next dependency,
  deliberately not started before E3a is green and committed.
- Sites ownership, saved version and deployment: deferred to the final step at
  the user's request.

Forecast from the current delivery pace:

- The available Git sample covers 26–28 July, not a complete seven-day
  steady-state week. It contains 21 commits, but the first 12 split a
  reconstructed checkpoint into auditable boundaries and must not be treated
  as ordinary feature throughput.
- If the later bounded-slice pace is sustained, the remaining local
  engineering can reach a feature-complete, pre-deployment candidate in about
  **2–3 weeks** (11–18 August 2026).
- A closed-alpha-ready candidate is more realistically **4–7 weeks** away
  (25 August–15 September 2026), assuming legal and native reviewers, licensed
  content/audio and pilot recruitment are available in parallel.
- Full production completion is approximately **12–16 weeks** away
  (20 October–17 November 2026) in an optimistic cross-functional path.
  A primarily solo path or delayed human review/content/pilot recruitment is
  more realistically **16–24 weeks** (17 November 2026–12 January 2027).
- These dates cannot be shortened by code throughput alone: the roadmap
  requires a 14-day, 100-person closed alpha, followed by retention/outcome
  observation including D30, plus legal, security, hosted recovery and
  operational evidence.

Progress accounting rules:

- Update this section at every green checkpoint commit, not after every test
  invocation.
- Generated migration snapshots and line counts do not increase the estimate.
- Tests increase only the local-evidence portion; they cannot close content,
  pilot, hosted, legal, security or operational acceptance gates.
- A workstream percentage moves only when a named roadmap deliverable and its
  applicable evidence are both present.

## Stabilization completed

- Reader open, attempt, submission and abandonment records now hash the same
  canonical queued command at enqueue and delivery preparation.
- Compatibility assumption: the Reader command outbox is new in this
  checkpoint and was absent from base `5cc7867`; no released v1 Reader records
  therefore require migration from pre-canonical timestamps.
- Delivery preparation rejects a valid-looking command mutation when its
  envelope or original request hash no longer matches.
- Reader dependency aliases, sequence ordering and submission dependency keys
  are checked before delivery.
- Projected Reader anchor insertion and open-receipt acknowledgement now
  perform opposing duplicate-authority checks inside serialized IndexedDB
  read/write transactions. A redundant open is terminally quarantined when the
  projected authority committed first, so it cannot be resent indefinitely.
- Regression coverage reproduces mutations of all four Reader command kinds
  and the projected-anchor/open-receipt interleaving, including coordinator
  proof that the redundant open is sent only once.
- The remediation E2E selector was aligned with the current local-practice
  wording.
- Reset E2E proves the injected cache and response are removed while allowing
  the active service worker to recreate public offline asset caches.
- All six registered content packages now retain exact immutable source
  snapshots, so historical validation no longer depends on mutable HEAD files.
- The mandatory content gate validates every registry entry and lineage edge;
  runtime-bound candidates also fail on live-source drift.
- Content mutations serialize through a repository lock, new versions validate
  the existing history before staged rename, and reviews cannot be appended
  after publication.
- `foundation-2026.07.5` is the first schema-v4 / item-catalog-v2 candidate.
  Its full authoring inventory has 74 canonical payloads: 24 lexemes, 24
  lessons, 1 graded text, 5 grammar items, 5 pronunciation items, 7 character
  items and 8 communicative-function items.
- The four new knowledge-item types are source-derived from immutable lesson
  guides, lexemes and explicit blueprints. They remain `review`, have no
  owner/license/review evidence, and character radical/stroke metadata remains
  null rather than being guessed.
- Lesson knowledge membership, typed prerequisite references/cycles, source
  reciprocity, runtime-representable lesson closure and graded-text prerequisite
  limits fail closed. Review scopes name exact targets and coverage paths must
  equal the full typed transitive dependency closure.
- Client curriculum imports a separate canonical `runtime-catalog.json` with
  24 used lexemes, 14 released lessons and 1 released story. Field allowlists
  strip item governance, review/audio metadata, hashes, draft/review payloads
  and all four new knowledge types; schema-v4 source may not import any other
  package JSON artifact.
- Catalog export rehydrates the complete immutable authoring inventory instead
  of reading sanitized runtime, preventing the 10 draft lessons from being
  dropped in the next version.
- Catalog-v4 export now reprojects core and knowledge payloads from current
  authoring sources while preserving exact source-addressed character
  artifacts. Canonical audio bindings may follow an unchanged transcript;
  incompatible text changes require explicit replacement and target removal is
  rejected until an audio-retirement workflow exists.
- Release counts use distinct reviewed payloads, not raw IDs. Empty graded
  texts, duplicate payload IDs, boolean-only audio, incomplete A0 graphs,
  relabeled HSK paths and production that skips closed-alpha gates all fail
  closed.
- The candidate has no owner/license, scoped approval, coverage claim or audio;
  24 cataloged lexemes therefore count as 0 reviewed lexemes and 64 transitive
  release-relevant items remain unready.
- A separate `content:audio:import` mutation can create future content-schema-v5
  / item-catalog-v3 candidates from a schema-v2 authoring catalog plus an exact
  descriptor. It derives canonical target/file/transcript hashes, speaker and
  rights bindings, byte-inspected WAV media metadata and timestamp alignment.
- Audio policy v1 accepts only bounded RIFF/WAVE PCM mono 16-bit bytes at an
  allow-listed sample rate. Repository-relative non-symlink source files are
  copied exclusively into a temporary package and re-read/revalidated before
  rename and registry mutation; errors clean the temporary package and retain
  the previous registry/target.
- Historical catalog schemas remain validation-compatible, but their
  uninspected audio can no longer satisfy the production audio gate. Malformed
  audio collections also fail policy assessment without throwing.
- This is tooling only: no real audio, speaker identity, license evidence,
  review, release promotion or runtime playback was added to `.07.5`.
- A separate `content:character:import` mutation can create a future
  content-schema-v6 / item-catalog-v4 candidate from the schema-v2 authoring
  catalog and an exact, complete character descriptor. It binds every
  radical, component and structure claim to package-local source records and
  every stroke count to inspected Hanzi Writer bytes.
- Character policy v1 rejects malformed UTF-8/JSON, unknown or duplicate root
  keys, oversized data, invalid paths/medians and duplicate or out-of-range
  radical stroke indices. Linguistic records must be non-empty JSON objects
  whose character key matches the target; stroke records carry the same
  record key and glyph filename. Repository-relative sources are hash-checked,
  protected from symlink/junction escape, aggregate-bounded, copied
  exclusively into a temporary package and re-read before the package rename
  and registry mutation.
- Catalog v4 distinguishes independent characters, where zero components are
  valid, from compound characters. Linguistic claims must resolve to a
  linguistic reference, stroke data must resolve to exactly one stroke
  dataset, every declared source must be used, and inspected stroke count must
  match the payload. Legacy hash-shaped character fields are release-ineligible.
- The Characters screen now stays fail-closed while no reviewed character
  projection exists. Released vocabulary is no longer repurposed as a
  character inventory, and hard-coded radical, structure and mnemonic claims
  are no longer exposed. The public build likewise publishes no stroke JSON
  until character content has passed its own release boundary.
- The bundled Arphic license is copied byte-for-byte from
  `hanzi-writer-data`; repository attributes and a regression test prevent
  newline or trailing-whitespace rewriting.
- `foundation-2026.07.6` is the first real schema-v6 / catalog-v4 character
  candidate. It copies exact source-addressed radical, IDS and stroke records
  for 一, 二, 三, 人, 你, 好 and 家 into an immutable package.
- Radical records pin Make Me a Hanzi `dictionary.txt` revision
  `618dbab8a8ddefb958763c8b4afbaa741a4460de`; structure/component records pin
  CJKVI IDS revision `86b4d16159f0079437870408f0ca186e529015db`;
  stroke bytes match `hanzi-writer-data@2.0.1` tag commit
  `ad1a9905cada18d07630acc27d438b070d753ec0` byte-for-byte.
- IDS root/self mappings, not glyph appearance, determine independent,
  left-right and top-bottom structure. Component roles remain neutral
  `graphic`; no semantic or phonetic role was invented.
- The CJKVI README delegates `ids.txt` licensing to CHISE terms. The candidate
  records `CHISE-IDS-terms` without inventing an SPDX identity; legal/license
  review remains a release blocker.
- All seven items remain `review`, owner and item/package source license remain
  null, reviews and coverage claims remain empty, and no promotion or runtime
  character exposure occurred.
- Schema-v6 routine versioning, audio import and character reimport now preserve
  and reinspect both media families. Audio replacement may reuse an ID only on
  its existing target; partial rights rotation, stale target text and silent
  artifact loss fail before registry handoff.
- Immutable package control files, nested snapshots and inherited artifacts are
  captured only through trusted regular-file paths with post-read identity
  checks. Mutation failures keep the registry and target package unchanged.
- Runtime and item prerequisite cycle checks are iterative. Matched
  item/runtime lesson closure uses a bounded reachability bitset, including
  non-lesson dependency frontiers, so a 10,000-lesson chain no longer performs
  repeated quadratic closure scans.
- `content:report` now includes a deterministic editorial-readiness projection
  bound to the exact content version, manifest, item catalog and review
  envelope. It reuses release-policy scope, precedence, dependency closure,
  self-review, audio and character semantics rather than maintaining a second
  approval model.
- The `.07.6` projection exposes 74 authoring items, 64 release-relevant items,
  74 missing owners/licenses, 25 unresolved prerequisite decisions and zero
  approvals. Draft inventory remains visible but separate from the
  release-critical queue; no payload or evidence reference is emitted.
- E2 adds `EditorialAssignmentEnvelope` schema v1 and a pure validator for one
  immutable assignment bound to exact content version, manifest, item catalog,
  accountable role, declared operators, timestamp and item/audio scope.
- The assignment contract stays outside immutable content packages,
  `reviews.json`, registry, promotion and learner runtime. It never counts as
  review, mastery, coverage or release evidence.
- E3a adds one operational `editorial_assignment_events` table outside the
  learner/user realm. Exact content streams append immutable `assigned`,
  `reassigned` and `cancelled` events through predecessor CAS and
  operator-scoped idempotency; replay independently verifies the canonical
  stream, intent, envelope and event hash plus lifecycle and active
  role/target ownership.
- The database rejects update/delete, forks, invalid transitions, overlapping
  active role/targets, oversized rows and streams, while the repository bounds
  replay to 10,000 events and 16 MiB. Restore rehearsal now covers the event
  chain and all five authority triggers.
- No real assignment row, descriptor, mutation CLI, authenticated/authorized
  operator, service/API, learner-runtime route, dashboard UI, hosted D1
  mutation, Sites version or deployment was created. Operator IDs remain
  declared strings until the next trusted-principal boundary.

## Local verification

### Current G2 partial baseline

The results below are bound to the exact G2 checkpoint worktree. Any later
edit to code, configuration or content makes this snapshot stale and requires
the applicable gates to run again before the next checkpoint commit.

- `npm run check`: pass
  - lockfile policy, typecheck, full lint, content validation and Drizzle check
  - local D1 restore rehearsal: 14 migrations, 26 restored tables, expanded
    HSK4 profile persistence, 4 editorial events and 5 editorial triggers
  - pinned HSK1-4 source/inventory validation and checked coverage report
  - Vitest: 146 files, 1,222 tests passed
  - production build and bundle policy passed; conservative client asset
    ceiling: 394.5 KiB
- `npm run test:e2e`: 19 tests passed
- `npm run test:lighthouse`: three cold-profile runs
  - Performance: 96 / 94 / 98, median 96
  - Accessibility: 100
  - Best Practices: 100
  - SEO: 100
  - Median LCP: 1,905 ms; CLS: 0; TBT: 175 ms
- `npm audit --omit=dev`: 0 vulnerabilities
- `git diff --check`: pass

## Deliberately pending release evidence

`verify:production` must remain fail-closed. The readiness manifest still has
9 pending gates and 23 blockers:

- native linguistic review;
- content ownership, licensing, exact-hash approval and production promotion;
- learner pilot and assessment calibration;
- immutable provider identity and public recovery rehearsal;
- hosted backup/restore;
- independent security and privacy review;
- operational owner, on-call, SLO, alert and incident rehearsal;
- production load, accessibility and performance qualification;
- Sites ownership and production deployment verification.

The production content channel separately remains blocked by 10 policy
requirements plus registry activation. Local tests cannot close any of these
human, pilot, hosted or ownership gates.

## Next dependency-ordered milestone

1. Finish G2 with inventory-to-unit topic/task/grammar scope, calibrated
   placement authority and complete per-level progress behavior.
2. Keep all mapped/imported content unpublished until its schema, provenance and
   applicable linguistic checks pass.
3. Leave operator auth, commerce, hosted pilot and Sites frozen until the
   active HSK0-4 graduation roadmap is complete or the user explicitly resumes
   production work.

Use one bounded G0-G5 slice at a time and end each commit with updated active
progress in both roadmap and checkpoint.
