import {
  assertValidHsk2VocabularyDraftBundle,
  loadHsk2VocabularyDraftBundle,
} from "../../src/content/hsk2VocabularyDraft.mjs";

const bundle = loadHsk2VocabularyDraftBundle();
const result = assertValidHsk2VocabularyDraftBundle(bundle);

console.log(JSON.stringify({
  valid: true,
  sourceId: bundle.descriptor.sourceId,
  sourceArchiveSha256: bundle.descriptor.archive.sha256,
  sourceSnapshotSha256: bundle.descriptor.snapshot.sha256,
  draftId: bundle.draft.draftId,
  counts: result.counts,
}, null, 2));
