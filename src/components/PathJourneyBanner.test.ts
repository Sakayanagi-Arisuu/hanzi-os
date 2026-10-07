import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { PathJourneyBanner } from "./PathJourneyBanner";

const stages = [4, 40, 40, 55, 78].map((total, index) => ({
  id: `hsk${index}`, total, completed: index < 2 ? total : index === 2 ? 10 : 0,
}));
const render = (level: string, lesson: { id: string; title: string } | null, complete = false) =>
  renderToStaticMarkup(createElement(MemoryRouter, null, createElement(PathJourneyBanner, {
    stages: complete ? stages.map(stage => ({ ...stage, completed: stage.total })) : stages,
    currentLevel: level, currentLesson: lesson, completed: complete ? 217 : 54, total: 217,
  })));

describe("live Thiên Lộ banner", () => {
  it("marks the actual current stage, exposes progress and keeps the full lesson title", () => {
    const title = "Hỏi đường và xác nhận vị trí khi di chuyển qua nhiều địa điểm trong thành phố";
    const html = render("hsk2", { id: "real-lesson-id", title });
    expect(html).toContain(`HSK2 · 10/40 bài · Đang học`);
    expect(html).toContain('href="#path-stage-hsk2" aria-current="step"');
    expect(html).toContain("HSK0 · 4/4 bài · Đã thông qua");
    expect(html).toContain("HSK1 · 40/40 bài · Đã thông qua");
    expect(html).toContain(title);
    expect(html).toContain('href="/lesson/real-lesson-id"');
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    for (const creature of ["dragon", "crane", "tiger", "phoenix", "qilin"]) {
      expect(html).toContain(`jade-${creature}-seal-v1.webp`);
    }
  });
  it("updates the highlighted level and removes the continue link when all lessons are done", () => {
    expect(render("hsk3", { id: "next", title: "Bài tiếp theo" })).toContain('href="#path-stage-hsk3" aria-current="step"');
    const complete = render("hsk4", null, true);
    expect(complete).not.toContain('aria-current="step"');
    expect(complete).not.toContain('href="/lesson/');
    expect(complete).toContain("Bạn đã đi qua toàn bộ Thiên Lộ");
  });
});
