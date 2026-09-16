import { describe, expect, it } from "vitest";
import {
  editorialBookToChapter,
  editorialBookToSeries,
  editorialBookToStudioLesson,
  parseEditorialReaderBook,
  type EditorialReaderBook,
} from "./editorialReaderContent";
import { scanEditorialReaderVocabulary } from "./editorialReaderLexiconScan";
import { validateStudioContent } from "../content/studioContent";
import { createEmptyReaderProgress, readerComprehensionState, recordReaderComprehensionAttempt } from "./library/readerProgress";

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
    background: {
      src: "/reader/backgrounds/editorial/thanh-pho-thu-nghiem-c01.webp",
      altVi: "Một cánh cửa sáng trong thành phố mưa",
      focalPoint: "right",
    },
    paragraphs: [
      { zhHans: "城市的门慢慢打开。", pinyin: "Chéngshì de mén mànmàn dǎkāi.", vi: "Cánh cửa thành phố từ từ mở." },
      { zhHans: "里面有一张新的地图。", pinyin: "Lǐmiàn yǒu yì zhāng xīn de dìtú.", vi: "Bên trong có một tấm bản đồ mới." },
    ],
  }],
  rights: {
    textProvenanceVi: "Bản thảo nguyên bản của biên tập viên.",
    coverProvenanceVi: "Bìa nguyên bản có quyền sử dụng.",
    backgroundProvenanceVi: "Nền chương nguyên bản có quyền sử dụng.",
    editorAttestsRights: true,
  },
  humanReviewed: false,
};

describe("Vạn Quyển Các editorial storefront", () => {
  it("publishes authored questions and invalidates answers only when learning content changes", () => {
    const authored = structuredClone(book);
    authored.chapters[0]!.comprehension = [{ questionId: "map", promptVi: "Bên trong có gì?", options: ["Bản đồ", "Bức thư", "Chiếc chìa khóa"], answerIndex: 0, explanationVi: "Đoạn 2 nói có một tấm bản đồ mới." }];
    expect(parseEditorialReaderBook(authored).ok).toBe(true);
    const chapterId = `${book.seriesId}-c01`;
    const chapter = editorialBookToChapter(authored, chapterId)!;
    expect(editorialBookToSeries(authored).volumes[0]!.chapters[0]!.comprehensionCount).toBe(1);
    const progress = recordReaderComprehensionAttempt({ document: createEmptyReaderProgress({ ownerKey: "anonymous:editor-test", ownerGeneration: 1, resetEpoch: 0 }), chapter, question: chapter.comprehension![0]!, selectedAnswer: "Bản đồ" });
    expect(readerComprehensionState(progress, chapter).complete).toBe(true);
    authored.chapters[0]!.background!.altVi = "Nền đã đổi mô tả";
    expect(editorialBookToChapter(authored, chapterId)!.version).toBe(chapter.version);
    authored.chapters[0]!.comprehension![0]!.answerIndex = 1;
    const revised = editorialBookToChapter(authored, chapterId)!;
    expect(revised.chapterId).toBe(chapter.chapterId);
    expect(readerComprehensionState(progress, revised)).toMatchObject({ answered: 0, complete: false });
    authored.chapters[0]!.paragraphs[0]!.vi += " Một chi tiết mới.";
    expect(editorialBookToChapter(authored, chapterId)!.version).not.toBe(revised.version);
  });

  it("rejects malformed questions in both book input and the generic publication gate", async () => {
    const invalid = structuredClone(book);
    invalid.chapters[0]!.comprehension = [{ questionId: "q1", promptVi: "Có gì?", options: ["Bản đồ", " Bản đồ "], answerIndex: 9, explanationVi: "" }];
    expect(parseEditorialReaderBook(invalid).errors.join(" ")).toContain("Khảo luyện");
    const { result } = await validateStudioContent("lesson", { ...editorialBookToStudioLesson(book), readerSeries: invalid });
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.path === "readerSeries")).toBe(true);
    invalid.chapters[0]!.comprehension = Array.from({ length: 2 }, () => ({ questionId: "same", promptVi: "Có gì?", options: ["A", "B"], answerIndex: 0, explanationVi: "Chi tiết ở đoạn 2." }));
    expect(parseEditorialReaderBook(invalid).ok).toBe(false);
  });

  it("allows a reviewed reader book without a Thiên Lộ target and without inventing questions", async () => {
    const lesson = editorialBookToStudioLesson(book);
    Object.keys(lesson.review.aiSelfReview).forEach((key) => { lesson.review.aiSelfReview[key as keyof typeof lesson.review.aiSelfReview] = true; });
    const { result } = await validateStudioContent("lesson", lesson);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
    expect(lesson.exercises).toEqual([]);
    expect(editorialBookToChapter(book, `${book.seriesId}-c01`)!.comprehension).toBeUndefined();
  });
  it("projects a governed book into a catalog series and fully lookupable chapter", () => {
    expect(parseEditorialReaderBook(book)).toMatchObject({ ok: true });
    const series = editorialBookToSeries(book);
    expect(series).toMatchObject({ seriesId: book.seriesId, discoverable: true, humanReviewed: false });
    const chapter = editorialBookToChapter(book, "thanh-pho-thu-nghiem-c01");
    expect(chapter).toMatchObject({
      backgroundAsset: {
        src: "/reader/backgrounds/editorial/thanh-pho-thu-nghiem-c01.webp",
        focalPoint: "right",
      },
    });
    expect(chapter?.paragraphs).toHaveLength(2);
    chapter?.paragraphs.forEach((paragraph) => {
      expect(paragraph.segments.filter((segment) => segment.kind === "text")
        .every((segment) => !/\p{Script=Han}/u.test(segment.text))).toBe(true);
      expect(paragraph.segments.filter((segment) => segment.kind === "token")
        .every((segment) => [...segment.surface].length === 1)).toBe(true);
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

  it("requires background provenance only when an editor enables chapter art", () => {
    const missingBackgroundRights = structuredClone(book);
    delete missingBackgroundRights.rights.backgroundProvenanceVi;
    expect(parseEditorialReaderBook(missingBackgroundRights).errors.join(" "))
      .toContain("provenance cho nền minh họa");

    const noBackground = structuredClone(missingBackgroundRights);
    delete noBackground.chapters[0]!.background;
    expect(parseEditorialReaderBook(noBackground)).toMatchObject({ ok: true });
  });

  it("accepts a current lexicon scan and rejects it after chapter text changes", async () => {
    const scannedBook = structuredClone(book);
    scannedBook.lexiconScan = await scanEditorialReaderVocabulary(
      scannedBook.chapters,
      async () => true,
      "2026-08-25T10:00:00.000Z",
    );
    expect(parseEditorialReaderBook(scannedBook)).toMatchObject({ ok: true });

    scannedBook.chapters[0]!.paragraphs[0]!.zhHans = "城市的另一扇门慢慢打开。";
    const stale = parseEditorialReaderBook(scannedBook);
    expect(stale.ok).toBe(false);
    expect(stale.errors.join(" ")).toContain("không khớp nội dung chương");
  });
});
