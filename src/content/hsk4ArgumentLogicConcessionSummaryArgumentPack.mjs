import {
  assertValidHsk4SummaryArgumentModulePackBundle,
  loadHsk4SummaryArgumentModulePackBundle,
  validateHsk4SummaryArgumentModulePackBundle,
} from "./hsk4SummaryArgumentModulePack.mjs";
import {
  assertValidHsk4InformationOrderCohesionSummaryArgumentPackBundle,
  loadHsk4InformationOrderCohesionSummaryArgumentPackBundle,
} from "./hsk4InformationOrderCohesionSummaryArgumentPack.mjs";

export const HSK4_ARGUMENT_LOGIC_CONCESSION_SUMMARY_ARGUMENT_RELATIVE_PATH =
  "content/drafts/hsk4-argument-logic-concession-summary-argument-2026.07.json";
export const HSK4_ARGUMENT_LOGIC_CONCESSION_TRACK_ID =
  "hsk4-argument-logic-concession";
export const HSK4_ARGUMENT_LOGIC_CONCESSION_LESSON_IDS = Array.from(
  { length: 4 },
  (_, index) =>
    `${HSK4_ARGUMENT_LOGIC_CONCESSION_TRACK_ID}-lesson-${
      String(index + 1).padStart(2, "0")
    }`,
);
export const HSK4_ARGUMENT_LOGIC_CONCESSION_CONFIG = {
  packId: "hsk4-argument-logic-concession-summary-argument-2026.07",
  trackId: HSK4_ARGUMENT_LOGIC_CONCESSION_TRACK_ID,
  lessonIds: HSK4_ARGUMENT_LOGIC_CONCESSION_LESSON_IDS,
  completedSummaryArgumentModules: 5,
  completedSummaryArgumentLessons: 24,
};

const prerequisiteBundles = (root) => {
  const prior =
    loadHsk4InformationOrderCohesionSummaryArgumentPackBundle(root);
  assertValidHsk4InformationOrderCohesionSummaryArgumentPackBundle(prior);
  return [prior];
};

export const loadHsk4ArgumentLogicConcessionSummaryArgumentPackBundle = (
  root = process.cwd(),
) => {
  const prerequisites = prerequisiteBundles(root);
  return loadHsk4SummaryArgumentModulePackBundle({
    root,
    relativePath:
      HSK4_ARGUMENT_LOGIC_CONCESSION_SUMMARY_ARGUMENT_RELATIVE_PATH,
    longFormHeadBundle: prerequisites[0].longFormHeadBundle,
    prerequisiteBundles: prerequisites,
  });
};

export const validateHsk4ArgumentLogicConcessionSummaryArgumentPackBundle =
  (bundle) => validateHsk4SummaryArgumentModulePackBundle({
    bundle,
    config: HSK4_ARGUMENT_LOGIC_CONCESSION_CONFIG,
  });

export const assertValidHsk4ArgumentLogicConcessionSummaryArgumentPackBundle =
  (bundle) => assertValidHsk4SummaryArgumentModulePackBundle({
    bundle,
    config: HSK4_ARGUMENT_LOGIC_CONCESSION_CONFIG,
  });
