import { authorReaderParagraph } from "../chapterAuthoring";
import type { ReaderChapter } from "../readerContentModel";
import { READER_SHELF_SERIES_BY_ID } from "../readerShelfCatalog";

export type ReaderSamplerParagraphInput = {
  markedZhHans: string;
  pinyin: string;
  vi: string;
};

export const createReaderSamplerChapter = (
  seriesId: string,
  paragraphs: ReaderSamplerParagraphInput[],
): ReaderChapter => {
  const series = READER_SHELF_SERIES_BY_ID.get(seriesId);
  const summary = series?.volumes[0]?.chapters[0];
  if (!series || !summary) {
    throw new Error(`Reader sampler ${seriesId} is absent from the shelf catalog.`);
  }
  return {
    chapterId: summary.chapterId,
    version: summary.version,
    seriesId,
    chapterNumber: summary.chapterNumber,
    titleZh: summary.titleZh,
    titleVi: summary.titleVi,
    estimatedMinutes: summary.estimatedMinutes,
    paragraphs: paragraphs.map((paragraph, index) => authorReaderParagraph({
      paragraphId: `${summary.chapterId}-p${String(index + 1).padStart(2, "0")}`,
      ...paragraph,
    })),
    relatedLessonIds: summary.relatedLessonIds,
    publicationStatus: "released-local",
    reviewStatus: "ai-assisted-draft",
    humanReviewed: false,
    rights: {
      rightsManifestId: summary.rightsManifestId,
      sourceType: "original-hanzi-os",
      provenanceNote: "Chương mở đầu nguyên bản HANZI.OS; AI-assisted, humanReviewed:false.",
    },
  };
};
