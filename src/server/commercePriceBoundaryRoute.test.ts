import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prices: vi.fn(), create: vi.fn(), get: vi.fn(), settle: vi.fn(), requestRefund: vi.fn(),
}));
vi.mock("./authHttp", () => ({
  AUTH_JSON_HEADERS: { "Cache-Control": "private, no-store" },
  resolveCurrentAccount: async () => ({ userId: "learner" }),
  sameOriginMutation: () => true,
}));
vi.mock("./d1", () => ({ getD1Database: async () => ({}) }));
vi.mock("./premiumAccess", () => ({ sandboxCommerceEnabled: () => true }));
vi.mock("./mutationRateLimit", () => ({ consumeMutationRateLimit: async () => ({ allowed: true }) }));
vi.mock("./commerceRepository", () => ({
  CommerceRepository: function CommerceRepository() { return { create: mocks.create, get: mocks.get, settle: mocks.settle }; },
  CommerceConflict: class CommerceConflict extends Error {},
}));
vi.mock("./hanziPremiumRepository", () => ({
  HanziPremiumRepository: function HanziPremiumRepository() { return { prices: mocks.prices, requestRefund: mocks.requestRefund }; },
  HanziPremiumConflict: class HanziPremiumConflict extends Error {},
  asCommerceOrder: (order: unknown) => order,
}));

import { POST } from "../../app/api/commerce/route";
const request = (body: object) => new Request("http://localhost:3000/api/commerce", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prices.mockResolvedValue([{ planId: "hsk4-month", amount: 80 }]);
  mocks.get.mockResolvedValue({ id: "old-year-order", planId: "hsk4-year", status: "pending" });
});

describe("sandbox checkout after Hanzi pricing", () => {
  it("blocks an unpriced year from the old free confirmation path", async () => {
    const response = await POST(request({ action: "create", planId: "hsk4-year", key: "request-0000000001" }));
    expect(response.status).toBe(409);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("blocks a pending free order created before pricing", async () => {
    const response = await POST(request({ action: "pay", orderId: "old-year-order" }));
    expect(response.status).toBe(409);
    expect(mocks.settle).not.toHaveBeenCalled();
  });
  it("returns a conflict for a wallet refund request that is no longer eligible", async () => {
    const { HanziPremiumConflict } = await import("./hanziPremiumRepository");
    mocks.requestRefund.mockRejectedValue(new HanziPremiumConflict("Giao dịch không còn hợp lệ để yêu cầu hoàn."));
    const response = await POST(request({ action: "request-refund", orderId: "hanzi:order-1", reason: "Không còn nhu cầu học" }));
    expect(response.status).toBe(409);
    expect(mocks.requestRefund).toHaveBeenCalledOnce();
  });
});
