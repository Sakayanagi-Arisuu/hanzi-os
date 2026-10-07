import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizeAdmin: vi.fn(),
  answerWithAudit: vi.fn(),
}));

vi.mock("./adminHttp", () => ({ authorizeAdmin: mocks.authorizeAdmin }));
vi.mock("./premiumSupportRepository", () => ({
  PremiumSupportRepository: function PremiumSupportRepository() {
    return { answerWithAudit: mocks.answerWithAudit };
  },
}));

import { POST } from "../../app/admin/premium/support/route";

const context = { database: {}, account: { userId: "admin" }, sessionId: "recent-session" };
const request = (origin = "https://hanzi.test", response = "Đã kiểm tra quyền học của bạn.") => new Request(
  "https://hanzi.test/admin/premium/support",
  {
    method: "POST",
    headers: { origin, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ticketId: "ticket-1", response }),
  },
);

beforeEach(() => {
  mocks.authorizeAdmin.mockReset();
  mocks.authorizeAdmin.mockResolvedValue({ ok: true, context });
  mocks.answerWithAudit.mockReset();
  mocks.answerWithAudit.mockResolvedValue({ status: "answered" });
});

describe("premium admin support boundary", () => {
  it("requires commerce permission and step-up, then answers with the audit actor", async () => {
    const result = await POST(request());
    expect(result.status).toBe(303);
    expect(result.headers.get("location")).toContain("%C4%90%C3%A3+g%E1%BB%ADi");
    expect(mocks.authorizeAdmin).toHaveBeenCalledWith("commerce:manage", { stepUp: true });
    expect(mocks.answerWithAudit).toHaveBeenCalledWith(
      "ticket-1", "admin", "recent-session", "Đã kiểm tra quyền học của bạn.", expect.any(String),
    );
  });

  it("rejects cross-origin and short replies before authorization", async () => {
    await POST(request("https://other.test"));
    await POST(request("https://hanzi.test", "Quá ngắn"));
    expect(mocks.authorizeAdmin).not.toHaveBeenCalled();
    expect(mocks.answerWithAudit).not.toHaveBeenCalled();
  });

  it("does not answer without a recent admin session", async () => {
    mocks.authorizeAdmin.mockResolvedValueOnce({ ok: false, response: new Response(null, { status: 428 }) });
    await POST(request());
    expect(mocks.answerWithAudit).not.toHaveBeenCalled();
  });
});
