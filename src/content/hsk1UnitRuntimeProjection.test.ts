import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCheckedHsk1UnitRuntimeProjection,
  serializeHsk1UnitRuntimeProjection,
} from "../../scripts/content/build-hsk1-unit-runtime-projection.mjs";
import { formatMarkedPinyin, parseNumberedPinyin } from "../lib/pinyin";
import {
  assertValidHsk1UnitRuntimeProjectionBundle,
  HSK1_UNIT_RUNTIME_PROJECTION_RELATIVE_PATH,
  loadHsk1UnitRuntimeProjectionBundle,
  validateHsk1UnitRuntimeProjectionBundle,
} from "./hsk1UnitRuntimeProjection.mjs";

describe("HSK1 atomic unit runtime projection", () => {
  it("authors all 87 required runtime payloads without releasing them", async () => {
    const bundle = loadHsk1UnitRuntimeProjectionBundle();
    const result = await assertValidHsk1UnitRuntimeProjectionBundle(bundle);

    expect(result.summary).toEqual({
      runtimeCatalogItems: 87,
      lexemes: 81,
      lessons: 6,
      safeRuntimeLexemeIds: 81,
      safeRuntimeLessonIds: 6,
      traditionalEditorialDecisions: 7,
      numberedPinyinOverrides: 5,
      newExampleDrafts: 42,
      dialogueExampleCandidates: 39,
      crossUnitPrerequisites: 1,
      reviewBatches: 6,
      requiredReviewSlots: 18,
      approvals: 0,
      finalizedPayloads: 0,
      unrepresentedNonCoreTargets: 338,
      releaseEligibleItems: 0,
    });
    expect(bundle.projection.claims).toMatchObject({
      payloadsAuthored: true,
      fullUnitRuntimeProjectionComplete: false,
      humanReviewComplete: false,
      packageImportAuthorized: false,
      runtimeMutated: false,
      learnerContentExposed: false,
      masteryGranted: false,
    });
    expect(bundle.projection.runtimeRepresentability).toEqual({
      sourceContentTargets: 425,
      directlyProjectedCoreTargets: 87,
      unrepresentedNonCoreTargets: 338,
      unrepresentedTargetCounts: {
        "dialogue-turn": 24,
        "grammar-draft": 25,
        "grammar-practice": 25,
        "task-dialogue-turn": 12,
        "task-practice": 3,
        "task-scenario": 3,
        "topic-draft": 3,
        "vocabulary-practice": 243,
      },
      requiredNextSchemaSurface:
        "versioned lesson activity/dialogue and knowledge projection",
      exactReviewedPracticeCurrentlyConsumedByRuntime: false,
      packageImportMustRemainBlocked: true,
    });
  });

  it("projects parseable numbered pinyin matching every marked form", () => {
    const bundle = loadHsk1UnitRuntimeProjectionBundle();

    for (const lexeme of bundle.projection.lexemes) {
      expect(formatMarkedPinyin(parseNumberedPinyin(
        lexeme.payload.pinyinNumbered,
      )).toLocaleLowerCase("en")).toBe(
        lexeme.payload.pinyin.toLocaleLowerCase("en"),
      );
      expect(lexeme.payload.example).toContain(lexeme.payload.simplified);
    }
  });

  it("adds a safe sequential lesson graph after the released HSK1 bridge", () => {
    const bundle = loadHsk1UnitRuntimeProjectionBundle();
    const lessons = bundle.projection.lessons;

    expect(lessons[0].prerequisites).toEqual([
      { itemType: "lesson", itemId: "survival-4" },
    ]);
    for (let index = 1; index < lessons.length; index += 1) {
      expect(lessons[index].prerequisites).toEqual([{
        itemType: "lesson",
        itemId: lessons[index - 1].runtimeLessonId,
      }]);
    }
    expect(lessons.every((lesson: { runtimeLessonId: string }) =>
      /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u.test(lesson.runtimeLessonId))).toBe(true);
  });

  it("rejects forged approval and remains deterministic", async () => {
    const bundle = loadHsk1UnitRuntimeProjectionBundle();
    const forged = structuredClone(bundle.projection);
    forged.reviewBatches[0].approvals.push({ reviewerId: "forged" });
    expect((await validateHsk1UnitRuntimeProjectionBundle({
      source: bundle.source,
      projection: forged,
    })).valid).toBe(false);

    const checked = readFileSync(
      resolve(process.cwd(), HSK1_UNIT_RUNTIME_PROJECTION_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(serializeHsk1UnitRuntimeProjection(
      await buildCheckedHsk1UnitRuntimeProjection(),
    ));
  });
});
