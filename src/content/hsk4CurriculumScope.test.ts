import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildHsk4CurriculumScope,
  serializeHsk4CurriculumScope,
} from "../../scripts/content/build-hsk4-curriculum-scope.mjs";
import {
  assertValidHsk4CurriculumScopeBundle,
  loadHsk4CurriculumScopeBundle,
  validateHsk4CurriculumScopeBundle,
} from "./hsk4CurriculumScope.mjs";

describe("HSK4 differentiated curriculum scope", () => {
  it("partitions the exact official inventory into a 78-lesson plan", () => {
    const bundle = loadHsk4CurriculumScopeBundle();
    const result = assertValidHsk4CurriculumScopeBundle(bundle);

    expect(result.summary).toEqual({
      units: 3,
      discourseDomains: 6,
      grammarModules: 5,
      integrationStages: 6,
      timedIntegrationStages: 3,
      plannedLessonBlueprints: 78,
      plannedMinimumPromptUnits: 106,
      tasks: 30,
      topics: 77,
      vocabulary: 1_000,
      grammarRows: 95,
      recognitionCharacters: 441,
    });
  });

  it("keeps HSK4 materially deeper and timed instead of copying HSK3", () => {
    const scope = loadHsk4CurriculumScopeBundle().scope;
    const timed = scope.unitScopes.find(
      (unit: { unitId: string }) =>
        unit.unitId === "hsk4-timed-integration",
    );

    expect(scope.discourseDomains.map(
      (domain: { domainId: string }) => domain.domainId,
    )).toEqual([
      "hsk4-personal-community-analysis",
      "hsk4-education-work-evaluation",
      "hsk4-nature-technology-explanation",
      "hsk4-society-economy-argument",
      "hsk4-arts-sports-exchange-critique",
      "hsk4-culture-history-interpretation",
    ]);
    expect(timed.integrationStages.filter(
      (stage: { timed: boolean }) => stage.timed,
    )).toHaveLength(3);
    expect(timed.integrationStages.map(
      (stage: { mode: string }) => stage.mode,
    )).toContain("timed-skill-separated-mock-rehearsal");
  });

  it("fails closed on missing inventory and inflated completion claims", () => {
    const bundle = loadHsk4CurriculumScopeBundle();
    const scope = structuredClone(bundle.scope);
    scope.unitScopes[0].vocabularyIds.pop();
    scope.coverageClaims.hsk4Complete = true;

    const result = validateHsk4CurriculumScopeBundle({ ...bundle, scope });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "vocabularyIds must exactly partition the official HSK4 inventory",
      "HSK4 scope coverage claims are invalid",
    ]));
  });

  it("keeps the checked scope deterministic", () => {
    const bundle = loadHsk4CurriculumScopeBundle();
    expect(readFileSync(bundle.scopePath, "utf8")).toBe(
      serializeHsk4CurriculumScope(buildHsk4CurriculumScope()),
    );
  });
});
