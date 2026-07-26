import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONTENT_VERSION, RELEASED_LESSONS } from "../data/curriculum";
import {
  REVIEW_PROTOCOL_VERSION,
  REVIEW_SCHEDULER_VERSION,
  reviewWordVersion,
  type GradeReviewCommandV1,
  type GradeReviewReceiptV1,
} from "../learning/reviewProtocol";

const {
  consumeMutationRateLimit,
  getChatGPTUser,
  getD1Database,
  gradeReview,
  resolveUser,
} = vi.hoisted(() => ({
  consumeMutationRateLimit: vi.fn(),
  getChatGPTUser: vi.fn(),
  getD1Database: vi.fn(),
  gradeReview: vi.fn(),
  resolveUser: vi.fn(),
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
vi.mock("./reviewRepository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./reviewRepository")>();
  return {
    ...actual,
    ReviewRepository: function ReviewRepository() {
      return { grade: gradeReview };
    },
  };
});

import { POST } from "../../app/api/learning/reviews/grade/route";
import { SyncBackendUnavailableError } from "./d1";
import { LearningResetEpochConflictError } from "./learningResetEpoch";
import { MutationRateLimitBackendError } from "./mutationRateLimit";
import {
  ReviewCardRevisionConflictError,
  ReviewGradeDeviceSequenceConflictError,
  ReviewGradeIdempotencyConflictError,
  ReviewGradeIntegrityError,
  ReviewGradeUnavailableError,
} from "./reviewRepository";

const identity = {
  displayName: "Learner",
  email: "learner@example.com",
  fullName: null,
};
const database = { database: "review-route-fixture" };
const serverUserId = "review-user-server-resolved";
const wordId = RELEASED_LESSONS[0]!.wordIds[0]!;

const command = (): GradeReviewCommandV1 => ({
  protocolVersion: REVIEW_PROTOCOL_VERSION,
  idempotencyKey: "review-grade:route:1",
  installationId: "installation-route",
  deviceId: "device-route",
  deviceSequence: 7,
  resetEpoch: 2,
  contentVersion: CONTENT_VERSION,
  schedulerVersion: REVIEW_SCHEDULER_VERSION,
  cardId: "review-card-route",
  wordId,
  wordVersion: reviewWordVersion(wordId),
  expectedCardRevision: 3,
  rating: 3,
  durationMs: 4_500,
});

const receipt = (duplicate = false): GradeReviewReceiptV1 => ({
  protocolVersion: REVIEW_PROTOCOL_VERSION,
  idempotencyKey: command().idempotencyKey,
  duplicate,
  reviewLogId: "review-log-route",
  cardId: command().cardId,
  wordId: command().wordId,
  wordVersion: command().wordVersion,
  previousCardRevision: 3,
  cardRevision: 4,
  resetEpoch: command().resetEpoch,
  contentVersion: CONTENT_VERSION,
  schedulerVersion: REVIEW_SCHEDULER_VERSION,
  rating: command().rating,
  scheduledAt: "2026-07-26T02:00:00.000Z",
  reviewedAt: "2026-07-26T03:00:00.000Z",
  nextDueAt: "2026-07-29T03:00:00.000Z",
  verification: "server-scheduled-self-rating",
  masteryEligible: false,
});

type RequestOptions = {
  contentType?: string | null;
  declaredLength?: number;
  origin?: string | null;
};

const request = (
  body: unknown,
  {
    contentType = "application/json",
    declaredLength,
    origin = "https://hanzi.test",
  }: RequestOptions = {},
) => {
  const headers = new Headers({ "x-request-id": "review-grade-request" });
  if (contentType !== null) headers.set("content-type", contentType);
  if (origin !== null) headers.set("origin", origin);
  if (declaredLength !== undefined) {
    headers.set("content-length", String(declaredLength));
  }
  return new Request("https://hanzi.test/api/learning/reviews/grade", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
};

const allowedRateLimit = {
  allowed: true,
  limit: 120,
  remaining: 119,
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
  expect(response.headers.get("x-request-id")).toBe("review-grade-request");
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
  gradeReview.mockReset();
  gradeReview.mockResolvedValue(receipt());
});

describe("POST /api/learning/reviews/grade", () => {
  it("blocks cross-origin mutation before authentication or backend access", async () => {
    const response = await POST(request(command(), {
      origin: "https://attacker.test",
    }));

    expectPrivateResponse(response, 403);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "CROSS_ORIGIN_BLOCKED",
        retryable: false,
      },
    });
    expect(getChatGPTUser).not.toHaveBeenCalled();
    expect(getD1Database).not.toHaveBeenCalled();
    expect(resolveUser).not.toHaveBeenCalled();
    expect(consumeMutationRateLimit).not.toHaveBeenCalled();
    expect(gradeReview).not.toHaveBeenCalled();
  });

  it("requires authentication before D1, tenant resolution, or body parsing", async () => {
    getChatGPTUser.mockResolvedValue(null);

    const response = await POST(request("{not-json"));

    expectPrivateResponse(response, 401);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "AUTH_REQUIRED",
        retryable: false,
      },
    });
    expect(getD1Database).not.toHaveBeenCalled();
    expect(resolveUser).not.toHaveBeenCalled();
    expect(consumeMutationRateLimit).not.toHaveBeenCalled();
    expect(gradeReview).not.toHaveBeenCalled();
  });

  it("rejects non-JSON media after authenticated durable pacing", async () => {
    const response = await POST(request(command(), {
      contentType: "text/plain",
    }));

    expectPrivateResponse(response, 415);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "JSON_REQUIRED", retryable: false },
    });
    expect(consumeMutationRateLimit).toHaveBeenCalledOnce();
    expect(gradeReview).not.toHaveBeenCalled();
  });

  it("rejects an oversized declared request without reading or grading it", async () => {
    const response = await POST(request(command(), {
      declaredLength: 8_001,
    }));

    expectPrivateResponse(response, 413);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "REVIEW_GRADE_TOO_LARGE", retryable: false },
    });
    expect(gradeReview).not.toHaveBeenCalled();
  });

  it("rejects an oversized chunked body without Content-Length before grading", async () => {
    const encodedBody = new TextEncoder().encode(JSON.stringify({
      payload: "x".repeat(8_000),
    }));
    const chunks = [
      encodedBody.slice(0, 4_000),
      encodedBody.slice(4_000),
    ];
    const streamedRequest = new Request(
      "https://hanzi.test/api/learning/reviews/grade",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://hanzi.test",
          "x-request-id": "review-grade-request",
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

    expect(encodedBody.byteLength).toBeGreaterThan(8_000);
    expect(streamedRequest.headers.has("content-length")).toBe(false);

    const response = await POST(streamedRequest);

    expectPrivateResponse(response, 413);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "REVIEW_GRADE_TOO_LARGE", retryable: false },
    });
    expect(gradeReview).not.toHaveBeenCalled();
  });

  it("rejects an oversized UTF-8 body when no length is declared", async () => {
    const oversized = JSON.stringify({ payload: "汉".repeat(3_000) });
    const response = await POST(request(oversized));

    expectPrivateResponse(response, 413);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "REVIEW_GRADE_TOO_LARGE", retryable: false },
    });
    expect(gradeReview).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON without calling the review repository", async () => {
    const response = await POST(request("{not-json"));

    expectPrivateResponse(response, 400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_JSON", retryable: false },
    });
    expect(gradeReview).not.toHaveBeenCalled();
  });

  it("rejects unknown or client-authored contract fields", async () => {
    const response = await POST(request({
      ...command(),
      userId: "attacker-selected-user",
    }));

    expectPrivateResponse(response, 422);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_REVIEW_GRADE", retryable: false },
    });
    expect(gradeReview).not.toHaveBeenCalled();
  });

  it("requires the exact word binding before calling the repository", async () => {
    const missingWordVersion = {
      ...command(),
    } as Partial<GradeReviewCommandV1>;
    delete missingWordVersion.wordVersion;

    const response = await POST(request(missingWordVersion));

    expectPrivateResponse(response, 422);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_REVIEW_GRADE", retryable: false },
    });
    expect(gradeReview).not.toHaveBeenCalled();
  });

  it("grades for only the server-resolved user and returns 201 with pacing headers", async () => {
    const response = await POST(request(command()));

    expectPrivateResponse(response, 201);
    expect(response.headers.get("ratelimit-limit")).toBe("120");
    expect(response.headers.get("ratelimit-remaining")).toBe("119");
    expect(response.headers.get("ratelimit-reset")).toBe("600");
    expect(response.headers.get("x-rate-limit-policy-version")).toBe(
      "2026-07-26.v1",
    );
    expect(response.headers.get("retry-after")).toBeNull();
    await expect(response.json()).resolves.toEqual(receipt());
    expect(resolveUser).toHaveBeenCalledWith(identity);
    expect(consumeMutationRateLimit).toHaveBeenCalledWith(
      database,
      serverUserId,
      expect.objectContaining({
        scope: "learning.reviews.grade",
        policyVersion: "2026-07-26.v1",
      }),
    );
    expect(gradeReview).toHaveBeenCalledWith(serverUserId, command());
  });

  it("returns an idempotent duplicate as 200 with the same pacing headers", async () => {
    gradeReview.mockResolvedValue(receipt(true));

    const response = await POST(request(command()));

    expectPrivateResponse(response, 200);
    expect(response.headers.get("ratelimit-limit")).toBe("120");
    expect(response.headers.get("ratelimit-remaining")).toBe("119");
    expect(response.headers.get("ratelimit-reset")).toBe("600");
    await expect(response.json()).resolves.toEqual(receipt(true));
    expect(gradeReview).toHaveBeenCalledWith(serverUserId, command());
  });

  it("returns a durable 429 decision with retry headers before grading", async () => {
    consumeMutationRateLimit.mockResolvedValue({
      allowed: false,
      limit: 120,
      remaining: 0,
      resetAfterSeconds: 41,
      retryAfterSeconds: 41,
      windowEndsAt: Date.UTC(2026, 6, 26, 3, 1),
      policyVersion: "2026-07-26.v1",
    });

    const response = await POST(request(command()));

    expectPrivateResponse(response, 429);
    expect(response.headers.get("retry-after")).toBe("41");
    expect(response.headers.get("ratelimit-limit")).toBe("120");
    expect(response.headers.get("ratelimit-remaining")).toBe("0");
    expect(response.headers.get("ratelimit-reset")).toBe("41");
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "MUTATION_RATE_LIMITED", retryable: true },
    });
    expect(gradeReview).not.toHaveBeenCalled();
  });

  it("fails closed when the persistent rate-limit backend is unavailable", async () => {
    consumeMutationRateLimit.mockRejectedValue(
      new MutationRateLimitBackendError(),
    );

    const response = await POST(request(command()));

    expectPrivateResponse(response, 503);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "MUTATION_RATE_LIMIT_BACKEND_UNAVAILABLE",
        message: "Unable to verify the persistent review pacing limit.",
        requestId: "review-grade-request",
        retryable: true,
      },
    });
    expect(gradeReview).not.toHaveBeenCalled();
  });

  it("maps a stale reset epoch to a permanent 409", async () => {
    gradeReview.mockRejectedValue(new LearningResetEpochConflictError());

    const response = await POST(request(command()));

    expectPrivateResponse(response, 409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "LEARNING_RESET_EPOCH_CONFLICT",
        retryable: false,
      },
    });
  });

  it.each([
    {
      label: "idempotency mismatch",
      error: new ReviewGradeIdempotencyConflictError(
        "Idempotency key belongs to another request.",
      ),
      code: "REVIEW_GRADE_IDEMPOTENCY_CONFLICT",
    },
    {
      label: "device-sequence reuse",
      error: new ReviewGradeDeviceSequenceConflictError(
        "Device sequence belongs to another operation.",
      ),
      code: "REVIEW_GRADE_DEVICE_SEQUENCE_CONFLICT",
    },
    {
      label: "stale card revision",
      error: new ReviewCardRevisionConflictError(
        "Review card revision changed.",
      ),
      code: "REVIEW_CARD_REVISION_CONFLICT",
    },
    {
      label: "unavailable authoritative card",
      error: new ReviewGradeUnavailableError(
        "No released due card is available.",
      ),
      code: "REVIEW_GRADE_UNAVAILABLE",
    },
  ])("maps $label to a permanent 409", async ({ error, code }) => {
    gradeReview.mockRejectedValue(error);

    const response = await POST(request(command()));

    expectPrivateResponse(response, 409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code, message: error.message, retryable: false },
    });
  });

  it("sanitizes repository integrity details in a retryable 500", async () => {
    gradeReview.mockRejectedValue(
      new ReviewGradeIntegrityError(
        "learner@example.com secret-review-payload",
      ),
    );

    const response = await POST(request(command()));
    const bodyText = await response.text();

    expectPrivateResponse(response, 500);
    expect(JSON.parse(bodyText)).toEqual({
      error: {
        code: "REVIEW_GRADE_INTEGRITY_ERROR",
        message: "Stored review state failed integrity validation.",
        requestId: "review-grade-request",
        retryable: true,
      },
    });
    expect(bodyText).not.toMatch(/learner@example|secret-review-payload/u);
  });

  it("maps an unavailable D1 binding to a retryable 503 before tenant use", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getD1Database.mockRejectedValue(
      new SyncBackendUnavailableError(
        "Cloud sync is not configured for this deployment.",
      ),
    );

    const response = await POST(request(command()));

    expectPrivateResponse(response, 503);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "SYNC_BACKEND_UNAVAILABLE",
        message: "Cloud sync is not configured for this deployment.",
        requestId: "review-grade-request",
        retryable: true,
      },
    });
    expect(resolveUser).not.toHaveBeenCalled();
    expect(consumeMutationRateLimit).not.toHaveBeenCalled();
    expect(gradeReview).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"event":"review_grade_failed"'),
    );
  });
});
