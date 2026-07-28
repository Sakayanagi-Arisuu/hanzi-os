# HANZI.OS Repository Guidance

## Product rule

Optimize for demonstrable Mandarin learning. XP, ranks, streaks and effects support learning but never count as mastery evidence by themselves.

## Source of truth

- Active HSK0-4 graduation roadmap: `docs/HSK4_GRADUATION_PLAN.md`
- Deferred production roadmap: `docs/PRODUCTION_UPGRADE_PLAN.md`
- Architecture target: `docs/ARCHITECTURE.md`
- Mastery model: `docs/MASTERY_SYSTEM.md`
- Content rules: `docs/CONTENT_SYSTEM.md`
- Current engineering checkpoint: `docs/IMPLEMENTATION_CHECKPOINT.md`

## Required checks

Run the checks available for the touched surface. The complete local technical
baseline is:

```powershell
npm run check
npm run test:e2e
npm run test:lighthouse
npm audit --omit=dev
```

The final release entry point is `npm run verify:production`; it must remain
fail-closed while any readiness gate or content release gate is pending. As
test/lint/policy scripts are added, they become mandatory CI and local
verification gates.

## Engineering constraints

- Do not expose, unlock, recommend or count unpublished content.
- Do not infer one skill from evidence collected for another skill.
- Store learning attempts with content/schema versions and idempotency keys.
- Keep offline recovery and local-to-cloud migration backward compatible.
- Add automated coverage for every correctness or data-loss bug fixed.
- Do not deploy factual Mandarin content without schema checks and linguistic review.
- Do not claim HSK or goal coverage beyond published, reviewed content.
- Preserve reduced-motion, keyboard and mobile usability.
- Never bypass a failing quality gate with force flags.
- Update the active HSK0-4 percentage in both the active roadmap and checkpoint
  in every commit; generated files and line counts do not earn progress.
- Keep production-only operator, commerce, hosted pilot and Sites work out of
  the active critical path until the user explicitly resumes it.
- Read the current checkpoint before starting a new phase; do not repeat a
  completed slice or expand an uncommitted checkpoint.
