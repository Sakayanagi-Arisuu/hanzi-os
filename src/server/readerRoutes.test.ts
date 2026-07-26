import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONTENT_VERSION } from "../data/curriculum";

const {
  abandonSession,
  consumeMutationRateLimit,
  getChatGPTUser,
  getD1Database,
  openSession,
  recordAttempt,
  resolveUser,
  submitSession,
} = vi.hoisted(() => ({
  abandonSession: vi.fn(),
  consumeMutationRateLimit: vi.fn(),
  getChatGPTUser: vi.fn(),
  getD1Database: vi.fn(),
  openSession: vi.fn(),
  recordAttempt: vi.fn(),
  resolveUser: vi.fn(),
  submitSession: vi.fn(),
}));

vi.mock("../../app/chatgpt-auth", () => ({ getChatGPTUser }));
vi.mock("./d1", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./d1")>();
  return { ...actual, getD1Database };
});
vi.mock("./syncRepository", () => ({
  SyncRepository: function SyncRepository() {
    return { resolveUser };
  },
}));
vi.mock("./mutationRateLimit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./mutationRateLimit")>();
  return { ...actual, consumeMutationRateLimit };
});
vi.mock("./readerRepository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./readerRepository")>();
  return {
    ...actual,
    ReaderRepository: function ReaderRepository() {
      return {
        abandonSession,
        openSession,
        recordAttempt,
        submitSession,
      };
    },
  };
});

import { POST as recordReaderAttempt } from "../../app/api/learning/reader-attempts/route";
import { POST as abandonReaderSession } from "../../app/api/learning/reader-sessions/abandon/route";
import { POST as openReaderSession } from "../../app/api/learning/reader-sessions/route";
import { POST as submitReaderSession } from "../../app/api/learning/reader-sessions/submit/route";
import { ReaderSessionUnavailableError } from "./readerRepository";

const identity = {
  displayName: "Learner",
  email: "learner@example.com",
  fullName: null,
};
const database = { database: "reader-route-fixture" };
const serverUserId = "reader-user-server-resolved";
const formHash = `sha256:${"b".repeat(64)}` as const;

const commandIdentity = (deviceSequence: number) => ({
  protocolVersion: 1 as const,
  idempotencyKey: `reader-route:${deviceSequence}`,
  installationId: "reader-installation",
  deviceId: "reader-device",
  deviceSequence,
  resetEpoch: 2,
  contentVersion: CONTENT_VERSION,
});

const openCommand = () => ({
  ...commandIdentity(1),
  enrollmentId: "reader-enrollment",
  storyId: "reader-story",
  script: "simplified" as const,
  supportMode: "unassisted" as const,
});

const attemptCommand = () => ({
  ...commandIdentity(2),
  sessionId: "reader-session",
  formHash,
  itemId: "reader-item",
  itemVersion: "reader-item-v1",
  position: 0,
  selectedOption: "选项甲",
  occurredAt: "2026-07-26T03:00:00.000Z",
  durationMs: 4_500,
});

const submitCommand = () => ({
  ...commandIdentity(3),
  sessionId: "reader-session",
  formHash,
  expectedItemCount: 1,
});

const abandonCommand = () => ({
  ...commandIdentity(4),
  sessionId: "reader-session",
  formHash,
  reason: "user-exit" as const,
});

const request = (
  path: string,
  body: unknown,
  options: {
    contentType?: string | null;
    origin?: string | null;
  } = {},
) => {
  const {
    contentType = "application/json",
    origin = "https://hanzi.test",
  } = options;
  const headers = new Headers({ "x-request-id": "reader-request" });
  if (contentType !== null) headers.set("content-type", contentType);
  if (origin !== null) headers.set("origin", origin);
  return new Request(`https://hanzi.test${path}`, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
};

const allowedRateLimit = {
  allowed: true,
  limit: 30,
  remaining: 29,
  resetAfterSeconds: 600,
  retryAfterSeconds: 0,
  windowEndsAt: Date.UTC(2026, 6, 26, 3, 10),
  policyVersion: "2026-07-26.v1",
};

const expectPrivateResponse = (response: Response, status: number) => {
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("pragma")).toBe("no-cache");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("x-request-id")).toBe("reader-request");
};

beforeEach(() => {
  getChatGPTUser.mockReset();
  getChatGPTUser.mockResolvedValue(identity);
  getD1Database.mockReset();
  getD1Database.mockResolvedValue(database);
  resolveUser.mockReset();
  resolveUser.mockResolvedValue(serverUserId);
  consumeMutationRateLimit.mockReset();
  consumeMutationRateLimit.mockResolvedValue(allowedRateLimit);
  for (const mutation of [
    openSession,
    recordAttempt,
    submitSession,
    abandonSession,
  ]) {
    mutation.mockReset();
    mutation.mockResolvedValue({ duplicate: false, status: "fixture" });
  }
});

describe("Reader mutation routes", () => {
  it("blocks cross-origin writes before auth or backend access", async () => {
    const response = await openReaderSession(request(
      "/api/learning/reader-sessions",
      openCommand(),
      { origin: "https://attacker.test" },
    ));

    expectPrivateResponse(response, 403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "CROSS_ORIGIN_BLOCKED", retryable: false },
    });
    expect(getChatGPTUser).not.toHaveBeenCalled();
    expect(getD1Database).not.toHaveBeenCalled();
    expect(openSession).not.toHaveBeenCalled();
  });

  it("requires authentication before D1, tenant resolution, or parsing", async () => {
    getChatGPTUser.mockResolvedValue(null);

    const response = await openReaderSession(request(
      "/api/learning/reader-sessions",
      "{not-json",
    ));

    expectPrivateResponse(response, 401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "AUTH_REQUIRED", retryable: false },
    });
    expect(getD1Database).not.toHaveBeenCalled();
    expect(resolveUser).not.toHaveBeenCalled();
    expect(openSession).not.toHaveBeenCalled();
  });

  it("maps all four strict commands to the server-resolved tenant and policy", async () => {
    const cases = [
      {
        call: openReaderSession,
        path: "/api/learning/reader-sessions",
        body: openCommand(),
        repository: openSession,
        scope: "learning.reader-sessions.open",
      },
      {
        call: recordReaderAttempt,
        path: "/api/learning/reader-attempts",
        body: attemptCommand(),
        repository: recordAttempt,
        scope: "learning.reader-attempts.write",
      },
      {
        call: submitReaderSession,
        path: "/api/learning/reader-sessions/submit",
        body: submitCommand(),
        repository: submitSession,
        scope: "learning.reader-sessions.submit",
      },
      {
        call: abandonReaderSession,
        path: "/api/learning/reader-sessions/abandon",
        body: abandonCommand(),
        repository: abandonSession,
        scope: "learning.reader-sessions.abandon",
      },
    ] as const;

    for (const testCase of cases) {
      const response = await testCase.call(request(
        testCase.path,
        testCase.body,
      ));
      expectPrivateResponse(response, 201);
      expect(response.headers.get("ratelimit-limit")).toBe("30");
      expect(testCase.repository).toHaveBeenCalledWith(
        serverUserId,
        testCase.body,
      );
      expect(consumeMutationRateLimit).toHaveBeenLastCalledWith(
        database,
        serverUserId,
        expect.objectContaining({
          scope: testCase.scope,
          policyVersion: "2026-07-26.v1",
        }),
      );
    }
  });

  it("returns 200 for an idempotent duplicate receipt", async () => {
    submitSession.mockResolvedValue({
      duplicate: true,
      status: "submitted",
    });

    const response = await submitReaderSession(request(
      "/api/learning/reader-sessions/submit",
      submitCommand(),
    ));

    expectPrivateResponse(response, 200);
    await expect(response.json()).resolves.toMatchObject({
      duplicate: true,
      status: "submitted",
    });
  });

  it("rejects malformed, non-JSON, and client-authored authority fields", async () => {
    const malformed = await recordReaderAttempt(request(
      "/api/learning/reader-attempts",
      "{not-json",
    ));
    expectPrivateResponse(malformed, 400);

    const wrongMedia = await recordReaderAttempt(request(
      "/api/learning/reader-attempts",
      attemptCommand(),
      { contentType: "text/plain" },
    ));
    expectPrivateResponse(wrongMedia, 415);

    const clientAuthority = await recordReaderAttempt(request(
      "/api/learning/reader-attempts",
      { ...attemptCommand(), correct: true },
    ));
    expectPrivateResponse(clientAuthority, 422);
    await expect(clientAuthority.json()).resolves.toMatchObject({
      error: { code: "INVALID_READER_ATTEMPT_COMMAND" },
    });
    expect(recordAttempt).not.toHaveBeenCalled();
  });

  it("rejects an oversized chunked body before the repository", async () => {
    const encoded = new TextEncoder().encode(JSON.stringify({
      payload: "汉".repeat(6_000),
    }));
    const chunks = [
      encoded.slice(0, 8_000),
      encoded.slice(8_000),
    ];
    const streamed = new Request(
      "https://hanzi.test/api/learning/reader-attempts",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://hanzi.test",
          "x-request-id": "reader-request",
        },
        body: new ReadableStream<Uint8Array>({
          pull(controller) {
            const next = chunks.shift();
            if (next) controller.enqueue(next);
            else controller.close();
          },
        }),
        duplex: "half",
      } as RequestInit & { duplex: "half" },
    );
    expect(encoded.byteLength).toBeGreaterThan(16_000);

    const response = await recordReaderAttempt(streamed);

    expectPrivateResponse(response, 413);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "READER_ATTEMPT_PAYLOAD_TOO_LARGE" },
    });
    expect(recordAttempt).not.toHaveBeenCalled();
  });

  it("fails closed on rate exhaustion and maps repository conflicts", async () => {
    consumeMutationRateLimit.mockResolvedValueOnce({
      ...allowedRateLimit,
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 42,
      resetAfterSeconds: 42,
    });
    const limited = await abandonReaderSession(request(
      "/api/learning/reader-sessions/abandon",
      abandonCommand(),
    ));
    expectPrivateResponse(limited, 429);
    expect(limited.headers.get("retry-after")).toBe("42");
    expect(abandonSession).not.toHaveBeenCalled();

    openSession.mockRejectedValueOnce(
      new ReaderSessionUnavailableError("Reader session changed."),
    );
    const conflict = await openReaderSession(request(
      "/api/learning/reader-sessions",
      openCommand(),
    ));
    expectPrivateResponse(conflict, 409);
    await expect(conflict.json()).resolves.toMatchObject({
      error: {
        code: "READER_SESSION_UNAVAILABLE",
        retryable: false,
      },
    });
  });
});
