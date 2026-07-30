import {
  assertValidHsk4IntegrationStagePackBundle,
  loadHsk4IntegrationStagePackBundle,
  validateHsk4IntegrationStagePackBundle,
} from "./hsk4IntegrationStagePack.mjs";
import {
  assertValidHsk4CrossTextSynthesisIntegrationPackBundle,
  loadHsk4CrossTextSynthesisIntegrationPackBundle,
} from "./hsk4CrossTextSynthesisIntegrationPack.mjs";

export const HSK4_STRUCTURED_WRITTEN_ARGUMENT_INTEGRATION_RELATIVE_PATH =
  "content/drafts/hsk4-structured-written-argument-integration-2026.07.json";
export const HSK4_STRUCTURED_WRITTEN_ARGUMENT_TRACK_ID =
  "hsk4-structured-written-argument";
export const HSK4_STRUCTURED_WRITTEN_ARGUMENT_LESSON_IDS = Array.from(
  { length: 3 },
  (_, index) =>
    `${HSK4_STRUCTURED_WRITTEN_ARGUMENT_TRACK_ID}-lesson-${
      String(index + 1).padStart(2, "0")
    }`,
);
export const HSK4_STRUCTURED_WRITTEN_ARGUMENT_CONFIG = {
  packId: "hsk4-structured-written-argument-integration-2026.07",
  trackId: HSK4_STRUCTURED_WRITTEN_ARGUMENT_TRACK_ID,
  lessonIds: HSK4_STRUCTURED_WRITTEN_ARGUMENT_LESSON_IDS,
  skills: ["reading", "writing"],
  sourceKindsByDomain: ["long-form-reading"],
  timed: true,
  completedIntegrationStages: 4,
  completedIntegrationLessons: 12,
};

const prerequisiteBundles = (root) => {
  const prior = loadHsk4CrossTextSynthesisIntegrationPackBundle(root);
  assertValidHsk4CrossTextSynthesisIntegrationPackBundle(prior);
  return [prior];
};

export const loadHsk4StructuredWrittenArgumentIntegrationPackBundle = (
  root = process.cwd(),
) => {
  const prerequisites = prerequisiteBundles(root);
  return loadHsk4IntegrationStagePackBundle({
    root,
    relativePath:
      HSK4_STRUCTURED_WRITTEN_ARGUMENT_INTEGRATION_RELATIVE_PATH,
    summaryArgumentHeadBundle: prerequisites[0].summaryArgumentHeadBundle,
    prerequisiteBundles: prerequisites,
  });
};

export const validateHsk4StructuredWrittenArgumentIntegrationPackBundle = (
  bundle,
) =>
  validateHsk4IntegrationStagePackBundle({
    bundle,
    config: HSK4_STRUCTURED_WRITTEN_ARGUMENT_CONFIG,
  });

export const assertValidHsk4StructuredWrittenArgumentIntegrationPackBundle = (
  bundle,
) =>
  assertValidHsk4IntegrationStagePackBundle({
    bundle,
    config: HSK4_STRUCTURED_WRITTEN_ARGUMENT_CONFIG,
  });
