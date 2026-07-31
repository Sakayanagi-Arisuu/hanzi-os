import { describe, expect, it } from "vitest";
import {
  loadHsk1LocalStudyPackageSources,
  projectHsk1LocalStudyPackageInputs,
  validateMaterializedHsk1LocalStudyPackage,
} from "./hsk1LocalStudyPackage.mjs";

describe("HSK1 local-study package", () => {
  it("adds the reviewed 81 lexemes and six lessons to the inherited package", async () => {
    const projected = await projectHsk1LocalStudyPackageInputs(
      loadHsk1LocalStudyPackageSources(),
    );

    expect(projected.summary).toEqual({
      inheritedItems: 74,
      addedLexemes: 81,
      addedLessons: 6,
      totalItems: 161,
      runtimeVocabularyIds: 105,
      runtimeLessons: 30,
      humanReviewed: false,
      localStudyReady: true,
      productionEligible: false,
    });
    expect(projected.itemCatalog.items.slice(-6).every(
      (item: { itemType: string; releaseState: string }) =>
        item.itemType === "lesson" && item.releaseState === "beta",
    )).toBe(true);
  });

  it("matches the materialized immutable package", async () => {
    const result = await validateMaterializedHsk1LocalStudyPackage();

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
