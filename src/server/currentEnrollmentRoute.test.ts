import { beforeEach, describe, expect, it, vi } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import type { CurrentEnrollmentReceiptV1 } from "../learning/currentEnrollmentProtocol";
import {
  CurrentEnrollmentContentUnavailableError,
  CurrentEnrollmentIntegrityError,
  CurrentEnrollmentProfileUnavailableError,
} from "./currentEnrollmentRepository";
import {
  CURRENT_ENROLLMENT_ACTIVATE_MUTATION_POLICY,
  MutationRateLimitBackendError,
} from "./mutationRateLimit";

const {
  getChatGPTUser,
  getD1Database,
  syncRepository,
  currentEnrollmentRepository,
  consumeMutationRateLimit,
} = vi.hoisted(() => ({
  getChatGPTUser: vi.fn(),
  getD1Database: vi.fn(),
  syncRepository: { resolveUser: vi.fn() },
  currentEnrollmentRepository: { activate: vi.fn() },
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
vi.mock("./currentEnrollmentRepository", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("./currentEnrollmentRepository")
  >();
  return {
    ...actual,
    CurrentEnrollmentRepository: function CurrentEnrollmentRepository() {
      return currentEnrollmentRepository;
    },
  };
});

import { POST } from "../../app/api/learning/enrollment/route";

const receipt = (): CurrentEnrollmentReceiptV1 => ({
  protocolVersion: 1,
  enrollmentId: "enrollment-route",
  courseId: "hanzi-os-core",
  contentVersion: CONTENT_VERSION,
  manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  releaseState: "beta",
  goal: "conversation",
});

const request = (
  body: unknown,
  options: { origin?: string; contentType?: string; contentLength?: string } = {},
) => new Request("https://hanzi.test/api/learning/enrollment", {
  method: "POST",
  headers: {
    "content-type": options.contentType ?? "application/json",
    origin: options.origin ?? "https://hanzi.test",
    ...(options.contentLength === undefined
      ? {}
      : { "content-length": options.contentLength }),
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
    limit: 10,
    remaining: 9,
    resetAfterSeconds: 600,
    retryAfterSeconds: 0,
    windowEndsAt: Date.UTC(2026, 6, 22, 6, 10),
    policyVersion: "2026-07-22.v1",
  });
  currentEnrollmentRepository.activate.mockReset();
  currentEnrollmentRepository.activate.mockResolvedValue(receipt());
});

describe("current enrollment API", () => {
  it("authenticates, consumes the dedicated policy, and accepts only protocol v1", async () => {
    const response = await POST(request({ protocolVersion: 1 }));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("ratelimit-limit")).toBe("10");
    expect(response.headers.get("x-rate-limit-policy-version"))
      .toBe("2026-07-22.v1");
    await expect(response.json()).resolves.toEqual(receipt());
    expect(consumeMutationRateLimit).toHaveBeenCalledWith(
      {},
      "user-route",
      CURRENT_ENROLLMENT_ACTIVATE_MUTATION_POLICY,
    );
    expect(currentEnrollmentRepository.activate).toHaveBeenCalledWith(
      "user-route",
    );
  });

  it("blocks cross-origin writes before resolving identity", async () => {
    const response = await POST(request(
      { protocolVersion: 1 },
      { origin: "https://attacker.test" },
    ));
    expect(response.status).toBe(403);
    expect(getChatGPTUser).not.toHaveBeenCalled();
    expect(consumeMutationRateLimit).not.toHaveBeenCalled();
  });

  it("requires authentication before reading an invalid body", async () => {
    getChatGPTUser.mockResolvedValue(null);
    const response = await POST(request("{not json"));
    expect(response.status).toBe(401);
    expect(getD1Database).not.toHaveBeenCalled();
    expect(consumeMutationRateLimit).not.toHaveBeenCalled();
  });

  it("rate-limits before parsing and returns pacing headers", async () => {
    consumeMutationRateLimit.mockResolvedValue({
      allowed: false,
      limit: 10,
      remaining: 0,
      resetAfterSeconds: 47,
      retryAfterSeconds: 47,
      windowEndsAt: 1,
      policyVersion: "2026-07-22.v1",
    });
    const response = await POST(request("{not json"));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("47");
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "MUTATION_RATE_LIMITED", retryable: true },
    });
    expect(currentEnrollmentRepository.activate).not.toHaveBeenCalled();
  });

  it("rejects malformed, non-JSON, oversized, and client-authored fields", async () => {
    const cases = [
      [request("{not json"), 400],
      [request({ protocolVersion: 1 }, { contentType: "text/plain" }), 415],
      [request({ protocolVersion: 1 }, { contentLength: "1001" }), 413],
      [request({ protocolVersion: 1 }, { contentLength: "-1" }), 413],
      [request({ protocolVersion: 2 }), 422],
      [request({ protocolVersion: 1, goal: "hsk" }), 422],
    ] as const;
    for (const [candidate, expectedStatus] of cases) {
      const response = await POST(candidate);
      expect(response.status).toBe(expectedStatus);
    }
    expect(currentEnrollmentRepository.activate).not.toHaveBeenCalled();
  });

  it("returns permanent 409 for unavailable content or learner profile", async () => {
    for (const error of [
      new CurrentEnrollmentContentUnavailableError(),
      new CurrentEnrollmentProfileUnavailableError(),
    ]) {
      currentEnrollmentRepository.activate.mockRejectedValueOnce(error);
      const response = await POST(request({ protocolVersion: 1 }));
      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: error.code, retryable: false },
      });
    }
  });

  it("fails closed when rate-limit or enrollment integrity state is unavailable", async () => {
    consumeMutationRateLimit.mockRejectedValueOnce(
      new MutationRateLimitBackendError(),
    );
    const limiterResponse = await POST(request({ protocolVersion: 1 }));
    expect(limiterResponse.status).toBe(503);
    await expect(limiterResponse.json()).resolves.toMatchObject({
      error: {
        code: "MUTATION_RATE_LIMIT_BACKEND_UNAVAILABLE",
        retryable: true,
      },
    });

    consumeMutationRateLimit.mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAfterSeconds: 600,
      retryAfterSeconds: 0,
      windowEndsAt: 1,
      policyVersion: "2026-07-22.v1",
    });
    currentEnrollmentRepository.activate.mockRejectedValueOnce(
      new CurrentEnrollmentIntegrityError(),
    );
    const integrityResponse = await POST(request({ protocolVersion: 1 }));
    expect(integrityResponse.status).toBe(503);
    await expect(integrityResponse.json()).resolves.toMatchObject({
      error: { code: "CURRENT_ENROLLMENT_INTEGRITY_ERROR", retryable: true },
    });
  });
});
