import { describe, expect, it } from "vitest";
import {
  EVIDENCE_TRUST_POLICIES,
  getEvidenceTrustPolicy,
  isAttemptSourceMethodAllowed,
  isEvidenceCombinationAllowed,
  isLocallyVerifiedEvidence,
  isPolicyMasteryEligible,
} from "./evidencePolicy";

describe("evidence trust policy", () => {
  it("has one unique policy for each source, method, and skill", () => {
    const keys = EVIDENCE_TRUST_POLICIES.flatMap((policy) =>
      policy.skills.map((skill) => `${policy.source}|${policy.method}|${skill}`)
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each([
    ["writing", "stroke-quiz", "writing"],
    ["mistake", "remediation-recall", "vocabulary"],
    ["pronunciation", "speech-transcript", "speaking"],
    ["review", "fsrs-rating", "vocabulary"],
  ] as const)(
    "keeps %s/%s/%s unverified and ineligible locally",
    (source, method, skill) => {
      const policy = getEvidenceTrustPolicy(source, method, skill);
      expect(policy).not.toBeNull();
      expect(isLocallyVerifiedEvidence(source, method, skill)).toBe(false);
      expect(isPolicyMasteryEligible(method, skill)).toBe(false);
    },
  );

  it("rejects cross-mode and cross-skill combinations", () => {
    expect(isEvidenceCombinationAllowed(
      "pronunciation",
      "meaning-selection",
      "vocabulary",
    )).toBe(false);
    expect(isEvidenceCombinationAllowed(
      "reader",
      "reading-comprehension",
      "speaking",
    )).toBe(false);
    expect(isAttemptSourceMethodAllowed("reader", "reading-comprehension")).toBe(true);
    expect(isAttemptSourceMethodAllowed("reader", "stroke-quiz")).toBe(false);
  });

  it("keeps browser-TTS lesson listening objective but out of mastery", () => {
    expect(isLocallyVerifiedEvidence(
      "lesson",
      "listening-selection",
      "listening",
    )).toBe(true);
    expect(isPolicyMasteryEligible("listening-selection", "listening"))
      .toBe(false);
  });

  it("keeps compatibility Reader evidence descriptive and unverified", () => {
    const policy = getEvidenceTrustPolicy(
      "reader",
      "reading-comprehension",
      "reading",
    );
    expect(policy).toMatchObject({
      locallyVerified: false,
      masterySkills: [],
    });
    expect(isLocallyVerifiedEvidence(
      "reader",
      "reading-comprehension",
      "reading",
    )).toBe(false);
  });

  it.each([
    "pronunciation",
    "listening",
    "reading",
    "vocabulary",
    "grammar",
  ] as const)(
    "keeps uncalibrated diagnostic %s observable but out of mastery",
    (skill) => {
      expect(isLocallyVerifiedEvidence(
        "diagnostic",
        "diagnostic-selection",
        skill,
      )).toBe(true);
      expect(isPolicyMasteryEligible("diagnostic-selection", skill)).toBe(false);
    },
  );
});
