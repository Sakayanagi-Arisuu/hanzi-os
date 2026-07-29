import {
  assertValidHsk3EventComplementsNarrationPackBundle,
  loadHsk3EventComplementsNarrationPackBundle,
} from "./hsk3EventComplementsNarrationPack.mjs";
import {
  assertValidHsk3NarrationGrammarModulePackBundle,
  loadHsk3NarrationGrammarModulePackBundle,
  validateHsk3NarrationGrammarModulePackBundle,
} from "./hsk3NarrationGrammarModulePack.mjs";

export const HSK3_COMPARISON_EVALUATION_NARRATION_PACK_RELATIVE_PATH =
  "content/drafts/hsk3-comparison-description-evaluation-narration-grammar-2026.07.json";
export const HSK3_COMPARISON_EVALUATION_TRACK_ID =
  "hsk3-comparison-description-evaluation";
export const HSK3_COMPARISON_EVALUATION_LESSON_IDS = [
  `${HSK3_COMPARISON_EVALUATION_TRACK_ID}-lesson-01`,
  `${HSK3_COMPARISON_EVALUATION_TRACK_ID}-lesson-02`,
  `${HSK3_COMPARISON_EVALUATION_TRACK_ID}-lesson-03`,
];
export const HSK3_COMPARISON_EVALUATION_PACK_CONFIG = {
  packId:
    "hsk3-comparison-description-evaluation-narration-grammar-2026.07",
  trackId: HSK3_COMPARISON_EVALUATION_TRACK_ID,
  lessonIds: HSK3_COMPARISON_EVALUATION_LESSON_IDS,
  completedNarrationGrammarModules: 4,
  completedNarrationGrammarLessons: 12,
};

export const loadHsk3ComparisonEvaluationNarrationPackBundle = (
  root = process.cwd(),
) => {
  const eventBundle = loadHsk3EventComplementsNarrationPackBundle(root);
  assertValidHsk3EventComplementsNarrationPackBundle(eventBundle);
  return loadHsk3NarrationGrammarModulePackBundle({
    root,
    relativePath: HSK3_COMPARISON_EVALUATION_NARRATION_PACK_RELATIVE_PATH,
    prerequisiteBundles: [eventBundle],
  });
};

export const validateHsk3ComparisonEvaluationNarrationPackBundle = (bundle) =>
  validateHsk3NarrationGrammarModulePackBundle({
    bundle,
    config: HSK3_COMPARISON_EVALUATION_PACK_CONFIG,
  });

export const assertValidHsk3ComparisonEvaluationNarrationPackBundle = (
  bundle,
) =>
  assertValidHsk3NarrationGrammarModulePackBundle({
    bundle,
    config: HSK3_COMPARISON_EVALUATION_PACK_CONFIG,
  });
