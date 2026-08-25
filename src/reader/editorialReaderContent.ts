import { authorReaderParagraph } from "./library/chapterAuthoring";
import {
  READER_CONTENT_VERSION,
  type ReaderChapter,
  type ReaderCoverTone,
  type ReaderLevelBand,
  type ReaderSeries,
  type ReaderShelfId,
} from "./library/readerContentModel";

const EDITORIAL_SHELVES = [
  "tu-tien", "trung-sinh", "light-novel", "bi-an", "khoa-huyen",
  "triet-ly", "vo-hiep", "doi-song",
] as const satisfies readonly ReaderShelfId[];
const EDITORIAL_LEVELS = ["HSK1", "HSK2", "HSK3", "HSK4"] as const;
const EDITORIAL_TONES = ["jade", "ember", "violet", "azure", "copper", "indigo", "rose", "slate"] as const;

export type EditorialReaderParagraph = {
  zhHans: string;
  pinyin: string;
  vi: string;
};

export type EditorialReaderChapter = {
  titleZh: string;
  titleVi: string;
  hookVi: string;
  estimatedMinutes: number;
  background?: {
    src: string;
    altVi: string;
    focalPoint: "left" | "center" | "right";
  } | undefined;
  paragraphs: EditorialReaderParagraph[];
};

export type EditorialReaderBook = {
  schemaVersion: 1;
  seriesId: string;
  titleZh: string;
  titleVi: string;
  synopsisVi: string;
  hookVi: string;
  genreIds: string[];
  shelfId: typeof EDITORIAL_SHELVES[number];
  levelBand: ReaderLevelBand;
  cover: {
    src: string;
    altVi: string;
    tone: ReaderCoverTone;
  };
  chapters: EditorialReaderChapter[];
  rights: {
    textProvenanceVi: string;
    coverProvenanceVi: string;
    backgroundProvenanceVi?: string;
    editorAttestsRights: true;
  };
  humanReviewed: false;
};

const asRecord = (value: unknown) => value && typeof value === "object" && !Array.isArray(value)
  ? value as Record<string, unknown>
  : null;
const text = (value: unknown, max: number) => typeof value === "string"
  && value.trim().length > 0
  && value.length <= max;
const validAssetUrl = (value: unknown) => text(value, 2_000)
  && (String(value).startsWith("/") || String(value).startsWith("https://"));

export const parseEditorialReaderBook = (value: unknown) => {
  const errors: string[] = [];
  const book = asRecord(value);
  if (!book) return { ok: false, errors: ["Dữ liệu sách phải là một object."], book: null } as const;
  const levelBand = asRecord(book.levelBand);
  const cover = asRecord(book.cover);
  const rights = asRecord(book.rights);
  if (book.schemaVersion !== 1) errors.push("schemaVersion phải bằng 1.");
  if (!text(book.seriesId, 72) || !/^[a-z0-9][a-z0-9-]{2,71}$/u.test(String(book.seriesId))) errors.push("Mã sách chỉ dùng chữ thường, số và dấu gạch ngang.");
  if (!text(book.titleZh, 80) || !/\p{Script=Han}/u.test(String(book.titleZh))) errors.push("Thiếu tên sách tiếng Trung.");
  if (!text(book.titleVi, 120)) errors.push("Thiếu tên sách tiếng Việt.");
  if (!text(book.synopsisVi, 2_000)) errors.push("Thiếu mô tả sách.");
  if (!text(book.hookVi, 600)) errors.push("Thiếu câu dẫn của sách.");
  if (!Array.isArray(book.genreIds) || book.genreIds.length < 1 || book.genreIds.length > 8 || !book.genreIds.every((item) => text(item, 60))) errors.push("Sách cần từ 1 đến 8 thể loại.");
  if (!EDITORIAL_SHELVES.includes(book.shelfId as typeof EDITORIAL_SHELVES[number])) errors.push("Kệ sách không hợp lệ.");
  if (!levelBand || !EDITORIAL_LEVELS.includes(levelBand.min as typeof EDITORIAL_LEVELS[number]) || !EDITORIAL_LEVELS.includes(levelBand.max as typeof EDITORIAL_LEVELS[number]) || !text(levelBand.label, 120)) errors.push("Dải cấp độ không hợp lệ.");
  if (!cover || !text(cover.src, 2_000) || (!String(cover.src).startsWith("/") && !String(cover.src).startsWith("https://")) || !text(cover.altVi, 300) || !EDITORIAL_TONES.includes(cover.tone as ReaderCoverTone)) errors.push("Bìa sách cần URL / nội bộ hoặc HTTPS, mô tả và tông màu hợp lệ.");
  if (!rights || rights.editorAttestsRights !== true || !text(rights.textProvenanceVi, 1_000) || !text(rights.coverProvenanceVi, 1_000)) errors.push("Biên tập viên phải ghi provenance và xác nhận quyền dùng nội dung/bìa.");
  if (book.humanReviewed !== false) errors.push("Nội dung mới phải giữ humanReviewed:false tới khi có review ngôn ngữ thật.");
  if (!Array.isArray(book.chapters) || book.chapters.length < 1 || book.chapters.length > 50) {
    errors.push("Một sách cần từ 1 đến 50 chương trong mỗi revision.");
  } else {
    book.chapters.forEach((candidate, chapterIndex) => {
      const chapter = asRecord(candidate);
      if (!chapter || !text(chapter.titleZh, 100) || !/\p{Script=Han}/u.test(String(chapter.titleZh)) || !text(chapter.titleVi, 160) || !text(chapter.hookVi, 600)) errors.push(`Chương ${chapterIndex + 1} thiếu tiêu đề hoặc câu dẫn.`);
      if (!chapter || !Number.isInteger(chapter.estimatedMinutes) || Number(chapter.estimatedMinutes) < 1 || Number(chapter.estimatedMinutes) > 60) errors.push(`Thời lượng chương ${chapterIndex + 1} không hợp lệ.`);
      const background = chapter ? asRecord(chapter.background) : null;
      if (chapter?.background !== undefined && (
        !background
        || !validAssetUrl(background.src)
        || !text(background.altVi, 300)
        || !["left", "center", "right"].includes(String(background.focalPoint))
      )) errors.push(`Nền minh họa chương ${chapterIndex + 1} cần URL nội bộ/HTTPS, mô tả và điểm lấy nét hợp lệ.`);
      const paragraphs = chapter && Array.isArray(chapter.paragraphs) ? chapter.paragraphs : [];
      if (paragraphs.length < 2 || paragraphs.length > 40) errors.push(`Chương ${chapterIndex + 1} cần từ 2 đến 40 đoạn căn chỉnh.`);
      paragraphs.forEach((candidateParagraph, paragraphIndex) => {
        const paragraph = asRecord(candidateParagraph);
        if (!paragraph || !text(paragraph.zhHans, 2_000) || !/\p{Script=Han}/u.test(String(paragraph.zhHans)) || !text(paragraph.pinyin, 4_000) || !text(paragraph.vi, 4_000)) errors.push(`Đoạn ${paragraphIndex + 1} của chương ${chapterIndex + 1} thiếu Trung–Pinyin–Việt.`);
      });
    });
    const hasBackground = book.chapters.some((candidate) => Boolean(asRecord(candidate)?.background));
    if (hasBackground && (!rights || !text(rights.backgroundProvenanceVi, 1_000))) {
      errors.push("Sách có nền chương phải ghi provenance cho nền minh họa.");
    }
  }
  return errors.length
    ? { ok: false, errors, book: null } as const
    : { ok: true, errors: [], book: value as EditorialReaderBook } as const;
};

export const editorialBookToSeries = (book: EditorialReaderBook): ReaderSeries => ({
  seriesId: book.seriesId,
  version: `${READER_CONTENT_VERSION}:editorial:${book.seriesId}:1`,
  titleZh: book.titleZh,
  titleVi: book.titleVi,
  synopsisVi: book.synopsisVi,
  hookVi: book.hookVi,
  genreIds: book.genreIds,
  shelfId: book.shelfId,
  discoverable: true,
  levelBand: book.levelBand,
  coverAsset: {
    kind: "art-directed",
    src: book.cover.src,
    tone: book.cover.tone,
    altVi: book.cover.altVi,
    rightsManifestId: `editorial-cover:${book.seriesId}`,
  },
  source: {
    rightsManifestId: `editorial-series:${book.seriesId}`,
    sourceType: "original-hanzi-os",
    provenanceNote: `${book.rights.textProvenanceVi} · Bìa: ${book.rights.coverProvenanceVi}`,
  },
  volumes: [{
    volumeId: `${book.seriesId}-v01`,
    titleZh: "第一卷",
    titleVi: "Quyển I",
    chapters: book.chapters.map((chapter, index) => {
      const chapterNumber = index + 1;
      const chapterId = `${book.seriesId}-c${String(chapterNumber).padStart(2, "0")}`;
      return {
        chapterId,
        version: `${READER_CONTENT_VERSION}:editorial:${chapterId}:1`,
        seriesId: book.seriesId,
        chapterNumber,
        titleZh: chapter.titleZh,
        titleVi: chapter.titleVi,
        hookVi: chapter.hookVi,
        estimatedMinutes: chapter.estimatedMinutes,
        ...(chapter.background ? {
          backgroundAsset: {
            kind: "image" as const,
            src: chapter.background.src,
            altVi: chapter.background.altVi,
            focalPoint: chapter.background.focalPoint,
            rightsManifestId: `editorial-background:${chapterId}`,
          },
        } : {}),
        relatedLessonIds: [],
        publicationStatus: "released-local",
        reviewStatus: "ai-assisted-draft",
        humanReviewed: false,
        rightsManifestId: `editorial-chapter:${chapterId}`,
      };
    }),
  }],
  focusLexemeIds: [],
  publicationStatus: "released-local",
  humanReviewed: false,
});

export const editorialBookToChapter = (
  book: EditorialReaderBook,
  chapterId: string,
): ReaderChapter | null => {
  const series = editorialBookToSeries(book);
  const summary = series.volumes[0]?.chapters.find((chapter) => chapter.chapterId === chapterId);
  if (!summary) return null;
  const source = book.chapters[summary.chapterNumber - 1];
  if (!source) return null;
  return {
    chapterId,
    version: summary.version,
    seriesId: book.seriesId,
    chapterNumber: summary.chapterNumber,
    titleZh: summary.titleZh,
    titleVi: summary.titleVi,
    estimatedMinutes: summary.estimatedMinutes,
    ...(summary.backgroundAsset ? { backgroundAsset: summary.backgroundAsset } : {}),
    paragraphs: source.paragraphs.map((paragraph, index) => authorReaderParagraph({
      paragraphId: `${chapterId}-p${String(index + 1).padStart(2, "0")}`,
      markedZhHans: paragraph.zhHans,
      pinyin: paragraph.pinyin,
      vi: paragraph.vi,
    })),
    relatedLessonIds: [],
    publicationStatus: "released-local",
    reviewStatus: "ai-assisted-draft",
    humanReviewed: false,
    rights: {
      rightsManifestId: summary.rightsManifestId,
      sourceType: "original-hanzi-os",
      provenanceNote: `${book.rights.textProvenanceVi}${source.background ? ` · Nền: ${book.rights.backgroundProvenanceVi}` : ""}`,
    },
  };
};

export const editorialBookToStudioLesson = (book: EditorialReaderBook) => {
  const firstChapter = book.chapters[0]!;
  const dialogue = firstChapter.paragraphs.slice(0, 2).map((paragraph) => ({
    hanzi: paragraph.zhHans,
    pinyin: paragraph.pinyin,
    meaningVi: paragraph.vi,
  }));
  return {
    contentKind: "reader-series",
    readerSeries: book,
    objectiveVi: `Biên tập serial ${book.titleVi} cho Vạn Quyển Các.`,
    prerequisites: [],
    vocabulary: ["阅读", "故事", "章节"],
    dialogue,
    grammar: [{ pattern: "先……然后……", explanationVi: "Dùng để theo dõi trình tự sự kiện trong truyện." }],
    exercises: [{
      promptVi: `Chi tiết nào mở đầu ${firstChapter.titleVi}?`,
      distractors: ["Một sự kiện không có trong chương", "Một nhân vật chưa xuất hiện"],
      answer: firstChapter.paragraphs[0]!.zhHans,
      explanationVi: "Đáp án lấy từ đoạn mở đầu đã căn chỉnh của chương.",
    }],
    review: {
      humanReviewed: false,
      aiSelfReview: {
        accuracy: false,
        levelFit: false,
        pedagogy: false,
        answerIntegrity: false,
        originality: false,
      },
    },
  };
};
