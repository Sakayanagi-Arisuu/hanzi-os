import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk4StanceComparisonRhetoricSummaryArgumentPack,
} from "../../scripts/content/build-hsk4-stance-comparison-rhetoric-summary-argument-pack.mjs";
import {
  serializeHsk4SummaryArgumentModulePack,
} from "../../scripts/content/hsk4-summary-argument-module-builder.mjs";
import {
  assertValidHsk4StanceComparisonRhetoricSummaryArgumentPackBundle,
  HSK4_STANCE_COMPARISON_RHETORIC_SUMMARY_ARGUMENT_RELATIVE_PATH,
  loadHsk4StanceComparisonRhetoricSummaryArgumentPackBundle,
  validateHsk4StanceComparisonRhetoricSummaryArgumentPackBundle,
} from "./hsk4StanceComparisonRhetoricSummaryArgumentPack.mjs";

describe("HSK4 stance/comparison/rhetoric summary-argument pack", () => {
  it("authors five source-disjoint lessons without granting mastery", () => {
    const bundle =
      loadHsk4StanceComparisonRhetoricSummaryArgumentPackBundle();
    const result =
      assertValidHsk4StanceComparisonRhetoricSummaryArgumentPackBundle(
        bundle,
      );
    expect(result.summary).toEqual({
      lessons: 5,
      completedSummaryArgumentModules: 2,
      completedSummaryArgumentLessons: 11,
      sourceBindings: 10,
      grammarTargets: 21,
      grammarPracticeItems: 21,
      sourceAuditItems: 10,
      paraphraseItems: 10,
      structuredSummaryPrompts: 5,
      structuredArgumentPrompts: 5,
      spokenDefensePrompts: 5,
      authoredPracticeItems: 56,
      audioDependentItems: 25,
      learnerRecordingItems: 5,
      reviewedRubrics: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 5,
      approvals: 0,
      releaseEligibleItems: 0,
    });
    const bindings = bundle.pack.lessons.flatMap(
      (lesson: { sourceBindings: Array<{ kind: string; textId: string }> }) =>
        lesson.sourceBindings,
    );
    expect(new Set(
      bindings.map((source: { textId: string }) => source.textId),
    ).size).toBe(10);
    expect(bundle.pack.lessons.every(
      (lesson: { sourceBindings: Array<{ kind: string }> }) =>
        lesson.sourceBindings[0].kind === "long-form-reading"
        && lesson.sourceBindings[1].kind === "long-form-listening",
    )).toBe(true);
  });

  it("rejects a reused source and a mastery-capable spoken rubric", () => {
    const bundle =
      loadHsk4StanceComparisonRhetoricSummaryArgumentPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.lessons[1].sourceBindings[0] =
      structuredClone(pack.lessons[0].sourceBindings[0]);
    pack.lessons[0].spokenDefensePrompt.rubric.scoringAuthority =
      "automatic-mastery";
    const result =
      validateHsk4StanceComparisonRhetoricSummaryArgumentPackBundle({
        ...bundle,
        pack,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      `${pack.lessons[0].lessonId} spoken defense is invalid`,
      "HSK4 summary/argument IDs or source partition are invalid",
    ]));
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(
        process.cwd(),
        HSK4_STANCE_COMPARISON_RHETORIC_SUMMARY_ARGUMENT_RELATIVE_PATH,
      ),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk4SummaryArgumentModulePack(
        buildHsk4StanceComparisonRhetoricSummaryArgumentPack(),
      ),
    );
  });
});
