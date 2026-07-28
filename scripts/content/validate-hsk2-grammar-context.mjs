import {
  assertValidHsk2GrammarContextBundle,
  loadHsk2GrammarContextBundle,
} from "../../src/content/hsk2GrammarContext.mjs";

const bundle = loadHsk2GrammarContextBundle();
const result = assertValidHsk2GrammarContextBundle(bundle);
console.log(JSON.stringify({
  valid: true,
  packId: bundle.pack.packId,
  summary: result.summary,
}, null, 2));
