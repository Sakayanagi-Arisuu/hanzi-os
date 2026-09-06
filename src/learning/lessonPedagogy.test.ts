import { describe, expect, it } from "vitest";
import { getLessonGuide } from "../data/lessonGuides";
import { getLessonTeachingGuide } from "./lessonPedagogy";

describe("runtime lesson pedagogy", () => {
  it("deepens the four-tone explanation without editing the signed source guide", () => {
    const source = getLessonGuide("boot-1");
    const teaching = getLessonTeachingGuide("boot-1", source);
    expect(teaching).not.toBe(source);
    expect(teaching.rule).toContain("không phải bốn cách nhấn cảm xúc");
    expect(teaching.checkpoint).toContain("thanh 2 đi lên với thanh 4 rơi xuống");
    expect(source.concept).toBe("Thanh điệu là một phần của âm tiết, không phải cảm xúc khi nói.");
  });

  it("preserves every other source guide by identity", () => {
    const source = getLessonGuide("boot-2");
    expect(getLessonTeachingGuide("boot-2", source)).toBe(source);
  });
});
