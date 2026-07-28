import {
  assertValidHsk1VocabularyDraftBundle,
  loadHsk1VocabularyDraftBundle,
} from "../../src/content/hsk1VocabularyDraft.mjs";

const bundle = loadHsk1VocabularyDraftBundle();
const result = assertValidHsk1VocabularyDraftBundle(bundle);
console.log(JSON.stringify({
  valid: true,
  sourceId: bundle.descriptor.sourceId,
  sourceSnapshotSha256: bundle.descriptor.snapshot.sha256,
  draftId: bundle.draft.draftId,
  counts: result.counts,
}, null, 2));
