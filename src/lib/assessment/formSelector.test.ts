import { describe, expect, it } from "vitest";
import {
  ASSESSMENT_QUESTIONS,
  FOUNDATION_SCREENING_BLUEPRINT,
} from "../../data/assessment";
import { selectAssessmentForm } from "./formSelector";

describe("assessment form selection", () => {
  it("selects the compatibility form deterministically without duplicate exposure groups", () => {
    const first = selectAssessmentForm({
      items: ASSESSMENT_QUESTIONS,
      blueprint: FOUNDATION_SCREENING_BLUEPRINT,
      seed: "learner-session-a",
    });
    const second = selectAssessmentForm({
      items: ASSESSMENT_QUESTIONS,
      blueprint: FOUNDATION_SCREENING_BLUEPRINT,
      seed: "learner-session-a",
    });

    expect(first).toEqual(second);
    expect(first.kind).toBe("selected");
    if (first.kind !== "selected") return;
    expect(first.items).toHaveLength(ASSESSMENT_QUESTIONS.length);
    expect(new Set(first.items.map((item) => item.exposureGroupId)).size).toBe(
      first.items.length,
    );
  });

  it("fails closed instead of replaying an exposed item when no equivalent form exists", () => {
    const exposed = new Set([ASSESSMENT_QUESTIONS[0].exposureGroupId]);
    const result = selectAssessmentForm({
      items: ASSESSMENT_QUESTIONS,
      blueprint: FOUNDATION_SCREENING_BLUEPRINT,
      exposedGroups: exposed,
      seed: "learner-session-b",
    });

    expect(result).toMatchObject({
      kind: "insufficient-bank",
      availableItemCount: ASSESSMENT_QUESTIONS.length - 1,
      requiredItemCount: ASSESSMENT_QUESTIONS.length,
    });
  });

  it("reports the exact missing skill quota", () => {
    const readingGroups = new Set(
      ASSESSMENT_QUESTIONS
        .filter((item) => item.skill === "reading")
        .map((item) => item.exposureGroupId),
    );
    const result = selectAssessmentForm({
      items: ASSESSMENT_QUESTIONS,
      blueprint: FOUNDATION_SCREENING_BLUEPRINT,
      exposedGroups: readingGroups,
      seed: "learner-session-c",
    });

    expect(result).toMatchObject({
      kind: "insufficient-bank",
      missingBySkill: { reading: 3 },
    });
  });
});
