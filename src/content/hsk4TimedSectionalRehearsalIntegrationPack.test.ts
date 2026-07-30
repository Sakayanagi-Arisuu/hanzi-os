import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk4TimedSectionalRehearsalIntegrationPack,
} from "../../scripts/content/build-hsk4-timed-sectional-rehearsal-integration-pack.mjs";
import {
  serializeHsk4IntegrationStagePack,
} from "../../scripts/content/hsk4-integration-stage-builder.mjs";
import {
  assertValidHsk4TimedSectionalRehearsalIntegrationPackBundle,
  HSK4_TIMED_SECTIONAL_REHEARSAL_INTEGRATION_RELATIVE_PATH,
  loadHsk4TimedSectionalRehearsalIntegrationPackBundle,
  validateHsk4TimedSectionalRehearsalIntegrationPackBundle,
} from "./hsk4TimedSectionalRehearsalIntegrationPack.mjs";

describe("HSK4 timed sectional-rehearsal integration pack", () => {
  it("completes all 18 integration lessons with four isolated skills", () => {
    const bundle =
      loadHsk4TimedSectionalRehearsalIntegrationPackBundle();
    const result =
      assertValidHsk4TimedSectionalRehearsalIntegrationPackBundle(
        bundle,
      );
    expect(result.summary).toEqual({
      lessons: 3,
      completedIntegrationStages: 6,
      completedIntegrationLessons: 18,
      sourceBindings: 12,
      uniqueSourceTexts: 12,
      readingSourceBindings: 6,
      listeningSourceBindings: 6,
      promptUnits: 12,
      skillEvidenceUnits: {
        listening: 3,
        reading: 3,
        speaking: 3,
        writing: 3,
      },
      timedPromptUnits: 12,
      audioDependentPromptUnits: 6,
      learnerRecordingPromptUnits: 3,
      reviewedRubrics: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 3,
      approvals: 0,
      releaseEligibleItems: 0,
    });
  });

  it("rejects a writing prompt that contributes to listening evidence", () => {
    const bundle =
      loadHsk4TimedSectionalRehearsalIntegrationPackBundle();
    const pack = structuredClone(bundle.pack);
    const writing = pack.lessons[0].promptUnits.find(
      (unit: { primarySkill: string }) =>
        unit.primarySkill === "writing",
    );
    writing.evidencePolicy.contributesOnlyTo = "listening";
    const result =
      validateHsk4TimedSectionalRehearsalIntegrationPackBundle({
        ...bundle,
        pack,
      });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(`${writing.promptUnitId} is invalid`);
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(
        process.cwd(),
        HSK4_TIMED_SECTIONAL_REHEARSAL_INTEGRATION_RELATIVE_PATH,
      ),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk4IntegrationStagePack(
        buildHsk4TimedSectionalRehearsalIntegrationPack(),
      ),
    );
  });
});
