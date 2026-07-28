import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk2ShortTextProduction,
  HSK2_SHORT_TEXT_PRODUCTION_RELATIVE_PATH,
  serializeHsk2ShortTextProduction,
} from "../../scripts/content/build-hsk2-short-text-production.mjs";
import {
  assertValidHsk2ShortTextProductionBundle,
  loadHsk2ShortTextProductionBundle,
  validateHsk2ShortTextProductionBundle,
} from "./hsk2ShortTextProduction.mjs";

describe("HSK2 short-text production pack", () => {
  it("authors the complete four-stage prompt minimum", () => {
    const bundle = loadHsk2ShortTextProductionBundle();
    const result = assertValidHsk2ShortTextProductionBundle(bundle);

    expect(result.summary).toEqual({
      lessons: 10,
      promptUnits: 104,
      dictationPrompts: 36,
      reconstructionPrompts: 36,
      guidedMessagePrompts: 16,
      pictureDescriptionPrompts: 16,
      modelSentences: 168,
      targetCharacterPromptMappings: 125,
      audioDependentPrompts: 36,
      reviewedAudioPrompts: 0,
      reviewBatches: 10,
      approvals: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      releaseEligibleItems: 0,
    });
  });

  it("uses every assigned character in exactly one lesson prompt answer", () => {
    const { pack } = loadHsk2ShortTextProductionBundle();

    for (const lesson of pack.lessons) {
      const mapped = lesson.prompts.flatMap(
        (item: {
          targetCharacterRefs: Array<{ officialCharacterId: string }>;
        }) => item.targetCharacterRefs.map(
          (target) => target.officialCharacterId,
        ),
      );
      expect(mapped).toHaveLength(lesson.targetCharacters.length);
      expect(new Set(mapped).size).toBe(lesson.targetCharacters.length);
    }
  });

  it("fails closed on missing target text, fake audio or writing mastery", () => {
    const bundle = loadHsk2ShortTextProductionBundle();
    const pack = structuredClone(bundle.pack);
    pack.lessons[0].prompts[0].stimulus.hanzi = "好的！";
    pack.lessons[0].prompts[0].stimulus.audio = {
      assetId: "invented-audio",
    };
    pack.lessons[0].prompts[0].evidencePolicy.masteryEligible = true;

    const result = validateHsk2ShortTextProductionBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "hsk2-dictation-lesson-01:production-01 evidence policy is invalid",
      "hsk2-dictation-lesson-01:production-01 dictation content is invalid",
      "hsk2-dictation-lesson-01:production-01 does not use target character 啊",
      "HSK2 short-text production counts are stale or invalid",
    ]));
  });

  it("detects reconstruction pieces that no longer match the answer", () => {
    const bundle = loadHsk2ShortTextProductionBundle();
    const pack = structuredClone(bundle.pack);
    const lesson = pack.lessons.find(
      (item: { lessonId: string }) =>
        item.lessonId === "hsk2-sentence-reconstruction-lesson-01",
    );
    lesson.prompts[0].segments[0] = "机场";

    const result = validateHsk2ShortTextProductionBundle({
      ...bundle,
      pack,
    });

    expect(result.errors).toContain(
      "hsk2-sentence-reconstruction-lesson-01:production-01 reconstruction content is invalid",
    );
  });

  it("keeps the generated production artifact deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK2_SHORT_TEXT_PRODUCTION_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk2ShortTextProduction(buildHsk2ShortTextProduction()),
    );
  });
});
