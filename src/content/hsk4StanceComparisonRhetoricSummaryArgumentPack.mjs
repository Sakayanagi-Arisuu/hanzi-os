import {
  assertValidHsk4SummaryArgumentModulePackBundle,
  loadHsk4SummaryArgumentModulePackBundle,
  validateHsk4SummaryArgumentModulePackBundle,
} from "./hsk4SummaryArgumentModulePack.mjs";
import {
  assertValidHsk4PrecisionReferenceQuantitySummaryArgumentPackBundle,
  loadHsk4PrecisionReferenceQuantitySummaryArgumentPackBundle,
} from "./hsk4PrecisionReferenceQuantitySummaryArgumentPack.mjs";

export const HSK4_STANCE_COMPARISON_RHETORIC_SUMMARY_ARGUMENT_RELATIVE_PATH =
  "content/drafts/hsk4-stance-comparison-rhetoric-summary-argument-2026.07.json";
export const HSK4_STANCE_COMPARISON_RHETORIC_TRACK_ID =
  "hsk4-stance-comparison-rhetoric";
export const HSK4_STANCE_COMPARISON_RHETORIC_LESSON_IDS = Array.from(
  { length: 5 },
  (_, index) =>
    `${HSK4_STANCE_COMPARISON_RHETORIC_TRACK_ID}-lesson-${
      String(index + 1).padStart(2, "0")
    }`,
);
export const HSK4_STANCE_COMPARISON_RHETORIC_CONFIG = {
  packId: "hsk4-stance-comparison-rhetoric-summary-argument-2026.07",
  trackId: HSK4_STANCE_COMPARISON_RHETORIC_TRACK_ID,
  lessonIds: HSK4_STANCE_COMPARISON_RHETORIC_LESSON_IDS,
  completedSummaryArgumentModules: 2,
  completedSummaryArgumentLessons: 11,
};

const prerequisiteBundles = (root) => {
  const prior =
    loadHsk4PrecisionReferenceQuantitySummaryArgumentPackBundle(root);
  assertValidHsk4PrecisionReferenceQuantitySummaryArgumentPackBundle(prior);
  return [prior];
};

export const loadHsk4StanceComparisonRhetoricSummaryArgumentPackBundle = (
  root = process.cwd(),
) => {
  const prerequisites = prerequisiteBundles(root);
  return loadHsk4SummaryArgumentModulePackBundle({
    root,
    relativePath:
      HSK4_STANCE_COMPARISON_RHETORIC_SUMMARY_ARGUMENT_RELATIVE_PATH,
    longFormHeadBundle: prerequisites[0].longFormHeadBundle,
    prerequisiteBundles: prerequisites,
  });
};

export const validateHsk4StanceComparisonRhetoricSummaryArgumentPackBundle =
  (bundle) => validateHsk4SummaryArgumentModulePackBundle({
    bundle,
    config: HSK4_STANCE_COMPARISON_RHETORIC_CONFIG,
  });

export const assertValidHsk4StanceComparisonRhetoricSummaryArgumentPackBundle =
  (bundle) => assertValidHsk4SummaryArgumentModulePackBundle({
    bundle,
    config: HSK4_STANCE_COMPARISON_RHETORIC_CONFIG,
  });
