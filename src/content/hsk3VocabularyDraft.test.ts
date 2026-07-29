import { describe, expect, it } from "vitest";
import {
  assertValidHsk3VocabularyDraftBundle,
  loadHsk3VocabularyDraftBundle,
  validateHsk3VocabularyDraftBundle,
} from "./hsk3VocabularyDraft.mjs";

describe("HSK3 CC-CEDICT source-enrichment draft", () => {
  it("pins all 500 official vocabulary items without publishing them", () => {
    const bundle = loadHsk3VocabularyDraftBundle();
    const result = assertValidHsk3VocabularyDraftBundle(bundle);

    expect(result.counts).toMatchObject({
      officialVocabulary: 500,
      sourceMatched: 500,
      vietnameseGlossReviewed: 0,
      releaseEligible: 0,
    });
    expect(bundle.draft.entries[0]).toMatchObject({
      officialId: "hsk-vocab-00501",
      sequence: 501,
    });
    expect(bundle.draft.entries[499]).toMatchObject({
      officialId: "hsk-vocab-01000",
      sequence: 1000,
    });
    expect(bundle.draft).toMatchObject({
      level: 3,
      state: "draft",
      learnerVisible: false,
      releaseEligible: false,
    });
  });

  it("fails closed on source, pronunciation or visibility drift", () => {
    const bundle = loadHsk3VocabularyDraftBundle();
    const descriptor = structuredClone(bundle.descriptor);
    const draft = structuredClone(bundle.draft);
    descriptor.archive.sha256 = "sha256:invalid";
    draft.entries[0].sourceMatches[0].numberedPinyin = "ba4";
    draft.learnerVisible = true;

    const result = validateHsk3VocabularyDraftBundle({
      ...bundle,
      descriptor,
      draft,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK3 Debian archive and payload identities must remain pinned",
      "HSK3 source enrichment must remain draft and learner-hidden",
      "hsk-vocab-00501.sourceMatches[0].pinyin is not an exact official pronunciation",
    ]));
  });
});
