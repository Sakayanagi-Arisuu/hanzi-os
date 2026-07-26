import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONTENT_VERSION,
  RELEASED_LESSONS,
  WORD_BY_ID,
} from "../data/curriculum";
import type {
  LearningAttemptCommandV1,
  LearningAttemptReceiptV1,
} from "../learning/attemptProtocol";
import { CourseVersionBindingError } from "./courseVersionRepository";
import { MutationRateLimitBackendError } from "./mutationRateLimit";
import { LearningResetEpochConflictError } from "./learningResetEpoch";

const {
  getChatGPTUser,
  getD1Database,
  syncRepository,
  attemptRepository,
  consumeMutationRateLimit,
} =
  vi.hoisted(() => ({
    getChatGPTUser: vi.fn(),
    getD1Database: vi.fn(),
    syncRepository: { resolveUser: vi.fn() },
    attemptRepository: { commitObjectiveAttempt: vi.fn() },
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
vi.mock("./attemptRepository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./attemptRepository")>();
  return {
    ...actual,
    AttemptRepository: function AttemptRepository() {
      return attemptRepository;
    },
  };
});

import { POST } from "../../app/api/learning/attempts/route";

const lesson = RELEASED_LESSONS[0];
const word = WORD_BY_ID.get(lesson.wordIds[0])!;

const command = (): LearningAttemptCommandV1 => ({
  protocolVersion: 1,
  idempotencyKey: "attempt:route:1",
  installationId: "installation",
  deviceId: "device",
  deviceSequence: 1,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  activityId: `${lesson.id}:${word.id}-meaning`,
  activityVersion: `${lesson.contentVersion}:${lesson.id}:1`,
  source: "lesson",
  method: "meaning-selection",
  sessionId: "lesson-session-route",
  occurredAt: "2026-07-22T06:00:00.000Z",
  response: { kind: "answer", answer: word.meaning, usedHint: false },
});

const request = (body: unknown, origin = "https://hanzi.test") =>
  new Request("https://hanzi.test/api/learning/attempts", {
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
    limit: 60,
    remaining: 59,
    resetAfterSeconds: 60,
    retryAfterSeconds: 0,
    windowEndsAt: Date.UTC(2026, 6, 22, 6, 1),
    policyVersion: "2026-07-22.v1",
  });
  attemptRepository.commitObjectiveAttempt.mockReset();
  attemptRepository.commitObjectiveAttempt.mockImplementation(
    async (_userId, input, score): Promise<LearningAttemptReceiptV1> => ({
      protocolVersion: 1,
      idempotencyKey: input.idempotencyKey,
      duplicate: false,
      attemptId: "attempt-id",
      evidenceId: "evidence-id",
      resetEpoch: input.resetEpoch,
      source: input.source,
      method: input.method,
      activityId: input.activityId,
      activityVersion: input.activityVersion,
      skill: score.skill,
      outcome: score.outcome,
      score: score.score,
      verification: "server-objective",
    }),
  );
});

describe("objective attempt API", () => {
  it("returns a permanent epoch conflict for a command leased before reset", async () => {
    attemptRepository.commitObjectiveAttempt.mockRejectedValue(
      new LearningResetEpochConflictError(),
    );
    const response = await POST(request(command()));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "LEARNING_RESET_EPOCH_CONFLICT", retryable: false },
    });
  });

  it("requires identity before parsing the request body", async () => {
    getChatGPTUser.mockResolvedValue(null);
    const response = await POST(request("{not json"));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(attemptRepository.commitObjectiveAttempt).not.toHaveBeenCalled();
  });

  it("blocks cross-origin writes before resolving identity", async () => {
    const response = await POST(request(command(), "https://attacker.test"));
    expect(response.status).toBe(403);
    expect(getChatGPTUser).not.toHaveBeenCalled();
  });

  it("rate-limits authenticated mutations before parsing client-authored correctness", async () => {
    const response = await POST(request({ ...command(), score: 100 }));
    expect(response.status).toBe(422);
    expect(getD1Database).toHaveBeenCalledOnce();
    expect(consumeMutationRateLimit).toHaveBeenCalledWith(
      {},
      "user-route",
      expect.objectContaining({
        scope: "learning.attempts.write",
        policyVersion: "2026-07-22.v1",
      }),
    );
    expect(attemptRepository.commitObjectiveAttempt).not.toHaveBeenCalled();
  });

  it("maps a rejected persistent counter to a structured 429 with Retry-After", async () => {
    consumeMutationRateLimit.mockResolvedValue({
      allowed: false,
      limit: 60,
      remaining: 0,
      resetAfterSeconds: 37,
      retryAfterSeconds: 37,
      windowEndsAt: 1_785_000_000_000,
      policyVersion: "2026-07-22.v1",
    });

    const response = await POST(request(command()));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("37");
    expect(response.headers.get("ratelimit-limit")).toBe("60");
    expect(response.headers.get("ratelimit-remaining")).toBe("0");
    expect(response.headers.get("ratelimit-reset")).toBe("37");
    expect(response.headers.get("x-rate-limit-policy-version")).toBe("2026-07-22.v1");
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "MUTATION_RATE_LIMITED",
        retryable: true,
      },
    });
    expect(attemptRepository.commitObjectiveAttempt).not.toHaveBeenCalled();
  });

  it("fails closed when the persistent limiter cannot be checked", async () => {
    consumeMutationRateLimit.mockRejectedValue(new MutationRateLimitBackendError());

    const response = await POST(request(command()));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "MUTATION_RATE_LIMIT_BACKEND_UNAVAILABLE",
        retryable: true,
      },
    });
    expect(attemptRepository.commitObjectiveAttempt).not.toHaveBeenCalled();
  });

  it("server-scores and commits a valid objective attempt", async () => {
    const response = await POST(request(command()));
    expect(response.status).toBe(201);
    expect(response.headers.get("ratelimit-limit")).toBe("60");
    expect(response.headers.get("ratelimit-remaining")).toBe("59");
    expect(response.headers.get("ratelimit-reset")).toBe("60");
    expect(response.headers.get("retry-after")).toBeNull();
    await expect(response.json()).resolves.toMatchObject({
      outcome: "correct",
      score: 100,
      skill: "vocabulary",
      verification: "server-objective",
    });
    expect(attemptRepository.commitObjectiveAttempt).toHaveBeenCalledWith(
      "user-route",
      expect.objectContaining({ response: { answer: word.meaning, usedHint: false, kind: "answer" } }),
      expect.objectContaining({ outcome: "correct", verified: true }),
    );
  });

  it("fails closed for an invented released-activity version", async () => {
    const response = await POST(request({
      ...command(),
      activityVersion: "invented",
    }));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "ATTEMPT_ACTIVITY_UNSUPPORTED" },
    });
    expect(attemptRepository.commitObjectiveAttempt).not.toHaveBeenCalled();
  });

  it("reports an immutable package binding incident without accepting the attempt", async () => {
    attemptRepository.commitObjectiveAttempt.mockRejectedValue(
      new CourseVersionBindingError("stale manifest"),
    );

    const response = await POST(request(command()));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "COURSE_VERSION_BINDING_CONFLICT",
        retryable: true,
      },
    });
  });
});
