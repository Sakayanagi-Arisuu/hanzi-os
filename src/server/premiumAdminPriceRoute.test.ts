import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authorize: vi.fn(), vnd: vi.fn(), hanzi: vi.fn() }));
vi.mock("./adminHttp", () => ({ authorizeAdmin: mocks.authorize }));
vi.mock("./premiumAccess", () => ({ sandboxCommerceEnabled: () => true }));
vi.mock("./premiumVndPriceRepository", () => ({ PremiumVndPriceRepository: function () { return { setPrice: mocks.vnd }; } }));
vi.mock("./hanziPremiumRepository", () => ({ HanziPremiumRepository: function () { return { setPrice: mocks.hanzi }; } }));
import { POST } from "../../app/admin/premium/price/route";
const request = (currency = "vnd", amount = "79000", origin = "http://localhost:3000") => new Request("http://localhost:3000/admin/premium/price", {
  method: "POST", headers: { origin, "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ currency, amount, planId: "hsk4-month" }),
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.authorize.mockResolvedValue({ ok: true, context: { database: {}, account: { userId: "admin" }, sessionId: "recent" } });
});
describe("admin display price boundary", () => {
  it("requires fresh commerce permission and writes only the selected currency", async () => {
    await POST(request());
    expect(mocks.authorize).toHaveBeenCalledWith("commerce:manage", { stepUp: true });
    expect(mocks.vnd).toHaveBeenCalledWith("hsk4-month", 79000, "admin", "recent", expect.any(String));
    expect(mocks.hanzi).not.toHaveBeenCalled();
    await POST(request("hanzi", "1000"));
    expect(mocks.hanzi).toHaveBeenCalledWith("hsk4-month", 1000, "admin", "recent", expect.any(String));
  });
  it("rejects cross-origin, unknown currency and invalid amount without a write", async () => {
    await POST(request("vnd", "79000", "http://other.test"));
    await POST(request("usd"));
    await POST(request("vnd", "1.5"));
    await POST(request("vnd", "100000001"));
    expect(mocks.authorize).not.toHaveBeenCalled();
    expect(mocks.vnd).not.toHaveBeenCalled();
    expect(mocks.hanzi).not.toHaveBeenCalled();
  });
  it("does not write when admin verification fails", async () => {
    mocks.authorize.mockResolvedValueOnce({ ok: false });
    await POST(request());
    expect(mocks.vnd).not.toHaveBeenCalled();
  });
});
