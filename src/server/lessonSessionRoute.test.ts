import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONTENT_VERSION, RELEASED_LESSONS } from "../data/curriculum";
import type {
  OpenLessonSessionCommandV1,
  OpenLessonSessionReceiptV1,
} from "../learning/lessonSessionProtocol";
import { LessonSessionContentUnavailableError } from "./lessonSessionRepository";
import { LearningResetEpochConflictError } from "./learningResetEpoch";

const {
  getChatGPTUser,
  getD1Database,
  syncRepository,
  lessonSessionRepository,
  consumeMutationRateLimit,
} = vi.hoisted(() => ({
  getChatGPTUser: vi.fn(),
  getD1Database: vi.fn(),
  syncRepository: { resolveUser: vi.fn() },
  lessonSessionRepository: { open: vi.fn() },
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
vi.mock("./lessonSessionRepository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./lessonSessionRepository")>();
  return {
    ...actual,
    LessonSessionRepository: function LessonSessionRepository() {
      return lessonSessionRepository;
    },
  };
});

import { POST } from "../../app/api/learning/lesson-sessions/route";

const lesson = RELEASED_LESSONS[0];
const routeFormHash = `sha256:${"a".repeat(64)}` as const;
const routeForm = {
  schemaVersion: 1 as const,
  script: "simplified" as const,
  activities: Array.from({ length: 10 }, (_, position) => ({
    position,
    activityId: `${lesson.id}:activity-${position}`,
    activityVersion: `${CONTENT_VERSION}:${lesson.id}:1`,
    method: "meaning-selection" as const,
    skill: "vocabulary" as const,
    requiredForPass: false,
  })),
};
const command = (): OpenLessonSessionCommandV1 => ({
  protocolVersion: 1,
  idempotencyKey: "lesson-session:route:1",
  installationId: "installation-route",
  deviceId: "device-route",
  deviceSequence: 1,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  enrollmentId: "enrollment-route",
  lessonId: lesson.id,
});

const request = (body: unknown, origin = "https://hanzi.test") =>
  new Request("https://hanzi.test/api/learning/lesson-sessions", {
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
  lessonSessionRepository.open.mockReset();
  lessonSessionRepository.open.mockImplementation(
    async (_userId, input): Promise<OpenLessonSessionReceiptV1> => ({
      protocolVersion: 1,
      idempotencyKey: input.idempotencyKey,
      duplicate: false,
      sessionId: "session-route",
      enrollmentId: input.enrollmentId,
      contentVersion: CONTENT_VERSION,
      resetEpoch: input.resetEpoch,
      lessonId: input.lessonId,
      lessonVersion: `${CONTENT_VERSION}:${input.lessonId}:1`,
      expectedEvidenceCount: 10,
      form: routeForm,
      formHash: routeFormHash,
      status: "started",
      startedAt: "2026-07-22T06:00:00.000Z",
    }),
  );
});

describe("lesson-session API", () => {
  it("returns a permanent epoch conflict for a command leased before reset", async () => {
    lessonSessionRepository.open.mockRejectedValue(
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
    expect(lessonSessionRepository.open).not.toHaveBeenCalled();
  });

  it("blocks cross-origin writes before resolving identity", async () => {
    const response = await POST(request(command(), "https://attacker.test"));
    expect(response.status).toBe(403);
    expect(getChatGPTUser).not.toHaveBeenCalled();
  });

  it("rejects client-authored lesson version before database access", async () => {
    const response = await POST(request({
      ...command(),
      lessonVersion: "invented",
      expectedEvidenceCount: 1,
    }));
    expect(response.status).toBe(422);
    expect(getD1Database).toHaveBeenCalledOnce();
    expect(consumeMutationRateLimit).toHaveBeenCalledOnce();
  });

  it("rate-limits session creation with durable pacing headers", async () => {
    consumeMutationRateLimit.mockResolvedValue({
      allowed: false,
      limit: 30,
      remaining: 0,
      resetAfterSeconds: 41,
      retryAfterSeconds: 41,
      windowEndsAt: 1,
      policyVersion: "2026-07-22.v1",
    });
    const response = await POST(request(command()));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("41");
    expect(lessonSessionRepository.open).not.toHaveBeenCalled();
  });

  it("resolves the authenticated tenant and returns a server receipt", async () => {
    const response = await POST(request(command()));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      sessionId: "session-route",
      lessonVersion: `${CONTENT_VERSION}:${lesson.id}:1`,
      expectedEvidenceCount: 10,
      formHash: routeFormHash,
      status: "started",
    });
    expect(lessonSessionRepository.open).toHaveBeenCalledWith(
      "user-route",
      command(),
    );
  });

  it("reports an unpromoted package without creating a session", async () => {
    lessonSessionRepository.open.mockRejectedValue(
      new LessonSessionContentUnavailableError("Package is not promoted."),
    );
    const response = await POST(request(command()));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "LESSON_SESSION_CONTENT_UNAVAILABLE",
        retryable: false,
      },
    });
  });
});
