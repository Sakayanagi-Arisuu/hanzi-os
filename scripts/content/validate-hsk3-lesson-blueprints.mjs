import {
  assertValidHsk3LessonBlueprintsBundle,
  loadHsk3LessonBlueprintsBundle,
} from "../../src/content/hsk3LessonBlueprints.mjs";

const bundle = loadHsk3LessonBlueprintsBundle();
const result = assertValidHsk3LessonBlueprintsBundle(bundle);

console.log(JSON.stringify({
  valid: true,
  packId: bundle.pack.packId,
  scopeId: bundle.scopeBundle.scope.scopeId,
  summary: result.summary,
}, null, 2));
