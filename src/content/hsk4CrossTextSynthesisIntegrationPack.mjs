import {
  assertValidHsk4IntegrationStagePackBundle,
  loadHsk4IntegrationStagePackBundle,
  validateHsk4IntegrationStagePackBundle,
} from "./hsk4IntegrationStagePack.mjs";
import {
  assertValidHsk4InferenceEvidenceCheckIntegrationPackBundle,
  loadHsk4InferenceEvidenceCheckIntegrationPackBundle,
} from "./hsk4InferenceEvidenceCheckIntegrationPack.mjs";

export const HSK4_CROSS_TEXT_SYNTHESIS_INTEGRATION_RELATIVE_PATH =
  "content/drafts/hsk4-cross-text-synthesis-integration-2026.07.json";
export const HSK4_CROSS_TEXT_SYNTHESIS_TRACK_ID =
  "hsk4-cross-text-synthesis";
export const HSK4_CROSS_TEXT_SYNTHESIS_LESSON_IDS = Array.from(
  { length: 3 },
  (_, index) =>
    `${HSK4_CROSS_TEXT_SYNTHESIS_TRACK_ID}-lesson-${
      String(index + 1).padStart(2, "0")
    }`,
);
export const HSK4_CROSS_TEXT_SYNTHESIS_CONFIG = {
  packId: "hsk4-cross-text-synthesis-integration-2026.07",
  trackId: HSK4_CROSS_TEXT_SYNTHESIS_TRACK_ID,
  lessonIds: HSK4_CROSS_TEXT_SYNTHESIS_LESSON_IDS,
  skills: ["listening", "reading", "writing"],
  sourceKindsByDomain: ["long-form-reading", "long-form-listening"],
  timed: false,
  completedIntegrationStages: 3,
  completedIntegrationLessons: 9,
};

const prerequisiteBundles = (root) => {
  const prior = loadHsk4InferenceEvidenceCheckIntegrationPackBundle(root);
  assertValidHsk4InferenceEvidenceCheckIntegrationPackBundle(prior);
  return [prior];
};

export const loadHsk4CrossTextSynthesisIntegrationPackBundle = (
  root = process.cwd(),
) => {
  const prerequisites = prerequisiteBundles(root);
  return loadHsk4IntegrationStagePackBundle({
    root,
    relativePath: HSK4_CROSS_TEXT_SYNTHESIS_INTEGRATION_RELATIVE_PATH,
    summaryArgumentHeadBundle: prerequisites[0].summaryArgumentHeadBundle,
    prerequisiteBundles: prerequisites,
  });
};

export const validateHsk4CrossTextSynthesisIntegrationPackBundle = (bundle) =>
  validateHsk4IntegrationStagePackBundle({
    bundle,
    config: HSK4_CROSS_TEXT_SYNTHESIS_CONFIG,
  });

export const assertValidHsk4CrossTextSynthesisIntegrationPackBundle = (
  bundle,
) =>
  assertValidHsk4IntegrationStagePackBundle({
    bundle,
    config: HSK4_CROSS_TEXT_SYNTHESIS_CONFIG,
  });
