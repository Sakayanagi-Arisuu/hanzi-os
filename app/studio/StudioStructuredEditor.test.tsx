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
    expect(html).not.toContain("rowVersion");
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

    expect(html).toContain("Cấu hình cửa dungeon");
    expect(html).toContain("100 câu · 105 phút");
    expect(html).toContain("Cửa L");
    expect(html).toContain("Nghe hiểu");
    expect(html).not.toContain("Số câu ngữ pháp");
  });
});
