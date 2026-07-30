import {
  assertValidHsk4IntegrationStagePackBundle,
  loadHsk4IntegrationStagePackBundle,
  validateHsk4IntegrationStagePackBundle,
} from "./hsk4IntegrationStagePack.mjs";
import {
  assertValidHsk4StructuredSpokenDefenseIntegrationPackBundle,
  loadHsk4StructuredSpokenDefenseIntegrationPackBundle,
} from "./hsk4StructuredSpokenDefenseIntegrationPack.mjs";

export const HSK4_TIMED_SECTIONAL_REHEARSAL_INTEGRATION_RELATIVE_PATH =
  "content/drafts/hsk4-timed-sectional-rehearsal-integration-2026.07.json";
export const HSK4_TIMED_SECTIONAL_REHEARSAL_TRACK_ID =
  "hsk4-timed-sectional-rehearsal";
export const HSK4_TIMED_SECTIONAL_REHEARSAL_LESSON_IDS = Array.from(
  { length: 3 },
  (_, index) =>
    `${HSK4_TIMED_SECTIONAL_REHEARSAL_TRACK_ID}-lesson-${
      String(index + 1).padStart(2, "0")
    }`,
);
export const HSK4_TIMED_SECTIONAL_REHEARSAL_CONFIG = {
  packId: "hsk4-timed-sectional-rehearsal-integration-2026.07",
  trackId: HSK4_TIMED_SECTIONAL_REHEARSAL_TRACK_ID,
  lessonIds: HSK4_TIMED_SECTIONAL_REHEARSAL_LESSON_IDS,
  skills: ["listening", "reading", "speaking", "writing"],
  sourceKindsByDomain: [
    "long-form-reading",
    "long-form-listening",
  ],
  timed: true,
  completedIntegrationStages: 6,
  completedIntegrationLessons: 18,
};

const prerequisiteBundles = (root) => {
  const prior =
    loadHsk4StructuredSpokenDefenseIntegrationPackBundle(root);
  assertValidHsk4StructuredSpokenDefenseIntegrationPackBundle(prior);
  return [prior];
};

export const loadHsk4TimedSectionalRehearsalIntegrationPackBundle = (
  root = process.cwd(),
) => {
  const prerequisites = prerequisiteBundles(root);
  return loadHsk4IntegrationStagePackBundle({
    root,
    relativePath:
      HSK4_TIMED_SECTIONAL_REHEARSAL_INTEGRATION_RELATIVE_PATH,
    summaryArgumentHeadBundle:
      prerequisites[0].summaryArgumentHeadBundle,
    prerequisiteBundles: prerequisites,
  });
};

export const validateHsk4TimedSectionalRehearsalIntegrationPackBundle =
  (bundle) =>
    validateHsk4IntegrationStagePackBundle({
      bundle,
      config: HSK4_TIMED_SECTIONAL_REHEARSAL_CONFIG,
    });

export const assertValidHsk4TimedSectionalRehearsalIntegrationPackBundle =
  (bundle) =>
    assertValidHsk4IntegrationStagePackBundle({
      bundle,
      config: HSK4_TIMED_SECTIONAL_REHEARSAL_CONFIG,
    });
