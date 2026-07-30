import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk4StructuredWrittenArgumentIntegrationPack,
} from "../../scripts/content/build-hsk4-structured-written-argument-integration-pack.mjs";
import {
  serializeHsk4IntegrationStagePack,
} from "../../scripts/content/hsk4-integration-stage-builder.mjs";
import {
  assertValidHsk4StructuredWrittenArgumentIntegrationPackBundle,
  HSK4_STRUCTURED_WRITTEN_ARGUMENT_INTEGRATION_RELATIVE_PATH,
  loadHsk4StructuredWrittenArgumentIntegrationPackBundle,
  validateHsk4StructuredWrittenArgumentIntegrationPackBundle,
} from "./hsk4StructuredWrittenArgumentIntegrationPack.mjs";

describe("HSK4 structured written argument integration pack", () => {
  it("authors stage four as timed rehearsal without scoring authority", () => {
    const result =
      assertValidHsk4StructuredWrittenArgumentIntegrationPackBundle(
        loadHsk4StructuredWrittenArgumentIntegrationPackBundle(),
      );
    expect(result.summary).toEqual({
      lessons: 3,
      completedIntegrationStages: 4,
      completedIntegrationLessons: 12,
      sourceBindings: 6,
      uniqueSourceTexts: 6,
      readingSourceBindings: 6,
      listeningSourceBindings: 0,
      promptUnits: 16,
      skillEvidenceUnits: {
        listening: 0,
        reading: 5,
        speaking: 0,
        writing: 11,
      },
      timedPromptUnits: 16,
      audioDependentPromptUnits: 0,
      learnerRecordingPromptUnits: 0,
      reviewedRubrics: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 3,
      approvals: 0,
      releaseEligibleItems: 0,
    });
  });

  it("rejects a timed writing prompt without a bounded contract", () => {
    const bundle =
      loadHsk4StructuredWrittenArgumentIntegrationPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.lessons[0].promptUnits[0].responseContract.maximum = 401;
    const result =
      validateHsk4StructuredWrittenArgumentIntegrationPackBundle({
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
        HSK4_STRUCTURED_WRITTEN_ARGUMENT_INTEGRATION_RELATIVE_PATH,
      ),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk4IntegrationStagePack(
        buildHsk4StructuredWrittenArgumentIntegrationPack(),
      ),
    );
  });
});
