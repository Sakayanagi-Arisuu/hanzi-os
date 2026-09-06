import { describe, expect, it } from "vitest";
import {
  buildSevenDayLabels,
  buildSevenDaySignals,
  buildSkillSignals,
  countActiveSignals,
  selectRemediationSession,
  summarizeRemediationResults,
  type RemediationObservatoryItem,
} from "./remediationObservatory";

const item = (
  id: string,
  overrides: Partial<RemediationObservatoryItem> = {},
): RemediationObservatoryItem => ({
  id,
  skill: "grammar",
  skillLabel: "Ngữ pháp",
  kindLabel: "Chọn từ",
  originSource: "lesson",
  originLabel: "Thiên Lộ",
  originDetail: "Bài 07",
  instruction: "Chọn từ phù hợp",
  prompt: "我___学生。",
  options: ["是", "有", "在", "会"],
  hint: "Dùng 是 để nối chủ ngữ với danh từ.",
  occurrenceCount: 1,
  correctedStreak: 0,
  resolved: false,
  lastAttemptAt: Date.UTC(2026, 8, 5, 8),
  ...overrides,
});

describe("remediation observatory model", () => {
  it("preserves repository priority and caps a session at five open items", () => {
    const items = Array.from({ length: 7 }, (_, index) => item(String(index)));
    items[1] = item("resolved", { resolved: true });
    expect(selectRemediationSession(items).map((entry) => entry.id)).toEqual([
      "0", "2", "3", "4", "5",
    ]);
  });

  it("derives map signals from real occurrence counts", () => {
    const items = [
      item("grammar", { occurrenceCount: 4 }),
      item("listening", {
        skill: "listening",
        skillLabel: "Nghe hiểu",
        occurrenceCount: 3,
      }),
    ];
    expect(countActiveSignals(items)).toBe(7);
    expect(buildSkillSignals(items)).toEqual([
      { skill: "listening", label: "Nghe hiểu", count: 3 },
      { skill: "grammar", label: "Ngữ pháp", count: 4 },
    ]);
  });

  it("uses last-seen dates for the seven-day trace without inventing attempts", () => {
    const now = Date.UTC(2026, 8, 5, 12);
    expect(buildSevenDaySignals([
      item("today", { lastAttemptAt: Date.UTC(2026, 8, 5, 8) }),
      item("yesterday", { lastAttemptAt: Date.UTC(2026, 8, 4, 8) }),
      item("old", { lastAttemptAt: Date.UTC(2026, 7, 20, 8) }),
    ], now)).toEqual([0, 0, 0, 0, 0, 1, 1]);
  });

  it("labels the seven-day trace from the actual calendar date", () => {
    const saturday = new Date(2026, 8, 5, 12).getTime();
    expect(buildSevenDayLabels(saturday)).toEqual([
      "CN", "T2", "T3", "T4", "T5", "T6", "Nay",
    ]);
  });

  it("separates resolved, assisted, and retry outcomes", () => {
    expect(summarizeRemediationResults([
      {
        itemId: "a",
        skill: "grammar",
        skillLabel: "Ngữ pháp",
        outcome: "correct",
        resolved: true,
        answer: "是",
        explanation: "Đúng",
        usedHint: false,
      },
      {
        itemId: "b",
        skill: "grammar",
        skillLabel: "Ngữ pháp",
        outcome: "correct",
        resolved: false,
        answer: "是",
        explanation: "Đúng nhưng có gợi ý",
        usedHint: true,
      },
      {
        itemId: "c",
        skill: "listening",
        skillLabel: "Nghe hiểu",
        outcome: "incorrect",
        resolved: false,
        answer: "有",
        explanation: "Thử lại",
        usedHint: false,
      },
    ])).toMatchObject({ total: 3, resolved: 1, unassistedCorrect: 1, retry: 2 });
  });
});
