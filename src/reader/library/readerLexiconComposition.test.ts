import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ lookupMegaVocabulary: vi.fn() }));

vi.mock("../../content/megaLexicon", () => ({
  lookupMegaVocabulary: mocks.lookupMegaVocabulary,
}));

import {
  createReaderLookupEntry,
  hydrateReaderReferenceEntry,
  READER_REFERENCE_ENTRY_BY_SIMPLIFIED,
} from "./readerLexicon";

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
  it("keeps the reported compound 箱底 as an exact learner-friendly gloss", () => {
    expect(READER_REFERENCE_ENTRY_BY_SIMPLIFIED.get("箱底")).toMatchObject({
      pinyin: "xiāngdǐ",
      contextualMeaningVi: "đáy hộp, đáy rương",
      sourceType: "original-context-gloss",
    });
  });

  it("resolves an unknown compound from known characters without treating the paragraph as its meaning", async () => {
    mocks.lookupMegaVocabulary.mockImplementation(async (surface: string) => {
      if (surface === "柜") return megaWord("柜", "guì", "tủ; quầy");
      if (surface === "角") return megaWord("角", "jiǎo", "góc; sừng");
      return null;
    });
    const contextVi = "Ở góc tủ có một tấm thẻ đen chưa từng xuất hiện.";
    const hydrated = await hydrateReaderReferenceEntry(createReaderLookupEntry("柜角", contextVi));

    expect(hydrated).toMatchObject({
      simplified: "柜角",
      pinyin: "guì jiǎo",
      lookupStatus: "composed",
      sourceType: "mega-lexicon-composed",
      contextVi,
    });
    expect(hydrated.components).toHaveLength(2);
    expect(hydrated.contextualMeaningVi).toContain("柜 (tủ; quầy)");
    expect(hydrated.contextualMeaningVi).not.toContain(contextVi);
  });
});
