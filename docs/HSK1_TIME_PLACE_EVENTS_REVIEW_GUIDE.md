# HSK1 time/place/events review guide

This guide is for the first atomic HSK1 unit promotion candidate. It is a
local reviewer handoff, not an approval, content release or mastery claim.

## Checked review material

`content/review/hsk1-time-place-events-reviewer-packet.json` contains all 425
exact-hash draft payloads grouped by six lessons, the 15 batch definitions,
45 required review slots and scripts for all 90 audio targets. The packet is
learner-hidden and deterministic; edit the source draft, not the packet.

Validate it before assigning work:

```powershell
npm run content:hsk1:unit-reviewer-packet -- --check
npm run content:hsk1:unit-reviewer-packet:validate
npm run content:hsk1:review -- validate
```

## Content review workflow

1. Choose one packet batch and one of its required roles.
2. Create an assignment with a real declared reviewer identity and canonical
   UTC timestamp:

   ```powershell
   npm run content:hsk1:review -- export --assignment-id <safe-id> --batch-id <batch-id> --role <required-role> --assigned-by <owner-id> --assignee <reviewer-id> --assigned-at <ISO-UTC>
   ```

3. Give the reviewer the checked packet and the generated local assignment.
   They must inspect every assigned target using the role checklist in the
   packet, then complete only the assignment `response` object.
4. Import the completed assignment:

   ```powershell
   npm run content:hsk1:review -- import --assignment-id <safe-id>
   ```

The import writes an idempotent local receipt only. It does not edit the source
draft, review manifest, unit handoff, release policy or runtime. Requested
changes must be applied to source and assigned again against the new hash.

## Audio production workflow

Each audio entry provides an exact transcript/script hash and a Windows-safe
`.wav` filename. Record one target per file using mono PCM signed 16-bit WAV at
16, 24, 44.1 or 48 kHz. Dialogue targets retain speaker labels; vocabulary
targets include tone-marked pinyin for pronunciation guidance.

For every asset, retain all of the following outside the checked packet until
the import contract is implemented:

- immutable asset SHA-256 and inspected WAV metadata;
- speaker identity/provenance;
- rights grant and permitted-use evidence;
- native Mandarin transcript/audio review receipt;
- independent audio-rights review receipt.

Browser TTS can remain a disclosed practice fallback, but it cannot satisfy a
release audio target. Missing or partial audio keeps the whole six-lesson unit
blocked.

## Completion boundary

Promotion remains blocked until all 45 attributable content-review slots and
all 90 reviewed/licensed audio targets bind the current unit-release digest.
Only then may a new immutable runtime package, explicit unit authorization and
idempotent promotion receipt be created. No downstream unit is authorized by
this handoff.
