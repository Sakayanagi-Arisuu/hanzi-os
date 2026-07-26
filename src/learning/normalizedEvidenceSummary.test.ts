import { describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import { CURRENT_AUTHORITATIVE_COURSE_ID } from "./authoritativeProgress";
import {
  emptyObjectiveEvidenceProjection,
  type NormalizedLearningProjectionV1,
} from "./projectionProtocol";
import { summarizeNormalizedObjectiveEvidence } from "./normalizedEvidenceSummary";

const projection = (): NormalizedLearningProjectionV1 => ({
  protocolVersion: 1,
  resetEpoch: 0,
  cursor: 4,
  contentVersion: CONTENT_VERSION,
  manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  enrollment: {
    enrollmentId: "enrollment-a",
    courseId: CURRENT_AUTHORITATIVE_COURSE_ID,
    contentVersion: CONTENT_VERSION,
    manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
    releaseState: "beta",
    goal: "conversation",
  },
  activeLessonSessions: [],
  submittedLessons: [],
  objectiveEvidence: emptyObjectiveEvidenceProjection(),
});

describe("normalized objective evidence summary", () => {
  it("keeps skills separate and uses only mastery-eligible server counts", () => {
    const input = projection();
    input.objectiveEvidence.reading = {
      attemptCount: 4,
      correctCount: 3,
      incorrectCount: 1,
      masteryEligibleCount: 2,
      masteryEligibleCorrectCount: 1,
    };
    input.objectiveEvidence.listening = {
      attemptCount: 1,
      correctCount: 1,
      incorrectCount: 0,
      masteryEligibleCount: 0,
      masteryEligibleCorrectCount: 0,
    };

    expect(summarizeNormalizedObjectiveEvidence(input)).toMatchObject({
      verifiedAttemptCount: 5,
      masteryEligibleCount: 2,
      overall: { correct: 1, n: 2, observedAccuracy: 50 },
      skills: {
        reading: { correct: 1, n: 2, observedAccuracy: 50 },
        listening: { correct: 0, n: 0, observedAccuracy: null },
        speaking: { correct: 0, n: 0, observedAccuracy: null },
      },
    });
  });

  it("fails closed without an exact enrollment or valid projection", () => {
    const noEnrollment = projection();
    noEnrollment.enrollment = null;
    expect(summarizeNormalizedObjectiveEvidence(noEnrollment)).toBeNull();
    expect(summarizeNormalizedObjectiveEvidence(null)).toBeNull();
  });
});
