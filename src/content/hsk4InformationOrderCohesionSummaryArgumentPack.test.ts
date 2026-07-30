import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk4InformationOrderCohesionSummaryArgumentPack,
} from "../../scripts/content/build-hsk4-information-order-cohesion-summary-argument-pack.mjs";
import {
  serializeHsk4SummaryArgumentModulePack,
} from "../../scripts/content/hsk4-summary-argument-module-builder.mjs";
import {
  assertValidHsk4InformationOrderCohesionSummaryArgumentPackBundle,
  HSK4_INFORMATION_ORDER_COHESION_SUMMARY_ARGUMENT_RELATIVE_PATH,
  loadHsk4InformationOrderCohesionSummaryArgumentPackBundle,
  validateHsk4InformationOrderCohesionSummaryArgumentPackBundle,
} from "./hsk4InformationOrderCohesionSummaryArgumentPack.mjs";

describe("HSK4 information/order/cohesion summary-argument pack", () => {
  it("authors five source-bound lessons without granting mastery", () => {
    const bundle =
      loadHsk4InformationOrderCohesionSummaryArgumentPackBundle();
    const result =
      assertValidHsk4InformationOrderCohesionSummaryArgumentPackBundle(
        bundle,
      );
    expect(result.summary).toEqual({
      lessons: 5,
      completedSummaryArgumentModules: 4,
      completedSummaryArgumentLessons: 20,
      sourceBindings: 10,
      grammarTargets: 14,
      grammarPracticeItems: 14,
      sourceAuditItems: 10,
      paraphraseItems: 10,
      structuredSummaryPrompts: 5,
      structuredArgumentPrompts: 5,
      spokenDefensePrompts: 5,
      authoredPracticeItems: 49,
      audioDependentItems: 25,
      learnerRecordingItems: 5,
      reviewedRubrics: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 5,
      approvals: 0,
      releaseEligibleItems: 0,
    });
    expect(bundle.pack.lessons.every(
      (lesson: { sourceBindings: Array<{ kind: string }> }) =>
        lesson.sourceBindings[0].kind === "long-form-reading"
        && lesson.sourceBindings[1].kind === "long-form-listening",
    )).toBe(true);
  });

  it("rejects a reordered source and an overclaiming conclusion", () => {
    const bundle =
      loadHsk4InformationOrderCohesionSummaryArgumentPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.lessons[0].sourceBindings.reverse();
    pack.lessons[0].argumentPrompt.conclusionBoundaryVi = "quá rộng";
    const result =
      validateHsk4InformationOrderCohesionSummaryArgumentPackBundle({
        ...bundle,
        pack,
      });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      `${pack.lessons[0].lessonId} blueprint/source binding is invalid`,
      `${pack.lessons[0].lessonId} structured argument is invalid`,
    ]));
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(
        process.cwd(),
        HSK4_INFORMATION_ORDER_COHESION_SUMMARY_ARGUMENT_RELATIVE_PATH,
      ),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk4SummaryArgumentModulePack(
        buildHsk4InformationOrderCohesionSummaryArgumentPack(),
      ),
    );
  });
});
