import { describe, expect, it } from "vitest";
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
