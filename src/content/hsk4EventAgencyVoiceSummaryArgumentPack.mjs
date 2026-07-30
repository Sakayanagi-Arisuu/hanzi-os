import {
  assertValidHsk4SummaryArgumentModulePackBundle,
  loadHsk4SummaryArgumentModulePackBundle,
  validateHsk4SummaryArgumentModulePackBundle,
} from "./hsk4SummaryArgumentModulePack.mjs";
import {
  assertValidHsk4StanceComparisonRhetoricSummaryArgumentPackBundle,
  loadHsk4StanceComparisonRhetoricSummaryArgumentPackBundle,
} from "./hsk4StanceComparisonRhetoricSummaryArgumentPack.mjs";

export const HSK4_EVENT_AGENCY_VOICE_SUMMARY_ARGUMENT_RELATIVE_PATH =
  "content/drafts/hsk4-event-agency-voice-summary-argument-2026.07.json";
export const HSK4_EVENT_AGENCY_VOICE_TRACK_ID =
  "hsk4-event-agency-voice";
export const HSK4_EVENT_AGENCY_VOICE_LESSON_IDS = Array.from(
  { length: 4 },
  (_, index) =>
    `${HSK4_EVENT_AGENCY_VOICE_TRACK_ID}-lesson-${
      String(index + 1).padStart(2, "0")
    }`,
);
export const HSK4_EVENT_AGENCY_VOICE_CONFIG = {
  packId: "hsk4-event-agency-voice-summary-argument-2026.07",
  trackId: HSK4_EVENT_AGENCY_VOICE_TRACK_ID,
  lessonIds: HSK4_EVENT_AGENCY_VOICE_LESSON_IDS,
  completedSummaryArgumentModules: 3,
  completedSummaryArgumentLessons: 15,
};

const prerequisiteBundles = (root) => {
  const prior =
    loadHsk4StanceComparisonRhetoricSummaryArgumentPackBundle(root);
  assertValidHsk4StanceComparisonRhetoricSummaryArgumentPackBundle(prior);
  return [prior];
};

export const loadHsk4EventAgencyVoiceSummaryArgumentPackBundle = (
  root = process.cwd(),
) => {
  const prerequisites = prerequisiteBundles(root);
  return loadHsk4SummaryArgumentModulePackBundle({
    root,
    relativePath: HSK4_EVENT_AGENCY_VOICE_SUMMARY_ARGUMENT_RELATIVE_PATH,
    longFormHeadBundle: prerequisites[0].longFormHeadBundle,
    prerequisiteBundles: prerequisites,
  });
};

export const validateHsk4EventAgencyVoiceSummaryArgumentPackBundle =
  (bundle) => validateHsk4SummaryArgumentModulePackBundle({
    bundle,
    config: HSK4_EVENT_AGENCY_VOICE_CONFIG,
  });

export const assertValidHsk4EventAgencyVoiceSummaryArgumentPackBundle =
  (bundle) => assertValidHsk4SummaryArgumentModulePackBundle({
    bundle,
    config: HSK4_EVENT_AGENCY_VOICE_CONFIG,
  });
