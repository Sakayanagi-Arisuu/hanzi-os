import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildHsk3VocabularyDraft,
  HSK3_CEDICT_SOURCE_RELATIVE_PATH,
  HSK3_VOCABULARY_DRAFT_RELATIVE_PATH,
  parseCedictText,
  serializeHsk3VocabularyDraft,
  sha256,
} from "../../src/content/hsk3VocabularyDraft.mjs";
import {
  assertValidHskSyllabusBundle,
  loadHskSyllabusBundle,
} from "../../src/content/hskSyllabusInventory.mjs";

const args = process.argv.slice(2);
const sourceArgIndex = args.indexOf("--source-file");
const archiveArgIndex = args.indexOf("--archive-file");
const sourceFile = resolve(
  sourceArgIndex >= 0
    ? args[sourceArgIndex + 1]
    : "tmp/cedict-debian/cedict_ts.u8",
);
const archiveFile = resolve(
  archiveArgIndex >= 0
    ? args[archiveArgIndex + 1]
    : "tmp/cedict-debian/cc-cedict_0.0~repack20260403.orig.tar.xz",
);
const write = args.includes("--write");
const root = process.cwd();
const descriptor = JSON.parse(readFileSync(
  resolve(root, HSK3_CEDICT_SOURCE_RELATIVE_PATH),
  "utf8",
));
const syllabus = loadHskSyllabusBundle(root);
assertValidHskSyllabusBundle(syllabus);

const archive = readFileSync(archiveFile);
const archiveSha256 = sha256(archive);
if (
  archiveSha256 !== descriptor.archive.sha256
  || archive.length !== descriptor.archive.byteLength
) {
  throw new Error(
    `CC-CEDICT archive drift: expected ${descriptor.archive.sha256} (${descriptor.archive.byteLength} bytes), received ${archiveSha256} (${archive.length} bytes)`,
  );
}

const payload = readFileSync(sourceFile);
const payloadSha256 = sha256(payload);
if (
  payloadSha256 !== descriptor.snapshot.sha256
  || payload.length !== descriptor.snapshot.byteLength
) {
  throw new Error(
    `CC-CEDICT payload drift: expected ${descriptor.snapshot.sha256} (${descriptor.snapshot.byteLength} bytes), received ${payloadSha256} (${payload.length} bytes)`,
  );
}
const text = payload.toString("utf8");
if (
  !text.includes("# CC-CEDICT")
  || !text.includes(
    "# Creative Commons Attribution-ShareAlike 4.0 International License",
  )
) {
  throw new Error("CC-CEDICT source header or declared license is missing");
}
const cedictEntries = parseCedictText(text);
if (cedictEntries.length !== descriptor.snapshot.entryCount) {
  throw new Error(
    `CC-CEDICT entry count drift: expected ${descriptor.snapshot.entryCount}, received ${cedictEntries.length}`,
  );
}

const draft = buildHsk3VocabularyDraft({
  descriptor,
  inventory: syllabus.inventory,
  inventorySha256: syllabus.inventorySha256,
  cedictEntries,
});
const serialized = serializeHsk3VocabularyDraft(draft);
const outputPath = resolve(root, HSK3_VOCABULARY_DRAFT_RELATIVE_PATH);

if (write) {
  writeFileSync(outputPath, serialized);
} else {
  let checked = null;
  try {
    checked = readFileSync(outputPath, "utf8");
  } catch {
    // A dry run before the first write is still useful.
  }
  if (checked !== null && checked !== serialized) {
    throw new Error("Checked HSK3 vocabulary draft is stale; rerun with --write");
  }
}

console.log(JSON.stringify({
  valid: true,
  wrote: write,
  sourceId: descriptor.sourceId,
  sourceArchiveSha256: descriptor.archive.sha256,
  sourceSnapshotSha256: descriptor.snapshot.sha256,
  output: HSK3_VOCABULARY_DRAFT_RELATIVE_PATH,
  counts: draft.counts,
}, null, 2));
