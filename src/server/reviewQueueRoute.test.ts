import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONTENT_VERSION } from "../data/curriculum";
import {
  REVIEW_QUEUE_PROTOCOL_VERSION,
  REVIEW_SCHEDULER_VERSION,
  type ReviewQueueV1,
} from "../learning/reviewProtocol";

const {
  getChatGPTUser,
  getD1Database,
  resolveUser,
  readReviewQueue,
} = vi.hoisted(() => ({
  getChatGPTUser: vi.fn(),
  getD1Database: vi.fn(),
  resolveUser: vi.fn(),
  readReviewQueue: vi.fn(),
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
vi.mock("./reviewQueueRepository", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("./reviewQueueRepository")
  >();
  return {
    ...actual,
    ReviewQueueRepository: function ReviewQueueRepository() {
      return { read: readReviewQueue };
    },
  };
});

import {
  GET,
  HEAD,
} from "../../app/api/learning/reviews/route";
import { SyncBackendUnavailableError } from "./d1";
import {
  ReviewQueueIntegrityError,
  ReviewQueueResetRaceError,
  ReviewQueueUnavailableError,
} from "./reviewQueueRepository";

const queue = {
  protocolVersion: REVIEW_QUEUE_PROTOCOL_VERSION,
  resetEpoch: 3,
  contentVersion: CONTENT_VERSION,
  schedulerVersion: REVIEW_SCHEDULER_VERSION,
  generatedAt: "2026-07-26T03:00:00.000Z",
  cards: [],
} satisfies ReviewQueueV1;

const request = (method: "GET" | "HEAD" = "GET") => new Request(
  "https://hanzi.test/api/learning/reviews",
  {
    method,
    headers: { "x-request-id": "review-queue-request" },
  },
);

beforeEach(() => {
  getChatGPTUser.mockReset();
  getD1Database.mockReset();
  resolveUser.mockReset();
  readReviewQueue.mockReset();
  getChatGPTUser.mockResolvedValue({
    email: "learner@example.com",
    displayName: "Learner",
    fullName: null,
  });
  getD1Database.mockResolvedValue({ database: "fixture" });
  resolveUser.mockResolvedValue("review-user");
  readReviewQueue.mockResolvedValue(queue);
});

const expectPrivateResponse = (
  response: Response,
  status: number,
) => {
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("pragma")).toBe("no-cache");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("x-request-id")).toBe("review-queue-request");
};

describe("GET and HEAD /api/learning/reviews", () => {
  it("requires authentication before D1 or tenant resolution", async () => {
    getChatGPTUser.mockResolvedValue(null);

    const response = await GET(request());

    expectPrivateResponse(response, 401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "AUTH_REQUIRED",
        message: "Sign in before reading the server review queue.",
        requestId: "review-queue-request",
        retryable: false,
      },
    });
    expect(getD1Database).not.toHaveBeenCalled();
    expect(resolveUser).not.toHaveBeenCalled();
    expect(readReviewQueue).not.toHaveBeenCalled();
  });

  it("returns the tenant queue with no-store and correlation headers", async () => {
    const database = { database: "fixture" };
    getD1Database.mockResolvedValue(database);

    const response = await GET(request());

    expectPrivateResponse(response, 200);
    await expect(response.json()).resolves.toEqual(queue);
    expect(resolveUser).toHaveBeenCalledWith({
      email: "learner@example.com",
      displayName: "Learner",
      fullName: null,
    });
    expect(readReviewQueue).toHaveBeenCalledWith("review-user");
  });

  it("serves HEAD through the same authority checks without a body", async () => {
    const response = await HEAD(request("HEAD"));

    expectPrivateResponse(response, 200);
    expect(await response.text()).toBe("");
    expect(resolveUser).toHaveBeenCalledOnce();
    expect(readReviewQueue).toHaveBeenCalledWith("review-user");
  });

  it("maps an unavailable released queue to a permanent conflict", async () => {
    readReviewQueue.mockRejectedValue(new ReviewQueueUnavailableError());

    const response = await GET(request());

    expectPrivateResponse(response, 409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "REVIEW_QUEUE_UNAVAILABLE",
        retryable: false,
      },
    });
  });

  it("maps a reset race to a retryable conflict", async () => {
    readReviewQueue.mockRejectedValue(new ReviewQueueResetRaceError());

    const response = await GET(request());

    expectPrivateResponse(response, 409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "REVIEW_QUEUE_RESET_RACE",
        retryable: true,
      },
    });
  });

  it("sanitizes integrity failures without leaking repository details", async () => {
    readReviewQueue.mockRejectedValue(
      new ReviewQueueIntegrityError(
        "learner@example.com secret-card-payload",
      ),
    );

    const response = await GET(request());
    const bodyText = await response.text();

    expectPrivateResponse(response, 500);
    expect(JSON.parse(bodyText)).toEqual({
      error: {
        code: "REVIEW_QUEUE_INTEGRITY_ERROR",
        message: "Stored review state failed integrity validation.",
        requestId: "review-queue-request",
        retryable: true,
      },
    });
    expect(bodyText).not.toMatch(/learner@example|secret-card-payload/u);
  });

  it("maps an unavailable D1 binding to a retryable service failure", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getD1Database.mockRejectedValue(
      new SyncBackendUnavailableError(
        "Cloud sync is not configured for this deployment.",
      ),
    );

    const response = await GET(request());

    expectPrivateResponse(response, 503);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "SYNC_BACKEND_UNAVAILABLE",
        message: "Cloud sync is not configured for this deployment.",
        requestId: "review-queue-request",
        retryable: true,
      },
    });
    expect(resolveUser).not.toHaveBeenCalled();
    expect(readReviewQueue).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringContaining(
      '"event":"review_queue_read_failed"',
    ));
  });
});
