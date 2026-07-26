import { describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import type { Skill } from "../types";
import type { AssessmentSessionAuthorityBindingV1 } from "./assessmentSessionProtocol";
import type { NormalizedAssessmentRuntimeV1 } from "./normalizedAssessmentRuntime";
import {
  assessmentAbandonmentReceiptMatchesSessionBinding,
  assessmentAttemptReceiptMatchesSessionBinding,
  assessmentRuntimeMatchesSessionBinding,
  assessmentSubmissionReceiptMatchesSessionBinding,
} from "./normalizedAssessmentUiAuthority";

const SKILLS: readonly Skill[] = [
  "pronunciation",
  "listening",
  "speaking",
  "reading",
  "writing",
  "vocabulary",
  "grammar",
];
const NOW = "2026-07-22T10:00:00.000Z";

const binding = (): AssessmentSessionAuthorityBindingV1 => ({
  sessionId: "assessment-session:test",
  enrollmentId: "enrollment:test",
  resetEpoch: 4,
  contentVersion: CONTENT_VERSION,
  blueprintId: "foundation-screening:test",
  formVersion: `${CONTENT_VERSION}:assessment-form:test`,
  scoringPolicyVersion: "observed-wilson:test",
  expectedItemCount: 3,
  form: {
    schemaVersion: 1,
    blueprintId: "foundation-screening:test",
    formVersion: `${CONTENT_VERSION}:assessment-form:test`,
    scoringPolicyVersion: "observed-wilson:test",
    items: [
      {
        position: 0,
        itemId: "vocab",
        itemVersion: `${CONTENT_VERSION}:assessment-item:vocab:1`,
        skill: "vocabulary",
        construct: "meaning",
        modality: "visual-selection",
        measurementEligible: true,
        prompt: "你",
        meta: "Meaning",
        options: ["tôi", "bạn"],
      },
      {
        position: 1,
        itemId: "reading",
        itemVersion: `${CONTENT_VERSION}:assessment-item:reading:1`,
        skill: "reading",
        construct: "sentence-reading",
        modality: "visual-selection",
        measurementEligible: true,
        prompt: "我是学生。",
        meta: "Reading",
        options: ["Tôi là sinh viên.", "Tôi là giáo viên."],
      },
      {
        position: 2,
        itemId: "listening-practice",
        itemVersion: `${CONTENT_VERSION}:assessment-item:listening:1`,
        skill: "listening",
        construct: "phrase-listening",
        modality: "synthetic-tts-selection",
        measurementEligible: false,
        prompt: "Nghe và chọn",
        meta: "Synthetic practice",
        options: ["你好", "谢谢"],
        stimulusText: "谢谢",
      },
    ],
  },
  formHash: `sha256:${"a".repeat(64)}`,
  status: "started",
  startedAt: NOW,
});

const wilson95 = (correct: number, n: number) => {
  if (!n) return null;
  const z = 1.959963984540054;
  const proportion = correct / n;
  const zSquared = z * z;
  const denominator = 1 + zSquared / n;
  const center = (proportion + zSquared / (2 * n)) / denominator;
  const margin = z * Math.sqrt(
    (proportion * (1 - proportion) + zSquared / (4 * n)) / n,
  ) / denominator;
  return {
    lower: Math.round(Math.max(0, center - margin) * 100),
    upper: Math.round(Math.min(1, center + margin) * 100),
  };
};

const result = (correct: number, n: number) => ({
  status: n === 0 ? "unassessed" : n < 2 ? "insufficient" : "observed",
  correct,
  n,
  observedAccuracy: n ? Math.round((correct / n) * 100) : null,
  confidence95: wilson95(correct, n),
  masteryEligible: false,
});

const submission = () => ({
  protocolVersion: 1,
  idempotencyKey: "assessment-submit:test",
  duplicate: false,
  sessionId: "assessment-session:test",
  enrollmentId: "enrollment:test",
  resetEpoch: 4,
  contentVersion: CONTENT_VERSION,
  blueprintId: "foundation-screening:test",
  formVersion: `${CONTENT_VERSION}:assessment-form:test`,
  scoringPolicyVersion: "observed-wilson:test",
  formHash: `sha256:${"a".repeat(64)}`,
  status: "submitted",
  calibrationStatus: "uncalibrated",
  confidenceLevel: 0.95,
  masteryEligible: false,
  overall: result(1, 2),
  skills: SKILLS.map((skill) => ({
    skill,
    ...(
      skill === "vocabulary"
        ? result(1, 1)
        : skill === "reading"
          ? result(0, 1)
          : result(0, 0)
    ),
  })),
  submittedAt: "2026-07-22T10:05:00.000Z",
});

describe("normalized assessment UI authority bindings", () => {
  it("matches runtime fields and the ordered answer-free form exactly", () => {
    const authority = binding();
    const runtime: NormalizedAssessmentRuntimeV1 = {
      schemaVersion: 1,
      contentVersion: CONTENT_VERSION,
      manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
      resetEpoch: authority.resetEpoch,
      enrollmentId: authority.enrollmentId,
      commandSeed: "assessment-open:test",
      sessionId: authority.sessionId,
      blueprintId: authority.blueprintId,
      formVersion: authority.formVersion,
      scoringPolicyVersion: authority.scoringPolicyVersion,
      formHash: authority.formHash,
      startedAt: authority.startedAt,
      items: structuredClone(authority.form.items),
    };
    expect(assessmentRuntimeMatchesSessionBinding(runtime, authority)).toBe(true);
    runtime.items[0]!.options.reverse();
    expect(assessmentRuntimeMatchesSessionBinding(runtime, authority)).toBe(false);
  });

  it("accepts only an exact answer-free attempt acknowledgement", () => {
    const attempt = {
      protocolVersion: 1,
      idempotencyKey: "assessment-attempt:test:0",
      duplicate: false,
      attemptId: "server-attempt:test",
      sessionId: "assessment-session:test",
      resetEpoch: 4,
      contentVersion: CONTENT_VERSION,
      formHash: `sha256:${"a".repeat(64)}`,
      position: 0,
      itemId: "vocab",
      itemVersion: `${CONTENT_VERSION}:assessment-item:vocab:1`,
      skill: "vocabulary",
      measurementEligible: true,
      masteryEligible: false,
      status: "recorded",
      recordedAt: "2026-07-22T10:01:00.000Z",
    };
    expect(assessmentAttemptReceiptMatchesSessionBinding(
      attempt,
      binding(),
      "assessment-attempt:test:0",
      0,
    )).toBe(true);
    expect(assessmentAttemptReceiptMatchesSessionBinding(
      { ...attempt, correct: true },
      binding(),
      "assessment-attempt:test:0",
      0,
    )).toBe(false);
    expect(assessmentAttemptReceiptMatchesSessionBinding(
      { ...attempt, measurementEligible: false },
      binding(),
      "assessment-attempt:test:0",
      0,
    )).toBe(false);
  });

  it("recomputes every descriptive aggregate and rejects routing or mastery claims", () => {
    const valid = submission();
    expect(assessmentSubmissionReceiptMatchesSessionBinding(
      valid,
      binding(),
      "assessment-submit:test",
    )).toBe(true);
    expect(assessmentSubmissionReceiptMatchesSessionBinding(
      { ...valid, recommendedLessonId: "boot-2" },
      binding(),
      "assessment-submit:test",
    )).toBe(false);
    expect(assessmentSubmissionReceiptMatchesSessionBinding(
      { ...valid, masteryEligible: true },
      binding(),
      "assessment-submit:test",
    )).toBe(false);
    const wrongCounts = submission();
    wrongCounts.skills[0] = {
      skill: "pronunciation",
      ...result(1, 1),
    };
    expect(assessmentSubmissionReceiptMatchesSessionBinding(
      wrongCounts,
      binding(),
      "assessment-submit:test",
    )).toBe(false);
  });

  it("accepts only an exact non-mastery abandonment receipt", () => {
    const abandoned = {
      protocolVersion: 1,
      idempotencyKey: "assessment-abandon:test",
      duplicate: false,
      sessionId: "assessment-session:test",
      enrollmentId: "enrollment:test",
      resetEpoch: 4,
      contentVersion: CONTENT_VERSION,
      blueprintId: "foundation-screening:test",
      formVersion: `${CONTENT_VERSION}:assessment-form:test`,
      formHash: `sha256:${"a".repeat(64)}`,
      status: "abandoned",
      masteryEligible: false,
      abandonedAt: "2026-07-22T10:02:00.000Z",
    };
    expect(assessmentAbandonmentReceiptMatchesSessionBinding(
      abandoned,
      binding(),
      "assessment-abandon:test",
    )).toBe(true);
    expect(assessmentAbandonmentReceiptMatchesSessionBinding(
      { ...abandoned, outcome: "passed" },
      binding(),
      "assessment-abandon:test",
    )).toBe(false);
  });
});
