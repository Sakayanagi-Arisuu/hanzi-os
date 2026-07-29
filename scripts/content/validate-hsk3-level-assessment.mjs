import {
  assertValidHsk3LevelAssessmentBundle,
  loadHsk3LevelAssessmentBundle,
} from "../../src/content/hsk3LevelAssessment.mjs";

const result = assertValidHsk3LevelAssessmentBundle(
  loadHsk3LevelAssessmentBundle(),
);
console.log(JSON.stringify({ valid: true, ...result.summary }, null, 2));
