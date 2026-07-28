import {
  assertValidHsk1TaskAssessmentPackBundle,
  loadHsk1TaskAssessmentPackBundle,
} from "../../src/content/hsk1TaskAssessmentPack.mjs";

const bundle = loadHsk1TaskAssessmentPackBundle();
const result = assertValidHsk1TaskAssessmentPackBundle(bundle);
console.log(JSON.stringify({
  valid: true,
  packId: bundle.pack.packId,
  summary: result.summary,
}, null, 2));
