import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { PronunciationLessonLibrary } from "./PronunciationLessonLibrary";

describe("PronunciationLessonLibrary", () => {
  it("lists completed lessons inside Vạn Âm Điện", () => {
    const html = renderToStaticMarkup(createElement(
      MemoryRouter,
      null,
      createElement(PronunciationLessonLibrary, {
        open: true,
        selectedLessonId: "boot-1",
        options: [
          { id: "boot-1", title: "Bốn thanh điệu", chineseTitle: "四声", challengeCount: 4 },
          { id: "hsk1-001", title: "Chào hỏi", chineseTitle: "问候", challengeCount: 6 },
        ],
        onClose: () => undefined,
        onSelect: () => undefined,
      }),
    ));

    expect(html).toContain("Chọn bài đã học");
    expect(html).toContain("Bốn thanh điệu");
    expect(html).toContain("Chào hỏi");
    expect(html).toContain("không cần quay về Thiên Lộ");
    expect(html).toContain('aria-current="true"');
  });

  it("explains the unlock condition when no completed lesson has practice content", () => {
    const html = renderToStaticMarkup(createElement(
      MemoryRouter,
      null,
      createElement(PronunciationLessonLibrary, {
        open: true,
        selectedLessonId: "boot-1",
        options: [],
        onClose: () => undefined,
        onSelect: () => undefined,
      }),
    ));

    expect(html).toContain("Chưa có bài đủ điều kiện luyện đọc");
    expect(html).toContain('href="/path"');
  });
});
