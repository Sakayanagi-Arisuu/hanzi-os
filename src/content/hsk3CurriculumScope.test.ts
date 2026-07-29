import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildHsk3CurriculumScope,
  serializeHsk3CurriculumScope,
} from "../../scripts/content/build-hsk3-curriculum-scope.mjs";
import {
  assertValidHsk3CurriculumScopeBundle,
  loadHsk3CurriculumScopeBundle,
  validateHsk3CurriculumScopeBundle,
} from "./hsk3CurriculumScope.mjs";

describe("HSK3 differentiated curriculum scope", () => {
  it("partitions the exact official inventory into a 55-lesson plan", () => {
    const bundle = loadHsk3CurriculumScopeBundle();
    const result = assertValidHsk3CurriculumScopeBundle(bundle);

    expect(result.summary).toEqual({
      units: 3,
      discourseDomains: 5,
      grammarModules: 5,
      productionStages: 5,
      plannedLessonBlueprints: 55,
      plannedMinimumPromptUnits: 92,
      tasks: 22,
      topics: 54,
      vocabulary: 500,
      grammarRows: 96,
      recognitionCharacters: 284,
    });
  });

  it("keeps the route materially different from HSK2", () => {
    const scope = loadHsk3CurriculumScopeBundle().scope;

    expect(scope.discourseDomains.map(
      (domain: { domainId: string }) => domain.domainId,
    )).toEqual([
      "hsk3-personal-life-narratives",
      "hsk3-study-work-accounts",
      "hsk3-nature-environment-explanations",
      "hsk3-society-arts-sports-reports",
      "hsk3-culture-tradition-descriptions",
    ]);
    expect(
      scope.unitScopes.find(
        (unit: { unitId: string }) =>
          unit.unitId === "hsk3-guided-production",
      ).productionStages.map(
        (stage: { mode: string }) => stage.mode,
      ),
    ).toEqual([
      "paragraph-listening-reading-note-grid",
      "paragraph-order-and-cohesion-reconstruction",
      "reviewed-event-retelling-from-notes",
      "six-to-eight-sentence-guided-paragraph",
      "reviewed-spoken-explanation-and-comparison",
    ]);
  });

  it("fails closed on missing inventory and inflated completion claims", () => {
    const bundle = loadHsk3CurriculumScopeBundle();
    const scope = structuredClone(bundle.scope);
    scope.unitScopes[0].vocabularyIds.pop();
    scope.coverageClaims.hsk3Complete = true;

    const result = validateHsk3CurriculumScopeBundle({ ...bundle, scope });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "vocabularyIds must exactly partition the official HSK3 inventory",
      "HSK3 scope coverage claims are invalid",
    ]));
  });

  it("keeps the checked scope deterministic", () => {
    const bundle = loadHsk3CurriculumScopeBundle();
    expect(readFileSync(bundle.scopePath, "utf8")).toBe(
      serializeHsk3CurriculumScope(buildHsk3CurriculumScope()),
    );
  });
});
