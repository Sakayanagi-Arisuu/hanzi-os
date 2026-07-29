import {
  assertValidHsk3CultureTraditionDomainPackBundle,
  loadHsk3CultureTraditionDomainPackBundle,
} from "./hsk3CultureTraditionDomainPack.mjs";
import {
  assertValidHsk3NarrationGrammarModulePackBundle,
  loadHsk3NarrationGrammarModulePackBundle,
  validateHsk3NarrationGrammarModulePackBundle,
} from "./hsk3NarrationGrammarModulePack.mjs";

export const HSK3_REFERENCE_QUANTITY_NARRATION_PACK_RELATIVE_PATH =
  "content/drafts/hsk3-reference-quantity-narration-grammar-2026.07.json";
export const HSK3_REFERENCE_QUANTITY_TRACK_ID =
  "hsk3-reference-quantity-phrase-building";
export const HSK3_REFERENCE_QUANTITY_LESSON_IDS = [
  `${HSK3_REFERENCE_QUANTITY_TRACK_ID}-lesson-01`,
  `${HSK3_REFERENCE_QUANTITY_TRACK_ID}-lesson-02`,
  `${HSK3_REFERENCE_QUANTITY_TRACK_ID}-lesson-03`,
];
export const HSK3_REFERENCE_QUANTITY_PACK_CONFIG = {
  packId: "hsk3-reference-quantity-narration-grammar-2026.07",
  trackId: HSK3_REFERENCE_QUANTITY_TRACK_ID,
  lessonIds: HSK3_REFERENCE_QUANTITY_LESSON_IDS,
  completedNarrationGrammarModules: 1,
  completedNarrationGrammarLessons: 3,
};

export const loadHsk3ReferenceQuantityNarrationPackBundle = (
  root = process.cwd(),
) => {
  const paragraphBundle = loadHsk3CultureTraditionDomainPackBundle(root);
  assertValidHsk3CultureTraditionDomainPackBundle(paragraphBundle);
  return loadHsk3NarrationGrammarModulePackBundle({
    root,
    relativePath: HSK3_REFERENCE_QUANTITY_NARRATION_PACK_RELATIVE_PATH,
    prerequisiteBundles: [paragraphBundle],
  });
};

export const validateHsk3ReferenceQuantityNarrationPackBundle = (bundle) =>
  validateHsk3NarrationGrammarModulePackBundle({
    bundle,
    config: HSK3_REFERENCE_QUANTITY_PACK_CONFIG,
  });

export const assertValidHsk3ReferenceQuantityNarrationPackBundle = (bundle) =>
  assertValidHsk3NarrationGrammarModulePackBundle({
    bundle,
    config: HSK3_REFERENCE_QUANTITY_PACK_CONFIG,
  });
