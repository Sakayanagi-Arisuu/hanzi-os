import {
  assertValidHsk4SummaryArgumentModulePackBundle,
  loadHsk4SummaryArgumentModulePackBundle,
  validateHsk4SummaryArgumentModulePackBundle,
} from "./hsk4SummaryArgumentModulePack.mjs";
import {
  assertValidHsk4CultureHistoryLongFormPackBundle,
  loadHsk4CultureHistoryLongFormPackBundle,
} from "./hsk4CultureHistoryLongFormPack.mjs";

export const HSK4_PRECISION_REFERENCE_QUANTITY_SUMMARY_ARGUMENT_RELATIVE_PATH =
  "content/drafts/hsk4-precision-reference-quantity-summary-argument-2026.07.json";
export const HSK4_PRECISION_REFERENCE_QUANTITY_TRACK_ID =
  "hsk4-precision-reference-quantity";
export const HSK4_PRECISION_REFERENCE_QUANTITY_LESSON_IDS = Array.from(
  { length: 6 },
  (_, index) =>
    `${HSK4_PRECISION_REFERENCE_QUANTITY_TRACK_ID}-lesson-${
      String(index + 1).padStart(2, "0")
    }`,
);
export const HSK4_PRECISION_REFERENCE_QUANTITY_CONFIG = {
  packId: "hsk4-precision-reference-quantity-summary-argument-2026.07",
  trackId: HSK4_PRECISION_REFERENCE_QUANTITY_TRACK_ID,
  lessonIds: HSK4_PRECISION_REFERENCE_QUANTITY_LESSON_IDS,
  completedSummaryArgumentModules: 1,
  completedSummaryArgumentLessons: 6,
};

const longFormHeadBundle = (root) => {
  const bundle = loadHsk4CultureHistoryLongFormPackBundle(root);
  assertValidHsk4CultureHistoryLongFormPackBundle(bundle);
  return bundle;
};

export const loadHsk4PrecisionReferenceQuantitySummaryArgumentPackBundle = (
  root = process.cwd(),
) => {
  const longForm = longFormHeadBundle(root);
  return loadHsk4SummaryArgumentModulePackBundle({
    root,
    relativePath:
      HSK4_PRECISION_REFERENCE_QUANTITY_SUMMARY_ARGUMENT_RELATIVE_PATH,
    longFormHeadBundle: longForm,
    prerequisiteBundles: [longForm],
  });
};

export const validateHsk4PrecisionReferenceQuantitySummaryArgumentPackBundle =
  (bundle) => validateHsk4SummaryArgumentModulePackBundle({
    bundle,
    config: HSK4_PRECISION_REFERENCE_QUANTITY_CONFIG,
  });

export const assertValidHsk4PrecisionReferenceQuantitySummaryArgumentPackBundle =
  (bundle) => assertValidHsk4SummaryArgumentModulePackBundle({
    bundle,
    config: HSK4_PRECISION_REFERENCE_QUANTITY_CONFIG,
  });
