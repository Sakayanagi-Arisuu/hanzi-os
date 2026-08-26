import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { PronunciationQuestComplete } from "./PronunciationQuestComplete";

describe("PronunciationQuestComplete", () => {
  it("returns directly to Thiên Lộ from a dedicated Vạn Âm reward screen", () => {
    const html = renderToStaticMarkup(createElement(
      MemoryRouter,
      null,
      createElement(PronunciationQuestComplete, {
        lessonTitle: "Bốn thanh điệu",
        phraseCount: 4,
        assessedCount: 3,
        rewardAwarded: true,
        onReplay: () => undefined,
        onChooseLesson: () => undefined,
      }),
    ));

    expect(html).toContain("VẠN ÂM ĐIỆN");
    expect(html).toContain("Cộng hưởng hoàn tất");
    expect(html).toContain("+10 XP");
    expect(html).toContain("Chọn bài luyện khác");
    expect(html).toContain('href="/path"');
    expect(html).not.toContain('href="/lesson/');
    expect(html).not.toContain("MẠO HIỂM GIẢ");
    expect(html).not.toContain("không phải mastery");
  });
});
