import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk3CohesionReconstructionPack,
  serializeHsk3CohesionReconstructionPack,
} from "../../scripts/content/build-hsk3-cohesion-reconstruction-pack.mjs";
import {
  assertValidHsk3CohesionReconstructionPackBundle,
  HSK3_COHESION_RECONSTRUCTION_PACK_RELATIVE_PATH,
  loadHsk3CohesionReconstructionPackBundle,
  validateHsk3CohesionReconstructionPackBundle,
} from "./hsk3CohesionReconstructionPack.mjs";

describe("HSK3 cohesion-reconstruction guided-production pack", () => {
  it("authors 20 evidence-bound units for the second production stage", () => {
    const result = assertValidHsk3CohesionReconstructionPackBundle(
      loadHsk3CohesionReconstructionPackBundle(),
    );

    expect(result.summary).toEqual({
      lessons: 3,
      completedGuidedProductionStages: 2,
      completedGuidedProductionLessons: 6,
      sourceTexts: 18,
      sourceTextLines: 144,
      promptUnits: 20,
      temporalOrderingPromptUnits: 7,
      referenceLinkerPromptUnits: 7,
      orderRationalePromptUnits: 6,
      revisionChecklists: 20,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 3,
      approvals: 0,
      releaseEligibleItems: 0,
    });
  });

  it("uses exact source evidence without inventing character ownership", () => {
    const { pack } = loadHsk3CohesionReconstructionPackBundle();
    const orderItems = [
      ...pack.lessons[0].promptUnits,
      ...pack.lessons[2].promptUnits,
    ];
    expect(orderItems.every((item: {
      presentedOrder: string[];
      correctOrder: string[];
    }) =>
      JSON.stringify(item.presentedOrder)
        !== JSON.stringify(item.correctOrder)
    )).toBe(true);
    expect(pack.lessons[1].promptUnits.every((item: {
      optionsHanzi: string[];
      correctAnswerHanzi: string;
      clozeLineHanzi: string;
    }) =>
      item.optionsHanzi.includes(item.correctAnswerHanzi)
      && item.clozeLineHanzi.includes("____")
    )).toBe(true);
    expect(pack.masteryPolicy).toMatchObject({
      readingSeparatedFromWritingEvidence: true,
      modelRevealCannotGrantMastery: true,
      automaticOrderingCannotGrantWritingMastery: true,
      newCharacterOwnershipClaims: 0,
      sourceRecognitionCharacterMappings: 284,
    });
  });

  it("rejects dependency drift, copied-source drift and fake mastery", () => {
    const bundle = loadHsk3CohesionReconstructionPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.source.prerequisitePackSha256 = "sha256:stale";
    pack.sourceTexts[0].text.lines[0].hanzi = "漂移";
    pack.lessons[0].promptUnits[0].masteryEligible = true;

    const result = validateHsk3CohesionReconstructionPackBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK3 cohesion-reconstruction source binding is stale",
      expect.stringContaining("cohesion source text is stale"),
      expect.stringContaining("cohesion item is invalid"),
    ]));
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(
        process.cwd(),
        HSK3_COHESION_RECONSTRUCTION_PACK_RELATIVE_PATH,
      ),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk3CohesionReconstructionPack(
        buildHsk3CohesionReconstructionPack(),
      ),
    );
  });
});
