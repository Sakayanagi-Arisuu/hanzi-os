import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { LessonQuestTransition } from "./LessonQuestTransition";

const renderTransition = (
  kind: "opening" | "submitting",
  delayed = false,
  activeStep?: 0 | 1 | 2,
) => renderToStaticMarkup(createElement(
  MemoryRouter,
  null,
  createElement(LessonQuestTransition, {
    kind,
    lessonTitle: "Bốn thanh điệu",
    itemCount: 10,
    activeStep,
    delayed,
    onRetry: () => undefined,
  }),
));

describe("LessonQuestTransition", () => {
  it("frames lesson preparation as a readable quest protocol", () => {
    const html = renderTransition("opening");
    expect(html).toContain("QUEST FORGE");
    expect(html).toContain("Rèn bản đồ nhiệm vụ");
    expect(html).toContain("Xác minh lộ trình");
    expect(html).not.toContain("Thử nối lại");
  });

  it("offers an explicit recovery path when result syncing is delayed", () => {
    const html = renderTransition("submitting", true, 1);
    expect(html).toContain("QUEST SEAL");
    expect(html).toContain("Ấn chú chưa hoàn tất");
    expect(html).toContain("Ghi lại chiến tích");
    expect(html).toContain("10 câu trong hồ sơ nhiệm vụ");
    expect(html).toContain("aria-valuenow=\"52\"");
    expect(html).toContain("Tiến trình tạm dừng tại bước 2 trên 3: Ghi chiến tích");
  });

  it("shows the final syncing seal while an acknowledged submit is awaiting its result", () => {
    const html = renderTransition("submitting", false, 2);
    expect(html).toContain('data-state="syncing"');
    expect(html).toContain('aria-valuenow="86"');
    expect(html).toContain("ẤN CHÚ 03 / 03");
    expect(html).toContain("Bước 3/3 · Mở kết quả");
    expect(html).toContain('data-state="active"><span>03</span><strong>Mở kết quả</strong>');
    expect(html).not.toContain("Ghi lại chiến tích");
  });
});
