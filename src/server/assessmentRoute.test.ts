import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AbandonAssessmentSessionReceiptV1 } from "../assessment/assessmentAbandonmentProtocol";
import type { RecordAssessmentAttemptReceiptV1 } from "../assessment/assessmentAttemptProtocol";
import type { OpenAssessmentSessionReceiptV1 } from "../assessment/assessmentSessionProtocol";
import type { SubmitAssessmentSessionReceiptV1 } from "../assessment/assessmentSubmissionProtocol";
import { CONTENT_VERSION } from "../data/curriculum";

const {
  getChatGPTUser,
  getD1Database,
  resolveUser,
  consumeMutationRateLimit,
  assessmentRepository,
} = vi.hoisted(() => ({
  getChatGPTUser: vi.fn(),
  getD1Database: vi.fn(),
  resolveUser: vi.fn(),
  consumeMutationRateLimit: vi.fn(),
  assessmentRepository: {
    openSession: vi.fn(),
    recordAttempt: vi.fn(),
    submitSession: vi.fn(),
    abandonSession: vi.fn(),
  },
}));

vi.mock("../../app/chatgpt-auth", () => ({ getChatGPTUser }));
vi.mock("./d1", () => ({
  getD1Database,
  SyncBackendUnavailableError: class extends Error {
    readonly code = "SYNC_BACKEND_UNAVAILABLE";
  },
}));
vi.mock("./syncRepository", () => ({
  SyncRepository: function SyncRepository() {
    return { resolveUser };
  },
}));
vi.mock("./mutationRateLimit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./mutationRateLimit")>();
  return { ...actual, consumeMutationRateLimit };
});
vi.mock("./assessmentRepository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./assessmentRepository")>();
  return {
    ...actual,
    AssessmentRepository: function AssessmentRepository() {
      return assessmentRepository;
    },
  };
});

import { POST as openAssessment } from "../../app/api/assessment/sessions/route";
import { POST as recordAttempt } from "../../app/api/assessment/attempts/route";
import { POST as submitAssessment } from "../../app/api/assessment/sessions/submit/route";
import { POST as abandonAssessment } from "../../app/api/assessment/sessions/abandon/route";
import { AssessmentContentUnavailableError } from "./assessmentRepository";
import { LearningResetEpochConflictError } from "./learningResetEpoch";

const formHash = `sha256:${"a".repeat(64)}` as const;
const form = {
  schemaVersion: 1 as const,
  blueprintId: "fixture-blueprint",
  formVersion: "fixture-form",
  scoringPolicyVersion: "fixture-scoring",
  items: [{
    position: 0,
    itemId: "fixture-item",
    itemVersion: "fixture-item-v1",
    skill: "reading" as const,
    construct: "fixture-construct",
    modality: "visual-selection" as const,
    measurementEligible: true,
    prompt: "Fixture prompt",
    meta: "Fixture meta",
    options: ["a", "b"],
  }],
};
const openCommand = {
  protocolVersion: 1,
  idempotencyKey: "route-open",
  installationId: "route-installation",
  deviceId: "route-device",
  deviceSequence: 1,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  enrollmentId: "route-enrollment",
};
const attemptCommand = {
  protocolVersion: 1,
  idempotencyKey: "route-attempt",
  installationId: "route-installation",
  deviceId: "route-device",
  deviceSequence: 2,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  sessionId: "route-session",
  formHash,
  itemId: "fixture-item",
  itemVersion: "fixture-item-v1",
  occurredAt: "2026-07-22T03:00:00.000Z",
  response: { kind: "selection", answer: "a" },
};
const terminalCommand = (key: string, sequence: number) => ({
  protocolVersion: 1,
  idempotencyKey: key,
  installationId: "route-installation",
  deviceId: "route-device",
  deviceSequence: sequence,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  sessionId: "route-session",
  formHash,
});

const request = (path: string, body: unknown, origin = "https://hanzi.test") =>
  new Request(`https://hanzi.test${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

beforeEach(() => {
  getChatGPTUser.mockReset();
  getChatGPTUser.mockResolvedValue({
    displayName: "Learner",
    email: "learner@example.com",
    fullName: null,
  });
  getD1Database.mockReset();
  getD1Database.mockResolvedValue({});
  resolveUser.mockReset();
  resolveUser.mockResolvedValue("route-user");
  consumeMutationRateLimit.mockReset();
  consumeMutationRateLimit.mockResolvedValue({
    allowed: true,
    limit: 10,
    remaining: 9,
    resetAfterSeconds: 600,
    retryAfterSeconds: 0,
    windowEndsAt: 1,
    policyVersion: "2026-07-22.v1",
  });
  Object.values(assessmentRepository).forEach((mock) => mock.mockReset());
  assessmentRepository.openSession.mockResolvedValue({
    protocolVersion: 1,
    idempotencyKey: openCommand.idempotencyKey,
    duplicate: false,
    sessionId: "route-session",
    enrollmentId: openCommand.enrollmentId,
    resetEpoch: 0,
    contentVersion: CONTENT_VERSION,
    blueprintId: form.blueprintId,
    formVersion: form.formVersion,
    scoringPolicyVersion: form.scoringPolicyVersion,
    expectedItemCount: 1,
    form,
    formHash,
    status: "started",
    startedAt: "2026-07-22T03:00:00.000Z",
  } satisfies OpenAssessmentSessionReceiptV1);
  assessmentRepository.recordAttempt.mockResolvedValue({
    protocolVersion: 1,
    idempotencyKey: attemptCommand.idempotencyKey,
    duplicate: false,
    attemptId: "route-attempt-id",
    sessionId: "route-session",
    resetEpoch: 0,
    contentVersion: CONTENT_VERSION,
    formHash,
    position: 0,
    itemId: "fixture-item",
    itemVersion: "fixture-item-v1",
    skill: "reading",
    measurementEligible: true,
    masteryEligible: false,
    status: "recorded",
    recordedAt: "2026-07-22T03:00:01.000Z",
  } satisfies RecordAssessmentAttemptReceiptV1);
  const unassessed = {
    status: "unassessed" as const,
    correct: 0,
    n: 0,
    observedAccuracy: null,
    confidence95: null,
    masteryEligible: false as const,
  };
  assessmentRepository.submitSession.mockResolvedValue({
    protocolVersion: 1,
    idempotencyKey: "route-submit",
    duplicate: false,
    sessionId: "route-session",
    enrollmentId: "route-enrollment",
    resetEpoch: 0,
    contentVersion: CONTENT_VERSION,
    blueprintId: form.blueprintId,
    formVersion: form.formVersion,
    scoringPolicyVersion: form.scoringPolicyVersion,
    formHash,
    status: "submitted",
    calibrationStatus: "uncalibrated",
    confidenceLevel: 0.95,
    masteryEligible: false,
    overall: unassessed,
    skills: [
      "pronunciation",
      "listening",
      "speaking",
      "reading",
      "writing",
      "vocabulary",
      "grammar",
    ].map((skill) => ({ skill, ...unassessed })),
    submittedAt: "2026-07-22T03:01:00.000Z",
  } as SubmitAssessmentSessionReceiptV1);
  assessmentRepository.abandonSession.mockResolvedValue({
    protocolVersion: 1,
    idempotencyKey: "route-abandon",
    duplicate: false,
    sessionId: "route-session",
    enrollmentId: "route-enrollment",
    resetEpoch: 0,
    contentVersion: CONTENT_VERSION,
    blueprintId: form.blueprintId,
    formVersion: form.formVersion,
    formHash,
    status: "abandoned",
    masteryEligible: false,
    abandonedAt: "2026-07-22T03:01:00.000Z",
  } satisfies AbandonAssessmentSessionReceiptV1);
});

describe("assessment mutation routes", () => {
  it("blocks cross-origin requests before identity and identity before JSON", async () => {
    const crossOrigin = await openAssessment(request(
      "/api/assessment/sessions",
      openCommand,
      "https://attacker.test",
    ));
    expect(crossOrigin.status).toBe(403);
    expect(getChatGPTUser).not.toHaveBeenCalled();

    getChatGPTUser.mockResolvedValue(null);
    const unauthenticated = await openAssessment(request(
      "/api/assessment/sessions",
      "{invalid",
    ));
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.headers.get("cache-control")).toContain("no-store");
  });

  it("rejects unknown authority fields before repository access", async () => {
    const response = await recordAttempt(request(
      "/api/assessment/attempts",
      { ...attemptCommand, correct: true, score: 100 },
    ));
    expect(response.status).toBe(422);
    expect(assessmentRepository.recordAttempt).not.toHaveBeenCalled();
  });

  it("returns all four server receipts through tenant-owned repositories", async () => {
    const opened = await openAssessment(request(
      "/api/assessment/sessions",
      openCommand,
    ));
    const attempted = await recordAttempt(request(
      "/api/assessment/attempts",
      attemptCommand,
    ));
    const submitted = await submitAssessment(request(
      "/api/assessment/sessions/submit",
      terminalCommand("route-submit", 3),
    ));
    const abandoned = await abandonAssessment(request(
      "/api/assessment/sessions/abandon",
      terminalCommand("route-abandon", 4),
    ));
    expect([opened.status, attempted.status, submitted.status, abandoned.status])
      .toEqual([201, 201, 201, 201]);
    expect(assessmentRepository.openSession).toHaveBeenCalledWith(
      "route-user",
      openCommand,
    );
    expect(assessmentRepository.recordAttempt).toHaveBeenCalledWith(
      "route-user",
      attemptCommand,
    );
    await expect(submitted.json()).resolves.toMatchObject({
      status: "submitted",
      masteryEligible: false,
      calibrationStatus: "uncalibrated",
    });
    await expect(abandoned.json()).resolves.toMatchObject({
      status: "abandoned",
      masteryEligible: false,
    });
  });

  it("returns durable pacing headers and does not execute when limited", async () => {
    consumeMutationRateLimit.mockResolvedValue({
      allowed: false,
      limit: 10,
      remaining: 0,
      resetAfterSeconds: 41,
      retryAfterSeconds: 41,
      windowEndsAt: 1,
      policyVersion: "2026-07-22.v1",
    });
    const response = await openAssessment(request(
      "/api/assessment/sessions",
      openCommand,
    ));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("41");
    expect(assessmentRepository.openSession).not.toHaveBeenCalled();
  });

  it("maps reset and release failures to permanent conflicts", async () => {
    assessmentRepository.submitSession.mockRejectedValue(
      new LearningResetEpochConflictError(),
    );
    const reset = await submitAssessment(request(
      "/api/assessment/sessions/submit",
      terminalCommand("route-submit", 3),
    ));
    expect(reset.status).toBe(409);
    await expect(reset.json()).resolves.toMatchObject({
      error: { code: "LEARNING_RESET_EPOCH_CONFLICT", retryable: false },
    });

    assessmentRepository.openSession.mockRejectedValue(
      new AssessmentContentUnavailableError("Package is not promoted."),
    );
    const release = await openAssessment(request(
      "/api/assessment/sessions",
      openCommand,
    ));
    expect(release.status).toBe(409);
    await expect(release.json()).resolves.toMatchObject({
      error: { code: "ASSESSMENT_CONTENT_UNAVAILABLE", retryable: false },
    });
  });
});
