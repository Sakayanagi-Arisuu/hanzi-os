import { describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import type { NormalizedLessonRuntimeV1 } from "./normalizedLessonRuntime";
import type {
  LessonSessionAuthorityBindingV1,
  OpenLessonSessionReceiptV1,
} from "./lessonSessionProtocol";
import type { NormalizedLearningProjectionV1 } from "./projectionProtocol";
import {
  abandonmentReceiptMatchesSessionBinding,
  activeProjectionMatchesOpenReceipt,
  activeProjectionMatchesSessionBinding,
  lessonAttemptReceiptMatchesSessionBinding,
  runtimeMatchesSessionBinding,
  submissionReceiptMatchesSessionBinding,
} from "./normalizedLessonUiAuthority";

const form = {
  schemaVersion: 1 as const,
  script: "simplified" as const,
  activities: [{
    position: 0,
    activityId: "boot-1:ni-meaning",
    activityVersion: `${CONTENT_VERSION}:boot-1:1`,
    method: "meaning-selection" as const,
    skill: "vocabulary" as const,
    requiredForPass: false,
  }],
};
const binding = (): LessonSessionAuthorityBindingV1 => ({
  sessionId: "session:test",
  enrollmentId: "enrollment:test",
  contentVersion: CONTENT_VERSION,
  resetEpoch: 0,
  lessonId: "boot-1",
  lessonVersion: `${CONTENT_VERSION}:boot-1:1`,
  expectedEvidenceCount: 1,
  form: structuredClone(form),
  formHash: `sha256:${"a".repeat(64)}`,
  status: "started",
  startedAt: "2026-07-22T00:00:00.000Z",
});
const receipt = (): OpenLessonSessionReceiptV1 => ({
  protocolVersion: 1,
  idempotencyKey: "open:test",
  duplicate: false,
  ...binding(),
});
const projection = (): NormalizedLearningProjectionV1 => ({
  protocolVersion: 1,
  resetEpoch: 0,
  cursor: 1,
  contentVersion: CONTENT_VERSION,
  manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  enrollment: {
    enrollmentId: "enrollment:test",
    contentVersion: CONTENT_VERSION,
    courseId: "hanzi-os-core",
    manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
    releaseState: "beta",
    goal: "conversation",
  },
  activeLessonSessions: [{
    ...binding(),
    attempts: [],
  }],
  submittedLessons: [],
  objectiveEvidence: Object.fromEntries([
    "pronunciation", "listening", "speaking", "reading", "writing",
    "vocabulary", "grammar",
  ].map((skill) => [skill, {
    attemptCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    masteryEligibleCount: 0,
    masteryEligibleCorrectCount: 0,
  }])) as NormalizedLearningProjectionV1["objectiveEvidence"],
});

describe("normalized lesson UI authority bindings", () => {
  it("requires the projected active form to equal the local open receipt", () => {
    expect(activeProjectionMatchesOpenReceipt(projection(), receipt())).toBe(true);
    expect(activeProjectionMatchesSessionBinding(projection(), binding())).toBe(true);
    const changed = projection();
    changed.activeLessonSessions[0].formHash = `sha256:${"b".repeat(64)}`;
    expect(activeProjectionMatchesOpenReceipt(changed, receipt())).toBe(false);
    const reordered = projection();
    reordered.activeLessonSessions[0].form.activities[0].activityId =
      "boot-1:hao-meaning";
    expect(activeProjectionMatchesOpenReceipt(reordered, receipt())).toBe(false);
  });

  it("accepts only exact server-objective attempt receipts for the bound position", () => {
    const attempt = {
      protocolVersion: 1,
      idempotencyKey: "attempt:test",
      duplicate: false,
      attemptId: "server-attempt:test",
      evidenceId: "evidence:test",
      resetEpoch: 0,
      source: "lesson",
      method: "meaning-selection",
      activityId: "boot-1:ni-meaning",
      activityVersion: `${CONTENT_VERSION}:boot-1:1`,
      skill: "vocabulary",
      outcome: "correct",
      score: 100,
      verification: "server-objective",
    };
    expect(lessonAttemptReceiptMatchesSessionBinding(
      attempt,
      binding(),
      "attempt:test",
      0,
    )).toBe(true);
    expect(lessonAttemptReceiptMatchesSessionBinding(
      { ...attempt, score: 0 },
      binding(),
      "attempt:test",
      0,
    )).toBe(false);
    expect(lessonAttemptReceiptMatchesSessionBinding(
      { ...attempt, answer: "leak" },
      binding(),
      "attempt:test",
      0,
    )).toBe(false);
  });

  it("rejects a runtime whose immutable activity binding drifted", () => {
    const runtime: NormalizedLessonRuntimeV1 = {
      schemaVersion: 1,
      contentVersion: CONTENT_VERSION,
      manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
      resetEpoch: 0,
      enrollmentId: "enrollment:test",
      lessonId: "boot-1",
      lessonVersion: `${CONTENT_VERSION}:boot-1:1`,
      script: "simplified",
      commandSeed: "open:test",
      sessionId: "session:test",
      formHash: `sha256:${"a".repeat(64)}`,
      startedAt: "2026-07-22T00:00:00.000Z",
      activities: [{
        ...form.activities[0],
        exerciseId: "ni-meaning",
        kind: "meaning",
        instruction: "Meaning",
        prompt: "你",
        options: ["bạn", "tôi"],
      }],
    };
    expect(runtimeMatchesSessionBinding(runtime, binding())).toBe(true);
    runtime.activities[0].activityVersion = "stale";
    expect(runtimeMatchesSessionBinding(runtime, binding())).toBe(false);
  });

  it("accepts only terminal receipts exactly bound to the active form", () => {
    const submitted = {
      protocolVersion: 1,
      idempotencyKey: "submit:test",
      duplicate: false,
      sessionId: "session:test",
      contentVersion: CONTENT_VERSION,
      resetEpoch: 0,
      lessonId: "boot-1",
      lessonVersion: `${CONTENT_VERSION}:boot-1:1`,
      formHash: `sha256:${"a".repeat(64)}`,
      status: "submitted",
      evidenceCount: 1,
      rawScore: 100,
      gateScore: 100,
      requiredEvidenceCount: 0,
      requiredCorrectCount: 0,
      passed: true,
      completionEvidenceId: "completion:test",
      submittedAt: "2026-07-22T00:01:00.000Z",
    };
    expect(submissionReceiptMatchesSessionBinding(
      submitted,
      binding(),
      "submit:test",
    )).toBe(true);
    expect(submissionReceiptMatchesSessionBinding(
      { ...submitted, formHash: `sha256:${"b".repeat(64)}` },
      binding(),
      "submit:test",
    )).toBe(false);
    const abandoned = {
      protocolVersion: 1,
      idempotencyKey: "abandon:test",
      duplicate: false,
      sessionId: "session:test",
      enrollmentId: "enrollment:test",
      contentVersion: CONTENT_VERSION,
      resetEpoch: 0,
      lessonId: "boot-1",
      lessonVersion: `${CONTENT_VERSION}:boot-1:1`,
      status: "abandoned",
      abandonedAt: "2026-07-22T00:01:00.000Z",
    };
    expect(abandonmentReceiptMatchesSessionBinding(
      abandoned,
      binding(),
      "abandon:test",
    )).toBe(true);
    expect(abandonmentReceiptMatchesSessionBinding(
      { ...abandoned, resetEpoch: 1 },
      binding(),
      "abandon:test",
    )).toBe(false);
  });
});
