import { describe, expect, it } from "vitest";
import {
  canAdvanceMistakeFromEvidence,
  canRecordLocalRemediationAttempt,
  evaluateRemediationAttempt,
  toggleRemediationHint,
} from "./remediation";

describe("remediation attempt policy", () => {
  it("keeps hint exposure sticky after the hint is hidden again", () => {
    const opened = toggleRemediationHint({ visible: false, used: false });
    const hidden = toggleRemediationHint(opened);

    expect(opened).toEqual({ visible: true, used: true });
    expect(hidden).toEqual({ visible: false, used: true });
  });

  it("does not advance or close a mistake after a hint was used", () => {
    expect(evaluateRemediationAttempt(0, true, true)).toEqual({
      correctedStreak: 0,
      resolved: false,
      unassistedCorrect: false,
    });
  });

  it("closes the current repair after one independent correct recall", () => {
    expect(evaluateRemediationAttempt(0, true, false)).toEqual({
      correctedStreak: 1,
      resolved: true,
      unassistedCorrect: true,
    });
  });

  it.each([false, true])(
    "resets the streak after an incorrect recall even when usedHint=%s",
    (usedHint) => {
      expect(evaluateRemediationAttempt(1, false, usedHint)).toEqual({
        correctedStreak: 0,
        resolved: false,
        unassistedCorrect: false,
      });
    },
  );

  it("rejects new local attempts after a mistake is already resolved", () => {
    expect(canRecordLocalRemediationAttempt(undefined)).toBe(false);
    expect(canRecordLocalRemediationAttempt({ resolved: true })).toBe(false);
    expect(canRecordLocalRemediationAttempt({ resolved: false })).toBe(true);
  });

  it("only advances a mistake from verified mastery-eligible correct evidence", () => {
    expect(canAdvanceMistakeFromEvidence({
      verified: true,
      masteryEligible: true,
      outcome: "correct",
    })).toBe(true);
    expect(canAdvanceMistakeFromEvidence({
      verified: false,
      masteryEligible: false,
      outcome: "correct",
    })).toBe(false);
    expect(canAdvanceMistakeFromEvidence({
      verified: true,
      masteryEligible: false,
      outcome: "correct",
    })).toBe(false);
    expect(canAdvanceMistakeFromEvidence({
      verified: true,
      masteryEligible: true,
      outcome: "incorrect",
    })).toBe(false);
  });
});
