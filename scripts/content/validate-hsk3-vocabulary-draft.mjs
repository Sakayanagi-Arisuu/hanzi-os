import {
  assertValidHsk3VocabularyDraftBundle,
  loadHsk3VocabularyDraftBundle,
} from "../../src/content/hsk3VocabularyDraft.mjs";

const bundle = loadHsk3VocabularyDraftBundle();
const result = assertValidHsk3VocabularyDraftBundle(bundle);

console.log(JSON.stringify({
  valid: true,
  sourceId: bundle.descriptor.sourceId,
  sourceArchiveSha256: bundle.descriptor.archive.sha256,
  sourceSnapshotSha256: bundle.descriptor.snapshot.sha256,
  draftId: bundle.draft.draftId,
  counts: result.counts,
}, null, 2));
