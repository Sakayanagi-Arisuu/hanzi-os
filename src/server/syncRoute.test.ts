import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONTENT_VERSION } from "../data/curriculum";
import { deriveAccountKey } from "../lib/accountKey";
import type { LearningState } from "../types";
import { createInitialSyncDocument } from "../sync/document";
import {
  hashSyncPushOperation,
  SYNC_PROTOCOL_VERSION,
  type SyncPushOperationV1,
} from "../sync/protocol";
import { MutationRateLimitBackendError } from "./mutationRateLimit";

const { getChatGPTUser, getD1Database, repository, consumeMutationRateLimit } = vi.hoisted(() => ({
  getChatGPTUser: vi.fn(),
  getD1Database: vi.fn(),
  repository: {
    resolveUser: vi.fn(),
    getLearningDocument: vi.fn(),
    getLatestCursor: vi.fn(),
    upsertDevice: vi.fn(),
    claimIdempotency: vi.fn(),
    getAppliedOperation: vi.fn(),
    updateProfileProjection: vi.fn(),
    recordLocalImport: vi.fn(),
    completeIdempotency: vi.fn(),
    failIdempotency: vi.fn(),
    compareAndSwapDocumentAndAppendChange: vi.fn(),
  },
  consumeMutationRateLimit: vi.fn(),
}));

vi.mock("../../app/chatgpt-auth", () => ({ getChatGPTUser }));
vi.mock("./d1", () => ({
  getD1Database,
  SyncBackendUnavailableError: class extends Error {},
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

import { GET, POST } from "../../app/api/sync/route";

const state = (): LearningState => ({
  schemaVersion: 2,
  contentVersion: CONTENT_VERSION,
  profile: { name: "A", goal: "conversation", dailyMinutes: 20, script: "simplified", startingLevel: "zero", onboarded: true },
  xp: 0,
  dailyXp: 0,
  streak: 0,
  lastStudyDate: null,
  completedLessons: {},
  savedWords: [],
  fsrsCards: {},
  reviewCount: 0,
  skillMastery: { pronunciation: 0, listening: 0, speaking: 0, reading: 0, writing: 0, vocabulary: 0, grammar: 0 },
  knowledge: {},
  mistakes: [],
  activityLog: [],
  diagnostic: { completed: false, score: 0, recommendedLessonId: "boot-1", completedAt: null },
  evidence: [],
});

async function validOperation(): Promise<SyncPushOperationV1> {
  const occurredAt = "2026-07-20T00:00:00.000Z";
  const withoutHash: Omit<SyncPushOperationV1, "requestHash"> = {
    protocolVersion: SYNC_PROTOCOL_VERSION,
    operationId: "sync:route-test",
    idempotencyKey: "sync:route-test",
    ownerKey: "siwc_test",
    installationId: "installation",
    deviceId: "device",
    deviceSequence: 1,
    baseRevision: 0,
    kind: "snapshot",
    contentVersion: CONTENT_VERSION,
    occurredAt,
    document: createInitialSyncDocument(state(), occurredAt, "sync:route-test"),
  };
  return { ...withoutHash, requestHash: await hashSyncPushOperation(withoutHash) };
}

const signedInUser = {
  displayName: "A",
  email: "learner@example.com",
  fullName: null,
};

async function operationForSignedInUser(
  transform: (operation: SyncPushOperationV1) => SyncPushOperationV1 = (operation) => operation,
) {
  const operation = transform({
    ...await validOperation(),
    ownerKey: await deriveAccountKey(signedInUser.email),
  });
  const { requestHash: _oldHash, ...withoutHash } = operation;
  return {
    ...withoutHash,
    requestHash: await hashSyncPushOperation(withoutHash),
  };
}

beforeEach(() => {
  getChatGPTUser.mockReset();
  getChatGPTUser.mockResolvedValue(null);
  getD1Database.mockReset();
  getD1Database.mockResolvedValue({});
  Object.values(repository).forEach((method) => method.mockReset());
  repository.resolveUser.mockResolvedValue("user_test");
  repository.getLatestCursor.mockResolvedValue(0);
  repository.upsertDevice.mockResolvedValue("device_record_test");
  repository.claimIdempotency.mockResolvedValue({
    kind: "claimed",
    recordId: "claim_test",
    leaseToken: "lease_test",
  });
  repository.getAppliedOperation.mockResolvedValue(null);
  repository.updateProfileProjection.mockResolvedValue(undefined);
  repository.recordLocalImport.mockResolvedValue(undefined);
  repository.completeIdempotency.mockResolvedValue(true);
  repository.failIdempotency.mockResolvedValue(undefined);
  consumeMutationRateLimit.mockReset();
  consumeMutationRateLimit.mockResolvedValue({
    allowed: true,
    limit: 120,
    remaining: 119,
    resetAfterSeconds: 300,
    retryAfterSeconds: 0,
    windowEndsAt: Date.UTC(2026, 6, 22, 6, 5),
    policyVersion: "2026-07-22.v1",
  });
});

describe("sync API authorization boundary", () => {
  it("returns 401 and no-store for anonymous pulls", async () => {
    const response = await GET(new Request("https://hanzi.test/api/sync"));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "AUTH_REQUIRED" },
    });
  });

  it("does not consume mutation quota for an authenticated pull", async () => {
    getChatGPTUser.mockResolvedValue(signedInUser);
    repository.getLearningDocument.mockResolvedValue(null);

    const response = await GET(new Request("https://hanzi.test/api/sync"));

    expect(response.status).toBe(200);
    expect(consumeMutationRateLimit).not.toHaveBeenCalled();
  });

  it("requires server-side identity before parsing a push body", async () => {
    const response = await POST(new Request("https://hanzi.test/api/sync", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://hanzi.test",
      },
      body: "{not valid JSON",
    }));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "AUTH_REQUIRED" },
    });
  });

  it("blocks cross-origin mutation before reading identity", async () => {
    const response = await POST(new Request("https://hanzi.test/api/sync", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://attacker.test",
      },
      body: JSON.stringify(await validOperation()),
    }));
    expect(response.status).toBe(403);
    expect(getChatGPTUser).not.toHaveBeenCalled();
  });

  it("rejects a limited authenticated push before reading an invalid body", async () => {
    getChatGPTUser.mockResolvedValue(signedInUser);
    consumeMutationRateLimit.mockResolvedValue({
      allowed: false,
      limit: 120,
      remaining: 0,
      resetAfterSeconds: 91,
      retryAfterSeconds: 91,
      windowEndsAt: Date.UTC(2026, 6, 22, 6, 5),
      policyVersion: "2026-07-22.v1",
    });

    const response = await POST(new Request("https://hanzi.test/api/sync", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://hanzi.test",
      },
      body: "{not valid JSON",
    }));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("91");
    expect(response.headers.get("ratelimit-limit")).toBe("120");
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "MUTATION_RATE_LIMITED", retryable: true },
    });
    expect(repository.upsertDevice).not.toHaveBeenCalled();
  });

  it("fails closed when the persistent push limiter is unavailable", async () => {
    getChatGPTUser.mockResolvedValue(signedInUser);
    consumeMutationRateLimit.mockRejectedValue(new MutationRateLimitBackendError());

    const response = await POST(new Request("https://hanzi.test/api/sync", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://hanzi.test",
      },
      body: JSON.stringify(await validOperation()),
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "MUTATION_RATE_LIMIT_BACKEND_UNAVAILABLE",
        retryable: true,
      },
    });
    expect(repository.upsertDevice).not.toHaveBeenCalled();
  });

  it("returns pacing headers after an accepted sync mutation", async () => {
    getChatGPTUser.mockResolvedValue(signedInUser);
    repository.getLearningDocument.mockResolvedValue(null);
    repository.compareAndSwapDocumentAndAppendChange.mockResolvedValue({
      revision: 1,
      cursor: 1,
    });
    const operation = await operationForSignedInUser();

    const response = await POST(new Request("https://hanzi.test/api/sync", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://hanzi.test",
      },
      body: JSON.stringify(operation),
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("ratelimit-limit")).toBe("120");
    expect(response.headers.get("ratelimit-remaining")).toBe("119");
    expect(response.headers.get("ratelimit-reset")).toBe("300");
    expect(response.headers.get("retry-after")).toBeNull();
    expect(consumeMutationRateLimit).toHaveBeenCalledWith(
      {},
      "user_test",
      expect.objectContaining({
        scope: "sync.push.write",
        maxRequests: 120,
        windowSeconds: 300,
      }),
    );
  });

  it("rejects a client-invented content version before any sync write", async () => {
    getChatGPTUser.mockResolvedValue(signedInUser);
    const operation = await operationForSignedInUser((current) => ({
      ...current,
      contentVersion: "client-invented-version",
      document: {
        ...current.document,
        state: {
          ...current.document.state,
          contentVersion: "client-invented-version",
        },
      },
    }));
    const response = await POST(new Request("https://hanzi.test/api/sync", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://hanzi.test",
      },
      body: JSON.stringify(operation),
    }));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "CONTENT_VERSION_UNSUPPORTED" },
    });
    expect(repository.upsertDevice).not.toHaveBeenCalled();
  });

  it("rejects a reset that does not advance the current epoch exactly once", async () => {
    getChatGPTUser.mockResolvedValue(signedInUser);
    const operation = await operationForSignedInUser((current) => ({
      ...current,
      kind: "reset",
    }));
    repository.getLearningDocument.mockResolvedValue({
      revision: 4,
      contentVersion: CONTENT_VERSION,
      updatedAt: Date.now(),
      document: {
        ...operation.document,
        reset: {
          ...operation.document.reset,
          epoch: 4,
        },
      },
    });
    const response = await POST(new Request("https://hanzi.test/api/sync", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://hanzi.test",
      },
      body: JSON.stringify(operation),
    }));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "RESET_EPOCH_CONFLICT" },
    });
    expect(repository.failIdempotency).toHaveBeenCalledWith(
      "claim_test",
      "lease_test",
    );
    expect(repository.compareAndSwapDocumentAndAppendChange).not.toHaveBeenCalled();
  });
});
