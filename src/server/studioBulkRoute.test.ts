import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizeStudio: vi.fn(),
  validateRevision: vi.fn(),
  transition: vi.fn(),
}));

vi.mock("./contentStudioHttp", () => ({ authorizeStudio: mocks.authorizeStudio }));
vi.mock("./contentStudioRepository", () => ({
  ContentStudioRepository: function ContentStudioRepository() {
    return { validateRevision: mocks.validateRevision, transition: mocks.transition };
  },
}));

import { POST } from "../../app/studio/bulk/route";

const request = (action: "validate" | "submit", origin = "https://hanzi.test") => new Request(
  "https://hanzi.test/studio/bulk",
  {
    method: "POST",
    headers: { origin, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams([
      ["action", action],
      ["batchKey", "bulk-route-fixture"],
      ["selection", "revision-1|1"],
      ["selection", "revision-2|2"],
    ]),
  },
);

beforeEach(() => {
  mocks.authorizeStudio.mockReset();
  mocks.authorizeStudio.mockResolvedValue({
    ok: true,
    context: { database: {}, account: { userId: "editor" }, sessionId: "editor-session" },
  });
  mocks.validateRevision.mockReset();
  mocks.validateRevision.mockResolvedValue({ validation: { valid: true } });
  mocks.transition.mockReset();
  mocks.transition.mockResolvedValue({ workflowState: "submitted" });
});

describe("Studio bulk route", () => {
  it("validates a bounded selection with independent idempotency keys", async () => {
    const response = await POST(request("validate"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("notice=");
    expect(mocks.authorizeStudio).toHaveBeenCalledWith("content:validation:run");
    expect(mocks.validateRevision).toHaveBeenCalledTimes(2);
    expect(mocks.validateRevision).toHaveBeenNthCalledWith(2, expect.objectContaining({
      revisionId: "revision-2",
      expectedRowVersion: 2,
      idempotencyKey: "bulk:bulk-route-fixture:1",
    }));
  });

  it("submits only through the submit permission and blocks cross-origin requests", async () => {
    const response = await POST(request("submit"));
    expect(response.status).toBe(303);
    expect(mocks.authorizeStudio).toHaveBeenCalledWith("content:submit");
    expect(mocks.transition).toHaveBeenCalledTimes(2);
    expect(mocks.transition).toHaveBeenCalledWith(expect.objectContaining({ toState: "submitted" }));

    mocks.authorizeStudio.mockClear();
    const blocked = await POST(request("submit", "https://evil.test"));
    expect(blocked.headers.get("location")).toContain("error=");
    expect(mocks.authorizeStudio).not.toHaveBeenCalled();
  });
});
