import {
  assertValidHsk3ComparisonEvaluationNarrationPackBundle,
  loadHsk3ComparisonEvaluationNarrationPackBundle,
} from "../../src/content/hsk3ComparisonEvaluationNarrationPack.mjs";

const result = assertValidHsk3ComparisonEvaluationNarrationPackBundle(
  loadHsk3ComparisonEvaluationNarrationPackBundle(),
);
console.log(JSON.stringify({ valid: true, ...result.summary }, null, 2));
