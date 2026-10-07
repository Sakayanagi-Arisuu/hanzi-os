import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ account: vi.fn(), read: vi.fn(), claim: vi.fn(), rate: vi.fn(), enabled: vi.fn() }));
vi.mock("./authHttp", () => ({ AUTH_JSON_HEADERS: {}, resolveCurrentAccount: mocks.account, sameOriginMutation: (request: Request) => request.headers.get("origin") === new URL(request.url).origin }));
vi.mock("./d1", () => ({ getD1Database: async () => ({}) }));
vi.mock("./premiumAccess", () => ({ sandboxCommerceEnabled: mocks.enabled }));
vi.mock("./mutationRateLimit", () => ({ consumeMutationRateLimit: mocks.rate }));
vi.mock("./levelRewardRepository", () => ({ LevelRewardRepository: class { read = mocks.read; claim = mocks.claim; } }));
import { GET, POST } from "../../app/api/wallet/level-rewards/route";
const request = (origin = "http://localhost:3000") => new Request("http://localhost:3000/api/wallet/level-rewards", { method: "POST", headers: { origin }, body: JSON.stringify({ userId: "other", level: 999, amount: 999999 }) });
beforeEach(() => {
  vi.clearAllMocks(); mocks.enabled.mockReturnValue(true); mocks.account.mockResolvedValue({ userId: "owner" });
  mocks.rate.mockResolvedValue({ allowed: true }); mocks.read.mockResolvedValue({ level: 2 }); mocks.claim.mockResolvedValue({ balance: 100 });
});
it("reads without crediting coins", async () => {
  expect((await GET(request())).status).toBe(200);
  expect(mocks.read).toHaveBeenCalledWith("owner"); expect(mocks.claim).not.toHaveBeenCalled();
});
it("ignores client level, amount and owner when claiming", async () => {
  expect((await POST(request())).status).toBe(200);
  expect(mocks.claim).toHaveBeenCalledExactlyOnceWith("owner");
});
it("rejects guests and cross-origin writes", async () => {
  expect((await POST(request("https://other.test"))).status).toBe(403);
  mocks.account.mockResolvedValue(null); expect((await POST(request())).status).toBe(401);
  expect(mocks.claim).not.toHaveBeenCalled();
});
it("retains environment and rate limits", async () => {
  mocks.enabled.mockReturnValue(false); expect((await POST(request())).status).toBe(403);
  mocks.enabled.mockReturnValue(true); mocks.rate.mockResolvedValue({ allowed: false });
  expect((await POST(request())).status).toBe(429); expect(mocks.claim).not.toHaveBeenCalled();
});
