import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("dictionary reference interaction boundaries", () => {
  it("bounds lesson selection in a searchable native dialog instead of a long OS select", () => {
    const picker = readFileSync("src/screens/DictionaryLessonPicker.tsx", "utf8");
    const css = readFileSync("src/screens/DictionaryLessonPicker.css", "utf8");
    expect(picker).toContain("showModal()");
    expect(picker).toContain('aria-labelledby="lex-lesson-picker-title"');
    expect(picker).toContain('aria-label="Tìm tên bài"');
    expect(css).toContain("100dvh - 48px");
    expect(css).toContain("overflow-y:auto");
  });
  const experience = readFileSync("src/screens/DictionaryExperience.tsx", "utf8");
  const study = readFileSync("src/screens/DictionaryStudyDialog.tsx", "utf8");
  it("keeps saved selection separate from saved state", () => {
    expect(experience).toContain("setCheckedIds");
    expect(experience).toContain("saved.filter(word=>checkedIds.includes(word.id))");
    expect(experience).toContain("Chọn các mục trên trang này");
  });
  it("uses a native modal and never grades voluntary reveal as recall", () => {
    expect(study).toContain("showModal()");
    expect(study).toContain("onClose={onClose}");
    expect(study).toContain("setRevealed(true)");
    expect(study).not.toMatch(/fetch\(|recordReceipt\(|enqueueReviewGrade|toggleSavedWord/);
  });
  it("preserves live text and navigation over the map illustration", () => {
    expect(experience).toContain('aria-label="Các điểm khám phá trên bản đồ"');
    expect(experience).toContain('go("search",undefined,undefined,text)');
  });
});
