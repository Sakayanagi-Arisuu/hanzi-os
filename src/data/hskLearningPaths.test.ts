import { describe, expect, it } from "vitest";
import type { Skill } from "../types";
import {
  getHskLearningPath,
  HSK_LEARNING_PATHS,
  HSK_STARTING_LEVEL_OPTIONS,
  type HskPathExitEvidence,
} from "./hskLearningPaths";

const skills: Skill[] = [
  "pronunciation",
  "listening",
  "speaking",
  "reading",
  "writing",
  "vocabulary",
  "grammar",
];

describe("HSK0-4 learning path contract", () => {
  it("defines exactly one ordered path per target level", () => {
    expect(HSK_LEARNING_PATHS.map((path) => path.id)).toEqual([
      "hsk0",
      "hsk1",
      "hsk2",
      "hsk3",
      "hsk4",
    ]);
    expect(HSK_STARTING_LEVEL_OPTIONS).toHaveLength(5);
    expect(new Set(HSK_STARTING_LEVEL_OPTIONS.map((item) => item.id)).size).toBe(5);
  });

  it("keeps exam levels exact and does not mislabel HSK0 as an official exam", () => {
    expect(HSK_LEARNING_PATHS.map((path) => path.officialExamLevel)).toEqual([
      null,
      1,
      2,
      3,
      4,
    ]);
  });

  it("uses normalized but materially different skill weights", () => {
    const signatures = HSK_LEARNING_PATHS.map((path) => {
      const total = skills.reduce((sum, skill) => sum + path.skillWeights[skill], 0);
      expect(total).toBeCloseTo(1, 8);
      expect(path.skillWeights.reading).toBeGreaterThan(0);
      expect(path.skillWeights.listening).toBeGreaterThan(0);
      return skills.map((skill) => path.skillWeights[skill]).join(":");
    });

    expect(new Set(signatures).size).toBe(HSK_LEARNING_PATHS.length);
    expect(HSK_LEARNING_PATHS[0].skillWeights.pronunciation)
      .toBeGreaterThan(HSK_LEARNING_PATHS[4].skillWeights.pronunciation);
    expect(HSK_LEARNING_PATHS[4].skillWeights.reading)
      .toBeGreaterThan(HSK_LEARNING_PATHS[0].skillWeights.reading);
  });

  it("raises activity depth and assessment demands by level", () => {
    expect(HSK_LEARNING_PATHS[0].activityModes).toContain("tone-discrimination");
    expect(HSK_LEARNING_PATHS[2].activityModes).toContain("graded-reading");
    expect(HSK_LEARNING_PATHS[3].activityModes).toContain("paragraph-dictation");
    expect(HSK_LEARNING_PATHS[4].activityModes).toEqual(
      expect.arrayContaining(["paraphrase", "summary", "timed-mock"]),
    );
    expect(HSK_LEARNING_PATHS[4].assessmentMode)
      .toBe("level-check-and-timed-mock");
  });

  it("keeps the legacy basic profile readable without creating a sixth path", () => {
    expect(getHskLearningPath("basic").id).toBe("hsk1");
    expect(getHskLearningPath("hsk4").id).toBe("hsk4");
  });

  it("requires bounded objective evidence for every path", () => {
    for (const path of HSK_LEARNING_PATHS) {
      expect(path.exitEvidence.length).toBeGreaterThan(0);
      for (const requirement of path.exitEvidence) {
        expect(skills).toContain(requirement.skill);
        expect(requirement.minimumAttempts).toBeGreaterThan(0);
        expect(requirement.minimumObservedAccuracy).toBeGreaterThanOrEqual(70);
        expect(requirement.minimumObservedAccuracy).toBeLessThanOrEqual(100);
      }
    }
  });

  it("never substitutes recognition items for productive-skill review", () => {
    const productiveRequirements: HskPathExitEvidence[] = HSK_LEARNING_PATHS
      .flatMap((path) => [...path.exitEvidence] as HskPathExitEvidence[])
      .filter((requirement) =>
        ["pronunciation", "speaking", "writing"].includes(requirement.skill)
      );

    expect(productiveRequirements.length).toBeGreaterThan(0);
    expect(productiveRequirements.every(
      (requirement) => requirement.evidenceKind === "reviewed-rubric",
    )).toBe(true);
  });
});
