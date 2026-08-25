import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ lookupMegaVocabulary: vi.fn() }));

vi.mock("../../content/megaLexicon", () => ({
  lookupMegaVocabulary: mocks.lookupMegaVocabulary,
}));

import {
  createReaderLookupEntry,
  hydrateReaderReferenceEntry,
  READER_REFERENCE_ENTRY_BY_SIMPLIFIED,
} from "./readerLexicon";
import { authorReaderParagraph } from "./chapterAuthoring";

const megaWord = (simplified: string, pinyin: string, meaning: string) => ({
  id: `test:${simplified}`,
  simplified,
  traditional: simplified,
  pinyin,
  pinyinNumbered: pinyin,
  meaning,
  senses: [meaning],
  classifiers: [],
  partOfSpeech: "danh từ",
  referenceLevel: "tham chiếu",
  sourceId: "test",
  editorialDepth: "reference" as const,
});

describe("Reader contextual lookup", () => {
  beforeEach(() => mocks.lookupMegaVocabulary.mockReset());

  it("keeps the reported compound 箱底 as an exact learner-friendly gloss", () => {
    expect(READER_REFERENCE_ENTRY_BY_SIMPLIFIED.get("箱底")).toMatchObject({
      pinyin: "xiāngdǐ",
      contextualMeaningVi: "đáy hộp, đáy rương",
      sourceType: "original-context-gloss",
    });
  });

  it("splits every Han character into an independent lookup target, including marked words", () => {
    const paragraph = authorReaderParagraph({
      paragraphId: "reader-test-p01",
      markedZhHans: "我有[[一个]][[朋友]]。",
      pinyin: "Wǒ yǒu yí ge péngyou.",
      vi: "Tôi có một người bạn.",
    });
    const surfaces = paragraph.segments.flatMap((segment) =>
      segment.kind === "token" ? [segment.surface] : []
    );

    expect(surfaces).toEqual(["我", "有", "一", "个", "朋", "友"]);
    expect(surfaces.every((surface) => [...surface].length === 1)).toBe(true);
    expect(READER_REFERENCE_ENTRY_BY_SIMPLIFIED.get("一")).toMatchObject({
      pinyin: "yī",
      contextualMeaningVi: "một",
    });
    expect(READER_REFERENCE_ENTRY_BY_SIMPLIFIED.get("个")).toMatchObject({
      pinyin: "gè",
      contextualMeaningVi: "cái",
      otherMeaningsVi: ["người (lượng từ phổ biến)"],
    });
  });

  it("reduces a noisy reference gloss to a short Vietnamese meaning", async () => {
    mocks.lookupMegaVocabulary.mockResolvedValue(megaWord(
      "龘",
      "dá",
      "rồng bay; cổ tự [dá2]; 龘 biến thể raw; hình rồng",
    ));

    const hydrated = await hydrateReaderReferenceEntry(createReaderLookupEntry("龘"));

    expect(hydrated).toMatchObject({
      simplified: "龘",
      pinyin: "dá",
      contextualMeaningVi: "rồng bay",
      otherMeaningsVi: ["hình rồng"],
      lookupStatus: "ready",
      sourceType: "mega-lexicon",
    });
  });
});
