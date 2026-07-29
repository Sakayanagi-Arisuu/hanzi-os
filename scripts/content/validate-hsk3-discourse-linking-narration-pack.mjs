import {
  assertValidHsk3DiscourseLinkingNarrationPackBundle,
  loadHsk3DiscourseLinkingNarrationPackBundle,
} from "../../src/content/hsk3DiscourseLinkingNarrationPack.mjs";

const result = assertValidHsk3DiscourseLinkingNarrationPackBundle(
  loadHsk3DiscourseLinkingNarrationPackBundle(),
);
console.log(JSON.stringify({ valid: true, ...result.summary }, null, 2));
