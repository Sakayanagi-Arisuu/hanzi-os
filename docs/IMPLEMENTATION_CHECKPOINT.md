# HANZI.OS implementation checkpoint

Date: 26 July 2026

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

## Local verification

The results below are bound to this exact code, configuration and content
snapshot. Any later edit to those surfaces makes the snapshot stale and
requires the complete local baseline to run again before another checkpoint or
commit claim.

- `npm run check`: pass
  - lockfile policy, typecheck, full lint, content validation and Drizzle check
  - local D1 restore rehearsal: 12 migrations and 25 restored tables
  - Vitest: 130 files, 999 tests passed
  - production build and bundle policy passed
- `npm run test:e2e`: 18 tests passed
- `npm run test:lighthouse`: three cold-profile runs
  - Performance: 99 / 98 / 98, median 98
  - Accessibility: 100
  - Best Practices: 100
  - SEO: 100
  - Median LCP: 1,877 ms; CLS: 0; TBT: 94 ms
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

The production content channel separately remains blocked by 11 release
requirements. Local tests cannot close any of these human, pilot, hosted or
ownership gates.

## Next dependency-ordered milestone

1. Freeze this checkpoint; every later task must name one bounded workstream.
2. Resume Phase 2 at WS2 only: content authoring/governance workflow and the honest
   closed-alpha A0 package.
3. Obtain attributable owner, license and native linguistic review evidence.
4. Run pilot/calibration work before making assessment or coverage claims.
5. Leave Sites ownership, saved version and deployment until the final release
   step.

Do not resume the previous open-ended "Phase 2 and all later phases" goal. Use
one bounded milestone and stop at a green, reviewable checkpoint.
