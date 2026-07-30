import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk4InferenceEvidenceCheckIntegrationPack,
} from "../../scripts/content/build-hsk4-inference-evidence-check-integration-pack.mjs";
import {
  serializeHsk4IntegrationStagePack,
} from "../../scripts/content/hsk4-integration-stage-builder.mjs";
import {
  assertValidHsk4InferenceEvidenceCheckIntegrationPackBundle,
  HSK4_INFERENCE_EVIDENCE_CHECK_INTEGRATION_RELATIVE_PATH,
  loadHsk4InferenceEvidenceCheckIntegrationPackBundle,
  validateHsk4InferenceEvidenceCheckIntegrationPackBundle,
} from "./hsk4InferenceEvidenceCheckIntegrationPack.mjs";

describe("HSK4 inference/evidence-check integration pack", () => {
  it("extends the chain to six lessons with skill-separated evidence", () => {
    const result =
      assertValidHsk4InferenceEvidenceCheckIntegrationPackBundle(
        loadHsk4InferenceEvidenceCheckIntegrationPackBundle(),
      );
    expect(result.summary).toEqual({
      lessons: 3,
      completedIntegrationStages: 2,
      completedIntegrationLessons: 6,
      sourceBindings: 12,
      uniqueSourceTexts: 12,
      readingSourceBindings: 6,
      listeningSourceBindings: 6,
      promptUnits: 20,
      skillEvidenceUnits: {
        listening: 6,
        reading: 6,
        speaking: 0,
        writing: 8,
      },
      timedPromptUnits: 0,
      audioDependentPromptUnits: 14,
      learnerRecordingPromptUnits: 0,
      reviewedRubrics: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 3,
      approvals: 0,
      releaseEligibleItems: 0,
    });
  });

  it("rejects an overreach prompt without a substantive boundary", () => {
    const bundle =
      loadHsk4InferenceEvidenceCheckIntegrationPackBundle();
    const pack = structuredClone(bundle.pack);
    const prompt = pack.lessons[2].promptUnits.at(-1);
    prompt.scopeBoundaryVi = "";
    const result =
      validateHsk4InferenceEvidenceCheckIntegrationPackBundle({
        ...bundle,
        pack,
      });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(`${prompt.promptUnitId} is invalid`);
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(
        process.cwd(),
        HSK4_INFERENCE_EVIDENCE_CHECK_INTEGRATION_RELATIVE_PATH,
      ),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk4IntegrationStagePack(
        buildHsk4InferenceEvidenceCheckIntegrationPack(),
      ),
    );
  });
});
