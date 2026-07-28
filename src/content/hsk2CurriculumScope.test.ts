import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertValidHsk2CurriculumScopeBundle,
  loadHsk2CurriculumScopeBundle,
  validateHsk2CurriculumScopeBundle,
} from "./hsk2CurriculumScope.mjs";
import {
  buildHsk2CurriculumScope,
  serializeHsk2CurriculumScope,
} from "../../scripts/content/build-hsk2-curriculum-scope.mjs";

describe("HSK2 differentiated authoring scope", () => {
  it("partitions the exact official inventory through three distinct units", () => {
    const bundle = loadHsk2CurriculumScopeBundle();
    const result = assertValidHsk2CurriculumScopeBundle(bundle);

    expect(result.summary).toEqual({
      units: 3,
      situationalStrands: 4,
      grammarModules: 4,
      productionStages: 4,
      plannedLessonBlueprints: 40,
      tasks: 17,
      topics: 34,
      vocabulary: 200,
      grammarRows: 75,
      recognitionCharacters: 125,
    });
    expect(bundle.scope.coverageClaims).toEqual({
      officialInventoryScoped: true,
      differentiatedHsk2BlueprintComplete: true,
      lessonPracticeCoverageComplete: false,
      reviewedContentComplete: false,
      hsk2Complete: false,
    });
  });

  it("uses semantic strands, grammar modules and productive stages", () => {
    const { scope } = loadHsk2CurriculumScopeBundle();
    const [situational, sentenceChains, shortText] = scope.unitScopes;

    expect(situational.strands.map(
      (strand: {
        taskIds: string[];
        topicIds: string[];
        vocabularyIds: string[];
      }) => [
        strand.taskIds.length,
        strand.topicIds.length,
        strand.vocabularyIds.length,
      ],
    )).toEqual([
      [5, 6, 38],
      [5, 12, 52],
      [2, 6, 74],
      [5, 10, 36],
    ]);
    expect(sentenceChains.grammarModules.map(
      (module: { grammarRowIds: string[] }) => module.grammarRowIds.length,
    )).toEqual([36, 19, 11, 9]);
    expect(shortText.productionStages).toHaveLength(4);
  });

  it("fails closed on duplicate strands, coverage overclaim or fake lessons", () => {
    const bundle = loadHsk2CurriculumScopeBundle();
    const scope = structuredClone(bundle.scope);
    scope.unitScopes[0].strands[1].vocabularyIds.push(
      scope.unitScopes[0].strands[0].vocabularyIds[0],
    );
    scope.coverageClaims.hsk2Complete = true;
    scope.coverageClaims.lessonPracticeCoverageComplete = true;

    const result = validateHsk2CurriculumScopeBundle({
      ...bundle,
      scope,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK2 scope coverage claims are invalid",
      "HSK2 situational strands must partition vocabularyIds",
    ]));
  });

  it("reports malformed nested collections instead of throwing", () => {
    const bundle = loadHsk2CurriculumScopeBundle();
    const scope = structuredClone(bundle.scope);
    scope.unitScopes[0].strands = null;
    scope.unitScopes[1].grammarModules = null;
    scope.unitScopes[2].productionStages = null;

    expect(() => validateHsk2CurriculumScopeBundle({
      ...bundle,
      scope,
    })).not.toThrow();
    expect(validateHsk2CurriculumScopeBundle({
      ...bundle,
      scope,
    }).valid).toBe(false);
  });

  it("keeps the checked HSK2 scope deterministic", () => {
    const bundle = loadHsk2CurriculumScopeBundle();
    expect(readFileSync(bundle.scopePath, "utf8")).toBe(
      serializeHsk2CurriculumScope(buildHsk2CurriculumScope()),
    );
  });
});
