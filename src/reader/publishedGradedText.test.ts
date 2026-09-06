import { describe, expect, it } from "vitest";
import { studioGradedTextSeriesId } from "../content/gradedTextIdentity";
import {
  parsePublishedGradedText,
  publishedGradedTextToChapter,
  publishedGradedTextToSeries,
} from "./publishedGradedText";

const stableKey = "hsk0.graded_text.ngay-dau-tien-fixture01";
const seriesId = studioGradedTextSeriesId(stableKey);
const content = {
  readerSeriesId: seriesId,
  titleZh: "第一天",
  summaryVi: "Một cuộc gặp trong ngày đầu đi học.",
  estimatedMinutes: 4,
  sourceLessonIds: ["boot-2"],
  sentences: [
    { hanzi: "今天是第一天。", pinyin: "Jīntiān shì dì-yī tiān.", meaningVi: "Hôm nay là ngày đầu tiên." },
    { hanzi: "老师说你好。", pinyin: "Lǎoshī shuō nǐ hǎo.", meaningVi: "Giáo viên nói xin chào." },
  ],
  comprehension: [{
    promptVi: "Ai nói xin chào?",
    answer: "Giáo viên",
    distractors: ["Học sinh", "Người bán hàng"],
    explanationVi: "Câu thứ hai bắt đầu bằng 老师说.",
  }],
  rights: {
    sourceKind: "original-hanzi-os",
    textProvenanceVi: "Bản thảo nguyên bản do đội HANZI.OS soạn.",
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
};

const parse = (overrides: Record<string, unknown> = {}) => parsePublishedGradedText({
  stableKey,
  title: "Ngày đầu tiên",
  level: "hsk0",
  contentSha256: "a".repeat(64),
  content: { ...content, ...overrides },
});

describe("published graded text Reader projection", () => {
  it("projects one stable short-reading series and a question-bearing chapter", () => {
    const parsed = parse();
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const series = publishedGradedTextToSeries(parsed.record);
    const chapterId = `${seriesId}-c01`;
    const chapter = publishedGradedTextToChapter(parsed.record, chapterId);
    expect(series).toMatchObject({
      seriesId,
      levelBand: { min: "HSK0", max: "HSK0" },
      humanReviewed: false,
    });
    expect(series.volumes[0]?.chapters[0]).toMatchObject({
      chapterId,
      comprehensionCount: 1,
    });
    expect(series.volumes[0]?.chapters[0]).not.toHaveProperty("comprehension");
    expect(chapter?.paragraphs).toHaveLength(2);
    expect(chapter?.comprehension?.[0]).toMatchObject({
      questionId: `${chapterId}-q01`,
      promptVi: "Ai nói xin chào?",
    });
    const question = chapter!.comprehension![0]!;
    expect(question.options[question.answerIndex]).toBe("Giáo viên");
  });

  it("keeps route identity stable while content digest changes the version", () => {
    const first = parse();
    const second = parsePublishedGradedText({
      stableKey,
      title: "Ngày đầu tiên",
      level: "hsk0",
      contentSha256: "b".repeat(64),
      content,
    });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    const firstSeries = publishedGradedTextToSeries(first.record);
    const secondSeries = publishedGradedTextToSeries(second.record);
    expect(secondSeries.seriesId).toBe(firstSeries.seriesId);
    expect(secondSeries.version).not.toBe(firstSeries.version);
  });

  it("fails closed for a forged route id, missing provenance, or duplicate options", () => {
    expect(parse({ readerSeriesId: "studio-text-ffffffffffffffff" }).ok).toBe(false);
    expect(parse({ rights: { sourceKind: "original-hanzi-os", textProvenanceVi: "", editorAttestsRights: false } }).ok).toBe(false);
    expect(parse({
      comprehension: [{
        ...content.comprehension[0],
        distractors: ["Học sinh", "Học sinh"],
      }],
    }).ok).toBe(false);
  });
});
