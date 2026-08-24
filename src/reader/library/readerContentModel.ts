export const READER_CONTENT_VERSION = "reader-pilot-2026.08.2" as const;

export type ReaderShelfId =
  | "flagship"
  | "tu-tien"
  | "trung-sinh"
  | "light-novel"
  | "bi-an"
  | "khoa-huyen"
  | "triet-ly"
  | "vo-hiep"
  | "doi-song"
  | "legacy";

export type ReaderCoverTone =
  | "jade"
  | "ember"
  | "violet"
  | "azure"
  | "copper"
  | "indigo"
  | "rose"
  | "slate";

export type ReaderLevelBand = {
  min: "HSK1" | "HSK2" | "HSK3" | "HSK4";
  max: "HSK1" | "HSK2" | "HSK3" | "HSK4";
  label: string;
};

export type ReaderRightsReference = {
  rightsManifestId: string;
  sourceType: "original-hanzi-os" | "legacy-hanzi-os";
  provenanceNote: string;
};

export type ReaderToken = {
  kind: "token";
  sequence: number;
  surface: string;
  lexemeId?: string;
  referenceEntryId?: string;
};

export type ReaderTextSegment = {
  kind: "text";
  sequence: number;
  text: string;
};

export type ReaderParagraphSegment = ReaderToken | ReaderTextSegment;

export type ReaderParagraph = {
  paragraphId: string;
  zhHans: string;
  zhHant?: string;
  pinyin: string;
  vi: string;
  segments: ReaderParagraphSegment[];
};

export type ReaderChapter = {
  chapterId: string;
  version: string;
  seriesId: string;
  chapterNumber: number;
  titleZh: string;
  titleVi: string;
  estimatedMinutes: number;
  paragraphs: ReaderParagraph[];
  relatedLessonIds: string[];
  publicationStatus: "released-local";
  reviewStatus: "ai-assisted-draft" | "legacy-local";
  humanReviewed: false;
  rights: ReaderRightsReference;
};

export type ReaderChapterSummary = Omit<
  ReaderChapter,
  "paragraphs" | "relatedLessonIds" | "rights"
> & {
  hookVi: string;
  relatedLessonIds: string[];
  rightsManifestId: string;
};

export type ReaderSeries = {
  seriesId: string;
  version: string;
  titleZh: string;
  titleVi: string;
  synopsisVi: string;
  hookVi: string;
  genreIds: string[];
  shelfId: ReaderShelfId;
  discoverable: boolean;
  levelBand: ReaderLevelBand;
  coverAsset: {
    kind: "image" | "code-native" | "art-directed";
    src?: string;
    sigil?: string;
    tone: ReaderCoverTone;
    altVi: string;
    rightsManifestId: string;
  };
  source: ReaderRightsReference;
  volumes: Array<{
    volumeId: string;
    titleZh: string;
    titleVi: string;
    chapters: ReaderChapterSummary[];
  }>;
  focusLexemeIds: string[];
  publicationStatus: "released-local";
  humanReviewed: false;
};

export const readerSeriesChapters = (series: ReaderSeries) =>
  series.volumes.flatMap((volume) => volume.chapters);

export const readerChapterIdentity = (
  seriesId: string,
  chapterId: string,
) => `${seriesId}::${chapterId}`;
