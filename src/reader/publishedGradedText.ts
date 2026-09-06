import { isStudioLevel, type StudioLevel } from "../content/studioContent";
import {
  isStudioGradedTextSeriesId,
  studioGradedTextSeriesId,
} from "../content/gradedTextIdentity";
import { authorReaderParagraph } from "./library/chapterAuthoring";
import {
  READER_CONTENT_VERSION,
  type ReaderChapter,
  type ReaderComprehensionQuestion,
  type ReaderCoverTone,
  type ReaderLevelBand,
  type ReaderSeries,
} from "./library/readerContentModel";

type StudioTriple = {
  hanzi: string;
  pinyin: string;
  meaningVi: string;
};

type StudioComprehensionQuestion = {
  promptVi: string;
  answer: string;
  distractors: string[];
  explanationVi: string;
};

export type PublishedGradedTextContent = {
  readerSeriesId?: string;
  titleZh: string;
  summaryVi: string;
  estimatedMinutes: number;
  sourceLessonIds: string[];
  sentences: StudioTriple[];
  comprehension: StudioComprehensionQuestion[];
  rights: {
    sourceKind: "original-hanzi-os" | "licensed-third-party";
    textProvenanceVi: string;
    licenseVi?: string;
    editorAttestsRights: true;
  };
  review: {
    humanReviewed: false;
    aiSelfReview: {
      accuracy: true;
      levelFit: true;
      pedagogy: true;
      answerIntegrity: true;
      originality: true;
    };
  };
};

export type PublishedGradedTextRecord = {
  stableKey: string;
  title: string;
  level: StudioLevel;
  contentSha256: string;
  content: PublishedGradedTextContent;
};

const asRecord = (value: unknown) => value && typeof value === "object" && !Array.isArray(value)
  ? value as Record<string, unknown>
  : null;
const text = (value: unknown, max: number) => typeof value === "string"
  && value.trim().length > 0
  && value.length <= max;
const textList = (value: unknown, minimum: number, maximum: number, itemMax = 200) =>
  Array.isArray(value)
  && value.length >= minimum
  && value.length <= maximum
  && value.every((item) => text(item, itemMax));

const parseTriple = (value: unknown): StudioTriple | null => {
  const row = asRecord(value);
  return row
    && text(row.hanzi, 2_000)
    && /\p{Script=Han}/u.test(row.hanzi as string)
    && text(row.pinyin, 4_000)
    && text(row.meaningVi, 4_000)
    ? row as StudioTriple
    : null;
};

const parseQuestion = (value: unknown): StudioComprehensionQuestion | null => {
  const row = asRecord(value);
  if (
    !row
    || !text(row.promptVi, 1_000)
    || !text(row.answer, 1_000)
    || !text(row.explanationVi, 2_000)
    || !textList(row.distractors, 2, 7, 1_000)
  ) return null;
  const answer = row.answer as string;
  const distractors = row.distractors as string[];
  if (new Set([answer, ...distractors]).size !== distractors.length + 1) return null;
  return row as StudioComprehensionQuestion;
};

export const parsePublishedGradedText = ({
  stableKey,
  title,
  level,
  contentSha256,
  content: value,
}: {
  stableKey: unknown;
  title: unknown;
  level: unknown;
  contentSha256: unknown;
  content: unknown;
}): { ok: true; record: PublishedGradedTextRecord } | { ok: false; errors: string[] } => {
  const errors: string[] = [];
  const content = asRecord(value);
  const rights = asRecord(content?.rights);
  const review = asRecord(content?.review);
  const passes = asRecord(review?.aiSelfReview);
  const expectedSeriesId = typeof stableKey === "string"
    ? studioGradedTextSeriesId(stableKey)
    : "";
  if (!text(stableKey, 160)) errors.push("Stable key bài đọc không hợp lệ.");
  if (!text(title, 240)) errors.push("Thiếu tiêu đề tiếng Việt của bài đọc.");
  if (!isStudioLevel(level)) errors.push("Cấp độ bài đọc không hợp lệ.");
  if (typeof contentSha256 !== "string" || !/^[0-9a-f]{64}$/u.test(contentSha256)) errors.push("Digest bài đọc không hợp lệ.");
  if (!content) return { ok: false, errors: [...errors, "Nội dung bài đọc phải là object."] };
  if (content.readerSeriesId !== undefined && (
    !isStudioGradedTextSeriesId(content.readerSeriesId)
    || content.readerSeriesId !== expectedSeriesId
  )) errors.push("ID Reader không khớp stable key của bài đọc.");
  if (!text(content.titleZh, 120) || !/\p{Script=Han}/u.test(content.titleZh as string)) errors.push("Thiếu tiêu đề tiếng Trung.");
  if (!text(content.summaryVi, 2_000)) errors.push("Thiếu tóm tắt tiếng Việt.");
  if (!Number.isInteger(content.estimatedMinutes) || Number(content.estimatedMinutes) < 1 || Number(content.estimatedMinutes) > 60) errors.push("Thời lượng đọc không hợp lệ.");
  if (!textList(content.sourceLessonIds, 1, 80, 160)) errors.push("Bài đọc chưa nối với bài học nguồn.");
  const sentences = Array.isArray(content.sentences)
    ? content.sentences.map(parseTriple)
    : [];
  if (sentences.length < 2 || sentences.length > 40 || sentences.some((item) => !item)) errors.push("Bài đọc cần 2–40 đoạn Trung–Pinyin–Việt hợp lệ.");
  const comprehension = Array.isArray(content.comprehension)
    ? content.comprehension.map(parseQuestion)
    : [];
  if (comprehension.length < 1 || comprehension.length > 20 || comprehension.some((item) => !item)) errors.push("Câu hỏi đọc hiểu hoặc lựa chọn không hợp lệ.");
  if (
    !rights
    || (rights.sourceKind !== "original-hanzi-os" && rights.sourceKind !== "licensed-third-party")
    || !text(rights.textProvenanceVi, 1_000)
    || (rights.sourceKind === "licensed-third-party" && !text(rights.licenseVi, 500))
    || rights.editorAttestsRights !== true
  ) errors.push("Thiếu provenance, giấy phép hoặc xác nhận quyền sử dụng văn bản.");
  if (
    review?.humanReviewed !== false
    || passes?.accuracy !== true
    || passes.levelFit !== true
    || passes.pedagogy !== true
    || passes.answerIntegrity !== true
    || passes.originality !== true
  ) errors.push("Bài đọc chưa hoàn tất disclosure và năm pass biên tập.");
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    record: {
      stableKey: stableKey as string,
      title: title as string,
      level: level as StudioLevel,
      contentSha256: contentSha256 as string,
      content: {
        ...(content as unknown as PublishedGradedTextContent),
        readerSeriesId: expectedSeriesId,
        sentences: sentences as StudioTriple[],
        comprehension: comprehension as StudioComprehensionQuestion[],
      },
    },
  };
};

const levelPresentation: Record<StudioLevel, { band: ReaderLevelBand; tone: ReaderCoverTone }> = {
  hsk0: { band: { min: "HSK0", max: "HSK0", label: "HSK0 · nhập môn" }, tone: "azure" },
  hsk1: { band: { min: "HSK1", max: "HSK1", label: "HSK1 · độ khó gợi ý" }, tone: "jade" },
  hsk2: { band: { min: "HSK2", max: "HSK2", label: "HSK2 · độ khó gợi ý" }, tone: "indigo" },
  hsk3: { band: { min: "HSK3", max: "HSK3", label: "HSK3 · độ khó gợi ý" }, tone: "copper" },
  hsk4: { band: { min: "HSK4", max: "HSK4", label: "HSK4 · độ khó gợi ý" }, tone: "ember" },
};

const optionOrderSeed = (value: string) => [...value]
  .reduce((sum, character) => Math.imul(sum ^ character.charCodeAt(0), 16_777_619) >>> 0, 2_166_136_261);

const projectQuestion = (
  question: StudioComprehensionQuestion,
  questionId: string,
): ReaderComprehensionQuestion => {
  const source = [question.answer, ...question.distractors];
  const offset = optionOrderSeed(questionId) % source.length;
  const options = source.map((_item, index) => source[(index + offset) % source.length]!);
  return {
    questionId,
    promptVi: question.promptVi,
    options,
    answerIndex: options.indexOf(question.answer),
    explanationVi: question.explanationVi,
  };
};

const identities = (record: PublishedGradedTextRecord) => {
  const seriesId = studioGradedTextSeriesId(record.stableKey);
  return { seriesId, chapterId: `${seriesId}-c01` };
};

export const publishedGradedTextToSeries = (record: PublishedGradedTextRecord): ReaderSeries => {
  const { seriesId, chapterId } = identities(record);
  const presentation = levelPresentation[record.level];
  const version = `${READER_CONTENT_VERSION}:studio:${seriesId}:${record.contentSha256.slice(0, 16)}`;
  return {
    seriesId,
    version,
    titleZh: record.content.titleZh,
    titleVi: record.title,
    synopsisVi: record.content.summaryVi,
    hookVi: "Bài đọc ngắn có câu hỏi tự kiểm sau phần văn bản.",
    genreIds: ["Bài đọc ngắn", "Biên Tập Viện"],
    shelfId: "doi-song",
    discoverable: true,
    levelBand: presentation.band,
    coverAsset: {
      kind: "code-native",
      sigil: "文",
      tone: presentation.tone,
      altVi: `Bìa chữ nguyên bản cho bài đọc ${record.title}`,
      rightsManifestId: `studio-graded-text-cover:${seriesId}`,
    },
    source: {
      rightsManifestId: `studio-graded-text:${seriesId}`,
      sourceType: record.content.rights.sourceKind,
      provenanceNote: `${record.content.rights.textProvenanceVi}${record.content.rights.licenseVi ? ` · Giấy phép: ${record.content.rights.licenseVi}` : ""} · Có AI hỗ trợ · humanReviewed:false.`,
    },
    volumes: [{
      volumeId: `${seriesId}-v01`,
      titleZh: "分级短文",
      titleVi: "Bài đọc ngắn",
      chapters: [{
        chapterId,
        version,
        seriesId,
        chapterNumber: 1,
        titleZh: record.content.titleZh,
        titleVi: record.title,
        hookVi: record.content.summaryVi,
        estimatedMinutes: record.content.estimatedMinutes,
        relatedLessonIds: record.content.sourceLessonIds,
        publicationStatus: "released-local",
        reviewStatus: "ai-assisted-draft",
        humanReviewed: false,
        rightsManifestId: `studio-graded-text-chapter:${chapterId}`,
        comprehensionCount: record.content.comprehension.length,
      }],
    }],
    focusLexemeIds: [],
    publicationStatus: "released-local",
    humanReviewed: false,
  };
};

export const publishedGradedTextToChapter = (
  record: PublishedGradedTextRecord,
  requestedChapterId: string,
): ReaderChapter | null => {
  const series = publishedGradedTextToSeries(record);
  const summary = series.volumes[0]?.chapters[0];
  if (!summary || summary.chapterId !== requestedChapterId) return null;
  return {
    chapterId: summary.chapterId,
    version: summary.version,
    seriesId: summary.seriesId,
    chapterNumber: summary.chapterNumber,
    titleZh: summary.titleZh,
    titleVi: summary.titleVi,
    estimatedMinutes: summary.estimatedMinutes,
    paragraphs: record.content.sentences.map((sentence, index) => authorReaderParagraph({
      paragraphId: `${summary.chapterId}-p${String(index + 1).padStart(2, "0")}`,
      markedZhHans: sentence.hanzi,
      pinyin: sentence.pinyin,
      vi: sentence.meaningVi,
    })),
    comprehension: record.content.comprehension.map((question, index) =>
      projectQuestion(question, `${summary.chapterId}-q${String(index + 1).padStart(2, "0")}`)
    ),
    relatedLessonIds: record.content.sourceLessonIds,
    publicationStatus: "released-local",
    reviewStatus: "ai-assisted-draft",
    humanReviewed: false,
    rights: {
      rightsManifestId: summary.rightsManifestId,
      sourceType: record.content.rights.sourceKind,
      provenanceNote: `${record.content.rights.textProvenanceVi}${record.content.rights.licenseVi ? ` · Giấy phép: ${record.content.rights.licenseVi}` : ""} · Có AI hỗ trợ · humanReviewed:false.`,
    },
  };
};
