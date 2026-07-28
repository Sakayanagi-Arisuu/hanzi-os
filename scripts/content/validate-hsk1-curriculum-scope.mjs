import {
  assertValidHsk1CurriculumScopeBundle,
  loadHsk1CurriculumScopeBundle,
} from "../../src/content/hsk1CurriculumScope.mjs";

const bundle = loadHsk1CurriculumScopeBundle();
const result = assertValidHsk1CurriculumScopeBundle(bundle);
console.log(JSON.stringify({
  valid: true,
  scopeId: bundle.scope.scopeId,
  graphId: bundle.scope.graphId,
  summary: result.summary,
}, null, 2));
