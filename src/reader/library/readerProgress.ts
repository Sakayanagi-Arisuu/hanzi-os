import type {
  ReaderChapter,
  ReaderComprehensionQuestion,
  ReaderSeries,
} from "./readerContentModel";

export const READER_PROGRESS_SCHEMA_VERSION = 2 as const;
export type ReaderMode = "zh-only" | "bilingual";

export type ReaderChapterProgress = {
  seriesId: string;
  chapterId: string;
  paragraphId: string;
  readingMode: ReaderMode;
  lastReadAt: string;
  completedAt: string | null;
  bookmarked: boolean;
  comprehensionVersion?: string;
  comprehensionAttempts?: Record<string, ReaderComprehensionAttempt>;
};

export type ReaderComprehensionAttempt = {
  selectedAnswer: string;
  correct: boolean;
  firstAttemptCorrect: boolean;
  attemptCount: number;
  answerExposed: boolean;
  answeredAt: string;
};

export type ReaderSupportEvent = {
  kind: "lookup" | "tts" | "translation" | "pinyin";
  seriesId: string;
  chapterId: string;
  paragraphId: string | null;
  referenceEntryId: string | null;
  occurredAt: string;
};

export type ReaderSavedEntry = {
  entryId: string;
  simplified: string;
  traditional?: string;
  pinyin: string | null;
  partOfSpeechVi: string;
  contextualMeaningVi: string;
  sourceType: "hanzi-os-core" | "original-context-gloss" | "mega-lexicon" | "reader-character-fallback";
  savedAt: string;
};

export type ReaderProgressDocument = {
  schemaVersion: typeof READER_PROGRESS_SCHEMA_VERSION;
  ownerKey: string;
  ownerGeneration: number;
  resetEpoch: number;
  updatedAt: string;
  lastSeriesId: string | null;
  lastChapterId: string | null;
  bookmarkedSeriesIds: string[];
  chapters: Record<string, ReaderChapterProgress>;
  supportEvents: ReaderSupportEvent[];
  savedEntries: Record<string, ReaderSavedEntry>;
};

type ReaderProgressV1 = {
  schemaVersion: 1;
  ownerKey: string;
  seriesId?: string;
  chapterId?: string;
  paragraphId?: string;
  readingMode?: ReaderMode;
  lastReadAt?: string;
  completedChapterIds?: string[];
};

export type ReaderProgressScope = {
  ownerKey: string;
  ownerGeneration: number;
  resetEpoch: number;
};

const safeString = (value: unknown, limit = 200): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= limit;
const safeTimestamp = (value: unknown): value is string =>
  safeString(value, 64) && !Number.isNaN(Date.parse(value));
const safeMode = (value: unknown): value is ReaderMode =>
  value === "zh-only" || value === "bilingual";
const safeEpoch = (value: unknown) =>
  Number.isSafeInteger(value) && Number(value) >= 0;

export const createEmptyReaderProgress = (
  scope: ReaderProgressScope,
  now = new Date().toISOString(),
): ReaderProgressDocument => ({
  schemaVersion: READER_PROGRESS_SCHEMA_VERSION,
  ...scope,
  updatedAt: now,
  lastSeriesId: null,
  lastChapterId: null,
  bookmarkedSeriesIds: [],
  chapters: {},
  supportEvents: [],
  savedEntries: {},
});

const validChapterProgress = (value: unknown): value is ReaderChapterProgress => {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ReaderChapterProgress>;
  const attempts = item.comprehensionAttempts;
  const validAttempts = attempts === undefined || (
    attempts !== null
    && typeof attempts === "object"
    && Object.keys(attempts).length <= 100
    && Object.values(attempts).every((attempt) => {
      if (!attempt || typeof attempt !== "object") return false;
      const candidate = attempt as Partial<ReaderComprehensionAttempt>;
      return safeString(candidate.selectedAnswer, 1_000)
        && typeof candidate.correct === "boolean"
        && typeof candidate.firstAttemptCorrect === "boolean"
        && Number.isInteger(candidate.attemptCount)
        && Number(candidate.attemptCount) >= 1
        && Number(candidate.attemptCount) <= 100
        && typeof candidate.answerExposed === "boolean"
        && safeTimestamp(candidate.answeredAt);
    })
  );
  return safeString(item.seriesId)
    && safeString(item.chapterId)
    && safeString(item.paragraphId)
    && safeMode(item.readingMode)
    && safeTimestamp(item.lastReadAt)
    && (item.completedAt === null || safeTimestamp(item.completedAt))
    && typeof item.bookmarked === "boolean"
    && (item.comprehensionVersion === undefined || safeString(item.comprehensionVersion, 240))
    && validAttempts
    && ((item.comprehensionVersion === undefined) === (item.comprehensionAttempts === undefined));
};

const validSupportEvent = (value: unknown): value is ReaderSupportEvent => {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<ReaderSupportEvent>;
  return (event.kind === "lookup" || event.kind === "tts"
    || event.kind === "translation" || event.kind === "pinyin")
    && safeString(event.seriesId)
    && safeString(event.chapterId)
    && (event.paragraphId === null || safeString(event.paragraphId))
    && (event.referenceEntryId === null || safeString(event.referenceEntryId))
    && safeTimestamp(event.occurredAt);
};

const validSavedEntry = (value: unknown): value is ReaderSavedEntry => {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<ReaderSavedEntry>;
  return safeString(entry.entryId)
    && safeString(entry.simplified, 24)
    && (entry.traditional === undefined || safeString(entry.traditional, 24))
    && (entry.pinyin === null || safeString(entry.pinyin, 160))
    && safeString(entry.partOfSpeechVi)
    && safeString(entry.contextualMeaningVi, 1_000)
    && (entry.sourceType === "hanzi-os-core"
      || entry.sourceType === "original-context-gloss"
      || entry.sourceType === "mega-lexicon"
      || entry.sourceType === "reader-character-fallback")
    && safeTimestamp(entry.savedAt);
};

export const parseReaderProgress = (
  value: unknown,
  scope: ReaderProgressScope,
  now = new Date().toISOString(),
): ReaderProgressDocument => {
  if (!value || typeof value !== "object") return createEmptyReaderProgress(scope, now);
  const candidate = value as Record<string, unknown>;
  if (candidate.schemaVersion === 1) {
    const legacy = candidate as ReaderProgressV1;
    if (legacy.ownerKey !== scope.ownerKey) return createEmptyReaderProgress(scope, now);
    const migrated = createEmptyReaderProgress(scope, now);
    if (
      safeString(legacy.seriesId)
      && safeString(legacy.chapterId)
      && safeString(legacy.paragraphId)
    ) {
      const completed = legacy.completedChapterIds?.includes(legacy.chapterId) ?? false;
      migrated.lastSeriesId = legacy.seriesId;
      migrated.lastChapterId = legacy.chapterId;
      migrated.chapters[legacy.chapterId] = {
        seriesId: legacy.seriesId,
        chapterId: legacy.chapterId,
        paragraphId: legacy.paragraphId,
        readingMode: safeMode(legacy.readingMode) ? legacy.readingMode : "zh-only",
        lastReadAt: safeTimestamp(legacy.lastReadAt) ? legacy.lastReadAt : now,
        completedAt: completed ? (safeTimestamp(legacy.lastReadAt) ? legacy.lastReadAt : now) : null,
        bookmarked: false,
      };
    }
    return migrated;
  }
  if (
    candidate.schemaVersion !== READER_PROGRESS_SCHEMA_VERSION
    || candidate.ownerKey !== scope.ownerKey
    || !safeEpoch(candidate.ownerGeneration)
    || candidate.ownerGeneration !== scope.ownerGeneration
    || !safeEpoch(candidate.resetEpoch)
    || candidate.resetEpoch !== scope.resetEpoch
    || !safeTimestamp(candidate.updatedAt)
    || !Array.isArray(candidate.bookmarkedSeriesIds)
    || candidate.bookmarkedSeriesIds.some((id) => !safeString(id))
    || !candidate.chapters
    || typeof candidate.chapters !== "object"
    || Object.keys(candidate.chapters).length > 2_000
    || Object.values(candidate.chapters).some((chapter) => !validChapterProgress(chapter))
    || (candidate.supportEvents !== undefined && (
      !Array.isArray(candidate.supportEvents)
      || candidate.supportEvents.length > 500
      || candidate.supportEvents.some((event) => !validSupportEvent(event))
    ))
    || (candidate.savedEntries !== undefined && (
      !candidate.savedEntries
      || typeof candidate.savedEntries !== "object"
      || Object.keys(candidate.savedEntries).length > 2_000
      || Object.values(candidate.savedEntries).some((entry) => !validSavedEntry(entry))
    ))
  ) return createEmptyReaderProgress(scope, now);
  const valid = candidate as ReaderProgressDocument;
  return {
    schemaVersion: READER_PROGRESS_SCHEMA_VERSION,
    ...scope,
    updatedAt: valid.updatedAt,
    lastSeriesId: safeString(valid.lastSeriesId) ? valid.lastSeriesId : null,
    lastChapterId: safeString(valid.lastChapterId) ? valid.lastChapterId : null,
    bookmarkedSeriesIds: [...new Set(valid.bookmarkedSeriesIds)],
    chapters: structuredClone(valid.chapters),
    supportEvents: structuredClone(valid.supportEvents ?? []),
    savedEntries: structuredClone(valid.savedEntries ?? {}),
  };
};

export const resolveReadingMode = (
  chapterProgress: ReaderChapterProgress | undefined,
  fallback: ReaderMode = "zh-only",
) => chapterProgress?.readingMode ?? fallback;

export const updateReaderPosition = ({
  document,
  seriesId,
  chapterId,
  paragraphId,
  readingMode,
  now = new Date().toISOString(),
}: {
  document: ReaderProgressDocument;
  seriesId: string;
  chapterId: string;
  paragraphId: string;
  readingMode: ReaderMode;
  now?: string;
}): ReaderProgressDocument => ({
  ...document,
  updatedAt: now,
  lastSeriesId: seriesId,
  lastChapterId: chapterId,
  chapters: {
    ...document.chapters,
    [chapterId]: {
      ...document.chapters[chapterId],
      seriesId,
      chapterId,
      paragraphId,
      readingMode,
      lastReadAt: now,
      completedAt: document.chapters[chapterId]?.completedAt ?? null,
      bookmarked: document.chapters[chapterId]?.bookmarked ?? false,
    },
  },
});

export const completeReaderChapter = (
  document: ReaderProgressDocument,
  chapter: ReaderChapter,
  now = new Date().toISOString(),
) => {
  const lastParagraph = chapter.paragraphs.at(-1)?.paragraphId ?? "";
  const positioned = updateReaderPosition({
    document,
    seriesId: chapter.seriesId,
    chapterId: chapter.chapterId,
    paragraphId: lastParagraph,
    readingMode: resolveReadingMode(document.chapters[chapter.chapterId]),
    now,
  });
  return {
    ...positioned,
    chapters: {
      ...positioned.chapters,
      [chapter.chapterId]: {
        ...positioned.chapters[chapter.chapterId]!,
        completedAt: document.chapters[chapter.chapterId]?.completedAt ?? now,
      },
    },
  };
};

export const recordReaderComprehensionAttempt = ({
  document,
  chapter,
  question,
  selectedAnswer,
  now = new Date().toISOString(),
}: {
  document: ReaderProgressDocument;
  chapter: ReaderChapter;
  question: ReaderComprehensionQuestion;
  selectedAnswer: string;
  now?: string;
}): ReaderProgressDocument => {
  if (!question.options.includes(selectedAnswer)) return document;
  const existingChapter = document.chapters[chapter.chapterId];
  const positioned = existingChapter ?? updateReaderPosition({
    document,
    seriesId: chapter.seriesId,
    chapterId: chapter.chapterId,
    paragraphId: chapter.paragraphs[0]?.paragraphId ?? "reader-start",
    readingMode: "zh-only",
    now,
  }).chapters[chapter.chapterId];
  if (!positioned) return document;
  const sameVersion = positioned.comprehensionVersion === chapter.version;
  const attempts = sameVersion ? positioned.comprehensionAttempts ?? {} : {};
  const previous = attempts[question.questionId];
  const correct = question.options[question.answerIndex] === selectedAnswer;
  return {
    ...document,
    updatedAt: now,
    lastSeriesId: chapter.seriesId,
    lastChapterId: chapter.chapterId,
    chapters: {
      ...document.chapters,
      [chapter.chapterId]: {
        ...positioned,
        lastReadAt: now,
        comprehensionVersion: chapter.version,
        comprehensionAttempts: {
          ...attempts,
          [question.questionId]: {
            selectedAnswer,
            correct,
            firstAttemptCorrect: previous?.firstAttemptCorrect ?? correct,
            attemptCount: Math.min(100, (previous?.attemptCount ?? 0) + 1),
            answerExposed: previous?.answerExposed === true || !correct,
            answeredAt: now,
          },
        },
      },
    },
  };
};

export const readerComprehensionState = (
  document: ReaderProgressDocument,
  chapter: ReaderChapter,
) => {
  const questions = chapter.comprehension ?? [];
  const progress = document.chapters[chapter.chapterId];
  const attempts = progress?.comprehensionVersion === chapter.version
    ? progress.comprehensionAttempts ?? {}
    : {};
  let answered = 0;
  let correct = 0;
  let firstAttemptCorrect = 0;
  let answerExposed = false;
  questions.forEach((question) => {
    const attempt = attempts[question.questionId];
    if (!attempt) return;
    answered += 1;
    if (attempt.correct) correct += 1;
    if (attempt.firstAttemptCorrect) firstAttemptCorrect += 1;
    if (attempt.answerExposed) answerExposed = true;
  });
  return {
    attempts,
    answered,
    correct,
    firstAttemptCorrect,
    answerExposed,
    total: questions.length,
    complete: questions.length > 0 && correct === questions.length,
  };
};

export const chapterState = (
  document: ReaderProgressDocument,
  chapterId: string,
): "unread" | "reading" | "completed" => {
  const progress = document.chapters[chapterId];
  if (!progress) return "unread";
  return progress.completedAt ? "completed" : "reading";
};

export const recordReaderSupport = (
  document: ReaderProgressDocument,
  event: Omit<ReaderSupportEvent, "occurredAt">,
  now = new Date().toISOString(),
): ReaderProgressDocument => ({
  ...document,
  updatedAt: now,
  supportEvents: [...document.supportEvents, { ...event, occurredAt: now }].slice(-500),
});

export const toggleReaderSavedEntry = (
  document: ReaderProgressDocument,
  entry: Omit<ReaderSavedEntry, "savedAt">,
  now = new Date().toISOString(),
): ReaderProgressDocument => {
  const savedEntries = { ...document.savedEntries };
  if (savedEntries[entry.entryId]) delete savedEntries[entry.entryId];
  else savedEntries[entry.entryId] = { ...entry, savedAt: now };
  return { ...document, updatedAt: now, savedEntries };
};

export const removeReaderSavedEntry = (
  document: ReaderProgressDocument,
  entryId: string,
  now = new Date().toISOString(),
): ReaderProgressDocument => {
  if (!document.savedEntries[entryId]) return document;
  const savedEntries = { ...document.savedEntries };
  delete savedEntries[entryId];
  return { ...document, updatedAt: now, savedEntries };
};

export const seriesCompletion = (
  document: ReaderProgressDocument,
  series: ReaderSeries,
) => {
  const chapters = series.volumes.flatMap((volume) => volume.chapters);
  const complete = chapters.filter((chapter) =>
    document.chapters[chapter.chapterId]?.completedAt
  ).length;
  return { complete, total: chapters.length };
};
