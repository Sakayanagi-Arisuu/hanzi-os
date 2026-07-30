import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk4CrossTextSynthesisIntegrationPack,
} from "../../scripts/content/build-hsk4-cross-text-synthesis-integration-pack.mjs";
import {
  serializeHsk4IntegrationStagePack,
} from "../../scripts/content/hsk4-integration-stage-builder.mjs";
import {
  assertValidHsk4CrossTextSynthesisIntegrationPackBundle,
  HSK4_CROSS_TEXT_SYNTHESIS_INTEGRATION_RELATIVE_PATH,
  loadHsk4CrossTextSynthesisIntegrationPackBundle,
  validateHsk4CrossTextSynthesisIntegrationPackBundle,
} from "./hsk4CrossTextSynthesisIntegrationPack.mjs";

describe("HSK4 cross-text synthesis integration pack", () => {
  it("authors stage three without granting cross-skill mastery", () => {
    const result = assertValidHsk4CrossTextSynthesisIntegrationPackBundle(
      loadHsk4CrossTextSynthesisIntegrationPackBundle(),
    );
    expect(result.summary).toEqual({
      lessons: 3,
      completedIntegrationStages: 3,
      completedIntegrationLessons: 9,
      sourceBindings: 12,
      uniqueSourceTexts: 12,
      readingSourceBindings: 6,
      listeningSourceBindings: 6,
      promptUnits: 18,
      skillEvidenceUnits: {
        listening: 3,
        reading: 6,
        speaking: 0,
        writing: 9,
      },
      timedPromptUnits: 0,
      audioDependentPromptUnits: 18,
      learnerRecordingPromptUnits: 0,
      reviewedRubrics: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 3,
      approvals: 0,
      releaseEligibleItems: 0,
    });
  });

  it("rejects a synthesis prompt that drops one source domain", () => {
    const bundle = loadHsk4CrossTextSynthesisIntegrationPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.lessons[0].promptUnits[0].evidenceRefs =
      pack.lessons[0].promptUnits[0].evidenceRefs.slice(0, 1);
    const result = validateHsk4CrossTextSynthesisIntegrationPackBundle({
      ...bundle,
      pack,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      `${pack.lessons[0].promptUnits[0].promptUnitId} is invalid`,
    );
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(
        process.cwd(),
        HSK4_CROSS_TEXT_SYNTHESIS_INTEGRATION_RELATIVE_PATH,
      ),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk4IntegrationStagePack(
        buildHsk4CrossTextSynthesisIntegrationPack(),
      ),
    );
  });
});
