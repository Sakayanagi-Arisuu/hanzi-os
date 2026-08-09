import { describe, expect, it } from "vitest";
import { findHanziCandidates, normalizePinyinInput } from "./HanziPinyinInput";

describe("HANZI.OS pinyin input", () => {
  it("normalizes marks, tone numbers and Windows v-for-umlaut input", () => {
    expect(normalizePinyinInput("rén2")).toBe("ren");
    expect(normalizePinyinInput("nV3")).toBe("nü");
    expect(normalizePinyinInput("lü4")).toBe("lü");
  });

  it("searches the released vocabulary without receiving an answer", () => {
    const candidates = findHanziCandidates("ren");
    expect(candidates.some((item) => item.hanzi === "人")).toBe(true);
    expect(candidates.every((item) => item.pinyin && item.meaning)).toBe(true);
  });

  it("prioritizes exact pinyin before longer matches", () => {
    const candidates = findHanziCandidates("ren");
    const exact = candidates.findIndex((item) => normalizePinyinInput(item.pinyin) === "ren");
    const longer = candidates.findIndex((item) => normalizePinyinInput(item.pinyin).length > 3);
    expect(exact).toBeGreaterThanOrEqual(0);
    if (longer >= 0) expect(exact).toBeLessThan(longer);
  });
});
