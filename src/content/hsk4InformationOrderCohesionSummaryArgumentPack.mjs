import {
  assertValidHsk4SummaryArgumentModulePackBundle,
  loadHsk4SummaryArgumentModulePackBundle,
  validateHsk4SummaryArgumentModulePackBundle,
} from "./hsk4SummaryArgumentModulePack.mjs";
import {
  assertValidHsk4EventAgencyVoiceSummaryArgumentPackBundle,
  loadHsk4EventAgencyVoiceSummaryArgumentPackBundle,
} from "./hsk4EventAgencyVoiceSummaryArgumentPack.mjs";

export const HSK4_INFORMATION_ORDER_COHESION_SUMMARY_ARGUMENT_RELATIVE_PATH =
  "content/drafts/hsk4-information-order-cohesion-summary-argument-2026.07.json";
export const HSK4_INFORMATION_ORDER_COHESION_TRACK_ID =
  "hsk4-information-order-cohesion";
export const HSK4_INFORMATION_ORDER_COHESION_LESSON_IDS = Array.from(
  { length: 5 },
  (_, index) =>
    `${HSK4_INFORMATION_ORDER_COHESION_TRACK_ID}-lesson-${
      String(index + 1).padStart(2, "0")
    }`,
);
export const HSK4_INFORMATION_ORDER_COHESION_CONFIG = {
  packId: "hsk4-information-order-cohesion-summary-argument-2026.07",
  trackId: HSK4_INFORMATION_ORDER_COHESION_TRACK_ID,
  lessonIds: HSK4_INFORMATION_ORDER_COHESION_LESSON_IDS,
  completedSummaryArgumentModules: 4,
  completedSummaryArgumentLessons: 20,
};

const prerequisiteBundles = (root) => {
  const prior = loadHsk4EventAgencyVoiceSummaryArgumentPackBundle(root);
  assertValidHsk4EventAgencyVoiceSummaryArgumentPackBundle(prior);
  return [prior];
};

export const loadHsk4InformationOrderCohesionSummaryArgumentPackBundle = (
  root = process.cwd(),
) => {
  const prerequisites = prerequisiteBundles(root);
  return loadHsk4SummaryArgumentModulePackBundle({
    root,
    relativePath:
      HSK4_INFORMATION_ORDER_COHESION_SUMMARY_ARGUMENT_RELATIVE_PATH,
    longFormHeadBundle: prerequisites[0].longFormHeadBundle,
    prerequisiteBundles: prerequisites,
  });
};

export const validateHsk4InformationOrderCohesionSummaryArgumentPackBundle =
  (bundle) => validateHsk4SummaryArgumentModulePackBundle({
    bundle,
    config: HSK4_INFORMATION_ORDER_COHESION_CONFIG,
  });

export const assertValidHsk4InformationOrderCohesionSummaryArgumentPackBundle =
  (bundle) => assertValidHsk4SummaryArgumentModulePackBundle({
    bundle,
    config: HSK4_INFORMATION_ORDER_COHESION_CONFIG,
  });
