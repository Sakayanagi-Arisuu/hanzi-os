import {
  assertValidHsk3EventRetellingPackBundle,
  loadHsk3EventRetellingPackBundle,
} from "../../src/content/hsk3EventRetellingPack.mjs";

const result = assertValidHsk3EventRetellingPackBundle(
  loadHsk3EventRetellingPackBundle(),
);
console.log(JSON.stringify({ valid: true, ...result.summary }, null, 2));
