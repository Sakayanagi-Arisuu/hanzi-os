import {
  assertValidHsk4VocabularyDraftBundle,
  loadHsk4VocabularyDraftBundle,
} from "../../src/content/hsk4VocabularyDraft.mjs";

const bundle = loadHsk4VocabularyDraftBundle();
const result = assertValidHsk4VocabularyDraftBundle(bundle);

console.log(JSON.stringify({
  valid: true,
  sourceId: bundle.descriptor.sourceId,
  sourceArchiveSha256: bundle.descriptor.archive.sha256,
  sourceSnapshotSha256: bundle.descriptor.snapshot.sha256,
  draftId: bundle.draft.draftId,
  counts: result.counts,
}, null, 2));
