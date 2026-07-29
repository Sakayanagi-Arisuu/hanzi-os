import {
  assertValidHsk3CurriculumScopeBundle,
  loadHsk3CurriculumScopeBundle,
} from "../../src/content/hsk3CurriculumScope.mjs";

const result = assertValidHsk3CurriculumScopeBundle(
  loadHsk3CurriculumScopeBundle(),
);
console.log(JSON.stringify({ valid: true, summary: result.summary }, null, 2));
