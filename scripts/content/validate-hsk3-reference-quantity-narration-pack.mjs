import {
  assertValidHsk3ReferenceQuantityNarrationPackBundle,
  loadHsk3ReferenceQuantityNarrationPackBundle,
} from "../../src/content/hsk3ReferenceQuantityNarrationPack.mjs";

const result = assertValidHsk3ReferenceQuantityNarrationPackBundle(
  loadHsk3ReferenceQuantityNarrationPackBundle(),
);
console.log(JSON.stringify({ valid: true, ...result.summary }, null, 2));
