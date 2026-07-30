import {
  assertValidHsk4IntegrationStagePackBundle,
  loadHsk4IntegrationStagePackBundle,
  validateHsk4IntegrationStagePackBundle,
} from "./hsk4IntegrationStagePack.mjs";
import {
  assertValidHsk4StructuredWrittenArgumentIntegrationPackBundle,
  loadHsk4StructuredWrittenArgumentIntegrationPackBundle,
} from "./hsk4StructuredWrittenArgumentIntegrationPack.mjs";

export const HSK4_STRUCTURED_SPOKEN_DEFENSE_INTEGRATION_RELATIVE_PATH =
  "content/drafts/hsk4-structured-spoken-defense-integration-2026.07.json";
export const HSK4_STRUCTURED_SPOKEN_DEFENSE_TRACK_ID =
  "hsk4-structured-spoken-defense";
export const HSK4_STRUCTURED_SPOKEN_DEFENSE_LESSON_IDS = Array.from(
  { length: 3 },
  (_, index) =>
    `${HSK4_STRUCTURED_SPOKEN_DEFENSE_TRACK_ID}-lesson-${
      String(index + 1).padStart(2, "0")
    }`,
);
export const HSK4_STRUCTURED_SPOKEN_DEFENSE_CONFIG = {
  packId: "hsk4-structured-spoken-defense-integration-2026.07",
  trackId: HSK4_STRUCTURED_SPOKEN_DEFENSE_TRACK_ID,
  lessonIds: HSK4_STRUCTURED_SPOKEN_DEFENSE_LESSON_IDS,
  skills: ["listening", "speaking"],
  sourceKindsByDomain: ["long-form-listening"],
  timed: true,
  completedIntegrationStages: 5,
  completedIntegrationLessons: 15,
};

const prerequisiteBundles = (root) => {
  const prior =
    loadHsk4StructuredWrittenArgumentIntegrationPackBundle(root);
  assertValidHsk4StructuredWrittenArgumentIntegrationPackBundle(prior);
  return [prior];
};

export const loadHsk4StructuredSpokenDefenseIntegrationPackBundle = (
  root = process.cwd(),
) => {
  const prerequisites = prerequisiteBundles(root);
  return loadHsk4IntegrationStagePackBundle({
    root,
    relativePath: HSK4_STRUCTURED_SPOKEN_DEFENSE_INTEGRATION_RELATIVE_PATH,
    summaryArgumentHeadBundle:
      prerequisites[0].summaryArgumentHeadBundle,
    prerequisiteBundles: prerequisites,
  });
};

export const validateHsk4StructuredSpokenDefenseIntegrationPackBundle =
  (bundle) =>
    validateHsk4IntegrationStagePackBundle({
      bundle,
      config: HSK4_STRUCTURED_SPOKEN_DEFENSE_CONFIG,
    });

export const assertValidHsk4StructuredSpokenDefenseIntegrationPackBundle =
  (bundle) =>
    assertValidHsk4IntegrationStagePackBundle({
      bundle,
      config: HSK4_STRUCTURED_SPOKEN_DEFENSE_CONFIG,
    });
