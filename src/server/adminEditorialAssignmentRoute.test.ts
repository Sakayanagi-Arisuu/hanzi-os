import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizeAdmin: vi.fn(),
  setAssignment: vi.fn(),
}));

vi.mock("./adminHttp", () => ({ authorizeAdmin: mocks.authorizeAdmin }));
vi.mock("./contentStudioRepository", () => ({
  STUDIO_ASSIGNMENT_PRIORITIES: ["low", "normal", "high", "urgent"],
  ContentStudioRepository: function ContentStudioRepository() {
    return { setAssignment: mocks.setAssignment };
  },
}));

import { POST } from "../../app/admin/editorial-assignments/route";

const request = (origin = "https://hanzi.test") => new Request(
  "https://hanzi.test/admin/editorial-assignments",
  {
    method: "POST",
    headers: { origin, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      revisionId: "revision-1",
      expectedAssignmentRowVersion: "0",
      ownerUserId: "editor",
      reviewerUserId: "admin",
      priority: "high",
      dueAt: "2026-09-01T09:00",
      note: "Rà lại liên kết bài học.",
      idempotencyKey: "assignment:route-1",
    }),
  },
);

beforeEach(() => {
  mocks.authorizeAdmin.mockReset();
  mocks.authorizeAdmin.mockResolvedValue({
    ok: true,
    context: { database: {}, account: { userId: "admin" }, sessionId: "admin-session" },
  });
  mocks.setAssignment.mockReset();
  mocks.setAssignment.mockResolvedValue({ revisionId: "revision-1" });
});

describe("admin editorial assignment route", () => {
  it("keeps coordination behind approval permission and maps the non-tech form", async () => {
    const response = await POST(request());
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("updated=");
    expect(mocks.authorizeAdmin).toHaveBeenCalledWith("content:approve");
    expect(mocks.setAssignment).toHaveBeenCalledWith(expect.objectContaining({
      revisionId: "revision-1",
      ownerUserId: "editor",
      reviewerUserId: "admin",
      priority: "high",
      expectedRowVersion: 0,
    }));
  });

  it("blocks cross-origin assignment before authorization", async () => {
    const response = await POST(request("https://evil.test"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("error=");
    expect(mocks.authorizeAdmin).not.toHaveBeenCalled();
    expect(mocks.setAssignment).not.toHaveBeenCalled();
  });
});
