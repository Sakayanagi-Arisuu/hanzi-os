import {
  assertValidHsk2CharacterPracticeBundle,
  loadHsk2CharacterPracticeBundle,
} from "../../src/content/hsk2CharacterPractice.mjs";

const bundle = loadHsk2CharacterPracticeBundle();
const result = assertValidHsk2CharacterPracticeBundle(bundle);

console.log(JSON.stringify({
  valid: true,
  packId: bundle.pack.packId,
  lessonBlueprintPackId: bundle.blueprintBundle.pack.packId,
  summary: result.summary,
}, null, 2));
