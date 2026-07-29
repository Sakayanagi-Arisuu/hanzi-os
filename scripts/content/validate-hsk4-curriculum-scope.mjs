import {
  assertValidHsk4CurriculumScopeBundle,
  loadHsk4CurriculumScopeBundle,
} from "../../src/content/hsk4CurriculumScope.mjs";

const bundle = loadHsk4CurriculumScopeBundle();
const result = assertValidHsk4CurriculumScopeBundle(bundle);
console.log(JSON.stringify({
  valid: true,
  summary: result.summary,
}, null, 2));
