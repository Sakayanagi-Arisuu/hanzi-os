import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
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
});
