import {
  assertValidHsk3GuidedParagraphPackBundle,
  loadHsk3GuidedParagraphPackBundle,
} from "../../src/content/hsk3GuidedParagraphPack.mjs";

const result = assertValidHsk3GuidedParagraphPackBundle(
  loadHsk3GuidedParagraphPackBundle(),
);
console.log(JSON.stringify({ valid: true, ...result.summary }, null, 2));
