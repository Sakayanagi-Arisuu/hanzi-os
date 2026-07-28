import {
  assertValidHsk2LessonBlueprintsBundle,
  loadHsk2LessonBlueprintsBundle,
} from "../../src/content/hsk2LessonBlueprints.mjs";

const bundle = loadHsk2LessonBlueprintsBundle();
const result = assertValidHsk2LessonBlueprintsBundle(bundle);

console.log(JSON.stringify({
  valid: true,
  packId: bundle.pack.packId,
  scopeId: bundle.scopeBundle.scope.scopeId,
  summary: result.summary,
}, null, 2));
