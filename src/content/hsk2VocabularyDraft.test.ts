import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertValidHsk2VocabularyDraftBundle,
  loadHsk2VocabularyDraftBundle,
  validateHsk2VocabularyDraftBundle,
} from "./hsk2VocabularyDraft.mjs";
import {
  buildHsk2ContentBacklogReport,
  HSK2_CONTENT_BACKLOG_REPORT_RELATIVE_PATH,
  serializeHsk2ContentBacklogReport,
} from "../../scripts/content/report-hsk2-content-backlog.mjs";

describe("HSK2 CC-CEDICT source-enrichment draft", () => {
  it("pins all 200 official vocabulary items without publishing them", () => {
    const bundle = loadHsk2VocabularyDraftBundle();
    const result = assertValidHsk2VocabularyDraftBundle(bundle);

    expect(result.counts).toEqual({
      officialVocabulary: 200,
      sourceMatched: 200,
      sourceMatches: 232,
      multipleSourceMatchEntries: 26,
      pronunciationReviewPending: 6,
      vietnameseGlossReviewed: 0,
      releaseEligible: 0,
    });
    expect(bundle.draft.entries[0]).toMatchObject({
      officialId: "hsk-vocab-00301",
      sequence: 301,
    });
    expect(bundle.draft.entries[199]).toMatchObject({
      officialId: "hsk-vocab-00500",
      sequence: 500,
    });
    expect(bundle.draft).toMatchObject({
      level: 2,
      state: "draft",
      learnerVisible: false,
      releaseEligible: false,
    });
  });

  it("fails closed on source, pronunciation or visibility drift", () => {
    const bundle = loadHsk2VocabularyDraftBundle();
    const descriptor = structuredClone(bundle.descriptor);
    const draft = structuredClone(bundle.draft);
    descriptor.archive.sha256 = "sha256:invalid";
    draft.entries[0].sourceMatches[0].numberedPinyin = "ba4";
    draft.learnerVisible = true;

    const result = validateHsk2VocabularyDraftBundle({
      ...bundle,
      descriptor,
      draft,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK2 Debian archive and payload identities must remain pinned",
      "HSK2 source enrichment must remain draft and learner-hidden",
      "hsk-vocab-00301.sourceMatches[0].pinyin is not an exact official pronunciation",
    ]));
  });

  it("reports the exact editorial queue without claiming coverage", () => {
    const report = buildHsk2ContentBacklogReport();

    expect(report.coverage).toEqual({
      officialVocabulary: 200,
      dictionaryMatched: 200,
      englishSourceSenseReady: 200,
      authoringScoped: 200,
      vietnameseGlossDrafted: 200,
      lessonBlueprintVocabularyMapped: 200,
      vocabularyPracticeDrafted: 200,
      recognitionCharactersDraftMapped: 125,
      characterPracticeDrafted: 125,
      charactersWithVocabularyContext: 124,
      charactersWithPinnedStrokeMetadata: 0,
      grammarRowsDraftMapped: 75,
      tasksScenarioDraftMapped: 17,
      topicsPromptDraftMapped: 34,
      pronunciationCompatible: 194,
      vietnameseGlossReviewed: 0,
      lessonMapped: 0,
      learnerVisible: 0,
      releaseEligible: 0,
    });
    expect(report.editorialQueue).toMatchObject({
      multipleSourceMatches: 26,
      pronunciationReviewPending: 6,
      definitionReviewPending: 200,
      partOfSpeechReviewPending: 200,
      usageExampleReviewPending: 200,
      machineDraftGlossReviewPending: 200,
      plannedLessonBlueprints: 40,
      draftLessonBlueprints: 40,
      pendingBlueprintReviewBatches: 40,
      blueprintApprovals: 0,
      authoredPracticeItems: 600,
      authoredAssessmentPrompts: 0,
      draftVocabularyLessons: 20,
      pendingVocabularyReviewBatches: 20,
      vocabularyPracticeApprovals: 0,
      audioDependentVocabularyItems: 200,
      reviewedVocabularyAudioItems: 0,
      authoredCharacterPracticeItems: 250,
      pendingCharacterReviewBatches: 10,
      characterPracticeApprovals: 0,
      characterContextGaps: [{
        officialCharacterId: "hsk2-character-050",
        character: "留",
      }],
    });
    expect(report.claims).toMatchObject({
      hsk2VocabularyComplete: false,
      hsk2Complete: false,
    });
  });

  it("keeps the checked backlog report deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK2_CONTENT_BACKLOG_REPORT_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk2ContentBacklogReport(buildHsk2ContentBacklogReport()),
    );
  });
});
