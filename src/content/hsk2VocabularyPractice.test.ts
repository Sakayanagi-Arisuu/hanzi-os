import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk2VocabularyPractice,
  serializeHsk2VocabularyPractice,
} from "../../scripts/content/build-hsk2-vocabulary-practice.mjs";
import {
  assertValidHsk2VocabularyPracticeBundle,
  HSK2_VOCABULARY_PRACTICE_RELATIVE_PATH,
  loadHsk2VocabularyPracticeBundle,
  validateHsk2VocabularyPracticeBundle,
} from "./hsk2VocabularyPractice.mjs";

describe("HSK2 vocabulary-practice pack", () => {
  it("authors three distinct draft activities for all 200 vocabulary items", () => {
    const bundle = loadHsk2VocabularyPracticeBundle();
    const result = assertValidHsk2VocabularyPracticeBundle(bundle);

    expect(result.summary).toEqual({
      situationalLessons: 20,
      vocabularyDrafts: 200,
      authoredPracticeItems: 600,
      meaningRecallItems: 200,
      pinyinRecognitionItems: 200,
      listeningSelectionItems: 200,
      audioDependentItems: 200,
      reviewedAudioItems: 0,
      reviewBatches: 20,
      approvals: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      releaseEligibleItems: 0,
    });
    expect(bundle.pack.lexemes[0]).toMatchObject({
      officialId: "hsk-vocab-00301",
      sequence: 301,
      simplified: "啊",
    });
    expect(bundle.pack.lexemes[199]).toMatchObject({
      officialId: "hsk-vocab-00500",
      sequence: 500,
      simplified: "左边",
    });
  });

  it("keeps homographs separated by official identity and part of speech", () => {
    const { pack } = loadHsk2VocabularyPracticeBundle();
    const spend = pack.lexemes.find(
      (lexeme: { officialId: string }) =>
        lexeme.officialId === "hsk-vocab-00357",
    );
    const flower = pack.lexemes.find(
      (lexeme: { officialId: string }) =>
        lexeme.officialId === "hsk-vocab-00358",
    );

    expect(spend).toMatchObject({
      simplified: "花",
      officialPartOfSpeech: "动",
      vietnameseGlossDraft: "tiêu; dành tiền hoặc thời gian",
    });
    expect(flower).toMatchObject({
      simplified: "花",
      officialPartOfSpeech: "名、（形）",
      vietnameseGlossDraft: "hoa",
    });
  });

  it("keeps synthetic listening and automatic items out of mastery", () => {
    const { pack } = loadHsk2VocabularyPracticeBundle();
    const listeningItems = pack.practiceItems.filter(
      (item: { kind: string }) => item.kind === "listening-selection",
    );

    expect(listeningItems).toHaveLength(200);
    expect(listeningItems.every(
      (item: {
        audio: null;
        ttsDisclosure: string;
        measurementEligible: boolean;
        masteryEligible: boolean;
      }) =>
        item.audio === null
        && item.ttsDisclosure === "synthetic-browser-voice"
        && item.measurementEligible === false
        && item.masteryEligible === false,
    )).toBe(true);
  });

  it("fails closed on gloss, options or visibility drift", () => {
    const bundle = loadHsk2VocabularyPracticeBundle();
    const pack = structuredClone(bundle.pack);
    pack.learnerVisible = true;
    pack.lexemes[0].vietnameseGlossDraft = "";
    const pinyinItem = pack.practiceItems.find(
      (item: { kind: string }) => item.kind === "pinyin-recognition",
    );
    pinyinItem.options[0] = pinyinItem.correctAnswer;

    const result = validateHsk2VocabularyPracticeBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK2 vocabulary practice must remain learner-hidden draft",
      "hsk-vocab-00301 source, lesson or gloss binding is invalid",
    ]));
    expect(result.errors.some(
      (error) => error.endsWith("pinyin options are invalid"),
    )).toBe(true);
  });

  it("keeps the generated vocabulary-practice artifact deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK2_VOCABULARY_PRACTICE_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk2VocabularyPractice(buildHsk2VocabularyPractice()),
    );
  });
});
