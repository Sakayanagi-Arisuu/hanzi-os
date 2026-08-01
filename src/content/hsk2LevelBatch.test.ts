import { describe, expect, it } from "vitest";
import {
  loadHsk2LevelBatchBundle,
  loadHsk2LevelBatchSources,
  projectHsk2LevelPackageInputs,
  validateHsk2LevelBatchBundle,
} from "./hsk2LevelBatch.mjs";

describe("HSK2 personal local-study level batch", () => {
  it("binds all learner-visible HSK2 inventory to forty lessons", async () => {
    const result = await validateHsk2LevelBatchBundle(
      loadHsk2LevelBatchBundle(),
    );
    expect(result).toEqual({
      valid: true,
      errors: [],
      summary: {
        lessons: 40,
        vocabulary: 200,
        recognitionCharacters: 125,
        grammarRows: 75,
        tasks: 17,
        topics: 34,
        levelCheckObjectiveItems: 60,
        shortTextPromptUnits: 104,
      },
    });
  });

  it("extends the existing local runtime without changing HSK1 identities", async () => {
    const projected = await projectHsk2LevelPackageInputs(
      loadHsk2LevelBatchSources(),
    );
    expect(projected.summary).toMatchObject({
      officialVocabularyItems: 200,
      hsk2Lessons: 40,
      runtimeVocabularyIds: 516,
      runtimeLessons: 84,
      humanReviewed: false,
      productionEligible: false,
    });
    expect(projected.runtimeIds.lessons[43]?.id).toBe("characters-15");
    expect(projected.runtimeIds.lessons[44]?.prerequisiteIds)
      .toEqual(["characters-15"]);
    expect(projected.runtimeIds.lessons.at(-1)?.id)
      .toBe("hsk2-picture-description-lesson-02");
  });
});
