import {
  assertValidHsk3EventComplementsNarrationPackBundle,
  loadHsk3EventComplementsNarrationPackBundle,
} from "../../src/content/hsk3EventComplementsNarrationPack.mjs";

const result = assertValidHsk3EventComplementsNarrationPackBundle(
  loadHsk3EventComplementsNarrationPackBundle(),
);
console.log(JSON.stringify({ valid: true, ...result.summary }, null, 2));
