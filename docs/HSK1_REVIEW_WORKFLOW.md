# HSK1 local review workflow

This workflow assigns and imports human review for the exact HSK1 draft
manifest. It is local tooling only: it does not publish content, calibrate an
assessment, grant mastery or change runtime data.

## 1. Inspect the queue

```powershell
npm run content:hsk1:review:list
```

Choose one `batchId` and one role listed in that batch's `requiredRoles`.

## 2. Export one exact assignment

```powershell
npm run content:hsk1:review:export -- `
  --assignment-id hsk1-example-review-01 `
  --batch-id <exact-batch-id> `
  --role <required-role> `
  --assigned-by local-coordinator `
  --assignee reviewer-id `
  --assigned-at 2026-07-28T12:00:00.000Z
```

The command writes
`content/review/local/assignments/hsk1-example-review-01.json`. The directory
is ignored by Git because reviewer identity, notes and evidence references are
local working data.

The reviewer edits only the `response` object:

- set canonical UTC `reviewedAt`;
- set one decision for every exact target;
- set `outcome` to the derived overall result;
- optionally add bounded notes and evidence references.

Changing the assignment, source hash, target list or role invalidates the
assignment hash.

## 3. Import the completed response

```powershell
npm run content:hsk1:review:import -- `
  --assignment-id hsk1-example-review-01
```

A valid import creates an idempotent local receipt under
`content/review/local/receipts/`. It never edits the source draft or the
checked-in review manifest. A separate, future promotion workflow must consume
review evidence only after all required roles approve exact hashes.

Listening batches cannot receive an `audio-rights-reviewer` approval while
their reviewed recording is absent. Human review by itself also does not set a
cut score or make assessment items measurement-eligible.
