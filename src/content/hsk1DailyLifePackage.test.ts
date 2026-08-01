import { describe, expect, it } from "vitest";
import { validateMaterializedHsk1DailyLifePackage } from "./hsk1DailyLifePackage.mjs";

describe("HSK1 daily-life local-study package", () => {
  it("materializes the reviewed lesson replacements and lexemes exactly", async () => {
    const result = await validateMaterializedHsk1DailyLifePackage();

    expect(result).toEqual({
      valid: true,
      errors: [],
      summary: {
        inheritedItems: 147,
        replacedLessons: 4,
        addedLexemes: 54,
        totalItems: 205,
        runtimeVocabularyIds: 155,
        runtimeLessons: 30,
        humanReviewed: false,
        localStudyReady: true,
        productionEligible: false,
      },
    });
  });
});
