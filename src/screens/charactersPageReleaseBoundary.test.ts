import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RELEASED_CHARACTER_PRACTICE } from "../learning/richLessonContent";
import { listPremiumRichLessons } from "../server/premiumRichLesson";
import { characterEntryMatchesQuery, getCharacterScriptPresentation } from "./CharactersPage";
import { legacyCharacterRequestToSession, UNIQUE_RELEASED_CHARACTERS } from "./CharactersPage";

const source = readFileSync(
  new URL("./CharactersPage.tsx", import.meta.url),
  "utf8",
);
const sessionSource = readFileSync(
  new URL("./CharacterForgeSessionPage.tsx", import.meta.url),
  "utf8",
);

describe("character page release boundary", () => {
  it("keeps the full character inventory available through the HSK4 character endpoint", () => {
    expect(new Set(RELEASED_CHARACTER_PRACTICE.map((item) => item.hanzi)).size)
      .toBe(655);
    const premiumCharacters = listPremiumRichLessons().flatMap(lesson => lesson.characters);
    expect(new Set([...RELEASED_CHARACTER_PRACTICE, ...premiumCharacters].map(item => item.hanzi)).size)
      .toBe(1_096);
    expect(RELEASED_CHARACTER_PRACTICE.every((item) =>
      item.hanzi && item.pinyin && item.meaningVi && item.lessonId
    )).toBe(true);
  });

  it("opens the verified stroke inventory as practice without promoting it to mastery", () => {
    expect(source).toContain("RELEASED_CHARACTER_PRACTICE");
    expect(sessionSource).toContain("<CharacterStructurePanel");
    expect(sessionSource).toContain("Hiểu cấu trúc để viết đúng ngay từ đầu");
    expect(source).toContain("Chỉ mở luyện viết khi có dữ liệu thứ tự nét từ nguồn đã ghim.");
    expect(sessionSource).toContain("speakMandarin(currentHanzi)");
    expect(sessionSource).toContain("speakMandarin(currentEntry.contextWord)");
    expect(source).toContain("RELEASED_VOCABULARY");
    expect(sessionSource).toContain("StrokeOrderPractice");
    expect(new Set(UNIQUE_RELEASED_CHARACTERS.map(entry => entry.hanzi)))
      .toEqual(new Set(RELEASED_CHARACTER_PRACTICE.map(entry => entry.hanzi)));
    expect(source).not.toContain("HanziWriter");
    expect(sessionSource).not.toContain("mastery");
  });

  it("adapts legacy character deep links into a bounded forge session", () => {
    const entry = RELEASED_CHARACTER_PRACTICE.find((item) => item.hanzi === "人")!;
    const session = legacyCharacterRequestToSession({ character: "人", lessonId: entry.lessonId });
    expect(session?.source).toBe("legacy");
    expect(session?.hanzis[0]).toBe("人");
    expect(session?.hanzis.length).toBeLessThanOrEqual(5);
    expect(session?.lessonId).toBe(entry.lessonId);
  });

  it("finds marked pinyin when the learner types without tone marks", () => {
    const entry = RELEASED_CHARACTER_PRACTICE.find((item) =>
      item.hanzi === "人"
    );
    expect(entry).toBeDefined();
    expect(characterEntryMatchesQuery(entry!, "ren")).toBe(true);
  });

  it("pairs traditional recognition with the stable simplified stroke character", () => {
    const entry = RELEASED_CHARACTER_PRACTICE.find((item) =>
      item.contextWord === "老师" && item.hanzi === "师"
    );
    expect(entry).toBeDefined();
    expect(getCharacterScriptPresentation(entry!, "traditional")).toEqual({
      displayHanzi: "師",
      displayContextWord: "老師",
      paired: true,
    });
    expect(entry!.hanzi).toBe("师");
  });
});
