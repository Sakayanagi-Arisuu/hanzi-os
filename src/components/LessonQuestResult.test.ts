import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { LessonQuestResult } from "./LessonQuestResult";

const renderResult = (passed: boolean) => renderToStaticMarkup(createElement(
  MemoryRouter,
  null,
  createElement(LessonQuestResult, {
    lessonId: "boot-1",
    lessonTitle: "Bốn thanh điệu",
    chineseTitle: "四声",
    passed,
    correctCount: passed ? 9 : 6,
    totalCount: 10,
    gateScore: passed ? 90 : 60,
    requiredPassed: passed,
    rewardXp: 10,
    rewardState: passed ? "claimable" : "unavailable",
    onRetry: () => undefined,
  }),
));

const renderReplay = () => renderToStaticMarkup(createElement(
  MemoryRouter,
  null,
  createElement(LessonQuestResult, {
    lessonId: "boot-1",
    lessonTitle: "Bốn thanh điệu",
    chineseTitle: "四声",
    passed: true,
    correctCount: 10,
    totalCount: 10,
    gateScore: 100,
    requiredPassed: true,
    rewardXp: 10,
    rewardState: "claimed",
    onRetry: () => undefined,
  }),
));

describe("LessonQuestResult", () => {
  it("describes the actual next learning step instead of promising speaking practice", () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null,
      createElement(LessonQuestResult, {
        lessonId: "boot-1", lessonTitle: "Bốn thanh điệu", chineseTitle: "四声",
        passed: true, correctCount: 9, totalCount: 10, gateScore: 90,
        requiredPassed: true, rewardXp: 10, rewardState: "claimed",
        onRetry: () => undefined,
        continueDestination: "/review", continueDestinationLabel: "Tiếp tục bước Ôn",
      }),
    ));
    expect(html).toContain('href="/review"');
    expect(html).toContain("Tiếp tục bước Ôn");
    expect(html).not.toContain("Vạn Âm Điện");
  });

  it("supports recovery through the shared mistakes module", () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null,
      createElement(LessonQuestResult, {
        lessonId: "boot-1", lessonTitle: "Bốn thanh điệu", chineseTitle: "四声",
        passed: false, correctCount: 6, totalCount: 10, gateScore: 60,
        requiredPassed: false, rewardXp: 10, rewardState: "unavailable",
        onRetry: () => undefined,
        retryDestination: "/mistakes", retryDestinationLabel: "Xem câu cần ôn",
      }),
    ));
    expect(html).toContain('href="/mistakes"');
    expect(html).toContain("Xem câu cần ôn");
    expect(html).not.toContain("RƯƠNG ĐÃ MỞ");
  });

  it("fits the Thiên Lộ reward, replay, and next application into one clear screen", () => {
    const html = renderResult(true);
    expect(html).toContain("THIÊN LỘ");
    expect(html).toContain("CỬA ẢI HOÀN TẤT");
    expect(html).toContain("Bốn thanh điệu");
    expect(html).not.toContain("BOOT-1");
    expect(html).toContain("Hiểu kết quả và bước ôn tiếp");
    expect(html).toContain("Vượt ải chưa có nghĩa đã thành thạo lâu dài");
    expect(html).toContain("RƯƠNG THƯỞNG CỬA ẢI");
    expect(html).toContain("+10 EXP");
    expect(html).toContain("Mở rương nhận 10 EXP");
    expect(html).toContain("9/10");
    expect(html).toContain("Làm lại bài này");
    expect(html).toContain("Luyện tại Vạn Âm Điện");
    expect(html).toContain("/pronunciation?lesson=boot-1");
    expect(html).not.toContain("MẠO HIỂM GIẢ");
    expect(html).not.toContain("XP là điểm tương tác");
  });

  it("keeps retry as the primary recovery action without claiming completion", () => {
    const html = renderResult(false);
    expect(html).toContain("CỬA ẢI CHƯA MỞ");
    expect(html).toContain("Bốn thanh điệu");
    expect(html).toContain("Làm lại không trợ giúp");
    expect(html).not.toContain("Luyện tại Vạn Âm Điện");
  });

  it("does not claim a duplicate reward after replaying a cleared lesson", () => {
    const html = renderReplay();
    expect(html).toContain("ĐÃ NHẬN");
    expect(html).toContain("không thể nhận lại");
    expect(html).not.toContain("+0 EXP");
  });
});
