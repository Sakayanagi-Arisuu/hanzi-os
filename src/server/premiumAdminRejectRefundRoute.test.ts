import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authorizeAdmin: vi.fn(), rejectRefundWithAudit: vi.fn() }));
vi.mock("./adminHttp", () => ({ authorizeAdmin: mocks.authorizeAdmin }));
vi.mock("./premiumAccess", () => ({ sandboxCommerceEnabled: () => true }));
vi.mock("./hanziPremiumRepository", () => ({
  HanziPremiumRepository: function HanziPremiumRepository() { return { rejectRefundWithAudit: mocks.rejectRefundWithAudit }; },
}));
import { POST } from "../../app/admin/premium/reject-refund/route";

const request = (orderId = "hanzi:order-1", reason = "Không đủ điều kiện hoàn điểm", origin = "https://hanzi.test") =>
  new Request("https://hanzi.test/admin/premium/reject-refund", {
    method: "POST", headers: { origin, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ orderId, reason }),
  });

beforeEach(() => {
  mocks.authorizeAdmin.mockReset();
  mocks.authorizeAdmin.mockResolvedValue({ ok: true, context: { database: {}, account: { userId: "admin" }, sessionId: "recent-session" } });
  mocks.rejectRefundWithAudit.mockReset();
  mocks.rejectRefundWithAudit.mockResolvedValue({ status: "paid" });
});

describe("Hanzi refund rejection boundary", () => {
  it("requires commerce step-up and records the actor and reason", async () => {
    const response = await POST(request());
    expect(response.status).toBe(303);
    expect(mocks.authorizeAdmin).toHaveBeenCalledWith("commerce:manage", { stepUp: true });
    expect(mocks.rejectRefundWithAudit).toHaveBeenCalledWith("order-1", "admin", "recent-session", "Không đủ điều kiện hoàn điểm", expect.any(String));
  });
  it("rejects another origin, sandbox order and short reason before authorization", async () => {
    await POST(request("hanzi:order-1", "Lý do hợp lệ đủ dài", "https://other.test"));
    await POST(request("sandbox-1"));
    await POST(request("hanzi:order-1", "ngắn"));
    expect(mocks.authorizeAdmin).not.toHaveBeenCalled();
    expect(mocks.rejectRefundWithAudit).not.toHaveBeenCalled();
  });
  it("does not decide a refund without fresh admin verification", async () => {
    mocks.authorizeAdmin.mockResolvedValueOnce({ ok: false });
    const response = await POST(request());
    expect(response.headers.get("location")).toContain("C%E1%BA%A7n+x%C3%A1c+minh");
    expect(mocks.rejectRefundWithAudit).not.toHaveBeenCalled();
  });
});
