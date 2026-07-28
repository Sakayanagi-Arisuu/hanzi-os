import {
  assertValidHsk1GrammarContextPackBundle,
  loadHsk1GrammarContextPackBundle,
} from "../../src/content/hsk1GrammarContextPack.mjs";

const bundle = loadHsk1GrammarContextPackBundle();
const result = assertValidHsk1GrammarContextPackBundle(bundle);
console.log(JSON.stringify({
  valid: true,
  packId: bundle.pack.packId,
  summary: result.summary,
}, null, 2));
