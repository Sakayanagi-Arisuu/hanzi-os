import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../screens/MockExamsPage.tsx", import.meta.url),
  "utf8",
);

describe("Mock Exams page learner-facing boundary", () => {
  it("does not present CTI reference-paper codes as papers from 2026", () => {
    expect(source).toContain(
      "Đề tham khảo CTI {resource.paperCode} · không gắn năm",
    );
    expect(source).toContain("{resource.level} · CẤU TRÚC HSK 2.0");
    expect(source).not.toContain(
      "{resource.level} · CẤU TRÚC THI THƯỜNG KỲ 2026",
    );
  });

  it("keeps invalid, loading, and failed-load states distinguishable", () => {
    expect(source).toContain("ĐƯỜNG DẪN LUYỆN ĐỀ KHÔNG HỢP LỆ");
    expect(source).toContain("Đang tải bài luyện...");
    expect(source).toContain("Chưa tải được bài luyện");
  });

  it("gives the synthetic-listening control an accessible name", () => {
    expect(source).toContain(
      "aria-label={`Phát câu nghe ${currentItem.position + 1} bằng giọng TTS`}",
    );
    expect(source).toContain('<span aria-hidden="true" />');
  });
});
