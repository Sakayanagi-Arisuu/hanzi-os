import type { ReaderSeries } from "./readerContentModel";
import {
  chapterState,
  type ReaderProgressDocument,
} from "./readerProgress";

export type LegacyReaderState =
  | "none"
  | "active"
  | "submitted"
  | "abandoned"
  | "stale"
  | "previously-exposed"
  | "sync-error"
  | "offline";

export type ReaderEntryResolution = {
  destination: "library";
  primaryLabel: "Mở chương đầu" | "Tiếp tục đọc" | "Đọc lại" | "Đọc chương tiếp" | "Mở lại an toàn";
  seriesId: string;
  chapterId: string;
  recovery: boolean;
  legacyChallengeAvailable: boolean;
};

export const resolveReaderEntry = ({
  progress,
  series,
  legacyState = "none",
}: {
  progress: ReaderProgressDocument;
  series: ReaderSeries;
  legacyState?: LegacyReaderState;
}): ReaderEntryResolution => {
  const chapters = series.volumes.flatMap((volume) => volume.chapters);
  const first = chapters[0];
  if (!first) throw new Error("Reader series has no released chapter.");
  const current = chapters.find((chapter) =>
    chapter.chapterId === progress.lastChapterId
  ) ?? first;
  const currentState = chapterState(progress, current.chapterId);
  const next = chapters.find((chapter) => chapter.chapterNumber > current.chapterNumber
    && chapterState(progress, chapter.chapterId) !== "completed");
  const recovery = legacyState === "stale" || legacyState === "sync-error";
  const target = currentState === "completed" && next ? next : current;
  return {
    destination: "library",
    primaryLabel: recovery
      ? "Mở lại an toàn"
      : currentState === "unread"
        ? current.chapterId === first.chapterId ? "Mở chương đầu" : "Đọc chương tiếp"
        : currentState === "reading"
          ? "Tiếp tục đọc"
          : next
            ? "Đọc chương tiếp"
            : "Đọc lại",
    seriesId: series.seriesId,
    chapterId: recovery ? first.chapterId : target.chapterId,
    recovery,
    legacyChallengeAvailable: legacyState !== "none",
  };
};
