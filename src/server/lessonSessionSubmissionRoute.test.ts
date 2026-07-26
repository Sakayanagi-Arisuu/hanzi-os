import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONTENT_VERSION, RELEASED_LESSONS } from "../data/curriculum";
import type {
  SubmitLessonSessionCommandV1,
  SubmitLessonSessionReceiptV1,
} from "../learning/lessonSessionSubmissionProtocol";
import { LessonSessionSubmissionIncompleteError } from "./lessonSessionSubmissionRepository";
import { LearningResetEpochConflictError } from "./learningResetEpoch";

const {
  getChatGPTUser,
  getD1Database,
  syncRepository,
  submissionRepository,
  consumeMutationRateLimit,
} = vi.hoisted(() => ({
  getChatGPTUser: vi.fn(),
  getD1Database: vi.fn(),
  syncRepository: { resolveUser: vi.fn() },
  submissionRepository: { submit: vi.fn() },
  consumeMutationRateLimit: vi.fn(),
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
    return syncRepository;
  },
}));
vi.mock("./mutationRateLimit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./mutationRateLimit")>();
  return { ...actual, consumeMutationRateLimit };
});
vi.mock("./lessonSessionSubmissionRepository", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("./lessonSessionSubmissionRepository")
  >();
  return {
    ...actual,
    LessonSessionSubmissionRepository:
      function LessonSessionSubmissionRepository() {
        return submissionRepository;
      },
  };
});

import { POST } from "../../app/api/learning/lesson-sessions/submit/route";

const lesson = RELEASED_LESSONS[0];
const routeFormHash = `sha256:${"a".repeat(64)}` as const;
const command = (): SubmitLessonSessionCommandV1 => ({
  protocolVersion: 1,
  idempotencyKey: "lesson-session-submit:route:1",
  installationId: "installation-route",
  deviceId: "device-route",
  deviceSequence: 20,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  sessionId: "session-route",
  formHash: routeFormHash,
});

const request = (body: unknown, origin = "https://hanzi.test") =>
  new Request("https://hanzi.test/api/learning/lesson-sessions/submit", {
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
  syncRepository.resolveUser.mockReset();
  syncRepository.resolveUser.mockResolvedValue("user-route");
  consumeMutationRateLimit.mockReset();
  consumeMutationRateLimit.mockResolvedValue({
    allowed: true,
    limit: 30,
    remaining: 29,
    resetAfterSeconds: 600,
    retryAfterSeconds: 0,
    windowEndsAt: Date.UTC(2026, 6, 22, 6, 10),
    policyVersion: "2026-07-22.v1",
  });
  submissionRepository.submit.mockReset();
  submissionRepository.submit.mockImplementation(
    async (_userId, input): Promise<SubmitLessonSessionReceiptV1> => ({
      protocolVersion: 1,
      idempotencyKey: input.idempotencyKey,
      duplicate: false,
      sessionId: input.sessionId,
      contentVersion: CONTENT_VERSION,
      resetEpoch: input.resetEpoch,
      lessonId: lesson.id,
      lessonVersion: `${CONTENT_VERSION}:${lesson.id}:1`,
      formHash: input.formHash,
      status: "submitted",
      evidenceCount: 10,
      rawScore: 80,
      gateScore: 80,
      requiredEvidenceCount: 4,
      requiredCorrectCount: 4,
      passed: true,
      completionEvidenceId: "completion-route",
      submittedAt: "2026-07-22T07:00:00.000Z",
    }),
  );
});

describe("lesson-session submission API", () => {
  it("returns a permanent epoch conflict for a command leased before reset", async () => {
    submissionRepository.submit.mockRejectedValue(
      new LearningResetEpochConflictError(),
    );
    const response = await POST(request(command()));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "LEARNING_RESET_EPOCH_CONFLICT", retryable: false },
    });
  });

  it("rate-limits finalization with durable pacing headers", async () => {
    consumeMutationRateLimit.mockResolvedValue({
      allowed: false,
      limit: 30,
      remaining: 0,
      resetAfterSeconds: 43,
      retryAfterSeconds: 43,
      windowEndsAt: 1,
      policyVersion: "2026-07-22.v1",
    });
    const response = await POST(request(command()));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("43");
    expect(submissionRepository.submit).not.toHaveBeenCalled();
  });

  it("requires identity before parsing the request body", async () => {
    getChatGPTUser.mockResolvedValue(null);
    const response = await POST(request("{not json"));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(submissionRepository.submit).not.toHaveBeenCalled();
  });

  it("blocks cross-origin writes before resolving identity", async () => {
    const response = await POST(request(command(), "https://attacker.test"));
    expect(response.status).toBe(403);
    expect(getChatGPTUser).not.toHaveBeenCalled();
  });

  it("rejects client-authored scores after authenticated pacing", async () => {
    const response = await POST(request({
      ...command(),
      rawScore: 100,
      passed: true,
    }));
    expect(response.status).toBe(422);
    expect(getD1Database).toHaveBeenCalledOnce();
    expect(consumeMutationRateLimit).toHaveBeenCalledOnce();
  });

  it("resolves the authenticated tenant and returns derived results", async () => {
    const response = await POST(request(command()));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      sessionId: "session-route",
      status: "submitted",
      rawScore: 80,
      gateScore: 80,
      passed: true,
      completionEvidenceId: "completion-route",
    });
    expect(submissionRepository.submit).toHaveBeenCalledWith(
      "user-route",
      command(),
    );
  });

  it("reports incomplete normalized evidence without finalizing", async () => {
    submissionRepository.submit.mockRejectedValue(
      new LessonSessionSubmissionIncompleteError("9/10 attempts"),
    );
    const response = await POST(request(command()));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "LESSON_SESSION_SUBMISSION_INCOMPLETE",
        retryable: false,
      },
    });
  });
});
