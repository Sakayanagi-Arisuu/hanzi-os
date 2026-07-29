import {
  assertValidHsk3ReferenceQuantityNarrationPackBundle,
  loadHsk3ReferenceQuantityNarrationPackBundle,
} from "./hsk3ReferenceQuantityNarrationPack.mjs";
import {
  assertValidHsk3NarrationGrammarModulePackBundle,
  loadHsk3NarrationGrammarModulePackBundle,
  validateHsk3NarrationGrammarModulePackBundle,
} from "./hsk3NarrationGrammarModulePack.mjs";

export const HSK3_MODALITY_TIME_NARRATION_PACK_RELATIVE_PATH =
  "content/drafts/hsk3-modality-time-narration-grammar-2026.07.json";
export const HSK3_MODALITY_TIME_TRACK_ID =
  "hsk3-modality-time-viewpoint-framing";
export const HSK3_MODALITY_TIME_LESSON_IDS = [
  `${HSK3_MODALITY_TIME_TRACK_ID}-lesson-01`,
  `${HSK3_MODALITY_TIME_TRACK_ID}-lesson-02`,
  `${HSK3_MODALITY_TIME_TRACK_ID}-lesson-03`,
];
export const HSK3_MODALITY_TIME_PACK_CONFIG = {
  packId: "hsk3-modality-time-narration-grammar-2026.07",
  trackId: HSK3_MODALITY_TIME_TRACK_ID,
  lessonIds: HSK3_MODALITY_TIME_LESSON_IDS,
  completedNarrationGrammarModules: 2,
  completedNarrationGrammarLessons: 6,
};

export const loadHsk3ModalityTimeNarrationPackBundle = (
  root = process.cwd(),
) => {
  const referenceBundle =
    loadHsk3ReferenceQuantityNarrationPackBundle(root);
  assertValidHsk3ReferenceQuantityNarrationPackBundle(referenceBundle);
  return loadHsk3NarrationGrammarModulePackBundle({
    root,
    relativePath: HSK3_MODALITY_TIME_NARRATION_PACK_RELATIVE_PATH,
    prerequisiteBundles: [referenceBundle],
  });
};

export const validateHsk3ModalityTimeNarrationPackBundle = (bundle) =>
  validateHsk3NarrationGrammarModulePackBundle({
    bundle,
    config: HSK3_MODALITY_TIME_PACK_CONFIG,
  });

export const assertValidHsk3ModalityTimeNarrationPackBundle = (bundle) =>
  assertValidHsk3NarrationGrammarModulePackBundle({
    bundle,
    config: HSK3_MODALITY_TIME_PACK_CONFIG,
  });
