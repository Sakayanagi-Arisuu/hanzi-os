import type { ReaderChapter, ReaderSeries } from "./readerContentModel";

let catalogCache: Promise<ReaderSeries[]> | null = null;

const readJson = async (response: Response) => {
  if (!response.ok) throw new Error(`reader-editorial-http:${response.status}`);
  return response.json() as Promise<unknown>;
};

export const loadEditorialReaderCatalog = (options: { retry?: boolean } = {}) => {
  if (options.retry) catalogCache = null;
  catalogCache ??= fetch("/api/reader/editorial/catalog", {
    credentials: "same-origin",
    cache: "no-store",
  })
    .then(readJson)
    .then((payload) => {
      const series = payload && typeof payload === "object"
        ? (payload as { series?: unknown }).series
        : null;
      if (!Array.isArray(series)) throw new Error("reader-editorial-catalog-invalid");
      return series.filter((candidate): candidate is ReaderSeries => Boolean(
        candidate
        && typeof candidate === "object"
        && typeof (candidate as ReaderSeries).seriesId === "string"
        && Array.isArray((candidate as ReaderSeries).volumes),
      ));
    })
    .catch((error: unknown) => {
      catalogCache = null;
      throw error;
    });
  return catalogCache;
};

export const loadEditorialReaderChapter = async (
  seriesId: string,
  chapterId: string,
) => {
  const payload = await fetch(
    `/api/reader/editorial/chapters/${encodeURIComponent(seriesId)}/${encodeURIComponent(chapterId)}`,
    { credentials: "same-origin", cache: "no-store" },
  ).then(readJson);
  const chapter = payload && typeof payload === "object"
    ? (payload as { chapter?: unknown }).chapter
    : null;
  if (
    !chapter
    || typeof chapter !== "object"
    || (chapter as ReaderChapter).seriesId !== seriesId
    || (chapter as ReaderChapter).chapterId !== chapterId
    || !Array.isArray((chapter as ReaderChapter).paragraphs)
    || ((chapter as ReaderChapter).comprehension !== undefined && (
      !Array.isArray((chapter as ReaderChapter).comprehension)
      || (chapter as ReaderChapter).comprehension!.some((question) =>
        !question
        || typeof question.questionId !== "string"
        || typeof question.promptVi !== "string"
        || !Array.isArray(question.options)
        || question.options.length < 3
        || !Number.isInteger(question.answerIndex)
        || question.answerIndex < 0
        || question.answerIndex >= question.options.length
        || typeof question.explanationVi !== "string"
      )
    ))
  ) throw new Error("reader-editorial-chapter-invalid");
  return chapter as ReaderChapter;
};
