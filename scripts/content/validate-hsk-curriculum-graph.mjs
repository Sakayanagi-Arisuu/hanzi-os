import {
  assertValidHskCurriculumGraphBundle,
  loadHskCurriculumGraphBundle,
} from "../../src/content/hskCurriculumGraph.mjs";

const bundle = loadHskCurriculumGraphBundle();
const result = assertValidHskCurriculumGraphBundle(bundle);

console.log(JSON.stringify({
  valid: true,
  graphId: bundle.graph.graphId,
  graphSha256: bundle.graphSha256,
  ...result.summary,
}, null, 2));
