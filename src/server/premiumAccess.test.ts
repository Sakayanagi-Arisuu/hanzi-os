import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getD1Database: vi.fn(),
  resolveCurrentAccount: vi.fn(),
  access: vi.fn(),
  orders: vi.fn(),
  walletOrders: vi.fn(),
  tier: vi.fn(),
}));

vi.mock("./d1", () => ({ getD1Database: mocks.getD1Database }));
vi.mock("./authHttp", () => ({ resolveCurrentAccount: mocks.resolveCurrentAccount }));
vi.mock("./commerceRepository", () => ({
  CommerceRepository: function CommerceRepository() { return { access: mocks.access, orders: mocks.orders }; },
}));
vi.mock("./hanziPremiumRepository", () => ({
  HanziPremiumRepository: function HanziPremiumRepository() { return { orders: mocks.walletOrders }; },
  asCommerceOrder: (order: unknown) => order,
}));
vi.mock("./lessonAccessRepository", () => ({
  LessonAccessRepository: function LessonAccessRepository() { return { tierFor: mocks.tier }; },
}));

import { requestPremiumAccess, requirePremiumLesson, requirePremiumLevel, sandboxCommerceEnabled } from "./premiumAccess";

describe("Premium access environment boundary", () => {
  it("never accepts sandbox orders as public entitlement", async () => {
    mocks.getD1Database.mockReset();
    mocks.resolveCurrentAccount.mockReset();
    mocks.access.mockReset();
    expect(sandboxCommerceEnabled("https://hanzi.example/lesson/hsk4-test", "production")).toBe(false);
    expect(sandboxCommerceEnabled("http://localhost:3000/lesson/hsk4-test", "production")).toBe(false);
    expect(sandboxCommerceEnabled("http://localhost:3000/lesson/hsk4-test", "development")).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    try {
      expect(await requestPremiumAccess(new Request("http://localhost:3000/lesson/hsk4-test"))).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
    expect(mocks.getD1Database).not.toHaveBeenCalled();
    expect(mocks.resolveCurrentAccount).not.toHaveBeenCalled();
    expect(mocks.access).not.toHaveBeenCalled();
  });

  it("keeps HSK0–HSK3 free without consulting commerce", async () => {
    mocks.getD1Database.mockReset();
    for (const level of ["hsk0", "hsk1", "hsk2", "hsk3"]) {
      expect(await requirePremiumLevel(new Request("https://hanzi.example/lesson/example"), level)).toBeNull();
    }
    expect(mocks.getD1Database).not.toHaveBeenCalled();
  });

  it("uses the server lesson override for HSK4 while keeping the default paid", async () => {
    const request = new Request("http://localhost:3000/lesson/hsk4-personal-community-analysis-concept-actor-map");
    vi.stubEnv("NODE_ENV", "development");
    mocks.getD1Database.mockResolvedValue({});
    mocks.resolveCurrentAccount.mockResolvedValue(null);
    mocks.tier.mockResolvedValueOnce("premium").mockResolvedValueOnce("free");
    try {
      const paid = await requirePremiumLesson(request, "hsk4-personal-community-analysis-concept-actor-map");
      expect(paid?.status).toBe(403);
      expect(await requirePremiumLesson(request, "hsk4-personal-community-analysis-concept-actor-map")).toBeNull();
      expect(await requirePremiumLesson(request, "hsk3-personal-lesson-01")).toBeNull();
    } finally { vi.unstubAllEnvs(); }
  });
  it("accepts a paid Hanzi order for the purchasing account on localhost", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.getD1Database.mockResolvedValue({});
    mocks.resolveCurrentAccount.mockResolvedValue({ userId: "learner" });
    mocks.orders.mockResolvedValue([]);
    mocks.walletOrders.mockResolvedValue([{ id: "wallet-order", planId: "hsk4-month", status: "paid", paidAt: Date.now() - 1000 }]);
    try {
      expect(await requestPremiumAccess(new Request("http://localhost:3000/lesson/hsk4-personal-community-analysis-concept-actor-map"))).toBe(true);
    } finally { vi.unstubAllEnvs(); }
  });
  it("does not apply a local Free override on production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.tier.mockClear();
    try {
      const gate = await requirePremiumLesson(new Request("https://hanzi.example/lesson/hsk4-personal-community-analysis-concept-actor-map"),
        "hsk4-personal-community-analysis-concept-actor-map");
      expect(gate?.status).toBe(403);
      expect(mocks.tier).not.toHaveBeenCalled();
    } finally { vi.unstubAllEnvs(); }
  });
});
