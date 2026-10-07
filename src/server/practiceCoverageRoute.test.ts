import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ identity: vi.fn(), catalog: vi.fn(), epoch: vi.fn(), all: vi.fn(), bind: vi.fn() }));
vi.mock("../../app/chatgpt-auth", () => ({ getChatGPTUser: mocks.identity }));
vi.mock("./practiceQuestionCatalog", () => ({ publishedPracticeCatalog: mocks.catalog }));
vi.mock("./learningResetEpoch", () => ({ readCurrentLearningResetEpoch: mocks.epoch }));
vi.mock("./syncRepository", () => ({ SyncRepository: class { resolveUser = async () => "owner-a"; } }));
vi.mock("./d1", () => ({ getD1Database: async () => ({ prepare: () => ({ bind: mocks.bind }) }) }));
import { GET } from "../../app/api/learning/practice-coverage/route";
beforeEach(() => {
  vi.clearAllMocks(); mocks.identity.mockResolvedValue(null);
  mocks.catalog.mockResolvedValue({ reading: ["r1", "r2"] });
  mocks.epoch.mockResolvedValue(3);
  mocks.bind.mockReturnValue({ all: mocks.all });
  mocks.all.mockResolvedValue({ success: true, results: [{ id: "r1" }] });
});
it("returns a guest catalog without reading account attempts", async () => {
  const response = await GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ authenticated: false, observed: [], catalog: { reading: ["r1", "r2"] } });
  expect(mocks.bind).not.toHaveBeenCalled();
});
it("scopes all account sources to the authenticated owner and reset epoch", async () => {
  mocks.identity.mockResolvedValue({ id: "a" });
  const response = await GET();
  expect(response.status).toBe(200);
  expect(mocks.bind).toHaveBeenCalledWith("owner-a", 3, "owner-a", 3, "owner-a", 3);
  expect(await response.json()).toMatchObject({ observed: ["r1"], resetEpoch: 3 });
});
it("fails closed on a concurrent reset", async () => {
  mocks.identity.mockResolvedValue({ id: "a" });
  mocks.epoch.mockResolvedValueOnce(3).mockResolvedValueOnce(4);
  expect((await GET()).status).toBe(503);
});
it("does not substitute a fabricated denominator after a catalog failure", async () => {
  mocks.catalog.mockRejectedValue(new Error("offline"));
  expect((await GET()).status).toBe(503);
});
