import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { studioStarterContent } from "../../src/content/studioContent";
import { StudioStructuredEditor } from "./StudioStructuredEditor";

describe("Biên Tập Viện structured editor", () => {
  it("renders a non-technical vocabulary form and packages JSON only in a hidden field", () => {
    const html = renderToStaticMarkup(
      <StudioStructuredEditor
        mode="create"
        draftSeed="fixture01"
        initialItemType="vocabulary"
        initialLevel="hsk2"
      />,
    );

    expect(html).toContain("Tàng Tự Khố");
    expect(html).toContain("Hán tự giản thể");
    expect(html).toContain("Pinyin có dấu thanh");
    expect(html).toContain("Nghĩa tiếng Việt");
    expect(html).toContain('type="hidden" name="contentJson"');
    expect(html).not.toContain("Canonical content JSON");
    expect(html).not.toContain("JSON nội dung");
  });

  it("preserves existing lesson rows in the guided update form", () => {
    const content = studioStarterContent("lesson");
    const html = renderToStaticMarkup(
      <StudioStructuredEditor
        mode="update"
        draftSeed="fixture02"
        revisionId="revision-1"
        expectedRowVersion={3}
        initialItemType="lesson"
        initialLevel="hsk1"
        initialTitle="Chào hỏi"
        initialContent={content}
      />,
    );

    expect(html).toContain("你好！");
    expect(html).toContain("A 是 B");
    expect(html).toContain("Chọn câu giới thiệu đúng");
    expect(html).toContain("Lưu thay đổi");
    expect(html).toContain("Bài học đích");
    expect(html).toContain("Kỹ năng được luyện");
    expect(html).toContain("Pinyin của đáp án");
    expect(html).toContain('name="targetLessonId"');
    expect(html).not.toContain("rowVersion");
  });

  it.each([
    ["hsk0", 4],
    ["hsk1", 40],
    ["hsk2", 40],
    ["hsk3", 55],
    ["hsk4", 78],
  ] as const)("offers every released %s lesson as a stable authoring target", (level, expected) => {
    const html = renderToStaticMarkup(
      <StudioStructuredEditor
        mode="create"
        draftSeed={`fixture-${level}`}
        initialItemType="lesson"
        initialLevel={level}
      />,
    );
    const targetSelect = html.match(/<select[^>]*name="targetLessonId"[^>]*>([\s\S]*?)<\/select>/u)?.[1] ?? "";
    expect(targetSelect.match(/<option\b/gu)).toHaveLength(expected);
  });

  it("collects stroke provenance in plain-language fields", () => {
    const html = renderToStaticMarkup(
      <StudioStructuredEditor
        mode="create"
        draftSeed="fixture-character"
        initialItemType="character"
        initialLevel="hsk1"
      />,
    );
    expect(html).toContain("Tên bộ dữ liệu nét");
    expect(html).toContain("Trang nguồn hoặc tệp nội bộ");
    expect(html).toContain("Giấy phép / quyền sử dụng");
    expect(html).not.toContain("Mã nguồn dữ liệu nét");
  });

  it("guides editors with the exact HSK structure and all A-L door slots", () => {
    const html = renderToStaticMarkup(
      <StudioStructuredEditor
        mode="create"
        draftSeed="fixture03"
        initialItemType="exam_form"
        initialLevel="hsk4"
      />,
    );

    expect(html).toContain("Cấu trúc cửa Khảo Luyện");
    expect(html).toContain("100 câu · 105 phút");
    expect(html).toContain("Cửa L");
    expect(html).toContain("Nghe hiểu");
    expect(html).not.toContain("Số câu ngữ pháp");
  });

  it.each([
    ["pronunciation", "Mục tiêu luyện âm", "Bước tự nghe hoặc tự đọc"],
    ["communicative_function", "Tình huống giao tiếp", "Đầu ra quan sát được"],
    ["graded_text", "Hồ sơ bài đọc", "Câu hỏi đọc hiểu"],
  ] as const)("renders the guided %s authoring method without exposing JSON", (itemType, firstLabel, secondLabel) => {
    const html = renderToStaticMarkup(
      <StudioStructuredEditor
        mode="create"
        draftSeed={`fixture-${itemType}`}
        initialItemType={itemType}
        initialLevel="hsk2"
      />,
    );

    expect(html).toContain(firstLabel);
    expect(html).toContain(secondLabel);
    expect(html).toContain('type="hidden" name="contentJson"');
    expect(html).not.toContain("JSON nội dung");
    if (itemType === "graded_text") {
      expect(html).toContain("Nguồn gốc và quyền sử dụng");
      expect(html).toContain("Nguồn gốc văn bản");
      expect(html).toContain('name="readerSeriesId"');
      expect(html).toMatch(/studio-text-[0-9a-f]{16}/u);
    }
  });
});
