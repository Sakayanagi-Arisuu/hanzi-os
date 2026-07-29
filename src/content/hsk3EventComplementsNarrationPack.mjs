import {
  assertValidHsk3ModalityTimeNarrationPackBundle,
  loadHsk3ModalityTimeNarrationPackBundle,
} from "./hsk3ModalityTimeNarrationPack.mjs";
import {
  assertValidHsk3NarrationGrammarModulePackBundle,
  loadHsk3NarrationGrammarModulePackBundle,
  validateHsk3NarrationGrammarModulePackBundle,
} from "./hsk3NarrationGrammarModulePack.mjs";

export const HSK3_EVENT_COMPLEMENTS_NARRATION_PACK_RELATIVE_PATH =
  "content/drafts/hsk3-event-complements-narration-grammar-2026.07.json";
export const HSK3_EVENT_COMPLEMENTS_TRACK_ID =
  "hsk3-event-complements-voice";
export const HSK3_EVENT_COMPLEMENTS_LESSON_IDS = [
  `${HSK3_EVENT_COMPLEMENTS_TRACK_ID}-lesson-01`,
  `${HSK3_EVENT_COMPLEMENTS_TRACK_ID}-lesson-02`,
  `${HSK3_EVENT_COMPLEMENTS_TRACK_ID}-lesson-03`,
];
export const HSK3_EVENT_COMPLEMENTS_PACK_CONFIG = {
  packId: "hsk3-event-complements-narration-grammar-2026.07",
  trackId: HSK3_EVENT_COMPLEMENTS_TRACK_ID,
  lessonIds: HSK3_EVENT_COMPLEMENTS_LESSON_IDS,
  completedNarrationGrammarModules: 3,
  completedNarrationGrammarLessons: 9,
};

export const loadHsk3EventComplementsNarrationPackBundle = (
  root = process.cwd(),
) => {
  const modalityBundle = loadHsk3ModalityTimeNarrationPackBundle(root);
  assertValidHsk3ModalityTimeNarrationPackBundle(modalityBundle);
  return loadHsk3NarrationGrammarModulePackBundle({
    root,
    relativePath: HSK3_EVENT_COMPLEMENTS_NARRATION_PACK_RELATIVE_PATH,
    prerequisiteBundles: [modalityBundle],
  });
};

export const validateHsk3EventComplementsNarrationPackBundle = (bundle) =>
  validateHsk3NarrationGrammarModulePackBundle({
    bundle,
    config: HSK3_EVENT_COMPLEMENTS_PACK_CONFIG,
  });

export const assertValidHsk3EventComplementsNarrationPackBundle = (bundle) =>
  assertValidHsk3NarrationGrammarModulePackBundle({
    bundle,
    config: HSK3_EVENT_COMPLEMENTS_PACK_CONFIG,
  });
