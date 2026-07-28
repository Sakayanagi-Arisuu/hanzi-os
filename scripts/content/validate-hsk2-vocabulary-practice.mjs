import {
  assertValidHsk2VocabularyPracticeBundle,
  loadHsk2VocabularyPracticeBundle,
} from "../../src/content/hsk2VocabularyPractice.mjs";

const bundle = loadHsk2VocabularyPracticeBundle();
const result = assertValidHsk2VocabularyPracticeBundle(bundle);

console.log(JSON.stringify({
  valid: true,
  packId: bundle.pack.packId,
  vocabularyDraftId: bundle.vocabularyBundle.draft.draftId,
  lessonBlueprintPackId: bundle.blueprintBundle.pack.packId,
  summary: result.summary,
}, null, 2));
