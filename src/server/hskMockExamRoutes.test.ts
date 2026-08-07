import { describe, expect, it } from "vitest";
import { GET as getCatalog } from "../../app/api/exams/catalog/route";

describe("HSK Mock Exam public routes", () => {
  it("returns eight form summaries without any answer-bearing field", async () => {
    const response = getCatalog();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const payload = await response.json() as { forms: unknown[] };
    expect(payload.forms).toHaveLength(8);
    expect(JSON.stringify(payload)).not.toMatch(
      /correctAnswer|answerKey|correctOptionId|explanationVi|sourceLessonId/iu,
    );
  });
});
