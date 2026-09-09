import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RemediationAtlas } from "./RemediationAtlas";
import type { RemediationObservatoryItem, RemediationObservatorySkill } from "../mistakes/remediationObservatory";

describe("RemediationAtlas", () => {
  it("keeps all seven skills visible while limiting the practice queue to five", () => {
    const skills: RemediationObservatorySkill[] = ["listening", "pronunciation", "grammar", "vocabulary", "reading", "speaking", "writing"];
    const items: RemediationObservatoryItem[] = skills.map((skill, i) => ({ id: String(i), skill, skillLabel: `Skill ${i}`, kindLabel: "Chọn từ", originSource: "lesson", originLabel: "Thiên Lộ", originDetail: "Bài 1", instruction: "Chọn từ", prompt: `Question ${i}`, options: [], hint: "", occurrenceCount: 2, correctedStreak: 0, resolved: false, lastAttemptAt: Date.now() }));
    const html = renderToStaticMarkup(createElement(RemediationAtlas, { items, resolvedCount: 0, onStart: () => {} }));
    for (let i = 0; i < 7; i++) expect(html).toContain(`Skill ${i}`);
    expect(html).toContain("5 lỗi ưu tiên hôm nay");
    expect(html).not.toContain("Question 5");
    expect(html).toContain(">14</strong>");
  });
  it("offers an honest empty state and disables starting with no open items", () => {
    const html = renderToStaticMarkup(createElement(RemediationAtlas, { items: [], resolvedCount: 0, onStart: () => {} }));
    expect(html).toContain("Chưa có lỗi cần luyện");
    expect(html).toContain('disabled=""');
    expect(html).not.toContain("NaN");
  });
});
