import { describe, expect, it } from "vitest";
import { studioGradedTextSeriesId } from "../../content/gradedTextIdentity";
import {
  parsePublishedGradedText,
  publishedGradedTextToChapter,
} from "../publishedGradedText";
import {
  completeReaderChapter,
  createEmptyReaderProgress,
  parseReaderProgress,
  readerComprehensionState,
  recordReaderComprehensionAttempt,
} from "./readerProgress";

const stableKey = "hsk1.graded_text.progress-fixture";
const seriesId = studioGradedTextSeriesId(stableKey);
const parsed = parsePublishedGradedText({
  stableKey,
  title: "Bài đọc lưu tiến độ",
  level: "hsk1",
  contentSha256: "c".repeat(64),
  content: {
    readerSeriesId: seriesId,
    titleZh: "阅读记录",
    summaryVi: "Kiểm tra lưu câu trả lời dở dang.",
    estimatedMinutes: 3,
    sourceLessonIds: ["boot-2"],
    sentences: [
      { hanzi: "小安去学校。", pinyin: "Xiǎo Ān qù xuéxiào.", meaningVi: "Tiểu An đi học." },
      { hanzi: "她坐公共汽车。", pinyin: "Tā zuò gōnggòng qìchē.", meaningVi: "Cô ấy đi xe buýt." },
    ],
    comprehension: [{
      promptVi: "Tiểu An đi bằng gì?",
      answer: "Xe buýt",
      distractors: ["Tàu điện", "Xe đạp"],
      explanationVi: "公共汽车 nghĩa là xe buýt.",
    }],
    rights: {
      sourceKind: "original-hanzi-os",
      textProvenanceVi: "Bản thử nguyên bản của HANZI.OS.",
      editorAttestsRights: true,
    },
    review: {
      humanReviewed: false,
      aiSelfReview: {
        accuracy: true,
        levelFit: true,
        pedagogy: true,
        answerIntegrity: true,
        originality: true,
      },
    },
  },
});

if (!parsed.ok) throw new Error(parsed.errors.join("\n"));
const chapter = publishedGradedTextToChapter(parsed.record, `${seriesId}-c01`)!;
const question = chapter.comprehension![0]!;
const scope = { ownerKey: "anonymous:reader-quiz", ownerGeneration: 1, resetEpoch: 0 };

describe("Reader short-text comprehension progress", () => {
  it("persists the first attempt, answer exposure, retry, and completion idempotently", () => {
    const empty = createEmptyReaderProgress(scope, "2026-08-27T08:00:00.000Z");
    const wrongAnswer = question.options.find((option) => option !== question.options[question.answerIndex])!;
    const wrong = recordReaderComprehensionAttempt({
      document: empty,
      chapter,
      question,
      selectedAnswer: wrongAnswer,
      now: "2026-08-27T08:01:00.000Z",
    });
    expect(readerComprehensionState(wrong, chapter)).toMatchObject({
      answered: 1,
      correct: 0,
      firstAttemptCorrect: 0,
      answerExposed: true,
      complete: false,
    });

    const restored = parseReaderProgress(structuredClone(wrong), scope);
    const corrected = recordReaderComprehensionAttempt({
      document: restored,
      chapter,
      question,
      selectedAnswer: question.options[question.answerIndex]!,
      now: "2026-08-27T08:02:00.000Z",
    });
    expect(readerComprehensionState(corrected, chapter)).toMatchObject({
      correct: 1,
      firstAttemptCorrect: 0,
      answerExposed: true,
      complete: true,
    });
    expect(corrected.chapters[chapter.chapterId]?.comprehensionAttempts?.[question.questionId])
      .toMatchObject({ attemptCount: 2, firstAttemptCorrect: false });

    const completed = completeReaderChapter(corrected, chapter, "2026-08-27T08:03:00.000Z");
    const replay = completeReaderChapter(completed, chapter, "2026-08-28T08:03:00.000Z");
    expect(replay.chapters[chapter.chapterId]?.completedAt).toBe("2026-08-27T08:03:00.000Z");
    expect(readerComprehensionState(replay, chapter).complete).toBe(true);
  });

  it("does not reuse unfinished answers after the published content version changes", () => {
    const answered = recordReaderComprehensionAttempt({
      document: createEmptyReaderProgress(scope),
      chapter,
      question,
      selectedAnswer: question.options[question.answerIndex]!,
    });
    const revisedChapter = { ...chapter, version: `${chapter.version}:revision-2` };
    expect(readerComprehensionState(answered, revisedChapter)).toMatchObject({
      answered: 0,
      complete: false,
    });
  });
});
