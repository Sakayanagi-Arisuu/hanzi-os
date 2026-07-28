import { gunzipSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildHsk1VocabularyDraft,
  HSK1_CEDICT_SOURCE_RELATIVE_PATH,
  HSK1_VOCABULARY_DRAFT_RELATIVE_PATH,
  parseCedictText,
  serializeHsk1VocabularyDraft,
  sha256,
} from "../../src/content/hsk1VocabularyDraft.mjs";
import {
  assertValidHskSyllabusBundle,
  loadHskSyllabusBundle,
} from "../../src/content/hskSyllabusInventory.mjs";

const args = process.argv.slice(2);
const sourceArgIndex = args.indexOf("--source-file");
const sourceFile = resolve(
  sourceArgIndex >= 0
    ? args[sourceArgIndex + 1]
    : "tmp/cedict_1_0_ts_utf-8_mdbg.txt.gz",
);
const write = args.includes("--write");
const root = process.cwd();
const descriptor = JSON.parse(readFileSync(
  resolve(root, HSK1_CEDICT_SOURCE_RELATIVE_PATH),
  "utf8",
));
const syllabus = loadHskSyllabusBundle(root);
assertValidHskSyllabusBundle(syllabus);

const compressed = readFileSync(sourceFile);
const compressedSha256 = sha256(compressed);
if (
  compressedSha256 !== descriptor.snapshot.sha256
  || compressed.length !== descriptor.snapshot.byteLength
) {
  throw new Error(
    `CC-CEDICT snapshot drift: expected ${descriptor.snapshot.sha256} (${descriptor.snapshot.byteLength} bytes), received ${compressedSha256} (${compressed.length} bytes)`,
  );
}

const uncompressed = gunzipSync(compressed);
if (uncompressed.length !== descriptor.snapshot.uncompressedByteLength) {
  throw new Error("CC-CEDICT uncompressed byte length does not match descriptor");
}
const text = uncompressed.toString("utf8");
if (
  !text.includes("# CC-CEDICT")
  || !text.includes("# Creative Commons Attribution-ShareAlike 4.0 International License")
) {
  throw new Error("CC-CEDICT source header or declared license is missing");
}
const cedictEntries = parseCedictText(text);
if (cedictEntries.length !== descriptor.snapshot.entryCount) {
  throw new Error(
    `CC-CEDICT entry count drift: expected ${descriptor.snapshot.entryCount}, received ${cedictEntries.length}`,
  );
}

const draft = buildHsk1VocabularyDraft({
  descriptor,
  inventory: syllabus.inventory,
  inventorySha256: syllabus.inventorySha256,
  cedictEntries,
});
const serialized = serializeHsk1VocabularyDraft(draft);
const outputPath = resolve(root, HSK1_VOCABULARY_DRAFT_RELATIVE_PATH);

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
    throw new Error("Checked HSK1 vocabulary draft is stale; rerun with --write");
  }
}

console.log(JSON.stringify({
  valid: true,
  wrote: write,
  sourceId: descriptor.sourceId,
  sourceSnapshotSha256: descriptor.snapshot.sha256,
  output: HSK1_VOCABULARY_DRAFT_RELATIVE_PATH,
  counts: draft.counts,
}, null, 2));
