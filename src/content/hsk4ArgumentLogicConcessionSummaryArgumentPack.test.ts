import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk4ArgumentLogicConcessionSummaryArgumentPack,
} from "../../scripts/content/build-hsk4-argument-logic-concession-summary-argument-pack.mjs";
import {
  serializeHsk4SummaryArgumentModulePack,
} from "../../scripts/content/hsk4-summary-argument-module-builder.mjs";
import {
  assertValidHsk4ArgumentLogicConcessionSummaryArgumentPackBundle,
  HSK4_ARGUMENT_LOGIC_CONCESSION_SUMMARY_ARGUMENT_RELATIVE_PATH,
  loadHsk4ArgumentLogicConcessionSummaryArgumentPackBundle,
  validateHsk4ArgumentLogicConcessionSummaryArgumentPackBundle,
} from "./hsk4ArgumentLogicConcessionSummaryArgumentPack.mjs";

describe("HSK4 argument/logic/concession summary-argument pack", () => {
  it("completes all 24 summary-argument lessons without granting mastery", () => {
    const bundle =
      loadHsk4ArgumentLogicConcessionSummaryArgumentPackBundle();
    const result =
      assertValidHsk4ArgumentLogicConcessionSummaryArgumentPackBundle(
        bundle,
      );
    expect(result.summary).toEqual({
      lessons: 4,
      completedSummaryArgumentModules: 5,
      completedSummaryArgumentLessons: 24,
      sourceBindings: 8,
      grammarTargets: 16,
      grammarPracticeItems: 16,
      sourceAuditItems: 8,
      paraphraseItems: 8,
      structuredSummaryPrompts: 4,
      structuredArgumentPrompts: 4,
      spokenDefensePrompts: 4,
      authoredPracticeItems: 44,
      audioDependentItems: 20,
      learnerRecordingItems: 4,
      reviewedRubrics: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 4,
      approvals: 0,
      releaseEligibleItems: 0,
    });
  });

  it("rejects an argument that discards its source boundary", () => {
    const bundle =
      loadHsk4ArgumentLogicConcessionSummaryArgumentPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.lessons[0].argumentPrompt.conclusionBoundaryVi = "";
    const result =
      validateHsk4ArgumentLogicConcessionSummaryArgumentPackBundle({
        ...bundle,
        pack,
      });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      `${pack.lessons[0].lessonId} structured argument is invalid`,
    );
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(
        process.cwd(),
        HSK4_ARGUMENT_LOGIC_CONCESSION_SUMMARY_ARGUMENT_RELATIVE_PATH,
      ),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk4SummaryArgumentModulePack(
        buildHsk4ArgumentLogicConcessionSummaryArgumentPack(),
      ),
    );
  });
});
