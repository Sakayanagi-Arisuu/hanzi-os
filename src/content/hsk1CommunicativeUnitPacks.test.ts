import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertValidHsk1CommunicativeUnitPacksBundle,
  loadHsk1CommunicativeUnitPacksBundle,
  validateHsk1CommunicativeUnitPacksBundle,
} from "./hsk1CommunicativeUnitPacks.mjs";
import {
  buildHsk1CommunicativeUnitPacks,
  serializeHsk1CommunicativeUnitPacks,
} from "../../scripts/content/build-hsk1-communicative-unit-packs.mjs";

describe("HSK1 communicative AI-assisted content packs", () => {
  it("maps all four remaining communicative units exactly once", () => {
    const bundle = loadHsk1CommunicativeUnitPacksBundle();
    const result = assertValidHsk1CommunicativeUnitPacksBundle(bundle);

    expect(result.summary).toEqual({
      units: 4,
      lessons: 16,
      vocabularyDrafts: 193,
      taskBlueprintMappings: 13,
      topicBlueprintMappings: 25,
      grammarBlueprintMappings: 34,
      dialogueTurns: 64,
      authoredPracticeItems: 579,
      meaningRecallItems: 193,
      pinyinRecognitionItems: 193,
      listeningSelectionItems: 193,
      reviewBatches: 16,
      releaseEligibleItems: 0,
    });
    expect(bundle.collection.packs.map(
      (pack: { unitId: string; counts: { vocabularyDrafts: number } }) => [
        pack.unitId,
        pack.counts.vocabularyDrafts,
      ],
    )).toEqual([
      ["hsk1-time-place-events", 81],
      ["hsk1-daily-life", 54],
      ["hsk1-travel-leisure", 23],
      ["hsk1-study-work", 35],
    ]);
  });

  it("authors exactly three ineligible practice kinds for every lexeme", () => {
    const { collection } = loadHsk1CommunicativeUnitPacksBundle();
    const items = collection.packs.flatMap(
      (pack: { practiceItems: unknown[] }) => pack.practiceItems,
    );

    expect(items).toHaveLength(579);
    expect(items.every(
      (item: {
        review: string;
        measurementEligible: boolean;
        masteryEligible: boolean;
      }) =>
        item.review === "pending"
        && item.measurementEligible === false
        && item.masteryEligible === false,
    )).toBe(true);
    expect(collection.packs.flatMap(
      (pack: { reviewBatches: unknown[] }) => pack.reviewBatches,
    )).toHaveLength(16);
  });

  it("fails closed on premature visibility, approval or mastery eligibility", () => {
    const bundle = loadHsk1CommunicativeUnitPacksBundle();
    const collection = structuredClone(bundle.collection);
    collection.learnerVisible = true;
    collection.packs[0].practiceItems[0].masteryEligible = true;
    collection.packs[0].reviewBatches[0].approvals.push({
      role: "native-mandarin-reviewer",
    });

    const result = validateHsk1CommunicativeUnitPacksBundle({
      ...bundle,
      collection,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "communicative collection must remain a learner-hidden CC-BY-SA draft",
      expect.stringContaining("must remain pending and mastery-ineligible"),
      expect.stringContaining("review batch is incomplete or pre-approved"),
    ]));
  });

  it("keeps the checked collection deterministic", () => {
    const bundle = loadHsk1CommunicativeUnitPacksBundle();
    expect(readFileSync(bundle.collectionPath, "utf8")).toBe(
      serializeHsk1CommunicativeUnitPacks(
        buildHsk1CommunicativeUnitPacks(),
      ),
    );
  });
});
