import { describe, expect, it } from "vitest";
import {
  editorialBookToChapter,
  editorialBookToSeries,
  editorialBookToStudioLesson,
  parseEditorialReaderBook,
  type EditorialReaderBook,
} from "./editorialReaderContent";

const book: EditorialReaderBook = {
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

describe("Vạn Quyển Các editorial storefront", () => {
  it("projects a governed book into a catalog series and fully lookupable chapter", () => {
    expect(parseEditorialReaderBook(book)).toMatchObject({ ok: true });
    const series = editorialBookToSeries(book);
    expect(series).toMatchObject({ seriesId: book.seriesId, discoverable: true, humanReviewed: false });
    const chapter = editorialBookToChapter(book, "thanh-pho-thu-nghiem-c01");
    expect(chapter?.paragraphs).toHaveLength(2);
    chapter?.paragraphs.forEach((paragraph) => {
      expect(paragraph.segments.filter((segment) => segment.kind === "text")
        .every((segment) => !/\p{Script=Han}/u.test(segment.text))).toBe(true);
    });
    expect(editorialBookToStudioLesson(book)).toMatchObject({
      contentKind: "reader-series",
      review: { humanReviewed: false },
    });
  });

  it("fails closed without provenance or aligned bilingual paragraphs", () => {
    const invalid = structuredClone(book) as unknown as Record<string, unknown>;
    const rights = invalid.rights as Record<string, unknown>;
    rights.editorAttestsRights = false;
    const chapters = invalid.chapters as Array<Record<string, unknown>>;
    chapters[0]!.paragraphs = [{ zhHans: "只有中文", pinyin: "", vi: "" }];
    const parsed = parseEditorialReaderBook(invalid);
    expect(parsed.ok).toBe(false);
    expect(parsed.errors.join(" ")).toContain("provenance");
    expect(parsed.errors.join(" ")).toContain("2 đến 40 đoạn");
  });
});
