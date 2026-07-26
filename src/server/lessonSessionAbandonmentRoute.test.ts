import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONTENT_VERSION, RELEASED_LESSONS } from "../data/curriculum";
import type {
  AbandonLessonSessionCommandV1,
  AbandonLessonSessionReceiptV1,
} from "../learning/lessonSessionAbandonmentProtocol";
import { LearningResetEpochConflictError } from "./learningResetEpoch";
import { LessonSessionAbandonmentUnavailableError } from "./lessonSessionAbandonmentRepository";

const {
  getChatGPTUser,
  getD1Database,
  syncRepository,
  abandonmentRepository,
  consumeMutationRateLimit,
} = vi.hoisted(() => ({
  getChatGPTUser: vi.fn(),
  getD1Database: vi.fn(),
  syncRepository: { resolveUser: vi.fn() },
  abandonmentRepository: { abandon: vi.fn() },
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
vi.mock("./lessonSessionAbandonmentRepository", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("./lessonSessionAbandonmentRepository")
  >();
  return {
    ...actual,
    LessonSessionAbandonmentRepository:
      function LessonSessionAbandonmentRepository() {
        return abandonmentRepository;
      },
  };
});

import { POST } from "../../app/api/learning/lesson-sessions/abandon/route";

const lesson = RELEASED_LESSONS[0];
const command = (): AbandonLessonSessionCommandV1 => ({
  protocolVersion: 1,
  idempotencyKey: "lesson-session-abandon:route:1",
  installationId: "installation-route",
  deviceId: "device-route",
  deviceSequence: 21,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  sessionId: "session-route",
});

const request = (
  body: unknown,
  origin = "https://hanzi.test",
  headers: Record<string, string> = {},
) => new Request("https://hanzi.test/api/learning/lesson-sessions/abandon", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    origin,
    ...headers,
  },
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
    windowEndsAt: Date.UTC(2026, 6, 22, 8, 10),
    policyVersion: "2026-07-22.v1",
  });
  abandonmentRepository.abandon.mockReset();
  abandonmentRepository.abandon.mockImplementation(
    async (_userId, input): Promise<AbandonLessonSessionReceiptV1> => ({
      protocolVersion: 1,
      idempotencyKey: input.idempotencyKey,
      duplicate: false,
      sessionId: input.sessionId,
      enrollmentId: "user-route-enrollment",
      contentVersion: CONTENT_VERSION,
      resetEpoch: input.resetEpoch,
      lessonId: lesson.id,
      lessonVersion: `${CONTENT_VERSION}:${lesson.id}:1`,
      status: "abandoned",
      abandonedAt: "2026-07-22T08:00:00.000Z",
    }),
  );
});

describe("lesson-session abandonment API", () => {
  it("returns a permanent epoch conflict for a command leased before reset", async () => {
    abandonmentRepository.abandon.mockRejectedValue(
      new LearningResetEpochConflictError(),
    );
    const response = await POST(request(command()));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "LEARNING_RESET_EPOCH_CONFLICT", retryable: false },
    });
  });

  it("rate-limits abandonment with durable pacing headers", async () => {
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
    expect(abandonmentRepository.abandon).not.toHaveBeenCalled();
  });

  it("requires identity before parsing the request body", async () => {
    getChatGPTUser.mockResolvedValue(null);
    const response = await POST(request("{not json"));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(abandonmentRepository.abandon).not.toHaveBeenCalled();
  });

  it("blocks cross-origin writes before resolving identity", async () => {
    const response = await POST(request(command(), "https://attacker.test"));
    expect(response.status).toBe(403);
    expect(getChatGPTUser).not.toHaveBeenCalled();
  });

  it("enforces the raw request body bound", async () => {
    const response = await POST(request(`"${"x".repeat(16_001)}"`));
    expect(response.status).toBe(413);
    expect(abandonmentRepository.abandon).not.toHaveBeenCalled();
  });

  it("rejects client-authored terminal facts after authenticated pacing", async () => {
    const response = await POST(request({
      ...command(),
      status: "abandoned",
      abandonedAt: "2026-07-22T08:00:00.000Z",
    }));
    expect(response.status).toBe(422);
    expect(getD1Database).toHaveBeenCalledOnce();
    expect(consumeMutationRateLimit).toHaveBeenCalledOnce();
  });

  it("resolves the authenticated tenant and returns the server receipt", async () => {
    const response = await POST(request(command()));
    expect(response.status).toBe(201);
    expect(response.headers.get("ratelimit-limit")).toBe("30");
    await expect(response.json()).resolves.toMatchObject({
      sessionId: "session-route",
      status: "abandoned",
      lessonId: lesson.id,
      abandonedAt: "2026-07-22T08:00:00.000Z",
    });
    expect(abandonmentRepository.abandon).toHaveBeenCalledWith(
      "user-route",
      command(),
    );
  });

  it("uses 200 for an exact idempotent retry", async () => {
    abandonmentRepository.abandon.mockImplementationOnce(
      async (_userId, input): Promise<AbandonLessonSessionReceiptV1> => ({
        protocolVersion: 1,
        idempotencyKey: input.idempotencyKey,
        duplicate: true,
        sessionId: input.sessionId,
        enrollmentId: "user-route-enrollment",
        contentVersion: CONTENT_VERSION,
        resetEpoch: input.resetEpoch,
        lessonId: lesson.id,
        lessonVersion: `${CONTENT_VERSION}:${lesson.id}:1`,
        status: "abandoned",
        abandonedAt: "2026-07-22T08:00:00.000Z",
      }),
    );
    expect((await POST(request(command()))).status).toBe(200);
  });

  it("reports terminal, foreign, or stale sessions as permanent conflicts", async () => {
    abandonmentRepository.abandon.mockRejectedValue(
      new LessonSessionAbandonmentUnavailableError("Session is not started."),
    );
    const response = await POST(request(command()));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "LESSON_SESSION_ABANDONMENT_UNAVAILABLE",
        retryable: false,
      },
    });
  });
});
