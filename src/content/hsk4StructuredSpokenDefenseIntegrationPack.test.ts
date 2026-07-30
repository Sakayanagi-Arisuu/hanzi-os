import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk4StructuredSpokenDefenseIntegrationPack,
} from "../../scripts/content/build-hsk4-structured-spoken-defense-integration-pack.mjs";
import {
  serializeHsk4IntegrationStagePack,
} from "../../scripts/content/hsk4-integration-stage-builder.mjs";
import {
  assertValidHsk4StructuredSpokenDefenseIntegrationPackBundle,
  HSK4_STRUCTURED_SPOKEN_DEFENSE_INTEGRATION_RELATIVE_PATH,
  loadHsk4StructuredSpokenDefenseIntegrationPackBundle,
  validateHsk4StructuredSpokenDefenseIntegrationPackBundle,
} from "./hsk4StructuredSpokenDefenseIntegrationPack.mjs";

describe("HSK4 structured spoken-defense integration pack", () => {
  it("authors 16 skill-separated timed prompts without granting mastery", () => {
    const bundle =
      loadHsk4StructuredSpokenDefenseIntegrationPackBundle();
    const result =
      assertValidHsk4StructuredSpokenDefenseIntegrationPackBundle(
        bundle,
      );
    expect(result.summary).toEqual({
      lessons: 3,
      completedIntegrationStages: 5,
      completedIntegrationLessons: 15,
      sourceBindings: 6,
      uniqueSourceTexts: 6,
      readingSourceBindings: 0,
      listeningSourceBindings: 6,
      promptUnits: 16,
      skillEvidenceUnits: {
        listening: 8,
        reading: 0,
        speaking: 8,
        writing: 0,
      },
      timedPromptUnits: 16,
      audioDependentPromptUnits: 16,
      learnerRecordingPromptUnits: 8,
      reviewedRubrics: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 3,
      approvals: 0,
      releaseEligibleItems: 0,
    });
  });

  it("rejects a speaking response contract expressed as written Hanzi", () => {
    const bundle =
      loadHsk4StructuredSpokenDefenseIntegrationPackBundle();
    const pack = structuredClone(bundle.pack);
    const speaking = pack.lessons[0].promptUnits.find(
      (unit: { primarySkill: string }) =>
        unit.primarySkill === "speaking",
    );
    speaking.responseContract.unit = "hanzi";
    const result =
      validateHsk4StructuredSpokenDefenseIntegrationPackBundle({
        ...bundle,
        pack,
      });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(`${speaking.promptUnitId} is invalid`);
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(
        process.cwd(),
        HSK4_STRUCTURED_SPOKEN_DEFENSE_INTEGRATION_RELATIVE_PATH,
      ),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk4IntegrationStagePack(
        buildHsk4StructuredSpokenDefenseIntegrationPack(),
      ),
    );
  });
});
