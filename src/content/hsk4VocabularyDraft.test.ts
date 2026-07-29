import { describe, expect, it } from "vitest";
import {
  assertValidHsk4VocabularyDraftBundle,
  loadHsk4VocabularyDraftBundle,
  validateHsk4VocabularyDraftBundle,
} from "./hsk4VocabularyDraft.mjs";

describe("HSK4 CC-CEDICT source-enrichment draft", () => {
  it("pins all 1,000 official vocabulary items without publishing them", () => {
    const bundle = loadHsk4VocabularyDraftBundle();
    const result = assertValidHsk4VocabularyDraftBundle(bundle);

    expect(result.counts).toMatchObject({
      officialVocabulary: 1_000,
      sourceMatched: 999,
      vietnameseGlossReviewed: 0,
      releaseEligible: 0,
    });
    expect(bundle.draft.entries[0]).toMatchObject({
      officialId: "hsk-vocab-01001",
      sequence: 1_001,
    });
    expect(bundle.draft.entries[999]).toMatchObject({
      officialId: "hsk-vocab-02000",
      sequence: 2_000,
    });
    expect(bundle.draft.entries[533]).toMatchObject({
      officialId: "hsk-vocab-01534",
      simplified: "嗯",
      officialPinyin: "ǹg",
      sourceMatches: [],
      editorial: {
        issueCodes: ["source-coverage-gap"],
      },
    });
    expect(bundle.draft).toMatchObject({
      level: 4,
      state: "draft",
      learnerVisible: false,
      releaseEligible: false,
    });
  });

  it("fails closed on source, pronunciation or visibility drift", () => {
    const bundle = loadHsk4VocabularyDraftBundle();
    const descriptor = structuredClone(bundle.descriptor);
    const draft = structuredClone(bundle.draft);
    descriptor.archive.sha256 = "sha256:invalid";
    draft.entries[0].sourceMatches[0].numberedPinyin = "ba4";
    draft.learnerVisible = true;

    const result = validateHsk4VocabularyDraftBundle({
      ...bundle,
      descriptor,
      draft,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK4 Debian archive and payload identities must remain pinned",
      "HSK4 source enrichment must remain draft and learner-hidden",
      "hsk-vocab-01001.sourceMatches[0].pinyin is not an exact official pronunciation",
    ]));
  });
});
