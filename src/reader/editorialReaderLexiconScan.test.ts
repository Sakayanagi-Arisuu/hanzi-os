import { describe, expect, it, vi } from "vitest";
import {
  editorialReaderContentFingerprint,
  scanEditorialReaderVocabulary,
} from "./editorialReaderLexiconScan";

const chapters = [{
  titleZh: "第一章",
  titleVi: "Chương một",
  hookVi: "Mở cửa.",
  estimatedMinutes: 3,
  paragraphs: [
    { zhHans: "我有一个朋友。", pinyin: "Wǒ yǒu yí ge péngyou.", vi: "Tôi có một người bạn." },
    { zhHans: "朋友打开门。", pinyin: "Péngyou dǎkāi mén.", vi: "Người bạn mở cửa." },
  ],
}];

describe("editorial Reader lexicon preflight", () => {
  it("scans unique characters and candidate words without claiming AI review", async () => {
    const covered = new Set(["我", "有", "一", "个", "朋", "友", "打", "开", "门", "一个", "朋友", "打开"]);
    const lookup = vi.fn(async (surface: string) => covered.has(surface));
    const report = await scanEditorialReaderVocabulary(
      chapters,
      lookup,
      "2026-08-25T10:00:00.000Z",
    );

    expect(report).toMatchObject({
      contentFingerprint: editorialReaderContentFingerprint(chapters),
      characterCount: 11,
      uniqueCharacterCount: 9,
      coveredCharacterCount: 9,
      missingCharacters: [],
      aiAssisted: false,
      humanReviewed: false,
    });
    expect(report.candidateWordCount).toBeGreaterThan(0);
    expect(report.coveredWordCount).toBeLessThanOrEqual(report.candidateWordCount);
    expect(lookup).toHaveBeenCalledWith("朋");
  });

  it("reports missing characters and changes the fingerprint when text changes", async () => {
    const report = await scanEditorialReaderVocabulary(chapters, async (surface) => surface !== "门");
    const changed = structuredClone(chapters);
    changed[0]!.paragraphs[0]!.zhHans = "我有两个朋友。";

    expect(report.missingCharacters).toEqual(["门"]);
    expect(editorialReaderContentFingerprint(changed)).not.toBe(report.contentFingerprint);
  });
});
