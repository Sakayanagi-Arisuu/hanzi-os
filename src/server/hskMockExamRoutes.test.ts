import { describe, expect, it, vi } from "vitest";
vi.mock("../../app/chatgpt-auth", () => ({ getAuthenticatedUser: vi.fn(async () => null) }));
vi.mock("./learningOwnerHttp", () => ({ learningOwnerMismatch: vi.fn(async () => null) }));
vi.mock("./d1", async (importOriginal) => ({
  ...await importOriginal<typeof import("./d1")>(),
  getD1Database: vi.fn(async () => { throw new Error("Offline catalog fixture"); }),
}));
import { GET as getCatalog } from "../../app/api/exams/catalog/route";

describe("HSK Mock Exam public routes", () => {
  it("returns six standards-sized doors per HSK level without answer fields", async () => {
    const response = await getCatalog();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const payload = await response.json() as {
      forms: unknown[];
      summary: { forms: number; playableItems: number; sourceItems: number };
    };
    expect(payload.forms).toHaveLength(24);
    expect(payload.summary).toMatchObject({
      forms: 24,
      playableItems: 1_680,
      sourceItems: 422,
    });
    expect(JSON.stringify(payload)).not.toMatch(
      /correctAnswer|answerKey|correctOptionId|explanationVi|sourceLessonId/iu,
    );
  });
});
