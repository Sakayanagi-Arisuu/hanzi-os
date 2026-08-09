import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RELEASED_CHARACTER_PRACTICE } from "../learning/richLessonContent";
import { characterEntryMatchesQuery } from "./CharactersPage";

const source = readFileSync(
  new URL("./CharactersPage.tsx", import.meta.url),
  "utf8",
);

describe("character page release boundary", () => {
  it("uses exactly the released recognition inventory", () => {
    expect(new Set(RELEASED_CHARACTER_PRACTICE.map((item) => item.hanzi)).size)
      .toBe(1_096);
    expect(RELEASED_CHARACTER_PRACTICE.every((item) =>
      item.hanzi && item.pinyin && item.meaningVi && item.lessonId
    )).toBe(true);
  });

  it("does not promote vocabulary or mutable stroke files into stroke mastery", () => {
    expect(source).toContain("RELEASED_CHARACTER_PRACTICE");
    expect(source).toContain("Nhận diện 1.096 Hán tự trong từ");
    expect(source).toContain("không phải từ điển âm-nghĩa độc lập");
    expect(source).toContain("speakMandarin(selected.contextWord)");
    expect(source).not.toContain("RELEASED_VOCABULARY");
    expect(source).not.toContain("HanziWriter");
    expect(source).not.toContain("<canvas");
  });

  it("finds marked pinyin when the learner types without tone marks", () => {
    const entry = RELEASED_CHARACTER_PRACTICE.find((item) =>
      item.hanzi === "人"
    );
    expect(entry).toBeDefined();
    expect(characterEntryMatchesQuery(entry!, "ren")).toBe(true);
  });
});
