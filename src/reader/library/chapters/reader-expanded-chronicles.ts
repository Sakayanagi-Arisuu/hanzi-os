import { authorReaderParagraph } from "../chapterAuthoring";
import type { ReaderChapter } from "../readerContentModel";
import { READER_SERIES_BY_ID } from "../readerManifest";
import {
  createReaderArcParagraphs,
  READER_STORY_PROFILE_BY_ID,
} from "../readerStoryArcs";

const chapterNumbersFor = (seriesId: string) => seriesId === "jade-lantern-archive"
  ? [7, 8, 9, 10]
  : [3, 4, 5, 6, 7, 8, 9, 10];

const createExpandedChapter = (
  seriesId: string,
  chapterNumber: number,
): ReaderChapter => {
  const series = READER_SERIES_BY_ID.get(seriesId);
  const summary = series?.volumes
    .flatMap((volume) => volume.chapters)
    .find((chapter) => chapter.chapterNumber === chapterNumber);
  if (!series || !summary) {
    throw new Error(`Expanded Reader chapter ${seriesId}#${chapterNumber} is absent from the catalog.`);
  }
  return {
    chapterId: summary.chapterId,
    version: summary.version,
    seriesId,
    chapterNumber,
    titleZh: summary.titleZh,
    titleVi: summary.titleVi,
    estimatedMinutes: summary.estimatedMinutes,
    paragraphs: createReaderArcParagraphs(seriesId, chapterNumber).map((paragraph, index) =>
      authorReaderParagraph({
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
      provenanceNote: "Chương dài nguyên bản HANZI.OS; AI-assisted, humanReviewed:false.",
    },
  };
};

export const READER_SHELF_CHAPTERS: Record<string, ReaderChapter> = Object.fromEntries(
  Object.keys(READER_STORY_PROFILE_BY_ID).flatMap((seriesId) =>
    chapterNumbersFor(seriesId).map((chapterNumber) => {
      const chapter = createExpandedChapter(seriesId, chapterNumber);
      return [chapter.chapterId, chapter];
    })),
);
