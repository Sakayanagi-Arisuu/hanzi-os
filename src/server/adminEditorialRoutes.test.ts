import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class ContentReleaseFenceError extends Error {
    constructor(readonly failureCode: string, message: string) { super(message); }
  }
  return {
    authorizeAdmin: vi.fn(),
    replayDeadRelease: vi.fn(),
    processContentReleaseBatch: vi.fn(),
    ContentReleaseFenceError,
  };
});

vi.mock("./adminHttp", () => ({ authorizeAdmin: mocks.authorizeAdmin }));
vi.mock("./contentReleaseWorker", () => ({
  ContentReleaseFenceError: mocks.ContentReleaseFenceError,
  ContentReleaseWorkerRepository: function ContentReleaseWorkerRepository() {
    return { replayDeadRelease: mocks.replayDeadRelease };
  },
  processContentReleaseBatch: mocks.processContentReleaseBatch,
}));

import { POST } from "../../app/admin/releases/route";

const context = {
  database: {},
  account: { userId: "admin" },
  sessionId: "admin-session",
};

const request = (origin = "https://hanzi.test") => new Request(
  "https://hanzi.test/admin/releases",
  {
    method: "POST",
    headers: { origin, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ eventId: "dead-release-event" }),
  },
);

beforeEach(() => {
  mocks.authorizeAdmin.mockReset();
  mocks.authorizeAdmin.mockResolvedValue({ ok: true, context });
  mocks.replayDeadRelease.mockReset();
  mocks.replayDeadRelease.mockResolvedValue("replayed-event");
  mocks.processContentReleaseBatch.mockReset();
  mocks.processContentReleaseBatch.mockResolvedValue({ completed: 1 });
});

describe("admin editorial recovery route", () => {
  it("requires step-up publication permission and retries a selected dead event", async () => {
    const response = await POST(request());
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("updated=");
    expect(mocks.authorizeAdmin).toHaveBeenCalledWith("content:publish", { stepUp: true });
    expect(mocks.replayDeadRelease).toHaveBeenCalledWith(expect.objectContaining({
      eventId: "dead-release-event",
      actorUserId: "admin",
      actorSessionId: "admin-session",
    }));
    expect(mocks.processContentReleaseBatch).toHaveBeenCalledWith(context.database);
  });

  it("blocks cross-origin recovery before authorization", async () => {
    const response = await POST(request("https://evil.test"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("error=");
    expect(mocks.authorizeAdmin).not.toHaveBeenCalled();
    expect(mocks.replayDeadRelease).not.toHaveBeenCalled();
  });

  it("rejects malformed and oversized recovery forms before authorization", async () => {
    const malformed = new Request("https://hanzi.test/admin/releases", {
      method: "POST",
      headers: { origin: "https://hanzi.test", "content-type": "application/json" },
      body: JSON.stringify({ eventId: "dead-release-event" }),
    });
    expect((await POST(malformed)).headers.get("location")).toContain("error=");

    const oversized = new Request("https://hanzi.test/admin/releases", {
      method: "POST",
      headers: { origin: "https://hanzi.test", "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ eventId: "x".repeat(10_100) }),
    });
    expect((await POST(oversized)).headers.get("location")).toContain("error=");
    expect(mocks.authorizeAdmin).not.toHaveBeenCalled();
    expect(mocks.replayDeadRelease).not.toHaveBeenCalled();
  });
});
