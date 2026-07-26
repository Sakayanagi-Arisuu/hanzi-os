import { beforeEach, describe, expect, it, vi } from "vitest";
import { MutationRateLimitBackendError } from "./mutationRateLimit";

const {
  getChatGPTUser,
  getD1Database,
  repository,
  consumeMutationRateLimit,
} = vi.hoisted(() => ({
  getChatGPTUser: vi.fn(),
  getD1Database: vi.fn(),
  repository: {
    resolveUser: vi.fn(),
    deleteAccount: vi.fn(),
  },
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
    return repository;
  },
}));
vi.mock("./mutationRateLimit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./mutationRateLimit")>();
  return { ...actual, consumeMutationRateLimit };
});

import { DELETE } from "../../app/api/account/route";

const identity = {
  displayName: "Learner",
  email: "learner@example.com",
  fullName: null,
};

const request = (body: string, origin = "https://hanzi.test") =>
  new Request("https://hanzi.test/api/account", {
    method: "DELETE",
    headers: { "content-type": "application/json", origin },
    body,
  });

beforeEach(() => {
  getChatGPTUser.mockReset();
  getChatGPTUser.mockResolvedValue(identity);
  getD1Database.mockReset();
  getD1Database.mockResolvedValue({});
  repository.resolveUser.mockReset();
  repository.resolveUser.mockResolvedValue("user-account");
  repository.deleteAccount.mockReset();
  repository.deleteAccount.mockResolvedValue(true);
  consumeMutationRateLimit.mockReset();
  consumeMutationRateLimit.mockResolvedValue({
    allowed: true,
    limit: 3,
    remaining: 2,
    resetAfterSeconds: 3_600,
    retryAfterSeconds: 0,
    windowEndsAt: Date.UTC(2026, 6, 22, 7),
    policyVersion: "2026-07-22.v1",
  });
});

describe("account deletion mutation rate limit", () => {
  it("blocks cross-origin deletion before identity or quota access", async () => {
    const response = await DELETE(request(
      JSON.stringify({ confirmation: "DELETE HANZI.OS" }),
      "https://attacker.test",
    ));

    expect(response.status).toBe(403);
    expect(getChatGPTUser).not.toHaveBeenCalled();
    expect(consumeMutationRateLimit).not.toHaveBeenCalled();
  });

  it("requires authentication before reading the body or consuming quota", async () => {
    getChatGPTUser.mockResolvedValue(null);

    const response = await DELETE(request("{not valid JSON"));

    expect(response.status).toBe(401);
    expect(getD1Database).not.toHaveBeenCalled();
    expect(consumeMutationRateLimit).not.toHaveBeenCalled();
  });

  it("returns structured 429 before parsing a rejected mutation body", async () => {
    consumeMutationRateLimit.mockResolvedValue({
      allowed: false,
      limit: 3,
      remaining: 0,
      resetAfterSeconds: 827,
      retryAfterSeconds: 827,
      windowEndsAt: Date.UTC(2026, 6, 22, 7),
      policyVersion: "2026-07-22.v1",
    });

    const response = await DELETE(request("{not valid JSON"));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("827");
    expect(response.headers.get("ratelimit-limit")).toBe("3");
    expect(response.headers.get("ratelimit-remaining")).toBe("0");
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "MUTATION_RATE_LIMITED", retryable: true },
    });
    expect(repository.deleteAccount).not.toHaveBeenCalled();
  });

  it("fails closed when the persistent deletion limiter is unavailable", async () => {
    consumeMutationRateLimit.mockRejectedValue(new MutationRateLimitBackendError());

    const response = await DELETE(request(
      JSON.stringify({ confirmation: "DELETE HANZI.OS" }),
    ));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "MUTATION_RATE_LIMIT_BACKEND_UNAVAILABLE",
        retryable: true,
      },
    });
    expect(repository.deleteAccount).not.toHaveBeenCalled();
  });

  it("consumes the server-owned delete policy before confirmation validation", async () => {
    const response = await DELETE(request(JSON.stringify({ confirmation: "wrong" })));

    expect(response.status).toBe(422);
    expect(consumeMutationRateLimit).toHaveBeenCalledWith(
      {},
      "user-account",
      expect.objectContaining({
        scope: "account.delete",
        maxRequests: 3,
        windowSeconds: 3_600,
      }),
    );
    expect(repository.deleteAccount).not.toHaveBeenCalled();
  });

  it("rejects a non-JSON deletion body after the authenticated quota boundary", async () => {
    const response = await DELETE(new Request("https://hanzi.test/api/account", {
      method: "DELETE",
      headers: { "content-type": "text/plain", origin: "https://hanzi.test" },
      body: "DELETE HANZI.OS",
    }));

    expect(response.status).toBe(415);
    expect(consumeMutationRateLimit).toHaveBeenCalledOnce();
    expect(repository.deleteAccount).not.toHaveBeenCalled();
  });

  it("bounds the deletion confirmation body before reading it", async () => {
    const response = await DELETE(new Request("https://hanzi.test/api/account", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        "content-length": "5000",
        origin: "https://hanzi.test",
      },
      body: JSON.stringify({ confirmation: "DELETE HANZI.OS" }),
    }));

    expect(response.status).toBe(413);
    expect(consumeMutationRateLimit).toHaveBeenCalledOnce();
    expect(repository.deleteAccount).not.toHaveBeenCalled();
  });

  it("deletes only after confirmation and returns successful pacing headers", async () => {
    const response = await DELETE(request(
      JSON.stringify({ confirmation: "DELETE HANZI.OS" }),
    ));

    expect(response.status).toBe(200);
    expect(response.headers.get("ratelimit-limit")).toBe("3");
    expect(response.headers.get("ratelimit-remaining")).toBe("2");
    expect(response.headers.get("ratelimit-reset")).toBe("3600");
    expect(response.headers.get("retry-after")).toBeNull();
    expect(repository.deleteAccount).toHaveBeenCalledWith("user-account");
  });
});
