import { describe, expect, it } from "vitest";
import type { D1Database } from "./d1";
import { EditorialReaderRepository } from "./editorialReaderRepository";
import { studioGradedTextSeriesId } from "../content/gradedTextIdentity";

const publishedBook = {
  schemaVersion: 1,
  seriesId: "thanh-pho-thu-nghiem",
  titleZh: "试验城市",
  titleVi: "Thành Phố Thử Nghiệm",
  synopsisVi: "Một biên tập viên thử luồng phát hành sách nguyên bản.",
  hookVi: "Cánh cửa chỉ mở sau khi revision được phê duyệt.",
  genreIds: ["Bí ẩn"],
  shelfId: "bi-an",
  levelBand: { min: "HSK2", max: "HSK3", label: "HSK2–3 · độ khó gợi ý" },
  cover: { src: "/reader/covers/editorial/test.webp", altVi: "Thành phố dưới ánh đèn", tone: "jade" },
  chapters: [{
    titleZh: "门后的光",
    titleVi: "Ánh sáng sau cửa",
    hookVi: "Một dấu hiệu mới xuất hiện.",
    estimatedMinutes: 5,
    paragraphs: [
      { zhHans: "城市的门慢慢打开。", pinyin: "Chéngshì de mén mànmàn dǎkāi.", vi: "Cánh cửa thành phố từ từ mở." },
      { zhHans: "里面有一张新的地图。", pinyin: "Lǐmiàn yǒu yì zhāng xīn de dìtú.", vi: "Bên trong có một tấm bản đồ mới." },
    ],
  }],
  rights: {
    textProvenanceVi: "Bản thảo nguyên bản của biên tập viên.",
    coverProvenanceVi: "Bìa nguyên bản có quyền sử dụng.",
    editorAttestsRights: true,
  },
  humanReviewed: false,
};

const contentJson = JSON.stringify({ contentKind: "reader-series", readerSeries: publishedBook });

describe("Editorial Reader published projection", () => {
  it("queries published revisions only and drops malformed content", async () => {
    let query = "";
    const database = {
      prepare(sql: string) {
        query = sql;
        return {
          async all() {
            return {
              success: true,
              results: [
                { stableKey: "reader.series.thanh-pho-thu-nghiem", contentJson },
                { stableKey: "reader.series.broken", contentJson: "{" },
                { stableKey: "reader.series.other", contentJson: JSON.stringify({ contentKind: "lesson" }) },
              ],
            };
          },
        };
      },
    } as unknown as D1Database;

    const series = await new EditorialReaderRepository(database).listPublishedSeries();
    expect(query).toContain("r.workflow_state = 'published'");
    expect(query).toContain("i.stable_key LIKE 'reader.series.%'");
    expect(series).toHaveLength(1);
    expect(series[0]).toMatchObject({ seriesId: publishedBook.seriesId, discoverable: true });
  });

  it("binds a stable series key and projects only a requested chapter", async () => {
    let bound: unknown[] = [];
    let query = "";
    const database = {
      prepare(sql: string) {
        query = sql;
        return {
          bind(...values: unknown[]) {
            bound = values;
            return this;
          },
          async first() {
            return { stableKey: "reader.series.thanh-pho-thu-nghiem", contentJson };
          },
        };
      },
    } as unknown as D1Database;

    const repository = new EditorialReaderRepository(database);
    const chapter = await repository.getPublishedChapter(
      publishedBook.seriesId,
      "thanh-pho-thu-nghiem-c01",
    );
    expect(query).toContain("r.workflow_state = 'published'");
    expect(bound).toEqual(["reader.series.thanh-pho-thu-nghiem"]);
    expect(chapter).toMatchObject({
      seriesId: publishedBook.seriesId,
      chapterId: "thanh-pho-thu-nghiem-c01",
    });
    expect(chapter?.paragraphs).toHaveLength(2);
  });

  it("projects a published graded_text and resolves its stable Reader chapter", async () => {
    const stableKey = "hsk1.graded_text.ngay-dau-fixture";
    const seriesId = studioGradedTextSeriesId(stableKey);
    const gradedRow = {
      stableKey,
      itemType: "graded_text",
      title: "Ngày đầu tiên",
      level: "hsk1",
      contentSha256: "d".repeat(64),
      contentJson: JSON.stringify({
        readerSeriesId: seriesId,
        titleZh: "第一天",
        summaryVi: "Một cuộc gặp ngắn trong ngày đầu đi học.",
        estimatedMinutes: 4,
        sourceLessonIds: ["boot-2"],
        sentences: [
          { hanzi: "今天是第一天。", pinyin: "Jīntiān shì dì-yī tiān.", meaningVi: "Hôm nay là ngày đầu." },
          { hanzi: "老师说你好。", pinyin: "Lǎoshī shuō nǐ hǎo.", meaningVi: "Giáo viên nói xin chào." },
        ],
        comprehension: [{
          promptVi: "Ai nói xin chào?",
          answer: "Giáo viên",
          distractors: ["Học sinh", "Người bán hàng"],
          explanationVi: "Câu thứ hai có 老师.",
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
      }),
    };
    const database = {
      prepare(sql: string) {
        return {
          bind() { return this; },
          async first() {
            if (sql.includes("i.stable_key = ?")) return null;
            if (sql.includes("json_extract(r.content_json, '$.readerSeriesId') = ?")) return gradedRow;
            return null;
          },
          async all() { return { success: true, results: [] }; },
        };
      },
    } as unknown as D1Database;

    const chapter = await new EditorialReaderRepository(database)
      .getPublishedChapter(seriesId, `${seriesId}-c01`);
    expect(chapter).toMatchObject({
      seriesId,
      chapterId: `${seriesId}-c01`,
      relatedLessonIds: ["boot-2"],
    });
    expect(chapter?.comprehension).toHaveLength(1);
  });
});
