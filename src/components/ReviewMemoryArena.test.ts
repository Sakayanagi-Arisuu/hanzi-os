import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../audio/AudioEngineProvider", () => ({ useAudioEngine: () => ({ playback: {}, prepareMandarinSpeech: () => undefined, speakMandarin: () => undefined }) }));
import { ReviewMemoryArena } from "./ReviewMemoryArena";

describe("memory word length layout", () => {
  for (const character of ["还", "说话", "图书馆", "不好意思"]) {
    for (const revealed of [false, true]) {
      it(`keeps length information for ${character}, revealed=${revealed}`, () => {
        const html = renderToStaticMarkup(createElement(ReviewMemoryArena, {
          character, revealed, audioSourceId: "test", example: "不要说话。", exampleMeaning: "Đừng nói chuyện.", examplePinyin: "Bú yào shuōhuà.", meaning: "nói chuyện", hintUsed: false, onUseHint: () => undefined, partOfSpeech: "động từ", pinyin: "shuōhuà", tags: [], titleId: "word",
        }));
        expect(html).toContain(`--memory-glyph-count:${Array.from(character).length}`);
        expect(html).toContain(character);
        expect(html).not.toContain("⌄");
        if (!revealed) expect(html).toContain("lucide-lightbulb");
      });
    }
  }
});
