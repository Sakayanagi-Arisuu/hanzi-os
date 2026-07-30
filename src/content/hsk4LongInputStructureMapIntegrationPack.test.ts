import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk4LongInputStructureMapIntegrationPack,
} from "../../scripts/content/build-hsk4-long-input-structure-map-integration-pack.mjs";
import {
  serializeHsk4IntegrationStagePack,
} from "../../scripts/content/hsk4-integration-stage-builder.mjs";
import {
  assertValidHsk4LongInputStructureMapIntegrationPackBundle,
  HSK4_LONG_INPUT_STRUCTURE_MAP_INTEGRATION_RELATIVE_PATH,
  loadHsk4LongInputStructureMapIntegrationPackBundle,
  validateHsk4LongInputStructureMapIntegrationPackBundle,
} from "./hsk4LongInputStructureMapIntegrationPack.mjs";

describe("HSK4 long-input structure-map integration pack", () => {
  it("authors the first three integration lessons without granting mastery", () => {
    const result =
      assertValidHsk4LongInputStructureMapIntegrationPackBundle(
        loadHsk4LongInputStructureMapIntegrationPackBundle(),
      );
    expect(result.summary).toEqual({
      lessons: 3,
      completedIntegrationStages: 1,
      completedIntegrationLessons: 3,
      sourceBindings: 12,
      uniqueSourceTexts: 12,
      readingSourceBindings: 6,
      listeningSourceBindings: 6,
      promptUnits: 24,
      skillEvidenceUnits: {
        listening: 9,
        reading: 9,
        speaking: 0,
        writing: 6,
      },
      timedPromptUnits: 0,
      audioDependentPromptUnits: 15,
      learnerRecordingPromptUnits: 0,
      reviewedRubrics: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 3,
      approvals: 0,
      releaseEligibleItems: 0,
    });
  });

  it("rejects a writing contract that drops cross-source evidence", () => {
    const bundle =
      loadHsk4LongInputStructureMapIntegrationPackBundle();
    const pack = structuredClone(bundle.pack);
    const writingPrompt = pack.lessons[0].promptUnits.find(
      (prompt: { primarySkill: string }) =>
        prompt.primarySkill === "writing",
    );
    writingPrompt.responseContract.minimumSources = 1;
    const result =
      validateHsk4LongInputStructureMapIntegrationPackBundle({
        ...bundle,
        pack,
      });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      `${writingPrompt.promptUnitId} is invalid`,
    );
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(
        process.cwd(),
        HSK4_LONG_INPUT_STRUCTURE_MAP_INTEGRATION_RELATIVE_PATH,
      ),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk4IntegrationStagePack(
        buildHsk4LongInputStructureMapIntegrationPack(),
      ),
    );
  });
});
