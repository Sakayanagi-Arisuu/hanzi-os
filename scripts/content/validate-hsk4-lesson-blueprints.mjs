import {
  assertValidHsk4LessonBlueprintsBundle,
  loadHsk4LessonBlueprintsBundle,
} from "../../src/content/hsk4LessonBlueprints.mjs";

const bundle = loadHsk4LessonBlueprintsBundle();
const result = assertValidHsk4LessonBlueprintsBundle(bundle);
console.log(JSON.stringify({
  valid: true,
  packId: bundle.pack.packId,
  summary: result.summary,
}, null, 2));
