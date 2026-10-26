import { beforeEach, expect, it, vi } from "vitest";
import { deriveAccountKey } from "../lib/accountKey";
const mocks = vi.hoisted(() => ({ identity: vi.fn(), database: vi.fn(), resolveUser: vi.fn(), read: vi.fn() }));
vi.mock("../../app/chatgpt-auth", () => ({ getChatGPTUser: mocks.identity }));
vi.mock("./d1", () => ({ getD1Database: mocks.database }));
vi.mock("./syncRepository", () => ({ SyncRepository: class { resolveUser = mocks.resolveUser; } }));
vi.mock("./lessonHistoryRepository", () => ({ LessonHistoryRepository: class { readPage = mocks.read; } }));
import { GET } from "../../app/api/learning/lesson-history/route";
import { LearningResetEpochConflictError } from "./learningResetEpoch";

beforeEach(() => { vi.resetAllMocks(); });
const request = (query = "resetEpoch=0", ownerKey?: string) => new Request(`https://hanzi.example/api/learning/lesson-history?${query}`,
  { headers: ownerKey ? { "x-learning-owner": ownerKey } : {} });

it("rejects changed cookies before resolving or reading another learner", async () => {
  mocks.identity.mockResolvedValue({ userId: "owner-b", email: "b@example.invalid" });
  const response = await GET(request("resetEpoch=0", await deriveAccountKey("owner-a")));
  expect(response.status).toBe(409);
  expect(mocks.database).not.toHaveBeenCalled();
});

it("requires account identity and never accepts a caller-selected owner", async () => {
  mocks.identity.mockResolvedValue(null);
  expect((await GET(request())).status).toBe(401);
  mocks.identity.mockResolvedValue({ userId: "owner-a", email: "a@example.invalid" });
  mocks.database.mockResolvedValue({}); mocks.resolveUser.mockResolvedValue("user-a");
  mocks.read.mockResolvedValue({ schemaVersion: 1, events: [] });
  const response = await GET(request("resetEpoch=3&ownerKey=forged"));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(mocks.read).toHaveBeenCalledWith("user-a", await deriveAccountKey("owner-a"), 3, { limit: 50, cursor: null });
});

it.each(["", "resetEpoch=x", "resetEpoch=0&limit=-1", "resetEpoch=0&cursor=broken", "resetEpoch=0&cursor=[]"])(
  "rejects malformed history query %s", async (query) => {
    mocks.identity.mockResolvedValue({ userId: "owner-a", email: "a@example.invalid" });
    expect((await GET(request(query))).status).toBe(400);
    expect(mocks.read).not.toHaveBeenCalled();
  });

it("reports scope and backend failures without writing replacement data", async () => {
  mocks.identity.mockResolvedValue({ userId: "owner-a", email: "a@example.invalid" });
  mocks.resolveUser.mockResolvedValue("user-a");
  mocks.read.mockRejectedValue(new LearningResetEpochConflictError());
  expect((await GET(request())).status).toBe(409);
  mocks.read.mockRejectedValue(new Error("unreadable source"));
  expect((await GET(request())).status).toBe(503);
});
