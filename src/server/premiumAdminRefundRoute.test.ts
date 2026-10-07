import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizeAdmin: vi.fn(),
  refundWithAudit: vi.fn(),
  refundHanziWithAudit: vi.fn(),
}));

vi.mock("./adminHttp", () => ({ authorizeAdmin: mocks.authorizeAdmin }));
vi.mock("./premiumAccess", () => ({ sandboxCommerceEnabled: () => true }));
vi.mock("./commerceRepository", () => ({
  CommerceRepository: function CommerceRepository() {
    return { refundWithAudit: mocks.refundWithAudit };
  },
}));
vi.mock("./hanziPremiumRepository", () => ({
  HanziPremiumRepository: function HanziPremiumRepository() {
    return { refundWithAudit: mocks.refundHanziWithAudit };
  },
}));

import { POST } from "../../app/admin/premium/refund/route";

const context = { database: {}, account: { userId: "admin" }, sessionId: "recent-session" };
const request = (origin = "https://hanzi.test", orderId = "order-1") => new Request(
  "https://hanzi.test/admin/premium/refund",
  {
    method: "POST",
    headers: { origin, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ orderId }),
  },
);

beforeEach(() => {
  mocks.authorizeAdmin.mockReset();
  mocks.authorizeAdmin.mockResolvedValue({ ok: true, context });
  mocks.refundWithAudit.mockReset();
  mocks.refundWithAudit.mockResolvedValue({ status: "refunded" });
  mocks.refundHanziWithAudit.mockReset();
  mocks.refundHanziWithAudit.mockResolvedValue({ status: "refunded" });
});

describe("sandbox premium admin refund boundary", () => {
  it("requires commerce permission and step-up, then refunds with an audit actor", async () => {
    const response = await POST(request());
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("%C4%90%C3%A3+ho%C3%A0n");
    expect(mocks.authorizeAdmin).toHaveBeenCalledWith("commerce:manage", { stepUp: true });
    expect(mocks.refundWithAudit).toHaveBeenCalledWith(
      "order-1", "admin", "recent-session", expect.any(String),
    );
  });

  it("blocks another origin and malformed order before authorization", async () => {
    await POST(request("https://other.test"));
    await POST(request("https://hanzi.test", "x".repeat(81)));
    expect(mocks.authorizeAdmin).not.toHaveBeenCalled();
    expect(mocks.refundWithAudit).not.toHaveBeenCalled();
  });

  it("does not refund when the admin session lacks step-up", async () => {
    mocks.authorizeAdmin.mockResolvedValueOnce({ ok: false, response: new Response(null, { status: 428 }) });
    const response = await POST(request());
    expect(response.headers.get("location")).toContain("C%E1%BA%A7n+x%C3%A1c+minh");
    expect(mocks.refundWithAudit).not.toHaveBeenCalled();
  });
  it("refunds a Hanzi order to the wallet path with the same admin boundary", async () => {
    const response = await POST(request("https://hanzi.test", "hanzi:order-2"));
    expect(response.status).toBe(303);
    expect(mocks.refundHanziWithAudit).toHaveBeenCalledWith("order-2", "admin", "recent-session", expect.any(String));
    expect(mocks.refundWithAudit).not.toHaveBeenCalled();
  });
});
