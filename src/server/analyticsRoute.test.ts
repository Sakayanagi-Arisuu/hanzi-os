import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ identity: vi.fn(), read: vi.fn(), visit: vi.fn(), resolve: vi.fn() }));
vi.mock("../../app/chatgpt-auth", () => ({ getChatGPTUser: mocks.identity }));
vi.mock("./d1", () => ({ getD1Database: async () => ({}) }));
vi.mock("./syncRepository", () => ({ SyncRepository: class { resolveUser = mocks.resolve; } }));
vi.mock("./analyticsRepository", () => ({ AnalyticsRepository: class { read = mocks.read; recordAccess = mocks.visit; } }));
import { GET, POST } from "../../app/api/learning/analytics/route";
beforeEach(() => { vi.clearAllMocks(); mocks.identity.mockResolvedValue({ userId: "a" }); mocks.resolve.mockResolvedValue("a"); mocks.read.mockResolvedValue({ skills: {} }); });
describe("analytics route boundaries", () => {
  it("rejects unauthenticated reads and writes", async () => {
    mocks.identity.mockResolvedValue(null);
    expect((await GET(new Request("http://localhost/api/learning/analytics"))).status).toBe(401);
    expect((await POST(new Request("http://localhost/api/learning/analytics", { method: "POST" }))).status).toBe(401);
    expect(mocks.visit).not.toHaveBeenCalled();
  });
  it("rejects cross-origin access writes before resolving identity", async () => {
    expect((await POST(new Request("http://localhost/api/learning/analytics", { method: "POST", headers: { origin: "https://other.example" } }))).status).toBe(403);
    expect(mocks.identity).not.toHaveBeenCalled();
  });
  it("uses only authenticated owner, no-store, and does not turn errors into zero counts", async () => {
    const response = await GET(new Request("http://localhost/api/learning/analytics?userId=b"));
    expect(mocks.read).toHaveBeenCalledWith("a");
    expect(response.headers.get("cache-control")).toContain("no-store");
    mocks.read.mockRejectedValueOnce(new Error("database unavailable"));
    expect((await GET(new Request("http://localhost/api/learning/analytics"))).status).toBe(503);
  });
});
