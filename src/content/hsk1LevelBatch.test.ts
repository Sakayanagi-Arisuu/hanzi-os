import { describe, expect, it } from "vitest";
import {
  loadHsk1LevelBatchBundle,
  projectHsk1LevelPackageInputs,
  projectHsk1LevelRichLessons,
  validateHsk1LevelBatchBundle,
} from "./hsk1LevelBatch.mjs";

describe("HSK1 full-level local study batch", () => {
  it("binds all official inventory without human, mastery, or production claims", async () => {
    const result = await validateHsk1LevelBatchBundle(
      loadHsk1LevelBatchBundle(),
    );

    expect(result).toEqual({
      valid: true,
      errors: [],
      summary: {
        lessons: 40,
        vocabulary: 300,
        recognitionCharacters: 246,
        grammarRows: 66,
        tasks: 15,
        topics: 30,
        levelCheckItems: 50,
      },
    });
  });

  it("projects one immutable level package while keeping legacy local IDs", async () => {
    const projected = await projectHsk1LevelPackageInputs();

    expect(projected.summary).toMatchObject({
      officialVocabularyItems: 300,
      hsk1Lessons: 40,
      runtimeVocabularyIds: 316,
      runtimeLessons: 44,
      humanReviewed: false,
      productionEligible: false,
    });
    expect(projected.runtimeIds.vocabularyIds).toContain("ni");
    expect(projected.runtimeIds.vocabularyIds).toContain("hsk-vocab-00300");
    expect(projected.runtimeIds.lessons.at(-1)?.id).toBe("characters-15");
  });

  it("materializes rich lesson content for all 40 blueprints", async () => {
    const projected = await projectHsk1LevelRichLessons();

    expect(projected.counts).toEqual({
      lessons: 40,
      dialogueTurns: 132,
      richLessons: 40,
      officialGrammarRows: 66,
      officialTasks: 15,
      officialTopics: 30,
      officialCharacters: 246,
    });
    expect(projected.policy).toMatchObject({
      humanReviewed: false,
      browserTtsPracticeOnly: true,
      measurementEligible: false,
      masteryEligible: false,
      prerequisiteWaiverEligible: false,
      productionEligible: false,
      sitesAuthorized: false,
    });
  });

  it("fails closed when a reviewed core lesson drifts", async () => {
    const bundle = loadHsk1LevelBatchBundle();
    bundle.core.lessons[0].payload.title = "tampered";

    const result = await validateHsk1LevelBatchBundle(bundle);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "HSK1 level core projection does not match reviewed payloads",
    );
  });
});
