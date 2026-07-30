import {
  assertValidHsk4LevelAssessmentBundle,
  loadHsk4LevelAssessmentBundle,
} from "../../src/content/hsk4LevelAssessment.mjs";

const result = assertValidHsk4LevelAssessmentBundle(
  loadHsk4LevelAssessmentBundle(),
);
console.log(JSON.stringify({ valid: true, ...result.summary }, null, 2));
