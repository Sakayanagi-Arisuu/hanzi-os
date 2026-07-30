import { describe, expect, it } from "vitest";
import {
  applyToneSandhi,
  formatMarkedPinyin,
  parseNumberedPinyin,
  splitPinyinSyllable,
  stripPinyinMarks,
} from "./pinyin";

describe("numbered pinyin", () => {
  it.each([
    ["ni3", "nǐ"],
    ["xue2sheng5", "xuésheng"],
    ["Zhong1guo2", "Zhōngguó"],
    ["xie4 xie5", "xièxie"],
    ["nu:3", "nǚ"],
    ["nar3", "nǎr"],
    ["zher4", "zhèr"],
  ])("round-trips %s to canonical marked pinyin", (numbered, marked) => {
    const syllables = parseNumberedPinyin(numbered);
    expect(formatMarkedPinyin(syllables)).toBe(marked);
    expect(syllables.map((syllable) => syllable.numbered).join("")).toBe(
      numbered.replace(/[\s'’-]/gu, "").replace("u:", "ü"),
    );
  });

  it("extracts the longest valid initial", () => {
    expect(splitPinyinSyllable("zhong")).toEqual({ initial: "zh", final: "ong" });
    expect(splitPinyinSyllable("an")).toEqual({ initial: "", final: "an" });
  });

  it.each(["", "ni", "ni0", "3", "sh4", "ni3!"])(
    "rejects malformed numbered pinyin: %s",
    (value) => {
      expect(() => parseNumberedPinyin(value)).toThrow();
    },
  );

  it("normalizes marked pinyin for search without losing ü", () => {
    expect(stripPinyinMarks("Nǚ'ér")).toBe("nüer");
  });
});

describe("tone sandhi", () => {
  it.each([
    ["ni3hao3", [2, 3], "ní hǎo"],
    ["bu4shi4", [2, 4], "bú shì"],
    ["yi1ben3", [4, 3], "yì běn"],
    ["yi1ge4", [2, 4], "yí gè"],
  ] as const)("applies the contextual tones for %s", (numbered, tones, marked) => {
    const lexical = parseNumberedPinyin(numbered);
    const surface = applyToneSandhi(lexical);
    expect(surface.map((syllable) => syllable.surfaceTone)).toEqual([...tones]);
    expect(formatMarkedPinyin(surface, " ")).toBe(marked);
  });

  it("does not mutate dictionary tones when deriving a surface form", () => {
    const lexical = parseNumberedPinyin("ni3hao3");
    const snapshot = structuredClone(lexical);
    applyToneSandhi(lexical);
    expect(lexical).toEqual(snapshot);
    expect(lexical.map((syllable) => syllable.lexicalTone)).toEqual([3, 3]);
  });

  it("models neutral tone explicitly and leaves 一 unchanged before it", () => {
    const neutral = parseNumberedPinyin("ma5")[0];
    expect(neutral).toMatchObject({
      marked: "ma",
      numbered: "ma5",
      lexicalTone: 0,
      surfaceTone: 0,
      neutralTone: true,
    });

    const yiNeutral = applyToneSandhi(parseNumberedPinyin("yi1ge5"));
    expect(yiNeutral.map((syllable) => syllable.surfaceTone)).toEqual([1, 0]);
  });
});
