import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertValidHsk1CurriculumScopeBundle,
  loadHsk1CurriculumScopeBundle,
  validateHsk1CurriculumScopeBundle,
} from "./hsk1CurriculumScope.mjs";
import {
  buildHsk1CurriculumScope,
  serializeHsk1CurriculumScope,
} from "../../scripts/content/build-hsk1-curriculum-scope.mjs";

describe("HSK1 complete authoring scope", () => {
  it("partitions every official inventory item into six distinct units", () => {
    const bundle = loadHsk1CurriculumScopeBundle();
    const result = assertValidHsk1CurriculumScopeBundle(bundle);

    expect(result.summary).toEqual({
      units: 6,
      tasks: 15,
      topics: 30,
      vocabulary: 300,
      grammarRows: 66,
      recognitionCharacters: 246,
    });
    expect(bundle.scope).toMatchObject({
      state: "authoring-scope",
      learnerVisible: false,
      releaseEligible: false,
      coverageClaims: {
        officialInventoryScoped: true,
        lessonPracticeCoverageComplete: false,
        hsk1Complete: false,
      },
    });
  });

  it("uses different emphases and exit evidence across communicative units", () => {
    const { scope } = loadHsk1CurriculumScopeBundle();
    const counts = Object.fromEntries(scope.unitScopes.map(
      (unit: {
        unitId: string;
        taskIds: string[];
        topicIds: string[];
        vocabularyIds: string[];
        grammarRowIds: string[];
        recognitionCharacterIds: string[];
      }) => [
        unit.unitId,
        [
          unit.taskIds.length,
          unit.topicIds.length,
          unit.vocabularyIds.length,
          unit.grammarRowIds.length,
          unit.recognitionCharacterIds.length,
        ],
      ],
    ));

    expect(counts).toEqual({
      "hsk1-personal-exchange": [2, 5, 107, 32, 0],
      "hsk1-time-place-events": [3, 3, 66, 25, 0],
      "hsk1-daily-life": [5, 10, 69, 5, 0],
      "hsk1-travel-leisure": [2, 4, 23, 3, 0],
      "hsk1-study-work": [3, 8, 35, 1, 0],
      "hsk1-character-foundation": [0, 0, 0, 0, 246],
    });
    expect(new Set(scope.unitScopes.map(
      (unit: { exitEvidence: { mode: string } }) => unit.exitEvidence.mode,
    )).size).toBe(6);
  });

  it("fails closed on duplicate scope assignment or coverage overclaim", () => {
    const bundle = loadHsk1CurriculumScopeBundle();
    const scope = structuredClone(bundle.scope);
    scope.unitScopes[1].taskIds.push(scope.unitScopes[0].taskIds[0]);
    scope.coverageClaims.hsk1Complete = true;

    const result = validateHsk1CurriculumScopeBundle({ ...bundle, scope });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK1 scope coverage claims are invalid",
      "taskIds must exactly partition the official HSK1 inventory",
    ]));
  });

  it("keeps the checked scope deterministic", () => {
    const bundle = loadHsk1CurriculumScopeBundle();
    expect(readFileSync(bundle.scopePath, "utf8")).toBe(
      serializeHsk1CurriculumScope(buildHsk1CurriculumScope()),
    );
  });
});
