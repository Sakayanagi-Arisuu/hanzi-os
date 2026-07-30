import {
  assertValidHsk4IntegrationStagePackBundle,
  loadHsk4IntegrationStagePackBundle,
  validateHsk4IntegrationStagePackBundle,
} from "./hsk4IntegrationStagePack.mjs";
import {
  assertValidHsk4LongInputStructureMapIntegrationPackBundle,
  loadHsk4LongInputStructureMapIntegrationPackBundle,
} from "./hsk4LongInputStructureMapIntegrationPack.mjs";

export const HSK4_INFERENCE_EVIDENCE_CHECK_INTEGRATION_RELATIVE_PATH =
  "content/drafts/hsk4-inference-evidence-check-integration-2026.07.json";
export const HSK4_INFERENCE_EVIDENCE_CHECK_TRACK_ID =
  "hsk4-inference-evidence-check";
export const HSK4_INFERENCE_EVIDENCE_CHECK_LESSON_IDS = Array.from(
  { length: 3 },
  (_, index) =>
    `${HSK4_INFERENCE_EVIDENCE_CHECK_TRACK_ID}-lesson-${
      String(index + 1).padStart(2, "0")
    }`,
);
export const HSK4_INFERENCE_EVIDENCE_CHECK_CONFIG = {
  packId: "hsk4-inference-evidence-check-integration-2026.07",
  trackId: HSK4_INFERENCE_EVIDENCE_CHECK_TRACK_ID,
  lessonIds: HSK4_INFERENCE_EVIDENCE_CHECK_LESSON_IDS,
  skills: ["listening", "reading", "writing"],
  sourceKindsByDomain: [
    "long-form-reading",
    "long-form-listening",
  ],
  timed: false,
  completedIntegrationStages: 2,
  completedIntegrationLessons: 6,
};

const prerequisiteBundles = (root) => {
  const prior = loadHsk4LongInputStructureMapIntegrationPackBundle(root);
  assertValidHsk4LongInputStructureMapIntegrationPackBundle(prior);
  return [prior];
};

export const loadHsk4InferenceEvidenceCheckIntegrationPackBundle = (
  root = process.cwd(),
) => {
  const prerequisites = prerequisiteBundles(root);
  return loadHsk4IntegrationStagePackBundle({
    root,
    relativePath: HSK4_INFERENCE_EVIDENCE_CHECK_INTEGRATION_RELATIVE_PATH,
    summaryArgumentHeadBundle:
      prerequisites[0].summaryArgumentHeadBundle,
    prerequisiteBundles: prerequisites,
  });
};

export const validateHsk4InferenceEvidenceCheckIntegrationPackBundle =
  (bundle) => validateHsk4IntegrationStagePackBundle({
    bundle,
    config: HSK4_INFERENCE_EVIDENCE_CHECK_CONFIG,
  });

export const assertValidHsk4InferenceEvidenceCheckIntegrationPackBundle =
  (bundle) => assertValidHsk4IntegrationStagePackBundle({
    bundle,
    config: HSK4_INFERENCE_EVIDENCE_CHECK_CONFIG,
  });
