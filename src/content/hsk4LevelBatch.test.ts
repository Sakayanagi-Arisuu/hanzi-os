import { describe, expect, it } from "vitest";
import {
  loadHsk4LevelBatchBundle,
  loadHsk4LevelBatchSources,
  projectHsk4LevelPackageInputs,
  validateHsk4LevelBatchBundle,
} from "./hsk4LevelBatch.mjs";

describe("HSK4 personal local-study level batch", () => {
  it("binds the complete HSK4 inventory to seventy-eight lessons", async () => {
    const result = await validateHsk4LevelBatchBundle(
      loadHsk4LevelBatchBundle(),
    );
    expect(result.valid).toBe(true);
    expect(result.summary).toEqual({
      lessons: 78,
      deepComprehensionLessons: 36,
      summaryArgumentLessons: 24,
      timedIntegrationLessons: 18,
      vocabulary: 1000,
      recognitionCharacters: 441,
      grammarRows: 95,
      tasks: 30,
      topics: 77,
      levelCheckObjectiveItems: 72,
      longParagraphs: 216,
      integrationPromptUnits: 106,
    });
  });

  it("extends HSK3 and preserves the level prerequisite bridge", async () => {
    const projected = await projectHsk4LevelPackageInputs(
      loadHsk4LevelBatchSources(),
    );
    expect(projected.summary).toMatchObject({
      officialVocabularyItems: 1000,
      hsk4Lessons: 78,
      runtimeVocabularyIds: 2016,
      runtimeLessons: 217,
      humanReviewed: false,
      productionEligible: false,
    });
    expect(projected.runtimeIds.lessons[139]?.prerequisiteIds)
      .toEqual(["hsk3-structured-explanation-lesson-03"]);
    expect(projected.runtimeIds.lessons.at(-1)?.id)
      .toBe("hsk4-timed-sectional-rehearsal-lesson-03");
  });
});
