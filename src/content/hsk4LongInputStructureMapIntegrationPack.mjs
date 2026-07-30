import {
  assertValidHsk4IntegrationStagePackBundle,
  loadHsk4IntegrationStagePackBundle,
  validateHsk4IntegrationStagePackBundle,
} from "./hsk4IntegrationStagePack.mjs";
import {
  assertValidHsk4ArgumentLogicConcessionSummaryArgumentPackBundle,
  loadHsk4ArgumentLogicConcessionSummaryArgumentPackBundle,
} from "./hsk4ArgumentLogicConcessionSummaryArgumentPack.mjs";

export const HSK4_LONG_INPUT_STRUCTURE_MAP_INTEGRATION_RELATIVE_PATH =
  "content/drafts/hsk4-long-input-structure-map-integration-2026.07.json";
export const HSK4_LONG_INPUT_STRUCTURE_MAP_TRACK_ID =
  "hsk4-long-input-structure-map";
export const HSK4_LONG_INPUT_STRUCTURE_MAP_LESSON_IDS = Array.from(
  { length: 3 },
  (_, index) =>
    `${HSK4_LONG_INPUT_STRUCTURE_MAP_TRACK_ID}-lesson-${
      String(index + 1).padStart(2, "0")
    }`,
);
export const HSK4_LONG_INPUT_STRUCTURE_MAP_CONFIG = {
  packId: "hsk4-long-input-structure-map-integration-2026.07",
  trackId: HSK4_LONG_INPUT_STRUCTURE_MAP_TRACK_ID,
  lessonIds: HSK4_LONG_INPUT_STRUCTURE_MAP_LESSON_IDS,
  skills: ["listening", "reading", "writing"],
  sourceKindsByDomain: [
    "long-form-reading",
    "long-form-listening",
  ],
  timed: false,
  completedIntegrationStages: 1,
  completedIntegrationLessons: 3,
};

const summaryArgumentHeadBundle = (root) => {
  const bundle =
    loadHsk4ArgumentLogicConcessionSummaryArgumentPackBundle(root);
  assertValidHsk4ArgumentLogicConcessionSummaryArgumentPackBundle(bundle);
  return bundle;
};

export const loadHsk4LongInputStructureMapIntegrationPackBundle = (
  root = process.cwd(),
) => loadHsk4IntegrationStagePackBundle({
  root,
  relativePath: HSK4_LONG_INPUT_STRUCTURE_MAP_INTEGRATION_RELATIVE_PATH,
  summaryArgumentHeadBundle: summaryArgumentHeadBundle(root),
  prerequisiteBundles: [],
});

export const validateHsk4LongInputStructureMapIntegrationPackBundle =
  (bundle) => validateHsk4IntegrationStagePackBundle({
    bundle,
    config: HSK4_LONG_INPUT_STRUCTURE_MAP_CONFIG,
  });

export const assertValidHsk4LongInputStructureMapIntegrationPackBundle =
  (bundle) => assertValidHsk4IntegrationStagePackBundle({
    bundle,
    config: HSK4_LONG_INPUT_STRUCTURE_MAP_CONFIG,
  });
