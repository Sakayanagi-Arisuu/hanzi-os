import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../screens/MockExamsPage.tsx", import.meta.url),
  "utf8",
);

describe("Mock Exams page learner-facing boundary", () => {
  it("keeps provenance and release operations out of the learner dungeon", () => {
    expect(source).not.toContain("Chinese Test Service");
    expect(source).not.toContain("HANZI.OS chưa tìm thấy");
    expect(source).not.toContain("kho đề chính thức");
    expect(source).not.toContain("không sao chép PDF");
    expect(source).not.toContain("Mô phỏng toàn phần trong ứng dụng chưa mở");
  });

  it("keeps invalid, loading, and failed-load states distinguishable", () => {
    expect(source).toContain("LỐI ĐI KHÔNG TỒN TẠI");
    expect(source).toContain("Đang gọi lại cửa ải…");
    expect(source).toContain("Chưa thể bước vào lúc này");
  });

  it("gives the synthetic-listening control an accessible name", () => {
    expect(source).toContain(
      "aria-label={`Phát câu nghe ${currentItem.position + 1}`}",
    );
    expect(source).toContain("Giọng luyện tập tổng hợp");
    expect(source).toContain('<span aria-hidden="true" />');
  });

  it("keeps the runner HUD and action dock explicit in the learner surface", () => {
    expect(source).toContain('className="dungeon-runner-hud"');
    expect(source).toContain('className="dungeon-runner-dock"');
    expect(source).toContain("Lưu và sang câu tiếp");
    expect(source).toContain("Bài thi mô phỏng");
  });
});
