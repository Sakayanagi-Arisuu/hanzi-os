import {
  assertValidHsk2SituationalDialoguesBundle,
  loadHsk2SituationalDialoguesBundle,
} from "../../src/content/hsk2SituationalDialogues.mjs";

const bundle = loadHsk2SituationalDialoguesBundle();
const result = assertValidHsk2SituationalDialoguesBundle(bundle);
console.log(JSON.stringify({
  valid: true,
  packId: bundle.pack.packId,
  summary: result.summary,
}, null, 2));
