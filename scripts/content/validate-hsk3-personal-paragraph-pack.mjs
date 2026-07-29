import {
  assertValidHsk3PersonalParagraphPackBundle,
  loadHsk3PersonalParagraphPackBundle,
} from "../../src/content/hsk3PersonalParagraphPack.mjs";

const bundle = loadHsk3PersonalParagraphPackBundle();
const result = assertValidHsk3PersonalParagraphPackBundle(bundle);

console.log(JSON.stringify({
  valid: true,
  packId: bundle.pack.packId,
  lessonId: bundle.pack.lessonId,
  summary: result.summary,
}, null, 2));
