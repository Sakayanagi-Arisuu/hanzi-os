import type { Lesson } from "../../types";
import { READER_DISCOVERABLE_SERIES } from "./readerManifest";

export type ReaderJourneyDestination = {
  seriesId: string;
  chapterId: string;
  relationship: "exact-lesson" | "shared-vocabulary";
};

/** Selects a released chapter by explicit lesson binding, then vocabulary overlap. */
export const selectReaderJourneyDestination = (
  lesson: Lesson,
): ReaderJourneyDestination | null => {
  const exact = READER_DISCOVERABLE_SERIES.flatMap((series) =>
    series.volumes.flatMap((volume) => volume.chapters.map((chapter) => ({
      series,
      chapter,
    })))
  ).find(({ chapter }) => chapter.relatedLessonIds.includes(lesson.id));
  if (exact) return {
    seriesId: exact.series.seriesId,
    chapterId: exact.chapter.chapterId,
    relationship: "exact-lesson",
  };

  const lessonWords = new Set(lesson.wordIds);
  const shared = READER_DISCOVERABLE_SERIES
    .map((series) => ({
      series,
      overlap: series.focusLexemeIds.filter((wordId) => lessonWords.has(wordId)).length,
    }))
    .filter((candidate) => candidate.overlap > 0)
    .sort((left, right) =>
      right.overlap - left.overlap
      || left.series.seriesId.localeCompare(right.series.seriesId)
    )[0];
  const chapter = shared?.series.volumes[0]?.chapters[0];
  return shared && chapter ? {
    seriesId: shared.series.seriesId,
    chapterId: chapter.chapterId,
    relationship: "shared-vocabulary",
  } : null;
};
