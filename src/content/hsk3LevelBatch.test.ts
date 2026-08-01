import { describe, expect, it } from "vitest";
import {
  loadHsk3LevelBatchBundle,
  loadHsk3LevelBatchSources,
  projectHsk3LevelPackageInputs,
  validateHsk3LevelBatchBundle,
} from "./hsk3LevelBatch.mjs";

describe("HSK3 personal local-study level batch", () => {
  it("binds the complete HSK3 inventory to fifty-five lessons", async () => {
    const result = await validateHsk3LevelBatchBundle(
      loadHsk3LevelBatchBundle(),
    );
    expect(result.valid).toBe(true);
    expect(result.summary).toEqual({
      lessons: 55,
      paragraphInputLessons: 25,
      narrationLessons: 15,
      guidedProductionLessons: 15,
      vocabulary: 500,
      recognitionCharacters: 284,
      grammarRows: 96,
      tasks: 22,
      topics: 54,
      levelCheckObjectiveItems: 54,
      guidedPromptUnits: 92,
    });
  });

  it("extends HSK2 and preserves the level prerequisite bridge", async () => {
    const projected = await projectHsk3LevelPackageInputs(
      loadHsk3LevelBatchSources(),
    );
    expect(projected.summary).toMatchObject({
      officialVocabularyItems: 500,
      hsk3Lessons: 55,
      runtimeVocabularyIds: 1016,
      runtimeLessons: 139,
      humanReviewed: false,
      productionEligible: false,
    });
    expect(projected.runtimeIds.lessons[84]?.prerequisiteIds)
      .toEqual(["hsk2-picture-description-lesson-02"]);
    expect(projected.runtimeIds.lessons.at(-1)?.id)
      .toBe("hsk3-structured-explanation-lesson-03");
  });
});
