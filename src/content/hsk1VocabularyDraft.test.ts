import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertValidHsk1VocabularyDraftBundle,
  loadHsk1VocabularyDraftBundle,
  numberedPinyinToMarked,
  numberedPinyinToStandardSandhiMarked,
  validateHsk1VocabularyDraftBundle,
} from "./hsk1VocabularyDraft.mjs";
import {
  buildHsk1ContentBacklogReport,
  HSK1_CONTENT_BACKLOG_REPORT_RELATIVE_PATH,
  serializeHsk1ContentBacklogReport,
} from "../../scripts/content/report-hsk1-content-backlog.mjs";

describe("HSK1 CC-CEDICT source-enrichment draft", () => {
  it("pins all 300 official vocabulary items without publishing them", () => {
    const bundle = loadHsk1VocabularyDraftBundle();
    const result = assertValidHsk1VocabularyDraftBundle(bundle);

    expect(result.counts).toMatchObject({
      officialVocabulary: 300,
      sourceMatched: 300,
      vietnameseGlossReviewed: 0,
      releaseEligible: 0,
    });
    expect(bundle.draft.entries[0]).toMatchObject({
      officialId: "hsk-vocab-00001",
      simplified: "爱",
      officialPinyin: "ài",
    });
    expect(bundle.draft.entries[299]).toMatchObject({
      officialId: "hsk-vocab-00300",
      sequence: 300,
    });
    expect(bundle.draft.entries.every(
      (entry: { editorial: { vietnameseGloss: null } }) =>
        entry.editorial.vietnameseGloss === null,
    )).toBe(true);
    expect(bundle.draft).toMatchObject({
      state: "draft",
      learnerVisible: false,
      releaseEligible: false,
    });
  });

  it("normalizes numbered pinyin including neutral tones and u-umlaut", () => {
    expect(numberedPinyinToMarked("nu:3 peng2 you5")).toBe("nǚpéngyou");
    expect(numberedPinyinToMarked("shei2")).toBe("shéi");
    expect(numberedPinyinToMarked("ba5")).toBe("ba");
    expect(numberedPinyinToStandardSandhiMarked("bu4 ke4 qi5"))
      .toBe("búkèqi");
  });

  it("fails closed on pronunciation drift or premature publication", () => {
    const bundle = loadHsk1VocabularyDraftBundle();
    const draft = structuredClone(bundle.draft);
    draft.entries[0].sourceMatches[0].numberedPinyin = "ai3";
    draft.learnerVisible = true;

    const result = validateHsk1VocabularyDraftBundle({
      ...bundle,
      draft,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK1 source enrichment must remain draft and learner-hidden",
      "hsk-vocab-00001.sourceMatches[0].pinyin is not an exact official pronunciation",
    ]));
  });

  it("reports source readiness separately from learner-ready coverage", () => {
    const report = buildHsk1ContentBacklogReport();

    expect(report.coverage).toEqual({
      officialVocabulary: 300,
      dictionaryMatched: 300,
      englishSourceSenseReady: 300,
      authoringScoped: 300,
      vietnameseGlossDrafted: 300,
      lessonBlueprintVocabularyMapped: 300,
      vocabularyPracticeDrafted: 300,
      recognitionCharactersDraftMapped: 246,
      characterPracticeDrafted: 246,
      charactersWithPinnedStrokeMetadata: 0,
      grammarRowsDraftMapped: 66,
      grammarPracticeDrafted: 66,
      pronunciationCompatible: 297,
      vietnameseGlossReviewed: 0,
      lessonMapped: 23,
      learnerVisible: 0,
      releaseEligible: 0,
    });
    expect(report.claims).toMatchObject({
      hsk1VocabularyComplete: false,
      hsk1Complete: false,
    });
    expect(report.editorialQueue).toMatchObject({
      machineDraftGlossReviewPending: 300,
      draftLessonBlueprints: 25,
      draftDialogueTurns: 102,
      authoredPracticeItems: 900,
      pendingReviewBatches: 25,
      draftCharacterLessons: 15,
      authoredCharacterPracticeItems: 492,
      pendingCharacterReviewBatches: 15,
      draftGrammarModelExamples: 66,
      authoredGrammarPracticeItems: 66,
      pendingGrammarReviewBatches: 20,
    });
    expect(report.editorialQueue.pronunciationReviewItems).toEqual([
      {
        officialId: "hsk-vocab-00137",
        simplified: "那边",
        officialPinyin: "nàbiān",
        sourceNumberedPinyin: ["na4 bian5"],
      },
      {
        officialId: "hsk-vocab-00139",
        simplified: "那里",
        officialPinyin: "nàlǐ",
        sourceNumberedPinyin: ["na4 li5"],
      },
      {
        officialId: "hsk-vocab-00248",
        simplified: "学生",
        officialPinyin: "xuéshēng",
        sourceNumberedPinyin: ["xue2 sheng5"],
      },
    ]);
  });

  it("keeps the checked backlog report deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK1_CONTENT_BACKLOG_REPORT_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk1ContentBacklogReport(buildHsk1ContentBacklogReport()),
    );
  });
});
