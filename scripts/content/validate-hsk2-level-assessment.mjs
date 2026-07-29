import {
  assertValidHsk2LevelAssessmentBundle,
  loadHsk2LevelAssessmentBundle,
} from "../../src/content/hsk2LevelAssessment.mjs";

const bundle = loadHsk2LevelAssessmentBundle();
const result = assertValidHsk2LevelAssessmentBundle(bundle);
console.log(JSON.stringify({
  valid: true,
  bankId: bundle.bank.bankId,
  summary: result.summary,
}, null, 2));
