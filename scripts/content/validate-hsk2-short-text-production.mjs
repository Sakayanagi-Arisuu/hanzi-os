import {
  assertValidHsk2ShortTextProductionBundle,
  loadHsk2ShortTextProductionBundle,
} from "../../src/content/hsk2ShortTextProduction.mjs";

const bundle = loadHsk2ShortTextProductionBundle();
const result = assertValidHsk2ShortTextProductionBundle(bundle);
console.log(JSON.stringify({
  valid: true,
  packId: bundle.pack.packId,
  summary: result.summary,
}, null, 2));
