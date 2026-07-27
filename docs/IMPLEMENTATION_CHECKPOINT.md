# HANZI.OS implementation checkpoint

Date: 27 July 2026

This is a local engineering checkpoint, not production release evidence.

## Repository state

- Branch: `codex/production-upgrade-checkpoint`
- Base commit: `5cc78673cd91445adbcad8f69286c0b9081d1d1d`
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
- All five registered content packages now retain exact immutable source
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
- This remains tooling only. No real character source snapshot, linguistic
  decision, owner/license evidence, scoped approval, candidate package,
  promotion or runtime character exposure was added to `.07.5`.
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

## Local verification

The results below are bound to this exact code, configuration and content
snapshot. Any later edit to those surfaces makes the snapshot stale and
requires the complete local baseline to run again before another checkpoint or
commit claim.

- `npm run check`: pass
  - lockfile policy, typecheck, full lint, content validation and Drizzle check
  - local D1 restore rehearsal: 12 migrations and 25 restored tables
  - Vitest: 137 files, 1,141 tests passed
  - production build and bundle policy passed; conservative client asset
    ceiling: 390.9 KiB
- `npm run test:e2e`: 18 tests passed
- `npm run test:lighthouse`: three cold-profile runs
  - Performance: 93 / 95 / 97, median 95
  - Accessibility: 100
  - Best Practices: 100
  - SEO: 100
  - Median LCP: 1,961 ms; CLS: 0; TBT: 221 ms
  - An immediately preceding run under local load failed at median performance
    94 after one 852 ms TBT outlier; the threshold was not lowered or bypassed.
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

1. Freeze this checkpoint; every later task must name one bounded workstream.
2. Pin licensed source revisions and import the seven existing character items
   into a new immutable candidate. Keep every enriched item in `review`; do
   not infer claims from glyph shape, and do not fabricate human approval.
3. Complete sourced character metadata through attributable linguistic and
   license review.
4. Build the multi-user editorial assignment/review dashboard, then obtain
   attributable owner, license and native linguistic review evidence.
5. Only after those gates, expand a reviewed A0 inventory and run
   pilot/calibration work before making assessment or coverage claims.
6. Leave Sites ownership, saved version and deployment until the final release
   step.

Do not resume the previous open-ended "Phase 2 and all later phases" goal. Use
one bounded milestone and stop at a green, reviewable checkpoint.
