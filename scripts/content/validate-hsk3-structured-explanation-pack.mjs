import {
  assertValidHsk3StructuredExplanationPackBundle,
  loadHsk3StructuredExplanationPackBundle,
} from "../../src/content/hsk3StructuredExplanationPack.mjs";

const result = assertValidHsk3StructuredExplanationPackBundle(
  loadHsk3StructuredExplanationPackBundle(),
);
console.log(JSON.stringify({ valid: true, ...result.summary }, null, 2));
