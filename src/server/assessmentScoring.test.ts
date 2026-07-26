import { describe, expect, it } from "vitest";
import {
  ASSESSMENT_RESULT_SKILLS,
  assessmentWilson95Interval,
  scoreAssessmentObservations,
} from "./assessmentScoring";

describe("uncalibrated assessment scoring", () => {
  it("uses Wilson 95 intervals and emits all seven independent skills", () => {
    const result = scoreAssessmentObservations([
      { skill: "reading", correct: true, measurementEligible: true },
      { skill: "reading", correct: false, measurementEligible: true },
      { skill: "listening", correct: true, measurementEligible: false },
    ]);
    expect(result.overall).toEqual({
      status: "observed",
      correct: 1,
      n: 2,
      observedAccuracy: 50,
      confidence95: assessmentWilson95Interval(1, 2),
      masteryEligible: false,
    });
    expect(result.skills.map((item) => item.skill)).toEqual(
      ASSESSMENT_RESULT_SKILLS,
    );
    expect(result.skills.find((item) => item.skill === "listening")).toEqual({
      skill: "listening",
      status: "unassessed",
      correct: 0,
      n: 0,
      observedAccuracy: null,
      confidence95: null,
      masteryEligible: false,
    });
    expect(result.skills.find((item) => item.skill === "speaking")?.n).toBe(0);
    expect(result.skills.find((item) => item.skill === "writing")?.n).toBe(0);
  });

  it("rejects invalid interval counts without fabricating confidence", () => {
    expect(assessmentWilson95Interval(1, 0)).toBeNull();
    expect(assessmentWilson95Interval(2, 1)).toBeNull();
  });
});
