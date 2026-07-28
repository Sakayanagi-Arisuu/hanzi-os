import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertValidHsk1TaskAssessmentPackBundle,
  loadHsk1TaskAssessmentPackBundle,
  validateHsk1TaskAssessmentPackBundle,
} from "./hsk1TaskAssessmentPack.mjs";
import {
  buildHsk1TaskAssessmentPack,
  serializeHsk1TaskAssessmentPack,
} from "../../scripts/content/build-hsk1-task-assessment-pack.mjs";

describe("HSK1 task scenarios and assessment blueprint", () => {
  it("maps all official tasks and topics without claiming assessment readiness", () => {
    const bundle = loadHsk1TaskAssessmentPackBundle();
    const result = assertValidHsk1TaskAssessmentPackBundle(bundle);

    expect(result.summary).toEqual({
      communicativeLessonBlueprints: 25,
      topicDrafts: 30,
      taskScenarios: 15,
      modelDialogueTurns: 60,
      guidedRoleplayItems: 15,
      reviewBatches: 15,
      authoredLevelCheckItems: 50,
      measurementEligibleItems: 0,
      releaseEligibleItems: 0,
    });
    expect(bundle.pack.levelAssessmentBlueprint).toMatchObject({
      state: "uncalibrated-draft",
      objectiveItemBankId: "hsk1-level-check-items-2026.07",
      learnerVisible: false,
      passingStandard: null,
      grantsMastery: false,
      grantsPrerequisiteWaiver: false,
      calibration: {
        required: true,
        pilotSampleSize: 0,
        reliabilityEstimate: null,
        cutScore: null,
      },
    });
  });

  it("keeps roleplay self-checks outside mastery", () => {
    const { pack } = loadHsk1TaskAssessmentPackBundle();

    expect(pack.practiceItems).toHaveLength(15);
    expect(pack.practiceItems.every(
      (item: {
        review: string;
        scoringPolicy: string;
        measurementEligible: boolean;
        masteryEligible: boolean;
      }) =>
        item.review === "pending"
        && item.scoringPolicy === "self-reveal-only"
        && item.measurementEligible === false
        && item.masteryEligible === false,
    )).toBe(true);
  });

  it("fails closed on an invented cut score or premature mastery", () => {
    const bundle = loadHsk1TaskAssessmentPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.levelAssessmentBlueprint.passingStandard = 80;
    pack.practiceItems[0].masteryEligible = true;

    const result = validateHsk1TaskAssessmentPackBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK1 level assessment must remain an uncalibrated hidden blueprint",
      expect.stringContaining("must remain pending and mastery-ineligible"),
    ]));
  });

  it("keeps the checked task pack deterministic", () => {
    const bundle = loadHsk1TaskAssessmentPackBundle();
    expect(readFileSync(bundle.packPath, "utf8")).toBe(
      serializeHsk1TaskAssessmentPack(
        buildHsk1TaskAssessmentPack(),
      ),
    );
  });
});
