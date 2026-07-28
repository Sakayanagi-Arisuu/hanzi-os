import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertValidHsk1LevelCheckItemBankBundle,
  loadHsk1LevelCheckItemBankBundle,
  validateHsk1LevelCheckItemBankBundle,
} from "./hsk1LevelCheckItemBank.mjs";
import {
  buildHsk1LevelCheckItemBank,
  serializeHsk1LevelCheckItemBank,
} from "../../scripts/content/build-hsk1-level-check-item-bank.mjs";

describe("HSK1 hidden objective level-check bank", () => {
  it("authors exactly 50 source-bound items without enabling measurement", () => {
    const bundle = loadHsk1LevelCheckItemBankBundle();
    const result = assertValidHsk1LevelCheckItemBankBundle(bundle);

    expect(result.summary).toEqual({
      objectiveItems: 50,
      listeningItems: 15,
      readingItems: 15,
      vocabularyItems: 10,
      grammarItems: 10,
      reviewBatches: 10,
      reviewedItems: 0,
      calibratedItems: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      releaseEligibleItems: 0,
    });
    expect(bundle.bank.items.every(
      (item: {
        reviewStatus: string;
        calibrationStatus: string;
        measurementEligible: boolean;
        masteryEligible: boolean;
        prerequisiteWaiverEligible: boolean;
      }) =>
        item.reviewStatus === "pending"
        && item.calibrationStatus === "uncalibrated"
        && item.measurementEligible === false
        && item.masteryEligible === false
        && item.prerequisiteWaiverEligible === false,
    )).toBe(true);
  });

  it("requires reviewed audio and partitions all items into exact batches", () => {
    const { bank } = loadHsk1LevelCheckItemBankBundle();
    const listening = bank.items.filter(
      (item: { skill: string }) => item.skill === "listening",
    );
    const batchedIds = bank.reviewBatches.flatMap(
      (batch: { itemIds: string[] }) => batch.itemIds,
    );

    expect(listening).toHaveLength(15);
    expect(listening.every(
      (item: { stimulus: { audio: null; audioRequirement: string } }) =>
        item.stimulus.audio === null
        && item.stimulus.audioRequirement
          === "reviewed-human-or-licensed-recording",
    )).toBe(true);
    expect(new Set(batchedIds).size).toBe(50);
  });

  it("fails closed on premature calibration, source drift or duplicate options", () => {
    const bundle = loadHsk1LevelCheckItemBankBundle();
    const bank = structuredClone(bundle.bank);
    bank.calibration.cutScore = 36;
    bank.items[0].measurementEligible = true;
    bank.items[1].options[1].text = bank.items[1].options[0].text;

    const result = validateHsk1LevelCheckItemBankBundle({
      ...bundle,
      bank,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "level-check bank calibration must remain empty",
      expect.stringContaining("eligibility state is invalid"),
      expect.stringContaining("objective choices are invalid"),
    ]));
  });

  it("reports malformed options and batches instead of throwing", () => {
    const bundle = loadHsk1LevelCheckItemBankBundle();
    const bank = structuredClone(bundle.bank);
    bank.items[0].options = null;
    bank.reviewBatches[0].itemIds = null;
    bank.reviewBatches[0].requiredRoles = null;

    expect(() => validateHsk1LevelCheckItemBankBundle({
      ...bundle,
      bank,
    })).not.toThrow();
    expect(validateHsk1LevelCheckItemBankBundle({
      ...bundle,
      bank,
    }).valid).toBe(false);
  });

  it("keeps the checked item bank deterministic", () => {
    const bundle = loadHsk1LevelCheckItemBankBundle();
    expect(readFileSync(bundle.bankPath, "utf8")).toBe(
      serializeHsk1LevelCheckItemBank(
        buildHsk1LevelCheckItemBank(),
      ),
    );
  });
});
