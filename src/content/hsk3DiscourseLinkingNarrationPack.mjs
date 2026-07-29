import {
  assertValidHsk3ComparisonEvaluationNarrationPackBundle,
  loadHsk3ComparisonEvaluationNarrationPackBundle,
} from "./hsk3ComparisonEvaluationNarrationPack.mjs";
import {
  assertValidHsk3NarrationGrammarModulePackBundle,
  loadHsk3NarrationGrammarModulePackBundle,
  validateHsk3NarrationGrammarModulePackBundle,
} from "./hsk3NarrationGrammarModulePack.mjs";

export const HSK3_DISCOURSE_LINKING_NARRATION_PACK_RELATIVE_PATH =
  "content/drafts/hsk3-discourse-linking-narration-grammar-2026.07.json";
export const HSK3_DISCOURSE_LINKING_TRACK_ID = "hsk3-discourse-linking";
export const HSK3_DISCOURSE_LINKING_LESSON_IDS = [
  `${HSK3_DISCOURSE_LINKING_TRACK_ID}-lesson-01`,
  `${HSK3_DISCOURSE_LINKING_TRACK_ID}-lesson-02`,
  `${HSK3_DISCOURSE_LINKING_TRACK_ID}-lesson-03`,
];
export const HSK3_DISCOURSE_LINKING_PACK_CONFIG = {
  packId: "hsk3-discourse-linking-narration-grammar-2026.07",
  trackId: HSK3_DISCOURSE_LINKING_TRACK_ID,
  lessonIds: HSK3_DISCOURSE_LINKING_LESSON_IDS,
  completedNarrationGrammarModules: 5,
  completedNarrationGrammarLessons: 15,
};

export const loadHsk3DiscourseLinkingNarrationPackBundle = (
  root = process.cwd(),
) => {
  const comparisonBundle =
    loadHsk3ComparisonEvaluationNarrationPackBundle(root);
  assertValidHsk3ComparisonEvaluationNarrationPackBundle(comparisonBundle);
  return loadHsk3NarrationGrammarModulePackBundle({
    root,
    relativePath: HSK3_DISCOURSE_LINKING_NARRATION_PACK_RELATIVE_PATH,
    prerequisiteBundles: [comparisonBundle],
  });
};

export const validateHsk3DiscourseLinkingNarrationPackBundle = (bundle) =>
  validateHsk3NarrationGrammarModulePackBundle({
    bundle,
    config: HSK3_DISCOURSE_LINKING_PACK_CONFIG,
  });

export const assertValidHsk3DiscourseLinkingNarrationPackBundle = (bundle) =>
  assertValidHsk3NarrationGrammarModulePackBundle({
    bundle,
    config: HSK3_DISCOURSE_LINKING_PACK_CONFIG,
  });
