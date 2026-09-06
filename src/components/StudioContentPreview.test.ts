import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { studioStarterContent, validateStudioContent } from "../content/studioContent";
import { StudioContentPreview } from "./StudioContentPreview";

describe("Content Studio learner UI preview", () => {
  it("renders a draft lesson through the real LessonDepthPanel without unlock controls", () => {
    const html = renderToStaticMarkup(createElement(StudioContentPreview, {
      revisionId: "revision-preview-1",
      itemType: "lesson",
      content: {
        objectiveVi: "Giới thiệu bản thân.",
        dialogue: [
          { hanzi: "你好！", pinyin: "Nǐ hǎo!", meaningVi: "Xin chào!" },
          { hanzi: "我是安。", pinyin: "Wǒ shì Ān.", meaningVi: "Tôi là An." },
        ],
        grammar: [{ pattern: "A 是 B", explanationVi: "Mẫu giới thiệu danh tính." }],
      },
    }));

    expect(html).toContain("lesson-depth-panel");
    expect(html).toContain("rich-dialogue-panel");
    expect(html).toContain("你好");
    expect(html).toContain("A 是 B");
    expect(html).not.toContain("unlock");
    expect(html).not.toContain("mastery");
  });

  it("validates and previews a governed Mock Exam form draft", async () => {
    const content = studioStarterContent("exam_form");
    const reviewed = {
      ...content,
      formKey: "l",
      review: {
        humanReviewed: false,
        aiSelfReview: {
          accuracy: true,
          levelFit: true,
          pedagogy: true,
          answerIntegrity: true,
          originality: true,
        },
      },
    };
    await expect(validateStudioContent("exam_form", reviewed)).resolves.toMatchObject({
      result: { valid: true, itemType: "exam_form" },
    });
    const html = renderToStaticMarkup(createElement(StudioContentPreview, {
      revisionId: "revision-form-1",
      itemType: "exam_form",
      content: reviewed,
    }));
    expect(html).toContain("BẢN XEM TRƯỚC · BỘ ĐỀ");
    expect(html).toContain("HSK1 · CỬA L");
    expect(html).toContain("40 phút · 40 câu");
    expect(html).not.toMatch(/answerIndex|correctAnswer/u);
  });

  it("previews a graded text as aligned Reader copy without revealing its answer", () => {
    const content = studioStarterContent("graded_text");
    const html = renderToStaticMarkup(createElement(StudioContentPreview, {
      revisionId: "revision-graded-text-1",
      itemType: "graded_text",
      content,
    }));
    expect(html).toContain("VẠN QUYỂN CÁC");
    expect(html).toContain("今天是我上中文课的第一天");
    expect(html).toContain("Hôm nay là ngày gì?");
    expect(html).toContain("Lựa chọn đúng được ẩn trong bản xem trước");
    expect(html).not.toContain("Ngày đầu học tiếng Trung");
  });
});
